import {CSSProperties, Dispatch, ReactNode, SetStateAction, MutableRefObject} from "react"
import {AIChatInfo} from "./type/aiChat"
import {AITreeNodeProps} from "./aiTree/type"
import {HoldGRPCStreamProps, StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {AITabsEnum} from "./defaultConstant"
import {AIAgentGrpcApi, AIStartParams} from "../ai-re-act/hooks/grpcApi"
import {AIChatQSData, AIStreamOutput, AITaskInfoProps} from "../ai-re-act/hooks/aiRender"
import {UseYakExecResultState, PlanLoadingStatus} from "../ai-re-act/hooks/type"
import {ReActChatElement} from "@/pages/ai-re-act/hooks/aiRender"
import {UseChatIPCEvents} from "@/pages/ai-re-act/hooks/type"
export interface AIAgentProps {
    pageId: string
}

// #region 页面全局变量
// 全局配置信息
export interface AIAgentSetting
    extends Omit<AIStartParams, "CoordinatorId" | "Sequence" | "McpServers" | "UserQuery"> {}

// 触发事件通信
export interface AIAgentTriggerEventInfo {
    type: string
    params?: Record<string, any>
    // 是否直接使用所传forge
    useForge?: boolean
}
// #endregion

// #region UI左侧组件定义
export interface AIAgentSideListProps {
    show: boolean
    setShow: (s: boolean) => void
}

// 编辑对话名字
export interface EditChatNameModalProps {
    getContainer?: HTMLElement
    info: AIChatInfo
    visible: boolean
    onCallback: (result: boolean, info?: AIChatInfo) => viod
}

// MCP服务器
export interface MCPServerProps {
    servers?: RenderMCPClientInfo[]
    setServers?: Dispatch<SetStateAction<RenderMCPClientInfo[]>>
}
// 添加|编辑MCP服务器
export interface AddServerModalProps {
    info?: RenderMCPClientInfo
    visible: boolean
    onCallback: (result: boolean, info?: RenderMCPClientInfo) => viod
}
// 查看MCP服务器信息
export interface ServerInfoModalProps {
    info: RenderMCPClientInfo
    visible: boolean
    onCancel: () => viod
}
// #endregion

// #region UI右侧组件定义
// 对话框左侧侧边栏
export interface AIChatLeftSideProps {
    expand: boolean
    setExpand: Dispatch<SetStateAction<boolean>>
    tasks: AITaskInfoProps[]
}

// 对话框回答
export type AITabsEnumType = `${AITabsEnum}`

export interface AIAgentChatStreamProps {
    streams: ReActChatElement[]
    getChatContentMap: UseChatIPCEvents["getChatContentMap"]
    defaultExpand?: boolean
    scrollToBottom: boolean
    taskStatus: PlanLoadingStatus
}

// #endregion

//#region AI工具查看详情
export interface AIChatToolDrawerContentProps {
    callToolId: string
}
// #endregion
