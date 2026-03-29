import React, {useEffect, useMemo, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {Progress} from "antd"
import {DownloadingState, YakitSettingCallbackType, YakitStatusType, YaklangEngineMode} from "@/yakitGVDefine"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {setLocalValue} from "@/utils/kv"
import {failed, info, success} from "@/utils/notification"
import {getReleaseEditionName, isEnterpriseEdition, isIRify, isMemfit} from "@/utils/envfile"
import {UpdateContentProp} from "../FuncDomain"
import {NetWorkApi} from "@/services/fetch"
import {LocalGVS} from "@/enums/localGlobal"
import {safeFormatDownloadProcessState} from "../utils"
import {API} from "@/services/swagger/resposeType"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import i18n from "@/i18n/i18n"

import styles from "./UpdateYakitAndYaklang.module.scss"
import {JSONParseLog} from "@/utils/tool"

const {ipcRenderer} = window.require("electron")
const t = i18n.getFixedT(null, "layout")

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
            url: "yak/versions/info",
            params: {
                source: isIRify() ? "irify" : "yakit"
            }
        })
            .then((res: API.YakVersionsInfoResponse) => {
                if (!res) return
                const data = res.data || []
                try {
                    data.forEach((item) => {
                        if (item.type === "yakit") {
                            const content: UpdateContentProp = JSONParseLog(item.content, {
                                page: "UpdateYakitAndYaklang",
                                fun: "fetchYakitUpdateContent"
                            })
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
            .invoke("download-latest-yakit", version, {
                isEnterprise: isEnterpriseEdition(),
                isIRify: isIRify(),
                isMemfit: isMemfit()
            })
            .then(() => {
                success(t("UpdateYakitAndYaklang.downloadCompleted"))
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
                failed(t("UpdateYakitAndYaklang.downloadFailed", {error: String(e)}))
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
        if (status === "ready") return t("UpdateYakitAndYaklang.detectedUpdate", {edition: getReleaseEditionName()})
        if (status === "install") return t("UpdateYakitAndYaklang.downloading", {edition: getReleaseEditionName()})
        if (status === "installed") return t("UpdateYakitAndYaklang.downloadSuccess", {edition: getReleaseEditionName()})
        return t("UpdateYakitAndYaklang.unexpectedError")
    }, [status])

    const extraBtn = useMemo(() => {
        if (status === "ready") {
            return (
                <YakitButton size='max' type='outline2' onClick={noHint}>
                    {t("UpdateYakitAndYaklang.dontAskAgain")}
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
                        {t("UpdateYakitAndYaklang.later")}
                    </YakitButton>
                    <YakitButton size='max' onClick={handleDownload}>
                        {t("UpdateYakitAndYaklang.updateNow")}
                    </YakitButton>
                </>
            )
        }
        if (status === "install") {
            return (
                <YakitButton loading={breakLoading} size='max' type='outline2' onClick={yakitBreak}>
                    {t("UpdateYakitAndYaklang.cancel")}
                </YakitButton>
            )
        }
        if (status === "installed") {
            return (
                <>
                    <YakitButton size='max' type='outline2' onClick={handleCancel}>
                    {t("UpdateYakitAndYaklang.cancel")}
                    </YakitButton>
                    <YakitButton size='max' onClick={yakitUpdate}>
                        {t("UpdateYakitAndYaklang.ok")}
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
                        >{t("UpdateYakitAndYaklang.updateNotesTitle", {edition: getReleaseEditionName(), latest})}</div>
                        <div className={styles["hint-right-update-content"]}>
                            {yakitContent.length === 0
                                ? t("UpdateYakitAndYaklang.noUpdateNotice")
                                : yakitContent.map((item, index) => {
                                      return <div key={`${item}-${index}`}>{item}</div>
                                  })}
                        </div>
                    </div>
                )}

                {status === "installed" && (
                    <div className={styles["content"]}>
                        <div className={styles["hint-right-content"]}>
                            {t("UpdateYakitAndYaklang.installPrompt")}
                        </div>
                    </div>
                )}

                {status === "install" && (
                    <div className={styles["content"]}>
                        <Progress
                            strokeColor='var(--Colors-Use-Main-Primary)'
                            trailColor='var(--Colors-Use-Neutral-Bg)'
                            percent={Math.floor((yakitProgress?.percent || 0) * 100)}
                        />
                        <div className={styles["download-info-wrapper"]}>
                            <div>{t("UpdateYakitAndYaklang.remainingTime", {time: (yakitProgress?.time.remaining || 0).toFixed(2)})}</div>
                            <div className={styles["divider-wrapper"]}></div>
                            <div>{t("UpdateYakitAndYaklang.elapsedTime", {time: (yakitProgress?.time.elapsed || 0).toFixed(2)})}</div>
                            <div className={styles["divider-wrapper"]}></div>
                            <div>
                                {t("UpdateYakitAndYaklang.downloadSpeed", {speed: ((yakitProgress?.speed || 0) / 1000000).toFixed(2)})}
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
    setOldLink: (v: boolean) => any
    openEngineLinkWin: (type: YakitSettingCallbackType | YaklangEngineMode | YakitStatusType) => any
    setYakitStatus: (v: YakitStatusType) => any
}
/** 引擎更新弹框-更新为内置版本引擎 */
export const UpdateYakHint: React.FC<UpdateYakHintProps> = React.memo((props) => {
    const {current, buildIn, visible, onCallback, setOldLink, openEngineLinkWin, setYakitStatus} = props

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
            .invoke("RestoreEngineAndPlugin", {})
            .then(() => {
                info(t("InstallEngine.unpackBuiltinEngineSuccess"))
                ipcRenderer.invoke("write-engine-key-to-yakit-projects").finally(() => {
                    // onCallback(true)
                    setYakitStatus("")
                    setOldLink(false)
                    openEngineLinkWin("local")
                })
            })
            .catch((e) => {
                failed(t("InstallEngine.initBuiltinEngineFailed", {error: String(e)}))
            })
            .finally(() => setTimeout(() => setUpdateLoading(false), 300))
    })

    return (
        <YakitHint
            getContainer={document.getElementById("yakit-uilayout-body") || undefined}
            title={t("UpdateYakitAndYaklang.enginePrompt")}
            content={
                <div>
                    {t("UpdateYakitAndYaklang.switchToBuiltin")}
                    <div className={styles["version-wrapper"]}>
                        <div className={styles["version-header"]}>
                            {t("UpdateYakitAndYaklang.localVersion")} <span>:</span>
                        </div>
                        {current}
                    </div>
                    <div style={{fontWeight: 500}} className={styles["version-wrapper"]}>
                        <div className={styles["version-header"]}>
                            {t("UpdateYakitAndYaklang.builtinVersion")} <span>:</span>
                        </div>
                        {buildIn}
                    </div>
                </div>
            }
            visible={visible}
            okButtonText={t("UpdateYakitAndYaklang.ok")}
            okButtonProps={{loading: updateLoading}}
            cancelButtonText={t("UpdateYakitAndYaklang.ignore")}
            cancelButtonProps={{style: {display: updateLoading ? "none" : ""}}}
            onOk={yakitUpdate}
            onCancel={handleCancel}
        />
    )
})
