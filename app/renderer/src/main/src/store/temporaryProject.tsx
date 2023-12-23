import {setRemoteValue} from "@/utils/kv"
import {yakitFailed} from "@/utils/notification"
import {RemoteGV} from "@/yakitGV"
import {create} from "zustand"
const {ipcRenderer} = window.require("electron")

interface TemporaryProjectStoreProps {
    temporaryProjectId: string
    temporaryProjectNoPromptFlag: boolean
    setTemporaryProjectId: (id: string) => void
    setTemporaryProjectNoPromptFlag: (flag: boolean) => void
}

export const useTemporaryProjectStore = create<TemporaryProjectStoreProps>((set, get) => ({
    temporaryProjectId: "",
    temporaryProjectNoPromptFlag: false,
    setTemporaryProjectId: async (id: string) => {
        set({temporaryProjectId: id})
        try {
            const res = await ipcRenderer.invoke("is-dev")
            res && setRemoteValue(RemoteGV.TemporaryProjectId, id)
        } catch (error) {
            yakitFailed(error + "")
        }
    },
    setTemporaryProjectNoPromptFlag: (flag: boolean) => {
        set({temporaryProjectNoPromptFlag: flag})
        setRemoteValue(RemoteGV.TemporaryProjectNoPrompt, flag + "")
    }
}))
