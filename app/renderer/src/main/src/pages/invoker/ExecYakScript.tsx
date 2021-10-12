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


const {ipcRenderer} = window.require("electron");

export interface YakScriptRunnerProp {
    script: YakScript
    params: YakExecutorParam[]
}

interface progress {
    id: string,
    progress: number
}

interface yakitLog {
    level: string,
    data: string
    timestamp: number
}

export const YakScriptRunner: React.FC<YakScriptRunnerProp> = (props) => {
    const [error, setError] = useState("");
    const [progress, setProgress] = useState<progress[]>([]);
    const [logs, setLogs] = useState<yakitLog[]>([]);
    const xtermRef = React.useRef<any>(null)

    const write = (s: any) => {
        if (!xtermRef || !xtermRef.current) {
            return
        }

        if ((Buffer.from(s, "utf8") || []).length === 1) {
            let buf = Buffer.from(s, "utf8");
            switch (buf[0]) {
                case 127:
                    xtermRef.current.terminal.write("\b \b");
                    return
                default:
                    xtermRef.current.terminal.write(s);
                    return;
            }
        } else {
            xtermRef.current.terminal.write(s);
            return
        }
    };

    useEffect(() => {
        if (!xtermRef) {
            return
        }

        const token = randomString(40);
        const progs = new Map<string, number>();
        const logs: yakitLog[] = [];
        ipcRenderer.on(`${token}-data`, async (e, data: ExecResult) => {
            if (data.IsMessage) {
                try {
                    let message = Buffer.from(data.Message).toString("utf8");
                    let obj = JSON.parse(message);
                    switch (obj.type) {
                        case "progress":
                            let p = obj.content as progress;
                            progs.set(p.id, p.progress)
                            return
                        case "log":
                            let i = obj.content as yakitLog;
                            logs.push(i)
                            if (logs.length > 0) {
                                setLogs([...logs])
                            }
                    }
                } catch (e) {
                    console.info(e)
                } finally {
                    var p: progress[] = [];
                    progs.forEach((v, k) => {
                        p.push({id: k, progress: v})
                    })
                    if (p.length > 0) {
                        setProgress(p)
                    }
                }

            } else {
                let buffer = (Buffer.from(data.Raw as Uint8Array)).toString("utf8");
                write(buffer)
            }
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            setError(error)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            info("execute finished")
        })
        ipcRenderer.invoke("exec-yak-script", {
            Params: props.params,
            YakScriptId: props.script.Id,
        }, token)
        return () => {
            ipcRenderer.invoke("cancel-exec-yak-script", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [xtermRef])

    return <Space direction={"vertical"} style={{width: "100%"}}>
        {progress.length > 0 ? <>
            {(progress || []).sort().map(e => {
                return <Card size={"small"} hoverable={true} bordered={true} title={`任务进度ID：${e.id}`}>
                    <Progress percent={parseInt((e.progress * 100).toFixed(0))} status="active"/>
                </Card>
            })}
        </> : undefined}
        {logs.length > 0 ? <Card size={"small"} hoverable={true} bordered={true} title={`任务额外日志与结果`}>
            <Timeline pending={true}>
                {(logs || []).sort().map(e => {
                    return <Timeline.Item color={LogLevelToCode(e.level)}>
                        <YakitLogFormatter data={e.data} level={e.level} timestamp={e.timestamp}/>
                    </Timeline.Item>
                })}
            </Timeline>
        </Card> : undefined}
        {error && <Alert type={"error"} message={error}/>}
        <XTerm ref={xtermRef} options={{convertEol: true}}/>
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
