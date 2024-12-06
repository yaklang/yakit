import {YakitAutoCompleteProps} from './../YakitAutoComplete/YakitAutoCompleteType.d';
import {FormItemProps, InputProps} from "antd"
import {DraggerProps} from "antd/lib/upload"
import type {YakitSizeType} from "../YakitInputNumber/YakitInputNumberType"
import {InternalTextAreaProps} from "../YakitInput/YakitInputType"
import {ReactNode} from "react"

type YakitDragger = Omit<DraggerProps, "beforeUpload" | "onChange">

/**拖拽属性 */
export interface FileDraggerProps {
    /**禁用 */
    disabled?: boolean
    /**是否允许多选 */
    multiple?: boolean
    className?: string
    children?: ReactNode
    onDrop?: (e: React.DragEvent<HTMLDivElement>) => void
}
export interface YakitFormDraggerProps extends YakitDraggerProps {
    formItemClassName?: string
    formItemProps?: FormItemProps
}
/**拖拽/点击文件,回显文件路径组件props */
export interface YakitDraggerProps extends FileDraggerProps {
    size?: YakitSizeType
    inputProps?: InputProps
    /**@description selectType为file,该属性才有效*/
    setContent?: (s: string) => void
    uploadFileText?: string
    uploadFolderText?:string
    help?: ReactDOM
    showDefHelp?: boolean
    /**回显的文本值 */
    value?: string
    /**回显的文本回调事件 */
    onChange?: (s: string) => void
    /**all:支持上传文件和文件夹,不支持accept; file:只支持文件; folder:只支持文件夹;a */
    selectType?: "file" | "folder" | "all"
    /** 展示组件 input|textarea|autoComplete */
    renderType?: "input" | "textarea" | "autoComplete"
    /** autoComplete的props */
    autoCompleteProps?: YakitAutoCompleteProps
    /** textarea的props */
    textareaProps?: InternalTextAreaProps
    /**是否显示路径数量 */
    isShowPathNumber?: boolean

    /**接受的文件类型 */
    accept?: string
    /**文件类型是否后缀一定存在 */
    fileExtensionIsExist?: boolean
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
    /**value的分隔符 @default ',' */
    valueSeparator?: string
}

export interface YakitFormDraggerContentProps extends YakitDraggerContentProps {
    formItemClassName?: string
    formItemProps?: FormItemProps
}

export interface YakitDraggerContentPathProps extends YakitDraggerContentProps {
    textAreaType: "content"|"path"
    onTextAreaType:(v:"content"|"path") => void
}

export interface YakitFormDraggerContentPathProps extends YakitDraggerContentProps {
    textAreaType: "content"|"path"
    onTextAreaType:(v:"content"|"path") => void
    formItemClassName?: string
    formItemProps?: FormItemProps
}