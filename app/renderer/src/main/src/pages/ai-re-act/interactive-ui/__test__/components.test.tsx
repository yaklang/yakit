import type React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { parseJSONPrefix } from '../partialJson'
import { readDocument, type UIDocument } from '../validate'
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

const document = (): UIDocument => ({
  id: 'block',
  catalogVersion: catalog.version,
  fallback: '展示说明',
  root: 'layout',
  nodes: [
    { id: 'layout', component: 'Stack', props: { title: '信息' }, children: ['form'] },
    { id: 'form', component: 'Text', props: { text: '参数只读内容' } },
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
  it.each([
    { component: 'ParameterForm', props: { schema: { type: 'object' } } },
    { component: 'Text', props: { text: '不可提交' }, action: { name: 'submit_to_chat', args: {} } },
    { component: 'Text', props: { text: '不可绑定答案' }, bindings: { value: 'answer' } },
  ])('rejects input components and response actions while retaining valid siblings: %j', (node) => {
    const doc = document()
    doc.nodes[1] = { id: 'form', ...node }
    doc.nodes[0].children!.push('note')
    doc.nodes.push({ id: 'note', component: 'Text', props: { text: '仍然可读' } })
    const result = readDocument(JSON.stringify(doc), true)
    expect(result.document?.nodes.map((node) => node.id)).toEqual(['layout', 'note'])
    expect(result.diagnostics.length).toBeGreaterThan(0)
    render(<ComponentCard item={item(doc)} />)
    expect(screen.getByText('仍然可读')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /提交/ })).toBeNull()
    expect(send.mock.calls.some((call) => call[1].IsFreeInput)).toBe(false)
  })
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
    doc.nodes[1].action = { name: 'execute_javascript' }
    const result = readDocument(JSON.stringify(doc), true)
    expect(result.document?.nodes[0].props.title).toBeUndefined()
    expect(result.document?.nodes).toHaveLength(1)
    expect(result.diagnostics.map((entry) => entry.path)).toEqual(['props.title', 'action', 'children'])
    ;(doc.nodes[0] as any).component = 'script'
    expect(readDocument(JSON.stringify(doc), true).document?.nodes).toHaveLength(0)
  })
  it('falls back the entire block for a different version or required unknown component', () => {
    expect(readDocument(JSON.stringify({ ...document(), catalogVersion: '2.0' }), true).document).toBeUndefined()
    expect(readDocument(JSON.stringify({ ...document(), requiredComponents: ['FutureChart'] }), true).fallback).toBe(
      '展示说明',
    )
  })
})

const visualizationItem = (component: string, props: Record<string, any>) =>
  item({
    ...document(),
    root: 'data',
    nodes: [
      {
        id: 'data',
        component,
        props,
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

describe('local data table viewing', () => {
  it('sorts numerically, filters, pages and preserves view state without sending answers', () => {
    const initial = visualizationItem('DataTable', table(25))
    const view = render(<ComponentCard item={initial} />)
    fireEvent.click(screen.getByRole('button', { name: '排序：数量' }))
    fireEvent.click(screen.getByRole('button', { name: '排序：数量' }))
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('模块 24')
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    expect(screen.getByText('模块 0')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('筛选：数量'), { target: { value: '24' } })
    expect(screen.getAllByRole('row')).toHaveLength(2)
    const next = { ...initial, data: { ...initial.data } }
    view.rerender(<ComponentCard item={next} />)
    expect(screen.getByLabelText('筛选：数量')).toHaveValue('24')
    view.unmount()
    render(<ComponentCard item={next} />)
    expect(screen.getByLabelText('筛选：数量')).toHaveValue('24')
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.queryByRole('button', { name: /分析|提交/ })).toBeNull()
    expect(send).not.toHaveBeenCalled()
  })
})

function informationDocument(): UIDocument {
  const doc = document() as UIDocument
  doc.nodes[0].children = ['notice', 'hint', 'details', 'views']
  doc.nodes.push(
    {
      id: 'notice',
      component: 'Alert',
      props: { title: '存在风险', description: '<img src=x onerror=alert(1)>', severity: 'warning' },
    },
    { id: 'hint', component: 'Tooltip', props: { label: '什么是 RTT', content: '往返时延' } },
    {
      id: 'details',
      component: 'Popover',
      props: { label: '查看原始字段', title: '原始字段', content: 'status: 200\nsource: local' },
    },
    {
      id: 'views',
      component: 'Tabs',
      props: {
        items: [
          { id: 'input', label: '参数', content: 'form' },
          { id: 'summary', label: '概览', content: 'summary' },
        ],
      },
    },
    { id: 'summary', component: 'Text', props: { text: '只读概览内容' } },
  )
  return doc
}

describe('information components and view containers', () => {
  it('falls back for catalogs with the removed input contract', () => {
    for (const version of ['1.0', '1.1', '1.2']) {
      const doc = { ...document(), catalogVersion: version }
      const result = readDocument(JSON.stringify(doc), true)
      expect(result.document).toBeUndefined()
      expect(result.fallback).toBe('展示说明')
    }
  })
  it('derives tab graph edges, repairs defaults and rejects duplicate identifiers or targets', () => {
    const doc = informationDocument()
    const tab = doc.nodes.find((node) => node.id === 'views')!
    tab.props.defaultTab = 'missing'
    tab.children = ['hint']
    let result = readDocument(JSON.stringify(doc), true)
    const normalized = result.document!.nodes.find((node) => node.id === 'views')!
    expect(normalized.children).toEqual(['form', 'summary'])
    expect(normalized.props.defaultTab).toBeUndefined()
    expect(result.diagnostics.map((entry) => entry.path)).toEqual(['children', 'props.defaultTab'])
    for (const key of ['id', 'content']) {
      const duplicate = structuredClone(doc)
      const props = duplicate.nodes.find((node) => node.id === 'views')!.props
      props.items[1][key] = props.items[0][key]
      result = readDocument(JSON.stringify(duplicate), true)
      expect(result.document!.nodes.some((node) => node.id === 'views')).toBe(false)
      expect(result.diagnostics.some((entry) => entry.path === 'props.items')).toBe(true)
    }
  })

  it('treats future tab contents as pending and reports missing final references', () => {
    const doc = informationDocument()
    doc.root = 'views'
    doc.nodes = [doc.nodes.find((node) => node.id === 'views')!]
    const source = JSON.stringify(doc)
    expect(readDocument(source, false).diagnostics).toEqual([])
    const pending = item(doc as any)
    pending.data.final = false
    const view = render(<ComponentCard item={pending} />)
    expect(screen.getAllByText('内容正在生成…').length).toBeGreaterThan(0)
    expect(send).not.toHaveBeenCalled()
    const complete = informationDocument()
    complete.root = 'views'
    view.rerender(<ComponentCard item={{ ...pending, data: { ...pending.data, source: JSON.stringify(complete) } }} />)
    expect(screen.getByText('参数只读内容')).toBeTruthy()
    expect(readDocument(source, true).diagnostics.filter((entry) => entry.path === 'children')).toHaveLength(2)
  })

  it('keeps the selected tab through switching, reparsing and remounting', async () => {
    const user = userEvent.setup()
    const doc = informationDocument()
    const current = item(doc as any)
    const view = render(<ComponentCard item={current} />)
    await user.click(screen.getByRole('tab', { name: '概览' }))
    expect(screen.getByRole('tab', { name: '概览' }).getAttribute('aria-selected')).toBe('true')
    doc.nodes.find((node) => node.id === 'views')!.props.defaultTab = 'input'
    current.data.source = JSON.stringify(doc)
    view.rerender(<ComponentCard item={{ ...current }} />)
    expect(screen.getByRole('tab', { name: '概览' }).getAttribute('aria-selected')).toBe('true')
    view.unmount()
    render(<ComponentCard item={current} />)
    expect(screen.getByRole('tab', { name: '概览' }).getAttribute('aria-selected')).toBe('true')
    await user.click(screen.getByRole('tab', { name: '参数' }))
    expect(screen.getByText('参数只读内容')).toBeInTheDocument()
    expect(send).not.toHaveBeenCalled()
  })

  it('offers segmented views and recovers when the selected tab is removed', async () => {
    const user = userEvent.setup()
    const doc = informationDocument()
    const tab = doc.nodes.find((node) => node.id === 'views')!
    tab.props.variant = 'segmented'
    const current = item(doc as any)
    const view = render(<ComponentCard item={current} />)
    await user.click(screen.getByRole('radio', { name: '概览' }).closest('label')!)
    expect(screen.getByRole('region', { name: '概览' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: '参数' })).toBeNull()
    tab.props.items = tab.props.items.slice(0, 1)
    view.rerender(<ComponentCard item={{ ...current, data: { ...current.data, source: JSON.stringify(doc) } }} />)
    expect(screen.getByRole('region', { name: '参数' })).toBeTruthy()
    expect(send).not.toHaveBeenCalled()
  })

  it('keeps alerts visible and renders model descriptions as text', () => {
    vi.useFakeTimers()
    try {
      const view = render(<ComponentCard item={item(informationDocument() as any)} />)
      act(() => vi.advanceTimersByTime(5000))
      expect(screen.getByRole('alert').textContent).toContain('<img src=x onerror=alert(1)>')
      expect(view.container.querySelector('img')).toBeNull()
      expect(screen.getByText('存在风险')).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('opens text popovers and closes with Escape, outside click and scroll without messages', async () => {
    const user = userEvent.setup()
    render(<ComponentCard item={item(informationDocument() as any)} />)
    const button = screen.getByRole('button', { name: '查看原始字段' })
    await user.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('region', { name: '原始字段' }).textContent).toContain('status: 200')
    await user.keyboard('{Escape}')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(globalThis.document.activeElement).toBe(button)
    await user.click(button)
    await user.click(globalThis.document.body)
    expect(button.getAttribute('aria-expanded')).toBe('false')
    await user.click(button)
    fireEvent.scroll(window)
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(send).not.toHaveBeenCalled()
  })

  it('allows keyboard focus to reveal a tooltip and Escape to dismiss it', async () => {
    const user = userEvent.setup()
    render(<ComponentCard item={item(informationDocument() as any)} />)
    const button = screen.getByRole('button', { name: '什么是 RTT' })
    act(() => button.focus())
    await waitFor(() => expect(screen.getByRole('tooltip').textContent).toBe('往返时延'))
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull())
    expect(send).not.toHaveBeenCalled()
  })
})
