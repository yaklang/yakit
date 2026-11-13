import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { HistoryAIReActChatSlotOptions } from '@/components/historyAIReActChat'
import { AuditCodeRuleGenChat } from '@/pages/yakRunnerAuditCode/AuditCodeRuleGenChat'
import { YakRunnerAiSidePanel } from '../YakRunnerAiSidePanel'

vi.hoisted(() => {
  Object.defineProperty(window, 'require', {
    configurable: true,
    value: () => ({ ipcRenderer: { invoke: vi.fn(async () => ({ RawJson: '[]' })) } }),
  })
})

const renderHistoryAIReActChat = vi.fn((_options: HistoryAIReActChatSlotOptions) => null)
const setShowFreeChat = vi.fn()

vi.mock('@/components/historyAIReActChat', () => ({
  useHistoryAIReActChat: () => ({
    renderHistoryAIReActChat,
    setShowFreeChat,
    historyAIReActChatBridge: { onNewChat: vi.fn() },
  }),
}))
vi.mock('@/components/yakitUI/YakitResizeBox/YakitResizeBox', () => ({ YakitResizeBox: () => null }))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it.each([
  ['Yak Runner', <YakRunnerAiSidePanel>{null}</YakRunnerAiSidePanel>],
  ['规则生成', <AuditCodeRuleGenChat />],
])('%s 侧栏沿用输入框默认的模型选择', (_, sidebar) => {
  render(sidebar)

  expect(renderHistoryAIReActChat).toHaveBeenCalled()
  expect(renderHistoryAIReActChat.mock.lastCall?.[0].externalParameters).not.toHaveProperty('footerRightTypes')
})
