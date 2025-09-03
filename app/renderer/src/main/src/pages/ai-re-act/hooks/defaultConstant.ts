import {AIChatMessage} from "@/pages/ai-agent/type/aiChat"

export const DefaultAIToolResult: AIChatMessage.AIToolData = {
    callToolId: "",
    toolName: "-",
    status: "default",
    summary: "",
    time: 0,
    selectors: [],
    interactiveId: "",
    toolStdoutContent: {
        content: "",
        isShowAll: false
    }
}
