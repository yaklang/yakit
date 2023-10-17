import {CSSProperties, ReactNode} from "react"

interface ItemProps {
    label?: string | ReactNode
    help?: ReactNode
    formItemStyle?: CSSProperties
    required?: boolean
}

export interface OptionsProps {
    label: string
    value: any
    disabled?: boolean
}

export interface ItemRadioProps extends ItemProps {
    disabled?: boolean
    size?: "small" | "middle" | "large"
    value?: any
    setValue?: (value: any) => any
    data: OptionsProps[]
}

export interface ItemCheckBoxProps extends ItemProps {
    disabled?: boolean
    value?: string[]
    setValue?: (value: string[]) => any
    data: OptionsProps[]
}
