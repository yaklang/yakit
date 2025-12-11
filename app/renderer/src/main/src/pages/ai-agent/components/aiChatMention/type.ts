import {KnowledgeBase} from "@/components/playground/knowlegeBase/types"
import {AITool} from "../../type/aiTool"
import {AIForge} from "../../type/forge"
import {AIMentionTabsEnum} from "../../defaultConstant"

export interface AIChatMentionProps {
    defaultActiveTab?: AIMentionTabsEnum
    onSelect: (type: AIMentionTabsEnum, value: string) => void
}
interface AIChatMentionQuery {
    keyWord: string
}
export interface AIChatMentionListRefProps {
    onRefresh: () => void
}
interface AIChatMentionRef {
    ref?: React.ForwardedRef<AIChatMentionListRefProps>
}
export interface ForgeNameListOfMentionProps extends AIChatMentionQuery, AIChatMentionRef {
    onSelect: (f: AIForge) => void
}

export interface ToolListOfMentionProps extends AIChatMentionQuery, AIChatMentionRef {
    onSelect: (f: AITool) => void
}

export interface KnowledgeBaseListOfMentionProps extends AIChatMentionQuery, AIChatMentionRef {
    onSelect: (f: KnowledgeBase) => void
}
