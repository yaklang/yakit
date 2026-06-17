import { failed, warn, yakitNotify } from '@/utils/notification'
import i18n from '@/i18n/i18n'
import { CodeScoreSmokingEvaluateResponseProps } from '../plugins/funcTemplateType'
import { RequestYakURLResponse } from '../yakURLTree/data'
import { FileNodeMapProps, FileNodeProps, FileTreeListProps } from './FileTree/FileTreeType'
import { FileDefault, FileSuffix, FolderDefault } from './FileTree/icon'
import { StringToUint8Array, Uint8ArrayToString } from '@/utils/str'
import {
  ConvertYakStaticAnalyzeErrorToMarker,
  IMonacoEditorMarker,
  YakStaticAnalyzeErrorResult,
} from '@/utils/editorMarkers'
import { AreaInfoProps, TabFileProps, YakRunnerHistoryProps } from './YakRunnerType'
import cloneDeep from 'lodash/cloneDeep'
import { FileDetailInfo, OptionalFileDetailInfo } from './RunnerTabs/RunnerTabsType'
import { v4 as uuidv4 } from 'uuid'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import emiter from '@/utils/eventBus/eventBus'
import { setMapFileDetail, getMapFileDetail } from './FileTreeMap/FileMap'
import { setMapFolderDetail } from './FileTreeMap/ChildMap'
import { randomString } from '@/utils/randomUtil'
import { YaklangMonacoSpec } from '@/utils/monacoSpec/yakEditor'
import { SyntaxFlowMonacoSpec } from '@/utils/monacoSpec/syntaxflowEditor'
import { handleOpenFileSystemDialog } from '@/utils/fileSystemDialog'

const { ipcRenderer } = window.require('electron')
const tOriginal = i18n.getFixedT(null, 'yakRunner')

export const initFileTreeData = (list: RequestYakURLResponse, path?: string | null) => {
  return list.Resources.sort((a, b) => {
    // 将 ResourceType 为 'dir' 的对象排在前面
    if (a.ResourceType === 'dir' && b.ResourceType !== 'dir') {
      return -1 // a排在b前面
    } else if (a.ResourceType !== 'dir' && b.ResourceType === 'dir') {
      return 1 // b排在a前面
    } else {
      return 0 // 保持原有顺序
    }
  }).map((item) => {
    const isFile = !item.ResourceType
    const isFolder = item.ResourceType === 'dir'
    const suffix = isFile && item.ResourceName.indexOf('.') > -1 ? item.ResourceName.split('.').pop() : ''
    const isLeaf = isFile || !item.HaveChildrenNodes
    return {
      parent: path || null,
      name: item.ResourceName,
      path: item.Path,
      isFolder: isFolder,
      icon: isFolder ? FolderDefault : suffix ? FileSuffix[suffix] || FileDefault : FileDefault,
      isLeaf,
    }
  })
}

/**
 * @name 文件树获取
 */
export const grpcFetchFileTree: (path: string) => Promise<FileNodeMapProps[]> = (path) => {
  return new Promise(async (resolve, reject) => {
    // local
    const params = {
      Method: 'GET',
      Url: { Schema: 'file', Query: [{ Key: 'op', Value: 'list' }], Path: path },
    }

    try {
      const res: RequestYakURLResponse = await ipcRenderer.invoke('RequestYakURL', params)
      // console.log("文件树获取---", res)
      const data: FileNodeMapProps[] = initFileTreeData(res, path)
      resolve(data)
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * @name 文件树重命名
 */
export const grpcFetchRenameFileTree: (
  path: string,
  newName: string,
  parentPath: string | null,
) => Promise<FileNodeMapProps[]> = (path, newName, parentPath) => {
  return new Promise(async (resolve, reject) => {
    const params = {
      Method: 'POST',
      Url: {
        Schema: 'file',
        Query: [
          { Key: 'op', Value: 'rename' },
          {
            Key: 'newname',
            Value: newName,
          },
        ],
        Path: path,
      },
    }
    try {
      const list: RequestYakURLResponse = await ipcRenderer.invoke('RequestYakURL', params)
      // console.log("文件树重命名", params, list)
      const data: FileNodeMapProps[] = initFileTreeData(list, parentPath)
      resolve(data)
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * @name 文件保存
 */
/** 统一路径分隔符，便于 Win/Mac 比较（`C:\a` === `C:/a`） */
export const normalizeYakRunnerFilePath = (filePath?: string | null): string => {
  const path = filePath?.trim() || ''
  if (!path) return ''
  return path.replace(/\\/g, '/')
}

export const isSameYakRunnerFilePath = (a?: string | null, b?: string | null): boolean => {
  const left = normalizeYakRunnerFilePath(a)
  const right = normalizeYakRunnerFilePath(b)
  if (!left || !right) return false
  if (/^[a-zA-Z]:\//.test(left) || /^[a-zA-Z]:\//.test(right)) {
    return left.toLowerCase() === right.toLowerCase()
  }
  return left === right
}

/** 是否为磁盘上的绝对路径（含 Win 盘符、UNC） */
export const isYakRunnerAbsoluteFilePath = (filePath?: string | null): boolean => {
  const path = normalizeYakRunnerFilePath(filePath)
  if (!path) return false
  if (/^[a-zA-Z]:\//.test(path)) return true
  if (path.startsWith('//')) return true
  if (path.startsWith('/')) return true
  return false
}

/** 临时/未命名 tab 的 path（如 Untitled、文件树 `-create` 占位） */
export const isYakRunnerScratchFilePath = (filePath?: string | null): boolean => {
  const raw = filePath?.trim()
  if (!raw) return true
  const path = normalizeYakRunnerFilePath(raw)
  if (isYakRunnerAbsoluteFilePath(path)) return false
  if (/-Untitle-\d+\.yak$/i.test(path)) return true
  if (/-create$/i.test(path)) return true
  if (/^\d{10,}-/.test(path)) return true
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i.test(path)) return true
  return true
}

/** 是否应弹出「另存为」：仅 `op:create` 或临时文件；`op:replace` 且有绝对路径则直接覆盖保存 */
export const shouldYakRunnerFileSaveAs = (file: { path?: string; needsSaveAs?: boolean }): boolean => {
  if (file.needsSaveAs === true) return true
  if (file.needsSaveAs === false) return false
  return isYakRunnerScratchFilePath(file.path)
}

export const grpcFetchSaveFile: (path: string, code: string) => Promise<FileNodeMapProps[]> = (path, code) => {
  return new Promise(async (resolve, reject) => {
    const params = {
      Method: 'POST',
      Url: {
        Schema: 'file',
        Query: [{ Key: 'op', Value: 'content' }],
        Path: path,
      },
      // Body: []byte(fileContent),
      Body: StringToUint8Array(code),
    }
    try {
      const list: RequestYakURLResponse = await ipcRenderer.invoke('RequestYakURL', params)
      // console.log("文件保存", params, list)
      const data: FileNodeMapProps[] = initFileTreeData(list, path)
      resolve(data)
    } catch (error) {
      reject(error)
    }
  })
}

export type SaveYakRunnerUnsavedFileParams = {
  file: FileDetailInfo
  areaInfo: AreaInfoProps[]
  fileTree: FileTreeListProps[]
  defaultSavePath?: string
}

export type SaveYakRunnerUnsavedFileResult = {
  areaInfo: AreaInfoProps[]
  file: FileDetailInfo
  saved: boolean
  canceled?: boolean
}

/** Yak Runner 未保存文件落盘：`replace`/绝对路径直接覆盖，临时文件或 `create` 走另存为 */
export async function saveYakRunnerUnsavedFile(
  params: SaveYakRunnerUnsavedFileParams,
): Promise<SaveYakRunnerUnsavedFileResult> {
  const { file, areaInfo, fileTree, defaultSavePath = '' } = params
  const code = file.code || ''

  if (!shouldYakRunnerFileSaveAs(file)) {
    await grpcFetchSaveFile(file.path, code)
    const savedFile: FileDetailInfo = { ...file, isUnSave: false, needsSaveAs: false }
    const newAreaInfo = updateAreaFileInfo(areaInfo, savedFile, file.path)
    return { areaInfo: newAreaInfo, file: savedFile, saved: true }
  }

  const res = await ipcRenderer.invoke(
    'show-save-dialog',
    `${defaultSavePath}${defaultSavePath ? '/' : ''}${file.name}`,
  )
  const path = res.filePath
  const name = res.name
  if (!path?.length) {
    return { areaInfo, file, saved: false, canceled: true }
  }

  const suffix = name.split('.').pop()
  const savedFile: FileDetailInfo = {
    ...file,
    path,
    isUnSave: false,
    needsSaveAs: false,
    language: monacaLanguageType(suffix || ''),
  }
  const parentPath = await getPathParent(savedFile.path)
  const parentDetail = getMapFileDetail(parentPath)
  const result = await grpcFetchCreateFile(savedFile.path, savedFile.code, parentDetail.isReadFail ? '' : parentPath)

  if (fileTree.length > 0 && savedFile.path.startsWith(fileTree[0].path)) {
    const arr = await grpcFetchFileTree(parentPath)
    if (arr.length > 0) {
      const childArr: string[] = []
      arr.forEach((item) => {
        childArr.push(item.path)
        setMapFileDetail(item.path, item)
      })
      setMapFolderDetail(parentPath, childArr)
    }
    emiter.emit('onRefreshFileTree', parentPath)
  }

  if (result.length > 0) {
    savedFile.name = result[0].name
    savedFile.isDelete = false
    const removeAreaInfo = removeYakRunnerAreaFileInfo(areaInfo, savedFile).newAreaInfo
    const newAreaInfo = updateAreaFileInfo(removeAreaInfo, savedFile, file.path)
    setYakRunnerHistory({ isFile: true, name, path })
    return { areaInfo: newAreaInfo, file: savedFile, saved: true }
  }

  return { areaInfo, file, saved: false }
}

/**
 * @name 新建文件
 */
export const grpcFetchCreateFile: (
  path: string,
  code?: string | null,
  parentPath?: string | null,
) => Promise<FileNodeMapProps[]> = (path, code, parentPath) => {
  return new Promise(async (resolve, reject) => {
    const params: any = {
      Method: 'PUT',
      Url: {
        Schema: 'file',
        Query: [{ Key: 'type', Value: 'file' }],
        Path: path,
      },
    }
    if (code && code.length > 0) {
      params.Body = StringToUint8Array(code)
    }
    try {
      const list: RequestYakURLResponse = await ipcRenderer.invoke('RequestYakURL', params)
      // console.log("新建文件", params, list)
      const data: FileNodeMapProps[] = initFileTreeData(list, parentPath)
      resolve(data)
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * @name 新建文件夹
 */
export const grpcFetchCreateFolder: (path: string, parentPath?: string | null) => Promise<FileNodeMapProps[]> = (
  path,
  parentPath,
) => {
  return new Promise(async (resolve, reject) => {
    const params = {
      Method: 'PUT',
      Url: {
        Schema: 'file',
        Query: [{ Key: 'type', Value: 'dir' }],
        Path: path,
      },
    }
    try {
      const list: RequestYakURLResponse = await ipcRenderer.invoke('RequestYakURL', params)
      // console.log("新建文件夹", params, list)
      const data: FileNodeMapProps[] = initFileTreeData(list, parentPath)
      resolve(data)
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * @name 删除文件
 */
export const grpcFetchDeleteFile: (path: string) => Promise<FileNodeMapProps[]> = (path) => {
  return new Promise(async (resolve, reject) => {
    const params = {
      Method: 'DELETE',
      Url: {
        Schema: 'file',
        Path: path,
        Query: [{ Key: 'trash', Value: 'true' }],
      },
    }
    try {
      const list: RequestYakURLResponse = await ipcRenderer.invoke('RequestYakURL', params)
      // console.log("删除文件", params, list)
      const data: FileNodeMapProps[] = initFileTreeData(list, path)
      resolve(data)
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * @name 删除已编译项目
 */
export const grpcFetchDeleteAudit: (path: string) => Promise<FileNodeMapProps[]> = (path) => {
  return new Promise(async (resolve, reject) => {
    const params = {
      Method: 'DELETE',
      Url: {
        Schema: 'ssadb',
        Path: path,
        Query: [{ Key: 'trash', Value: 'true' }],
      },
    }
    try {
      const list: RequestYakURLResponse = await ipcRenderer.invoke('RequestYakURL', params)
      // console.log("删除已编译项目", params, list)
      const data: FileNodeMapProps[] = initFileTreeData(list, path)
      resolve(data)
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * @name 粘贴文件
 */
export const grpcFetchPasteFile: (
  path: string,
  code?: string | null,
  parentPath?: string | null,
) => Promise<FileNodeMapProps[]> = (path, code, parentPath) => {
  return new Promise(async (resolve, reject) => {
    const params: any = {
      Method: 'PUT',
      Url: {
        Schema: 'file',
        Query: [
          { Key: 'type', Value: 'file' },
          { Key: 'paste', Value: 'true' },
        ],
        Path: path,
      },
    }
    if (code && code.length > 0) {
      params.Body = StringToUint8Array(code)
    }
    try {
      const list: RequestYakURLResponse = await ipcRenderer.invoke('RequestYakURL', params)
      // console.log("粘贴文件", params, list)
      const data: FileNodeMapProps[] = initFileTreeData(list, parentPath)
      resolve(data)
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * @name 最大限制10M
 */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

/**
 * @name 根据文件path获取其大小并判断其是否为文本
 */
export const getCodeSizeByPath = (
  path: string,
  loadTreeType?: 'file' | 'audit',
): Promise<{ size: number; isPlainText: boolean }> => {
  return new Promise(async (resolve, reject) => {
    const params = {
      Method: 'GET',
      Url: {
        Schema: loadTreeType === 'audit' ? 'ssadb' : 'file',
        Path: path,
        Query: [{ Key: 'detectPlainText', Value: 'true' }],
      },
    }
    try {
      const list: RequestYakURLResponse = await ipcRenderer.invoke('RequestYakURL', params)
      const size = parseInt(list.Resources[0].Size + '')
      let isPlainText: boolean = true
      list.Resources[0].Extra.forEach((item) => {
        if (item.Key === 'IsPlainText' && item.Value === 'false') {
          isPlainText = false
        }
      })
      resolve({
        size,
        isPlainText,
      })
    } catch (error) {
      reject(error)
    }
  })
}

const getCodeByNode = (path: string): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    ipcRenderer
      .invoke('read-file-content', path)
      .then((res) => {
        resolve(res)
      })
      .catch(() => {
        failed(tOriginal('YakRunner.readFileFailed'))
        reject()
      })
  })
}

/**
 * @name 根据文件path获取其内容
 */
export const getCodeByPath = (path: string, loadTreeType?: 'file' | 'audit'): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    try {
      let content: string = ''
      const token = randomString(60)
      ipcRenderer.invoke(
        'ReadFile',
        { FilePath: path, FileSystem: loadTreeType === 'audit' ? 'ssadb' : 'local' },
        token,
      )
      ipcRenderer.on(`${token}-data`, (e, result: { Data: Uint8Array; EOF: boolean }) => {
        content += Uint8ArrayToString(result.Data)
        if (result.EOF) {
          resolve(content)
        }
      })
      ipcRenderer.on(`${token}-error`, async (e, error) => {
        // 此处在 ssadb 模式时不做node兼容处理
        try {
          let newContent = await getCodeByNode(path)
          resolve(newContent)
        } catch (error) {
          failed(tOriginal('YakRunner.readFileFailedWithError', { error }))
          reject()
        }
      })
      ipcRenderer.on(`${token}-end`, (e, data) => {
        ipcRenderer.removeAllListeners(`${token}-data`)
        ipcRenderer.removeAllListeners(`${token}-error`)
        ipcRenderer.removeAllListeners(`${token}-end`)
      })
    } catch (error) {}
  })
}

/**
 * @name 更新树数据里某个节点的children数据
 */
export const updateFileTree: (
  oldFileTree: FileTreeListProps[],
  path: string,
  updateData: FileTreeListProps[],
) => FileTreeListProps[] = (oldFileTree, path, updateData) => {
  if (!path) return oldFileTree

  const isValid = updateData && updateData.length > 0

  return oldFileTree.map((node) => {
    if (node.path === path) {
      return { ...node, children: isValid ? updateData : undefined }
    }
    if (node.children && node.children.length > 0) {
      return {
        ...node,
        children: updateFileTree(node.children, path, updateData),
      }
    }
    return node
  })
}

/**
 * @name 语法检查
 */
export const onSyntaxCheck = (code: string, type: string) => {
  return new Promise(async (resolve, reject) => {
    // StaticAnalyzeError
    ipcRenderer
      .invoke('StaticAnalyzeError', { Code: StringToUint8Array(code), PluginType: type })
      .then((e: { Result: YakStaticAnalyzeErrorResult[] }) => {
        if (e && e.Result.length > 0) {
          const markers = e.Result.map(ConvertYakStaticAnalyzeErrorToMarker)
          // monaco.editor.setModelMarkers(model, "owner", markers)
          resolve(markers)
        } else {
          resolve([])
        }
      })
      .catch(() => {
        resolve([])
      })
  })
}

/**
 * @name 判断分栏数据里是否存在未保存文件
 */
export const judgeAreaExistFileUnSave = (areaInfo: AreaInfoProps[]): Promise<string[]> => {
  return new Promise(async (resolve, reject) => {
    let unSaveArr: string[] = []
    const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
    newAreaInfo.forEach((item, index) => {
      item.elements.forEach((itemIn, indexIn) => {
        itemIn.files.forEach((file, fileIndex) => {
          if (file.isUnSave) {
            unSaveArr.push(file.path)
          }
        })
      })
    })
    resolve(unSaveArr)
  })
}

/**
 * @name 判断分栏数据里是否存在某个节点file数据
 */
export const judgeAreaExistFilePath = (areaInfo: AreaInfoProps[], path: string): Promise<FileDetailInfo | null> => {
  return new Promise(async (resolve, reject) => {
    const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
    newAreaInfo.forEach((item, index) => {
      item.elements.forEach((itemIn, indexIn) => {
        itemIn.files.forEach((file, fileIndex) => {
          if (isSameYakRunnerFilePath(file.path, path)) {
            resolve(file)
          }
        })
      })
    })
    resolve(null)
  })
}

/**
 * @name 判断分栏数据里是否存在某些节点file数据
 */
export const judgeAreaExistFilesPath = (areaInfo: AreaInfoProps[], pathArr: string[]): Promise<FileDetailInfo[]> => {
  return new Promise(async (resolve, reject) => {
    const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
    let hasArr: FileDetailInfo[] = []
    newAreaInfo.forEach((item, index) => {
      item.elements.forEach((itemIn, indexIn) => {
        itemIn.files.forEach((file, fileIndex) => {
          if (pathArr.includes(file.path)) {
            hasArr.push(file)
          }
        })
      })
    })
    resolve(hasArr)
  })
}

/**
 * @name 更新分栏数据里某个节点的file数据
 */
// 根据path更新指定内容
export const updateAreaFileInfo = (areaInfo: AreaInfoProps[], data: OptionalFileDetailInfo, path: string) => {
  const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
  newAreaInfo.forEach((item, index) => {
    item.elements.forEach((itemIn, indexIn) => {
      itemIn.files.forEach((file, fileIndex) => {
        if (isSameYakRunnerFilePath(file.path, path)) {
          newAreaInfo[index].elements[indexIn].files[fileIndex] = {
            ...newAreaInfo[index].elements[indexIn].files[fileIndex],
            ...data,
          }
        }
      })
    })
  })
  return newAreaInfo
}

/**
 * @name 更新分栏数据里某些节点file数据为被删除待保存状态
 */
export const updateAreaFileInfoToDelete = (areaInfo: AreaInfoProps[], path?: string) => {
  const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
  newAreaInfo.forEach((item, index) => {
    item.elements.forEach((itemIn, indexIn) => {
      itemIn.files.forEach((file, fileIndex) => {
        if (path && (file.path === path || file.path.startsWith(path))) {
          newAreaInfo[index].elements[indexIn].files[fileIndex] = {
            ...newAreaInfo[index].elements[indexIn].files[fileIndex],
            isDelete: true,
            isUnSave: true,
            path: `${uuidv4()}-Delete`,
          }
        }
      })
    })
  })
  return newAreaInfo
}

/**
 * @name 更新分栏数据里所选节点的path与parent信息(重命名文件夹导致其内部文件path与parent发生变化)
 */
export const updateAreaFilesPathInfo = (
  areaInfo: AreaInfoProps[],
  path: string[],
  oldPath: string,
  newPath: string,
) => {
  const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
  newAreaInfo.forEach((item, index) => {
    item.elements.forEach((itemIn, indexIn) => {
      itemIn.files.forEach((file, fileIndex) => {
        if (path.includes(file.path)) {
          newAreaInfo[index].elements[indexIn].files[fileIndex] = {
            ...newAreaInfo[index].elements[indexIn].files[fileIndex],
            path: file.path.replace(oldPath, newPath),
            parent: file.parent ? file.parent.replace(oldPath, newPath) : null,
          }
        }
      })
    })
  })
  return newAreaInfo
}

/**
 * @name 删除分栏数据里某个节点的file数据
 */
export const removeYakRunnerAreaFileInfo = (areaInfo: AreaInfoProps[], info: FileDetailInfo) => {
  const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
  let newActiveFile: FileDetailInfo | undefined = undefined
  let activeFileArr: FileDetailInfo[] = []
  newAreaInfo.forEach((item, idx) => {
    item.elements.forEach((itemIn, idxin) => {
      itemIn.files.forEach((file, fileIndex) => {
        if (file.isActive) {
          activeFileArr.push(file)
        }
        if (file.path === info.path) {
          // 如若仅存在一项 则删除此大项并更新布局
          if (item.elements.length > 1 && itemIn.files.length === 1) {
            newAreaInfo[idx].elements = newAreaInfo[idx].elements.filter(
              (item) => !item.files.map((item) => item.path).includes(info.path),
            )
          } else if (item.elements.length <= 1 && itemIn.files.length === 1) {
            newAreaInfo.splice(idx, 1)
          }
          // 存在多项则只移除删除项
          else {
            newAreaInfo[idx].elements[idxin].files = newAreaInfo[idx].elements[idxin].files.filter(
              (item) => item.path !== info.path,
            )
            // 重新激活未选中项目（因删除后当前tabs无选中项）
            if (info.isActive) {
              newAreaInfo[idx].elements[idxin].files[fileIndex - 1 < 0 ? 0 : fileIndex - 1].isActive = true
              newActiveFile = newAreaInfo[idx].elements[idxin].files[fileIndex - 1 < 0 ? 0 : fileIndex - 1]
            }
          }
        }
      })
    })
  })
  if (!newActiveFile && activeFileArr.length > 1) {
    let delIndex = activeFileArr.findIndex((item) => item.path === info.path)
    if (delIndex > -1) {
      newActiveFile = activeFileArr[delIndex - 1 < 0 ? 0 : delIndex - 1]
    }
  }
  return { newAreaInfo, newActiveFile }
}

/**
 * @name 删除分栏数据里多个节点的file数据并重新布局
 */
export const removeAreaFilesInfo = (areaInfo: AreaInfoProps[], removePath: string[]) => {
  // 如若有为空项则删除
  const buildAreaInfo = (areaInfo) => {
    const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
    // 移除elements中的files层
    newAreaInfo.forEach((item, idx) => {
      item.elements.forEach((itemIn, idxin) => {
        if (itemIn.files.length === 0) {
          newAreaInfo[idx].elements = newAreaInfo[idx].elements.filter((item) => item.id !== itemIn.id)
        }
      })
    })
    // 移除elements层
    let indexArr: number[] = [] // 还有数据的项目
    newAreaInfo.forEach((item, idx) => {
      if (item.elements.length !== 0) {
        indexArr.push(idx)
      }
    })
    let resultAreaInfo: AreaInfoProps[] = []
    indexArr.forEach((index) => {
      resultAreaInfo.push(newAreaInfo[index])
    })
    return resultAreaInfo
  }

  const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
  newAreaInfo.forEach((item, idx) => {
    item.elements.forEach((itemIn, idxin) => {
      itemIn.files.forEach((file, fileIndex) => {
        if (removePath.includes(file.path)) {
          newAreaInfo[idx].elements[idxin].files = itemIn.files.filter((item) => item.path !== file.path)
        }
      })
    })
  })
  return buildAreaInfo(newAreaInfo)
}

/**
 * @name 更改分栏数据里某个节点的isActive活动数据
 */
export const setAreaFileActive = (areaInfo: AreaInfoProps[], path: string) => {
  const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
  newAreaInfo.forEach((item, index) => {
    item.elements.forEach((itemIn, indexIn) => {
      itemIn.files.forEach((file, fileIndex) => {
        if (file.path === path) {
          newAreaInfo[index].elements[indexIn].files = newAreaInfo[index].elements[indexIn].files.map((item) => ({
            ...item,
            isActive: false,
          }))
          newAreaInfo[index].elements[indexIn].files[fileIndex].isActive = true
        }
      })
    })
  })
  return newAreaInfo
}

/**
 * @name 更改激活展示文件
 */
export const updateActiveFile = (activeFile: FileDetailInfo, data: OptionalFileDetailInfo, path?: string) => {
  let newActiveFile: FileDetailInfo = cloneDeep(activeFile)
  newActiveFile = { ...newActiveFile, ...data }
  return newActiveFile
}

/**
 * @name 更改项是否包含激活展示文件，包含则取消激活
 */
export const isResetActiveFile = (
  files: FileDetailInfo[] | FileNodeProps[],
  activeFile: FileDetailInfo | undefined,
) => {
  let newActiveFile = activeFile
  files.forEach((file) => {
    if (file.path === activeFile?.path) {
      newActiveFile = undefined
    }
  })
  return newActiveFile
}

/**
 * @name 新增分栏数据里某个节点的file数据
 */
export const addAreaFileInfo = (areaInfo: AreaInfoProps[], info: FileDetailInfo, activeFile?: FileDetailInfo) => {
  let newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
  let newActiveFile: FileDetailInfo = info
  try {
    // 如若存在激活项则向激活项后添加新增项并重新指定激活项目
    if (newAreaInfo.length > 0 && activeFile) {
      newAreaInfo.forEach((item, index) => {
        item.elements.forEach((itemIn, indexIn) => {
          itemIn.files.forEach((file, fileIndex) => {
            //
            if (file.path === activeFile.path) {
              newAreaInfo[index].elements[indexIn].files = newAreaInfo[index].elements[indexIn].files.map((item) => ({
                ...item,
                isActive: false,
              }))
              newAreaInfo[index].elements[indexIn].files.splice(fileIndex + 1, 0, info)
            }
          })
        })
      })
    } else {
      if (newAreaInfo.length === 0) {
        const newElements: TabFileProps[] = [
          {
            id: uuidv4(),
            files: [info],
          },
        ]
        newAreaInfo = [{ elements: newElements }]
      } else {
        newAreaInfo[0].elements[0].files = newAreaInfo[0].elements[0].files.map((item) => ({
          ...item,
          isActive: false,
        }))
        newAreaInfo[0].elements[0].files = [...newAreaInfo[0].elements[0].files, info]
      }
    }
    return {
      newAreaInfo,
      newActiveFile,
    }
  } catch (error) {
    return {
      newAreaInfo,
      newActiveFile,
    }
  }
}

/**
 * @name 注入语法检查结果
 */
export const getDefaultActiveFile = async (info: FileDetailInfo) => {
  let newActiveFile = info
  try {
    // 注入语法检查结果
    if (
      newActiveFile.code &&
      (newActiveFile.language === YaklangMonacoSpec || newActiveFile.language === SyntaxFlowMonacoSpec)
    ) {
      const syntaxCheck = (await onSyntaxCheck(newActiveFile.code, newActiveFile.language)) as IMonacoEditorMarker[]
      if (syntaxCheck) {
        newActiveFile = { ...newActiveFile, syntaxCheck }
      }
    }
  } catch (error) {}

  return newActiveFile
}

/**
 * @name 获取打开文件的path与name
 */
export const getOpenFileInfo = (): Promise<{ path: string; name: string } | null> => {
  return new Promise(async (resolve, reject) => {
    handleOpenFileSystemDialog({ title: tOriginal('YakRunner.selectFile'), properties: ['openFile'] })
      .then(async (data) => {
        try {
          const filesLength = data.filePaths.length
          if (filesLength === 1) {
            const path: string = data.filePaths[0].replace(/\\/g, '\\')
            const name: string = await getNameByPath(path)
            resolve({
              path,
              name,
            })
          } else if (filesLength > 1) {
            warn(tOriginal('YakRunner.singleSelectOnly'))
          }
          resolve(null)
        } catch (error) {
          reject()
        }
      })
      .catch(() => {
        reject()
      })
  })
}

const YakRunnerOpenHistory = 'YakRunnerOpenHistory'
const YakRunnerLastFolderExpanded = 'YakRunnerLastFolderExpanded'
const YakRunnerLastAreaFile = 'YakRunnerLastAreaFile'

/**
 * @name 更改YakRunner历史记录
 */
export const setYakRunnerHistory = (newHistory: YakRunnerHistoryProps) => {
  getRemoteValue(YakRunnerOpenHistory).then((data) => {
    try {
      if (!data) {
        setRemoteValue(YakRunnerOpenHistory, JSON.stringify([newHistory]))
        emiter.emit('onRefreshRunnerHistory', JSON.stringify([newHistory]))
        return
      }
      const historyData: YakRunnerHistoryProps[] = JSON.parse(data)
      const newHistoryData: YakRunnerHistoryProps[] = [
        newHistory,
        ...historyData.filter((item) => item.path !== newHistory.path),
      ].slice(0, 10)
      setRemoteValue(YakRunnerOpenHistory, JSON.stringify(newHistoryData))
      emiter.emit('onRefreshRunnerHistory', JSON.stringify(newHistoryData))
    } catch (error) {
      failed(tOriginal('YakRunner.historyResetFailed', { error }))
      setRemoteValue(YakRunnerOpenHistory, JSON.stringify([]))
    }
  })
}

/**
 * @name 获取YakRunner历史记录
 */
export const getYakRunnerHistory = (): Promise<YakRunnerHistoryProps[]> => {
  return new Promise(async (resolve, reject) => {
    getRemoteValue(YakRunnerOpenHistory).then((data) => {
      try {
        if (!data) {
          resolve([])
          return
        }
        const historyData: YakRunnerHistoryProps[] = JSON.parse(data)
        resolve(historyData)
      } catch (error) {
        resolve([])
      }
    })
  })
}

interface YakRunnerLastFolderExpandedProps {
  folderPath: string
  expandedKeys: string[]
}

/**
 * @name 更改打开的文件夹及其展开项历史
 */
export const setYakRunnerLastFolderExpanded = (cache: YakRunnerLastFolderExpandedProps) => {
  const newCache = JSON.stringify(cache)
  setRemoteValue(YakRunnerLastFolderExpanded, newCache)
}

/**
 * @name 获取上次打开的文件夹及其展开项历史
 */
export const getYakRunnerLastFolderExpanded = (): Promise<YakRunnerLastFolderExpandedProps | null> => {
  return new Promise(async (resolve, reject) => {
    getRemoteValue(YakRunnerLastFolderExpanded).then((data) => {
      try {
        if (!data) {
          resolve(null)
          return
        }
        const historyData: YakRunnerLastFolderExpandedProps = JSON.parse(data)
        resolve(historyData)
      } catch (error) {
        resolve(null)
      }
    })
  })
}

/**
 * @name 排除掉areaInfo中的code信息,用于下次加载时重新获取
 */
export const excludeAreaInfoCode = (areaInfo: AreaInfoProps[]): AreaInfoProps[] => {
  const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
  newAreaInfo.forEach((item, index) => {
    item.elements.forEach((itemIn, indexIn) => {
      itemIn.files.forEach((file, fileIndex) => {
        if (!file.isUnSave) {
          delete newAreaInfo[index].elements[indexIn].files[fileIndex].code
        }
      })
    })
  })
  return newAreaInfo
}

/**
 * @name 更改展示的分布及文件历史
 */
export const setYakRunnerLastAreaFile = (areaInfo: AreaInfoProps[], activeFile?: FileDetailInfo) => {
  const newCache = JSON.stringify({ areaInfo, activeFile })
  setRemoteValue(YakRunnerLastAreaFile, newCache)
}

/**
 * @name 获取上次打开的展示分布及文件历史
 */
export const getYakRunnerLastAreaFile = (): Promise<{
  activeFile: FileDetailInfo
  areaInfo: AreaInfoProps[]
} | null> => {
  return new Promise(async (resolve, reject) => {
    getRemoteValue(YakRunnerLastAreaFile).then((data) => {
      try {
        if (!data) {
          resolve(null)
          return
        }
        const historyData: { activeFile: FileDetailInfo; areaInfo: AreaInfoProps[] } = JSON.parse(data)
        resolve(historyData)
      } catch (error) {
        resolve(null)
      }
    })
  })
}

/**
 * @name 路径拼接（兼容多系统）
 */
export const getPathJoin = (path: string, file: string): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    ipcRenderer
      .invoke('pathJoin', {
        dir: path,
        file,
      })
      .then((currentPath: string) => {
        resolve(currentPath)
      })
      .catch(() => {
        resolve('')
      })
  })
}

/**
 * @name 获取上一级的路径（兼容多系统）
 */
export const getPathParent = (filePath: string): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    ipcRenderer
      .invoke('pathParent', {
        filePath,
      })
      .then((currentPath: string) => {
        resolve(currentPath)
      })
      .catch(() => {
        resolve('')
      })
  })
}

/**
 * @name 获取路径上的(文件/文件夹)名（兼容多系统）
 */
export const getNameByPath = (filePath: string): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    ipcRenderer
      .invoke('pathFileName', {
        filePath,
      })
      .then((currentName: string) => {
        resolve(currentName)
      })
      .catch(() => {
        resolve('')
      })
  })
}

/**
 * @name 获取相对路径（兼容多系统）
 */
export const getRelativePath = (basePath: string, filePath: string): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    ipcRenderer
      .invoke('relativePathByBase', {
        basePath,
        filePath,
      })
      .then((relativePath: string) => {
        resolve(relativePath)
      })
      .catch(() => {
        resolve('')
      })
  })
}

/**
 * @name 用于用户操作过快时文件夹内数据还未来得及加载,提前加载
 */
export const loadFolderDetail = (path) => {
  return new Promise(async (resolve, reject) => {
    grpcFetchFileTree(path)
      .then((res) => {
        if (res.length > 0) {
          let childArr: string[] = []
          // 文件Map
          res.forEach((item) => {
            // 注入文件结构Map
            childArr.push(item.path)
            // 文件Map
            setMapFileDetail(item.path, item)
          })
          setMapFolderDetail(path, childArr)
        }
        resolve(null)
      })
      .catch((error) => {
        resolve(null)
      })
  })
}

/**
 * @name 从文件名截取后缀（最后一个 `.` 之后，不含点）
 * @example getFileSuffixFromName('x.x.txt') => 'txt'
 */
export const getFileSuffixFromName = (fileName: string): string => {
  const dotIndex = fileName.lastIndexOf('.')
  if (dotIndex <= 0 || dotIndex >= fileName.length - 1) return ''
  return fileName.slice(dotIndex + 1)
}

/**
 * @name 从路径截取文件名后缀（仅看 basename，避免路径中的 `.` 干扰）
 */
export const getFileSuffixFromPath = (filePath: string): string => {
  const normalized = filePath.replace(/\\/g, '/').trim()
  if (!normalized) return ''
  const name = normalized.slice(normalized.lastIndexOf('/') + 1)
  return getFileSuffixFromName(name)
}

/**
 * @name 编辑器代码类型判断
 */
export const monacaLanguageType = (suffix?: string) => {
  switch ((suffix || '').toLowerCase()) {
    case 'yak':
    case '.yak':
      return YaklangMonacoSpec
    case 'sf':
    case '.sf':
      return SyntaxFlowMonacoSpec
    case 'json':
    case '.json':
      return 'json'
    case 'html':
    case '.html':
    case 'htm':
    case '.htm':
      return 'html'
    case 'css':
    case '.css':
      return 'css'
    case 'md':
    case '.md':
    case 'markdown':
    case '.markdown':
      return 'markdown'
    case 'svg':
    case '.svg':
    case 'xml':
    case '.xml':
      return 'xml'
    case 'yml':
    case '.yml':
    case 'yaml':
    case '.yaml':
      return 'yaml'
    case 'sh':
    case '.sh':
    case 'shell':
    case '.shell':
    case 'bash':
    case '.bash':
      return 'shell'
    case 'cmd':
    case '.cmd':
    case 'bat':
    case '.bat':
      return 'bat'
    case 'ini':
    case '.ini':
      return 'ini'
    case 'sql':
    case '.sql':
      return 'sql'
    case 'dockerfile':
    case '.dockerfile':
      return 'dockerfile'
    case 'js':
    case '.js':
      return 'javascript'
    case 'java':
    case '.java':
      return 'java'
    case 'go':
    case '.go':
      return 'go'
    case 'php':
    case '.php':
      return 'php'
    case 'c':
    case '.c':
      return 'c'
    case 'cpp':
    case '.cpp':
    case 'cc':
    case '.cc':
    case 'cxx':
    case '.cxx':
    case 'c++':
    case '.c++':
      return 'cpp'
    case 'txt':
    case '.txt':
      return 'plaintext'
    default:
      return undefined
  }
}
