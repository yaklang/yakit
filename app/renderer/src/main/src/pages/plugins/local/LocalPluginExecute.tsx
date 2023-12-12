import useHoldingIPCRStream from "@/hook/useHoldingIPCRStream"
import { yakitNotify } from "@/utils/notification"
import { randomString } from "@/utils/randomUtil"
import { useMemoizedFn } from "ahooks"
import React, { useState, useRef } from "react"
import { LocalPluginExecuteDetailHeard } from "../operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import { PluginExecuteResult } from "../operator/pluginExecuteResult/PluginExecuteResult"
import { LocalPluginExecuteProps } from "./PluginsLocalType"

export const LocalPluginExecute: React.FC<LocalPluginExecuteProps> = React.memo((props) => {
    const {plugin, headExtraNode} = props
    /**是否在执行中 */
    const [isExecuting, setIsExecuting] = useState<boolean>(false)
    const [runtimeId, setRuntimeId] = useState<string>("")

    const tokenRef = useRef<string>(randomString(40))

    const [infoState, {reset, setXtermRef}, xtermRef] = useHoldingIPCRStream(
        "debug-plugin",
        "DebugPlugin",
        tokenRef.current,
        () => {
            setTimeout(() => setIsExecuting(false), 300)
        },
        undefined,
        undefined,
        (rId) => {
            yakitNotify("info", `调试任务启动成功，运行时 ID: ${rId}`)
            setRuntimeId(rId)
        }
    )
    const onClearExecuteResult = useMemoizedFn(() => {
        reset()
        yakitNotify("success", "执行结果清除成功")
    })
    return (
        <>
            <LocalPluginExecuteDetailHeard
                token={tokenRef.current}
                plugin={plugin}
                extraNode={headExtraNode}
                isExecuting={isExecuting}
                onClearExecuteResult={onClearExecuteResult}
                setIsExecuting={setIsExecuting}
            />
            <PluginExecuteResult infoState={infoState} runtimeId={runtimeId} />
        </>
    )
})