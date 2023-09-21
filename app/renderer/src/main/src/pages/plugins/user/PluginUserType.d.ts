import {API} from "@/services/swagger/resposeType"

export interface PluginUserProps {}

export interface PluginUserListProps {
    pluginState: string[]
    searchUser: PluginSearchParams
    setIsShowDetails: (b: boolean) => void
    setIsSelectNum: (b: boolean) => void
}
