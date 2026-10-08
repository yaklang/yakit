const fs = require('fs')
const path = require('path')
const vm = require('vm')
const v8 = require('v8')
const Module = require('module')

v8.setFlagsFromString('--no-lazy')
v8.setFlagsFromString('--no-flush-bytecode')
let flagHash

function loadBytecode(module, bytecodeFilename) {
  const bytecode = fs.readFileSync(bytecodeFilename)
  const filename = module.filename || bytecodeFilename
  if (bytecode.length < 24) throw new Error(`Empty or truncated bytecode: ${filename}`)
  const length = bytecode.readUInt32LE(8)
  if (length < 2 || length > 32 * 1024 * 1024) throw new Error(`Invalid bytecode source length: ${filename}`)
  // Match the flag-hash adjustment used by the existing target Electron verifier.
  flagHash ||= new vm.Script('').createCachedData().subarray(12, 16)
  flagHash.copy(bytecode, 12)
  const script = new vm.Script('"' + '\u200b'.repeat(length - 2) + '"', { filename, cachedData: bytecode })
  if (script.cachedDataRejected)
    throw new Error(`Invalid or incompatible cached data (cachedDataRejected): ${filename}`)
  const compiled = script.runInThisContext()
  if (typeof compiled !== 'function') throw new Error(`Invalid module wrapper: ${filename}`)

  const localRequire = (request) => module.require(request)
  localRequire.resolve = (request, options) => Module._resolveFilename(request, module, false, options)
  localRequire.main = process.mainModule
  localRequire.extensions = Module._extensions
  localRequire.cache = Module._cache
  compiled.call(module.exports, module.exports, localRequire, module, filename, path.dirname(filename))
}

Module._extensions['.jsc'] = Module._extensions['.cjsc'] = loadBytecode
// Run in the original JS Module so circular requires see its partial exports.
exports.load = loadBytecode
