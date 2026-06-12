/**
 * 是否在 yakit-aux 辅助窗内
 */
export function isAuxWindow(): boolean {
  const { pathname, search } = window.location
  if (pathname.includes('yakit-aux')) return true

  const params = new URLSearchParams(search)
  return params.has('route') && params.has('windowId')
}

/**
 * 是否在独立子窗内渲染（辅助窗或旧版 window=child）。
 * 用于隐藏子窗不需要的操作按钮等。
 */
export function isAuxOrChildWindow(): boolean {
  if (isAuxWindow()) return true
  return new URLSearchParams(window.location.search).get('window') === 'child'
}
