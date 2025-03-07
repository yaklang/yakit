/**
 * @description MITM
 */

import {MitmStatus} from "@/pages/mitm/MITMPage"
import {create} from "zustand"

interface StoreProps {
    /**@name MITM缓存信息 */
    isRefreshHistory: boolean
    setIsRefreshHistory: (info: boolean) => void
    mitmStatus: MitmStatus
    setMitmStatus: (mitmStatus: MitmStatus) => void
}

export const useStore = create<StoreProps>((set, get) => ({
    isRefreshHistory: false,
    setIsRefreshHistory: (isRefreshHistory) => set({isRefreshHistory}),
    mitmStatus: "idle",
    setMitmStatus: (mitmStatus) => set({mitmStatus})
}))
