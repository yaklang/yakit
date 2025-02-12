import React, {useEffect, useMemo, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {Progress} from "antd"
import {DownloadingState} from "@/yakitGVDefine"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {setLocalValue} from "@/utils/kv"
import {failed, info, success} from "@/utils/notification"
import {getReleaseEditionName, isEnterpriseEdition} from "@/utils/envfile"
import {UpdateContentProp} from "../FuncDomain"
import {NetWorkApi} from "@/services/fetch"
import {LocalGVS} from "@/enums/localGlobal"
import {safeFormatDownloadProcessState} from "../utils"
import {API} from "@/services/swagger/resposeType"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"

import styles from "./UpdateYakitAndYaklang.module.scss"

const {ipcRenderer} = window.require("electron")

// 去除版本号里的v字符
const removePrefixV = (version: string) => {
    return version.startsWith("v") ? version.substring(1) : version
}

interface UpdateYakitHintProps {
    current: string
    latest: string
    visible: boolean
    onCallback: () => void
}
/** yakit 更新弹框-包括更新内容 */
export const UpdateYakitHint: React.FC<UpdateYakitHintProps> = React.memo((props) => {
    const {latest, visible, onCallback} = props

    useEffect(() => {
        if (visible) {
            fetchYakitUpdateContent()
            return () => {
                setStatus("ready")
                setYakitProgress(undefined)
                setBreakLoading(false)
                setYakitUpdateContent({version: "", content: ""})
            }
        }
    }, [visible])

    const handleCancel = useMemoizedFn(() => {
        onCallback()
    })

    const [status, setStatus] = useState<"ready" | "install" | "installed">("ready")
    const [yakitProgress, setYakitProgress] = useState<DownloadingState>()
    const [breakLoading, setBreakLoading] = useState<boolean>(false)

    const [yakitUpdateContent, setYakitUpdateContent] = useState<UpdateContentProp>({
        version: "",
        content: ""
    })

    const fetchYakitUpdateContent = useMemoizedFn(() => {
        NetWorkApi<any, API.YakVersionsInfoResponse>({
            method: "get",
            url: "yak/versions/info"
        })
            .then((res: API.YakVersionsInfoResponse) => {
                if (!res) return
                const data = res.data || []
                try {
                    data.forEach((item) => {
                        if (item.type === "yakit") {
                            const content: UpdateContentProp = JSON.parse(item.content)
                            if (removePrefixV(content.version) === removePrefixV(latest)) {
                                setYakitUpdateContent({...content})
                            }
                        }
                    })
                } catch (error) {}
            })
            .catch((err) => {})
    })

    const yakitContent: string[] = useMemo(() => {
        if (!yakitUpdateContent.content) return []
        return yakitUpdateContent.content.split("\n")
    }, [yakitUpdateContent])

    useEffect(() => {
        ipcRenderer.on("download-yakit-engine-progress", (e: any, state: DownloadingState) => {
            setYakitProgress(safeFormatDownloadProcessState(state))
        })

        return () => {
            ipcRenderer.removeAllListeners("download-yakit-engine-progress")
        }
    }, [])

    /** 下载 */
    const handleDownload = useMemoizedFn(() => {
        let version = latest.startsWith("v") ? latest.substring(1) : latest
        setStatus("install")
        ipcRenderer
            .invoke("download-latest-yakit", version, isEnterpriseEdition())
            .then(() => {
                success("下载完毕")
                setYakitProgress((old) => {
                    if (!old) return undefined
                    return {
                        time: {
                            elapsed: old?.time.elapsed || 0,
                            remaining: 0
                        },
                        speed: 0,
                        percent: 100,
                        size: old.size
                    }
                })
                setStatus("installed")
            })
            .catch((e: any) => {
                failed(`下载失败: ${e}`)
                setYakitProgress(undefined)
                setStatus("ready")
            })
    })

    /** 停止下载 */
    const yakitBreak = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-download-yakit-version")
        setBreakLoading(true)
        setStatus("ready")
        setYakitProgress(undefined)
        setTimeout(() => {
            setBreakLoading(false)
        }, 300)
    })

    /** 立即更新-已下载完成 */
    const yakitUpdate = useMemoizedFn(() => {
        ipcRenderer.invoke("open-yakit-path")
        setTimeout(() => {
            ipcRenderer.invoke("UIOperate", "close")
        }, 100)
    })

    /** 不再提示 */
    const noHint = () => {
        setLocalValue(LocalGVS.NoAutobootLatestVersionCheck, true)
        handleCancel()
    }

    const title = useMemo(() => {
        if (status === "ready") return `检测到 ${getReleaseEditionName()} 版本升级`
        if (status === "install") return `${getReleaseEditionName()} 下载中...`
        if (status === "installed") return `${getReleaseEditionName()} 下载成功`
        return "异常错误，请关闭!"
    }, [status])

    const extraBtn = useMemo(() => {
        if (status === "ready") {
            return (
                <YakitButton size='max' type='outline2' onClick={noHint}>
                    不再提示
                </YakitButton>
            )
        }
        return null
    }, [status])

    const footerBtn = useMemo(() => {
        if (status === "ready") {
            return (
                <>
                    <YakitButton size='max' type='outline2' onClick={handleCancel}>
                        稍后再说
                    </YakitButton>
                    <YakitButton size='max' onClick={handleDownload}>
                        立即更新
                    </YakitButton>
                </>
            )
        }
        if (status === "install") {
            return (
                <YakitButton loading={breakLoading} size='max' type='outline2' onClick={yakitBreak}>
                    取消
                </YakitButton>
            )
        }
        if (status === "installed") {
            return (
                <>
                    <YakitButton size='max' type='outline2' onClick={handleCancel}>
                        取消
                    </YakitButton>
                    <YakitButton size='max' onClick={yakitUpdate}>
                        确定
                    </YakitButton>
                </>
            )
        }
        return null
    }, [status, breakLoading])

    return (
        <YakitHint
            getContainer={document.getElementById("yakit-uilayout-body") || undefined}
            footer={null}
            visible={visible}
            title={title}
        >
            <div className={styles["update-yakit-hint"]}>
                {status === "ready" && (
                    <div className={styles["content"]}>
                        <div
                            className={styles["hint-right-content"]}
                        >{`${getReleaseEditionName()} ${latest} 更新说明 :`}</div>
                        <div className={styles["hint-right-update-content"]}>
                            {yakitContent.length === 0
                                ? "管理员未编辑更新通知"
                                : yakitContent.map((item, index) => {
                                      return <div key={`${item}-${index}`}>{item}</div>
                                  })}
                        </div>
                    </div>
                )}

                {status === "installed" && (
                    <div className={styles["content"]}>
                        <div className={styles["hint-right-content"]}>
                            安装需关闭软件，双击安装包即可安装完成，是否立即安装？
                        </div>
                    </div>
                )}

                {status === "install" && (
                    <div className={styles["content"]}>
                        <div className={styles["download-progress"]}>
                            <Progress
                                strokeColor='#F28B44'
                                trailColor='#F0F2F5'
                                percent={Math.floor((yakitProgress?.percent || 0) * 100)}
                            />
                        </div>
                        <div className={styles["download-info-wrapper"]}>
                            <div>剩余时间 : {(yakitProgress?.time.remaining || 0).toFixed(2)}s</div>
                            <div className={styles["divider-wrapper"]}></div>
                            <div>耗时 : {(yakitProgress?.time.elapsed || 0).toFixed(2)}s</div>
                            <div className={styles["divider-wrapper"]}></div>
                            <div>
                                下载速度 : {((yakitProgress?.speed || 0) / 1000000).toFixed(2)}
                                M/s
                            </div>
                        </div>
                    </div>
                )}

                <div className={styles["footer"]}>
                    <div>{extraBtn}</div>
                    <div className={styles["btn-group"]}>{footerBtn}</div>
                </div>
            </div>
        </YakitHint>
    )
})

interface UpdateYakHintProps {
    current: string
    buildIn: string
    visible: boolean
    onCallback: (result: boolean) => void
}
/** 引擎更新弹框-更新为内置版本引擎 */
export const UpdateYakHint: React.FC<UpdateYakHintProps> = React.memo((props) => {
    const {current, buildIn, visible, onCallback} = props

    useEffect(() => {
        if (visible) {
            return () => {
                setUpdateLoading(false)
            }
        }
    }, [visible])

    const handleCancel = useMemoizedFn(() => {
        onCallback(false)
    })

    const [updateLoading, setUpdateLoading] = useState<boolean>(false)

    /** 立即更新成内置引擎 */
    const yakitUpdate = useMemoizedFn(() => {
        if (updateLoading) return

        setUpdateLoading(true)
        ipcRenderer
            .invoke("InitBuildInEngine", {})
            .then(() => {
                info(`解压内置引擎成功`)
                onCallback(true)
            })
            .catch((e) => {
                failed(`初始化内置引擎失败：${e}`)
            })
            .finally(() => setTimeout(() => setUpdateLoading(false), 300))
    })

    return (
        <YakitHint
            getContainer={document.getElementById("yakit-uilayout-body") || undefined}
            title={"检测到引擎版本低于内置版本"}
            content={
                <div>
                    当前引擎低于建议版本将会导致软件部分功能使用出现异常!!!
                    <div>当前版本 : {current}</div>
                    <div>建议版本 : {buildIn}</div>
                </div>
            }
            visible={visible}
            okButtonText='立即更新'
            okButtonProps={{loading: updateLoading}}
            cancelButtonText='忽略'
            cancelButtonProps={{style: {display: updateLoading ? "none" : ""}}}
            onOk={yakitUpdate}
            onCancel={handleCancel}
        />
    )
})
