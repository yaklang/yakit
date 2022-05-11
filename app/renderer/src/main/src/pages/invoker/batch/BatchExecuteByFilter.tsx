import React, {useEffect, useState} from "react";
import {AutoCard} from "../../../components/AutoCard";
import {SimpleQueryYakScriptSchema} from "./QueryYakScriptParam";
import {genDefaultPagination, QueryYakScriptRequest, QueryYakScriptsResponse} from "../schema";
import {useDebounce, useMemoizedFn} from "ahooks";
import {randomString} from "../../../utils/randomUtil";
import {Divider, Progress, Space, Tag} from "antd";
import {
    BatchExecutorResultUI,
    CancelBatchYakScript,
    ExecSelectedPlugins,
    ExecuteTaskHistory,
    TargetRequest,
    TaskHistoryProps
} from "./BatchExecutorPage";
import {formatTimestamp} from "../../../utils/timeUtil";
import {failed} from "../../../utils/notification";

const {ipcRenderer} = window.require("electron");

export interface BatchExecuteByFilterProp {
    simpleQuery: SimpleQueryYakScriptSchema
}

const simpleQueryToFull = (i: SimpleQueryYakScriptSchema): QueryYakScriptRequest => {
    const result = {
        Pagination: genDefaultPagination(1),
        Type: i.type,
        ExcludeNucleiWorkflow: true,
        ExcludeScriptNames: i.exclude,
        IncludedScriptNames: i.include,
        Tag: i.tags.split(","),
        NoResultReturn: false,
    }
    if (i.include.length === 0 && i.exclude.length === 0 && i.tags === "") {
        result.NoResultReturn = true
        return result
    }

    return result
}

const StartExecBatchYakScriptWithFilter = (target: TargetRequest, filter: QueryYakScriptRequest, token: string) => {
    const params = {
        Target: target.target,
        TargetFile: target.targetFile,
        ScriptNames: [], EnablePluginFilter: true, PluginFilter: filter,
        Concurrent: target.concurrent || 5,
        TotalTimeoutSeconds: target.totalTimeout || 1800,
    };
    return ipcRenderer.invoke("ExecBatchYakScript", params, token)
};

export const BatchExecuteByFilter: React.FC<BatchExecuteByFilterProp> = React.memo((props) => {
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [token, setToken] = useState(randomString(20))
    const [executing, setExecuting] = useState(false);
    const [percent, setPercent] = useState(0);

    // 执行任务历史列表
    const [taskHistory, setTaskHistory] = useState<TaskHistoryProps[]>([])

    useEffect(() => {
        setLoading(true)
        const result = simpleQueryToFull(props.simpleQuery);
        ipcRenderer.invoke("QueryYakScript", result).then((data: QueryYakScriptsResponse) => {
            setTotal(data.Total)
        }).catch(e => {
            console.info(e)
        }).finally(() => setTimeout(() => setLoading(false), 300))
    }, [useDebounce(props.simpleQuery, {wait: 500})])

    // 回复缓存
    useEffect(() => {
        setLoading(true)
        ipcRenderer
            .invoke("get-value", ExecuteTaskHistory)
            .then((res: any) => {
                setTaskHistory(res ? JSON.parse(res) : [])
            })
            .catch(() => {
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 300)
            })
    }, [])

    // 执行批量任务
    const run = useMemoizedFn((t: TargetRequest) => {
        setPercent(0)

        //@ts-ignore
        const time = Date.parse(new Date()) / 1000
        const obj: TaskHistoryProps = {
            target: t,
            selected: [],
            enablePluginFilter: true,
            pluginFilter: simpleQueryToFull(props.simpleQuery),
            pluginType: props.simpleQuery.type,
            limit: 100000,
            keyword: "",
            time: formatTimestamp(time)
        }
        const arr = [...taskHistory]
        if (taskHistory.length === 10) arr.pop()
        arr.unshift(obj)
        setTaskHistory(arr)
        ipcRenderer.invoke("set-value", ExecuteTaskHistory, JSON.stringify(arr))

        const tokens = randomString(40)
        setToken(tokens)
        StartExecBatchYakScriptWithFilter(
            t, simpleQueryToFull(props.simpleQuery),
            tokens).then(() => {
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

    const executeHistory = useMemoizedFn((item: TaskHistoryProps) => {
        setLoading(true)

        alert("history fetch error!")
        // if (item.pluginType === pluginType) setTimeout(() => search(), 300);
        // else setPluginType(item.pluginType)

        setTimeout(() => {
            setLoading(false)
        }, 300);
    })

    useEffect(() => {
        if (!token) {
            return
        }

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
            {(percent > 0 || executing) && <div style={{width: 200}}>
                <Progress status={executing ? "active" : undefined} percent={
                    parseInt((percent * 100).toFixed(0))
                }/>
            </div>}
        </Space>}
        bodyStyle={{display: "flex", flexDirection: "column", padding: '0 5px', overflow: "hidden"}}
    >
        <ExecSelectedPlugins
            disableStartButton={total <= 0}
            onSubmit={run}
            onCancel={cancel}
            executing={executing}
            loading={loading}
            history={taskHistory}
            executeHistory={executeHistory}
        />
        <Divider style={{margin: 4}}/>
        <div style={{flex: '1', overflow: "hidden"}}>
            <AutoCard style={{padding: 4}} bodyStyle={{padding: 4, overflow: "hidden"}} bordered={false}>
                <BatchExecutorResultUI token={token} executing={executing} setPercent={setPercent}/>
            </AutoCard>
        </div>
    </AutoCard>
});