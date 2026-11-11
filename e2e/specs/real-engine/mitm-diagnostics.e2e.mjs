import http from 'node:http'
import path from 'node:path'
import {
  confirmStartupWorkspace,
  connectRemoteEngineThroughUI,
  enterDefaultProjectThroughUI,
  waitForMainWindow,
} from '../../drivers/application.driver.mjs'
import { openMITMV2ThroughUI, startMITMV2ThroughUI, stopMITMV2ThroughUI } from '../../drivers/mitm.driver.mjs'
import {
  reserveLoopbackPort,
  waitForLoopbackPort,
  waitForLoopbackPortClosed,
} from '../../fixtures/http-performance/http-performance-fixture.mjs'

const clickText = async (text, element = 'button') => {
  const control = await $(`//${element}[normalize-space(.)='${text}']`)
  await control.waitForClickable()
  await control.click()
}

const resizeMain = (width, height) =>
  browser.electron.execute(
    (electron, w, h) => {
      const win = electron.BrowserWindow.getAllWindows().find((window) =>
        window.webContents.getURL().includes('/main/'),
      )
      if (win.isMaximized()) win.unmaximize()
      win.setMinimumSize(400, 420)
      win.setContentSize(w, h)
    },
    width,
    height,
  )

const waitForPlot = (name) => $(`[role="img"][aria-label="${name}"] canvas`).waitForDisplayed({ timeout: 10000 })
const capture = (name) => browser.saveScreenshot(path.join(process.env.YAKIT_E2E_ARTIFACTS_DIR, `${name}.png`))

describe('MITM diagnostics with a real Yak engine', () => {
  it('separates background waits, fills the drawer, plots live samples, and clears on stop', async () => {
    await confirmStartupWorkspace()
    await connectRemoteEngineThroughUI({
      Host: '127.0.0.1',
      Port: Number(process.env.YAKIT_E2E_ENGINE_PORT),
      Mode: 'remote',
      IsTLS: false,
      Password: '',
    })
    await waitForMainWindow()
    await enterDefaultProjectThroughUI()
    const browserHost = 'content-autofill.googleapis.com'
    const browserCount = 22
    // The Chrome service hostname is served by the local origin for this test.
    await browser.execute(
      (host) =>
        window.yakitBridge.cache.setRemoteKey(
          'YAKIT_MITMDefaultEtcHosts',
          JSON.stringify([{ Key: host, Value: '127.0.0.1' }]),
        ),
      browserHost,
    )
    await openMITMV2ThroughUI()
    await resizeMain(1180, 1000)

    const proxyPort = await reserveLoopbackPort()
    const originResponses = []
    const slowOrigin = http.createServer((_req, res) => {
      res.setHeader('Content-Type', 'text/plain')
      originResponses.push(res)
    })
    await new Promise((resolve, reject) => {
      slowOrigin.once('error', reject)
      slowOrigin.listen(0, '127.0.0.1', resolve)
    })
    const proxyRequests = []
    const send = (host, route) => {
      const target = `${host}:${slowOrigin.address().port}`
      const received = new Promise((resolve, reject) => {
        const request = http.get(
          {
            host: '127.0.0.1',
            port: proxyPort,
            path: `http://${target}/${route}`,
            headers: { Host: target },
            agent: false,
          },
          (res) => {
            res.resume()
            res.on('end', () => resolve(res.statusCode))
            res.on('error', reject)
          },
        )
        request.on('error', reject)
        request.setTimeout(45_000, () => request.destroy(new Error('Timed out reaching the loopback origin')))
        proxyRequests.push(request)
      })
      // Cleanup can close sockets after an assertion fails.
      received.catch(() => {})
      return received
    }
    try {
      await startMITMV2ThroughUI({ host: '127.0.0.1', port: proxyPort })
      await waitForLoopbackPort({ port: proxyPort })
      const background = Array.from({ length: browserCount }, (_, index) => send(browserHost, `autofill-${index}`))
      await browser.waitUntil(() => originResponses.length === browserCount, {
        timeout: 10000,
        timeoutMsg: 'Chrome endpoint requests did not all reach the mapped loopback origin',
      })

      const trigger = await $('button[aria-label^="MITM 实时处理状态，每秒"]')
      await trigger.waitForClickable()
      await trigger.click()
      await clickText('打开流量诊断')
      const drawer = await $('[role="dialog"]')
      await drawer.waitForDisplayed()
      await drawer.$('.//h3[normalize-space(.)="浏览器后台请求等待"]').waitForDisplayed({ timeout: 10000 })
      await waitForPlot('请求收发速率')
      await capture('mitm-diagnostics-live')
      await clickText('查看后台请求')

      const records = await $('[aria-label="选择请求"]')
      const details = await $('[aria-label="请求阶段明细"]')
      await records.waitForDisplayed()
      await browser.waitUntil(async () => (await details.getText()).includes('Chrome 自动填充'))
      expect(await records.$$('button')).toHaveLength(browserCount)
      const layout = await browser.execute(() => {
        const list = document.querySelector('[aria-label="选择请求"]')
        const tab = list.closest('[role="tabpanel"]').getBoundingClientRect()
        const rect = list.getBoundingClientRect()
        const detail = document.querySelector('[aria-label="请求阶段明细"]').getBoundingClientRect()
        return { height: rect.height, listBottom: rect.bottom, detailBottom: detail.bottom, tabBottom: tab.bottom }
      })
      expect(layout.height).toBeGreaterThan(500)
      expect(layout.tabBottom - layout.listBottom).toBeLessThan(32)
      expect(Math.abs(layout.listBottom - layout.detailBottom)).toBeLessThan(2)
      await capture('mitm-diagnostics-trace')
      await resizeMain(590, 850)
      await browser.waitUntil(() =>
        browser.execute(() => {
          const list = document.querySelector('[aria-label="选择请求"]')
          const detail = document.querySelector('[aria-label="请求阶段明细"]')
          return (
            detail.getBoundingClientRect().top > list.getBoundingClientRect().bottom &&
            detail.getBoundingClientRect().right <= innerWidth &&
            detail.scrollWidth <= detail.clientWidth
          )
        }),
      )
      await capture('mitm-diagnostics-narrow')
      await resizeMain(1180, 1000)

      const ordinary = send('127.0.0.1', 'mitm-diagnostics')
      await browser.waitUntil(() => originResponses.length === browserCount + 1)
      await clickText('实时状态', 'div[@role="tab"]')
      const firstByte = await drawer.$('.//h3[normalize-space(.)="等待上游首包"]')
      await firstByte.waitForDisplayed({ timeout: 10000 })
      await clickText('查看请求轨迹')
      await details.waitForDisplayed()
      await $('[aria-label="阶段耗时瀑布图"]').waitForDisplayed()
      expect(await details.getText()).toContain('GET 127.0.0.1')
      expect(await records.$$('button')).toHaveLength(1)
      for (const response of originResponses) response.end('MITM diagnostics test')
      expect(await Promise.all([...background, ordinary])).toEqual(Array(browserCount + 1).fill(200))

      await clickText('近期慢请求', 'label')
      await browser.waitUntil(async () => (await details.getText()).includes('查看流量 #'))
      await clickText('入库压力', 'div[@role="tab"]')
      await $('[role="progressbar"][aria-label="共享写队列占用"]').waitForDisplayed()
      await waitForPlot('本会话待写数量趋势')
      await waitForPlot('提交与写入速率')
      await capture('mitm-diagnostics-storage')
      await browser.keys('Escape')
      await drawer.waitForDisplayed({ reverse: true })
      await stopMITMV2ThroughUI()
      await waitForLoopbackPortClosed({ port: proxyPort })
      await trigger.waitForExist({ reverse: true })
    } finally {
      for (const request of proxyRequests) request.destroy()
      slowOrigin.closeAllConnections()
      await new Promise((resolve) => slowOrigin.close(resolve))
    }
  })
})
