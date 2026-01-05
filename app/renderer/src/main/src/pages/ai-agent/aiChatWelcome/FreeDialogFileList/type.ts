import {ReactNode} from "react"
import {AIMentionTypeItem} from "../../components/aiChatMention/type"

export interface AITagListItem {
    type: AIMentionTypeItem
    key: string | number
    value: string
}
export interface AITagListProps {
    title: ReactNode
    list: AITagListItem[]
    onRemove: (value: AITagListItem) => void
    onClear: () => void
}
