import { useCreation } from 'ahooks'
import classNames from 'classnames'
import { type FC, memo } from 'react'
import styles from './AIChildWindowTaskDefaultGroupCard.module.scss'
import useAIConcurrentStreamStore from '@/auxWindow/pages/AIConcurrentStream/useContext/useStore'
import useAIConcurrentStreamDispatcher from '@/auxWindow/pages/AIConcurrentStream/useContext/useDispatcher'
import type { AIChildWindowTaskDefaultGroupCardProps } from './type'
import AIChildWindowTaskDefaultGroupCardHeard from './aiChildWindowTaskDefaultGroupCardHeard/AIChildWindowTaskDefaultGroupCardHeard'
import AIChildWindowConcurrentStreamContent from '../aiChildWindowConcurrentStreamContent/AIChildWindowConcurrentStreamContent'

const AIChildWindowTaskDefaultGroupCard: FC<AIChildWindowTaskDefaultGroupCardProps> = memo((props) => {
  const { token } = props

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
      <AIChildWindowTaskDefaultGroupCardHeard timeStamp={timeStamp} onRefresh={requestRefresh} />

      <AIChildWindowConcurrentStreamContent />
    </div>
  )
})

export default AIChildWindowTaskDefaultGroupCard
