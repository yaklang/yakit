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

/** 概览菜单跳转后，把目标二级标签滚动到二级标签栏可视区（组刚展开时需等宽度动画结束再调用）。 */
export const scrollSubTabIntoView = (container: HTMLElement | null | undefined, pageId: string, margin = 60) => {
  if (!container) return
  const scroll = () => {
    // 跨一级页签切换时页体暂为 display:none（rect 宽度为 0），等下一帧布局恢复后再定位
    if (container.getBoundingClientRect().width <= 0) {
      requestAnimationFrame(scroll)
      return
    }
    const target = document.querySelector(`[data-rfd-draggable-id="${pageId}"]`)
    const targetRect = target?.getClientRects().length ? target.getClientRects()[0] : null
    if (!targetRect || targetRect.width <= 0) return
    const containerLeft = container.getBoundingClientRect().left
    const leftInView = targetRect.left - containerLeft
    if (leftInView >= 0 && targetRect.right - containerLeft <= container.clientWidth) return
    container.scrollLeft += leftInView - margin
  }
  scroll()
}
