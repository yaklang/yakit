// DebugTaskContainer.tsx
import {useEffect, useState} from "react"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {PluginExecuteResult} from "@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResult"
import {apiCancelDebugPlugin, apiDebugPlugin, DebugPluginRequest} from "@/pages/plugins/utils"
import {failed, yakitNotify} from "@/utils/notification"
import {useMemoizedFn} from "ahooks"
import {grpcFetchLocalPluginDetail} from "@/pages/pluginHub/utils/grpc"
import {defPluginExecuteFormValue} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/constants"
import {KnowledgeBaseItem} from "../hooks/useKnowledgeBase"
import styles from "../knowledgeBase.module.scss"
import {useGRPCStreamCollector} from "@/hook/useCancelGRPCStream/useGRPCStreamCollector"

interface DebugTaskContainerProps {
    token: string
    knowledgeBaseItems: Partial<KnowledgeBaseItem>
    existingStream?: any
}

export const DebugTaskContainer = ({token, knowledgeBaseItems, existingStream}: DebugTaskContainerProps) => {
    const collector = useGRPCStreamCollector()

    const [runtimeId, setRuntimeId] = useState(existingStream?.runtimeId ?? "")
    const [isExecuting, setIsExecuting] = useState(existingStream?.isExecuting ?? false)

    const startBuildingKnowledgeBase = useMemoizedFn(async () => {
        if (!token) return
        setIsExecuting(true)
        const pathStr = knowledgeBaseItems.KnowledgeBaseFile?.map((it) => it.path).join(",") ?? ""

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
                    {Key: "files", Value: pathStr},
                    {Key: "kbName", Value: knowledgeBaseItems.KnowledgeBaseName || "default"},
                    {Key: "prompt", Value: ""},
                    {Key: "entrylen", Value: `${knowledgeBaseItems.KnowledgeBaseLength ?? 1000}`},
                    {Key: "k", Value: "0"},
                    {Key: "kmin", Value: "2"},
                    {Key: "kmax", Value: "4"}
                ],
                PluginName: plugin.ScriptName
            }

            await apiDebugPlugin({params: executeParams, token, pluginCustomParams: plugin.Params})
            debugPluginStreamEvent.start()
        } catch (err) {
            failed(`查询插件失败: ${err}`)
            setIsExecuting(false)
        }
    })

    const [streamInfo, debugPluginStreamEvent] = useHoldGRPCStream({
        taskName: "debug-plugin",
        apiKey: "DebugPlugin",
        token,
        onEnd: async () => {
            setIsExecuting(false)
            console.log("构建完成")
        },
        setRuntimeId: (rId) => {
            yakitNotify("info", `调试任务启动成功，运行时 ID: ${rId}`)
            setRuntimeId(rId)
        }
    })

    useEffect(() => {
        collector.collectStreamInfo(token, streamInfo, debugPluginStreamEvent, runtimeId, isExecuting)
    }, [token, streamInfo, debugPluginStreamEvent, runtimeId, isExecuting, collector])

    useEffect(() => {
        if (!existingStream) {
            startBuildingKnowledgeBase()
        } else {
            // 复用已有流
            setRuntimeId(existingStream.runtimeId)
            setIsExecuting(existingStream.isExecuting)
        }
    }, [token, existingStream, startBuildingKnowledgeBase])

    const handleStop = () => {
        apiCancelDebugPlugin(token).then(() => {
            debugPluginStreamEvent.stop()
            setIsExecuting(false)
            collector.setStreamExecuting(token, false)
        })
    }

    return (
        <div className={styles["knowledge-task-container"]}>
            <PluginExecuteResult
                streamInfo={streamInfo}
                runtimeId={runtimeId}
                loading={isExecuting}
                defaultActiveKey='日志'
            />
        </div>
    )
}
