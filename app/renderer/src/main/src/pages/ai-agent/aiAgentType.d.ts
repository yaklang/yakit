import {Dispatch, SetStateAction} from "react"
import {MCPClientInfo, MCPClientResource} from "./type/mcpClient"
import {AIChatInfo, AIChatMessage, AIChatReview, AIChatStreams, AIInputEvent, AIStartParams} from "./type/aiChat"

export interface AIAgentProps {}

// #region 页面全局变量
/** ai-agent-chat 全局配置 */
export interface AIAgentSetting {
    /** 是否自动执行AI任务 */
    AutoExecute?: boolean
    /** 是否激活系统文件操作权限 */
    EnableSystemFileSystemOperator?: AIStartParams["EnableSystemFileSystemOperator"]
    /** 是否使用默认系统配置AI */
    UseDefaultAIConfig?: AIStartParams["UseDefaultAIConfig"]
}
// #endregion

export interface AIAgentSideListProps {}
/** tab 类型 */
export type AIAgentTab = "history" // | "log" | "mcp"

// #region mcp 服务器组件相关定义
/** resourcesTemplates */
export interface RenderResourcesTemplates {
    name: string
    uriTemplate: string
}
/** tool-param */
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
/** tools */
export interface RenderTools {
    name: string
    description: string
    params: RenderToolsParam[]
}
/** 客户端配置信息 */
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

export interface MCPServerProps {
    servers?: RenderMCPClientInfo[]
    setServers?: Dispatch<SetStateAction<RenderMCPClientInfo[]>>
}
// #endregion

export interface AIChatSettingProps {}
export interface HistoryChatProps {}

export interface ServerChatProps {}

export interface AIChatLogsProps {
    logs: AIChatMessage.Log[]
}

export interface AddServerModalProps {
    info?: RenderMCPClientInfo
    visible: boolean
    onCallback: (result: boolean, info?: RenderMCPClientInfo) => viod
}

export interface EditChatNameModalProps {
    getContainer?: HTMLElement
    info: AIChatInfo
    visible: boolean
    onCallback: (result: boolean, info?: AIChatInfo) => viod
}

export interface ServerInfoModalProps {
    info: RenderMCPClientInfo
    visible: boolean
    onCancel: () => viod
}

export interface AIAgentEmptyProps {}
export interface AIAgentChatProps extends AIAgentChatStreamProps {
    chatInfo: AIChatInfo
    consumption: AIChatMessage.Consumption
}
export interface AIAgentChatStreamProps {
    activeStream: string
    streams: AIChatStreams[]
}
