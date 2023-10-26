import {QueryYakScriptsResponse} from "@/pages/invoker/schema"
import {LocalPluginAppAction} from "../pluginReducer"
import {API} from "@/services/swagger/resposeType"
import { PluginSearchParams } from "../baseTemplateType"

export interface PluginsLocalProps {}

export interface LocalExtraOperateProps {
    /**是否是自己的插件 */
    isOwn: boolean
    /**删除插件 */
    onRemovePlugin: () => void
    /**导出插件 */
    onExportPlugin: () => void
    /**编辑 */
    onEditPlugin: () => void
    /**上传 */
    onUploadPlugin: () => void
}

export interface PluginsLocalDetailProps {
    info: YakScript
    defaultAllCheck: boolean
    loading: boolean
    // onCheck: (value: boolean) => void
    defaultSelectList: YakScript[]
    // optCheck: (data: YakScript, value: boolean) => void
    response: QueryYakScriptsResponse
    onBack: (q: PluginLocalBackProps) => void
    loadMoreData: () => void
    defaultSearchValue: PluginSearchParams
    dispatch: React.Dispatch<LocalPluginAppAction>
}

export interface PluginLocalBackProps {
    search: PluginSearchParams
    selectList: YakScript[]
    allCheck: boolean
}
