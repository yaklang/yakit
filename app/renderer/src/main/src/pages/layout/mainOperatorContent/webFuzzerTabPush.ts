import { defaultAdvancedConfigValue, defaultPostTemplate } from '@/defaultConstants/HTTPFuzzerPage'
import { YakitRoute } from '@/enums/yakitRoute'
import type { PageNodeItemProps, PageProps } from '@/store/pageInfo'
import type { MultipleNodeInfo } from './MainOperatorContentType'

/**
 * 服务端推送的 Web Fuzzer 节点。
 * pageParams 结构更松散，允许服务端只下发部分字段；
 * groupChildren 递归嵌套，支持多级分组。
 *
 * pageParams 语义约定：
 *  - null：服务端未提供，保留当前值（保持现状）；
 *  - undefined / 对象：与当前 pageParams 浅合并，空对象等价于无新增字段；
 *  - 见 mergeNode 实现。
 */
export type WebFuzzerPushNode = Omit<MultipleNodeInfo, 'pageParams' | 'groupChildren'> & {
  pageParams?: Record<string, any> | null
  groupChildren?: WebFuzzerPushNode[]
}

/** 将 update/delete 变更应用到 Web Fuzzer 标签树后返回的新状态。 */
export interface ApplyWebFuzzerTabMutationResult {
  multipleNode: MultipleNodeInfo[]
  page: PageProps
  selectedPageId: string
}

/** 判断节点是否为分组节点（约定 id 以 'group' 结尾）。 */
const isGroupNode = (node: Pick<WebFuzzerPushNode, 'id'>) => node.id.endsWith('group')

/** 深度优先展开整棵树，得到扁平节点列表。 */
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

/**
 * 从当前树中过滤出尚未存在的节点，用于 create 场景去重。
 * 当服务端推送 create 时，若本地已通过 live-cache 恢复部分节点，可避免重复创建。
 */
export const filterMissingWebFuzzerNodes = (currentNodes: MultipleNodeInfo[], incomingNodes: WebFuzzerPushNode[]) => {
  const currentIds = new Set(flattenNodes(currentNodes as WebFuzzerPushNode[]).map((node) => node.id))
  return incomingNodes.filter((node) => !currentIds.has(node.id))
}

/**
 * 合并变更节点与当前节点。
 * 规则：
 *  - groupId 缺省回退到顶层 '0'；
 *  - pageParams 为 null 时保留当前参数（服务端未提供）；
 *  - pageParams 非 null 时浅合并，并强制写入 id/groupId 保证一致性；
 *  - groupChildren 置空，后续由 rebuildWebFuzzerTabTree 重新归组。
 */
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

/**
 * 重建 Web Fuzzer 标签树。
 * 流程：
 *  1. 平铺旧树并移除被删除的节点；
 *  2. 合并服务端变更节点；
 *  3. 重新区分为分组 / 标签；
 *  4. 按 groupId 重新归组，无法归组的孤儿标签提升为顶层 '0'；
 *  5. 按 sortFieId 对分组内子标签及顶层节点排序。
 */
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

/**
 * 将服务端节点映射为前端 PageNodeItemProps，同时保留本地未覆盖的配置。
 * 关键：
 *  - 本地 request、hotPatchCode 仅当服务端显式下发时才覆盖；
 *  - advancedConfigValue 以默认值为基础，叠加当前值与服务端 pageParams，确保本地未提供的字段不被清空；
 *  - advancedConfigShow 原样保留，避免折叠状态被重置。
 */
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

/** 按界面展示顺序（父组在前，子标签随后）拍平树。 */
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

/**
 * 将服务端 update/delete 变更应用到当前 Web Fuzzer 状态。
 * 优先保留本地未覆盖的配置；选中页策略：
 *  - 若存在 preferredPageId 且仍在结果中，则聚焦它；
 *  - 否则尽量保持原先选中的子页；
 *  - 否则默认选中第一个叶子标签。
 */
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

/** 统计标签树中实际叶子标签数量（含分组内子标签）。 */
export const countWebFuzzerTabs = (nodes: MultipleNodeInfo[]) =>
  nodes.reduce((total, node) => total + (node.groupChildren?.length || 1), 0)
