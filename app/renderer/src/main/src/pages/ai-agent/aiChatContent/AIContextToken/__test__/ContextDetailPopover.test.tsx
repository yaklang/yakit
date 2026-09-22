import type React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import ContextDetailPopover from '../ContextDetailPopover'

const mocks = vi.hoisted(() => ({ onSend: vi.fn() }))
const sessionStore = createStore(() => ({ execute: true }))

vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({
  useCurrentStore: () => sessionStore,
}))

vi.mock('@/pages/ai-re-act/hooks/useCurrentSessionId', () => ({ default: () => 'session-id' }))
vi.mock('@/pages/ai-agent/useContext/useDispatcher', () => ({ default: () => ({ onSend: mocks.onSend }) }))
vi.mock('@/utils/randomUtil', () => ({ randomString: () => 'sync-id' }))
vi.mock('@/pages/ai-agent/utils', () => ({ formatNumberUnits: (value: number) => String(value) }))
vi.mock('@/hook/useRafPolling/useRafPolling', () => ({
  useRafPolling: () => ({ renderNumber: 0, aiDataRef: null }),
}))
vi.mock('../useContextPerfStore', () => ({
  CONTEXT_PERF_POLL_INTERVAL: 2000,
  useContextPerfStore: () => ({}),
}))
vi.mock('../AIEchartsDetails', () => ({ default: () => null }))
vi.mock('@/components/yakitUI/YakitPopover/YakitPopover', () => ({
  YakitPopover: ({ onOpenChange }: { onOpenChange: (visible: boolean) => void }) => (
    <button type="button" onClick={() => onOpenChange(true)}>
      打开详情
    </button>
  ),
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))

describe('ContextDetailPopover', () => {
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
