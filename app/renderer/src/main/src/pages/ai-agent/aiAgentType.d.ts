import {CSSProperties, Dispatch, ReactNode, SetStateAction} from "react"
import {MCPClientInfo, MCPClientResource} from "./type/mcpClient"
import {AIChatInfo} from "./type/aiChat"
import {AITreeNodeProps} from "./aiTree/type"
import {HoldGRPCStreamProps, StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {AITabsEnum} from "./defaultConstant"
import {AIAgentGrpcApi, AIStartParams} from "../ai-re-act/hooks/grpcApi"
import {AIChatQSData, AIStreamOutput} from "../ai-re-act/hooks/aiRender"

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

// #region mcp 服务器组件相关定义
// resourcesTemplates
export interface RenderResourcesTemplates {
    name: string
    uriTemplate: string
}
// tool-param
export interface RenderToolsParam {
    key: string
    type: string
    description: string
    default: string
    required: boolean
    extra?: string[]
    children?: RenderToolsParam[]
    substructure?: string
}
// tools
export interface RenderTools {
    name: string
    description: string
    params: RenderToolsParam[]
}
// 客户端配置信息
export interface RenderMCPClientInfo extends MCPClientInfo {
    /** 是否是默认服务器 */
    isDefault: boolean
    /** 连接状态 */
    status: boolean

    /** 服务器返回的资源数据 */
    originalData?: MCPClientResource
    /** 前端展示数据 */
    tools?: RenderTools[]
    /** 前端展示数据 */
    resourceTemplates?: RenderResourcesTemplates[]
}
// #endregion

// #region UI左侧组件定义
export interface AIAgentSideListProps {}
// 侧边栏 tab 类型
export type AIAgentTab = "history" | "setting" | "forgeName" | "tool" | "AIModel" //  | "mcp"

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
    tasks: AIAgentGrpcApi.PlanTask[]
    pressure: AIAgentGrpcApi.Pressure[]
    cost: AIAgentGrpcApi.AICostMS[]
    card: AIAgentGrpcApi.AIInfoCard[]
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
    tasks: AIAgentGrpcApi.PlanTask[]
    streams: Record<string, AIChatQSData[]>
    defaultExpand?: boolean
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
