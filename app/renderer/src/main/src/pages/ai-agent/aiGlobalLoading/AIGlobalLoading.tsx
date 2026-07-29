import styles from './AIGlobalLoading.module.scss'
import lottie from 'lottie-web'
import { useEffect, useState, useRef } from 'react'
import type { FC, ReactNode } from 'react'
import beginAnimationData from './begin.json'
import loopAnimationData1 from './loop1.json'
import loopAnimationData2 from './loop2.json'
import loopAnimationData3 from './loop3.json'
import TypewriterText from './TypewriterText/TypewriterText'

const LOADING_TEXT = '数据加载中，请稍后'
const BEGIN_ANIMATION_SPEED = 0.82
const BEGIN_ANIMATION_DELAY = 500
// Lottie 源文件中用于主色与浅色边框的原始色值，渲染后会映射到主题变量。
const ORIGINAL_PRIMARY_COLOR = [242, 140, 69] as const
const ORIGINAL_BORDER_COLOR = [250, 197, 162] as const
const THEME_PRIMARY_COLOR = 'var(--Colors-Use-Main-Primary)'
const THEME_BORDER_COLOR = 'var(--Colors-Use-Main-Border)'
const loopAnimationList = [loopAnimationData1, loopAnimationData2, loopAnimationData3] as const

type AnimationStage = 'begin' | 'loop'
type RgbColor = readonly [number, number, number]
type LoopAnimationMode = 'fixed' | 'random' | 'sequential'

let sequentialLoopAnimationIndex = 0

// 统一颜色字符串格式，便于兼容 '#fff'、'#ffffff'、'rgb(...)' 等不同写法。
const normalizeColor = (value: string | null | undefined) => value?.replace(/\s+/g, '').toLowerCase() ?? ''

const parseColor = (value: string | null | undefined): RgbColor | null => {
  const normalizedValue = normalizeColor(value)

  if (!normalizedValue) {
    return null
  }

  if (normalizedValue.startsWith('#')) {
    const hex = normalizedValue.slice(1)
    const normalizedHex =
      hex.length === 3
        ? hex
            .split('')
            .map((item) => `${item}${item}`)
            .join('')
        : hex.length === 8
          ? hex.slice(0, 6)
          : hex

    if (normalizedHex.length !== 6) {
      return null
    }

    return [
      parseInt(normalizedHex.slice(0, 2), 16),
      parseInt(normalizedHex.slice(2, 4), 16),
      parseInt(normalizedHex.slice(4, 6), 16),
    ]
  }

  const rgbMatch = normalizedValue.match(/rgba?\(([^)]+)\)/)
  if (!rgbMatch) {
    return null
  }

  const channels = rgbMatch[1]
    .split(',')
    .slice(0, 3)
    .map((item) => Number.parseFloat(item))

  if (channels.length !== 3 || channels.some((item) => Number.isNaN(item))) {
    return null
  }

  return [Math.round(channels[0]), Math.round(channels[1]), Math.round(channels[2])]
}

// Lottie 渲染后的 SVG 颜色可能存在极小误差，这里允许通道值在 1 以内浮动。
const isSameColor = (value: string | null | undefined, targetColor: RgbColor) => {
  const parsedColor = parseColor(value)

  if (!parsedColor) {
    return false
  }

  return parsedColor.every((channel, index) => Math.abs(channel - targetColor[index]) <= 1)
}

// 在 DOMLoaded 后扫描动画节点，把源文件颜色替换成当前主题色，避免直接修改 JSON 资源。
const applyThemeColorsToAnimation = (container: HTMLElement) => {
  const svgElements = container.querySelectorAll<SVGElement>('*')

  svgElements.forEach((element) => {
    const fillAttribute = element.getAttribute('fill')
    const strokeAttribute = element.getAttribute('stroke')
    const inlineFill = element.style.fill
    const inlineStroke = element.style.stroke

    if (isSameColor(fillAttribute, ORIGINAL_PRIMARY_COLOR) || isSameColor(inlineFill, ORIGINAL_PRIMARY_COLOR)) {
      element.style.fill = THEME_PRIMARY_COLOR
    }

    if (isSameColor(fillAttribute, ORIGINAL_BORDER_COLOR) || isSameColor(inlineFill, ORIGINAL_BORDER_COLOR)) {
      element.style.fill = THEME_BORDER_COLOR
    }

    if (isSameColor(strokeAttribute, ORIGINAL_PRIMARY_COLOR) || isSameColor(inlineStroke, ORIGINAL_PRIMARY_COLOR)) {
      element.style.stroke = THEME_PRIMARY_COLOR
    }

    if (isSameColor(strokeAttribute, ORIGINAL_BORDER_COLOR) || isSameColor(inlineStroke, ORIGINAL_BORDER_COLOR)) {
      element.style.stroke = THEME_BORDER_COLOR
    }
  })
}

const clampLoopAnimationIndex = (index: number) => {
  if (Number.isNaN(index)) {
    return 0
  }

  return Math.min(Math.max(index, 0), loopAnimationList.length - 1)
}

// 支持固定、随机、顺序三种循环动画选择策略。
const getLoopAnimationIndex = (mode: LoopAnimationMode, fixedLoopIndex: number) => {
  if (mode === 'random') {
    return Math.floor(Math.random() * loopAnimationList.length)
  }

  if (mode === 'sequential') {
    const currentIndex = sequentialLoopAnimationIndex
    sequentialLoopAnimationIndex = (sequentialLoopAnimationIndex + 1) % loopAnimationList.length

    return currentIndex
  }

  return clampLoopAnimationIndex(fixedLoopIndex)
}

interface AIGlobalLoadingProps {
  /** 是否显示全局加载遮罩。 */
  loading?: boolean
  /** loop 阶段动画切换策略。 */
  loopAnimationMode?: LoopAnimationMode
  /** 固定模式下使用的 loop 动画下标。 */
  fixedLoopIndex?: number
  /** 被加载层覆盖的业务内容。 */
  children?: ReactNode
}

const AIGlobalLoading: FC<AIGlobalLoadingProps> = ({
  loading,
  loopAnimationMode = 'fixed',
  fixedLoopIndex = 0,
  children,
}) => {
  const beginAnimationRef = useRef<HTMLDivElement | null>(null)
  const [animationStage, setAnimationStage] = useState<AnimationStage>('begin')
  const [currentLoopAnimationIndex, setCurrentLoopAnimationIndex] = useState(() =>
    clampLoopAnimationIndex(fixedLoopIndex),
  )

  useEffect(() => {
    // 每次重新进入 loading 时，都从 begin 阶段重新开始，并重新选定 loop 动画。
    if (loading) {
      setAnimationStage('begin')
      setCurrentLoopAnimationIndex(getLoopAnimationIndex(loopAnimationMode, fixedLoopIndex))
    }
  }, [fixedLoopIndex, loading, loopAnimationMode])

  useEffect(() => {
    if (!loading || !beginAnimationRef.current) return

    const animationContainer = beginAnimationRef.current
    const sourceAnimationData =
      animationStage === 'begin' ? beginAnimationData : loopAnimationList[currentLoopAnimationIndex]
    const shouldLoop = animationStage === 'loop'
    let animation: ReturnType<typeof lottie.loadAnimation> | null = null
    let handleDomLoaded: (() => void) | null = null
    const startDelay = animationStage === 'begin' ? BEGIN_ANIMATION_DELAY : 0

    // begin 播放完后自动切到 loop 阶段。
    const handleComplete = () => {
      if (animationStage === 'begin') {
        setAnimationStage('loop')
      }
    }

    const startAnimation = () => {
      // 切阶段时重建动画实例，避免 begin 与 loop 共享同一个实例状态。
      animationContainer.innerHTML = ''
      animationContainer.style.opacity = '0'

      animation = lottie.loadAnimation({
        container: animationContainer,
        renderer: 'svg',
        loop: shouldLoop,
        autoplay: false,
        animationData: sourceAnimationData,
        rendererSettings: {
          preserveAspectRatio: 'xMidYMid meet',
          progressiveLoad: true,
        },
      })

      handleDomLoaded = () => {
        // 等颜色替换完成后再显示并播放，避免首帧出现错误主题色。
        applyThemeColorsToAnimation(animationContainer)
        animationContainer.style.opacity = '1'
        animation?.goToAndPlay(0, true)
      }

      animation.addEventListener('DOMLoaded', handleDomLoaded)
      animation.addEventListener('complete', handleComplete)

      if (animationStage === 'begin') {
        animation.setSpeed(BEGIN_ANIMATION_SPEED)
      }
    }

    const timer = window.setTimeout(startAnimation, startDelay)

    return () => {
      window.clearTimeout(timer)

      if (animation) {
        if (handleDomLoaded) {
          animation.removeEventListener('DOMLoaded', handleDomLoaded)
        }
        animation.removeEventListener('complete', handleComplete)
        animation.destroy()
      }

      animationContainer.style.opacity = '0'
    }
  }, [animationStage, currentLoopAnimationIndex, loading])

  return (
    <>
      {children}
      {loading && (
        <div className={styles.overlay}>
          <div className={styles.mask} />
          <div className={styles.loading}>
            <div ref={beginAnimationRef} className={styles.begin} />
            {/* 文案延后到 begin 完成后再显示，避免与入场动画抢视觉焦点。 */}
            {animationStage === 'loop' ? (
              <TypewriterText text={LOADING_TEXT} textClassName={styles.typewriter} loop loopMode="delete" showCursor />
            ) : (
              <p className={styles.typewriter} style={{ height: 10 }} />
            )}
          </div>
        </div>
      )}
    </>
  )
}
export default AIGlobalLoading
