import {AITabsEnumType} from "@/pages/ai-agent/aiAgentType"
import {AIAgentTabListEnum} from "@/pages/ai-agent/defaultConstant"

export type AIReActEventProps = {
    /**string>{AIReActEventInfo} */
    onReActChatEvent: string
    switchAIActTab?: AITabsEnumType
    switchAIAgentTab: AIAgentTabListEnum
}
