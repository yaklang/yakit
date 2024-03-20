import { HybridScanControlAfterRequest } from "@/models/HybridScan"
import { GroupCount } from "@/pages/invoker/schema"

export interface YakPoCProps {
    pageId:string
}

export interface PluginGroupByKeyWordProps{
    pageId:string
    inViewport:boolean
    hidden: boolean
    /**选择的插件组列表 按关键词搜索的 */
    selectGroupListByKeyWord?: string[]
    setSelectGroupListByKeyWord?: (s: string[]) => void
}
export interface PluginGroupGridProps {
    inViewport:boolean
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
    defaultFormValue?:HybridScanControlAfterRequest
}

export interface PluginGroupGridItemProps {
    item: GroupCount
    selected:boolean
    onSelect: (g: GroupCount) => void
}

export interface PluginGroupByKeyWordItemProps{
    item: GroupCount
    selected:boolean
    onSelect: (g: GroupCount) => void
}