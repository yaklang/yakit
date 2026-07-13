import { FC, memo, useMemo } from 'react'
import ModalInfo from '../../ModelInfo'
import ConcurrentStreamCardActions from '../ConcurrentStreamCardActions/ConcurrentStreamCardActions'
import type { ConcurrentStreamCardHeardProps } from './type'
import styles from './ConcurrentStreamCardHeard.module.scss'
import { getAIStatusPresentation } from '@/pages/ai-agent/utils/AIStatusUtils'
import { AITaskStatus } from '@/pages/ai-re-act/hooks/grpcApi'
import useCreation from 'ahooks/lib/useCreation'

const ConcurrentStreamCardHeard: FC<ConcurrentStreamCardHeardProps> = memo((props) => {
  const { token, isChildWindow, onClickTitle, rowData, coordinatorId, expand, expandToggle } = props

  const titleText = useMemo(() => {
    return rowData?.data?.taskName || ''
  }, [rowData?.data?.taskName])

  const presentation = useMemo(() => getAIStatusPresentation(rowData?.data?.status), [rowData?.data?.status])

  const showContinueTask = useCreation(() => {
    return !!rowData && !!coordinatorId && !!rowData?.data?.taskId && !isChildWindow
  }, [rowData?.data, coordinatorId])

  const showCancelTask = useCreation(() => {
    return rowData?.data?.status === 'processing' && !!rowData?.data?.taskId && !isChildWindow
  }, [rowData?.data])

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

  return (
    <div className={styles['chat-card-title']} onClick={onClickTitle}>
      <div className={styles['chat-card-title-left']}>
        {presentation.icon && <div className={styles['chat-card-title-icon']}>{presentation.icon}</div>}
        <div className={styles['chat-card-title-text']}>{titleText}</div>
        <div className={styles['chat-card-title-extra']}>{modalInfo && <ModalInfo {...modalInfo} />}</div>
      </div>
      <div className={styles['chat-card-title-more']}>
        <ConcurrentStreamCardActions
          token={token}
          isChildWindow={isChildWindow}
          expand={expand}
          onExpandToggle={expandToggle}
          showContinueTask={showContinueTask}
          showCancelTask={showCancelTask}
          showDetails={showDetails}
          coordinatorId={coordinatorId}
          taskId={rowData?.data?.taskId}
        />
      </div>
    </div>
  )
})

export default ConcurrentStreamCardHeard
