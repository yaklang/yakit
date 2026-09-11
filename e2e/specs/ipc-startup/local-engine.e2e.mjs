import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  confirmStartupWorkspace,
  echoFromMainWindow,
  enterDefaultProjectThroughUI,
  LINK_WINDOW_URL,
  waitForMainWindow,
  waitForShellWindows,
} from '../../drivers/application.driver.mjs'

describe('Pinned CDN IPC engine through the real Yakit UI', () => {
  const policy = process.env.YAKIT_E2E_STARTUP_POLICY || 'auto'
  const expectedTransport = policy === 'tcp' ? 'tcp' : process.platform === 'win32' ? 'npipe' : 'unix'
  const settledPopover = async () =>
    browser.waitUntil(
      () =>
        browser.execute(() => {
          const popover = document.querySelector('.ant-popover:not(.ant-popover-hidden)')
          return (
            popover &&
            getComputedStyle(popover).opacity === '1' &&
            popover.getAnimations({ subtree: true }).every((animation) => animation.playState !== 'running')
          )
        }),
      { timeout: 5000, timeoutMsg: 'Popover did not finish its entrance animation' },
    )
  let instance
  const artifacts = process.env.YAKIT_E2E_ARTIFACTS_DIR
  after(async () => {
    const result = await browser.execute(() => window.yakitBridge.engine.stopAllLocalEngines())
    expect(result.ok && result.stopped).toBe(true)
  })

  it('starts from Link, hands off authenticated transport and supports UI recovery', async function () {
    this.timeout(180000)
    expect(process.env.YAKIT_E2E_ENGINE_FIXTURE).toBe('local-cdn')
    await waitForShellWindows()
    await browser.switchToYakitWindow(LINK_WINDOW_URL)
    await browser.execute(async (startupPolicy) => {
      await window.yakitBridge.cache.setLocalCache('no-autoboot-latest-version-check', true)
      await window.yakitBridge.cache.setLocalCache('no-yak-version-check', true)
      await window.yakitBridge.cache.setLocalCache('LocalEngine.TransportPolicy.yakit', startupPolicy)
    }, policy)
    await confirmStartupWorkspace()
    await waitForMainWindow({ timeout: 60000 })
    instance = await browser.execute(() => window.yakitBridge.engine.currentLocalEngine())
    expect(instance?.current).toBe(true)
    expect(instance?.transport).toBe(expectedTransport)
    if (expectedTransport !== 'tcp')
      expect(
        await browser.execute(async () => {
          const current = await window.yakitBridge.engine.currentLocalEngine()
          return current.port === undefined && !('port' in current.endpoint)
        }),
      ).toBe(true)
    expect(JSON.stringify(instance)).not.toMatch(/password|secret|cmd|origin/i)
    const echo = await echoFromMainWindow()
    expect(echo.response?.result).toBe(echo.echoToken)
    await enterDefaultProjectThroughUI()
    const header = await $('[data-testid="engine-connection-label"]')
    await header.waitForDisplayed()
    expect(await header.getAttribute('title')).toBe(instance.displayEndpoint)
    expect(await header.getText()).toMatch(
      expectedTransport === 'tcp' ? /TCP/ : process.platform === 'win32' ? /命名管道|Named Pipe/ : /Unix Socket/,
    )
    await mkdir(artifacts, { recursive: true })
    await browser.saveScreenshot(path.join(artifacts, 'ipc-main-connected.png'))
    const trigger = await $('[data-testid="engine-management-trigger"]')
    await trigger.waitForClickable()
    await trigger.click()
    const panel = await $('[data-testid="engine-management-panel"]')
    await panel.waitForDisplayed()
    await settledPopover()
    const row = await $(`[data-engine-id="${instance.id}"]`)
    await row.waitForDisplayed()
    expect(await row.getText()).toContain(instance.displayEndpoint)
    expect(await row.getText()).toContain(String(instance.pid))
    const serialized = await browser.execute(() => window.yakitBridge.engine.listYakGrpc())
    expect(serialized.find((item) => item.id === instance.id)?.current).toBe(true)
    expect(JSON.stringify(serialized)).not.toMatch(/password|secret|"cmd"|"origin"/i)
    await browser.saveScreenshot(path.join(artifacts, 'ipc-engine-management.png'))
    await browser.execute(() => document.documentElement.setAttribute('data-theme', 'dark'))
    await browser.saveScreenshot(path.join(artifacts, 'ipc-engine-management-dark.png'))
    await browser.execute(() => document.documentElement.setAttribute('data-theme', 'light'))
    const fits = await browser.execute(() => {
      const panel = document.querySelector('[data-testid="engine-management-panel"]')
      const rect = panel.getBoundingClientRect()
      return rect.left >= 0 && rect.right <= innerWidth && panel.scrollWidth <= panel.clientWidth
    })
    expect(fits).toBe(true)
    await row.$('[data-testid="engine-stop"]').click()
    const confirm = await $(
      '.ant-popover:not(.ant-popover-hidden) [class*="yakit-popconfirm-buttons"] button:last-child',
    )
    await confirm.waitForClickable()
    await confirm.click()
    await browser.waitUntil(
      async () => {
        const rows = await browser.execute(() => window.yakitBridge.engine.listYakGrpc())
        return rows.find((item) => item.id === instance.id)?.state === 'exited'
      },
      { timeout: 10000, timeoutMsg: 'Owned engine did not confirm exit after UI stop' },
    )
    expect(await browser.execute(() => window.yakitBridge.engine.currentLocalEngine())).toBeNull()
    await browser.switchToYakitWindow(LINK_WINDOW_URL)
    const settings = await $('[data-testid="local-transport-settings"]')
    await settings.waitForDisplayed()
    await browser.saveScreenshot(path.join(artifacts, 'ipc-startup-recovery.png'))
    const layout = await browser.execute(() => {
      const content = document.querySelector('[data-testid="startup-engine-loading"]')
      return { width: content.getBoundingClientRect().width, overflow: content.scrollWidth > content.clientWidth }
    })
    expect(layout.width).toBeGreaterThanOrEqual(350)
    expect(layout.overflow).toBe(false)
    await settings.click()
    await $('[role="radiogroup"]').waitForDisplayed()
    await settledPopover()
    await browser.saveScreenshot(path.join(artifacts, 'ipc-connection-settings.png'))
    const nextPolicy = policy === 'tcp' ? 'ipc' : 'tcp'
    const choice = await $(`[data-policy="${nextPolicy}"]`)
    await choice.click()
    await browser.waitUntil(async () => (await choice.getAttribute('aria-checked')) === 'true')
    expect(await browser.execute(() => window.yakitBridge.engine.currentLocalEngine())).toBeNull()
    await settings.click()
    const reconnect = await $('[data-testid="engine-manual-reconnect"]')
    await reconnect.waitForClickable()
    await reconnect.click()
    await waitForMainWindow({ timeout: 60000 })
    const restarted = await browser.execute(() => window.yakitBridge.engine.currentLocalEngine())
    expect(restarted.id).not.toBe(instance.id)
    expect(restarted.transport).toBe(nextPolicy === 'tcp' ? 'tcp' : process.platform === 'win32' ? 'npipe' : 'unix')
    const afterRestart = await echoFromMainWindow()
    expect(afterRestart.response?.result).toBe(afterRestart.echoToken)
    await writeFile(
      path.join(artifacts, 'ipc-ui-acceptance.json'),
      JSON.stringify(
        {
          status: 'PASS',
          policy,
          transport: instance.transport,
          version: instance.version,
          linkToMain: true,
          businessEcho: true,
          projectOpened: true,
          managementVisible: true,
          ownedStopConfirmed: true,
          restartPolicy: nextPolicy,
          restartTransport: restarted.transport,
          restartBusinessEcho: true,
        },
        null,
        2,
      ),
    )
  })
})
