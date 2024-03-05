import {YakitButtonProp} from "@/components/yakitUI/YakitButton/YakitButton"
import {ReactNode} from "react"
import {PortAsset} from "../models"
import {QueryPortsRequest} from "../PortAssetPage"

export interface PortTableRefProps {
    /**内置的删除方法 */
    onRemove: () => Promise
}
export interface PortTableProps {
    ref?: React.ForwardedRef<PortTableRefProps>
    /**计时器开关 true 开，false关 */
    isStop?: boolean
    isRefresh?: boolean
    setIsRefresh?: (b: boolean) => void
    query: QueryPortsRequest
    setQuery: (t: QueryPortsRequest) => void
    /**表格头部 */
    tableTitle?: ReactNode
    /**表格头部右侧操作区 */
    tableTitleExtraOperate: ReactNode
    /**表格部分的body类 */
    containerClassName?: string
    /**表格heard部分的类 */
    tableTitleClassName?: string
    /**第二部分，详情的body类 */
    detailBodyClassName?: string
    btnSize: YakitButtonProp["size"]
    /**顶部实时刷新的缓存数据 */
    offsetDataInTop?: PortAsset[]
    /**顶部实时刷新的数据变化回调 */
    setOffsetDataInTop?: (t: PortAsset[]) => void
    /**选中数据条数的回调 */
    setSelectNumber?: (n: number) => void
    setTotal?: (n: number) => void
}
