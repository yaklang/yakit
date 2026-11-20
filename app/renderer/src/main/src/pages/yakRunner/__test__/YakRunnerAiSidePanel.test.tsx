import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { HistoryAIReActChatSlotOptions } from '@/components/historyAIReActChat'
import { AIInputInnerFeatureEnum } from '@/pages/ai-agent/template/type'
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
let focusModeLoop = ''

vi.mock('@/components/historyAIReActChat', () => ({
  useHistoryAIReActChat: () => ({
    renderHistoryAIReActChat,
    setShowFreeChat,
    historyAIReActChatBridge: { onNewChat: vi.fn() },
    focusModeLoop,
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
  ['Yak Runner', <YakRunnerAiSidePanel>{null}</YakRunnerAiSidePanel>, 'code_security_audit'],
  ['规则生成', <AuditCodeRuleGenChat />, 'write_syntaxflow'],
] as const)('%s 侧栏配置默认场景并禁止修改，同时保留模型入口', (_, sidebar, scene) => {
  focusModeLoop = scene
  render(sidebar)

  expect(renderHistoryAIReActChat).toHaveBeenCalled()
  const parameters = renderHistoryAIReActChat.mock.lastCall?.[0].externalParameters
  expect(parameters).not.toHaveProperty('footerRightTypes')
  expect(parameters?.footerLeftTypes).toContain(AIInputInnerFeatureEnum.AIModelSelect)
  expect(parameters?.footerLeftTypes).toContainEqual({
    type: AIInputInnerFeatureEnum.AIFocusMode,
    props: { value: scene, disabled: true },
  })
})
