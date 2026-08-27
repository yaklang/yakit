import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { CopyComponents, YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { YakitResizeBox } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import { RollingLoadList } from '@/components/RollingLoadList/RollingLoadList'
import { YakitModalConfirm } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { FilterOutlined, RefreshOutlined, TrashOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { NewHTTPPacketEditor } from '@/utils/editors'
import type { MCPToolCallHistory, MCPToolCallHistorySummary, QueryMCPToolCallHistoryRequest } from '../type/aiMCP'
import {
  grpcDeleteMCPToolCallHistory,
  grpcGetMCPToolCallHistoryDetail,
  grpcQueryMCPToolCallHistory,
} from '../aiMCP/utils'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { formatTimestamp } from '@/utils/timeUtil'
import { YakitCheckableTag } from '@/components/yakitUI/YakitTag/YakitCheckableTag'
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
  const { t, i18n } = useI18nNamespaces(['layout', 'yakitUi'])
  const [keyword, setKeyword] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [status, setStatus] = useState<HistoryStatus>('')
  const [loading, setLoading] = useState(false)
  const [histories, setHistories] = useState<MCPToolCallHistorySummary[]>([])
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<MCPToolCallHistorySummary>()
  const [detail, setDetail] = useState<MCPToolCallHistory>()
  const [detailLoading, setDetailLoading] = useState(false)
  const [resultTab, setResultTab] = useState<ResultTab>('result')
  const [filterVisible, setFilterVisible] = useState(false)
  const [listResetFlag, setListResetFlag] = useState(false)

  const pageRef = useRef(1)
  const loadingRef = useRef(false)
  const requestIDRef = useRef(0)
  const detailRequestIDRef = useRef(0)

  const statusFilterOptions = useMemo(
    () => [
      { key: '' as HistoryStatus, label: t('MCPHistory.all') },
      { key: 'success' as HistoryStatus, label: t('MCPHistory.success') },
      { key: 'failed' as HistoryStatus, label: t('MCPHistory.failed') },
    ],
    [i18n.language],
  )

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
      }
    }
  })

  useEffect(() => {
    pageRef.current = 1
    query(true)
  }, [appliedKeyword, status, query])

  const applyKeyword = useMemoizedFn((value: string) => {
    const nextKeyword = value.trim()
    if (nextKeyword === appliedKeyword) {
      query(true)
      return
    }
    setAppliedKeyword(nextKeyword)
  })

  const onKeywordChange = useMemoizedFn((event: React.ChangeEvent<HTMLInputElement>) => {
    const nextKeyword = event.target.value
    setKeyword(nextKeyword)
    if (!nextKeyword.trim() && appliedKeyword) setAppliedKeyword('')
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

  const onFilterMenuClick = useMemoizedFn(({ key }: { key: string }) => {
    setStatus((key === 'all' ? '' : key) as HistoryStatus)
    setFilterVisible(false)
  })

  const renderRow = useMemoizedFn((item: MCPToolCallHistorySummary) => (
    <div
      className={classNames(styles['history-row'], {
        [styles['history-row-active']]: selected?.ID === item.ID,
      })}
      onClick={() => openDetail(item)}
    >
      <div className={styles['history-row-title']}>
        <span className={styles['history-row-tool-name']} title={item.ToolName}>
          {item.ToolName}
        </span>
        <YakitTag size="small" color={item.Success ? 'success' : 'danger'}>
          {item.Success ? t('MCPHistory.success') : t('MCPHistory.failed')}
        </YakitTag>
      </div>
      <div className={styles['history-row-meta']}>
        <span>{formatTimestamp(item.CreatedAt)}</span>
        <span>{formatDuration(item.DurationMillis)}</span>
      </div>
    </div>
  ))

  const renderEditor = useMemoizedFn(
    (title: React.ReactNode, value: string, options?: { language?: string; editorKey?: string }) => (
      <div className={styles['detail-panel']}>
        <NewHTTPPacketEditor
          key={options?.editorKey}
          title={title}
          titleStyle={{ fontSize: 12 }}
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
          extra={<CopyComponents copyText={value === '-' ? '' : value} />}
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
    [detail, i18n.language],
  )
  const statusFilterLabel = useMemo(
    () => statusFilterOptions.find((item) => item.key === status)?.label || t('MCPHistory.all'),
    [statusFilterOptions, status, i18n.language],
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
  }, [hasResult, hasError, resultTab, i18n.language])

  const renderDetail = useMemo(() => {
    if (!selected) {
      return (
        <div className={styles['detail-side']}>
          <div className={styles['detail-empty']}>
            <YakitEmpty title={t('MCPHistory.emptyDetail')} />
          </div>
        </div>
      )
    }
    if (detailLoading || !detail) {
      return (
        <div className={styles['detail-side']}>
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
            <span className={styles['detail-tool-name']} title={detail.ToolName}>
              {detail.ToolName}
            </span>
            <YakitTag size="small" color={detail.Success ? 'success' : 'danger'}>
              {detail.Success ? t('MCPHistory.success') : t('MCPHistory.failed')}
            </YakitTag>
          </div>
          <div className={styles['detail-grid']}>
            <span>{t('MCPHistory.caller')}</span>
            <strong title={clientLabel}>{clientLabel}</strong>
            <span>{t('MCPHistory.callTime')}</span>
            <strong>{formatTimestamp(detail.CreatedAt)}</strong>
            <span>{t('MCPHistory.duration')}</span>
            <strong>{formatDuration(detail.DurationMillis)}</strong>
            <span>{t('MCPHistory.sessionId')}</span>
            <strong title={detail.SessionID}>{detail.SessionID || '-'}</strong>
          </div>
        </div>
        <div className={styles['detail-payload']}>
          {showResultPanel ? (
            <YakitResizeBox
              firstRatio="50%"
              secondRatio="50%"
              firstMinSize="240px"
              secondMinSize="240px"
              lineDirection="right"
              firstNode={renderEditor(t('MCPHistory.arguments'), argumentsValue, {
                editorKey: `arguments-${detail.ID}`,
              })}
              secondNode={renderEditor(resultPanelTitle, resultPanelValue, {
                language: resultTab === 'error' ? 'plaintext' : 'json',
                editorKey: `result-${detail.ID}-${resultTab}`,
              })}
            />
          ) : (
            renderEditor(t('MCPHistory.arguments'), argumentsValue, {
              editorKey: `arguments-${detail.ID}`,
            })
          )}
        </div>
      </div>
    )
  }, [
    selected,
    detailLoading,
    detail,
    clientLabel,
    showResultPanel,
    argumentsValue,
    resultPanelTitle,
    resultPanelValue,
    resultTab,
    renderEditor,
    i18n.language,
  ])

  return (
    <div className={styles['mcp-history']}>
      <YakitResizeBox
        firstRatio="360px"
        secondRatio="70%"
        firstMinSize="280px"
        secondMinSize="420px"
        lineDirection="left"
        firstNode={
          <div className={styles['history-side']}>
            <div className={styles['history-header']}>
              <div className={styles['history-title']}>
                <strong>{t('MCPHistory.title')}</strong>
                <span>{total}</span>
              </div>
              <div className={styles['history-actions']}>
                <YakitButton
                  type="outline1"
                  size="small"
                  colors="danger"
                  icon={<TrashOutlined color="currentColor" />}
                  title={t('MCPHistory.clearHistoryTitle')}
                  disabled={total === 0 || loading}
                  onClick={onDeleteClick}
                >
                  {t('YakitButton.delete')}
                </YakitButton>
                <YakitButton
                  type="text2"
                  icon={<RefreshOutlined color="currentColor" />}
                  title={t('YakitButton.refresh')}
                  onClick={() => query(true)}
                  loading={loading}
                />
              </div>
            </div>
            <div className={styles['history-filter']}>
              <YakitInput.Search
                value={keyword}
                onChange={onKeywordChange}
                onSearch={applyKeyword}
                placeholder={t('MCPHistory.searchPlaceholder')}
                allowClear
                wrapperStyle={{ flex: 1, minWidth: 0 }}
              />
              <YakitDropdownMenu
                menu={{
                  data: statusFilterOptions.map((item) => ({
                    key: item.key || 'all',
                    label: item.label,
                  })),
                  selectedKeys: [status || 'all'],
                  onClick: onFilterMenuClick,
                }}
                dropdown={{
                  trigger: ['click'],
                  placement: 'bottomRight',
                  visible: filterVisible,
                  onVisibleChange: setFilterVisible,
                }}
              >
                <YakitButton
                  type={status ? 'primary' : 'outline2'}
                  icon={<FilterOutlined color="currentColor" />}
                  isActive={filterVisible}
                  title={statusFilterLabel}
                />
              </YakitDropdownMenu>
            </div>
            <div className={styles['history-list']}>
              {histories.length === 0 && !loading ? (
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
                  defItemHeight={64}
                  renderRow={renderRow}
                />
              )}
            </div>
          </div>
        }
        secondNode={renderDetail}
      />
    </div>
  )
})

export default MCPHistory
