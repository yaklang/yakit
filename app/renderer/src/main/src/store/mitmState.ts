/**
 * @description MITM
 */

import {create} from "zustand"

interface StoreProps {
    /**@name MITM缓存信息 */
    isRefreshHistory: boolean
    setIsRefreshHistory: (info: boolean) => void
}

export const useStore = create<StoreProps>((set, get) => ({
    isRefreshHistory: false,
    setIsRefreshHistory: (isRefreshHistory) => set({isRefreshHistory})
}))