import {ReactNode} from "react"
import {MITMContentReplacerRule} from "../MITMContentReplacer"
import { HTTPHeader } from "../MITMContentReplacerHeaderOperator"

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
    defaultIndex?: number
    isEdit: boolean
    modalVisible: boolean
    onClose: () => void
    onSave: (m:MITMContentReplacerRule) => void
    currentItem?: MITMContentReplacerRule
    rules:MITMContentReplacerRule[]
}

export interface ExtractRegularProps {
    onSave: (s: string) => void
}

export interface ExtraHTTPSelectProps {
    list:HTTPHeader[]
    tip: string
    onSave: (h: HTTPHeader) => any
    onRemove: (h: number) => any
}

export interface InputHTTPHeaderFormProps {
    visible: boolean
    setVisible: (b: boolean) => void
    onSave: (h: HTTPHeader) => any
}
