import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { EventEmitter } from 'events'
import type { FileNodeMapProps, FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import type { FileMonitorProps } from '@/utils/duplex/duplex'

// --- hoisted mocks（vi.hoisted 保证变量在 vi.mock 提升后仍可访问） ---

const hoisted = vi.hoisted(() => {
  const mockGetPathParent = vi.fn<(path: string) => Promise<string>>()
  const mockGetNameByPath = vi.fn<(path: string) => Promise<string>>()
  const mockGrpcFetchFileTree = vi.fn<(path: string) => Promise<FileNodeMapProps[]>>()
  // EventEmitter 需在 hoisted 内构造，用 require 避免提升顺序问题
  const { EventEmitter: EE } = require('events')
  const mockEmiter = new EE()
  return { mockGetPathParent, mockGetNameByPath, mockGrpcFetchFileTree, mockEmiter }
})

vi.mock('@/pages/yakRunner/utils', () => ({
  getPathParent: (p: string) => hoisted.mockGetPathParent(p),
  getNameByPath: (p: string) => hoisted.mockGetNameByPath(p),
  grpcFetchFileTree: (p: string) => hoisted.mockGrpcFetchFileTree(p),
}))

vi.mock('@/utils/duplex/duplex', () => ({
  sendDuplexConn: vi.fn(),
}))

vi.mock('@/utils/eventBus/eventBus', () => ({
  default: hoisted.mockEmiter,
}))

vi.mock('uuid', () => ({
  v4: () => 'test-uuid-fixed',
}))

// 在测试文件内通过 hoisted 访问
const { mockGetPathParent, mockGetNameByPath, mockGrpcFetchFileTree, mockEmiter } = hoisted

import useFileTree from '../useFileTree'

// --- helpers ---

const ROOT_PATH = 'C:\\test\\project'

/** 从 path 取文件名（兼容 \\ 和 /） */
const basename = (p: string) => {
  const parts = p.replace(/\//g, '\\').split('\\').filter(Boolean)
  return parts[parts.length - 1] || ''
}

/** 从 path 取父目录 */
const dirname = (p: string) => {
  const parts = p.replace(/\//g, '\\').split('\\').filter(Boolean)
  if (parts.length <= 1) return ''
  return parts.slice(0, -1).join('\\')
}

/** 构造一个 FileNodeMapProps */
const makeNode = (path: string, isFolder: boolean): FileNodeMapProps => ({
  parent: dirname(path),
  name: basename(path),
  path,
  isFolder,
  icon: isFolder ? '_fd_default' : '_f_default',
})

/** setup path 工具 mock */
const setupPathMocks = () => {
  mockGetPathParent.mockImplementation((p: string) => Promise.resolve(dirname(p)))
  mockGetNameByPath.mockImplementation((p: string) => Promise.resolve(basename(p)))
}

/** 渲染 useFileTree 并等待初始化完成 */
const renderFileTree = async (target: { path: string; isFolder: boolean }) => {
  const onInitComplete = vi.fn()
  const onRefreshTreeData = vi.fn()
  const onTreeNodeDel = vi.fn()
  const { result } = renderHook(() => useFileTree({ target, onInitComplete, onRefreshTreeData, onTreeNodeDel }))
  // 等待 initData 完成
  await waitFor(() => {
    expect(result.current[0].treeData.current?.path).toBe(target.path)
  })
  return result
}

beforeEach(() => {
  vi.clearAllMocks()
  setupPathMocks()
  mockEmiter.removeAllListeners()
})

afterEach(() => {
  mockEmiter.removeAllListeners()
})

// --- tests ---

describe('useFileTree', () => {
  describe('初始化', () => {
    it('文件夹 target 应初始化根节点并开始轮询拉取子集', async () => {
      mockGrpcFetchFileTree.mockResolvedValue([])
      const result = await renderFileTree({ path: ROOT_PATH, isFolder: true })

      const { treeData, watchToken } = result.current[0]
      expect(treeData.current).toBeTruthy()
      expect(treeData.current!.path).toBe(ROOT_PATH)
      expect(treeData.current!.isFolder).toBe(true)
      expect(treeData.current!.depth).toBe(1)
      expect(watchToken.current).toBe('test-uuid-fixed')
    })

    it('文件 target 应初始化为叶子节点', async () => {
      const filePath = ROOT_PATH + '\\readme.md'
      const result = await renderFileTree({ path: filePath, isFolder: false })

      expect(result.current[0].treeData.current!.isLeaf).toBe(true)
      expect(result.current[0].treeData.current!.isFolder).toBe(false)
    })
  })

  describe('onLoadFolderChildren — 合并去重', () => {
    it('首次拉取子集应全部追加为 children', async () => {
      mockGrpcFetchFileTree.mockResolvedValue([])
      const result = await renderFileTree({ path: ROOT_PATH, isFolder: true })

      // 首次拉取：两个文件 + 一个文件夹
      const children: FileNodeMapProps[] = [
        makeNode(ROOT_PATH + '\\a.txt', false),
        makeNode(ROOT_PATH + '\\b.txt', false),
        makeNode(ROOT_PATH + '\\sub', true),
      ]
      mockGrpcFetchFileTree.mockResolvedValue(children)

      await act(async () => {
        await result.current[1].onLoadFolderChildren(ROOT_PATH)
      })

      const root = result.current[0].treeData.current!
      expect(root.children).toHaveLength(3)
      expect(root.children!.map((c) => c.path)).toEqual(
        expect.arrayContaining([ROOT_PATH + '\\a.txt', ROOT_PATH + '\\b.txt', ROOT_PATH + '\\sub']),
      )
    })

    it('接口返回重复 path 应去重，children 无重复 key', async () => {
      mockGrpcFetchFileTree.mockResolvedValue([])
      const result = await renderFileTree({ path: ROOT_PATH, isFolder: true })

      const dupFile = makeNode(ROOT_PATH + '\\dup.txt', false)
      mockGrpcFetchFileTree.mockResolvedValue([dupFile, { ...dupFile }, dupFile])

      await act(async () => {
        await result.current[1].onLoadFolderChildren(ROOT_PATH)
      })

      const root = result.current[0].treeData.current!
      const paths = root.children!.map((c) => c.path)
      const uniquePaths = [...new Set(paths)]
      expect(paths).toEqual(uniquePaths)
      expect(root.children).toHaveLength(1)
    })

    it('再次拉取应合并而非整体覆盖，保留接口未返回的节点', async () => {
      mockGrpcFetchFileTree.mockResolvedValue([])
      const result = await renderFileTree({ path: ROOT_PATH, isFolder: true })

      // 第一次拉取：a.txt, b.txt
      mockGrpcFetchFileTree.mockResolvedValue([
        makeNode(ROOT_PATH + '\\a.txt', false),
        makeNode(ROOT_PATH + '\\b.txt', false),
      ])
      await act(async () => {
        await result.current[1].onLoadFolderChildren(ROOT_PATH)
      })

      // 第二次拉取：只有 b.txt, c.txt（a.txt 未在返回中，应保留）
      mockGrpcFetchFileTree.mockResolvedValue([
        makeNode(ROOT_PATH + '\\b.txt', false),
        makeNode(ROOT_PATH + '\\c.txt', false),
      ])
      await act(async () => {
        await result.current[1].onLoadFolderChildren(ROOT_PATH)
      })

      const root = result.current[0].treeData.current!
      const paths = root.children!.map((c) => c.path)
      // a.txt 应保留（不被整体覆盖），c.txt 应新增，b.txt 不重复
      expect(paths).toContain(ROOT_PATH + '\\a.txt')
      expect(paths).toContain(ROOT_PATH + '\\c.txt')
      expect(paths.filter((p) => p === ROOT_PATH + '\\b.txt')).toHaveLength(1)
      // 无重复
      const uniquePaths = [...new Set(paths)]
      expect(paths).toEqual(uniquePaths)
    })

    it('接口返回为空且 existing 有节点时，不应标为 isLeaf', async () => {
      mockGrpcFetchFileTree.mockResolvedValue([])
      const result = await renderFileTree({ path: ROOT_PATH, isFolder: true })

      // 先拉取有子节点
      mockGrpcFetchFileTree.mockResolvedValue([makeNode(ROOT_PATH + '\\a.txt', false)])
      await act(async () => {
        await result.current[1].onLoadFolderChildren(ROOT_PATH)
      })

      // 再拉取返回空（existing 仍有 a.txt）
      mockGrpcFetchFileTree.mockResolvedValue([])
      await act(async () => {
        await result.current[1].onLoadFolderChildren(ROOT_PATH)
      })

      const root = result.current[0].treeData.current!
      expect(root.isLeaf).toBe(false)
      expect(root.children).toHaveLength(1)
    })

    it('接口返回为空且 existing 无节点时，应标为 isLeaf', async () => {
      mockGrpcFetchFileTree.mockResolvedValue([])
      const result = await renderFileTree({ path: ROOT_PATH, isFolder: true })

      mockGrpcFetchFileTree.mockResolvedValue([])
      await act(async () => {
        await result.current[1].onLoadFolderChildren(ROOT_PATH)
      })

      const root = result.current[0].treeData.current!
      expect(root.isLeaf).toBe(true)
    })
  })

  describe('getDetailMap', () => {
    it('应能通过 path 获取节点详情', async () => {
      mockGrpcFetchFileTree.mockResolvedValue([])
      const result = await renderFileTree({ path: ROOT_PATH, isFolder: true })

      mockGrpcFetchFileTree.mockResolvedValue([makeNode(ROOT_PATH + '\\a.txt', false)])
      await act(async () => {
        await result.current[1].onLoadFolderChildren(ROOT_PATH)
      })

      const detail = result.current[1].getDetailMap(ROOT_PATH + '\\a.txt')
      expect(detail).toBeTruthy()
      expect(detail!.path).toBe(ROOT_PATH + '\\a.txt')
      expect(detail!.isFolder).toBe(false)
    })
  })

  describe('文件监听事件去重', () => {
    it('同一批事件中重复的 create 应被去重', async () => {
      mockGrpcFetchFileTree.mockResolvedValue([])
      const result = await renderFileTree({ path: ROOT_PATH, isFolder: true })

      // 先拉取空子集让 root 有 children=[]
      mockGrpcFetchFileTree.mockResolvedValue([])
      await act(async () => {
        await result.current[1].onLoadFolderChildren(ROOT_PATH)
      })

      // 模拟监听事件：同一文件的 create 重复 3 次
      const event: FileMonitorProps = {
        Id: 'test-uuid-fixed',
        ChangeEvents: [],
        CreateEvents: [
          { Op: 'create', IsDir: false, Path: ROOT_PATH + '\\new.txt' },
          { Op: 'create', IsDir: false, Path: ROOT_PATH + '\\new.txt' },
          { Op: 'create', IsDir: false, Path: ROOT_PATH + '\\new.txt' },
        ],
        DeleteEvents: [],
      }

      await act(async () => {
        mockEmiter.emit('onRefreshYakRunnerFileTree', JSON.stringify(event))
      })

      await waitFor(() => {
        const root = result.current[0].treeData.current!
        const matches = root.children?.filter((c) => c.path === ROOT_PATH + '\\new.txt') || []
        expect(matches).toHaveLength(1)
      })
    })

    it('不同 path 的 create 应各自添加', async () => {
      mockGrpcFetchFileTree.mockResolvedValue([])
      const result = await renderFileTree({ path: ROOT_PATH, isFolder: true })

      mockGrpcFetchFileTree.mockResolvedValue([])
      await act(async () => {
        await result.current[1].onLoadFolderChildren(ROOT_PATH)
      })

      const event: FileMonitorProps = {
        Id: 'test-uuid-fixed',
        ChangeEvents: [],
        CreateEvents: [
          { Op: 'create', IsDir: false, Path: ROOT_PATH + '\\x.txt' },
          { Op: 'create', IsDir: false, Path: ROOT_PATH + '\\y.txt' },
        ],
        DeleteEvents: [],
      }

      await act(async () => {
        mockEmiter.emit('onRefreshYakRunnerFileTree', JSON.stringify(event))
      })

      await waitFor(() => {
        const root = result.current[0].treeData.current!
        expect(root.children?.some((c) => c.path === ROOT_PATH + '\\x.txt')).toBe(true)
        expect(root.children?.some((c) => c.path === ROOT_PATH + '\\y.txt')).toBe(true)
      })
    })

    it('监听事件 create 的文件已在 children 中时不重复添加', async () => {
      mockGrpcFetchFileTree.mockResolvedValue([])
      const result = await renderFileTree({ path: ROOT_PATH, isFolder: true })

      // 先通过拉取添加 existing.txt
      mockGrpcFetchFileTree.mockResolvedValue([makeNode(ROOT_PATH + '\\existing.txt', false)])
      await act(async () => {
        await result.current[1].onLoadFolderChildren(ROOT_PATH)
      })

      // 监听事件再次 create 同一文件
      const event: FileMonitorProps = {
        Id: 'test-uuid-fixed',
        ChangeEvents: [],
        CreateEvents: [{ Op: 'create', IsDir: false, Path: ROOT_PATH + '\\existing.txt' }],
        DeleteEvents: [],
      }

      await act(async () => {
        mockEmiter.emit('onRefreshYakRunnerFileTree', JSON.stringify(event))
      })

      await waitFor(() => {
        const root = result.current[0].treeData.current!
        const matches = root.children?.filter((c) => c.path === ROOT_PATH + '\\existing.txt') || []
        expect(matches).toHaveLength(1)
      })
    })

    it('watchToken 不匹配的事件应被忽略', async () => {
      mockGrpcFetchFileTree.mockResolvedValue([])
      const result = await renderFileTree({ path: ROOT_PATH, isFolder: true })

      mockGrpcFetchFileTree.mockResolvedValue([])
      await act(async () => {
        await result.current[1].onLoadFolderChildren(ROOT_PATH)
      })

      const beforeChildren = result.current[0].treeData.current!.children?.length || 0

      const event: FileMonitorProps = {
        Id: 'wrong-token',
        ChangeEvents: [],
        CreateEvents: [{ Op: 'create', IsDir: false, Path: ROOT_PATH + '\\ignored.txt' }],
        DeleteEvents: [],
      }

      await act(async () => {
        mockEmiter.emit('onRefreshYakRunnerFileTree', JSON.stringify(event))
      })

      const afterChildren = result.current[0].treeData.current!.children?.length || 0
      expect(afterChildren).toBe(beforeChildren)
    })
  })

  describe('onResetTree — 重置', () => {
    it('重置后应清空 treeData 并重新初始化', async () => {
      mockGrpcFetchFileTree.mockResolvedValue([])
      const result = await renderFileTree({ path: ROOT_PATH, isFolder: true })

      // 添加子节点
      mockGrpcFetchFileTree.mockResolvedValue([makeNode(ROOT_PATH + '\\a.txt', false)])
      await act(async () => {
        await result.current[1].onLoadFolderChildren(ROOT_PATH)
      })
      expect(result.current[0].treeData.current!.children?.length).toBeGreaterThan(0)

      // 重置
      mockGrpcFetchFileTree.mockResolvedValue([])
      await act(async () => {
        await result.current[1].onResetTree()
      })

      await waitFor(() => {
        const root = result.current[0].treeData.current!
        expect(root.path).toBe(ROOT_PATH)
        // 重置后重新初始化，children 应为初始状态
        expect(root.children?.length || 0).toBe(0)
      })
    })
  })
})
