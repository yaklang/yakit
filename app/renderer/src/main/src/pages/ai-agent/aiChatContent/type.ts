import {AIReActChatRefProps} from "@/pages/ai-re-act/aiReActChat/AIReActChatType"
import {TabKey} from "../components/aiFileSystemList/type"
import {AITabsEnum} from "../defaultConstant"

export interface AIChatContentRefProps extends AIReActChatRefProps {}
export interface AIChatContentProps {
    ref?: React.ForwardedRef<AIChatContentRefProps>
    onChat: () => void
    onChatFromHistory: (sessionID: string) => void
}
export type AIAgentTabPayload = TabHTTPPayload | TabFileSystemPayload
interface TabHTTPPayload {
    key: AITabsEnum.HTTP | AITabsEnum.Risk
    value?: string
}
interface TabFileSystemPayload {
    key: AITabsEnum.File_System
    value?: TabKey
}
