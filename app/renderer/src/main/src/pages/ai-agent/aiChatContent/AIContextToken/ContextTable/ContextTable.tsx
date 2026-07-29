import { Table, TableColumnsType, Tooltip } from 'antd'
import { FC, useCallback, useMemo, useState } from 'react'
import styles from './ContextTable.module.scss'
import { OutlineChevrondownIcon, OutlineFilterIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitCheckbox } from '@/components/yakitUI/YakitCheckbox/YakitCheckbox'
import { AIContextSectionsDetail } from '@/pages/ai-agent/type/aiChat'
import { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitEditor } from '@/components/yakitUI/YakitEditor/YakitEditor'
import { YakitMenu } from '@/components/yakitUI/YakitMenu/YakitMenu'
import type { YakitMenuItemProps } from '@/components/yakitUI/YakitMenu/YakitMenu'
import type { ContextStatsChartMetric } from '@/pages/ai-agent/chatTemplate/AIEcharts'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

/** 旧版 sections 仅有少量固定 role 时的展示回退 */
const LEGACY_ROLE_LABELS: Record<string, string> = {
  mixed: '混合',
  runtime_context: '运行内容',
  user_input: '用户输入',
  system_prompt: '系统信息',
}

const collectSectionRoles = (nodes: AIAgentGrpcApi.AIContextSections[] | undefined, out = new Set<string>()) => {
  if (!nodes?.length) return out
  for (const n of nodes) {
    if (n.role) out.add(n.role)
    if (n.children?.length) collectSectionRoles(n.children, out)
  }
  return out
}

const RoleFilterDropdown: React.FC<{
  roleFilters: { text: string; value: string }[]
  selectedKeys: React.Key[]
  setSelectedKeys: (keys: React.Key[]) => void
  confirm: () => void
  clearFilters?: () => void
}> = ({ roleFilters, selectedKeys, setSelectedKeys, confirm, clearFilters }) => {
  const activeKeys = selectedKeys as string[]

  return (
    <div className={styles['filter-dropdown']}>
      <div className={styles['filter-options']}>
        {roleFilters.map((item) => {
          const value = String(item.value)

          return (
            <label className={styles['filter-option']} key={value}>
              <YakitCheckbox
                checked={activeKeys.includes(value)}
                onChange={(event) => {
                  if (event.target.checked) {
                    setSelectedKeys([...activeKeys, value])
                  } else {
                    setSelectedKeys(activeKeys.filter((k) => k !== value))
                  }
                }}
              >
                {item.text}
              </YakitCheckbox>
            </label>
          )
        })}
      </div>
      <div className={styles['filter-actions']}>
        <YakitButton
          className={styles['filter-action-btn']}
          type="text2"
          onClick={() => {
            clearFilters?.()
            confirm()
          }}
        >
          清空
        </YakitButton>
        <YakitButton className={styles['filter-action-btn']} type="primary" onClick={() => confirm()}>
          确定
        </YakitButton>
      </div>
    </div>
  )
}

const METRIC_MENU_DATA: YakitMenuItemProps[] = [
  { key: 'tokens', label: 'Token' },
  { key: 'bytes', label: 'Byte' },
]

/** Token / 字节切换菜单（仅 UI，value 由各自父组件独立维护） */
export const MetricFilterDropdown: FC<{
  value: ContextStatsChartMetric
  onChange: (value: ContextStatsChartMetric) => void
}> = ({ value, onChange }) => {
  return (
    <div className={styles['filter-dropdown']}>
      <YakitMenu
        width={112}
        type="primary"
        data={METRIC_MENU_DATA}
        selectedKeys={[value]}
        onClick={({ key }) => {
          if (key === 'bytes' || key === 'tokens') {
            onChange(key)
          }
        }}
      />
    </div>
  )
}

const ContextTable: FC<{
  contextSectionsData?: AIContextSectionsDetail
  /** prompt_profile 首次锁定的 role_name -> role_name_zh，与上下文字节统计一致 */
  roleLabelMap?: Record<string, string>
}> = ({ contextSectionsData, roleLabelMap }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const [previewKey, setPreviewKey] = useState<string>('')
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([])
  /** 表格数量列 Token/字节，与图表统计独立 */
  const [tableCountMetric, setTableCountMetric] = useState<ContextStatsChartMetric>('tokens')
  const [tableMetricPopoverOpen, setTableMetricPopoverOpen] = useState(false)
  const roleFilters = useMemo(() => {
    const merged: Record<string, string> = { ...LEGACY_ROLE_LABELS, ...(roleLabelMap || {}) }
    const keys = new Set<string>()
    if (roleLabelMap && Object.keys(roleLabelMap).length > 0) {
      for (const k of Object.keys(roleLabelMap)) keys.add(k)
    } else {
      for (const k of Object.keys(LEGACY_ROLE_LABELS)) keys.add(k)
    }
    collectSectionRoles(contextSectionsData?.sections).forEach((r) => keys.add(r))
    return [...keys].map((value) => ({
      value,
      text: merged[value] || value,
    }))
  }, [roleLabelMap, contextSectionsData?.sections])

  const resolveRoleText = useCallback(
    (role: string, row: AIAgentGrpcApi.AIContextSections) =>
      roleLabelMap?.[role] || row.role_zh || LEGACY_ROLE_LABELS[role] || role || '',
    [roleLabelMap],
  )

  const firstLayerKeys = useMemo(
    () => new Set((contextSectionsData?.sections || []).map((s) => s.key)),
    [contextSectionsData?.sections],
  )

  const firstLayerTotal = useMemo(() => {
    const rows = contextSectionsData?.sections || []
    if (tableCountMetric === 'tokens') {
      return rows.reduce((sum, s) => sum + (Number(s.estimated_tokens) || 0), 0)
    }
    return rows.reduce((sum, s) => sum + (Number(s.bytes) || 0), 0)
  }, [contextSectionsData?.sections, tableCountMetric])

  const columns: TableColumnsType<AIAgentGrpcApi.AIContextSections> = useMemo(
    () => [
      {
        title: '上下文成分',
        dataIndex: 'label',
        key: 'label',
        ellipsis: true,
        render: (label: string) => (
          <span className={styles['context-label']} title={label}>
            {label}
          </span>
        ),
      },
      {
        title: (
          <div className={styles['count-column-title']}>
            <span>{tableCountMetric === 'tokens' ? 'Token' : 'Byte'}</span>
            <YakitPopover
              overlayClassName={styles['metric-table-filter-dropdown']}
              visible={tableMetricPopoverOpen}
              onVisibleChange={setTableMetricPopoverOpen}
              placement="bottomLeft"
              trigger="click"
              content={
                <MetricFilterDropdown
                  value={tableCountMetric}
                  onChange={(v) => {
                    setTableCountMetric(v)
                    setTableMetricPopoverOpen(false)
                  }}
                />
              }
            >
              <Tooltip title={t('AIContextToken.switchChartMetric')}>
                <OutlineChevrondownIcon className={styles['table-metric-filter-icon-dropdown']} />
              </Tooltip>
            </YakitPopover>
          </div>
        ),
        dataIndex: tableCountMetric === 'tokens' ? 'estimated_tokens' : 'bytes',
        align: 'center',
        key: 'count',
        width: 120,
        render: (_: unknown, record: AIAgentGrpcApi.AIContextSections) => {
          const raw = tableCountMetric === 'tokens' ? Number(record.estimated_tokens) || 0 : Number(record.bytes) || 0
          const isFirstLayer = firstLayerKeys.has(record.key)
          const pctText = isFirstLayer && firstLayerTotal > 0 ? ` (${((raw / firstLayerTotal) * 100).toFixed(2)}%)` : ''
          return (
            <span className={styles['context-sub-label']}>
              {raw}
              {pctText}
            </span>
          )
        },
      },
      {
        title: '类型',
        dataIndex: 'role',
        align: 'center',
        key: 'role',
        width: 80,
        filters: roleFilters,
        filterIcon: (filtered: boolean) => (
          <OutlineFilterIcon className={`${styles['filter-icon']} ${filtered ? styles['filter-icon-active'] : ''}`} />
        ),
        filterDropdown: (props) => <RoleFilterDropdown roleFilters={roleFilters} {...props} />,
        onFilter: (value, record) => record.role === value,
        render: (role: string, row: AIAgentGrpcApi.AIContextSections) => {
          const roleText = resolveRoleText(role, row)

          return (
            <span className={styles['context-sub-label']} title={roleText}>
              {roleText}
            </span>
          )
        },
      },
      {
        title: '操作',
        key: 'action',
        align: 'center',
        width: 80,
        render: (_, record) => {
          const previewValue = contextSectionsData?.summary.get(record.key)
          if (!previewValue || previewValue.trim() === '') return null
          const hasCount =
            !!(record.bytes || record.estimated_tokens) || !!(record.children && record.children.length > 0)
          if (!hasCount) return null

          return (
            <YakitButton className={styles['view-btn']} type="text" onClick={() => setPreviewKey(record.key)}>
              查看
            </YakitButton>
          )
        },
      },
    ],
    [
      contextSectionsData?.summary,
      roleFilters,
      resolveRoleText,
      firstLayerKeys,
      firstLayerTotal,
      tableCountMetric,
      tableMetricPopoverOpen,
      t,
    ],
  )

  const previewContent = useMemo(() => {
    if (!previewKey) return ''
    return contextSectionsData?.summary.get(previewKey) || ''
  }, [contextSectionsData?.summary, previewKey])

  return (
    <>
      <Table
        className={styles['context-table']}
        columns={columns}
        dataSource={contextSectionsData?.sections}
        scroll={{ y: 288 }}
        pagination={false}
        rowKey="key"
        onRow={(record) => ({
          style: { cursor: record.children?.length ? 'pointer' : undefined },
          onClick: () => {
            if (!record.children?.length) return
            setExpandedRowKeys((prev) =>
              prev.includes(record.key) ? prev.filter((k) => k !== record.key) : [...prev, record.key],
            )
          },
        })}
        expandable={{
          expandedRowKeys,
          onExpandedRowsChange: (keys) => setExpandedRowKeys([...keys]),
          expandIcon: ({ expanded, onExpand, record }) => {
            const hasChildren = !!record.children?.length

            if (!hasChildren) {
              return <span className={styles['expand-icon-placeholder']} />
            }

            return (
              <span
                className={`${styles['expand-icon']} ${expanded ? styles['expand-icon-expanded'] : ''}`}
                onClick={(event) => onExpand(record, event)}
              >
                <OutlineChevrondownIcon />
              </span>
            )
          },
        }}
      />
      <YakitModal
        title="详情"
        visible={!!previewKey}
        footer={null}
        width={720}
        centered
        zIndex={4000}
        bodyStyle={{ height: 400 }}
        onCancel={() => setPreviewKey('')}
      >
        <YakitEditor type="plaintext" readOnly={true} value={previewContent} />
      </YakitModal>
    </>
  )
}

export default ContextTable
