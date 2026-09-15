import type { MultipleNodeInfo } from './MainOperatorContentType'
/**
 * 检查缓存中的非根标签是否都有对应的父分组，为缺失的分组合成根节点。
 *
 * @param cache - 恢复出的标签缓存（可能含截断遗留的孤儿标签）
 * @returns 补齐合成分组后的缓存；无孤儿时原数组原样返回
 */
export const adoptOrphanCacheTabs = (cache: MultipleNodeInfo[]): MultipleNodeInfo[] => {
  // 缓存里分组的 id 就是子标签引用的 groupId，所以这里收集的是所有条目 id（含分组条目）
  const existingIds = new Set<string>()
  cache.forEach((ele) => existingIds.add(ele.id))

  const orphanGroupIds = new Set<string>()
  cache.forEach((ele) => {
    if (ele.groupId !== '0' && !existingIds.has(ele.groupId)) {
      orphanGroupIds.add(ele.groupId)
    }
  })
  if (orphanGroupIds.size === 0) return cache

  const adopted = [...cache]
  let groupCount = 0
  orphanGroupIds.forEach((groupId) => {
    // 同组孤儿中最大的 sortFieId 决定合成组的位置，保持截断前的组顺序
    const children = cache.filter((ele) => ele.groupId === groupId)
    const maxSortFieId = children.reduce((max, ele) => Math.max(max, ele.sortFieId || 0), 0)
    groupCount += 1
    adopted.push({
      id: groupId,
      groupId: '0',
      verbose: `未命名[恢复${groupCount}]`,
      sortFieId: maxSortFieId,
      expand: true,
      groupChildren: [],
    })
  })
  return adopted
}
