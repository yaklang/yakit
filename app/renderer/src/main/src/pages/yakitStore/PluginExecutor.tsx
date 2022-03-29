import React, {useState} from "react";
import {YakExecutorParam} from "../invoker/YakExecutorParams";
import {YakScriptParamsSetter} from "../invoker/YakScriptParamsSetter";
import {YakScript} from "../invoker/schema";
import {Divider, PageHeader} from "antd";
import {randomString} from "../../utils/randomUtil";
import {xtermClear} from "../../utils/xtermUtils";
import {PluginResultUI} from "./viewers/base";
import useHoldingIPCRStream from "../../hook/useHoldingIPCRStream";
import {useMemoizedFn} from "ahooks";

export interface PluginExecutorProp {
    script: YakScript
    size?: any
    extraNode?: React.ReactNode
    subTitle?: React.ReactNode

    settingShow?: boolean
    settingNode?: React.ReactNode
}

const {ipcRenderer} = window.require("electron");

export const PluginExecutor: React.FC<PluginExecutorProp> = (props) => {
    const {script, settingShow, settingNode} = props;

    const [token, setToken] = useState(randomString(40));
    const [loading, setLoading] = useState(false);

    const [infoState, {reset, setXtermRef}, xtermRef] = useHoldingIPCRStream(
        script.ScriptName,
        "exec-yak-script",
        token,
        () => {
            setTimeout(() => setLoading(false), 300)
        }
    )

    const executeByParams = useMemoizedFn((p: YakExecutorParam[]) => {
        setLoading(true)

        setTimeout(() => {
            ipcRenderer.invoke("exec-yak-script", {
                Params: p,
                YakScriptId: props.script.Id,
            }, token)
        }, 300);
    })

    return <div style={{height: "100%", display: "flex", flexFlow: "column"}}>
        <PageHeader
            title={script.ScriptName} style={{marginBottom: 0, paddingBottom: 0}}
            subTitle={props.subTitle}
            extra={props.extraNode}
        >
            {!!settingShow && settingNode}
            <YakScriptParamsSetter
                {...script}
                loading={loading}
                onParamsConfirm={executeByParams}
                onClearData={() => {
                    xtermClear(xtermRef)
                    reset()
                }}
                onCanceled={() => {
                    ipcRenderer.invoke("cancel-exec-yak-script", token)
                }}
                styleSize={props.size}
                submitVerbose={"开始执行"}
                primaryParamsOnly={true}
            />
        </PageHeader>
        <Divider/>
        <PluginResultUI
            script={script} loading={loading} progress={infoState.processState} results={infoState.messageState}
            featureType={infoState.featureTypeState}
            feature={infoState.featureMessageState}
            statusCards={infoState.statusState} onXtermRef={setXtermRef}
        />
    </div>
};