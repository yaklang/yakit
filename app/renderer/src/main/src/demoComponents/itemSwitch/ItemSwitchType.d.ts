import {YakitSwitchProps} from "@/components/yakitUI/YakitSwitch/YakitSwitchType"
import {CSSProperties, ReactNode} from "react"

interface ItemProps {
    label?: string | ReactNode
    help?: ReactNode
    formItemStyle?: CSSProperties
    required?: boolean
}

export interface ItemSwitchProps extends ItemProps {
    size?: YakitSwitchProps["size"]
    value?: boolean
    setValue?: (value: boolean) => any
    disabled?: boolean
}
