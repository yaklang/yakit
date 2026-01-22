import {UseChatIPCState} from "@/pages/ai-re-act/hooks/type"
import {AIStartParams} from "@/pages/ai-re-act/hooks/grpcApi"
import {ReActChatRenderItem} from "@/pages/ai-re-act/hooks/aiRender"
import {AIChatQSData} from '@/pages/ai-re-act/hooks/aiRender'

export interface AIChatData {
    coordinatorIDs: UseChatIPCState["coordinatorIDs"]
    runTimeIDs: UseChatIPCState["runTimeIDs"]
    yakExecResult: UseChatIPCState["yakExecResult"]
    aiPerfData: UseChatIPCState["aiPerfData"]
    casualChat: UseChatIPCState["casualChat"]
    taskChat: UseChatIPCState["taskChat"]
    grpcFolders: UseChatIPCState["grpcFolders"]
    reActTimelines: UseChatIPCState["reActTimelines"]
    getChatContentMap?: (chatType: ReActChatRenderItem["chatType"], mapKey: string) => AIChatQSData | undefined
}

/** UI-chat 信息 */
export interface AIChatInfo {
    /** 唯一标识 */
    id: string
    /** 对话名称 */
    name: string
    /** 对话问题 */
    question: string
    /** 时间 */
    time: number
    /** 请求参数 */
    request: AIStartParams
    /** 会话 session */
    session: string
}
