import type React from 'react'
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import { ClarificationPanel } from '../ClarificationPanel/ClarificationPanel'
import { QuestionSummary } from '../QuestionSummary/QuestionSummary'
import { AIChatQSDataTypeEnum, type ChatStoreState } from '../../hooks/aiRender'
import { questionSummaryLines } from '../../interactive-ui/utils'
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
const pinPending = async () => {
  fireEvent.mouseEnter(screen.getByRole('button', { name: /问卷队列/ }))
  fireEvent.click(await screen.findByText('待回答'))
}
it('renders submitted choice answers as a numbered summary without the chat prefix', () => {
  const data = item('目标受众')
  data.data.request.questions![0].title = '目标受众'
  data.data.request.questions![0].prompt = '最终说明面向谁？'
  data.data.request.questions![0].options[0].label = '开发者'
  data.data.request.state = 'submitted'
  data.data.request.answers = [{ questionId: 'q', selected: ['a'], text: '123' }]
  expect(questionSummaryLines(data.data.request, data.data.request.answers)).toEqual([
    '目标受众（最终说明面向谁？）：开发者；123',
  ])
  render(<QuestionSummary item={data} />)
  expect(screen.getByText('已回答')).toBeInTheDocument()
  expect(screen.queryByText(/对追问的回答/)).toBeNull()
  expect(screen.getAllByRole('listitem').map((node) => node.textContent)).toEqual([
    '目标受众（最终说明面向谁？）：开发者；123',
  ])
  expect(screen.queryByText('展开问题')).toBeNull()
})
it('renders submitted form values as a numbered summary without the form title prefix', () => {
  const data = formItem('form')
  data.data.request.state = 'submitted'
  data.data.request.values = { target: '授权演示系统' }
  expect(questionSummaryLines(data.data.request, [], data.data.request.values)).toEqual(['目标名称：授权演示系统'])
  render(<QuestionSummary item={data} />)
  expect(screen.getByText('已回答')).toBeInTheDocument()
  expect(screen.queryByText(/对追问的回答/)).toBeNull()
  expect(screen.queryByText(/参数表单 form/)).toBeNull()
  expect(screen.getAllByRole('listitem').map((node) => node.textContent)).toEqual(['目标名称：授权演示系统'])
})
it('keeps a multiline free-text answer inside one summary item', () => {
  const data = item('目标受众')
  data.data.request.questions![0].title = '目标受众'
  data.data.request.questions![0].prompt = '最终说明面向谁？'
  data.data.request.questions![0].options[0].label = '开发者'
  data.data.request.state = 'submitted'
  data.data.request.answers = [{ questionId: 'q', selected: ['a'], text: '第一行\n第二行' }]
  const summary = '目标受众（最终说明面向谁？）：开发者；第一行\n第二行'
  expect(questionSummaryLines(data.data.request, data.data.request.answers)).toEqual([summary])
  render(<QuestionSummary item={data} />)
  expect(screen.getAllByRole('listitem')).toHaveLength(1)
  expect(screen.getByRole('listitem').textContent).toBe(summary)
})
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
  await pinPending()
  expect(screen.getByText('选择 second')).toBeTruthy()
  await pinPending()
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

  await pinPending()
  expect(view.container.querySelectorAll('section')).toHaveLength(1)
  expect(view.container.querySelector('form')).toBeNull()
  fireEvent.click(screen.getAllByRole('checkbox')[1])
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '选择问卷的补充' } })
  await pinPending()
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
it('refresh restores missing pending tokens without changing the current item', async () => {
  const first = item('first')
  const extra = formItem('focus')
  extra.data.request.mode = 'blocking'
  extra.data.request.form!.title = '关注重点'
  const stale = item('done')
  stale.data.request.state = 'submitted'
  context.contents.set(first.id, first)
  context.contents.set(extra.id, extra)
  context.contents.set(stale.id, stale)
  syncQuestionPanel(context.store, first)
  act(() => {
    context.store.getState().updateState({
      questionPanelTokens: [first.id, stale.id],
      questionPanelRevision: 1,
    })
  })
  render(<ClarificationPanel />)
  expect(screen.getByText('选择 first')).toBeTruthy()
  expect(screen.getByRole('button', { name: /问卷队列/ }).textContent?.replace(/\s/g, '')).toBe('问卷队列1')
  fireEvent.mouseEnter(screen.getByRole('button', { name: /问卷队列/ }))
  const revision = context.store.getState().questionPanelRevision
  fireEvent.click(await screen.findByRole('button', { name: '刷新' }))
  expect(context.store.getState().questionPanelTokens).toEqual([first.id, extra.id])
  expect(context.store.getState().questionPanelRevision).toBeGreaterThan(revision)
  expect(screen.getByText('选择 first')).toBeTruthy()
  expect(await screen.findByText('阻塞·参数表单')).toBeInTheDocument()
  expect(screen.getByText('异步·选择问卷')).toBeInTheDocument()
})
it('refreshes when the queue only contains submitted tokens and recovers pending questions', async () => {
  const stale = item('done')
  stale.data.request.state = 'submitted'
  const extra = item('extra')
  context.contents.set(stale.id, stale)
  context.contents.set(extra.id, extra)
  act(() => {
    context.store.getState().updateState({
      questionPanelTokens: [stale.id],
      questionPanelRevision: 1,
    })
  })
  render(<ClarificationPanel />)
  expect(screen.getByRole('button', { name: /问卷队列/ }).textContent?.replace(/\s/g, '')).toBe('问卷队列0')
  fireEvent.mouseEnter(screen.getByRole('button', { name: /问卷队列/ }))
  fireEvent.click(await screen.findByRole('button', { name: '刷新' }))
  expect(context.store.getState().questionPanelTokens).toEqual([extra.id])
  expect(screen.getByText('选择 extra')).toBeTruthy()
})
it('refreshes when the head token is no longer a questionnaire and recovers pending questions', async () => {
  const noise = {
    id: 'ui-component:noise',
    type: AIChatQSDataTypeEnum.UI_COMPONENT,
  }
  const extra = item('extra')
  context.contents.set(noise.id, noise)
  context.contents.set(extra.id, extra)
  act(() => {
    context.store.getState().updateState({
      questionPanelTokens: [noise.id],
      questionPanelRevision: 1,
    })
  })
  render(<ClarificationPanel />)
  expect(screen.queryByText('选择 extra')).toBeNull()
  fireEvent.mouseEnter(screen.getByRole('button', { name: /问卷队列/ }))
  fireEvent.click(await screen.findByRole('button', { name: '刷新' }))
  expect(context.store.getState().questionPanelTokens).toEqual([extra.id])
  expect(screen.getByText('选择 extra')).toBeTruthy()
})
it('shows the queue overlay on hover and jumps to a pending item', async () => {
  const first = item('first')
  const second = item('second')
  for (const data of [first, second]) {
    context.contents.set(data.id, data)
    syncQuestionPanel(context.store, data)
  }
  render(<ClarificationPanel />)
  await pinPending()
  expect(screen.getByText('选择 second')).toBeTruthy()
})
it('opens the queue overlay on click and keeps it after hover then click', async () => {
  const first = item('first')
  const second = item('second')
  for (const data of [first, second]) {
    context.contents.set(data.id, data)
    syncQuestionPanel(context.store, data)
  }
  render(<ClarificationPanel />)
  const trigger = screen.getByRole('button', { name: /问卷队列/ })
  fireEvent.click(trigger)
  expect(await screen.findByText('待回答')).toBeInTheDocument()
  fireEvent.click(screen.getByText('待回答'))
  expect(screen.getByText('选择 second')).toBeTruthy()
  fireEvent.mouseEnter(screen.getByRole('button', { name: /问卷队列/ }))
  expect(await screen.findByText('待回答')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /问卷队列/ }))
  fireEvent.mouseLeave(screen.getByRole('button', { name: /问卷队列/ }))
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300))
  })
  expect(screen.getByText('待回答')).toBeInTheDocument()
})
it('does not reopen or replace a collapsed questionnaire when a different form arrives', async () => {
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

  await pinPending()
  expect(screen.getByLabelText(/目标名称/)).toBeInTheDocument()
  expect(view.container.querySelectorAll('section')).toHaveLength(1)
  await pinPending()
  expect(screen.getByText('展开问题')).toBeTruthy()
  expect(view.container.querySelector('form')).toBeNull()
  fireEvent.click(screen.getByText('展开问题'))
  expect(screen.getAllByRole('checkbox')[0]).toBeChecked()
  expect(view.container.querySelectorAll('section')).toHaveLength(1)
  expect(send.mock.calls.some(([, event]) => event.IsFreeInput)).toBe(false)
})
