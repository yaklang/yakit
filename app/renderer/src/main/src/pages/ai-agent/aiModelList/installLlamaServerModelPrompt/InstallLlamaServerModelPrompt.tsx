import React, {useEffect, useRef, useState} from "react"
import {
    DownloadLlamaServerModelPromptProps,
    InstallLlamaServerModelPromptProps
} from "./InstallLlamaServerModelPromptType"
import {ExecResult} from "@/pages/invoker/schema"
import {yakitNotify} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {Uint8ArrayToString} from "@/utils/str"
import {useMemoizedFn} from "ahooks"
import {Form, Progress} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import styles from "./InstallLlamaServerModelPrompt.module.scss"
import {grpcCancelInstallLlamaServer, grpcDownloadLocalModel, grpcInstallLlamaServer} from "../utils"
import {SolidRefreshIcon} from "@/assets/icon/solid"
const {ipcRenderer} = window.require("electron")

export const InstallLlamaServerModelPrompt: React.FC<InstallLlamaServerModelPromptProps> = React.memo((props) => {
    const {onFinished, onClose} = props
    const [percent, setPercent] = useState<number>(0)
    const [loading, setLoading] = useState<boolean>(false)
    const [data, setData] = useState<string[]>([])

    const tokenRef = useRef(randomString(60))
    const hasErrorRef = useRef<boolean>(false)

    useEffect(() => {
        const token = tokenRef.current
        ipcRenderer.on(`${token}-data`, async (e, data: ExecResult) => {
            if (data.Progress > 0) {
                setPercent(Math.trunc(data.Progress * 100))
                return
            }
            if (!data.IsMessage) {
                return
            }
            handleMessage(Uint8ArrayToString(data.Message))
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            yakitNotify("error", `[InstallLlamaServer] error: ${error}`)
            hasErrorRef.current = true
            setLoading(false)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            if (!hasErrorRef.current) {
                yakitNotify("info", "[InstallLlamaServer] finished")
                onFinished()
            }
        })
        return () => {
            grpcCancelInstallLlamaServer(token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [])
    const handleMessage = useMemoizedFn((message: string) => {
        setData((prev) => [...prev, message])
    })
    const startInstall = useMemoizedFn((value) => {
        hasErrorRef.current = false
        setData([])
        setPercent(0)
        setLoading(true)
        grpcInstallLlamaServer({Proxy: value.proxy, token: tokenRef.current}).then(() => {
            yakitNotify("success", "正在安装模型环境")
        })
    })
    const onBack = useMemoizedFn(() => {
        grpcCancelInstallLlamaServer(tokenRef.current)
        setLoading(true)
    })
    return (
        <>
            {loading ? (
                <div className={styles["install-llama-server-model-prompt-loading"]}>
                    <SolidRefreshIcon className={styles["refresh-icon"]} />
                    <div className={styles["download-progress"]}>
                        <Progress
                            strokeColor='var(--Colors-Use-Main-Primary)'
                            trailColor='var(--Colors-Use-Neutral-Bg)'
                            percent={percent}
                            format={(percent) => `安装进度 ${percent}%`}
                        />
                        <div className={styles["download-progress-messages"]}>
                            {data.map((item, index) => (
                                <p key={item}>{item}</p>
                            ))}
                        </div>
                        <YakitButton type='outline1' size='large' onClick={onBack} style={{width: "fit-content"}}>
                            取消
                        </YakitButton>
                    </div>
                </div>
            ) : (
                <div className={styles["install-llama-server-model-prompt"]}>
                    <Form labelCol={{span: 6}} wrapperCol={{span: 18}} size='small' onFinish={startInstall}>
                        <Form.Item
                            label='代理设置'
                            help='可选，用于下载加速。格式: http://proxy:port 或 socks5://proxy:port'
                            name='proxy'
                        >
                            <YakitInput placeholder='留空则不使用代理' />
                        </Form.Item>

                        <Form.Item colon={false} label=' '>
                            <YakitButton type='primary' htmlType='submit' size='large'>
                                下载并安装
                            </YakitButton>
                            <YakitButton style={{marginLeft: 12}} type='outline1' size='large' onClick={onClose}>
                                取消
                            </YakitButton>
                        </Form.Item>
                    </Form>
                </div>
            )}
        </>
    )
})

export const DownloadLlamaServerModelPrompt: React.FC<DownloadLlamaServerModelPromptProps> = React.memo((props) => {
    const {modelName, onFinished} = props
    const [percent, setPercent] = useState<number>(0)
    const [loading, setLoading] = useState<boolean>(false)
    const [data, setData] = useState<string[]>([])

    const tokenRef = useRef(randomString(60))
    const hasErrorRef = useRef<boolean>(false)

    useEffect(() => {
        const token = tokenRef.current
        ipcRenderer.on(`${token}-data`, async (e, data: ExecResult) => {
            if (data.Progress > 0) {
                setPercent(Math.trunc(data.Progress * 100))
                return
            }
            if (!data.IsMessage) {
                return
            }
            handleMessage(Uint8ArrayToString(data.Message))
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            yakitNotify("error", `[DownloadLocalModel] error: ${error}`)
            hasErrorRef.current = true
            setLoading(false)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            if (!hasErrorRef.current) {
                yakitNotify("info", "[DownloadLocalModel] finished")
                onFinished()
            }
        })
        return () => {
            grpcCancelInstallLlamaServer(token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [])

    const handleMessage = useMemoizedFn((message: string) => {
        setData((prev) => [...prev, message])
    })

    const startDownload = useMemoizedFn((value) => {
        hasErrorRef.current = false
        setData([])
        setPercent(0)
        setLoading(true)
        grpcDownloadLocalModel({ModelName: modelName, Proxy: value.proxy, token: tokenRef.current}).then(() => {
            yakitNotify("success", "正在安装模型环境")
        })
    })
    const onBack = useMemoizedFn(() => {
        grpcCancelInstallLlamaServer(tokenRef.current)
        setLoading(false)
    })
    return loading ? (
        <div className={styles["download-llama-server-model-prompt-loading"]}>
            <SolidRefreshIcon className={styles["refresh-icon"]} />
            <div className={styles["download-progress"]}>
                <Progress
                    strokeColor='var(--Colors-Use-Main-Primary)'
                    trailColor='var(--Colors-Use-Neutral-Bg)'
                    percent={percent}
                    format={(percent) => `安装进度 ${percent}%`}
                />
                <div className={styles["download-progress-messages"]}>
                    {data.map((item, index) => (
                        <p key={item}>{item}</p>
                    ))}
                </div>
                <YakitButton type='outline1' size='large' onClick={onBack} style={{width: "fit-content"}}>
                    取消
                </YakitButton>
            </div>
        </div>
    ) : (
        <div className={styles["download-llama-server-model-prompt"]}>
            <div>下载模型: {props.modelName}</div>
            <Form labelCol={{span: 6}} wrapperCol={{span: 18}} onFinish={startDownload} size='small'>
                <Form.Item
                    name='proxy'
                    label='代理设置'
                    help='可选，用于下载加速。格式: http://proxy:port 或 socks5://proxy:port'
                >
                    <YakitInput placeholder='留空则不使用代理' />
                </Form.Item>

                <Form.Item colon={false} label=' '>
                    <YakitButton type='primary' htmlType='submit' size='large' style={{marginBottom: 8}}>
                        开始下载模型
                    </YakitButton>
                </Form.Item>
            </Form>
        </div>
    )
})
