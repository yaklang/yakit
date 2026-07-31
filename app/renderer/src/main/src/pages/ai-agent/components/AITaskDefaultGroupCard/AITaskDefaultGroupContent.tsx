import useClickFocus from '@/pages/ai-re-act/hooks/useClickFocus'
import { type FC, useEffect, useLayoutEffect } from 'react'
import classNames from 'classnames'
import styles from './AITaskDefaultGroupCard.module.scss'
import ConcurrentStreamContent from '../ConcurrentStreamCard/ConcurrentStreamContent/ConcurrentStreamContent'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useStore } from 'zustand'

const AITaskDefaultGroupContent: FC<{
  token: string
  onContentFocusChange?: (focused: boolean) => void
}> = ({ token, onContentFocusChange }) => {
  const store = useCurrentStore()
  const childrenTokens = useStore(store, (state) => state.tasks[token]?.childrenTokens || [])
  const { ref: contentRef, isFocus } = useClickFocus<HTMLDivElement>()

  useEffect(() => {
    onContentFocusChange?.(isFocus)
  }, [isFocus, onContentFocusChange])

  /** 外层滚动容器挂载后补一次置底，避免子组件 effect 早于布局收敛 */
  useLayoutEffect(() => {
    const el = contentRef.current
    if (!el) return

    const scrollToBottom = () => {
      el.scrollTop = el.scrollHeight
    }

    scrollToBottom()
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(scrollToBottom)
    })
    return () => cancelAnimationFrame(rafId)
  }, [contentRef, childrenTokens.length])
  return (
    <div
      ref={contentRef}
      className={classNames(styles['ai-task-default-group-card-content'], {
        [styles['focused']]: isFocus,
      })}
    >
      <div className={styles['content-inner']}>
        <ConcurrentStreamContent childrenTokens={childrenTokens} scrollContainerRef={contentRef} />
      </div>
    </div>
  )
}

export default AITaskDefaultGroupContent
