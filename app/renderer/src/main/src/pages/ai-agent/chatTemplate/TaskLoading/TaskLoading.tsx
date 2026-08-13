import { type FC, useEffect, useRef, useState } from 'react'
import styles from './TaskLoading.module.scss'

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
