import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { IrifyAiCodeAuditStyle } from './irifyAiCodeAuditStyle'
import { YakRunnerHistoryProps } from './YakRunnerIrifyAiCodeAuditType'
import emiter from '@/utils/eventBus/eventBus'
import { failed } from '@/utils/notification'
import i18n from '@/i18n/i18n'
import { FileDetailInfo } from './RunnerTabs/RunnerTabsType'
import { AreaInfoProps } from './YakRunnerIrifyAiCodeAuditType'

const tOriginal = i18n.getFixedT(null, 'yakRunner')

const IrifyAiCodeAuditOpenHistory = 'IrifyAiCodeAuditOpenHistory'
const IrifyAiCodeAuditLastFolderExpanded = 'IrifyAiCodeAuditLastFolderExpanded'
const IrifyAiCodeAuditLastAreaFile = 'IrifyAiCodeAuditLastAreaFile'

export interface IrifyAiCodeAuditOnboardingRequest {
  path?: string
  auditStyle?: IrifyAiCodeAuditStyle
}

/** 打开 AI 代码审计引导蒙版 */
export const requestIrifyAiCodeAuditOnboarding = (request?: IrifyAiCodeAuditOnboardingRequest) => {
  emiter.emit('onIrifyAiCodeAuditShowOnboarding', JSON.stringify(request ?? {}))
}

/**
 * @name 更改IrifyAiCodeAudit历史记录
 */
export const setIrifyAiCodeAuditHistory = (newHistory: YakRunnerHistoryProps) => {
  getRemoteValue(IrifyAiCodeAuditOpenHistory).then((data) => {
    try {
      if (!data) {
        setRemoteValue(IrifyAiCodeAuditOpenHistory, JSON.stringify([newHistory]))
        emiter.emit('onAiCodeAuditRefreshRunnerHistory', JSON.stringify([newHistory]))
        return
      }
      const historyData: YakRunnerHistoryProps[] = JSON.parse(data)
      const isSameHistoryEntry = (item: YakRunnerHistoryProps) => {
        if (item.path !== newHistory.path) return false
        if (newHistory.isFile || item.isFile) return true
        return (item.auditStyle ?? 'unset') === (newHistory.auditStyle ?? 'unset')
      }
      const newHistoryData: YakRunnerHistoryProps[] = [
        newHistory,
        ...historyData.filter((item) => !isSameHistoryEntry(item)),
      ].slice(0, 10)
      setRemoteValue(IrifyAiCodeAuditOpenHistory, JSON.stringify(newHistoryData))
      emiter.emit('onAiCodeAuditRefreshRunnerHistory', JSON.stringify(newHistoryData))
    } catch (error) {
      failed(tOriginal('YakRunner.historyResetFailed', { error }))
      setRemoteValue(IrifyAiCodeAuditOpenHistory, JSON.stringify([]))
    }
  })
}

/**
 * @name 获取YakRunner历史记录
 */
export const getIrifyAiCodeAuditHistory = (): Promise<YakRunnerHistoryProps[]> => {
  return new Promise(async (resolve, reject) => {
    getRemoteValue(IrifyAiCodeAuditOpenHistory).then((data) => {
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

interface IrifyAiCodeAuditLastFolderExpandedProps {
  folderPath: string
  expandedKeys: string[]
}

/**
 * @name 更改打开的文件夹及其展开项历史
 */
export const setIrifyAiCodeAuditLastFolderExpanded = (cache: IrifyAiCodeAuditLastFolderExpandedProps) => {
  const newCache = JSON.stringify(cache)
  setRemoteValue(IrifyAiCodeAuditLastFolderExpanded, newCache)
}

/**
 * @name 获取上次打开的文件夹及其展开项历史
 */
export const getIrifyAiCodeAuditLastFolderExpanded = (): Promise<IrifyAiCodeAuditLastFolderExpandedProps | null> => {
  return new Promise(async (resolve, reject) => {
    getRemoteValue(IrifyAiCodeAuditLastFolderExpanded).then((data) => {
      try {
        if (!data) {
          resolve(null)
          return
        }
        const historyData: IrifyAiCodeAuditLastFolderExpandedProps = JSON.parse(data)
        resolve(historyData)
      } catch (error) {
        resolve(null)
      }
    })
  })
}

/**
 * @name 更改展示的分布及文件历史
 */
export const setIrifyAiCodeAuditLastAreaFile = (areaInfo: AreaInfoProps[], activeFile?: FileDetailInfo) => {
  const newCache = JSON.stringify({ areaInfo, activeFile })
  setRemoteValue(IrifyAiCodeAuditLastAreaFile, newCache)
}

/**
 * @name 获取上次打开的展示分布及文件历史
 */
export const getIrifyAiCodeAuditLastAreaFile = (): Promise<{
  activeFile: FileDetailInfo
  areaInfo: AreaInfoProps[]
} | null> => {
  return new Promise(async (resolve, reject) => {
    getRemoteValue(IrifyAiCodeAuditLastAreaFile).then((data) => {
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
