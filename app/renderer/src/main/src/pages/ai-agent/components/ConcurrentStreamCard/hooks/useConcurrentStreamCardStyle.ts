import { useMemo, type CSSProperties } from 'react'
// import { CHILD_WINDOW_STYLE } from '../constants'

interface BuildCardStyleOptions {
  bgColor: string
  vectorBg: string
  showStripe: boolean
  isChildWindow?: boolean
}

/**
 * 收起时叠加斜纹背景，展开
 * 子窗口不需要这个样式
 */
export function buildConcurrentStreamCardStyle({
  bgColor,
  vectorBg,
  showStripe,
  isChildWindow,
}: BuildCardStyleOptions): CSSProperties {
  const isGradientBg = bgColor.includes('gradient(')

  if (!showStripe) {
    return {
      backgroundImage: isGradientBg ? bgColor : undefined,
      backgroundColor: isGradientBg ? undefined : bgColor,
      backgroundRepeat: undefined,
      backgroundPosition: undefined,
      backgroundSize: undefined,
    }
  }

  return {
    backgroundImage: isGradientBg ? `${vectorBg}, ${bgColor}` : vectorBg,
    backgroundColor: isGradientBg ? undefined : bgColor,
    backgroundRepeat: 'no-repeat, no-repeat',
    backgroundPosition: 'left center, 0 0',
    backgroundSize: isGradientBg ? 'auto, 100% 100%' : undefined,
  }
}

/** 卡片容器 style，含状态背景与斜纹层 */
export function useConcurrentStreamCardStyle(options: BuildCardStyleOptions): CSSProperties {
  const { bgColor, vectorBg, showStripe, isChildWindow } = options

  return useMemo(
    () => buildConcurrentStreamCardStyle({ bgColor, vectorBg, showStripe, isChildWindow }),
    [bgColor, isChildWindow, showStripe, vectorBg],
  )
}
