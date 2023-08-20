import React, {useEffect, useState} from "react";
import {AutoCard} from "@/components/AutoCard";
import {EngineConsole} from "@/pages/engineConsole/EngineConsole";
import {failed, info, success, yakitNotify} from "@/utils/notification";
import {Form, Popconfirm, Progress, Space, Tag} from "antd";
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
import {ChromeFrameSvgIcon, ChromeSvgIcon} from "@/assets/newIcon";
import {CheckOutlined} from "@ant-design/icons";
import {openExternalWebsite} from "@/utils/openWebsite";

export interface VulinboxManagerProp {

}


const {ipcRenderer} = window.require("electron");
export const VulinboxManager: React.FC<VulinboxManagerProp> = (props) => {
    const [available, setAvailable] = useState(false);
    const [started, setStarted] = useState(false);
    const [token, setToken] = useState(randomString(60));
    const [currentParams, setCurrentParams] = useState<StartVulinboxParams>({
        Host: "127.0.0.1",
        Port: 8787,
        NoHttps: true,
        SafeMode: false,
    });

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
        <AutoCard size={"small"} bordered={true} title={<Space>
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
                started ? <Popconfirm title={"确定要关闭靶场进程吗？"} onConfirm={() => {
                        ipcRenderer.invoke("cancel-StartVulinbox", token).then(() => {
                            setStarted(false)
                        })
                    }}>
                        <YakitButton colors="danger">关闭靶场</YakitButton>
                    </Popconfirm> :
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
            <EngineConsole/>
        </AutoCard>
    </div>
};

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