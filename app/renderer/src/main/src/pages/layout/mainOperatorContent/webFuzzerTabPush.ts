import { defaultAdvancedConfigValue, defaultPostTemplate } from '@/defaultConstants/HTTPFuzzerPage'
import { YakitRoute } from '@/enums/yakitRoute'
import type { PageNodeItemProps, PageProps } from '@/store/pageInfo'
import type { CSSProperties } from 'react'
import type { MultipleNodeInfo } from './MainOperatorContentType'

export type WebFuzzerPushNode = Omit<MultipleNodeInfo, 'pageParams' | 'groupChildren'> & {
  pageParams?: Record<string, any> | null
  groupChildren?: WebFuzzerPushNode[]
}

export interface ApplyWebFuzzerTabMutationResult {
  multipleNode: MultipleNodeInfo[]
  page: PageProps
  selectedPageId: string
}

type WebFuzzerGroupColorStyle = CSSProperties & {
  '--web-fuzzer-group-color'?: string
  '--web-fuzzer-group-contrast-color'?: string
}

const customGroupColorPattern = /^#[0-9A-Fa-f]{6}$/

export const isCustomWebFuzzerGroupColor = (color?: string) => customGroupColorPattern.test(color || '')

export const getWebFuzzerGroupContrastColor = (color: string) => {
  if (!isCustomWebFuzzerGroupColor(color)) return ''
  const red = Number.parseInt(color.slice(1, 3), 16)
  const green = Number.parseInt(color.slice(3, 5), 16)
  const blue = Number.parseInt(color.slice(5, 7), 16)
  const luminance = (red * 299 + green * 587 + blue * 114) / 255000
  return luminance > 0.58 ? '#111827' : '#FFFFFF'
}

export const getCustomWebFuzzerGroupColorStyle = (color?: string): WebFuzzerGroupColorStyle => {
  if (!color || !isCustomWebFuzzerGroupColor(color)) return {}
  return {
    '--web-fuzzer-group-color': color.toUpperCase(),
    '--web-fuzzer-group-contrast-color': getWebFuzzerGroupContrastColor(color),
  }
}

const isGroupNode = (node: Pick<WebFuzzerPushNode, 'id'>) => node.id.endsWith('group')

const flattenNodes = (nodes: WebFuzzerPushNode[]): WebFuzzerPushNode[] => {
  const result: WebFuzzerPushNode[] = []
  const visit = (node: WebFuzzerPushNode) => {
    const children = node.groupChildren || []
    result.push({ ...node, groupChildren: [] })
    children.forEach(visit)
  }
  nodes.forEach(visit)
  return result
}

export const filterMissingWebFuzzerNodes = (currentNodes: MultipleNodeInfo[], incomingNodes: WebFuzzerPushNode[]) => {
  const currentIds = new Set(flattenNodes(currentNodes as WebFuzzerPushNode[]).map((node) => node.id))
  return incomingNodes.filter((node) => !currentIds.has(node.id))
}

const mergeNode = (current: WebFuzzerPushNode | undefined, changed: WebFuzzerPushNode): WebFuzzerPushNode => ({
  ...current,
  ...changed,
  groupId: changed.groupId || '0',
  pageParams:
    changed.pageParams === null
      ? current?.pageParams
      : {
          ...(current?.pageParams || {}),
          ...(changed.pageParams || {}),
          id: changed.id,
          groupId: changed.groupId || '0',
        },
  groupChildren: [],
})

export const rebuildWebFuzzerTabTree = (
  currentNodes: MultipleNodeInfo[],
  changedNodes: WebFuzzerPushNode[],
  deletedPageIds: string[],
): MultipleNodeInfo[] => {
  const deleted = new Set(deletedPageIds)
  const byId = new Map<string, WebFuzzerPushNode>()

  flattenNodes(currentNodes as WebFuzzerPushNode[]).forEach((node) => {
    if (!deleted.has(node.id)) byId.set(node.id, node)
  })
  changedNodes.forEach((node) => {
    if (!node?.id || deleted.has(node.id)) return
    byId.set(node.id, mergeNode(byId.get(node.id), node))
  })

  const groups = new Map<string, WebFuzzerPushNode>()
  const tabs: WebFuzzerPushNode[] = []
  byId.forEach((node) => {
    if (isGroupNode(node)) {
      groups.set(node.id, { ...node, groupId: '0', groupChildren: [] })
    } else {
      tabs.push({ ...node, groupChildren: [] })
    }
  })

  const childrenByGroup = new Map<string, WebFuzzerPushNode[]>()
  const ungrouped: WebFuzzerPushNode[] = []
  tabs.forEach((tab) => {
    if (tab.groupId !== '0' && groups.has(tab.groupId)) {
      const children = childrenByGroup.get(tab.groupId) || []
      children.push(tab)
      childrenByGroup.set(tab.groupId, children)
    } else {
      ungrouped.push({
        ...tab,
        groupId: '0',
        pageParams: tab.pageParams ? { ...tab.pageParams, groupId: '0' } : tab.pageParams,
      })
    }
  })

  const topLevel: WebFuzzerPushNode[] = [...ungrouped]
  groups.forEach((group) => {
    const children = childrenByGroup.get(group.id) || []
    if (children.length === 0) return
    topLevel.push({
      ...group,
      groupChildren: children.sort((a, b) => a.sortFieId - b.sortFieId),
    })
  })

  return topLevel.sort((a, b) => a.sortFieId - b.sortFieId) as MultipleNodeInfo[]
}

const toPageNode = (node: WebFuzzerPushNode, current?: PageNodeItemProps): PageNodeItemProps => {
  const base: PageNodeItemProps = {
    id: current?.id || `${node.id}-${node.sortFieId}`,
    routeKey: YakitRoute.HTTPFuzzer,
    pageGroupId: node.groupId,
    pageId: node.id,
    pageName: node.verbose,
    pageParamsInfo: current?.pageParamsInfo || {},
    sortFieId: node.sortFieId,
    expand: node.expand,
    color: node.color,
  }
  if (isGroupNode(node)) return base

  const currentInfo = current?.pageParamsInfo?.webFuzzerPageInfo
  const pageParams = node.pageParams || {}
  return {
    ...base,
    pageParamsInfo: {
      ...current?.pageParamsInfo,
      webFuzzerPageInfo: {
        ...currentInfo,
        pageId: node.id,
        advancedConfigValue: {
          ...defaultAdvancedConfigValue,
          ...currentInfo?.advancedConfigValue,
          ...pageParams,
        },
        advancedConfigShow: currentInfo?.advancedConfigShow,
        request: pageParams.request ?? currentInfo?.request ?? defaultPostTemplate,
        hotPatchCode: pageParams.hotPatchCode ?? currentInfo?.hotPatchCode ?? '',
      },
    },
  }
}

const flattenTreeInDisplayOrder = (nodes: MultipleNodeInfo[]): WebFuzzerPushNode[] => {
  const result: WebFuzzerPushNode[] = []
  const typedNodes = nodes as WebFuzzerPushNode[]
  typedNodes.forEach((node) => {
    result.push(node)
    const children = node.groupChildren || []
    children.forEach((child) => result.push(child))
  })
  return result
}

export const applyWebFuzzerTabMutation = (
  currentNodes: MultipleNodeInfo[],
  currentPage: PageProps | undefined,
  changedNodes: WebFuzzerPushNode[],
  deletedPageIds: string[],
  preferredPageId = '',
): ApplyWebFuzzerTabMutationResult => {
  const multipleNode = rebuildWebFuzzerTabTree(currentNodes, changedNodes, deletedPageIds)
  const currentByPageId = new Map((currentPage?.pageList || []).map((item) => [item.pageId, item]))
  const displayNodes = flattenTreeInDisplayOrder(multipleNode)
  const pageList = displayNodes.map((node) => toPageNode(node, currentByPageId.get(node.id)))
  const selectablePageIds = displayNodes.filter((node) => !isGroupNode(node)).map((node) => node.id)
  const previousSelected = currentPage?.currentSelectPageId || ''
  const selectedPageId = selectablePageIds.includes(preferredPageId)
    ? preferredPageId
    : selectablePageIds.includes(previousSelected)
      ? previousSelected
      : selectablePageIds[0] || ''

  return {
    multipleNode,
    page: {
      ...(currentPage || {
        pageList: [],
        routeKey: YakitRoute.HTTPFuzzer,
        singleNode: false,
        currentSelectPageId: '',
      }),
      routeKey: YakitRoute.HTTPFuzzer,
      pageList,
      currentSelectPageId: selectedPageId,
    },
    selectedPageId,
  }
}

export const countWebFuzzerTabs = (nodes: MultipleNodeInfo[]) =>
  nodes.reduce((total, node) => total + (node.groupChildren?.length || 1), 0)
