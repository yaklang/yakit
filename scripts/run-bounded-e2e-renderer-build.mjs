import { spawn } from 'node:child_process'
import process from 'node:process'

const yarnCommand = process.platform === 'win32' ? 'yarn.cmd' : 'yarn'
const spawnYarn = (args) =>
  spawn(yarnCommand, args, {
    env: {
      ...process.env,
      YAKIT_E2E_BOUNDED_BUILD: '1',
      NODE_OPTIONS: process.env.YAKIT_E2E_RENDERER_NODE_OPTIONS || '--max-old-space-size=4096',
    },
    stdio: 'inherit',
    windowsHide: true,
  })

let child = spawnYarn(['build-test-render'])

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => child?.kill(signal))
}

const failOnChildError = (label) => (error) => {
  console.error(`[electron-e2e] cannot start ${label}: ${error.message}`)
  process.exit(1)
}

child.once('error', failOnChildError('bounded Renderer build'))
child.once('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  if (code !== 0) {
    process.exit(code ?? 1)
    return
  }

  child = spawnYarn(['write-test-render-e2e-metadata'])
  child.once('error', failOnChildError('Renderer build metadata writer'))
  child.once('exit', (metadataCode, metadataSignal) => {
    if (metadataSignal) {
      process.kill(process.pid, metadataSignal)
      return
    }
    process.exit(metadataCode ?? 1)
  })
})
