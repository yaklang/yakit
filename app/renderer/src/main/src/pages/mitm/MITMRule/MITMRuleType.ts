import {ReactNode} from "react"
import { MITMContentReplacerRule } from "../MITMContentReplacer"
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

export interface MITMRuleFromModalProps {
    modalVisible: boolean
    onClose: () => void
    currentItem?:MITMContentReplacerRule
}
