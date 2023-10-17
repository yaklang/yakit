import {YakitFormDraggerProps} from "@/components/yakitUI/YakitForm/YakitFormType"
import {YakitInputProps} from "@/components/yakitUI/YakitInput/YakitInputType"
import {YakitInputNumberProps} from "@/components/yakitUI/YakitInputNumber/YakitInputNumberType"
import {TextAreaProps} from "antd/lib/input"
import {CSSProperties, ReactNode} from "react"

interface ItemProps {
    label?: string | ReactNode
    help?: ReactNode
    formItemStyle?: CSSProperties
    required?: boolean
}

export interface ItemInputProps extends ItemProps {
    placeholder?: string
    disable?: boolean
    width?: string | number
    allowClear?: boolean
    type?: LiteralUnion<
        | "button"
        | "checkbox"
        | "color"
        | "date"
        | "datetime-local"
        | "email"
        | "file"
        | "hidden"
        | "image"
        | "month"
        | "number"
        | "password"
        | "radio"
        | "range"
        | "reset"
        | "search"
        | "submit"
        | "tel"
        | "text"
        | "time"
        | "url"
        | "week",
        string
    >

    prefix?: React.ReactNode
    suffix?: React.ReactNode

    // 是否阻止事件冒泡
    isBubbing?: boolean

    value?: string
    setValue?: (value: string) => any
}

export interface ItemTextAreaProps extends ItemProps {
    placeholder?: string
    disable?: boolean
    width?: string | number
    allowClear?: boolean
    textareaRow?: number
    autoSize?: TextAreaProps["autoSize"]

    // 是否阻止事件冒泡
    isBubbing?: boolean

    value?: string
    setValue?: (value: string) => any
}

export interface ItemAutoCompleteProps extends ItemProps {
    placeholder?: string
    disable?: boolean
    width?: string | number
    allowClear?: boolean
    autoComplete?: string[]

    // 是否阻止事件冒泡
    isBubbing?: boolean

    value?: string
    setValue?: (value: string) => any
}

export interface ItemInputIntegerProps extends ItemProps {
    width?: string | number
    size?: YakitInputNumberProps["size"]
    min?: number
    max?: number
    defaultValue?: number
    disable?: boolean
    value?: number
    setValue?: (value: number) => any
}
export interface ItemInputFloatProps extends ItemInputIntegerProps {
    precision?: number
}

export interface ItemInputDraggerPathProps extends ItemProps {
    /** 展示组件 输入框|文本域 */
    renderType?: YakitFormDraggerProps["renderType"]
    /** 选择类型 文件|文件夹 */
    selectType?: YakitFormDraggerProps["selectType"]

    placeholder?: string
    disable?: boolean
    width?: string | number
    allowClear?: boolean

    // input
    /** 仅input组件有效 */
    size?: YakitInputProps["size"]

    // textarea
    textareaRow?: number
    autoSize?: TextAreaProps["autoSize"]

    value?: string
    setValue?: (value: string) => any
}
