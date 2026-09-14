import { type FC, memo, useMemo } from 'react'
import ModalInfo from '../../ModelInfo'
import ConcurrentStreamCardActions from '../ConcurrentStreamCardActions/ConcurrentStreamCardActions'
import type { ConcurrentStreamCardHeardProps } from './type'
import styles from './ConcurrentStreamCardHeard.module.scss'
import { getAIStatusPresentation } from '@/pages/ai-agent/utils/AIStatusUtils'
import { AIInputEventSyncTypeEnum, AITaskStatus } from '@/pages/ai-re-act/hooks/grpcApi'
import { yakitNotify } from '@/utils/notification'
import emiter from '@/utils/eventBus/eventBus'
import { ScrollText } from '@/pages/ai-agent/chatTemplate/TaskLoading/TaskLoading'
import Loading from '@/components/Loading/Loading'
import { useCreation, useMemoizedFn } from 'ahooks'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import { randomString } from '@/utils/randomUtil'
import type { AIInputEvent } from '@/pages/ai-re-act/hooks/grpcApi'

const ConcurrentStreamCardHeard: FC<ConcurrentStreamCardHeardProps> = memo((props) => {
  const { token, isChildWindow, onClickTitle, rowData, coordinatorId, expand, expandToggle, onRefresh } = props

  const { onSend } = useAIAgentDispatcher()
  const sessionId = useCurrentSessionId()

  const titleText = useMemo(() => {
    return rowData?.data?.taskName || ''
  }, [rowData?.data?.taskName])

  const presentation = useMemo(() => getAIStatusPresentation(rowData?.data?.status), [rowData?.data?.status])

  const showContinueTask = useCreation(() => {
    return !!rowData && rowData.chatType === 'task' && !!coordinatorId && !!rowData?.data?.taskId && !isChildWindow
  }, [rowData?.data?.taskId])

  const showCancelTask = useCreation(() => {
    return rowData?.data?.status === 'processing' && !!rowData?.data?.taskId && !isChildWindow
  }, [rowData?.data?.status])

  const showRerun = useCreation(() => {
    if (!rowData?.data?.taskId || !rowData?.data?.goal) return false
    if (isChildWindow) return false
    const status = rowData?.data?.status
    return (
      status === AITaskStatus.success ||
      status === AITaskStatus.error ||
      status === AITaskStatus.cancel ||
      status === AITaskStatus.skipped
    )
  }, [rowData?.data?.status, rowData?.data?.taskId, rowData?.data?.goal, isChildWindow])

  const onRerun = useMemoizedFn(() => {
    if (!rowData?.data?.taskId) return
    const info: AIInputEvent = {
      IsSyncMessage: true,
      SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REDO_SUBTASK_IN_PLAN,
      SyncJsonInput: JSON.stringify({ subtask_id: rowData.data.taskId }),
      SyncID: randomString(8),
    }
    onSend({ token: sessionId, type: 'task', params: info })
    yakitNotify('info', `任务 ${rowData.data.taskName || rowData.data.taskId} 已重新运行`)
  })

  const modalInfo = useMemo(() => {
    if (!rowData) return undefined
    return { time: rowData.Timestamp, title: rowData.AIModelName, icon: rowData.AIService }
  }, [rowData?.Timestamp, rowData?.AIModelName, rowData?.AIService])

  const showDetails = useMemo(() => {
    if (isChildWindow) return false
    if (!rowData) return false
    const status = rowData?.data?.status
    return status === AITaskStatus.created || status === AITaskStatus.inProgress
  }, [rowData?.data?.status])

  const onDetails = useMemoizedFn(() => {
    if (!rowData) return
    const { data } = rowData
    if (!data.taskId) {
      yakitNotify('error', 'taskId为空')
      return
    }
    emiter.emit(
      'actionAITaskContentTab',
      JSON.stringify({
        type: 'add',
        params: {
          key: data.taskId,
          label: data.taskName || '',
          goal: data.goal,
        },
      }),
    )
  })

  return (
    <div className={styles['chat-card-title']} onClick={onClickTitle}>
      <div className={styles['chat-card-title-left']}>
        {presentation.icon && <div className={styles['chat-card-title-icon']}>{presentation.icon}</div>}
        <div className={styles['chat-card-title-text-wrapper']}>
          <div className={styles['chat-card-title-text']}>{titleText}</div>
          {rowData?.data?.status === AITaskStatus.inProgress && (
            <Loading size={12} className={styles['loading-subtitle']}>
              <ScrollText text={rowData?.data.loadingTitle} />
            </Loading>
          )}
        </div>
        <div className={styles['chat-card-title-extra']}>{modalInfo && <ModalInfo {...modalInfo} />}</div>
      </div>
      <div className={styles['chat-card-title-more']}>
        <ConcurrentStreamCardActions
          token={token}
          expand={expand}
          onExpandToggle={expandToggle}
          showContinueTask={showContinueTask}
          showCancelTask={showCancelTask}
          showRerun={showRerun}
          showDetails={showDetails}
          coordinatorId={coordinatorId}
          taskId={rowData?.data?.taskId}
          onDetails={onDetails}
          onRerun={onRerun}
        />
      </div>
    </div>
  )
})

export default ConcurrentStreamCardHeard
