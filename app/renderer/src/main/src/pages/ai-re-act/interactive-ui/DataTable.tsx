import React, { useEffect, useRef, useState } from 'react'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitCheckbox } from '@/components/yakitUI/YakitCheckbox/YakitCheckbox'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitAlert } from '@/components/yakitUI/YakitAlert/YakitAlert'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { NodeProps } from './ComponentCard'
import styles from './interactive.module.scss'

type Column = {
  key: string
  label: string
  type: 'string' | 'number' | 'boolean'
  sortable?: boolean
  filterable?: boolean
}
type Row = { id: string; values: Record<string, string | number | boolean | null> }
type TableView = { filters?: Record<string, string>; sort?: { key: string; direction: 'asc' | 'desc' }; page?: number }

export function tableRows(rows: Row[], columns: Column[], view: TableView) {
  const result = rows.filter((row) =>
    columns.every((column) => {
      const filter = view.filters?.[column.key]?.trim()
      if (!filter) return true
      const value = row.values[column.key]
      if (value == null) return false
      if (column.type === 'number') return Number.isFinite(Number(filter)) && value === Number(filter)
      if (column.type === 'boolean') return String(value) === filter.toLowerCase()
      return String(value).toLocaleLowerCase().includes(filter.toLocaleLowerCase())
    }),
  )
  const column = columns.find((column) => column.key === view.sort?.key && column.sortable !== false)
  if (column)
    result.sort((a, b) => {
      const av = a.values[column.key],
        bv = b.values[column.key]
      if (av == null) return bv == null ? 0 : 1
      if (bv == null) return -1
      const order = column.type === 'string' ? String(av).localeCompare(String(bv)) : Number(av) - Number(bv)
      return view.sort?.direction === 'desc' ? -order : order
    })
  return result
}

export function DataTable({ node, state, change, ready, submit, instanceId }: NodeProps) {
  const { t } = useI18nNamespaces(['aiAgent'])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [removed, setRemoved] = useState(false)
  const submitting = useRef(false)
  const completed = useRef(false)
  const rows = node.props.rows as Row[]
  const columns = node.props.columns as Column[]
  const initialView = useRef<TableView>(state?.view || { sort: node.props.initialSort })
  const latestState = useRef(state)
  latestState.current = state
  const view: TableView = state?.view || initialView.current
  const selected = (state?.value.selectedRowIds as string[]) || []
  const existing = new Set(rows.map((row) => row.id))
  const selection = node.props.selection || 'none'
  const selectedIds = selected.filter((id) => existing.has(id)).slice(0, selection === 'single' ? 1 : undefined)
  const submitted = !!state?.submitted
  const locked = busy || submitted || completed.current
  const filtered = tableRows(rows, columns, view)
  const pages = Math.max(1, Math.ceil(filtered.length / 20))
  const page = Math.min(Math.max(0, view.page || 0), pages - 1)
  const visible = filtered.slice(page * 20, (page + 1) * 20)
  const changeView = (next: TableView) =>
    change({ ...state, value: state?.value || { selectedRowIds: [] }, view: { ...view, ...next } })
  const rowSignature = JSON.stringify(rows.map((row) => row.id))
  useEffect(() => {
    if (!submitted && !submitting.current && selectedIds.length !== selected.length) {
      setRemoved(true)
      change({ ...state, value: { selectedRowIds: selectedIds } })
    }
  }, [rowSignature, selection, submitted])
  const toggle = (id: string) => {
    if (locked || submitting.current) return
    const next = selectedIds.includes(id)
      ? selectedIds.filter((value) => value !== id)
      : selection === 'single'
        ? [id]
        : [...selectedIds, id]
    change({ ...state, view, value: { selectedRowIds: next } })
  }
  const send = async () => {
    if (!ready || locked || submitting.current || !node.action || selection === 'none' || !selectedIds.length) return
    submitting.current = true
    setBusy(true)
    setError('')
    const id = state?.submissionId || crypto.randomUUID()
    const values = { selectedRowIds: selectedIds }
    change({ ...state, view, value: values, submissionId: id })
    try {
      await submit(node, values, id)
      completed.current = true
      change({ ...latestState.current, value: values, submissionId: id, submitted: true })
    } catch (reason) {
      setError(String(reason))
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }
  return (
    <div className={styles.visualization}>
      {node.props.title && <h4>{node.props.title}</h4>}
      {removed && <YakitAlert type="info" message={t('InteractiveUI.removedRows')} />}
      <div className={styles.tableScroll}>
        <table className={styles.table} aria-label={node.props.title || t('InteractiveUI.dataTable')}>
          <thead>
            <tr>
              {selection !== 'none' && <th>{t('InteractiveUI.selectRow')}</th>}
              {columns.map((column) => (
                <th
                  key={column.key}
                  aria-sort={
                    view.sort?.key === column.key
                      ? view.sort.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  {column.sortable !== false ? (
                    <YakitButton
                      type="text2"
                      aria-label={t('InteractiveUI.sortColumn', { column: column.label })}
                      onClick={() =>
                        changeView({
                          page: 0,
                          sort: {
                            key: column.key,
                            direction: view.sort?.key === column.key && view.sort.direction === 'asc' ? 'desc' : 'asc',
                          },
                        })
                      }
                    >
                      {column.label} {view.sort?.key === column.key ? (view.sort.direction === 'asc' ? '↑' : '↓') : '↕'}
                    </YakitButton>
                  ) : (
                    column.label
                  )}
                  {column.filterable !== false && (
                    <YakitInput
                      className={styles.columnFilter}
                      aria-label={t('InteractiveUI.filterColumn', { column: column.label })}
                      placeholder={column.type === 'boolean' ? 'true / false' : t('InteractiveUI.filter')}
                      value={view.filters?.[column.key] || ''}
                      onChange={(event) =>
                        changeView({ page: 0, filters: { ...view.filters, [column.key]: event.target.value } })
                      }
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id}>
                {selection !== 'none' && (
                  <td>
                    <YakitCheckbox
                      name={`${instanceId}:selection`}
                      aria-label={t('InteractiveUI.selectRowId', { id: row.id })}
                      checked={selectedIds.includes(row.id)}
                      disabled={locked}
                      onChange={() => toggle(row.id)}
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column.key}>{row.values[column.key] == null ? '—' : String(row.values[column.key])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <p role="status">{t('InteractiveUI.noRows')}</p>}
      </div>
      <div className={styles.actions}>
        <YakitButton type="outline2" disabled={page === 0} onClick={() => changeView({ page: page - 1 })}>
          {t('InteractiveUI.previousPage')}
        </YakitButton>
        <span>{t('InteractiveUI.pageInfo', { page: page + 1, pages, total: filtered.length })}</span>
        <YakitButton type="outline2" disabled={page + 1 >= pages} onClick={() => changeView({ page: page + 1 })}>
          {t('InteractiveUI.nextPage')}
        </YakitButton>
        {selection !== 'none' && <span>{t('InteractiveUI.selectedRows', { count: selectedIds.length })}</span>}
        {!!Object.values(view.filters || {}).some(Boolean) && (
          <YakitButton type="text2" onClick={() => changeView({ page: 0, filters: {} })}>
            {t('InteractiveUI.clearFilters')}
          </YakitButton>
        )}
        {node.action && selection !== 'none' && !submitted && (
          <YakitButton type="primary" loading={busy} disabled={!ready || !selectedIds.length} onClick={send}>
            {node.action.args.label || t('InteractiveUI.submitSelected')}
          </YakitButton>
        )}
        {submitted && <span role="status">{t('InteractiveUI.submitted')}</span>}
      </div>
      {error && !submitted && <YakitAlert type="error" message={error} />}
    </div>
  )
}
