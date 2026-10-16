import React from 'react'
import classNames from 'classnames'
import { useStore } from 'zustand'
import { useCreation, useMemoizedFn } from 'ahooks'
import { ChevronDownOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import { type AIAgentGrpcApi, type AIInputEvent, AIInputEventSyncTypeEnum } from '@/pages/ai-re-act/hooks/grpcApi'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import { useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import useAIAgentDispatcher from '../../../useContext/useDispatcher'
import { randomString } from '@/utils/randomUtil'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './AITaskSelectDropdown.module.scss'

export interface AITaskSelectDropdownProps {
  /** 详情页初始任务 id（props.taskId） */
  taskId: string
  taskName?: string
  value: string
  onChange: (taskId: string) => void
  /** 当前选中任务详情 uuid，用于 map 兜底列表刷新 */
  taskDataUuid?: string
}

const truncateTaskLabel = (value: string, max = 32) => {
  const text = (value || '').trim()
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

/** react-{x}-{ksuid8} → x；否则原样（见 yaklang re-act_free_input.go） */
const toTaskDisplayName = (value: string) => {
  const text = (value || '').trim()
  const matched = text.match(/^react-(.+)-[A-Za-z0-9]{8}$/)
  return matched ? matched[1] : text
}

/** 任务执行详情标题旁：会话任务列表下拉，切换时发 task_snapshot_sync */
export const AITaskSelectDropdown: React.FC<AITaskSelectDropdownProps> = React.memo((props) => {
  const { taskId, taskName, value, onChange, taskDataUuid } = props
  const { t, i18nRefresh } = useI18nNamespaces(['aiAgent'])
  const store = useCurrentStore()
  const sessionTaskList = useStore(store, (state) => state.sessionTaskList)
  const rawData = useCurrentRawData()
  const sessionId = useCurrentSessionId()
  const { onSend } = useAIAgentDispatcher()

  const taskOptions = useCreation(() => {
    if (sessionTaskList.length > 0) {
      return sessionTaskList.map((item) => ({
        ...item,
        task_name: toTaskDisplayName(item.task_name || item.task_id),
      }))
    }
    const fallback: AIAgentGrpcApi.SessionSnapshotTaskSummary[] = []
    for (const [id, detail] of rawData.taskDetailsMap) {
      // map 兜底：当前详情初始任务优先用 props.taskName（父级标题）
      const nameFromProps = id === taskId ? taskName : undefined
      fallback.push({
        task_id: id,
        task_name: toTaskDisplayName(nameFromProps || detail.execution?.task_name || id),
        attempt: 1,
        status: detail.execution?.status || '',
        is_final: false,
        updated_at: 0,
      })
    }
    if (value && !fallback.some((item) => item.task_id === value)) {
      const fallbackName = value === taskId ? taskName || value : value
      fallback.unshift({
        task_id: value,
        task_name: toTaskDisplayName(fallbackName),
        attempt: 1,
        status: '',
        is_final: false,
        updated_at: 0,
      })
    }
    return fallback
  }, [sessionTaskList, value, taskId, taskName, taskDataUuid])

  const currentTaskFullLabel = useCreation(() => {
    const found = taskOptions.find((item) => item.task_id === value)
    // 优先列表项名称（与菜单选中一致）；props.taskName 仅列表未命中时兜底
    const label =
      found?.task_name || (value === taskId ? taskName : undefined) || toTaskDisplayName(value || taskName || '')
    return (label || t('AITaskExecutionDetails.noTasks')).trim()
  }, [taskOptions, value, taskId, taskName, i18nRefresh])

  const currentTaskLabel = useCreation(() => truncateTaskLabel(currentTaskFullLabel), [currentTaskFullLabel])

  const requestTaskSnapshot = useMemoizedFn((id: string): boolean => {
    if (!id || !sessionId) return false
    const info: AIInputEvent = {
      IsSyncMessage: true,
      SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_TASK_SNAPSHOT,
      SyncID: randomString(8),
      SyncJsonInput: JSON.stringify({ task_id: id }),
    }
    // 历史加载等场景 handleSendMessage 会静默 return false
    return onSend({ token: sessionId, type: '', params: info }) !== false
  })

  const onSelectTask = useMemoizedFn(({ key }: { key: string }) => {
    if (!key || key === value) return
    // 先发请求：失败则保留原选中，避免切过去却无快照且同 key 无法重试
    if (!requestTaskSnapshot(key)) return
    onChange(key)
  })

  const taskMenu = useCreation(
    () => ({
      data: taskOptions.map((item) => ({
        key: item.task_id,
        // 菜单展示全文，截断仅用于触发器视觉宽度
        label: item.task_name || toTaskDisplayName(item.task_id),
      })),
      selectedKeys: value ? [value] : [],
      onClick: onSelectTask,
    }),
    [taskOptions, value, onSelectTask],
  )

  return (
    <YakitDropdownMenu
      menu={taskMenu}
      dropdown={{
        trigger: ['click'],
        placement: 'bottomLeft',
        disabled: taskOptions.length === 0,
      }}
    >
      <div
        className={classNames(styles['header-task-select'], {
          [styles['header-task-select-disabled']]: taskOptions.length === 0,
        })}
        title={currentTaskFullLabel}
        aria-label={t('AITaskExecutionDetails.selectTask')}
      >
        <span className={styles['header-task-select-label']}>{currentTaskLabel}</span>
        <ChevronDownOutlined className={styles['header-task-select-icon']} color="currentColor" size={14} />
      </div>
    </YakitDropdownMenu>
  )
})
