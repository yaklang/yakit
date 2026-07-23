import { useBoolean, useCreation } from 'ahooks'
import classNames from 'classnames'
import { type FC, memo } from 'react'
import AITaskDefaultGroupCardHeard from '../../AITaskDefaultGroupCard/aiTaskDefaultGroupCardHeard/AITaskDefaultGroupCardHeard'
import styles from './AIChildWindowTaskDefaultGroupCard.module.scss'
import useAIConcurrentStreamStore from '@/auxWindow/pages/AIConcurrentStream/useContext/useStore'
import useAIConcurrentStreamDispatcher from '@/auxWindow/pages/AIConcurrentStream/useContext/useDispatcher'
import AIChildWindowConcurrentStreamContent from '../aiChildWindowConcurrentStreamContent/AIChildWindowConcurrentStreamContent'
import type { AIChildWindowTaskDefaultGroupCardProps } from './type'

const AIChildWindowTaskDefaultGroupCard: FC<AIChildWindowTaskDefaultGroupCardProps> = memo((props) => {
  const { token } = props
  const [expand, { toggle: expandToggle }] = useBoolean(true)

  const { rawData, renderNum } = useAIConcurrentStreamStore()
  const { requestRefresh } = useAIConcurrentStreamDispatcher()
  const timeStamp = useCreation(() => {
    if (!rawData) return 0
    const itemData = rawData.get(token)
    if (!itemData) return 0
    return itemData.Timestamp || 0
  }, [renderNum])

  return (
    <div
      className={classNames(styles['ai-task-default-group-card'], {
        [styles['child-window-card']]: true,
      })}
    >
      <AITaskDefaultGroupCardHeard
        isChildWindow={true}
        expandToggle={expandToggle}
        timeStamp={timeStamp}
        expand={expand}
        token={token}
        onRefresh={requestRefresh}
      />

      {expand ? <AIChildWindowConcurrentStreamContent /> : null}
    </div>
  )
})

export default AIChildWindowTaskDefaultGroupCard
