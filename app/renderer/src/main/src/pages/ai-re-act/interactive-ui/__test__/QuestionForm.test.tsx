import type React from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { QuestionCard } from '../QuestionCard'
import { QuestionSummary } from '../QuestionSummary'
import { readQuestionForm } from '../formValidation'
import { matchesSchema } from '../validate'
import { AIChatQSDataTypeEnum } from '../../hooks/aiRender'
const send = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})
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

const item = (): React.ComponentProps<typeof QuestionCard>['item'] => ({
  id: 'ui-question:form',
  type: AIChatQSDataTypeEnum.UI_QUESTION,
  chatType: 'reAct',
  Timestamp: 0,
  AIService: '',
  AIModelName: '',
  data: {
    sessionId: 'session',
    request: {
      id: 'form',
      taskId: 'task',
      mode: 'async',
      state: 'pending',
      touched: false,
      form: {
        title: '参数设置',
        schema: {
          type: 'object',
          properties: { name: { type: 'string', title: '姓名', minLength: 1 } },
          required: ['name'],
        },
      },
    },
  },
})
const answers = () => send.mock.calls.filter((call) => call[1].IsFreeInput)
afterEach(() => {
  cleanup()
  send.mockReset()
  send.mockResolvedValue(undefined)
})

describe('forms use the clarification channel', () => {
  it('preserves drafts across rerender/remount and submits only once after validation', async () => {
    const data = item()
    const view = render(<QuestionCard item={data} floating />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '提交' }))
    })
    expect(answers()).toHaveLength(0)
    fireEvent.change(screen.getByLabelText(/姓名/), { target: { value: '小明' } })
    view.rerender(<QuestionCard item={{ ...data }} floating />)
    expect(screen.getByLabelText(/姓名/)).toHaveValue('小明')
    view.unmount()
    render(<QuestionCard item={data} floating />)
    expect(screen.getByLabelText(/姓名/)).toHaveValue('小明')
    const button = screen.getByRole('button', { name: '提交' })
    await act(async () => {
      for (let i = 0; i < 15; i++) fireEvent.click(button)
    })
    expect(answers()).toHaveLength(1)
    expect(JSON.parse(answers()[0][1].UserInteraction)).toMatchObject({
      source: 'questionnaire',
      requestId: 'form',
      values: { name: '小明' },
    })
    expect(answers()[0][1].FreeInput).toBe('对追问的回答：参数设置\n姓名：小明')
    expect(screen.queryByRole('button', { name: '提交' })).toBeNull()
    expect(screen.queryByRole('button', { name: '跳过此题' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '查看回答' }))
    expect(screen.getByText(/姓名：小明/)).toBeInTheDocument()
  })
  it('retries a failed receipt with the same ID', async () => {
    send.mockImplementation(async (_session, event) => {
      if (event.IsFreeInput && answers().length === 1) throw new Error('断开')
    })
    render(<QuestionCard item={item()} />)
    fireEvent.change(screen.getByLabelText(/姓名/), { target: { value: '小明' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '提交' }))
    })
    expect(screen.getByText('Error: 断开')).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '提交' }))
    })
    expect(answers()).toHaveLength(2)
    expect(JSON.parse(answers()[0][1].UserInteraction).id).toBe(JSON.parse(answers()[1][1].UserInteraction).id)
  })
  it('preserves typed number, boolean, enum and array values; defaults do not submit', async () => {
    const data = item()
    const form = data.data.request.form!
    Object.assign(form.schema.properties!, {
      retries: { type: 'integer', title: '重试次数', minimum: 0, maximum: 5, default: 2 },
      enabled: { type: 'boolean', title: '启用', default: false },
      mode: { type: 'number', title: '模式', enum: [1, 2], default: 1 },
      focus: { type: 'array', title: '关注方面', minItems: 1, items: { type: 'string', enum: ['模块职责', '数据流'] } },
    })
    form.fieldOrder = ['focus', 'name']
    form.initial = { name: '小明' }
    const normalized = readQuestionForm(form)!
    expect(normalized.schema.properties!.focus).toMatchObject({ uniqueItems: true })
    expect(matchesSchema(normalized.schema, { name: '小明', focus: [] })).toBe(false)
    expect(matchesSchema(normalized.schema, { name: '小明', focus: ['数据流', '数据流'] })).toBe(false)
    const view = render(<QuestionCard item={data} />)
    expect(view.container.querySelector('input')).toHaveAttribute('type', 'checkbox')
    expect(answers()).toHaveLength(0)
    fireEvent.click(screen.getByRole('checkbox', { name: '数据流' }))
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('checkbox', { name: '启用' }))
    fireEvent.mouseDown(screen.getByRole('combobox'))
    fireEvent.click(screen.getByText('2', { selector: '.ant-select-item-option-content' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '提交' }))
    })
    expect(JSON.parse(answers()[0][1].UserInteraction).values).toEqual({
      name: '小明',
      retries: 3,
      enabled: true,
      mode: 2,
      focus: ['数据流'],
    })
  })
  it('IME does not submit, Escape keeps drafts and a real interaction cancels the deadline', async () => {
    const data = item()
    data.data.request.deadline = Date.now() + 10000
    render(<QuestionCard item={data} />)
    const input = screen.getByLabelText(/姓名/)
    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: '小明' } })
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true, keyCode: 229 })
    fireEvent.compositionEnd(input)
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(answers()).toHaveLength(0)
    expect(send.mock.calls.some((call) => JSON.parse(call[1].SyncJsonInput || '{}').operation === 'touch')).toBe(true)
    fireEvent.keyDown(input, { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: '展开问题' }))
    expect(screen.getByLabelText(/姓名/)).toHaveValue('小明')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '跳过此题' }))
    })
    expect(answers()).toHaveLength(0)
    expect(screen.queryByRole('button', { name: '提交' })).toBeNull()
  })
  it('restores accepted form values without local drafts', () => {
    const data = item()
    data.data.request.state = 'submitted'
    data.data.request.values = { name: '已接受' }
    render(
      <>
        <QuestionSummary item={data} />
        <QuestionCard item={data} />
      </>,
    )
    expect(screen.getByText(/姓名：已接受/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '提交' })).toBeNull()
  })
  it.each([
    { type: 'object', properties: { name: { type: 'array' } } },
    { type: 'object', properties: { name: { type: 'string' } }, required: ['missing'] },
    { type: 'object', properties: { name: { type: 'number', minimum: 10, maximum: 1 } } },
    { type: 'object', properties: { name: { type: 'string', 'ui:widget': 'FileUpload' } } },
  ])('rejects unusable or executable schema extensions: %j', (schema) => {
    const data = item()
    data.data.request.form!.schema = schema as any
    expect(readQuestionForm(data.data.request.form!)).toBeUndefined()
    render(<QuestionCard item={data} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '提交' })).toBeNull()
  })
})
