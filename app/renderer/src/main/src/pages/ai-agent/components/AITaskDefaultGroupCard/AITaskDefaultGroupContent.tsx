import { type ReActChatTaskElementSub } from '@/pages/ai-re-act/hooks/aiRender'
import useClickFocus from '@/pages/ai-re-act/hooks/useClickFocus'
import { type FC, useEffect, useLayoutEffect } from 'react'
import classNames from 'classnames'
import styles from './AITaskDefaultGroupCard.module.scss'
import ConcurrentStreamContent from '../ConcurrentStreamCard/ConcurrentStreamContent/ConcurrentStreamContent'

const AITaskDefaultGroupContent: FC<{
  elements: ReActChatTaskElementSub[]
  session: string
  isChildWindow?: boolean
  onContentFocusChange?: (focused: boolean) => void
}> = ({ elements, session, isChildWindow, onContentFocusChange }) => {
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
  }, [contentRef, elements.length])

  return (
    <div
      ref={contentRef}
      className={classNames(styles['ai-task-default-group-card-content'], {
        [styles['focused']]: isFocus,
        [styles['child-window']]: isChildWindow,
      })}
    >
      <div className={styles['content-inner']}>
        <ConcurrentStreamContent
          session={session}
          elements={elements}
          isChildWindow={isChildWindow}
          scrollContainerRef={contentRef}
        />
      </div>
    </div>
  )
}

export default AITaskDefaultGroupContent
