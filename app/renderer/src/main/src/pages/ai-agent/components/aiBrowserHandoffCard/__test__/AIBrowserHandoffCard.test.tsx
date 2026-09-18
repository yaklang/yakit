import type React from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AIChatQSDataTypeEnum, type ChatBrowserHandoff } from '@/pages/ai-re-act/hooks/aiRender'
import { callBrowserExtensionCapability } from '@/pages/browserExtension/browserExtensionClient'
import { AIBrowserHandoffCard } from '../AIBrowserHandoffCard'

const { t } = vi.hoisted(() => ({ t: (key: string) => key }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t }) }))
vi.mock('@/pages/browserExtension/browserExtensionClient', () => ({ callBrowserExtensionCapability: vi.fn() }))
vi.mock('../../../browserInstances/browserInstanceStore', () => ({ useBrowserInstances: () => ({ instances: [] }) }))
vi.mock('../../ChatCard', () => ({
  default: ({ children, titleExtra }: React.PropsWithChildren<{ titleExtra?: React.ReactNode }>) => (
    <div>
      {titleExtra}
      {children}
    </div>
  ),
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({
    children,
    onClick,
    disabled,
    loading,
  }: React.PropsWithChildren<{ onClick?: () => void; disabled?: boolean; loading?: boolean }>) => (
    <button disabled={disabled || loading} onClick={onClick}>
      {children}
    </button>
  ),
}))
vi.mock('@/components/yakitUI/YakitSpin/YakitSpin', () => ({ YakitSpin: () => null }))

const item = (reason: ChatBrowserHandoff['data']['reason']): ChatBrowserHandoff => ({
  id: 'handoff',
  type: AIChatQSDataTypeEnum.BROWSER_HANDOFF,
  chatType: 'reAct',
  Timestamp: 1,
  AIService: '',
  AIModelName: '',
  data: { handoffId: 'handoff', deviceId: 'browser', reason, state: 'waiting_for_user', tabId: 1, frameId: 0 },
})

describe('browser handoff recovery', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetAllMocks()
  })
  afterEach(() => {
    cleanup()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it.each(['done', 'openBrowser'])('shows non-QR %s failures and allows retry', async (action) => {
    vi.mocked(callBrowserExtensionCapability)
      .mockRejectedValueOnce(new Error('browser unavailable'))
      .mockResolvedValue(undefined)
    render(<AIBrowserHandoffCard item={item('mfa')} renderNum={0} />)
    await act(async () => {
      fireEvent.click(screen.getByText(`AIBrowserHandoffCard.${action}`))
    })
    expect(screen.getByRole('alert')).toHaveTextContent('browser unavailable')
    await act(async () => {
      fireEvent.click(screen.getByText(`AIBrowserHandoffCard.${action}`))
    })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(callBrowserExtensionCapability).toHaveBeenCalledTimes(2)
  })

  it('retries transient QR errors, focuses the browser after misses, and stops after completion', async () => {
    let reads = 0
    vi.mocked(callBrowserExtensionCapability).mockImplementation(async (_id, capability) => {
      if (capability !== 'browser.handoff.presentation.get') return undefined
      reads += 1
      if (reads === 1) throw new Error('temporary disconnect')
      return { state: reads < 5 ? 'not_found' : 'completed' }
    })
    const view = render(<AIBrowserHandoffCard item={item('qr_code')} renderNum={0} />)
    await act(async () => {})
    expect(screen.getByText('Error: temporary disconnect')).toBeInTheDocument()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9_000)
    })
    expect(callBrowserExtensionCapability).toHaveBeenCalledWith(
      'browser',
      'browser.handoff.focus',
      { handoffId: 'handoff' },
      20_000,
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000)
    })
    expect(screen.getByText('AIBrowserHandoffCard.completed')).toBeInTheDocument()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    expect(reads).toBe(5)
    view.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not schedule another poll after unmount during an in-flight request', async () => {
    let resolve!: (value: unknown) => void
    vi.mocked(callBrowserExtensionCapability).mockReturnValue(
      new Promise((done) => {
        resolve = done
      }),
    )
    const view = render(<AIBrowserHandoffCard item={item('qr_code')} renderNum={0} />)
    view.unmount()
    await act(async () => {
      resolve({ state: 'not_found' })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    expect(callBrowserExtensionCapability).toHaveBeenCalledTimes(1)
  })
})
