import {Dispatch, ReactNode, SetStateAction} from "react"
import {TextAreaProps} from "antd/lib/input"

export interface QSInputTextareaProps extends Omit<TextAreaProps, "bordered" | "autoSize"> {}

export interface AIChatTextareaProps {
    /** 提交按钮的 loading 状态 */
    loading?: boolean
    question?: string
    setQuestion?: Dispatch<SetStateAction<string>>
    extraFooterLeft?: ReactNode
    extraFooterRight?: ReactNode
    onSubmit?: (qs: string) => void
    textareaProps?: Omit<QSInputTextareaProps, "value">
    className?: string
    children?: ReactNode
}
