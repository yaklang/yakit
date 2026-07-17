import { usePageInfo } from '@/store/pageInfo'

/** 打开弹窗/导出时按需读取当前一级页签容器，避免响应式订阅 currentPageTabRouteKey 引发无关重渲染 */
export function getMainOperatorPageBodyContainer() {
  const routeKey = usePageInfo.getState().getCurrentPageTabRouteKey()
  return document.getElementById(`main-operator-page-body-${routeKey}`) || undefined
}
