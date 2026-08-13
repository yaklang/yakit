import Loading from '@/components/Loading/Loading'
import { type FC, memo, useEffect, useRef, useState } from 'react'
import styles from './TaskLoading.module.scss'
import useAISystemStream from '@/pages/ai-re-act/hooks/useAISystemStream'
import { useAISystemStreamText } from '@/store/aiSystemStream'
import classNames from 'classnames'
import { useStore } from 'zustand'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { AITaskStatus } from '@/pages/ai-re-act/hooks/grpcApi'

export const ScrollText: FC<{ text?: string }> = ({ text = '' }) => {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const [animationDuration, setAnimationDuration] = useState(10)

  useEffect(() => {
    if (!wrapperRef.current || !textRef.current) return
    const wrapperWidth = wrapperRef.current.offsetWidth
    const textWidth = textRef.current.offsetWidth

    if (textWidth <= wrapperWidth) {
      setAnimationDuration(0)
    } else {
      setAnimationDuration((textWidth + wrapperWidth) * 0.02)
    }
  }, [text])

  if (!text) return null

  return (
    <div ref={wrapperRef} className={styles.scrollWrapper}>
      <div
        ref={textRef}
        className={styles.scrollText}
        style={{
          animationDuration: `${animationDuration}s`,
        }}
      >
        {text}
        {animationDuration > 0 && <>&nbsp;&nbsp;&nbsp;{text}</>}
      </div>
    </div>
  )
}
/**@deprecated */
const TaskLoading: FC<{
  className?: string
}> = ({ className }) => {
  const store = useCurrentStore()
  const planTitle = useStore(store, (state) => state.currentLoadingTitle.planTitle)
  const taskTitle = useStore(store, (state) => state.currentLoadingTitle.taskTitle)
  const isRunning = useStore(store, (state) => state.currentChatStatus.status === AITaskStatus.inProgress)
  const systemStream = useAISystemStreamText()
  const { displayValue, mode } = useAISystemStream({
    value: taskTitle,
    systemStream,
  })
  return (
    <div className={classNames(styles['task-loading'], className)}>
      {isRunning && (
        <>
          <Loading
            size={16}
            style={{
              marginTop: 8,
            }}
          >
            <div className={styles['plan-text']}>{planTitle}</div>
          </Loading>
          <div className={styles['task-text']}>
            {mode === 'value' ? displayValue : <ScrollText text={displayValue as string} />}
          </div>
        </>
      )}
    </div>
  )
}
export default memo(TaskLoading)
