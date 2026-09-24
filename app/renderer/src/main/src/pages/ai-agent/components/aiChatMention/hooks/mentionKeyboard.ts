/**
 * Enter 是否应由 mention 键盘导航拦截（阻止编辑器默认换行/发送）。
 * 面板未启用、不在视口、空结果或无选中时放行。
 */
export function shouldInterceptMentionEnter(params: {
  enabled?: boolean
  inViewport?: boolean
  dataLength: number
  hasSelected: boolean
}): boolean {
  const enabled = params.enabled !== false
  const inViewport = params.inViewport !== false
  if (!(enabled && inViewport)) return false
  if (!params.dataLength || !params.hasSelected) return false
  return true
}
