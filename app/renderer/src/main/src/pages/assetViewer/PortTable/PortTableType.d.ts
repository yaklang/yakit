import { YakitButtonProp } from "@/components/yakitUI/YakitButton/YakitButton"
import {ReactNode} from "react"

export interface PortTableRefProps{
   
}
export interface PortTableProps{
    ref?: React.ForwardedRef<PortTableRefProps>
    runtimeId?: string
    tableTitle:ReactNode
    tableTitleExtraOperate:ReactNode
    containerClassName?:string
    tableTitleClassName?:string
    btnSize:YakitButtonProp['size']
    /**顶部实时刷新的数据变化回调 */
    setOffsetInTop?:(t:number)=>void
}