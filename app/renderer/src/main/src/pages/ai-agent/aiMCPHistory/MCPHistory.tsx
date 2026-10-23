import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useDebounce, useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { CopyComponents, YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { YakitResizeBox } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import { RollingLoadList } from '@/components/RollingLoadList/RollingLoadList'
import { YakitModalConfirm } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { PaintbrushOutlined, RefreshOutlined, SearchOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { NewHTTPPacketEditor } from '@/utils/editors'
import type { MCPToolCallHistory, MCPToolCallHistorySummary, QueryMCPToolCallHistoryRequest } from '../type/aiMCP'
import {
  grpcDeleteMCPToolCallHistory,
  grpcGetMCPToolCallHistoryDetail,
  grpcQueryMCPToolCallHistory,
} from '../aiMCP/utils'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { formatTimestamp } from '@/utils/timeUtil'
import { YakitCheckableTag } from '@/components/yakitUI/YakitTag/YakitCheckableTag'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import { YakitRoundCornerTag } from '@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag'
import { ParkLeftSolid } from '@yakit-libs/yakit-ui-icons/solid'
import styles from './MCPHistory.module.scss'

type HistoryStatus = QueryMCPToolCallHistoryRequest['Status']
type ResultTab = 'result' | 'error'

const PAGE_LIMIT = 30

const prettyJSON = (value: string) => {
  if (!value) return '-'
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

const formatDuration = (durationMillis: number) => {
  if (durationMillis < 1000) return `${durationMillis} ms`
  return `${(durationMillis / 1000).toFixed(durationMillis < 10000 ? 2 : 1)} s`
}

const hasText = (value?: string) => !!value?.trim()

const getClientLabel = (item: MCPToolCallHistorySummary | MCPToolCallHistory, unknownLabel: string) => {
  if (item.ClientName) {
    return item.ClientVersion ? `${item.ClientName} ${item.ClientVersion}` : item.ClientName
  }
  return item.ClientID || item.SessionID || unknownLabel
}

const dedupeHistoriesByID = (histories: MCPToolCallHistorySummary[]) => {
  const historyMap = new Map<number, MCPToolCallHistorySummary>()
  histories.forEach((item) => historyMap.set(item.ID, item))
  return Array.from(historyMap.values())
}

const MCPHistory: React.FC = React.memo(() => {
  const { t, i18nRefresh } = useI18nNamespaces(['layout', 'yakitUi'])
  const [keyword, setKeyword] = useState('')
  const appliedKeyword = useDebounce(keyword.trim(), { wait: 300 })
  const [status, setStatus] = useState<HistoryStatus>('success')
  const [leftVisible, setLeftVisible] = useState(true)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [histories, setHistories] = useState<MCPToolCallHistorySummary[]>([])
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<MCPToolCallHistorySummary>()
  const [detail, setDetail] = useState<MCPToolCallHistory>()
  const [detailLoading, setDetailLoading] = useState(false)
  const [resultTab, setResultTab] = useState<ResultTab>('result')
  const [listResetFlag, setListResetFlag] = useState(false)

  const pageRef = useRef(1)
  const loadingRef = useRef(false)
  const requestIDRef = useRef(0)
  const detailRequestIDRef = useRef(0)

  const query = useMemoizedFn(async (refresh = false) => {
    if (loadingRef.current && !refresh) return
    const requestID = ++requestIDRef.current
    loadingRef.current = true
    setLoading(true)
    const page = refresh ? 1 : pageRef.current
    try {
      const response = await grpcQueryMCPToolCallHistory({
        Keyword: appliedKeyword,
        Status: status,
        Pagination: {
          Page: page,
          OrderBy: 'created_at',
          Order: 'desc',
          Limit: PAGE_LIMIT,
        },
      })
      if (requestID !== requestIDRef.current) return
      setHistories((previous) =>
        refresh ? response.Histories : dedupeHistoriesByID([...previous, ...response.Histories]),
      )
      setTotal(response.Total)
      pageRef.current = page + 1
      if (refresh) setListResetFlag((flag) => !flag)
    } catch {
    } finally {
      if (requestID === requestIDRef.current) {
        loadingRef.current = false
        setLoading(false)
        setRefreshing(false)
      }
    }
  })

  useEffect(() => {
    pageRef.current = 1
    query(true)
  }, [appliedKeyword, status, query])

  const onKeywordChange = useMemoizedFn((event: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(event.target.value)
  })

  const clearDetail = useMemoizedFn(() => {
    detailRequestIDRef.current += 1
    setSelected(undefined)
    setDetail(undefined)
    setDetailLoading(false)
  })

  const openDetail = useMemoizedFn(async (item: MCPToolCallHistorySummary) => {
    const requestID = ++detailRequestIDRef.current
    setSelected(item)
    setDetail(undefined)
    setResultTab('result')
    setDetailLoading(true)
    try {
      const response = await grpcGetMCPToolCallHistoryDetail({ ID: item.ID })
      if (requestID !== detailRequestIDRef.current) return
      setDetail(response)
      if (hasText(response.Result)) setResultTab('result')
      else if (hasText(response.ErrorMessage)) setResultTab('error')
    } catch {
      if (requestID === detailRequestIDRef.current) setSelected(undefined)
    } finally {
      if (requestID === detailRequestIDRef.current) setDetailLoading(false)
    }
  })

  const onDeleteClick = useMemoizedFn(() => {
    const deleteFiltered = !!(appliedKeyword || status)
    const modal = YakitModalConfirm({
      width: 420,
      type: 'white',
      title: deleteFiltered ? t('MCPHistory.deleteFilteredTitle') : t('MCPHistory.clearTitle'),
      content: deleteFiltered ? t('MCPHistory.deleteFilteredContent', { total }) : t('MCPHistory.clearContent'),
      onCancelText: t('YakitButton.cancel'),
      onOkText: deleteFiltered ? t('MCPHistory.deleteFiltered') : t('YakitButton.clearAll'),
      okButtonProps: { colors: 'danger' },
      showConfirmLoading: true,
      onOk: () => {
        grpcDeleteMCPToolCallHistory({
          DeleteAll: !deleteFiltered,
          DeleteFiltered: deleteFiltered,
          Keyword: appliedKeyword || undefined,
          Status: status || undefined,
        })
          .then(() => {
            clearDetail()
            modal.destroy()
            pageRef.current = 1
            query(true)
          })
          .catch(() => {
            modal.destroy()
          })
      },
      onCancel: () => modal.destroy(),
    })
  })

  const collapseLeft = useMemoizedFn(() => setLeftVisible(false))
  const expandLeft = useMemoizedFn(() => setLeftVisible(true))

  const renderRow = useMemoizedFn((item: MCPToolCallHistorySummary) => (
    <div
      className={classNames(styles['history-row'], {
        [styles['history-row-active']]: selected?.ID === item.ID,
      })}
      onClick={() => openDetail(item)}
    >
      <div className={styles['history-row-card']}>
        <span
          className={classNames(styles['history-status-dot'], {
            [styles['history-status-dot-success']]: item.Success,
            [styles['history-status-dot-failed']]: !item.Success,
          })}
        />
        <div className={styles['history-row-body']}>
          <div className={styles['history-row-top']}>
            <span className={styles['history-row-tool-name']} title={item.ToolName}>
              {item.ToolName}
            </span>
            <span className={styles['history-row-duration']}>{formatDuration(item.DurationMillis)}</span>
          </div>
          <div className={styles['history-row-time']}>{formatTimestamp(item.CreatedAt)}</div>
        </div>
      </div>
    </div>
  ))

  const renderEditor = useMemoizedFn(
    (title: React.ReactNode, value: string, options?: { language?: string; editorKey?: string; panel?: string }) => (
      <div className={classNames(styles['detail-panel'], options?.panel && styles[options.panel])}>
        <NewHTTPPacketEditor
          key={options?.editorKey}
          title={<span className={styles['detail-editor-title']}>{title}</span>}
          originValue={value}
          language={options?.language || 'json'}
          readOnly
          bordered
          noMinimap
          isShowBeautifyRender={false}
          noPacketModifier
          noOpenPacketNewWindow
          showDefaultExtra
          noSetIngEditor
          extra={
            <>
              <CopyComponents
                copyText={value === '-' ? '' : value}
                iconColor="var(--Colors-Use-Neutral-Text-3-Secondary)"
              />
              <span className={styles['detail-editor-divider']} />
            </>
          }
        />
      </div>
    ),
  )

  const hasResult = useMemo(() => hasText(detail?.Result), [detail?.Result])
  const hasError = useMemo(() => hasText(detail?.ErrorMessage), [detail?.ErrorMessage])
  const showResultPanel = useMemo(() => hasResult || hasError, [hasResult, hasError])
  const argumentsValue = useMemo(() => prettyJSON(detail?.Arguments || ''), [detail?.Arguments])
  const resultPanelValue = useMemo(() => {
    if (!detail) return ''
    if (resultTab === 'error') return detail.ErrorMessage || '-'
    return prettyJSON(detail.Result)
  }, [detail, resultTab])
  const clientLabel = useMemo(
    () => (detail ? getClientLabel(detail, t('MCPHistory.unknownCaller')) : ''),
    [detail, i18nRefresh],
  )
  const resultPanelTitle = useMemo(() => {
    const tabs: { key: ResultTab; label: string }[] = []
    if (hasResult) tabs.push({ key: 'result', label: t('MCPHistory.result') })
    if (hasError) tabs.push({ key: 'error', label: t('MCPHistory.error') })
    if (tabs.length <= 1) return tabs[0]?.label || t('MCPHistory.result')
    return (
      <div className={classNames(styles['detail-tab-list'])} key={'title-result-tabs'}>
        {tabs.map((item) => (
          <YakitCheckableTag
            key={item.key}
            checked={resultTab === item.key}
            onChange={(checked) => {
              if (checked) setResultTab(item.key)
            }}
          >
            {item.label}
          </YakitCheckableTag>
        ))}
      </div>
    )
  }, [hasResult, hasError, resultTab, i18nRefresh])

  const expandButton = useMemo(
    () =>
      leftVisible ? null : (
        <YakitButton
          type="text2"
          icon={<ParkLeftSolid color="currentColor" />}
          title={t('YakitButton.expand')}
          onClick={expandLeft}
        />
      ),
    [leftVisible, expandLeft, i18nRefresh],
  )

  const renderDetail = useMemo(() => {
    if (!selected) {
      return (
        <div className={styles['detail-side']}>
          {expandButton && (
            <div className={styles['detail-header']}>
              <div className={styles['detail-header-title']}>{expandButton}</div>
            </div>
          )}
          <div className={styles['detail-empty']}>
            <YakitEmpty title={t('MCPHistory.emptyDetail')} />
          </div>
        </div>
      )
    }
    if (detailLoading || !detail) {
      return (
        <div className={styles['detail-side']}>
          {expandButton && (
            <div className={styles['detail-header']}>
              <div className={styles['detail-header-title']}>{expandButton}</div>
            </div>
          )}
          <div className={styles['detail-loading']}>
            <YakitSpin spinning wrapperClassName={styles['detail-spin']} />
          </div>
        </div>
      )
    }
    return (
      <div className={styles['detail-side']}>
        <div className={styles['detail-header']}>
          <div className={styles['detail-header-title']}>
            {expandButton}
            <span className={styles['detail-tool-name']} title={detail.ToolName}>
              {detail.ToolName}
            </span>
            <YakitTag
              size="small"
              fullRadius
              border={false}
              color={detail.Success ? 'success' : 'danger'}
              className={classNames(
                styles['detail-status-tag'],
                styles[detail.Success ? 'detail-status-tag-success' : 'detail-status-tag-failed'],
              )}
            >
              {detail.Success ? t('MCPHistory.success') : t('MCPHistory.failed')}
            </YakitTag>
          </div>
        </div>
        <div className={styles['detail-body']}>
          <div className={styles['detail-meta']}>
            {[
              { label: t('MCPHistory.caller'), value: clientLabel },
              { label: t('MCPHistory.callTime'), value: formatTimestamp(detail.CreatedAt) },
              { label: t('MCPHistory.duration'), value: formatDuration(detail.DurationMillis) },
              { label: t('MCPHistory.sessionId'), value: detail.SessionID || '-' },
            ].map((item, index) => (
              <React.Fragment key={item.label}>
                {index > 0 && <span className={styles['detail-meta-divider']} />}
                <span className={styles['detail-meta-item']}>
                  <span className={styles['detail-meta-label']}>{item.label}</span>
                  <span className={styles['detail-meta-value']} title={item.value}>
                    {item.value}
                  </span>
                </span>
              </React.Fragment>
            ))}
          </div>
          <div className={styles['detail-payload']}>
            {showResultPanel ? (
              <YakitResizeBox
                firstRatio="50%"
                secondRatio="50%"
                firstMinSize="240px"
                secondMinSize="240px"
                lineSize={4}
                firstNodeStyle={{ padding: 0 }}
                secondNodeStyle={{ padding: 0 }}
                firstNode={renderEditor(t('MCPHistory.arguments'), argumentsValue, {
                  editorKey: `arguments-${detail.ID}`,
                  panel: 'detail-panel-left',
                })}
                secondNode={renderEditor(resultPanelTitle, resultPanelValue, {
                  language: resultTab === 'error' ? 'plaintext' : 'json',
                  editorKey: `result-${detail.ID}-${resultTab}`,
                  panel: 'detail-panel-right',
                })}
              />
            ) : (
              renderEditor(t('MCPHistory.arguments'), argumentsValue, {
                editorKey: `arguments-${detail.ID}`,
              })
            )}
          </div>
        </div>
      </div>
    )
  }, [
    selected,
    expandButton,
    detailLoading,
    detail,
    clientLabel,
    showResultPanel,
    argumentsValue,
    resultPanelTitle,
    resultPanelValue,
    resultTab,
    renderEditor,
    i18nRefresh,
  ])

  return (
    <div className={styles['mcp-history']}>
      {leftVisible && (
        <div className={styles['history-side']}>
          <div className={styles['history-status']}>
            <div className={styles['history-status-main']}>
              <YakitRadioButtons
                buttonStyle="solid"
                value={status}
                options={[
                  { value: 'success', label: t('MCPHistory.success') },
                  { value: 'failed', label: t('MCPHistory.failed') },
                ]}
                onChange={(e) => setStatus(e.target.value as HistoryStatus)}
              />
              <YakitRoundCornerTag>{total}</YakitRoundCornerTag>
            </div>
            <div className={styles['history-status-actions']}>
              <YakitButton
                type="text2"
                icon={<PaintbrushOutlined color="currentColor" />}
                title={t('MCPHistory.clearHistoryTitle')}
                disabled={total === 0 || loading}
                onClick={onDeleteClick}
              />
              <YakitButton
                type="text2"
                icon={<RefreshOutlined color="currentColor" />}
                title={t('YakitButton.refresh')}
                disabled={loading}
                onClick={() => {
                  pageRef.current = 1
                  setRefreshing(true)
                  query(true)
                }}
              />
              <YakitButton
                type="text"
                icon={<ParkLeftSolid color="currentColor" />}
                title={t('YakitButton.collapse')}
                onClick={collapseLeft}
              />
            </div>
          </div>
          <div className={styles['history-filter']}>
            <YakitInput
              prefix={<SearchOutlined className={styles['search-icon']} color="currentColor" />}
              value={keyword}
              onChange={onKeywordChange}
              placeholder={t('MCPHistory.searchPlaceholder')}
              allowClear
            />
          </div>
          <div className={styles['history-list']}>
            {refreshing ? (
              <div className={styles['history-list-loading']}>
                <YakitSpin spinning />
              </div>
            ) : histories.length === 0 && !loading ? (
              <YakitEmpty title={t('MCPHistory.emptyList')} />
            ) : (
              <RollingLoadList<MCPToolCallHistorySummary>
                data={histories}
                page={pageRef.current}
                hasMore={histories.length < total}
                loadMoreData={() => query(false)}
                loading={loading}
                isRef={listResetFlag}
                rowKey="ID"
                defItemHeight={58}
                classNameRow={styles['history-row-slot']}
                noMoreText={t('YakitEmpty.end_of_list')}
                renderRow={renderRow}
              />
            )}
          </div>
        </div>
      )}
      {renderDetail}
    </div>
  )
})

export default MCPHistory
