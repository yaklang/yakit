import {FC, memo, useEffect, useRef, useState} from "react"

import {Progress, Tooltip} from "antd"
import {useRequest, useSafeState} from "ahooks"

import {CloudDownloadIcon, RemoveIcon} from "@/assets/newIcon"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {success, failed} from "@/utils/notification"

import styles from "../knowledgeBase.module.scss"

import type {AllInstallPluginsProps, ExecResult} from "./AllInstallPluginsProps"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/enums/yakitRoute"
import classNames from "classnames"
import {
    OutlineClouddownloadIcon,
    OutlineFolderopenIcon,
    OutlinePuzzleIcon,
    OutlineRefreshIcon
} from "@/assets/icon/outline"
import {YakitLogoSvgIcon, YakitSpinLogoSvgIcon} from "../icon/sidebarIcon"
import {onOpenLocalFileByPath} from "@/pages/notepadManage/notepadManage/utils"
import {downloadWithEvents} from "../utils"

const {ipcRenderer} = window.require("electron")

export const installWithEvents = (url: string, binary: {Name: string; Force: boolean}, token: string) => {
    return downloadWithEvents(url, binary, token)
}

const onCloseKnowledgeRepository = () => {
    emiter.emit("closePage", JSON.stringify({route: YakitRoute.AI_REPOSITORY}))
}

const AllInstallPlugins: FC<AllInstallPluginsProps> = ({
    onInstallPlug,
    binariesToInstall,
    binariesToInstallRefreshAsync,
    isShow = true
}) => {
    const [installTokens, setInstallTokens] = useState<string[]>([])
    const [overallProgress, setOverallProgress] = useState(0)
    const progressMap = useRef<Record<string, number>>({})
    const [showDetailStatus, setShowDetailStatus] = useSafeState(true)
    const [eachProgress, setEachProgress] = useState<Record<string, number>>({})

    useEffect(() => {
        emiter.on("onCloseKnowledgeRepository", onCloseKnowledgeRepository)
        return () => {
            emiter.off("onCloseKnowledgeRepository", onCloseKnowledgeRepository)
        }
    }, [])

    // 并发安装所有
    const {run: runInstallAll, loading} = useRequest(
        async () => {
            const exclude = ["llama-server", "model-Qwen3-Embedding-0.6B-Q4"]
            const filteredInstall = binariesToInstall?.filter((item) => !exclude.includes(item.Name)) ?? []
            const emptyInstallPathItem = filteredInstall?.filter((item) => item.InstallPath === "") ?? []
            if (!emptyInstallPathItem || emptyInstallPathItem.length === 0) {
                return
            } else {
                setOverallProgress(0)
                progressMap.current = {}
                const tokens = emptyInstallPathItem.map((it) => it.installToken)
                setInstallTokens(tokens)

                // 并发执行安装
                const promises = emptyInstallPathItem.map((b) =>
                    installWithEvents("InstallThirdPartyBinary", {Name: b.Name, Force: true}, b.installToken)
                )
                await Promise.all(promises)
            }

            return "ok"
        },
        {
            manual: true,
            onSuccess: async () => {
                try {
                    success("知识库所需插件安装完成")
                    setOverallProgress(100)
                    onInstallPlug(false)
                    setInstallTokens([])
                    await binariesToInstallRefreshAsync()
                } catch (error) {
                    failed(error + "")
                }
            },
            onError: (err) => {
                failed(`插件安装失败: ${err}`)
                setInstallTokens([])
                setOverallProgress(0)
            }
        }
    )

    // 进度监听
    useEffect(() => {
        installTokens.forEach((token) => {
            const onData = (_, data: ExecResult) => {
                if (data.Progress > 0) {
                    const progressValue = Math.ceil(data.Progress)

                    progressMap.current[token] = progressValue

                    setEachProgress({...progressMap.current})

                    // 计算总进度
                    const values = Object.values(progressMap.current)
                    const sum = values.reduce((a, b) => a + b, 0)
                    const avg = installTokens.length > 0 ? Math.floor(sum / installTokens.length) : 0

                    setOverallProgress(avg)
                }
            }

            const onError = (_, error) => {
                failed(`下载失败:${error}`)
            }

            const onEnd = () => {}

            ipcRenderer.on(`${token}-data`, onData)
            ipcRenderer.on(`${token}-error`, onError)
            ipcRenderer.on(`${token}-end`, onEnd)
        })

        return () => {
            installTokens.forEach((token) => {
                ipcRenderer.invoke("cancel-InstallThirdPartyBinary", token)
                ipcRenderer.removeAllListeners(`${token}-data`)
                ipcRenderer.removeAllListeners(`${token}-error`)
                ipcRenderer.removeAllListeners(`${token}-end`)
            })
        }
    }, [installTokens])

    const showDetail = () => {
        setShowDetailStatus(true)
    }

    // 单独下载一个插件
    const downloadSingle = async (binary: {Name: string; installToken: string}) => {
        try {
            setInstallTokens((prev) => {
                if (!prev.includes(binary.installToken)) {
                    return [...prev, binary.installToken]
                }
                return prev
            })

            await installWithEvents("InstallThirdPartyBinary", {Name: binary.Name, Force: true}, binary.installToken)
            await binariesToInstallRefreshAsync()
            success(`${binary.Name} 下载完成`)
            onInstallPlug(false)
            setInstallTokens([])
        } catch (err) {
            failed(`${binary.Name} 下载失败: ${err}`)
        }
    }

    return (
        <div className={styles["install-container"]}>
            <div className={styles["install-box"]}>
                <YakitEmpty title='检测到有插件未下载' description='请点击下载后，再创建知识库' />

                <div className={styles["install-button-box"]}>
                    <YakitButton
                        icon={<CloudDownloadIcon />}
                        onClick={() => {
                            try {
                                runInstallAll()
                            } catch (error) {
                                failed(error + "")
                            }
                        }}
                        loading={loading}
                    >
                        一键下载
                    </YakitButton>
                    {isShow ? (
                        <YakitButton type='text' onClick={() => showDetail()}>
                            查看详情
                        </YakitButton>
                    ) : null}
                </div>
            </div>
            {isShow ? (
                <div
                    className={classNames(styles["show-detail-box"], {
                        [styles["hidden"]]: !showDetailStatus
                    })}
                >
                    <div className={styles["header"]}>
                        <div className={styles["left"]}>
                            <OutlinePuzzleIcon />
                            <div>插件下载</div>
                            <Tooltip title='刷新插件列表'>
                                <YakitButton
                                    type='text'
                                    icon={<OutlineRefreshIcon />}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        binariesToInstallRefreshAsync?.()
                                    }}
                                />
                            </Tooltip>
                        </div>
                        <div className={styles["right"]}>
                            <YakitButton
                                icon={<OutlineClouddownloadIcon />}
                                type='text2'
                                onClick={() => runInstallAll()}
                                loading={loading}
                            />
                            <YakitButton
                                icon={<RemoveIcon />}
                                type='text2'
                                onClick={() => setShowDetailStatus(false)}
                            />
                        </div>
                    </div>
                    {installTokens.length > 0 ? <Progress percent={overallProgress} showInfo={false} /> : null}
                    <div className={styles["content"]}>
                        {binariesToInstall?.map((it, key) => {
                            return (
                                <div className={styles["install-content-box"]} key={it.InstallPath + key}>
                                    <div className={styles["first-box"]}>
                                        <YakitLogoSvgIcon />
                                        <YakitSpinLogoSvgIcon className={styles["yakit-svg"]} />
                                    </div>
                                    <div className={styles["middle-box"]}>
                                        <div className={styles["title"]}>{it.Name}</div>
                                        <div className={styles["describe"]}>{it.Description}</div>
                                    </div>
                                    <div className={styles["last-box"]}>
                                        {!it.InstallPath && !eachProgress?.[it.installToken] ? (
                                            <YakitButton
                                                icon={<CloudDownloadIcon />}
                                                onClick={() => downloadSingle(it)}
                                            >
                                                下载
                                            </YakitButton>
                                        ) : eachProgress?.[it.installToken] < 100 ? (
                                            <div className={styles["downloading"]}>
                                                正在下载.. （{eachProgress?.[it.installToken]}.0%）
                                            </div>
                                        ) : (
                                            <YakitButton
                                                type='text'
                                                icon={<OutlineFolderopenIcon />}
                                                onClick={() => onOpenLocalFileByPath(it.InstallPath)}
                                            >
                                                打开
                                            </YakitButton>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ) : null}
        </div>
    )
}

export default memo(AllInstallPlugins)
