import type React from 'react'
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import { ClarificationPanel } from '../ClarificationPanel'
import { QuestionSummary } from '../QuestionSummary'
import { AIChatQSDataTypeEnum, type ChatStoreState } from '../../hooks/aiRender'
import { syncQuestionPanel } from '../questionPanel'

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
      t: (key: string) => (locale.InteractiveUI as Record<string, string>)[key.replace('InteractiveUI.', '')] || key,
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
  fireEvent.click(screen.getByText('下一组问题'))
  expect(screen.getByText('选择 second')).toBeTruthy()
  fireEvent.click(screen.getByText('下一组问题'))
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
