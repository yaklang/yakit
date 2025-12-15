import {AITabsEnumType} from "@/pages/ai-agent/aiAgentType"
import {AIAgentTabListEnum} from "@/pages/ai-agent/defaultConstant"

export type AIReActEventProps = {
    /**string>{AIAgentTriggerEventInfo} */
    onReActChatEvent: string
    switchAIActTab?: string
    /**
     * string>{AIAgentTriggerEventInfo}
     */
    switchAIAgentTab: string
}
