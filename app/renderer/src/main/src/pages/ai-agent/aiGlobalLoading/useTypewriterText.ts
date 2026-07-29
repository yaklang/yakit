import { useMemoizedFn } from 'ahooks'
import { useEffect, useState } from 'react'

type TypingPhase = 'typing' | 'pausing' | 'deleting' | 'completed'
type LoopMode = 'restart' | 'delete'

/**
 * 打字机文本效果的配置项。
 */
interface UseTypewriterTextProps {
  /** 需要循环执行打字与删除动画的目标文本。 */
  text: string
  /** 打字阶段每次新增一个字符的间隔时长，单位为毫秒。 */
  typingSpeed?: number
  /** 删除阶段每次移除一个字符的间隔时长，单位为毫秒。 */
  deletingSpeed?: number
  /** 文本完整显示后，开始删除前的停顿时长，单位为毫秒。 */
  pauseDuration?: number
  /** 是否循环播放打字机动画，默认关闭。 */
  loop?: boolean
  /**
   * 循环模式。
   * restart: 每次完整显示后直接从空文本重新开始。
   * delete: 每次完整显示后进入逐字删除，再重新打字。
   */
  loopMode?: LoopMode
}

const useTypewriterText = ({
  text,
  typingSpeed = 75,
  deletingSpeed = 50,
  pauseDuration = 1500,
  loop = false,
  loopMode = 'restart',
}: UseTypewriterTextProps) => {
  const [displayText, setDisplayText] = useState('')
  const [phase, setPhase] = useState<TypingPhase>('typing')

  const stepText = useMemoizedFn((isTyping: boolean) => {
    setDisplayText((prev) => {
      if (isTyping) {
        const nextText = text.slice(0, prev.length + 1)
        if (nextText === text) {
          setPhase(loop ? 'pausing' : 'completed')
        }
        return nextText
      }

      const nextText = prev.slice(0, -1)
      if (!nextText) {
        setPhase('typing')
      }
      return nextText
    })
  })

  useEffect(() => {
    // 文案或播放策略变化时重置状态，从头开始打字。
    setDisplayText('')
    setPhase('typing')
  }, [loop, loopMode, text])

  useEffect(() => {
    if (phase === 'pausing') {
      const timer = window.setTimeout(() => {
        if (loopMode === 'delete') {
          setPhase('deleting')
          return
        }

        setDisplayText('')
        setPhase('typing')
      }, pauseDuration)

      return () => {
        window.clearTimeout(timer)
      }
    }

    if (phase === 'completed') {
      return
    }

    const isTyping = phase === 'typing'

    // 任一字符增删后都会重新调度下一次 timeout。
    // 这里只有一个活动定时器，渲染频率也仅与字数变化一致，性能开销很小。
    const timer = window.setTimeout(() => stepText(isTyping), isTyping ? typingSpeed : deletingSpeed)

    return () => {
      window.clearTimeout(timer)
    }
  }, [deletingSpeed, displayText, loopMode, pauseDuration, phase, stepText, typingSpeed])

  return displayText
}

export default useTypewriterText
