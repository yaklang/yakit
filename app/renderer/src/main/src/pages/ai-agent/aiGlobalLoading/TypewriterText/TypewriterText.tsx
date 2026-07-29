import classNames from 'classnames'
import { useEffect, useRef, useState } from 'react'
import styles from './TypewriterText.module.scss'
import useTypewriterText from '../useTypewriterText'

interface TypewriterTextProps {
  text: string
  typingSpeed?: number
  deletingSpeed?: number
  pauseDuration?: number
  loop?: boolean
  loopMode?: 'restart' | 'delete'
  showCursor?: boolean
  wrapperClassName?: string
  textClassName?: string
  cursorClassName?: string
}

const TypewriterText = ({
  text,
  typingSpeed,
  deletingSpeed,
  pauseDuration,
  loop,
  loopMode,
  showCursor = false,
  wrapperClassName,
  textClassName,
  cursorClassName,
}: TypewriterTextProps) => {
  const displayText = useTypewriterText({
    text,
    typingSpeed,
    deletingSpeed,
    pauseDuration,
    loop,
    loopMode,
  })
  const prevLengthRef = useRef(0)
  const [animatedCharKey, setAnimatedCharKey] = useState<string | null>(null)
  const chars = Array.from(displayText)

  useEffect(() => {
    if (displayText.length > prevLengthRef.current && displayText.length > 0) {
      const latestChar = chars.at(-1) ?? ''
      setAnimatedCharKey(`${displayText.length}-${latestChar}`)
    } else {
      setAnimatedCharKey(null)
    }

    prevLengthRef.current = displayText.length
  }, [chars, displayText])

  return (
    <span className={classNames(styles.wrapper, wrapperClassName)}>
      <span className={classNames(styles.text, textClassName)}>
        {chars.map((char, index) => {
          const isLatestChar = index === chars.length - 1 && animatedCharKey

          return (
            <span
              key={isLatestChar ? animatedCharKey : `${index}-${char}`}
              className={isLatestChar ? styles['text-char-enter'] : styles['text-char']}
            >
              {char}
            </span>
          )
        })}
      </span>
      {showCursor && <span className={classNames(styles.cursor, cursorClassName)}>_</span>}
    </span>
  )
}

export default TypewriterText
