import {UseChatIPCState} from "@/pages/ai-re-act/hooks/type"
import {AIStartParams} from "@/pages/ai-re-act/hooks/grpcApi"
import {AIYakExecFileRecord} from "@/pages/ai-re-act/hooks/aiRender"

interface AIChatYakExecResult extends Omit<UseChatIPCState["yakExecResult"], "execFileRecord"> {
    execFileRecord: [string, AIYakExecFileRecord[]][]
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
    /** 回答 */
    answer?: {
        runTimeIDs: UseChatIPCState["runTimeIDs"]
        aiPerfData: UseChatIPCState["aiPerfData"]
        casualChat: UseChatIPCState["casualChat"]
        taskChat: UseChatIPCState["taskChat"]
        yakExecResult: AIChatYakExecResult
        grpcFolders: UseChatIPCState["grpcFolders"]
        reActTimelines: UseChatIPCState["reActTimelines"]
    }
}
