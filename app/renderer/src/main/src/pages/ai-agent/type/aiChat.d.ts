import {UseChatIPCState} from "@/pages/ai-re-act/hooks/type"
import {AIStartParams} from "@/pages/ai-re-act/hooks/grpcApi"
import {ReActChatRenderItem} from "@/pages/ai-re-act/hooks/aiRender"
import {AIChatQSData} from "@/pages/ai-re-act/hooks/aiRender"

export interface AIChatData {
    /** 记录数据里所有的coordinatorIDs */
    coordinatorIDs: string[]
    /** 记录数据里所有的runTimeIDs */
    runTimeIDs: UseChatIPCState["runTimeIDs"]
    yakExecResult: UseChatIPCState["yakExecResult"]
    /** 性能相关数据 */
    aiPerfData: {
        /** 消耗Token */
        consumption: AITokenConsumption
        /** 上下文压力 */
        pressure: AIAgentGrpcApi.Pressure[]
        /** 首字符响应耗时 */
        firstCost: AIAgentGrpcApi.AICostMS[]
        /** 总对话耗时 */
        totalCost: AIAgentGrpcApi.AICostMS[]
    }
    /** 自由对话(ReAct)会话 */
    casualChat: UseChatIPCState["casualChat"] & {
        /** 会话内每条信息的详情 */
        contents: Map<string, AIChatQSData>
    }
    taskChat: UseChatIPCState["taskChat"] & {contents: Map<string, AIChatQSData>}
    grpcFolders: UseChatIPCState["grpcFolders"]
    reActTimelines: UseChatIPCState["reActTimelines"]
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
