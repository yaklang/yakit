import {ReactNode} from "react"

export interface YakitRoundCornerTagProps {
    wrapperClassName?: string
    /**
     * round-corner-tag的颜色
     * @default primary (本质为灰色)
     * @description primary | blue | green
     */
    color?: "primary" | "blue" | "green"
    children?: ReactNode
}
