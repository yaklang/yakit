import React from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QuestionCard } from '../QuestionCard'
import { AIChatQSDataTypeEnum } from '../../hooks/aiRender'
import type { QuestionRequest } from '../types'
import { questionText } from '../types'

const send = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
vi.mock('../../hooks/ChatMultiSessionController', () => ({
  globalSessionEngine: { sendUIInteraction: send },
}))
vi.mock('../../hooks/persist/contentPersistHelper', () => ({ upsertSessionContent: vi.fn() }))

const request = (): QuestionRequest => ({
  id: 'q',
  taskId: 'task',
  state: 'pending',
  mode: 'async',
  touched: false,
  deadline: Date.now() + 5000,
  questions: [
    {
      id: 'scope',
      title: '范围',
      prompt: '选择范围',
      multiple: false,
      allowFreeText: true,
      options: [
        { id: 'a', label: '前端', recommended: true },
        { id: 'b', label: '后端' },
      ],
    },
  ],
})
const item = (q = request()): React.ComponentProps<typeof QuestionCard>['item'] => ({
  id: 'ui-question:q',
  type: AIChatQSDataTypeEnum.UI_QUESTION,
  chatType: 'reAct',
  Timestamp: 0,
  AIService: '',
  AIModelName: '',
  data: { sessionId: 'session', request: q },
})

describe('structured questions', () => {
  beforeEach(() => {
    send.mockClear()
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })
  it('does not submit a recommendation; permits text-only answers and protects IME', async () => {
    render(<QuestionCard item={item()} />)
    expect(screen.getAllByRole('radio').every((node) => node.getAttribute('aria-checked') === 'false')).toBe(true)
    const input = screen.getByLabelText('自己的答案')
    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: '都需要' } })
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 })
    expect(send.mock.calls.every((call) => !call[1].IsFreeInput)).toBe(true)
    fireEvent.compositionEnd(input)
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' })
    })
    const submission = send.mock.calls.find((call) => call[1].IsFreeInput)![1]
    expect(submission.FreeInput).toContain('都需要')
    expect(JSON.parse(submission.UserInteraction).answers[0].selected).toEqual([])
  })
  it('permanently cancels expiry on real interaction; Esc keeps the draft', async () => {
    vi.useFakeTimers()
    const data = item()
    render(<QuestionCard item={data} />)
    fireEvent.keyDown(screen.getByRole('region'), { key: '2' })
    fireEvent.keyDown(screen.getByRole('region'), { key: 'Escape' })
    await act(async () => {
      vi.advanceTimersByTime(10000)
    })
    expect(send.mock.calls.some((call) => call[1].IsFreeInput)).toBe(false)
    expect(send.mock.calls.some((call) => call[1].SyncJsonInput?.includes('expire'))).toBe(false)
    fireEvent.click(screen.getByText('展开问题'))
    expect(screen.getAllByRole('radio')[1].getAttribute('aria-checked')).toBe('true')
  })
  it('honors allowFreeText and submits placeholders only when some answer exists', async () => {
    const q = request()
    q.questions[0].allowFreeText = false
    render(<QuestionCard item={item(q)} />)
    expect(screen.queryByLabelText('自己的答案')).toBeNull()
    expect(questionText(q, [])).toBe('')
    await act(async () => {
      fireEvent.click(screen.getByText('跳过此题'))
    })
    expect(send.mock.calls.find((call) => call[1].IsFreeInput)![1].FreeInput).toBe('')
  })
  it('expires untouched requests and allows reopening', async () => {
    vi.useFakeTimers()
    render(<QuestionCard item={item()} />)
    await act(async () => {
      vi.advanceTimersByTime(6000)
    })
    expect(send.mock.calls.some((call) => call[1].SyncJsonInput?.includes('expire'))).toBe(true)
    expect(screen.getByText('展开问题')).toBeTruthy()
  })
})
