import {SelectOptionsProps} from "@/demoComponents/itemSelect/ItemSelectType"
import {LocalModelConfig} from "../type/aiChat"
import {ThirdPartyApplicationConfig} from "@/components/configNetwork/ConfigNetworkPage"

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
    onRefresh: () => void
}
export interface AIOnlineModelListItemProps {
    item: ThirdPartyApplicationConfig
    onRemove: (item: ThirdPartyApplicationConfig) => void
    onEdit: (item: ThirdPartyApplicationConfig) => void
}
