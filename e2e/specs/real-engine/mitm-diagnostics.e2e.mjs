import http from 'node:http'
import path from 'node:path'
import { writeFile } from 'node:fs/promises'
import {
  confirmStartupWorkspace,
  connectRemoteEngineThroughUI,
  enterDefaultProjectThroughUI,
  waitForMainWindow,
} from '../../drivers/application.driver.mjs'
import {
  getMITMPipelineSnapshot,
  isScenarioRenderedInMITMTable,
  openMITMV2ThroughUI,
  queryMITMScenarioFlows,
  startMITMV2ThroughUI,
  stopMITMV2ThroughUI,
} from '../../drivers/mitm.driver.mjs'
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

const waitForPlot = (name) =>
  browser.waitUntil(
    () =>
      browser.execute((label) => {
        const plot = document.querySelector(`[role="img"][aria-label="${label}"]`)
        const canvas = plot?.querySelector('canvas')
        return (
          !!canvas &&
          plot.clientWidth > 0 &&
          plot.clientHeight > 0 &&
          Math.abs(canvas.clientWidth - plot.clientWidth) <= 2 &&
          Math.abs(canvas.clientHeight - plot.clientHeight) <= 2
        )
      }, name),
    { timeout: 10000, timeoutMsg: `Chart did not fill its container after switching tabs: ${name}` },
  )
const capture = (name) => browser.saveScreenshot(path.join(process.env.YAKIT_E2E_ARTIFACTS_DIR, `${name}.png`))

const excludeHostFromCapture = (host) =>
  browser.execute((hostname) => {
    const { ipcRenderer } = window.require('electron')
    const channel = 'client-mitmV2-filter'
    return new Promise((resolve, reject) => {
      const onFilter = (_, data) => {
        if (!data?.ExcludeHostnames?.some((item) => item.Group?.includes(hostname))) return
        ipcRenderer.removeListener(channel, onFilter)
        resolve()
      }
      ipcRenderer.on(channel, onFilter)
      ipcRenderer
        .invoke('mitmV2-filter', {
          UpdateFilter: true,
          FilterData: { ExcludeHostnames: [{ MatcherType: 'word', Group: [hostname] }] },
        })
        .catch((error) => {
          ipcRenderer.removeListener(channel, onFilter)
          reject(error)
        })
    })
  }, host)

const nextPipelineStats = () =>
  browser.execute(() => {
    const { ipcRenderer } = window.require('electron')
    return new Promise((resolve) => ipcRenderer.once('client-mitmV2-pipeline-stats', (_, stats) => resolve(stats)))
  })

const importPluginFlow = async (route) => {
  const harPath = path.join(process.env.YAKIT_E2E_ARTIFACTS_DIR, 'mitm-live-plugin-flow.har')
  await writeFile(
    harPath,
    JSON.stringify({
      log: {
        version: '1.2',
        creator: { name: 'Yakit E2E', version: '1' },
        entries: [
          {
            startedDateTime: new Date().toISOString(),
            time: 0,
            request: {
              method: 'GET',
              url: `http://127.0.0.1/${route}`,
              headers: [{ name: 'Host', value: '127.0.0.1' }],
            },
            response: { status: 200, statusText: 'OK' },
          },
        ],
      },
    }),
  )
  await browser.execute((inputPath) => {
    const { ipcRenderer } = window.require('electron')
    const token = crypto.randomUUID()
    return new Promise((resolve, reject) => {
      ipcRenderer.once(`${token}-end`, () => resolve())
      ipcRenderer.once(`${token}-error`, (_, error) => reject(new Error(String(error))))
      ipcRenderer.invoke('ImportHTTPFlowStream', { InputPath: inputPath }, token).catch(reject)
    })
  }, harPath)
}

describe('MITM diagnostics with a real Yak engine', () => {
  it('keeps forwarding, saving and refreshing captures with filtered requests in flight', async () => {
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
    const browserCount = 96
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
    let releaseBackground = false
    const originResponses = new Set()
    const slowOrigin = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'text/plain')
      if (releaseBackground) {
        res.end('Filtered flow')
        return
      }
      originResponses.add(res)
      res.on('close', () => originResponses.delete(res))
    })
    let ordinaryResponse
    const fastOrigin = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'text/plain')
      if (req.url.startsWith('/mitm-scope-')) {
        res.end('New MITM flow')
        return
      }
      ordinaryResponse = res
    })
    const origins = [slowOrigin, fastOrigin]
    await Promise.all(
      origins.map(
        (origin) =>
          new Promise((resolve, reject) => {
            origin.once('error', reject)
            origin.listen(0, '127.0.0.1', resolve)
          }),
      ),
    )
    const proxyRequests = new Set()
    const send = (host, route, origin = fastOrigin) => {
      const target = `${host}:${origin.address().port}`
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
        proxyRequests.add(request)
        request.once('close', () => proxyRequests.delete(request))
      })
      // Cleanup can close sockets after an assertion fails.
      received.catch(() => {})
      return received
    }
    let holdBackground = true
    const observations = []
    const checkCapture = async (view) => {
      let pending = 0
      await browser.waitUntil(
        async () => {
          const stats = await nextPipelineStats()
          pending = (stats.Diagnostics?.HTTPStages ?? []).reduce((sum, phase) => sum + Number(phase.FilteredCount), 0)
          return pending >= 90
        },
        { timeout: 10000, timeoutMsg: 'Expected at least 90 filtered requests in flight' },
      )
      const token = `mitm-scope-${view}`
      const routes = Array.from({ length: 4 }, (_, index) => `${token}-${index}`)
      const started = performance.now()
      expect(await Promise.all(routes.map((route) => send('127.0.0.1', route)))).toEqual([200, 200, 200, 200])
      const forwardedMs = Math.round(performance.now() - started)
      await browser.waitUntil(
        () =>
          browser.execute((urls) => {
            const table = document.querySelector('[data-testid="mitm-flow-table"]')?.textContent ?? ''
            return urls.every((url) => table.includes(url))
          }, routes),
        { timeout: 10000, timeoutMsg: `The live MITM table did not show new flows while ${view}` },
      )
      const visibleMs = Math.round(performance.now() - started)
      expect((await queryMITMScenarioFlows({ token, limit: 4 })).total).toBe(4)
      observations.push({ view, pending, forwardedMs, visibleMs, saved: 4 })
    }
    try {
      await startMITMV2ThroughUI({ host: '127.0.0.1', port: proxyPort })
      await waitForLoopbackPort({ port: proxyPort })
      await excludeHostFromCapture(browserHost)
      const initialWrites = Number((await nextPipelineStats()).PersistEnqueuedTotal)
      const background = Array.from({ length: browserCount }, async (_, index) => {
        // Keep pressure through the origin timeouts until the UI checks finish.
        while (holdBackground) {
          await send(browserHost, `autofill-${index}`, slowOrigin).catch(() => {})
        }
      })
      await checkCapture('closed')

      const trigger = await $('button[aria-label^="MITM 实时处理状态，每秒"]')
      await trigger.waitForClickable()
      await trigger.click()
      expect(await $('.ant-popover:not(.ant-popover-hidden)').getText()).not.toContain('Chrome 自动填充')
      await clickText('打开流量诊断')
      const drawer = await $('[role="dialog"]')
      await drawer.waitForDisplayed()
      await waitForPlot('请求收发速率')
      await clickText('入库压力', 'div[@role="tab"]')
      await waitForPlot('本会话待写数量趋势')
      await waitForPlot('提交与写入速率')
      await clickText('实时状态', 'div[@role="tab"]')
      await waitForPlot('请求收发速率')
      expect(await drawer.getText()).toContain('Chrome 自动填充')
      await capture('mitm-diagnostics-live')
      await clickText('等待上游首包')
      await browser.waitUntil(async () => (await drawer.getText()).includes('跟随 MITM 过滤器'))
      expect(await drawer.getText()).not.toContain(browserHost)
      await checkCapture('capture')
      await clickText('包含已过滤请求', 'label')

      const records = await $('[aria-label="选择请求"]')
      const details = await $('[aria-label="请求阶段明细"]')
      await records.waitForDisplayed()
      await browser.waitUntil(async () => (await details.getText()).includes('Chrome 自动填充'))
      expect(await records.$$('button')).toHaveLength(24)
      expect(await details.getText()).toContain('命中 MITM 请求过滤规则')
      await checkCapture('expanded')
      const layout = await browser.execute(() => {
        const list = document.querySelector('[aria-label="选择请求"]')
        const tab = list.closest('[role="tabpanel"]').getBoundingClientRect()
        const rect = list.parentElement.getBoundingClientRect()
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
            detail.getBoundingClientRect().top > list.parentElement.getBoundingClientRect().bottom &&
            detail.getBoundingClientRect().right <= innerWidth &&
            detail.scrollWidth <= detail.clientWidth
          )
        }),
      )
      await capture('mitm-diagnostics-narrow')
      await resizeMain(1180, 1000)

      const ordinary = send('127.0.0.1', 'mitm-diagnostics')
      await browser.waitUntil(() => !!ordinaryResponse)
      await clickText('实时状态', 'div[@role="tab"]')
      const firstByte = await drawer.$('.//h3[normalize-space(.)="等待上游首包"]')
      await firstByte.waitForDisplayed({ timeout: 10000 })
      await clickText('查看请求轨迹')
      await details.waitForDisplayed()
      await $('[aria-label="阶段耗时瀑布图"]').waitForDisplayed()
      expect(await details.getText()).toContain('GET 127.0.0.1')
      expect(await records.$$('button')).toHaveLength(1)
      ordinaryResponse.end('MITM diagnostics test')
      expect(await ordinary).toBe(200)

      await clickText('近期慢请求', 'label')
      await browser.waitUntil(async () => (await details.getText()).includes('查看流量 #'))
      await clickText('入库压力', 'div[@role="tab"]')
      await $('[role="progressbar"][aria-label="共享写队列占用"]').waitForDisplayed()
      await waitForPlot('本会话待写数量趋势')
      await waitForPlot('提交与写入速率')
      await capture('mitm-diagnostics-storage')
      await browser.keys('Escape')
      await drawer.waitForDisplayed({ reverse: true })
      await checkCapture('reclosed')
      holdBackground = false
      releaseBackground = true
      for (const response of originResponses) response.end('Filtered flow')
      await Promise.all(background)

      // Fill the actual 100-slot HTTP/1.1 pool. Releasing the slow requests
      // should unblock a capture that was genuinely waiting on a slot.
      releaseBackground = false
      const saturated = Array.from({ length: 104 }, (_, index) =>
        send(browserHost, `autofill-full-${index}`, slowOrigin),
      )
      await browser.waitUntil(() => originResponses.size === 100)
      const recoveredRoute = 'mitm-scope-recovered'
      const recovered = send('127.0.0.1', recoveredRoute)
      let poolWait
      await browser.waitUntil(
        async () => {
          const stats = await nextPipelineStats()
          poolWait = stats.Diagnostics?.HTTPStages?.find((phase) => phase.Stage === 'pool_wait')
          return Number(poolWait?.InScopeOtherCount) === 1 && Number(poolWait?.FilteredCount) > 0
        },
        { timeout: 5000, timeoutMsg: 'Expected the capture to wait on the same full HTTP/1.1 pool' },
      )
      releaseBackground = true
      for (const response of originResponses) response.end('Filtered flow')
      expect(await recovered).toBe(200)
      expect(await Promise.all(saturated)).toEqual(Array(104).fill(200))
      await browser.waitUntil(() => isScenarioRenderedInMITMTable(recoveredRoute))
      expect((await queryMITMScenarioFlows({ token: recoveredRoute, limit: 1 })).total).toBe(1)
      expect(Number((await nextPipelineStats()).PersistEnqueuedTotal) - initialWrites).toBe(18)
      expect((await queryMITMScenarioFlows({ token: 'autofill-', limit: 1 })).total).toBe(0)
      await writeFile(
        path.join(process.env.YAKIT_E2E_ARTIFACTS_DIR, 'mitm-filter-scope.json'),
        JSON.stringify({ observations, saturatedPoolWait: poolWait, recovered: true }, null, 2),
      )

      const queryCount = (await getMITMPipelineSnapshot()).state.querySamples
      const pluginSource = await $(
        '//div[contains(@class,"mitm-log-heard-left")]//span[contains(@class,"ant-tag-checkable") and normalize-space(.)="插件"]',
      )
      await pluginSource.click()
      await browser.waitUntil(async () => (await getMITMPipelineSnapshot()).state.querySamples > queryCount)
      const pluginRoute = 'mitm-live-plugin-flow'
      await importPluginFlow(pluginRoute)
      await browser.waitUntil(() => isScenarioRenderedInMITMTable(pluginRoute), {
        timeout: 5000,
        timeoutMsg: 'The MITM table did not display a newly imported plugin flow with both sources selected',
      })

      await stopMITMV2ThroughUI()
      await waitForLoopbackPortClosed({ port: proxyPort })
      await trigger.waitForExist({ reverse: true })
    } finally {
      holdBackground = false
      for (const request of proxyRequests) request.destroy()
      await Promise.all(
        origins.map((origin) => {
          origin.closeAllConnections()
          return new Promise((resolve) => origin.close(resolve))
        }),
      )
    }
  })
})
