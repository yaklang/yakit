import React, {useEffect, useRef, useState} from "react";
import {YakExecutorParam} from "../invoker/YakExecutorParams";
import {YakScriptParamsSetter} from "../invoker/YakScriptParamsSetter";
import {ExecResult, YakScript} from "../invoker/schema";
import {Button, Collapse, Popconfirm, Space, Spin} from "antd";
import {XTerm} from "xterm-for-react";
import {randomString} from "../../utils/randomUtil";
import {failed, info} from "../../utils/notification";
import {writeExecResultXTerm, xtermClear, xtermFit} from "../../utils/xtermUtils";
import {ExecResultLog, ExecResultMessage, ExecResultProgress} from "../invoker/batch/ExecMessageViewer";
import {PluginResultUI, StatusCardProps} from "./viewers/base";

export interface PluginExecutorProp {
    script: YakScript
    size?: any
}

const {ipcRenderer} = window.require("electron");

const {Panel} = Collapse;

export const PluginExecutor: React.FC<PluginExecutorProp> = (props) => {
    const {script} = props;
    const xtermRef = useRef(null);
    const [token, setToken] = useState("");
    const [loading, setLoading] = useState(false);
    const [activePanels, setActivePanels] = useState<string[]>(["params"]);

    // 设置结果
    const [results, setResults] = useState<ExecResultLog[]>([]);
    const [progress, setProgress] = useState<ExecResultProgress[]>([]);
    const [statusCards, setStatusCards] = useState<StatusCardProps[]>([]);

    // flags
    const [resetFlag, setResetFlag] = useState(false);

    const reset = () => {
        setResetFlag(!resetFlag)
        setResults([])
        setProgress([])
        setStatusCards([])
    }

    useEffect(() => {
        if (!xtermRef) {
            return
        }

        const token = randomString(40);
        setToken(token)

        let messages: ExecResultMessage[] = [];
        let processKVPair = new Map<string, number>();
        let statusKVPair = new Map<string, StatusCardProps>();

        let lastResultLen = 0;
        const syncResults = () => {
            let results = messages.filter(i => i.type === "log").map(i => i.content as ExecResultLog);
            if (results.length > lastResultLen) {
                lastResultLen = results.length
                setResults(results)
            }

            const processes: ExecResultProgress[] = []
            processKVPair.forEach((value, id) => {
                processes.push({id: id, progress: value})
            })
            setProgress(processes.sort((a, b) => a.id.localeCompare(b.id)))

            const statusCards: StatusCardProps[] = [];
            statusKVPair.forEach((value) => {
                statusCards.push(value);
            })
            setStatusCards(statusCards.sort((a, b) => a.Id.localeCompare((b.Id))))
        }

        ipcRenderer.on(`${token}-data`, async (e: any, data: ExecResult) => {
            if (data.IsMessage) {
                try {
                    let obj: ExecResultMessage = JSON.parse(Buffer.from(data.Message).toString("utf8"));

                    // 处理 Process KVPair
                    if (obj.type === "process") {
                        const processData = obj.content as ExecResultProgress;
                        if (processData && processData.id) {
                            processKVPair.set(processData.id, Math.max(processKVPair.get(processData.id) || 0, processData.progress))
                        }
                        return
                    }

                    // 处理 log feature-status-card-data
                    const logData = obj.content as ExecResultLog;
                    if (obj.type === "log" && logData.level === "feature-status-card-data") {
                        try {
                            const obj = JSON.parse(logData.data);
                            const {id, data} = obj;
                            const {timestamp} = logData;
                            const originData = statusKVPair.get(id);
                            if (originData && originData.Timestamp > timestamp) {
                                return
                            }
                            statusKVPair.set(id, {Id: id, Data: data, Timestamp: timestamp})
                        } catch (e) {
                        }
                        return
                    }
                    messages.unshift(obj)
                } catch (e) {

                }
            }
            writeExecResultXTerm(xtermRef, data)
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            failed(`[Mod] ${script.ScriptName} error: ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            info(`[Mod] ${script.ScriptName} finished`)
            syncResults()
            setTimeout(() => setLoading(false), 300)
        })

        syncResults()
        let id = setInterval(() => syncResults(), 500)

        return () => {
            clearInterval(id);
            ipcRenderer.invoke("cancel-exec-yak-script", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }

    }, [xtermRef, resetFlag])

    useEffect(() => {
        xtermFit(xtermRef, 256, 6)
    })

    useEffect(() => {
        if (!loading) {
            setActivePanels([...activePanels, "params"])
        }
    }, [loading])

    return <div>
        <Collapse
            activeKey={activePanels}
            onChange={key => {
                // console.info(key)
            }}
        >
            <Panel
                key={"params"}
                showArrow={false}
                header={<>
                    设置参数 / Params
                </>}
                extra={<>
                    <Space>
                        <Popconfirm
                            title={"确定想要停止该任务？"}
                            disabled={!loading}
                            onConfirm={e => {
                                ipcRenderer.invoke("cancel-exec-yak-script", token)
                            }}
                        >
                            <Button
                                size={"small"}
                                disabled={!loading}
                                type={"primary"} danger={true}>
                                立即停止该任务 / KILL TASK
                            </Button>
                        </Popconfirm>
                        <Button
                            size={"small"}
                            onClick={e => {
                                xtermClear(xtermRef)
                                reset()
                                setActivePanels(["params"])
                            }} disabled={loading}
                        >清空结果</Button>
                    </Space>
                </>}>
                <Spin spinning={loading}>
                    <YakScriptParamsSetter
                        {...script}
                        params={[]}
                        onParamsConfirm={(p: YakExecutorParam[]) => {
                            setLoading(true)
                            // setTab("console")
                            setActivePanels(["console"])
                            ipcRenderer.invoke("exec-yak-script", {
                                Params: p,
                                YakScriptId: props.script.Id,
                            }, token)
                        }}
                        styleSize={props.size}
                        submitVerbose={"开始执行该模块 / Start"}
                    />
                </Spin>
            </Panel>
            <Panel key={"console"} showArrow={false} header={<>
                插件执行结果
            </>} disabled={results.length <= 0}>
                <XTerm ref={xtermRef} options={{convertEol: true, rows: 6}}/>
                <PluginResultUI
                    script={script} loading={loading} progress={progress} results={results}
                    statusCards={statusCards}
                />
            </Panel>
        </Collapse>
    </div>
};