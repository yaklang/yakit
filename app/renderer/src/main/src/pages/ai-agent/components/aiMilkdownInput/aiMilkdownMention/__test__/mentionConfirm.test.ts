import { describe, expect, it } from 'vitest'
import { planMentionConfirm } from '../mentionConfirm'

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
