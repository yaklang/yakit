import React, { useEffect, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { YakitEditor } from '@/components/yakitUI/YakitEditor/YakitEditor'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { RollingLoadList } from '@/components/RollingLoadList/RollingLoadList'
import { YakitModalConfirm } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { OutlineClipboardcopyIcon, OutlineRefreshIcon, OutlineTrashIcon } from '@/assets/icon/outline'
import { ArrowLeftIcon } from '@/assets/newIcon'
import { setClipboardText } from '@/utils/clipboard'
import { genDefaultPagination } from '@/pages/invoker/schema'
import { MCPToolCallHistory, MCPToolCallHistorySummary, QueryMCPToolCallHistoryRequest } from '../type/aiMCP'
import {
  grpcDeleteMCPToolCallHistory,
  grpcGetMCPToolCallHistoryDetail,
  grpcQueryMCPToolCallHistory,
} from '../aiMCP/utils'
import styles from './MCPHistory.module.scss'

type HistoryStatus = QueryMCPToolCallHistoryRequest['Status']
type DetailTab = 'arguments' | 'result' | 'error'

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

const formatTime = (timestamp: number) => new Date(timestamp * 1000).toLocaleString()

const getClientLabel = (item: MCPToolCallHistorySummary | MCPToolCallHistory) => {
  if (item.ClientName) {
    return item.ClientVersion ? `${item.ClientName} ${item.ClientVersion}` : item.ClientName
  }
  return item.ClientID || item.SessionID || '未知调用方'
}

const MCPHistory: React.FC = React.memo(() => {
  const [keyword, setKeyword] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [status, setStatus] = useState<HistoryStatus>('')
  const [loading, setLoading] = useState(false)
  const [histories, setHistories] = useState<MCPToolCallHistorySummary[]>([])
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<MCPToolCallHistorySummary>()
  const [detail, setDetail] = useState<MCPToolCallHistory>()
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailTab, setDetailTab] = useState<DetailTab>('arguments')
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
          ...genDefaultPagination(30),
          Page: page,
          OrderBy: 'created_at',
          Order: 'desc',
        },
      })
      if (requestID !== requestIDRef.current) return
      setHistories((previous) => (refresh ? response.Histories : [...previous, ...response.Histories]))
      setTotal(response.Total)
      pageRef.current = page + 1
    } catch {
      // The gRPC wrapper has already surfaced the error.
    } finally {
      if (requestID !== requestIDRef.current) return
      loadingRef.current = false
      setLoading(false)
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

  const openDetail = useMemoizedFn(async (item: MCPToolCallHistorySummary) => {
    const requestID = ++detailRequestIDRef.current
    setSelected(item)
    setDetail(undefined)
    setDetailTab('arguments')
    setDetailLoading(true)
    try {
      const response = await grpcGetMCPToolCallHistoryDetail({ ID: item.ID })
      if (requestID === detailRequestIDRef.current) {
        setDetail(response)
      }
    } catch {
      if (requestID === detailRequestIDRef.current) {
        setSelected(undefined)
      }
    } finally {
      if (requestID === detailRequestIDRef.current) {
        setDetailLoading(false)
      }
    }
  })

  const closeDetail = useMemoizedFn(() => {
    detailRequestIDRef.current += 1
    setSelected(undefined)
    setDetail(undefined)
    setDetailLoading(false)
  })

  const deleteHistory = useMemoizedFn(
    ({
      ids,
      deleteAll = false,
      deleteFiltered = false,
    }: {
      ids?: number[]
      deleteAll?: boolean
      deleteFiltered?: boolean
    }) => {
      const title = deleteAll ? '清空 MCP 调用历史' : deleteFiltered ? '删除筛选结果' : '删除 MCP 调用记录'
      const content = deleteAll
        ? '将清空全部 MCP 调用历史，此操作无法撤销。'
        : deleteFiltered
          ? `将删除当前筛选条件匹配的 ${total} 条 MCP 调用记录，此操作无法撤销。`
          : '确认删除这条 MCP 调用记录吗？此操作无法撤销。'
      const modal = YakitModalConfirm({
        width: 420,
        type: 'white',
        title,
        content,
        onCancelText: '取消',
        onOkText: deleteAll ? '全部清空' : deleteFiltered ? '删除筛选结果' : '删除',
        okButtonProps: { colors: 'danger' },
        showConfirmLoading: true,
        onOk: () => {
          grpcDeleteMCPToolCallHistory({
            IDs: ids,
            DeleteAll: deleteAll,
            DeleteFiltered: deleteFiltered,
            Keyword: deleteFiltered ? appliedKeyword : undefined,
            Status: deleteFiltered ? status : undefined,
          })
            .then(() => {
              if (deleteAll || deleteFiltered || (selected && ids?.includes(selected.ID))) {
                closeDetail()
              }
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
    },
  )

  const detailValue = (() => {
    if (!detail) return ''
    switch (detailTab) {
      case 'arguments':
        return prettyJSON(detail.Arguments)
      case 'result':
        return prettyJSON(detail.Result)
      case 'error':
        return detail.ErrorMessage || '-'
      default:
        return ''
    }
  })()

  if (selected) {
    return (
      <div className={styles['mcp-history']}>
        <div className={styles['detail-header']}>
          <div className={styles['detail-header-title']}>
            <YakitButton type="text2" icon={<ArrowLeftIcon />} onClick={closeDetail} />
            <span>调用详情</span>
          </div>
          <YakitButton
            type="text2"
            colors="danger"
            icon={<OutlineTrashIcon />}
            title="删除记录"
            onClick={() => deleteHistory({ ids: [selected.ID] })}
          />
        </div>

        {detailLoading || !detail ? (
          <div className={styles['detail-loading']}>
            <YakitSpin spinning />
          </div>
        ) : (
          <>
            <div className={styles['detail-overview']}>
              <div className={styles['detail-tool']}>
                <span className={styles['detail-tool-name']}>{detail.ToolName}</span>
                <YakitTag size="small" color={detail.Success ? 'success' : 'danger'}>
                  {detail.Success ? '成功' : '失败'}
                </YakitTag>
              </div>
              <div className={styles['detail-grid']}>
                <span>调用方</span>
                <strong title={getClientLabel(detail)}>{getClientLabel(detail)}</strong>
                <span>调用时间</span>
                <strong>{formatTime(detail.CreatedAt)}</strong>
                <span>耗时</span>
                <strong>{formatDuration(detail.DurationMillis)}</strong>
                <span>会话 ID</span>
                <strong title={detail.SessionID}>{detail.SessionID || '-'}</strong>
              </div>
            </div>

            <div className={styles['detail-payload']}>
              <div className={styles['detail-tabs']}>
                <div className={styles['detail-tab-list']}>
                  {(
                    [
                      ['arguments', '输入参数'],
                      ['result', '返回结果'],
                      ['error', '错误信息'],
                    ] as [DetailTab, string][]
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={detailTab === value ? styles['detail-tab-active'] : undefined}
                      onClick={() => setDetailTab(value)}
                      disabled={value === 'error' && detail.Success}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <YakitButton
                  type="text2"
                  icon={<OutlineClipboardcopyIcon />}
                  title="复制当前内容"
                  onClick={() => setClipboardText(detailValue)}
                />
              </div>
              <div className={styles['detail-editor']}>
                <YakitEditor
                  key={detailTab}
                  type={detailTab === 'error' ? 'plaintext' : 'json'}
                  value={detailValue}
                  readOnly
                />
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className={styles['mcp-history']}>
      <div className={styles['history-header']}>
        <div className={styles['history-title']}>
          <strong>MCP 调用历史</strong>
          <span>{total}</span>
        </div>
        <div className={styles['history-actions']}>
          <YakitButton
            type="text2"
            colors="danger"
            icon={<OutlineTrashIcon />}
            title={appliedKeyword || status ? '删除当前筛选结果' : '清空历史'}
            disabled={total === 0 || loading}
            onClick={() =>
              appliedKeyword || status ? deleteHistory({ deleteFiltered: true }) : deleteHistory({ deleteAll: true })
            }
          >
            {appliedKeyword || status ? '删除筛选' : '清空'}
          </YakitButton>
          <YakitButton
            type="text2"
            icon={<OutlineRefreshIcon />}
            title="刷新"
            onClick={() => query(true)}
            loading={loading}
          />
        </div>
      </div>
      <div className={styles['history-filter']}>
        <YakitInput.Search
          value={keyword}
          onChange={(event) => {
            const nextKeyword = event.target.value
            setKeyword(nextKeyword)
            if (!nextKeyword.trim() && appliedKeyword) {
              setAppliedKeyword('')
            }
          }}
          onSearch={applyKeyword}
          placeholder="搜索工具、Agent 或会话"
          allowClear
        />
        <div className={styles['status-filter']}>
          {(
            [
              ['', '全部'],
              ['success', '成功'],
              ['failed', '失败'],
            ] as [HistoryStatus, string][]
          ).map(([value, label]) => (
            <YakitButton
              key={value}
              size="small"
              type={status === value ? 'primary' : 'outline1'}
              onClick={() => setStatus(value)}
            >
              {label}
            </YakitButton>
          ))}
        </div>
      </div>
      <div className={styles['history-list']}>
        {histories.length === 0 && !loading ? (
          <YakitEmpty title="暂无 MCP 调用记录" />
        ) : (
          <RollingLoadList<MCPToolCallHistorySummary>
            data={histories}
            page={pageRef.current}
            hasMore={histories.length < total}
            loadMoreData={() => query(false)}
            loading={loading}
            rowKey="ID"
            defItemHeight={84}
            renderRow={(item) => (
              <div className={styles['history-row']} onClick={() => openDetail(item)}>
                <div className={styles['history-row-title']}>
                  <span title={item.ToolName}>{item.ToolName}</span>
                  <div className={styles['history-row-actions']}>
                    <YakitTag size="small" color={item.Success ? 'success' : 'danger'}>
                      {item.Success ? '成功' : '失败'}
                    </YakitTag>
                    <YakitButton
                      type="text2"
                      colors="danger"
                      icon={<OutlineTrashIcon />}
                      title="删除记录"
                      onClick={(event) => {
                        event.stopPropagation()
                        deleteHistory({ ids: [item.ID] })
                      }}
                    />
                  </div>
                </div>
                <div className={styles['history-client']} title={getClientLabel(item)}>
                  {getClientLabel(item)}
                </div>
                <div className={styles['history-row-meta']}>
                  <span>{formatTime(item.CreatedAt)}</span>
                  <span>{formatDuration(item.DurationMillis)}</span>
                </div>
                {!item.Success && <div className={styles['history-error']}>{item.ErrorMessage || '调用失败'}</div>}
              </div>
            )}
          />
        )}
      </div>
    </div>
  )
})

export default MCPHistory
