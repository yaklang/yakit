const test = require('node:test')
const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const { PassThrough } = require('node:stream')
const { compileToBytecode, mainBytecodePlugin } = require('../bytecode-plugin')

const turn = () => new Promise((resolve) => setImmediate(resolve))
const output = Buffer.from('complete cached bytecode output')

function compilerFixture() {
  const child = new EventEmitter()
  child.stdin = new PassThrough()
  child.stdout = new PassThrough()
  child.stderr = new PassThrough()
  child.killed = false
  child.kill = (signal) => {
    child.killed = true
    child.killSignal = signal
    return true
  }
  const calls = []
  const spawn = (...args) => {
    calls.push(args)
    return child
  }
  const compile = (extra = {}) =>
    compileToBytecode('module.exports = 42', 'example.js', {
      spawn,
      electronPath: '/test/electron',
      timeoutMs: 1000,
      ...extra,
    })
  const close = (code = 0, signal = null, data = output) => {
    child.stdout.end(data)
    child.stderr.end()
    child.emit('exit', code, signal)
    child.emit('close', code, signal)
  }
  return { child, calls, compile, close }
}

test('compiler waits for output after exit and collects every binary chunk before close', async () => {
  const { child, calls, compile } = compilerFixture()
  const result = compile()
  let settled = false
  result.then(
    () => {
      settled = true
    },
    () => {
      settled = true
    },
  )
  assert.equal(calls.length, 1)
  assert.equal(calls[0][0], '/test/electron')

  child.emit('exit', 0, null)
  await turn()
  assert.equal(settled, false, 'exit alone must not finish the compilation')

  child.stdout.write(output.subarray(0, 5))
  child.stdout.end(output.subarray(5))
  child.stderr.end()
  await turn()
  assert.equal(settled, false, 'stdout end must not bypass the child close status')

  child.emit('close', 0, null)
  assert.deepEqual(await result, output)
})

test('compiler rejects nonzero close even when stdout has already ended', async () => {
  const { child, compile } = compilerFixture()
  const result = assert.rejects(compile(), /example\.js.*(exit|code|failed)|(?:exit|code|failed).*example\.js/is)
  child.stdout.end(output)
  child.stderr.end('compiler diagnostic')
  await turn()
  child.emit('exit', 1, null)
  child.emit('close', 1, null)
  await result
})

test('compiler rejects termination by signal instead of accepting partial output', async () => {
  const { compile, close } = compilerFixture()
  const result = assert.rejects(compile(), /SIGKILL/)
  close(null, 'SIGKILL')
  await result
})

test('compiler rejects successful process status with empty output', async () => {
  const { compile, close } = compilerFixture()
  const result = assert.rejects(compile(), /empty|truncated|no bytecode/i)
  close(0, null, Buffer.alloc(0))
  await result
})

test('compiler rejects a truncated bytecode header despite a successful process status', async () => {
  const { compile, close } = compilerFixture()
  const result = assert.rejects(compile(), /empty|truncated|header|bytecode/i)
  close(0, null, Buffer.alloc(23))
  await result
})

test('compiler reports asynchronous spawn errors', async () => {
  const { child, compile } = compilerFixture()
  const result = assert.rejects(compile(), /could not start compiler/)
  child.emit('error', new Error('could not start compiler'))
  await result
})

test('compiler reports synchronous spawn errors', async () => {
  const result = compileToBytecode('module.exports = 42', 'example.js', {
    electronPath: '/test/electron',
    spawn() {
      throw new Error('spawn failed synchronously')
    },
  })
  await assert.rejects(result, /spawn failed synchronously/)
})

test('compiler reports stdin failures and terminates the unfinished child', async () => {
  const { child, compile } = compilerFixture()
  const result = assert.rejects(compile(), /EPIPE/)
  child.stdin.emit('error', new Error('EPIPE: compiler input was closed'))
  await result
  assert.equal(child.killed, true)
})

for (const stream of ['stdout', 'stderr']) {
  test(`compiler rejects ${stream} read errors and terminates the unfinished child`, async () => {
    const { child, compile } = compilerFixture()
    const result = assert.rejects(compile(), /EIO/)
    child[stream].emit('error', new Error(`EIO: cannot read ${stream}`))
    await result
    assert.equal(child.killed, true)
  })
}

test('compiler timeout rejects and terminates a compiler that never closes', { timeout: 2000 }, async () => {
  const { child, compile } = compilerFixture()
  const keepAlive = setInterval(() => {}, 100)
  try {
    await assert.rejects(compile({ timeoutMs: 20 }), /timeout|timed out/i)
    assert.equal(child.killed, true)
  } finally {
    clearInterval(keepAlive)
  }
})

function chunk(fileName, code) {
  return { type: 'chunk', fileName, code, name: fileName, isEntry: true, modules: {} }
}

function pluginContext() {
  const emitted = []
  return {
    emitted,
    emitFile(asset) {
      emitted.push(asset)
      return String(emitted.length)
    },
    warn() {},
    error(error) {
      throw error instanceof Error ? error : new Error(String(error))
    },
  }
}

test('plugin compiles chunks serially and preserves module and loader paths beside mixed assets', async () => {
  const calls = []
  let active = 0
  let maximum = 0
  const compile = async (code, filename) => {
    active += 1
    maximum = Math.max(maximum, active)
    calls.push({ code, filename })
    await turn()
    active -= 1
    return Buffer.concat([output, Buffer.from(filename)])
  }
  const asset = { type: 'asset', fileName: 'license.txt', source: 'license contents' }
  const bundle = {
    'index.js': chunk('index.js', 'module.exports = "entry"'),
    'nested/helper.js': chunk('nested/helper.js', 'module.exports = "helper"'),
    'license.txt': asset,
    'nested/common.cjs': chunk('nested/common.cjs', 'module.exports = "commonjs"'),
  }
  const context = pluginContext()
  const plugin = mainBytecodePlugin({ compile, loaderSource: '// test bytecode loader' })
  await plugin.generateBundle.call(context, { format: 'cjs', sourcemap: false }, bundle)

  assert.equal(maximum, 1, '108 preserved modules must not spawn 108 compilers simultaneously')
  assert.deepEqual(calls, [
    { code: 'module.exports = "entry"', filename: 'index.js' },
    { code: 'module.exports = "helper"', filename: 'nested/helper.js' },
    { code: 'module.exports = "commonjs"', filename: 'nested/common.cjs' },
  ])
  assert.strictEqual(bundle['license.txt'], asset)
  assert.equal(asset.source, 'license contents')
  assert.match(
    bundle['index.js'].code,
    /require\(["']\.\/bytecode-loader\.cjs["']\)\.load\(module,\s*__filename\s*\+\s*["']c["']\)/,
  )
  assert.match(
    bundle['nested/helper.js'].code,
    /require\(["']\.\.\/bytecode-loader\.cjs["']\)\.load\(module,\s*__filename\s*\+\s*["']c["']\)/,
  )
  assert.match(
    bundle['nested/common.cjs'].code,
    /require\(["']\.\.\/bytecode-loader\.cjs["']\)\.load\(module,\s*__filename\s*\+\s*["']c["']\)/,
  )
  for (const entry of Object.values(bundle).filter((item) => item.type === 'chunk')) {
    assert.doesNotMatch(
      entry.code,
      /module\.exports\s*=\s*require\(/,
      'the loader must execute in the original module to preserve circular partial exports',
    )
  }

  assert.equal(context.emitted.length, 4)
  const byName = new Map(context.emitted.map((item) => [item.fileName, item]))
  for (const filename of ['index.js', 'nested/helper.js', 'nested/common.cjs']) {
    assert.equal(bundle[filename].fileName, filename)
    const name = `${filename}c`
    assert.equal(byName.get(name).type, 'asset')
    assert.deepEqual(byName.get(name).source, Buffer.concat([output, Buffer.from(filename)]))
  }
  assert.equal(byName.get('bytecode-loader.cjs').source, '// test bytecode loader')
})

test('plugin leaves every chunk and emitted asset untouched when a later compilation fails', async () => {
  const bundle = {
    'index.js': chunk('index.js', 'module.exports = "entry"'),
    'nested/broken.js': chunk('nested/broken.js', 'module.exports = "broken"'),
  }
  const original = structuredClone(bundle)
  const context = pluginContext()
  const plugin = mainBytecodePlugin({
    loaderSource: '// test bytecode loader',
    compile: async (_code, filename) => {
      if (filename === 'nested/broken.js') throw new Error('compilation failed for nested/broken.js')
      return output
    },
  })
  await assert.rejects(plugin.generateBundle.call(context, { format: 'cjs' }, bundle), /nested\/broken\.js/)
  assert.deepEqual(bundle, original)
  assert.deepEqual(context.emitted, [])
})

test('plugin refuses unsupported formats and source maps before compiling or changing the bundle', async () => {
  for (const options of [
    { format: 'es' },
    { format: 'iife' },
    { format: 'cjs', sourcemap: true },
    { format: 'cjs', sourcemap: 'inline' },
  ]) {
    let calls = 0
    const bundle = { 'index.js': chunk('index.js', 'module.exports = 42') }
    const original = structuredClone(bundle)
    const context = pluginContext()
    const plugin = mainBytecodePlugin({
      loaderSource: '// test bytecode loader',
      compile: async () => {
        calls += 1
        return output
      },
    })
    await assert.rejects(plugin.generateBundle.call(context, options, bundle), /cjs|commonjs|source\s*map/i)
    assert.equal(calls, 0)
    assert.deepEqual(bundle, original)
    assert.deepEqual(context.emitted, [])
  }
})
