import {ReactNode} from "react"
import {AIMentionTabsItem} from "../../components/aiChatMention/type"

export interface AITagListItem {
    type: AIMentionTabsItem
    key: string | number
    value: string
}
export interface AITagListProps {
    title: ReactNode
    list: AITagListItem[]
    onRemove: (value: AITagListItem) => void
    onClear: () => void
}
