import {SelectOptionsProps} from "@/demoComponents/itemSelect/ItemSelectType"
import {LocalModelConfig} from "../type/aiChat"

export interface AIModelListProps {}

export type AIModelType = "online" | "local"

export interface AIOnlineModelListProps {
    ref: React.ForwardedRef<AIOnlineModelListRefProps>
    setOnlineTotal: (total: number) => void
}

export interface AIOnlineModelListRefProps {
    onRefresh: () => void
}

export interface AILocalModelListProps {
    ref: React.ForwardedRef<AILocalModelListRefProps>
    setLocalTotal: (total: number) => void
}

export interface AILocalModelListRefProps {
    onRefresh: () => void
}
export interface AILocalModelListItemProps {
    item: LocalModelConfig
}
export interface AIOnlineModelListItemProps {
    item: SelectOptionsProps
}
