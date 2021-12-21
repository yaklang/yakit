import React, {useEffect, useRef, useState} from "react";
import {YakExecutorParam} from "../invoker/YakExecutorParams";
import {YakScriptParamsSetter} from "../invoker/YakScriptParamsSetter";
import {ExecResult, YakScript} from "../invoker/schema";
import {Button, Collapse, Divider, PageHeader, Popconfirm, Space} from "antd";
import {XTerm} from "xterm-for-react";
import {randomString} from "../../utils/randomUtil";
import {failed, info} from "../../utils/notification";
import {writeExecResultXTerm, xtermClear, xtermFit} from "../../utils/xtermUtils";
import {ExecResultLog, ExecResultMessage, ExecResultProgress} from "../invoker/batch/ExecMessageViewer";
import {ExecResultStatusCard, PluginResultUI, StatusCardProps} from "./viewers/base";
import {useDynamicList, useMap, useThrottleFn} from "ahooks";

export interface PluginExecutorProp {
    script: YakScript
    size?: any
    primaryParamsOnly?: boolean
}

const {ipcRenderer} = window.require("electron");

const {Panel} = Collapse;


export const HoldingIPCRenderExecStream = (
    taskName: string,
    apiKey: string,
    token: string,
    xtermRef?: any,
    logProvider?: {
        list: ExecResultLog[];
        unshift: (i: ExecResultLog) => any; pop: () => any;
    },
    progressProvider?: { readonly set: (key: string, entry: number) => void; readonly setAll: (newMap: Iterable<readonly [string, number]>) => void; readonly remove: (key: string) => void; readonly reset: () => void; readonly get: (key: string) => (number | undefined) },
    statusProvider?: {
        set: (key: string, entry: ExecResultStatusCard) => any;
        flush: () => any,
        readonly setAll: (newMap: Iterable<readonly [string, StatusCardProps]>) => void;
        readonly remove: (key: string) => void;
        readonly reset: () => void;
        readonly get: (key: string) => (StatusCardProps | undefined)
    },
    onEnd?: () => any,
    onListened?: () => any,
) => {

    ipcRenderer.on(`${token}-data`, async (e: any, data: ExecResult) => {
        if (data.IsMessage) {
            try {
                let obj: ExecResultMessage = JSON.parse(Buffer.from(data.Message).toString("utf8"));

                // 处理 Process KVPair
                if (obj.type === "process") {
                    const processData = obj.content as ExecResultProgress;
                    if (processData && processData.id) {
                        if (progressProvider) {
                            const processKVPair = progressProvider;
                            processKVPair.set(processData.id, Math.max(processKVPair.get(processData.id) || 0, processData.progress))
                        }
                    }
                    return
                }

                // 处理 log feature-status-card-data
                const logData = obj.content as ExecResultLog;
                if (obj.type === "log" && logData.level === "feature-status-card-data") {
                    try {
                        const statusKVPair = statusProvider;
                        if (statusKVPair) {
                            const obj = JSON.parse(logData.data);
                            const {id, data} = obj;
                            const {timestamp} = logData;
                            const originData = statusKVPair.get(id);
                            if (originData && originData.Timestamp > timestamp) {
                                return
                            }
                            statusKVPair.set(id, {Id: id, Data: data, Timestamp: timestamp})
                        }
                    } catch (e) {
                    }
                    return
                }


                if (logProvider) {
                    logProvider.unshift(obj.content as ExecResultLog);
                    // 只缓存 100 条结果（日志类型 + 数据类型）
                    if (logProvider.list.length > 100) {
                        logProvider.pop()
                    }
                }
            } catch (e) {

            }
        }
        writeExecResultXTerm(xtermRef, data)
    })
    ipcRenderer.on(`${token}-error`, (e, error) => {
        failed(`[Mod] ${taskName} error: ${error}`)
    })
    ipcRenderer.on(`${token}-end`, (e, data) => {
        info(`[Mod] ${taskName} finished`)
        if (statusProvider) {
            statusProvider.flush()
        }
        if (onEnd) {
            onEnd()
        }
    })

    if (onListened) {
        onListened()
    }

    return () => {
        ipcRenderer.invoke(`cancel-${apiKey}`, token)
        ipcRenderer.removeAllListeners(`${token}-data`)
        ipcRenderer.removeAllListeners(`${token}-error`)
        ipcRenderer.removeAllListeners(`${token}-end`)
    }
};

export const PluginExecutor: React.FC<PluginExecutorProp> = (props) => {
    const {script} = props;
    // const xtermRef = useRef(null);
    const [xtermRef, setXTermRef] = useState<any>();
    const [token, setToken] = useState("");
    const [loading, setLoading] = useState(false);
    const [activePanels, setActivePanels] = useState<string[]>(["params"]);

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

    useEffect(() => {
        if (!xtermRef) {
            return
        }

        const token = randomString(40);
        setToken(token)

        return HoldingIPCRenderExecStream(
            script.ScriptName, "exec-yak-script", token, xtermRef,

            // operations
            messageListProvider, progressProvider, {
                ...statusProvider,
                set: statusOpThrottle.run,
                flush: statusOpThrottle.flush
            },

            () => {
                setTimeout(() => setLoading(false), 300)
            })
    }, [xtermRef])

    // useEffect(() => {
    //     xtermFit(xtermRef, undefined, 6)
    // })

    useEffect(() => {
        if (!loading) {
            setActivePanels([...activePanels, "params"])
        }
    }, [loading])

    return <div>
        {props.primaryParamsOnly ? <>
            <PageHeader title={script.ScriptName} style={{marginBottom: 0, paddingBottom: 0}}>
                <YakScriptParamsSetter
                    {...script}
                    params={[]}
                    loading={loading}
                    onParamsConfirm={(p: YakExecutorParam[]) => {
                        setLoading(true)
                        setActivePanels(["console"])
                        ipcRenderer.invoke("exec-yak-script", {
                            Params: p,
                            YakScriptId: props.script.Id,
                        }, token)
                    }}
                    onClearData={() => {
                        xtermClear(xtermRef)
                        reset()
                    }}
                    onCanceled={() => {
                        ipcRenderer.invoke("cancel-exec-yak-script", token)
                    }}
                    styleSize={props.size}
                    submitVerbose={"开始执行该模块 / Start"}
                    primaryParamsOnly={true}
                />
            </PageHeader>
            <Divider/>
            <PluginResultUI
                script={script} loading={loading} progress={processes} results={messageListProvider.list}
                statusCards={statusCards} onXtermRef={setXTermRef}
            />
        </> : <Collapse
            activeKey={activePanels}
            onChange={key => {
                if (Array.isArray(key)) setActivePanels(key)
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
                                e?.stopPropagation()
                            }}
                        >
                            <Button
                                size={"small"}
                                disabled={!loading}
                                type={"primary"} danger={true}
                                onClick={e => e.stopPropagation()}
                            >
                                立即停止该任务 / KILL TASK
                            </Button>
                        </Popconfirm>
                        <Button
                            size={"small"}
                            onClick={e => {
                                xtermClear(xtermRef)
                                reset()
                                setActivePanels(["params"])
                                e.stopPropagation()
                            }} disabled={loading}
                        >清空结果</Button>
                    </Space>
                </>}>
                <YakScriptParamsSetter
                    {...script}
                    params={[]}
                    loading={loading}
                    onParamsConfirm={(p: YakExecutorParam[]) => {
                        setLoading(true)
                        setActivePanels(["console"])
                        ipcRenderer.invoke("exec-yak-script", {
                            Params: p,
                            YakScriptId: props.script.Id,
                        }, token)
                    }}
                    onClearData={() => {
                        xtermClear(xtermRef)
                        reset()
                    }}
                    onCanceled={() => {
                        ipcRenderer.invoke("cancel-exec-yak-script", token)
                    }}
                    styleSize={props.size}
                    submitVerbose={"开始执行该模块 / Start"}
                />
            </Panel>
            <Panel key={"console"} showArrow={false} header={<>
                插件执行结果
            </>} collapsible={messages.length <= 0 ? 'disabled' : undefined}>
                <div style={{width: "100%", overflowY: "auto"}}>
                    <XTerm ref={xtermRef} options={{convertEol: true, rows: 6}}/>
                </div>
                <PluginResultUI
                    script={script} loading={loading} progress={processes} results={messages}
                    statusCards={statusCards}
                />
            </Panel>
        </Collapse>}
    </div>
};