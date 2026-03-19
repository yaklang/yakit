import {YakitButtonProp} from "@/components/yakitUI/YakitButton/YakitButton"
import {ReactNode} from "react"

export interface AIReActTaskChatProps {
    setShowFreeChat: (show: boolean) => void
    setTimeLine: (show: boolean) => void
}

export interface AIReActTaskChatContentProps {}

export interface AIReActTaskChatLeftSideProps {
    leftExpand: boolean
    setLeftExpand: (v: boolean) => void
}
export interface AIRenderTaskFooterExtraProps {
    children?: ReactNode
    btnProps?: YakitButtonProp
    subTaskBtnProps?: YakitButtonProp
    onExtraAction: (type: "stopTask" | "stopSubTask") => void
    onRecover: () => void
}
