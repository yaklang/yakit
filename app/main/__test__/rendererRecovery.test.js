// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'node:events'
import { createRendererRecovery, RECOVERY_TIMEOUT_MS, CRASH_WINDOW_MS } from '../rendererRecovery'

function makeWindow(id = 1) {
  const window = new EventEmitter()
  window.id = id
  window.isDestroyed = vi.fn(() => false)
  window.isVisible = vi.fn(() => true)
  window.webContents = Object.assign(new EventEmitter(), {
    id,
    isCrashed: vi.fn(() => false),
    forcefullyCrashRenderer: vi.fn(),
  })
  return window
}

function setup() {
  const window = makeWindow()
  const diagnostics = {
    directory: '/isolated/diagnostics',
    trackWindow: vi.fn(),
    record: vi.fn(),
    exportBundle: vi.fn(),
  }
  const dialog = {
    showMessageBox: vi.fn().mockResolvedValue({ response: 4 }),
    showSaveDialog: vi.fn().mockResolvedValue({ canceled: true }),
  }
  const callbacks = { reload: vi.fn(), backToConnection: vi.fn(), exit: vi.fn(), onGone: vi.fn() }
  const recovery = createRendererRecovery({ diagnostics, dialog, ...callbacks, getLanguage: () => 'en' })
  recovery.attach(window, 'mainWin')
  const crash = (reason = 'crashed') => window.webContents.emit('render-process-gone', {}, { reason, exitCode: 10 })
  return { window, diagnostics, dialog, recovery, crash, ...callbacks }
}

const tick = () => vi.advanceTimersByTimeAsync(0)

describe('renderer recovery', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it.each(['crashed', 'oom', 'killed', 'abnormal-exit', 'launch-failed', 'integrity-failure'])(
    'records %s and offers a native recovery without renderer IPC',
    async (reason) => {
      const s = setup()
      s.dialog.showMessageBox.mockResolvedValueOnce({ response: 0 })
      s.crash(reason)
      await tick()
      expect(s.diagnostics.record).toHaveBeenCalledWith('render-process-gone', { reason, exitCode: 10 }, s.window)
      expect(s.onGone).toHaveBeenCalledWith(s.window)
      expect(s.reload).toHaveBeenCalledWith(s.window, false)
      expect(s.recovery.isUnhealthy(s.window)).toBe(true)
      s.recovery.markReady(s.window)
      expect(s.recovery.isUnhealthy(s.window)).toBe(false)
      await vi.advanceTimersByTimeAsync(RECOVERY_TIMEOUT_MS)
      expect(s.dialog.showMessageBox).toHaveBeenCalledTimes(1)
    },
  )

  it('ignores clean exit, subframe failures and aborted navigation', async () => {
    const s = setup()
    s.crash('clean-exit')
    s.window.webContents.emit('did-fail-load', {}, -3, 'ABORTED', '', true)
    s.window.webContents.emit('did-fail-load', {}, -6, 'NOT_FOUND', '', false)
    await tick()
    expect(s.dialog.showMessageBox).not.toHaveBeenCalled()
    expect(s.diagnostics.record).not.toHaveBeenCalled()
  })

  it('captures a main-frame load failure', async () => {
    const s = setup()
    s.window.webContents.emit('did-fail-load', {}, -6, 'NOT_FOUND', 'file:///private.html', true)
    await tick()
    expect(s.diagnostics.record).toHaveBeenCalledWith(
      'did-fail-load',
      { errorCode: -6, errorDescription: 'NOT_FOUND' },
      s.window,
    )
    expect(s.dialog.showMessageBox).toHaveBeenCalledTimes(1)
  })

  it('still recovers when diagnostic recording and crash cleanup fail', async () => {
    const s = setup()
    s.diagnostics.record.mockImplementation(() => {
      throw new Error('disk unavailable')
    })
    s.onGone.mockImplementation(() => {
      throw new Error('cache unavailable')
    })
    s.dialog.showMessageBox.mockResolvedValueOnce({ response: 0 })
    expect(() => s.crash()).not.toThrow()
    await tick()
    expect(s.reload).toHaveBeenCalledWith(s.window, false)
    s.recovery.markReady(s.window)
    expect(s.recovery.isUnhealthy(s.window)).toBe(false)
  })

  it('keeps Link failures and readiness independent of Main', async () => {
    const s = setup()
    const link = makeWindow(2)
    link.isVisible.mockReturnValue(false)
    s.recovery.attach(link, 'engineLinkWin')
    link.webContents.emit('render-process-gone', {}, { reason: 'crashed', exitCode: 10 })
    s.crash()
    await tick()
    expect(s.dialog.showMessageBox).toHaveBeenCalledTimes(1)
    s.recovery.markReady(s.window)
    expect(s.recovery.isUnhealthy(s.window)).toBe(false)
    expect(s.recovery.isUnhealthy(link)).toBe(true)
    link.isVisible.mockReturnValue(true)
    link.emit('show')
    await tick()
    expect(s.dialog.showMessageBox.mock.calls[1][0]).toBe(link)
    s.recovery.markReady(link)
    expect(s.recovery.isUnhealthy(link)).toBe(false)
  })

  it('does not interrupt the visible window for a hidden renderer failure', async () => {
    const s = setup()
    s.window.isVisible.mockReturnValue(false)
    s.crash()
    await tick()
    expect(s.dialog.showMessageBox).not.toHaveBeenCalled()
    s.window.isVisible.mockReturnValue(true)
    s.window.emit('show')
    await tick()
    expect(s.dialog.showMessageBox).toHaveBeenCalledTimes(1)
  })

  it('coalesces duplicate dialogs and ignores a stale choice after the renderer becomes responsive', async () => {
    const s = setup()
    let answer
    s.dialog.showMessageBox.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)))
    s.window.emit('unresponsive')
    s.window.emit('unresponsive')
    expect(s.dialog.showMessageBox).toHaveBeenCalledTimes(1)
    s.window.emit('responsive')
    answer({ response: 0 })
    await tick()
    expect(s.reload).not.toHaveBeenCalled()
    expect(s.recovery.isUnhealthy(s.window)).toBe(false)
  })

  it('replaces a hung renderer and does not count its intentional termination as another crash', async () => {
    const s = setup()
    s.dialog.showMessageBox.mockResolvedValueOnce({ response: 0 })
    s.window.webContents.forcefullyCrashRenderer.mockImplementation(() => s.crash('killed'))
    s.window.emit('unresponsive')
    await tick()
    expect(s.window.webContents.forcefullyCrashRenderer).toHaveBeenCalledTimes(1)
    expect(s.dialog.showMessageBox).toHaveBeenCalledTimes(1)
    s.recovery.markReady(s.window)
    s.crash()
    await tick()
    expect(s.dialog.showMessageBox.mock.calls[1][1].buttons).toContain('Recover interface')
  })

  it('treats missing application-ready IPC as a failed recovery even after did-finish-load', async () => {
    const s = setup()
    s.dialog.showMessageBox.mockResolvedValueOnce({ response: 0 })
    s.crash()
    await tick()
    s.window.webContents.emit('did-finish-load')
    await vi.advanceTimersByTimeAsync(RECOVERY_TIMEOUT_MS)
    expect(s.diagnostics.record).toHaveBeenCalledWith('recovery-timeout', {}, s.window)
    expect(s.dialog.showMessageBox).toHaveBeenCalledTimes(2)
    expect(s.reload).toHaveBeenCalledTimes(1)
  })

  it('stops offering repeated reloads after three failures within a minute', async () => {
    const s = setup()
    for (let i = 0; i < 3; i++) {
      s.crash()
      await tick()
    }
    expect(s.dialog.showMessageBox.mock.calls[2][1].buttons).not.toContain('Recover interface')
    expect(s.dialog.showMessageBox.mock.calls[2][1].buttons).toContain('Connection page')
    expect(s.reload).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(CRASH_WINDOW_MS)
    s.crash()
    await tick()
    expect(s.dialog.showMessageBox.mock.calls[3][1].buttons).toContain('Recover interface')
  })

  it('replaces the process on retry when a manual white-screen reload never becomes ready', async () => {
    const s = setup()
    s.dialog.showMessageBox.mockResolvedValueOnce({ response: 0 }).mockResolvedValueOnce({ response: 0 })
    s.recovery.request(s.window)
    await tick()
    expect(s.window.webContents.forcefullyCrashRenderer).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(RECOVERY_TIMEOUT_MS)
    expect(s.window.webContents.forcefullyCrashRenderer).toHaveBeenCalledTimes(1)
    expect(s.reload).toHaveBeenCalledTimes(2)
    s.recovery.markReady(s.window)
  })

  it('exports diagnostics and returns to the recovery choices', async () => {
    const s = setup()
    s.dialog.showMessageBox.mockResolvedValueOnce({ response: 2 }).mockResolvedValueOnce({ response: 0 })
    s.dialog.showSaveDialog.mockResolvedValueOnce({ canceled: false, filePath: '/tmp/diagnostics.zip' })
    s.crash()
    await tick()
    expect(s.diagnostics.exportBundle).toHaveBeenCalledWith('/tmp/diagnostics.zip')
    expect(s.reload).toHaveBeenCalledTimes(1)
    s.recovery.stop()
  })

  it('keeps recovery available after an export failure', async () => {
    const s = setup()
    s.dialog.showMessageBox
      .mockResolvedValueOnce({ response: 2 })
      .mockResolvedValueOnce({ response: 0 })
      .mockResolvedValueOnce({ response: 3 })
    s.dialog.showSaveDialog.mockResolvedValueOnce({ canceled: false, filePath: '/tmp/diagnostics.zip' })
    s.diagnostics.exportBundle.mockRejectedValueOnce(new Error('ENOSPC'))
    s.crash()
    await tick()
    expect(s.exit).toHaveBeenCalledTimes(1)
    expect(s.reload).not.toHaveBeenCalled()
  })

  it('returns to the connection flow through the main process', async () => {
    const s = setup()
    s.dialog.showMessageBox.mockResolvedValueOnce({ response: 1 })
    s.crash()
    await tick()
    expect(s.backToConnection).toHaveBeenCalledTimes(1)
  })

  it('makes closing a crashed or recovering window independent of the renderer', async () => {
    const s = setup()
    const event = { preventDefault: vi.fn() }
    expect(s.recovery.handleClose(s.window, event)).toBe(false)
    s.recovery.recover(s.window)
    s.dialog.showMessageBox.mockResolvedValueOnce({ response: 3 })
    expect(s.recovery.handleClose(s.window, event)).toBe(true)
    await tick()
    expect(event.preventDefault).toHaveBeenCalled()
    expect(s.exit).toHaveBeenCalledTimes(1)
  })

  it('ignores late dialog answers after a window closes or the application exits', async () => {
    const s = setup()
    let answer
    s.dialog.showMessageBox.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)))
    s.crash()
    s.window.isDestroyed.mockReturnValue(true)
    s.window.emit('closed')
    answer({ response: 0 })
    await tick()
    s.recovery.stop()
    s.crash()
    expect(s.reload).not.toHaveBeenCalled()
    expect(s.dialog.showMessageBox).toHaveBeenCalledTimes(1)
  })
})
