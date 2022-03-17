import React, {useEffect, useState} from "react";
import {YakScript} from "./schema";
import {YakExecutorParam} from "./YakExecutorParams";
import {showDrawer} from "../../utils/showModal";
import {randomString} from "../../utils/randomUtil";
import {Space} from "antd";
import {PluginResultUI} from "../yakitStore/viewers/base";
import {useCreation} from "ahooks";

import useHoldingIPCRStream from "../../hook/useHoldingIPCRStream";


const {ipcRenderer} = window.require("electron");

export interface YakScriptRunnerProp {
    script: YakScript
    params: YakExecutorParam[]
    debugMode?: boolean
}

export const YakScriptRunner: React.FC<YakScriptRunnerProp> = (props) => {
    const token= useCreation(()=>randomString(40),[]);
    const [infoState, { reset, setXtermRef }] = useHoldingIPCRStream(
        "exec-script-immediately", 
        "exec-yak-script",
        token,
        () => {
            setFinished(true)
        }, 
        () => {
            ipcRenderer.invoke("exec-yak-script", {
                Params: props.params,
                YakScriptId: props.script.Id,
            }, token)
        }
    )
    
    const [finished, setFinished] = useState(false);

    useEffect(()=>{
        return () => reset()
    },[])

    return <div style={{width: "100%", height: "100%"}}>
        <PluginResultUI
            script={props.script} debugMode={props.debugMode}
            results={infoState.messageState} statusCards={infoState.statusState}
            featureType={infoState.featureTypeState}
            progress={infoState.processState} feature={infoState.featureMessageState}
            loading={!finished} onXtermRef={ref => setXtermRef(ref)}
        />
    </div>
};

export const startExecuteYakScript = (script: YakScript, params: YakExecutorParam[]) => {
    showDrawer({
        title: `正在执行的 Yakit 模块：${script.ScriptName}`,
        width: "85%",
        mask: false,
        content: <>
            <YakScriptRunner {...{script, params}}/>
        </>
    })
}
