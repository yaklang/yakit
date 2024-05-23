import React, {useEffect, useRef, useState} from "react";
import {Divider, Empty, Progress, Space, Tabs, Tag, Timeline} from "antd";
import {AutoCard} from "../../../components/AutoCard";
import {SimpleQueryYakScriptSchema} from "./QueryYakScriptParam";
import {ExecResult, genDefaultPagination, QueryYakScriptRequest, QueryYakScriptsResponse, YakScript} from "../schema";
import {useCreation, useDebounce, useGetState, useMemoizedFn} from "ahooks";
import {randomString} from "../../../utils/randomUtil";
import {
    CancelBatchYakScript,
    ExecSelectedPlugins,
    ExecuteTaskHistory,
    TargetRequest,
} from "./BatchExecutorPage";
import {formatTimestamp} from "../../../utils/timeUtil";
import {failed, info} from "../../../utils/notification";
import {ExecBatchYakScriptResult} from "./YakBatchExecutorLegacy";
import {TableResizableColumn} from "../../../components/TableResizableColumn";
import {FieldName, RiskDetails, TitleColor} from "../../risks/RiskTable";
import {showModal} from "../../../utils/showModal";
import ReactResizeDetector from "react-resize-detector";
import {ExecResultLog, ExecResultMessage} from "./ExecMessageViewer";
import {YakitLogFormatter} from "../YakitLogFormatter";

import "./BatchExecuteByFilter.css"
import {Risk} from "../../risks/schema";
import {RisksViewer} from "@/pages/risks/RisksViewer";
import {YakitRoute} from "@/routes/newRouteConstants";

const {ipcRenderer} = window.require("electron");

export interface BatchExecuteByFilterProp {
    simpleQuery: SimpleQueryYakScriptSchema
    allTag: FieldName[]
    isAll: boolean
    total?: number
    executeHistory: (info: NewTaskHistoryProps) => any
    initTargetRequest?: TargetRequest
    fromRecover?: boolean
    baseProgress?: number
    recoverUid?: string
}

export interface NewTaskHistoryProps {
    target: TargetRequest
    simpleQuery: SimpleQueryYakScriptSchema
    isAll: boolean
    time: string
}

export const simpleQueryToFull = (isAll: boolean, i: SimpleQueryYakScriptSchema, allTag: FieldName[]): QueryYakScriptRequest => {
    const result = {
        Pagination: genDefaultPagination(1),
        Type: i.type,
        ExcludeNucleiWorkflow: true,
        ExcludeScriptNames: i.exclude,
        IncludedScriptNames: i.include,
        Tag: i.tags.split(","),
        Keyword: i.keyword,
        NoResultReturn: false,
    }

    if (i.tags === "" && i.include.length > 0) {
        result.Tag = []
    }
    if (!isAll && i.include.length === 0 && i.exclude.length === 0 && i.tags === "") {
        result.NoResultReturn = true
        return result
    }

    return result
}

export const StartExecBatchYakScriptWithFilter = (target: TargetRequest, filter: QueryYakScriptRequest, token: string, fromRecover?: boolean, baseProgress?: number,YakScriptOnlineGroup?:string,TaskName?:string) => {
    const params = {
        Target: target.target,
        Proxy: target.proxy,
        ProgressTaskCount: target.progressTaskCount,
        TargetFile: target.targetFile,
        ScriptNames: [], EnablePluginFilter: true, PluginFilter: filter,
        Concurrent: target.concurrent || 5,
        TotalTimeoutSeconds: target.totalTimeout || 3600 * 2,
        FromRecover: fromRecover,
        BaseProgress: baseProgress,
        YakScriptOnlineGroup,
        TaskName,
    };
    return ipcRenderer.invoke("ExecBatchYakScript", params, token)
};

export const BatchExecuteByFilter: React.FC<BatchExecuteByFilterProp> = React.memo((props: BatchExecuteByFilterProp) => {
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [token, setToken] = useState(randomString(20))
    const [executing, setExecuting] = useState(false);
    const [percent, setPercent] = useState(0);

    // 执行任务历史列表
    // const [taskHistory, setTaskHistory] = useState<NewTaskHistoryProps[]>([])

    // 计算插件数量
    useEffect(() => {
        if ((props?.total || 0) > 0) {
            setTotal(props.total as number)
            return
        }
        setLoading(true)
        const result = simpleQueryToFull(props.isAll, props.simpleQuery, props.allTag);

        ipcRenderer.invoke("QueryYakScript", result).then((data: QueryYakScriptsResponse) => {
            setTotal(data.Total)
        }).catch(e => console.info(e))
            .finally(() => setTimeout(() => setLoading(false), 300))
    }, [
        useDebounce(props.simpleQuery, {wait: 500}),
        useDebounce(props.isAll, {wait: 500}),
        useDebounce(props.total, {wait: 500})
    ])

    useEffect(() => {
        if (props.baseProgress !== undefined && props.baseProgress > 0) {
            setPercent(props.baseProgress)
        }
    }, [props.baseProgress])

    // // 回复缓存
    // useEffect(() => {
    //     setLoading(true)
    //     ipcRenderer
    //         .invoke("fetch-local-cache", ExecuteTaskHistory)
    //         .then((res: any) => {
    //             setTaskHistory(res ? JSON.parse(res) : [])
    //         })
    //         .catch(() => {
    //         })
    //         .finally(() => {
    //             setTimeout(() => setLoading(false), 300)
    //         })
    // }, [])

    // 执行批量任务
    const run = useMemoizedFn((t: TargetRequest) => {
        setPercent(0)

        const tokens = randomString(40)
        setToken(tokens)
        StartExecBatchYakScriptWithFilter(
            t, simpleQueryToFull(props.isAll, props.simpleQuery, props.allTag),
            tokens,
            props.fromRecover,
            props.baseProgress,
        ).then(() => {
            setExecuting(true)
        }).catch(e => {
            failed(`启动批量执行插件失败：${e}`)
        })
    });

    const cancel = useMemoizedFn(() => {
        CancelBatchYakScript(token).then()
    })
    useEffect(() => {
        return cancel()
    }, [])

    const executeHistory = useMemoizedFn((item: NewTaskHistoryProps) => {
        setLoading(true)
        props.executeHistory(item)
        setTimeout(() => setLoading(false), 300);
    })

    useEffect(() => {
        if (!token) return

        ipcRenderer.on(`${token}-end`, async (e) => {
            console.info("call finished by token filter")
            setTimeout(() => setExecuting(false), 300)
        })
        return () => {
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [token])

    return <AutoCard
        title={<Space>
            {"已选插件"}
            <Tag>{`${total}`}</Tag>
        </Space>}
        size={"small"} bordered={false}
        extra={<Space>
            {(percent > 0 || executing || props.fromRecover) && <div style={{width: 200}}>
                <Progress status={executing ? "active" : undefined} percent={
                    parseInt((percent * 100).toFixed(0))
                }/>
            </div>}
        </Space>}
        bodyStyle={{display: "flex", flexDirection: "column", padding: '0 5px', overflow: "hidden"}}
    >
        <ExecSelectedPlugins
            disableStartButton={total <= 0}
            initTargetRequest={props.initTargetRequest}
            onSubmit={run}
            onCancel={cancel}
            executing={executing}
            loading={loading}
            // history={taskHistory}
            history={[]}
            executeHistory={executeHistory}
        />
        <Divider style={{margin: 4}}/>
        <div style={{flex: '1', overflow: "hidden"}}>
            <BatchExecutorResultByFilter token={token} executing={executing} setPercent={setPercent}
                                         recoverUid={props.recoverUid}/>
        </div>
    </AutoCard>
});

interface BatchExecutorResultByFilterProp {
    token: string
    executing?: boolean
    setPercent?: (i: number) => any
    recoverUid?: string
}

export interface TaskResultLog extends ExecResultLog {
    key: number
}

export const BatchExecutorResultByFilter: React.FC<BatchExecutorResultByFilterProp> = (props) => {
    const [taskLog, setTaskLog, getTaskLog] = useGetState<TaskResultLog[]>([]);
    const [progressFinished, setProgressFinished] = useState(0);
    const [progressTotal, setProgressTotal] = useState(0);
    const [progressRunning, setProgressRunning] = useState(0);
    const [scanTaskExecutingCount, setScanTaskExecutingCount] = useState(0);

    const [jsonRisks, setJsonRisks, getJsonRisks] = useGetState<Risk[]>([]);

    const [tableContentHeight, setTableContentHeight] = useState<number>(0);
    const [activeKey, setActiveKey] = useState<string>("executing")

    useEffect(() => {
        ipcRenderer.on(`${props.token}-error`, async (e, exception) => {
            if (`${exception}`.includes("Cancelled on client")) {
                return
            }
            console.info("call exception")
            failed(`批量执行失败：${exception}`)
            console.info(exception)
        })

        const logs: TaskResultLog[] = []
        let index = 0
        let removed = false;

        ipcRenderer.on(`${props.token}-data`, async (e, data: ExecBatchYakScriptResult) => {
            // 移除旧的任务进度
            if (!removed && !!props.recoverUid) {
                removed = true
                ipcRenderer.invoke("PopExecBatchYakScriptUnfinishedTaskByUid", {Uid: props.recoverUid}).then(e => {
                    info("未完成任务进度信息已更新")
                }).catch(e => {
                    failed("删除旧任务进度失败")
                })
            }

            // 处理进度信息
            if (data.ProgressMessage) {
                setProgressTotal(data.ProgressTotal || 0)
                setProgressRunning(data.ProgressRunning || 0)
                setProgressFinished(data.ProgressCount || 0)
                setScanTaskExecutingCount(data.ScanTaskExecutingCount || 0)
                if (!!props.setPercent) {
                    props.setPercent(data.ProgressPercent || 0)
                }
                return
            }

            if (data.Result && data.Result.IsMessage) {
                const info: TaskResultLog = JSON.parse(new Buffer(data.Result.Message).toString())?.content
                if (info) {
                    info.key = index
                    if (info.level === "json-risk") {
                        try {
                            const risk = JSON.parse(info.data) as Risk;
                            if (!!risk.RiskType) {
                                const cacheJsonRisks = [risk,...getJsonRisks()]
                                setJsonRisks(cacheJsonRisks)
                            }
                        } catch (e) {

                        }
                    }
                    index += 1
                    logs.push(info)
                    if (logs.length > 20) {
                        logs.shift()
                    }
                }
            }
        })

        const syncLogs = () => {
            const shownLogs = getTaskLog() || [];
            if (shownLogs.length === 0 && logs.length > 0) {
                setTaskLog([...logs])
                return
            }

            if (shownLogs.length > 0 && (shownLogs[shownLogs.length - 1].key + 1 < index)) {
                setTaskLog([...logs])
            }
        }
        let id = setInterval(() => {
            syncLogs()
        }, 500)
        return () => {
            ipcRenderer.removeAllListeners(`${props.token}-data`)
            ipcRenderer.removeAllListeners(`${props.token}-end`)
            ipcRenderer.removeAllListeners(`${props.token}-error`)
            setTaskLog([])
            setActiveKey("executing")
            clearInterval(id)
        }
    }, [props.token])
    const openMenu = () => {
        ipcRenderer.invoke("open-route-page",{route: YakitRoute.DB_Risk})
    }
    return <div className="batch-executor-result">
        <div className="result-notice-body">
            <div className="notice-body">
                <div className="notice-body-header notice-font-in-progress">执行中状态</div>
                <div className="notice-body-counter">{progressRunning}进程 / {scanTaskExecutingCount}任务</div>
            </div>
            <Divider type="vertical" className="notice-divider"/>
            <div className="notice-body">
                <div className="notice-body-header notice-font-completed">已结束/总进程</div>
                <div className="notice-body-counter">{progressFinished}/{progressTotal}</div>
            </div>
            <Divider type="vertical" className="notice-divider"/>
            <div className="notice-body">
                <div className="notice-body-header notice-font-vuln">命中风险/漏洞</div>
                <div className="notice-body-counter">{jsonRisks.length}</div>
            </div>
        </div>

        <Divider style={{margin: 4}}/>
        <div className="result-table-body">
            <Tabs className="div-width-height-100 no-theme-tabs" activeKey={activeKey} onChange={setActiveKey} tabBarExtraContent={<div style={{textAlign: "right"}}>
                <div className={"notice-hole-text"} onClick={openMenu}>
                    查看完整漏洞
                </div>
            </div>}>
                <Tabs.TabPane tab="任务日志" key={"executing"}>
                    <div className="div-width-height-100" style={{overflow: "hidden"}}>
                        <Timeline className="body-time-line" pending={props.executing} reverse={true}>
                            {taskLog.map(item => {
                                return <Timeline.Item key={item.key}>
                                    <YakitLogFormatter
                                        data={item.data} level={item.level}
                                        timestamp={item.timestamp} onlyTime={true} isCollapsed={true}
                                    />
                                </Timeline.Item>
                            })}
                        </Timeline>
                    </div>
                </Tabs.TabPane>
                <Tabs.TabPane tab="命中风险与漏洞" key={"hitTable"}>
                    <div style={{width: "100%", height: "100%"}}>
                        <ReactResizeDetector
                            onResize={(width, height) => {
                                if (!width || !height) return
                                setTableContentHeight(height - 4)
                            }}
                            handleWidth={true} handleHeight={true} refreshMode={"debounce"} refreshRate={50}/>
                        <RisksViewer risks={jsonRisks.slice(0,10)} tableContentHeight={tableContentHeight}/>
                    </div>
                </Tabs.TabPane>
            </Tabs>
        </div>
    </div>
};