import React from 'react'
import classNames from 'classnames'
import { AIToDoListStatusEnum } from '@/pages/ai-agent/defaultConstant'
import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import useChatIPCDispatcher from '@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher'
import useChatIPCStore from '@/pages/ai-agent/useContext/ChatIPCContent/useStore'
import { formatTaskTimestamp, getDigitalEmployeeTaskProgress } from './taskProgress'
import styles from './DigitalEmployeeTaskProgress.module.scss'

const statusLabel: Record<AIToDoListStatusEnum, string> = {
  [AIToDoListStatusEnum.Pending]: '待执行',
  [AIToDoListStatusEnum.Doing]: '正在执行',
  [AIToDoListStatusEnum.Done]: '已完成',
  [AIToDoListStatusEnum.Deleted]: '已删除',
  [AIToDoListStatusEnum.Skipped]: '已跳过',
}

export const DigitalEmployeeTaskProgress: React.FC = React.memo(() => {
  const { activeChat } = useAIAgentStore()
  const { chatIPCEvents } = useChatIPCDispatcher()
  const {
    chatIPCData: { casualChat },
  } = useChatIPCStore()
  const planDetails = chatIPCEvents.fetchChatDataStore()?.get(activeChat?.SessionID || '')?.casualChat.planDetails
  const progress = getDigitalEmployeeTaskProgress(planDetails?.todoList)

  // toolListRenderNumber 是原版 todo 更新后的渲染信号；读取它保证计划原地更新时这里同步刷新。
  void casualChat.toolListRenderNumber

  if (!progress.total) {
    return (
      <div className={styles['empty']}>
        <span aria-hidden="true" />
        <strong>等待执行步骤</strong>
        <p>当前任务暂未生成执行步骤，任务开始后会在这里实时同步。</p>
      </div>
    )
  }

  return (
    <div className={styles['progress-panel']}>
      <div className={styles['progress-summary']}>
        <div>
          <strong>任务进度</strong>
          <span>
            {progress.completed} / {progress.total}
          </span>
        </div>
        <b>{progress.percent}%</b>
      </div>
      <div
        className={styles['progress-track']}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-valuenow={progress.completed}
      >
        <span style={{ width: `${progress.percent}%` }} />
      </div>
      <div className={styles['step-list']}>
        {progress.items.map((item) => {
          const doing = item.status === AIToDoListStatusEnum.Doing
          const done = item.status === AIToDoListStatusEnum.Done
          const skipped = item.status === AIToDoListStatusEnum.Skipped
          const updatedAt = item.updated_at || item.created_at
          const timeText = formatTaskTimestamp(updatedAt)
          return (
            <div
              key={item.id}
              aria-label={`${item.content}，${statusLabel[item.status]}`}
              className={classNames(styles['step'], {
                [styles['step-doing']]: doing,
                [styles['step-done']]: done,
                [styles['step-skipped']]: skipped,
              })}
            >
              <span className={styles['step-marker']} aria-hidden="true">
                {done ? '✓' : ''}
              </span>
              <div>
                <strong>{item.content}</strong>
                {!!timeText && (
                  <small>
                    {item.updated_at ? '更新于' : '创建于'} {timeText}
                  </small>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})
