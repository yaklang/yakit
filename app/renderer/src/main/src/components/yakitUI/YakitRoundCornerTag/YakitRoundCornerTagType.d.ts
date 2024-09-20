import {ReactNode} from "react"

export interface YakitRoundCornerTagProps {
    wrapperClassName?: string
    /**
     * round-corner-tag的颜色
     * @default primary (本质为灰色)
     * @description primary | blue | green | info
     */
    color?: "primary" | "blue" | "green" | "info"
    children?: ReactNode
}
