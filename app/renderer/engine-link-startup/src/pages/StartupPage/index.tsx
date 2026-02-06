import React, {useEffect, useMemo, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {handleFetchArchitecture, handleFetchIsDev, handleFetchSystem, outputToWelcomeConsole, SystemInfo} from "./utils"
import {
    grpcFetchBuildInYakVersion,
    grpcFetchLocalYakitVersion,
    grpcFetchYakInstallResult,
    grpcFixupDatabase,
    grpcInitCVEDatabase,
    grpcReclaimDatabaseSpace,
    grpcRelaunch,
    grpcUnpackBuildInYak,
    grpcWriteEngineKeyToYakitProjects
} from "./grpc"
import {debugToPrintLog} from "@/utils/logCollection"
import {LocalGVS} from "@/enums/yakitGV"
import {
    IgnoreYakit,
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
import {DownloadYaklang} from "./components/DownloadYaklang"
import {
    FetchSoftwareVersion,
    GetConnectPort,
    isCommunityEdition,
    isCommunityIRify,
    isCommunityMemfit,
    isCommunityYakit,
    isEnpriTrace,
    isEnpriTraceAgent,
    isEnpriTraceIRify,
    isIRify,
    isMemfit
} from "@/utils/envfile"
import {RemoteEngine} from "./components/RemoteEngine/RemoteEngine"
import {RemoteLinkInfo} from "./components/RemoteEngine/RemoteEngineType"
import {StringToUint8Array} from "@/utils/str"
import {LocalEngine} from "./components/LocalEngine"
import {LocalEngineLinkFuncProps, LocalLinkParams} from "./components/LocalEngine/LocalEngineType"
import {EngineLog} from "./components/EngineLog"
import emiter from "@/utils/eventBus/eventBus"
import {YaklangEngineWatchDog} from "./components/YaklangEngineWatchDog"
import {ipcEventPre} from "@/utils/ipcEventPre"
import yakitEELogo from "@/assets/yakitEELogo.png"
import yakitEEDarkLogo from "@/assets/yakitEEDarkLogo.png"
import yakitSELogo from "@/assets/yakitSELogo.png"
import yakitSEDarkLogo from "@/assets/yakitSEDarkLogo.png"
import irifyRight from "@/assets/irify-right.png"
import yakitRight from "@/assets/yakit-right.png"
import memfitRight from "@/assets/memfit-right.webm"
import memfitRightDark from "@/assets/memfit-right-dark.webm"
import {SolidIrifyFontLogoIcon, SolidMemfitFontLogoIcon, SolidYakitFontLogoIcon} from "@/assets/colors"
import {Theme, useTheme} from "@/hooks/useTheme"
import {Lange, YakitSoftMode} from "./components/SoftwareBasics"
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
    const [checkLog, setCheckLog] = useState<string[]>(["正在进行环境检查..."])
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
    /** yakit使用状态 请用 safeSetYakitStatus 设置状态 */
    const [yakitStatus, setYakitStatus, getYakitStatus] = useGetSetState<YakitStatusType>("init")
    /** 手动点击中断连接 */
    const breakHandleRef = useRef<boolean>(false)
    /** 手动点击倒计时连接取消 */
    const cancelCountdownLinkRef = useRef<boolean>(false)
    /** 倒计时秒数 */
    const [countdown, setCountdown] = useState<number>(3)
    /** 倒计时定时器引用 */
    const countdownTimerRef = useRef<NodeJS.Timeout | null>(null)
    /** 当前引擎连接状态 */
    const [engineLink, setEngineLink, getEngineLink] = useGetSetState<boolean>(false)
    /** 是否阻止发送打开主窗口 */
    const isStopSend = useRef<boolean>(false)
    /** 是否初始启动连接 */
    const isInitLocalLink = useRef<boolean>(true)
    /** 是否检查版本更新 */
    const isCheckVersion = useRef<boolean>(true)
    // 本地连接ref
    const localEngineRef = useRef<LocalEngineLinkFuncProps>(null)
    /** 认证信息 */
    const [credential, setCredential, getCredential] = useGetSetState<YaklangEngineWatchDogCredential>({
        ...DefaultCredential
    })
    /** 阻止接收主窗口发送过来的error状态 */
    const stopErrorStatusRef = useRef<boolean>(false)
    // 是否持续监听引擎进程的连接状态
    const [keepalive, setKeepalive, getKeepalive] = useGetSetState<boolean>(false)
    /** 本地连接自定义端口号 */
    const [customPort, setCustomPort, getCustomPort] = useGetSetState<number>(GetConnectPort())
    const {theme, setTheme} = useTheme()
    /** 软件基础设置-主题 目前只有yakit社区版有 */
    const [softTheme, setSoftTheme, getSoftTheme] = useGetSetState<Theme>(theme)
    /** 软件基础设置-模式 目前只有yakit社区版有 */
    const [softMode, setSoftMode, getSoftMode] = useGetSetState<YakitSoftMode>("classic")
    /** 软件基础设置-语言 目前未支持 */
    const [softLang, setSoftLang, getSoftLang] = useGetSetState<Lange>("zh")

    // #region 软件开始进行逻辑启动
    useEffect(() => {
        if (SystemInfo.isDev) {
            if (getEngineLink() && getEngineMode() === "local") return
        }
        handleBuiltInCheck()
        handleFetchBaseInfo(() => {
            handleLinkEngineMode()
        })
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
     * 6、本地软件版本号、更新yak版本检测状态
     * 7、获取本地缓存连接端口号
     */
    const handleFetchBaseInfo = useMemoizedFn(async (nextFunc?: () => any) => {
        debugToPrintLog(`------ 获取系统基础信息 ------`)
        const tasks: Array<() => Promise<any>> = []
        // 是否开发环境
        if (SystemInfo.isDev === undefined) {
            tasks.push(() => handleFetchIsDev())
        }
        // 系统类型
        tasks.push(() =>
            handleFetchSystem((value) => {
                setSystem(value || "Windows_NT")
            })
        )
        // 架构
        if (SystemInfo.architecture === undefined) {
            tasks.push(() => handleFetchArchitecture())
        }
        // 引擎 是否安装
        tasks.push(() =>
            grpcFetchYakInstallResult(true).then((isInstalled) => {
                isEngineInstalled.current = isInstalled
            })
        )
        // 内置引擎版本
        tasks.push(() =>
            grpcFetchBuildInYakVersion(true).then((version) => {
                setBuildInEngineVersion(version)
            })
        )
        // 新安装 Yakit ，引擎需检查更新
        tasks.push(() =>
            grpcFetchLocalYakitVersion(true).then((appVersion) => {
                return getLocalValue(LocalGVS.LocalAppVersion)
                    .then((res) => {
                        if (res !== appVersion) {
                            setLocalValue(LocalGVS.NoYakVersionCheck, false)
                            setLocalValue(LocalGVS.LocalAppVersion, appVersion)
                        }
                    })
                    .catch(() => {})
            })
        )
        // 获取本地缓存端口号
        tasks.push(() =>
            getCachedLocalModePort().then((port) => {
                if (typeof port === "number") {
                    setCustomPort(port)
                }
            })
        )
        try {
            await Promise.allSettled(tasks.map((run) => run()))
        } catch (error) {}
        nextFunc?.()
    })

    const cacheLocalModePort = useMemoizedFn((port: number) => {
        if (getEngineMode() !== "local") return
        if (isCommunityEdition()) {
            // ce
            if (isCommunityIRify()) {
                setLocalValue(LocalGVS.IrifyPort, port)
            } else if (isCommunityMemfit()) {
                setLocalValue(LocalGVS.MemfitPort, port)
            } else {
                setLocalValue(LocalGVS.YakitPort, port)
            }
        } else if (isEnpriTrace()) {
            // ee
            if (isEnpriTraceIRify()) {
                setLocalValue(LocalGVS.IrifyEEPort, port)
            } else if (isMemfit()) {
                // 暂时没有ai企业版
            } else {
                setLocalValue(LocalGVS.YakitEEPort, port)
            }
        } else if (isEnpriTraceAgent()) {
            // se
            setLocalValue(LocalGVS.SEPort, port)
        }
    })

    const getCachedLocalModePort = async (): Promise<number | undefined> => {
        if (isCommunityEdition()) {
            // CE
            if (isCommunityIRify()) {
                return getLocalValue(LocalGVS.IrifyPort)
            } else if (isCommunityMemfit()) {
                return getLocalValue(LocalGVS.MemfitPort)
            } else {
                return getLocalValue(LocalGVS.YakitPort)
            }
        } else if (isEnpriTrace()) {
            // EE
            if (isEnpriTraceIRify()) {
                return getLocalValue(LocalGVS.IrifyEEPort)
            } else if (isMemfit()) {
                return undefined
            } else {
                return getLocalValue(LocalGVS.YakitEEPort)
            }
        } else if (isEnpriTraceAgent()) {
            // SE
            return getLocalValue(LocalGVS.SEPort)
        }
    }

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
                    }, 500)

                    return
                case "local":
                    setCheckLog((arr) => arr.concat(["获取连接模式成功——本地模式"]))
                    debugToPrintLog(`------ 连接引擎的模式: local ------`)
                    setTimeout(() => {
                        handleChangeLinkMode()
                    }, 500)
                    return
                default:
                    setCheckLog((arr) => arr.concat(["未获取到连接模式-默认(本地)模式"]))
                    debugToPrintLog(`------ 连接引擎的模式: local ------`)
                    setTimeout(() => {
                        handleChangeLinkMode()
                    }, 500)
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
        debugToPrintLog(`------ 开始执行本地连接 ------`)
        if (isInit) {
            if (localEngineRef.current) localEngineRef.current.init(getCustomPort())
        } else {
            if (localEngineRef.current) localEngineRef.current.link(getCustomPort())
        }
    })

    // 切换远程模式
    const handleLinkRemoteMode = useMemoizedFn(() => {
        onDisconnect()
        safeSetYakitStatus("")
        onSetEngineMode("remote")
    })

    // 本地连接的状态设置
    const setLinkLocalEngine = useMemoizedFn(() => {
        onDisconnect()
        safeSetYakitStatus("")
        onSetEngineMode("local")
        debugToPrintLog(`------ 启动环境检查逻辑 ------`)
        // 等YakitStatus更新
        setTimeout(() => {
            handleStartLocalLink(isCheckVersion.current)
            isInitLocalLink.current = false
        }, 500)
    })

    // 切换本地模式
    const handleLinkLocalMode = useMemoizedFn(() => {
        if (isEngineInstalled.current) {
            if (!isInitLocalLink.current) {
                setLinkLocalEngine()
                return
            }
            setCheckLog(["检查本地是否已安装引擎..."])
            setCheckLog(["本地已安装引擎，准备环境检查中..."])
            setTimeout(() => {
                setLinkLocalEngine()
            }, 500)
        } else {
            debugToPrintLog(`------ 启动无本地引擎逻辑 ------`)
            setCheckLog(["检查本地是否已安装引擎..."])
            setCheckLog(["本地没有引擎文件..."])
            setTimeout(() => {
                safeSetYakitStatus(getBuildInEngineVersion() ? "install" : "installNetWork")
                onSetEngineMode(undefined)
            }, 500)
        }
    })
    // #endregion

    // #region Yak引擎、Yakit下载更新逻辑
    // 检测到新版yakit的弹窗显示
    const [yakitUpdate, setYakitUpdate] = useState<boolean>(false)
    // 更新yaklang-modal
    const [yaklangDownload, setYaklangDownload] = useState<boolean>(false)
    const onDownloadedYaklang = useMemoizedFn((isOk: boolean) => {
        setYaklangDownload(false)
        if (["installNetWork", "skipAgreement_InstallNetWork", "old_version"].includes(getYakitStatus())) {
            setRestartLoading(false)
            isCheckVersion.current = true
            if (!isOk) {
                return
            }
        } else {
            isCheckVersion.current = false
        }
        setLinkLocalEngine()
    })

    // yakit不再提示更新
    const noHintYakitUpdate = useMemoizedFn((ignoreYakit: IgnoreYakit) => {
        safeSetYakitStatus("")
        if (ignoreYakit === "ignoreUpdates") {
            setLocalValue(LocalGVS.NoAutobootLatestVersionCheck, true)
        }
        if (localEngineRef.current) {
            localEngineRef.current.checkEngine()
        }
    })

    // yak不再提示更新
    const noHintYakUpdate = useMemoizedFn(() => {
        safeSetYakitStatus("")
        setLocalValue(LocalGVS.NoYakVersionCheck, true)
        if (localEngineRef.current) {
            localEngineRef.current.checkEngineSource()
        }
    })
    // #endregion

    // #region YakitLoading逻辑
    // YakitLoading 界面暂时无法操作
    const [yakitLoadingTip, setYakitLoadingTip] = useState<string>("")
    const [disableYakitLoading, setDisableYakitLoading] = useState<boolean>(false)
    // 手动重连时按钮的loading
    const [restartLoading, setRestartLoading] = useState<boolean>(false)
    const setTimeoutLoading = useMemoizedFn((setLoading: (v: boolean) => any, time = 2000) => {
        setLoading(true)
        setTimeout(() => {
            setLoading(false)
        }, time)
    })
    useEffect(() => {
        if (engineLink) {
            setRestartLoading(false)
        }
    }, [engineLink])
    // Loading页面切换引擎连接模式
    const loadingClickCallback = useMemoizedFn(
        (type: YaklangEngineMode | YakitStatusType, extra?: LoadingClickExtra) => {
            switch (type) {
                case "install":
                    // 解压内置引擎
                    initializeEngine(() => {
                        setCheckLog([`引擎：${getBuildInEngineVersion()}，解压成功，即将重启`])
                        grpcRelaunch()
                    })
                    return
                case "installNetWork":
                    // 一键安装（联网）
                    setRestartLoading(true)
                    setYaklangDownload(true)
                    return
                case "check_timeout":
                    // 超时手动校验引擎
                    setRestartLoading(true)
                    handleStartLocalLink(isCheckVersion.current)
                    return
                case "port_occupied_prev":
                    // 端口被占用前置操作
                    if (extra?.killCurProcess) {
                        setRestartLoading(true)
                        killCurrentProcess(() => {
                            handleStartLocalLink(isCheckVersion.current)
                        }, [getCustomPort()])
                    } else {
                        safeSetYakitStatus("port_occupied")
                    }
                    return
                case "port_occupied":
                    // 端口被占用
                    setRestartLoading(true)
                    setCustomPort(extra.port)
                    handleStartLocalLink(isCheckVersion.current)
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
                    ipcRenderer.invoke("engineLinkWin-done", {useOldLink: true})
                    return
                case "database_error":
                case "fix_database_timeout":
                    setRestartLoading(true)
                    // 校验数据库出现错误或超时
                    handleFixupDatabase()
                    return
                case "update_yakit":
                    // 检测到新版本yakit
                    if (extra?.downYakit) {
                        setRestartLoading(true)
                        setYakitUpdate(true)
                    } else {
                        noHintYakitUpdate(extra?.ignoreYakit)
                    }
                    return
                case "update_yak":
                    // 检测到当前版本低于内置版本
                    if (extra?.downYak) {
                        initializeEngine(() => {
                            setCheckLog([`引擎：${getBuildInEngineVersion()}，解压成功`])
                            if (localEngineRef.current) {
                                localEngineRef.current.checkEngineSource(getBuildInEngineVersion())
                            }
                        })
                    } else {
                        noHintYakUpdate()
                    }
                    return
                case "check_yak_version_error":
                    // 引擎权限错误-手动重启引擎
                    setRestartLoading(true)
                    setLinkLocalEngine()
                    return
                case "softwareBasics":
                    setRestartLoading(true)
                    setTheme(getSoftTheme())
                    if (isCommunityYakit()) {
                        setLocalValue(LocalGVS.YakitCESoftwareBasics, true)
                        setLocalValue(LocalGVS.YakitCEMode, getSoftMode())
                    }
                    if (localEngineRef.current) {
                        localEngineRef.current.startYakEngine()
                    }
                    break
                case "error":
                    // 引擎连接超时或意外断掉连接
                    setTimeoutLoading(setRestartLoading)
                    handleStartLocalLink(false)
                    isCheckVersion.current = false
                    setKeepalive(false)
                    return
                case "reclaimDatabaseSpace_start":
                    // TODO 连接窗口的回收按钮暂时屏蔽
                    setRestartLoading(true)
                    cancelCountdownLinkRef.current = false
                    breakHandleRef.current = false
                    outputToWelcomeConsole("手动触发回收数据库空间")
                    debugToPrintLog(`------ 手动触发回收数据库空间 ------`)
                    onDisconnect()
                    safeSetYakitStatus("reclaimDatabaseSpace_start")
                    killCurrentProcess(() => {
                        handleReclaimDatabaseSpace()
                    }, [getCustomPort()])
                    break
                case "reclaimDatabaseSpace_success":
                case "reclaimDatabaseSpace_error":
                    // 回收数据库空间成功或者失败
                    setRestartLoading(true)
                    safeSetYakitStatus("")
                    setTimeout(() => {
                        handleStartLocalLink(isCheckVersion.current)
                    }, 500)
                    break
                case "break":
                    // 用户点中断连接 或 手动连接引擎
                    if (extra?.linkAgain) {
                        // 手动点倒计时取消，再点连接
                        if (cancelCountdownLinkRef.current) {
                            cancelCountdownLinkRef.current = false
                            // 立即进入
                            setEngineLink(true)
                            safeSetYakitStatus("link")
                        } else {
                            breakHandleRef.current = false
                            safeSetYakitStatus("")
                            killCurrentProcess(() => {
                                setTimeout(() => {
                                    handleStartLocalLink(isCheckVersion.current)
                                }, 500)
                            }, [getCustomPort()])
                        }
                    } else {
                        // 否则执行断开
                        outputToWelcomeConsole("手动触发中断连接")
                        debugToPrintLog(`------ 手动触发中断连接 ------`)
                        safeSetYakitStatus("break")
                        onDisconnect()
                        setCheckLog(["已主动断开, 请点击手动连接引擎"])
                        breakHandleRef.current = true
                        setYakitLoadingTip("中断中...")
                        setRestartLoading(false)
                        setDisableYakitLoading(true)
                        cancelAllTasks()
                        setTimeout(() => {
                            setYakitLoadingTip("")
                            setDisableYakitLoading(false)
                        }, 3000)
                    }
                    return
                case "link_countdown":
                    // 倒计时用户点击立即进入或取消
                    clearCountDownTime()
                    if (extra?.enterNow) {
                        // 立即进入
                        setEngineLink(true)
                        safeSetYakitStatus("link")
                    } else {
                        cancelCountdownLinkRef.current = true
                        safeSetYakitStatus("break")
                    }
                    return
                default:
                    return
            }
        }
    )

    // 在 3 秒内，不断尝试让主进程取消所有正在执行的任务
    const cancelAllTasks = async () => {
        const start = Date.now()
        while (Date.now() - start < 3000) {
            let res: any = null
            try {
                res = await ipcRenderer.invoke(ipcEventPre + "cancel-all-tasks")
            } catch (e) {
                debugToPrintLog(`------ cancel-all-tasks failed: ${e}`)
            }
            if (!res || res.canceled === 0) {
                await new Promise((r) => setTimeout(r, 300))
            } else {
                await new Promise((r) => setTimeout(r, 500))
            }
        }
    }

    // 解压内置引擎
    const initializeEngine = useMemoizedFn((callback = () => {}) => {
        setCheckLog([`准备解压内置引擎：${getBuildInEngineVersion()}...`])
        setRestartLoading(true)
        setTimeout(async () => {
            try {
                await grpcUnpackBuildInYak(true)
                grpcWriteEngineKeyToYakitProjects({}, true).finally(() => {
                    safeSetYakitStatus("")
                    callback()
                })
            } catch (error) {
                setCheckLog([
                    isInitLocalLink.current
                        ? "初始化失败，请点击下载引擎继续使用..."
                        : `解压失败：${error}，请点击下载引擎继续使用...`
                ])
                safeSetYakitStatus(isInitLocalLink.current ? "installNetWork" : "skipAgreement_InstallNetWork")
            } finally {
                setRestartLoading(false)
            }
        }, 500)
    })

    // 数据库修复
    const [dbPath, setDbPath] = useState<string[]>([])
    const latestFixDBCallIdRef = useRef(0)
    const handleFixupDatabase = useMemoizedFn(async () => {
        const callId = ++latestFixDBCallIdRef.current
        // 中断连接 后续不执行
        if (breakHandleRef.current) {
            debugToPrintLog(`------ 开始修复数据库 被阻止 ------`)
            setCheckLog([])
            return
        }

        setCheckLog(["开始修复数据库中..."])
        try {
            const res = await grpcFixupDatabase({softwareVersion: FetchSoftwareVersion()})
            setRestartLoading(false)
            if (res.ok && res.status === "success") {
                setCheckLog((arr) => arr.concat(["修复数据库成功"]))
                safeSetYakitStatus("")
                setDbPath([])
                handleStartLocalLink(true)
                return
            }
            switch (res.status) {
                case "timeout":
                    setCheckLog((arr) => arr.concat(["命令执行超时，可查看日志详细信息..."]))
                    safeSetYakitStatus("fix_database_timeout")
                    break
                default:
                    setDbPath(res.json.path)
                    setCheckLog(["修复失败，可将日志信息发送给工作人员处理..."])
                    safeSetYakitStatus("fix_database_error")
            }
        } catch (error) {
            // 旧调用直接跳过
            if (callId !== latestFixDBCallIdRef.current) return
            // 如果意外情况则按照修复失败处理
            if (!breakHandleRef.current) {
                outputToWelcomeConsole(`修复数据库出现意外情况：${error}`)
                setCheckLog(["修复数据库出现意外情况，可查看日志详细信息..."])
                safeSetYakitStatus("fix_database_error")
            } else {
                setCheckLog(["已主动断开, 请点击手动连接引擎"])
                safeSetYakitStatus("break")
            }
        }
    })

    // 回收数据库空间
    const reclaimDbSpacePath = useRef<string[]>([])
    const handleReclaimDatabaseSpace = useMemoizedFn(async () => {
        setCheckLog(["回收数据库空间中，请勿关闭软件...", "退出或关闭可能会造成数据库损坏"])
        try {
            const res = await grpcReclaimDatabaseSpace({dbPath: reclaimDbSpacePath.current})
            setRestartLoading(false)
            if (res.ok && res.status === "success") {
                setCheckLog(["回收完成，请点击手动连接引擎"])
                safeSetYakitStatus("reclaimDatabaseSpace_success")
                return
            }
            setCheckLog(["回收失败，可将日志信息发送给工作人员处理..."])
            safeSetYakitStatus("reclaimDatabaseSpace_error")
        } catch (error) {
            // 如果意外情况，重新连接引擎
            outputToWelcomeConsole(`回收出现意外情况：${error}`)
            setCheckLog(["回收出现意外情况，可查看日志详细信息..."])
            safeSetYakitStatus("reclaimDatabaseSpace_error")
        }
    })
    // #endregion

    const killCurrentProcess = useMemoizedFn((callback: () => void, extraPorts?: number[]) => {
        // ---------- 1. PS 查询所有 yak 进程 ----------
        ipcRenderer
            .invoke(ipcEventPre + "ps-yak-grpc")
            .then(async (res) => {
                // 查找 PID
                const pidsToKill = res
                    .filter((p) => extraPorts.includes(Number(p.port)))
                    .map((p) => p.pid)
                    .filter(Boolean)

                if (pidsToKill.length === 0) {
                    callback()
                    return
                }

                // ---------- 2. kill ----------
                for (const pid of pidsToKill) {
                    try {
                        await ipcRenderer.invoke(ipcEventPre + "kill-yak-grpc", pid)
                        yakitNotify("info", `KILL yak PROCESS: ${pid}`)
                    } catch (err) {
                        yakitNotify("error", `Kill yak process failed: ${err}`)
                    }
                }

                callback()
            })
            .catch(() => {
                callback()
            })
    })

    // #region 远程连接&本地连接
    const [remoteLinkLoading, setRemoteLinkLoading] = useState<boolean>(false)
    // 开始远程连接引擎
    const handleLinkRemoteEngine = useMemoizedFn((info: RemoteLinkInfo) => {
        breakHandleRef.current = false
        cancelCountdownLinkRef.current = false
        safeSetYakitStatus("")
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
        breakHandleRef.current = false
        cancelCountdownLinkRef.current = false
        setCheckLog([])
        onSetEngineMode(undefined)
        // 可能isRemoteEngine状态值没有变
        setTimeout(() => {
            handleChangeLinkMode()
        }, 500)
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
        safeSetYakitStatus("ready")
        onStartLinkEngine()
    })

    // 断开连接
    const onDisconnect = useMemoizedFn(() => {
        setCredential({...DefaultCredential})
        setKeepalive(false)
        setEngineLink(false)
    })

    // 安全设置 keepalive，当手动点中断连接的时候，不需要再探测引擎是否存活
    const safeSetKeepalive = useMemoizedFn((value: boolean) => {
        if (breakHandleRef.current) {
            return
        }
        setKeepalive(value)
    })

    // 安全设置 yakitStatus，当手动点中断连接的时候，不能更新状态
    const safeSetYakitStatus = useMemoizedFn((value: YakitStatusType) => {
        if (breakHandleRef.current) {
            return
        }
        setYakitStatus(value)
    })

    // 开始连接引擎
    const onStartLinkEngine = useMemoizedFn(() => {
        isStopSend.current = false
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
        if (["break", "link_countdown", "link"].includes(getYakitStatus())) {
            return
        }
        if (getKeepalive()) {
            setCheckLog([])
            if (getEngineMode() === "local") {
                // 先设置倒计时状态
                safeSetYakitStatus("link_countdown")
                setCountdown(3)
                // 清除之前的定时器
                clearCountDownTime()
                // 开始倒计时
                let currentCount = 3
                countdownTimerRef.current = setInterval(() => {
                    currentCount -= 1
                    setCountdown(currentCount)

                    if (currentCount <= 0) {
                        clearCountDownTime()
                        // 倒计时结束，正式进入
                        if (getYakitStatus() === "link_countdown") {
                            safeSetYakitStatus("link")
                            setEngineLink(true)
                        }
                    }
                }, 1000)
            } else {
                safeSetYakitStatus("link")
                setEngineLink(true)
            }
        }
    })

    // 清理倒计时定时器
    const clearCountDownTime = useMemoizedFn(() => {
        if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current)
            countdownTimerRef.current = null
        }
    })
    useEffect(() => {
        return () => {
            clearCountDownTime()
        }
    }, [])

    // 引擎连接成功发送数据到主界面
    useEffect(() => {
        if (engineLink && getYakitStatus() === "link" && getCredential().Port && !isStopSend.current) {
            ipcRenderer.invoke("engineLinkWin-done", {useOldLink: false, credential: getCredential()})
        }
    }, [engineLink, yakitStatus])

    // 主界面远程连接引擎更新认证信息
    useEffect(() => {
        ipcRenderer.on("from-win-updateCredential", (e, data) => {
            const credential = data.credential
            setCredential(credential)
            onSetEngineMode(credential.Mode)
            isStopSend.current = true
        })
        return () => {
            ipcRenderer.removeAllListeners("from-win-updateCredential")
        }
    }, [])

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

            stopErrorStatusRef.current = false

            setLocalValue(LocalGVS.YaklangEngineMode, getEngineMode())

            // 缓存连接端口
            cacheLocalModePort(getCredential().Port)

            const waitTime: number = 5000
            const id = setInterval(() => {
                grpcFetchYakInstallResult(true)
                    .then((flag: boolean) => {
                        if (isEngineInstalled.current === flag) return
                        isEngineInstalled.current = flag
                        isInitLocalLink.current = true
                        isCheckVersion.current = true
                        breakHandleRef.current = false
                        cancelCountdownLinkRef.current = false
                        // 清空主进程yaklang版本缓存
                        ipcRenderer.invoke(ipcEventPre + "clear-local-yaklang-version-cache")
                    })
                    .catch(() => {})

                grpcFetchBuildInYakVersion(true)
                    .then((version) => {
                        setBuildInEngineVersion(version)
                    })
                    .catch(() => {})
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
        // 10以上的次数属于无效次数
        if (count > 10) {
            setKeepalive(false)
            return
        }

        debugToPrintLog(`[INFO] 目标引擎进程不存在: 探活失败${count}次`)
        setEngineLink(false)

        if (getYakitStatus() === "error" && count === 10) {
            // 连接断开后的10次尝试过后，不在进行尝试
            setCheckLog(["请点击手动连接引擎，再次尝试"])
            return
        }

        // 连接中触发
        if (getYakitStatus() === "link") {
            if (getEngineMode() === "remote") {
                yakitNotify("error", "远程连接已断开")
                onDisconnect()
                safeSetYakitStatus("")
                handleLinkRemoteMode()
            } else if (getEngineMode() === "local") {
                setCheckLog(["引擎连接未成功, 正在尝试重连"])
                if (count > 4) {
                    safeSetYakitStatus("error")
                }
            }
        }
    })

    // 主界面发送有关引擎操作的信息到连接界面
    useEffect(() => {
        ipcRenderer.on("from-win", (e, data) => {
            const type = data.yakitStatus
            if (type) {
                handleOperations(type, data)
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
                    safeSetYakitStatus("installNetWork")
                } else {
                    safeSetYakitStatus("skipAgreement_InstallNetWork")
                }
                break
            case "break": // 主动中断连接 或 小风车断开引擎
                safeSetYakitStatus("break")
                onDisconnect()
                setCheckLog(["已主动断开, 请点击手动连接引擎"])
                break
            case "reclaimDatabaseSpace_start":
                stopErrorStatusRef.current = true
                reclaimDbSpacePath.current = extra?.dbPath || []
                onDisconnect()
                safeSetYakitStatus("reclaimDatabaseSpace_start")
                handleReclaimDatabaseSpace()
                break
            case "install": // 下载的yaklang时候，或切换本地时 --- 本地引擎不存在
                onDisconnect()
                isEngineInstalled.current = false
                setTimeout(() => {
                    handleLinkLocalMode()
                }, 500)
                return
            case "installNetWork":
                onDisconnect()
                onSetEngineMode(undefined)
                safeSetYakitStatus("skipAgreement_InstallNetWork")
                return
            case "error":
                if (stopErrorStatusRef.current) return
                setEngineLink(false)
                safeSetYakitStatus("error")
                break
            case "local":
                onDisconnect()
                onSetEngineMode(undefined)
                isCheckVersion.current = false
                setTimeout(() => {
                    handleLinkLocalMode()
                }, 500)
                break
            default:
                break
        }
    })

    const startupLogo = useMemo(() => {
        // ce
        if (isCommunityEdition()) {
            if (isCommunityIRify()) {
                return {type: "svg", component: SolidIrifyFontLogoIcon, width: 112, height: 41}
            } else if (isCommunityMemfit()) {
                return {type: "svg", component: SolidMemfitFontLogoIcon, width: 112, height: 41}
            } else {
                return {type: "svg", component: SolidYakitFontLogoIcon, width: 112, height: 41}
            }
        }

        // ee
        if (isEnpriTrace()) {
            if (isEnpriTraceIRify()) {
                return {type: "svg", component: SolidIrifyFontLogoIcon, width: 112, height: 41}
            } else if (isMemfit()) {
                return {type: "svg", component: SolidMemfitFontLogoIcon, width: 112, height: 41}
            } else {
                return {type: "img", src: theme === "light" ? yakitEELogo : yakitEEDarkLogo, width: 137, height: 40}
            }
        }

        // se
        if (isEnpriTraceAgent()) {
            return {type: "img", src: theme === "light" ? yakitSELogo : yakitSEDarkLogo, width: 190, height: 40}
        }

        return {type: "svg", component: SolidYakitFontLogoIcon, width: 112, height: 41}
    }, [theme])

    const startupRightImg = useMemo(() => {
        if (isIRify()) {
            return <img src={irifyRight} alt='暂无图片' />
        }
        if (isCommunityMemfit() || isMemfit())
            return (
                <video
                    src={theme === "light" ? memfitRight : memfitRightDark}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload='auto'
                />
            )
        return <img src={yakitRight} alt='暂无图片' />
    }, [theme])

    return (
        <div className={styles["startup-wrapper"]}>
            <div className={styles["startup-header-drap"]}></div>
            <div className={styles["startup-wrapper-left"]}>
                <div className={styles["startup-title"]}>
                    <div className={styles["startup-logo"]}>
                        {startupLogo.type === "img" ? (
                            <img
                                src={startupLogo.src}
                                alt='暂无图片'
                                width={startupLogo.width}
                                height={startupLogo.height}
                            />
                        ) : (
                            <startupLogo.component style={{height: startupLogo.height, width: startupLogo.width}} />
                        )}
                    </div>
                    <div className={styles["startup-desc"]}>为网络安全而生</div>
                </div>
                <YaklangEngineWatchDog
                    credential={credential}
                    keepalive={keepalive}
                    engineLink={engineLink}
                    onKeepaliveShouldChange={safeSetKeepalive}
                    onReady={onReady}
                    onFailed={onFailed}
                    yakitStatus={yakitStatus}
                    setYakitStatus={safeSetYakitStatus}
                    setCheckLog={setCheckLog}
                />
                <div
                    className={styles["startup-engine-log"]}
                    style={{display: isRemoteEngine || yakitStatus === "softwareBasics" ? "none" : "block"}}
                >
                    <EngineLog />
                </div>
                {!isRemoteEngine ? (
                    <div className={styles["startup-content-wrapper"]}>
                        <LocalEngine
                            ref={localEngineRef}
                            setLog={setCheckLog}
                            onLinkEngine={handleLinkLocalEngine}
                            yakitStatus={yakitStatus}
                            setYakitStatus={safeSetYakitStatus}
                            buildInEngineVersion={buildInEngineVersion}
                            setRestartLoading={setRestartLoading}
                            yakitUpdate={yakitUpdate}
                            setYakitUpdate={setYakitUpdate}
                        />
                        {!engineLink && (
                            <>
                                <YakitLoading
                                    yakitLoadingTip={yakitLoadingTip}
                                    disableYakitLoading={disableYakitLoading}
                                    isTop={isTop}
                                    setIsTop={setIsTop}
                                    system={system}
                                    buildInEngineVersion={buildInEngineVersion}
                                    checkLog={checkLog}
                                    yakitStatus={yakitStatus}
                                    engineMode={engineMode || "local"}
                                    restartLoading={restartLoading}
                                    dbPath={dbPath}
                                    btnClickCallback={loadingClickCallback}
                                    port={customPort}
                                    countdown={countdown}
                                    softTheme={softTheme}
                                    setSoftTheme={setSoftTheme}
                                    softMode={softMode}
                                    setSoftMode={setSoftMode}
                                    softLang={softLang}
                                    setSoftLang={setSoftLang}
                                />
                                {/* 更新引擎 */}
                                {yaklangDownload && (
                                    <DownloadYaklang
                                        isTop={isTop}
                                        setIsTop={setIsTop}
                                        yaklangSpecifyVersion={""}
                                        system={system}
                                        visible={yaklangDownload}
                                        onCancel={onDownloadedYaklang}
                                    />
                                )}
                            </>
                        )}
                    </div>
                ) : (
                    <>
                        {!engineLink && (
                            <RemoteEngine
                                loading={remoteLinkLoading}
                                setLoading={setRemoteLinkLoading}
                                onSubmit={handleLinkRemoteEngine}
                                onSwitchLocalEngine={handleRemoteToLocal}
                            />
                        )}
                    </>
                )}
            </div>
            <div className={styles["startup-wrapper-right"]}>{startupRightImg}</div>
        </div>
    )
}
