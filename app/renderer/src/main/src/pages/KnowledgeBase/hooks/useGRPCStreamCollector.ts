import {useRef, useCallback} from "react"

/**
 * 用于管理多个 gRPC 流（stream）的 Hook 通过 token 唯一标识每一个流
 */
export const useGRPCStreamCollector = () => {
    /**
     * 存储所有流信息的容器 Map 的 key 为 token（唯一标识流）
     */
    const streamsRef = useRef(new Map<string, any>())

    /**
     * 收集并注册一个新的流信息（或更新已有流）
     * @param token 唯一标识该流的 token
     * @param streamInfo 流数据对象（通常是 useHoldGRPCStream 返回的 streamInfo）
     * @param debugPluginStreamEvent 控制流的事件对象（包含 start、stop 等方法）
     * @param runtimeId （可选）运行时 ID，用于标识当前任务
     * @param isExecuting （可选）流是否正在执行
     */
    const collectStreamInfo = useCallback(
        (token: string, streamInfo: any, debugPluginStreamEvent: any, runtimeId?: string, isExecuting?: boolean) => {
            if (!token) return
            streamsRef.current.set(token, {token, streamInfo, debugPluginStreamEvent, runtimeId, isExecuting})
        },
        []
    )

    /**
     * 根据 token 获取对应流信息
     * @param token 唯一标识
     * @returns 存储的流信息对象，若不存在则返回 undefined
     */
    const getStreamByToken = useCallback((token: string) => streamsRef.current.get(token), [])

    /**
     * 设置指定流的执行状态（isExecuting）
     * @param token 唯一标识
     * @param executing 是否正在执行
     */
    const setStreamExecuting = useCallback((token: string, executing: boolean) => {
        const entry = streamsRef.current.get(token)
        if (entry) entry.isExecuting = executing
    }, [])

    /**
     * 停止指定 token 对应的流
     * - 调用其 debugPluginStreamEvent.stop() 方法（如果存在）
     * - 将执行状态设为 false
     * @param token 唯一标识
     */
    const stopStream = useCallback((token: string) => {
        const entry = streamsRef.current.get(token)
        if (entry) {
            entry.debugPluginStreamEvent.stop?.()
            entry.isExecuting = false
        }
    }, [])

    return {collectStreamInfo, getStreamByToken, setStreamExecuting, stopStream}
}
