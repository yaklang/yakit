import { useClickAway, useThrottleFn } from 'ahooks'
import classNames from 'classnames'
import { memo, useRef, useState, useEffect } from 'react'
import StaticChatContent from '../../aiChatListItem/StaticChatContent/StaticChatContent'
import type { AIGroupStreamCardListProps } from '../type'
import styles from './AIGroupStreamCardList.module.scss'

const BOTTOM_THRESHOLD = 10

const AIGroupStreamCardList: React.FC<AIGroupStreamCardListProps> = memo((props) => {
  const { expand, childrenTokens, rendItem, isThought } = props

  const contentRef = useRef<HTMLDivElement>(null)
  const [isScroll, setIsScroll] = useState(false)

  const allowAutoScrollRef = useRef<boolean>(true)

  useClickAway(() => {
    if (isScroll) setIsScroll(false)
  }, contentRef)

  /** 监听当前容器得滚动条是否在底部 */
  useEffect(() => {
    const el = contentRef.current
    if (!el || !expand) return
    allowAutoScrollRef.current = true
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [expand])

  const onScroll = useThrottleFn(
    () => {
      const el = contentRef.current
      if (!el || !expand) return
      const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      allowAutoScrollRef.current = distanceToBottom <= BOTTOM_THRESHOLD
    },
    { wait: 500 },
  ).run

  /** 展开得情况下，数据发生变化，滚动到底部 */
  useEffect(() => {
    const el = contentRef.current
    if (!el || !expand) return
    if (!allowAutoScrollRef.current) return
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
    })
    let rafId = 0
    let lastScrollHeight = el.scrollHeight
    const observer = new ResizeObserver(() => {
      if (!allowAutoScrollRef.current) return
      if (el.scrollHeight === lastScrollHeight) return
      lastScrollHeight = el.scrollHeight
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight
      })
    })
    observer.observe(el)

    return () => {
      cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [childrenTokens.length, expand])

  return (
    <div
      className={classNames(styles['content'], {
        [styles.expand]: expand,
        [styles.noMask]: isScroll || isThought,
        [styles['content-thought']]: isThought,
      })}
    >
      <div
        ref={contentRef}
        onClick={() => setIsScroll(true)}
        className={styles['content-inner']}
        style={{
          overflow: isScroll ? 'overlay' : 'hidden',
        }}
      >
        {childrenTokens.map((token, index) =>
          rendItem ? rendItem(token, index) : <StaticChatContent key={token} token={token} groupIndex={index} />,
        )}
      </div>
    </div>
  )
})

export default AIGroupStreamCardList
