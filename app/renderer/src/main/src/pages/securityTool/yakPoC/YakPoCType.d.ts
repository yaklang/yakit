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
    type: "keyword" | "group"
}
export interface PluginGroupByKeyWordProps {
    pageId: string
    inViewport: boolean
    hidden: boolean
    /**选择的插件组列表 按关键词搜索的 */
    selectGroupListByKeyWord?: string[]
    setSelectGroupListByKeyWord?: (s: string[]) => void
    setResponseToSelect: (s: GroupCount[]) => void
    /**搜索框的默认值 */
    defGroupKeywords?: string
}
export interface PluginGroupGridProps {
    inViewport: boolean
    hidden: boolean
    /**选择的插件组列表 */
    selectGroupList?: string[]
    setSelectGroupList?: (s: string[]) => void
    setResponseToSelect: (s: GroupCount[]) => void
}

export interface YakPoCExecuteContentProps {
    hidden: boolean
    setHidden: (b: boolean) => void
    /**选择的插件组列表 */
    selectGroupList: string[]
    executeStatus: ExpandAndRetractExcessiveState
    setExecuteStatus: (s: ExpandAndRetractExcessiveState) => void
    /**清空所有组 */
    onClearAll: () => void
    pageId: string
    pageInfo: PocPageInfoProps
    onInitInputValueAfter?: (value: HybridScanControlAfterRequest) => void
    type: "keyword" | "group"
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
    classNameWrapper?: string
}

export interface TimeConsumingProps {
    type: string
    value: string
}
export interface PluginLogProps extends StreamResult.PluginExecuteLog {
    /**耗时，前端计算 */
    timeConsuming: TimeConsumingProps
}
