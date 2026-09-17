import { ipc } from '@/services/ipc'
import { getEnvTypeByProjects } from '@/pages/softwareSettings/projectUtils'
import { setRemoteValue } from '@/utils/kv'
import { yakitFailed } from '@/utils/notification'
import { RemoteGV } from '@/yakitGV'
import { create } from 'zustand'
interface TemporaryProjectStoreProps {
  temporaryProjectId: string
  temporaryProjectNoPromptFlag: boolean
  isExportTemporaryProjectFlag: boolean
  setTemporaryProjectId: (id: string) => void
  setTemporaryProjectNoPromptFlag: (flag: boolean) => void
  setIsExportTemporaryProjectFlag: (flag: boolean) => void
  delTemporaryProject: () => Promise<any>
}

export const useTemporaryProjectStore = create<TemporaryProjectStoreProps>((set, get) => ({
  temporaryProjectId: '',
  temporaryProjectNoPromptFlag: false,
  isExportTemporaryProjectFlag: false,
  setTemporaryProjectId: async (id: string) => {
    set({ temporaryProjectId: id })
  },
  setTemporaryProjectNoPromptFlag: (flag: boolean) => {
    set({ temporaryProjectNoPromptFlag: flag })
    setRemoteValue(RemoteGV.TemporaryProjectNoPrompt, flag + '')
  },
  setIsExportTemporaryProjectFlag: (flag: boolean) => set({ isExportTemporaryProjectFlag: flag }),
  delTemporaryProject: async () => {
    const temporaryProjectId = get().temporaryProjectId
    if (temporaryProjectId) {
      try {
        await ipc.invoke('grpc', 'DeleteProject', {
          Id: temporaryProjectId,
          IsDeleteLocal: true,
          Type: getEnvTypeByProjects(),
        })
        set({ temporaryProjectId: '' })
      } catch (error) {
        yakitFailed(error + '')
      }
    }
  },
}))
