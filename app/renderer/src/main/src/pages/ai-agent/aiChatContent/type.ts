import {AITabsEnumType} from "../aiAgentType"
import {TabKey} from "../components/aiFileSystemList/type"
import {AITabsEnum} from "../defaultConstant"

export interface AIChatContentProps {}
export type AIAgentTabPayload  = TabHTTPPayload | TabFileSystemPayload
interface TabHTTPPayload  {
    key: AITabsEnum.HTTP | AITabsEnum.Risk
    value?: string
}
interface TabFileSystemPayload  {
    key: AITabsEnum.File_System
    value?: TabKey
}
