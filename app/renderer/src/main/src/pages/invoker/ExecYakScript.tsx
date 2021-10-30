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


const {ipcRenderer} = window.require("electron");

export interface YakScriptRunnerProp {
    script: YakScript
    params: YakExecutorParam[]
}

export const YakScriptRunner: React.FC<YakScriptRunnerProp> = (props) => {
    const [error, setError] = useState("");
    const [progress, setProgress] = useState<ExecResultProgress[]>([]);
    const xtermRef = React.useRef<any>(null);
    const [results, setResults] = useState<ExecResultLog[]>([]);
    const [finished, setFinished] = useState(false);

    useEffect(() => {
        if (!xtermRef) {
            return
        }

        const token = randomString(40);

        let messages: ExecResultMessage[] = [];
        let lastResultLen = 0;
        let lastProgressLen = 0;
        const syncResults = () => {
            let results = messages.filter(i => i.type === "log").map(i => i.content as ExecResultLog);
            if (results.length > lastResultLen) {
                lastResultLen = results.length
                setResults(results)
            }

            let progress = messages.filter(i => i.type === "progress").map(i => i.content as ExecResultProgress);
            if (progress.length > lastProgressLen) {
                lastProgressLen = progress.length
                setProgress(progress)
            }
        }

        ipcRenderer.on(`${token}-data`, async (e: any, data: ExecResult) => {
            if (data.IsMessage) {
                try {
                    let obj: ExecResultMessage = JSON.parse(Buffer.from(data.Message).toString("utf8"));
                    messages.unshift(obj)
                } catch (e) {

                }
            }
            writeExecResultXTerm(xtermRef, data)
        });

        ipcRenderer.on(`${token}-error`, (e, error) => {
            setError(error)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            info("execute finished")
            syncResults()
            setFinished(true)
        })

        ipcRenderer.invoke("exec-yak-script", {
            Params: props.params,
            YakScriptId: props.script.Id,
        }, token)

        syncResults()
        let id = setInterval(() => syncResults(), 500)
        return () => {
            clearInterval(id);
            ipcRenderer.invoke("cancel-exec-yak-script", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [xtermRef])

    useEffect(() => {
        xtermFit(xtermRef, 200, 8)
    })

    return <Space direction={"vertical"} style={{width: "100%"}}>
        {progress.length > 0 ? <>
            {(progress || []).map(e => {
                return <Card size={"small"} hoverable={true} bordered={true} title={`任务进度ID：${e.id}`}>
                    <Progress percent={parseInt((e.progress * 100).toFixed(0))} status="active"/>
                </Card>
            })}
        </> : undefined}
        {results.length > 0 ? <Card size={"small"} hoverable={true} bordered={true} title={`任务额外日志与结果`}>
            <Timeline pending={!finished}>
                {(results || []).map(e => {
                    return <Timeline.Item color={LogLevelToCode(e.level)}>
                        <YakitLogFormatter data={e.data} level={e.level} timestamp={e.timestamp}/>
                    </Timeline.Item>
                })}
            </Timeline>
        </Card> : undefined}
        {error && <Alert type={"error"} message={error}/>}
        <div style={{overflowX: "auto"}}>
            <XTerm ref={xtermRef} options={{convertEol: true, rows: 8}}/>
        </div>
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
