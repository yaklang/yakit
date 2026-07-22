import type { FC } from 'react'
import { Tooltip } from 'antd'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import {
  OutlineChevronsDownUpIcon,
  OutlineChevronsUpDownIcon,
  OutlineListOneIcon,
  OutlineListTodoIcon,
  OutlineRefreshIcon,
} from '@/assets/icon/outline'
import { AIHistoryContinueTask, AIHistorySkipTask } from '../../../chatTemplate/historyTaskTree/HistoryTaskTree'
import { openAIConcurrentStream } from '@/utils/openWebsite'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from '../ConcurrentStreamCard.module.scss'
import { useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useCreation, useMemoizedFn } from 'ahooks'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import { buildConcurrentStreamFramePayload } from '../concurrentStream/buildConcurrentStreamFramePayload'

/** 卡片标题栏右侧操作区 */
interface ConcurrentStreamCardActionsProps {
  isChildWindow?: boolean
  expand: boolean
  onExpandToggle: () => void
  onRefresh?: () => void
  onDetails?: () => void

  token: string

  showContinueTask: boolean
  showCancelTask: boolean
  showDetails: boolean
  coordinatorId?: string
  taskId?: string | null
}

const ConcurrentStreamCardActions: FC<ConcurrentStreamCardActionsProps> = ({
  isChildWindow,
  expand,
  onExpandToggle,
  onRefresh,
  onDetails,
  showContinueTask,
  showCancelTask,
  showDetails,
  coordinatorId,
  taskId,
  token,
}) => {
  const { t } = useI18nNamespaces(['aiAgent'])

  const store = useCurrentStore()
  const session = useCurrentSessionId()
  const rawData = useCurrentRawData()
  const chatType = useCreation(() => {
    if (!rawData) return
    const itemData = rawData.contents.get(token)
    if (!itemData) return
    return itemData.chatType
  }, [])

  const openChildWindow = useMemoizedFn((e) => {
    e?.stopPropagation()
    // 开窗只传轻量元数据（rawData 为空 Map），rawData 由子窗 mount 后再拉取，避免开窗瞬间克隆大 Map
    const framePayload = buildConcurrentStreamFramePayload({
      token,
      session,
      chatType,
      store,
      rawData,
      withRawData: false,
    })
    if (framePayload) {
      openAIConcurrentStream(framePayload)
    }
  })

  if (isChildWindow) {
    return (
      <Tooltip title={t('ConcurrentStreamCard.refresh')}>
        <YakitButton
          size="middle"
          type="text"
          icon={<OutlineRefreshIcon />}
          onClick={onRefresh}
          className={styles['expand-btn']}
        />
      </Tooltip>
    )
  }
  return (
    <>
      {showContinueTask && coordinatorId != null && !!taskId && (
        <AIHistoryContinueTask coordinatorId={coordinatorId} taskId={taskId} />
      )}
      {showCancelTask && !!taskId && <AIHistorySkipTask taskId={taskId} isTask={chatType === 'task'} />}
      {showDetails && (
        <Tooltip title="任务详情" placement="top">
          <YakitButton size="small" icon={<OutlineListTodoIcon />} type="text2" onClick={onDetails} />
        </Tooltip>
      )}
      <Tooltip title={t('ConcurrentStreamCard.openInNewWindow')}>
        <YakitButton
          size="small"
          type="text"
          icon={<OutlineListOneIcon />}
          onClick={openChildWindow}
          className={styles['expand-btn']}
        />
      </Tooltip>
      <Tooltip title={expand ? t('ConcurrentStreamCard.collapse') : t('ConcurrentStreamCard.expand')}>
        <YakitButton
          size="small"
          type="text"
          icon={expand ? <OutlineChevronsDownUpIcon /> : <OutlineChevronsUpDownIcon />}
          onClick={(e) => {
            e.stopPropagation()
            onExpandToggle()
          }}
          className={styles['expand-btn']}
        />
      </Tooltip>
    </>
  )
}

export default ConcurrentStreamCardActions
