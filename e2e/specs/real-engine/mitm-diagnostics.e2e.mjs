import http from 'node:http'
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

describe('MITM diagnostics with a real Yak engine', () => {
  it('shows a slow upstream phase, links to the saved flow, and clears on stop', async () => {
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
    await openMITMV2ThroughUI()

    const proxyPort = await reserveLoopbackPort()
    let finishOrigin
    let markOriginReached
    const originReached = new Promise((resolve) => {
      markOriginReached = resolve
    })
    const slowOrigin = http.createServer((_req, res) => {
      finishOrigin = () => res.end('MITM diagnostics test')
      res.setHeader('Content-Type', 'text/plain')
      markOriginReached()
    })
    await new Promise((resolve, reject) => {
      slowOrigin.once('error', reject)
      slowOrigin.listen(0, '127.0.0.1', resolve)
    })
    let proxyRequest
    try {
      await startMITMV2ThroughUI({ host: '127.0.0.1', port: proxyPort })
      await waitForLoopbackPort({ port: proxyPort })
      const originAddr = `127.0.0.1:${slowOrigin.address().port}`
      const received = new Promise((resolve, reject) => {
        proxyRequest = http.get(
          {
            host: '127.0.0.1',
            port: proxyPort,
            path: `http://${originAddr}/mitm-diagnostics`,
            headers: { Host: originAddr },
            agent: false,
          },
          (res) => {
            res.resume()
            res.on('end', () => resolve(res.statusCode))
            res.on('error', reject)
          },
        )
        proxyRequest.on('error', reject)
        proxyRequest.setTimeout(25_000, () => proxyRequest.destroy(new Error('Timed out reaching the loopback origin')))
      })
      await Promise.race([
        originReached,
        received.then((code) => {
          throw new Error(`Proxy returned ${code} before reaching the loopback origin`)
        }),
      ])

      const trigger = await $('button[aria-label^="MITM 实时处理状态，每秒"]')
      await trigger.waitForClickable()
      await trigger.click()
      await clickText('打开流量诊断')
      const drawer = await $('[role="dialog"]')
      await drawer.waitForDisplayed()
      const firstByte = await drawer.$('.//h3[normalize-space(.)="等待上游首包"]')
      await firstByte.waitForDisplayed({ timeout: 10000 })
      await clickText('查看请求轨迹')
      const details = await $('[aria-label="请求阶段明细"]')
      await details.waitForDisplayed()
      await browser.waitUntil(async () => (await details.getText()).includes('等待上游首包'))
      finishOrigin()
      expect(await received).toBe(200)

      await clickText('近期慢请求', 'label')
      await browser.waitUntil(async () => (await details.getText()).includes('查看流量 #'))
      await clickText('入库压力', 'div[@role="tab"]')
      await $('[role="progressbar"][aria-label="共享写队列占用"]').waitForDisplayed()
      await browser.keys('Escape')
      await drawer.waitForDisplayed({ reverse: true })
      await stopMITMV2ThroughUI()
      await waitForLoopbackPortClosed({ port: proxyPort })
      await trigger.waitForExist({ reverse: true })
    } finally {
      proxyRequest?.destroy()
      slowOrigin.closeAllConnections()
      await new Promise((resolve) => slowOrigin.close(resolve))
    }
  })
})
