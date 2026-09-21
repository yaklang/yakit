import type { FC } from 'react'
import { Tooltip } from 'antd'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import {
  OutlineChevronsDownUpIcon,
  OutlineChevronsUpDownIcon,
  OutlineListOneIcon,
  OutlineListTodoIcon,
} from '@/assets/icon/outline'
import { AIHistoryContinueTask, AIHistorySkipTask } from '../../../chatTemplate/historyTaskTree/HistoryTaskTree'
import { openAIConcurrentStream } from '@/utils/openWebsite'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from '../ConcurrentStreamCard.module.scss'
import { useCurrentRawData } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useMemoizedFn } from 'ahooks'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import { getTaskName } from '../concurrentStream/buildConcurrentStreamFramePayload'
import type { ChatListRenderType } from '@/pages/ai-re-act/hooks/aiRender'

/** 卡片标题栏右侧操作区 */
interface ConcurrentStreamCardActionsProps {
  expand: boolean
  onExpandToggle: () => void
  onDetails?: () => void
  token: string
  showContinueTask: boolean
  showCancelTask: boolean
  showDetails: boolean
  coordinatorId?: string
  taskId?: string | null
  chatType?: ChatListRenderType
}

const ConcurrentStreamCardActions: FC<ConcurrentStreamCardActionsProps> = ({
  expand,
  onExpandToggle,
  onDetails,
  showContinueTask,
  showCancelTask,
  showDetails,
  coordinatorId,
  taskId,
  token,
  chatType,
}) => {
  const { t } = useI18nNamespaces(['aiAgent'])

  const session = useCurrentSessionId()
  const rawData = useCurrentRawData()

  const openChildWindow = useMemoizedFn((e) => {
    e?.stopPropagation()
    // 点击时实时读取，避免挂载时 contents 未就绪导致 chatType 永久为空
    const itemData = rawData?.contents.get(token)
    const resolvedChatType = itemData?.chatType || chatType
    if (!resolvedChatType) return
    // 开窗只传轻量元数据，子窗再 fetch contents
    openAIConcurrentStream({
      token,
      session,
      chatType: resolvedChatType,
      rootType: itemData?.type,
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
