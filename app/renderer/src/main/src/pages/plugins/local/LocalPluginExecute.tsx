import {yakitNotify} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import React, {useState, useRef, useMemo, useEffect} from "react"
import {LocalPluginExecuteDetailHeard} from "../operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {PluginExecuteResult} from "../operator/pluginExecuteResult/PluginExecuteResult"
import {LocalPluginExecuteProps} from "./PluginsLocalType"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import styles from "./PluginsLocalDetail.module.scss"
import {ExpandAndRetractExcessiveState} from "../operator/expandAndRetract/ExpandAndRetract"
import {useCreation, useMemoizedFn} from "ahooks"
import {apiDownloadPluginOther} from "../utils"
import emiter from "@/utils/eventBus/eventBus"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"

export const LocalPluginExecute: React.FC<LocalPluginExecuteProps> = React.memo((props) => {
    const {plugin, headExtraNode, linkPluginConfig, isHiddenUUID, infoExtra, hiddenUpdateBtn} = props
    /**执行状态 */
    const [executeStatus, setExecuteStatus] = useState<ExpandAndRetractExcessiveState>("default")
    const [runtimeId, setRuntimeId] = useState<string>("")
    const [downLoading, setDownLoading] = useState<boolean>(false)

    const tokenRef = useRef<string>(randomString(40))
    useEffect(() => {
        setExecuteStatus("default")
    }, [plugin.ScriptName])

    const [streamInfo, debugPluginStreamEvent] = useHoldGRPCStream({
        taskName: "debug-plugin",
        apiKey: "DebugPlugin",
        token: tokenRef.current,
        onEnd: () => {
            debugPluginStreamEvent.stop()
            setTimeout(() => {
                setExecuteStatus("finished")
            }, 300)
        },
        setRuntimeId: (rId) => {
            yakitNotify("info", `调试任务启动成功，运行时 ID: ${rId}`)
            setRuntimeId(rId)
        }
    })
    const isExecuting = useCreation(() => {
        if (executeStatus === "process") return true
        return false
    }, [executeStatus])
    const isShowResult = useMemo(() => {
        return isExecuting || runtimeId
    }, [isExecuting, runtimeId])
    /**更新:下载插件 */
    const onDownPlugin = useMemoizedFn(() => {
        if (!plugin.UUID) return
        setDownLoading(true)
        apiDownloadPluginOther({
            UUID: [plugin.UUID]
        })
            .then(() => {
                // 刷新单个执行页面中的插件数据
                emiter.emit("onRefSinglePluginExecution", plugin.UUID)
                yakitNotify("success", "下载完成")
            })
            .finally(() =>
                setTimeout(() => {
                    setDownLoading(false)
                }, 200)
            )
    })
    return (
        <YakitSpin spinning={downLoading}>
            <LocalPluginExecuteDetailHeard
                token={tokenRef.current}
                plugin={plugin}
                extraNode={headExtraNode}
                debugPluginStreamEvent={debugPluginStreamEvent}
                progressList={streamInfo.progressState}
                runtimeId={runtimeId}
                setRuntimeId={setRuntimeId}
                executeStatus={executeStatus}
                setExecuteStatus={setExecuteStatus}
                linkPluginConfig={linkPluginConfig}
                onDownPlugin={onDownPlugin}
                isHiddenUUID={isHiddenUUID}
                infoExtra={infoExtra}
                hiddenUpdateBtn={hiddenUpdateBtn}
            />
            {isShowResult && (
                <PluginExecuteResult
                    streamInfo={streamInfo}
                    runtimeId={runtimeId}
                    loading={isExecuting}
                    defaultActiveKey={plugin.Type === "yak" ? "日志" : undefined}
                    pluginExecuteResultWrapper={styles["plugin-execute-result-wrapper"]}
                />
            )}
        </YakitSpin>
    )
})
