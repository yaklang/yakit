import {FormItemProps, InputProps} from "antd"
import {DraggerProps} from "antd/lib/upload"
import type {YakitSizeType} from "../YakitInputNumber/YakitInputNumberType"
import {InternalTextAreaProps} from "../YakitInput/YakitInputType"

type YakitDragger = Omit<DraggerProps, "beforeUpload" | "onChange">
export interface YakitFormDraggerProps extends YakitDraggerProps {
    formItemClassName?: string
    formItemProps?: FormItemProps
}
/**拖拽/点击文件,回显文件路径组件props */
export interface YakitDraggerProps extends YakitDragger {
    size?: YakitSizeType
    inputProps?: InputProps
    /**@description selectType为file,该属性才有效*/
    setContent?: (s: string) => void
    help?: ReactDOM
    showDefHelp?: boolean
    /**回显的文本值 */
    value?: string
    /**回显的文本回调事件 */
    onChange?: (s: string) => void
    /**all:支出上传文件和文件夹,不支持accept; file:只支持文件; folder:只支持文件夹;a */
    selectType?: "file" | "folder" | "all"

    /** 展示组件 input|textarea */
    renderType?: "input" | "textarea"
    /** textarea的props */
    textareaProps?: InternalTextAreaProps
    /**是否显示路径数量 */
    isShowPathNumber?: boolean
}

export interface YakitDraggerContentProps
    extends Omit<YakitDragger, "showUploadList" | "directory" | "multiple" | "beforeUpload" | "onChange"> {
    /** textarea的props */
    textareaProps?: InternalTextAreaProps
    size?: YakitSizeType
    /**回显的文本值 */
    value?: string
    /**@description 回显的文本回调事件*/
    onChange?: (s: string) => void
    help?: ReactDOM
    showDefHelp?: boolean
    // InputProps?: InputProps
    // /** 展示组件 input|textarea */
    // renderType?: "input" | "textarea"
    /**@default 500k */
    fileLimit?:number
}

export interface YakitFormDraggerContentProps extends YakitDraggerContentProps {
    formItemClassName?: string
    formItemProps?: FormItemProps
}
