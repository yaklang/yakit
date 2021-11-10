import React, {useEffect, useRef, useState} from "react";
import {YakExecutorParam} from "../invoker/YakExecutorParams";
import {YakScriptParamsSetter} from "../invoker/YakScriptParamsSetter";
import {ExecResult, YakScript} from "../invoker/schema";
import {
    Button,
    Card,
    Col,
    Collapse,
    Divider,
    Drawer, Empty,
    Popconfirm,
    Progress,
    Row,
    Space,
    Spin,
    Steps,
    Tabs,
    Timeline
} from "antd";
import {XTerm} from "xterm-for-react";
import {randomString} from "../../utils/randomUtil";
import {failed, info} from "../../utils/notification";
import {ExtractExecResultMessageToYakitPort, YakitPort} from "../../components/yakitLogSchema";
import {writeExecResultXTerm, xtermClear, xtermFit} from "../../utils/xtermUtils";
import {YakitLogFormatter} from "../invoker/YakitLogFormatter";
import {
    ExecResultLog,
    ExecResultMessage,
    ExecResultProgress,
    ExecResultsViewer
} from "../invoker/batch/ExecMessageViewer";
import {LogLevelToCode} from "../../components/HTTPFlowTable";
import {PluginResultUI} from "./viewers/base";

export interface PluginExecutorProp {
    script: YakScript
    size?: any
}

const {ipcRenderer} = window.require("electron");

export const PluginExecutor: React.FC<PluginExecutorProp> = (props) => {
    const {script} = props;
    const xtermRef = useRef(null);
    const [token, setToken] = useState("");
    const [loading, setLoading] = useState(false);
    const [tabKey, setTab] = useState("params");
    const [results, setResults] = useState<ExecResultLog[]>([]);
    const [progress, setProgress] = useState<ExecResultProgress[]>([]);
    const [resetFlag, setResetFlag] = useState(false);

    const reset = () => {
        setResetFlag(!resetFlag)
    }

    useEffect(() => {
        if (!xtermRef) {
            return
        }

        const token = randomString(40);
        setToken(token)

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

    if (props.script.Type === "mitm") {
        return <Empty
            style={{
                marginTop: 50,
            }}
            description={"这是一个 MITM 插件，请在 MITM 劫持中使用它！"}>

        </Empty>
    }

    return <div>
        <Card title={`模块执行操作台：${script.ScriptName}`} size={"small"} extra={<Space>
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
                }} disabled={loading}>清空缓存</Button>
        </Space>} bordered={false}>
            <Tabs tabPosition={"left"} onChange={setTab} activeKey={tabKey}>
                <Tabs.TabPane key={"params"} tab={"设置参数 / Params"}>
                    <Spin spinning={loading}>
                        <YakScriptParamsSetter
                            {...script}
                            params={[]}
                            onParamsConfirm={(p: YakExecutorParam[]) => {
                                setLoading(true)
                                setTab("console")
                                ipcRenderer.invoke("exec-yak-script", {
                                    Params: p,
                                    YakScriptId: props.script.Id,
                                }, token)
                            }}
                            styleSize={props.size}
                            submitVerbose={"开始执行该模块 / Start"}
                        />
                    </Spin>
                </Tabs.TabPane>
                <Tabs.TabPane key={"console"} tab={"执行结果 / Results"}>
                    <XTerm ref={xtermRef} options={{convertEol: true, rows: 6}}/>
                    {PluginResultUI(loading, results, progress, script)}
                </Tabs.TabPane>
            </Tabs>
        </Card>
    </div>
};