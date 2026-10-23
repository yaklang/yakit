import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getRemoteValue, setRemoteValue, addCustomFolderItem, removeCustomFolderItem } = vi.hoisted(() => ({
  getRemoteValue: vi.fn(async () => ''),
  setRemoteValue: vi.fn(async () => undefined),
  addCustomFolderItem: vi.fn(),
  removeCustomFolderItem: vi.fn(),
}))

vi.mock('@/utils/kv', () => ({ getRemoteValue, setRemoteValue }))
vi.mock('../useCustomFolder', () => ({
  customFolderStore: {
    addCustomFolderItem,
    removeCustomFolderItem,
  },
}))

import { historyStore } from '../useHistoryFolder'

describe('historyStore.addHistoryItem', () => {
  beforeEach(() => {
    historyStore.clearHistory()
    getRemoteValue.mockReset()
    setRemoteValue.mockReset()
    addCustomFolderItem.mockReset()
    removeCustomFolderItem.mockReset()
    getRemoteValue.mockResolvedValue('')
    setRemoteValue.mockResolvedValue(undefined)
  })

  it('重复添加同 path：长度不变且该项移到末尾，存储为 trim 后 path', async () => {
    await historyStore.addHistoryItem({ path: '  /a  ', isFolder: true })
    await historyStore.addHistoryItem({ path: '/b', isFolder: false })
    await historyStore.addHistoryItem({ path: '/a', isFolder: true })

    const list = historyStore.getSnapshot()
    expect(list).toHaveLength(2)
    expect(list.map((item) => item.path)).toEqual(['/b', '/a'])
    expect(list[1]).toEqual({ path: '/a', isFolder: true })
    expect(addCustomFolderItem).toHaveBeenLastCalledWith({ path: '/a', isFolder: true })
  })

  it('超过 5 条时仅保留最近 5 条', async () => {
    for (let i = 1; i <= 6; i += 1) {
      await historyStore.addHistoryItem({ path: `/p${i}`, isFolder: true })
    }

    const list = historyStore.getSnapshot()
    expect(list).toHaveLength(5)
    expect(list.map((item) => item.path)).toEqual(['/p2', '/p3', '/p4', '/p5', '/p6'])
  })
})
