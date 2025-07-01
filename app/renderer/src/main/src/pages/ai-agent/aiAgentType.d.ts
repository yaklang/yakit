import {CSSProperties, Dispatch, ReactNode, SetStateAction} from "react"
import {MCPClientInfo, MCPClientResource} from "./type/mcpClient"
import {AIChatInfo, AIChatMessage, AIChatReview, AIChatStreams, AIInputEvent, AIStartParams} from "./type/aiChat"
import {AITreeNodeProps} from "./aiTree/type"
import {TextAreaProps} from "antd/lib/input"

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
export type AIAgentTab = "history" | "setting" | "forgeName" | "tool" //  | "mcp"

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
// 对话框
export interface ServerChatProps {}

// 对话框左侧侧边栏
export interface AIChatLeftSideProps {
    expand: boolean
    setExpand: Dispatch<SetStateAction<boolean>>
    tasks: AIChatMessage.PlanTask[]
    onLeafNodeClick?: AITreeNodeProps["onClick"]
    pressure: AIChatMessage.Pressure[]
    cost: AIChatMessage.AICostMS[]
}

// 对话框回答
export interface AIAgentChatBodyProps extends AIAgentChatStreamProps {
    info: AIChatInfo
    consumption: AIChatMessage.Consumption
}

export interface AIAgentChatStreamProps {
    scrollToTask?: AIChatMessage.PlanTask
    setScrollToTask?: Dispatch<SetStateAction<AIChatMessage.PlanTask | undefined>>
    tasks: AIChatMessage.PlanTask[]
    activeStream: string
    streams: Record<string, AIChatStreams[]>
}

export interface ChatStreamCollapseProps {
    id?: string
    className?: string
    style?: CSSProperties
    title?: ReactNode
    headerExtra?: ReactNode
    children?: ReactNode
    expand?: boolean
    onChange?: (value: boolean) => void
}

export interface AIAgentChatFooterProps {
    execute: boolean
    review: boolean
    onStop: () => void
    positon: boolean
    onPositon: () => void
    onReExe: () => void
    onNewChat: () => void
}

// 审阅内容
export interface AIAgentChatReviewProps {
    expand: boolean
    setExpand: Dispatch<SetStateAction<boolean>>
    delayLoading: boolean
    review: AIChatReview
    planReviewTreeKeywordsMap:Map<string, AIChatMessage.PlanReviewRequireExtra>
    onSend: (info: AIChatMessage.ReviewSelector, qs?: string) => void
    onSendAIRequire: (value: string) => void
}

// 对话框日志
export interface AIChatLogsProps {
    logs: AIChatMessage.Log[]
    onClose: () => void
}

// 文本域输入组件
export interface AIAgentChatTextareaProps extends TextAreaProps {}
// #endregion
