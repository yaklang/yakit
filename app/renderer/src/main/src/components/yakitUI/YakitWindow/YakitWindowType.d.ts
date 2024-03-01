import {ResizableProps} from "re-resizable"
import {CSSProperties} from "react"
import {YakitButtonProp} from "../YakitButton/YakitButton"

export interface YakitWindowProps
    extends Omit<YakitWindowContentProps, "callbackDrag" | "activeDockSide" | "onDockSide"> {
    /**
     * @name 指定窗体挂载的节点，默认为body节点
     * @description 注!!! 如果指定非body节点时，需指定节点的position设置为relative
     */
    getContainer?: HTMLElement
    /** 是否展示弹窗 */
    visible: boolean
    /**
     * @name 浮窗模式下窗口的初始位置(topLeft|topRight|center|bottomLeft|bottomRight)
     */
    layout?: "topLeft" | "topRight" | "center" | "bottomLeft" | "bottomRight"

    /** 是否可以拖拽(默认可以拖拽) */
    isDrag?: boolean

    // width和height不能使用string类型，因为在center位置时，无法计算出居中的定位数据

    /** 窗体初始宽度，默认为300px */
    width?: number
    /** 窗体初始高度，默认为360px */
    height?: number
    /** 窗体最小宽度，默认为240px */
    minWidth?: ResizableProps["minWidth"]
    /** 窗体最小高度，默认为200px */
    minHeight?: ResizableProps["minHeight"]

    /** 窗体 resize 时的触发事件 */
    onResize?: (info: {type: WindowPositionType; size: YakitWindowCacheSizeProps}) => any
    /** 窗体缓存宽高的标识字段(键值对中的键名)(设置此字段则默认开启宽高缓存) */
    cacheSizeKey?: string
    /** 第一次进入时的停靠位置 */
    firstDockSide?:WindowPositionType
}

export interface YakitWindowContentProps extends WindowPositionOPProps {
    /** 拖拽热区的触发回调 */
    callbackDrag: (v: boolean) => any

    /** 弹窗修饰-样式类 */
    wrapClassName?: string
    /** header部分-style */
    headerStyle?: CSSProperties
    /** content部分-style */
    contentStyle?: CSSProperties
    /** footer部分-style */
    footerStyle?: CSSProperties

    /** 窗体标题 */
    title?: ReactNode
    /** 窗体副标题 */
    subtitle?: ReactNode
    /** 弹窗操作底部拓展区(左边) */
    footerExtra?: ReactNode
    /** 确认按钮的文案 */
    okButtonText?: ReactNode
    /** 确认按钮的props */
    okButtonProps?: YakitButtonProp
    /** 确认按钮的回调 */
    onOk?: () => any
    /** 取消按钮的文案 */
    cancelButtonText?: ReactNode
    /** 取消按钮的props */
    cancelButtonProps?: YakitButtonProp
    /** 取消按钮的回调 */
    onCancel?: () => any
    children?: ReactNode
}

/**
 * @name 窗体展示位置
 * @param shrink 浮窗
 * @param left 靠左撑满
 * @param right 靠右撑满
 * @param bottom 靠底撑满
 */
export type WindowPositionType = "shrink" | "left" | "right" | "bottom"
export interface WindowPositionOPProps {
    /** 默认可停靠位置(默认为浮窗、左侧、右侧和底部) */
    defaultDockSide?: WindowPositionType[]
    /** 当前激活的停靠模式 */
    activeDockSide: WindowPositionType
    /** 设置停靠模式的回调 */
    onDockSide?: (v: WindowPositionType) => void
}

/**
 * @name 窗体缓存信息
 * @param width 宽度
 * @param height 高度
 */
export interface YakitWindowCacheSizeProps {
    width: number
    height: number
}
/** @name 窗体缓存数据(所有模式) */
export type YakitWindowCacheSizes = Record<string, YakitWindowCacheSizeProps>
