import type { CSSProperties, ReactNode } from 'react'

export interface YakitDockablePaneProps {
  /** 是否展示面板，关闭后占位宽度为 0 */
  open?: boolean
  onClose?: () => void
  /** 是否通过 createPortal 挂到 body（不占用原 DOM 宽度） */
  overlay?: boolean
  defaultOverlay?: boolean
  onOverlayChange?: (overlay: boolean) => void
  /**
   * 禁止内联停靠（如宿主宽度不足）。
   * 为 true 时：浮层模式下停靠按钮 disable；若当前已内联会自动切到浮层
   */
  dockDisabled?: boolean
  /** 停靠按钮 disable 时的提示 */
  dockDisabledTip?: string
  width?: number
  /** 头部左侧内容，如 YakitSegmented */
  header?: ReactNode
  extra?: ReactNode
  className?: string
  bodyClassName?: string
  /** 内联模式样式；悬浮模式会再与 overlayStyle 合并 */
  style?: CSSProperties
  /** 仅悬浮（overlay）模式生效，可覆盖 style */
  overlayStyle?: CSSProperties
  getContainer?: HTMLElement | (() => HTMLElement | null) | null
  children?: ReactNode
}
