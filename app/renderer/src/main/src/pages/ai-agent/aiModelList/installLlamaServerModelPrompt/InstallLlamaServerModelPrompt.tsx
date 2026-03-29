import React, {useEffect, useRef, useState} from "react"
import {
    DownloadLlamaServerModelPromptProps,
    InstallLlamaServerModelPromptProps,
    InstallLlamaServerProps
} from "./InstallLlamaServerModelPromptType"
import {ExecResult} from "@/pages/invoker/schema"
import {yakitNotify} from "@/utils/notification"
import {Uint8ArrayToString} from "@/utils/str"
import {useMemoizedFn} from "ahooks"
import {Form, Progress} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import styles from "./InstallLlamaServerModelPrompt.module.scss"
import {
    grpcCancelDownloadLocalModel,
    grpcCancelInstallLlamaServer,
    grpcDownloadLocalModel,
    grpcInstallLlamaServer
} from "../utils"
import {SolidCloudDownloadIcon} from "@/assets/newIcon"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
const {ipcRenderer} = window.require("electron")

export const InstallLlamaServerModelPrompt: React.FC<InstallLlamaServerModelPromptProps> = React.memo((props) => {
    const {onStart, token} = props
    const {t} = useI18nNamespaces(["aiAgent"])

    const startInstall = useMemoizedFn((value) => {
        grpcInstallLlamaServer({Proxy: value.proxy, token}).then(() => {
            yakitNotify("success", t("InstallLlamaServerModelPrompt.installing"))
            onStart()
        })
    })

    return (
        <>
            <div className={styles["install-llama-server-model-prompt"]}>
                <Form onFinish={startInstall} layout='vertical'>
                    <Form.Item
                        label={t("InstallLlamaServerModelPrompt.proxySettings")}
                        help={t("InstallLlamaServerModelPrompt.proxyHelp")}
                        name='proxy'
                    >
                        <YakitInput placeholder={t("InstallLlamaServerModelPrompt.proxyPlaceholder")} />
                    </Form.Item>

                    <div className={styles["button-group"]}>
                        <YakitButton type='primary' htmlType='submit' size='large'>
                            {t("InstallLlamaServerModelPrompt.downloadAndInstall")}
                        </YakitButton>
                    </div>
                </Form>
            </div>
        </>
    )
})

export const InstallLlamaServer: React.FC<InstallLlamaServerProps> = React.memo((props) => {
    const {onFinished, onCancel, token, title, grpcInterface, getContainer} = props
    const {t} = useI18nNamespaces(["aiAgent"])

    const [percent, setPercent] = useState<number>(0)
    const [data, setData] = useState<string[]>([])

    const hasErrorRef = useRef<boolean>(false)

    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e, data: ExecResult) => {
            if (data.Progress > 0) {
                setPercent(data.Progress)
            }

            if (!data.IsMessage) {
                return
            }
            handleMessage(Uint8ArrayToString(data.Message))
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            yakitNotify("error", `[${grpcInterface}] error: ${error}`)
            hasErrorRef.current = true
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            if (!hasErrorRef.current) {
                yakitNotify("info", "[${grpcInterface}] finished")
                onFinished()
            }
        })
        return () => {
            onCancelDownload()
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [])
    const handleMessage = useMemoizedFn((message: string) => {
        if (!message) return
        setData((prev) => [...prev, message])
    })
    const onCancelDownload = useMemoizedFn(() => {
        switch (grpcInterface) {
            case "InstallLlamaServer":
                grpcCancelInstallLlamaServer(token)
                break
            case "DownloadLocalModel":
                grpcCancelDownloadLocalModel(token)
                break
            default:
                break
        }
    })
    const onBack = useMemoizedFn(() => {
        onCancelDownload()
        onCancel()
    })
    return (
        <YakitHint
            visible={true}
            title={title}
            heardIcon={<SolidCloudDownloadIcon style={{color: "var(--Colors-Use-Warning-Primary)"}} />}
            onCancel={onBack}
            okButtonProps={{style: {display: "none"}}}
            isDrag={true}
            mask={false}
            getContainer={getContainer}
            wrapClassName={styles["installLlamaServerModal"]}
        >
            <div className={styles["download-progress"]}>
                <Progress
                    trailColor='var(--Colors-Use-Neutral-Bg-Hover)'
                    percent={percent}
                    format={(p) => t("InstallLlamaServerModelPrompt.progress", {percent: p || 0})}
                />
                <div className={styles["download-progress-messages"]}>
                    {data.map((item, index) => (
                        <p key={item}>{item}</p>
                    ))}
                </div>
            </div>
        </YakitHint>
    )
})

export const DownloadLlamaServerModelPrompt: React.FC<DownloadLlamaServerModelPromptProps> = React.memo((props) => {
    const {modelName, onStart, token} = props
    const {t} = useI18nNamespaces(["aiAgent"])

    const startDownload = useMemoizedFn((value) => {
        grpcDownloadLocalModel({ModelName: modelName, Proxy: value.proxy, token}).then(() => {
            yakitNotify("success", t("InstallLlamaServerModelPrompt.installing"))
            onStart()
        })
    })

    return (
        <div className={styles["download-llama-server-model-prompt"]}>
            <Form onFinish={startDownload} size='small' layout='vertical'>
                <Form.Item
                    name='proxy'
                    label={t("InstallLlamaServerModelPrompt.proxySettings")}
                    help={t("InstallLlamaServerModelPrompt.proxyHelp")}
                >
                    <YakitInput placeholder={t("InstallLlamaServerModelPrompt.proxyPlaceholder")} />
                </Form.Item>

                <div className={styles["button-group"]}>
                    <YakitButton type='primary' htmlType='submit' size='large' style={{marginBottom: 8}}>
                        {t("InstallLlamaServerModelPrompt.downloadModel")}
                    </YakitButton>
                </div>
            </Form>
        </div>
    )
})
