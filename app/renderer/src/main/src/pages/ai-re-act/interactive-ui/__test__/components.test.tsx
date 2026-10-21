import React from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { parseJSONPrefix } from '../partialJson'
import { matchesSchema, readDocument } from '../validate'
import { catalog } from '../catalog.mjs'
import manifest from '../catalog.manifest.json'
import { ComponentCard, registeredComponents } from '../ComponentCard'
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

const document = () => ({
  id: 'block',
  catalogVersion: catalog.version,
  fallback: '请填写姓名',
  root: 'layout',
  nodes: [
    { id: 'layout', component: 'Stack', props: { title: '信息' }, children: ['form'] },
    {
      id: 'form',
      component: 'ParameterForm',
      props: {
        schema: {
          type: 'object',
          properties: { name: { type: 'string', title: '姓名' } },
          required: ['name'],
          additionalProperties: false,
        },
      },
      bindings: { value: 'answers' },
      action: { name: 'submit_to_chat', args: { label: '发送姓名' } },
    },
  ],
})
const item = (doc = document()): React.ComponentProps<typeof ComponentCard>['item'] => ({
  id: 'ui-component:block',
  type: AIChatQSDataTypeEnum.UI_COMPONENT,
  chatType: 'reAct',
  Timestamp: 0,
  AIService: '',
  AIModelName: '',
  data: { sessionId: 'session', source: JSON.stringify(doc), final: true },
})
afterEach(() => {
  cleanup()
  send.mockClear()
})

describe('catalog and incremental JSON', () => {
  it('keeps the build manifest, schema registry and renderer in sync', () => {
    expect(manifest).toEqual(catalog)
    expect(registeredComponents.sort()).toEqual(catalog.components.map((entry) => entry.name).sort())
  })
  it('parses every prefix, including escapes, without treating forward references as errors', () => {
    const doc = document()
    doc.fallback = '引用 "测试" \\ 换行\n Unicode \u4e2d'
    const source = JSON.stringify(doc)
    for (let index = 0; index <= source.length; index++) {
      expect(() => parseJSONPrefix(source.slice(0, index))).not.toThrow()
      expect(readDocument(source.slice(0, index), false).diagnostics).toEqual([])
    }
    expect(parseJSONPrefix(source).complete).toBe(true)
    expect(readDocument(source, true).document?.nodes).toHaveLength(2)
  })
  it('renders completed structures before later siblings arrive', () => {
    const doc = document()
    const source = JSON.stringify(doc)
    const partial = source.slice(0, source.indexOf(',{"id":"form"') + 1)
    const result = readDocument(partial, false)
    expect(result.document?.nodes.map((node) => node.id)).toEqual(['layout'])
    expect(result.diagnostics).toEqual([])
  })
  it('drops optional bad properties, unknown components and unsupported actions', () => {
    const doc = document()
    ;(doc.nodes[0].props as any).title = 123
    ;(doc.nodes[1].action as any).name = 'execute_javascript'
    const result = readDocument(JSON.stringify(doc), true)
    expect(result.document?.nodes[0].props.title).toBeUndefined()
    expect(result.document?.nodes[1].action).toBeUndefined()
    expect(result.diagnostics).toHaveLength(2)
    ;(doc.nodes[0] as any).component = 'script'
    expect(readDocument(JSON.stringify(doc), true).document?.nodes).toHaveLength(1)
  })
  it('falls back the entire block for a different version or required unknown component', () => {
    expect(readDocument(JSON.stringify({ ...document(), catalogVersion: '2.0' }), true).document).toBeUndefined()
    expect(readDocument(JSON.stringify({ ...document(), requiredComponents: ['FutureChart'] }), true).fallback).toBe(
      '请填写姓名',
    )
  })
  it('rejects executable schema extensions', () => {
    const doc = document()
    ;(doc.nodes[1].props.schema as any).properties.name['ui:widget'] = 'FileUpload'
    const result = readDocument(JSON.stringify(doc), true)
    expect(result.document?.nodes[1].props.schema.properties.name['ui:widget']).toBeUndefined()
    expect(result.diagnostics.length).toBeGreaterThan(0)
  })
  it('uses the catalog default to reject undeclared form values', () => {
    const doc = document()
    delete (doc.nodes[1].props.schema as any).additionalProperties
    const result = readDocument(JSON.stringify(doc), true)
    const schema = result.document!.nodes[1].props.schema
    expect(result.diagnostics).toEqual([])
    expect(schema.additionalProperties).toBe(false)
    expect(matchesSchema(schema, { name: '小明', admin: true })).toBe(false)
  })
})

describe('local component state', () => {
  it('preserves form data during reparsing and only sends on explicit submit', async () => {
    const initial = item()
    const view = render(<ComponentCard item={initial} />)
    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: '小明' } })
    expect(send).not.toHaveBeenCalled()
    const revised = document()
    revised.nodes[0].props.title = '补充信息'
    const updated = { ...initial, data: { ...initial.data, source: JSON.stringify(revised) } }
    view.rerender(<ComponentCard item={updated} />)
    expect((screen.getByLabelText('姓名') as HTMLInputElement).value).toBe('小明')
    await act(async () => {
      fireEvent.click(screen.getByText('发送姓名'))
    })
    const request = send.mock.calls.find((call) => call[1].IsFreeInput)![1]
    expect(JSON.parse(request.UserInteraction).values).toEqual({ name: '小明' })
    expect(screen.getByRole('status')).toHaveTextContent('已提交')
    expect(screen.queryByRole('button', { name: '发送姓名' })).toBeNull()
    await act(async () => {
      for (let i = 0; i < 15; i++) fireEvent.submit(screen.getByLabelText('姓名').closest('form')!)
    })
    expect(send.mock.calls.filter((call) => call[1].IsFreeInput)).toHaveLength(1)
    view.unmount()
    render(<ComponentCard item={updated} />)
    expect(screen.getByRole('status')).toHaveTextContent('已提交')
    expect(screen.queryByRole('button', { name: '发送姓名' })).toBeNull()
    expect(screen.getByLabelText('姓名')).toBeDisabled()
  })
  it('cannot submit a streaming preview before server validation', async () => {
    const data = item()
    data.data.final = false
    render(<ComponentCard item={data} />)
    expect((screen.getByText('发送姓名').closest('button') as HTMLButtonElement).disabled).toBe(true)
  })
  it('keeps the same receipt ID when a failed submission is retried', async () => {
    send.mockRejectedValueOnce(new Error('连接中断'))
    render(<ComponentCard item={item()} />)
    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: '小明' } })
    await act(async () => {
      fireEvent.click(screen.getByText('发送姓名'))
    })
    expect(screen.getByText('Error: 连接中断')).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByText('发送姓名'))
    })
    const attempts = send.mock.calls.filter((call) => call[1].IsFreeInput)
    expect(attempts).toHaveLength(2)
    expect(JSON.parse(attempts[0][1].UserInteraction).id).toBe(JSON.parse(attempts[1][1].UserInteraction).id)
    expect(screen.getByRole('status')).toHaveTextContent('已提交')
    expect(screen.queryByRole('button', { name: '发送姓名' })).toBeNull()
  })
  it('uses the server receipt after reconnect even without a local draft', () => {
    const data = item()
    data.data.submissions = {
      form: { id: 'accepted', source: 'component', requestId: 'block', nodeId: 'form', values: { name: '已接受' } },
    }
    render(<ComponentCard item={data} />)
    expect(screen.getByLabelText('姓名')).toHaveValue('已接受')
    expect(screen.getByLabelText('姓名')).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('已提交')
    expect(screen.queryByRole('button', { name: '发送姓名' })).toBeNull()
  })
  it('keeps schema value types when using Yakit number, boolean and enum controls', async () => {
    const doc = document()
    Object.assign(doc.nodes[1].props.schema!.properties, {
      retries: { type: 'integer', title: '重试次数', minimum: 0, maximum: 5 },
      enabled: { type: 'boolean', title: '启用' },
      mode: { type: 'number', title: '模式', enum: [1, 2] },
    })
    ;(doc.nodes[1].props as any).initial = { name: '小明', retries: 2, enabled: false, mode: 1 }
    render(<ComponentCard item={item(doc)} />)
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('checkbox', { name: '启用' }))
    fireEvent.mouseDown(screen.getByRole('combobox'))
    fireEvent.click(screen.getByText('2', { selector: '.ant-select-item-option-content' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '发送姓名' }))
    })
    const request = send.mock.calls.find((call) => call[1].IsFreeInput)![1]
    expect(JSON.parse(request.UserInteraction).values).toEqual({ name: '小明', retries: 3, enabled: true, mode: 2 })
  })
  it('renders ordered enum arrays as checkboxes and enforces nonempty unique values', () => {
    const doc = document()
    const form = doc.nodes[1]
    ;(form.props as any).fieldOrder = ['focus', 'name']
    ;(form.props.schema!.properties as any).focus = {
      type: 'array',
      title: '关注方面',
      minItems: 1,
      items: { type: 'string', enum: ['模块职责', '数据流'] },
    }
    const result = readDocument(JSON.stringify(doc), true)
    const schema = result.document!.nodes[1].props.schema
    expect(schema.properties.focus.uniqueItems).toBe(true)
    expect(matchesSchema(schema, { name: '小明', focus: [] })).toBe(false)
    expect(matchesSchema(schema, { name: '小明', focus: ['数据流', '数据流'] })).toBe(false)
    const { container } = render(<ComponentCard item={item(doc)} />)
    expect(screen.getByRole('checkbox', { name: '数据流' })).toBeInTheDocument()
    expect(container.querySelector('input')).toHaveAttribute('type', 'checkbox')
  })
})

const visualizationItem = (component: string, props: Record<string, any>, action = false) =>
  item({
    ...document(),
    root: 'data',
    nodes: [
      {
        id: 'data',
        component,
        props,
        ...(action
          ? { bindings: { value: 'selection' }, action: { name: 'submit_to_chat', args: { label: '分析选中行' } } }
          : {}),
      },
    ],
  } as any)
const bars = () => ({
  categories: [
    { id: 'a', label: '模块 A' },
    { id: 'b', label: '模块 B' },
  ],
  series: [
    { id: 'current', label: '本次', values: [12, -4] },
    { id: 'previous', label: '上次', values: [8, null] },
  ],
})
const table = (count = 3) => ({
  columns: [
    { key: 'name', label: '模块', type: 'string' },
    { key: 'count', label: '数量', type: 'number' },
  ],
  rows: Array.from({ length: count }, (_, index) => ({
    id: `r${index}`,
    values: { name: `模块 ${index}`, count: index },
  })),
  selection: 'multiple',
})

describe('visualization validation and rendering', () => {
  it('validates cross-field constraints and repairs cells locally', () => {
    const invalid = bars()
    invalid.series[0].values.pop()
    let result = readDocument(visualizationItem('BarChart', invalid).data.source, true)
    expect(result.document?.nodes).toHaveLength(0)
    expect(result.diagnostics).not.toHaveLength(0)
    const rows = table()
    ;(rows.rows[0].values as any).count = 'wrong'
    ;(rows.rows[0].values as any).unknown = 'drop'
    result = readDocument(visualizationItem('DataTable', rows).data.source, true)
    expect(result.document?.nodes[0].props.rows[0].values).toEqual({ name: '模块 0', count: null })
    expect(result.diagnostics).toHaveLength(2)
    rows.rows[1].id = 'r0'
    expect(readDocument(visualizationItem('DataTable', rows).data.source, true).document?.nodes).toHaveLength(0)
    expect(
      readDocument(
        visualizationItem('LineChart', {
          series: [
            {
              id: 's',
              label: 'S',
              points: [
                { x: 2, y: 1 },
                { x: 1, y: 2 },
              ],
            },
          ],
        }).data.source,
        true,
      ).document?.nodes,
    ).toHaveLength(0)
  })
  it('preserves legend choices through reparsing and remounting without sending messages', () => {
    const initial = visualizationItem('BarChart', bars())
    const view = render(<ComponentCard item={initial} />)
    expect(view.container.querySelectorAll('rect[data-point]')).toHaveLength(3)
    fireEvent.click(screen.getByRole('button', { name: '本次' }))
    expect(view.container.querySelectorAll('rect[data-point]')).toHaveLength(1)
    const revised = bars()
    revised.series[0].values[0] = 50
    const next = { ...initial, data: { ...initial.data, source: visualizationItem('BarChart', revised).data.source } }
    view.rerender(<ComponentCard item={next} />)
    expect(screen.getByRole('button', { name: '本次' })).toHaveAttribute('aria-pressed', 'false')
    view.unmount()
    render(<ComponentCard item={next} />)
    expect(screen.getByRole('button', { name: '本次' })).toHaveAttribute('aria-pressed', 'false')
    expect(send).not.toHaveBeenCalled()
  })
  it('uses proportional x coordinates, breaks at null, and supports keyboard readouts', () => {
    const data = visualizationItem('LineChart', {
      series: [
        {
          id: 's',
          label: '响应',
          points: [
            { x: 0, y: 1 },
            { x: 1, y: null },
            { x: 10, y: 4 },
            { x: 30, y: 5 },
          ],
        },
      ],
    })
    const view = render(<ComponentCard item={data} />)
    const points = view.container.querySelectorAll<SVGElement>('circle[data-point]')
    expect(points).toHaveLength(3)
    expect((view.container.querySelector('path')!.getAttribute('d')!.match(/M/g) || []).length).toBe(2)
    const positions = [...points].map((point) => Number(point.getAttribute('cx')))
    expect(positions[2] - positions[1]).toBeCloseTo(2 * (positions[1] - positions[0]))
    fireEvent.focus(points[0])
    expect(screen.getByRole('status')).toHaveTextContent('0 · 响应: 1')
    fireEvent.keyDown(points[0], { key: 'ArrowRight' })
    expect(window.document.activeElement).toBe(points[1])
    expect(screen.getByRole('status')).toHaveTextContent('10 · 响应: 4')
  })
  it('does not turn missing values into zeros, and keeps extreme finite coordinates valid', () => {
    const props = bars()
    props.series[0].values = [1e308, -1e308]
    const view = render(<ComponentCard item={visualizationItem('BarChart', props)} />)
    for (const point of view.container.querySelectorAll('rect[data-point]')) {
      for (const key of ['x', 'y', 'width', 'height'])
        expect(Number.isFinite(Number(point.getAttribute(key)))).toBe(true)
    }
    expect(view.container.querySelectorAll('rect[data-point]')).toHaveLength(3)
  })
})

describe('interactive data table', () => {
  it('sorts numerically and retains hidden selections across filters, pages and reparsing', async () => {
    const initial = visualizationItem('DataTable', table(25), true)
    const view = render(<ComponentCard item={initial} />)
    fireEvent.click(screen.getByRole('checkbox', { name: '选择行 r0' }))
    fireEvent.click(screen.getByRole('button', { name: '排序：数量' }))
    fireEvent.click(screen.getByRole('button', { name: '排序：数量' }))
    expect(screen.getAllByRole('checkbox')[0]).toHaveAttribute('aria-label', '选择行 r24')
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    expect(screen.getByRole('checkbox', { name: '选择行 r0' })).toBeChecked()
    fireEvent.change(screen.getByLabelText('筛选：数量'), { target: { value: '24' } })
    expect(screen.getAllByRole('checkbox')).toHaveLength(1)
    expect(screen.getByText('已选 1 行（含筛选隐藏行）')).toBeInTheDocument()
    const next = { ...initial, data: { ...initial.data } }
    view.rerender(<ComponentCard item={next} />)
    expect(screen.getByLabelText('筛选：数量')).toHaveValue('24')
    expect(send).not.toHaveBeenCalled()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '分析选中行' }))
    })
    const request = send.mock.calls.find((call) => call[1].IsFreeInput)![1]
    expect(JSON.parse(request.UserInteraction).values).toEqual({ selectedRowIds: ['r0'] })
    expect(request.FreeInput).toContain('模块 0')
    expect(request.FreeInput).not.toContain('模块 24')
    expect(screen.queryByRole('button', { name: '分析选中行' })).toBeNull()
    view.unmount()
    render(<ComponentCard item={next} />)
    expect(screen.queryByRole('button', { name: '分析选中行' })).toBeNull()
  })
  it('locks rapid clicks while pending, permits retry, and restores server receipts', async () => {
    let reject!: (error: Error) => void
    send.mockImplementationOnce(
      () =>
        new Promise((_, rejectPromise) => {
          reject = rejectPromise
        }),
    )
    const initial = visualizationItem('DataTable', table(), true)
    const view = render(<ComponentCard item={initial} />)
    fireEvent.click(screen.getByRole('checkbox', { name: '选择行 r1' }))
    const button = screen.getByRole('button', { name: '分析选中行' })
    await act(async () => {
      for (let i = 0; i < 12; i++) fireEvent.click(button)
    })
    expect(send).toHaveBeenCalledTimes(1)
    await act(async () => {
      reject(new Error('断开'))
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '分析选中行' }))
    })
    expect(send).toHaveBeenCalledTimes(2)
    expect(JSON.parse(send.mock.calls[0][1].UserInteraction).id).toBe(
      JSON.parse(send.mock.calls[1][1].UserInteraction).id,
    )
    view.unmount()
    const restored = visualizationItem('DataTable', table(), true)
    restored.data.submissions = {
      data: {
        id: 'accepted',
        source: 'component',
        requestId: 'block',
        nodeId: 'data',
        values: { selectedRowIds: ['r1'] },
      },
    }
    render(<ComponentCard item={restored} />)
    expect(screen.getByRole('checkbox', { name: '选择行 r1' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: '选择行 r1' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: '分析选中行' })).toBeNull()
  })
  it('keeps filters changed while a submission is awaiting acknowledgement', async () => {
    let resolve!: () => void
    send.mockImplementationOnce(
      () =>
        new Promise<void>((complete) => {
          resolve = complete
        }),
    )
    render(<ComponentCard item={visualizationItem('DataTable', table(), true)} />)
    fireEvent.click(screen.getByRole('checkbox', { name: '选择行 r0' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '分析选中行' }))
    })
    fireEvent.change(screen.getByLabelText('筛选：数量'), { target: { value: '2' } })
    await act(async () => {
      resolve()
    })
    expect(screen.getByLabelText('筛选：数量')).toHaveValue('2')
    expect(screen.getAllByRole('checkbox')).toHaveLength(1)
    expect(screen.getByRole('status')).toHaveTextContent('已提交')
  })
  it('removes stale selected rows on data updates, and disables streaming submissions', () => {
    const initial = visualizationItem('DataTable', table(), true)
    initial.data.final = false
    const view = render(<ComponentCard item={initial} />)
    fireEvent.click(screen.getByRole('checkbox', { name: '选择行 r1' }))
    expect(screen.getByRole('button', { name: '分析选中行' })).toBeDisabled()
    const nextProps = table()
    nextProps.rows = nextProps.rows.filter((row) => row.id !== 'r1')
    view.rerender(
      <ComponentCard
        item={{
          ...initial,
          data: { ...initial.data, source: visualizationItem('DataTable', nextProps, true).data.source },
        }}
      />,
    )
    expect(screen.getByText('数据已更新，已移除失效的行选择。')).toBeInTheDocument()
    expect(screen.getByText('已选 0 行（含筛选隐藏行）')).toBeInTheDocument()
    expect(send).not.toHaveBeenCalled()
  })
})
