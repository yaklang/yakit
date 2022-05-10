import React, {useEffect, useState} from "react";
import {AutoCard} from "../../../components/AutoCard";
import {QueryYakScriptParamProp, SimpleQueryYakScriptSchema} from "./QueryYakScriptParam";
import {genDefaultPagination, QueryYakScriptRequest, QueryYakScriptsResponse, YakScriptParam} from "../schema";
import {showModal} from "../../../utils/showModal";
import {YakEditor} from "../../../utils/editors";
import {useDebounce, useMemoizedFn} from "ahooks";
import {YakScriptParamsSetter, YakScriptParamsSetterProps} from "../YakScriptParamsSetter";
import {SimplePluginList} from "../../../components/SimplePluginList";
import {YakExecutorParam} from "../YakExecutorParams";
import useHoldingIPCRStream from "../../../hook/useHoldingIPCRStream";
import {randomString} from "../../../utils/randomUtil";
import {PluginResultUI} from "../../yakitStore/viewers/base";
import {Spin} from "antd";

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

const OrdinaryParamsToBatchExecuteByFilterParamsMap = {
    "target": "Target",
    "target-file": "TargetFile",
    "ports": "Ports",
}
const BatchExecuteByFilterParamsSchema: YakScriptParam[] = [
    {
        Field: "target",
        DefaultValue: "",
        TypeVerbose: "text",
        FieldVerbose: "扫描目标",
        Help: "URL / IP / CIDR / IP:PORT 均可，换行与逗号均可用于分割",
        Value: "",
        Required: true,
        Group: "",
        BuildInParam: false,
    },
    {
        Field: "target-file",
        DefaultValue: "",
        TypeVerbose: "upload-path",
        FieldVerbose: "扫描目标",
        Help: "仅接受一个文件字典",
        Value: "",
        Required: false,
        Group: "",
        BuildInParam: false,
    },
    {
        Field: "ports",
        DefaultValue: "22,21,80,443,7001,3389,3306,25",
        TypeVerbose: "string",
        FieldVerbose: "扫描端口",
        Help: "输入一个目标来进行简易端口扫描",
        Value: "",
        Required: false,
        Group: "",
        BuildInParam: false,
    },

    // debug
    {
        Field: "debug",
        DefaultValue: "",
        TypeVerbose: "bool",
        FieldVerbose: "调试模式",
        Help: "调试模式：更多输出",
        Value: "",
        Required: false,
        Group: "",
        BuildInParam: false,
    },
    // concurrent
    {
        Field: "concurrent",
        DefaultValue: "10",
        TypeVerbose: "uint",
        FieldVerbose: "并发",
        Help: "设置运行 PoC 的并发量：推荐为10",
        Value: "",
        Required: false,
        Group: "",
        BuildInParam: false,
    },
];


export interface BatchExecuteByFilterRequest {
    Filter: QueryYakScriptRequest
    Target: string
    TargetFile: string
    Ports?: string
    ExtraParams: YakExecutorParam[]
}

export const BatchExecuteByFilter: React.FC<BatchExecuteByFilterProp> = React.memo((props) => {
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [token, setToken] = useState(randomString(20))
    const [executing, setExecuting] = useState(false);
    const [infoState, {reset, setXtermRef}, xtermRef] = useHoldingIPCRStream(
        `batch-execute-by-filter-yak-script`,
        "ExecYakitPluginsByYakScriptFilter",
        token,
        () => setTimeout(() => setExecuting(false), 300)
    )

    useEffect(() => {
        setLoading(true)
        const result = simpleQueryToFull(props.simpleQuery);
        ipcRenderer.invoke("QueryYakScript", result).then((data: QueryYakScriptsResponse) => {
            setTotal(data.Total)
        }).catch(e => {
            console.info()
        }).finally(() => setTimeout(() => setLoading(false), 300))
    }, [useDebounce(props.simpleQuery, {wait: 500})])

    const executeByParams = useMemoizedFn((p: BatchExecuteByFilterRequest) => {
        setExecuting(true)
        setTimeout(() => {
            ipcRenderer.invoke("ExecYakitPluginsByYakScriptFilter", p, token)
        }, 300);
    })

    const cancelTask = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-ExecYakitPluginsByYakScriptFilter", token)
    })

    useEffect(() => {
        return () => {
            cancelTask()
        }
    }, [token])

    return <AutoCard size={"small"} title={(
        <div>
            {`当前已选：${total}`}
            {loading && <Spin size={"small"}/>}
        </div>
    )} extra={<a href="#" onClick={() => {
        try {
            const raw = JSON.stringify(props.simpleQuery);
            showModal({
                title: "JSON", content: (
                    <>
                        <YakEditor readOnly={true} value={raw}/>
                    </>
                ), width: "50%"
            })
        } catch (e) {

        }
    }}>
        Config
    </a>}>
        <div style={{marginTop: 12}}>
            <YakScriptParamsSetter
                loading={executing}
                primaryParamsOnly={true}
                Params={BatchExecuteByFilterParamsSchema}
                onParamsConfirm={execParamItems => {
                    const params: BatchExecuteByFilterRequest = {
                        Filter: simpleQueryToFull(props.simpleQuery),
                        Target: "", TargetFile: "", Ports: "",
                        ExtraParams: [],
                    }
                    const extraParams = execParamItems.filter(i => {
                        const field = OrdinaryParamsToBatchExecuteByFilterParamsMap[i.Key];
                        if (field !== undefined) {
                            params[field] = i.Value
                            return false
                        }
                        return true
                    })
                    params.ExtraParams = extraParams;
                    executeByParams(params)
                }}
                onClearData={reset}
                onCanceled={cancelTask}
            />
        </div>
        <PluginResultUI
            featureType={infoState.featureTypeState}
            results={infoState.messageState}
            statusCards={infoState.statusState} progress={infoState.processState}
            loading={executing}
            feature={infoState.featureMessageState}
            // console
            onXtermRef={setXtermRef} defaultConsole={true}
        />
    </AutoCard>
});