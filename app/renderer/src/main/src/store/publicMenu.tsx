/**
 * @description PublicMenu
 */

import {ResidentPluginName} from "@/routes/newRoute"
import {create} from "zustand"

interface ScreenRecorderProps {
    pluginToId: Record<ResidentPluginName, number>
    setNewPluginToId: (newPluginToId: Record<ResidentPluginName, number>) => void
}

export const usePluginToId = create<ScreenRecorderProps>((set, get) => ({
    pluginToId: {
        [ResidentPluginName.SubDomainCollection]: 0,
        [ResidentPluginName.BasicCrawler]: 0,
        [ResidentPluginName.DirectoryScanning]: 0
    },
    setNewPluginToId: (newPluginToId: Record<ResidentPluginName, number>) => {
        const s: Record<ResidentPluginName, number> = get().pluginToId
        set({
            pluginToId: {
                ...s,
                ...newPluginToId
            }
        })
    }
}))
