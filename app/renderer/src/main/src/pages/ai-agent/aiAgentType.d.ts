import {CSSProperties, Dispatch, ReactNode, SetStateAction} from "react"
import {AIChatInfo} from "./type/aiChat"
import {AITreeNodeProps} from "./aiTree/type"
import {HoldGRPCStreamProps, StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {AITabsEnum} from "./defaultConstant"
import {AIAgentGrpcApi, AIStartParams} from "../ai-re-act/hooks/grpcApi"
import {AIChatQSData, AIStreamOutput, AITaskInfoProps} from "../ai-re-act/hooks/aiRender"
import {UseYakExecResultState} from "../ai-re-act/hooks/type"

export interface AIAgentProps {}

// #region 页面全局变量
// 全局配置信息
export interface AIAgentSetting
    extends Omit<AIStartParams, "CoordinatorId" | "Sequence" | "McpServers" | "UserQuery"> {}

// 触发事件通信
export interface AIAgentTriggerEventInfo {
    type: string
    params?: Record<string, any>
}
// #endregion

// #region UI左侧组件定义
export interface AIAgentSideListProps {}

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

export interface AICardListProps {
    list: AIAgentGrpcApi.AIInfoCard[]
}

// 对话框回答
export type AITabsEnumType = `${AITabsEnum}`
export interface AIAgentChatBodyProps extends AIAgentChatStreamProps {
    info: AIChatInfo
    coordinatorId?: string
    yakExecResultLogs: StreamResult.Log[]
}

export interface AIAgentChatStreamProps {
    streams: AIChatQSData[]
    defaultExpand?: boolean
    scrollToBottom: boolean
    execute?: boolean
}
export interface ChatStreamCollapseItemProps {
    expandKey: string
    info: AIStreamOutput
    timestamp: number
    secondExpand: boolean
    handleChangeSecondPanel: (expand: boolean, order: string) => void
    className?: string
    defaultExpand?: boolean
}
export interface ChatStreamContentProps {
    stream: string
}
export interface ChatStreamCollapseProps {
    id?: string
    className?: string
    style?: CSSProperties
    title?: ReactNode
    headerExtra?: ReactNode
    children?: ReactNode
    defaultExpand?: boolean
    expand?: boolean
    onChange?: (value: boolean) => void
}

export interface AIAgentChatFooterProps {
    /** 正在执行中 */
    execute: boolean
    /** 是否在 review 步骤中 */
    review: boolean
    /** 是否能显示重新执行按钮 */
    showReExe?: boolean
    onStop: () => void
    positon: boolean
    onPositon: () => void
    onReExe: () => void
    onNewChat: () => void
}
// #endregion

//#region AI工具查看详情
export interface AIChatToolDrawerContentProps {
    callToolId: string
}
// #endregion

//#region AI 展示内容的tab
export interface AITabProps extends HoldGRPCStreamProps.InfoTab {}
//#endregion
