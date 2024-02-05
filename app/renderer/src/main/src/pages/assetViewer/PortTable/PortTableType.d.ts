import {YakitButtonProp} from "@/components/yakitUI/YakitButton/YakitButton"
import {ReactNode} from "react"
import {PortAsset} from "../models"
import {QueryPortsRequest} from "../PortAssetPage"

export interface PortTableRefProps {
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
    tableTitle: ReactNode
    tableTitleExtraOperate: ReactNode
    containerClassName?: string
    tableTitleClassName?: string
    btnSize: YakitButtonProp["size"]
    /**顶部实时刷新的缓存数据 */
    offsetDataInTop?: PortAsset[]
    /**顶部实时刷新的数据变化回调 */
    setOffsetDataInTop?: (t: PortAsset[]) => void
    setSelectNumber?: (n: number) => void
    setTotal?: (n: number) => void
}
