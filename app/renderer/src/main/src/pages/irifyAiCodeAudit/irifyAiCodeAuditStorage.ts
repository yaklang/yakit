import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { AreaInfoProps } from '@/pages/yakRunner/YakRunnerType'
import { FileDetailInfo } from '@/pages/yakRunner/RunnerTabs/RunnerTabsType'

const IrifyAiCodeAuditLastFolderExpanded = 'IrifyAiCodeAuditLastFolderExpanded'
const IrifyAiCodeAuditLastAreaFile = 'IrifyAiCodeAuditLastAreaFile'

export interface IrifyAiCodeAuditLastFolderExpandedProps {
  folderPath: string
  expandedKeys: string[]
}

export const setIrifyAiCodeAuditLastFolderExpanded = (cache: IrifyAiCodeAuditLastFolderExpandedProps) => {
  setRemoteValue(IrifyAiCodeAuditLastFolderExpanded, JSON.stringify(cache))
}

export const getIrifyAiCodeAuditLastFolderExpanded = (): Promise<IrifyAiCodeAuditLastFolderExpandedProps | null> => {
  return new Promise((resolve) => {
    getRemoteValue(IrifyAiCodeAuditLastFolderExpanded).then((data) => {
      try {
        if (!data) {
          resolve(null)
          return
        }
        resolve(JSON.parse(data as string))
      } catch {
        resolve(null)
      }
    })
  })
}

export const setIrifyAiCodeAuditLastAreaFile = (areaInfo: AreaInfoProps[], activeFile?: FileDetailInfo) => {
  setRemoteValue(IrifyAiCodeAuditLastAreaFile, JSON.stringify({ areaInfo, activeFile }))
}

export const getIrifyAiCodeAuditLastAreaFile = (): Promise<{
  activeFile: FileDetailInfo
  areaInfo: AreaInfoProps[]
} | null> => {
  return new Promise((resolve) => {
    getRemoteValue(IrifyAiCodeAuditLastAreaFile).then((data) => {
      try {
        if (!data) {
          resolve(null)
          return
        }
        resolve(JSON.parse(data as string))
      } catch {
        resolve(null)
      }
    })
  })
}
