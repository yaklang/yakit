import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {HybridScanControlAfterRequest} from "@/models/HybridScan"
import {GroupCount} from "@/pages/invoker/schema"
import {DataScanParamsProps} from "@/pages/plugins/pluginBatchExecutor/pluginBatchExecutor"

export interface YakPoCProps {
    pageId: string
}

export interface PluginListByGroupProps {
    /**选择的插件组列表 */
    selectGroupList: string[]
    total: number
    setTotal: (s: number) => void
    hidden: boolean
}
export interface PluginGroupByKeyWordProps {
    pageId: string
    inViewport: boolean
    hidden: boolean
    /**选择的插件组列表 按关键词搜索的 */
    selectGroupListByKeyWord?: string[]
    setSelectGroupListByKeyWord?: (s: string[]) => void
}
export interface PluginGroupGridProps {
    inViewport: boolean
    hidden: boolean
    /**选择的插件组列表 */
    selectGroupList?: string[]
    setSelectGroupList?: (s: string[]) => void
}

export interface YakPoCExecuteContentProps {
    hidden: boolean
    setHidden: (b: boolean) => void
    /**选择的插件组列表 */
    selectGroupList: string[]
    defaultFormValue?: HybridScanControlAfterRequest
    executeStatus: ExpandAndRetractExcessiveState
    setExecuteStatus: (s: ExpandAndRetractExcessiveState) => void
    /**清空所有组 */
    onClearAll: () => void
    /**数据包扫描跳转到该页面需要使用到的参数 */
    dataScanParams: DataScanParamsProps
}

export interface PluginGroupGridItemProps {
    item: GroupCount
    selected: boolean
    onSelect: (g: GroupCount) => void
}

export interface PluginGroupByKeyWordItemProps {
    item: GroupCount
    selected: boolean
    onSelect: (g: GroupCount) => void
}

export interface PluginExecuteLogProps {
    isExecuting: boolean
    hidden: boolean
    pluginExecuteLog: StreamResult.PluginExecuteLog[]
    classNameWrapper?:string
}

export interface TimeConsumingProps {
    type: string
    value: string
}
export interface PluginLogProps extends StreamResult.PluginExecuteLog {
    /**耗时，前端计算 */
    timeConsuming: TimeConsumingProps
}
