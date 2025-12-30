import {isCommunityYakit} from "@/utils/envfile"
import {create} from "zustand"

/** @name Yakit 社区版 菜单模式 */
export type YakitCEMode = "classic" | "securityExpert" | "scan"
interface MenuModeProps {
    menuMode: YakitCEMode | undefined
    setMenuMode: (menuMode: YakitCEMode | undefined) => void
}

export const useMenuMode = create<MenuModeProps>((set, get) => ({
    menuMode: isCommunityYakit() ? "classic" : undefined,
    setMenuMode: (menuMode) => set({menuMode})
}))
