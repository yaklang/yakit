import { useClickAway, useThrottleFn } from 'ahooks'
import classNames from 'classnames'
import { memo, useRef, useState, useEffect } from 'react'
import StaticChatContent from '../../aiChatListItem/StaticChatContent/StaticChatContent'
import { AIGroupStreamCardListProps } from '../type'
import styles from './AIGroupStreamCardList.module.scss'

const BOTTOM_THRESHOLD = 10

const AIGroupStreamCardList: React.FC<AIGroupStreamCardListProps> = memo((props) => {
  const { expand, childrenTokens } = props

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
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    })
    let rafId = 0
    const observer = new ResizeObserver(() => {
      if (!allowAutoScrollRef.current) return
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
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
        [styles.noMask]: isScroll,
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
        {childrenTokens.map((token, index) => (
          <StaticChatContent key={token} token={token} groupIndex={index} />
        ))}
      </div>
    </div>
  )
})

export default AIGroupStreamCardList
