import type { SVGProps } from 'react'
import { motion } from 'motion/react'

type MenuCollapseIconProps = Omit<SVGProps<SVGSVGElement>, 'ref'> & {
  size?: number
  color?: string
  /** true：菜单已收起，显示向下展开箭头 */
  collapsed?: boolean
  duration?: number
}

const BARS = {
  open: 'M2.5 3.333 H17.5 M2.5 16.667 H17.5',
  collapsed: 'M2.5 3.333 H17.5 M2.5 8.333 H17.5',
}

const ARROW = {
  open: 'M10 7.5 L10 14.167 M8.333 9.323 L10 7.5 L11.667 9.323',
  collapsed: 'M10 10.833 L10 17.5 M8.333 15.833 L10 17.5 L11.667 15.833',
}

const stroke = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export const MenuCollapseIcon = ({
  size = 16,
  color = 'currentColor',
  collapsed = false,
  duration = 0.2,
  style,
  ...props
}: MenuCollapseIconProps) => {
  const state = collapsed ? 'collapsed' : 'open'
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      data-collapsed={collapsed || undefined}
      style={{ color, display: 'inline-block', verticalAlign: 'middle', ...style }}
      {...props}
    >
      <motion.path
        {...stroke}
        variants={{ open: { d: BARS.open }, collapsed: { d: BARS.collapsed } }}
        initial={false}
        animate={state}
        transition={{ duration, ease: 'easeInOut' }}
      />
      <motion.path
        {...stroke}
        variants={{ open: { d: ARROW.open }, collapsed: { d: ARROW.collapsed } }}
        initial={false}
        animate={state}
        transition={{ duration, ease: 'easeInOut' }}
      />
    </svg>
  )
}
