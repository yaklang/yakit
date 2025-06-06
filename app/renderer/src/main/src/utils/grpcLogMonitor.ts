/**
 * GRPC 日志监控器
 * 用于开发模式下监听和处理 GRPC 请求/响应日志
 */

// 在渲染进程中获取ipcRenderer
const {ipcRenderer} = window.require("electron")

interface GRPCLogEntry {
    type: "request" | "response" | "stream-write" | "stream-cancel" | "error"
    isStream: boolean
    methodName: string
    params?: any
    response?: any
    error?: string | null
    timestamp: number
    callId?: string
    source?: string
    id?: number
}

// 配置参数
const CONFIG = {
    MAX_LOGS: 500, // 最大日志数量
    BATCH_INTERVAL: 300, // 日志批处理间隔(毫秒)
}

// 用于存储所有日志的数组
let grpcLogs: GRPCLogEntry[] = []

// 用于回调的监听器集合
const listeners: ((logs: GRPCLogEntry[]) => void)[] = []

// 日志收集状态
let isCollectingLogs = true;

// 待处理的新日志队列
let pendingLogs: GRPCLogEntry[] = [];
// 用于唯一标识符
let pendingIndex = 0

// 批处理定时器
let batchTimer: NodeJS.Timeout | null = null;

/**
 * 设置是否收集日志
 * @param collecting 是否收集
 */
export const setLogCollecting = (collecting: boolean) => {
    isCollectingLogs = collecting;
    
    // 如果重新开始收集，但有待处理日志，立即处理
    if (collecting && pendingLogs.length > 0) {
        processPendingLogs();
    }
}

/**
 * 获取日志收集状态
 * @returns 是否正在收集日志
 */
export const getLogCollectingStatus = () => {
    return isCollectingLogs;
}

/**
 * 处理待处理的日志队列
 */
const processPendingLogs = () => {
    if (pendingLogs.length === 0) return;
    
    // 将待处理日志加入主日志数组
    const newLogs = [...pendingLogs];
    grpcLogs = [...grpcLogs, ...newLogs];
    
    // 限制日志数量
    if (grpcLogs.length > CONFIG.MAX_LOGS) {
        grpcLogs = grpcLogs.slice(-CONFIG.MAX_LOGS);
    }
    
    // 通知所有监听器
    notifyListeners(newLogs);
    
    // 清空待处理队列
    pendingLogs = [];
}

/**
 * 添加日志监听器 (批量接收日志)
 * @param listener 回调函数，当有新日志时触发
 * @returns 用于移除监听器的函数
 */
export const addGRPCLogListener = (listener: (logs: GRPCLogEntry[]) => void) => {
    listeners.push(listener);
    return () => {
        const index = listeners.indexOf(listener);
        if (index !== -1) {
            listeners.splice(index, 1);
        }
    }
}

/**
 * 获取所有记录的日志
 * @returns 日志数组的副本
 */
export const getGRPCLogs = () => {
    return [...grpcLogs]
}

/**
 * 清除所有日志
 */
export const clearGRPCLogs = () => {
    grpcLogs = []
    pendingLogs = []
    
    const clearNotification = {
        type: "info",
        isStream: false,
        methodName: "clearLogs",
        timestamp: Date.now(),
        message: "Logs cleared"
    } as any;
    
    notifyListeners([clearNotification]);
}

/**
 * 查找与指定调用ID相关的所有日志
 * @param callId 调用ID
 * @returns 相关日志数组
 */
export const findLogsByCallId = (callId: string) => {
    return grpcLogs.filter(log => log.callId === callId)
}

/**
 * 查找与指定方法名相关的所有日志
 * @param methodName 方法名
 * @returns 相关日志数组
 */
export const findLogsByMethod = (methodName: string) => {
    return grpcLogs.filter(log => log.methodName === methodName)
}

/**
 * 通知所有监听器有新的日志
 * @param logs 日志条目数组
 */
const notifyListeners = (logs: GRPCLogEntry[]) => {
    if (logs.length === 0) return;
    
    listeners.forEach(listener => {
        try {
            listener(logs)
        } catch (error) {
            console.error("Error in GRPC log listener:", error)
        }
    })
}

/**
 * 启动批处理定时器
 */
const startBatchProcessor = () => {
    if (batchTimer) {
        clearInterval(batchTimer);
    }
    
    batchTimer = setInterval(() => {
        if (pendingLogs.length > 0 && isCollectingLogs) {
            processPendingLogs();
        }
    }, CONFIG.BATCH_INTERVAL);
}

/**
 * 启动 GRPC 日志监控
 * 应在应用启动时调用
 */
export const startGRPCLogMonitor = () => {
    // 检查是否是开发版本
    ipcRenderer.invoke("is-dev-mode").then((isDevMode: boolean) => {
        if (!isDevMode) {
            console.log("Not in dev mode, GRPC log monitor not started")
            return
        }

        console.log("Starting GRPC log monitor in dev mode")
        
        // 启动批处理
        startBatchProcessor();
        
        // 监听来自主进程的日志事件
        ipcRenderer.on("grpc-invoke-log", (_event, log: GRPCLogEntry) => {
            // 只有在收集状态下才处理日志
            if (!isCollectingLogs) return;
            pendingIndex = pendingIndex + 1
            log.id = pendingIndex
            // 添加到待处理队列
            pendingLogs.push(log);
            
            // 开发模式下在控制台显示日志
            console.group(`GRPC ${log.type}: ${log.methodName}`)
            console.log("Time:", new Date(log.timestamp).toLocaleTimeString())
            console.log("Method:", log.methodName)
            console.log("IsStream:", log.isStream)
            if (log.params) console.log("Params:", log.params)
            if (log.response) console.log("Response:", log.response)
            if (log.error) console.log("Error:", log.error)
            if (log.callId) console.log("CallID:", log.callId)
            console.groupEnd()
        })
        
        console.log("GRPC log monitor started")
    })
}

/**
 * 停止 GRPC 日志监控
 * 应在应用关闭时调用
 */
export const stopGRPCLogMonitor = () => {
    if (batchTimer) {
        clearInterval(batchTimer);
        batchTimer = null;
    }
    
    ipcRenderer.removeAllListeners("grpc-invoke-log")
    grpcLogs = []
    pendingLogs = []
    console.log("GRPC log monitor stopped")
} 