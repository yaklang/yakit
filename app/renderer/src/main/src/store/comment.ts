import {create} from "zustand"

export interface CommenDataStore {
    isRefChildCommentList: boolean
}
interface StoreProps {
    /**@name 是否刷新modal中子评论列表 */
    commenData: CommenDataStore
    setCommenData: (info: CommenDataStore) => void
}

export const useCommenStore = create<StoreProps>((set, get) => ({
    commenData: {
        isRefChildCommentList: false
    },
    setCommenData: (info) => set({commenData: info})
}))
