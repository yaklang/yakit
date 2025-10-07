import {useRef, useCallback} from "react"

export const useGRPCStreamCollector = () => {
    const streamsRef = useRef(new Map<string, any>())

    const collectStreamInfo = useCallback(
        (token: string, streamInfo: any, debugPluginStreamEvent: any, runtimeId?: string, isExecuting?: boolean) => {
            if (!token) return
            streamsRef.current.set(token, {token, streamInfo, debugPluginStreamEvent, runtimeId, isExecuting})
        },
        []
    )

    const getStreamByToken = useCallback((token: string) => streamsRef.current.get(token), [])
    const setStreamExecuting = useCallback((token: string, executing: boolean) => {
        const entry = streamsRef.current.get(token)
        if (entry) entry.isExecuting = executing
    }, [])

    const stopStream = useCallback((token: string) => {
        const entry = streamsRef.current.get(token)
        if (entry) {
            entry.debugPluginStreamEvent.stop?.()
            entry.isExecuting = false
        }
    }, [])

    return {collectStreamInfo, getStreamByToken, setStreamExecuting, stopStream}
}
