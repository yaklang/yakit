import { useLayoutEffect, useState } from 'react'
import { buildVectorStripeBgImage, resolveCssColor } from '../utils/vectorStripeBg'

/** 根据 CSS 变量解析斜纹颜色，生成 background-image 用的 SVG URL */
export function useVectorStripeBg(stripeColor: string): string {
  const [vectorBg, setVectorBg] = useState('')

  useLayoutEffect(() => {
    const color = resolveCssColor(stripeColor)
    setVectorBg(color ? buildVectorStripeBgImage(color) : '')
  }, [stripeColor])

  return vectorBg
}
