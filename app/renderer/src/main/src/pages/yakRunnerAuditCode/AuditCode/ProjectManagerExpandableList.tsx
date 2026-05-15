import React, { memo, useRef, useState } from 'react'
import classNames from 'classnames'
import { LoadingOutlined } from '@ant-design/icons'
import { useCreation, useMemoizedFn, useThrottleFn, useUpdateEffect } from 'ahooks'
import ReactResizeDetector from 'react-resize-detector'
import { Tooltip } from 'antd'
import styles from './AuditCode.module.scss'
import { VirtualListColumns } from '@/components/yakitUI/YakitVirtualList/YakitVirtualListType'
import { RowSelectionProps } from '@/components/TableVirtualResize/TableVirtualResizeType'
import { SSAProjectResponse } from './AuditCodeType'
import { SSAProgram } from '@/pages/yakRunnerScanHistory/YakRunnerScanHistory'
import { apiQuerySSAPrograms } from '@/pages/yakRunnerScanHistory/utils'
import { YakitProtoCheckbox } from '@/components/TableVirtualResize/YakitProtoCheckbox/YakitProtoCheckbox'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import { formatTimestamp } from '@/utils/timeUtil'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import {
  OutlineArrowcirclerightIcon,
  OutlineChevrondownIcon,
  OutlineChevronrightIcon,
  OutlineScanIcon,
  OutlineTrashIcon,
} from '@/assets/icon/outline'

const { ipcRenderer } = window.require('electron')

const COMPILE_PREVIEW_LIMIT = 3

interface ProjectCompilePreviewState {
  loading: boolean
  items: SSAProgram[]
  total: number
  scanTotals: Record<number, number>
}

interface ProjectManagerExpandableListProps {
  className?: string
  columns: VirtualListColumns<SSAProjectResponse>[]
  data: SSAProjectResponse[]
  loading?: boolean
  hasMore?: boolean
  refresh?: boolean
  renderKey?: string
  rowSelection?: RowSelectionProps<SSAProjectResponse>
  page?: number
  loadMoreData: () => void
  expandedProjectIds?: number[]
  onToggleExpand: (record: SSAProjectResponse) => void
  onOpenProjectHistory: (record: SSAProjectResponse, program?: SSAProgram) => void
  onOpenCodeScan: (record: SSAProjectResponse, program: SSAProgram) => void
  onOpenAuditCode: (program: SSAProgram) => void
  onDeleteCompile: (projectId: number, programId: number) => Promise<void>
}

const getProgramRiskTotal = (program: SSAProgram) => {
  return (
    Number(program.CriticalRiskNumber || 0) +
    Number(program.HighRiskNumber || 0) +
    Number(program.WarnRiskNumber || 0) +
    Number(program.LowRiskNumber || 0) +
    Number(program.InfoRiskNumber || 0)
  )
}

const fetchScanTotals = async (programs: SSAProgram[], projectId: number) => {
  const entries = await Promise.all(
    programs.map(async (program) => {
      try {
        const res = await ipcRenderer.invoke('QuerySyntaxFlowScanTask', {
          Pagination: {
            Page: 1,
            Limit: 1,
            Order: 'desc',
            OrderBy: 'created_at',
          },
          Filter: {
            Programs: [program.Name],
            ProjectIds: [projectId],
            Kind: ['scan'],
          },
          ShowDiffRisk: false,
        })
        return [program.Id, Number(res?.Total || 0)] as const
      } catch {
        return [program.Id, 0] as const
      }
    }),
  )
  return Object.fromEntries(entries) as Record<number, number>
}

export const ProjectManagerExpandableList = memo<ProjectManagerExpandableListProps>((props) => {
  const { t } = useI18nNamespaces(['yakRunner', 'yakitUi'])
  const {
    className,
    columns,
    data,
    loading,
    hasMore = true,
    refresh,
    renderKey = 'ID',
    rowSelection,
    page = 0,
    loadMoreData,
    expandedProjectIds = [],
    onToggleExpand,
    onOpenProjectHistory,
    onOpenCodeScan,
    onOpenAuditCode,
    onDeleteCompile,
  } = props

  const [vlistHeigth, setVListHeight] = useState(600)
  const [scroll, setScroll] = useState(false)
  const [compilePreviewMap, setCompilePreviewMap] = useState<Record<number, ProjectCompilePreviewState>>({})
  const compilePreviewMapRef = useRef(compilePreviewMap)
  compilePreviewMapRef.current = compilePreviewMap
  const expandedProjectIdsRef = useRef<number[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const lastContainerHeightRef = useRef(0)

  const loadCompilePreview = useMemoizedFn(async (projectId: number) => {
    const cached = compilePreviewMapRef.current[projectId]
    const showLoading = !cached?.items?.length

    if (showLoading) {
      setCompilePreviewMap((prev) => ({
        ...prev,
        [projectId]: {
          loading: true,
          items: [],
          total: 0,
          scanTotals: {},
        },
      }))
    }

    try {
      const res = await apiQuerySSAPrograms({
        Filter: {
          ProjectIds: [projectId],
        },
        Pagination: {
          Page: 1,
          Limit: COMPILE_PREVIEW_LIMIT,
          Order: 'desc',
          OrderBy: 'created_at',
        },
      })
      const items = res?.Data || []
      const scanTotals = await fetchScanTotals(items, projectId)
      setCompilePreviewMap((prev) => ({
        ...prev,
        [projectId]: {
          loading: false,
          items,
          total: Number(res?.Total || items.length),
          scanTotals,
        },
      }))
    } catch {
      setCompilePreviewMap((prev) => ({
        ...prev,
        [projectId]: {
          loading: false,
          items: [],
          total: 0,
          scanTotals: {},
        },
      }))
    }
  })

  useUpdateEffect(() => {
    const prevIds = expandedProjectIdsRef.current
    expandedProjectIdsRef.current = expandedProjectIds
    expandedProjectIds
      .filter((projectId) => !prevIds.includes(projectId))
      .forEach((projectId) => {
        loadCompilePreview(projectId)
      })
  }, [expandedProjectIds])

  useUpdateEffect(() => {
    if (!expandedProjectIds.length) return
    expandedProjectIds.forEach((projectId) => {
      loadCompilePreview(projectId)
    })
  }, [refresh])

  const onScrollCapture = useThrottleFn(
    () => {
      if (!containerRef.current || loading || !hasMore) return
      const dom = containerRef.current
      const scrollBottom = dom.scrollHeight - dom.scrollTop - dom.clientHeight
      if (scrollBottom <= 500) {
        loadMoreData()
      }
    },
    { wait: 200, leading: false },
  ).run

  const onChangeCheckboxSingle = useMemoizedFn((checked: boolean, key: string, row: SSAProjectResponse) => {
    rowSelection?.onChangeCheckboxSingle?.(checked, key, row)
  })

  const onChangeCheckbox = useMemoizedFn((checked: boolean) => {
    if (!rowSelection?.onSelectAll) return
    if (checked) {
      const keys = data.map((ele, index) => (renderKey ? ele[renderKey] : index))
      rowSelection.onSelectAll(keys, data, checked)
    } else {
      rowSelection.onSelectAll([], [], checked)
    }
  })

  const checkboxPropsMap = useCreation(() => {
    const map = new Map<React.Key, Partial<React.ComponentProps<typeof YakitProtoCheckbox>>>()
    const { getCheckboxProps } = rowSelection || {}
    if (!getCheckboxProps) return map
    data.forEach((record) => {
      const key = record[renderKey]
      map.set(key, getCheckboxProps(record) || {})
    })
    return map
  }, [data, rowSelection?.getCheckboxProps, renderKey])

  const isAll = useCreation(() => {
    return rowSelection?.isAll || (data.length > 0 && rowSelection?.selectedRowKeys?.length === data.length)
  }, [rowSelection?.isAll, data.length, rowSelection?.selectedRowKeys?.length])

  const renderCompilePreview = (record: SSAProjectResponse) => {
    const preview = compilePreviewMap[record.ID]
    const isExpanded = expandedProjectIds.includes(record.ID)
    const hasPreviewItems = !!preview?.items?.length
    const isPreviewEmpty = !preview?.loading && !hasPreviewItems

    if (!isExpanded) return null

    return (
      <div
        className={classNames(styles['project-compile-preview'], {
          [styles['project-compile-preview-compact']]: isPreviewEmpty,
        })}
        onClick={(e) => e.stopPropagation()}
      >
        {preview?.loading ? (
          <div className={styles['project-compile-preview-loading']}>
            <LoadingOutlined />
          </div>
        ) : hasPreviewItems ? (
          <>
            <div className={styles['project-compile-preview-header']}>
              <div className={styles['project-compile-preview-cell']}>{t('AuditCode.compileTime')}</div>
              <div className={styles['project-compile-preview-cell']}>{t('AuditCode.scanCount')}</div>
              <div className={styles['project-compile-preview-cell']}>{t('AuditCode.riskCount')}</div>
              <div
                className={classNames(styles['project-compile-preview-cell'], styles['project-compile-preview-action'])}
              >
                {t('YakitTable.action')}
              </div>
            </div>
            {preview.items.map((program) => {
              const riskTotal = getProgramRiskTotal(program)
              const scanTotal = preview.scanTotals[program.Id] || 0
              return (
                <div
                  className={classNames(
                    styles['project-compile-preview-row'],
                    styles['project-compile-preview-row-clickable'],
                  )}
                  key={program.Id}
                  onClick={() => onOpenProjectHistory(record, program)}
                >
                  <div className={styles['project-compile-preview-cell']} title={formatTimestamp(program.UpdateAt)}>
                    {program.UpdateAt ? formatTimestamp(program.UpdateAt) : '-'}
                  </div>
                  <div className={styles['project-compile-preview-cell']}>{scanTotal}</div>
                  <div className={styles['project-compile-preview-cell']}>
                    {riskTotal > 0 ? <YakitTag color="info">{riskTotal}</YakitTag> : '-'}
                  </div>
                  <div
                    className={classNames(
                      styles['project-compile-preview-cell'],
                      styles['project-compile-preview-action'],
                    )}
                  >
                    <Tooltip title={t('AuditCode.codeScan')}>
                      <YakitButton
                        type="text"
                        icon={<OutlineScanIcon />}
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenCodeScan(record, program)
                        }}
                      />
                    </Tooltip>
                    <Tooltip title={t('YakRunnerScanHistory.openProject')}>
                      <YakitButton
                        type="text"
                        icon={<OutlineArrowcirclerightIcon />}
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenAuditCode(program)
                        }}
                      />
                    </Tooltip>
                    <YakitPopconfirm
                      title={t('YakitCheckbox.confirmDeleteSelected')}
                      onConfirm={() => onDeleteCompile(record.ID, program.Id)}
                    >
                      <YakitButton
                        type="text"
                        danger
                        icon={<OutlineTrashIcon />}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </YakitPopconfirm>
                  </div>
                </div>
              )
            })}
            {preview.total > COMPILE_PREVIEW_LIMIT && (
              <div className={styles['project-compile-preview-more']} onClick={() => onOpenProjectHistory(record)}>
                {t('AuditCode.viewMoreCompileHistory')}
              </div>
            )}
          </>
        ) : (
          <div className={styles['project-compile-preview-empty']}>{t('AuditCode.noCompileHistory')}</div>
        )}
      </div>
    )
  }

  return (
    <div className={classNames(styles['project-manager-expandable-list'], className)}>
      <YakitSpin spinning={loading && page <= 1}>
        <div
          className={classNames(styles['project-manager-expandable-columns'], {
            [styles['project-manager-expandable-columns-scroll']]: scroll,
          })}
        >
          {rowSelection && (
            <div className={styles['project-manager-expandable-checkbox']}>
              <YakitProtoCheckbox
                checked={isAll}
                indeterminate={!isAll && (rowSelection?.selectedRowKeys?.length || 0) > 0}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onChangeCheckbox(e.target.checked)}
              />
            </div>
          )}
          {columns.map((columnsItem) => (
            <div
              key={columnsItem.dataIndex}
              className={classNames(styles['project-manager-expandable-column'], {
                [styles['project-manager-expandable-column-flex']]: !columnsItem.width,
              })}
              style={columnsItem?.width ? { width: columnsItem.width } : {}}
            >
              <div className="content-ellipsis">{columnsItem.title}</div>
            </div>
          ))}
          <div className={styles['project-manager-expandable-expand-column']} />
        </div>

        <div className={styles['project-manager-expandable-content']}>
          <ReactResizeDetector
            onResize={(_, height) => {
              if (!height || Math.abs(height - lastContainerHeightRef.current) < 4) return
              lastContainerHeightRef.current = height
              setVListHeight(height)
              if (!containerRef.current) return
              const containerHeight = containerRef.current.clientHeight || 0
              const scrollHeight = containerRef.current.scrollHeight || 0
              setScroll(scrollHeight > containerHeight)
            }}
            handleWidth={true}
            handleHeight={true}
            refreshMode="debounce"
            refreshRate={50}
          />
          <div
            ref={containerRef}
            className={styles['project-manager-expandable-container']}
            style={{ height: vlistHeigth }}
            onScroll={onScrollCapture}
          >
            <div className={styles['project-manager-expandable-wrapper']}>
              {data.map((record, index) => {
                const rowKey = renderKey ? record[renderKey] : index
                const isExpanded = expandedProjectIds.includes(record.ID)
                return (
                  <div className={styles['project-manager-expandable-group']} key={rowKey}>
                    <div
                      className={classNames(styles['project-manager-expandable-item'], {
                        [styles['project-manager-expandable-item-expanded']]: isExpanded,
                      })}
                      onClick={() => onToggleExpand(record)}
                    >
                      {rowSelection && (
                        <div className={styles['project-manager-expandable-checkbox']}>
                          <YakitProtoCheckbox
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => onChangeCheckboxSingle(e.target.checked, rowKey, record)}
                            checked={rowSelection?.selectedRowKeys?.findIndex((c) => c === rowKey) !== -1}
                            {...(checkboxPropsMap.get(rowKey) || {})}
                          />
                        </div>
                      )}
                      {columns.map((item) => (
                        <div
                          key={`${rowKey}-${item.dataIndex}`}
                          style={item?.width ? { width: item.width } : {}}
                          className={classNames(styles['project-manager-expandable-column'], {
                            [styles['project-manager-expandable-column-flex']]: !item.width,
                          })}
                        >
                          {item?.render ? (
                            item.render(record[item.dataIndex], record, index)
                          ) : (
                            <div className="content-ellipsis">{record[item.dataIndex]}</div>
                          )}
                        </div>
                      ))}
                      <div className={styles['project-manager-expandable-expand-column']}>
                        <YakitButton
                          type="text2"
                          icon={isExpanded ? <OutlineChevrondownIcon /> : <OutlineChevronrightIcon />}
                          onClick={(e) => {
                            e.stopPropagation()
                            onToggleExpand(record)
                          }}
                        />
                      </div>
                    </div>
                    {renderCompilePreview(record)}
                  </div>
                )
              })}
              {loading && hasMore && (
                <div className={styles['project-manager-expandable-loading']}>
                  <LoadingOutlined />
                </div>
              )}
              {!loading && !hasMore && data.length > 0 && (
                <div className={styles['project-manager-expandable-no-more']}>{t('YakitEmpty.noMoreData')}</div>
              )}
            </div>
          </div>
        </div>
      </YakitSpin>
    </div>
  )
})

ProjectManagerExpandableList.displayName = 'ProjectManagerExpandableList'
