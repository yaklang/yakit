import { create } from 'zustand'
import { SSAProjectResponse } from '@/pages/yakRunnerAuditCode/AuditCode/AuditCodeType'
import { getDedicatedDatabaseDisplayPath } from '@/pages/softwareSettings/ssaProjectTableShared'

export interface IrifyCurrentSSAProject {
  id: number
  projectName: string
  databasePath: string
  language?: string
}

interface IrifyCurrentSSAProjectStore {
  current?: IrifyCurrentSSAProject
  setCurrentFromRecord: (record: SSAProjectResponse) => void
  clearCurrent: () => void
}

export const useIrifyCurrentSSAProjectStore = create<IrifyCurrentSSAProjectStore>((set) => ({
  current: undefined,
  setCurrentFromRecord: (record) => {
    const id = parseInt(String(record.ID || 0))
    if (!id || !record.ProjectName) {
      return
    }
    set({
      current: {
        id,
        projectName: record.ProjectName,
        databasePath: getDedicatedDatabaseDisplayPath(record),
        language: record.Language || '',
      },
    })
  },
  clearCurrent: () => set({ current: undefined }),
}))
