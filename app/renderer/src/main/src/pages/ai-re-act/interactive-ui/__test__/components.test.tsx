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

const document = () => ({
  id: 'block',
  catalogVersion: '1.0',
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
    view.rerender(<ComponentCard item={{ ...initial, data: { ...initial.data, source: JSON.stringify(revised) } }} />)
    expect((screen.getByLabelText('姓名') as HTMLInputElement).value).toBe('小明')
    await act(async () => {
      fireEvent.click(screen.getByText('发送姓名'))
    })
    const request = send.mock.calls.find((call) => call[1].IsFreeInput)![1]
    expect(JSON.parse(request.UserInteraction).values).toEqual({ name: '小明' })
  })
  it('cannot submit a streaming preview before server validation', async () => {
    const data = item()
    data.data.final = false
    render(<ComponentCard item={data} />)
    expect((screen.getByText('发送姓名').closest('button') as HTMLButtonElement).disabled).toBe(true)
  })
})
