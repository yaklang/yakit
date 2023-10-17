import {FormItemProps, InputProps} from "antd"
import {DraggerProps} from "antd/lib/upload"
import type {YakitSizeType} from "../YakitInputNumber/YakitInputNumberType"
import {InternalTextAreaProps} from "../YakitInput/YakitInputType"

export interface YakitFormDraggerProps extends DraggerProps {
    size?: YakitSizeType
    formItemClassName?: string
    formItemProps?: FormItemProps
    InputProps?: InputProps
    setContent?: (s: string) => void
    setFileName?: (s: string) => void
    help?: ReactDOM
    showDefHelp?: boolean
    fileName?: string
    selectType?: "file" | "folder"

    /** 展示组件 input|textarea */
    renderType?: "input" | "textarea"
    /** textarea的props */
    textareaProps?: InternalTextAreaProps
}
