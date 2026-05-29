import type { ReActChatRenderItem } from '@/pages/ai-re-act/hooks/aiRender'
import { type FC, useLayoutEffect, useRef, useState } from 'react'
import { useLatest, useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import useClickFocus from '../../hooks/useClickFocus'
import styles from './ConcurrentStreamContent.module.scss'
import { AIChatListItem } from '../../aiChatListItem/AIChatListItem'

const PAGE_SIZE = 20

interface ConcurrentStreamContentProps {
  elements: ReActChatRenderItem[]
}

const ConcurrentStreamContent: FC<ConcurrentStreamContentProps> = ({ elements }) => {
  const { ref: scrollRef, isFocus, onClick: onFocus } = useClickFocus<HTMLDivElement>()

  /** 当前渲染起始下标，从末尾 PAGE_SIZE 开始 */
  const [startIndex, setStartIndex] = useState(() => Math.max(0, elements.length - PAGE_SIZE))
  /** 加载更多时保存旧滚动高度，用于恢复位置 */
  const prevScrollHeightRef = useRef<number>(0)
  const loadingMoreRef = useRef<boolean>(false)
  const startIndexLatest = useLatest(startIndex)

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
      onClick={onFocus}
      onScroll={handleScroll}
    >
      {visibleElements.map((item, index) => (
        <div className={styles['concurrent-stream-content-item']} key={item.token}>
          <AIChatListItem
            hasNext={startIndex + index < elements.length - 1}
            itemIndex={startIndex + index}
            item={item}
            type="re-act"
          />
        </div>
      ))}
    </div>
  )
}
export default ConcurrentStreamContent
