import {
  confirmStartupWorkspace,
  connectRemoteEngineThroughUI,
  echoFromMainWindow,
  findApplicationWindows,
  waitForMainWindow,
  waitForShellWindows,
} from '../../drivers/application.driver.mjs'

const loadEngineCredentials = () => {
  if (process.env.YAKIT_E2E_ENGINE_FIXTURE !== 'external') {
    throw new Error('The real-engine suite must be started with --with-yak-engine')
  }
  const port = Number(process.env.YAKIT_E2E_ENGINE_PORT)
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid YAKIT_E2E_ENGINE_PORT: ${process.env.YAKIT_E2E_ENGINE_PORT}`)
  }
  return {
    Host: process.env.YAKIT_E2E_ENGINE_HOST,
    Port: port,
    Mode: 'remote',
    IsTLS: false,
    Password: '',
  }
}

describe('Yakit with a real Yak engine', () => {
  it('connects through the startup UI and keeps Echo working in Main', async () => {
    const credentials = loadEngineCredentials()
    expect(credentials.Host).toBe('127.0.0.1')

    const initialWindows = await waitForShellWindows()
    const { linkWindow, mainWindow } = findApplicationWindows(initialWindows)
    expect(linkWindow?.visible).toBe(true)
    expect(mainWindow?.visible).toBe(false)

    await confirmStartupWorkspace()
    await connectRemoteEngineThroughUI(credentials)
    await waitForMainWindow()
    const mainHandshake = await echoFromMainWindow()
    expect(mainHandshake.response?.result).toBe(mainHandshake.echoToken)
  })
})
