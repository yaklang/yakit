import {ReactNode} from "react"
import {PluginDetailsProps, PluginFilterParams, PluginSearchParams} from "../../baseTemplateType"
import {YakScript} from "@/pages/invoker/schema"
import {API} from "@/services/swagger/resposeType"

interface PluginLocalDetailsProps extends Omit<PluginDetailsProps, "hidden", "setHidden"> {}
export interface PluginLocalListDetailsProps {
    ref?: React.MutableRefObject<PluginLocalListDetailsRefProps | undefined>
    /**刷新插件列表 */
    refreshList?: boolean
    children?: ReactNode
    /**左侧插件列表属性 */
    pluginDetailsProps?: PluginLocalDetailsProps
    /**是否隐藏左边的插件列表 */
    hidden: boolean
    /**选中插件 */
    selectList?: string[]
    setSelectList?: (s: string[]) => void
    /**输入框搜索条件 */
    search?: PluginSearchParams
    setSearch?: (s: PluginSearchParams) => void
    /**其他过滤条件 */
    filters?: PluginFilterParams
    setFilters?: (s: PluginFilterParams) => void
    /**其他过滤的默认条件 */
    defaultFilters?: PluginFilterParams
    /**当page为1时，等待插件查询完成后，需要干的事情,例如批量执行中，查看详情需要选中默认插件和赋值 */
    fetchListInPageFirstAfter?: () => void
    /**插件选中数 */
    selectNum?: number
    setSelectNum?: (s: number) => void
    showFilter?: boolean
    fixFilterList?: API.PluginsSearch[]
    allCheck?: boolean
    setAllCheck?: (b: boolean) => void
    /**插件组排除插件类型 */
    pluginGroupExcludeType?: string[]
}

export interface PluginLocalListDetailsRefProps {}
