import { YakitRoute } from '@/enums/yakitRoute'
import { usePageInfo } from '@/store/pageInfo'

/** 按需读取当前一级页签 routeKey，避免响应式订阅 currentPageTabRouteKey 引发无关重渲染 */
export function getCurrentPageTabRouteKey(): YakitRoute | string {
  return usePageInfo.getState().getCurrentPageTabRouteKey()
}

/** 打开弹窗/导出时按需读取当前一级页签容器，避免响应式订阅 currentPageTabRouteKey 引发无关重渲染 */
export function getMainOperatorPageBodyContainer() {
  const routeKey = getCurrentPageTabRouteKey()
  return document.getElementById(`main-operator-page-body-${routeKey}`) || undefined
}

/** 供 Modal/Drawer getContainer 使用，在弹窗打开时按需解析挂载容器 */
export function getMainOperatorPageBodyContainerOrBody(): HTMLElement {
  return getMainOperatorPageBodyContainer() || document.body
}

/** 判断指定一级页签是否为当前激活页，用于切页副作用隔离 */
export function isPageRouteActive(pageRouteKey: string) {
  return getCurrentPageTabRouteKey() === pageRouteKey
}
