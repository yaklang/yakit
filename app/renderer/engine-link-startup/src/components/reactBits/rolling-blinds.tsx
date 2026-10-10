import type { Theme } from '@/hooks/useTheme'
import GradientBars from './gradient-bars'

interface RollingBlindsProps {
  className?: string
  theme: Theme
}

const TINT = '#5790d5'
/** 与 --Colors-Use-Basic-Background 的 light / dark 一致 */
const BACKGROUND: Record<Theme, string> = {
  light: '#ffffff',
  dark: '#171717',
}

/** Tint 为 #5790d5；条数低于文档默认 8，让竖条更宽 */
const RollingBlinds = ({ className, theme }: RollingBlindsProps) => {
  return <GradientBars className={className} color={TINT} backgroundColor={BACKGROUND[theme]} barCount={5} />
}

export default RollingBlinds
