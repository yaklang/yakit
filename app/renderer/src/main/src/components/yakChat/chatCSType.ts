/** @name chat-cs聊天对话框信息 */
export interface CacheChatCSProps {
    /** 唯一标识符 */
    token: string
    /** 对话名称 */
    name: string
    /** 通用安全知识|漏洞情报知识 */
    baseType: string
    /** 开源漏洞EXP */
    expInfo: boolean
    /** 背景知识 */
    backCatch: boolean
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
    info: ChatMeInfoProps | ChatCSMultipleInfoProps
}
/** 用户信息属性 */
export interface ChatMeInfoProps {
    content: string
    baseType: string
    expInfo: boolean
    backCatch: boolean
}
/** 服务器信息属性 */
export interface ChatCSMultipleInfoProps {
    likeType: string
    content: ChatCSSingleInfoProps[]
}
export interface ChatCSSingleInfoProps {
    type: string
    content: string
    /** 对话服务器唯一标识符 */
    id: string
}

/** 后端返回的数据结构 */
export interface ChatCSAnswerProps {
    id: string
    role: string
    text: string
}
