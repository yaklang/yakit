import {API} from "@/services/swagger/resposeType"

export interface PluginUserProps {}

export interface PluginUserListProps {
    pluginState: string[]
    searchUser: PluginSearchParams
    setIsShowDetails: (b: boolean) => void
    setIsSelectNum: (b: boolean) => void
}

export interface PluginRecycleListProps {}
/**
 * @property onRemove 删除
 * @property onReduction 还原
 */
export interface OnlineRecycleExtraOperateProps {
    uuid: string
    onRemove: (uuid: string) => void
    onReduction: (uuid: string) => void
}
