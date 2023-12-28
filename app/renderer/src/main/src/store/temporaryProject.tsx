import {setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import {create} from "zustand"

interface TemporaryProjectStoreProps {
    temporaryProjectId: string
    temporaryProjectNoPromptFlag: boolean
    isExportTemporaryProjectFlag: boolean
    setTemporaryProjectId: (id: string) => void
    setTemporaryProjectNoPromptFlag: (flag: boolean) => void
    setIsExportTemporaryProjectFlag: (flag: boolean) => void
}

export const useTemporaryProjectStore = create<TemporaryProjectStoreProps>((set, get) => ({
    temporaryProjectId: "",
    temporaryProjectNoPromptFlag: false,
    isExportTemporaryProjectFlag: false,
    setTemporaryProjectId: async (id: string) => {
        set({temporaryProjectId: id})
    },
    setTemporaryProjectNoPromptFlag: (flag: boolean) => {
        set({temporaryProjectNoPromptFlag: flag})
        setRemoteValue(RemoteGV.TemporaryProjectNoPrompt, flag + "")
    },
    setIsExportTemporaryProjectFlag: (flag: boolean) => set({isExportTemporaryProjectFlag: flag})
}))
