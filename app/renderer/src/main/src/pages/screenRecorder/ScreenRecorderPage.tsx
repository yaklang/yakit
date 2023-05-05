import React, {useEffect, useState} from "react"
import {Alert, Form, List, PageHeader, Popconfirm, Space, Typography} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {CopyableField, InputInteger, InputItem, ManySelectOne, OneLine, SwitchItem} from "@/utils/inputUtil"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {showDrawer, showModal} from "@/utils/showModal"
import {useGetState, useMemoizedFn} from "ahooks"
import {randomString} from "@/utils/randomUtil"
import {ExecResult} from "@/pages/invoker/schema"
import {failed} from "@/utils/notification"
import {Uint8ArrayToString} from "@/utils/str"
import {RefreshIcon} from "@/assets/newIcon"
import {ResizeBox} from "@/components/ResizeBox"
import {AutoCard} from "@/components/AutoCard"
import {ScreenRecorderList} from "@/pages/screenRecorder/ScreenRecorderList"
import {AutoSpin} from "@/components/AutoSpin"

export interface ScreenRecorderPageProp {}

const {ipcRenderer} = window.require("electron")

export const ScreenRecorderPage: React.FC<ScreenRecorderPageProp> = (props) => {
    const [loading, setLoading] = useState<boolean>(false)
    const [available, setAvailable] = useState(false)
    const [reason, setReason] = useState("")
    const [refreshTrigger, setRefreshTrigger, getRefreshTrigger] = useGetState(false)

    const init = () => {
        setLoading(true)
        ipcRenderer
            .invoke("IsScrecorderReady", {})
            .then((data: {Ok: boolean; Reason: string}) => {
                setAvailable(data.Ok)
                setReason(data.Reason)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    }

    useEffect(() => {
        init()
    }, [])

    return (
        <div>
            <PageHeader
                title={
                    <Space>
                        录屏管理器
                        <YakitButton loading={loading} type={"outline1"} icon={<RefreshIcon />} onClick={init}>
                            刷新状态
                        </YakitButton>
                    </Space>
                }
                extra={
                    <div>
                        <Space>
                            <Popconfirm
                                title={"安装录屏依赖需要联网"}
                                onConfirm={() => {
                                    const m = showDrawer({
                                        title: "安装录屏相应组件操作",
                                        content: (
                                            <>
                                                <InstallFFmpeg />
                                            </>
                                        ),
                                        width: "50%",
                                        maskClosable: false
                                    })
                                }}
                            >
                                <YakitButton disabled={available} onClick={() => {}}>
                                    安装录屏
                                </YakitButton>
                            </Popconfirm>
                        </Space>
                    </div>
                }
            >
                {!available && <Alert type={"info"} closable={false} message={reason} />}
            </PageHeader>
            <AutoSpin spinning={loading}>
                <ResizeBox
                    firstNode={
                        <AutoCard size={"small"} bordered={false} title={"录屏基础设置"}>
                            <ScreenRecorderForm
                                onRefresh={() => {
                                    const id = setInterval(() => {
                                        setRefreshTrigger(!getRefreshTrigger())
                                    }, 1000)
                                    setTimeout(() => {
                                        clearInterval(id)
                                    }, 3400)
                                }}
                            />
                        </AutoCard>
                    }
                    firstRatio={"450px"}
                    firstMinSize={"400px"}
                    secondNode={<ScreenRecorderList refreshTrigger={refreshTrigger} />}
                />
            </AutoSpin>
        </div>
    )
}

export interface ScreenRecorderFormProp {
    onRefresh: () => any
}

interface StartScrecorderParams {
    Framerate: number
    ResolutionSize: string
    CoefficientPTS: number
    DisableMouse: boolean
}

export const ScreenRecorderForm: React.FC<ScreenRecorderFormProp> = (props) => {
    const [recording, setRecording] = useState(false)
    const [token, setToken] = useState(randomString(40))
    const [params, setParams] = useState<StartScrecorderParams>({
        CoefficientPTS: 0.333, // 三倍速
        DisableMouse: false, // 禁用鼠标捕捉
        Framerate: 3, // 帧率
        ResolutionSize: "" // 分辨率
    })

    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e, data: ExecResult) => {})
        ipcRenderer.on(`${token}-error`, (e, error) => {})
        ipcRenderer.on(`${token}-end`, (e, data) => {
            setRecording(false)
        })
        return () => {
            setRecording(false)
            ipcRenderer.invoke("cancel-StartScrecorder", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [])

    useEffect(() => {
        ipcRenderer.on("open-screenCap-modal", async (e, data: ExecResult) => {})
        return () => {
            ipcRenderer.removeAllListeners("open-screenCap-modal")
        }
    }, [])

    const openScreenRecorder = useMemoizedFn(() => {
        const m = showYakitModal({
            title: "录屏须知",
            width: "40%",
            onOk: () => {
                ipcRenderer.invoke("StartScrecorder", params, token).then(() => {
                    setRecording(true)
                    m.destroy()
                })
            },
            content: (
                <Space direction={"vertical"} style={{margin: 20}}>
                    <Alert message={"录屏可能会有一定量的 CPU 占用，帧率越低，分辨率越低 CPU 占用越低"} />
                </Space>
            )
        })
    })

    return (
        <>
            <Alert
                type={"success"}
                style={{marginBottom: 24}}
                message={
                    <div>
                        <Space>
                            <Typography.Paragraph>
                                本录屏在 Windows 下会 <Typography.Text mark={true}>同时录制所有屏幕</Typography.Text>{" "}
                                合并在一个文件中
                            </Typography.Paragraph>
                        </Space>
                        <br />
                        <Typography.Paragraph>
                            在 MacOS 下多屏会生成 <Typography.Text mark={true}>多个文件</Typography.Text>
                        </Typography.Paragraph>
                    </div>
                }
            />
            <Form
                size={"small"}
                labelCol={{span: 5}}
                wrapperCol={{span: 14}}
                onSubmitCapture={(e) => {
                    e.preventDefault()
                    openScreenRecorder()
                }}
            >
                <InputInteger
                    label={"帧率"}
                    disable={recording}
                    setValue={(Framerate) => setParams({...params, Framerate})}
                    value={params.Framerate}
                    help={"渗透测试过程记录推荐使用低帧率（5帧/s以下）以免 CPU 占用过高"}
                />
                <ManySelectOne
                    label={"倍速"}
                    disabled={recording}
                    data={[
                        {text: "X1: 一倍速", value: 1.0},
                        {text: "X2: 二倍速（推荐）", value: 0.5},
                        {text: "X3: 三倍速", value: 0.333},
                        {text: "X5: 五倍速", value: 0.2}
                    ]}
                    help={"直接录制倍速视频，免视频后期处理"}
                    setValue={(CoefficientPTS) => setParams({...params, CoefficientPTS})}
                    value={params.CoefficientPTS}
                />
                <SwitchItem
                    label={"禁止鼠标捕捉"}
                    setValue={(DisableMouse) => setParams({...params, DisableMouse})}
                    value={params.DisableMouse}
                    disabled={recording}
                />
                <Form.Item colon={false} label={" "}>
                    <Space>
                        <YakitButton loading={recording} type='primary' htmlType='submit'>
                            {" "}
                            开始录屏{" "}
                        </YakitButton>
                        <Popconfirm
                            title={"确定要停止录屏吗？"}
                            onConfirm={() => {
                                ipcRenderer.invoke("cancel-StartScrecorder", token)
                                if (props?.onRefresh) {
                                    props.onRefresh()
                                }
                            }}
                        >
                            <YakitButton type={"danger"} disabled={!recording} onClick={() => {}}>
                                停止录屏
                            </YakitButton>
                        </Popconfirm>
                    </Space>
                </Form.Item>
            </Form>
        </>
    )
}

export interface InstallFFmpegProp {}

export const InstallFFmpeg: React.FC<InstallFFmpegProp> = (props) => {
    const [token, setToken] = useState(randomString(40))
    const [results, setResults, getResult] = useGetState<string[]>([])

    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e, data: ExecResult) => {
            if (!data.IsMessage) {
                return
            }
            setResults([...getResult(), Uint8ArrayToString(data.Message)])
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {})
        ipcRenderer.on(`${token}-end`, (e, data) => {})
        return () => {
            ipcRenderer.invoke("cancel-InstallScrecorder", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [])

    const install = useMemoizedFn(() => {
        ipcRenderer.invoke("InstallScrecorder", {}, token)
    })

    useEffect(() => {
        ipcRenderer.invoke("IsScrecorderReady", {}).then((data: {Ok: boolean}) => {
            if (!data.Ok) {
                install()
            }
        })
    }, [])

    return (
        <div>
            {results.map((i) => {
                return <p>{i}</p>
            })}
        </div>
    )
}
