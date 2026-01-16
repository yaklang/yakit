import { RemoteSoftModeGV } from "@/enums/softMode"
import {isCommunityYakit} from "@/utils/envfile"
import { setRemoteValue } from "@/utils/kv"
import {create} from "zustand"

export enum YakitModeEnum {
    /** @name 经典模式 */
    Classic = "classic",
    /** @name 安全专家模式 */
    SecurityExpert = "securityExpert",
    /** @name 扫描模式 */
    Scan = "scan"
}

export type SoftMode = YakitModeEnum | undefined

interface MenuModeState {
    softMode: SoftMode
    setSoftMode: (softMode: SoftMode) => void
}

const getDefaultSoftMode = (): SoftMode => {
    return isCommunityYakit() ? YakitModeEnum.Classic : undefined
}

export const useSoftMode = create<MenuModeState>((set) => ({
    softMode: getDefaultSoftMode(),
    setSoftMode: (softMode) => {
        if (isCommunityYakit()) {
            setRemoteValue(RemoteSoftModeGV.YakitCEMode, softMode + "")
        }
        set({softMode})
    }
}))
