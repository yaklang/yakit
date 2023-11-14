import {create} from "zustand"

interface StoreProps {
    firstRunNodeFlag: boolean
    setFirstRunNodeFlag: (flag: boolean) => void
    runNodeList: Map<string, string>
    setRunNodeList: (key: string, pid: string) => void
    hasRunNodeInList: (key: string) => boolean
    delRunNode: (key: string) => void
    clearRunNodeList: () => void
}

export const useRunNodeStore = create<StoreProps>((set, get) => ({
    firstRunNodeFlag: false,
    runNodeList: new Map(),
    // 是否第一次运行节点
    setFirstRunNodeFlag: (flag) => {
        set({
            firstRunNodeFlag: flag
        })
    },
    setRunNodeList: (key, pid) => {
        const newVal = get().runNodeList
        newVal.set(key, pid)
        set({
            runNodeList: new Map(newVal)
        })
    },
    hasRunNodeInList: (key) => get().runNodeList.has(key),
    delRunNode: (key) => {
        const newVal = get().runNodeList
        newVal.delete(key)
        set({
            runNodeList: new Map(newVal)
        })
    },
    clearRunNodeList: () => {
        const newVal = get().runNodeList
        newVal.clear()
        set({
            runNodeList: new Map(newVal)
        })
    }
}))
