import { describe, expect, it } from 'vitest'
import { AIChatQSData, AIChatQSDataTypeEnum } from '../aiRender'
import { findOptimisticQuestionId } from '../optimisticQuestion'

const question = (id: string, text: string, timestamp: number, taskIndex?: string): AIChatQSData => ({
  id,
  chatType: 'reAct',
  type: AIChatQSDataTypeEnum.QUESTION,
  Timestamp: timestamp,
  data: { qs: text, setting: {} },
  AIService: '',
  AIModelName: '',
  taskIndex,
  extraValue: { showQS: text },
})

describe('optimistic question reconciliation', () => {
  it('finds the latest matching optimistic question when the backend UUID is missing', () => {
    const contents = new Map<string, AIChatQSData>([
      ['confirmed-old', question('confirmed-old', '同一句话', 90, '1')],
      ['optimistic', question('optimistic', '同一句话', 100)],
    ])

    expect(findOptimisticQuestionId(contents, question('react-task', '同一句话', 101, '2'))).toBe('optimistic')
  })

  it('does not merge an old or already confirmed identical question', () => {
    const contents = new Map<string, AIChatQSData>([
      ['confirmed', question('confirmed', '重复内容', 100, '1')],
      ['old-optimistic', question('old-optimistic', '重复内容', 10)],
    ])

    expect(findOptimisticQuestionId(contents, question('react-task', '重复内容', 101, '2'))).toBeUndefined()
  })
})
