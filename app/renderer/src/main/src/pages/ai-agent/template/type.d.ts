import {Dispatch, ReactNode, SetStateAction} from "react"
import {TextAreaProps} from "antd/lib/input"

export interface QSInputTextareaProps extends Omit<TextAreaProps, "bordered" | "autoSize"> {}

export interface AIChatTextareaProps {
    question?: string
    setQuestion?: Dispatch<SetStateAction<string>>
    extraFooter?: ReactNode
    onSubmit?: (qs: string) => void
    textareaProps?: Omit<QSInputTextareaProps, "value">
}
