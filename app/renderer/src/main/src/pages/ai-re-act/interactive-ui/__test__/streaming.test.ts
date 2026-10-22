import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleComponentStream, handleComponentUI, UI_CONTENT_TYPE } from '../../hooks/grpcStreamHandler/aiComponentUI'
import { AIChatQSDataTypeEnum } from '../../hooks/aiRender'
import type { AIMessageHandlerParams } from '../../hooks/type'
import { aiInteractiveUIHandlers } from '../../hooks/grpcStreamHandler/aiInteractiveUI'
import { aiOtherDataHandlers } from '../../hooks/grpcStreamHandler/aiOther'

vi.mock('../../hooks/persist/contentPersistHelper', () => ({
  persistGetSessionContent: vi.fn().mockResolvedValue(undefined),
  persistIndependentItem: vi.fn(),
}))
const bytes = (text: string) => new TextEncoder().encode(text)
let contents = new Map()
const dispatch = vi.fn()
let state: any
const resetState = () => {
  state = {
    questionPanelTokens: [],
    questionPanelRevision: 0,
    dispatchStreamingNode: dispatch,
    incrementNodeVersion: vi.fn(),
    updateState: (next: object) => Object.assign(state, next),
  }
}
const info = (res: object) =>
  ({
    sessionId: 'session',
    rawData: { contents },
    meta: { lifecycle: { current: true, writable: true } },
    store: { getState: () => state },
    res: {
      Content: bytes(''),
      StreamDelta: bytes(''),
      EventUUID: 'stream',
      Type: 'stream',
      NodeId: 'ui_component',
      ContentType: UI_CONTENT_TYPE,
      ...res,
    },
  }) as unknown as AIMessageHandlerParams
const doc = {
  id: 'block',
  catalogVersion: '1.0',
  fallback: 'hello',
  root: 'text',
  nodes: [{ id: 'text', component: 'Text', props: { text: 'hello' } }],
}
beforeEach(() => {
  contents = new Map()
  resetState()
  dispatch.mockClear()
})
describe('UI event integration', () => {
  it.each([true, false])(
    'locks legacy forms from ordinary message receipts in either replay order (%s)',
    async (messageFirst) => {
      const metadata = {
        id: 'receipt',
        source: 'component',
        requestId: 'block',
        nodeId: 'form',
        values: { name: '小明' },
      }
      const message = info({
        Type: 'user_message',
        IsSync: true,
        Content: bytes(JSON.stringify({ id: 'receipt', text: '回答', metadata })),
      })
      const component = info({
        Type: 'ui_component',
        IsSync: true,
        Content: bytes(JSON.stringify({ document: doc, revision: 0 })),
      })
      if (messageFirst) {
        await aiInteractiveUIHandlers.user_message(message)
        await handleComponentUI(component)
      } else {
        await handleComponentUI(component)
        await aiInteractiveUIHandlers.user_message(message)
      }
      expect(contents.get('ui-component:block').data.submissions.form).toEqual(metadata)
      await handleComponentUI(component)
      expect(contents.get('ui-component:block').data.submissions.form).toEqual(metadata)
    },
  )
  it.each([true, false])('restores accepted questions in either replay order (%s)', async (messageFirst) => {
    const metadata = {
      id: 'receipt',
      source: 'questionnaire',
      requestId: 'question',
      answers: [{ questionId: 'scope', selected: ['frontend'], text: '只看交互' }],
    }
    const message = info({
      Type: 'user_message',
      IsSync: true,
      ID: 2,
      Content: bytes(JSON.stringify({ id: 'receipt', text: '回答', metadata })),
    })
    const question = info({
      Type: 'ui_question',
      IsSync: true,
      ID: 1,
      Content: bytes(
        JSON.stringify({ id: 'question', state: 'pending', touched: false, deadline: 9999, questions: [] }),
      ),
    })
    if (messageFirst) {
      await aiInteractiveUIHandlers.user_message(message)
      await aiInteractiveUIHandlers.ui_question(question)
    } else {
      await aiInteractiveUIHandlers.ui_question(question)
      await aiInteractiveUIHandlers.user_message(message)
    }
    expect(contents.get('ui-question:question').data.request).toMatchObject({
      state: 'submitted',
      touched: true,
      answers: metadata.answers,
    })
    expect(contents.get('ui-question:question').data.request.deadline).toBeUndefined()
    question.res.ID = 3
    await aiInteractiveUIHandlers.ui_question(question)
    expect(contents.get('ui-question:question').data.request.state).toBe('submitted')
    expect(contents.get('ui-question:question').data.request.answers).toEqual(metadata.answers)
    expect(state.questionPanelTokens).toEqual([])
  })
  it.each([true, false])(
    'deduplicates a late answer and dequeue regardless of arrival order (%s)',
    async (messageFirst) => {
      const metadata = { id: 'receipt', source: 'questionnaire', requestId: 'question', answers: [] }
      const message = info({
        Type: 'user_message',
        IsSync: true,
        Content: bytes(
          JSON.stringify({
            id: 'receipt',
            taskId: 'new-task',
            text: '回答',
            metadata,
          }),
        ),
      })
      const dequeue = info({
        Type: 'structured',
        NodeId: 'react_task_dequeue',
        IsSync: true,
        TaskId: 'new-task',
        Content: bytes(JSON.stringify({ reason: 'normal', react_task_id: 'new-task', react_task_input: '回答' })),
      })
      const handleMessage = () => aiInteractiveUIHandlers.user_message(message)
      const handleDequeue = () => aiOtherDataHandlers.react_task_dequeue(dequeue)
      if (messageFirst) {
        await handleMessage()
        await handleDequeue()
      } else {
        await handleDequeue()
        await handleMessage()
      }
      expect(contents.size).toBe(1)
      expect(contents.get('new-task').interactionMetadata).toEqual(metadata)
    },
  )
  it('merges streaming and authoritative snapshots into one stable block and preserves input', async () => {
    const request = info({ Type: 'stream_start', Content: bytes('{"event_writer_id":"stream"}') })
    await handleComponentStream(request)
    const source = JSON.stringify(doc)
    request.res.Type = 'stream'
    request.res.Content = bytes('')
    for (let i = 0; i < source.length; i += 20) {
      request.res.StreamDelta = bytes(source.slice(i, i + 20))
      await handleComponentStream(request)
    }
    const block = contents.get('ui-component:block')
    expect(block.type).toBe(AIChatQSDataTypeEnum.UI_COMPONENT)
    expect(block.data.source).toBe(source)
    block.uiState = { 'form:value': { value: { name: 'saved input' } } }
    await handleComponentUI({
      ...request,
      res: { ...request.res, Type: 'ui_component', Content: bytes(JSON.stringify({ document: doc, revision: 0 })) },
    })
    expect(contents.size).toBe(1)
    expect(contents.get('ui-component:block').data.final).toBe(true)
    expect(contents.get('ui-component:block').uiState).toEqual(block.uiState)
  })
  it('keeps the newest revision during backwards history replay', async () => {
    await handleComponentUI(
      info({ Type: 'ui_component', IsSync: true, Content: bytes(JSON.stringify({ document: doc, revision: 1 })) }),
    )
    await handleComponentUI(
      info({
        Type: 'ui_component',
        IsSync: true,
        Content: bytes(JSON.stringify({ document: { ...doc, fallback: 'old' }, revision: 0 })),
      }),
    )
    expect(contents.get('ui-component:block').data.revision).toBe(1)
    expect(contents.get('ui-component:block').data.source).not.toContain('old')
  })
})
