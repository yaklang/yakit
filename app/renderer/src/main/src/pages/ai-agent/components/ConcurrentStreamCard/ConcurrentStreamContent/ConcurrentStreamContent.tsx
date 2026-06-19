import type { ReActChatRenderItem } from '@/pages/ai-re-act/hooks/aiRender'
import { type FC, memo, useLayoutEffect, useRef, useState } from 'react'
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
}

const ConcurrentStreamContent: FC<ConcurrentStreamContentProps> = memo(({ elements, session, isChildWindow }) => {
  const { ref: scrollRef, isFocus } = useClickFocus<HTMLDivElement>()

  /** 当前渲染起始下标，初始从末尾 PAGE_SIZE 处开始，新增元素始终可见 */
  const [startIndex, setStartIndex] = useState(() => Math.max(0, elements.length - PAGE_SIZE))
  /** 加载更多时保存旧滚动高度，用于恢复位置 */
  const prevScrollHeightRef = useRef<number>(0)
  const loadingMoreRef = useRef<boolean>(false)
  const startIndexLatest = useLatest(startIndex)
  /** 用户是否在底部附近，用于决定新元素到来时是否跟随滚动 */
  const isAtBottomRef = useRef<boolean>(true)

  /** 挂载后滚到底部 */
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** 新元素到来时，若在底部则自动跟随 */
  useLayoutEffect(() => {
    if (!isAtBottomRef.current) return
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements.length])

  /** 加载旧数据后保持滚动位置不跳动 */
  useLayoutEffect(() => {
    if (!loadingMoreRef.current) return
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight - prevScrollHeightRef.current
    loadingMoreRef.current = false
  }, [startIndex, scrollRef])

  const handleScroll = useMemoizedFn(() => {
    const el = scrollRef.current
    if (!el) return
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 50
    // 滚动到顶部附近时加载更多旧数据
    if (el.scrollTop <= 50 && startIndexLatest.current > 0 && !loadingMoreRef.current) {
      prevScrollHeightRef.current = el.scrollHeight
      loadingMoreRef.current = true
      setStartIndex((prev) => Math.max(0, prev - PAGE_SIZE))
    }
  })

  const visibleElements = elements.slice(startIndex)

  return (
    <div
      ref={scrollRef}
      className={classNames(styles['concurrent-stream-content'], { [styles.focused]: isFocus })}
      onScroll={handleScroll}
      style={isChildWindow ? { maxHeight: 'inherit', height: '100%', overflowY: 'auto' } : undefined}
    >
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
  )
})
export default ConcurrentStreamContent
