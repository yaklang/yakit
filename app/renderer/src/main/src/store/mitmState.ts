/**
 * @description MITM
 */

import {MitmStatus} from "@/pages/mitm/MITMPage"
import {TunSessionStateProps} from "@/pages/mitm/MITMServerHijacking/PluginTunHijack/PluginTunHijackType"
import { tunSessionStateDefault } from "@/pages/mitm/MITMServerHijacking/PluginTunHijack/usePluginTunHijack"
import {create} from "zustand"

interface StoreProps {
    /**@name MITM缓存信息 */
    isRefreshHistory: boolean
    setIsRefreshHistory: (info: boolean) => void
    mitmStatus: MitmStatus
    setMitmStatus: (mitmStatus: MitmStatus) => void
    // Tun劫持会话状态
    tunSessionState: TunSessionStateProps
    setTunSessionState: (state: TunSessionStateProps) => void
}

export const useStore = create<StoreProps>((set, get) => ({
    isRefreshHistory: false,
    setIsRefreshHistory: (isRefreshHistory) => set({isRefreshHistory}),
    mitmStatus: "idle",
    setMitmStatus: (mitmStatus) => set({mitmStatus}),
    tunSessionState: tunSessionStateDefault,
    setTunSessionState: (tunSessionState) => set({tunSessionState})
}))
