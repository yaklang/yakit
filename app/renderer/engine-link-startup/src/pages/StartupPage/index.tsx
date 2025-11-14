import React, {useEffect, useMemo, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {EngineModeVerbose, handleFetchArchitecture, handleFetchIsDev, handleFetchSystem, SystemInfo} from "./utils"
import {
    grpcFetchBuildInYakVersion,
    grpcFetchYakInstallResult,
    grpcFixupDatabase,
    grpcInitCVEDatabase,
    grpcRelaunch,
    grpcUnpackBuildInYak,
    grpcWriteEngineKeyToYakitProjects
} from "./grpc"
import {debugToPrintLog} from "@/utils/logCollection"
import {LocalGVS} from "@/enums/yakitGV"
import {
    EngineWatchDogCallbackType,
    LoadingClickExtra,
    ModalIsTop,
    System,
    TypeCallbackExtra,
    YakitStatusType,
    YaklangEngineMode,
    YaklangEngineWatchDogCredential
} from "./types"
import {getLocalValue, setLocalValue} from "@/utils/kv"
import useGetSetState from "@/hooks/useGetSetState"
import {yakitNotify} from "@/utils/notification"
import {YakitLoading} from "./components/YakitLoading"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {DownloadYaklang} from "./components/DownloadYaklang"
import classNames from "classnames"
import {GetConnectPort, getReleaseEditionName, isIRify} from "@/utils/envfile"
import {MacUIOp} from "./components/MacUIOp"
import {HelpDoc} from "./components/HelpDoc"
import {WinUIOp} from "./components/WinUIOp"
import {PerformanceDisplay} from "./components/PerformanceDisplay"
import {RemoteEngine} from "./components/RemoteEngine/RemoteEngine"
import {RemoteLinkInfo} from "./components/RemoteEngine/RemoteEngineType"
import {StringToUint8Array} from "@/utils/str"
import {LocalEngine} from "./components/LocalEngine"
import {LocalEngineLinkFuncProps, LocalLinkParams} from "./components/LocalEngine/LocalEngineType"
import {EngineLog} from "./components/EngineLog"
import emiter from "@/utils/eventBus/eventBus"
import {YaklangEngineWatchDog} from "./components/YaklangEngineWatchDog"
import {ipcEventPre} from "@/utils/ipcEventPre"

import styles from "./index.module.scss"
const {ipcRenderer} = window.require("electron")

const DefaultCredential: YaklangEngineWatchDogCredential = {
    Host: "127.0.0.1",
    IsTLS: false,
    Password: "",
    PemBytes: undefined,
    Port: 0,
    Mode: undefined
}

export const StartupPage: React.FC = () => {
    /** 是否置顶 */
    const [isTop, setIsTop] = useState<ModalIsTop>(0)
    /** 操作系统 */
    const [system, setSystem] = useState<System>("Darwin")
    /** 本地引擎自检输出日志 */
    const [checkLog, setCheckLog] = useState<string[]>(["软件启动中，开始前置检查..."])
    /** 引擎是否安装 */
    const isEngineInstalled = useRef<boolean>(false)
    /** 内置引擎版本号 */
    const [buildInEngineVersion, setBuildInEngineVersion, getBuildInEngineVersion] = useGetSetState<string>("")
    /** 当前引擎模式 */
    const [engineMode, setEngineMode, getEngineMode] = useGetSetState<YaklangEngineMode>()
    const onSetEngineMode = useMemoizedFn((v?: YaklangEngineMode) => {
        setEngineMode(v)
        SystemInfo.mode = v
    })
    /** 是否为远程模式 */
    const isRemoteEngine = useMemo(() => engineMode === "remote", [engineMode])
    /** yakit使用状态 */
    const [yakitStatus, setYakitStatus, getYakitStatus] = useGetSetState<YakitStatusType>("")
    /** 当前引擎连接状态 */
    const [engineLink, setEngineLink, getEngineLink] = useGetSetState<boolean>(false)
    /** 是否为初次启动本地连接 */
    const isInitLocalLink = useRef<boolean>(true)
    // 本地连接ref
    const localEngineRef = useRef<LocalEngineLinkFuncProps>(null)
    /** 认证信息 */
    const [credential, setCredential, getCredential] = useGetSetState<YaklangEngineWatchDogCredential>({
        ...DefaultCredential
    })
    // 是否持续监听引擎进程的连接状态
    const [keepalive, setKeepalive, getKeepalive] = useGetSetState<boolean>(false)
    /** 本地连接自定义端口号 */
    const customPort = useRef<number>(GetConnectPort())
    /**引擎日志是否展开 */
    const [englineLogMax, setEnglineLogMax] = useState<boolean>(false)
    /** MACOS 上双击放大窗口(不是最大化) */
    const maxScreen = () => {
        ipcRenderer
            .invoke(`${ipcEventPre}UIOperate`, "max")
            .then(() => {})
            .catch(() => {})
    }

    // #region 软件开始进行逻辑启动
    useEffect(() => {
        if (SystemInfo.isDev) {
            if (getEngineLink() && getEngineMode() === "local") return
        }
        handleBuiltInCheck()
        setTimeout(() => {
            handleFetchBaseInfo(() => {
                handleLinkEngineMode()
            })
        }, 1000)
    }, [])

    /** 插件漏洞信息库自检 */
    const handleBuiltInCheck = useMemoizedFn(() => {
        grpcInitCVEDatabase()
            .then(() => {
                yakitNotify("info", "漏洞信息库自检完成")
            })
            .catch((e: any) => {})
    })

    /**
     * 获取信息
     * 1、开发环境
     * 2、操作系统
     * 3、cpu架构
     * 4、引擎是否存在
     * 5、内置引擎版本
     */
    const handleFetchBaseInfo = useMemoizedFn(async (nextFunc?: () => any) => {
        debugToPrintLog(`------ 获取系统基础信息 ------`)
        try {
            if (SystemInfo.isDev === undefined) await handleFetchIsDev()
        } catch (error) {}
        try {
            await handleFetchSystem((value) => {
                setSystem(value || "Windows_NT")
            })
        } catch (error) {}
        try {
            if (SystemInfo.architecture === undefined) await handleFetchArchitecture()
        } catch (error) {}
        try {
            const isInstalled = await grpcFetchYakInstallResult(true)
            isEngineInstalled.current = isInstalled
        } catch (error) {}
        try {
            const version = await grpcFetchBuildInYakVersion(true)
            setBuildInEngineVersion(version)
        } catch (error) {}

        if (nextFunc) nextFunc()
    })

    /** 获取上次连接引擎的模式 */
    const handleLinkEngineMode = useMemoizedFn(() => {
        debugToPrintLog(`------ 获取上次连接引擎的模式 ------`)
        setCheckLog(["获取上次连接引擎的模式..."])
        getLocalValue(LocalGVS.YaklangEngineMode).then((val: YaklangEngineMode) => {
            switch (val) {
                case "remote":
                    setCheckLog((arr) => arr.concat(["获取连接模式成功——远程模式"]))
                    debugToPrintLog(`------ 连接引擎的模式: remote ------`)
                    setTimeout(() => {
                        handleChangeLinkMode(true)
                    }, 1000)

                    return
                case "local":
                    setCheckLog((arr) => arr.concat(["获取连接模式成功——本地模式"]))
                    debugToPrintLog(`------ 连接引擎的模式: local ------`)
                    setTimeout(() => {
                        handleChangeLinkMode()
                    }, 1000)
                    return
                default:
                    setCheckLog((arr) => arr.concat(["未获取到连接模式-默认(本地)模式"]))
                    debugToPrintLog(`------ 连接引擎的模式: local ------`)
                    setTimeout(() => {
                        handleChangeLinkMode()
                    }, 1000)
                    return
            }
        })
    })

    // 切换连接模式
    const handleChangeLinkMode = useMemoizedFn((isRemote?: boolean) => {
        setCheckLog([])
        if (!!isRemote) {
            handleLinkRemoteMode()
        } else {
            handleLinkLocalMode()
        }
    })

    // 本地连接的两种模式
    const handleStartLocalLink = useMemoizedFn((isInit: boolean) => {
        if (isInit) {
            if (localEngineRef.current) localEngineRef.current.init(customPort.current)
        } else {
            if (localEngineRef.current) localEngineRef.current.link(customPort.current)
        }
    })

    // 切换远程模式
    const handleLinkRemoteMode = useMemoizedFn(() => {
        onDisconnect()
        setYakitStatus("")
        onSetEngineMode("remote")
    })

    // 本地连接的状态设置
    const setLinkLocalEngine = useMemoizedFn(() => {
        onDisconnect()
        setYakitStatus("")
        onSetEngineMode("local")
        debugToPrintLog(`------ 启动环境检查逻辑 ------`)
        handleStartLocalLink(isInitLocalLink.current)
        isInitLocalLink.current = false
    })

    // 切换本地模式
    const handleLinkLocalMode = useMemoizedFn(() => {
        if (isEngineInstalled.current) {
            if (!isInitLocalLink.current) {
                setLinkLocalEngine()
                return
            }
            setCheckLog(["检查本地是否已安装引擎..."])
            setCheckLog((arr) => arr.concat(["本地已安装引擎，准备环境检查中..."]))
            setTimeout(() => {
                setLinkLocalEngine()
            }, 1000)
        } else {
            debugToPrintLog(`------ 启动无本地引擎逻辑 ------`)
            setCheckLog(["检查本地是否已安装引擎..."])
            setCheckLog((arr) =>
                arr.concat([
                    `本地未安装引擎，${getBuildInEngineVersion() ? "内置引擎：" + getBuildInEngineVersion() + "，请点击初始化引擎。" : "内置引擎不存在，请点击下载引擎。"}`
                ])
            )
            setTimeout(() => {
                setYakitStatus(getBuildInEngineVersion() ? "install" : "installNetWork")
                onSetEngineMode(undefined)
            }, 1000)
        }
    })
    // #endregion

    // #region Yak引擎下载更新逻辑
    // 更新yaklang-modal
    const [yaklangDownload, setYaklangDownload] = useState<boolean>(false)
    // 指定下载版本yak引擎
    const [specifyYakVersion, setSpecifyYakVersion] = useState<string>("")
    const onDownloadedYaklang = useMemoizedFn((isOk: boolean) => {
        setYaklangDownload(false)
        if (["installNetWork", "skipAgreement_InstallNetWork", "old_version"].includes(getYakitStatus())) {
            setRestartLoading(false)
            if (!isOk) {
                return
            }
        } else {
            setSpecifyYakVersion("")
        }
        setLinkLocalEngine()
    })
    // #endregion

    // #region YakitLoading逻辑
    // 手动重连时按钮的loading
    const [restartLoading, setRestartLoading] = useState<boolean>(false)
    // 远程控制时的刷新按钮loading
    const [remoteControlRefreshLoading, setRemoteControlRefreshLoading] = useState<boolean>(false)
    const setTimeoutLoading = useMemoizedFn((setLoading: (v: boolean) => any, time = 2000) => {
        setLoading(true)
        setTimeout(() => {
            setLoading(false)
        }, time)
    })
    useEffect(() => {
        if (engineLink) {
            setRestartLoading(false)
            setRemoteControlRefreshLoading(false)
        }
    }, [engineLink])
    // Loading页面切换引擎连接模式
    const loadingClickCallback = useMemoizedFn(
        (type: YaklangEngineMode | YakitStatusType, extra?: LoadingClickExtra) => {
            switch (type) {
                case "install":
                    // 解压内置引擎
                    initializeEngine()
                    return
                case "installNetWork":
                    // 一键安装（联网）
                    setRestartLoading(true)
                    setYaklangDownload(true)
                    return
                case "check_timeout":
                    // 超时手动校验引擎
                    setRestartLoading(true)
                    handleStartLocalLink(true)
                    return
                case "port_occupied":
                    // 端口被占用
                    setRestartLoading(true)
                    customPort.current = extra.port
                    handleStartLocalLink(true)
                    return
                case "start_timeout":
                    // 启动yak超时
                    setTimeoutLoading(setRestartLoading, 5000)
                    onStartLinkEngine()
                    return
                case "remote":
                    handleLinkRemoteMode()
                    return
                case "local":
                    handleLinkLocalMode()
                    return
                case "current_version":
                    // 跳旧的yakit窗口引擎连接逻辑
                    ipcRenderer.invoke("yakitEngineLinkWin-done", {useOldLink: true})
                    return
                case "database_error":
                case "fix_database_timeout":
                    setRestartLoading(true)
                    // 校验数据库出现错误或超时
                    handleFixupDatabase()
                    return
                case "error":
                    // 引擎连接超时或意外断掉连接
                    setTimeoutLoading(setRestartLoading)
                    handleStartLocalLink(false)
                    setKeepalive(false)
                    return
                case "break":
                    // 主动断开引擎
                    setTimeoutLoading(setRestartLoading)
                    handleStartLocalLink(false)
                    return
                default:
                    return
            }
        }
    )

    // 解压内置引擎
    const initializeEngine = useMemoizedFn(async () => {
        setRestartLoading(true)
        setCheckLog(["准备解压内置引擎..."])
        try {
            await grpcUnpackBuildInYak(true)
            grpcWriteEngineKeyToYakitProjects({}, true)
            setCheckLog([`引擎：${getBuildInEngineVersion()}，解压成功，请点击立即重启`])
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
                                grpcRelaunch()
                            }}
                        >
                            点此立即重启
                        </YakitButton>
                    </div>
                ),
                footer: null
            })
        } catch (error) {
            setCheckLog([
                isInitLocalLink.current
                    ? "初始化失败，请点击下载引擎继续使用..."
                    : `解压失败：${error}，请点击下载引擎继续使用...`
            ])
            setYakitStatus(isInitLocalLink.current ? "installNetWork" : "skipAgreement_InstallNetWork")
        } finally {
            setRestartLoading(false)
        }
    })

    // 数据库修复
    const [dbPath, setDbPath] = useState<string[]>([])
    const handleFixupDatabase = useMemoizedFn(async () => {
        setCheckLog(["开始修复数据库中..."])
        const res = await grpcFixupDatabase({isIRify: isIRify()})
        setRestartLoading(false)
        if (res.ok && res.status === "success") {
            setCheckLog((arr) => arr.concat(["修复数据库成功"]))
            setYakitStatus("")
            setDbPath([])
            handleStartLocalLink(true)
            return
        }
        switch (res.status) {
            case "timeout":
                setCheckLog((arr) => arr.concat(["命令执行超时，可查看日志详细信息..."]))
                setYakitStatus("fix_database_timeout")
                break
            default:
                setDbPath(res.json.path)
                setCheckLog((arr) => arr.concat(["修复失败，可将日志信息发送给工作人员处理..."]))
                setYakitStatus("fix_database_error")
        }
    })
    // #endregion

    // #region 远程连接&本地连接
    const [remoteLinkLoading, setRemoteLinkLoading] = useState<boolean>(false)
    // 开始远程连接引擎
    const handleLinkRemoteEngine = useMemoizedFn((info: RemoteLinkInfo) => {
        setTimeoutLoading(setRemoteLinkLoading)
        setCredential({
            Host: info.host,
            IsTLS: info.tls,
            Password: info.tls ? info.password : "",
            PemBytes: StringToUint8Array(info.tls ? info.caPem || "" : ""),
            Port: parseInt(info.port),
            Mode: "remote"
        })
        onStartLinkEngine()
    })
    // 远程切换本地
    const handleRemoteToLocal = useMemoizedFn(() => {
        onSetEngineMode(undefined)
        handleChangeLinkMode()
    })

    // 开始本地连接引擎
    const handleLinkLocalEngine = useMemoizedFn((params: LocalLinkParams) => {
        debugToPrintLog(`------ 开始启动引擎, 指定端口: ${params.port} ------`)
        setCheckLog([`本地普通权限引擎模式，开始启动本地引擎-端口: ${params.port}`])
        setCredential({
            Host: "127.0.0.1",
            IsTLS: false,
            Password: params.secret || "",
            PemBytes: undefined,
            Port: params.port,
            Mode: "local"
        })
        setYakitStatus("ready")
        onStartLinkEngine()
    })

    // 断开连接
    const onDisconnect = useMemoizedFn(() => {
        setCredential({...DefaultCredential})
        setKeepalive(false)
        setEngineLink(false)
    })
    // 开始连接引擎
    const onStartLinkEngine = useMemoizedFn(() => {
        setTimeout(() => {
            emiter.emit("startAndCreateEngineProcess")
        }, 100)
    })
    // #endregion

    /**
     * 启动引擎进程的监听，用于显示启动进程错误时的报错信息
     */
    useEffect(() => {
        ipcRenderer.on("start-yaklang-engine-error", (_, error: string) => {
            setCheckLog((arr) => arr.concat([`${error}`]))
        })
        return () => {
            ipcRenderer.removeAllListeners("start-yaklang-engine-error")
        }
    }, [])

    // #region 连接成功
    const onReady = useMemoizedFn(() => {
        if (getKeepalive()) {
            setCheckLog([])
            setYakitStatus("link")
            setEngineLink(true)
        }
    })
    useEffect(() => {
        if (engineLink && getYakitStatus() === "link" && getCredential().Port) {
            ipcRenderer.invoke("yakitEngineLinkWin-done", {useOldLink: false, credential: getCredential()})
        }
    }, [engineLink])
    /**
     * 1、清空日志信息|将远程连接loading置为false(不管是不是远程连接)|
     * 2、执行连接成功的外界回调事件
     * 3、连接成功缓存连接模式
     * 4、开启引擎文件的存在监控
     */
    useEffect(() => {
        if (engineLink) {
            setCheckLog([])
            setRemoteLinkLoading(false)

            setLocalValue(LocalGVS.YaklangEngineMode, getEngineMode())

            const waitTime: number = 20000
            const id = setInterval(() => {
                grpcFetchYakInstallResult(true)
                    .then((flag: boolean) => {
                        if (isEngineInstalled.current === flag) return
                        isEngineInstalled.current = flag
                        isInitLocalLink.current = true
                        // 清空主进程yaklang版本缓存
                        ipcRenderer.invoke(ipcEventPre + "clear-local-yaklang-version-cache")
                    })
                    .catch()

                grpcFetchBuildInYakVersion(true)
                    .then((version) => {
                        setBuildInEngineVersion(version)
                    })
                    .catch()
            }, waitTime)
            return () => {
                clearInterval(id)
            }
        } else {
            // 清空主进程yaklang版本缓存
            ipcRenderer.invoke(ipcEventPre + "clear-local-yaklang-version-cache")
        }
    }, [engineLink])
    // #endregion

    const onFailed = useMemoizedFn((count) => {
        // 20以上的次数属于无效次数
        if (count > 20) {
            setKeepalive(false)
            return
        }
        debugToPrintLog(`[INFO] 目标引擎进程不存在: 探活失败${count}次`)
        setEngineLink(false)

        if (getYakitStatus() === "error" && count === 20) {
            // 连接断开后的20次尝试过后，不在进行尝试
            setCheckLog((arr) => {
                return arr.slice(1).concat(["连接超时, 请手动启动引擎"])
            })
            return
        }

        if (getYakitStatus() === "link" || getYakitStatus() === "ready") {
            // 连接中或正在连接中触发
            if (getEngineMode() === "remote") {
                yakitNotify("error", "远程连接已断开")
                onDisconnect()
                setYakitStatus("")
            }

            if (getEngineMode() === "local") {
                if (getYakitStatus() === "link") setCheckLog(["引擎连接超时, 正在尝试重连"])
                if (count > 4) {
                    setYakitStatus("error")
                }
            }
        }
    })

    const onWatchDogCallback = useMemoizedFn((type: EngineWatchDogCallbackType) => {})

    useEffect(() => {
        ipcRenderer.on("from-win", (e, data) => {
            const type = data.yakitStatus
            if (type) {
                handleOperations(type)
            }
        })
        return () => {
            ipcRenderer.removeAllListeners("from-win")
        }
    }, [])
    const handleOperations = useMemoizedFn((type: YakitStatusType | YaklangEngineMode, extra?: TypeCallbackExtra) => {
        switch (type) {
            case "skipAgreement_InstallNetWork": // 小风车重置引擎失败
                setCheckLog([`解压失败：${extra?.message || "未知原因"}，请点击下载引擎继续使用...`])
                onDisconnect()
                onSetEngineMode(undefined)
                if (isInitLocalLink.current) {
                    setYakitStatus("installNetWork")
                } else {
                    setYakitStatus("skipAgreement_InstallNetWork")
                }
                break
            case "break": // 小风车关闭引擎
                onDisconnect()
                setYakitStatus("break")
                setCheckLog(["已主动断开, 请点击手动连接引擎"])
                break
            case "install": // 下载的yaklang时候，或切换本地时 --- 本地引擎不存在
                onDisconnect()
                isEngineInstalled.current = false
                handleLinkLocalMode()
                return
            case "installNetWork": // 旧版本 下载
                onDisconnect()
                onSetEngineMode(undefined)
                setYakitStatus("skipAgreement_InstallNetWork")
                return
            case "error":
                setEngineLink(false)
                setYakitStatus("error")
                break
            case "local":
                onDisconnect()
                onSetEngineMode(undefined)
                handleLinkLocalMode()
                break
            case "remote":
                onSetEngineMode(undefined)
                handleLinkRemoteMode()
                break

            default:
                break
        }
    })

    return (
        <div className={styles["ui-layout-wrapper"]}>
            <div id='yakit-header' className={styles["ui-layout-header"]}>
                {system === "Darwin" ? (
                    <div className={classNames(styles["header-body"], styles["mac-header-body"])}>
                        {/* 遮住底部边框线 */}
                        <div style={{left: -45}} className={styles["header-border-yakit-mask"]}></div>

                        <div className={classNames(styles["yakit-header-title"])} onDoubleClick={maxScreen}>
                            {getReleaseEditionName()}-{`${EngineModeVerbose(engineMode || "local")}`}
                        </div>

                        <div className={styles["header-left"]}>
                            <div>
                                <MacUIOp />
                            </div>
                            <div className={styles["short-divider-wrapper"]}>
                                <div className={styles["divider-style"]}></div>
                            </div>

                            <div className={styles["left-cpu"]}>
                                <PerformanceDisplay
                                    engineMode={engineMode}
                                    typeCallback={handleOperations}
                                    engineLink={engineLink}
                                />
                            </div>
                        </div>
                        <div
                            className={classNames(styles["header-title"], {
                                [styles["header-title-drop"]]: true
                            })}
                            onDoubleClick={maxScreen}
                        />
                        <div className={styles["header-right"]}>
                            <HelpDoc system={system} />
                        </div>
                    </div>
                ) : (
                    <div className={classNames(styles["header-body"], styles["win-header-body"])}>
                        <div style={{left: -45}} className={styles["header-border-yakit-mask"]}></div>

                        <div className={classNames(styles["yakit-header-title"])} onDoubleClick={maxScreen}>
                            <>
                                {getReleaseEditionName()}-{`${EngineModeVerbose(engineMode || "local")}`}
                            </>
                        </div>

                        <div className={styles["header-left"]}>
                            <HelpDoc system={system} />
                        </div>

                        <div
                            className={classNames(styles["header-title"], {
                                [styles["header-title-drop"]]: true
                            })}
                            onDoubleClick={maxScreen}
                        />

                        <div className={styles["header-right"]}>
                            <div className={styles["left-cpu"]}>
                                <PerformanceDisplay
                                    engineMode={engineMode}
                                    typeCallback={handleOperations}
                                    engineLink={engineLink}
                                />
                            </div>
                            <div className={styles["short-divider-wrapper"]}>
                                <div className={styles["divider-style"]}></div>
                            </div>
                            <WinUIOp />
                        </div>
                    </div>
                )}
            </div>
            <div className={styles["ui-layout-container"]}>
                <div className={styles["container-wrapper"]}>
                    <YaklangEngineWatchDog
                        credential={credential}
                        keepalive={keepalive}
                        engineLink={engineLink}
                        onKeepaliveShouldChange={setKeepalive}
                        onReady={onReady}
                        onFailed={onFailed}
                        failedCallback={onWatchDogCallback}
                        setYakitStatus={setYakitStatus}
                    />
                    <div id='yakit-uilayout-body' className={styles["ui-layout-body"]}>
                        <LocalEngine
                            ref={localEngineRef}
                            setLog={setCheckLog}
                            onLinkEngine={handleLinkLocalEngine}
                            setYakitStatus={setYakitStatus}
                            buildInEngineVersion={buildInEngineVersion}
                            setRestartLoading={setRestartLoading}
                        />
                        {!engineLink && isRemoteEngine && yakitStatus !== "control-remote" && (
                            <RemoteEngine
                                loading={remoteLinkLoading}
                                setLoading={setRemoteLinkLoading}
                                installedEngine={isEngineInstalled.current}
                                onSubmit={handleLinkRemoteEngine}
                                onSwitchLocalEngine={handleRemoteToLocal}
                            />
                        )}
                        {!engineLink && !isRemoteEngine && (
                            <YakitLoading
                                isTop={isTop}
                                setIsTop={setIsTop}
                                system={system}
                                buildInEngineVersion={buildInEngineVersion}
                                checkLog={checkLog}
                                yakitStatus={yakitStatus}
                                engineMode={engineMode || "local"}
                                restartLoading={restartLoading}
                                remoteControlRefreshLoading={remoteControlRefreshLoading}
                                dbPath={dbPath}
                                btnClickCallback={loadingClickCallback}
                            />
                        )}
                        {!engineLink && !isRemoteEngine && yaklangDownload && (
                            // 更新引擎
                            <DownloadYaklang
                                isTop={isTop}
                                setIsTop={setIsTop}
                                yaklangSpecifyVersion={specifyYakVersion}
                                system={system}
                                visible={yaklangDownload}
                                onCancel={onDownloadedYaklang}
                            />
                        )}
                    </div>
                    <div
                        className={classNames({
                            [styles["uilayout-log"]]: true
                        })}
                        style={{height: englineLogMax ? "calc(100vh - 37px)" : "30%"}}
                    >
                        <EngineLog englineLogMax={englineLogMax} setEnglineLogMax={setEnglineLogMax} />
                    </div>
                </div>
            </div>
        </div>
    )
}
