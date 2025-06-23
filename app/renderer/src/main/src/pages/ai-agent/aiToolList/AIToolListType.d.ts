export interface AIToolListProps {}
export type ToolQueryType = "all" | "collect"

export interface AITool {
    Name: string
    Description: string
    Content: string
    ToolPath: string
    Keywords: string[]
    IsFavorite: boolean
}
export interface AIToolListItemProps {
    item: AITool
}
