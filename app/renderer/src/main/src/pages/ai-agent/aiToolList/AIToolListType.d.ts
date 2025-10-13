import {AITool} from "../type/aiChat"

export interface AIToolListProps {}
export type ToolQueryType = "all" | "collect"

export interface AIToolListItemProps {
    item: AITool
    onSetData: (value: AITool) => void
    onRefresh: () => void
    onSelect: (value: AITool) => void
}
