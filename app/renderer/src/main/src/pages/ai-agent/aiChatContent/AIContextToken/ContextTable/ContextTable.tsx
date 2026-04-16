import { Table, TableColumnsType } from 'antd'
import { FC, useMemo, useState } from 'react'
import styles from './ContextTable.module.scss'
import { OutlineChevrondownIcon, OutlineFilterIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitCheckbox } from '@/components/yakitUI/YakitCheckbox/YakitCheckbox'
import { AIContextSectionsDetail } from '@/pages/ai-agent/type/aiChat'
import { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { YakitEditor } from '@/components/yakitUI/YakitEditor/YakitEditor'

const roleTextMap: Record<string, string> = {
  mixed: '混合',
  runtime_context: '运行内容',
  user_input: '用户输入',
  system_prompt: '系统信息',
}

const roleFilters = Object.entries(roleTextMap).map(([value, text]) => ({ text, value }))

const RoleFilterDropdown: React.FC<{
  selectedKeys: React.Key[]
  setSelectedKeys: (keys: React.Key[]) => void
  confirm: () => void
  clearFilters?: () => void
}> = ({ selectedKeys, setSelectedKeys, confirm, clearFilters }) => {
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
                onChange={(event) => setSelectedKeys(event.target.checked ? [value] : [])}
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

const ContextTable: FC<{
  contextSectionsData?: AIContextSectionsDetail
}> = ({ contextSectionsData }) => {
  const [previewKey, setPreviewKey] = useState<string>('')

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
        title: '字节数',
        dataIndex: 'bytes',
        align: 'center',
        key: 'bytes',
        width: 80,
        render: (bytes: number) => <span className={styles['context-sub-label']}>{bytes}</span>,
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
        filterDropdown: (props) => <RoleFilterDropdown {...props} />,
        onFilter: (value, record) => record.role === value,
        render: (role: string) => {
          const roleText = roleTextMap[role] || role

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
          if (!record.bytes && !record.children?.length) return null

          return (
            <YakitButton className={styles['view-btn']} type="text" onClick={() => setPreviewKey(record.key)}>
              查看
            </YakitButton>
          )
        },
      },
    ],
    [contextSectionsData?.summary],
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
        expandable={{
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
