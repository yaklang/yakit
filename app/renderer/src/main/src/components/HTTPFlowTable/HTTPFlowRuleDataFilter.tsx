import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useDebounceEffect, useInViewport, useMemoizedFn, useSize } from 'ahooks'
import { OutlineSearchIcon } from '@/assets/icon/outline'
import { CopyComponents } from '@/components/yakitUI/YakitTag/YakitTag'
import { ColumnsTypeProps, FiltersItemProps } from '@/components/TableVirtualResize/TableVirtualResizeType'
import { TableVirtualResize } from '@/components/TableVirtualResize/TableVirtualResize'
import { MultipleSelect } from './HTTPFlowTable'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { RefreshIcon } from '@/assets/newIcon'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { yakitNotify } from '@/utils/notification'
import { openABSFileLocated } from '@/utils/openWebsite'
import { JSONParseLog } from '@/utils/tool'
import {
  MitmExtractAggregateFlowFilterRow,
  MitmExtractedAggregateRowNormalized,
  YakQueryHTTPFlowRequest,
  normalizeQueryMITMExtractedAggregateResponse,
  stripMitmAggregateHttpFlowLiveWindow,
  stripMitmAggregateTableFeedback,
} from '@/utils/yakQueryHTTPFlow'
import styles from './HTTPFlowRuleDataFilter.module.scss'
import { Tooltip } from 'antd'

const { ipcRenderer } = window.require('electron')

const PAGE_SIZE = 50
const RULE_NAME_COLUMN_WIDTH = 130
const TRACE_COUNT_COLUMN_WIDTH = 82
const TABLE_HORIZONTAL_PADDING = 8
const TABLE_EXTRA_RESERVED_WIDTH = 64
const RULE_DATA_RESERVED_WIDTH = RULE_NAME_COLUMN_WIDTH + TRACE_COUNT_COLUMN_WIDTH + TABLE_EXTRA_RESERVED_WIDTH
const QUERY_DEBOUNCE_WAIT = 300
const RULE_NAME_SELECT_MAX_HEIGHT = '40vh'
const RULE_NAME_OPTIONS_LIMIT = 999999

interface RuleSummaryItem {
  RowKey: string
  RuleName: string
  SampleData: string
  TraceCount: number
  SampleTraceIds: string[]
}

interface HTTPFlowRuleDataFilterProps {
  baseParams?: YakQueryHTTPFlowRequest
  queryparamsStr: string
  onSetFilterRows: (rows: MitmExtractAggregateFlowFilterRow[]) => void
  resetTableAndEditorShow?: (table: boolean, editor: boolean) => void
}

const uniqStrings = (list: string[]) => Array.from(new Set(list.filter(Boolean)))

const hasHTTPFlowFilterCriteria = (query: YakQueryHTTPFlowRequest | undefined): boolean => {
  if (!query) return false
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value) && value.length === 0) continue
    if (typeof value === 'boolean' && value === false) continue
    if (key === 'SourceType' || key === 'Full' || key === 'WithPayload') continue
    return true
  }
  return false
}

const buildRuleSummaryList = (rows: MitmExtractedAggregateRowNormalized[]): RuleSummaryItem[] => {
  const rowMap = new Map<string, RuleSummaryItem>()

  rows.forEach((row) => {
    const ruleName = row.RuleVerbose || ''
    if (!ruleName) return

    const sampleData = row.DisplayData || ''
    const rowKey = `${ruleName}\0${sampleData}`
    const existing = rowMap.get(rowKey)

    if (existing) {
      existing.TraceCount += Number(row.HitCount || 0)
      if (row.SampleTraceIds?.length) {
        existing.SampleTraceIds = uniqStrings([...existing.SampleTraceIds, ...row.SampleTraceIds])
      }
      return
    }

    rowMap.set(rowKey, {
      RowKey: rowKey,
      RuleName: ruleName,
      SampleData: sampleData,
      TraceCount: Number(row.HitCount || 0),
      SampleTraceIds: Array.isArray(row.SampleTraceIds) ? [...row.SampleTraceIds] : [],
    })
  })

  return Array.from(rowMap.values())
}

const buildScopeFilterFromRows = (rows: RuleSummaryItem[], keyword?: string) => ({
  TraceID: uniqStrings(rows.flatMap((item) => item.SampleTraceIds)),
  RuleVerbose: uniqStrings(rows.map((item) => item.RuleName)),
  Keyword: keyword || undefined,
})

export const HTTPFlowRuleDataFilter: React.FC<HTTPFlowRuleDataFilterProps> = React.memo((props) => {
  const { baseParams, queryparamsStr, onSetFilterRows, resetTableAndEditorShow } = props
  const { t } = useI18nNamespaces(['history', 'yakitUi'])
  const wrapperRef = useRef<HTMLDivElement>(null)
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const tableContainerSize = useSize(tableContainerRef)
  const [inViewport] = useInViewport(wrapperRef)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [ruleList, setRuleList] = useState<RuleSummaryItem[]>([])
  const [checkedRows, setCheckedRows] = useState<RuleSummaryItem[]>([])
  const [ruleVerboseFilter, setRuleVerboseFilter] = useState<string[]>([])
  const [ruleVerboseSearchVal, setRuleVerboseSearchVal] = useState('')
  const [keywordFilter, setKeywordFilter] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [deduplicateLoading, setDeduplicateLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const requestIdRef = useRef(0)
  const ruleNameRequestIdRef = useRef(0)
  const [searchQueryTick, setSearchQueryTick] = useState(0)
  const [isRefresh, setIsRefresh] = useState(false)
  const [ruleNameOptions, setRuleNameOptions] = useState<string[]>([])

  const flowFilterForRuleList = useMemo(() => {
    const parsedQuery =
      (queryparamsStr &&
        (JSONParseLog(queryparamsStr, {
          page: 'HTTPFlowRuleDataFilter',
          fun: 'buildHTTPFlowQuery',
        }) as YakQueryHTTPFlowRequest)) ||
      {}
    const nextQuery = { ...(baseParams || {}), ...parsedQuery } as Record<string, unknown>
    delete nextQuery.Pagination
    delete nextQuery.AfterId
    delete nextQuery.BeforeId
    delete nextQuery.AnalyzedIds
    const tableOnlyQuery = stripMitmAggregateTableFeedback(nextQuery as YakQueryHTTPFlowRequest)
    return stripMitmAggregateHttpFlowLiveWindow((tableOnlyQuery || {}) as YakQueryHTTPFlowRequest)
  }, [queryparamsStr, baseParams])

  const queryKey = useMemo(() => JSON.stringify(flowFilterForRuleList), [flowFilterForRuleList])
  const hasFlowFilter = useMemo(() => hasHTTPFlowFilterCriteria(flowFilterForRuleList), [flowFilterForRuleList])
  const activeKeyword = searchValue.trim() || keywordFilter.trim()
  const tableWrapWidth = Math.max(0, Math.floor(Number(tableContainerSize?.width || 0)) - TABLE_HORIZONTAL_PADDING)
  const tableInitReady = tableWrapWidth > 0
  const sampleDataColumnWidth = useMemo<number | undefined>(() => {
    if (!tableWrapWidth) return undefined
    const width = tableWrapWidth - RULE_DATA_RESERVED_WIDTH
    return width > 0 ? width : undefined
  }, [tableWrapWidth])
  const sampleDataColumnDataKey = useMemo(
    () => `SampleData_${sampleDataColumnWidth ?? 'auto'}`,
    [sampleDataColumnWidth],
  )

  const resetRuleNameOptions = useMemoizedFn(() => {
    ruleNameRequestIdRef.current += 1
    setRuleNameOptions([])
  })

  const resetTableState = useMemoizedFn(() => {
    requestIdRef.current += 1
    setLoading(false)
    setRuleList([])
    setCheckedRows([])
  })

  const reloadFirstPage = useMemoizedFn(() => {
    resetRuleNameOptions()
    resetTableState()
    if (page === 1) {
      setSearchQueryTick((tick) => tick + 1)
      return
    }
    setPage(1)
  })

  const fetchRuleNameOptions = useMemoizedFn(async () => {
    const requestId = ruleNameRequestIdRef.current + 1
    ruleNameRequestIdRef.current = requestId

    try {
      const req: Record<string, unknown> = {
        Pagination: { Page: 1, Limit: RULE_NAME_OPTIONS_LIMIT, OrderBy: 'hit_count', Order: 'desc' },
        IncludeDistinctRuleGroups: false,
      }
      if (hasFlowFilter) req.HttpFlowFilter = flowFilterForRuleList

      const rsp = await ipcRenderer.invoke('QueryMITMExtractedAggregate', req)
      if (requestId !== ruleNameRequestIdRef.current) return
      const { rows } = normalizeQueryMITMExtractedAggregateResponse(rsp)
      setRuleNameOptions(uniqStrings(rows.map((row) => row.RuleVerbose)))
    } catch (e) {}
  })

  const ruleNameTags = useMemo<FiltersItemProps[]>(() => {
    return uniqStrings([...ruleNameOptions, ...ruleList.map((item) => item.RuleName), ...ruleVerboseFilter]).map(
      (name) => ({
        label: name,
        value: name,
      }),
    )
  }, [ruleNameOptions, ruleList, ruleVerboseFilter])

  const checkedRowKeySet = useMemo(() => new Set(checkedRows.map((item) => item.RowKey)), [checkedRows])
  const selectedRowKeys = useMemo(() => checkedRows.map((item) => item.RowKey), [checkedRows])

  const isAllSelected = useMemo(
    () => !!ruleList.length && ruleList.every((item) => checkedRowKeySet.has(item.RowKey)),
    [ruleList, checkedRowKeySet],
  )

  const checkedFilterRows: MitmExtractAggregateFlowFilterRow[] = useMemo(
    () => checkedRows.map((item) => ({ RuleVerbose: item.RuleName, DisplayData: item.SampleData })),
    [checkedRows],
  )
  const checkedFilterRowsKey = useMemo(() => JSON.stringify(checkedFilterRows), [checkedFilterRows])
  const prevCheckedFilterRowsKeyRef = useRef(checkedFilterRowsKey)

  useEffect(() => {
    if (checkedFilterRowsKey === prevCheckedFilterRowsKeyRef.current) return
    prevCheckedFilterRowsKeyRef.current = checkedFilterRowsKey
    onSetFilterRows(checkedFilterRows)
  }, [checkedFilterRows, checkedFilterRowsKey, onSetFilterRows])

  const refreshRuleData = useMemoizedFn(async (nextPage: number) => {
    if (nextPage === 1) {
      setLoading(true)
      setIsRefresh((prev) => !prev)
    }
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    try {
      const req: Record<string, unknown> = {
        Pagination: { Page: nextPage, Limit: PAGE_SIZE, OrderBy: 'hit_count', Order: 'desc' },
        IncludeDistinctRuleGroups: false,
      }
      if (activeKeyword) req.RuleVerboseKeyword = activeKeyword
      if (ruleVerboseFilter.length > 0) req.RuleVerbose = ruleVerboseFilter
      if (hasFlowFilter) req.HttpFlowFilter = flowFilterForRuleList

      const rsp = await ipcRenderer.invoke('QueryMITMExtractedAggregate', req)
      const { rows, total } = normalizeQueryMITMExtractedAggregateResponse(rsp)

      if (requestId !== requestIdRef.current) return
      setTotal(total)

      const nextRuleList = buildRuleSummaryList(rows)

      if (nextPage === 1) {
        setRuleList(nextRuleList)
        setRuleNameOptions(uniqStrings([...nextRuleList.map((item) => item.RuleName), ...ruleVerboseFilter]))
        return
      }

      setRuleList((prev) => {
        const mergedMap = new Map<string, RuleSummaryItem>()
        prev.forEach((item) => mergedMap.set(item.RowKey, item))
        nextRuleList.forEach((item) => mergedMap.set(item.RowKey, item))
        return Array.from(mergedMap.values())
      })
    } catch (error) {
      if (requestId === requestIdRef.current) {
        yakitNotify('error', `${error}`)
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  })

  // 分页/搜索/onSearch 变化时查询；外部条件变化(queryKey)时自动重置并查询
  const prevQueryKeyRef = useRef('')
  const skipFirstQueryRef = useRef(true)
  useDebounceEffect(
    () => {
      if (!inViewport) return

      if (skipFirstQueryRef.current) {
        skipFirstQueryRef.current = false
        prevQueryKeyRef.current = queryKey
        return
      }

      if (queryKey !== prevQueryKeyRef.current) {
        prevQueryKeyRef.current = queryKey
        resetTableState()
        resetRuleNameOptions()
        if (page !== 1) {
          setPage(1)
          return
        }
      }
      refreshRuleData(page)
    },
    [inViewport, page, queryKey, refreshRuleData, resetRuleNameOptions, resetTableState, searchQueryTick],
    { wait: QUERY_DEBOUNCE_WAIT },
  )

  useDebounceEffect(
    () => {
      if (!inViewport) return
      fetchRuleNameOptions()
    },
    [fetchRuleNameOptions, inViewport, queryKey, page, searchQueryTick],
    { wait: QUERY_DEBOUNCE_WAIT },
  )

  const onResetRuleFilter = useMemoizedFn(() => {
    reloadFirstPage()
  })

  const onChangeRuleSelection = useMemoizedFn((checked: boolean, rowKey: string) => {
    const row = ruleList.find((item) => item.RowKey === rowKey)
    if (!row) return
    setCheckedRows((prev) => {
      if (checked) {
        const exists = prev.some((item) => item.RowKey === rowKey)
        if (exists) return prev
        return [...prev, row]
      } else {
        return prev.filter((item) => item.RowKey !== rowKey)
      }
    })
    resetTableAndEditorShow?.(true, false)
  })

  const onSelectAll = useMemoizedFn((_keys: string[], rows: RuleSummaryItem[], checked: boolean) => {
    if (checked) {
      setCheckedRows([...rows])
    } else {
      setCheckedRows([])
    }
    resetTableAndEditorShow?.(true, false)
  })

  const onRowClickToggle = useMemoizedFn((row: RuleSummaryItem) => {
    setCheckedRows((prev) => {
      const exists = prev.some((item) => item.RowKey === row.RowKey)
      if (exists) return prev.filter((item) => item.RowKey !== row.RowKey)
      return [...prev, row]
    })
    resetTableAndEditorShow?.(true, false)
  })

  const onManualRefresh = useMemoizedFn(() => {
    reloadFirstPage()
  })

  const onTableChange = useMemoizedFn((_page: number, _limit: number, _, filters: Record<string, string>) => {
    if (filters?.Keyword !== undefined && filters.Keyword !== keywordFilter) {
      setKeywordFilter(filters.Keyword ?? '')
      reloadFirstPage()
    }
  })

  const buildScopeFilter = useMemoizedFn(() => {
    if (checkedRows.length > 0) {
      return buildScopeFilterFromRows(checkedRows, activeKeyword)
    }

    const filter: { RuleVerbose?: string[]; Keyword?: string } = {}
    if (ruleVerboseFilter.length > 0) filter.RuleVerbose = ruleVerboseFilter
    if (activeKeyword) filter.Keyword = activeKeyword
    return filter
  })

  const onExportRuleData = useMemoizedFn(async () => {
    const filter = buildScopeFilter()
    setExportLoading(true)
    try {
      const exportFilePath: string = await ipcRenderer.invoke('ExportMITMRuleExtractedData', { Filter: filter })
      if (exportFilePath) openABSFileLocated(exportFilePath)
      yakitNotify('success', t('YakitNotification.exportSuccess'))
    } catch (error) {
      yakitNotify('error', t('YakitNotification.exportFailed', { error: `${error}` }))
    } finally {
      setExportLoading(false)
    }
  })

  const onDeduplicateRuleData = useMemoizedFn(async () => {
    const filter = buildScopeFilter()
    setDeduplicateLoading(true)
    try {
      const rsp = await ipcRenderer.invoke('DeduplicateMITMRuleExtractedData', { Filter: filter })
      const n = Number(rsp?.DeletedCount ?? rsp?.deletedCount ?? 0)
      yakitNotify(
        'success',
        n > 0 ? t('HTTPFlowRuleDataFilter.deduplicateDone', { n }) : t('HTTPFlowRuleDataFilter.deduplicateNoRepeat'),
      )
      reloadFirstPage()
    } catch (error) {
      yakitNotify('error', `${error}`)
    } finally {
      setDeduplicateLoading(false)
    }
  })

  const columns = useMemo<ColumnsTypeProps[]>(
    () => [
      {
        title: t('HTTPFlowExtractedDataTable.ruleName'),
        dataKey: 'RuleName',
        width: RULE_NAME_COLUMN_WIDTH,
        ellipsis: true,
        enableDrag: true,
        filterProps: {
          filterKey: 'RuleVerbose',
          filterMultiple: true,
          filterIcon: <OutlineSearchIcon className={styles['filter-icon']} />,
          filterRender: (closePopover: () => void) => (
            <MultipleSelect
              filterProps={{
                filterSearch: true,
                filterSearchInputProps: {
                  prefix: <OutlineSearchIcon className={styles['search-icon']} />,
                  allowClear: true,
                },
              }}
              originalList={ruleNameTags}
              searchVal={ruleVerboseSearchVal}
              onChangeSearchVal={setRuleVerboseSearchVal}
              value={ruleVerboseFilter}
              onSelect={(v: any) => {
                if (Array.isArray(v)) setRuleVerboseFilter(v)
              }}
              onClose={() => {
                reloadFirstPage()
                closePopover()
              }}
              onQuery={onResetRuleFilter}
              selectContainerStyle={{ maxHeight: RULE_NAME_SELECT_MAX_HEIGHT }}
            />
          ),
        },
      },
      {
        title: t('HTTPFlowExtractedDataTable.ruleData'),
        dataKey: sampleDataColumnDataKey,
        width: sampleDataColumnWidth,
        ellipsis: true,
        render: (_, item: RuleSummaryItem) => (
          <Tooltip title={item.SampleData}>
            <div className={styles['rule-data-cell']}>
              <span>{item.SampleData || '-'}</span>
              {item.SampleData && (
                <div
                  className={styles['copy-action']}
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                  }}
                >
                  <CopyComponents copyText={item.SampleData} />
                </div>
              )}
            </div>
          </Tooltip>
        ),
        filterProps: {
          filterKey: 'Keyword',
          filtersType: 'input',
          filterIcon: <OutlineSearchIcon className={styles['filter-icon']} />,
        },
      },
      {
        title: t('HTTPFlowRuleDataFilter.traceCount'),
        dataKey: 'TraceCount',
        width: TRACE_COUNT_COLUMN_WIDTH,
      },
    ],
    [
      sampleDataColumnDataKey,
      sampleDataColumnWidth,
      ruleNameTags,
      ruleVerboseSearchVal,
      ruleVerboseFilter,
      onResetRuleFilter,
      reloadFirstPage,
      t,
    ],
  )

  return (
    <div className={styles['rule-data-filter']} ref={wrapperRef}>
      <div className={styles['rule-data-filter-header-bar']}>
        <div className={styles['rule-data-filter-search']}>
          {t('HTTPFlowExtractedDataTable.ruleData')}
          {/* <YakitInput.Search
            placeholder={t('HTTPFlowRuleDataFilter.searchPlaceholder')}
            value={searchValue}
            allowClear
            onSearch={() => reloadFirstPage()}
            onChange={(e) => setSearchValue(e.target.value)}
          /> */}
        </div>
        <div className={styles['rule-data-filter-actions']}>
          <YakitButton
            size="small"
            type="outline2"
            loading={deduplicateLoading}
            onClick={onDeduplicateRuleData}
            disabled={!ruleList.length}
          >
            {t('HTTPFlowDetail.deduplicate')}
          </YakitButton>
          <YakitButton
            size="small"
            type="primary"
            loading={exportLoading}
            onClick={onExportRuleData}
            disabled={!ruleList.length}
          >
            {t('YakitButton.export')}
          </YakitButton>
          <YakitButton type="text2" icon={<RefreshIcon />} onClick={onManualRefresh} loading={loading} />
        </div>
      </div>

      <div className={styles['rule-data-filter-table']} ref={tableContainerRef}>
        <div className={styles['rule-data-filter-table-inner']}>
          {tableInitReady && (
            <TableVirtualResize<RuleSummaryItem>
              renderKey="RowKey"
              isRefresh={isRefresh}
              isShowTitle={false}
              data={ruleList}
              columns={columns}
              query={{ Keyword: keywordFilter, RuleVerbose: ruleVerboseFilter }}
              loading={loading}
              rowSelection={{
                isAll: isAllSelected,
                type: 'checkbox',
                selectedRowKeys,
                onSelectAll,
                onChangeCheckboxSingle: onChangeRuleSelection,
              }}
              pagination={{
                page,
                limit: PAGE_SIZE,
                total,
                onChange: (nextPage) => setPage(nextPage),
              }}
              onChange={onTableChange}
              onRowClick={onRowClickToggle}
            />
          )}
        </div>
      </div>
    </div>
  )
})
