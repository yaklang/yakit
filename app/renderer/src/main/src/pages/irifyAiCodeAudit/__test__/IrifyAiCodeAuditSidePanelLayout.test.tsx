import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { AIReActChatProps } from '@/pages/ai-re-act/aiReActChat/AIReActChatType'
import { AIInputInnerFeatureEnum } from '@/pages/ai-agent/template/type'
import { IrifyAiCodeAuditSidePanelLayout } from '../IrifyAiCodeAuditSidePanelLayout'

const mocks = vi.hoisted(() => ({
  renderChat: vi.fn<(props: Pick<AIReActChatProps, 'externalParameters'>) => void>(),
  setShowFreeChat: vi.fn(),
}))

vi.mock('@/components/historyAIReActChat', () => ({
  useHistoryAIReActChat: () => ({
    renderHistoryAIReActChat: mocks.renderChat,
    setShowFreeChat: mocks.setShowFreeChat,
    historyAIReActChatBridge: { onNewChat: vi.fn() },
  }),
}))
vi.mock('@/components/yakitUI/YakitResizeBox/YakitResizeBox', () => ({ YakitResizeBox: () => null }))
vi.mock('@/components/yakitSideTab/YakitSideTab', () => ({ YakitSideTab: () => null }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const getSceneProps = () =>
  mocks.renderChat.mock.lastCall?.[0].externalParameters?.footerLeftTypes?.find(
    (item) => typeof item !== 'string' && item.type === AIInputInnerFeatureEnum.AIFocusMode,
  )?.props

it('uses the shared scene selector with the two IRify audit styles and keeps the selection locked after starting', () => {
  const onAuditStyleChange = vi.fn()
  const { rerender } = render(
    <IrifyAiCodeAuditSidePanelLayout auditStyle="unset" onAuditStyleChange={onAuditStyleChange}>
      <div />
    </IrifyAiCodeAuditSidePanelLayout>,
  )
  const config = mocks.renderChat.mock.lastCall?.[0].externalParameters
  expect(config?.footerRightTypes).toEqual([])
  const scene = getSceneProps()
  expect(scene).toMatchObject({
    value: 'code',
    allowClear: false,
    options: [
      { value: 'code', label: 'styleToggle.code' },
      { value: 'skill', label: 'styleToggle.skill' },
    ],
  })
  scene?.onChange?.('skill')
  scene?.onChange?.('code')
  scene?.onChange?.(undefined)
  expect(onAuditStyleChange.mock.calls).toEqual([['skill'], ['code']])

  rerender(
    <IrifyAiCodeAuditSidePanelLayout auditStyle="skill" auditStyleLocked onAuditStyleChange={onAuditStyleChange}>
      <div />
    </IrifyAiCodeAuditSidePanelLayout>,
  )
  const locked = getSceneProps()
  expect(locked).toMatchObject({ value: 'skill', disabled: true })
  locked?.onChange?.('code')
  expect(onAuditStyleChange).toHaveBeenCalledTimes(2)
})
