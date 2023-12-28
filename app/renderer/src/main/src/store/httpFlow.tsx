import {create} from "zustand"

interface HttpFlowStoreProps {
    compareState: number
    setCompareState: (num: number) => void
}

export const useHttpFlowStore = create<HttpFlowStoreProps>((set, get) => ({
    compareState: 0, // 用于记录发送代码对比
    setCompareState: (num: number) => {
        set({compareState: num})
    }
}))
