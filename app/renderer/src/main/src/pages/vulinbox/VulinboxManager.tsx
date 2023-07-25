import React, {useEffect, useRef, useState} from "react";
import {AutoCard} from "@/components/AutoCard";
import {EngineConsole} from "@/pages/engineConsole/EngineConsole";
import {failed, info, success, yakitFailed, yakitNotify} from "@/utils/notification";
import {Form, Popconfirm, Progress, Space, Tag, Tooltip} from "antd";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import useHoldingIPCRStream from "@/hook/useHoldingIPCRStream";
import {randomString} from "@/utils/randomUtil";
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput";
import {InputInteger, InputItem, SwitchItem} from "@/utils/inputUtil";
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm";
import {PluginResultUI} from "@/pages/yakitStore/viewers/base";
import {DefaultPluginResultUI} from "@/pages/invoker/ExecYakScript";
import {ExecResult} from "@/pages/invoker/schema";
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str";
import {useGetState} from "ahooks";
import styles from "@/pages/screenRecorder/ScreenRecorderPage.module.scss";
import {ChromeFrameSvgIcon, ChromeSvgIcon, InformationCircleIcon} from "@/assets/newIcon";
import {CheckOutlined} from "@ant-design/icons";
import {openExternalWebsite} from "@/utils/openWebsite";
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect";
import {SelectOptionProps} from "@/pages/fuzzer/HTTPFuzzerPage";
import {getRemoteValue} from "@/utils/kv";
import {WEB_FUZZ_PROXY_LIST} from "@/pages/fuzzer/HttpQueryAdvancedConfig/HttpQueryAdvancedConfig";
import TableHeader from "@/alibaba/ali-react-table-dist/dist/base-table/header";
import {TableResizableColumn} from "@/components/TableResizableColumn";
import {RiskDetails, TitleColor} from "@/pages/risks/RiskTable";
import {showModal} from "@/utils/showModal";
import {Risk} from "@/pages/risks/schema";
import {Empty} from "antd"
import {useInViewport} from "ahooks"
import {xtermClear} from "@/utils/xtermUtils";
import {ContentUploadInput} from "@/components/functionTemplate/ContentUploadTextArea";
import {BruteParamsForm} from "@/pages/brute/BrutePage";
import {ExtractExecResultMessageToYakitPort} from "@/components/yakitLogSchema";


export interface VulinboxManagerProp {

}


const {ipcRenderer} = window.require("electron");
export const VulinboxManager: React.FC<VulinboxManagerProp> = (props) => {
    const [available, setAvailable] = useState(false);
    const [started, setStarted] = useState(false);
    const [checked, setChecked] = useState(false);
    const [token, setToken] = useState(randomString(60));
    const [repToken, setRepToken] = useState(randomString(30));
    const [currentParams, setCurrentParams, getCurrentParams] = useGetState<StartVulinboxParams>({
        Host: "127.0.0.1",
        Port: 8787,
        NoHttps: true,
        SafeMode: false,
    });
    const [infoState, {reset, setXtermRef}, xtermRef] = useHoldingIPCRStream(
        "report", "GenQualityInspectionReport", repToken, () => {
            setTimeout(() => setLoading(false), 300)
        })
    console.log("infoState  ", infoState)
    const [loading, setLoading] = useState(false)


    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e, data: ExecResult) => {

        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            failed(`[StartVulinbox] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            info("[StartVulinbox] finished")
            setTimeout(() => setStarted(false), 300)
        })
        return () => {
            ipcRenderer.invoke("cancel-StartVulinbox", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [])

    useEffect(() => {
        ipcRenderer.invoke("IsVulinboxReady", {}).then((res) => {
            if (res.Ok) {
                setAvailable(true)
            } else {
                failed(res.Reason)
            }
        }).catch((e) => {
            failed(`${e}`)
            setAvailable(false)
        })

        return () => {
            ipcRenderer.invoke("cancel-StartVulinbox", token)
        }
    }, [])

    return <div style={{height: "100%", width: "100%", overflow: "hidden"}}>
        <AutoCard size={"small"} bordered={true} title={
            <Space>
                <div>Vulinbox 管理器</div>
                {available ? <>
                    <Tag color={"green"}>安装成功</Tag>
                    {currentParams && <YakitButton type='outline2' onClick={() => {
                        info("使用 Chrome 打开靶场")
                        openExternalWebsite(`${currentParams?.NoHttps ? "http://" : "https//"}${currentParams?.Host}:${currentParams?.Port}`)
                    }}>
                        <ChromeSvgIcon/>
                    </YakitButton>}
                </> : <Tag color={"red"}>未安装</Tag>}
                {available && (
                    <>
                        {started ? (
                            <>
                                <Popconfirm title={"确定要关闭靶场进程吗？"} onConfirm={() => {
                                    ipcRenderer.invoke("cancel-StartVulinbox", token).then(() => {
                                        setStarted(false)
                                    })
                                }}>
                        <YakitButton colors="danger">关闭靶场</YakitButton>
                    </Popconfirm> :
                                    <YakitButton type={"danger"}>关闭靶场</YakitButton>
                                </Popconfirm>

                                <YakitButton type={"success"} onClick={() => {
                                    const m = showYakitModal({
                                        title: "测试参数", width: "50%",
                                        content: (
                                            <div style={{marginTop: 20, marginLeft: 20}}>
                                                <GenQualityInspectionReport onSubmit={params => {

                                                    ipcRenderer.invoke("GenQualityInspectionReport", params, repToken).then(() => {
                                                        info("开始测试")
                                                        setChecked(true)
                                                        m.destroy()
                                                    }).catch((e) => {
                                                        }
                                                    )
                                                }} params={{
                                                    ScriptNames: [],
                                                    TaskName: "xxxx"
                                                }}
                                                />
                                            </div>
                                        ),
                                    })
                                }}>
                                    进行测试
                                </YakitButton>


                            </>
                        ) : (
                            <YakitButton type={"primary"} onClick={() => {
                                const m = showYakitModal({
                                    title: "启动靶场参数", width: "50%",
                                    content: (
                                        <div style={{marginTop: 20, marginLeft: 20}}>
                                            <VulinboxStart onSubmit={param => {
                                                ipcRenderer.invoke("StartVulinbox", param, token).then(() => {
                                                    setCurrentParams(param)
                                                    info("启动靶场成功")
                                                    setStarted(true)
                                                    m.destroy()
                                                }).catch((e) => {
                                                    failed(`${e}`)
                                                })
                                            }} params={{
                                                Host: "127.0.0.1",
                                                Port: 8787, NoHttps: true,
                                                SafeMode: false
                                            }}/>
                                        </div>
                                    )
                                })
                            }}>启动靶场</YakitButton>
                        )}
                    </>
                )}
            </Space>} bodyStyle={{padding: 0}} extra={(
            <Popconfirm title={"将从互联网下载靶场程序并安装"} onConfirm={() => {
                const m = showYakitModal({
                    title: "安装靶场",
                    width: "50%",
                    height: 500,
                    onOk: () => {
                        m.destroy()
                    },
                    cancelButtonProps: {hidden: true},
                    content: (
                        <div style={{margin: 24}}>
                            <InstallVulinboxPrompt onFinished={() => {
                                m.destroy()
                            }}/>
                        </div>
                    )
                })
            }}>
                <YakitButton type={"outline1"}>
                    安装靶场
                </YakitButton>
            </Popconfirm>

        )}
        >


            <div style={{flex: 1, overflow: "hidden"}}>
                <AutoCard bodyStyle={{padding: 10, overflow: "hidden"}}>
                    <PluginResultUI
                        // script={script}
                        loading={loading}
                        risks={infoState.riskState}
                        progress={infoState.processState}
                        results={infoState.messageState}
                        featureType={infoState.featureTypeState}
                        feature={infoState.featureMessageState}
                        statusCards={infoState.statusState}
                        onXtermRef={setXtermRef}
                    />
                </AutoCard>
            </div>
            {/*<EngineConsole/>*/}
        </AutoCard>
    </div>
};

export interface ReportViewerProps {
    taskToken: string
}

export const ReportViewer: React.FC<ReportViewerProps> = (props) => {
    const [taskToken, setTaskToken] = useState(props.taskToken)

    const [infoState, {reset, setXtermRef}, xtermRef] = useHoldingIPCRStream(
        "report", "GenQualityInspectionReport", taskToken, () => {
            setTimeout(() => setLoading(false), 300)
        })
    console.log(infoState)
    const [loading, setLoading] = useState(false)


    return <div style={{flex: 1, overflow: "hidden"}}>
        <div style={{height: "100%", display: "flex", flexDirection: "column"}}>
            <div style={{flex: 1, overflow: "hidden"}}>
                <AutoCard bodyStyle={{padding: 10, overflow: "hidden"}}>
                    <PluginResultUI
                        // script={script}
                        loading={loading}
                        risks={infoState.riskState}
                        progress={infoState.processState}
                        results={infoState.messageState}
                        featureType={infoState.featureTypeState}
                        feature={infoState.featureMessageState}
                        statusCards={infoState.statusState}
                        onXtermRef={setXtermRef}
                    />
                </AutoCard>
            </div>
        </div>
    </div>

}

interface StartVulinboxParams {
    Host: string
    Port: number
    NoHttps: boolean
    SafeMode: boolean
}

interface VulinboxStartProp {
    params: StartVulinboxParams
    setParams?: (p: StartVulinboxParams) => any
    onSubmit: (p: StartVulinboxParams) => any
}

const VulinboxStart: React.FC<VulinboxStartProp> = (props) => {
    const [params, setParams] = useState<StartVulinboxParams>(props.params);

    return <Form
        labelCol={{span: 5}} wrapperCol={{span: 14}}
        onSubmitCapture={e => {
            e.preventDefault()

            props.onSubmit(params)
        }}
        size={"small"}
    >
        <InputItem label={"Host"} setValue={Host => setParams({...params, Host})} value={params.Host}/>
        <InputInteger label={"Port"} setValue={Port => setParams({...params, Port})} value={params.Port}/>
        <SwitchItem label={"不启用 HTTPS"} setValue={NoHttps => setParams({...params, NoHttps})}
                    value={params.NoHttps}/>
        <SwitchItem label={"安全模式"} help={"不启用命令注入类操作系统的靶场"}
                    setValue={SafeMode => setParams({...params, SafeMode})} value={params.SafeMode}/>
        <Form.Item colon={false} label={" "}>
            <YakitButton type="primary" htmlType="submit"> 启动靶场 </YakitButton>
        </Form.Item>
    </Form>
};


interface GenQualityInspectionReportParams {
    ScriptNames: string[]
    TaskName: string
}

interface GenQualityInspectionReportProp {
    params: GenQualityInspectionReportParams
    setParams?: (p: GenQualityInspectionReportParams) => any
    onSubmit: (p: GenQualityInspectionReportParams) => any
}

const GenQualityInspectionReport: React.FC<GenQualityInspectionReportProp> = (props) => {
    const [params, setParams] = useState<GenQualityInspectionReportParams>(props.params);
    const [scriptNamesList, setScriptNamesList] = useState<SelectOptionProps[]>([]) // 代理代表
    useEffect(() => {
        // 代理数据 最近10条
        getRemoteValue(WEB_FUZZ_PROXY_LIST).then((remoteData) => {
            try {
                ipcRenderer.invoke("QueryYakScriptByIsCore", {IsCorePlugin: true}).then((res) => {
                    if (res.Data.length > 0) {
                        const scriptNames = res.Data.map(item => ({label: item.ScriptName, value: item.ScriptName}));
                        console.log(scriptNames)
                        setScriptNamesList(scriptNames);
                    }
                }).catch((e) => {
                    failed(`${e}`)
                })
            } catch (error) {
                yakitFailed("代理列表获取失败:" + error)
            }
        })
    }, [])
    return <Form
        labelCol={{span: 5}} wrapperCol={{span: 14}}
        onSubmitCapture={e => {
            e.preventDefault()

            props.onSubmit(params)
        }}
        size={"small"}
    >
        <InputItem label={"TaskName"} setValue={TaskName => setParams({...params, TaskName})} value={params.TaskName}/>
        <Form.Item
            label={
                <span className={styles["advanced-config-form-label"]}>
                                内置插件
                            </span>
            }
            name='ScriptNames'

        >
            <YakitSelect
                allowClear
                options={scriptNamesList}
                placeholder='请选择...'
                mode='tags'
                size='small'
                value={params.ScriptNames}
                onChange={ScriptNames => setParams({...params, ScriptNames})}
                maxTagCount={10}
            />
        </Form.Item>
        <Form.Item colon={false} label={" "}>
            <YakitButton type="primary" htmlType="submit"> 执行检测 </YakitButton>
        </Form.Item>
    </Form>
};

export interface InstallVulinboxPromptProp {
    onFinished: () => any
}

export const InstallVulinboxPrompt: React.FC<InstallVulinboxPromptProp> = (props) => {
    const [token, setToken] = useState(randomString(60));
    const [data, setData, getData] = useGetState<string[]>([]);
    const [percent, setPercent] = useState(0);

    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e, data: ExecResult) => {
            if (data.Progress > 0) {
                setPercent(Math.ceil(data.Progress))
                return
            }
            if (!data.IsMessage) {
                return
            }
            setData([...getData(), Uint8ArrayToString(data.Message)])
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            failed(`[InstallVulinbox] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            info("[InstallVulinbox] finished")
        })
        return () => {
            ipcRenderer.invoke("cancel-InstallVulinbox", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        ipcRenderer.invoke("InstallVulinbox", {}, token).then(() => {
            success("正在安装 Vulinbox")
            setLoading(true)
        })
        return () => {
            ipcRenderer.invoke("cancel-InstallVulinbox", token)
        }
    }, [])

    return <Space direction={"vertical"}>
        <div className={styles["download-progress"]}>
            <Progress
                strokeColor='#F28B44'
                trailColor='#F0F2F5'
                percent={percent}
                format={(percent) => `已下载 ${percent}%`}
            />
        </div>
        <div className={styles["download-progress-messages"]}>
            {data.map((i) => {
                return <p>{i}</p>
            })}
        </div>
    </Space>
};