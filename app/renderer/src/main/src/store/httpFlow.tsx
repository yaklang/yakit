import {CompateData} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {create} from "zustand"
const {ipcRenderer} = window.require("electron")

interface HttpFlowStoreProps {
    compareState: number
    compareLeft: CompateData
    compareRight: CompateData
    setCompareState: (num: number) => void
    setCompareLeft: (compareLeft: CompateData) => void
    setCompareRight: (compareRight: CompateData) => void
}

export const useHttpFlowStore = create<HttpFlowStoreProps>((set, get) => ({
    compareState: 0, // 用于记录发送代码对比
    compareLeft: {content: "", language: "http"},
    compareRight: {content: "", language: "http"},
    setCompareState: (num: number) => {
        set({compareState: num})
    },
    setCompareLeft: (compareLeft: CompateData) => {
        if (compareLeft.content) {
            const params = {info: compareLeft, type: 1}
            const comState = get().compareState === 0 ? 1 : 0
            set({compareState: comState})
            ipcRenderer.invoke("add-data-compare", params)
        }
        set({compareLeft})
    },
    setCompareRight: (compareRight: CompateData) => {
        if (compareRight.content) {
            const params = {info: compareRight, type: 2}
            const comState = get().compareState === 0 ? 2 : 0
            set({compareState: comState})
            ipcRenderer.invoke("add-data-compare", params)
        }
        set({compareRight})
    }
}))
