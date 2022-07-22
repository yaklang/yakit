import {API} from "@/services/swagger/resposeType"
import create from "zustand"

export interface PluginItemStore {
    currentPlugin: API.YakitPluginDetail | null
}
interface StoreProps {
    pluginData: PluginItemStore
    setCurrentPlugin: (info: PluginItemStore) => void
}

export const usePluginStore = create<StoreProps>((set, get) => ({
    pluginData: {
        currentPlugin: {
            id: 0,
            created_at: 0,
            updated_at: 0,
            type: "",
            script_name: "",
            default_open: false,
            tags: "",
            content: "",
            authors: "",
            published_at: 0,
            downloaded_total: 0,
            stars: 0,
            status: 0,
            is_stars: false,
            official: false,
            uuid: "",
            comment_num: 0,
            is_private: false
        }
    },
    setCurrentPlugin: (info) => set({pluginData: info})
}))
