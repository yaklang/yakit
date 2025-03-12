import {Dispatch, SetStateAction} from "react"
import {MCPClientInfo, MCPClientResource} from "./mcpClient/type"

export interface AIAgentProps {}

/** tab 类型 */
export type AIAgentTab = "mcp"

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

export interface MCPServerProps {}
export interface ServerSettingProps {
    servers: RenderMCPClientInfo[]
    setServers: Dispatch<SetStateAction<RenderMCPClientInfo[]>>
}
export interface ServerChatProps {
    getContainer?: HTMLElement
    servers: RenderMCPClientInfo[]
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

export interface AIAgentEmptyProps {}

export interface AIAgentTaskProps {}
