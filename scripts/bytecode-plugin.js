const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

// Compile with the same native Electron that will run the packaged application.
function compileToBytecode(code, filename, options = {}) {
  return new Promise((resolve, reject) => {
    const buffers = []
    let size = 0
    let stderr = ''
    let settled = false
    let timer
    let child
    const fail = (reason) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(new Error(`Bytecode compilation failed for ${filename}: ${reason}${stderr ? `\n${stderr.trim()}` : ''}`))
    }
    const stop = (reason) => {
      child.kill()
      fail(reason)
    }

    try {
      child = (options.spawn || spawn)(
        options.electronPath || require('electron'),
        [path.join(__dirname, 'bytecode-worker.cjs')],
        {
          env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', NODE_OPTIONS: '' },
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true,
        },
      )
      timer = setTimeout(() => stop('compiler timed out'), options.timeoutMs ?? 60000)
      child.once('error', (error) => fail(error.message))
      child.stdout.on('data', (buffer) => {
        size += buffer.length
        if (size > 64 * 1024 * 1024) return stop('compiler output exceeds 64 MiB')
        buffers.push(buffer)
      })
      child.stderr.on('data', (buffer) => {
        stderr = (stderr + buffer.toString()).slice(-16384)
      })
      for (const stream of [child.stdin, child.stdout, child.stderr]) {
        stream.on('error', (error) => stop(error.message))
      }
      // `exit` can precede the final stdout data. Only `close` guarantees all pipes drained.
      child.once('close', (exitCode, signal) => {
        if (settled) return
        if (exitCode !== 0 || signal) return fail(`exit code ${exitCode}, signal ${signal || 'none'}`)
        if (size < 24) return fail(`empty or truncated output (${size} bytes)`)
        settled = true
        clearTimeout(timer)
        resolve(Buffer.concat(buffers))
      })
      child.stdin.end(code, 'utf8')
    } catch (error) {
      if (child) child.kill()
      fail(error.message)
    }
  })
}

function createLoaderStub(filename) {
  let loaderPath = path.posix.relative(path.posix.dirname(filename), 'bytecode-loader.cjs')
  if (!loaderPath.startsWith('.')) loaderPath = `./${loaderPath}`
  return `"use strict";\nrequire(${JSON.stringify(loaderPath)}).load(module, __filename + "c");\n`
}

function mainBytecodePlugin(options = {}) {
  const compile = options.compile || compileToBytecode
  const loaderFile = 'bytecode-loader.cjs'
  return {
    name: 'senso:main-bytecode',
    apply: 'build',
    enforce: 'post',
    async generateBundle(outputOptions, bundle) {
      if (outputOptions.format !== 'cjs') throw new Error('Main bytecode requires cjs output')
      if (outputOptions.sourcemap) throw new Error('Main bytecode must not emit sourcemaps')
      const chunks = Object.values(bundle).filter((entry) => entry.type === 'chunk')
      if (!chunks.length) return
      if (bundle[loaderFile]) throw new Error('Bytecode loader output already exists')
      const results = []
      // One compiler at a time avoids exhausting CI runners with 108 Electron processes.
      for (const chunk of chunks) {
        if (!/\.c?js$/.test(chunk.fileName)) throw new Error(`Unsupported bytecode module: ${chunk.fileName}`)
        if (bundle[`${chunk.fileName}c`]) throw new Error(`Bytecode output already exists: ${chunk.fileName}c`)
        const bytecode = await compile(chunk.code, chunk.fileName)
        if (!Buffer.isBuffer(bytecode) || bytecode.length < 24)
          throw new Error(`Invalid bytecode output: ${chunk.fileName}`)
        results.push({ chunk, bytecode })
      }

      // Do not replace any source or emit partial caches unless every compiler succeeded.
      this.emitFile({
        type: 'asset',
        fileName: loaderFile,
        source: options.loaderSource ?? fs.readFileSync(path.join(__dirname, 'bytecode-loader.cjs'), 'utf8'),
      })
      for (const { chunk, bytecode } of results) {
        this.emitFile({ type: 'asset', fileName: `${chunk.fileName}c`, source: bytecode })
        chunk.code = createLoaderStub(chunk.fileName)
        chunk.map = null
      }
      console.log(`Compiled and verified ${results.length} bytecode modules serially with native Electron.`)
    },
  }
}

module.exports = { compileToBytecode, createLoaderStub, mainBytecodePlugin }
