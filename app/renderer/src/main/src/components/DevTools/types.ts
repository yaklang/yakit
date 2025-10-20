/**
 * DevTools 组件相关类型定义
 */

/**
 * GRPC 日志条目类型
 */
export interface GRPCLogEntry {
    /** 日志类型 */
    type: "request" | "response" | "stream-write" | "stream-cancel" | "error" | "info"
    /** 是否为流式调用 */
    isStream: boolean
    /** 方法名称 */
    methodName: string
    /** 请求参数 */
    params?: any
    /** 响应数据 */
    response?: any
    /** 流写入数据 */
    data?: any
    /** 错误信息 */
    error?: string | null
    /** 时间戳 */
    timestamp: number
    /** 调用ID */
    callId?: string
    /** 来源 */
    source?: string
    /** 消息内容 */
    message?: string
    /** 唯一标识 */
    id?: number
}

/**
 * DevTools 组件 Props
 */
export interface DevToolsProps {
    /** 自定义类名 */
    className?: string
    /** 自定义样式 */
    style?: React.CSSProperties
}

/**
 * DevToolsButton 组件 Props
 */
export interface DevToolsButtonProps {
    /** 点击事件 */
    onClick: () => void
    /** 是否激活状态 */
    isActive: boolean
}

/**
 * GRPCLogViewer 组件 Props
 */
export interface GRPCLogViewerProps {
    /** 是否可见 */
    visible: boolean
}

/**
 * 日志过滤器配置
 */
export interface LogFilterConfig {
    /** 搜索关键词 */
    searchTerm?: string
    /** 日志类型过滤 */
    logType?: GRPCLogEntry["type"] | "all"
    /** 是否只显示错误 */
    errorsOnly?: boolean
    /** 是否只显示流式调用 */
    streamsOnly?: boolean
}

/**
 * 日志统计信息
 */
export interface LogStatistics {
    /** 总日志数 */
    total: number
    /** 请求数 */
    requests: number
    /** 响应数 */
    responses: number
    /** 错误数 */
    errors: number
    /** 流式调用数 */
    streams: number
}

