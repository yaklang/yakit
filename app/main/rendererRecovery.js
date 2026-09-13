const RECOVERY_TIMEOUT_MS = 20_000
const CRASH_WINDOW_MS = 60_000
const MAX_FAILURES = 3

const messages = {
  zh: {
    title: '界面恢复',
    failed: '界面已停止运行',
    hung: '界面暂时没有响应',
    repeated: '界面连续恢复失败',
    detail: '可以尝试恢复界面，或回到引擎连接页。未保存的界面内容可能丢失；后台任务状态需要重新确认。',
    memory:
      '检测到内存不足或崩溃前 JS 堆用量偏高。建议先导出诊断，再回到连接页释放主界面内存；重新连接后减少同时打开的页面和数据量。高堆用量不能单独证明崩溃原因。',
    limited: '一分钟内已发生多次故障，已停止提供重复重载。请导出诊断，然后回到连接页或退出软件。',
    recover: '恢复界面',
    connection: '回到连接页',
    export: '导出诊断',
    exit: '退出软件',
    wait: '稍后处理',
    exportTitle: '导出诊断（包含日志和崩溃内存片段，分享前请检查）',
    exportError: '导出失败，请选择其他保存位置后重试。',
  },
  'zh-TW': {
    title: '介面復原',
    failed: '介面已停止執行',
    hung: '介面暫時沒有回應',
    repeated: '介面連續復原失敗',
    detail: '可以嘗試復原介面，或回到引擎連線頁。未儲存的介面內容可能遺失；背景工作狀態需要重新確認。',
    memory:
      '偵測到記憶體不足或崩潰前 JS 堆用量偏高。建議先匯出診斷，再回到連線頁釋放主介面記憶體；重新連線後減少同時開啟的頁面和資料量。高堆用量不能單獨證明崩潰原因。',
    limited: '一分鐘內已發生多次故障，已停止提供重複重新載入。請匯出診斷，然後回到連線頁或退出軟體。',
    recover: '復原介面',
    connection: '回到連線頁',
    export: '匯出診斷',
    exit: '退出軟體',
    wait: '稍後處理',
    exportTitle: '匯出診斷（包含日誌和崩潰記憶體片段，分享前請檢查）',
    exportError: '匯出失敗，請選擇其他儲存位置後重試。',
  },
  en: {
    title: 'Recover interface',
    failed: 'The interface has stopped',
    hung: 'The interface is not responding',
    repeated: 'The interface keeps failing to recover',
    detail:
      'Try recovering the interface or return to the engine connection page. Unsaved content may be lost. Check the status of background tasks after reconnecting.',
    memory:
      'Out of memory was reported or high JS heap usage was observed before the crash. Export diagnostics, then return to the connection page to release the main interface memory. Reconnect with fewer open pages and less data. High heap usage alone does not prove the crash cause.',
    limited:
      'Several failures occurred within one minute. Further reloads are paused. Export diagnostics, then return to the connection page or exit.',
    recover: 'Recover interface',
    connection: 'Connection page',
    export: 'Export diagnostics',
    exit: 'Exit application',
    wait: 'Later',
    exportTitle: 'Export diagnostics (includes logs and crash memory fragments; review before sharing)',
    exportError: 'Export failed. Try another save location.',
  },
}

function createRendererRecovery({ dialog, diagnostics, reload, backToConnection, exit, onGone, getLanguage }) {
  const states = new Map()
  let stopped = false
  const text = () => messages[getLanguage()] || messages.en
  const record = (...args) => {
    try {
      return diagnostics.record(...args)
    } catch {
      // Logging failure must not prevent the native recovery controls from opening.
    }
  }

  async function exportDiagnostics(window) {
    const t = text()
    const { canceled, filePath } = await dialog.showSaveDialog(window, {
      title: t.exportTitle,
      defaultPath: `yakit-diagnostics-${Date.now()}.zip`,
      filters: [{ name: 'ZIP', extensions: ['zip'] }],
    })
    if (!canceled && filePath) await diagnostics.exportBundle(filePath)
  }

  function markReady(window) {
    const state = states.get(window)
    if (!state || state.status === 'parked' || state.ownTermination || window.webContents.isCrashed()) return
    clearTimeout(state.timer)
    if (state.status === 'recovering') record('recovery-ready', {}, window)
    state.status = 'healthy'
    state.revision++
  }

  function recover(window, ignoreCache = false) {
    const state = states.get(window)
    if (!state || stopped || window.isDestroyed()) return
    const needsNewProcess = state.ownTermination || state.cause === 'unresponsive' || state.cause === 'recovery-timeout'
    state.status = 'recovering'
    state.revision++
    clearTimeout(state.timer)
    record('recovery-requested', { forceNewProcess: needsNewProcess }, window)
    state.timer = setTimeout(() => fail(window, 'recovery-timeout', {}), RECOVERY_TIMEOUT_MS)
    state.timer.unref?.()
    try {
      if (needsNewProcess && !window.webContents.isCrashed()) {
        afterProcessExit(window, state, () => reload(window, ignoreCache))
      } else reload(window, ignoreCache)
    } catch (error) {
      state.ownTermination = false
      fail(window, 'recovery-error', { error: String(error?.message || error) })
    }
  }

  function afterProcessExit(window, state, action) {
    const revision = state.revision
    const alreadyTerminating = state.ownTermination
    state.ownTermination = true
    state.afterTermination = () => {
      if (stopped || window.isDestroyed() || state.revision !== revision) return
      try {
        action()
      } catch (error) {
        fail(window, 'recovery-error', { error: String(error?.message || error) })
      }
    }
    // forcefullyCrashRenderer is asynchronous: an immediate reload can be killed with the old process.
    if (!alreadyTerminating) window.webContents.forcefullyCrashRenderer()
  }

  function park(window) {
    const state = states.get(window)
    if (!state || stopped || window.isDestroyed()) return
    clearTimeout(state.timer)
    state.status = 'parked'
    state.revision++
    const revision = state.revision
    record('recovery-parked', {}, window)
    state.timer = setTimeout(() => fail(window, 'recovery-timeout', {}), RECOVERY_TIMEOUT_MS)
    state.timer.unref?.()
    try {
      // Keep the BrowserWindow/registered handlers, but release the old process and its application heap.
      // Do not reload the heavy Main application until the user connects again.
      const loadBlank = () => {
        void window.webContents
          .loadURL('about:blank')
          .then(() => {
            if (state.revision === revision) clearTimeout(state.timer)
          })
          .catch((error) => {
            if (state.revision === revision) fail(window, 'recovery-error', { error: String(error?.message || error) })
          })
      }
      if (!window.webContents.isCrashed()) afterProcessExit(window, state, loadBlank)
      else loadBlank()
    } catch (error) {
      state.ownTermination = false
      fail(window, 'recovery-error', { error: String(error?.message || error) })
    }
  }

  async function prompt(window) {
    const state = states.get(window)
    if (!state || stopped || state.prompting || window.isDestroyed() || !window.isVisible()) return
    state.prompting = true
    try {
      while (!stopped && !window.isDestroyed() && state.status === 'failed') {
        const revision = state.revision
        const t = text()
        const limited = state.failures.filter((time) => Date.now() - time < CRASH_WINDOW_MS).length >= MAX_FAILURES
        const actions = [...(limited ? [] : ['recover']), 'connection', 'export', 'exit', 'wait']
        const memoryPressure = ['reported-oom', 'suspected-js-heap-pressure'].includes(state.memoryAssessment?.status)
        const { response } = await dialog.showMessageBox(window, {
          type: 'warning',
          title: t.title,
          message: limited ? t.repeated : state.cause === 'unresponsive' ? t.hung : t.failed,
          detail: `${limited ? t.limited : t.detail}${memoryPressure ? `\n\n${t.memory}` : ''}\n\n${diagnostics.directory}`,
          buttons: actions.map((action) => t[action]),
          defaultId: memoryPressure ? actions.indexOf('connection') : 0,
          cancelId: actions.length - 1,
          noLink: true,
        })
        // The window can recover, navigate or close while a native dialog is open.
        if (stopped || window.isDestroyed()) return
        if (state.revision !== revision) continue
        const action = actions[response]
        if (action === 'export') {
          try {
            await exportDiagnostics(window)
          } catch (error) {
            record('diagnostics-export-failed', { error: String(error?.message || error) }, window)
            await dialog.showMessageBox(window, { type: 'error', message: t.exportError })
          }
          continue
        }
        if (action === 'recover') {
          recover(window)
          if (state.status === 'failed') continue
        }
        if (action === 'connection') {
          // Back to the connection flow deliberately drops stale credentials, without killing the engine.
          for (const targetState of states.values()) {
            clearTimeout(targetState.timer)
            targetState.status = 'healthy'
            targetState.revision++
          }
          backToConnection()
        }
        if (action === 'exit') await exit()
        return
      }
    } catch (error) {
      record('recovery-dialog-failed', { error: String(error?.message || error) }, window)
    } finally {
      state.prompting = false
    }
  }

  function fail(window, cause, details) {
    const state = states.get(window)
    if (!state || stopped) return
    clearTimeout(state.timer)
    state.status = 'failed'
    state.cause = cause
    state.ownTermination = false
    state.afterTermination = null
    state.revision++
    state.failures = state.failures.filter((time) => Date.now() - time < CRASH_WINDOW_MS)
    if (cause !== 'manual-recovery') state.failures.push(Date.now())
    const incident = record(cause, details, window)
    state.memoryAssessment =
      incident?.memoryAssessment || (details.reason === 'oom' ? { status: 'reported-oom' } : null)
    void prompt(window)
  }

  function attach(window, name) {
    const state = { status: 'healthy', revision: 0, failures: [], prompting: false, ownTermination: false }
    states.set(window, state)
    diagnostics.trackWindow(window, name)
    window.webContents.on('render-process-gone', (_event, details) => {
      if (stopped || details.reason === 'clean-exit') return
      if (state.ownTermination && ['recovering', 'parked'].includes(state.status)) {
        state.ownTermination = false
        const afterTermination = state.afterTermination
        state.afterTermination = null
        record('recovery-forced-termination', details, window)
        if (afterTermination) queueMicrotask(afterTermination)
        return
      }
      try {
        onGone(window)
      } catch (error) {
        record('recovery-cleanup-failed', { error: String(error?.message || error) }, window)
      }
      fail(window, 'render-process-gone', details)
    })
    window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, _url, isMainFrame) => {
      if (isMainFrame && errorCode !== -3) fail(window, 'did-fail-load', { errorCode, errorDescription })
    })
    window.on('unresponsive', () => {
      if (state.status !== 'failed' && state.status !== 'recovering') fail(window, 'unresponsive', {})
    })
    window.on('responsive', () => {
      if (state.status === 'failed' && state.cause === 'unresponsive') markReady(window)
    })
    window.on('show', () => void prompt(window))
    window.once('closed', () => {
      clearTimeout(state.timer)
      state.revision++
      states.delete(window)
    })
  }

  return {
    attach,
    markReady,
    recover,
    park,
    exportDiagnostics,
    labels: text,
    isUnhealthy: (window) =>
      !stopped && states.has(window) && ['failed', 'recovering'].includes(states.get(window).status),
    request: (window) => {
      if (!states.has(window)) return
      if (states.get(window).status !== 'failed') fail(window, 'manual-recovery', {})
      else void prompt(window)
    },
    handleClose: (window, event) => {
      if (stopped || !states.has(window)) return false
      if (states.get(window).status === 'healthy' && !window.webContents.isCrashed()) return false
      event.preventDefault()
      if (states.get(window).status !== 'failed') fail(window, 'manual-recovery', {})
      else void prompt(window)
      return true
    },
    stop: () => {
      stopped = true
      for (const state of states.values()) clearTimeout(state.timer)
    },
  }
}

module.exports = { createRendererRecovery, RECOVERY_TIMEOUT_MS, CRASH_WINDOW_MS, MAX_FAILURES }
