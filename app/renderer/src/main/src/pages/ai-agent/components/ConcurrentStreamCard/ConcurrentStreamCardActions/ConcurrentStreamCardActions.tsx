import type { FC } from 'react'
import { Tooltip } from 'antd'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import {
  OutlineChevronsDownUpIcon,
  OutlineChevronsUpDownIcon,
  OutlineListOneIcon,
  OutlineRefreshIcon,
} from '@/assets/icon/outline'
import { AIHistoryContinueTask, AIHistorySkipTask } from '../../../chatTemplate/historyTaskTree/HistoryTaskTree'
import type { OpenAIConcurrentStreamPayload } from '@/utils/openWebsite'
import { openAIConcurrentStream } from '@/utils/openWebsite'
import styles from '../ConcurrentStreamCard.module.scss'

/** 卡片标题栏右侧操作区 */
interface ConcurrentStreamCardActionsProps {
  isChildWindow?: boolean
  expand: boolean
  onExpandToggle: () => void
  onRefresh?: () => void
  framePayload: OpenAIConcurrentStreamPayload
  showContinueTask: boolean
  showCancelTask: boolean
  coordinatorId?: string
  taskIndex?: string | null
}

const ConcurrentStreamCardActions: FC<ConcurrentStreamCardActionsProps> = ({
  isChildWindow,
  expand,
  onExpandToggle,
  onRefresh,
  framePayload,
  showContinueTask,
  showCancelTask,
  coordinatorId,
  taskIndex,
}) => {
  if (isChildWindow) {
    return (
      <Tooltip title="刷新">
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
      {showContinueTask && coordinatorId != null && taskIndex != null && (
        <AIHistoryContinueTask coordinatorId={coordinatorId} taskIndex={taskIndex} />
      )}
      {showCancelTask && taskIndex != null && <AIHistorySkipTask taskIndex={taskIndex} />}
      <Tooltip title="新窗口打开">
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
      <Tooltip title={expand ? '收起' : '展开'}>
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
