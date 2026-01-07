import {AITool} from "../../type/aiTool"
import {AIForge} from "../../type/forge"
import {AIMentionTabsEnum, iconMap} from "../../defaultConstant"
import {AIMentionCommandParams} from "../aiMilkdownInput/aiMilkdownMention/aiMentionPlugin"
import {KnowledgeBaseItem} from "@/pages/KnowledgeBase/hooks/useKnowledgeBase"

export type AIMentionTypeItem = AIMentionCommandParams["mentionType"]
export type iconMapType = keyof typeof iconMap
export interface AIChatMentionSelectItem {
    id: string
    name: string
}
export interface AIChatMentionProps {
    defaultActiveTab?: AIMentionTabsEnum
    onSelect: (type: AIMentionTypeItem, value?: AIChatMentionSelectItem) => void
}
interface AIChatMention {
    keyWord: string
    getContainer: () => HTMLElement | null
}
export interface AIChatMentionListRefProps {
    onRefresh: () => void
}
interface AIChatMentionRef {
    ref?: React.ForwardedRef<AIChatMentionListRefProps>
}
export interface ForgeNameListOfMentionProps extends AIChatMention, AIChatMentionRef {
    onSelect: (f: AIForge) => void
}

export interface ToolListOfMentionProps extends AIChatMention, AIChatMentionRef {
    onSelect: (f: AITool) => void
}

export interface KnowledgeBaseListOfMentionProps extends AIChatMention, AIChatMentionRef {
    onSelect: (f: KnowledgeBaseItem) => void
}

export interface AIMentionSelectItemProps {
    isActive: boolean
    item: AIChatMentionSelectItem
    onSelect: () => void
}
export interface FileSystemTreeOfMentionProps {
    onSelect: (path: string, isFolder: boolean) => void
}
