const { spawn } = require('node:child_process')
const path = require('node:path')
const { stopEngineChild } = require('../../app/main/handlers/utils/engineStartup')
const env = {
  ...process.env,
  HTTP_PROXY: 'http://127.0.0.1:1',
  HTTPS_PROXY: 'http://127.0.0.1:1',
  grpc_proxy: 'http://127.0.0.1:1',
}
delete env.ELECTRON_RUN_AS_NODE
const child = spawn(
  require('electron'),
  [
    path.join(__dirname, 'verify-ipc-engine.cjs'),
    path.resolve(process.argv[2]),
    process.argv[3] || '1',
    process.argv[4] || 'ipc',
    process.argv[5] || 'ipc',
  ],
  { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
)
let output = ''
child.stdout.on('data', (data) => {
  output += data.toString()
  process.stdout.write(data)
})
child.stderr.on('data', (data) => process.stderr.write(data))
const timer = setTimeout(
  async () => {
    await stopEngineChild(child)
    process.exitCode = 1
  },
  Number(process.argv[3] || 1) * 120000,
)
child.once('error', (error) => {
  clearTimeout(timer)
  console.error(error.message)
  process.exitCode = 1
})
child.once('close', (code) => {
  clearTimeout(timer)
  process.exitCode =
    code === 0 && output.includes('"status": "PASS"') && output.includes('"electron": "27.0.0"') ? 0 : 1
})
