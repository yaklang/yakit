/**
 * antd 5 兼容层（Link 渲染端）。
 * 与主渲染端 app/renderer/src/main/src/utils/antdCompat.ts 保持同步，
 * 两端为独立 package 暂未共享，主题/兼容调整时同步修改两处。
 */

function pickOpen(open?: boolean, visible?: boolean) {
  return open ?? visible
}

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
