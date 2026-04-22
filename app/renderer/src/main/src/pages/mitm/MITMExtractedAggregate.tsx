import React, { useEffect, useMemo, useRef, useState } from 'react'
import { notification } from 'antd'
import { HTTPFlow, HTTPFlowTable } from '@/components/HTTPFlowTable/HTTPFlowTable'
import { HTTPFlowDetailMini } from '@/components/HTTPFlowDetail'
import { YakitResizeBox } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitCheckbox } from '@/components/yakitUI/YakitCheckbox/YakitCheckbox'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { OutlineSearchIcon } from '@/assets/icon/outline'
import { RefreshIcon } from '@/assets/newIcon'
import { yakitNotify } from '@/utils/notification'
import { openABSFileLocated } from '@/utils/openWebsite'
import {
  MitmExtractAggregateFlowFilterRow,
  YakQueryHTTPFlowRequest,
  normalizeQueryMITMExtractedAggregateResponse,
  stripMitmAggregateHttpFlowLiveWindow,
  stripMitmAggregateTableFeedback,
} from '@/utils/yakQueryHTTPFlow'
import { useCreation, useDebounceEffect, useInViewport, useMemoizedFn } from 'ahooks'
import { v4 as uuidv4 } from 'uuid'
import { cloneDeep } from 'lodash'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { JSONParseLog } from '@/utils/tool'
import { RemoteGV } from '@/yakitGV'

const { ipcRenderer } = window.require('electron')

/** 模版草案：左 40% 聚合表 + 顶栏搜索/导出；右 60% 流量表（含来源 Tab）。仅内联排版。 */
const layout = {
  page: {
    height: '100%',
    minHeight: 400,
    padding: '10px 8px 8px',
    boxSizing: 'border-box' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    overflow: 'hidden' as const,
  },
  split: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'row' as const,
    gap: 10,
    overflow: 'hidden' as const,
  },
  left: {
    flex: '0 0 40%',
    minWidth: 280,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden' as const,
    border: '1px solid var(--yakit-border-color, #eaecf3)',
    borderRadius: 6,
    background: 'var(--yakit-card-bg-color, #fff)',
  },
  right: {
    flex: 1,
    minWidth: 0,
    minHeight: 320,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden' as const,
    height: '100%',
  },
  panel: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 0,
    minHeight: 0,
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    borderBottom: '1px solid var(--yakit-border-color, #eaecf3)',
    flexShrink: 0,
  },
  searchWrap: { flex: 1, minWidth: 0 },
  actions: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 },
  tableHead: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--yakit-header-text-color, #31343f)',
    background: 'var(--yakit-table-header-background-color, #f8f8f8)',
    borderBottom: '1px solid var(--yakit-border-color, #eaecf3)',
    flexShrink: 0,
  },
  colCheck: { width: 28, flexShrink: 0 },
  colRule: { flex: '1 1 32%', minWidth: 0 },
  colData: { flex: '1 1 32%', minWidth: 0 },
  colHits: { width: 72, flexShrink: 0, textAlign: 'right' as const },
  list: { flex: 1, overflow: 'auto' as const, minHeight: 80 },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    minHeight: 32,
    fontSize: 12,
    borderBottom: '1px solid var(--yakit-border-color, #f0f0f0)',
    cursor: 'pointer' as const,
  },
  rowChecked: {
    background: 'rgba(242, 139, 68, 0.08)',
  },
  cellEllipsis: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 12,
    flexShrink: 0,
    padding: '6px 10px',
    borderTop: '1px solid var(--yakit-border-color, #eaecf3)',
  },
  footerActions: { display: 'flex', gap: 6 },
}

interface AggRow {
  RuleVerbose: string
  DisplayData: string
  HitCount: number
  LatestUpdatedAt: number
  SampleTraceIds?: string[]
}

function pickSampleTraceIds(row: AggRow): string[] {
  const a = row?.SampleTraceIds
  if (Array.isArray(a) && a.length) return a
  const b = (row as unknown as { sampleTraceIds?: string[] })?.sampleTraceIds
  if (Array.isArray(b) && b.length) return b
  return []
}

function aggRowKey(r: AggRow): string {
  return `${r.RuleVerbose}\0${r.DisplayData}`
}

function parseFlowFilterJson(json: string): YakQueryHTTPFlowRequest | undefined {
  if (!json) return undefined
  try {
    const o = JSON.parse(json) as Record<string, unknown>
    delete o.Pagination
    delete o.AfterId
    delete o.BeforeId
    return stripMitmAggregateHttpFlowLiveWindow(o as YakQueryHTTPFlowRequest)
  } catch {
    return undefined
  }
}

function httpFlowFilterHasCriteria(f: YakQueryHTTPFlowRequest | undefined): boolean {
  if (!f) return false
  for (const [k, v] of Object.entries(f)) {
    if (v === undefined || v === null || v === '') continue
    if (Array.isArray(v) && v.length === 0) continue
    if (typeof v === 'boolean' && v === false) continue
    if (k === 'SourceType' || k === 'Full' || k === 'WithPayload') continue
    return true
  }
  return false
}

/** 右侧表格 onQueryParams 会带回 HiddenIndex / MitmExtractAggregateFilterRows，若原样写入会反复触发左侧 Query。 */
function aggregateListFilterJsonFromTable(raw: string): string {
  const stripped = stripMitmAggregateTableFeedback(parseFlowFilterJson(raw))
  if (!httpFlowFilterHasCriteria(stripped)) return ''
  try {
    return JSON.stringify(stripped)
  } catch {
    return ''
  }
}

const MITMExtractedAggregate: React.FC = () => {
  const flowTableWrapRef = useRef<HTMLDivElement>(null)
  const [inViewport] = useInViewport(flowTableWrapRef)
  const [historyId] = useState(() => uuidv4())
  const lastRatioRef = useRef<{ firstRatio: string; secondRatio: string }>({
    firstRatio: '50%',
    secondRatio: '50%',
  })

  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<AggRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(50)
  /** 与网站树 multiple+checkable 一致：勾选状态独立存储，且保留 RuleVerbose/DisplayData/样本 trace（跨页仍参与右侧筛选与导出）。 */
  const [checkedRowsMap, setCheckedRowsMap] = useState<Record<string, AggRow>>({})
  const [flowFilterJson, setFlowFilterJson] = useState('')
  const [leftSearch, setLeftSearch] = useState('')
  const [dedupeLoading, setDedupeLoading] = useState(false)
  const [selectedFlow, setSelectedFlow] = useState<HTTPFlow>()
  const [onlyShowFirstNode, setOnlyShowFirstNode] = useState(true)
  const [secondNodeVisible, setSecondNodeVisible] = useState(false)
  const [highlightSearch, setHighlightSearch] = useState('')

  useEffect(() => {
    setSecondNodeVisible(!onlyShowFirstNode)
  }, [onlyShowFirstNode])

  useEffect(() => {
    getRemoteValue(RemoteGV.historyTableYakitResizeBox).then((res) => {
      if (!res) return
      try {
        const { firstSizePercent, secondSizePercent } = JSONParseLog(res, {
          page: 'MITMExtractedAggregate',
          fun: 'historyTableYakitResizeBox',
        })
        if (firstSizePercent && secondSizePercent) {
          lastRatioRef.current = { firstRatio: firstSizePercent, secondRatio: secondSizePercent }
        }
      } catch {
        /* ignore */
      }
    })
  }, [])

  const load = useMemoizedFn(async () => {
    setLoading(true)
    try {
      const req: Record<string, unknown> = {
        Pagination: { Page: page, Limit: limit, OrderBy: 'hit_count', Order: 'desc' },
        IncludeDistinctRuleGroups: false,
      }

      const kw = leftSearch.trim()
      if (kw) {
        // 与后端一致：关键词同时匹配规则名与规则数据；Host/URL 更多维度请用右侧流量表高级筛选
        req.RuleVerboseKeyword = kw
      }

      const flowFilter = stripMitmAggregateTableFeedback(parseFlowFilterJson(flowFilterJson))
      if (httpFlowFilterHasCriteria(flowFilter)) {
        req.HttpFlowFilter = flowFilter
      }

      const rsp = await ipcRenderer.invoke('QueryMITMExtractedAggregate', req)
      const { rows: data, total: aggTotal } = normalizeQueryMITMExtractedAggregateResponse(rsp)
      setRows(data as AggRow[])
      setTotal(aggTotal)
    } finally {
      setLoading(false)
    }
  })

  useDebounceEffect(
    () => {
      load()
    },
    [page, flowFilterJson, leftSearch, load],
    { wait: 400, leading: true },
  )

  const onFlowQueryParams = useMemoizedFn((queryParams: string) => {
    const next = aggregateListFilterJsonFromTable(queryParams || '')
    setFlowFilterJson((prev) => (prev === next ? prev : next))
  })

  const selectedRows = useMemo(() => Object.values(checkedRowsMap), [checkedRowsMap])

  const checkedFilterRows: MitmExtractAggregateFlowFilterRow[] = useMemo(() => {
    return selectedRows.map((r) => ({ RuleVerbose: r.RuleVerbose, DisplayData: r.DisplayData }))
  }, [selectedRows])

  const pageRowKeys = useMemo(() => rows.map(aggRowKey), [rows])
  const allPageChecked = pageRowKeys.length > 0 && pageRowKeys.every((k) => !!checkedRowsMap[k])
  const somePageChecked = pageRowKeys.some((k) => !!checkedRowsMap[k])

  const tableFlowFilter = useMemo(() => parseFlowFilterJson(flowFilterJson), [flowFilterJson])

  const flowParams: YakQueryHTTPFlowRequest = useMemo(() => {
    const base: YakQueryHTTPFlowRequest = {
      SourceType: 'mitm',
      Full: false,
    }
    const tableOnly = stripMitmAggregateTableFeedback(tableFlowFilter)
    const merged: YakQueryHTTPFlowRequest = {
      ...base,
      ...(tableOnly || {}),
    }
    // 必须始终赋值：HTTPFlowTable 内部用 { ...pre, ...props.params }，省略该字段无法覆盖掉上一次非空的 MitmExtractAggregateFilterRows
    merged.MitmExtractAggregateFilterRows = checkedFilterRows
    if (checkedFilterRows.length > 0) {
      delete merged.HiddenIndex
    }
    return merged
  }, [tableFlowFilter, checkedFilterRows])

  const pageCount = Math.max(1, Math.ceil(total / limit))

  /** 对齐 YakitTree onCheck：用目标勾选态更新集合，避免 onChange 与受控 checked 竞态。 */
  const setRowChecked = useMemoizedFn((row: AggRow, checked: boolean) => {
    const key = aggRowKey(row)
    setCheckedRowsMap((prev) => {
      const next = { ...prev }
      if (checked) next[key] = row
      else delete next[key]
      return next
    })
  })

  const toggleCheckAllOnPage = useMemoizedFn((checked: boolean) => {
    setCheckedRowsMap((prev) => {
      const next = { ...prev }
      if (checked) {
        rows.forEach((r) => {
          next[aggRowKey(r)] = r
        })
      } else {
        pageRowKeys.forEach((k) => delete next[k])
      }
      return next
    })
  })

  /** 与 History 网站树「联到流量」一致：用 hidden_index 查一条 HTTPFlow，并展开下方详情（HTTPFlowDetailMini）。 */
  const openSampleFlowFromRow = useMemoizedFn(async (record: AggRow) => {
    const ids = pickSampleTraceIds(record)
    if (!ids.length) {
      yakitNotify('info', '该聚合行暂无样本流量，无法打开数据包')
      return
    }
    let flow: HTTPFlow | undefined
    for (const hid of ids.slice(0, 8)) {
      try {
        const rsp = await ipcRenderer.invoke('QueryHTTPFlows', {
          SourceType: 'mitm',
          Full: false,
          HiddenIndex: [hid],
          Pagination: { Page: 1, Limit: 1, Order: 'desc', OrderBy: 'id' },
        })
        const list = (rsp?.Data ?? rsp?.data ?? []) as HTTPFlow[]
        if (list.length) {
          flow = list[0]
          break
        }
      } catch {
        /* try next trace */
      }
    }
    if (!flow) {
      yakitNotify('info', '未查到对应流量，可能已被删除或不在当前工程 MITM 数据中')
      return
    }
    setSelectedFlow(flow)
    setOnlyShowFirstNode(false)
  })

  const ResizeBoxProps = useCreation(() => {
    const p = cloneDeep(lastRatioRef.current)
    if (onlyShowFirstNode) {
      p.firstRatio = '100%'
      p.secondRatio = '0%'
    }
    return p
  }, [onlyShowFirstNode])

  /** 与导出一致：在勾选 / 左侧关键词范围内按 (trace_id, rule_verbose, data) 去重。 */
  const buildScopeFilter = useMemoizedFn(() => {
    const kw = leftSearch.trim()
    const filter: { TraceID: string[]; RuleVerbose: string[]; Keyword?: string } = {
      TraceID: [],
      RuleVerbose: [],
    }
    if (selectedRows.length > 0) {
      const traceIds = [...new Set(selectedRows.flatMap(pickSampleTraceIds))].filter(Boolean)
      if (traceIds.length > 0) filter.TraceID = traceIds
      else filter.RuleVerbose = [...new Set(selectedRows.map((r) => r.RuleVerbose).filter(Boolean))]
      return filter
    }
    if (kw) {
      filter.Keyword = kw
      return filter
    }
    return null
  })

  const onDeduplicate = useMemoizedFn(async () => {
    const scope = buildScopeFilter()
    if (!scope) {
      yakitNotify('info', '请勾选左侧行，或输入搜索关键词以限定去重范围')
      return
    }
    setDedupeLoading(true)
    try {
      const rsp = await ipcRenderer.invoke('DeduplicateMITMRuleExtractedData', { Filter: scope })
      const n = Number(rsp?.DeletedCount ?? rsp?.deletedCount ?? 0)
      notification.success({
        message: '去重完成',
        description: n > 0 ? `已删除 ${n} 条重复提取数据` : '当前范围内无重复项',
        placement: 'bottomRight',
        bottom: 24,
        className: 'yakit-notification-success',
      })
      setCheckedRowsMap({})
      setPage(1)
      await load()
    } catch (e) {
      yakitNotify('error', `${e}`)
    } finally {
      setDedupeLoading(false)
    }
  })

  const onExport = useMemoizedFn(async () => {
    const kw = leftSearch.trim()
    const traceIds = [...new Set(selectedRows.flatMap(pickSampleTraceIds))].filter(Boolean)
    const filter: {
      TraceID: string[]
      RuleVerbose: string[]
      Keyword?: string
    } = { TraceID: [], RuleVerbose: [] }

    if (selectedRows.length > 0) {
      if (traceIds.length > 0) {
        filter.TraceID = traceIds
      } else {
        filter.RuleVerbose = [...new Set(selectedRows.map((r) => r.RuleVerbose).filter(Boolean))]
      }
    } else if (kw) {
      filter.Keyword = kw
    } else {
      yakitNotify('info', '请勾选要导出的行，或先在顶部输入关键词缩小导出范围')
      return
    }

    try {
      const path: string = await ipcRenderer.invoke('ExportMITMRuleExtractedData', { Filter: filter })
      if (path) openABSFileLocated(path)
      yakitNotify('success', '导出完成')
    } catch (e) {
      yakitNotify('error', `${e}`)
    }
  })

  return (
    <div style={layout.page}>
      <div style={layout.split}>
        <div style={layout.left}>
          <div style={layout.panel}>
            <div style={layout.topBar}>
              <div style={layout.searchWrap}>
                <YakitInput
                  size="middle"
                  allowClear
                  value={leftSearch}
                  onChange={(e) => {
                    setLeftSearch(e.target.value)
                    setPage(1)
                    setCheckedRowsMap({})
                  }}
                  placeholder="可输入 ip、域名、url、规则名或规则数据进行搜索"
                  prefix={<OutlineSearchIcon style={{ color: 'var(--yakit-body-text-color, #85899e)' }} />}
                />
              </div>
              <div style={layout.actions}>
                <YakitButton
                  type="text2"
                  size="small"
                  icon={<RefreshIcon />}
                  disabled={dedupeLoading}
                  onClick={() => {
                    setPage(1)
                    load()
                  }}
                />
                <YakitButton
                  type="outline2"
                  size="small"
                  loading={dedupeLoading}
                  disabled={dedupeLoading || loading}
                  onClick={onDeduplicate}
                >
                  去重
                </YakitButton>
                <YakitButton type="primary" size="small" disabled={dedupeLoading} onClick={onExport}>
                  导出
                </YakitButton>
              </div>
            </div>
            <div style={layout.tableHead}>
              <div style={layout.colCheck}>
                {rows.length > 0 ? (
                  <YakitCheckbox
                    checked={allPageChecked}
                    indeterminate={somePageChecked && !allPageChecked}
                    onChange={(e) => toggleCheckAllOnPage(e.target.checked)}
                  />
                ) : null}
              </div>
              <div style={layout.colRule}>规则名</div>
              <div style={layout.colData}>规则数据</div>
              <div style={layout.colHits}>流量条数</div>
            </div>
            <div style={layout.list}>
              {loading ? (
                <YakitSpin style={{ display: 'block', padding: 24 }} />
              ) : rows.length === 0 ? (
                <YakitEmpty />
              ) : (
                rows.map((record) => {
                  const key = aggRowKey(record)
                  const checked = !!checkedRowsMap[key]
                  return (
                    <div
                      key={key}
                      style={{
                        ...layout.row,
                        ...(checked ? layout.rowChecked : {}),
                      }}
                      title="点击打开样本数据包（勾选为筛选右侧多行）"
                      onClick={() => openSampleFlowFromRow(record)}
                    >
                      <div
                        style={layout.colCheck}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <YakitCheckbox checked={checked} onChange={(e) => setRowChecked(record, e.target.checked)} />
                      </div>
                      <div style={{ ...layout.colRule, ...layout.cellEllipsis }} title={record.RuleVerbose}>
                        {record.RuleVerbose}
                      </div>
                      <div style={{ ...layout.colData, ...layout.cellEllipsis }} title={record.DisplayData}>
                        {record.DisplayData}
                      </div>
                      <div style={{ ...layout.colHits, ...layout.cellEllipsis }} title={String(record.HitCount)}>
                        {record.HitCount}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div style={layout.footer}>
              <span>{`第 ${page}/${pageCount} 页，共 ${total} 条`}</span>
              <div style={layout.footerActions}>
                <YakitButton
                  size="small"
                  type="text2"
                  disabled={page <= 1}
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1))
                    setSelectedFlow(undefined)
                    setOnlyShowFirstNode(true)
                  }}
                >
                  上一页
                </YakitButton>
                <YakitButton
                  size="small"
                  type="text2"
                  disabled={page >= pageCount}
                  onClick={() => {
                    setPage((p) => Math.min(pageCount, p + 1))
                    setSelectedFlow(undefined)
                    setOnlyShowFirstNode(true)
                  }}
                >
                  下一页
                </YakitButton>
              </div>
            </div>
          </div>
        </div>
        <div ref={flowTableWrapRef} style={layout.right}>
          <YakitResizeBox
            isVer={true}
            onClickHiddenBox={() => setOnlyShowFirstNode(true)}
            firstNode={() => (
              <div style={{ width: '100%', height: '100%' }}>
                <HTTPFlowTable
                  pageType="History"
                  historyId={historyId}
                  title="HTTP 流量"
                  params={flowParams}
                  showSourceType={true}
                  showHistoryAnalysisBtn={false}
                  inViewport={!!inViewport}
                  onlyShowFirstNode={onlyShowFirstNode}
                  setOnlyShowFirstNode={setOnlyShowFirstNode}
                  onSelected={(i) => setSelectedFlow(i)}
                  onSearch={setHighlightSearch}
                  onQueryParams={onFlowQueryParams}
                />
              </div>
            )}
            secondNode={
              <div style={{ width: '100%', height: '100%' }}>
                {secondNodeVisible && (
                  <HTTPFlowDetailMini
                    noHeader={true}
                    search={highlightSearch}
                    id={selectedFlow?.Id || 0}
                    sendToWebFuzzer={true}
                    selectedFlow={selectedFlow}
                    historyId={historyId}
                    pageType="History"
                    showFlod={true}
                  />
                )}
              </div>
            }
            firstMinSize={80}
            secondMinSize={200}
            secondNodeStyle={{
              display: !secondNodeVisible ? 'none' : '',
              padding: !secondNodeVisible ? 0 : undefined,
            }}
            lineStyle={{
              display: !secondNodeVisible ? 'none' : '',
            }}
            lineDirection="top"
            onMouseUp={({ firstSizePercent, secondSizePercent }) => {
              lastRatioRef.current = {
                firstRatio: firstSizePercent,
                secondRatio: secondSizePercent,
              }
              setRemoteValue(
                RemoteGV.historyTableYakitResizeBox,
                JSON.stringify({ firstSizePercent, secondSizePercent }),
              )
            }}
            {...ResizeBoxProps}
          />
        </div>
      </div>
    </div>
  )
}

export default MITMExtractedAggregate
