import {YakitSelectProps} from "@/components/yakitUI/YakitSelect/YakitSelectType"
import React,{CSSProperties, ReactNode} from "react"

interface ItemProps {
    label?: string | ReactNode
    help?: ReactNode
    formItemStyle?: CSSProperties
    required?: boolean
}

export interface SelectOptionsProps {
    label: string | React.Element
    value: any
    disabled?: boolean
}
interface SelectBaseProps {
    disabled?: boolean
    placeholder?: string
    size?: YakitSelectProps["size"]
    allowClear?: boolean
    data: SelectOptionsProps[]
}

export interface ItemSelectOneProps extends SelectBaseProps, ItemProps {
    value?: any
    setValue?: (value: any) => any
}

export interface ItemSelectMultiForStringProps extends SelectBaseProps, ItemProps {
    mode?: "multiple" | "tags"
    defaultSep?: string
    maxTagTextLength?: number
    value?: string
    setValue?: (s: string) => any
}
