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
  YakQueryHTTPFlowRequest,
  normalizeQueryMITMExtractedAggregateResponse,
} from '@/utils/yakQueryHTTPFlow'
import {
  buildCheckedFilterRows,
  buildNextCheckedRuleRows,
  buildRuleDataFilterQuery,
  buildRuleNameOptions,
  buildRuleNameTagOptions,
  buildRuleScopeFilter,
  buildRuleSummaryList,
  getRuleDataColumnWidth,
  hasHTTPFlowFilterCriteria,
  mergeRuleSummaryItems,
  toggleCheckedRuleRow,
  uniqStrings,
  type RuleSummaryItem,
} from './HTTPFlowTable.utils'
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

interface HTTPFlowRuleDataFilterProps {
  baseParams?: YakQueryHTTPFlowRequest
  queryparamsStr: string
  onSetFilterRows: (rows: MitmExtractAggregateFlowFilterRow[]) => void
  resetTableAndEditorShow?: (table: boolean, editor: boolean) => void
  httpFlowTableDataLength?: number
}

export const HTTPFlowRuleDataFilter: React.FC<HTTPFlowRuleDataFilterProps> = React.memo((props) => {
  const { baseParams, queryparamsStr, onSetFilterRows, resetTableAndEditorShow, httpFlowTableDataLength } = props
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
    return buildRuleDataFilterQuery(baseParams, parsedQuery)
  }, [queryparamsStr, baseParams])

  const queryKey = useMemo(() => JSON.stringify(flowFilterForRuleList), [flowFilterForRuleList])
  const hasFlowFilter = useMemo(() => hasHTTPFlowFilterCriteria(flowFilterForRuleList), [flowFilterForRuleList])
  const activeKeyword = searchValue.trim() || keywordFilter.trim()
  const tableWrapWidth = Math.max(0, Math.floor(Number(tableContainerSize?.width || 0)) - TABLE_HORIZONTAL_PADDING)
  const tableInitReady = tableWrapWidth > 0
  const sampleDataColumnWidth = useMemo<number | undefined>(
    () => getRuleDataColumnWidth(tableWrapWidth, RULE_DATA_RESERVED_WIDTH),
    [tableWrapWidth],
  )
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
    return buildRuleNameTagOptions(ruleNameOptions, ruleList, ruleVerboseFilter)
  }, [ruleNameOptions, ruleList, ruleVerboseFilter])

  const checkedRowKeySet = useMemo(() => new Set(checkedRows.map((item) => item.RowKey)), [checkedRows])
  const selectedRowKeys = useMemo(() => checkedRows.map((item) => item.RowKey), [checkedRows])

  const isAllSelected = useMemo(
    () => !!ruleList.length && ruleList.every((item) => checkedRowKeySet.has(item.RowKey)),
    [ruleList, checkedRowKeySet],
  )

  const checkedFilterRows: MitmExtractAggregateFlowFilterRow[] = useMemo(
    () => buildCheckedFilterRows(checkedRows),
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
        setRuleNameOptions(buildRuleNameOptions([], nextRuleList, ruleVerboseFilter))
        return
      }

      setRuleList((prev) => mergeRuleSummaryItems(prev, nextRuleList))
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

  const updateRuleData = useMemoizedFn(() => {
    if (!httpFlowTableDataLength) return
    refreshRuleData(page)
  })

  // 分页/搜索/onSearch 变化时查询；外部条件变化(queryKey)时自动重置并查询
  const prevQueryKeyRef = useRef('')
  useDebounceEffect(
    () => {
      if (!inViewport) return
      if (queryKey !== prevQueryKeyRef.current) {
        prevQueryKeyRef.current = queryKey
        resetTableState()
        resetRuleNameOptions()
        if (page !== 1) {
          setPage(1)
          return
        }
      }
      updateRuleData()
    },
    [inViewport, page, queryKey, searchQueryTick],
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
    setCheckedRows((prev) => buildNextCheckedRuleRows(prev, row, checked))
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
    setCheckedRows((prev) => toggleCheckedRuleRow(prev, row))
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
    return buildRuleScopeFilter(checkedRows, ruleVerboseFilter, activeKeyword)
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
