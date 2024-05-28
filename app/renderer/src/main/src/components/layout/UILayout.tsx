import React, {useEffect, useMemo, useRef, useState} from "react"
import {useCreation, useMemoizedFn} from "ahooks"
import {MacUIOp} from "./MacUIOp"
import {PerformanceDisplay, yakProcess} from "./PerformanceDisplay"
import {FuncDomain} from "./FuncDomain"
import {TemporaryProjectPop, WinUIOp} from "./WinUIOp"
import {GlobalState} from "./GlobalState"
import {YakitGlobalHost} from "./YakitGlobalHost"
import {
    EngineWatchDogCallbackType,
    YakitSettingCallbackType,
    YakitStatusType,
    YakitSystem,
    YaklangEngineMode
} from "@/yakitGVDefine"
import {failed, info, warn, yakitFailed} from "@/utils/notification"
import {LocalGV, RemoteGV} from "@/yakitGV"
import {EngineModeVerbose, YakitLoading} from "../basics/YakitLoading"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {getLocalValue, getRemoteValue, setLocalValue, setRemoteValue} from "@/utils/kv"
import {YaklangEngineWatchDog, YaklangEngineWatchDogCredential} from "@/components/layout/YaklangEngineWatchDog"
import {StringToUint8Array} from "@/utils/str"
import {EngineLog} from "./EngineLog"
import {BaseMiniConsole} from "../baseConsole/BaseConsole"
import {getReleaseEditionName, isCommunityEdition, isEnpriTraceAgent, isEnterpriseEdition} from "@/utils/envfile"
import {AllKillEngineConfirm} from "./AllKillEngineConfirm"
import {SoftwareSettings} from "@/pages/softwareSettings/SoftwareSettings"
import {PolygonIcon, StopIcon} from "@/assets/newIcon"
import EnterpriseJudgeLogin from "@/pages/EnterpriseJudgeLogin"
import {
    ExportProjectProps,
    NewProjectAndFolder,
    ProjectDescription,
    TransferProject
} from "@/pages/softwareSettings/ProjectManage"
import {YakitHint} from "../yakitUI/YakitHint/YakitHint"
import {YakitSpin} from "../yakitUI/YakitSpin/YakitSpin"
import {useScreenRecorder} from "@/store/screenRecorder"
import {ResultObjProps, remoteOperation} from "@/pages/dynamicControl/DynamicControl"
import {useStore, yakitDynamicStatus} from "@/store"
import yakitCattle from "@/assets/yakitCattle.png"
import {useTemporaryProjectStore} from "@/store/temporaryProject"
import emiter from "@/utils/eventBus/eventBus"
import {RemoteEngine} from "./RemoteEngine/RemoteEngine"
import {RemoteLinkInfo} from "./RemoteEngine/RemoteEngineType"
import {LocalEngine} from "./LocalEngine/LocalEngine"
import {InstallEngine} from "./update/InstallEngine"
import {LocalEngineLinkFuncProps} from "./LocalEngine/LocalEngineType"
import {DownloadYakit} from "./update/DownloadYakit"
import {DownloadYaklang} from "./update/DownloadYaklang"
import {HelpDoc} from "./HelpDoc/HelpDoc"
import {SolidHomeIcon} from "@/assets/icon/solid"
import {ChatCSGV} from "@/enums/chatCS"
import {CheckEngineVersion} from "./CheckEngineVersion/CheckEngineVersion"
import {EngineRemoteGV} from "@/enums/engine"
import {outputToPrintLog} from "./WelcomeConsoleUtil"

import classNames from "classnames"
import styles from "./uiLayout.module.scss"
import { setNowProjectDescription } from "@/pages/globalVariable"
import { apiGetGlobalNetworkConfig, apiSetGlobalNetworkConfig } from "@/pages/spaceEngine/utils"
import { GlobalNetworkConfig } from "../configNetwork/ConfigNetworkPage"
import { ThirdPartyApplicationConfigForm } from "../configNetwork/ThirdPartyApplicationConfig"
import { showYakitModal } from "../yakitUI/YakitModal/YakitModalConfirm"
import { YakitGetOnlinePlugin } from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"

const {ipcRenderer} = window.require("electron")

const DefaultCredential: YaklangEngineWatchDogCredential = {
    Host: "127.0.0.1",
    IsTLS: false,
    Password: "",
    PemBytes: undefined,
    Port: 0,
    Mode: undefined
}

export interface UILayoutProp {
    children?: React.ReactNode
    linkSuccess?: () => any
}

const UILayout: React.FC<UILayoutProp> = (props) => {
    /** ---------- 软件级功能设置 Start ---------- */
    // 顶部是否可以拖拽并移动软件位置
    const [drop, setDrop] = useState<boolean>(true)
    useEffect(() => {
        emiter.on("setYakitHeaderDraggable", (v: boolean) => setDrop(v))
        return () => {
            emiter.off("setYakitHeaderDraggable")
        }
    }, [])

    /** MACOS 上双击放大窗口(不是最大化) */
    const maxScreen = () => {
        ipcRenderer
            .invoke("UIOperate", "max")
            .then(() => {})
            .catch(() => {})
    }
    /** ---------- 软件级功能设置 End ---------- */

    /** ---------- 软件状态相关属性 Start ---------- */
    const [system, setSystem] = useState<YakitSystem>("Darwin")
    const [arch, setArch] = useState<string>("x64")
    const isDev = useRef<boolean>(false)

    /** 本地引擎自检输出日志 */
    const [checkLog, setCheckLog] = useState<string[]>(["软件启动中，开始前置检查..."])

    /** 引擎是否安装 */
    const isEngineInstalled = useRef<boolean>(false)

    /** 当前引擎模式 */
    const [engineMode, setEngineMode] = useState<YaklangEngineMode>()
    const cacheEngineMode = useRef<YaklangEngineMode>()
    const onSetEngineMode = useMemoizedFn((v?: YaklangEngineMode) => {
        setEngineMode(v)
        cacheEngineMode.current = v
    })
    /** 是否为远程模式 */
    const isRemoteEngine = useMemo(() => engineMode === "remote", [engineMode])

    /** 认证信息 */
    const [credential, setCredential] = useState<YaklangEngineWatchDogCredential>({...DefaultCredential})

    /** yakit使用状态 */
    const [yakitStatus, setYakitStatus] = useState<YakitStatusType>("")
    const cacheYakitStatus = useRef<YakitStatusType>("")
    const onSetYakitStatus = useMemoizedFn((v: YakitStatusType) => {
        setYakitStatus(v)
        cacheYakitStatus.current = v
    })

    /** 当前引擎连接状态 */
    const [engineLink, setEngineLink] = useState<boolean>(false)
    const cacheEngineLink = useRef<boolean>(false)
    const onSetEngineLink = useMemoizedFn((v: boolean) => {
        setEngineLink(v)
        cacheEngineLink.current = v
    })

    /** 是否为初次启动本地连接 */
    const isInitLocalLink = useRef<boolean>(true)

    // 本地连接ref
    const localEngineRef = useRef<LocalEngineLinkFuncProps>(null)
    // 是否持续监听引擎进程的连接状态
    const [keepalive, setKeepalive] = useState<boolean>(false)
    /** ---------- 软件状态相关属性 End ---------- */

    /** ---------- 引擎状态和连接相关逻辑 Start ---------- */
    /** 插件漏洞信息库自检 */
    const handleBuiltInCheck = useMemoizedFn(() => {
        ipcRenderer
            .invoke("InitCVEDatabase")
            .then(() => {
                info("漏洞信息库自检完成")
            })
            .catch((e) => {
                info(`漏洞信息库检查错误：${e}`)
            })
    })

    /**
     * 获取信息
     * 1、开发环境
     * 2、操作系统
     * 3、cpu架构
     * 4、引擎是否存在
     */
    const handleFetchBaseInfo = useMemoizedFn(async (nextFunc?: () => any) => {
        try {
            isDev.current = !!(await ipcRenderer.invoke("is-dev"))
        } catch (error) {}
        try {
            const systemName: YakitSystem = await ipcRenderer.invoke("fetch-system-name")
            setSystem(systemName)
        } catch (error) {}
        try {
            const cpuArch: string = await ipcRenderer.invoke("fetch-cpu-arch")
            setArch(cpuArch)
        } catch (error) {}
        try {
            const isInstalled = await ipcRenderer.invoke("is-yaklang-engine-installed")
            isEngineInstalled.current = isInstalled
        } catch (error) {}

        if (nextFunc) nextFunc()
    })

    /** 获取上次连接引擎的模式 */
    const handleLinkEngineMode = useMemoizedFn(() => {
        setCheckLog(["获取上次连接引擎的模式..."])
        getLocalValue(LocalGV.YaklangEngineMode).then((val: YaklangEngineMode) => {
            switch (val) {
                case "remote":
                    setCheckLog((arr) => arr.concat(["获取连接模式成功——远程模式"]))
                    setTimeout(() => {
                        handleChangeLinkMode(true)
                    }, 1000)

                    return
                case "local":
                    setCheckLog((arr) => arr.concat(["获取连接模式成功——本地模式"]))
                    setTimeout(() => {
                        handleChangeLinkMode()
                    }, 1000)
                    return
                default:
                    setCheckLog((arr) => arr.concat(["未获取到连接模式-默认(本地)模式"]))
                    setTimeout(() => {
                        handleChangeLinkMode()
                    }, 1000)
                    return
            }
        })
    })

    // 切换远程模式
    const handleLinkRemoteMode = useMemoizedFn(() => {
        onDisconnect()
        onSetYakitStatus("")
        onSetEngineMode("remote")
    })
    // 本地连接的状态设置
    const setLinkLocalEngine = useMemoizedFn(() => {
        onDisconnect()
        onSetYakitStatus("")
        onSetEngineMode("local")
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
            setCheckLog((arr) => arr.concat(["本地已安装引擎，准备连接中..."]))
            setTimeout(() => {
                setLinkLocalEngine()
            }, 1000)
        } else {
            setCheckLog(["检查本地是否已安装引擎..."])
            setCheckLog((arr) => arr.concat(["本地未安装引擎，准备启动安装引擎弹窗"]))
            setTimeout(() => {
                onSetYakitStatus("install")
                onSetEngineMode(undefined)
            }, 1000)
        }
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
    const handleStartLocalLink = useMemoizedFn((isInit?: boolean) => {
        if (isInit) {
            if (localEngineRef.current) localEngineRef.current.init()
        } else {
            if (localEngineRef.current) localEngineRef.current.link()
        }
    })

    useEffect(() => {
        setTimeout(() => {
            /**
             * dev环境下，如果已连接本地引擎，则不需要再次连接
             */
            if (isDev.current) {
                if (cacheEngineLink.current && cacheEngineMode.current === "local") return
            }

            handleBuiltInCheck()
            handleFetchBaseInfo(() => {
                handleLinkEngineMode()
            })
        }, 1000)
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

            if (props.linkSuccess) {
                props.linkSuccess()
                // 下面的三行为以前的老逻辑
                onSetYakitStatus("link")
                setShowEngineLog(false)
            }

            setLocalValue(LocalGV.YaklangEngineMode, cacheEngineMode.current)

            const waitTime: number = 20000
            const id = setInterval(() => {
                ipcRenderer.invoke("is-yaklang-engine-installed").then((flag: boolean) => {
                    if (isEngineInstalled.current === flag) return
                    isEngineInstalled.current = flag
                    isInitLocalLink.current = true
                    // 清空主进程yaklang版本缓存
                    ipcRenderer.invoke("clear-local-yaklang-version-cache")
                })
            }, waitTime)
            return () => {
                clearInterval(id)
            }
        } else {
            // 清空主进程yaklang版本缓存
            ipcRenderer.invoke("clear-local-yaklang-version-cache")
        }
    }, [engineLink])
    /** ---------- 引擎状态和连接相关逻辑 End ---------- */

    /** ---------- 软件状态与是否连接引擎相关方法 Start ---------- */
    // 断开连接
    const onDisconnect = useMemoizedFn(() => {
        setCredential({...DefaultCredential})
        setKeepalive(false)
        onSetEngineLink(false)
    })
    // 开始连接引擎
    const onStartLinkEngine = useMemoizedFn((isDynamicControl?: boolean) => {
        setTimeout(() => {
            emiter.emit("startAndCreateEngineProcess", isDynamicControl)
        }, 100)
    })

    // 状态完成后的回调
    const handleStatusCompleted = useMemoizedFn((type: YakitStatusType) => {
        switch (type) {
            case "install":
                // 安装引擎完成后
                setCheckLog([])
                isEngineInstalled.current = true
                handleLinkLocalMode()
                return

            default:
                return
        }
    })

    // 开始本地连接引擎
    const handleLinkLocalEngine = useMemoizedFn((port: number) => {
        setCheckLog([`本地普通权限引擎模式，开始启动本地引擎-端口: ${port}`])
        setCredential({
            Host: "127.0.0.1",
            IsTLS: false,
            Password: "",
            PemBytes: undefined,
            Port: port,
            Mode: "local"
        })
        onSetYakitStatus("ready")
        onStartLinkEngine()
        outputToPrintLog("local-start-test-engine-link-status")
    })

    const [remoteLinkLoading, setRemoteLinkLoading] = useState<boolean>(false)
    // 开始远程连接引擎
    const handleLinkRemoteEngine = useMemoizedFn((info: RemoteLinkInfo) => {
        setRemoteLinkLoading(true)
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
    /** ---------- 软件状态与是否连接引擎相关方法 End ---------- */

    /** ---------- 各种操作逻辑处理 Start ---------- */
    // 引擎日志终端
    const [yakitConsole, setYakitConsole] = useState<boolean>(false)

    /**
     * 打开引擎日志终端
     */
    useEffect(() => {
        emiter.on("openEngineLogTerminal", () => {
            setYakitConsole(true)
        })
        return () => {
            emiter.off("openEngineLogTerminal")
        }
    }, [])

    useEffect(() => {
        if (engineLink) {
        } else {
            setYakitConsole(false)
        }
    }, [engineLink])

    const setTimeoutLoading = useMemoizedFn((setLoading: (v: boolean) => any) => {
        setLoading(true)
        setTimeout(() => {
            setLoading(false)
        }, 2000)
    })

    // 手动重连时按钮的loading
    const [restartLoading, setRestartLoading] = useState<boolean>(false)
    // 远程控制时的刷新按钮loading
    const [remoteControlRefreshLoading, setRemoteControlRefreshLoading] = useState<boolean>(false)
    useEffect(() => {
        if (engineLink) {
            setRestartLoading(false)
            setRemoteControlRefreshLoading(false)
        }
    }, [engineLink])
    // Loading页面切换引擎连接模式
    const loadingClickCallback = useMemoizedFn((type: YaklangEngineMode | YakitStatusType) => {
        switch (type) {
            case "checkError":
                // 引擎权限错误-手动重启引擎
                setTimeoutLoading(setRestartLoading)
                setLinkLocalEngine()
                return
            case "error":
                // 引擎连接超时
                setTimeoutLoading(setRestartLoading)
                handleStartLocalLink(isInitLocalLink.current)
                isInitLocalLink.current = false
                setKeepalive(false)
                return
            case "break":
                // 主动断开引擎
                setTimeoutLoading(setRestartLoading)
                handleStartLocalLink(isInitLocalLink.current)
                isInitLocalLink.current = false
                return
            case "control-remote":
                // 远程控制连接时的刷新
                setTimeoutLoading(setRemoteControlRefreshLoading)
                onStartLinkEngine(true)
                return

            case "remote":
                handleLinkRemoteMode()
                return
            case "local":
                handleLinkLocalMode()
                return

            default:
                return
        }
    })

    const handleOperations = useMemoizedFn((type: YakitSettingCallbackType | YaklangEngineMode) => {
        switch (type) {
            case "break":
                if (cacheYakitStatus.current === "link") {
                    onSetYakitStatus("break")
                    setTimeout(() => {
                        setCheckLog(["已主动断开, 请点击手动连接引擎"])
                        onDisconnect()
                    }, 100)
                }
                return

            case "local":
                info(`引擎状态切换为: ${EngineModeVerbose("local")}`)
                delTemporaryProject()
                onSetEngineMode(undefined)
                onDisconnect()
                handleLinkLocalMode()
                return
            case "remote":
                info(`引擎状态切换为: ${EngineModeVerbose("remote")}`)
                delTemporaryProject()
                onSetEngineMode(undefined)
                handleLinkRemoteMode()
                return

            case "console":
                setYakitConsole(true)
                return

            case "changeProject":
                // yakit-ui进入项目管理
                changeYakitMode("soft")
                return
            case "encryptionProject":
                // 加密导出
                if (!currentProject || !currentProject.Id) {
                    failed("当前项目无关键信息，无法导出!")
                    return
                }
                setShowProjectManage(true)
                const encryption = structuredClone(currentProject)
                if (encryption.ProjectName === "[temporary]") {
                    encryption.ProjectName = "临时项目"
                    setIsExportTemporaryProjectFlag(true)
                }
                setProjectModalInfo({visible: true, isNew: false, isExport: true, project: encryption})
                return
            case "plaintextProject":
                // 明文导出
                if (!currentProject || !currentProject.Id) {
                    failed("当前项目无关键信息，无法导出!")
                    return
                }
                setShowProjectManage(true)
                const plaintext = structuredClone(currentProject)
                if (plaintext.ProjectName === "[temporary]") {
                    plaintext.ProjectName = "临时项目"
                    setIsExportTemporaryProjectFlag(true)
                }
                setProjectTransferShow({
                    visible: true,
                    isExport: true,
                    data: {
                        Id: plaintext.Id,
                        ProjectName: plaintext.ProjectName,
                        Password: ""
                    }
                })
                return

            default:
                break
        }
    })
    /** ---------- 各种操作逻辑处理 End ---------- */

    /** ---------- yakit和yaklang的更新(以连接引擎的状态下) & kill引擎进程 Start ---------- */
    // 更新yakit-modal
    const [yakitDownload, setYakitDownload] = useState<boolean>(false)
    // 更新yaklang前置-关闭所有引擎进程modal
    const [yaklangKillPss, setYaklangKillPss] = useState<boolean>(false)
    // 更新yaklang-modal
    const [yaklangDownload, setYaklangDownload] = useState<boolean>(false)
    // 监听UI上的更新yakit或yaklang更新功能
    const handleActiveDownloadModal = useMemoizedFn((type: string) => {
        if (yaklangKillPss || yakitDownload) return
        if (type === "yakit") setYakitDownload(true)
        if (type === "yaklang") setYaklangKillPss(true)
    })
    // kill完引擎进程后开始更新引擎
    const killedEngineToUpdate = useMemoizedFn(() => {
        setYaklangKillPss(false)
        if (!yaklangDownload) {
            onSetEngineLink(false)
            setKeepalive(false)
            setYaklangDownload(true)
        }
    })

    // kill完引擎进程后开始更新指定Yaklang版本引擎
    const [yaklangSpecifyVersion, setYaklangSpecifyVersion] = useState<string>("")
    const downYaklangSpecifyVersion = (version: string) => {
        setYaklangSpecifyVersion(version)
        killedEngineToUpdate()
    }
    useEffect(() => {
        emiter.on("downYaklangSpecifyVersion", downYaklangSpecifyVersion)
        return () => {
            emiter.off("downYaklangSpecifyVersion", downYaklangSpecifyVersion)
        }
    }, [])

    const onDownloadedYaklang = useMemoizedFn(() => {
        setYaklangDownload(false)
        setLinkLocalEngine()
    })

    const [killOldEngine, setKillOldEngine] = useState<boolean>(false)
    const [killLoading, setKillLoading] = useState<boolean>(false)
    const killOldProcess = useMemoizedFn(() => {
        let isFailed: boolean = false
        let port: number = 0
        let pid: number = 0

        if (cacheEngineLink.current) {
            setKillLoading(true)

            ipcRenderer
                .invoke("fetch-yaklang-engine-addr")
                .then((data) => {
                    const hosts: string[] = (data.addr as string).split(":")
                    if (hosts.length !== 2) return
                    if (+hosts[1]) port = +hosts[1] || 0
                })
                .catch((e) => {
                    failed(`获取引擎进程错误 ${e}`)
                    isFailed = true
                })
                .finally(() => {
                    if (isFailed) {
                        setTimeout(() => setKillLoading(false), 300)
                        return
                    }
                    ipcRenderer
                        .invoke("ps-yak-grpc")
                        .then((i: yakProcess[]) => {
                            const pss = i.find((item) => +item.port === port)
                            if (pss) pid = pss.pid || 0
                        })
                        .catch((e) => {
                            failed(`PS | GREP yak failed ${e}`)
                            isFailed = true
                        })
                        .finally(() => {
                            if (isFailed) {
                                setTimeout(() => setKillLoading(false), 300)
                                return
                            }
                            if (!pid) {
                                failed("未找到连接中的引擎进程")
                                setTimeout(() => setKillLoading(false), 300)
                                return
                            }

                            ipcRenderer
                                .invoke("kill-yak-grpc", pid)
                                .then(() => {
                                    info(`KILL yak PROCESS: ${pid}`)
                                    setKillOldEngine(false)
                                    setLinkLocalEngine()
                                })
                                .catch((e) => {
                                    failed(`PS | GREP yak failed ${e}`)
                                })
                                .finally(() => {
                                    setTimeout(() => setKillLoading(false), 100)
                                })
                        })
                })
        }
    })

    useEffect(() => {
        emiter.on("activeUpdateYakitOrYaklang", handleActiveDownloadModal)
        ipcRenderer.on("kill-old-engine-process-callback", () => {
            setKillOldEngine(true)
        })
        return () => {
            emiter.off("onScrollToByClick", handleActiveDownloadModal)
            ipcRenderer.removeAllListeners("kill-old-engine-process-callback")
        }
    }, [])
    /** ---------- yakit和yaklang的更新(以连接引擎的状态下) & kill引擎进程 End ---------- */

    /** ---------- 软件绑定引擎版本检测提示 Start ---------- */
    const [builtInVersion, setBuiltInVersion] = useState<string>("")
    const [currentVersion, setCurrentVersion] = useState<string>("")
    /** 判断版本检测是否已执行过 */
    const isExecuteRef = useRef<boolean>(false)

    const showCheckVersion = useMemo(() => {
        if (isExecuteRef.current) return false
        if (isDev.current) return false
        if (!builtInVersion) return false
        if (!currentVersion) return false

        // 判断版本号的库 semver,暂时没用，后续可以用
        if (currentVersion < builtInVersion) return true
        return false
    }, [builtInVersion, currentVersion])

    useEffect(() => {
        // 监听事件-获取当前连接引擎的版本
        ipcRenderer.on("fetch-yak-version-callback", async (e: any, v: string) => {
            if (isExecuteRef.current) return
            let version = v.replace(/\r?\n/g, "")
            if (version.startsWith("v")) version = version.slice(1)
            setCurrentVersion(version)
        })
        return () => {
            ipcRenderer.removeAllListeners("fetch-yak-version-callback")
        }
    }, [])

    useEffect(() => {
        if (engineLink) {
            if (isExecuteRef.current) return
            getRemoteValue(EngineRemoteGV.RemoteCheckEngineVersion)
                .then((v?: string) => {
                    if (!v || v === "false") {
                        // 获取软件对应的内置版本
                        ipcRenderer
                            .invoke("fetch-built-in-engine-version")
                            .then((v: string) => {
                                if (isExecuteRef.current) return
                                let version = v.replace(/\r?\n/g, "")
                                if (version.startsWith("v")) version = version.slice(1)
                                setBuiltInVersion(version)
                            })
                            .catch(() => {})
                        // 获取当前连接引擎的版本
                        ipcRenderer.invoke("fetch-yak-version")
                    } else {
                        isExecuteRef.current = true
                    }
                })
                .catch(() => {})
        }
    }, [engineLink])

    const onCheckVersionCancel = useMemoizedFn((flag: boolean) => {
        isExecuteRef.current = true
        if (flag) {
            if (yaklangKillPss) return
            setYaklangKillPss(true)
        }
        setBuiltInVersion("")
        setCurrentVersion("")
    })
    /** ---------- 软件绑定引擎版本检测提示 End ---------- */

    /** ---------- 远程控制(控制端) Start ---------- */
    const {dynamicStatus, setDynamicStatus} = yakitDynamicStatus()
    const {userInfo} = useStore()

    useEffect(() => {
        // 监听退出远程控制
        ipcRenderer.on("login-out-dynamic-control-callback", async (params) => {
            if (dynamicStatus.isDynamicStatus) {
                // 切换到本地
                handleLinkLocalMode()

                setDynamicStatus({...dynamicStatus, isDynamicStatus: false})
                await remoteOperation(false, dynamicStatus, userInfo)
                // 是否退出登录
                if (params?.loginOut) {
                    ipcRenderer.invoke("ipc-sign-out")
                }
            }
        })
        return () => {
            ipcRenderer.removeAllListeners("login-out-dynamic-control-callback")
        }
    }, [dynamicStatus.isDynamicStatus])
    /** yaklang远程控制-自动远程模式连接 */
    const runControlRemote = useMemoizedFn((v: string, baseUrl: string) => {
        try {
            const resultObj: ResultObjProps = JSON.parse(v)

            // 缓存远程控制参数
            setDynamicStatus({...dynamicStatus, baseUrl, ...resultObj})
            ipcRenderer
                .invoke("Codec", {Type: "base64-decode", Text: resultObj.pubpem, Params: [], ScriptName: ""})
                .then((res) => {
                    onSetYakitStatus("control-remote")
                    setCheckLog(["远程控制连接中..."])
                    onDisconnect()

                    setCredential(() => {
                        return {
                            Host: resultObj.host,
                            IsTLS: true,
                            Password: resultObj.secret,
                            PemBytes: StringToUint8Array(res?.Result || ""),
                            Port: resultObj.port,
                            Mode: "remote"
                        }
                    })
                    onStartLinkEngine(true)
                })
                .catch((err) => {
                    warn(`Base64 解码失败:${err}`)
                })
        } catch (error) {
            warn(`解析失败:${error}`)
        }
    })
    /** ---------- 远程控制(控制端) End ---------- */

    /** 是否展示引擎日志内容 */
    const [showEngineLog, setShowEngineLog] = useState<boolean>(false)

    /** ---------- EE版-license Start ---------- */
    // 企业版-连接引擎后验证license=>展示企业登录
    const [isJudgeLicense, setJudgeLicense] = useState<boolean>(isEnterpriseEdition())
    useEffect(() => {
        // 用户退出 - 验证license=>展示企业登录
        ipcRenderer.on("again-judge-license-login", () => {
            setJudgeLicense(true)
        })
        return () => {
            ipcRenderer.removeAllListeners("again-judge-license-login")
        }
    }, [])
    /** ---------- EE版-license End ---------- */

    /** ---------- 项目管理 & 项目导出 & 临时项目 Start ---------- */
    const [yakitMode, setYakitMode] = useState<"soft" | "">("")
    // 是否展示项目管理
    const [showProjectManage, setShowProjectManage] = useState<boolean>(false)
    // 由普通项目到管理页面的提示框
    const [linkDatabaseHint, setLinkDatabaseHint] = useState<boolean>(false)
    // 由临时项目到管理页面的提示框
    const [closeTemporaryProjectVisible, setCloseTemporaryProjectVisible] = useState<boolean>(false)

    const changeYakitMode = useMemoizedFn((type: "soft") => {
        if (type === "soft" && yakitMode !== "soft") {
            if (temporaryProjectId && !temporaryProjectNoPromptFlag) {
                setCloseTemporaryProjectVisible(true)
            } else {
                setLinkDatabaseHint(true)
            }
        }
    })

    const onOkEnterProjectMag = () => {
        setYakitMode("soft")
        setShowProjectManage(true)
        setCurrentProject(undefined)
        setNowProjectDescription(undefined)
    }

    /** 项目管理的选中项目回调 */
    const softwareSettingFinish = useMemoizedFn(() => {
        setYakitMode("")
        setShowProjectManage(false)
        ipcRenderer.invoke("GetCurrentProject").then((rsp: ProjectDescription) => {
            setCurrentProject(rsp || undefined)
            setNowProjectDescription(rsp || undefined)
        })
    })

    // 当前使用的项目
    const [currentProject, setCurrentProject] = useState<ProjectDescription>()
    const [projectModalLoading, setProjectModalLoading] = useState<boolean>(false)
    // 项目名字
    const projectName = useMemo(() => {
        if (showProjectManage) return ""
        if (!!currentProject?.ProjectName) {
            if (currentProject.ProjectName.length > 10) return `${currentProject.ProjectName.slice(0, 10)}...`
            else return currentProject.ProjectName
        }
        return ""
    }, [currentProject, showProjectManage])
    // 项目加密导出
    const [projectModalInfo, setProjectModalInfo] = useState<{
        visible: boolean
        isNew?: boolean
        isFolder?: boolean
        isExport?: boolean
        isImport?: boolean
        project?: ProjectDescription
        parentNode?: ProjectDescription
    }>({visible: false})
    // 项目明文导出
    const [projectTransferShow, setProjectTransferShow] = useState<{
        isExport?: boolean
        isImport?: boolean
        visible: boolean
        data?: ExportProjectProps
    }>({
        visible: false
    })

    const {
        temporaryProjectId,
        temporaryProjectNoPromptFlag,
        isExportTemporaryProjectFlag,
        setTemporaryProjectNoPromptFlag,
        setIsExportTemporaryProjectFlag,
        delTemporaryProject
    } = useTemporaryProjectStore()

    // 项目明文导出成功的回调
    const handleExportTemporaryProject = () => {
        if (isExportTemporaryProjectFlag) {
            setIsExportTemporaryProjectFlag(false)
            // 由于菜单里的明文导出组件(TransferProject)是放在uilayout内，所以需要通知项目管理页面进行数据重获取
            // 发送信号到ProjectManage去执行 getPageInfo(同时删除临时项目也是在这里操作的)
            emiter.emit("onGetProjectInfo")
        }
        setProjectTransferShow({visible: false})
    }
    /** ---------- 项目管理 & 项目导出 & 临时项目 End ---------- */

    /** @name 软件顶部Title */
    const getAppTitleName: string = useMemo(() => {
        // 引擎未连接或便携版 显示默认title
        if (!engineLink || isEnpriTraceAgent()) return getReleaseEditionName()
        else if (
            !isExportTemporaryProjectFlag &&
            temporaryProjectId &&
            temporaryProjectId === (currentProject?.Id ? currentProject?.Id + "" : "")
        ) {
            return "临时项目"
        } else {
            return projectName ? projectName : getReleaseEditionName()
        }
    }, [projectName, engineLink, temporaryProjectId, currentProject])
    /**  yakit是否进入首页 */
    const pageShowHome = useMemo(() => {
        const flag = engineLink && !isJudgeLicense && !showProjectManage
        return flag
    }, [engineLink, isJudgeLicense, showProjectManage])

    /** ---------- 切换引擎时的逻辑 Start ---------- */
    const [switchEngineLoading, setSwitchEngineLoading] = useState<boolean>(false)

    useEffect(() => {
        ipcRenderer.on("fetch-switch-conn-refresh", (e, d: boolean) => {
            setSwitchEngineLoading(d)
        })
        return () => {
            ipcRenderer.removeAllListeners("fetch-switch-conn-refresh")
        }
    }, [])

    useEffect(() => {
        emiter.on("onSwitchEngine", onOkEnterProjectMag)
        return () => {
            emiter.off("onSwitchEngine", onOkEnterProjectMag)
        }
    }, [])
    /** ---------- 切换引擎时的逻辑 End ---------- */

    /** ---------- ChatCS Start ---------- */
    /** chat-cs 功能逻辑 */
    const [showChatCS, setShowChatCS] = useState<boolean>(true)
    const onChatCS = useMemoizedFn(() => {
        setShowChatCS(false)
        setRemoteValue(ChatCSGV.KnowChatCS, "true")
    })

    useEffect(() => {
        if (engineLink) {
            getRemoteValue(ChatCSGV.KnowChatCS)
                .then((value: any) => {
                    if (!value) return
                    else setShowChatCS(false)
                })
                .catch(() => {})
        }
    }, [engineLink])

    const openAIByChatCS = useMemoizedFn((obj:{text?: string; scriptName: string,isAiPlugin:boolean})=>{
        emiter.emit("onRunChatcsAIByFuzzer",JSON.stringify(obj))
    })

    const [coedcPluginShow,setCoedcPluginShow] = useState<boolean>(false)

    // 判断打开 ChatCS-AI插件执行/全局网络配置第三方应用框
    const onFuzzerModal = useMemoizedFn((value) => {
        const val: {text?: string; scriptName: string; isAiPlugin:any} = JSON.parse(value)
        if(val.isAiPlugin === "isGetPlugin"){
            setCoedcPluginShow(true)
            return
        }
        if(val.isAiPlugin){
            apiGetGlobalNetworkConfig().then((obj:GlobalNetworkConfig)=>{
                const configType = obj.AppConfigs.map((item)=>item.Type).filter((item)=>["openai","chatglm","moonshot"].includes(item))
                // 如若已配置 则打开执行框
                if(configType.length>0){
                    openAIByChatCS({text: val.text, scriptName: val.scriptName,isAiPlugin:val.isAiPlugin})
                }
                else{
                    let m = showYakitModal({
                        title: "添加第三方应用",
                        width: 600,
                        footer: null,
                        closable: true,
                        maskClosable: false,
                        content: (
                            <div style={{ margin: 24 }}>
                                <ThirdPartyApplicationConfigForm
                                    onAdd={(e) => {
                                        let existed = false
                                        const existedResult = (obj.AppConfigs || []).map(
                                            (i) => {
                                                if (i.Type === e.Type) {
                                                    existed = true
                                                    return { ...i, ...e }
                                                }
                                                return { ...i }
                                            }
                                        )
                                        if (!existed) {
                                            existedResult.push(e)
                                        }
                                        const params = {...obj, AppConfigs: existedResult}
                                        apiSetGlobalNetworkConfig(params).then(() => {
                                            openAIByChatCS({text: val.text, scriptName: val.scriptName,isAiPlugin:val.isAiPlugin})
                                            m.destroy()
                                        })
                                    }}
                                    onCancel={() => m.destroy()}
                                />
                            </div>
                        )
                    })
                }
            
            })
        }
        else{
            openAIByChatCS({text: val.text, scriptName: val.scriptName,isAiPlugin:val.isAiPlugin})
        }
    })

    useEffect(() => {
        // YakitWindow
        emiter.on("onOpenFuzzerModal", onFuzzerModal)
        return () => {
            emiter.off("onOpenFuzzerModal", onFuzzerModal)
        }
    }, [])

    /** ---------- ChatCS End ---------- */

    /** ---------- 软件顶部展示录屏中状态 Start ---------- */
    const {screenRecorderInfo} = useScreenRecorder()
    const stopScreen = useCreation(() => {
        return (
            <>
                {screenRecorderInfo.isRecording && (
                    <YakitButton
                        onClick={() => {
                            ipcRenderer.invoke("cancel-StartScrecorder", screenRecorderInfo.token)
                        }}
                        type='primary'
                        colors='danger'
                        className={styles["stop-screen-recorder"]}
                        size='large'
                    >
                        <div className={styles["stop-icon"]}>
                            <StopIcon />
                        </div>
                        <span className={styles["stop-text"]}>录屏中</span>
                    </YakitButton>
                )}
            </>
        )
    }, [screenRecorderInfo])
    /** ---------- 软件顶部展示录屏中状态 End ---------- */
    const SELinkedEngine = useMemoizedFn(() => {
        onSetEngineLink(true)
    })
    const onLinkedEngine = useMemoizedFn(async () => {
        // EE & CE
        try {
            const flag = await getRemoteValue(RemoteGV.TemporaryProjectNoPrompt)
            if (flag) {
                setTemporaryProjectNoPromptFlag(flag === "true")
            }
            // INFO 开发环境默认每次进入项目都是默认项目 避免每次都进项目管理页面去选项目
            if (isDev.current) {
                const res = await ipcRenderer.invoke("GetDefaultProject")
                if (res) {
                    ipcRenderer.invoke("SetCurrentProject", {Id: +res.Id})
                    setCurrentProject(res)
                    setNowProjectDescription(res)
                    setShowProjectManage(false)
                    setYakitMode("")
                }
            } else {
                setShowProjectManage(true)
                setYakitMode("soft")
            }
        } catch (error) {
            yakitFailed(error + "")
        }

        setTimeout(() => onSetEngineLink(true), 100)
    })

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

    const onReady = useMemoizedFn(() => {
        outputToPrintLog(`连接成功-start-engineLink:${cacheEngineLink.current}`)
        if (!cacheEngineLink.current) {
            isEnpriTraceAgent() ? SELinkedEngine() : onLinkedEngine()
        }

        setCheckLog([])
        onSetYakitStatus("link")

        // 连接成功，保存一下端口缓存
        switch (cacheEngineMode.current) {
            case "local":
                if (dynamicStatus.isDynamicStatus) return
                setLocalValue(LocalGV.YaklangEnginePort, credential.Port)
                return
        }
    })
    const onFailed = useMemoizedFn((count: number) => {
        // 20以上的次数属于无效次数
        if (count > 20) {
            setKeepalive(false)
            return
        }
        outputToPrintLog(`连接失败: ${count}次`)

        onSetEngineLink(false)

        if (dynamicStatus.isDynamicStatus && cacheYakitStatus.current !== "control-remote") {
            setCheckLog(["远程控制重连中..."])
            onSetYakitStatus("control-remote")
            return
        } else {
            if (cacheYakitStatus.current === "control-remote") {
                if (count === 5) {
                    setCheckLog(["远程控制异常退出, 无法连接"])
                    failed("远程控制异常退出, 无法连接。")
                    setDynamicStatus({...dynamicStatus, isDynamicStatus: false})
                    remoteOperation(false, dynamicStatus, userInfo)
                    onSetYakitStatus("control-remote-timeout")
                    onDisconnect()
                }
                return
            }
        }

        if (cacheYakitStatus.current === "error" && count === 20) {
            // 连接断开后的20次尝试过后，不在进行尝试
            setCheckLog((arr) => {
                return arr.slice(1).concat(["连接超时, 请手动启动引擎"])
            })
            return
        }

        if (cacheYakitStatus.current === "link" || cacheYakitStatus.current === "ready") {
            // 连接中或正在连接中触发
            if (cacheEngineMode.current === "remote") {
                failed("远程连接已断开")
                onDisconnect()
                onSetYakitStatus("")
            }
            if (cacheEngineMode.current === "local") {
                if (cacheYakitStatus.current === "link") setCheckLog(["引擎连接超时, 正在尝试重连"])
                if (count > 8) {
                    onSetYakitStatus("error")
                }
            }
        }
    })

    const onWatchDogCallback = useMemoizedFn((type: EngineWatchDogCallbackType) => {
        switch (type) {
            case "control-remote-connect-failed":
                setCheckLog(["远程控制异常退出, 无法连接"])
                onSetYakitStatus("control-remote-timeout")
                return
            case "remote-connect-failed":
                setTimeout(() => {
                    setRemoteLinkLoading(false)
                }, 300)
                return

            default:
                return
        }
    })

    return (
        <div className={styles["ui-layout-wrapper"]}>
            <div className={styles["ui-layout-container"]}>
                <div className={styles["container-wrapper"]}>
                    <YaklangEngineWatchDog
                        credential={credential}
                        /* keepalive 开启之后才会触发 Ready 和 Failed */
                        keepalive={keepalive}
                        engineLink={engineLink}
                        onKeepaliveShouldChange={setKeepalive}
                        onReady={onReady}
                        onFailed={onFailed}
                        failedCallback={onWatchDogCallback}
                    />
                    <div id='yakit-header' className={styles["ui-layout-header"]}>
                        {system === "Darwin" ? (
                            <div className={classNames(styles["header-body"], styles["mac-header-body"])}>
                                {/* 遮住底部边框线 */}
                                <div
                                    style={{left: yakitMode === "soft" ? 76 : -45}}
                                    className={styles["header-border-yakit-mask"]}
                                ></div>

                                <div className={classNames(styles["yakit-header-title"])} onDoubleClick={maxScreen}>
                                    {getAppTitleName}-{`${EngineModeVerbose(engineMode || "local", dynamicStatus)}`}
                                </div>

                                <div className={styles["header-left"]}>
                                    <div>
                                        <MacUIOp
                                            currentProjectId={currentProject?.Id ? currentProject?.Id + "" : ""}
                                            pageChildrenShow={pageShowHome}
                                        />
                                    </div>

                                    {engineLink && (
                                        <>
                                            {!isEnpriTraceAgent() && (
                                                <div
                                                    className={classNames(styles["yakit-mode-icon"], {
                                                        [styles["yakit-mode-selected"]]: yakitMode === "soft"
                                                    })}
                                                    onClick={() => changeYakitMode("soft")}
                                                >
                                                    <SolidHomeIcon className={styles["mode-icon-selected"]} />
                                                </div>
                                            )}

                                            <div className={styles["divider-wrapper"]}></div>
                                            <YakitGlobalHost isEngineLink={engineLink} />
                                        </>
                                    )}
                                    <div className={styles["short-divider-wrapper"]}>
                                        <div className={styles["divider-style"]}></div>
                                    </div>

                                    <div className={styles["left-cpu"]}>
                                        <PerformanceDisplay engineMode={engineMode} typeCallback={handleOperations} />
                                    </div>
                                </div>
                                <div
                                    className={classNames(styles["header-title"], {
                                        [styles["header-title-drop"]]: drop
                                    })}
                                    onDoubleClick={maxScreen}
                                />
                                <div className={styles["header-right"]}>
                                    {stopScreen}

                                    <HelpDoc system={system} arch={arch} engineLink={engineLink} />

                                    {engineLink && (
                                        <>
                                            <FuncDomain
                                                isEngineLink={engineLink}
                                                engineMode={engineMode || "remote"}
                                                isRemoteMode={isRemoteEngine}
                                                onEngineModeChange={handleOperations}
                                                runDynamicControlRemote={runControlRemote}
                                                typeCallback={handleOperations}
                                                showProjectManage={showProjectManage}
                                                system={system}
                                                isJudgeLicense={isJudgeLicense}
                                            />
                                            {!showProjectManage && (
                                                <>
                                                    <div className={styles["divider-wrapper"]}></div>
                                                    <GlobalState isEngineLink={engineLink} system={system} />
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className={classNames(styles["header-body"], styles["win-header-body"])}>
                                <div
                                    style={{left: yakitMode === "soft" ? 44 : -45}}
                                    className={styles["header-border-yakit-mask"]}
                                ></div>

                                <div className={classNames(styles["yakit-header-title"])} onDoubleClick={maxScreen}>
                                    <>
                                        {getAppTitleName}-{`${EngineModeVerbose(engineMode || "local", dynamicStatus)}`}
                                    </>
                                </div>

                                <div className={styles["header-left"]}>
                                    {engineLink && (
                                        <>
                                            {!showProjectManage && (
                                                <GlobalState isEngineLink={engineLink} system={system} />
                                            )}

                                            {!isEnpriTraceAgent() && (
                                                <div
                                                    className={classNames(styles["yakit-mode-icon"], {
                                                        [styles["yakit-mode-selected"]]: false && yakitMode === "soft"
                                                    })}
                                                    onClick={() => changeYakitMode("soft")}
                                                >
                                                    <SolidHomeIcon className={styles["mode-icon-selected"]} />
                                                </div>
                                            )}

                                            <div className={styles["divider-wrapper"]}></div>
                                            <div>
                                                <FuncDomain
                                                    isEngineLink={engineLink}
                                                    isReverse={true}
                                                    engineMode={engineMode || "remote"}
                                                    isRemoteMode={isRemoteEngine}
                                                    onEngineModeChange={handleOperations}
                                                    runDynamicControlRemote={runControlRemote}
                                                    typeCallback={handleOperations}
                                                    showProjectManage={showProjectManage}
                                                    system={system}
                                                    isJudgeLicense={isJudgeLicense}
                                                />
                                            </div>
                                        </>
                                    )}

                                    <HelpDoc system={system} arch={arch} engineLink={engineLink} />

                                    {stopScreen}
                                </div>

                                <div
                                    className={classNames(styles["header-title"], {
                                        [styles["header-title-drop"]]: drop
                                    })}
                                    onDoubleClick={maxScreen}
                                />

                                <div className={styles["header-right"]}>
                                    <div className={styles["left-cpu"]}>
                                        <PerformanceDisplay engineMode={engineMode} typeCallback={handleOperations} />
                                    </div>
                                    <div className={styles["short-divider-wrapper"]}>
                                        <div className={styles["divider-style"]}></div>
                                    </div>
                                    {engineLink && (
                                        <>
                                            <YakitGlobalHost isEngineLink={engineLink} />
                                            <div className={styles["divider-wrapper"]}></div>
                                        </>
                                    )}
                                    <WinUIOp
                                        currentProjectId={currentProject?.Id ? currentProject?.Id + "" : ""}
                                        pageChildrenShow={pageShowHome}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div id='yakit-uilayout-body' className={styles["ui-layout-body"]}>
                        {yakitStatus === "install" && (
                            // 本地没有引擎时的下载引擎
                            <InstallEngine
                                visible={yakitStatus === "install"}
                                system={system}
                                onSuccess={() => handleStatusCompleted("install")}
                                onRemoreLink={() => {
                                    setCheckLog([])
                                    handleLinkRemoteMode()
                                }}
                            />
                        )}

                        {!engineLink && !isRemoteEngine && yaklangDownload && (
                            // 更新引擎
                            <DownloadYaklang yaklangSpecifyVersion={yaklangSpecifyVersion} system={system} visible={yaklangDownload} onCancel={onDownloadedYaklang} />
                        )}

                        <LocalEngine
                            ref={localEngineRef}
                            system={system}
                            setLog={setCheckLog}
                            onLinkEngine={handleLinkLocalEngine}
                            setYakitStatus={onSetYakitStatus}
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
                                checkLog={checkLog}
                                yakitStatus={yakitStatus}
                                engineMode={engineMode || "local"}
                                restartLoading={restartLoading}
                                remoteControlRefreshLoading={remoteControlRefreshLoading}
                                btnClickCallback={loadingClickCallback}
                                showEngineLog={showEngineLog}
                                setShowEngineLog={setShowEngineLog}
                            />
                        )}

                        {engineLink && (
                            <YakitSpin spinning={switchEngineLoading}>
                                {isJudgeLicense ? (
                                    <EnterpriseJudgeLogin
                                        setJudgeLicense={setJudgeLicense}
                                        setJudgeLogin={(v: boolean) => {}}
                                    />
                                ) : showProjectManage ? (
                                    <SoftwareSettings
                                        engineMode={engineMode || "local"}
                                        onEngineModeChange={handleLinkRemoteMode}
                                        onFinish={softwareSettingFinish}
                                    />
                                ) : (
                                    props.children
                                )}
                            </YakitSpin>
                        )}

                        {engineLink && (yaklangKillPss || yakitDownload) && (
                            <div className={styles["ui-layout-body-mask"]}>
                                <AllKillEngineConfirm
                                    visible={yaklangKillPss}
                                    setVisible={setYaklangKillPss}
                                    onSuccess={killedEngineToUpdate}
                                />
                                {/* 更新yakit */}
                                <DownloadYakit system={system} visible={yakitDownload} setVisible={setYakitDownload} />
                            </div>
                        )}

                        {engineLink && (
                            <CheckEngineVersion
                                engineMode={engineMode || "local"}
                                visible={showCheckVersion}
                                builtInVersion={builtInVersion}
                                currentVersion={currentVersion}
                                onCancel={onCheckVersionCancel}
                            />
                        )}

                        <YakitHint
                            getContainer={document.getElementById("yakit-uilayout-body") || undefined}
                            mask={false}
                            visible={engineLink && killOldEngine}
                            title='发现新引擎版本'
                            content='发现本地引擎存在新版本待使用，是否关闭引擎使用新版本？'
                            okButtonProps={{loading: killLoading}}
                            onOk={killOldProcess}
                            cancelButtonProps={{loading: killLoading}}
                            onCancel={() => setKillOldEngine(false)}
                        />
                    </div>
                </div>
            </div>
            <div
                className={classNames({
                    [styles["uilayout-log"]]: showEngineLog,
                    [styles["uilayout-hidden-log"]]: !showEngineLog,
                    [styles["uilayout-noshow-log"]]: engineLink
                })}
            >
                <EngineLog visible={engineLink} setVisible={setShowEngineLog} />
            </div>
            <BaseMiniConsole visible={yakitConsole} setVisible={setYakitConsole} />

            {/* 项目加密导出弹框 */}
            <NewProjectAndFolder
                {...projectModalInfo}
                setVisible={(open: boolean) => setProjectModalInfo({visible: open})}
                loading={projectModalLoading}
                setLoading={setProjectModalLoading}
                onModalSubmit={() => {
                    setProjectModalInfo({visible: false})
                    setTimeout(() => setProjectModalLoading(false), 300)
                }}
            />
            {/* 项目明文导出弹框 */}
            <TransferProject
                {...projectTransferShow}
                onSuccess={handleExportTemporaryProject}
                setVisible={(open: boolean) => setProjectTransferShow({visible: open})}
            />

            {/* 由普通项目进入项目管理的二次确认框 */}
            <YakitHint
                visible={linkDatabaseHint}
                title='是否进入项目管理'
                content='如果有正在进行中的任务，回到项目管理页则都会停止，确定回到项目管理页面吗?'
                onOk={() => {
                    onOkEnterProjectMag()
                    setLinkDatabaseHint(false)
                }}
                onCancel={() => setLinkDatabaseHint(false)}
            />
            {/* 由临时项目进入项目管理的二次确认框 */}
            {closeTemporaryProjectVisible && (
                <TemporaryProjectPop
                    onOk={async () => {
                        onOkEnterProjectMag()
                        setCloseTemporaryProjectVisible(false)
                    }}
                    onCancel={() => {
                        setCloseTemporaryProjectVisible(false)
                    }}
                />
            )}

            {isCommunityEdition() && pageShowHome && showChatCS && (
                <div className={styles["chat-cs-hint-wrapper"]}>
                    <div className={styles["hint-wrapper"]}>
                        <div className={styles["hint-modal-wrapper"]}>
                            <div className={styles["modal-content"]}>
                                <div className={styles["content-style"]}>ChatCS</div>
                                <div className={styles["subcontent-style"]}>与安全有关的问题都可以问牛牛哦~</div>
                            </div>
                            <div className={styles["modal-btn"]} onClick={onChatCS}>
                                我知道了
                            </div>
                        </div>
                        <div className={styles["hint-modal-arrow"]}>
                            <PolygonIcon />
                        </div>

                        <div className={styles["show-chat-icon-wrapper"]}>
                            <img src={yakitCattle} />
                        </div>
                    </div>
                </div>
            )}

            <YakitGetOnlinePlugin
                visible={coedcPluginShow}
                pluginType={["codec"]}
                setVisible={(v) => {
                    setCoedcPluginShow(v)
                }}
                onFinish={()=>{
                    // 此处通知刷新各类基于codec插件菜单
                    emiter.emit("onRefPluginCodecMenu")
                }}
            />
        </div>
    )
}

export default UILayout
