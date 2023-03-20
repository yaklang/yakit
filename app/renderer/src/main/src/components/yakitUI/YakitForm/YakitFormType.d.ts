import {FormItemProps, InputProps} from "antd"
import {DraggerProps} from "antd/lib/upload"
import type {YakitSizeType} from "../YakitInputNumber/YakitInputNumberType"

export interface YakitFormDraggerProps extends DraggerProps {
    size?: YakitSizeType
    formItemClassName?: string
    formItemProps?: FormItemProps
    InputProps?: InputProps
    setContent?: (s: string) => void
    setFileName?: (s: string) => void
    help?:ReactDOM
    showDefHelp?:boolean
    fileName?: string
    selectType?: "file" | "folder"
}
