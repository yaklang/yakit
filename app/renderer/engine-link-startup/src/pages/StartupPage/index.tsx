import React, {useEffect, useMemo, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {handleFetchArchitecture, handleFetchIsDev, handleFetchSystem, SystemInfo} from "./utils"
import {
    grpcFetchBuildInYakVersion,
    grpcFetchLocalYakitVersion,
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
import yakitLogo from "@/assets/YakitLogo.png"
import yakitEELogo from "@/assets/yakitEELogo.png"
import yakitSELogo from "@/assets/yakitSELogo.png"
import irifyRight from "@/assets/irify-right.png"
import yakitRight from "@/assets/yakit-right.png"
import memfitRight from "@/assets/memfit-right.webm"
import memfitRightDark from "@/assets/memfit-right-dark.webm"

import styles from "./index.module.scss"
import {SolidIrifyFontLogoIcon, SolidMemfitFontLogoIcon} from "@/assets/colors"

import {useTheme} from "@/hooks/useTheme"

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
    /** yakit使用状态 */
    const [yakitStatus, setYakitStatus, getYakitStatus] = useGetSetState<YakitStatusType>("")
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
    // 是否持续监听引擎进程的连接状态
    const [keepalive, setKeepalive, getKeepalive] = useGetSetState<boolean>(false)
    /** 本地连接自定义端口号 */
    const [customPort, setCustomPort, getCustomPort] = useGetSetState<number>(GetConnectPort())

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
     * 6、本地软件版本号、更新yak版本检测状态
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

        await Promise.allSettled(tasks.map((run) => run()))
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
            if (localEngineRef.current) localEngineRef.current.init(getCustomPort())
        } else {
            if (localEngineRef.current) localEngineRef.current.link(getCustomPort())
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
        handleStartLocalLink(isCheckVersion.current)
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
            setCheckLog(["本地已安装引擎，准备环境检查中..."])
            setTimeout(() => {
                setLinkLocalEngine()
            }, 1000)
        } else {
            debugToPrintLog(`------ 启动无本地引擎逻辑 ------`)
            setCheckLog(["检查本地是否已安装引擎..."])
            setCheckLog(["本地没有引擎文件..."])
            setTimeout(() => {
                setYakitStatus(getBuildInEngineVersion() ? "install" : "installNetWork")
                onSetEngineMode(undefined)
            }, 1000)
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
        setYakitStatus("")
        if (ignoreYakit === "ignoreUpdates") {
            setLocalValue(LocalGVS.NoAutobootLatestVersionCheck, true)
        }
        if (localEngineRef.current) {
            localEngineRef.current.checkEngine()
        }
    })

    // yak不再提示更新
    const noHintYakUpdate = useMemoizedFn(() => {
        setYakitStatus("")
        setLocalValue(LocalGVS.NoYakVersionCheck, true)
        if (localEngineRef.current) {
            localEngineRef.current.checkEngineSource()
        }
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
                        setYakitStatus("port_occupied")
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
                case "error":
                    // 引擎连接超时或意外断掉连接
                    setTimeoutLoading(setRestartLoading)
                    handleStartLocalLink(false)
                    isCheckVersion.current = false
                    setKeepalive(false)
                    return
                case "break":
                    // 主动断开引擎
                    setTimeoutLoading(setRestartLoading)
                    handleStartLocalLink(false)
                    isCheckVersion.current = false
                    return
                default:
                    return
            }
        }
    )

    // 解压内置引擎
    const initializeEngine = useMemoizedFn((callback = () => {}) => {
        setCheckLog([`准备解压内置引擎：${getBuildInEngineVersion()}...`])
        setRestartLoading(true)
        setTimeout(async () => {
            try {
                await grpcUnpackBuildInYak(true)
                grpcWriteEngineKeyToYakitProjects({}, true).finally(() => {
                    setYakitStatus("")
                    callback()
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
        }, 500)
    })

    // 数据库修复
    const [dbPath, setDbPath] = useState<string[]>([])
    const handleFixupDatabase = useMemoizedFn(async () => {
        setCheckLog(["开始修复数据库中..."])
        try {
            const res = await grpcFixupDatabase({softwareVersion: FetchSoftwareVersion()})
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
        } catch (error) {
            yakitNotify("error", "fix db：" + error + "，建议重启软件")
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
        if (getKeepalive()) {
            setCheckLog([])
            setYakitStatus("link")
            setEngineLink(true)
        }
    })
    useEffect(() => {
        if (engineLink && getYakitStatus() === "link" && getCredential().Port && !isStopSend.current) {
            ipcRenderer.invoke("engineLinkWin-done", {useOldLink: false, credential: getCredential()})
            cacheLocalModePort(getCredential().Port)
        }
    }, [engineLink])
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

            setLocalValue(LocalGVS.YaklangEngineMode, getEngineMode())

            const waitTime: number = 5000
            const id = setInterval(() => {
                grpcFetchYakInstallResult(true)
                    .then((flag: boolean) => {
                        if (isEngineInstalled.current === flag) return
                        isEngineInstalled.current = flag
                        isInitLocalLink.current = true
                        isCheckVersion.current = true
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
                handleOperations("remote")
            }

            if (getEngineMode() === "local") {
                if (getYakitStatus() === "link") setCheckLog(["引擎连接超时, 正在尝试重连"])
                if (count > 4) {
                    setYakitStatus("error")
                }
            }
        }
    })

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
                setTimeout(() => {
                    handleLinkLocalMode()
                }, 500)
                return
            case "installNetWork":
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
                return {type: "img", src: yakitLogo, width: 112, height: 41}
            }
        }

        // ee
        if (isEnpriTrace()) {
            if (isEnpriTraceIRify()) {
                return {type: "svg", component: SolidIrifyFontLogoIcon, width: 112, height: 41}
            } else if (isMemfit()) {
                return {type: "svg", component: SolidMemfitFontLogoIcon, width: 112, height: 41}
            } else {
                return {type: "img", src: yakitEELogo, width: 137, height: 40}
            }
        }

        // se
        if (isEnpriTraceAgent()) {
            return {type: "img", src: yakitSELogo, width: 190, height: 40}
        }

        return {src: yakitLogo, width: 112, height: 41}
    }, [])

    const {theme} = useTheme()

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
                    onKeepaliveShouldChange={setKeepalive}
                    onReady={onReady}
                    onFailed={onFailed}
                    setYakitStatus={setYakitStatus}
                    setCheckLog={setCheckLog}
                />
                <div className={styles["startup-engine-log"]} style={{display: isRemoteEngine ? "none" : "block"}}>
                    <EngineLog />
                </div>
                {!isRemoteEngine ? (
                    <>
                        <div className={styles["startup-content-wrapper"]}>
                            <LocalEngine
                                ref={localEngineRef}
                                setLog={setCheckLog}
                                onLinkEngine={handleLinkLocalEngine}
                                setYakitStatus={setYakitStatus}
                                buildInEngineVersion={buildInEngineVersion}
                                setRestartLoading={setRestartLoading}
                                yakitUpdate={yakitUpdate}
                                setYakitUpdate={setYakitUpdate}
                            />
                            {!engineLink && (
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
                                    port={customPort}
                                />
                            )}
                            {!engineLink && yaklangDownload && (
                                // 更新引擎
                                <DownloadYaklang
                                    isTop={isTop}
                                    setIsTop={setIsTop}
                                    yaklangSpecifyVersion={""}
                                    system={system}
                                    visible={yaklangDownload}
                                    onCancel={onDownloadedYaklang}
                                />
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        {!engineLink && yakitStatus !== "control-remote" && (
                            <RemoteEngine
                                loading={remoteLinkLoading}
                                setLoading={setRemoteLinkLoading}
                                installedEngine={isEngineInstalled.current}
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
