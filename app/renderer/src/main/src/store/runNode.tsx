import {create} from "zustand"

interface StoreProps {
    firstRunNodeFlag: boolean
    setFirstRunNodeFlag: (flag: boolean) => void
    runNodeList: Map<string, string>
    setRunNodeList: (key: string, pid: string) => void
    hasRunNodeInList: (key: string) => boolean
    delRunNode: (key: string) => boolean
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
            runNodeList: newVal
        })
    },
    hasRunNodeInList: (key) => get().runNodeList.has(key),
    delRunNode: (key) => get().runNodeList.delete(key),
    clearRunNodeList: () => get().runNodeList.clear()
}))
