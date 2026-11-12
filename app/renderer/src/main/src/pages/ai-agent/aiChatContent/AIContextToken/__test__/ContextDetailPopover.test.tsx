import type React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import type { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import ContextDetailPopover from '../ContextDetailPopover'

const mocks = vi.hoisted(() => ({
  onSend: vi.fn(),
  details: vi.fn((_props: Record<string, unknown>) => null),
  perf: null as { modelContext: AIAgentGrpcApi.ModelContext } | null,
}))
const sessionStore = createStore(() => ({ execute: true }))

vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({
  useCurrentStore: () => sessionStore,
}))

vi.mock('@/pages/ai-re-act/hooks/useCurrentSessionId', () => ({ default: () => 'session-id' }))
vi.mock('@/pages/ai-agent/useContext/useDispatcher', () => ({ default: () => ({ onSend: mocks.onSend }) }))
vi.mock('@/utils/randomUtil', () => ({ randomString: () => 'sync-id' }))
vi.mock('@/pages/ai-agent/utils', () => ({ formatNumberUnits: (value: number) => String(value) }))
vi.mock('@/hook/useRafPolling/useRafPolling', () => ({
  useRafPolling: () => ({ renderNumber: 0, aiDataRef: mocks.perf }),
}))
vi.mock('../useContextPerfStore', () => ({
  CONTEXT_PERF_POLL_INTERVAL: 2000,
  useContextPerfStore: () => ({}),
}))
vi.mock('../AIEchartsDetails', () => ({ default: mocks.details }))
vi.mock('@/components/yakitUI/YakitPopover/YakitPopover', () => ({
  YakitPopover: ({ onOpenChange, content }: { onOpenChange: (visible: boolean) => void; content: React.ReactNode }) => (
    <>
      {content}
      <button type="button" onClick={() => onOpenChange(true)}>
        打开详情
      </button>
    </>
  ),
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))

describe('ContextDetailPopover', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.perf = null
  })

  it('将运行时模型阈值传给数据详情', () => {
    mocks.perf = {
      modelContext: {
        provider: 'openai',
        model: 'main',
        context_tokens: 500 * 1024,
        threshold_tokens: 100 * 1024,
        prompt_tokens: 58000,
        source: 'manual',
        pending: false,
        too_small: false,
      },
    }
    render(<ContextDetailPopover />)
    expect(mocks.details.mock.calls.at(-1)?.[0].modelContext).toBe(mocks.perf.modelContext)
  })

  it('打开详情时主动同步最新 consumption', () => {
    render(<ContextDetailPopover />)

    fireEvent.click(screen.getByRole('button', { name: '打开详情' }))

    expect(mocks.onSend).toHaveBeenCalledWith({
      token: 'session-id',
      type: '',
      params: {
        IsSyncMessage: true,
        SyncType: 'consumption',
        SyncID: 'sync-id',
      },
    })
  })
})
