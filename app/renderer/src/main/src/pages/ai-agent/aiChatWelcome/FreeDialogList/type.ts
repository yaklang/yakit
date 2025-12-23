import {ReactNode} from "react"
import {AIChatMentionSelectItem} from "../../components/aiChatMention/type"
import {AITagListItem, AITagListProps} from "../FreeDialogFileList/type"

export interface FreeDialogForgeListProps {
    type: AITagListItem["type"]
    title: AITagListProps["title"]
    select: AIChatMentionSelectItem[]
    setSelect: (forges: AIChatMentionSelectItem[]) => void
}
