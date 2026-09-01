import type { FileNodeMapProps, FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import { FileDefault, FileSuffix, FolderDefault } from '@/pages/yakRunner/FileTree/icon'
import { getNameByPath, getPathParent, grpcFetchFileTree } from '@/pages/yakRunner/utils'
import { type FileMonitorItemProps, type FileMonitorProps, sendDuplexConn } from '@/utils/duplex/duplex'
import emiter from '@/utils/eventBus/eventBus'
import { StringToUint8Array } from '@/utils/str'
import { useMemoizedFn, useThrottleFn } from 'ahooks'
import cloneDeep from 'lodash/cloneDeep'
import { type MutableRefObject, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'

// #region useFileTree 相关定义
export interface UseFileTreeParams {
  /** 需要加载的(文件夹|文件)路径 */
  target: { path: string; isFolder: boolean }
  /** 文件树的初始化完成的回调 */
  onInitComplete?: () => void
  /** 触发文件树数据重渲染的事件 */
  onRefreshTreeData?: () => void
  /** 文件树节点被删除后的回调 */
  onTreeNodeDel?: (path: string, isFolder: boolean) => void
}

export interface UseFileTreeState {
  treeData: MutableRefObject<FileNodeProps | undefined>
  watchToken: MutableRefObject<string | undefined>
  folderChildrenSet: MutableRefObject<Set<string>>
}
export interface UseFileTreeEvents {
  /** 主动加载指定文件夹下的子集 */
  onLoadFolderChildren: (folderPath: string) => Promise<void>
  /** 刷新整棵文件树数据 */
  onResetTree: () => Promise<void>
  /** 获取指定节点的详情数据 */
  getDetailMap: (key: string) => FileNodeProps | undefined
}
// #endregion

function useFileTree(params: UseFileTreeParams): [UseFileTreeState, UseFileTreeEvents]

function useFileTree(params: UseFileTreeParams) {
  const { target, onInitComplete, onRefreshTreeData, onTreeNodeDel } = params || {}

  // 主动触发UI文件树更新
  const onTriggerUIUpdate = useThrottleFn(
    () => {
      onRefreshTreeData && onRefreshTreeData()
    },
    {
      wait: 400,
      leading: false,
    },
  ).run

  // #region 监听文件夹的改变(非软件主动操作的改变)
  const watchToken = useRef(uuidv4())
  // 结束文件夹监听
  const stopWatchFolder = useMemoizedFn(() => {
    const stopData = StringToUint8Array(
      JSON.stringify({
        operate: 'stop',
        id: watchToken.current,
      }),
    )
    sendDuplexConn({
      Data: stopData,
      MessageType: 'file_monitor',
      Timestamp: new Date().getTime(),
    })
  })
  // 启动文件夹监听
  const startWatchFolder = useMemoizedFn((folderPath: string) => {
    stopWatchFolder()
    const startData = StringToUint8Array(
      JSON.stringify({
        operate: 'new',
        path: folderPath,
        id: watchToken.current,
      }),
    )
    sendDuplexConn({
      Data: startData,
      MessageType: 'file_monitor',
      Timestamp: new Date().getTime(),
    })
  })
  // #endregion

  // #region 文件树-相关数据和方法
  // 文件树数据
  const treeData = useRef<FileNodeProps>()
  // 当前path对应的子集(文件/文件夹)
  const folderNodeSet = useRef<Set<string>>(new Set())

  // 文件树节点详情(不包含children数据)
  const nodeDetailMap = useRef<Map<string, FileNodeProps>>(new Map())
  const setNodeDetailMap = useMemoizedFn((node: FileNodeProps) => {
    nodeDetailMap.current.set(node.path, { ...node, children: undefined })
  })
  const deleteNodeDetailMap = useMemoizedFn((path: string) => {
    nodeDetailMap.current.delete(path)
  })

  // 获取指定节点的详情数据
  const getDetailMap = useMemoizedFn((key: string) => {
    return nodeDetailMap.current.get(key)
  })

  // 待获取子集的文件夹列表
  const pendingFolderList = useRef<string[]>([])

  // 初始化-开始获取文件树
  const initData = useMemoizedFn(async () => {
    try {
      const { path, isFolder } = target || {}
      if (!path) return
      const targetName = (await getNameByPath(path)) || path
      if (!targetName) return

      let icon = ''
      if (isFolder) {
        icon = FolderDefault
      } else {
        const suffix = targetName.indexOf('.') > -1 ? targetName.split('.').pop() : ''
        icon = suffix ? FileSuffix[suffix] || FileDefault : FileDefault
      }

      const node: FileNodeProps = {
        parent: null,
        name: targetName,
        path: path,
        isFolder: !!isFolder,
        icon: icon,
        depth: 1,
        isLeaf: !isFolder,
        children: [],
      }
      setNodeDetailMap(node)
      treeData.current = node
      if (isFolder) {
        pendingFolderList.current.push(path)
        startPolling()
        startWatchFolder(path)
      }
      onInitComplete && onInitComplete()
    } catch (error) {}
  })

  /**
   * 更新文件树的某个节点数据
   * 解释
   * - 这里传入的是更新节点的父节点，这样保证了节点一定在树数据中存在
   */
  const updateTreeNodeData = useMemoizedFn((newNode: FileNodeProps) => {
    try {
      if (!treeData.current || !newNode.path) return
      if (treeData.current.path === newNode.path) {
        treeData.current = cloneDeep(newNode)
        return
      }
      if (!treeData.current.children?.length) return

      const diffNode = (parent: FileNodeProps, oldNode: FileNodeProps, newNode: FileNodeProps) => {
        if (newNode.path.startsWith(oldNode.path)) {
          if (oldNode.path === newNode.path) {
            parent.children = parent.children?.map((item) => {
              if (item.path === newNode.path) {
                return cloneDeep(newNode)
              }
              return item
            })
          } else {
            if (!oldNode.children?.length) return
            for (const item of oldNode.children) {
              diffNode(oldNode, item, newNode)
            }
          }
        }
        return
      }

      for (const item of treeData.current.children) {
        diffNode(treeData.current, item, newNode)
      }
    } catch (error) {}
  })

  // 获取指定节点的父节点
  const getParentNode = useMemoizedFn((parentPath: string) => {
    try {
      if (!treeData.current || !parentPath) return null
      if (treeData.current.path === parentPath) return cloneDeep(treeData.current)
      if (!treeData.current.children?.length) return null

      let nodeDetail: FileNodeMapProps | null = null
      const diffNode = (nodeInfo: FileNodeProps, parentPath: string) => {
        if (parentPath.startsWith(nodeInfo.path)) {
          if (nodeInfo.path === parentPath) {
            nodeDetail = cloneDeep(nodeInfo)
            return
          } else {
            if (!nodeInfo.children?.length) return
            for (const item of nodeInfo.children) {
              diffNode(item, parentPath)
            }
          }
        }
        return
      }

      for (const item of treeData.current.children) {
        diffNode(item, parentPath)
      }
      return nodeDetail
    } catch (error) {
      return null
    }
  })
  // #endregion

  // #region 文件树数据操作方法
  // 删除文件夹
  const deleteFolder = useMemoizedFn((folderPath: string) => {
    if (folderPath === treeData.current?.path) {
      stopPolling()
      stopWatchFolder()
      handleReset()
      onTriggerUIUpdate()
      return
    }
    const nodeInfo = nodeDetailMap.current.get(folderPath)
    if (!nodeInfo || !nodeInfo.parent) return
    const parentNode = getParentNode(nodeInfo.parent)
    if (!parentNode) return
    parentNode.children = parentNode.children?.filter((item) => item.path !== folderPath)
    deleteNodeDetailMap(folderPath)
    parentNode.isLeaf = !parentNode.children?.length
    if (parentNode.isLeaf) setNodeDetailMap(parentNode)
    folderNodeSet.current.delete(folderPath)
    updateTreeNodeData(parentNode)
    onTriggerUIUpdate()
  })
  const hasChildPath = (parent: FileNodeProps, childPath: string) => {
    if (nodeDetailMap.current.has(childPath)) return true
    return !!parent.children?.some((item) => item.path === childPath)
  }
  const inflightCreate = useRef<Set<string>>(new Set())
  const beginCreate = (path: string) => {
    if (!path || inflightCreate.current.has(path) || nodeDetailMap.current.has(path)) return false
    inflightCreate.current.add(path)
    return true
  }
  const endCreate = (path: string) => {
    inflightCreate.current.delete(path)
  }

  // 创建文件夹
  const createFolder = useMemoizedFn(async (folderPath: string) => {
    if (!beginCreate(folderPath)) return
    try {
      const parentPath = await getPathParent(folderPath)
      const folderName = await getNameByPath(folderPath)
      if (!parentPath || !folderName) return
      const parentNode = getParentNode(parentPath)
      if (!parentNode) return
      if (hasChildPath(parentNode, folderPath)) return
      const newNode: FileNodeProps = {
        parent: parentPath,
        name: folderName,
        path: folderPath,
        isFolder: true,
        icon: '_fd_default',
        depth: parentNode.depth + 1,
        isLeaf: false,
      }
      setNodeDetailMap(newNode)
      pendingFolderList.current.push(folderPath)
      parentNode.children = (parentNode.children || []).concat([newNode])
      parentNode.isLeaf = false
      setNodeDetailMap(parentNode)
      updateTreeNodeData(parentNode)
      onTriggerUIUpdate()
    } catch (error) {
    } finally {
      endCreate(folderPath)
    }
  })
  // 创建临时文件夹
  const createTempFolder = useMemoizedFn(async (folderPath: string) => {
    if (!beginCreate(folderPath)) return
    try {
      const parentPath = await getPathParent(folderPath)
      const folderName = await getNameByPath(folderPath)
      if (!parentPath || !folderName) return
      const parentNode = getParentNode(parentPath)
      if (!parentNode) return
      if (hasChildPath(parentNode, folderPath)) return
      const newNode: FileNodeProps = {
        parent: parentPath,
        name: '',
        path: folderPath,
        isFolder: true,
        icon: '_fd_default',
        depth: parentNode.depth + 1,
        isLeaf: true,
        isCreate: true,
      }
      setNodeDetailMap(newNode)
      parentNode.children = (parentNode.children || []).concat([newNode])
      parentNode.isLeaf = false
      setNodeDetailMap(parentNode)
      updateTreeNodeData(parentNode)
      onTriggerUIUpdate()
    } catch (error) {
    } finally {
      endCreate(folderPath)
    }
  })
  // 重命名文件夹
  const renameFolder = useMemoizedFn(async (oldPath: string, newPath: string) => {
    try {
      const parentPath = await getPathParent(oldPath)
      const oldNode = nodeDetailMap.current.get(oldPath)
      if (!parentPath || !oldNode) return
      const parentNode = getParentNode(parentPath)
      const newName = await getNameByPath(newPath)
      const newNode: FileNodeProps = {
        ...oldNode,
        name: newName,
        path: newPath,
        isRename: false, // 退出编辑态
      }
      nodeDetailMap.current.delete(oldPath)
      setNodeDetailMap(newNode)
      pendingFolderList.current.push(newPath)
      if (parentNode) {
        parentNode.children = parentNode.children?.map((item) => (item.path === oldPath ? newNode : item))
        updateTreeNodeData(parentNode)
      } else {
        treeData.current = newNode
      }
      onTriggerUIUpdate()
    } catch (error) {}
  })

  // 删除文件
  const deleteFile = useMemoizedFn((filePath: string) => {
    const nodeInfo = nodeDetailMap.current.get(filePath)
    if (!nodeInfo || !nodeInfo.parent) return
    const parentNode = getParentNode(nodeInfo.parent)
    if (!parentNode) return
    parentNode.children = parentNode.children?.filter((item) => item.path !== filePath)
    deleteNodeDetailMap(filePath)
    parentNode.isLeaf = !parentNode.children?.length
    if (parentNode.isLeaf) setNodeDetailMap(parentNode)
    updateTreeNodeData(parentNode)
    onTriggerUIUpdate()
  })
  // 创建文件
  const createFile = useMemoizedFn(async (filePath: string) => {
    if (!beginCreate(filePath)) return
    try {
      const parentPath = await getPathParent(filePath)
      const fileName = await getNameByPath(filePath)
      if (!parentPath || !fileName) return
      const parentNode = getParentNode(parentPath)
      if (!parentNode) return
      if (hasChildPath(parentNode, filePath)) return
      const suffix = fileName.indexOf('.') > -1 ? fileName.split('.').pop() : ''
      const newNode: FileNodeProps = {
        parent: parentPath,
        name: fileName,
        path: filePath,
        isFolder: false,
        icon: suffix ? FileSuffix[suffix] || FileDefault : FileDefault,
        depth: parentNode.depth + 1,
        isLeaf: true,
      }
      setNodeDetailMap(newNode)
      parentNode.children = (parentNode.children || []).concat([newNode])
      parentNode.isLeaf = false
      setNodeDetailMap(parentNode)
      updateTreeNodeData(parentNode)
      onTriggerUIUpdate()
    } catch (error) {
    } finally {
      endCreate(filePath)
    }
  })
  // 创建临时文件
  const createTempFile = useMemoizedFn(async (filePath: string) => {
    if (!beginCreate(filePath)) return
    try {
      const parentPath = await getPathParent(filePath)
      const fileName = await getNameByPath(filePath)
      if (!parentPath || !fileName) return
      const parentNode = getParentNode(parentPath)
      if (!parentNode) return
      if (hasChildPath(parentNode, filePath)) return
      const newNode: FileNodeProps = {
        parent: parentPath,
        name: '',
        path: filePath,
        isFolder: false,
        icon: '_f_yak',
        depth: parentNode.depth + 1,
        isLeaf: true,
        isCreate: true,
      }
      setNodeDetailMap(newNode)
      parentNode.children = (parentNode.children || []).concat([newNode])
      parentNode.isLeaf = false
      setNodeDetailMap(parentNode)
      updateTreeNodeData(parentNode)
      onTriggerUIUpdate()
    } catch (error) {
    } finally {
      endCreate(filePath)
    }
  })
  // 重命名文件
  const renameFile = useMemoizedFn(async (oldPath: string, newPath: string) => {
    try {
      const parentPath = await getPathParent(oldPath)
      const oldNode = nodeDetailMap.current.get(oldPath)
      if (!parentPath || !oldNode) return
      const parentNode = getParentNode(parentPath)
      const newName = await getNameByPath(newPath)
      const suffix = newName.includes('.') ? newName.split('.').pop() : ''
      const newNode: FileNodeProps = {
        ...oldNode,
        name: newName,
        path: newPath,
        icon: suffix ? FileSuffix[suffix] || FileDefault : FileDefault,
        isRename: false, // 退出编辑态
      }
      nodeDetailMap.current.delete(oldPath)
      setNodeDetailMap(newNode)
      if (parentNode) {
        parentNode.children = parentNode.children?.map((item) => (item.path === oldPath ? newNode : item))
        updateTreeNodeData(parentNode)
      } else {
        treeData.current = newNode
      }
      onTriggerUIUpdate()
    } catch (error) {}
  })

  // 重命名前置或回滚
  const renameFrontOrRollback = useMemoizedFn(async (path: string, rename: boolean) => {
    try {
      const parentPath = await getPathParent(path)
      const node = nodeDetailMap.current.get(path)
      if (!parentPath || !node) return
      const parentNode = getParentNode(parentPath)
      const newNode = { ...node, isRename: rename }
      setNodeDetailMap(newNode)
      if (parentNode) {
        parentNode.children = parentNode.children?.map((item) => (item.path === path ? newNode : item))
        updateTreeNodeData(parentNode)
      } else {
        treeData.current = newNode
      }
      onTriggerUIUpdate()
    } catch (error) {}
  })

  // 标记只读
  const markReadOnly = useMemoizedFn(async (path: string) => {
    try {
      const parentPath = await getPathParent(path)
      const node = nodeDetailMap.current.get(path)
      if (!parentPath || !node) return
      const parentNode = getParentNode(parentPath)
      const newNode = { ...node, isReadOnly: true }
      setNodeDetailMap(newNode)
      if (parentNode) {
        parentNode.children = parentNode.children?.map((item) => (item.path === path ? newNode : item))
        updateTreeNodeData(parentNode)
      } else {
        treeData.current = newNode
      }
      onTriggerUIUpdate()
    } catch (error) {}
  })

  // 外界触发的调整文件树数据
  const onTriggerUpdateTreeData = useMemoizedFn(async (list: FileMonitorItemProps[]) => {
    for (const ev of list) {
      const { Op, Path, IsDir, NewPath } = ev

      if (IsDir) {
        switch (Op) {
          case 'delete':
            deleteFolder(Path)
            onTreeNodeDel?.(Path, true)
            break
          case 'create':
            await createFolder(Path)
            break
          case 'createTemp': // 前端使用
            await createTempFolder(Path)
            break
          case 'renameFront': // 前端使用
            await renameFrontOrRollback(Path, true)
            break
          case 'rename': // 前端使用
            await renameFolder(Path, NewPath!)
            break
          case 'renameRollback': // 前端使用
            await renameFrontOrRollback(Path, false)
            break
          case 'markReadOnly': // 前端使用
            await markReadOnly(Path)
            break
          default:
            break
        }
      } else {
        switch (Op) {
          case 'delete':
            deleteFile(Path)
            onTreeNodeDel?.(Path, false)
            break
          case 'create':
            await createFile(Path)
            break
          case 'createTemp': // 前端使用
            await createTempFile(Path)
            break
          case 'renameFront': // 前端使用
            await renameFrontOrRollback(Path, true)
            break
          case 'rename': // 前端使用
            await renameFile(Path, NewPath!)
            break
          case 'renameRollback': // 前端使用
            await renameFrontOrRollback(Path, false)
            break
          case 'markReadOnly': // 前端使用
            await markReadOnly(Path)
            break
          default:
            break
        }
      }
    }
  })

  // 文件树结构监控
  const onUpdateFileTree = useMemoizedFn((data) => {
    try {
      const event: FileMonitorProps = JSON.parse(data)
      if (watchToken.current !== event.Id) return

      const merged = [...(event.ChangeEvents || []), ...(event.CreateEvents || []), ...(event.DeleteEvents || [])]
      if (merged.length === 0) return
      const seen = new Set<string>()
      const unique = merged.filter((ev) => {
        const key = `${ev.Op}|${ev.IsDir ? '1' : '0'}|${ev.Path}|${ev.NewPath || ''}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      void onTriggerUpdateTreeData(unique).catch(() => {})
    } catch (error) {}
  })
  // #endregion

  // #region 循环获取文件树的每层子集
  // 正在执行的队列(最大并发为3)
  const executingQueue = useRef<string[]>([])
  // 循环计时器
  const pollingTimer = useRef<NodeJS.Timeout | null>(null)

  const isFolderChildrenPending = (folderPath: string) => {
    return (
      folderNodeSet.current.has(folderPath) ||
      pendingFolderList.current.includes(folderPath) ||
      executingQueue.current.includes(folderPath) ||
      executingQueue.current.includes(`${folderPath}-trigger`)
    )
  }

  const mergeFetchedChild = (item: FileNodeMapProps, parentDepth: number, prev?: FileNodeProps): FileNodeProps => {
    const childNode: FileNodeProps = {
      ...item,
      depth: parentDepth + 1,
      isLeaf: item.isFolder ? (prev?.isLeaf ?? false) : true,
      children: item.isFolder ? prev?.children : undefined,
      isCreate: prev?.isCreate,
      isRename: prev?.isRename,
      isDelete: prev?.isDelete,
      isReadOnly: prev?.isReadOnly,
    }
    if (!item.isFolder) childNode.isLeaf = true
    if (item.isFolder && !prev?.children?.length && !isFolderChildrenPending(item.path)) {
      pendingFolderList.current.push(item.path)
    }
    setNodeDetailMap(childNode)
    return childNode
  }

  // 处理接口返回的子集数据并更新所有数据（与监听 create 合并，不整体覆盖）
  const handleFetchChildrenResponse = useMemoizedFn((parentPath: string, res: FileNodeMapProps[], cb?: () => void) => {
    try {
      const parentMeta = nodeDetailMap.current.get(parentPath)
      if (!parentMeta) return

      const liveParent = getParentNode(parentPath) as FileNodeProps | null
      const existing = liveParent?.children || []
      const parentDepth = liveParent?.depth ?? parentMeta.depth

      if (!res?.length) {
        const newParentNode: FileNodeProps = {
          ...parentMeta,
          depth: parentDepth,
          isLeaf: existing.length === 0,
          children: existing,
        }
        setNodeDetailMap(newParentNode)
        updateTreeNodeData(newParentNode)
        folderNodeSet.current.add(parentPath)
        return
      }

      const apiByPath = new Map<string, FileNodeMapProps>()
      for (const item of res) {
        if (!item.path || apiByPath.has(item.path)) continue
        apiByPath.set(item.path, item)
      }

      const next: FileNodeProps[] = []
      const seenPath = new Set<string>()
      for (const prev of existing) {
        const apiItem = apiByPath.get(prev.path)
        next.push(apiItem ? mergeFetchedChild(apiItem, parentDepth, prev) : prev)
        seenPath.add(prev.path)
      }
      for (const item of res) {
        if (!item.path || seenPath.has(item.path)) continue
        next.push(mergeFetchedChild(item, parentDepth))
        seenPath.add(item.path)
      }

      const newParentNode: FileNodeProps = {
        ...parentMeta,
        depth: parentDepth,
        isLeaf: false,
        children: next,
      }
      setNodeDetailMap(newParentNode)
      updateTreeNodeData(newParentNode)
      folderNodeSet.current.add(parentPath)
    } catch (error) {
    } finally {
      cb && cb()
    }
  })

  // 获取文件夹的子集
  const fetchFolderChildren = useMemoizedFn((folderPath: string) => {
    executingQueue.current.push(folderPath)
    grpcFetchFileTree(folderPath)
      .then((res) => {
        handleFetchChildrenResponse(folderPath, res)
      })
      .catch(() => {
        // pendingFolderList.current.unshift(folderPath)
      })
      .finally(() => {
        executingQueue.current = executingQueue.current.filter((item) => item !== folderPath)
      })
  })

  // 开启轮询获取文件树
  const startPolling = useMemoizedFn(() => {
    if (pollingTimer.current) return

    if (pendingFolderList.current.length > 0) {
      const folderPath = pendingFolderList.current.shift()!
      fetchFolderChildren(folderPath)
    }

    pollingTimer.current = setInterval(() => {
      if (pendingFolderList.current.length === 0) return
      if (executingQueue.current.length >= 3) return
      const availableSlots = 3 - executingQueue.current.length
      // 将数组前三个裁剪出来
      const foldersToFetch = pendingFolderList.current.splice(0, availableSlots)
      foldersToFetch.forEach((folderPath) => {
        if (!folderPath) return
        fetchFolderChildren(folderPath)
      })
    }, 1000)
  })

  // 停止轮询获取文件树
  const stopPolling = useMemoizedFn(() => {
    if (pollingTimer.current) {
      clearInterval(pollingTimer.current)
      pollingTimer.current = null
    }
  })
  // #endregion

  // 主动加载指定文件夹的子集
  const loadFolderChildren = useMemoizedFn((folderPath: string) => {
    return new Promise<void>((resolve, reject) => {
      try {
        if (!folderPath) {
          reject('path is empty')
          return
        }
        if (pendingFolderList.current.includes(folderPath)) {
          pendingFolderList.current = pendingFolderList.current.filter((item) => item !== folderPath)
        }

        executingQueue.current.push(`${folderPath}-trigger`)
        grpcFetchFileTree(folderPath)
          .then((res) => {
            handleFetchChildrenResponse(folderPath, res, () => {
              resolve()
            })
          })
          .catch((err) => {
            reject(err)
          })
          .finally(() => {
            executingQueue.current = executingQueue.current.filter((item) => item !== `${folderPath}-trigger`)
          })
      } catch (error) {
        reject(error)
      }
    })
  })

  // 重置
  const handleReset = useMemoizedFn(() => {
    treeData.current = undefined
    folderNodeSet.current.clear()
    nodeDetailMap.current.clear()
    pendingFolderList.current = []
    executingQueue.current = []
    inflightCreate.current.clear()
  })

  // 刷新整棵文件树
  const onResetTree = useMemoizedFn(async () => {
    return new Promise<void>((resolve, reject) => {
      stopPolling()
      handleReset()
      initData()
      resolve()
    })
  })

  useEffect(() => {
    initData()

    // 文件树结构监控（监听非软件操作变化）
    emiter.on('onRefreshYakRunnerFileTree', onUpdateFileTree)

    return () => {
      emiter.off('onRefreshYakRunnerFileTree', onUpdateFileTree)
      stopPolling()
      stopWatchFolder()
      handleReset()
    }
  }, [])

  return [
    { treeData: treeData, watchToken: watchToken, folderChildrenSet: folderNodeSet },
    { onLoadFolderChildren: loadFolderChildren, onResetTree, getDetailMap },
  ]
}

export default useFileTree
