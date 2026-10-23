import type React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { AIChatQSDataTypeEnum } from '../hooks/aiRender'
import { type AIChatQSData } from '../hooks/aiRender'
import { globalSessionEngine } from '../hooks/ChatMultiSessionController'
import { readDocument, type UINode } from './validate'
import { catalog } from './catalog.mjs'
import styles from './interactive.module.scss'
import { DataChart } from './DataCharts'
import { DataTable } from './DataTable'
import { InformationAlert, InformationHint, ViewTabs } from './InformationComponents'

type ComponentItem = Extract<AIChatQSData, { type: AIChatQSDataTypeEnum.UI_COMPONENT }>
type State = Record<string, { value: Record<string, unknown>; view?: Record<string, any> }>
export interface NodeProps {
  instanceId: string
  node: UINode
  children?: React.ReactNode
  childNodes?: Record<string, React.ReactNode>
  state?: State[string]
  change: (next: State[string]) => void
  ready: boolean
}

// The catalog and this registry are the complete surface available to the model.
// React text nodes escape model strings; no dynamic tags, styles or widget names.
const registry: Record<string, React.FC<NodeProps>> = {
  Stack: ({ node, children }) => (
    <div>
      {node.props.title && <h4>{node.props.title}</h4>}
      {children}
    </div>
  ),
  Text: ({ node }) => <p style={{ whiteSpace: 'pre-wrap' }}>{node.props.text}</p>,
  ComparisonTable: ({ node }) => (
    <div style={{ overflowX: 'auto' }}>
      {node.props.title && <h4>{node.props.title}</h4>}
      <table className={styles.table}>
        <thead>
          <tr>
            {node.props.columns.map((column, index) => (
              <th key={index}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {node.props.rows.map((row, index) => (
            <tr key={index}>
              {node.props.columns.map((column, columnIndex) => (
                <td key={columnIndex}>{String(row[column.key] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
  BarChart: DataChart,
  LineChart: DataChart,
  DataTable,
  Alert: InformationAlert,
  Tabs: ViewTabs,
  Tooltip: InformationHint,
  Popover: InformationHint,
  Steps: ({ node }) => (
    <div>
      {node.props.title && <h4>{node.props.title}</h4>}
      <ol>
        {node.props.items.map((step, index) => (
          <li key={index}>
            <strong>{step.title}</strong> ·{' '}
            {{ pending: '未开始', active: '进行中', done: '完成', error: '失败' }[step.status || 'pending']}
            {step.description && <p>{step.description}</p>}
          </li>
        ))}
      </ol>
    </div>
  ),
  Metrics: ({ node }) => (
    <div>
      {node.props.title && <h4>{node.props.title}</h4>}
      <div className={styles.grid}>
        {node.props.items.map((metric, index) => (
          <div key={index}>
            <small>{metric.label}</small>
            <div>
              <strong>{String(metric.value)}</strong> {metric.unit}
            </div>
            {metric.description && <small>{metric.description}</small>}
          </div>
        ))}
      </div>
    </div>
  ),
}
export const registeredComponents = Object.keys(registry)

export function ComponentCard({ item }: { item: ComponentItem }) {
  const result = useMemo(
    () => readDocument(item.data.source, item.data.final || !!item.data.streamEnded),
    [item.data.source, item.data.final, item.data.streamEnded],
  )
  const [state, setState] = useState<State>(() => (item.uiState as State) || {})
  const stateRef = useRef(state)
  const reported = useRef(false)
  const { document, fallback } = result
  const diagnostics = item.data.diagnostics?.length ? item.data.diagnostics : result.diagnostics
  useEffect(() => {
    if (!item.data.final || !document || !diagnostics.length || reported.current) return
    reported.current = true
    void globalSessionEngine
      .sendUIInteraction(item.data.sessionId, {
        IsSyncMessage: true,
        SyncType: 'ui_interaction',
        SyncJsonInput: JSON.stringify({
          requestId: document.id,
          operation: 'diagnostics',
          diagnostics: diagnostics.slice(0, 32),
        }),
      })
      .catch(() => {
        reported.current = false
      })
  }, [item.data.final, document?.id, diagnostics.length])
  const save = (key: string, next: State[string]) => {
    const updated = { ...stateRef.current, [key]: next }
    stateRef.current = updated
    setState(updated)
    item.uiState = updated
    globalSessionEngine.persistUIState(item.data.sessionId, item, updated)
  }
  const nodes = new Map(document?.nodes.map((node) => [node.id, node]))
  const visited = new Set<string>()
  const renderNode = (id: string, depth = 0): React.ReactNode => {
    const node = nodes.get(id)
    if (!node || visited.has(id) || depth > 24) return null
    visited.add(id)
    const Component = registry[node.component]
    if (!Component) return null
    const childNodes = Object.fromEntries((node.children || []).map((child) => [child, renderNode(child, depth + 1)]))
    const children = Object.values(childNodes).filter(Boolean)
    if (
      catalog.components.find((entry) => entry.name === node.component)?.children &&
      node.component !== 'Tabs' &&
      !children.length &&
      !node.props.title
    )
      return null
    const key = node.id
    return (
      <Component
        key={`${node.id}:${node.component}`}
        instanceId={`${document?.id}:${node.id}`}
        node={node}
        childNodes={childNodes}
        state={state[key]}
        change={(value) => save(key, value)}
        ready={item.data.final}
      >
        {children}
      </Component>
    )
  }
  const body = document && nodes.has(document.root) ? renderNode(document.root) : null
  // Validation diagnostics are feedback to the model, never a user-facing error card.
  // Only a client capability mismatch may use the document's readable text fallback.
  if (!body && !result.incompatible) return null
  return (
    <section className={styles.card} aria-label="交互组件">
      {body || <p style={{ whiteSpace: 'pre-wrap' }}>{fallback}</p>}
    </section>
  )
}
