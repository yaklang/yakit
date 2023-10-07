import {API} from "@/services/swagger/resposeType"
import {MenuProps} from "antd"

export interface PluginUserProps {}

export interface PluginUserListProps {
    /**刷新数据 */
    refresh: boolean
    searchValue: PluginSearchParams
    setSearchValue: (s: PluginSearchParams) => void
    setIsSelectUserNum: (b: boolean) => void
    setPlugin: (p?: YakitPluginOnlineDetail) => void
}

export interface PluginRecycleListProps {
    /**刷新数据 */
    refresh: boolean
    searchValue: PluginSearchParams
    setIsSelectRecycleNum: (b: boolean) => void
    setSearchValue: (s: PluginSearchParams) => void
}
/**
 * @property onRemove 删除
 * @property onReduction 还原
 */
export interface OnlineRecycleExtraOperateProps {
    onRemove: () => void
    onReduction: () => void
}

export interface OnlineUserExtraOperateProps {
    plugin: YakitPluginOnlineDetail
    onSelect: (m: string) => void
}
