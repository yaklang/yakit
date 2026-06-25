import type { ReActChatRenderItem } from '@/pages/ai-re-act/hooks/aiRender'
import { type FC, memo, type RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLatest, useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import useClickFocus from '../../../../ai-re-act/hooks/useClickFocus'
import styles from './ConcurrentStreamContent.module.scss'
import { AIChatListItem } from '../../aiChatListItem/AIChatListItem'

const PAGE_SIZE = 20

interface ConcurrentStreamContentProps {
  session: string
  elements: ReActChatRenderItem[]
  isChildWindow?: boolean
  /** 由父级承担滚动时传入，避免嵌套双滚动容器 */
  scrollContainerRef?: RefObject<HTMLDivElement | null>
}

const ConcurrentStreamContent: FC<ConcurrentStreamContentProps> = memo(
  ({ elements, session, isChildWindow, scrollContainerRef }) => {
    const { ref: scrollRef, isFocus } = useClickFocus<HTMLDivElement>()
    const contentMeasureRef = useRef<HTMLDivElement>(null)
    const embedInParentScroll = !!scrollContainerRef

    /** 当前渲染起始下标，初始从末尾 PAGE_SIZE 处开始，新增元素始终可见 */
    const [startIndex, setStartIndex] = useState(() => Math.max(0, elements.length - PAGE_SIZE))
    /** 加载更多时保存旧滚动高度，用于恢复位置 */
    const prevScrollHeightRef = useRef<number>(0)
    const loadingMoreRef = useRef<boolean>(false)
    const startIndexLatest = useLatest(startIndex)
    /** 用户是否在底部附近，用于决定新元素到来时是否跟随滚动 */
    const isAtBottomRef = useRef<boolean>(true)

    const getScrollEl = useMemoizedFn(() => scrollContainerRef?.current ?? scrollRef.current)

    /** 挂载 / 新元素 / 流式增高时，若在底部则自动跟随 */
    useLayoutEffect(() => {
      const scrollEl = getScrollEl()
      const measureEl = contentMeasureRef.current
      if (!scrollEl || !measureEl) return

      isAtBottomRef.current = true

      const scrollToBottom = (force = false) => {
        if (!force && !isAtBottomRef.current) return
        scrollEl.scrollTop = scrollEl.scrollHeight
      }

      scrollToBottom(true)

      let rafId = 0
      const scheduleScrollToBottom = (force = false) => {
        cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(() => {
          scrollToBottom(force)
        })
      }

      // 首帧布局可能尚未收敛，补一次异步置底
      scheduleScrollToBottom(true)
      const rafId2 = requestAnimationFrame(() => scheduleScrollToBottom(true))

      const observer = new ResizeObserver(() => {
        scheduleScrollToBottom()
      })
      observer.observe(measureEl)

      return () => {
        cancelAnimationFrame(rafId)
        cancelAnimationFrame(rafId2)
        observer.disconnect()
      }
    }, [elements.length, getScrollEl, scrollContainerRef])

    /** 加载旧数据后保持滚动位置不跳动 */
    useLayoutEffect(() => {
      if (!loadingMoreRef.current) return
      const scrollEl = getScrollEl()
      if (!scrollEl) return
      scrollEl.scrollTop = scrollEl.scrollHeight - prevScrollHeightRef.current
      loadingMoreRef.current = false
    }, [getScrollEl, startIndex])

    const handleScroll = useMemoizedFn(() => {
      const scrollEl = getScrollEl()
      if (!scrollEl) return
      isAtBottomRef.current = scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight < 50
      // 滚动到顶部附近时加载更多旧数据
      if (scrollEl.scrollTop <= 50 && startIndexLatest.current > 0 && !loadingMoreRef.current) {
        prevScrollHeightRef.current = scrollEl.scrollHeight
        loadingMoreRef.current = true
        setStartIndex((prev) => Math.max(0, prev - PAGE_SIZE))
      }
    })

    useEffect(() => {
      if (!embedInParentScroll) return
      const scrollEl = scrollContainerRef?.current
      if (!scrollEl) return
      scrollEl.addEventListener('scroll', handleScroll, { passive: true })
      return () => scrollEl.removeEventListener('scroll', handleScroll)
    }, [embedInParentScroll, handleScroll, scrollContainerRef])

    const visibleElements = elements.slice(startIndex)

    return (
      <div
        ref={scrollRef}
        className={classNames(styles['concurrent-stream-content'], {
          [styles.focused]: isFocus && !embedInParentScroll,
          [styles['embed-in-parent']]: embedInParentScroll,
        })}
        onScroll={embedInParentScroll ? undefined : handleScroll}
        style={
          embedInParentScroll
            ? undefined
            : isChildWindow
              ? { maxHeight: 'inherit', height: '100%', overflowY: 'auto' }
              : undefined
        }
      >
        <div ref={contentMeasureRef}>
          {visibleElements.map((item, index) => (
            <div className={styles['concurrent-stream-content-item']} key={item.token}>
              <AIChatListItem
                hasNext={startIndex + index < elements.length - 1}
                itemIndex={startIndex + index}
                item={item}
                session={session}
                type="re-act"
              />
            </div>
          ))}
        </div>
      </div>
    )
  },
)
export default ConcurrentStreamContent
