const vm = require('vm')
const v8 = require('v8')
const { wrap } = require('module')
const { verifyBuffer } = require('./verify-bytecode-runtime')

if (!process.versions.electron) throw new Error('Bytecode compiler must run with target Electron')
v8.setFlagsFromString('--no-lazy')
v8.setFlagsFromString('--no-flush-bytecode')

const input = []
process.stdin.on('data', (buffer) => input.push(buffer))
process.stdin.on('error', (error) => {
  console.error(error)
  process.exitCode = 1
})
process.stdout.on('error', (error) => {
  console.error(error)
  process.exitCode = 1
})
process.stdin.on('end', () => {
  try {
    const source = wrap(Buffer.concat(input).toString('utf8'))
    const bytecode = new vm.Script(source, { produceCachedData: true }).createCachedData()
    verifyBuffer(bytecode, 'compiled module')
    // Leave shutdown to Node so pending binary output is fully flushed.
    process.stdout.write(bytecode)
  } catch (error) {
    console.error(error)
    process.exitCode = 1
  }
})
