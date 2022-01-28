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

    return <Space direction={"vertical"} style={{width: "100%"}}>
        <PluginResultUI
            script={props.script}
            results={infoState.messageSate} statusCards={infoState.statusState}
            progress={infoState.processState} feature={infoState.featureMessageState}
            loading={!finished} onXtermRef={ref => setXtermRef(ref)}
        />
    </Space>
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
