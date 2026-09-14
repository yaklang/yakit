import type { FC } from 'react'
import { Tooltip } from 'antd'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import {
  ChevronsDownUpOutlined,
  ChevronsUpDownOutlined,
  ListTodoOutlined,
  List1Outlined,
  RefreshOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'

import { AIHistoryContinueTask, AIHistorySkipTask } from '../../../chatTemplate/historyTaskTree/HistoryTaskTree'
import { openAIConcurrentStream } from '@/utils/openWebsite'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from '../ConcurrentStreamCard.module.scss'
import { useCurrentRawData } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useCreation, useMemoizedFn } from 'ahooks'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import { getTaskName } from '../concurrentStream/buildConcurrentStreamFramePayload'

/** 卡片标题栏右侧操作区 */
interface ConcurrentStreamCardActionsProps {
  expand: boolean
  onExpandToggle: () => void
  onDetails?: () => void
  token: string
  showContinueTask: boolean
  showCancelTask: boolean
  showRerun?: boolean
  showDetails: boolean
  coordinatorId?: string
  taskId?: string | null
  onRerun?: () => void
}

const ConcurrentStreamCardActions: FC<ConcurrentStreamCardActionsProps> = ({
  expand,
  onExpandToggle,
  onDetails,
  showContinueTask,
  showCancelTask,
  showRerun,
  showDetails,
  coordinatorId,
  taskId,
  token,
  onRerun,
}) => {
  const { t } = useI18nNamespaces(['aiAgent'])

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
    if (!chatType) return
    // 开窗只传轻量元数据
    // 只传基础类型数据
    openAIConcurrentStream({
      token,
      session,
      chatType,
      rootType: rawData.contents.get(token)?.type,
      taskName: getTaskName(rawData, token),
    })
  })

  return (
    <>
      {showContinueTask && coordinatorId != null && !!taskId && (
        <AIHistoryContinueTask coordinatorId={coordinatorId} taskId={taskId} />
      )}
      {showCancelTask && !!taskId && <AIHistorySkipTask taskId={taskId} isTask={chatType === 'task'} />}
      {showDetails && (
        <Tooltip title="任务详情" placement="top">
          <YakitButton size="small" icon={<ListTodoOutlined color="currentColor" />} type="text2" onClick={onDetails} />
        </Tooltip>
      )}
      {showRerun && (
        <Tooltip title={t('ConcurrentStreamCard.rerun')}>
          <YakitButton
            size="small"
            type="text"
            icon={<RefreshOutlined color="currentColor" />}
            onClick={(e) => {
              e.stopPropagation()
              onRerun?.()
            }}
            className={styles['expand-btn']}
          />
        </Tooltip>
      )}
      <Tooltip title={t('ConcurrentStreamCard.openInNewWindow')}>
        <YakitButton
          size="small"
          type="text"
          icon={<List1Outlined color="currentColor" />}
          onClick={openChildWindow}
          className={styles['expand-btn']}
        />
      </Tooltip>
      <Tooltip title={expand ? t('ConcurrentStreamCard.collapse') : t('ConcurrentStreamCard.expand')}>
        <YakitButton
          size="small"
          type="text"
          icon={
            expand ? <ChevronsDownUpOutlined color="currentColor" /> : <ChevronsUpDownOutlined color="currentColor" />
          }
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
