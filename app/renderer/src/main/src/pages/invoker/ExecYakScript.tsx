import React, {useEffect, useState} from "react"
import {YakScript} from "./schema"
import {YakExecutorParam} from "./YakExecutorParams"
import {showDrawer} from "../../utils/showModal"
import {randomString} from "../../utils/randomUtil"
import {Space} from "antd"
import {PluginResultUI} from "../yakitStore/viewers/base"
import {useCreation} from "ahooks"

import useHoldingIPCRStream, {InfoState} from "../../hook/useHoldingIPCRStream"
import {getReleaseEditionName} from "@/utils/envfile"

const {ipcRenderer} = window.require("electron")

export interface YakScriptRunnerProp {
    script: YakScript
    params: YakExecutorParam[]
    debugMode?: boolean
    consoleHeight?: string
}

export const YakScriptRunner: React.FC<YakScriptRunnerProp> = (props) => {
    const token = useCreation(() => randomString(40), [])
    const [infoState, {reset, setXtermRef}] = useHoldingIPCRStream(
        "exec-script-immediately",
        "exec-yak-script",
        token,
        () => {
            setFinished(true)
        },
        () => {
            ipcRenderer.invoke(
                "exec-yak-script",
                {
                    Params: props.params.filter((param: YakExecutorParam) => {
                        return param.Value !== 'false'
                    }),
                    YakScriptId: props.script.Id
                },
                token
            )
        }
    )

    const [finished, setFinished] = useState(false)

    useEffect(() => {
        return () => reset()
    }, [])

    return (
        <div style={{width: "100%", height: "100%"}}>
            <PluginResultUI
                script={props.script}
                debugMode={props.debugMode}
                results={infoState.messageState}
                statusCards={infoState.statusState}
                risks={infoState.riskState}
                featureType={infoState.featureTypeState}
                progress={infoState.processState}
                feature={infoState.featureMessageState}
                loading={!finished}
                onXtermRef={(ref) => setXtermRef(ref)}
                cardStyleType={1}
                consoleHeight={props.consoleHeight}
            />
        </div>
    )
}

export interface DefaultPluginResultUIProp {
    infoState: InfoState
    loading: boolean
    script?: YakScript
}

export const DefaultPluginResultUI: React.FC<DefaultPluginResultUIProp> = (props) => {
    const {script, infoState, loading} = props;

    return <div style={{width: "100%", height: "100%"}}>
        <PluginResultUI
            script={script}
            results={infoState.messageState}
            statusCards={infoState.statusState}
            risks={infoState.riskState}
            featureType={infoState.featureTypeState}
            progress={infoState.processState}
            feature={infoState.featureMessageState}
            loading={loading}
            cardStyleType={1}
        />
    </div>
};

export const startExecuteYakScript = (script: YakScript, params: YakExecutorParam[]) => {
    showDrawer({
        title: `正在执行的 ${getReleaseEditionName()} 模块：${script.ScriptName}`,
        width: "85%",
        mask: false,
        content: (
            <>
                <YakScriptRunner {...{script, params}} />
            </>
        )
    })
}
