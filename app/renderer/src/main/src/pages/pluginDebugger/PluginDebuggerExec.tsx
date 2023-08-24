import React, {useEffect, useState} from "react";
import {HTTPRequestBuilderParams} from "@/pages/httpRequestBuilder/HTTPRequestBuilder";
import {useGetState, useMemoizedFn} from "ahooks";
import {randomString} from "@/utils/randomUtil";
import {ExecResult} from "@/pages/invoker/schema";
import {failed, info} from "@/utils/notification";
import useHoldingIPCRStream from "@/hook/useHoldingIPCRStream";
import {AutoCard} from "@/components/AutoCard";
import {PluginResultUI} from "@/pages/yakitStore/viewers/base";

const {ipcRenderer} = window.require("electron");

export interface PluginDebuggerExecProp {
    code: string
    targets: string
    builder: HTTPRequestBuilderParams
    pluginType: string
    pluginName?: string

    onOperator: (obj: { start: () => any, cancel: () => any }) => any
    onExecuting: (b: boolean) => any
}

export const PluginDebuggerExec: React.FC<PluginDebuggerExecProp> = (props) => {
    const [_t, setToken, getToken] = useGetState(randomString(40));
    const [loading, setLoading] = useState(false)
    const [runtimeId, setRuntimeId] = useState<string>("")

    const [infoState, {
        reset,
        setXtermRef
    }, xtermRef] = useHoldingIPCRStream("debug-plugin", "DebugPlugin", getToken(), () => {
        setTimeout(() => setLoading(false), 300)
    }, undefined, undefined, rId => {
        info(`调试任务启动成功，运行时 ID: ${rId}`)
        setRuntimeId(rId)
    })

    const start = useMemoizedFn(() => {
        setLoading(true)
        ipcRenderer.invoke("DebugPlugin", {
            Code: props.code,
            PluginType: props.pluginType,
            Input: props.targets,
            HTTPRequestTemplate: props.builder,
        }, getToken()).then(() => {
            info("启动任务成功")
        })
    })

    const cancel = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-DebugPlugin", getToken(), {}).then(() => {
            info("取消任务")
        }).finally(() => {
            setToken(randomString(40))
        })
    })

    useEffect(() => {
        props.onOperator({start, cancel})
    }, [start, cancel])

    useEffect(() => {
        props.onExecuting(loading)
    }, [loading])

    return <AutoCard bodyStyle={{padding: 10, overflow: "hidden"}}>
        <PluginResultUI
            // script={script}
            loading={loading}
            risks={infoState.riskState}
            progress={infoState.processState}
            results={infoState.messageState}
            featureType={infoState.featureTypeState}
            feature={infoState.featureMessageState}
            statusCards={infoState.statusState}
            runtimeId={runtimeId}
            fromPlugin={props.pluginName}
        />
    </AutoCard>
};