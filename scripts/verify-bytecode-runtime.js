// Run with the target Electron in ELECTRON_RUN_AS_NODE mode, never ordinary Node.
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const v8 = require('v8')

function verifyBuffer(input, filename) {
  if (input.length < 24) throw new Error('Empty or truncated bytecode: ' + filename)
  const bytecode = Buffer.from(input)
  const length = bytecode.readUInt32LE(8)
  if (length < 2 || length > 32 * 1024 * 1024) throw new Error('Invalid bytecode source length: ' + filename)
  // Match electron-vite's loader flags and flag-hash adjustment exactly.
  v8.setFlagsFromString('--no-lazy')
  v8.setFlagsFromString('--no-flush-bytecode')
  const flags = new vm.Script('').createCachedData()
  flags.copy(bytecode, 12, 12, 16)
  const script = new vm.Script('"' + '\u200b'.repeat(length - 2) + '"', { filename, cachedData: bytecode })
  if (script.cachedDataRejected) throw new Error('cachedDataRejected: ' + filename)
  // Deserialize the wrapper without executing application code or starting engines.
  if (typeof script.runInThisContext() !== 'function') throw new Error('Invalid module wrapper: ' + filename)
}

function verifyDirectory(dir) {
  let count = 0
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) count += verifyDirectory(file)
    else if (entry.name.endsWith('.jsc')) {
      verifyBuffer(fs.readFileSync(file), file)
      count++
    }
  }
  return count
}

if (require.main === module) {
  if (!process.versions.electron) throw new Error('Bytecode must be verified by Electron')
  const count = verifyDirectory(process.argv[2])
  if (!count) throw new Error('No bytecode modules found')
  if (process.env.EXPECTED_ELECTRON && process.versions.electron !== process.env.EXPECTED_ELECTRON)
    throw new Error('Unexpected Electron version')
  if (process.env.EXPECTED_ARCH && process.arch !== process.env.EXPECTED_ARCH)
    throw new Error('Unexpected Electron architecture')
  console.log(
    'Verified ' +
      count +
      ' bytecode modules using Electron ' +
      process.versions.electron +
      ' on ' +
      process.platform +
      '/' +
      process.arch,
  )
}

module.exports = { verifyBuffer, verifyDirectory }
