import {ReactNode} from "react"

export interface SplitViewProp {
    /** 不会动态改变，只支持初始设置值 */
    isVertical?: boolean
    elements: {element: number | ReactNode}[]
    /** 横向时有效 */
    minWidth?: number
    /** 纵向时有效 */
    minHeight?: number
    /** 是否隐藏最后一块 */
    isLastHidden?: boolean
    /** 每个分屏的默认尺寸配置（横向时为宽度，纵向时为高度）
     * undefined 表示该分屏自适应剩余空间 */
    defaultSizes?: (number | undefined)[]
}

export interface SplitViewPositionProp {
    width: number
    height: number
    left: number
    top: number
}

export interface OffsetCoordinate {
    x: number
    y: number
}

export type SashMouseFunc = (index: number, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => any
