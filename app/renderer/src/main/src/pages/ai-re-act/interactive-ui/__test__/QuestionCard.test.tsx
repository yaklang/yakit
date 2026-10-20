import React from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QuestionCard } from '../QuestionCard'
import { AIChatQSDataTypeEnum } from '../../hooks/aiRender'
import type { QuestionRequest } from '../types'
import { questionText } from '../types'

const send = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
vi.mock('../../hooks/ChatMultiSessionController', () => ({
  globalSessionEngine: { sendUIInteraction: send, persistUIState: vi.fn() },
}))
vi.mock('../../hooks/persist/contentPersistHelper', () => ({ upsertSessionContent: vi.fn() }))
vi.mock('@/i18n/useI18nNamespaces', async () => {
  const { default: locale } = await import('@/locales/zh/aiAgent.json')
  return {
    useI18nNamespaces: () => ({
      t: (key: string, options?: Record<string, unknown>) => {
        const label = (locale.InteractiveUI as Record<string, string>)[key.replace('InteractiveUI.', '')] || key
        return label.replace(/\{\{(\w+)\}\}/g, (_, name) => String(options?.[name] ?? ''))
      },
    }),
  }
})

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
    vi.useFakeTimers()
    render(<QuestionCard item={item()} />)
    expect(screen.getAllByRole('radio').every((node) => !(node as HTMLInputElement).checked)).toBe(true)
    const input = screen.getByLabelText('自己的答案')
    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: '都需要' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 })
    expect(send.mock.calls.every((call) => !call[1].IsFreeInput)).toBe(true)
    fireEvent.compositionEnd(input)
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(send.mock.calls.every((call) => !call[1].IsFreeInput)).toBe(true)
    await act(async () => {
      vi.advanceTimersByTime(60)
    })
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
    expect(screen.getAllByRole('radio')[1]).toBeChecked()
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
  it('shows a read-only answer after acknowledgement, stale snapshots and remounts', async () => {
    const data = item()
    const view = render(<QuestionCard item={data} />)
    fireEvent.click(screen.getByRole('radio', { name: /后端/ }))
    await act(async () => {
      for (let i = 0; i < 15; i++) fireEvent.click(screen.getByRole('button', { name: '提交' }))
    })
    expect(send.mock.calls.filter((call) => call[1].IsFreeInput)).toHaveLength(1)
    const stale = { ...data, data: { ...data.data, request: { ...data.data.request, state: 'pending' as const } } }
    view.rerender(<QuestionCard item={stale} />)
    expect(screen.getByText('已回答')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '查看回答' }))
    expect(screen.getByText('后端')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '提交' })).toBeNull()
    expect(screen.queryByRole('button', { name: '跳过此题' })).toBeNull()
    expect(screen.queryByRole('radio')).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
    view.unmount()
    render(<QuestionCard item={stale} />)
    expect(screen.getByText('已回答')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '提交' })).toBeNull()
  })
  it('restores accepted answers without a local draft', () => {
    const q = request()
    q.state = 'submitted'
    q.answers = [{ questionId: 'scope', selected: ['a'], text: '优先接口' }]
    render(<QuestionCard item={item(q)} />)
    fireEvent.click(screen.getByRole('button', { name: '查看回答' }))
    expect(screen.getByText('前端；优先接口')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '跳过此题' })).toBeNull()
  })
  it('submits earlier answers with a skipped placeholder and removes all editing controls', async () => {
    const q = request()
    q.questions.push({ ...q.questions[0], id: 'detail', title: '详细程度' })
    render(<QuestionCard item={item(q)} />)
    fireEvent.keyDown(screen.getByRole('region'), { key: '2' })
    fireEvent.keyDown(screen.getByRole('region'), { key: 'ArrowRight' })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '跳过此题' }))
    })
    fireEvent.click(screen.getByRole('button', { name: '查看回答' }))
    expect(screen.getByText('后端')).toBeInTheDocument()
    expect(screen.getByText('未选择')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '提交' })).toBeNull()
  })
  it('preserves the receipt ID and permits retry after a failed submission', async () => {
    const q = request()
    q.touched = true
    send.mockRejectedValueOnce(new Error('连接中断'))
    render(<QuestionCard item={item(q)} />)
    fireEvent.click(screen.getByRole('radio', { name: /后端/ }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '提交' }))
    })
    expect(screen.getByText('Error: 连接中断')).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '提交' }))
    })
    const attempts = send.mock.calls.filter((call) => call[1].IsFreeInput)
    expect(attempts).toHaveLength(2)
    expect(JSON.parse(attempts[0][1].UserInteraction).id).toBe(JSON.parse(attempts[1][1].UserInteraction).id)
    expect(screen.getByText('已回答')).toBeInTheDocument()
  })
  it('supports multi-select and keyboard focus with project controls', () => {
    const q = request()
    q.questions[0].multiple = true
    render(<QuestionCard item={item(q)} />)
    const region = screen.getByRole('region')
    fireEvent.keyDown(region, { key: '1' })
    fireEvent.keyDown(region, { key: '2' })
    expect(screen.getAllByRole('checkbox').every((input) => (input as HTMLInputElement).checked)).toBe(true)
    fireEvent.keyDown(region, { key: 'ArrowDown' })
    expect(screen.getAllByRole('checkbox')[0]).toHaveFocus()
    fireEvent.keyDown(screen.getAllByRole('checkbox')[0], { key: 'ArrowDown' })
    expect(screen.getAllByRole('checkbox')[1]).toHaveFocus()
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
