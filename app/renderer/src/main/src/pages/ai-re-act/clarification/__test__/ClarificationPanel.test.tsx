import type React from 'react'
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import { ClarificationPanel } from '../ClarificationPanel/ClarificationPanel'
import { QuestionSummary } from '../QuestionSummary/QuestionSummary'
import { AIChatQSDataTypeEnum, type ChatStoreState } from '../../hooks/aiRender'
import { syncQuestionPanel } from '../../interactive-ui/questionPanel'
import { createChatStore } from '../../hooks/chatStore'

const context = vi.hoisted(() => ({ store: undefined as any, contents: new Map<string, any>() }))
const send = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const open = vi.hoisted(() => vi.fn())
vi.mock('../../hooks/useCurrentDataBySession', () => ({
  useCurrentStore: () => context.store,
  useCurrentRawData: () => ({ contents: context.contents }),
}))
vi.mock('../../hooks/ChatMultiSessionController', () => ({
  globalSessionEngine: {
    sendUIInteraction: send,
    openQuestion: open,
    persistUIState: (_: string, item: any, draft: any) => {
      item.uiState = draft
      syncQuestionPanel(context.store, item)
    },
  },
}))
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
const item = (id: string): React.ComponentProps<typeof QuestionSummary>['item'] => ({
  id: `ui-question:${id}`,
  type: AIChatQSDataTypeEnum.UI_QUESTION,
  chatType: 'reAct',
  Timestamp: 0,
  AIService: '',
  AIModelName: '',
  data: {
    sessionId: 'session',
    request: {
      id,
      taskId: 'task',
      state: 'pending',
      mode: 'async',
      touched: false,
      questions: [
        {
          id: 'q',
          title: id,
          prompt: `选择 ${id}`,
          multiple: true,
          allowFreeText: true,
          options: [
            { id: 'a', label: '甲' },
            { id: 'b', label: '乙' },
          ],
        },
      ],
    },
  },
})
const formItem = (id: string) => {
  const data = item(id)
  data.data.request.questions = undefined
  data.data.request.form = {
    title: `参数表单 ${id}`,
    schema: {
      type: 'object',
      properties: { target: { type: 'string', title: '目标名称', minLength: 1 } },
      required: ['target'],
    },
  }
  return data
}
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {},
    })),
  })
})
beforeEach(() => {
  context.contents.clear()
  send.mockClear()
  open.mockClear()
  context.store = createStore<ChatStoreState>()(
    (set) =>
      ({
        questionPanelTokens: [],
        questionPanelRevision: 0,
        updateState: (next: any) => set(next),
      }) as unknown as ChatStoreState,
  )
})
afterEach(cleanup)
it('keeps history read-only and opens the composer panel explicitly', () => {
  const data = item('first')
  render(<QuestionSummary item={data} />)
  expect(screen.queryByRole('checkbox')).toBeNull()
  expect(screen.queryByText('提交')).toBeNull()
  fireEvent.click(screen.getByText('展开问题'))
  expect(open).toHaveBeenCalledWith(data)
})
it('queues requests, preserves drafts when switching and removes completed controls', async () => {
  const first = item('first')
  const second = item('second')
  for (const data of [first, second]) {
    context.contents.set(data.id, data)
    syncQuestionPanel(context.store, data)
  }
  render(<ClarificationPanel />)
  fireEvent.click(screen.getAllByRole('checkbox')[1])
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '保留这段补充' } })
  fireEvent.click(screen.getByRole('button', { name: /问卷队列/ }))
  expect(screen.getByText('选择 second')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: /问卷队列/ }))
  expect(screen.getAllByRole('checkbox')[1]).toBeChecked()
  expect(screen.getByRole('textbox')).toHaveValue('保留这段补充')
  await act(async () => {
    fireEvent.click(screen.getByText('提交'))
  })
  expect(send.mock.calls.filter(([, event]) => event.IsFreeInput)).toHaveLength(1)
  expect(context.store.getState().questionPanelTokens).toEqual([second.id])
  expect(screen.getByText('选择 second')).toBeTruthy()
  act(() => {
    second.data.request.state = 'cancelled'
    syncQuestionPanel(context.store, second)
  })
  expect(screen.queryByText('提交')).toBeNull()
  expect(screen.queryByText('跳过此题')).toBeNull()
})
it('does not reopen expired requests until the user chooses to answer', () => {
  const data = item('expired')
  data.data.request.state = 'expired'
  context.contents.set(data.id, data)
  syncQuestionPanel(context.store, data)
  const view = render(<ClarificationPanel />)
  expect(view.container).toBeEmptyDOMElement()
  act(() => {
    data.uiState = { answers: {}, page: 0, collapsed: false, touched: true }
    syncQuestionPanel(context.store, data, true)
  })
  expect(screen.getByText('选择 expired')).toBeTruthy()
})
it('keeps one editor when a choice request arrives during form editing and restores both drafts', async () => {
  const producer = createChatStore()
  context.store = producer.renderStore
  const first = formItem('form-first')
  const second = item('choice-second')
  context.contents.set(first.id, first)
  syncQuestionPanel(producer, first)
  const view = render(<ClarificationPanel />)
  fireEvent.change(screen.getByLabelText(/目标名称/), { target: { value: '授权演示系统' } })
  act(() => {
    context.contents.set(second.id, second)
    syncQuestionPanel(producer, second)
  })
  expect(view.container.querySelectorAll('section')).toHaveLength(1)
  expect(screen.getByLabelText(/目标名称/)).toHaveValue('授权演示系统')
  expect(screen.queryByRole('checkbox')).toBeNull()

  fireEvent.click(screen.getByRole('button', { name: /问卷队列/ }))
  expect(view.container.querySelectorAll('section')).toHaveLength(1)
  expect(view.container.querySelector('form')).toBeNull()
  fireEvent.click(screen.getAllByRole('checkbox')[1])
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '选择问卷的补充' } })
  fireEvent.click(screen.getByRole('button', { name: /问卷队列/ }))
  expect(screen.getByLabelText(/目标名称/)).toHaveValue('授权演示系统')
  expect(screen.queryByRole('checkbox')).toBeNull()

  await act(async () => {
    fireEvent.click(screen.getByText('提交'))
  })
  expect(producer.getState().questionPanelTokens).toEqual([second.id])
  expect(view.container.querySelectorAll('section')).toHaveLength(1)
  expect(view.container.querySelector('form')).toBeNull()
  expect(screen.getAllByRole('checkbox')[1]).toBeChecked()
  expect(screen.getByRole('textbox')).toHaveValue('选择问卷的补充')
  const submissions = send.mock.calls.filter(([, event]) => event.IsFreeInput)
  expect(submissions).toHaveLength(1)
  expect(JSON.parse(submissions[0][1].UserInteraction)).toMatchObject({
    requestId: first.data.request.id,
    values: { target: '授权演示系统' },
  })
})
it('does not reopen or replace a collapsed questionnaire when a different form arrives', () => {
  const producer = createChatStore()
  context.store = producer.renderStore
  const first = item('collapsed-first')
  const second = formItem('later-form')
  context.contents.set(first.id, first)
  syncQuestionPanel(producer, first)
  const view = render(<ClarificationPanel />)
  fireEvent.click(screen.getAllByRole('checkbox')[0])
  fireEvent.click(screen.getByText('收起'))
  act(() => {
    context.contents.set(second.id, second)
    syncQuestionPanel(producer, second)
  })
  expect(producer.getState().questionPanelTokens).toEqual([first.id, second.id])
  expect(view.container.querySelectorAll('section')).toHaveLength(1)
  expect(screen.getByText('展开问题')).toBeTruthy()
  expect(screen.queryByRole('checkbox')).toBeNull()
  expect(view.container.querySelector('form')).toBeNull()

  fireEvent.click(screen.getByRole('button', { name: /问卷队列/ }))
  expect(screen.getByLabelText(/目标名称/)).toBeInTheDocument()
  expect(view.container.querySelectorAll('section')).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: /问卷队列/ }))
  expect(screen.getByText('展开问题')).toBeTruthy()
  expect(view.container.querySelector('form')).toBeNull()
  fireEvent.click(screen.getByText('展开问题'))
  expect(screen.getAllByRole('checkbox')[0]).toBeChecked()
  expect(view.container.querySelectorAll('section')).toHaveLength(1)
  expect(send.mock.calls.some(([, event]) => event.IsFreeInput)).toBe(false)
})
