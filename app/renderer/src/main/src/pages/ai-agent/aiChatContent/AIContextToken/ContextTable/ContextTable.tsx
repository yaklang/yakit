import { Modal, Table, TableColumnsType } from 'antd'
import { useMemo, useState } from 'react'
import styles from './ContextTable.module.scss'
import { OutlineChevrondownIcon, OutlineFilterIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitCheckbox } from '@/components/yakitUI/YakitCheckbox/YakitCheckbox'

interface ContextData {
  key: string
  label: string
  bytes: number
  role: string
  included?: boolean
  compressible?: boolean
  lines?: number
  content?: string
  children?: ContextData[]
}

const roleTextMap: Record<string, string> = {
  mixed: '混合',
  runtime_context: '运行内容',
  user_input: '用户输入',
  system_prompt: '系统信息',
}

const data: ContextData[] = [
  {
    key: 'background',
    label: 'Background',
    role: 'mixed',
    included: true,
    compressible: false,
    bytes: 494,
    lines: 17,
    children: [
      {
        key: 'background.environment',
        label: 'Background / Environment',
        role: 'runtime_context',
        included: true,
        compressible: true,
        bytes: 131,
        lines: 3,
        content:
          'Current Time: 2026-04-01 12:00:00 | OS/Arch: darwin/arm64\nworking dir: /tmp/test-project\nworking dir glance: tree:/tmp/test-project',
      },
      {
        key: 'background.dynamic_context',
        label: 'Background / Dynamic Context',
        role: 'mixed',
        included: true,
        compressible: false,
        bytes: 253,
        lines: 7,
        children: [
          {
            key: 'background.dynamic_context.auto_provided',
            label: 'Background / Dynamic Context / Auto Provided',
            role: 'runtime_context',
            included: true,
            compressible: true,
            bytes: 100,
            lines: 3,
            content:
              '<|AUTO_PROVIDE_CTX_[abcd]_START key=test_ctx|>\ncurrent file: main.go\n<|AUTO_PROVIDE_CTX_[abcd]_END|>',
          },
          {
            key: 'background.dynamic_context.prev_user_input',
            label: 'Background / Dynamic Context / Previous User Input',
            role: 'user_input',
            included: true,
            compressible: false,
            bytes: 153,
            lines: 4,
            content:
              '<|PREV_USER_INPUT_nonceX|>\n# Session User Input History\n- Round 1 | Time: 2026-04-01 11:59:00 | User Input: previous input\n<|PREV_USER_INPUT_END_nonceX|>',
          },
        ],
      },
      {
        key: 'background.ai_forge_list',
        label: 'Background / AI Forge List',
        role: 'runtime_context',
        included: true,
        compressible: true,
        bytes: 19,
        lines: 2,
        content: '- forge-a\n- forge-b',
      },
      {
        key: 'background.tool_inventory',
        label: 'Background / Tool Inventory',
        role: 'runtime_context',
        included: true,
        compressible: true,
        bytes: 62,
        lines: 2,
        content: 'enabled_tools=2 top_tools=1 has_more=true\n- tool-a: run tool a',
      },
      {
        key: 'background.timeline',
        label: 'Background / Timeline',
        role: 'runtime_context',
        included: true,
        compressible: true,
        bytes: 29,
        lines: 3,
        content: '# Timeline Memory\nstep1\nstep2',
      },
    ],
  },
  {
    key: 'user_query',
    label: 'User Query',
    role: 'user_input',
    included: true,
    compressible: false,
    bytes: 14,
    lines: 1,
    content: 'raw user input',
  },
  {
    key: 'extra_capabilities',
    label: 'Extra Capabilities',
    role: 'runtime_context',
    included: false,
    compressible: true,
    bytes: 0,
    lines: 0,
  },
  {
    key: 'persistent_context',
    label: 'Persistent Context',
    role: 'system_prompt',
    included: true,
    compressible: false,
    bytes: 22,
    lines: 1,
    content: 'persistent instruction',
  },
  {
    key: 'skills_context',
    label: 'Skills Context',
    role: 'runtime_context',
    included: false,
    compressible: true,
    bytes: 0,
    lines: 0,
  },
  {
    key: 'reactive_data',
    label: 'Reactive Data',
    role: 'runtime_context',
    included: true,
    compressible: true,
    bytes: 16,
    lines: 1,
    content: 'reactive context',
  },
  {
    key: 'injected_memory',
    label: 'Injected Memory',
    role: 'runtime_context',
    included: true,
    compressible: true,
    bytes: 14,
    lines: 1,
    content: 'memory content',
  },
  {
    key: 'schema',
    label: 'Schema',
    role: 'system_prompt',
    included: true,
    compressible: false,
    bytes: 1761,
    lines: 35,
    content:
      '{\n  "$schema": "http://json-schema.org/draft-07/schema#",\n  "type": "object",\n  "required": [\n    "@action",\n    "identifier"\n  ],\n  "properties": {\n    "@action": {\n      "description": "required \'@action\' field to identify the action type",\n      "enum": [\n        "directly_answer",\n        "finish"\n      ],\n      "type": "string",\n      "x-@action-rules": [\n        "directly_answer: Answer the user directly via \'answer_payload\' or FINAL_ANSWER tag. For simple direct answers, omit \'human_readable_thought\'.",\n        "finish: Finish the task. Add \'human_readable_thought\' only if a brief closing note is needed."\n      ]\n    },\n    "identifier": {\n      "description": "REQUIRED. A short snake_case label (lowercase + underscores, <=30 chars) describing the PURPOSE of this action call. Examples: folder_skeleton, read_go_mod, grep_sql_exec, write_dir_structure. This identifier is used in log file paths to help users quickly understand what each action call is doing.",\n      "type": "string"\n    },\n    "human_readable_thought": {\n      "description": "Optional. Omit this field when @action is \'directly_answer\' or when the next step is already obvious. If you do provide it, keep it to one short, action-oriented sentence only (prefer <=12 Chinese characters or <=8 English words).",\n      "type": "string"\n    },\n    "answer_payload": {\n      "description": "USE THIS FIELD ONLY IF @action is \'directly_answer\' AND answer is short (≤200 chars). For long answers, leave this empty and use \'<|FINAL_ANSWER_...|>\' tags after JSON. CRITICAL: answer_payload and <|FINAL_ANSWER_...|> are STRICTLY MUTUALLY EXCLUSIVE - never use both simultaneously.",\n      "type": "string"\n    }\n  },\n  "additionalProperties": true\n}',
  },
  {
    key: 'output_example',
    label: 'Output Example',
    role: 'system_prompt',
    included: true,
    compressible: true,
    bytes: 14,
    lines: 1,
    content: 'example output',
  },
]

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

const ContextTable = () => {
  const [previewRow, setPreviewRow] = useState<ContextData | null>(null)

  const columns: TableColumnsType<ContextData> = useMemo(
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
          if (!record.bytes && !record.content && !record.children?.length) return null

          return (
            <YakitButton className={styles['view-btn']} type="text" onClick={() => setPreviewRow(record)}>
              查看
            </YakitButton>
          )
        },
      },
    ],
    [],
  )

  const previewContent = useMemo(() => {
    if (!previewRow) return ''

    if (previewRow.content) return previewRow.content

    return JSON.stringify(
      {
        key: previewRow.key,
        label: previewRow.label,
        bytes: previewRow.bytes,
        role: roleTextMap[previewRow.role] || previewRow.role,
        included: previewRow.included,
        compressible: previewRow.compressible,
        lines: previewRow.lines,
        childrenCount: previewRow.children?.length || 0,
      },
      null,
      2,
    )
  }, [previewRow])

  return (
    <>
      <Table
        className={styles['context-table']}
        columns={columns}
        dataSource={data}
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
      <Modal
        title={previewRow?.label || '详情'}
        visible={!!previewRow}
        footer={null}
        width={720}
        centered
        zIndex={4000}
        onCancel={() => setPreviewRow(null)}
      >
        <pre className={styles['preview-content']}>{previewContent}</pre>
      </Modal>
    </>
  )
}

export default ContextTable
