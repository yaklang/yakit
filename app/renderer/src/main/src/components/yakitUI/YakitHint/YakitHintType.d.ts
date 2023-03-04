import {ReactNode} from "react"
import {YakitButtonProp} from "../YakitButton/YakitButton"

export interface YakitHintProps extends YakitHintModalTypes {
    /** 是否展示遮罩 */
    mask?: boolean
    /** 遮罩层背景色(需要自带透明度的颜色) */
    maskColor?: string
    /** 多弹窗时的副窗口组 */
    childModal?: ChildModalProps[]
    /** 指定弹窗挂载的节点，默认为body节点 */
    getContainer?: Element
}

interface ChildModalProps {
    /** 副窗口标识符(组内唯一) */
    key: string
    /** 副窗口组件属性 */
    content: YakitHintModalTypes
}

type YakitHintModalTypes = Omit<YakitHintModalProps, "isTop" | "setTop">

export interface YakitHintModalProps {
    /** 是否可以拖拽 */
    isDrag?: boolean
    /** 是否展示弹窗 */
    visible: boolean
    /** 弹窗宽度，默认为448px */
    width?: number
    /** 是否弹窗置顶 */
    isTop?: boolean
    /** 设置弹窗置顶 */
    setTop?: () => any
    /** 弹窗修饰-样式类 */
    wrapClassName?: string
    /** 左下侧区域拓展图标 */
    extraIcon?: ReactNode
    /** 弹窗标题 */
    title?: ReactNode
    /** 弹窗文字内容 */
    content?: ReactNode
    /** 弹窗操作底部，设置为{null}则不展示底部区域 */
    footer?: ReactNode | null
    /** 弹窗操作底部拓展区(左边),当footer={null}时该属性无效 */
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
