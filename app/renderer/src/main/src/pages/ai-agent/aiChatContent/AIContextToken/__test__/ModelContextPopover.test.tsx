import type React from 'react'
import { useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import userEvent from '@testing-library/user-event'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import ModelContextPopover from '../ModelContextPopover'
const mocks = vi.hoisted(() => ({
  onSend: vi.fn(),
  setActiveChat: vi.fn(),
  emit: vi.fn(),
  request: vi.fn(),
  perf: null as any,
  sessionId: '',
  model: 'selected',
  activeChat: { SessionID: 'session', StartParams: { RuntimeContextSizeLimit: 0 } },
  perfListeners: new Set<() => void>(),
}))
const sessionStore = createStore(() => ({ execute: false }))
vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({ useCurrentStore: () => sessionStore }))
vi.mock('@/pages/ai-re-act/hooks/useCurrentSessionId', () => ({ default: () => mocks.sessionId }))
vi.mock('../modelContextApi', () => ({ requestModelContext: mocks.request }))
vi.mock('@/pages/ai-re-act/hooks/useAIGlobalConfig', () => ({
  default: () => [
    { aiGlobalConfig: { IntelligentModels: [{ ModelName: mocks.model, Provider: { Type: 'openai' } }] } },
  ],
}))
vi.mock('@/pages/ai-agent/useContext/useDispatcher', () => ({
  default: () => ({ onSend: mocks.onSend, setActiveChat: mocks.setActiveChat }),
}))
vi.mock('@/pages/ai-agent/useContext/useStore', () => ({ default: () => ({ activeChat: mocks.activeChat }) }))
vi.mock('@/utils/eventBus/eventBus', () => ({ default: { emit: mocks.emit } }))
vi.mock('@/hook/useRafPolling/useRafPolling', () => ({
  useRafPolling: () => ({
    renderNumber: 0,
    aiDataRef: useSyncExternalStore(
      (listener) => {
        mocks.perfListeners.add(listener)
        return () => mocks.perfListeners.delete(listener)
      },
      () => mocks.perf,
    ),
  }),
}))
vi.mock('../useContextPerfStore', () => ({ CONTEXT_PERF_POLL_INTERVAL: 2000, useContextPerfStore: () => ({}) }))
vi.mock('@/components/yakitUI/YakitPopover/YakitPopover', () => ({
  YakitPopover: ({
    content,
    children,
    onOpenChange,
  }: {
    content: React.ReactNode
    children: React.ReactNode
    onOpenChange: (open: boolean) => void
  }) => (
    <div>
      <div onClick={() => onOpenChange(true)}>{children}</div>
      {createPortal(content, document.body)}
    </div>
  ),
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string, args?: any) =>
      key === 'AIContextToken.thresholdUsageSummary' ? `上下文 ${args.used}/${args.threshold} ${args.percent}%` : key,
  }),
}))
const runtime = {
  provider: 'openai',
  model: 'actual',
  context_key: 'service-a',
  threshold_tokens: 100 * 1000,
  prompt_tokens: 91 * 1000,
  source: 'manual',
  pending: false,
}

describe('composer model context popover', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.perf = null
    mocks.sessionId = ''
    mocks.model = 'selected'
    mocks.activeChat = { SessionID: 'session', StartParams: { RuntimeContextSizeLimit: 0 } }
    sessionStore.setState({ execute: false })
    mocks.request.mockImplementation(async (identity, threshold) => ({
      ...runtime,
      ...identity,
      threshold_tokens: threshold ?? 200 * 1000,
      prompt_tokens: 0,
    }))
  })
  it.each([
    [false, 500000, 'default'],
    [true, 500000, 'default'],
    [false, 200000, 'learned'],
    [true, 200000, 'learned'],
  ])('loads the saved model without runtime events: executing=%s, threshold=%s', async (execute, threshold, source) => {
    mocks.sessionId = 'session'
    sessionStore.setState({ execute: execute as boolean })
    mocks.request.mockImplementation(async (identity) => ({
      ...runtime,
      ...identity,
      threshold_tokens: threshold,
      source,
    }))
    render(<ModelContextPopover />)
    expect(await screen.findByRole('slider')).toHaveAttribute('aria-valuenow', String(threshold))
    expect(mocks.request).toHaveBeenCalledWith({
      provider: 'openai',
      model: 'selected',
      config: { ModelName: 'selected', Provider: { Type: 'openai' } },
    })
    expect(screen.queryByText('AIContextToken.waitingContext')).not.toBeInTheDocument()
    expect(mocks.onSend).not.toHaveBeenCalled()
  })

  it('loads the selected model when a history event has no concrete context identity', async () => {
    mocks.sessionId = 'session'
    mocks.perf = { ...runtime, model: 'selected', context_key: undefined }
    render(<ModelContextPopover />)
    expect(await screen.findByRole('slider')).toHaveAttribute('aria-valuenow', '200000')
    expect(screen.getByRole('button', { name: '上下文 91K/200K 46%' })).toBeInTheDocument()
  })

  it('saves through the model API until a runtime identity is available', async () => {
    mocks.sessionId = 'session'
    sessionStore.setState({ execute: true })
    render(<ModelContextPopover />)
    const slider = await screen.findByRole('slider')
    fireEvent.keyDown(slider, { key: 'ArrowUp' })
    await waitFor(() => expect(slider).toHaveAttribute('aria-valuenow', '201000'))
    expect(mocks.request).toHaveBeenLastCalledWith(
      {
        provider: 'openai',
        model: 'selected',
        config: { ModelName: 'selected', Provider: { Type: 'openai' } },
      },
      201000,
    )
    expect(mocks.onSend).not.toHaveBeenCalled()
  })

  it('uses the runtime identity as soon as it arrives and ignores an older model lookup', async () => {
    mocks.sessionId = 'session'
    sessionStore.setState({ execute: true })
    let resolve!: (value: any) => void
    mocks.request.mockReturnValue(
      new Promise((done) => {
        resolve = done
      }),
    )
    mocks.onSend.mockReturnValue(true)
    render(<ModelContextPopover />)
    await waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(1))
    act(() => {
      mocks.perf = runtime
      mocks.perfListeners.forEach((listener) => listener())
    })
    await act(async () =>
      resolve({ ...runtime, model: 'selected', context_key: 'selected-key', threshold_tokens: 500000 }),
    )
    expect(screen.getByRole('button', { name: '上下文 91K/100K 91%' })).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowUp' })
    expect(mocks.onSend).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ Params: expect.objectContaining({ ModelContextKey: 'service-a' }) }),
      }),
    )
  })

  it.each([false, true])('submits exactly 100K despite a stale 102400 minimum: executing=%s', async (executing) => {
    const legacy = { ...runtime, threshold_tokens: 102400, minimum_threshold_tokens: 102400 }
    sessionStore.setState({ execute: executing })
    mocks.sessionId = executing ? 'session' : ''
    mocks.perf = executing ? legacy : null
    mocks.onSend.mockReturnValue(true)
    mocks.request.mockImplementation(async (identity, tokens) => ({
      ...legacy,
      ...identity,
      threshold_tokens: tokens ?? legacy.threshold_tokens,
    }))
    render(<ModelContextPopover />)
    const slider = await screen.findByRole('slider')
    expect(slider).toHaveAttribute('aria-valuenow', '102400')
    fireEvent.keyDown(slider, { key: 'Home' })
    if (executing) {
      expect(mocks.onSend).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            Params: expect.objectContaining({ RuntimeContextSizeLimit: 100000 }),
          }),
        }),
      )
    } else {
      await waitFor(() =>
        expect(mocks.request).toHaveBeenLastCalledWith(
          { provider: 'openai', model: 'selected', config: { ModelName: 'selected', Provider: { Type: 'openai' } } },
          100000,
        ),
      )
    }
    await waitFor(() => expect(slider).toHaveAttribute('aria-valuenow', '100000'))
  })

  it('saves the automatic adjustment switch for the selected model before a session', async () => {
    let disabled = false
    mocks.request.mockImplementation(async (identity, threshold, mode) => {
      if (mode !== undefined) disabled = mode
      return { ...runtime, ...identity, threshold_tokens: 200 * 1000, disable_auto_adjust: disabled }
    })
    const view = render(<ModelContextPopover />)
    const toggle = await screen.findByRole('switch')
    expect(toggle).toBeChecked()
    fireEvent.click(toggle)
    await waitFor(() =>
      expect(mocks.request).toHaveBeenLastCalledWith(
        { provider: 'openai', model: 'selected', config: { ModelName: 'selected', Provider: { Type: 'openai' } } },
        0,
        true,
      ),
    )
    await waitFor(() => expect(toggle).toBeEnabled())
    expect(toggle).not.toBeChecked()
    expect(screen.getByRole('spinbutton')).toHaveValue(200)
    view.unmount()
    render(<ModelContextPopover />)
    expect(await screen.findByRole('switch')).not.toBeChecked()
  })

  it('ignores stale recovery while disabling and accepts the saved manual threshold in the mode acknowledgement', () => {
    mocks.sessionId = 'session'
    sessionStore.setState({ execute: true })
    mocks.onSend.mockReturnValue(true)
    mocks.perf = {
      ...runtime,
      source: 'learned',
      pending: true,
      threshold_tokens: 200 * 1000,
      change: { id: 'pending-1', reason: 'overflow' },
    }
    render(<ModelContextPopover />)
    fireEvent.click(screen.getByRole('switch'))
    expect(mocks.onSend).toHaveBeenLastCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          Params: {
            RuntimeContextSizeLimit: 0,
            DisableContextAutoAdjust: true,
            AIService: 'openai',
            AIModelName: 'actual',
            ModelContextKey: 'service-a',
          },
        }),
      }),
    )
    expect(screen.getByRole('switch')).not.toBeChecked()
    act(() => {
      mocks.perf = { ...mocks.perf, change: { id: 'stale-overflow', reason: 'overflow' } }
      mocks.perfListeners.forEach((listener) => listener())
    })
    expect(screen.getByRole('switch')).not.toBeChecked()
    act(() => {
      mocks.perf = {
        ...runtime,
        disable_auto_adjust: true,
        threshold_tokens: 500 * 1000,
        change: { id: 'mode-ack', reason: 'manual' },
      }
      mocks.perfListeners.forEach((listener) => listener())
    })
    expect(screen.getByRole('switch')).not.toBeChecked()
    expect(screen.getByRole('spinbutton')).toHaveValue(500)
    expect(screen.queryByText('AIContextToken.contextAdjusting')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('switch'))
    expect(mocks.onSend).toHaveBeenLastCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ Params: expect.objectContaining({ DisableContextAutoAdjust: false }) }),
      }),
    )
    expect(screen.getByRole('switch')).toBeChecked()
  })

  it('reports a missing mode acknowledgement even when the threshold did not change', () => {
    vi.useFakeTimers()
    mocks.sessionId = 'session'
    sessionStore.setState({ execute: true })
    mocks.onSend.mockReturnValue(true)
    mocks.perf = runtime
    render(<ModelContextPopover />)
    fireEvent.click(screen.getByRole('switch'))
    expect(screen.getByRole('switch')).not.toBeChecked()
    act(() => {
      vi.advanceTimersByTime(10001)
    })
    expect(screen.getByRole('switch')).toBeChecked()
    expect(screen.getByRole('alert')).toHaveTextContent('AIContextToken.contextUpdateTimeout')
  })

  it('keeps a pending threshold visible when the user immediately switches off auto-adjust', () => {
    mocks.sessionId = 'session'
    sessionStore.setState({ execute: true })
    mocks.onSend.mockReturnValue(true)
    mocks.perf = { ...runtime, threshold_tokens: 999 * 1000 }
    render(<ModelContextPopover />)
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '1200' } })
    fireEvent.keyDown(screen.getByRole('spinbutton'), { key: 'Enter' })
    expect(screen.getByRole('spinbutton')).toHaveValue(1000)
    fireEvent.click(screen.getByRole('switch'))
    expect(screen.getByRole('spinbutton')).toHaveValue(1000)
    expect(screen.getByRole('switch')).not.toBeChecked()
    expect(mocks.onSend).toHaveBeenLastCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          Params: expect.objectContaining({ RuntimeContextSizeLimit: 1000 * 1000, DisableContextAutoAdjust: true }),
        }),
      }),
    )
    act(() => {
      mocks.perf = { ...runtime, threshold_tokens: 1000 * 1000, change: { id: 'threshold-only-ack', reason: 'manual' } }
      mocks.perfListeners.forEach((listener) => listener())
    })
    expect(screen.getByRole('switch')).not.toBeChecked()
    expect(screen.getByRole('spinbutton')).toHaveValue(1000)
  })

  it('preserves a pending mode edit when the user then adjusts the threshold', () => {
    mocks.sessionId = 'session'
    sessionStore.setState({ execute: true })
    mocks.onSend.mockReturnValue(true)
    mocks.perf = runtime
    render(<ModelContextPopover />)
    fireEvent.click(screen.getByRole('switch'))
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '600' } })
    fireEvent.blur(screen.getByRole('spinbutton'))
    expect(mocks.onSend).toHaveBeenLastCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          Params: expect.objectContaining({ RuntimeContextSizeLimit: 600 * 1000, DisableContextAutoAdjust: true }),
        }),
      }),
    )
    expect(screen.getByRole('switch')).not.toBeChecked()
  })

  it('keeps input focus inside the portal and saves typed values without focusing the composer', async () => {
    const user = userEvent.setup()
    const composerKeyDown = vi.fn()
    render(
      <div onClick={() => screen.getByRole('textbox', { name: 'composer' }).focus()} onKeyDown={composerKeyDown}>
        <textarea aria-label="composer" />
        <ModelContextPopover />
      </div>,
    )
    const input = await screen.findByRole('spinbutton')
    await user.click(input)
    expect(input).toHaveFocus()
    await user.clear(input)
    await user.type(input, '650{Enter}')
    await waitFor(() =>
      expect(mocks.request).toHaveBeenLastCalledWith(
        { provider: 'openai', model: 'selected', config: { ModelName: 'selected', Provider: { Type: 'openai' } } },
        650 * 1000,
      ),
    )
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', String(650 * 1000))
    expect(composerKeyDown).not.toHaveBeenCalled()
    expect(screen.getByRole('textbox', { name: 'composer' })).toHaveValue('')
    await user.clear(input)
    await user.type(input, '725')
    await user.tab()
    await waitFor(() => expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', String(725 * 1000)))
  })
  it('offers a compact ring before the first message and saves to the selected model', async () => {
    const { container } = render(<ModelContextPopover />)
    const line = await screen.findByRole('slider')
    expect(line).toHaveAttribute('aria-valuenow', String(200 * 1000))
    const trigger = screen.getByRole('button', { name: '上下文 0K/200K 0%' })
    expect(trigger).toHaveTextContent('')
    expect(trigger.querySelector('svg')).not.toBeNull()
    expect(container.querySelectorAll('button[aria-expanded]')).toHaveLength(1)
    fireEvent.keyDown(line, { key: 'ArrowUp' })
    await waitFor(() => expect(line).toHaveAttribute('aria-valuenow', String(201 * 1000)))
    expect(mocks.request).toHaveBeenLastCalledWith(
      { provider: 'openai', model: 'selected', config: { ModelName: 'selected', Provider: { Type: 'openai' } } },
      201 * 1000,
    )
    expect(mocks.onSend).not.toHaveBeenCalled()
    expect(mocks.setActiveChat).not.toHaveBeenCalled()
  })
  it.each([true, false])('hotpatches the displayed runtime model only when accepted: %s', (accepted) => {
    sessionStore.setState({ execute: true })
    mocks.sessionId = 'session'
    mocks.perf = runtime
    mocks.onSend.mockReturnValue(accepted)
    render(<ModelContextPopover />)
    expect(screen.getByRole('button', { name: '上下文 91K/100K 91%' })).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowUp' })
    expect(mocks.onSend).toHaveBeenCalledWith({
      token: 'session',
      type: 'casual',
      params: {
        IsConfigHotpatch: true,
        HotpatchType: 'RuntimeContextSizeLimit',
        Params: {
          RuntimeContextSizeLimit: 101 * 1000,
          AIService: 'openai',
          AIModelName: 'actual',
          ModelContextKey: 'service-a',
        },
      },
    })
    expect(mocks.setActiveChat).not.toHaveBeenCalled()
    expect(mocks.emit).not.toHaveBeenCalled()
    expect(mocks.request).not.toHaveBeenCalled()
  })
  it('keeps the released threshold, ring and model details stable while silently awaiting runtime acknowledgement', () => {
    sessionStore.setState({ execute: true })
    mocks.sessionId = 'session'
    mocks.perf = runtime
    mocks.onSend.mockReturnValue(true)
    render(<ModelContextPopover />)
    const slider = screen.getByRole('slider')
    const model = screen.getByText('actual')
    vi.stubGlobal('PointerEvent', MouseEvent)
    slider.setPointerCapture = vi.fn()
    slider.releasePointerCapture = vi.fn()
    vi.spyOn(slider.parentElement!, 'getBoundingClientRect').mockReturnValue({ width: 900 } as DOMRect)
    fireEvent.pointerDown(slider, { button: 0, clientX: 0 })
    fireEvent.pointerMove(slider, { clientX: 10 })
    expect(mocks.onSend).not.toHaveBeenCalled()
    fireEvent.pointerUp(slider)
    fireEvent.lostPointerCapture(slider)
    expect(slider).toHaveAttribute('aria-valuenow', String(110 * 1000))
    expect(mocks.onSend).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: '上下文 91K/110K 83%' })).toBeInTheDocument()
    expect(screen.getByText('actual')).toBe(model)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    // Streaming use counters can arrive before the hotpatch confirmation.
    mocks.perf = { ...runtime, prompt_tokens: 92 * 1000 }
    act(() => mocks.perfListeners.forEach((listener) => listener()))
    expect(slider).toHaveAttribute('aria-valuenow', String(110 * 1000))
    expect(screen.getByText('actual')).toBe(model)
    mocks.perf = {
      ...mocks.perf,
      threshold_tokens: 110 * 1000,
      change: {
        id: 'manual-ack',
        reason: 'manual',
        previous_threshold_tokens: 100 * 1000,
        threshold_tokens: 110 * 1000,
      },
    }
    act(() => mocks.perfListeners.forEach((listener) => listener()))
    expect(screen.getByRole('slider')).toBe(slider)
    expect(slider).toHaveAttribute('aria-valuenow', String(110 * 1000))
    expect(screen.getByText('actual')).toBe(model)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(mocks.setActiveChat).not.toHaveBeenCalled()
    expect(mocks.emit).not.toHaveBeenCalled()
  })
  it('ignores an older manual reply while a newer adjustment awaits confirmation', () => {
    sessionStore.setState({ execute: true })
    mocks.sessionId = 'session'
    mocks.perf = runtime
    mocks.onSend.mockReturnValue(true)
    render(<ModelContextPopover />)
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'PageUp' })
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'PageUp' })
    mocks.perf = {
      ...runtime,
      threshold_tokens: 110 * 1000,
      change: { id: 'first', reason: 'manual', previous_threshold_tokens: 100 * 1000, threshold_tokens: 110 * 1000 },
    }
    act(() => mocks.perfListeners.forEach((listener) => listener()))
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', String(120 * 1000))
    mocks.perf = {
      ...runtime,
      threshold_tokens: 120 * 1000,
      change: { id: 'second', reason: 'manual', previous_threshold_tokens: 110 * 1000, threshold_tokens: 120 * 1000 },
    }
    act(() => mocks.perfListeners.forEach((listener) => listener()))
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', String(120 * 1000))
    expect(screen.queryByText('AIContextToken.savingContext')).not.toBeInTheDocument()
  })
  it.each(['error', 'overflow', 'switch'])('abandons a pending adjustment on %s', (reason) => {
    sessionStore.setState({ execute: true })
    mocks.sessionId = 'session'
    mocks.perf = runtime
    mocks.onSend.mockReturnValue(true)
    render(<ModelContextPopover />)
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'PageUp' })
    mocks.perf = {
      ...runtime,
      threshold_tokens: 200 * 1000,
      ...(reason === 'error'
        ? { error: 'rejected' }
        : reason === 'switch'
          ? { model: 'another' }
          : {
              change: {
                id: 'overflow',
                reason: 'overflow',
                previous_threshold_tokens: 500 * 1000,
                threshold_tokens: 200 * 1000,
              },
            }),
    }
    act(() => mocks.perfListeners.forEach((listener) => listener()))
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', String(200 * 1000))
    expect(screen.queryByText('AIContextToken.savingContext')).not.toBeInTheDocument()
  })
  it('reports a timeout and restores the confirmed threshold, accepting a late confirmation', () => {
    vi.useFakeTimers()
    sessionStore.setState({ execute: true })
    mocks.sessionId = 'session'
    mocks.perf = runtime
    mocks.onSend.mockReturnValue(true)
    render(<ModelContextPopover />)
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'PageUp' })
    mocks.perf = { ...runtime, prompt_tokens: 92 * 1000 }
    act(() => mocks.perfListeners.forEach((listener) => listener()))
    act(() => vi.advanceTimersByTime(10000))
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', String(100 * 1000))
    expect(screen.getByRole('alert')).toHaveTextContent('AIContextToken.contextUpdateTimeout')
    mocks.perf = { ...runtime, threshold_tokens: 110 * 1000 }
    act(() => mocks.perfListeners.forEach((listener) => listener()))
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', String(110 * 1000))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
  it('migrates a legacy session override only after its model update is acknowledged', () => {
    sessionStore.setState({ execute: true })
    mocks.sessionId = 'session'
    mocks.perf = runtime
    mocks.onSend.mockReturnValue(true)
    mocks.activeChat.StartParams.RuntimeContextSizeLimit = 300 * 1000
    render(<ModelContextPopover />)
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'PageUp' })
    expect(mocks.setActiveChat).not.toHaveBeenCalled()
    mocks.perf = { ...runtime, threshold_tokens: 110 * 1000 }
    act(() => mocks.perfListeners.forEach((listener) => listener()))
    expect(mocks.setActiveChat).toHaveBeenCalledTimes(1)
    expect(mocks.setActiveChat.mock.calls[0][0](mocks.activeChat).StartParams.RuntimeContextSizeLimit).toBe(0)
    expect(mocks.emit).toHaveBeenCalledExactlyOnceWith(
      'sessionData',
      JSON.stringify({
        type: 'updateSession',
        sessionId: 'session',
        updates: { StartParams: { RuntimeContextSizeLimit: 0 } },
      }),
    )
  })
  it('saves restoring 500K for the current model without first saving an unfinished draft', async () => {
    const user = userEvent.setup()
    render(<ModelContextPopover />)
    const input = await screen.findByRole('spinbutton')
    await user.clear(input)
    await user.type(input, '900')
    mocks.request.mockClear()
    await user.click(screen.getByRole('button', { name: 'AIContextToken.resetContextThreshold' }))
    await waitFor(() => expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', String(500 * 1000)))
    expect(mocks.request).toHaveBeenCalledExactlyOnceWith(
      { provider: 'openai', model: 'selected', config: { ModelName: 'selected', Provider: { Type: 'openai' } } },
      500 * 1000,
    )
    expect(screen.getByRole('spinbutton')).toHaveValue(500)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
  it('edits a stopped session’s actual model instead of the global selection', async () => {
    mocks.sessionId = 'session'
    mocks.perf = runtime
    render(<ModelContextPopover />)
    const slider = await screen.findByRole('slider')
    fireEvent.keyDown(slider, { key: 'ArrowUp' })
    await waitFor(() =>
      expect(mocks.request).toHaveBeenLastCalledWith(
        { provider: 'openai', model: 'actual', context_key: 'service-a' },
        201 * 1000,
      ),
    )
    expect(mocks.onSend).not.toHaveBeenCalled()
  })
  it('keeps the confirmed value on save failure and reports it', async () => {
    render(<ModelContextPopover />)
    const line = await screen.findByRole('slider')
    mocks.request.mockRejectedValueOnce(new Error('offline'))
    fireEvent.keyDown(line, { key: 'ArrowUp' })
    expect(await screen.findByRole('alert')).toHaveTextContent('AIContextToken.contextRequestFailed')
    expect(line).toHaveAttribute('aria-valuenow', String(200 * 1000))
  })
  it('updates both the ring ratio and dial when an automatic calibration arrives', () => {
    sessionStore.setState({ execute: true })
    mocks.sessionId = 'session'
    mocks.perf = { ...runtime, threshold_tokens: 500 * 1000 }
    render(<ModelContextPopover />)
    expect(screen.getByRole('button', { name: '上下文 91K/500K 18%' })).toBeInTheDocument()
    // Opening the panel reads the latest runtime snapshot without resetting its budget.
    mocks.perf = {
      ...runtime,
      pending: true,
      change: { id: 'shrink', reason: 'overflow', previous_threshold_tokens: 500 * 1000, threshold_tokens: 100 * 1000 },
    }
    fireEvent.click(screen.getByRole('button', { name: '上下文 91K/500K 18%' }))
    expect(screen.getByRole('button', { name: '上下文 91K/100K 91%' })).toBeInTheDocument()
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', String(100 * 1000))
    expect(screen.getByText('AIContextToken.contextAdjusting')).toBeInTheDocument()
    expect(screen.getByText('actual')).toBeInTheDocument()
  })

  it('allows a new manual attempt without retaining a stale automatic label, then explains a fresh recovery', () => {
    sessionStore.setState({ execute: true })
    mocks.sessionId = 'session'
    mocks.onSend.mockReturnValue(true)
    const learned = {
      ...runtime,
      source: 'learned',
      threshold_tokens: 200 * 1000,
      change: {
        id: 'first-recovery',
        reason: 'confirmed',
        previous_threshold_tokens: 500 * 1000,
        threshold_tokens: 200 * 1000,
      },
    }
    mocks.perf = learned
    render(<ModelContextPopover />)
    expect(screen.getByText('AIContextToken.contextAdjusted')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'AIContextToken.resetContextThreshold' }))
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', String(500 * 1000))
    expect(screen.queryByText('AIContextToken.contextAdjusted')).not.toBeInTheDocument()
    // An unchanged old snapshot during the hotpatch cannot undo the new setting.
    mocks.perf = structuredClone(learned)
    act(() => mocks.perfListeners.forEach((listener) => listener()))
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', String(500 * 1000))
    mocks.perf = {
      ...runtime,
      threshold_tokens: 500 * 1000,
      change: { id: 'manual', reason: 'manual', previous_threshold_tokens: 200 * 1000, threshold_tokens: 500 * 1000 },
    }
    act(() => mocks.perfListeners.forEach((listener) => listener()))
    expect(screen.queryByText('AIContextToken.contextAdjusted')).not.toBeInTheDocument()
    mocks.perf = { ...learned, change: { ...learned.change, id: 'second-recovery' } }
    act(() => mocks.perfListeners.forEach((listener) => listener()))
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', String(200 * 1000))
    expect(screen.getByText('AIContextToken.contextAdjusted')).toBeInTheDocument()
  })
})
