import React, { createRef, useImperativeHandle, useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AIReActChatRefProps } from '@/pages/ai-re-act/aiReActChat/AIReActChatType'
import type { AIChatTextareaProps, AIChatTextareaRefProps } from '../../template/type'
import type * as WelcomeModule from '../AIChatWelcome'
import { compileReactModule } from '@/utils/__test__/helpers/compileReactModule'

const createInputHandle = (value: string) => ({
  setHttpFlow: vi.fn(),
  setValue: vi.fn(),
  setMention: vi.fn(),
  getValue: vi.fn(() => value),
})
const inputHandles = [createInputHandle('first draft'), createInputHandle('second draft')]

vi.mock('../../template/template', () => ({
  AIChatTextarea: React.forwardRef<AIChatTextareaRefProps, AIChatTextareaProps>(function Input(props, ref) {
    const [revision, setRevision] = useState(0)
    useImperativeHandle(ref, () => inputHandles[revision], [revision])
    return (
      <div>
        <button onClick={() => setRevision(1)}>更换输入框 ref</button>
        <button onClick={() => props.onHttpFlowRemove?.('101', false)}>删除单条流量</button>
        <button onClick={() => props.onHttpFlowRemove?.('101,102', true)}>删除聚合流量</button>
      </div>
    )
  }),
}))
vi.mock('ahooks', async () => ({ ...(await vi.importActual('ahooks')), useInViewport: () => [false] }))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'zh' } }),
}))
vi.mock('../../grpc', () => ({
  grpcGetAIReActRecommendedSkills: vi.fn().mockResolvedValue({ Data: [] }),
  grpcUpdateAIReActRecommendedSkill: vi.fn(),
  grpcResetAIReActRecommendedSkill: vi.fn(),
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({ YakitButton: () => null }))
vi.mock('@/components/yakitUI/YakitEditor/YakitEditor', () => ({ YakitEditor: () => null }))
vi.mock('@/components/yakitUI/YakitModal/YakitModal', () => ({ YakitModal: () => null }))
vi.mock('@/utils/getMainOperatorPageBodyContainer', () => ({
  getMainOperatorPageBodyContainerOrBody: () => document.body,
}))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('../AIChatWelcomeSideSetting', () => ({ SideSettingButton: () => null }))

const { default: AIChatWelcome } = await compileReactModule<typeof WelcomeModule>(
  import.meta.url,
  '../AIChatWelcome.tsx',
)

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AIChatWelcome 输入框转发', () => {
  it('转发输入方法，并在子输入框 handle 更换后使用最新 ref', () => {
    const ref = createRef<AIReActChatRefProps>()
    render(<AIChatWelcome ref={ref} onTriageSubmit={vi.fn()} onSetReAct={vi.fn()} />)
    const welcomeHandle = ref.current!
    const mention: Parameters<AIChatTextareaRefProps['setMention']>[0] = {
      mentionId: 'skill-1',
      mentionName: '测试技能',
      mentionType: 'tool',
    }

    welcomeHandle.setHttpFlow(['101'])
    welcomeHandle.setValue('first question')
    welcomeHandle.setMention(mention)
    expect(welcomeHandle.getValue()).toBe('first draft')
    expect(inputHandles[0].setHttpFlow).toHaveBeenCalledWith(['101'])
    expect(inputHandles[0].setValue).toHaveBeenCalledWith('first question')
    expect(inputHandles[0].setMention).toHaveBeenCalledWith(mention)

    fireEvent.click(screen.getByRole('button', { name: '更换输入框 ref' }))
    expect(ref.current).toBe(welcomeHandle)
    welcomeHandle.setHttpFlow(['102', '103'])
    welcomeHandle.setValue('second question')
    welcomeHandle.setMention({ ...mention, mentionId: 'skill-2' })
    expect(welcomeHandle.getValue()).toBe('second draft')
    expect(inputHandles[1].setHttpFlow).toHaveBeenCalledWith(['102', '103'])
    expect(inputHandles[1].setValue).toHaveBeenCalledWith('second question')
    expect(inputHandles[1].setMention).toHaveBeenCalledWith({ ...mention, mentionId: 'skill-2' })
    for (const method of Object.values(inputHandles[0])) expect(method).toHaveBeenCalledOnce()
  })

  it('将单条与聚合流量删除事件传给父级，并使用更新后的回调', () => {
    const onHttpFlowRemove = vi.fn()
    const onTriageSubmit = vi.fn()
    const onSetReAct = vi.fn()
    const { rerender } = render(<AIChatWelcome {...{ onHttpFlowRemove, onTriageSubmit, onSetReAct }} />)
    fireEvent.click(screen.getByRole('button', { name: '删除单条流量' }))
    fireEvent.click(screen.getByRole('button', { name: '删除聚合流量' }))
    expect(onHttpFlowRemove.mock.calls).toEqual([
      ['101', false],
      ['101,102', true],
    ])

    const nextRemove = vi.fn()
    rerender(<AIChatWelcome {...{ onTriageSubmit, onSetReAct }} onHttpFlowRemove={nextRemove} />)
    fireEvent.click(screen.getByRole('button', { name: '删除单条流量' }))
    fireEvent.click(screen.getByRole('button', { name: '删除聚合流量' }))
    expect(nextRemove.mock.calls).toEqual([
      ['101', false],
      ['101,102', true],
    ])
    expect(onHttpFlowRemove).toHaveBeenCalledTimes(2)
  })
})
