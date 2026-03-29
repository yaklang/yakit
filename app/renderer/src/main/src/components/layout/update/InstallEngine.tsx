import React, {useEffect, useMemo, useRef, useState} from "react"
import {useDebounceEffect, useGetState, useMemoizedFn} from "ahooks"
import {MacUIOpCloseSvgIcon, WinUIOpCloseSvgIcon, YakitCopySvgIcon, YaklangInstallHintSvgIcon} from "../icons"
import {Checkbox, Progress} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import Draggable from "react-draggable"
import type {DraggableEvent, DraggableData} from "react-draggable"
import {DownloadingState, YakitStatusType, YakitSystem} from "@/yakitGVDefine"
import {failed, info, success} from "@/utils/notification"
import {getLocalValue, setLocalValue} from "@/utils/kv"
import {LocalGV} from "@/yakitGV"
import {getReleaseEditionName} from "@/utils/envfile"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {CopyComponents} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {safeFormatDownloadProcessState} from "../utils"
import {OutlineQuestionmarkcircleIcon} from "@/assets/icon/outline"
import {grpcFetchBuildInYakVersion, grpcFetchLatestOSSDomain, grpcFetchLatestYakVersion} from "@/apiUtils/grpc"
import emiter from "@/utils/eventBus/eventBus"
import {setClipboardText} from "@/utils/clipboard"
import classNames from "classnames"
import styles from "./InstallEngine.module.scss"
import i18n from "@/i18n/i18n"

const {ipcRenderer} = window.require("electron")
const t = i18n.getFixedT(null, "layout")

export interface InstallEngineProps {
    system: YakitSystem
    visible: boolean
    onSuccess: () => any
    onRemoreLink: () => any
    onlyInstallLatestEngine?: boolean
    setYakitStatus: (v: YakitStatusType) => any
}

export const InstallEngine: React.FC<InstallEngineProps> = React.memo((props) => {
    const {system, visible, onSuccess, onRemoreLink = () => {}, onlyInstallLatestEngine = false, setYakitStatus} = props

    /** ---------- 获取操作系统和架构 & 内置引擎相关 Start ---------- */
    const [platformArch, setPlatformArch] = useState<string>("")

    const [buildInEngineVersion, setBuildInEngineVersion] = useState("")
    const haveBuildInEngine = useMemo(() => {
        return buildInEngineVersion !== ""
    }, [buildInEngineVersion])

    useEffect(() => {
        ipcRenderer.invoke("fetch-system-and-arch").then((e: string) => setPlatformArch(e))
        grpcFetchBuildInYakVersion(true)
            .then((ver) => setBuildInEngineVersion(ver))
            .catch(() => {})
    }, [])

    const [extractingBuildInEngine, setExtractingBuildInEngine] = useState(false)
    const initBuildInEngine = useMemoizedFn(() => {
        setExtractingBuildInEngine(true)
        ipcRenderer
            .invoke("RestoreEngineAndPlugin", {})
            .then(() => {
                ipcRenderer.invoke("write-engine-key-to-yakit-projects").finally(() => {
                    info(t("InstallEngine.unpackBuiltinEngineSuccess"))
                    showYakitModal({
                        closable: false,
                        maskClosable: false,
                        keyboard: false,
                        type: "white",
                        title: t("InstallEngine.unpackNeedRestart"),
                        content: (
                            <div className={styles["relaunch-hint"]}>
                                <YakitButton
                                    onClick={() => {
                                        ipcRenderer
                                            .invoke("relaunch")
                                            .then(() => {})
                                            .catch((e) => {
                                                failed(t("InstallEngine.restartFailed", {error: String(e)}))
                                            })
                                    }}
                                >
                                    {t("InstallEngine.restartNow")}
                                </YakitButton>
                            </div>
                        ),
                        footer: null
                    })
                })
            })
            .catch((e) => {
                failed(t("InstallEngine.initBuiltinEngineFailed", {error: String(e)}))
            })
            .finally(() => setTimeout(() => setExtractingBuildInEngine(false), 300))
    })
    /** ---------- 获取操作系统和架构 & 判断是否有内置引擎 End ---------- */

    /** ---------- 下载状态信息 Start ---------- */
    const [downloadProgress, setDownloadProgress, getDownloadProgress] = useGetState<DownloadingState>()

    useEffect(() => {
        ipcRenderer.on("download-yak-engine-progress", (e: any, state: DownloadingState) => {
            if (isBreakDownload.current) return
            setDownloadProgress(safeFormatDownloadProcessState(state))
        })
        return () => {
            ipcRenderer.removeAllListeners("download-yak-engine-progress")
        }
    }, [])

    /** ---------- 下载状态信息 End ---------- */

    /** ---------- 弹窗拖拽 & 多窗口位置 Start ---------- */
    const [disabled, setDisabled] = useState(true)
    const [bounds, setBounds] = useState({left: 0, top: 0, bottom: 0, right: 0})
    const draggleRef = useRef<HTMLDivElement>(null)

    /** 弹窗拖拽移动触发事件 */
    const onStart = useMemoizedFn((_event: DraggableEvent, uiData: DraggableData) => {
        const {clientWidth, clientHeight} = window.document.documentElement
        const targetRect = draggleRef.current?.getBoundingClientRect()
        if (!targetRect) return

        setBounds({
            left: -targetRect.left + uiData.x,
            right: clientWidth - (targetRect.right - uiData.x),
            top: -targetRect.top + uiData.y + 36,
            bottom: clientHeight - (targetRect.bottom - uiData.y)
        })
    })

    // 弹窗置顶
    const [isTop, setIsTop] = useState<0 | 1 | 2>(0)
    // 弹窗置顶
    const [agrShow, setAgrShow] = useState<boolean>(false)
    // 弹窗置顶
    const [qsShow, setQSShow] = useState<boolean>(false)
    /** ---------- 弹窗拖拽 & 多窗口位置 End ---------- */

    /** 用户协议勾选状态 */
    const [agrCheck, setAgrCheck] = useState<boolean>(false)
    /** 执行一键安装功能时判断用户协议状态 */
    const [checkStatus, setCheckStatus] = useState<boolean>(false)
    /** 展示抖动动画 */
    const [isShake, setIsShake] = useState<boolean>(false)
    useEffect(() => {
        getLocalValue(LocalGV.IsCheckedUserAgreement).then((val: boolean) => {
            setAgrCheck(val)
        })
    }, [])
    useDebounceEffect(
        () => {
            if (agrCheck) {
                setLocalValue(LocalGV.IsCheckedUserAgreement, true)
            }
        },
        [agrCheck],
        {wait: 500}
    )

    const [install, setInstall] = useState<boolean>(onlyInstallLatestEngine)
    useEffect(() => {
        if (onlyInstallLatestEngine) {
            installEngine()
        }
    }, [onlyInstallLatestEngine])

    /** 远端最新yaklang引擎版本 */
    const latestVersionRef = useRef<string>("")

    /** 是否中断下载记录 */
    const [cancelLoading, setCancelLoading] = useState<boolean>(false)
    const isBreakDownload = useRef<boolean>(false)

    const checkEngineDownloadLatestVersionCancel = () => {
        // 发送到localEngine校验处
        if (onlyInstallLatestEngine) {
            emiter.emit("checkEngineDownloadLatestVersionCancel")
            setYakitStatus("")
        }
    }

    /** 取消事件 */
    const onClose = useMemoizedFn(() => {
        setCancelLoading(true)
        isBreakDownload.current = true
        setDownloadProgress(undefined)
        ipcRenderer.invoke("cancel-download-yak-engine-version", latestVersionRef.current)
        setTimeout(() => {
            setInstall(false)
            setCancelLoading(false)
            checkEngineDownloadLatestVersionCancel()
        }, 500)
    })
    /** 取消下载事件 */
    const onInstallClose = useMemoizedFn(() => {
        isBreakDownload.current = false
        if (downloadProgress) setDownloadProgress(undefined)
        if (install) setInstall(false)
    })

    /** 获取引擎线上最新版本 */
    const fetchEngineLatestVersion = useMemoizedFn((callback?: () => any) => {
        grpcFetchLatestYakVersion()
            .then((data: string) => {
                if (isBreakDownload.current) return
                latestVersionRef.current = data
                if (callback) callback()
            })
            .catch((e: any) => {
                onInstallClose()
                checkEngineDownloadLatestVersionCancel()
            })
    })

    const downloadEngine = useMemoizedFn(async () => {
        try {
            const res = await ipcRenderer.invoke("yak-engine-version-exists-and-correctness", latestVersionRef.current)
            if (res === true) {
                yaklangUpdate()
            } else {
                realDownloadYaklang()
            }
        } catch (error) {
            realDownloadYaklang()
        }
    })
    const realDownloadYaklang = () => {
        setInstall(true)
        ipcRenderer
            .invoke("download-latest-yak", `${latestVersionRef.current}`)
            .then(() => {
                if (isBreakDownload.current) return

                if (!getDownloadProgress()?.size) return
                setDownloadProgress({
                    time: {
                        elapsed: downloadProgress?.time.elapsed || 0,
                        remaining: 0
                    },
                    speed: 0,
                    percent: 100,
                    // @ts-ignore
                    size: getDownloadProgress().size
                })
                success(t("InstallEngine.downloadCompleted"))
                yaklangUpdate()
            })
            .catch((e: any) => {
                if (isBreakDownload.current) return
                failed(t("InstallEngine.downloadFailed", {error: String(e)}))
                onInstallClose()
                checkEngineDownloadLatestVersionCancel()
            })
    }
    const yaklangUpdate = () => {
        // 清空主进程yaklang版本缓存
        ipcRenderer.invoke("clear-local-yaklang-version-cache")
        /** 安装yaklang引擎 */
        ipcRenderer
            .invoke("install-yak-engine", `${latestVersionRef.current}`)
            .then(() => {
                if (isBreakDownload.current) return
                success(t("InstallEngine.installSuccess", {edition: getReleaseEditionName()}))
                onSuccess()
            })
            .catch((err: any) => {
                failed(t("InstallEngine.installFailed", {error: String(err)}))
                onInstallClose()
                if (err.message === "operation not permitted") {
                    checkEngineDownloadLatestVersionCancel()
                }
            })
    }

    /** 一键安装事件 */
    const installEngine = useMemoizedFn(() => {
        // 只是安装引擎 其余操作不需要
        if (!onlyInstallLatestEngine) {
            setCheckStatus(true)
            if (!agrCheck) {
                /** 抖动提示动画 */
                setIsShake(true)
                setTimeout(() => setIsShake(false), 1000)
                return
            }
        }
        isBreakDownload.current = false

        fetchEngineLatestVersion(() => downloadEngine())
    })

    /** 远程连接 */
    const remoteLink = useMemoizedFn(() => {
        setCheckStatus(true)
        if (!agrCheck) {
            setIsShake(true)
            setTimeout(() => setIsShake(false), 1000)
            return
        }
        onRemoreLink()
    })

    return (
        <div className={visible ? styles["install-engine-mask"] : styles["hidden-wrapper"]}>
            <Draggable
                defaultClassName={classNames(styles["install-update-modal"], styles["modal-wrapper"], {
                    [styles["modal-top-wrapper"]]: isTop === 0
                })}
                disabled={disabled}
                bounds={bounds}
                onStart={(event, uiData) => onStart(event, uiData)}
            >
                <div ref={draggleRef}>
                    <div className={styles["modal-yaklang-engine-hint"]} onClick={() => setIsTop(0)}>
                        <div className={styles["yaklang-engine-hint-wrapper"]}>
                            <div
                                className={styles["hint-draggle-body"]}
                                onMouseEnter={() => {
                                    if (disabled) setDisabled(false)
                                }}
                                onMouseLeave={() => setDisabled(true)}
                                onMouseDown={() => setIsTop(0)}
                            ></div>

                            <div className={styles["hint-left-wrapper"]}>
                                <div className={styles["hint-icon"]}>
                                    <YaklangInstallHintSvgIcon />
                                </div>
                                <div
                                    className={styles["qs-icon"]}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setQSShow(true)
                                        setIsTop(2)
                                    }}
                                >
                                    <OutlineQuestionmarkcircleIcon />
                                </div>
                            </div>

                            <div className={styles["hint-right-wrapper"]}>
                                {install ? (
                                    <div
                                        className={classNames(styles["hint-right-download"], "yakit-progress-wrapper")}
                                    >
                                        <div className={styles["hint-right-title"]}>{t("InstallEngine.installing")}</div>
                                        <Progress
                                            strokeColor='var(--Colors-Use-Main-Primary)'
                                            trailColor='var(--Colors-Use-Neutral-Bg)'
                                            percent={Math.floor((downloadProgress?.percent || 0) * 100)}
                                        />
                                        <div className={styles["download-info-wrapper"]}>
                                            <div>{t("InstallEngine.remainingTime", {time: (downloadProgress?.time.remaining || 0).toFixed(2)})}</div>
                                            <div className={styles["divider-wrapper"]}>
                                                <div className={styles["divider-style"]}></div>
                                            </div>
                                            <div>{t("InstallEngine.elapsedTime", {time: (downloadProgress?.time.elapsed || 0).toFixed(2)})}</div>
                                            <div className={styles["divider-wrapper"]}>
                                                <div className={styles["divider-style"]}></div>
                                            </div>
                                            <div>
                                                {t("InstallEngine.downloadSpeed", {speed: ((downloadProgress?.speed || 0) / 1000000).toFixed(2)})}
                                            </div>
                                        </div>
                                        <div className={styles["download-btn"]}>
                                            <YakitButton
                                                loading={cancelLoading}
                                                size='max'
                                                type='outline2'
                                                onClick={onClose}
                                            >
                                                {t("InstallEngine.cancel")}
                                            </YakitButton>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className={styles["hint-right-title"]}>
                                            {haveBuildInEngine ? t("InstallEngine.localEngineNotInitialized") : t("InstallEngine.engineNotInstalled")}
                                        </div>
                                        <div className={styles["hint-right-content"]}>
                                            {haveBuildInEngine
                                                ? t("InstallEngine.authorizedBuiltinEngine", {version: buildInEngineVersion})
                                                : t("InstallEngine.chooseInstallOrRemote")}
                                        </div>

                                        {platformArch === "darwin-arm64" && (
                                            <div className={styles["hint-right-macarm"]}>
                                                <div>
                                                    <div className={styles["mac-arm-hint"]}>
                                                        {t("InstallEngine.currentSystemDarwinArm64")}
                                                        <br />
                                                        {t("InstallEngine.rosettaRequired")}
                                                        <br />
                                                        {t("InstallEngine.rosettaCommandHint")}
                                                    </div>
                                                    <div className={styles["mac-arm-command"]}>
                                                        softwareupdate --install-rosetta
                                                        <CopyComponents
                                                            className={styles["copy-icon"]}
                                                            copyText='softwareupdate --install-rosetta'
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div
                                            className={classNames(styles["hint-right-agreement"], {
                                                [styles["agr-shake-animation"]]: !agrCheck && isShake
                                            })}
                                        >
                                            <Checkbox
                                                className={classNames(
                                                    {[styles["agreement-checkbox"]]: !(!agrCheck && checkStatus)},
                                                    {
                                                        [styles["agreement-danger-checkbox"]]: !agrCheck && checkStatus
                                                    }
                                                )}
                                                checked={agrCheck}
                                                onChange={(e) => setAgrCheck(e.target.checked)}
                                            ></Checkbox>
                                            <span>
                                                {t("InstallEngine.agreeTo")}{" "}
                                                <span
                                                    className={styles["agreement-style"]}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setAgrShow(true)
                                                        setIsTop(1)
                                                    }}
                                                >
                                                    {t("InstallEngine.userAgreement")}
                                                </span>
                                                {t("InstallEngine.toContinue")}
                                            </span>
                                        </div>

                                        <div className={styles["hint-right-btn"]}>
                                            <div>
                                                <YakitButton size='max' type='outline2' onClick={remoteLink}>
                                                    {t("InstallEngine.remoteLink")}
                                                </YakitButton>
                                                {haveBuildInEngine && (
                                                    <YakitPopconfirm
                                                        placement='top'
                                                        title={t("InstallEngine.networkInstallNotice")}
                                                        onConfirm={installEngine}
                                                    >
                                                        <YakitButton
                                                            type={"text"}
                                                            size='small'
                                                            style={{fontSize: 12}}
                                                            disabled={!agrCheck}
                                                        >
                                                            {t("InstallEngine.networkInstall")}
                                                        </YakitButton>
                                                    </YakitPopconfirm>
                                                )}
                                            </div>
                                            <div className={styles["btn-group-wrapper"]}>
                                                <YakitButton
                                                    size='max'
                                                    type='outline2'
                                                    onClick={() => ipcRenderer.invoke("UIOperate", "close")}
                                                >
                                                    {t("InstallEngine.cancel")}
                                                </YakitButton>

                                                {!haveBuildInEngine && (
                                                    // 无内置引擎
                                                    <YakitButton size='max' onClick={installEngine}>
                                                        {t("InstallEngine.oneClickInstall")}
                                                    </YakitButton>
                                                )}
                                                {haveBuildInEngine && (
                                                    // 有内置引擎
                                                    <YakitButton
                                                        size='max'
                                                        loading={extractingBuildInEngine}
                                                        disabled={!agrCheck}
                                                        onClick={initBuildInEngine}
                                                    >
                                                        {t("InstallEngine.initEngine")}
                                                    </YakitButton>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Draggable>
            <AgreementContentModal
                isTop={isTop}
                setIsTop={setIsTop}
                system={system}
                visible={agrShow}
                setVisible={setAgrShow}
            />
            <QuestionModal isTop={isTop} setIsTop={setIsTop} system={system} visible={qsShow} setVisible={setQSShow} />
        </div>
    )
})

interface AgrAndQSModalProps {
    isTop: 0 | 1 | 2
    setIsTop: (type: 0 | 1 | 2) => any
    system: YakitSystem
    visible: boolean
    setVisible: (flag: boolean) => any
}

/** @name 用户协议弹窗 */
const AgreementContentModal: React.FC<AgrAndQSModalProps> = React.memo((props) => {
    const {isTop, setIsTop, system, visible, setVisible} = props

    const [show, setShow] = useState<boolean>(false)

    const [disabled, setDisabled] = useState(true)
    const [bounds, setBounds] = useState({left: 0, top: 0, bottom: 0, right: 0})
    const draggleRef = useRef<HTMLDivElement>(null)

    const onStart = useMemoizedFn((_event: DraggableEvent, uiData: DraggableData) => {
        const {clientWidth, clientHeight} = window.document.documentElement
        const targetRect = draggleRef.current?.getBoundingClientRect()
        if (!targetRect) return

        setBounds({
            left: -targetRect.left + uiData.x,
            right: clientWidth - (targetRect.right - uiData.x),
            top: -targetRect.top + uiData.y + 36,
            bottom: clientHeight - (targetRect.bottom - uiData.y)
        })
    })

    return (
        <Draggable
            defaultClassName={classNames(
                styles["yakit-agr-modal"],
                {[styles["modal-top-wrapper"]]: isTop === 1},
                visible ? styles["modal-wrapper"] : styles["hidden-wrapper"]
            )}
            disabled={disabled}
            bounds={bounds}
            onStart={(event, uiData) => onStart(event, uiData)}
        >
            <div ref={draggleRef}>
                <div className={styles["yakit-info-modal"]} onClick={() => setIsTop(1)}>
                    <div className={styles["agreement-content-modal-wrapper"]}>
                        {system === "Darwin" ? (
                            <div
                                className={classNames(styles["modal-header"], styles["mac-header"])}
                                onMouseEnter={() => {
                                    if (disabled) setDisabled(false)
                                }}
                                onMouseLeave={() => setDisabled(true)}
                                onMouseDown={() => setIsTop(1)}
                            >
                                <div
                                    className={styles["close-wrapper"]}
                                    onMouseEnter={() => setShow(true)}
                                    onMouseLeave={() => setShow(false)}
                                    onClick={() => setVisible(false)}
                                >
                                    {show ? (
                                        <MacUIOpCloseSvgIcon />
                                    ) : (
                                        <div className={styles["close-btn"]}>
                                            <div className={styles["btn-icon"]}></div>
                                        </div>
                                    )}
                                </div>
                                <span>{t("InstallEngine.userAgreement")}</span>
                            </div>
                        ) : (
                            <div
                                className={classNames(styles["modal-header"], styles["win-header"])}
                                onMouseOver={() => {
                                    if (disabled) setDisabled(false)
                                }}
                                onMouseOut={() => setDisabled(true)}
                                onMouseDown={() => setIsTop(1)}
                            >
                                <span className={styles["header-title"]}>{t("InstallEngine.userAgreement")}</span>
                                <div className={styles["close-wrapper"]} onClick={() => setVisible(false)}>
                                    <WinUIOpCloseSvgIcon className={styles["icon-style"]} />
                                </div>
                            </div>
                        )}
                        <div className={styles["modal-body"]}>
                            <div className={styles["body-title"]}>{t("InstallEngine.disclaimer")}</div>
                            <div className={styles["body-content"]}>
                                {t("InstallEngine.disclaimer1")}
                                <br />
                                {t("InstallEngine.disclaimer2")}
                                <br />
                                {t("InstallEngine.disclaimer3")}
                                <br />
                                {t("InstallEngine.disclaimer4")}
                                <br />
                                <span className={styles["sign-bold-content"]}>
                                    {t("InstallEngine.disclaimer5")}
                                </span>
                                <br />
                                {t("InstallEngine.disclaimer6")}
                                <br />
                                {t("InstallEngine.disclaimer7")}
                                <br />
                                {t("InstallEngine.disclaimer8")}
                                <br />
                                {t("InstallEngine.disclaimer9")}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Draggable>
    )
})
/** @name Yaklang-常见问题弹窗 */
export const QuestionModal: React.FC<AgrAndQSModalProps> = React.memo((props) => {
    const {isTop, setIsTop, system, visible, setVisible} = props

    const [show, setShow] = useState<boolean>(false)
    const [latestVersion, setLatestVersion] = useState("")

    const [disabled, setDisabled] = useState(true)
    const [bounds, setBounds] = useState({left: 0, top: 0, bottom: 0, right: 0})
    const draggleRef = useRef<HTMLDivElement>(null)

    const [ossDomain, setOSSDomain] = useState<string>("")

    useEffect(() => {
        grpcFetchLatestOSSDomain().then(setOSSDomain)
    }, [])

    const copyCommand = useMemoizedFn((type: YakitSystem) => {
        let link: string = ""
        switch (type) {
            case "Darwin":
                link = `https://${ossDomain}/yak/${latestVersion || "latest"}/yak_darwin_amd64`
                break
            case "Linux":
                link = `https://${ossDomain}/yak/${latestVersion || "latest"}/yak_linux_amd64`
                break
            case "Windows_NT":
                link = `https://${ossDomain}/yak/${latestVersion || "latest"}/yak_windows_amd64.exe`
                break
        }
        setClipboardText(link)
    })

    useEffect(() => {
        grpcFetchLatestYakVersion(true)
            .then((data: string) => setLatestVersion(data))
            .catch((e: any) => {})
    }, [])

    const onStart = useMemoizedFn((_event: DraggableEvent, uiData: DraggableData) => {
        const {clientWidth, clientHeight} = window.document.documentElement
        const targetRect = draggleRef.current?.getBoundingClientRect()
        if (!targetRect) return

        setBounds({
            left: -targetRect.left + uiData.x,
            right: clientWidth - (targetRect.right - uiData.x),
            top: -targetRect.top + uiData.y + 36,
            bottom: clientHeight - (targetRect.bottom - uiData.y)
        })
    })

    return (
        <Draggable
            defaultClassName={classNames(
                styles["yaklang-qs-modal"],
                {[styles["modal-top-wrapper"]]: isTop === 2},
                visible ? styles["modal-wrapper"] : styles["hidden-wrapper"]
            )}
            disabled={disabled}
            bounds={bounds}
            onStart={(event, uiData) => onStart(event, uiData)}
        >
            <div ref={draggleRef}>
                <div className={styles["yakit-info-modal"]} onClick={() => setIsTop(2)}>
                    <div className={styles["question-modal-wrapper"]}>
                        {system === "Darwin" ? (
                            <div
                                className={classNames(styles["modal-header"], styles["mac-header"])}
                                onMouseEnter={() => {
                                    if (disabled) setDisabled(false)
                                }}
                                onMouseLeave={() => setDisabled(true)}
                                onMouseDown={() => setIsTop(2)}
                            >
                                <div
                                    className={styles["close-wrapper"]}
                                    onMouseEnter={() => setShow(true)}
                                    onMouseLeave={() => setShow(false)}
                                    onClick={() => setVisible(false)}
                                >
                                    {show ? (
                                        <MacUIOpCloseSvgIcon />
                                    ) : (
                                        <div className={styles["close-btn"]}>
                                            <div className={styles["btn-icon"]}></div>
                                        </div>
                                    )}
                                </div>
                                <span>{t("InstallEngine.engineDownloadLink")}</span>
                            </div>
                        ) : (
                            <div
                                className={classNames(styles["modal-header"], styles["win-header"])}
                                onMouseOver={() => {
                                    if (disabled) setDisabled(false)
                                }}
                                onMouseOut={() => setDisabled(true)}
                                onMouseDown={() => setIsTop(2)}
                            >
                                <span className={styles["header-title"]}>{t("InstallEngine.engineDownloadLink")}</span>
                                <div className={styles["close-wrapper"]} onClick={() => setVisible(false)}>
                                    <WinUIOpCloseSvgIcon className={styles["icon-style"]} />
                                </div>
                            </div>
                        )}
                        <div className={styles["modal-body"]}>
                            <div className={styles["body-hint"]}>
                                <span className={styles["hint-sign"]}>{t("InstallEngine.manualDownloadHint")}</span>
                                <br />
                                {t("InstallEngine.manualInstallPathHint")}
                            </div>

                            <div className={styles["body-link"]}>
                                <div className={styles["link-opt"]}>
                                    <div style={{width: 107}} className={styles["link-title"]}>
                                        {t("InstallEngine.windowsDownload")}
                                    </div>
                                    <div className={styles["link-style"]}>
                                        https://{ossDomain}/yak/{latestVersion || "latest"}
                                        /yak_windows_amd64.exe
                                        <div className={styles["copy-icon"]} onClick={() => copyCommand("Windows_NT")}>
                                            <YakitCopySvgIcon />
                                        </div>
                                    </div>
                                </div>
                                <div className={styles["link-opt"]}>
                                    <div style={{width: 122}} className={styles["link-title"]}>
                                        {t("InstallEngine.macosDownload")}
                                    </div>
                                    <div className={styles["link-style"]}>
                                        https://{ossDomain}/yak/{latestVersion || "latest"}
                                        /yak_darwin_amd64
                                        <div className={styles["copy-icon"]} onClick={() => copyCommand("Darwin")}>
                                            <YakitCopySvgIcon />
                                        </div>
                                    </div>
                                </div>
                                <div className={styles["link-opt"]}>
                                    <div style={{width: 87}} className={styles["link-title"]}>
                                        {t("InstallEngine.linuxDownload")}
                                    </div>
                                    <div className={styles["link-style"]}>
                                        https://{ossDomain}/yak/{latestVersion || "latest"}
                                        /yak_linux_amd64
                                        <div className={styles["copy-icon"]} onClick={() => copyCommand("Linux")}>
                                            <YakitCopySvgIcon />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Draggable>
    )
})
