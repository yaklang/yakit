import { describe, expect, it } from 'vitest'
import { planMentionConfirm, shouldStartPlanForMentions } from '../mentionConfirm'

describe('planMentionConfirm', () => {
  it('场景和资源一起选时保留映射字段，且不再删光标前一个字符', () => {
    expect(
      planMentionConfirm([
        {
          type: 'forge',
          value: {
            id: 'skill-1',
            name: '技能',
            originalName: 'skill-a',
            mentionSource: 'attachment',
            knowledgeIndex: 2,
          },
        },
        { type: 'focusMode', value: { id: 'summarize', name: 'summarize' } },
      ]),
    ).toEqual({
      mentions: [
        {
          mentionType: 'forge',
          mentionId: 'skill-1',
          mentionName: '技能',
          name: 'skill-a',
          mentionSource: 'attachment',
          knowledgeIndex: 2,
        },
      ],
      focus: {
        mentionType: 'focusMode',
        mentionId: 'summarize',
        mentionName: 'summarize',
        name: undefined,
        mentionSource: undefined,
        knowledgeIndex: undefined,
      },
      removeTrigger: false,
    })
  })

  it('只选场景时仍删掉 @，多项场景取最后一项', () => {
    const plan = planMentionConfirm([
      { type: 'focusMode', value: { id: 'first', name: 'first' } },
      { type: 'focusMode', value: { id: 'second', name: 'second' } },
    ])
    expect(plan.mentions).toEqual([])
    expect(plan.focus?.mentionId).toBe('second')
    expect(plan.removeTrigger).toBe(true)
  })

  it('空名字不进入批量插入', () => {
    const plan = planMentionConfirm([
      { type: 'forge', value: { id: '1', name: '  ' } },
      { type: 'focusMode', value: { id: 'summarize', name: 'summarize' } },
    ])
    expect(plan.mentions).toEqual([])
    expect(plan.focus?.mentionId).toBe('summarize')
    expect(plan.removeTrigger).toBe(true)
  })

  it('缺少 id 时回退为 0', () => {
    expect(planMentionConfirm([{ type: 'tool', value: { id: '', name: '工具' } }]).mentions[0].mentionId).toBe('0')
  })
})

describe('shouldStartPlanForMentions', () => {
  const skill = { type: 'forge' as const, value: { id: '1', name: '技能', forgeType: 'skillmd' as const } }
  const forge = { type: 'forge' as const, value: { id: '2', name: '模板', forgeType: 'yak' as const } }
  const tool = { type: 'tool' as const, value: { id: '3', name: '工具' } }

  it('只选技能且 Plan 未开时不启动', () => {
    expect(shouldStartPlanForMentions([skill], false)).toBe(false)
  })

  it('选中 forge 模板且 Plan 未开时启动', () => {
    expect(shouldStartPlanForMentions([forge], false)).toBe(true)
  })

  it('选中工具、知识库等非技能且 Plan 未开时启动', () => {
    expect(shouldStartPlanForMentions([tool], false)).toBe(true)
  })

  it('Plan 已开启时不再启动', () => {
    expect(shouldStartPlanForMentions([tool], true)).toBe(false)
    expect(shouldStartPlanForMentions([forge], true)).toBe(false)
  })

  it('技能和 forge 混选且 Plan 未开时启动', () => {
    expect(shouldStartPlanForMentions([skill, forge], false)).toBe(true)
  })
})
