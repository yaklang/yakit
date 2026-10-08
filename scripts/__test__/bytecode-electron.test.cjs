const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')
const { compileToBytecode, mainBytecodePlugin } = require('../bytecode-plugin')

test('native Electron loads protected exports, nested non-entry chunks and circular dependencies', async () => {
  const tempRoot = fs.realpathSync(os.tmpdir())
  const temp = fs.mkdtempSync(path.join(tempRoot, 'senso-bytecode-test-'))
  const bundle = {
    'index.js': {
      type: 'chunk',
      fileName: 'index.js',
      isEntry: true,
      code: 'exports.name = "root"; const helper = require("./nested/helper.cjs"); exports.value = helper.value; exports.root = helper.root; exports.filename = __filename; exports.cacheSame = require.cache[__filename] === module;',
    },
    'nested/helper.cjs': {
      type: 'chunk',
      fileName: 'nested/helper.cjs',
      isEntry: false,
      code: 'module.exports = { value: 42, root: require("../index.js").name };',
    },
    'leaf.js': { type: 'chunk', fileName: 'leaf.js', isEntry: false, code: 'module.exports = { direct: 7 };' },
    'asset.json': { type: 'asset', fileName: 'asset.json', source: '{"keep":true}' },
  }
  const assets = []
  try {
    await mainBytecodePlugin().generateBundle.call(
      { emitFile: (asset) => assets.push(asset) },
      { format: 'cjs' },
      bundle,
    )
    for (const entry of [...Object.values(bundle), ...assets]) {
      const file = path.join(temp, entry.fileName)
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(file, entry.type === 'chunk' ? entry.code : entry.source)
    }
    const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1', NODE_OPTIONS: '' }
    execFileSync(require('electron'), [path.resolve(__dirname, '../verify-bytecode-runtime.js'), temp], {
      env,
      timeout: 60000,
    })
    const result = execFileSync(
      require('electron'),
      [
        '-e',
        'console.log(JSON.stringify({ entry: require(process.argv[1]), direct: require(process.argv[2]) }))',
        path.join(temp, 'index.js'),
        path.join(temp, 'leaf.jsc'),
      ],
      {
        env,
        encoding: 'utf8',
        timeout: 60000,
      },
    )
    assert.deepEqual(JSON.parse(result.trim()), {
      entry: { name: 'root', value: 42, root: 'root', filename: path.join(temp, 'index.js'), cacheSame: true },
      direct: { direct: 7 },
    })
    assert.equal(fs.readFileSync(path.join(temp, 'asset.json'), 'utf8'), '{"keep":true}')
    assert.ok(!bundle['index.js'].code.includes('exports.name'))
    assert.ok(!bundle['nested/helper.cjs'].code.includes('value: 42'))
  } finally {
    assert.equal(path.dirname(path.resolve(temp)), tempRoot)
    assert.ok(path.basename(temp).startsWith('senso-bytecode-test-'))
    fs.rmSync(temp, { recursive: true, force: true })
  }
})

test('native compiler flushes large binary output and rejects invalid source with diagnostics', async () => {
  const code = `module.exports = ${JSON.stringify(Array.from({ length: 12000 }, (_, i) => `value-${i}-数据`))}`
  const bytecode = await compileToBytecode(code, 'large.js')
  assert.ok(bytecode.length > 65536, `Expected output larger than a pipe buffer, got ${bytecode.length}`)
  const tempRoot = fs.realpathSync(os.tmpdir())
  const temp = fs.mkdtempSync(path.join(tempRoot, 'senso-bytecode-stream-test-'))
  try {
    fs.writeFileSync(path.join(temp, 'large.jsc'), bytecode)
    const result = execFileSync(
      require('electron'),
      [
        '-e',
        'require(process.argv[1]); const data = require(process.argv[2]); console.log(JSON.stringify({ length: data.length, last: data[data.length - 1] }))',
        path.resolve(__dirname, '../bytecode-loader.cjs'),
        path.join(temp, 'large.jsc'),
      ],
      {
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', NODE_OPTIONS: '' },
        encoding: 'utf8',
        timeout: 60000,
      },
    )
    assert.deepEqual(JSON.parse(result.trim()), { length: 12000, last: 'value-11999-数据' })
  } finally {
    assert.equal(path.dirname(path.resolve(temp)), tempRoot)
    assert.ok(path.basename(temp).startsWith('senso-bytecode-stream-test-'))
    fs.rmSync(temp, { recursive: true, force: true })
  }
  await assert.rejects(compileToBytecode('function { invalid syntax', 'invalid.js'), /invalid\.js[\s\S]*SyntaxError/)
})
