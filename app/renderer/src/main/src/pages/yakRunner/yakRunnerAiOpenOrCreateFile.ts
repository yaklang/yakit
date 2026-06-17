import moment from 'moment'

import emiter from '@/utils/eventBus/eventBus'
import { FileDefault, FileSuffix } from './FileTree/icon'
import { getMapFileDetail, setMapFileDetail } from './FileTreeMap/FileMap'
import { AreaInfoProps } from './YakRunnerType'
import { FileDetailInfo } from './RunnerTabs/RunnerTabsType'
import {
  addAreaFileInfo,
  getFileSuffixFromName,
  getNameByPath,
  getPathParent,
  grpcFetchCreateFile,
  grpcFetchCreateFolder,
  judgeAreaExistFilePath,
  monacaLanguageType,
} from './utils'

const { ipcRenderer } = window.require('electron')

export type OpenOrCreateYakRunnerFileParams = {
  targetPath: string
  content: string
  language?: string
  needsSaveAs?: boolean
  areaInfo: AreaInfoProps[]
  activeFile?: FileDetailInfo
}

export type OpenOrCreateYakRunnerFileResult = {
  newAreaInfo: AreaInfoProps[]
  newActiveFile: FileDetailInfo
  created: boolean
}

export type CreateYakRunnerScratchFileParams = {
  fileName: string
  content: string
  language?: string
  areaInfo: AreaInfoProps[]
  activeFile?: FileDetailInfo
}

async function pathExistsOnDisk(filePath: string): Promise<boolean> {
  try {
    await ipcRenderer.invoke('is-exists-file', filePath)
    return true
  } catch {
    return false
  }
}

/** 递归创建 AI 返回路径所需的父级目录 */
async function ensureParentDirsExist(filePath: string): Promise<void> {
  const parentPath = (await getPathParent(filePath)).trim()
  if (!parentPath) return
  if (await pathExistsOnDisk(parentPath)) return
  await ensureParentDirsExist(parentPath)
  const grandParent = await getPathParent(parentPath)
  const parentDetail = getMapFileDetail(grandParent)
  await grpcFetchCreateFolder(parentPath, parentDetail.isReadFail ? '' : grandParent)
}

/**
 * AI `yaklang_code_change` 写回：目标文件未在编辑器打开时，按 path 打开；
 * 磁盘上不存在则在对应路径新建文件并写入 content。
 */
export async function openOrCreateYakRunnerFileAtPath(
  params: OpenOrCreateYakRunnerFileParams,
): Promise<OpenOrCreateYakRunnerFileResult | null> {
  const { targetPath, content, language, needsSaveAs = false, areaInfo, activeFile } = params
  const path = targetPath.trim()
  if (!path) return null

  const existingInArea = await judgeAreaExistFilePath(areaInfo, path)
  if (existingInArea) return null

  const name = await getNameByPath(path)
  const parentPath = await getPathParent(path)
  const suffix = getFileSuffixFromName(name)
  const resolvedLanguage = monacaLanguageType(language || suffix)

  const existsOnDisk = await pathExistsOnDisk(path)
  let created = false
  if (!existsOnDisk) {
    await ensureParentDirsExist(path)
    const parentDetail = getMapFileDetail(parentPath)
    const result = await grpcFetchCreateFile(path, content, parentDetail.isReadFail ? '' : parentPath)
    if (result.length > 0) {
      setMapFileDetail(result[0].path, result[0])
    }
    created = true
    emiter.emit('onRefreshFileTree')
  }

  const fileInfo: FileDetailInfo = {
    name,
    code: content,
    icon: suffix ? FileSuffix[suffix] || FileDefault : FileDefault,
    isActive: true,
    openTimestamp: moment().unix(),
    isPlainText: true,
    path,
    parent: parentPath || null,
    language: resolvedLanguage,
    isUnSave: needsSaveAs || (existsOnDisk && !created),
    needsSaveAs,
  }

  const { newAreaInfo, newActiveFile } = addAreaFileInfo(areaInfo, fileInfo, activeFile)
  return { newAreaInfo, newActiveFile, created }
}

export function createYakRunnerScratchFileForAI(params: CreateYakRunnerScratchFileParams): OpenOrCreateYakRunnerFileResult {
  const { fileName, content, language, areaInfo, activeFile } = params
  const name = fileName.trim() || `gen_code_${Date.now()}.yak`
  const suffix = getFileSuffixFromName(name)
  const fileInfo: FileDetailInfo = {
    name,
    code: content,
    icon: suffix ? FileSuffix[suffix] || FileDefault : FileDefault,
    isActive: true,
    openTimestamp: moment().unix(),
    isPlainText: true,
    path: `${Date.now()}-${name}`,
    parent: null,
    language: monacaLanguageType(language || suffix),
    isUnSave: true,
    needsSaveAs: true,
  }

  const { newAreaInfo, newActiveFile } = addAreaFileInfo(areaInfo, fileInfo, activeFile)
  return { newAreaInfo, newActiveFile, created: true }
}
