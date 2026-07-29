import { randomUUID } from 'node:crypto'

import {
  isTransientElectronCDPError,
  runIdempotentElectronCDPCommand,
} from '../fixtures/electron/electron-cdp-retry.mjs'

export const LINK_WINDOW_URL = '/engine-link-startup/dist/index.html'
export const MAIN_WINDOW_URL = '/renderer/pages/main/index.html'

export const waitForShellWindows = async () => {
  let readyWindows
  await browser.waitUntil(
    async () => {
      try {
        const windows = await runIdempotentElectronCDPCommand(() => browser.getYakitWindowState())
        const ready = windows.length >= 2 && windows.every((window) => window.url && !window.loading && !window.crashed)
        if (ready) readyWindows = windows
        return ready
      } catch (error) {
        if (isTransientElectronCDPError(error)) return false
        throw error
      }
    },
    {
      timeout: 30_000,
      timeoutMsg: 'Link and hidden Main BrowserWindows did not finish loading',
    },
  )
  return readyWindows
}

export const findApplicationWindows = (windows) => ({
  linkWindow: windows.find((window) => window.url.includes(LINK_WINDOW_URL)),
  mainWindow: windows.find((window) => window.url.includes(MAIN_WINDOW_URL)),
})

export const confirmStartupWorkspace = async () => {
  await browser.switchToYakitWindow(LINK_WINDOW_URL)
  await $('[data-testid="startup-page"]').waitForDisplayed()
  await $('[data-testid="startup-software-basics"]').waitForDisplayed()

  const confirm = await $('[data-testid="startup-confirm"]')
  await confirm.waitForEnabled()
  await confirm.click()
  await $('[data-testid="startup-engine-stage"]').waitForExist({
    timeout: 15_000,
    timeoutMsg: 'Workspace confirmation did not enter the engine startup stage',
  })
}

export const completeShellHandoff = async (credentials) =>
  browser.execute(async (engineCredentials) => {
    await window.yakitBridge.app.completeEngineLink({ credential: engineCredentials })
  }, credentials)

export const replaceInputValue = async (element, value, label) => {
  const expectedValue = String(value)
  const selectAllModifier = process.platform === 'darwin' ? 'Meta' : 'Control'

  await element.click()
  await browser.keys([selectAllModifier, 'a'])
  await browser.keys('Backspace')
  await browser.waitUntil(async () => (await element.getValue()) === '', {
    timeout: 5_000,
    timeoutMsg: `${label} input did not clear after select-all and Backspace`,
  })

  await element.addValue(expectedValue)
  await browser.waitUntil(async () => (await element.getValue()) === expectedValue, {
    timeout: 5_000,
    timeoutMsg: `${label} input did not contain the expected value ${expectedValue}`,
  })
}

export const connectRemoteEngineThroughUI = async (credentials) => {
  const agreement = await $('[data-testid="engine-user-agreement"]')
  await agreement.waitForDisplayed({
    timeout: 30_000,
    timeoutMsg: 'Engine install state did not expose the user agreement',
  })
  if (!(await agreement.isSelected())) {
    try {
      await agreement.click()
    } catch (error) {
      // The startup terminal can briefly paint over the agreement while xterm
      // is fitting its canvas. Keep other click failures visible to the suite.
      if (!String(error?.message ?? error).includes('xterm-')) throw error
      await browser.execute((element) => element.click(), agreement)
    }
  }
  await browser.waitUntil(async () => agreement.isSelected(), {
    timeout: 5_000,
    interval: 50,
    timeoutMsg: 'Engine user agreement did not become checked',
  })

  const switchRemote = await $('[data-testid="engine-switch-remote"]')
  await switchRemote.waitForClickable()
  await switchRemote.click()

  await $('[data-testid="remote-engine-form"]').waitForDisplayed()
  const host = await $('[data-testid="remote-engine-host"]')
  const port = await $('[data-testid="remote-engine-port"]')
  await replaceInputValue(host, credentials.Host, 'Remote engine host')
  await replaceInputValue(port, credentials.Port, 'Remote engine port')
  await $('[data-testid="remote-engine-connect"]').click()
}

export const waitForMainWindow = async () => {
  await browser.waitUntil(
    async () => {
      try {
        const windows = await runIdempotentElectronCDPCommand(() => browser.getYakitWindowState())
        const { linkWindow, mainWindow } = findApplicationWindows(windows)
        return linkWindow?.visible === false && mainWindow?.visible === true && mainWindow?.focused === true
      } catch (error) {
        if (isTransientElectronCDPError(error)) return false
        throw error
      }
    },
    {
      timeout: 15_000,
      timeoutMsg: 'Main window did not become visible after the engine-ready handoff',
    },
  )

  await browser.switchToYakitWindow(MAIN_WINDOW_URL)
  await $('#root').waitForExist()
  await browser.waitUntil(async () => browser.execute(() => document.querySelector('#root')?.childElementCount > 0), {
    timeout: 15_000,
    timeoutMsg: 'Visible Main window did not mount its React tree',
  })
}

export const enterDefaultProjectThroughUI = async () => {
  await browser.switchToYakitWindow(MAIN_WINDOW_URL)
  const homeEntry = await $('[data-testid="home-open-mitm-v2"]')
  if (await homeEntry.isDisplayed()) return

  await $('[data-testid="project-manage"]').waitForDisplayed({
    timeout: 30_000,
    timeoutMsg: 'Main did not expose Project Management before entering a project',
  })

  let defaultProject
  await browser.waitUntil(
    async () => {
      const projects = await $$('[data-testid="project-open"]')
      for (const project of projects) {
        if ((await project.getAttribute('data-project-name')) === '[default]') {
          defaultProject = project
          return await project.isClickable()
        }
      }
      return false
    },
    {
      timeout: 30_000,
      interval: 200,
      timeoutMsg: 'Project Management did not expose a clickable [default] project',
    },
  )

  await defaultProject.click()
  await homeEntry.waitForClickable({
    timeout: 30_000,
    timeoutMsg: 'Main home did not become interactive after selecting [default]',
  })
}

export const echoFromMainWindow = async () => {
  await browser.switchToYakitWindow(MAIN_WINDOW_URL)
  const token = `yakit-main-e2e-${randomUUID()}`
  return browser.execute(async (echoToken) => {
    const response = await window.yakitBridge.engine.echo({ text: echoToken })
    return { response, echoToken }
  }, token)
}
