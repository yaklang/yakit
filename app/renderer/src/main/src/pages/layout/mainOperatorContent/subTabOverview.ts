import type { YakitMenuItemType } from '@/components/yakitUI/YakitMenu/YakitMenu'
import { YakitRoute } from '@/enums/yakitRoute'
import type { MultipleNodeInfo } from './MainOperatorContentType'

/** 一级 tab 展示二级页数量的路由。后续同类多开页往这里加。 */
export const SUB_TAB_OVERVIEW_ROUTES: YakitRoute[] = [YakitRoute.HTTPFuzzer]

export const isSubTabOverviewRoute = (route: YakitRoute | string) =>
  SUB_TAB_OVERVIEW_ROUTES.includes(route as YakitRoute)

export const isSubTabGroupNode = (node: Pick<MultipleNodeInfo, 'id' | 'groupChildren'>) => {
  if (typeof node.id === 'string' && node.id.endsWith('-group')) return true
  return Array.isArray(node.groupChildren) && node.groupChildren.length > 0
}

/** 叶子页数量。组本身和空组不计数。 */
export const countSubTabs = (nodes: MultipleNodeInfo[] = []) =>
  nodes.reduce((total, node) => {
    if (isSubTabGroupNode(node)) return total + (node.groupChildren?.length || 0)
    return total + 1
  }, 0)

/** 未分组的页是一级菜单；组名是一级菜单，组内页是子菜单。 */
export const buildSubTabOverviewMenu = (nodes: MultipleNodeInfo[] = []): YakitMenuItemType[] => {
  const menu: YakitMenuItemType[] = []
  nodes.forEach((node) => {
    if (isSubTabGroupNode(node)) {
      const children = (node.groupChildren || []).map((child) => ({
        key: child.id,
        label: child.verbose || '',
      }))
      if (children.length === 0) return
      menu.push({
        key: node.id,
        label: node.verbose || '',
        children,
      })
      return
    }
    menu.push({
      key: node.id,
      label: node.verbose || '',
    })
  })
  return menu
}

export const isSubTabLeaf = (nodes: MultipleNodeInfo[] = [], pageId: string) => {
  for (const node of nodes) {
    if (isSubTabGroupNode(node)) {
      if (node.groupChildren?.some((child) => child.id === pageId)) return true
    } else if (node.id === pageId) {
      return true
    }
  }
  return false
}
