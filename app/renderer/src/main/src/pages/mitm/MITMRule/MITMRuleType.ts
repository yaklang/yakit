import {ReactNode} from "react"
import {HTTPCookieSetting, HTTPHeader} from "../MITMContentReplacerHeaderOperator"

export interface MITMContentReplacerRule {
    // 文本字符串，正则/Re2/字符串硬匹配
    Index: number
    Rule: string
    NoReplace: boolean
    Result: string
    Color: "red" | "blue" | "green" | "grey" | "purple" | "yellow" | "orange" | "cyan" | ""
    EnableForRequest: boolean
    EnableForResponse: boolean
    EnableForBody: boolean
    EnableForHeader: boolean
    ExtraTag: string[]
    Disabled: boolean
    VerboseName: string

    // 设置额外Header
    ExtraHeaders: HTTPHeader[]
    ExtraCookies: HTTPCookieSetting[]
}

export interface MITMRuleProp {
    status: "idle" | "hijacked" | "hijacking"
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
    onSave: (m: MITMContentReplacerRule) => void
    currentItem?: MITMContentReplacerRule
    rules: MITMContentReplacerRule[]
}

export interface ExtractRegularProps {
    onSave: (s: string) => void
}

export interface ExtraHTTPSelectProps {
    list: HTTPHeader[]
    tip: string
    onSave: (h: HTTPHeader) => any
    onRemove: (h: number) => any
}

export interface InputHTTPHeaderFormProps {
    visible: boolean
    setVisible: (b: boolean) => void
    onSave: (h: HTTPHeader) => any
}

export interface YakitSelectMemoProps {
    value: "" | "red" | "blue" | "green" | "grey" | "purple" | "yellow" | "orange" | "cyan"
    disabled: boolean
    onSelect: (c: "" | "red" | "blue" | "green" | "grey" | "purple" | "yellow" | "orange" | "cyan") => void
}

export interface YakitCheckboxProps {
    checked: boolean
    disabled: boolean
    onChange: (e) => void
}
export interface YakitSwitchMemoProps {
    checked: boolean
    disabled: boolean
    onChange: (e) => void
    Result:string
    ExtraHeaders:HTTPHeader[]
    ExtraCookies:HTTPCookieSetting[]
}
