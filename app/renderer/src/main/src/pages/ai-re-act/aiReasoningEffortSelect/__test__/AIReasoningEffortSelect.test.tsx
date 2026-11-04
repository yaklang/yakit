import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AIReasoningEffortSelect } from '../AIReasoningEffortSelect'
const mocks = vi.hoisted(() => ({ config: {} as any, save: vi.fn(), probe: vi.fn(), emit: vi.fn() }))
vi.mock('../../hooks/useAIGlobalConfig', () => ({
  default: () => [{ aiGlobalConfig: mocks.config }, { setAIGlobalConfig: mocks.save }],
}))
vi.mock('@/pages/ai-agent/aiModelList/utils', () => ({
  grpcProbeReasoningEffort: (...args: any[]) => mocks.probe(...args),
}))
vi.mock('@/utils/eventBus/eventBus', () => ({ default: { emit: (...args: any[]) => mocks.emit(...args) } }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('@/components/yakitUI/YakitSelect/YakitSelect', () => ({
  YakitSelect: ({ options, onChange, wrapperStyle, ...props }: any) => (
    <select {...props} onChange={(e) => onChange(e.target.value)}>
      {options.map((o: any) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ loading, children, type, ...props }: any) => (
    <button {...props} aria-busy={!!loading}>
      {children}
    </button>
  ),
}))
vi.mock('@/components/yakitUI/YakitPopover/YakitPopover', () => ({
  YakitPopover: ({ children, content, visible }: any) => (
    <>
      {children}
      {visible && content}
    </>
  ),
}))
const deferred = () => {
  let resolve!: (v: any) => void
  const promise = new Promise((r) => (resolve = r))
  return { promise, resolve }
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.config = {
    IntelligentModels: [
      { ProviderId: 'one', ModelName: 'first', Provider: { Type: 'custom', APIKey: 'key', ReasoningEffort: 'middle' } },
      { ProviderId: 'two', ModelName: 'second', Provider: { Type: 'custom' } },
    ],
  }
  mocks.save.mockResolvedValue(undefined)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})
describe('reasoning effort model boundary', () => {
  it('persists the selected effort while preserving credentials and remaining models', async () => {
    render(<AIReasoningEffortSelect />)
    expect(screen.getByRole('combobox')).toHaveValue('medium')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'high' } })
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1))
    expect(mocks.save.mock.calls[0][0].IntelligentModels).toEqual([
      { ...mocks.config.IntelligentModels[0], Provider: { Type: 'custom', APIKey: 'key', ReasoningEffort: 'high' } },
      mocks.config.IntelligentModels[1],
    ])
  })
  it('probes only on request and caches confirmed extended options', async () => {
    mocks.probe.mockResolvedValue({ XhighSupported: true, MaxSupported: false })
    render(<AIReasoningEffortSelect />)
    expect(mocks.probe).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1))
    expect(mocks.probe).toHaveBeenCalledWith({ Config: mocks.config.IntelligentModels[0].Provider, Model: 'first' })
    expect(mocks.save.mock.calls[0][0].IntelligentModels[0]).toMatchObject({
      EffortProbed: true,
      ProbedExtendedEfforts: ['xhigh'],
    })
    expect(screen.getByRole('status')).toHaveTextContent('BatchModel.probeSupported xhigh')
    expect(screen.getByRole('option', { name: 'ConfigNetworkPage.effortXhigh' })).toBeInTheDocument()
  })
  it('does not cache network failures as unsupported capabilities', async () => {
    mocks.probe.mockResolvedValue({ XhighErrorMessage: 'timeout', MaxSupported: true })
    render(<AIReasoningEffortSelect />)
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'false'))
    expect(mocks.save).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('BatchModel.probeFailed')
  })
  it('ignores an old model probe after switching models', async () => {
    const pending = deferred()
    mocks.probe.mockReturnValue(pending.promise)
    const view = render(<AIReasoningEffortSelect />)
    fireEvent.click(screen.getByRole('button'))
    mocks.config = { IntelligentModels: [mocks.config.IntelligentModels[1]] }
    view.rerender(<AIReasoningEffortSelect />)
    await act(async () => pending.resolve({ XhighSupported: true, MaxSupported: true }))
    expect(mocks.save).not.toHaveBeenCalled()
  })
  it('does not overwrite a manual selection with a late probe', async () => {
    const pending = deferred()
    mocks.probe.mockReturnValue(pending.promise)
    render(<AIReasoningEffortSelect />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'low' } })
    await act(async () => pending.resolve({ XhighSupported: true }))
    expect(mocks.save).toHaveBeenCalledTimes(1)
    expect(mocks.save.mock.calls[0][0].IntelligentModels[0].Provider.ReasoningEffort).toBe('low')
  })
  it('leaves hosted models read-only', () => {
    mocks.config.IntelligentModels[0].IsOnline = true
    render(<AIReasoningEffortSelect />)
    expect(screen.getByRole('combobox')).toBeDisabled()
    expect(screen.getByRole('button')).toBeDisabled()
  })
  it('releases a probe that never answers so the user can retry', async () => {
    vi.useFakeTimers()
    mocks.probe.mockReturnValue(new Promise(() => {}))
    render(<AIReasoningEffortSelect />)
    fireEvent.click(screen.getByRole('button'))
    await act(async () => {
      vi.advanceTimersByTime(15000)
    })
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'false')
    expect(mocks.save).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('BatchModel.probeTimeout')
  })
  it('explains a successful probe without extended support instead of silently doing nothing', async () => {
    mocks.probe.mockResolvedValue({ XhighSupported: false, MaxSupported: false })
    render(<AIReasoningEffortSelect />)
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('BatchModel.probeUnsupported'))
    expect(screen.queryByRole('option', { name: 'ConfigNetworkPage.effortMax' })).not.toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveValue('medium')
  })
  it('shows a retryable error when saving the probe fails', async () => {
    mocks.probe.mockResolvedValue({ XhighSupported: true, MaxSupported: true })
    mocks.save.mockRejectedValue(new Error('unavailable'))
    render(<AIReasoningEffortSelect />)
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('BatchModel.probeSaveFailed'))
  })
  it('shows connection errors and stops the spinner', async () => {
    mocks.probe.mockRejectedValue(new Error('offline'))
    render(<AIReasoningEffortSelect />)
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('BatchModel.probeFailed'))
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'false')
  })
})
