import { describe, expect, it } from 'vitest'
import type { MultipleNodeInfo } from '../MainOperatorContentType'
import { adoptOrphanCacheTabs } from '../adoptOrphanCacheTabs'

const tab = (id: string, groupId: string, sortFieId = 1, verbose = id): MultipleNodeInfo => ({
  id,
  groupId,
  verbose,
  sortFieId,
})

describe('adoptOrphanCacheTabs', () => {
  it('keeps the cache as-is when every non-root tab has its parent group', () => {
    const cache = [
      tab('tab-a', '0', 1),
      tab('tab-b', '0', 2),
      { ...tab('[xxx]-1-group', '0', 3, '组1'), expand: true },
      tab('tab-c', '[xxx]-1-group', 1),
    ]
    expect(adoptOrphanCacheTabs([...cache])).toEqual(cache)
  })

  it('synthesizes a parent group for orphan tabs and keeps them with their siblings', () => {
    // 缓存序列化为「子在前、父在后」：截断发生在子标签时父分组未被写入
    const cache = [tab('tab-a', '0', 1), tab('orphan-1', '[lost]-111-group', 1), tab('orphan-2', '[lost]-111-group', 2)]
    const result = adoptOrphanCacheTabs([...cache])

    expect(result).toHaveLength(4)
    // 孤儿没有被静默丢弃
    const restored = result.filter((ele) => ele.id === 'orphan-1' || ele.id === 'orphan-2')
    expect(restored).toHaveLength(2)
    // 为缺失的父分组合成了根节点，组 id 保持指向原 groupId
    const adopted = result.filter((ele) => ele.groupId === '0')
    expect(adopted.map((ele) => ele.id)).toEqual(['tab-a', '[lost]-111-group'])
    const group = adopted.find((ele) => ele.id === '[lost]-111-group')
    expect(group?.id.endsWith('group')).toBe(true)
    expect(group?.verbose).toContain('未命名')
    expect(group?.expand).toBe(true)
    expect(group?.sortFieId).toBeGreaterThan(0)
  })

  it('sorts synthesized groups after real root tabs by max child sortFieId', () => {
    const cache = [
      tab('orphan-1', '[g]-1-group', 5),
      tab('root-1', '0', 1),
      tab('root-2', '0', 2),
      tab('orphan-2', '[g]-1-group', 6),
    ]
    const result = adoptOrphanCacheTabs([...cache])
    const roots = result.filter((ele) => ele.groupId === '0')
    // 孤儿的 sortFieId(5/6) 在 root-2(2) 之后，合成组排在最后
    expect(roots.map((ele) => ele.id)).toEqual(['root-1', 'root-2', '[g]-1-group'])
  })

  it('keeps orphan tabs of a group whose parent is itself a truncated child group', () => {
    // 二级分组：孙标签的 groupId 指向子分组，子分组又被截断丢失
    const cache = [tab('grand-1', '[child]-9-group', 1)]
    const result = adoptOrphanCacheTabs([...cache])
    expect(result).toHaveLength(2)
    expect(result.some((ele) => ele.id === 'grand-1')).toBe(true)
    expect(result.find((ele) => ele.id === '[child]-9-group')?.groupId).toBe('0')
  })

  it('handles empty cache', () => {
    expect(adoptOrphanCacheTabs([])).toEqual([])
  })
})
