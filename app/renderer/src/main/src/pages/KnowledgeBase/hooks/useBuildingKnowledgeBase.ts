import {useState, useEffect, useRef} from "react"
import {apiDebugPlugin, apiCancelDebugPlugin, DebugPluginRequest} from "@/pages/plugins/utils"
import {failed, yakitNotify} from "@/utils/notification"
import {grpcFetchLocalPluginDetail} from "@/pages/pluginHub/utils/grpc"
import {defPluginExecuteFormValue} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/constants"
import {useMemoizedFn} from "ahooks"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {useGRPCStreamCollector} from "./useGRPCStreamCollector"

export const useBuildingKnowledgeBase = (token: string, files: string[], kbName: string, kbLength: number) => {
    const collector = useGRPCStreamCollector()

    // 只记录第一次有效 token（防止重新初始化流）
    const tokenRef = useRef<string>("")
    useEffect(() => {
        if (!tokenRef.current && token) {
            tokenRef.current = token
        }
    }, [token])

    // 稳定的 token（始终用第一次记录的）
    const stableToken = tokenRef.current

    const [runtimeId, setRuntimeId] = useState("")
    const [isExecuting, setIsExecuting] = useState(false)

    // 只执行一次，不随 token 改变
    const [streamInfo, debugPluginStreamEvent] = useHoldGRPCStream({
        token: stableToken,
        taskName: "debug-plugin",
        apiKey: "DebugPlugin",
        onEnd: () => {
            setIsExecuting(false)
            collector.setStreamExecuting(stableToken, false)
        },
        setRuntimeId: (rId) => {
            yakitNotify("info", `调试任务启动成功，运行时 ID: ${rId}`)
            setRuntimeId(rId)
        }
    })

    // 注册进 collector（只注册一次）
    useEffect(() => {
        if (stableToken && !collector.getStreamByToken(stableToken)) {
            collector.collectStreamInfo(stableToken, streamInfo, debugPluginStreamEvent, runtimeId, isExecuting)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stableToken])

    // 启动构建流程
    const start = useMemoizedFn(async () => {
        if (!stableToken) return
        setIsExecuting(true)

        try {
            const plugin = await grpcFetchLocalPluginDetail({Name: "构建知识库"}, true)
            const executeParams: DebugPluginRequest = {
                Code: "",
                PluginType: plugin.Type,
                Input: "",
                HTTPRequestTemplate: {
                    ...defPluginExecuteFormValue,
                    IsHttpFlowId: false,
                    HTTPFlowId: []
                },
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

            await apiDebugPlugin({
                params: executeParams,
                token: stableToken,
                pluginCustomParams: plugin.Params
            })
            debugPluginStreamEvent.start()
        } catch (err) {
            failed(`查询插件失败: ${err}`)
            setIsExecuting(false)
        }
    })

    // 停止构建流程
    const stop = useMemoizedFn(() => {
        if (!stableToken) return
        apiCancelDebugPlugin(stableToken).then(() => {
            debugPluginStreamEvent.stop()
            setIsExecuting(false)
            collector.setStreamExecuting(stableToken, false)
        })
    })

    // 初次启动
    useEffect(() => {
        if (stableToken) start()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stableToken])

    return {
        streamInfo,
        debugPluginStreamEvent,
        runtimeId,
        isExecuting,
        start,
        stop
    }
}
