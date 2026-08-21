import {
  Children,
  createElement,
  isValidElement,
  type CSSProperties,
  type FC,
  type ReactElement,
  type ReactNode,
} from 'react'
import type { CardProps, CollapseProps, TabsProps } from 'antd'

/** antd 5 不再从 checkbox/Group 导出该类型，保持 v4 语义供业务复用 */
export type CheckboxValueType = string | number | boolean

function pickOpen(open?: boolean, visible?: boolean) {
  return open ?? visible
}

/**
 * antd 5 已废弃 Tabs.TabPane。本组件是轻量替身，仅承载 tab/children/key 等 props，
 * 供 childrenToTabItems 提取后转成 antd 5 items，消除 deprecated 运行时警告。
 * 组件本身只渲染 children，不依赖 antd 内部实现。
 */
export type CompatTabPaneProps = {
  tab?: ReactNode
  children?: ReactNode
  disabled?: boolean
  destroyOnHidden?: boolean
  forceRender?: boolean
  [key: string]: unknown
}

export const CompatTabPane: FC<CompatTabPaneProps> = (props) =>
  createElement('div', { style: { display: 'contents' } }, props.children)

/** 从 Dropdown props 里剥掉 antd 5 已废弃字段，避免 spread 时触发 warning */
export function normalizeDropdownProps<T extends Record<string, unknown>>(props: T = {} as T) {
  const {
    visible,
    open,
    onVisibleChange,
    onOpenChange,
    overlay: _overlay,
    destroyPopupOnHide,
    destroyOnHidden,
    ...rest
  } = props as T & {
    visible?: boolean
    open?: boolean
    onVisibleChange?: (open: boolean) => void
    onOpenChange?: (open: boolean, info?: { source: 'trigger' | 'menu' }) => void
    overlay?: unknown
    destroyPopupOnHide?: boolean
    destroyOnHidden?: boolean
  }

  return {
    ...rest,
    open: pickOpen(open, visible),
    onOpenChange: (nextOpen: boolean, info?: { source: 'trigger' | 'menu' }) => {
      onOpenChange?.(nextOpen, info)
      onVisibleChange?.(nextOpen)
    },
    destroyOnHidden: destroyOnHidden ?? destroyPopupOnHide,
  }
}

/** 把 Tabs.TabPane / PluginTabs.TabPane 子节点转成 antd 5 items */
export function childrenToTabItems(children: ReactNode): TabsProps['items'] {
  const items: NonNullable<TabsProps['items']> = []
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    const {
      tab,
      children: paneChildren,
      destroyInactiveTabPane,
      destroyOnHidden,
      ...rest
    } = child.props as ReactElement['props'] & {
      tab?: ReactNode
      destroyInactiveTabPane?: boolean
      destroyOnHidden?: boolean
    }
    items.push({
      ...rest,
      key: child.key != null ? String(child.key) : rest.tabKey,
      label: tab,
      children: paneChildren,
      destroyOnHidden: destroyOnHidden ?? destroyInactiveTabPane,
    })
  })
  return items
}

/** 把 Collapse.Panel / YakitPanel 子节点转成 antd 5 items。包装组件（无 header）无法转换，返回 undefined 走 children。 */
export function childrenToCollapseItems(children: ReactNode): CollapseProps['items'] | undefined {
  const items: NonNullable<CollapseProps['items']> = []
  const nodes: ReactElement[] = []
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    nodes.push(child)
  })
  if (nodes.length === 0) return []

  nodes.forEach((child) => {
    const {
      header,
      children: panelChildren,
      disabled,
      collapsible,
      ...rest
    } = child.props as ReactElement['props'] & {
      header?: ReactNode
      disabled?: boolean
      collapsible?: 'header' | 'icon' | 'disabled'
    }
    items.push({
      ...rest,
      key: child.key != null ? String(child.key) : rest.panelKey,
      label: header,
      children: header != null ? panelChildren : child,
      collapsible: collapsible ?? (disabled ? 'disabled' : undefined),
    })
  })
  return items
}

/** 剥掉 Card 已废弃的 bodyStyle / headStyle / bordered，避免 antd 5 warning */
export function normalizeCardProps<T extends Record<string, unknown>>(props: T = {} as T) {
  const { bodyStyle, headStyle, styles, bordered, variant, ...rest } = props as T & {
    bodyStyle?: CSSProperties
    headStyle?: CSSProperties
    styles?: CardProps['styles']
    bordered?: boolean
    variant?: CardProps['variant'] | 'filled'
  }

  const mergedVariant: CardProps['variant'] =
    variant === 'filled'
      ? 'outlined'
      : (variant ?? (bordered === false ? 'borderless' : bordered === true ? 'outlined' : undefined))
  const mergedStyles =
    bodyStyle || headStyle || styles
      ? {
          ...styles,
          ...(headStyle ? { header: { ...(styles?.header as CSSProperties), ...headStyle } } : {}),
          ...(bodyStyle ? { body: { ...(styles?.body as CSSProperties), ...bodyStyle } } : {}),
        }
      : styles

  return {
    ...rest,
    ...(mergedVariant != null ? { variant: mergedVariant } : {}),
    ...(mergedStyles ? { styles: mergedStyles } : {}),
  } as CardProps
}
