import validator from '@rjsf/validator-ajv8'
import type { RJSFSchema } from '@rjsf/utils'
import { catalog } from './catalog.mjs'
import { parseJSONPrefix } from './partialJson'
import { normalizeVisualization } from './visualizationValidation'

export interface UINode {
  id: string
  component: string
  props: Record<string, any>
  children?: string[]
  bindings?: { value: string }
  action?: { name: 'submit_to_chat'; args: { label?: string } }
}
export interface UIDocument {
  id: string
  catalogVersion: string
  fallback: string
  root: string
  nodes: UINode[]
  requiredComponents?: string[]
}
export interface UIDiagnostic {
  nodeId: string
  path: string
  message: string
}
const entries = new Map(catalog.components.map((entry) => [entry.name, entry]))
const unsafeKey = (key: string) => ['__proto__', 'constructor', 'prototype'].includes(key)
export const matchesSchema = (schema: RJSFSchema, value: unknown): boolean => {
  try {
    const result = validator.rawValidation(schema, value)
    return !result.validationError && !result.errors?.length
  } catch {
    return false
  }
}

// Keep valid siblings. Invalid optional values are removed at the closest object;
// a required value uses its default, or invalidates that containing object.
export function normalize(
  schema: RJSFSchema,
  input: unknown,
  path: string,
  diagnose: (path: string, message: string) => void,
): unknown {
  if (input === undefined && schema.default !== undefined && matchesSchema(schema, schema.default))
    return structuredClone(schema.default)
  let value = input
  if (schema.type === 'object' && input && typeof input === 'object' && !Array.isArray(input)) {
    const output: Record<string, unknown> = Object.create(null)
    const props = schema.properties || {}
    const required = schema.required || []
    const defaultKeys = Object.keys(props).filter(
      (key) => typeof props[key] === 'object' && (props[key] as RJSFSchema).default !== undefined,
    )
    for (const key of new Set([...Object.keys(input), ...required, ...defaultKeys])) {
      if (unsafeKey(key)) {
        diagnose(`${path}.${key}`, '不允许此属性名')
        continue
      }
      const child =
        props[key] || (typeof schema.additionalProperties === 'object' ? schema.additionalProperties : undefined)
      if (!child || typeof child === 'boolean') {
        if (schema.additionalProperties !== false) output[key] = input[key]
        else diagnose(`${path}.${key}`, '未声明的参数已丢弃')
        continue
      }
      const next = normalize(child, input[key], `${path}.${key}`, diagnose)
      if (next !== undefined) output[key] = next
      else if (required.includes(key)) return undefined
    }
    value = output
  } else if (
    schema.type === 'array' &&
    Array.isArray(input) &&
    schema.items &&
    !Array.isArray(schema.items) &&
    typeof schema.items !== 'boolean'
  ) {
    value = input.map((item, index) => normalize(schema.items as RJSFSchema, item, `${path}[${index}]`, diagnose))
  }
  if (value === undefined || !matchesSchema(schema, value)) {
    diagnose(path, '参数不符合 Schema，已丢弃')
    return undefined
  }
  return value
}

export function readDocument(source: string, final: boolean) {
  const diagnostics: UIDiagnostic[] = []
  let partial: ReturnType<typeof parseJSONPrefix>
  try {
    partial = parseJSONPrefix(source)
  } catch (error) {
    return {
      document: undefined,
      diagnostics: final ? [{ nodeId: '', path: '', message: String(error) }] : [],
      fallback: '',
      complete: false,
    }
  }
  const raw = partial.value as Partial<UIDocument> | undefined
  const fallback = typeof raw?.fallback === 'string' ? raw.fallback : ''
  if (!raw || typeof raw !== 'object') return { document: undefined, diagnostics, fallback, complete: partial.complete }
  const incompatible =
    (raw.catalogVersion && raw.catalogVersion !== catalog.version) ||
    (Array.isArray(raw.requiredComponents) && raw.requiredComponents.some((name) => !entries.has(name)))
  if (incompatible)
    return {
      document: undefined,
      diagnostics,
      fallback: fallback || '此客户端暂不支持该组件，请更新客户端查看。',
      complete: partial.complete,
    }
  const nodes: UINode[] = []
  const ids = new Set<string>()
  for (const [index, node] of (Array.isArray(raw.nodes) ? raw.nodes : []).slice(0, 64).entries()) {
    if (!partial.completed.has(`nodes.${index}`)) continue
    const diagnose = (path: string, message: string) => diagnostics.push({ nodeId: node?.id || '', path, message })
    if (!node || typeof node.id !== 'string' || !node.id || ids.has(node.id)) {
      diagnose('id', '节点缺少稳定 ID 或 ID 重复')
      continue
    }
    ids.add(node.id)
    const entry = entries.get(node.component)
    if (!entry) {
      diagnose('component', '未知组件')
      continue
    }
    const props = normalize(entry.schema as RJSFSchema, node.props, 'props', diagnose) as UINode['props'] | undefined
    if (!props) continue
    const next: UINode = { id: node.id, component: node.component, props }
    if (node.children !== undefined) {
      if (entry.children && Array.isArray(node.children) && node.children.every((id) => typeof id === 'string'))
        next.children = node.children
      else diagnose('children', '此组件不接受这些子节点')
    }
    if (node.bindings !== undefined) {
      if (
        entry.bindings &&
        node.bindings &&
        typeof node.bindings.value === 'string' &&
        node.bindings.value.length <= 64
      )
        next.bindings = { value: node.bindings.value }
      else diagnose('bindings', '无效的状态绑定')
    }
    if (node.action !== undefined) {
      const actionSchema = entry.actions?.[node.action?.name]
      if (
        actionSchema &&
        node.action.name === 'submit_to_chat' &&
        matchesSchema(actionSchema as RJSFSchema, node.action.args)
      )
        next.action = node.action
      else diagnose('action', '未声明或不合法的动作，已禁用')
    }
    if (normalizeVisualization(next, diagnose)) nodes.push(next)
  }
  if (final && !partial.complete) diagnostics.push({ nodeId: '', path: '', message: '组件 JSON 未完成' })
  if (final && partial.complete) {
    if (!nodes.some((node) => node.id === raw.root))
      diagnostics.push({ nodeId: '', path: 'root', message: '根节点不存在' })
    for (const node of nodes)
      for (const id of node.children || []) {
        if (!nodes.some((child) => child.id === id))
          diagnostics.push({ nodeId: node.id, path: 'children', message: `引用不存在：${id}` })
      }
  }
  const document =
    typeof raw.id === 'string' && raw.id && typeof raw.root === 'string' && raw.catalogVersion === catalog.version
      ? ({ ...raw, nodes } as UIDocument)
      : undefined
  return { document, diagnostics: final ? diagnostics : [], fallback, complete: partial.complete }
}
