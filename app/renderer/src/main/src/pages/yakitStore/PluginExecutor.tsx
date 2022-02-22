import React, {useEffect, useState} from "react";
import {YakExecutorParam} from "../invoker/YakExecutorParams";
import {YakScriptParamsSetter} from "../invoker/YakScriptParamsSetter";
import {YakScript, YakScriptParam} from "../invoker/schema";
import {Button, Collapse, Divider, PageHeader, Popconfirm, Space} from "antd";
import {XTerm} from "xterm-for-react";
import {randomString} from "../../utils/randomUtil";
import {xtermClear} from "../../utils/xtermUtils";
import {PluginResultUI} from "./viewers/base";

import useHoldingIPCRStream from "../../hook/useHoldingIPCRStream";
import {useMemoizedFn} from "ahooks";

export interface PluginExecutorProp {
    script: YakScript
    size?: any
    primaryParamsOnly?: boolean
    extraNode?: React.ReactNode
    subTitle?: React.ReactNode

    settingShow?: boolean
    settingNode?: React.ReactNode
}

const {ipcRenderer} = window.require("electron");

const {Panel} = Collapse;

const getParamsByScript = (script: YakScript) => {
    switch (script.Type) {
        case "packet-hack":
            return [
                {Field: "request", TypeVerbose: "http-packet", Required: true} as YakScriptParam,
                {Field: "response", TypeVerbose: "http-packet", Required: false} as YakScriptParam,
                {Field: "isHttps", TypeVerbose: "bool",} as YakScriptParam,
            ] as YakScriptParam[];
        default:
            return script.Params;
    }
}

export const PluginExecutor: React.FC<PluginExecutorProp> = (props) => {
    const {script, settingShow, settingNode} = props;

    const [token, setToken] = useState(randomString(40));
    const [loading, setLoading] = useState(false);
    const [activePanels, setActivePanels] = useState<string[]>(["params"]);
    const [lastParams, setLastParams] = useState<YakExecutorParam[]>([]);

    const [infoState, {reset, setXtermRef}, xtermRef] = useHoldingIPCRStream(
        script.ScriptName,
        "exec-yak-script",
        token,
        () => {
            setTimeout(() => setLoading(false), 300)
        }
    )

    useEffect(() => {
        if (!loading) {
            setActivePanels([...activePanels, "params"])
        }
    }, [loading])

    const executeByParams = useMemoizedFn((p: YakExecutorParam[]) => {
        setLoading(true)
        console.info(p)
        setTimeout(() => {
            setActivePanels(["console"])
            ipcRenderer.invoke("exec-yak-script", {
                Params: p,
                YakScriptId: props.script.Id,
            }, token).then(() => {
                setLastParams([...p])
            })
        }, 300);
    })

    return <div>
        {props.primaryParamsOnly ? <>
            <PageHeader
                title={script.ScriptName} style={{marginBottom: 0, paddingBottom: 0}}
                subTitle={props.subTitle}
                extra={props.extraNode}
            >
                {!!settingShow && settingNode}
                <YakScriptParamsSetter
                    {...script}
                    params={lastParams}
                    loading={loading}
                    onParamsConfirm={executeByParams}
                    onClearData={() => {
                        xtermClear(xtermRef)
                        reset()
                    }}
                    onCanceled={() => {
                        ipcRenderer.invoke("cancel-exec-yak-script", token)
                    }}
                    styleSize={props.size}
                    submitVerbose={"开始执行"}
                    primaryParamsOnly={true}
                />
            </PageHeader>
            <Divider/>
            <PluginResultUI
                script={script} loading={loading} progress={infoState.processState} results={infoState.messageSate}
                feature={infoState.featureMessageState}
                statusCards={infoState.statusState} onXtermRef={setXtermRef}
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
                    params={lastParams}
                    loading={loading}
                    onParamsConfirm={executeByParams}
                    onClearData={() => {
                        xtermClear(xtermRef)
                        reset()
                    }}
                    onCanceled={() => {
                        ipcRenderer.invoke("cancel-exec-yak-script", token)
                    }}
                    styleSize={props.size}
                    submitVerbose={"开始执行"}
                />
            </Panel>
            <Panel key={"console"} showArrow={false} header={<>
                插件执行结果
            </>} collapsible={infoState.messageSate.length <= 0 ? 'disabled' : undefined}>
                <div style={{width: "100%", overflowY: "auto"}}>
                    <XTerm ref={xtermRef} options={{convertEol: true, rows: 6}}/>
                </div>
                <PluginResultUI
                    script={script} loading={loading} progress={infoState.processState} results={infoState.messageSate}
                    feature={infoState.featureMessageState}
                    statusCards={infoState.statusState}
                />
            </Panel>
        </Collapse>}
    </div>
};