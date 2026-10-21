import React, { useEffect, useMemo, useRef, useState } from 'react'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitAlert } from '@/components/yakitUI/YakitAlert/YakitAlert'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import JsonForm from '@rjsf/antd'
import validator from '@rjsf/validator-ajv8'
import type { RJSFSchema } from '@rjsf/utils'
import { AIChatQSDataTypeEnum, type AIChatQSData } from '../hooks/aiRender'
import { globalSessionEngine } from '../hooks/ChatMultiSessionController'
import { readDocument, type UINode } from './validate'
import { catalog } from './catalog.mjs'
import styles from './interactive.module.scss'
import { formWidgets } from './formWidgets'
import { DataChart } from './DataCharts'
import { DataTable } from './DataTable'

type ComponentItem = Extract<AIChatQSData, { type: AIChatQSDataTypeEnum.UI_COMPONENT }>
type State = Record<
  string,
  { value: Record<string, unknown>; submissionId?: string; submitted?: boolean; view?: Record<string, any> }
>
export interface NodeProps {
  instanceId: string
  node: UINode
  children?: React.ReactNode
  state?: State[string]
  change: (next: State[string]) => void
  submit: (node: UINode, values: Record<string, unknown>, id: string) => Promise<void>
  ready: boolean
}

function ParameterForm({ node, state, change, submit, ready, instanceId }: NodeProps) {
  const { t } = useI18nNamespaces(['aiAgent'])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submitting = useRef(false)
  const completed = useRef(false)
  const composing = useRef(false)
  const compositionEndedAt = useRef(0)
  const value = state?.value || node.props.initial || {}
  const submitted = !!state?.submitted
  const fieldOrder = node.props.fieldOrder?.filter((key: string) =>
    Object.prototype.hasOwnProperty.call(node.props.schema.properties, key),
  )
  const widgets = Object.fromEntries(
    Object.entries(node.props.schema.properties)
      .filter(([, field]: [string, any]) => field.type === 'array' && field.uniqueItems && field.items?.enum)
      .map(([key]) => [key, { 'ui:widget': 'checkboxes' }]),
  )
  return (
    <div
      className={styles.form}
      onCompositionStart={() => {
        composing.current = true
      }}
      onCompositionEnd={() => {
        composing.current = false
        compositionEndedAt.current = Date.now()
      }}
      onKeyDownCapture={(event) => {
        if (
          event.key === 'Enter' &&
          (composing.current ||
            event.nativeEvent.isComposing ||
            event.keyCode === 229 ||
            Date.now() - compositionEndedAt.current < 50)
        )
          event.preventDefault()
      }}
    >
      {node.props.title && <strong>{node.props.title}</strong>}
      <JsonForm
        schema={node.props.schema as RJSFSchema}
        validator={validator}
        widgets={formWidgets}
        showErrorList={false}
        templates={{
          ButtonTemplates: {
            AddButton: ({ onClick, disabled }) => (
              <YakitButton type="outline2" onClick={onClick} disabled={disabled}>
                {t('InteractiveUI.addItem')}
              </YakitButton>
            ),
            RemoveButton: ({ onClick, disabled }) => (
              <YakitButton type="text2" onClick={onClick} disabled={disabled}>
                {t('InteractiveUI.removeItem')}
              </YakitButton>
            ),
            MoveUpButton: ({ onClick, disabled }) => (
              <YakitButton type="text2" onClick={onClick} disabled={disabled}>
                {t('InteractiveUI.moveUp')}
              </YakitButton>
            ),
            MoveDownButton: ({ onClick, disabled }) => (
              <YakitButton type="text2" onClick={onClick} disabled={disabled}>
                {t('InteractiveUI.moveDown')}
              </YakitButton>
            ),
          },
        }}
        formData={value}
        idPrefix={`memfit-${encodeURIComponent(instanceId)}`}
        uiSchema={{
          ...widgets,
          'ui:submitButtonOptions': { norender: true },
          ...(fieldOrder ? { 'ui:order': [...fieldOrder, '*'] } : {}),
        }}
        disabled={busy || submitted}
        omitExtraData
        liveOmit
        onChange={(event) => {
          if (!submitting.current && !completed.current && !submitted) change({ value: event.formData || {} })
        }}
        onSubmit={async (event) => {
          if (!node.action || !ready || submitting.current || completed.current || submitted || composing.current)
            return
          submitting.current = true
          setBusy(true)
          setError('')
          const id = state?.submissionId || crypto.randomUUID()
          const values = event.formData || {}
          change({ value: values, submissionId: id })
          try {
            await submit(node, values, id)
            completed.current = true
            change({ value: values, submissionId: id, submitted: true })
          } catch (reason) {
            setError(String(reason))
          } finally {
            submitting.current = false
            setBusy(false)
          }
        }}
      >
        {node.action && !submitted && (
          <YakitButton type="primary" htmlType="submit" loading={busy} disabled={!ready}>
            {node.action.args.label || t('InteractiveUI.submitToChat')}
          </YakitButton>
        )}
        {submitted && (
          <div role="status" className={styles.secondary}>
            {t('InteractiveUI.submitted')}
          </div>
        )}
      </JsonForm>
      {error && !submitted && <YakitAlert type="error" message={error} />}
    </div>
  )
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
  ParameterForm,
  BarChart: DataChart,
  LineChart: DataChart,
  DataTable,
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
  const submit: NodeProps['submit'] = async (node, values, id) => {
    if (!document || !item.data.final || !node.action) return
    await globalSessionEngine.sendUIInteraction(
      item.data.sessionId,
      {
        IsFreeInput: true,
        FreeInput:
          node.component === 'DataTable'
            ? `数据表选择：${node.props.title || ''}\n${node.props.rows
                .filter((row) => (values.selectedRowIds as string[]).includes(row.id))
                .map((row) =>
                  node.props.columns.map((column) => `${column.label}：${row.values[column.key] ?? '—'}`).join('；'),
                )
                .join('\n')}`
            : `表单回答：${node.props.title || ''}\n${JSON.stringify(values, null, 2)}`,
        UserInteraction: JSON.stringify({ id, source: 'component', requestId: document.id, nodeId: node.id, values }),
      },
      id,
    )
  }
  const nodes = new Map(document?.nodes.map((node) => [node.id, node]))
  const visited = new Set<string>()
  const renderNode = (id: string, depth = 0): React.ReactNode => {
    const node = nodes.get(id)
    if (!node || visited.has(id) || depth > 24) return null
    visited.add(id)
    const Component = registry[node.component]
    if (!Component) return null
    const children = node.children?.map((child) => renderNode(child, depth + 1)).filter(Boolean) || []
    if (
      catalog.components.find((entry) => entry.name === node.component)?.children &&
      !children.length &&
      !node.props.title
    )
      return null
    const key = `${node.id}:${node.bindings?.value || 'value'}`
    const receipt = item.data.submissions?.[node.id]
    return (
      <Component
        key={`${node.id}:${node.component}`}
        instanceId={`${document?.id}:${node.id}`}
        node={node}
        state={
          receipt
            ? { ...state[key], value: receipt.values || {}, submissionId: receipt.id, submitted: true }
            : state[key]
        }
        change={(value) => save(key, value)}
        submit={submit}
        ready={item.data.final}
      >
        {children}
      </Component>
    )
  }
  const body = document && nodes.has(document.root) ? renderNode(document.root) : null
  return (
    <section className={styles.card} aria-label="交互组件">
      {body || (
        <p style={{ whiteSpace: 'pre-wrap' }}>
          {fallback || (item.data.final || item.data.streamEnded ? '组件暂时无法显示。' : '正在生成组件…')}
        </p>
      )}
      {!!diagnostics.length && (
        <details>
          <summary>部分组件已降级</summary>
          <ul>
            {diagnostics.map((item, index) => (
              <li key={index}>
                {item.nodeId} {item.path}: {item.message}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
