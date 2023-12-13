import useHoldingIPCRStream from "@/hook/useHoldingIPCRStream"
import {yakitNotify} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {useInterval, useMemoizedFn} from "ahooks"
import React, {useState, useRef} from "react"
import {LocalPluginExecuteDetailHeard} from "../operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {PluginExecuteResult} from "../operator/pluginExecuteResult/PluginExecuteResult"
import {LocalPluginExecuteProps} from "./PluginsLocalType"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"

export const LocalPluginExecute: React.FC<LocalPluginExecuteProps> = React.memo((props) => {
    const {plugin, headExtraNode} = props
    /**是否在执行中 */
    const [isExecuting, setIsExecuting] = useState<boolean>(false)
    const [runtimeId, setRuntimeId] = useState<string>("")

    const tokenRef = useRef<string>(randomString(40))

    const [streamInfo, debugPluginStreamEvent] = useHoldGRPCStream({
        taskName: "debug-plugin",
        apiKey: "DebugPlugin",
        token: tokenRef.current,
        onEnd: () => {
            debugPluginStreamEvent.stop()
            setTimeout(() => setIsExecuting(false), 300)
        },
        setRuntimeId: (rId) => {
            yakitNotify("info", `调试任务启动成功，运行时 ID: ${rId}`)
            setRuntimeId(rId)
        }
    })
    console.log('streamInfo',streamInfo)
    return (
        <>
            <LocalPluginExecuteDetailHeard
                token={tokenRef.current}
                plugin={plugin}
                extraNode={headExtraNode}
                isExecuting={isExecuting}
                setIsExecuting={setIsExecuting}
                debugPluginStreamEvent={debugPluginStreamEvent}
                progressList={streamInfo.progressState}
            />
            <PluginExecuteResult streamInfo={streamInfo} runtimeId={runtimeId} loading={isExecuting} />
        </>
    )
})
