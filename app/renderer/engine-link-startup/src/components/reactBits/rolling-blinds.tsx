import type { Theme } from '@/hooks/useTheme'
import GlyphEmber from './glyph-ember'

/** 焰身 / 焰心固定，背景随主题。模拟参数与 Glyph Ember 默认一致，速度略快 */
const EMBER_BODY = '#0f64e7'
const EMBER_CORE = '#3590e7'
const EMBER_THEME = {
  light: '#ffffff',
  dark: '#0a0a0a',
}

interface RollingBlindsProps {
  className?: string
  theme: Theme
}

const RollingBlinds = ({ className, theme }: RollingBlindsProps) => {
  return (
    <GlyphEmber
      className={className}
      colors={[EMBER_BODY, EMBER_CORE]}
      backgroundColor={EMBER_THEME[theme]}
      mode="auto"
      speed={1.35}
    />
  )
}

export default RollingBlinds
