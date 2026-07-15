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
import type { OpenAIConcurrentStreamPayload } from '@/utils/openWebsite'
import { openAIConcurrentStream } from '@/utils/openWebsite'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from '../ConcurrentStreamCard.module.scss'

/** 卡片标题栏右侧操作区 */
interface ConcurrentStreamCardActionsProps {
  isChildWindow?: boolean
  expand: boolean
  onExpandToggle: () => void
  onRefresh?: () => void
  onDetails?: () => void
  framePayload: OpenAIConcurrentStreamPayload
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
  framePayload,
  showContinueTask,
  showCancelTask,
  showDetails,
  coordinatorId,
  taskId,
}) => {
  const { t } = useI18nNamespaces(['aiAgent'])

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
      {showContinueTask && coordinatorId != null && taskId != null && (
        <AIHistoryContinueTask coordinatorId={coordinatorId} taskId={taskId} />
      )}
      {showCancelTask && taskId != null && (
        <AIHistorySkipTask taskId={taskId} isTask={framePayload.chatType === 'task'} />
      )}
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
          onClick={(e) => {
            e.stopPropagation()
            openAIConcurrentStream(framePayload)
          }}
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
