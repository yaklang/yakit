import {KnowledgeBase} from "@/components/playground/knowlegeBase/types"
import {AITool} from "../../type/aiTool"
import {AIForge} from "../../type/forge"
import {AIMentionTabsEnum} from "../../defaultConstant"

export interface AIChatMentionSelectItem {
    id: number
    name: string
}
export interface AIChatMentionProps {
    selectForge: AIChatMentionSelectItem[]
    selectTool: AIChatMentionSelectItem[]
    selectKnowledgeBase: AIChatMentionSelectItem[]
    defaultActiveTab?: AIMentionTabsEnum
    onSelect: (type: AIMentionTabsEnum, value: AIChatMentionSelectItem) => void
    onClose: () => void
}
interface AIChatMention {
    keyWord: string
    selectList: AIChatMentionSelectItem[]
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
    onSelect: (f: KnowledgeBase) => void
}

export interface AIMentionSelectItemProps {
    isSelect: boolean
    isActive: boolean
    item: AIChatMentionSelectItem
    onSelect: () => void
}
export interface FileSystemTreeOfMentionProps {
    onSelect: () => void
}
