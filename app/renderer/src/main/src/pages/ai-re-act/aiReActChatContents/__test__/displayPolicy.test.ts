import { describe, expect, it } from 'vitest'
import { shouldHideReActFinishedStream } from '../displayPolicy'

describe('shouldHideReActFinishedStream', () => {
  it('hides known ReAct completion markers without depending on the active language', () => {
    expect(shouldHideReActFinishedStream('react_task_finished')).toBe(true)
    expect(
      shouldHideReActFinishedStream('structured-status', {
        Zh: 'ReAct 任务结束 / ReAct task finished',
        En: 'ReAct task finished',
      }),
    ).toBe(true)
  })

  it('keeps ordinary ReAct output visible', () => {
    expect(
      shouldHideReActFinishedStream('re-act-loop-answer-payload', {
        Zh: 'AI 响应',
        En: 'AI response',
      }),
    ).toBe(false)
  })
})
