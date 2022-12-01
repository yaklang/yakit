import {ReactNode} from "react"
import {HTTPCookieSetting, HTTPHeader} from "../MITMContentReplacerHeaderOperator"

export interface MITMRuleProp {
    top: number
    visible: boolean
    setVisible: (b: boolean) => void
    getContainer?: HTMLElement | (() => HTMLElement) | false
}

export interface ButtonTextProps {
    onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
    label: string
    icon?: ReactNode
}
