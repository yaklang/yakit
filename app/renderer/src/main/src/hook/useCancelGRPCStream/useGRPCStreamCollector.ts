import {useRef, useCallback} from "react"

interface StreamData {
    token: string
    streamInfo: any
    debugPluginStreamEvent: any
    isExecuting: boolean
    runtimeId?: string
    timestamp: number
}

export const useGRPCStreamCollector = () => {
    const streamsRef = useRef(new Map<string, StreamData>())

    /** 收集或更新流信息 */
    const collectStreamInfo = useCallback(
        (token: string, streamInfo: any, debugPluginStreamEvent: any, runtimeId?: string, isExecuting = true) => {
            if (!token) return
            const existing = streamsRef.current.get(token)
            streamsRef.current.set(token, {
                token,
                streamInfo,
                debugPluginStreamEvent,
                runtimeId: runtimeId ?? existing?.runtimeId,
                isExecuting,
                timestamp: Date.now()
            })
        },
        []
    )

    /** 获取所有流 */
    const getAllStreams = useCallback(() => {
        return Array.from(streamsRef.current.values())
    }, [])

    /** 根据 token 获取指定流 */
    const getStreamByToken = useCallback((token: string) => {
        return streamsRef.current.get(token)
    }, [])

    /** 设置执行状态 */
    const setStreamExecuting = useCallback((token: string, executing: boolean) => {
        const stream = streamsRef.current.get(token)
        if (stream) {
            streamsRef.current.set(token, {...stream, isExecuting: executing, timestamp: Date.now()})
        }
    }, [])

    /** 设置 runtimeId */
    const setStreamRuntimeId = useCallback((token: string, runtimeId: string) => {
        const stream = streamsRef.current.get(token)
        if (stream) {
            streamsRef.current.set(token, {...stream, runtimeId, timestamp: Date.now()})
        }
    }, [])

    /** 删除指定流 */
    const removeStream = useCallback((token: string) => {
        const stream = streamsRef.current.get(token)
        if (stream?.debugPluginStreamEvent) {
            stream.debugPluginStreamEvent.stop?.()
        }
        streamsRef.current.delete(token)
    }, [])

    /** 清空所有流 */
    const clearStreams = useCallback(() => {
        streamsRef.current.forEach((stream) => {
            stream.debugPluginStreamEvent?.stop?.()
        })
        streamsRef.current.clear()
    }, [])

    return {
        collectStreamInfo,
        getAllStreams,
        getStreamByToken,
        setStreamExecuting,
        setStreamRuntimeId,
        removeStream,
        clearStreams
    }
}
