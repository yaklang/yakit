import {Dispatch, SetStateAction} from "react"
import {MCPClientInfo, MCPClientResource} from "./type/mcpClient"

export interface AIAgentProps {}

/** ai-agent-chat 全局配置 */
export interface AIAgentSetting {
    /** 是否自动执行AI任务 */
    autoExecute: boolean
    /** 是否激活系统文件操作权限 */
    EnableSystemFileSystemOperator: boolean
    /** 是否使用默认系统配置AI */
    UseDefaultAIConfig?: boolean
}

export interface AIAgentSideListProps {}

/** tab 类型 */
export type AIAgentTab = "mcp" | "setting" | "log"

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

export interface ServerSettingProps {
    servers?: RenderMCPClientInfo[]
    setServers?: Dispatch<SetStateAction<RenderMCPClientInfo[]>>
}
export interface ServerChatProps {
    getContainer?: HTMLElement
}

export interface ServerChatInfo {
    id: string
    name: string
    time: number
}

export interface AddServerModalProps {
    info?: RenderMCPClientInfo
    visible: boolean
    onCallback: (result: boolean, info?: RenderMCPClientInfo) => viod
}

export interface EditChatNameModalProps {
    getContainer?: HTMLElement
    info: ServerChatInfo
    visible: boolean
    onCallback: (result: boolean, info?: ServerChatInfo) => viod
}

export interface ServerInfoModalProps {
    info: RenderMCPClientInfo
    visible: boolean
    onCancel: () => viod
}

export interface AIAgentEmptyProps {
    strs: string[]
}

export interface AIAgentTaskProps {}
