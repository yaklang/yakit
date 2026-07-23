import classNames from 'classnames'
import { type FC, memo } from 'react'
import ConcurrentStreamCardHeard from '../concurrentStreamCardHeard/ConcurrentStreamCardHeard'
import styles from './AIChildWindowConcurrentStreamCard.module.scss'
import { type ChatTaskNodeGroup } from '@/pages/ai-re-act/hooks/aiRender'
import useAIConcurrentStreamStore from '@/auxWindow/pages/AIConcurrentStream/useContext/useStore'
import useAIConcurrentStreamDispatcher from '@/auxWindow/pages/AIConcurrentStream/useContext/useDispatcher'
import useBoolean from 'ahooks/lib/useBoolean'
import useCreation from 'ahooks/lib/useCreation'
import AIChildWindowConcurrentStreamContent from '../../aiChildWindowItem/aiChildWindowConcurrentStreamContent/AIChildWindowConcurrentStreamContent'

export interface AIChildWindowConcurrentStreamCardProps {
  token: string
}

/** 子窗口版并发流卡片（task_node_group 类型），数据从 auxWindow context 读取 */
const AIChildWindowConcurrentStreamCard: FC<AIChildWindowConcurrentStreamCardProps> = memo((props) => {
  const { token } = props
  const [expand, { toggle: expandToggle }] = useBoolean(true)

  const { rawData, renderNum } = useAIConcurrentStreamStore()
  const { requestRefresh } = useAIConcurrentStreamDispatcher()

  const itemData = useCreation<ChatTaskNodeGroup | undefined>(() => {
    if (!rawData) return undefined
    const itemData = rawData.get(token)
    if (!itemData) return undefined
    return itemData as ChatTaskNodeGroup
  }, [renderNum])

  return (
    <div className={classNames(styles['chat-card'], styles['child-chat-card'], 'concurrent-stream-card')}>
      <ConcurrentStreamCardHeard
        isChildWindow={true}
        expand={expand}
        expandToggle={expandToggle}
        rowData={itemData}
        token={token}
        onRefresh={requestRefresh}
      />
      {expand ? (
        <>
          <div className={styles['goal']}>{itemData?.data.goal}</div>
          <AIChildWindowConcurrentStreamContent />
        </>
      ) : null}
    </div>
  )
})

export default AIChildWindowConcurrentStreamCard
