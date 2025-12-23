import {ReactNode} from "react"

export interface AITagListItem {
    type: "forge" | "tool" | "knowledgeBase" | "file" | "folder"
    key: string | number
    value: string
}
export interface AITagListProps {
    title: ReactNode
    list: AITagListItem[]
    onRemove: (value: AITagListItem) => void
    onClear: () => void
}
