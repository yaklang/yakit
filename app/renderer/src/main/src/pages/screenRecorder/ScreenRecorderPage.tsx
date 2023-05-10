import React, {useEffect, useState} from "react"
import {Alert, Form, List, PageHeader, Popconfirm, Progress, Space, Typography} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {CopyableField, InputInteger, InputItem, ManySelectOne, OneLine, SwitchItem} from "@/utils/inputUtil"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {showDrawer, showModal} from "@/utils/showModal"
import {useGetState, useMemoizedFn} from "ahooks"
import {randomString} from "@/utils/randomUtil"
import {ExecResult} from "@/pages/invoker/schema"
import {failed, yakitFailed} from "@/utils/notification"
import {Uint8ArrayToString} from "@/utils/str"
import {CloudDownloadIcon, RefreshIcon, SolidCloudDownloadIcon} from "@/assets/newIcon"
import {ResizeBox} from "@/components/ResizeBox"
import {AutoCard} from "@/components/AutoCard"
import {ScreenRecorderList} from "@/pages/screenRecorder/ScreenRecorderList"
import {AutoSpin} from "@/components/AutoSpin"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import styles from "./ScreenRecorderPage.module.scss"
import screcorderEmpty from "./screcorderEmpty.png"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"

export interface ScreenRecorderPageProp {}

const {ipcRenderer} = window.require("electron")

export const ScreenRecorderPage: React.FC<ScreenRecorderPageProp> = (props) => {
    const [available, setAvailable] = useState(false)
    const [refreshTrigger, setRefreshTrigger] = useState(false)
    const [loading, setLoading] = useState(false)
    const [installVisible, setInstallVisible] = useState<boolean>(false)

    const init = () => {
        setLoading(true)
        ipcRenderer
            .invoke("IsScrecorderReady", {})
            .then((data: {Ok: boolean; Reason: string}) => {
                setAvailable(data.Ok)
            })
            .finally(() => setTimeout(() => setLoading(false), 200))
    }

    useEffect(() => {
        init()
    }, [])

    return (
        <YakitSpin spinning={loading}>
            {available ? (
                <ScreenRecorderList refreshTrigger={refreshTrigger} />
            ) : (
                <div className={styles["not-installed-empty"]}>
                    <YakitEmpty
                        image={<img src={screcorderEmpty} alt='' style={{height: 200}} />}
                        title={<div style={{fontSize: 14}}>未安装录屏</div>}
                        description='点击“安装录屏”，录屏工具安装成功后即可开始录屏'
                    />
                    <div className={styles["not-installed-buttons"]}>
                        <YakitButton
                            type='outline1'
                            icon={<CloudDownloadIcon />}
                            onClick={() => {
                                setInstallVisible(true)
                            }}
                        >
                            安装录屏
                        </YakitButton>
                    </div>
                </div>
            )}
            <YakitHint
                visible={installVisible}
                title='录屏工具安装中...'
                heardIcon={<SolidCloudDownloadIcon style={{color: "var(--yakit-warning-5)"}} />}
                onCancel={() => {
                    setInstallVisible(false)
                }}
                okButtonProps={{style: {display: "none"}}}
                isDrag={true}
                mask={false}
            >
                <InstallFFmpeg
                    visible={installVisible}
                    onFinish={() => {
                        setInstallVisible(false)
                        init()
                    }}
                />
            </YakitHint>
        </YakitSpin>
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

export interface InstallFFmpegProp {
    visible: boolean
    onFinish: () => void
}

export const InstallFFmpeg: React.FC<InstallFFmpegProp> = (props) => {
    const {onFinish, visible} = props
    const [token, setToken] = useState(randomString(40))
    const [results, setResults, getResult] = useGetState<string[]>([])

    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e, data: ExecResult) => {
            if (!data.IsMessage) {
                return
            }
            setResults([Uint8ArrayToString(data.Message), ...getResult()])
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            yakitFailed("下载失败：" + error)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            onFinish()
        })
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
        if (visible) install()
        setResults([])
    }, [visible])

    return (
        <>
            <div className={styles["download-progress"]}>
                <Progress
                    strokeColor='#F28B44'
                    trailColor='#F0F2F5'
                    percent={50}
                    format={(percent) => `已下载 ${percent}%`}
                />
            </div>
            <div className={styles["download-progress-messages"]}>
                {results.map((i) => {
                    return <p>{i}</p>
                })}
            </div>
        </>
    )
}
