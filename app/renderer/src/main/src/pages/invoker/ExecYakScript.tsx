import React, {useEffect, useState} from "react";
import {ExecResult, YakScript} from "./schema";
import {YakExecutorParam} from "./YakExecutorParams";
import {showDrawer, showModal} from "../../utils/showModal";
import {randomString} from "../../utils/randomUtil";
import {failed, info} from "../../utils/notification";
import {IMonacoEditor, YakEditor} from "../../utils/editors";
import {monacoEditorWrite} from "../fuzzer/fuzzerTemplates";
import {Alert, Card, Progress, Space, Spin, Timeline} from "antd";
import {XTerm} from "xterm-for-react";
import {LogLevelToCode} from "../../components/HTTPFlowTable";
import {YakitLogFormatter} from "./YakitLogFormatter";
import {writeExecResultXTerm, xtermFit} from "../../utils/xtermUtils";
import {ExecResultLog, ExecResultMessage, ExecResultProgress} from "./batch/ExecMessageViewer";
import {HoldingIPCRenderExecStream} from "../yakitStore/PluginExecutor";
import {ExecResultStatusCard, PluginResultUI, StatusCardProps} from "../yakitStore/viewers/base";
import {useDynamicList, useMap, useThrottleFn} from "ahooks";


const {ipcRenderer} = window.require("electron");

export interface YakScriptRunnerProp {
    script: YakScript
    params: YakExecutorParam[]
}

export const YakScriptRunner: React.FC<YakScriptRunnerProp> = (props) => {
    const [error, setError] = useState("");
    const [xtermRef, setXTermRef] = useState<any>();

    // 设置 IPC 回传的结果
    const messageListProvider = useDynamicList<ExecResultLog>([]);
    const messages = messageListProvider.list;
    const [progressMap, progressProvider] = useMap<string, number>(new Map<string, number>());
    const [statusMap, statusProvider] = useMap<string, StatusCardProps>(new Map<string, ExecResultStatusCard>());
    // 为 statusSet 做节流处理，节流一定要注意 statusSet
    const statusOpThrottle = useThrottleFn((i: string, value: ExecResultStatusCard) => {
        statusProvider.set(i, value)
    }, {wait: 500})

    const reset = () => {
        messageListProvider.resetList([]);
        progressProvider.reset();
        statusProvider.reset();
    }

    const processes: ExecResultProgress[] = [];
    progressMap.forEach((value, id) => {
        processes.push({id: id, progress: value})
    })
    processes.sort((a, b) => a.id.localeCompare(b.id))
    const statusCards: StatusCardProps[] = [];
    statusMap.forEach((value) => {
        statusCards.push(value);
    })
    statusCards.sort((a, b) => a.Id.localeCompare(b.Id))

    const [finished, setFinished] = useState(false);

    useEffect(() => {
        if (!xtermRef) {
            return
        }

        const token = randomString(40);
        return HoldingIPCRenderExecStream("exec-script-immediately", "exec-yak-script", token, xtermRef,
            messageListProvider, progressProvider,
            {...statusProvider, set: statusOpThrottle.run, flush: statusOpThrottle.flush},
            () => {
                setFinished(true)
            }, () => {
                ipcRenderer.invoke("exec-yak-script", {
                    Params: props.params,
                    YakScriptId: props.script.Id,
                }, token)
            })
    }, [xtermRef])

    return <Space direction={"vertical"} style={{width: "100%"}}>
        <PluginResultUI
            script={props.script}
            results={messages} statusCards={statusCards} progress={processes}
            loading={!finished} onXtermRef={ref => setXTermRef(ref)}
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
