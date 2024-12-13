import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {YakScript} from "@/pages/invoker/schema"

/** @name chat-cs聊天对话框信息 */
export interface CacheChatCSProps {
    /** 唯一标识符 */
    token: string
    /** 对话名称 */
    name: string
    /** 对话名是否已经修改（自动修改/手动修改） */
    isRename: boolean
    /** 搜索引擎增强 */
    is_bing: boolean
    /** 插件调试执行 */
    is_plugin: boolean
    /** 对话内容历史 */
    history: ChatInfoProps[]
    /** 对话最新时间 */
    time: string
}
/** @name chat-cs单条聊天信息 */
export interface ChatInfoProps {
    token: string
    isMe: boolean
    time: string
    info: ChatMeInfoProps | ChatCSMultipleInfoProps | ChatPluginListProps
    // 渲染类型
    renderType?: "plugin-list"
}
/** 用户信息属性 */
export interface ChatMeInfoProps {
    content: string
    is_bing: boolean
    is_plugin: boolean
}
/** 服务器信息属性 */
export interface ChatCSMultipleInfoProps {
    likeType: string
    content: ChatCSSingleInfoProps[]
}

/** 服务器插件列表属性 */
export interface ChatPluginListProps {
    input: string
    data: YakScript[]
}

export interface ChatCSSingleInfoProps {
    is_bing: boolean
    is_plugin: boolean
    content: string
    /** 对话服务器唯一标识符 */
    id: string

    /** 缓存插件执行结果 */
    status?: "succee" | "fail" | "info"
    runtimeId?: string
    riskState?: StreamResult.Risk[]
    /** 响应中的展示内容 */
    load_content: LoadObjProps[]
    /** 接口响应是否结束 */
    end: boolean
}

/** 后端返回的数据结构 */
export interface ChatCSAnswerProps {
    id: string
    object: string
    created: number
    model: string
    choices: ChatCSChoicesItem[]
}

interface ChatCSChoicesItem {
    delta: ChatCSdelta
    index: number
    finish_reason: null | string
}

interface ChatCSdelta {
    role: string
    content: string
}

/** 处理过后的后端数据结构 */
export interface ChatCSAnswer {
    id: string
    role: string
    result: string
}

export interface PluginListItemProps {
    name: string
    arguments: any
}

export interface ChatCSPluginProps {
    id: string
    role: string
    script: PluginListItemProps
    // 加载中的字符
    loadResult?: LoadObjProps[]
}
/** 后端返回Plugin的数据结构 */
export interface ChatCSPluginAnswerProps {
    id: string
    role: string
    // 插件数组
    script: string[]
    // 目标
    input: string
    // 加载中的字符
    loadResult?: LoadObjProps[]
}



/** 后端返回的响应中数据结构 */
export interface LoadObjProps {
    result: string
    id: string
}