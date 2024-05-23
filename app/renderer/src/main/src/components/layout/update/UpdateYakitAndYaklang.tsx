import React, {useEffect, useMemo, useRef, useState} from "react"
import {useGetState, useMemoizedFn} from "ahooks"
import {YaklangInstallHintSvgIcon} from "../icons"
import {Progress} from "antd"
import {DownloadingState} from "@/yakitGVDefine"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {setLocalValue} from "@/utils/kv"
import {failed, success} from "@/utils/notification"
import {getReleaseEditionName, isEnterpriseEdition} from "@/utils/envfile"
import {FetchUpdateContentProp, UpdateContentProp} from "../FuncDomain"
import {NetWorkApi} from "@/services/fetch"
import {LocalGVS} from "@/enums/localGlobal"
import {safeFormatDownloadProcessState} from "../utils"
import {API} from "@/services/swagger/resposeType"
import classNames from "classnames"
import styles from "./UpdateYakitAndYaklang.module.scss"

const {ipcRenderer} = window.require("electron")

export interface UpdateYakitAndYaklangProps {
    currentYakit: string
    latestYakit: string
    setLatestYakit: (val: string) => any
    currentYaklang: string
    latestYaklang: string
    setLatestYaklang: (val: string) => any
    isShow: boolean
    onCancel: () => any
}

export const UpdateYakitAndYaklang: React.FC<UpdateYakitAndYaklangProps> = React.memo((props) => {
    const {
        currentYakit,
        latestYakit,
        setLatestYakit,
        currentYaklang,
        latestYaklang,
        setLatestYaklang,
        isShow,
        onCancel
    } = props

    const [yakitProgress, setYakitProgress, getYakitProgress] = useGetState<DownloadingState>()
    const isYakitBreak = useRef<boolean>(false)
    const [yaklangProgress, setYaklangProgress, getYaklangProgress] = useGetState<DownloadingState>()
    const isYaklangBreak = useRef<boolean>(false)

    const [installYakit, setInstallYakit] = useState<boolean>(false)
    const [installedYakit, setInstalledYakit] = useState<boolean>(false)
    const [yakitLoading, setYakitLoading] = useState<boolean>(false)
    const [installYaklang, setInstallYaklang] = useState<boolean>(false)
    const [yaklangLoading, setYaklangLoading] = useState<boolean>(false)

    const [yakitUpdateContent, setYakitUpdateContent] = useState<UpdateContentProp>({
        version: "",
        content: ""
    })
    const [yaklangUpdateContent, setYaklangUpdateContent] = useState<UpdateContentProp>({
        version: "",
        content: ""
    })

    const removePrefixV = (version: string) => {
        return version.startsWith('v') ? version.slice(1) : version
    }

    const yakitContent: string[] = useMemo(() => {
        if (!yakitUpdateContent.content) return []
        if (removePrefixV(yakitUpdateContent.version) !== removePrefixV(latestYakit)) return []
        if (yakitUpdateContent.content) {
            return yakitUpdateContent.content.split("\n")
        }
        return []
    }, [yakitUpdateContent])
    const yaklangContent: string[] = useMemo(() => {
        if (!yaklangUpdateContent.content) return []
        if (removePrefixV(yaklangUpdateContent.version) !== removePrefixV(latestYaklang)) return []
        if (yaklangUpdateContent.content) {
            return yaklangUpdateContent.content.split("\n")
        }
        return []
    }, [yaklangUpdateContent])

    const fetchYakitAndYaklangVersionInfo = useMemoizedFn(() => {
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
                            if (removePrefixV(content.version) === removePrefixV(latestYakit)) {
                                setYakitUpdateContent({...content})
                            }
                        } else if (item.type === "yaklang") {
                            const content: UpdateContentProp = JSON.parse(item.content)
                            if (removePrefixV(content.version) === removePrefixV(latestYaklang)) {
                                setYaklangUpdateContent({...content})
                            }
                        }
                    })
                } catch (error) {}
            })
            .catch((err) => {})
    })

    useEffect(() => {
        if (latestYakit && latestYaklang) fetchYakitAndYaklangVersionInfo()
    }, [latestYakit, latestYaklang])

    useEffect(() => {
        ipcRenderer.on("download-yakit-engine-progress", (e: any, state: DownloadingState) => {
            if (isYakitBreak.current) return
            setYakitProgress(safeFormatDownloadProcessState(state))
        })

        ipcRenderer.on("download-yak-engine-progress", (e: any, state: DownloadingState) => {
            if (isYaklangBreak.current) return
            setYaklangProgress(safeFormatDownloadProcessState(state))
        })

        return () => {
            ipcRenderer.removeAllListeners("download-yakit-engine-progress")
            ipcRenderer.removeAllListeners("download-yak-engine-progress")
        }
    }, [])

    const isShowYakit = useMemo(() => {
        if (!isShow) return false
        if (!currentYakit || !latestYakit) return false
        if (removePrefixV(currentYakit) !== removePrefixV(latestYakit)) return true
        return false
    }, [currentYakit, latestYakit, isShow])
    const isShowYaklang = useMemo(() => {
        if (!isShow) return false
        if (!currentYaklang || !latestYaklang) return false
        if (removePrefixV(currentYaklang) !== removePrefixV(latestYaklang)) return true
        return false
    }, [currentYaklang, latestYaklang, isShow])

    /** 不再提示 */
    const noHint = () => {
        setLocalValue(LocalGVS.NoAutobootLatestVersionCheck, true)
        setLatestYakit("")
        setLatestYaklang("")
        onCancel()
    }

    const yakitLater = useMemoizedFn(() => {
        setLatestYakit("")
        if (!isShowYaklang) onCancel()
    })
    const yaklangLater = useMemoizedFn(() => {
        setLatestYaklang("")
        onCancel()
    })

    const yakitDownload = () => {
        let version = latestYakit
        if (version.startsWith("v")) version = version.slice(1)
        isYakitBreak.current = false
        setInstallYakit(true)
        ipcRenderer
            .invoke("download-latest-yakit", version, isEnterpriseEdition())
            .then(() => {
                if (isYakitBreak.current) return
                success("下载完毕")
                if (!getYakitProgress()?.size) return
                setYakitProgress({
                    time: {
                        elapsed: getYakitProgress()?.time.elapsed || 0,
                        remaining: 0
                    },
                    speed: 0,
                    percent: 100,
                    // @ts-ignore
                    size: getYakitProgress().size
                })
                setInstallYakit(false)
                setInstalledYakit(true)
            })
            .catch((e: any) => {
                if (isYakitBreak.current) return
                failed(`下载失败: ${e}`)
                setYakitProgress(undefined)
                setInstallYakit(false)
            })
    }
    const yakitBreak = useMemoizedFn(() => {
        setYakitLoading(true)
        isYakitBreak.current = true
        setInstallYakit(false)
        setYakitProgress(undefined)
        yakitLater()
        setTimeout(() => {
            setYakitLoading(false)
        }, 300)
    })
    const yakitUpdate = useMemoizedFn(() => {
        ipcRenderer.invoke("open-yakit-path")
        setTimeout(() => {
            ipcRenderer.invoke("UIOperate", "close")
        }, 100)
    })

    const yaklangDownload = useMemoizedFn(async () => {
        isYaklangBreak.current = false
        let version = latestYaklang
        if (version.startsWith("v")) version = version.slice(1)
        try {
            const res = await ipcRenderer.invoke("yak-engine-version-exists-and-correctness", version)
            if (res === true) {
                yaklangUpdate()
            } else {
                realDownloadYaklang(version)
            }
        } catch (error) {
            realDownloadYaklang(version)
        }
    })
    const realDownloadYaklang = (version: string) => {
        setInstallYaklang(true)
        ipcRenderer
            .invoke("download-latest-yak", version)
            .then(() => {
                if (isYaklangBreak.current) return

                success("下载完毕")
                if (!getYaklangProgress()?.size) return
                setYaklangProgress({
                    time: {
                        elapsed: getYaklangProgress()?.time.elapsed || 0,
                        remaining: 0
                    },
                    speed: 0,
                    percent: 100,
                    // @ts-ignore
                    size: getYaklangProgress().size
                })
                yaklangUpdate()
            })
            .catch((e: any) => {
                if (isYaklangBreak.current) return
                failed(`引擎下载失败: ${e}`)
                setInstallYaklang(false)
                setYaklangProgress(undefined)
            })
    }
    const yaklangBreak = useMemoizedFn(() => {
        let version = latestYaklang
        if (version.startsWith("v")) version = version.slice(1)
        ipcRenderer.invoke("cancel-download-yak-engine-version", version)
    
        setYaklangLoading(true)
        isYaklangBreak.current = true
        setInstallYaklang(false)
        setYaklangProgress(undefined)
        yaklangLater()
        setTimeout(() => {
            setYaklangLoading(false)
        }, 300)
    })
    const yaklangUpdate = useMemoizedFn(() => {
        // 清空主进程yaklang版本缓存
        ipcRenderer.invoke("clear-local-yaklang-version-cache")
        let version = latestYaklang
        if (version.startsWith("v")) version = version.slice(1)
        ipcRenderer
            .invoke("install-yak-engine", version)
            .then(() => {
                success(`安装成功，如未生效，重启 ${getReleaseEditionName()} 即可`)
            })
            .catch((err: any) => {
                failed(
                    `安装失败: ${
                        err.message.indexOf("operation not permitted") > -1 ? "请关闭引擎后重启软件尝试" : err
                    }`
                )
            })
            .finally(() => {
                setTimeout(() => {
                    yaklangLater()
                }, 50);
            })
    })

    return (
        <div className={isShow ? styles["update-mask"] : styles["hidden-update-mask"]}>
            <div
                className={classNames(
                    styles["yaklang-update-modal"],
                    isShowYakit ? styles["engine-hint-modal-wrapper"] : styles["modal-hidden-wrapper"]
                )}
            >
                <div className={styles["modal-yaklang-engine-hint"]}>
                    <div className={styles["yaklang-engine-hint-wrapper"]}>
                        <div className={styles["hint-left-wrapper"]}>
                            <div className={styles["hint-icon"]}>
                                <YaklangInstallHintSvgIcon />
                            </div>
                        </div>

                        <div className={styles["hint-right-wrapper"]}>
                            {installedYakit ? (
                                <>
                                    <div className={styles["hint-right-title"]}>{getReleaseEditionName()} 下载成功</div>
                                    <div className={styles["hint-right-content"]}>
                                        安装需关闭软件，双击安装包即可安装完成，是否立即安装？
                                    </div>

                                    <div className={styles["hint-right-btn"]}>
                                        <div></div>
                                        <div className={styles["btn-group-wrapper"]}>
                                            <YakitButton size='max' type='outline2' onClick={yakitLater}>
                                                取消
                                            </YakitButton>
                                            <YakitButton size='max' onClick={yakitUpdate}>
                                                确定
                                            </YakitButton>
                                        </div>
                                    </div>
                                </>
                            ) : installYakit ? (
                                <div className={styles["hint-right-download"]}>
                                    <div className={styles["hint-right-title"]}>Yakit下载中...</div>
                                    <div className={styles["download-progress"]}>
                                        <Progress
                                            strokeColor='#F28B44'
                                            trailColor='#F0F2F5'
                                            percent={Math.floor((yakitProgress?.percent || 0) * 100)}
                                        />
                                    </div>
                                    <div className={styles["download-info-wrapper"]}>
                                        <div>剩余时间 : {(yakitProgress?.time.remaining || 0).toFixed(2)}s</div>
                                        <div className={styles["divider-wrapper"]}>
                                            <div className={styles["divider-style"]}></div>
                                        </div>
                                        <div>耗时 : {(yakitProgress?.time.elapsed || 0).toFixed(2)}s</div>
                                        <div className={styles["divider-wrapper"]}>
                                            <div className={styles["divider-style"]}></div>
                                        </div>
                                        <div>
                                            下载速度 : {((yakitProgress?.speed || 0) / 1000000).toFixed(2)}
                                            M/s
                                        </div>
                                    </div>
                                    <div className={styles["download-btn"]}>
                                        <YakitButton
                                            loading={yakitLoading}
                                            size='max'
                                            type='outline2'
                                            onClick={yakitBreak}
                                        >
                                            取消
                                        </YakitButton>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className={styles["hint-right-title"]}>
                                        检测到 {getReleaseEditionName()} 版本升级
                                    </div>
                                    <div className={styles["hint-right-content"]}>
                                        {`${getReleaseEditionName()} ${latestYakit} 更新说明 :`}
                                    </div>
                                    <div className={styles["hint-right-update-content"]}>
                                        {yakitContent.length === 0
                                            ? "管理员未编辑更新通知"
                                            : yakitContent.map((item, index) => {
                                                  return <div key={`${item}-${index}`}>{item}</div>
                                              })}
                                    </div>

                                    <div className={styles["hint-right-btn"]}>
                                        <div>
                                            <YakitButton size='max' type='outline2' onClick={noHint}>
                                                不再提示
                                            </YakitButton>
                                        </div>
                                        <div className={styles["btn-group-wrapper"]}>
                                            <YakitButton size='max' type='outline2' onClick={yakitLater}>
                                                稍后再说
                                            </YakitButton>
                                            <YakitButton size='max' onClick={yakitDownload}>
                                                立即更新
                                            </YakitButton>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div
                className={classNames(
                    styles["yaklang-update-modal"],
                    isShowYaklang && !isShowYakit ? styles["engine-hint-modal-wrapper"] : styles["modal-hidden-wrapper"]
                )}
            >
                <div className={styles["modal-yaklang-engine-hint"]}>
                    <div className={styles["yaklang-engine-hint-wrapper"]}>
                        <div className={styles["hint-left-wrapper"]}>
                            <div className={styles["hint-icon"]}>
                                <YaklangInstallHintSvgIcon />
                            </div>
                        </div>

                        <div className={styles["hint-right-wrapper"]}>
                            {installYaklang ? (
                                <div className={styles["hint-right-download"]}>
                                    <div className={styles["hint-right-title"]}>引擎下载中...</div>
                                    <div className={styles["download-progress"]}>
                                        <Progress
                                            strokeColor='#F28B44'
                                            trailColor='#F0F2F5'
                                            percent={Math.floor((yaklangProgress?.percent || 0) * 100)}
                                        />
                                    </div>
                                    <div className={styles["download-info-wrapper"]}>
                                        <div>剩余时间 : {(yaklangProgress?.time.remaining || 0).toFixed(2)}s</div>
                                        <div className={styles["divider-wrapper"]}>
                                            <div className={styles["divider-style"]}></div>
                                        </div>
                                        <div>耗时 : {(yaklangProgress?.time.elapsed || 0).toFixed(2)}s</div>
                                        <div className={styles["divider-wrapper"]}>
                                            <div className={styles["divider-style"]}></div>
                                        </div>
                                        <div>
                                            下载速度 : {((yaklangProgress?.speed || 0) / 1000000).toFixed(2)}
                                            M/s
                                        </div>
                                    </div>
                                    <div className={styles["download-btn"]}>
                                        <YakitButton
                                            loading={yaklangLoading}
                                            size='max'
                                            type='outline2'
                                            onClick={yaklangBreak}
                                        >
                                            取消
                                        </YakitButton>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className={styles["hint-right-title"]}>检测到引擎版本升级</div>
                                    <div className={styles["hint-right-content"]}>
                                        {/* {`当前版本：${currentYaklang}`}
                                        <br />
                                        {`最新版本：${latestYaklang}`} */}
                                        {`Yaklang ${latestYaklang} 更新说明 :`}
                                    </div>
                                    <div className={styles["hint-right-update-content"]}>
                                        {yaklangContent.length === 0
                                            ? "管理员未编辑更新通知"
                                            : yaklangContent.map((item, index) => {
                                                  return <div key={`${item}-${index}`}>{item}</div>
                                              })}
                                    </div>

                                    <div className={styles["hint-right-btn"]}>
                                        <div>
                                            <YakitButton size='max' type='outline2' onClick={noHint}>
                                                不再提示
                                            </YakitButton>
                                        </div>
                                        <div className={styles["btn-group-wrapper"]}>
                                            <YakitButton size='max' type='outline2' onClick={yaklangLater}>
                                                稍后再说
                                            </YakitButton>
                                            <YakitButton size='max' onClick={yaklangDownload}>
                                                立即更新
                                            </YakitButton>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
})
