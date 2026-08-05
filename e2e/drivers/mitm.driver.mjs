import { MAIN_WINDOW_URL, replaceInputValue } from './application.driver.mjs'
import { runIdempotentElectronCDPCommand } from '../fixtures/electron/electron-cdp-retry.mjs'

const distribution = (values) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (!sorted.length) return { count: 0 }
  const at = (ratio) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))]
  return {
    count: sorted.length,
    min: sorted[0],
    p50: at(0.5),
    p95: at(0.95),
    p99: at(0.99),
    max: sorted[sorted.length - 1],
  }
}

export const openMITMV2ThroughUI = async () => {
  await browser.switchToYakitWindow(MAIN_WINDOW_URL)
  let entry = await $('[data-testid="home-open-mitm-v2"]')
  await entry.waitForClickable({
    timeout: 30_000,
    timeoutMsg: 'The Main home page did not expose the MITM V2 entry',
  })
  await entry.click()

  const page = await $('[data-testid="mitm-page"]')
  const openedOnFirstClick = await browser
    .waitUntil(
      async () => {
        try {
          return (await page.isExisting()) && (await page.isDisplayed())
        } catch {
          return false
        }
      },
      { timeout: 3_000, interval: 200 },
    )
    .then(
      () => true,
      () => false,
    )
  if (!openedOnFirstClick) {
    // Project selection can remount Home immediately after the entry becomes
    // clickable. Re-resolve the card and target its own click handler once.
    entry = await $('[data-testid="home-open-mitm-v2"]')
    await entry.waitForClickable({
      timeout: 10_000,
      timeoutMsg: 'The Main home page did not recover the MITM V2 entry after project selection',
    })
    await browser.execute((element) => element.click(), entry)
  }
  await page.waitForDisplayed({ timeout: 30_000, timeoutMsg: 'The MITM V2 page did not become visible' })
  await browser.waitUntil(async () => (await page.getAttribute('data-mitm-version')) === 'V2', {
    timeout: 5_000,
    timeoutMsg: 'The opened MITM page is not MITM V2',
  })
}

export const startMITMV2ThroughUI = async ({ host, port }) => {
  const page = await $('[data-testid="mitm-page"]')
  await browser.waitUntil(async () => (await page.getAttribute('data-mitm-status')) === 'idle', {
    timeout: 15_000,
    timeoutMsg: 'MITM V2 did not expose its idle start form',
  })
  await $('[data-testid="mitm-start-form"]').waitForDisplayed()

  const hostInput = await $('input[data-testid="mitm-listen-host"], [data-testid="mitm-listen-host"] input')
  const portInput = await $('input[data-testid="mitm-listen-port"], [data-testid="mitm-listen-port"] input')
  await hostInput.waitForDisplayed()
  await portInput.waitForDisplayed()
  await replaceInputValue(hostInput, host, 'MITM listen host')
  await replaceInputValue(portInput, port, 'MITM listen port')
  await $('[data-testid="mitm-start"]').click()

  await browser.waitUntil(async () => (await page.getAttribute('data-mitm-status')) === 'hijacking', {
    timeout: 30_000,
    timeoutMsg: 'MITM V2 did not enter the hijacking state',
  })
  await $('[data-testid="mitm-flow-table"]').waitForDisplayed({
    timeout: 30_000,
    timeoutMsg: 'MITM V2 started but its live HTTP flow table did not mount',
  })
}

export const stopMITMV2ThroughUI = async () => {
  const page = await $('[data-testid="mitm-page"]')
  const status = await page.getAttribute('data-mitm-status')
  if (status === 'idle') return

  const stop = await $('[data-testid="mitm-stop"]')
  await stop.waitForClickable()
  await stop.click()
  await browser.waitUntil(async () => (await page.getAttribute('data-mitm-status')) === 'idle', {
    timeout: 15_000,
    timeoutMsg: 'MITM V2 did not return to idle after Stop',
  })
}

export const resetMITMObservability = async () => {
  await browser.switchToYakitWindow(MAIN_WINDOW_URL)
  await browser.waitUntil(
    async () =>
      browser.execute(() => {
        const observability = window.__YAKIT_MITM_FLOW_OBSERVABILITY__
        if (!observability) throw new Error('MITM flow observability is not installed')
        return observability.resetIfIdle()
      }),
    {
      timeout: 15_000,
      interval: 50,
      timeoutMsg: 'MITM observability did not become idle before reset',
    },
  )
}

export const setMITMBackendSystemTimingEnabled = async (enabled) => {
  await browser.switchToYakitWindow(MAIN_WINDOW_URL)
  return browser.execute((nextEnabled) => {
    if (!window.__YAKIT_MITM_FLOW_OBSERVABILITY__) throw new Error('MITM flow observability is not installed')
    window.__YAKIT_MITM_FLOW_OBSERVABILITY__.setBackendSystemTimingEnabled(nextEnabled === true)
    return window.__YAKIT_MITM_FLOW_OBSERVABILITY__.snapshot().config.backendSystemTimingEnabled
  }, enabled)
}

export const setMITMSkipLiveExactTotalEnabled = async (enabled) => {
  await browser.switchToYakitWindow(MAIN_WINDOW_URL)
  return browser.execute((nextEnabled) => {
    if (!window.__YAKIT_MITM_FLOW_OBSERVABILITY__) throw new Error('MITM flow observability is not installed')
    window.__YAKIT_MITM_FLOW_OBSERVABILITY__.setSkipLiveExactTotalEnabled(nextEnabled === true)
    return window.__YAKIT_MITM_FLOW_OBSERVABILITY__.snapshot().config.skipLiveExactTotalEnabled
  }, enabled)
}

export const setMITMFlowCommittedShadowEnabled = async (enabled) => {
  await browser.switchToYakitWindow(MAIN_WINDOW_URL)
  return browser.execute(async (nextEnabled) => {
    if (!window.__YAKIT_MITM_FLOW_SHADOW__) throw new Error('MITM FlowCommitted shadow controller is not installed')
    await window.__YAKIT_MITM_FLOW_SHADOW__.setEnabled(nextEnabled === true)
    return window.__YAKIT_MITM_FLOW_SHADOW__.isEnabled()
  }, enabled)
}

export const setMITMFlowCommittedMode = async (mode) => {
  await browser.switchToYakitWindow(MAIN_WINDOW_URL)
  return browser.execute(async (nextMode) => {
    if (!window.__YAKIT_MITM_FLOW_SHADOW__) throw new Error('MITM FlowCommitted controller is not installed')
    await window.__YAKIT_MITM_FLOW_SHADOW__.setMode(nextMode)
    return window.__YAKIT_MITM_FLOW_SHADOW__.getMode()
  }, mode)
}

export const setMITMHTTPFlowLiveStreamMode = async (mode) => {
  await browser.switchToYakitWindow(MAIN_WINDOW_URL)
  return browser.execute((nextMode) => {
    if (!window.__YAKIT_MITM_FLOW_OBSERVABILITY__) throw new Error('MITM flow observability is not installed')
    window.__YAKIT_MITM_FLOW_OBSERVABILITY__.setHTTPFlowLiveStreamMode(nextMode)
    return window.__YAKIT_MITM_FLOW_OBSERVABILITY__.snapshot().config.httpFlowLiveStreamMode
  }, mode)
}

export const getMITMObservabilitySnapshot = async () => {
  await browser.switchToYakitWindow(MAIN_WINDOW_URL)
  return browser.execute(() => {
    if (!window.__YAKIT_MITM_FLOW_OBSERVABILITY__) throw new Error('MITM flow observability is not installed')
    return window.__YAKIT_MITM_FLOW_OBSERVABILITY__.snapshot()
  })
}

export const getMITMPipelineSnapshot = async () => {
  await browser.switchToYakitWindow(MAIN_WINDOW_URL)
  return browser.execute(() => {
    if (!window.__YAKIT_MITM_FLOW_OBSERVABILITY__) throw new Error('MITM flow observability is not installed')
    return window.__YAKIT_MITM_FLOW_OBSERVABILITY__.pipelineSnapshot()
  })
}

export const queryMITMScenarioFlows = async ({ token, limit }) => {
  await browser.switchToYakitWindow(MAIN_WINDOW_URL)
  return browser.execute(
    async ({ scenarioToken, queryLimit }) => {
      const { ipcRenderer } = window.require('electron')
      const response = await ipcRenderer.invoke('QueryHTTPFlows', {
        SourceType: 'mitm',
        SearchURL: scenarioToken,
        Full: false,
        ExcludeResponseRaw: true,
        ExcludeRequestRaw: true,
        Pagination: {
          Page: 1,
          Limit: queryLimit,
          Order: 'asc',
          OrderBy: 'id',
        },
      })
      return {
        total: Number(response.Total || 0),
        flows: (response.Data || []).map((flow) => ({
          id: Number(flow.Id),
          url: flow.Url,
          statusCode: Number(flow.StatusCode),
          sourceType: flow.SourceType,
        })),
      }
    },
    { scenarioToken: token, queryLimit: limit },
  )
}

export const queryHTTPFlowPacketSummaryById = async (id) => {
  await browser.switchToYakitWindow(MAIN_WINDOW_URL)
  return browser.execute(async (flowId) => {
    const { ipcRenderer } = window.require('electron')
    const flow = await ipcRenderer.invoke('GetHTTPFlowById', { Id: flowId })
    const packetSummary = (raw) => {
      const packet = raw || []
      let separator = -1
      for (let index = 0; index <= packet.length - 4; index += 1) {
        if (packet[index] === 13 && packet[index + 1] === 10 && packet[index + 2] === 13 && packet[index + 3] === 10) {
          separator = index
          break
        }
      }
      return {
        packetBytes: packet.length,
        bodyBytes: separator < 0 ? 0 : packet.length - separator - 4,
      }
    }
    return {
      id: Number(flow.Id),
      request: packetSummary(flow.Request),
      response: packetSummary(flow.Response),
    }
  }, id)
}

export const isScenarioRenderedInMITMTable = async (token) => {
  await browser.switchToYakitWindow(MAIN_WINDOW_URL)
  return browser.execute(
    (scenarioToken) =>
      document.querySelector('[data-testid="mitm-flow-table"]')?.textContent?.includes(scenarioToken) === true,
    token,
  )
}

export const startScenarioRenderObserver = async (token) => {
  await browser.switchToYakitWindow(MAIN_WINDOW_URL)
  const installObserver = () =>
    browser.execute((scenarioToken) => {
      window.__YAKIT_E2E_SCENARIO_RENDER_OBSERVER__?.observer?.disconnect()
      const table = document.querySelector('[data-testid="mitm-flow-table"]')
      if (!table) throw new Error('MITM flow table is not mounted')
      const state = {
        token: scenarioToken,
        startedAtUnixMs: Date.now(),
        firstVisibleAtUnixMs: 0,
        observer: undefined,
      }
      const inspect = () => {
        if (state.firstVisibleAtUnixMs || !table.textContent?.includes(scenarioToken)) return
        state.firstVisibleAtUnixMs = Date.now()
        state.observer?.disconnect()
      }
      const observer = new MutationObserver(inspect)
      state.observer = observer
      observer.observe(table, { childList: true, subtree: true, characterData: true })
      window.__YAKIT_E2E_SCENARIO_RENDER_OBSERVER__ = state
      inspect()
      return state.startedAtUnixMs
    }, token)

  return runIdempotentElectronCDPCommand(installObserver, {
    onRetry: async () => {
      console.warn('[electron-e2e] retrying scenario observer after transient Electron CDP collection')
      await browser.switchToYakitWindow(MAIN_WINDOW_URL)
    },
  })
}

export const getScenarioRenderObservation = async ({ stop = false } = {}) => {
  await browser.switchToYakitWindow(MAIN_WINDOW_URL)
  return browser.execute((shouldStop) => {
    const state = window.__YAKIT_E2E_SCENARIO_RENDER_OBSERVER__
    if (!state) return undefined
    if (shouldStop) {
      state.observer?.disconnect()
      delete window.__YAKIT_E2E_SCENARIO_RENDER_OBSERVER__
    }
    return {
      token: state.token,
      startedAtUnixMs: state.startedAtUnixMs,
      firstVisibleAtUnixMs: state.firstVisibleAtUnixMs,
      seen: state.firstVisibleAtUnixMs > 0,
    }
  }, stop)
}

export const getMITMTableDOMSnapshot = async () => {
  await browser.switchToYakitWindow(MAIN_WINDOW_URL)
  return browser.execute(() => {
    const root = document.querySelector('[data-testid="mitm-flow-table"]')
    if (!root) throw new Error('MITM flow table is not mounted')
    const byModuleClass = (name) =>
      [...root.querySelectorAll('[class]')].find((element) =>
        [...element.classList].some((className) => className === name || className.includes(`_${name}__`)),
      )
    const box = (element) => {
      if (!element) return undefined
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return {
        clientWidth: element.clientWidth,
        clientHeight: element.clientHeight,
        scrollWidth: element.scrollWidth,
        scrollHeight: element.scrollHeight,
        rect: { width: rect.width, height: rect.height, top: rect.top, left: rect.left },
        style: {
          display: style.display,
          position: style.position,
          overflowX: style.overflowX,
          overflowY: style.overflowY,
          contain: style.contain,
        },
      }
    }
    const columnContainers = [...root.querySelectorAll('[class*="virtual-table-row-content"]')]
    const rowCounts = columnContainers.map((column) => column.children.length)
    const listContainer = byModuleClass('virtual-table-list-container')
    const list = byModuleClass('virtual-table-list')
    return {
      descendantElements: root.querySelectorAll('*').length,
      columnContainers: columnContainers.length,
      renderedRows: rowCounts.length ? Math.max(...rowCounts) : 0,
      renderedCells: root.querySelectorAll('[class*="virtual-table-row-cell"]').length,
      rowCounts,
      root: box(root),
      listContainer: box(listContainer),
      list: box(list),
      document: {
        elements: document.querySelectorAll('*').length,
        clientWidth: document.documentElement.clientWidth,
        clientHeight: document.documentElement.clientHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
      },
    }
  })
}

export const setMITMTableConsumerPosition = async (position) => {
  if (!['away', 'top'].includes(position)) throw new Error(`Unsupported MITM table consumer position: ${position}`)
  await browser.switchToYakitWindow(MAIN_WINDOW_URL)
  return browser.execute(async (targetPosition) => {
    const root = document.querySelector('[data-testid="mitm-flow-table"]')
    if (!root) throw new Error('MITM flow table is not mounted')
    const byModuleClass = (name) =>
      [...root.querySelectorAll('[class]')].find((element) =>
        [...element.classList].some((className) => className === name || className.includes(`_${name}__`)),
      )
    const container = byModuleClass('virtual-table-list-container')
    const firstColumn = root.querySelector('[class*="virtual-table-row-content"]')
    if (!container || !firstColumn) throw new Error('MITM virtual table DOM is incomplete')
    const settle = () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 20)))
      })
    const read = () => ({
      scrollTop: container.scrollTop,
      clientHeight: container.clientHeight,
      scrollHeight: container.scrollHeight,
      renderedRows: firstColumn.children.length,
      firstRowText: firstColumn.firstElementChild?.textContent || '',
    })

    const before = read()
    const maximumScrollTop = Math.max(0, before.scrollHeight - before.clientHeight)
    const targetScrollTop =
      targetPosition === 'top'
        ? 0
        : Math.min(maximumScrollTop, Math.max(28 * 20, Math.floor(before.clientHeight * 0.75)))
    container.scrollTop = targetScrollTop
    container.dispatchEvent(new Event('scroll'))
    await settle()
    const after = read()
    return {
      position: targetPosition,
      before,
      after,
      maximumScrollTop,
      targetScrollTop,
      atRequestedPosition: targetPosition === 'top' ? after.scrollTop < 10 : after.scrollTop >= 10,
    }
  }, position)
}

export const exerciseMITMTableVirtualScroll = async () => {
  await browser.switchToYakitWindow(MAIN_WINDOW_URL)
  return browser.execute(async () => {
    const root = document.querySelector('[data-testid="mitm-flow-table"]')
    if (!root) throw new Error('MITM flow table is not mounted')
    const byModuleClass = (name) =>
      [...root.querySelectorAll('[class]')].find((element) =>
        [...element.classList].some((className) => className === name || className.includes(`_${name}__`)),
      )
    const container = byModuleClass('virtual-table-list-container')
    if (!container) throw new Error('MITM virtual table DOM is incomplete')
    const read = () => {
      const list = byModuleClass('virtual-table-list')
      const firstColumn = root.querySelector('[class*="virtual-table-row-content"]')
      if (!list || !firstColumn) throw new Error('MITM virtual table DOM is incomplete')
      return {
        scrollTop: container.scrollTop,
        renderedRows: firstColumn.children.length,
        firstRowText: firstColumn.firstElementChild?.textContent || '',
        marginTop: getComputedStyle(list).marginTop,
      }
    }
    const waitFor = async (predicate) => {
      const startedAt = performance.now()
      const deadline = startedAt + 1_500
      let samples = 0
      let state = read()
      while (!predicate(state) && performance.now() < deadline) {
        await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 25)))
        samples += 1
        state = read()
      }
      return {
        state,
        samples,
        durationMs: Math.max(0, performance.now() - startedAt),
        timedOut: !predicate(state),
      }
    }

    const before = read()
    const targetScrollTop = Math.min(Math.max(0, container.scrollHeight - container.clientHeight), 28 * 40)
    container.scrollTop = targetScrollTop
    container.dispatchEvent(new Event('scroll'))
    const movedObservation = await waitFor(
      (state) =>
        targetScrollTop > 0 &&
        state.scrollTop > 0 &&
        state.renderedRows > 0 &&
        state.firstRowText !== before.firstRowText &&
        Number.parseFloat(state.marginTop) > 0,
    )
    const after = movedObservation.state

    container.scrollTop = 0
    container.dispatchEvent(new Event('scroll'))
    const restoredObservation = await waitFor(
      (state) =>
        state.scrollTop === 0 &&
        state.renderedRows > 0 &&
        state.firstRowText === before.firstRowText &&
        Number.parseFloat(state.marginTop) === 0,
    )
    const restored = restoredObservation.state
    return {
      before,
      after,
      restored,
      targetScrollTop,
      moved: !movedObservation.timedOut,
      restoredToTop: !restoredObservation.timedOut,
      observation: {
        moved: {
          durationMs: movedObservation.durationMs,
          samples: movedObservation.samples,
          timedOut: movedObservation.timedOut,
        },
        restored: {
          durationMs: restoredObservation.durationMs,
          samples: restoredObservation.samples,
          timedOut: restoredObservation.timedOut,
        },
      },
    }
  })
}

export const collectElectronProcessMetrics = async () =>
  browser.electron.execute((electron) =>
    electron.app.getAppMetrics().map((metric) => ({
      pid: metric.pid,
      type: metric.type,
      cpuPercent: metric.cpu?.percentCPUUsage ?? 0,
      workingSetSizeKB: metric.memory?.workingSetSize ?? 0,
      peakWorkingSetSizeKB: metric.memory?.peakWorkingSetSize ?? 0,
    })),
  )

export const startRendererLongTaskObserver = async () => {
  await browser.switchToYakitWindow(MAIN_WINDOW_URL)
  return browser.execute(() => {
    window.__YAKIT_E2E_LONG_TASK_OBSERVER__?.disconnect()
    window.__YAKIT_E2E_LONG_TASKS__ = []
    window.__YAKIT_E2E_LONG_TASK_SUPPORTED__ = false
    window.__YAKIT_E2E_LONG_TASK_STARTED_AT__ = performance.now()
    window.__YAKIT_E2E_LONG_TASK_STARTED_AT_UNIX_MS__ = Date.now()
    if (typeof PerformanceObserver === 'undefined') return false
    const supported = PerformanceObserver.supportedEntryTypes?.includes('longtask') === true
    if (!supported) return false
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.startTime >= window.__YAKIT_E2E_LONG_TASK_STARTED_AT__) {
          window.__YAKIT_E2E_LONG_TASKS__.push(entry.duration)
        }
      }
    })
    observer.observe({ type: 'longtask' })
    window.__YAKIT_E2E_LONG_TASK_OBSERVER__ = observer
    window.__YAKIT_E2E_LONG_TASK_SUPPORTED__ = true
    return true
  })
}

export const stopRendererLongTaskObserver = async () => {
  await browser.switchToYakitWindow(MAIN_WINDOW_URL)
  const result = await browser.execute(() => {
    const observer = window.__YAKIT_E2E_LONG_TASK_OBSERVER__
    const startedAt = window.__YAKIT_E2E_LONG_TASK_STARTED_AT__
    for (const entry of observer?.takeRecords?.() || []) {
      if (entry.startTime >= startedAt) window.__YAKIT_E2E_LONG_TASKS__.push(entry.duration)
    }
    observer?.disconnect()
    const values = [...(window.__YAKIT_E2E_LONG_TASKS__ || [])]
    const supported = window.__YAKIT_E2E_LONG_TASK_SUPPORTED__ === true
    const observationDurationMs = Number.isFinite(startedAt) ? Math.max(0, performance.now() - startedAt) : 0
    const startedAtUnixMs = window.__YAKIT_E2E_LONG_TASK_STARTED_AT_UNIX_MS__
    const memory = performance.memory
      ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        }
      : undefined
    delete window.__YAKIT_E2E_LONG_TASK_OBSERVER__
    delete window.__YAKIT_E2E_LONG_TASKS__
    delete window.__YAKIT_E2E_LONG_TASK_SUPPORTED__
    delete window.__YAKIT_E2E_LONG_TASK_STARTED_AT__
    delete window.__YAKIT_E2E_LONG_TASK_STARTED_AT_UNIX_MS__
    return { supported, values, memory, observationDurationMs, startedAtUnixMs }
  })
  return {
    supported: result.supported,
    startedAtUnixMs: result.startedAtUnixMs,
    observationDurationMs: result.observationDurationMs,
    durationMs: distribution(result.values || []),
    totalDurationMs: (result.values || []).reduce((sum, value) => sum + value, 0),
    memory: result.memory,
  }
}
