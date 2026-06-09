import React from 'react'
import { Skeleton } from 'antd'
import styles from './ConcurrentStreamSkeleton.module.scss'

export type ConcurrentStreamSkeletonVariant = 'page' | 'card' | 'content'

interface ConcurrentStreamSkeletonProps {
  /** page: 整页；card: 任务卡片 + 消息列表；content: 仅消息列表 */
  variant?: ConcurrentStreamSkeletonVariant
  messageCount?: number
}

const MessageSkeleton: React.FC = () => (
  <div className={styles['message-card']}>
    <Skeleton
      active
      avatar={{ size: 16, shape: 'circle' }}
      title={{ width: '36%' }}
      paragraph={{ rows: 2, width: ['92%', '64%'] }}
    />
  </div>
)

const MessageList: React.FC<{ count: number }> = ({ count }) => (
  <div className={styles['message-list']}>
    {Array.from({ length: count }).map((_, i) => (
      <MessageSkeleton key={i} />
    ))}
  </div>
)

const TaskCardSkeleton: React.FC<{ messageCount: number }> = ({ messageCount }) => (
  <div className={styles.card}>
    <Skeleton active avatar={{ size: 16, shape: 'circle' }} title={{ width: '30%' }} paragraph={false} />
    <Skeleton active title={false} paragraph={{ rows: 1, width: '72%' }} className={styles.goal} />
    <div className={styles['content-box']}>
      <MessageList count={messageCount} />
    </div>
  </div>
)

const ConcurrentStreamSkeleton: React.FC<ConcurrentStreamSkeletonProps> = ({ variant = 'page', messageCount = 3 }) => {
  if (variant === 'content') {
    return (
      <div className={styles['content-only']}>
        <MessageList count={messageCount} />
      </div>
    )
  }

  if (variant === 'card') {
    return <TaskCardSkeleton messageCount={messageCount} />
  }

  return (
    <div className={styles.page}>
      <div className={styles.divider} />
      <div className={styles.wrapper}>
        <TaskCardSkeleton messageCount={messageCount} />
      </div>
    </div>
  )
}

export default ConcurrentStreamSkeleton
