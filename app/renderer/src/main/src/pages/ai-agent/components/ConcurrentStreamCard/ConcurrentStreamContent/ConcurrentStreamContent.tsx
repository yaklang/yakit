import { type FC, memo, type RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useCreation, useLatest, useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import useClickFocus from '../../../../ai-re-act/hooks/useClickFocus'
import styles from './ConcurrentStreamContent.module.scss'
import { AIChatListItem } from '../../aiChatListItem/AIChatListItem'
import type { ConcurrentStreamContentItemProps } from './type'
import { useCurrentRawData } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import useAIItemKind from '@/pages/ai-re-act/hooks/useAIItemKind'
import { ReActChatRenderElement } from '@/pages/ai-re-act/hooks/aiRender'

const PAGE_SIZE = 20

interface ConcurrentStreamContentProps {
  childrenTokens: string[]
  isChildWindow?: boolean
  /** 由父级承担滚动时传入，避免嵌套双滚动容器 */
  scrollContainerRef?: RefObject<HTMLDivElement | null>
}

const ConcurrentStreamContent: FC<ConcurrentStreamContentProps> = memo(
  ({ childrenTokens, isChildWindow, scrollContainerRef }) => {
    const { ref: scrollRef, isFocus } = useClickFocus<HTMLDivElement>()
    const contentMeasureRef = useRef<HTMLDivElement>(null)
    const embedInParentScroll = !!scrollContainerRef

    /** 当前渲染起始下标，初始从末尾 PAGE_SIZE 处开始，新增元素始终可见 */
    const [startIndex, setStartIndex] = useState(() => Math.max(0, childrenTokens.length - PAGE_SIZE))
    /** 加载更多时保存旧滚动高度，用于恢复位置 */
    const prevScrollHeightRef = useRef<number>(0)
    const loadingMoreRef = useRef<boolean>(false)
    const startIndexLatest = useLatest(startIndex)
    /** 用户是否在底部附近，用于决定新元素到来时是否跟随滚动 */
    const isAtBottomRef = useRef<boolean>(true)
    const isFirstMountRef = useRef(true)

    const getScrollEl = useMemoizedFn(() => scrollContainerRef?.current ?? scrollRef.current)

    /** 流式增高时，仅在底部则自动跟随 */
    useLayoutEffect(() => {
      const scrollEl = getScrollEl()
      const measureEl = contentMeasureRef.current
      if (!scrollEl || !measureEl) return

      let rafId = 0
      const scrollToBottom = () => {
        if (!isAtBottomRef.current) return
        scrollEl.scrollTop = scrollEl.scrollHeight
      }

      const observer = new ResizeObserver(() => {
        cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(scrollToBottom)
      })
      observer.observe(measureEl)

      return () => {
        cancelAnimationFrame(rafId)
        observer.disconnect()
      }
    }, [getScrollEl, scrollContainerRef])

    /** 挂载 / 新元素时置底：首次强制，后续仅在底部时跟随 */
    useLayoutEffect(() => {
      const scrollEl = getScrollEl()
      if (!scrollEl) return

      const force = isFirstMountRef.current
      isFirstMountRef.current = false

      const scrollToBottom = (forceScroll = false) => {
        if (!forceScroll && !isAtBottomRef.current) return
        scrollEl.scrollTop = scrollEl.scrollHeight
      }

      scrollToBottom(force)

      if (!force) {
        if (isAtBottomRef.current) {
          requestAnimationFrame(() => scrollToBottom(false))
        }
        return
      }

      let rafId = 0
      const rafId2 = requestAnimationFrame(() => {
        rafId = requestAnimationFrame(() => scrollToBottom(true))
      })

      return () => {
        cancelAnimationFrame(rafId2)
        cancelAnimationFrame(rafId)
      }
    }, [childrenTokens.length, getScrollEl, scrollContainerRef])

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

    return (
      <div
        className={styles['content']}
        hidden={childrenTokens.length === 0}
        style={isChildWindow ? { flex: 1, maxHeight: 'inherit', height: 0 } : undefined}
      >
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
            {childrenTokens.map((item, index) => (
              <ConcurrentStreamContentItem key={item} token={item} />
            ))}
          </div>
        </div>
      </div>
    )
  },
)
export default ConcurrentStreamContent

const ConcurrentStreamContentItem: FC<ConcurrentStreamContentItemProps> = memo(({ token }) => {
  const rawData = useCurrentRawData()
  const getKind = useAIItemKind()

  const item: ReActChatRenderElement = useCreation(() => {
    const data = rawData.contents.get(token)
    return {
      token,
      kind: getKind(token) ?? 'item',
      chatType: data?.chatType ?? 'reAct',
      isHistory: false,
    }
  }, [token])
  return (
    <div className={styles['concurrent-stream-content-item']}>
      <AIChatListItem item={item} />
    </div>
  )
})
