import {useState, useEffect} from "react"
import {apiDebugPlugin, apiCancelDebugPlugin, DebugPluginRequest} from "@/pages/plugins/utils"
import {failed, yakitNotify} from "@/utils/notification"
import {grpcFetchLocalPluginDetail} from "@/pages/pluginHub/utils/grpc"
import {defPluginExecuteFormValue} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/constants"
import {useMemoizedFn} from "ahooks"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {useGRPCStreamCollector} from "./useGRPCStreamCollector"

/**
 * 构建知识库 Hook
 * 负责启动/复用 gRPC 流，管理状态与流注册
 */
export const useBuildingKnowledgeBase = (token: string, files: string[], kbName: string, kbLength: number) => {
    const collector = useGRPCStreamCollector()
    const existingStream = collector.getStreamByToken(token)

    const [runtimeId, setRuntimeId] = useState(existingStream?.runtimeId ?? "")
    const [isExecuting, setIsExecuting] = useState(existingStream?.isExecuting ?? false)

    // 顶层 hook 调用（每个 token 只会有一条 stream）
    const [streamInfo, debugPluginStreamEvent] = useHoldGRPCStream({
        token,
        taskName: "debug-plugin",
        apiKey: "DebugPlugin",
        onEnd: () => {
            setIsExecuting(false)
            collector.setStreamExecuting?.(token, false)
            console.log("构建任务结束")
        },
        setRuntimeId: (rId) => {
            yakitNotify("info", `知识库任务启动成功，运行时 ID: ${rId}`)
            setRuntimeId(rId)
        }
    })

    // 每当流变化时注册到 collector
    useEffect(() => {
        if (token) {
            collector.collectStreamInfo(token, streamInfo, debugPluginStreamEvent, runtimeId, isExecuting)
        }
    }, [token, streamInfo, debugPluginStreamEvent, runtimeId, isExecuting])

    // 启动任务逻辑
    const start = useMemoizedFn(async () => {
        if (!token) return
        setIsExecuting(true)

        try {
            const plugin = await grpcFetchLocalPluginDetail({Name: "构建知识库"}, true)
            const executeParams: DebugPluginRequest = {
                Code: "",
                PluginType: plugin.Type,
                Input: "",
                HTTPRequestTemplate: {...defPluginExecuteFormValue, IsHttpFlowId: false, HTTPFlowId: []},
                ExecParams: [
                    {Key: "files", Value: files.join(",")},
                    {Key: "kbName", Value: kbName || "default"},
                    {Key: "prompt", Value: ""},
                    {Key: "entrylen", Value: `${kbLength ?? 1000}`},
                    {Key: "k", Value: "0"},
                    {Key: "kmin", Value: "2"},
                    {Key: "kmax", Value: "4"}
                ],
                PluginName: plugin.ScriptName
            }

            await apiDebugPlugin({params: executeParams, token, pluginCustomParams: plugin.Params})
            debugPluginStreamEvent.start()
            collector.setStreamExecuting?.(token, true)
        } catch (err) {
            failed(`构建知识库失败: ${err}`)
            setIsExecuting(false)
            collector.setStreamExecuting?.(token, false)
        }
    })

    // 如果之前没有流，启动新流；否则复用旧流
    useEffect(() => {
        if (!token) return
        if (!existingStream) {
            start()
        } else {
            setRuntimeId(existingStream.runtimeId)
            setIsExecuting(existingStream.isExecuting)
        }
    }, [token, existingStream, start])

    // 停止任务
    const stop = useMemoizedFn(async () => {
        await apiCancelDebugPlugin(token)
        debugPluginStreamEvent.stop()
        setIsExecuting(false)
        collector.setStreamExecuting?.(token, false)
    })

    return {
        streamInfo,
        debugPluginStreamEvent,
        runtimeId,
        isExecuting,
        start,
        stop
    }
}
