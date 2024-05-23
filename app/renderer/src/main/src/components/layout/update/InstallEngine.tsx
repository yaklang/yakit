import React, {useEffect, useMemo, useRef, useState} from "react"
import {useDebounceEffect, useGetState, useMemoizedFn} from "ahooks"
import {MacUIOpCloseSvgIcon, WinUIOpCloseSvgIcon, YakitCopySvgIcon, YaklangInstallHintSvgIcon} from "../icons"
import {Checkbox, Progress} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import Draggable from "react-draggable"
import type {DraggableEvent, DraggableData} from "react-draggable"
import {DownloadingState, YakitSystem} from "@/yakitGVDefine"
import {failed, info, success} from "@/utils/notification"
import {getLocalValue, setLocalValue} from "@/utils/kv"
import {LocalGV} from "@/yakitGV"
import {getReleaseEditionName} from "@/utils/envfile"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {CopyComponents} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {safeFormatDownloadProcessState} from "../utils"
import {OutlineQuestionmarkcircleIcon} from "@/assets/icon/outline"

import classNames from "classnames"
import styles from "./InstallEngine.module.scss"

const {ipcRenderer} = window.require("electron")

export interface InstallEngineProps {
    system: YakitSystem
    visible: boolean
    onSuccess: () => any
    onRemoreLink: () => any
}

export const InstallEngine: React.FC<InstallEngineProps> = React.memo((props) => {
    const {system, visible, onSuccess, onRemoreLink} = props

    /** ---------- 获取操作系统和架构 & 内置引擎相关 Start ---------- */
    const [platformArch, setPlatformArch] = useState<string>("")

    const [buildInEngineVersion, setBuildInEngineVersion] = useState("")
    const haveBuildInEngine = useMemo(() => {
        return buildInEngineVersion !== ""
    }, [buildInEngineVersion])

    useEffect(() => {
        ipcRenderer.invoke("fetch-system-and-arch").then((e: string) => setPlatformArch(e))
        ipcRenderer
            .invoke("GetBuildInEngineVersion")
            .then((ver) => setBuildInEngineVersion(ver))
            .catch(() => {})
    }, [])

    const [extractingBuildInEngine, setExtractingBuildInEngine] = useState(false)
    const initBuildInEngine = useMemoizedFn(() => {
        setExtractingBuildInEngine(true)
        ipcRenderer
            .invoke("InitBuildInEngine", {})
            .then(() => {
                info(`解压内置引擎成功`)
                showYakitModal({
                    closable: false,
                    maskClosable: false,
                    keyboard: false,
                    type: "white",
                    title: "引擎解压成功，需要重启",
                    content: (
                        <div className={styles["relaunch-hint"]}>
                            <YakitButton
                                onClick={() => {
                                    ipcRenderer
                                        .invoke("relaunch")
                                        .then(() => {})
                                        .catch((e) => {
                                            failed(`重启失败: ${e}`)
                                        })
                                }}
                            >
                                点此立即重启
                            </YakitButton>
                        </div>
                    ),
                    footer: null
                })
            })
            .catch((e) => {
                failed(`初始化内置引擎失败：${e}`)
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

    const [install, setInstall] = useState<boolean>(false)

    /** 远端最新yaklang引擎版本 */
    const latestVersionRef = useRef<string>("")

    /** 是否中断下载记录 */
    const [cancelLoading, setCancelLoading] = useState<boolean>(false)
    const isBreakDownload = useRef<boolean>(false)
    /** 取消事件 */
    const onClose = useMemoizedFn(() => {
        setCancelLoading(true)
        isBreakDownload.current = true
        setDownloadProgress(undefined)
        ipcRenderer.invoke("cancel-download-yak-engine-version", latestVersionRef.current)
        setTimeout(() => {
            setInstall(false)
            setCancelLoading(false)
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
        ipcRenderer
            .invoke("fetch-latest-yaklang-version")
            .then((data: string) => {
                if (isBreakDownload.current) return
                latestVersionRef.current = data.startsWith("v") ? data.slice(1) : data
                if (callback) callback()
            })
            .catch((e: any) => {
                failed(`获取线上引擎最新版本失败 ${e}`)
                onInstallClose()
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
                success("下载完毕")
                yaklangUpdate()
            })
            .catch((e: any) => {
                if (isBreakDownload.current) return
                failed(`引擎下载失败: ${e}`)
                onInstallClose()
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
                success(`安装成功，如未生效，重启 ${getReleaseEditionName()} 即可`)
                onSuccess()
            })
            .catch((err: any) => {
                failed(`安装失败: ${err}`)
                onInstallClose()
            })
    }

    /** 一键安装事件 */
    const installEngine = useMemoizedFn(() => {
        setCheckStatus(true)
        if (!agrCheck) {
            /** 抖动提示动画 */
            setIsShake(true)
            setTimeout(() => setIsShake(false), 1000)
            return
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
                                    <div className={styles["hint-right-download"]}>
                                        <div className={styles["hint-right-title"]}>引擎安装中...</div>
                                        <div className={styles["download-progress"]}>
                                            <Progress
                                                strokeColor='#F28B44'
                                                trailColor='#F0F2F5'
                                                percent={Math.floor((downloadProgress?.percent || 0) * 100)}
                                            />
                                        </div>
                                        <div className={styles["download-info-wrapper"]}>
                                            <div>剩余时间 : {(downloadProgress?.time.remaining || 0).toFixed(2)}s</div>
                                            <div className={styles["divider-wrapper"]}>
                                                <div className={styles["divider-style"]}></div>
                                            </div>
                                            <div>耗时 : {(downloadProgress?.time.elapsed || 0).toFixed(2)}s</div>
                                            <div className={styles["divider-wrapper"]}>
                                                <div className={styles["divider-style"]}></div>
                                            </div>
                                            <div>
                                                下载速度 : {((downloadProgress?.speed || 0) / 1000000).toFixed(2)}M/s
                                            </div>
                                        </div>
                                        <div className={styles["download-btn"]}>
                                            <YakitButton
                                                loading={cancelLoading}
                                                size='max'
                                                type='outline2'
                                                onClick={onClose}
                                            >
                                                取消
                                            </YakitButton>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className={styles["hint-right-title"]}>
                                            {haveBuildInEngine ? "本地引擎未初始化" : "未安装引擎"}
                                        </div>
                                        <div className={styles["hint-right-content"]}>
                                            {haveBuildInEngine
                                                ? `授权使用内置引擎: ${buildInEngineVersion}，或远程连接启动`
                                                : "你可选择安装 Yak 引擎启动软件，或远程连接"}
                                        </div>

                                        {platformArch === "darwin-arm64" && (
                                            <div className={styles["hint-right-macarm"]}>
                                                <div>
                                                    <div className={styles["mac-arm-hint"]}>
                                                        当前系统为(darwin-arm64)，如果未安装 Rosetta 2, 将无法运行 Yak
                                                        核心引擎
                                                        <br />
                                                        运行以下命令可手动安装 Rosetta，如已安装可忽略
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
                                                勾选同意{" "}
                                                <span
                                                    className={styles["agreement-style"]}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setAgrShow(true)
                                                        setIsTop(1)
                                                    }}
                                                >
                                                    《用户协议》
                                                </span>
                                                以继续使用
                                            </span>
                                        </div>

                                        <div className={styles["hint-right-btn"]}>
                                            <div>
                                                <YakitButton size='max' type='outline2' onClick={remoteLink}>
                                                    远程连接
                                                </YakitButton>
                                                {haveBuildInEngine && (
                                                    <YakitPopconfirm
                                                        placement='top'
                                                        title={
                                                            "网络安装需要公网环境，请知晓，请优先使用内置引擎（初始化引擎）"
                                                        }
                                                        onConfirm={installEngine}
                                                    >
                                                        <YakitButton
                                                            type={"text"}
                                                            size='small'
                                                            style={{fontSize: 12}}
                                                            disabled={!agrCheck}
                                                        >
                                                            联网安装
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
                                                    取消
                                                </YakitButton>

                                                {!haveBuildInEngine && (
                                                    // 无内置引擎
                                                    <YakitButton size='max' onClick={installEngine}>
                                                        一键安装
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
                                                        初始化引擎
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
                                <span>用户协议</span>
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
                                <span className={styles["header-title"]}>用户协议</span>
                                <div className={styles["close-wrapper"]} onClick={() => setVisible(false)}>
                                    <WinUIOpCloseSvgIcon className={styles["icon-style"]} />
                                </div>
                            </div>
                        )}
                        <div className={styles["modal-body"]}>
                            <div className={styles["body-title"]}>免责声明</div>
                            <div className={styles["body-content"]}>
                                1. 本工具仅面向 <span className={styles["sign-content"]}>合法授权</span>{" "}
                                的企业安全建设行为与个人学习行为，如您需要测试本工具的可用性，请自行搭建靶机环境。
                                <br />
                                2. 在使用本工具进行检测时，您应确保该行为符合当地的法律法规，并且已经取得了足够的授权。
                                <span className={styles["underline-content"]}>请勿对非授权目标进行扫描。</span>
                                <br />
                                3. 禁止对本软件实施逆向工程、反编译、试图破译源代码，植入后门传播恶意软件等行为。
                                <br />
                                <span className={styles["sign-bold-content"]}>
                                    如果发现上述禁止行为，我们将保留追究您法律责任的权利。
                                </span>
                                <br />
                                如您在使用本工具的过程中存在任何非法行为，您需自行承担相应后果，我们将不承担任何法律及连带责任。
                                <br />
                                在安装并使用本工具前，请您{" "}
                                <span className={styles["sign-bold-content"]}>务必审慎阅读、充分理解各条款内容。</span>
                                <br />
                                限制、免责条款或者其他涉及您重大权益的条款可能会以{" "}
                                <span className={styles["sign-bold-content"]}>加粗</span>、
                                <span className={styles["underline-content"]}>加下划线</span>
                                等形式提示您重点注意。
                                <br />
                                除非您已充分阅读、完全理解并接受本协议所有条款，否则，请您不要安装并使用本工具。您的使用行为或者您以其他任何明示或者默示方式表示接受本协议的，即视为您已阅读并同意本协议的约束。
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

    const copyCommand = useMemoizedFn((type: YakitSystem) => {
        let link: string = ""
        switch (type) {
            case "Darwin":
                link = `https://yaklang.oss-cn-beijing.aliyuncs.com/yak/${latestVersion || "latest"}/yak_darwin_amd64`
                break
            case "Linux":
                link = `https://yaklang.oss-cn-beijing.aliyuncs.com/yak/${latestVersion || "latest"}/yak_linux_amd64`
                break
            case "Windows_NT":
                link = `https://yaklang.oss-cn-beijing.aliyuncs.com/yak/${
                    latestVersion || "latest"
                }/yak_windows_amd64.exe`
                break
        }
        ipcRenderer.invoke("set-copy-clipboard", link)
        success("复制成功")
    })

    useEffect(() => {
        ipcRenderer
            .invoke("fetch-latest-yaklang-version")
            .then((data: string) => setLatestVersion(data.startsWith("v") ? data.slice(1) : data))
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
                                <span>Yak 核心引擎下载链接</span>
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
                                <span className={styles["header-title"]}>Yak 核心引擎下载链接</span>
                                <div className={styles["close-wrapper"]} onClick={() => setVisible(false)}>
                                    <WinUIOpCloseSvgIcon className={styles["icon-style"]} />
                                </div>
                            </div>
                        )}
                        <div className={styles["modal-body"]}>
                            <div className={styles["body-hint"]}>
                                <span className={styles["hint-sign"]}>如遇网络问题无法下载，可手动下载安装：</span>
                                <br />
                                Windows 用户可以把引擎放在 安装目录(一般为%HOME%)/yakit-projects/yak-engine/yak.exe
                                即可识别 MacOS / Linux 用户可以把引擎放在 ~/yakit-projects/yak-engine/yak 即可识别
                            </div>

                            <div className={styles["body-link"]}>
                                <div className={styles["link-opt"]}>
                                    <div style={{width: 107}} className={styles["link-title"]}>
                                        Windows(x64)下载
                                    </div>
                                    <div className={styles["link-style"]}>
                                        https://yaklang.oss-cn-beijing.aliyuncs.com/yak/{latestVersion || "latest"}
                                        /yak_windows_amd64.exe
                                        <div className={styles["copy-icon"]} onClick={() => copyCommand("Windows_NT")}>
                                            <YakitCopySvgIcon />
                                        </div>
                                    </div>
                                </div>
                                <div className={styles["link-opt"]}>
                                    <div style={{width: 122}} className={styles["link-title"]}>
                                        MacOS(intel/m1)下载
                                    </div>
                                    <div className={styles["link-style"]}>
                                        https://yaklang.oss-cn-beijing.aliyuncs.com/yak/{latestVersion || "latest"}
                                        /yak_darwin_amd64
                                        <div className={styles["copy-icon"]} onClick={() => copyCommand("Darwin")}>
                                            <YakitCopySvgIcon />
                                        </div>
                                    </div>
                                </div>
                                <div className={styles["link-opt"]}>
                                    <div style={{width: 87}} className={styles["link-title"]}>
                                        Linux(x64)下载
                                    </div>
                                    <div className={styles["link-style"]}>
                                        https://yaklang.oss-cn-beijing.aliyuncs.com/yak/{latestVersion || "latest"}
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
