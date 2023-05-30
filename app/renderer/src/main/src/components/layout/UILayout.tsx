import React, {useEffect, useRef, useState} from "react"
import {useCreation, useDebounce, useGetState, useMemoizedFn} from "ahooks"
import {Form, Input, Progress, Select, Spin, Tooltip} from "antd"
import Draggable from "react-draggable"
import type {DraggableEvent, DraggableData} from "react-draggable"
import {MacUIOp} from "./MacUIOp"
import {
    HelpSvgIcon,
    MacUIOpCloseSvgIcon,
    WinUIOpCloseSvgIcon,
    YakitCopySvgIcon,
    YakitThemeSvgIcon,
    YaklangInstallHintSvgIcon
} from "./icons"
import {PerformanceDisplay, yakProcess} from "./PerformanceDisplay"
import {FuncDomain} from "./FuncDomain"
import {WinUIOp} from "./WinUIOp"
import {GlobalState} from "./GlobalState"
import {YakitGlobalHost} from "./YakitGlobalHost"
import {
    DownloadingState,
    YakitSettingCallbackType,
    YakitStatusType,
    YakitSystem,
    YaklangEngineMode
} from "@/yakitGVDefine"
import {failed, info, success} from "@/utils/notification"
import {YakEditor} from "@/utils/editors"
import {CodeGV, LocalGV, RemoteGV} from "@/yakitGV"
import {EngineModeVerbose, YakitLoading} from "../basics/YakitLoading"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {YakitPopover} from "../yakitUI/YakitPopover/YakitPopover"
import {YakitSwitch} from "../yakitUI/YakitSwitch/YakitSwitch"
import {getLocalValue, getRemoteValue, setLocalValue} from "@/utils/kv"
import {getRandomLocalEnginePort, outputToWelcomeConsole} from "@/components/layout/WelcomeConsoleUtil"
import {YaklangEngineWatchDog, YaklangEngineWatchDogCredential} from "@/components/layout/YaklangEngineWatchDog"
import {StringToUint8Array} from "@/utils/str"
import {EngineLog} from "./EngineLog"
import {BaseMiniConsole} from "../baseConsole/BaseConsole"
import {isEnpriTraceAgent, isEnterpriseEdition} from "@/utils/envfile"
import {AllKillEngineConfirm} from "./AllKillEngineConfirm"
import {SoftwareSettings} from "@/pages/softwareSettings/SoftwareSettings"
import {HomeSvgIcon, StopIcon} from "@/assets/newIcon"
import EnterpriseJudgeLogin from "@/pages/EnterpriseJudgeLogin"
import {
    ExportProjectProps,
    NewProjectAndFolder,
    ProjectDescription,
    TransferProject
} from "@/pages/softwareSettings/ProjectManage"
import {YakitHint} from "../yakitUI/YakitHint/YakitHint"
import {YakitMenu} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {FeatureRequest, ReportBug} from "@/utils/template/issues"
import {YakitSpin} from "../yakitUI/YakitSpin/YakitSpin"

import classNames from "classnames"
import styles from "./uiLayout.module.scss"
import {useScreenRecorder} from "@/store/screenRecorder"

const {ipcRenderer} = window.require("electron")

export interface LocalInfoProps {
    system: string
    arch: string
    localYakit: string
    localYaklang: string
}

export interface UILayoutProp {
    children?: React.ReactNode
    linkSuccess?: () => any
}

const UILayout: React.FC<UILayoutProp> = (props) => {
    const [system, setSystem, getSystem] = useGetState<YakitSystem>("Darwin")
    /** 是否为开发环境 */
    const isDev = useRef<boolean>(false)

    const [loading, setLoading] = useState<boolean>(false)

    /** 引擎是否安装(逻辑数据，不影响渲染) */
    const isEngineInstalled = useRef<boolean>(false)

    /** 当前引擎连接状态 */
    const [engineLink, setEngineLink, getEngineLink] = useGetState<boolean>(false)
    /** 当前引擎模式 */
    const [engineMode, setEngineMode] = useState<YaklangEngineMode>()
    const cacheEngineMode = useRef<YaklangEngineMode>()
    const isRemoteEngine = engineMode === "remote"
    /** yakit使用状态 */
    const [yakitStatus, setYakitStatus] = useState<YakitStatusType>("")
    const cacheYakitStatus = useRef<YakitStatusType>("")

    const [localPort, setLocalPort] = useState<number>(0)
    const [adminPort, setAdminPort] = useState<number>(0)
    const [keepalive, setKeepalive] = useState<boolean>(false)

    /** 内置引擎版本 */
    const [buildInEngineVersion, setBuildInEngineVersion] = useState("")
    const haveBuildInEngine = buildInEngineVersion !== ""

    /** 认证信息 */
    const [credential, setCredential, getCredential] = useGetState<YaklangEngineWatchDogCredential>({
        Host: "127.0.0.1",
        IsTLS: false,
        Password: "",
        PemBytes: undefined,
        Port: 0,
        Mode: undefined
    })

    /** 数据库权限由usestate改为useref(数据不影响渲染) */
    const databaseError = useRef<boolean>(false)

    /* 内置二进制文件的话，需要通过自检 */
    useEffect(() => {
        ipcRenderer
            .invoke("GetBuildInEngineVersion")
            .then((e) => {
                if (e !== "") {
                    outputToWelcomeConsole(`引擎内置自检成功！内置引擎：${e}`)
                } else {
                    outputToWelcomeConsole(`引擎内置自检：无内置引擎标识 ${e}`)
                }
            })
            .catch((e) => {
                outputToWelcomeConsole(`引擎内置自检：无内置引擎: ${e}`)
            })
            .finally(() => {
                info("开始检查漏洞信息库")
                ipcRenderer
                    .invoke("InitCVEDatabase")
                    .then(() => {
                        info("漏洞信息库自检完成")
                    })
                    .catch((e) => {
                        info(`漏洞信息库检查错误：${e}`)
                    })
            })
    }, [])

    const getCacheEngineMode = useMemoizedFn(() => {
        setEngineMode(undefined)
        getLocalValue(LocalGV.YaklangEngineMode).then((val: YaklangEngineMode) => {
            info(`加载上次引擎模式：${val}`)
            switch (val) {
                case "remote":
                    setEngineMode("remote")
                    cacheEngineMode.current = "remote"
                    return
                case "local":
                    setEngineMode("local")
                    cacheEngineMode.current = "local"
                    return
                case "admin":
                    setEngineMode("admin")
                    cacheEngineMode.current = "admin"
                    return
                default:
                    setEngineMode("local")
                    cacheEngineMode.current = "local"
                    return
            }
        })
    })

    const [currentYakit, setCurrentYakit] = useState<string>("")
    const [latestYakit, setLatestYakit] = useState<string>("")
    const [currentYaklang, setCurrentYaklang] = useState<string>("")
    const [latestYaklang, setLatestYaklang] = useState<string>("")

    /**
     * 1、获取软件运行环境
     * 2、获取操作系统类型
     * 3、获取yakit本地版本和最新版本
     * 4、获取yaklang本地版本和最新版本
     */
    useEffect(() => {
        setLoading(true)
        ipcRenderer.invoke("is-dev").then((flag: boolean) => (isDev.current = !!flag))
        ipcRenderer.invoke("fetch-system-name").then((type: YakitSystem) => setSystem(type))

        getLocalValue(LocalGV.NoAutobootLatestVersionCheck).then((val: boolean) => {
            if (!val) {
                ipcRenderer.invoke("fetch-yakit-version").then((data: string) => {
                    setCurrentYakit(data)
                })
                ipcRenderer.invoke("fetch-latest-yakit-version").then((data: string) => {
                    isEnpriTraceAgent() ? setLatestYakit("") : setLatestYakit(data)
                })

                ipcRenderer.invoke("get-current-yak").then((data: string) => {
                    setCurrentYaklang(data)
                })
                ipcRenderer.invoke("fetch-latest-yaklang-version").then((data: string) => {
                    setLatestYaklang(data)
                })
            }
        })
    }, [])

    useEffect(() => {
        const id = setInterval(() => {
            if (isEngineInstalled.current) {
                return
            }

            ipcRenderer.invoke("is-yaklang-engine-installed").then((flag: boolean) => {
                if (isEngineInstalled.current === flag) return

                isEngineInstalled.current = flag
                if (!isEngineInstalled.current) {
                    setEngineMode(undefined)
                    outputToWelcomeConsole("由于引擎未安装，仅开启远程模式或用户需安装核心引擎")
                    setTimeout(() => {
                        setYakitStatus("install")
                        cacheYakitStatus.current = "install"
                    }, 300)
                    return
                } else {
                    outputToWelcomeConsole("已安装引擎，开始检查数据库权限是否正常")
                    /** 引擎已安装的情况下，优先检查数据库权限 */
                    ipcRenderer
                        .invoke("check-local-database")
                        .then((e) => {
                            if (e === "not allow to write") outputToWelcomeConsole("数据库权限错误，开始进行调整操作")
                            databaseError.current = e === "not allow to write"
                        })
                        .finally(() => {
                            // 这里只有两种状态，数据库(有|无)权限情况
                            if (databaseError.current && getSystem() !== "Windows_NT") {
                                setYakitStatus("database")
                                cacheYakitStatus.current = "database"
                            } else getCacheEngineMode()
                        })
                }
            })
        }, 3000)
        return () => {
            clearInterval(id)
        }
    }, [])

    /** 连接引擎成功，获取token进行登录 */
    useEffect(() => {
        if (engineLink && props.linkSuccess) {
            setYakitStatus("link")
            cacheYakitStatus.current = "link"
            props.linkSuccess()
            setShowEngineLog(false)
        }
    }, [engineLink])

    /**
     * 获取yaklang引擎是否安装的状态
     * - 判断上次使用引擎的状态，如果有使用，这判断是否可以启动引擎进入软件界面(未安装状态只限远程可以进入软件界面)
     *    1) 如果有使用，引擎未安装，则只限远程状态可以连接进入界面
     *    2) 如果有使用，引擎已安装，则正常连接上次使用状态的引擎
     */
    useEffect(() => {
        outputToWelcomeConsole("识别引擎是否已安装...")
        ipcRenderer
            .invoke("is-yaklang-engine-installed")
            .then((flag: boolean) => {
                if (flag) {
                    outputToWelcomeConsole("引擎已安装")
                } else {
                    outputToWelcomeConsole("引擎未安装")
                }
                isEngineInstalled.current = flag
            })
            .finally(() => {
                if (!isEngineInstalled.current) {
                    setEngineMode(undefined)
                    outputToWelcomeConsole("由于引擎未安装，仅开启远程模式或用户需安装核心引擎")
                    getCacheEngineMode()
                    setTimeout(() => {
                        setYakitStatus("install")
                        cacheYakitStatus.current = "install"
                        setLoading(false)
                    }, 300)
                    return
                } else {
                    outputToWelcomeConsole("已安装引擎，开始检查数据库权限是否正常")
                    /** 引擎已安装的情况下，优先检查数据库权限 */
                    ipcRenderer
                        .invoke("check-local-database")
                        .then((e) => {
                            if (e === "not allow to write") outputToWelcomeConsole("数据库权限错误，开始进行调整操作")
                            databaseError.current = e === "not allow to write"
                        })
                        .finally(() => {
                            // 这里只有两种状态，数据库(有|无)权限情况
                            if (databaseError.current && getSystem() !== "Windows_NT") {
                                setYakitStatus("database")
                                cacheYakitStatus.current = "database"
                            } else getCacheEngineMode()
                            setLoading(false)
                        })
                }
            })

        getLocalValue(LocalGV.YaklangEnginePort)
            .then((portRaw) => {
                const port = parseInt(portRaw)
                if (!port) {
                    getRandomLocalEnginePort((p) => setLocalPort(p))
                } else {
                    setLocalPort(port)
                }
            })
            .catch(() => {
                getRandomLocalEnginePort((p) => setLocalPort(p))
            })

        getLocalValue(LocalGV.YaklangEngineAdminPort)
            .then((portRaw) => {
                const port = parseInt(portRaw)
                if (!port) {
                    getRandomLocalEnginePort((p) => setAdminPort(p))
                } else {
                    setAdminPort(port)
                }
            })
            .catch(() => {
                getRandomLocalEnginePort((p) => setAdminPort(p))
            })
    }, [])

    // 防止两个端口重复
    useEffect(() => {
        if (adminPort === 0) {
            return
        }
        if (adminPort === localPort) {
            getRandomLocalEnginePort((p) => setAdminPort(p))
        }
    }, [adminPort, localPort])

    /**
     * 根据引擎状态处理不同的方式
     * 这儿并不直接控制啥时候发起连接，只是设置好对应的连接参数即可
     * 由保持组件来设置状态
     * */
    useEffect(() => {
        if (engineMode === undefined || localPort <= 0 || adminPort <= 0) {
            return
        }

        if (!engineMode && engineMode === cacheEngineMode.current) return

        outputToWelcomeConsole(`当前引擎模式为 ${engineMode}`)
        switch (engineMode) {
            case "local":
                outputToWelcomeConsole(`本地普通权限引擎模式，开始启动本地引擎: ${localPort}`)
                setCredential({
                    Host: "127.0.0.1",
                    IsTLS: false,
                    Password: "",
                    PemBytes: undefined,
                    Port: localPort,
                    Mode: "local"
                })
                setTimeout(() => {
                    setStartAdminEngine(false)
                    setYakitStatus("ready")
                    cacheYakitStatus.current = "ready"
                }, 100)
                return
            case "remote":
                outputToWelcomeConsole("远程模式或调试模式，需要用户手动启动引擎")
                setStartAdminEngine(false)
                return
            case "admin":
                outputToWelcomeConsole(`管理员模式，启动本地引擎: ${adminPort}`)
                setCredential({
                    Host: "127.0.0.1",
                    IsTLS: false,
                    Password: "",
                    PemBytes: undefined,
                    Port: adminPort,
                    Mode: "admin"
                })
                setTimeout(() => {
                    setStartAdminEngine(false)
                    setYakitStatus("ready")
                    cacheYakitStatus.current = "ready"
                }, 100)
                return
            default:
        }
    }, [engineMode, localPort, adminPort])

    /** yaklang引擎切换启动模式 */
    const changeEngineMode = useMemoizedFn((type: YaklangEngineMode, keepalive?: boolean) => {
        info(`引擎状态切换为: ${EngineModeVerbose(type as YaklangEngineMode)}`)

        setYakitStatus("")
        setKeepalive(false)
        setEngineLink(false)
        cacheYakitStatus.current = ""

        /** 未安装引擎下的模式切换取消 */
        if (!isEngineInstalled.current && type !== "remote") {
            setEngineMode(undefined)
            setYakitStatus("install")
            cacheYakitStatus.current = "install"
            return
        }

        setEngineMode(undefined)
        // 修改状态，重连引擎
        setLocalValue(LocalGV.YaklangEngineMode, type)
        switch (type) {
            case "admin":
                setEngineMode("admin")
                cacheEngineMode.current = "admin"
                return
            case "local":
                setEngineMode("local")
                cacheEngineMode.current = "local"
                return
            case "remote":
                setCredential({Host: "", IsTLS: false, Password: "", PemBytes: undefined, Port: 0, Mode: undefined})
                setEngineMode("remote")
                cacheEngineMode.current = "remote"
                return
        }
    })

    const [remoteConnectLoading, setRemoteConnectLoading] = useState(false)
    /** 连接远程模式引擎的内容 */
    const connectRemoteEngine = useMemoizedFn((info: RemoteLinkInfo) => {
        setCredential({
            Host: info.host,
            IsTLS: info.tls,
            Password: info.tls ? info.password : "",
            PemBytes: StringToUint8Array(info.tls ? info.caPem || "" : ""),
            Port: parseInt(info.port),
            Mode: "remote"
        })
        /** 保存远程连接信息 */
        if (info.allowSave) {
            const params = {
                host: info.host,
                port: +info.port || 0,
                caPem: info.caPem || "",
                password: info.password || "",
                tls: info.tls,
                name: info.linkName || ""
            }
            ipcRenderer
                .invoke("save-yakit-remote-auth", {...params})
                .then()
                .catch((e: any) => {
                    console.info(e)
                })
        }
        setRemoteConnectLoading(true)
        ipcRenderer.invoke("engine-ready-link")
        setTimeout(() => {
            setRemoteConnectLoading(false)
        }, 300)
    })

    /** 是否展示引擎日志内容 */
    const [showEngineLog, setShowEngineLog] = useState<boolean>(false)

    /** 不同 yakit 状态处理后的回调事件 */
    const yakitStatusCallback = useMemoizedFn((type: YakitStatusType) => {
        switch (type) {
            case "install":
            case "update":
                setYakitStatus("")
                cacheYakitStatus.current = ""
                getCacheEngineMode()
                return
            case "database":
                getCacheEngineMode()
                return

            default:
                return
        }
    })

    /** 是否启动并连接管理员权限引擎 */
    const [startAdminEngine, setStartAdminEngine] = useState<boolean>(false)
    const startAdminEngineProcess = useMemoizedFn(() => {
        changeEngineMode("admin")
    })

    /** 项目导出相关功能变量 */
    const [currentProject, setCurrentProject] = useState<ProjectDescription>()
    const [projectModalInfo, setProjectModalInfo] = useState<{
        visible: boolean
        isNew?: boolean
        isFolder?: boolean
        isExport?: boolean
        isImport?: boolean
        project?: ProjectDescription
        parentNode?: ProjectDescription
    }>({visible: false})
    const [projectTransferShow, setProjectTransferShow] = useState<{
        isExport?: boolean
        isImport?: boolean
        visible: boolean
        data?: ExportProjectProps
    }>({
        visible: false
    })
    const [projectModalLoading, setProjectModalLoading] = useState<boolean>(false)
    const fetchCurrentProject = useMemoizedFn(() => {
        ipcRenderer.invoke("GetCurrentProject").then((rsp: ProjectDescription) => setCurrentProject(rsp || undefined))
    })

    /** funcDomain组件的回调事件 */
    const typeCallback = useMemoizedFn((type: YakitSettingCallbackType) => {
        switch (type) {
            case "console":
                setYakitConsole(true)
                return
            case "adminMode":
                if (engineMode === "admin") {
                    info("当前已是管理员模式")
                    return
                }
                setStartAdminEngine(true)
                return

            case "break":
                if (cacheYakitStatus.current === "link") {
                    setYakitStatus("break")
                    cacheYakitStatus.current = "break"
                    setTimeout(() => {
                        setKeepalive(false)
                        setEngineLink(false)
                    }, 100)
                }
                return

            case "changeProject":
                changeYakitMode("soft")
                return
            case "encryptionProject":
                if (!currentProject || !currentProject.Id) {
                    failed("当前项目无关键信息，无法导出!")
                    return
                }
                setLinkDatabase(true)
                setProjectModalInfo({visible: true, isNew: false, isExport: true, project: currentProject})
                return
            case "plaintextProject":
                if (!currentProject || !currentProject.Id) {
                    failed("当前项目无关键信息，无法导出!")
                    return
                }
                setLinkDatabase(true)
                setProjectTransferShow({
                    visible: true,
                    isExport: true,
                    data: {
                        Id: currentProject.Id,
                        ProjectName: currentProject.ProjectName,
                        Password: ""
                    }
                })
                return

            default:
                return
        }
    })

    const [yakitConsole, setYakitConsole] = useState<boolean>(false)

    useEffect(() => {
        if (!engineLink) setYakitConsole(false)
    }, [engineLink])

    // 监听console缩放打开
    useEffect(() => {
        ipcRenderer.on("callback-shrink-console-log", (e, res: any) => {
            if (res?.open) {
                setYakitConsole(true)
            }
        })
        return () => {
            ipcRenderer.removeAllListeners("shrink-console-log")
        }
    }, [])

    const [yaklangDownload, setYaklangDownload, getYaklangDownload] = useGetState<boolean>(false)
    const [yakitDownload, setYakitDownload, getYakitDownload] = useGetState<boolean>(false)
    const [__killOldEngine, setKillOldEngine, getKillOldEngine] = useGetState<boolean>(false)
    /**
     * 1、监听激活 yaklang 和 yakit 更新下载
     * 2、更新已下载安装的引擎版本(macos系统情况)
     */
    useEffect(() => {
        ipcRenderer.on("activate-download-yaklang-or-yakit", (e: any, type: "yaklang" | "yakit") => {
            if (getYaklangDownload() || getYakitDownload()) return
            if (type === "yakit") setYakitDownload(true)
            if (type === "yaklang") setYaklangDownload(true)
        })

        ipcRenderer.on("kill-old-engine-process-callback", () => {
            if (!getKillOldEngine()) setKillOldEngine(true)
        })

        return () => {
            ipcRenderer.removeAllListeners("activate-download-yaklang-or-yakit")
            ipcRenderer.removeAllListeners("kill-old-engine-process-callback")
        }
    }, [])

    const [killLoading, setKillLoading] = useState<boolean>(false)
    const killOldProcess = useMemoizedFn(() => {
        let isFailed: boolean = false
        let port
        let pid

        if (cacheYakitStatus.current === "link") {
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
                    setTimeout(() => setKillLoading(false), 300)
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
                            const pss = i.filter((item) => +item.port === port)
                            if (pss.length > 0) pid = pss[0].pid || 0
                        })
                        .catch((e) => {
                            failed(`PS | GREP yak failed ${e}`)
                            setTimeout(() => setKillLoading(false), 300)
                            isFailed = true
                        })
                        .finally(() => {
                            if (isFailed) {
                                setTimeout(() => setKillLoading(false), 300)
                                return
                            }
                            if (!pid) {
                                setTimeout(() => setKillLoading(false), 300)
                                return
                            }

                            ipcRenderer
                                .invoke("kill-yak-grpc", pid)
                                .then(() => {
                                    info(`KILL yak PROCESS: ${pid}`)
                                    setKillOldEngine(false)
                                    setKeepalive(false)
                                    setEngineLink(false)
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

    const [yakitMode, setYakitMode] = useState<"soft" | "store" | "">("")
    const changeYakitMode = useMemoizedFn((type: "soft" | "store") => {
        if (type === "soft" && yakitMode !== "soft") {
            setLinkDatabaseHint(true)
        }
    })
    /** 软件配置界面完成事件回调 */
    const softwareSettingFinish = useMemoizedFn(() => {
        setYakitMode("")
        setLinkDatabase(false)
        fetchCurrentProject()
    })

    /** MACOS 上双击放大窗口(不是最大化) */
    const maxScreen = () => {
        ipcRenderer.invoke("UIOperate", "max").then(() => {})
    }

    const [linkDatabase, setLinkDatabase] = useState<boolean>(false)
    const [linkDatabaseHint, setLinkDatabaseHint] = useState<boolean>(false)

    /**
     * 管理员模式补充情况
     * 连接的管理员进程进行关闭，然后手动触发重连，端口检测接口发出'端口不可用'信息
     * 解决方案：进行新端口的生成，并重连
     * 原因(猜测)：管理员进程的关闭是个过程，nodejs在kill后的30s才能检测端口可用
     */
    const onAdminPort = useMemoizedFn(() => {
        getRandomLocalEnginePort((p) => {
            setAdminPort(p)
            setCredential({...getCredential(), Port: p})
            setTimeout(() => {
                ipcRenderer.invoke("engine-ready-link")
            }, 300)
        })
    })
    const onReady = useMemoizedFn(() => {
        if (!getEngineLink()) {
            isEnpriTraceAgent()
                ? setEngineLink(true)
                : getRemoteValue(RemoteGV.LinkDatabase).then((id: number) => {
                      if (id) {
                          ipcRenderer.invoke("SetCurrentProject", {Id: +id})
                          setLinkDatabase(false)
                          setYakitMode("")
                          fetchCurrentProject()
                      } else {
                          setLinkDatabase(true)
                          setYakitMode("soft")
                      }
                      setTimeout(() => setEngineLink(true), 100)
                  })
        }

        if (latestYakit) setLatestYakit("")
        if (latestYaklang) setLatestYaklang("")

        setYakitStatus("link")
        cacheYakitStatus.current = "link"

        // 连接成功，保存一下端口缓存
        switch (engineMode) {
            case "local":
                setLocalValue(LocalGV.YaklangEnginePort, credential.Port)
                return
            case "admin":
                setLocalValue(LocalGV.YaklangEngineAdminPort, credential.Port)
                return
        }
    })
    const onFailed = useMemoizedFn((count: number) => {
        if (isDev.current) {
            if (count > 1) {
                setEngineLink(false)
                if (cacheYakitStatus.current === "link") {
                    setYakitStatus("error")
                }
            }
        } else {
            setEngineLink(false)
            if (cacheYakitStatus.current === "link") {
                setYakitStatus("error")
            }
        }
    })
    const [drop, setDrop] = useState<boolean>(true)
    useEffect(() => {
        // 监听是否开启header拖拽
        ipcRenderer.on("fetch-yakit-header-title-drop", (e, d: boolean) => {
            setDrop(d)
        })
        return () => {
            ipcRenderer.removeAllListeners("fetch-yakit-header-title-drop")
        }
    }, [])

    // 企业版-连接引擎后验证license=>展示企业登录
    const [isJudgeLicense, setJudgeLicense] = useState<boolean>(isEnterpriseEdition())
    const [show, setShow] = useState<boolean>(false)
    const [_, setLocalInfo, getLocalInfo] = useGetState<LocalInfoProps>()
    useEffect(() => {
        // 获取操作系统、架构、Yakit 版本、Yak 版本
        ipcRenderer.invoke("fetch-local-basic-info").then((data: LocalInfoProps) => {
            setLocalInfo(data)
        })
    }, [])
    const menu = (
        <YakitMenu
            // selectedKeys={[]}
            data={[
                {
                    key: "official_website",
                    label: "官方网站"
                },
                {
                    key: "Github",
                    label: "Github",
                    children: [
                        {label: "功能建议", key: "feature_request"},
                        {label: "BUG", key: "report_bug"}
                    ]
                }
            ]}
            onClick={({key}) => menuSelect(key)}
        ></YakitMenu>
    )
    const menuSelect = useMemoizedFn((type: string) => {
        const info = getLocalInfo()
        switch (type) {
            case "report_bug":
                const bug_tpl = ReportBug(info)
                ipcRenderer.invoke(
                    "open-url",
                    `https://github.com/yaklang/yakit/issues/new?title=【BUG】问题标题&body=${bug_tpl}&labels=bug`
                )
                return
            case "feature_request":
                let feature_tpl = FeatureRequest()
                ipcRenderer.invoke(
                    "open-url",
                    `https://github.com/yaklang/yakit/issues/new?title=【需求】需求标题&body=${feature_tpl}&labels=enhancement`
                )
                return
            case "official_website":
                ipcRenderer.invoke("open-url", "https://www.yaklang.com/docs/intro/")
                return
            default:
                return
        }
    })

    const [refresh, setRefresh] = useState<boolean>(false)

    useEffect(() => {
        ipcRenderer.on("fetch-switch-conn-refresh", (e, d: boolean) => {
            setRefresh(d)
        })
        return () => {
            ipcRenderer.removeAllListeners("fetch-switch-conn-refresh")
        }
    }, [])

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
                        className='button-primary-danger'
                        themeClass={styles["stop-screen-recorder"]}
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
                        onAdminPort={onAdminPort}
                    />
                    <div id='yakit-header' className={styles["ui-layout-header"]}>
                        {system === "Darwin" ? (
                            <div className={classNames(styles["header-body"], styles["mac-header-body"])}>
                                <div
                                    style={{left: yakitMode === "soft" ? 76 : -45}}
                                    className={styles["header-border-yakit-mask"]}
                                ></div>

                                <div className={classNames(styles["yakit-header-title"])} onDoubleClick={maxScreen}>
                                    Yakit-{`${EngineModeVerbose(engineMode || "local")}`}
                                </div>

                                <div className={styles["header-left"]}>
                                    <div>
                                        <MacUIOp />
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
                                                    <HomeSvgIcon
                                                        className={
                                                            yakitMode === "soft" ? styles["mode-icon-selected"] : ""
                                                        }
                                                    />
                                                </div>
                                            )}

                                            {/* <div
                                        className={classNames(styles["yakit-mode-icon"], {
                                            [styles["yakit-mode-selected"]]: false&&yakitMode === "store"
                                        })}
                                        onClick={() => changeYakitMode("store")}
                                    >
                                        {yakitMode === "store" ? <YakitStoreThemeSvgIcon /> : <YakitStoreGraySvgIcon />}
                                    </div> */}

                                            <div className={styles["divider-wrapper"]}></div>
                                            <YakitGlobalHost isEngineLink={engineLink} />
                                        </>
                                    )}
                                    <div className={styles["short-divider-wrapper"]}>
                                        <div className={styles["divider-style"]}></div>
                                    </div>

                                    <div className={styles["left-cpu"]}>
                                        <PerformanceDisplay engineMode={engineMode} typeCallback={typeCallback} />
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
                                    <YakitPopover
                                        overlayClassName={classNames(
                                            styles["ui-op-dropdown"],
                                            styles["ui-op-setting-dropdown"]
                                        )}
                                        placement={"bottom"}
                                        content={menu}
                                        onVisibleChange={(visible) => setShow(visible)}
                                    >
                                        <div className={styles["ui-op-btn-wrapper"]}>
                                            <div
                                                className={classNames(styles["op-btn-body"], {
                                                    [styles["op-btn-body-hover"]]: show
                                                })}
                                            >
                                                <HelpSvgIcon
                                                    style={{fontSize: 20}}
                                                    className={show ? styles["icon-hover-style"] : styles["icon-style"]}
                                                />
                                            </div>
                                        </div>
                                    </YakitPopover>

                                    {engineLink && (
                                        <>
                                            <FuncDomain
                                                isEngineLink={engineLink}
                                                engineMode={engineMode || "remote"}
                                                isRemoteMode={engineMode === "remote"}
                                                onEngineModeChange={changeEngineMode}
                                                typeCallback={typeCallback}
                                                showProjectManage={linkDatabase}
                                                system={system}
                                            />
                                            {!linkDatabase && (
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
                                    Yakit-{`${EngineModeVerbose(engineMode || "local")}`}
                                </div>

                                <div className={styles["header-left"]}>
                                    {engineLink && (
                                        <>
                                            {!linkDatabase && <GlobalState isEngineLink={engineLink} system={system} />}

                                            {!isEnpriTraceAgent() && (
                                                <div
                                                    className={classNames(styles["yakit-mode-icon"], {
                                                        [styles["yakit-mode-selected"]]: false && yakitMode === "soft"
                                                    })}
                                                    onClick={() => changeYakitMode("soft")}
                                                >
                                                    <HomeSvgIcon
                                                        className={
                                                            yakitMode === "soft" ? styles["mode-icon-selected"] : ""
                                                        }
                                                    />
                                                </div>
                                            )}

                                            {/* <div
                                    className={classNames(styles["yakit-mode-icon"], {
                                        [styles["yakit-mode-selected"]]: false&&yakitMode === "store"
                                    })}
                                    onClick={() => changeYakitMode("store")}
                                >
                                    {yakitMode === "store" ? <YakitStoreThemeSvgIcon /> : <YakitStoreGraySvgIcon />}
                                </div> */}

                                            <div className={styles["divider-wrapper"]}></div>
                                            <div>
                                                <FuncDomain
                                                    isEngineLink={engineLink}
                                                    isReverse={true}
                                                    engineMode={engineMode || "remote"}
                                                    isRemoteMode={engineMode === "remote"}
                                                    onEngineModeChange={changeEngineMode}
                                                    typeCallback={typeCallback}
                                                    showProjectManage={linkDatabase}
                                                    system={system}
                                                />
                                            </div>
                                        </>
                                    )}

                                    <YakitPopover
                                        overlayClassName={classNames(
                                            styles["ui-op-dropdown"],
                                            styles["ui-op-setting-dropdown"]
                                        )}
                                        placement={"bottom"}
                                        content={menu}
                                        onVisibleChange={(visible) => setShow(visible)}
                                    >
                                        <div className={styles["ui-op-btn-wrapper"]}>
                                            <div
                                                className={classNames(styles["op-btn-body"], {
                                                    [styles["op-btn-body-hover"]]: show
                                                })}
                                            >
                                                <HelpSvgIcon
                                                    style={{fontSize: 20}}
                                                    className={show ? styles["icon-hover-style"] : styles["icon-style"]}
                                                />
                                            </div>
                                        </div>
                                    </YakitPopover>
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
                                        <PerformanceDisplay engineMode={engineMode} typeCallback={typeCallback} />
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
                                    <WinUIOp />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={styles["ui-layout-body"]}>
                        {engineLink && (
                            <YakitSpin spinning={refresh}>
                                {isJudgeLicense ? (
                                    <EnterpriseJudgeLogin
                                        setJudgeLicense={setJudgeLicense}
                                        setJudgeLogin={(v: boolean) => {}}
                                    />
                                ) : linkDatabase ? (
                                    <SoftwareSettings
                                        engineMode={engineMode || "local"}
                                        onEngineModeChange={changeEngineMode}
                                        onFinish={softwareSettingFinish}
                                    />
                                ) : (
                                    props.children
                                )}
                            </YakitSpin>
                        )}
                        {!engineLink && !isRemoteEngine && (
                            <YakitLoading
                                yakitStatus={yakitStatus}
                                yakitStatusCallback={yakitStatusCallback}
                                engineMode={engineMode || "local"}
                                loading={loading}
                                currentYakit={currentYakit}
                                latestYakit={latestYakit}
                                setLatestYakit={setLatestYakit}
                                currentYaklang={currentYaklang}
                                latestYaklang={latestYaklang}
                                setLatestYaklang={setLatestYaklang}
                                localPort={localPort}
                                adminPort={adminPort}
                                onEngineModeChange={changeEngineMode}
                                showEngineLog={showEngineLog}
                                setShowEngineLog={setShowEngineLog}
                            />
                        )}
                        {!engineLink && isRemoteEngine && (
                            <RemoteYaklangEngine
                                loading={remoteConnectLoading}
                                onSubmit={connectRemoteEngine}
                                onEngineModeChange={changeEngineMode}
                                engineNotInstalled={!isEngineInstalled.current}
                                oncancel={() => {
                                    setEngineMode(undefined)
                                    cacheEngineMode.current = undefined
                                    setYakitStatus("install")
                                    cacheYakitStatus.current = "install"
                                }}
                            />
                        )}
                        {engineLink && (yaklangDownload || yakitDownload) && (
                            <div className={styles["ui-layout-body-mask"]}>
                                <AllKillEngineConfirm
                                    visible={yaklangDownload}
                                    setVisible={setYaklangDownload}
                                    onSuccess={() => {
                                        setYaklangDownload(false)
                                        setYakitStatus("update")
                                        cacheYakitStatus.current = "update"
                                        setEngineLink(false)
                                        setKeepalive(false)
                                    }}
                                />

                                <DownloadYakit system={system} visible={yakitDownload} setVisible={setYakitDownload} />
                            </div>
                        )}
                        {engineLink && __killOldEngine && (
                            <div className={styles["ui-layout-body-mask"]}>
                                <KillOldEngineProcess
                                    loading={killLoading}
                                    setVisible={setKillOldEngine}
                                    onSubmit={killOldProcess}
                                />
                            </div>
                        )}
                        {engineLink && startAdminEngine && (
                            <div className={styles["ui-layout-body-mask"]}>
                                <StartAdminEngineHint
                                    setVisible={setStartAdminEngine}
                                    onSubmit={startAdminEngineProcess}
                                />
                            </div>
                        )}
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

            <TransferProject
                {...projectTransferShow}
                onSuccess={() => {
                    if (!projectTransferShow.visible) return
                    setProjectTransferShow({visible: false})
                }}
                setVisible={(open: boolean) => setProjectTransferShow({visible: open})}
            />

            <YakitHint
                visible={linkDatabaseHint}
                title='是否进入项目管理'
                content='如果有正在进行中的任务，回到项目管理页则都会停止，确定回到项目管理页面吗?'
                onOk={() => {
                    setYakitMode("soft")
                    setLinkDatabase(true)
                    setLinkDatabaseHint(false)
                }}
                onCancel={() => setLinkDatabaseHint(false)}
            />
        </div>
    )
}

export default UILayout

interface RemoteYaklangEngineProps {
    loading: boolean
    onSubmit: (info: RemoteLinkInfo) => any
    onEngineModeChange: (mode: YaklangEngineMode) => any
    engineNotInstalled?: boolean
    oncancel?: () => any
}

/** @name 远程连接配置参数 */
interface RemoteLinkInfo {
    /** 是否保存为历史连接 */
    allowSave: boolean
    /** 历史连接名称 */
    linkName?: string
    /** 远程主机地址 */
    host: string
    /** 远程端口 */
    port: string
    /** 是否开启TLS */
    tls: boolean
    /** 证书 */
    caPem?: string
    password?: string
}

const DefaultRemoteLink: RemoteLinkInfo = {
    allowSave: false,
    host: "127.0.0.1",
    port: "8087",
    tls: false
}

/** @name 本地缓存远程连接配置信息 */
interface YakitAuthInfo {
    name: string
    host: string
    port: number
    caPem: string
    tls: boolean
    password: string
}

/** @name 远程连接UI */
const RemoteYaklangEngine: React.FC<RemoteYaklangEngineProps> = React.memo((props) => {
    const {loading, onSubmit, onEngineModeChange, oncancel} = props

    /** 远程主机参数 */
    const [remote, setRemote] = useState<RemoteLinkInfo>({...DefaultRemoteLink})
    /** 是否进入检查状态 */
    const [isCheck, setIsCheck] = useState<boolean>(false)

    const [auths, setAuths] = useState<YakitAuthInfo[]>([])

    const [showSTL, setShowSTL] = useState<boolean>(false)
    const [showAllow, setShowAllow] = useState<boolean>(false)

    useEffect(() => {
        ipcRenderer
            .invoke("get-yakit-remote-auth-all")
            .then((e: YakitAuthInfo[]) => {
                setAuths(
                    e.map((item) => {
                        item.tls = !!item.tls
                        return item
                    })
                )
            })
            .catch(() => {})

        getLocalValue(LocalGV.YaklangRemoteEngineCredential).then((result: RemoteLinkInfo) => {
            try {
                if (result?.host === "") {
                    return
                }
                setRemote({...result})
            } catch (e) {}
        })
    }, [])

    const submit = useMemoizedFn(() => {
        setIsCheck(true)
        if (!remote.host) return
        if (!remote.port) return
        if (remote.tls && !remote.caPem) return
        if (remote.allowSave && !remote.linkName) return

        setLocalValue(LocalGV.YaklangRemoteEngineCredential, {...remote})
        onSubmit({...remote})
    })
    const changeEngineMode = useMemoizedFn((mode: YaklangEngineMode) => {
        setRemote({...DefaultRemoteLink})
        setIsCheck(false)
        if (onEngineModeChange) {
            onEngineModeChange(mode)
        }
    })

    /** 返回上一层(未安装引擎的取消事件) */
    const onCancel = useMemoizedFn(() => {
        setRemote({...DefaultRemoteLink})
        setIsCheck(false)
        if (oncancel) oncancel()
    })

    return (
        <div className={styles["remote-yaklang-engine-wrapper"]}>
            <Spin spinning={loading}>
                <div className={styles["remote-yaklang-engine-body"]}>
                    <div className={styles["remote-title"]}>
                        <YakitThemeSvgIcon style={{fontSize: 64}} />
                        <div className={styles["title-style"]}>远程模式</div>
                        <div className={styles["remote-history"]}>
                            <div className={styles["select-title"]}>连接历史</div>
                            <Select
                                className={styles["select-style"]}
                                placeholder='请选择...'
                                onSelect={(value) => {
                                    const info = auths.filter((item) => item.name === value)[0]
                                    if (!info) return

                                    const remoteInfo: RemoteLinkInfo = {
                                        allowSave: true,
                                        linkName: info.name,
                                        host: info.host,
                                        port: info.port.toString() || "",
                                        tls: info.tls,
                                        caPem: info.caPem,
                                        password: info.password
                                    }
                                    setRemote(remoteInfo)
                                }}
                            >
                                {auths.map((item) => {
                                    return (
                                        <Select.Option key={item.name} value={item.name}>
                                            {item.name}
                                        </Select.Option>
                                    )
                                })}
                            </Select>
                        </div>
                    </div>

                    <div className={styles["rmeote-divider"]}></div>
                    <div className={styles["remote-info"]}>
                        <Form colon={false} labelAlign='right' labelCol={{span: 8}}>
                            <Form.Item label='Yak gRPC 主机地址:' required={true}>
                                <Input
                                    className={classNames(styles["input-style"], {
                                        [styles["error-border"]]: isCheck && !remote.host
                                    })}
                                    value={remote.host}
                                    onChange={(e) => setRemote({...remote, host: e.target.value})}
                                />
                            </Form.Item>
                            <Form.Item label='Yak gRPC 端口:' required={true}>
                                <Input
                                    className={classNames(styles["input-style"], {
                                        [styles["error-border"]]: isCheck && !remote.port
                                    })}
                                    value={remote.port}
                                    onChange={(e) => setRemote({...remote, port: e.target.value})}
                                />
                            </Form.Item>
                            <Form.Item label='启用通信加密认证 TLS:'>
                                <YakitSwitch
                                    size='large'
                                    checked={remote.tls}
                                    onChange={(tls) => setRemote({...remote, tls})}
                                />
                            </Form.Item>
                            {remote.tls && (
                                <>
                                    <Form.Item
                                        label={
                                            <div className={styles["pem-title"]}>
                                                gRPC Root-CA 证书(PEM){" "}
                                                <PEMExample setShow={setShowSTL}>
                                                    <HelpSvgIcon
                                                        className={
                                                            showSTL ? styles["icon-show-style"] : styles["icon-style"]
                                                        }
                                                    />
                                                </PEMExample>
                                                :
                                            </div>
                                        }
                                        required={true}
                                    >
                                        <div
                                            className={classNames(styles["pem-content"], {
                                                [styles["error-border"]]: isCheck && !remote.caPem
                                            })}
                                        >
                                            <YakEditor
                                                type={"pem"}
                                                value={remote.caPem}
                                                setValue={(caPem) => setRemote({...remote, caPem})}
                                            />
                                        </div>
                                    </Form.Item>
                                    <Form.Item label='密码'>
                                        <Input
                                            className={styles["input-style"]}
                                            value={remote.password}
                                            onChange={(e) => setRemote({...remote, password: e.target.value})}
                                        />
                                    </Form.Item>
                                </>
                            )}
                            <Form.Item
                                label={
                                    <div className={styles["pem-title"]}>
                                        保存为历史连接{" "}
                                        <PEMHint setShow={setShowAllow}>
                                            <HelpSvgIcon
                                                className={showAllow ? styles["icon-show-style"] : styles["icon-style"]}
                                            />
                                        </PEMHint>
                                        :
                                    </div>
                                }
                            >
                                <YakitSwitch
                                    size='large'
                                    checked={remote.allowSave}
                                    onChange={(allowSave: boolean) => setRemote({...remote, allowSave})}
                                />
                            </Form.Item>
                            {remote.allowSave && (
                                <Form.Item
                                    label='连接名:'
                                    required={true}
                                    help='填写后，本次记录会保存到连接历史中，之后可以快捷调用'
                                >
                                    <Input
                                        className={classNames(styles["input-style"], {
                                            [styles["error-border"]]: isCheck && !remote.linkName
                                        })}
                                        value={remote.linkName}
                                        onChange={(e) => setRemote({...remote, linkName: e.target.value})}
                                    />
                                </Form.Item>
                            )}
                            <Form.Item label=' ' style={{marginTop: 24}}>
                                <YakitButton size='max' onClick={submit}>
                                    启动连接
                                </YakitButton>
                                {!props.engineNotInstalled ? (
                                    <>
                                        <YakitButton
                                            style={{marginLeft: 8}}
                                            size='max'
                                            type='outline2'
                                            onClick={() => {
                                                changeEngineMode("local")
                                            }}
                                        >
                                            {EngineModeVerbose("local")}
                                        </YakitButton>
                                        {/*<Popconfirm*/}
                                        {/*    title={"启动管理员模式将需要用户额外认证"}*/}
                                        {/*    onConfirm={() => {*/}
                                        {/*        changeEngineMode("admin")*/}
                                        {/*    }}*/}
                                        {/*>*/}
                                        {/*    <YakitButton style={{marginLeft: 8}} size='max' type='outline2'>*/}
                                        {/*        {EngineModeVerbose("admin")}*/}
                                        {/*    </YakitButton>*/}
                                        {/*</Popconfirm>*/}
                                    </>
                                ) : (
                                    <YakitButton
                                        style={{marginLeft: 8}}
                                        size='max'
                                        type='outline2'
                                        onClick={() => onCancel()}
                                    >
                                        取消
                                    </YakitButton>
                                )}
                            </Form.Item>
                        </Form>
                    </div>
                </div>
            </Spin>
        </div>
    )
})

/** PEM证书示例 */
const PemPlaceHolder = `-----BEGIN CERTIFICATE-----
MIIDDjCCAfagAwIBAgIQdtJUoUlZeG+SAmgFo8TjpzANBgkqhkiG9w0BAQsFADAg
MR4wHAYDVQQDExVZYWtpdCBUZWFtU2VydmVyIFJvb3QwIBcNOTkxMjMxMTYwMDAw
WhgPMjEyMDA3MjkxMzIxMjJaMCAxHjAcBgNVBAMTFVlha2l0IFRlYW1TZXJ2ZXIg
Um9vdDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAMBs74NyAc38Srpy
j/rxFP4IICXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXZweuZ/nfV2
yj/9ECvP495b863Dxj/Lc+OfUO7sUILi7fRH3h201JFAqdQ0vtDsHwJI6HrLExst
hyKdO7gFPvht5orIXE5a4GLotoV1m1zh+T19NwZPGR7dkHN9U9WPlrPosl4lFNUI
EiGjjTexoYYfEpp8ROSLLTBRIio8zTzOW1TgNUeGDhjpD4Guys1YMaLX3nzbX6az
YkImVaZYkXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXZlocoTjglw2
P4XpcL0CAwEAAaXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXEB/wQFMAMBAf8w
HQYDVR0OBBYEFFdzdAPrxAja7GXXXXXXXXXXXXXXXXXXXXqGSIb3DQEBCwUAA4IB
AQCdc9dS0E0m4HLwUCCKAXXXXXXXXXXXXXXXXXXXXXXX1222222222oJ2iU3dzd6
PAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXae5a11129ateQEHPJ0JhdlsbqQ
FyTuYOijovSFVNuLuFj3WHrFOp5gY7Pl0V7lPHSiOAjVG4mg8PGGKivwyyv23nw+
Mx5C8WSoRFWx5H0afXDHptF4rq5bI/djg04VM5ibI5GJ3i1EybBpbGj3rRBY+sF9
FRmP2Nx+zifhMNe300xfHzqNeN3D+Uix6+GOkBoYI65KNPGqwi8uy9HlJVx3Jkht
WOG+9PGLcr4IRJx5LUEZ5FB1
-----END CERTIFICATE-----`

interface PEMExampleProps {
    children?: any
    setShow?: (flag: boolean) => any
}

/** @name PEM示例弹窗 */
const PEMExample: React.FC<PEMExampleProps> = React.memo((props) => {
    const {children, setShow} = props

    const content = (
        <div className={styles["pem-wrapper"]}>
            <div className={styles["title-style"]}>需要 PEM 格式的证书</div>
            在通过 <div className={styles["content-code"]}>yak grpc --tls</div> 启动核心服务器的时候，会把 RootCA
            打印到屏幕上，复制到该输入框即可：
            <br />
            例如如下内容：
            <br />
            <div className={styles["code-pem"]}>
                <YakEditor readOnly={true} value={PemPlaceHolder} />
            </div>
        </div>
    )

    return (
        <YakitPopover
            overlayClassName={styles["pem-example-popover"]}
            content={content}
            onVisibleChange={(visible) => {
                if (setShow) setShow(visible)
            }}
        >
            {children}
        </YakitPopover>
    )
})
/** @name PEM说明弹窗 */
const PEMHint: React.FC<PEMExampleProps> = React.memo((props) => {
    const {children, setShow} = props

    const copyCommand = useMemoizedFn(() => {
        ipcRenderer.invoke("set-copy-clipboard", CodeGV.RemoteLinkPath)
        success("复制成功")
    })
    const openFile = () => {
        ipcRenderer.invoke("open-remote-link")
    }

    const content = (
        <div style={{width: 430}} className={styles["pem-wrapper"]}>
            注意：Yakit 并不会把历史记录上传到互联网
            <br />
            你可以在你的本地目录（客户端目录）下找到远程登录信息
            <br />
            <div className={styles["path-wrapper"]}>
                <div className={styles["link-wrapper"]}>
                    {CodeGV.RemoteLinkPath}
                    <div className={styles["copy-icon"]} onClick={copyCommand}>
                        <YakitCopySvgIcon />
                    </div>
                </div>
                <div className={styles["link-open"]} onClick={openFile}>
                    打开远程信息储存位置
                </div>
            </div>
        </div>
    )

    return (
        <YakitPopover
            overlayClassName={styles["pem-example-popover"]}
            content={content}
            onVisibleChange={(visible) => {
                if (setShow) setShow(visible)
            }}
        >
            {children}
        </YakitPopover>
    )
})

interface DownloadYakitProps {
    system: YakitSystem
    visible: boolean
    setVisible: (flag: boolean) => any
}

/** @name Yakit软件更新下载弹窗 */
const DownloadYakit: React.FC<DownloadYakitProps> = React.memo((props) => {
    const {system, visible, setVisible} = props

    /** 常见问题弹窗是否展示 */
    const [qsShow, setQSShow] = useState<boolean>(false)

    /** 是否置顶 */
    const [isTop, setIsTop] = useState<0 | 1 | 2>(0)

    const [disabled, setDisabled] = useState(true)
    const [bounds, setBounds] = useState({left: 0, top: 0, bottom: 0, right: 0})
    const debouncedBounds = useDebounce(bounds, {wait: 500})
    const draggleRef = useRef<HTMLDivElement>(null)

    /** 下载进度条数据 */
    const [downloadProgress, setDownloadProgress, getDownloadProgress] = useGetState<DownloadingState>()

    // 是否中断下载进程
    const isBreakRef = useRef<boolean>(false)

    /**
     * 1. 获取最新软件版本号，并下载
     * 2. 监听本地下载软件进度数据
     * @returns 删除监听事件2
     */
    useEffect(() => {
        if (visible) {
            isBreakRef.current = true
            setDownloadProgress(undefined)
            ipcRenderer
                .invoke("fetch-latest-yakit-version")
                .then((data: string) => {
                    let version = data
                    if (version.startsWith("v")) version = version.substr(1)

                    ipcRenderer
                        .invoke("download-latest-yakit", version, isEnterpriseEdition())
                        .then(() => {
                            if (!isBreakRef.current) return
                            success("下载完毕")
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
                            ipcRenderer.invoke("open-yakit-or-yaklang")
                            ipcRenderer.invoke("download-update-wait", "yakit")
                        })
                        .catch((e: any) => {
                            if (!isBreakRef.current) return
                            failed(`下载失败: ${e}`)
                        })
                        .finally(() => setVisible(false))
                })
                .catch((e: any) => {
                    if (!isBreakRef.current) return
                    failed(`${e}`)
                    setVisible(false)
                })

            ipcRenderer.on("download-yakit-engine-progress", (e: any, state: DownloadingState) => {
                if (!isBreakRef.current) return
                setDownloadProgress(state)
            })

            return () => {
                ipcRenderer.removeAllListeners("download-yakit-engine-progress")
            }
        } else {
            isBreakRef.current = false
        }
    }, [visible])

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

    /** 取消下载事件 */
    const onCancel = useMemoizedFn(() => {
        isBreakRef.current = false
        setVisible(false)
        setDownloadProgress(undefined)
    })

    return (
        <>
            <Draggable
                defaultClassName={classNames(
                    styles["yakit-update-modal"],
                    visible ? styles["engine-hint-modal-wrapper"] : styles["engine-hint-modal-hidden-wrapper"],
                    {[styles["modal-top-wrapper"]]: isTop === 0}
                )}
                disabled={disabled}
                bounds={debouncedBounds}
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
                                    <HelpSvgIcon style={{fontSize: 20}} />
                                </div>
                            </div>

                            <div className={styles["hint-right-wrapper"]}>
                                <div className={styles["hint-right-download"]}>
                                    <div className={styles["hint-right-title"]}>Yakit 软件下载中...</div>
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
                                        <div>下载速度 : {((downloadProgress?.speed || 0) / 1000000).toFixed(2)}M/s</div>
                                    </div>
                                    <div style={{marginTop: 24}}>
                                        <YakitButton size='max' type='outline2' onClick={onCancel}>
                                            取消
                                        </YakitButton>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Draggable>
            <YakitQuestionModal
                isTop={isTop}
                setIsTop={setIsTop}
                system={system}
                visible={qsShow}
                setVisible={setQSShow}
            />
        </>
    )
})

interface AgrAndQSModalProps {
    isTop: 0 | 1 | 2
    setIsTop: (type: 0 | 1 | 2) => any
    system: YakitSystem
    visible: boolean
    setVisible: (flag: boolean) => any
}

/** @name Yakit-常见问题弹窗 */
const YakitQuestionModal: React.FC<AgrAndQSModalProps> = React.memo((props) => {
    const {isTop, setIsTop, system, visible, setVisible} = props

    const [show, setShow] = useState<boolean>(false)

    const [disabled, setDisabled] = useState(true)
    const [bounds, setBounds] = useState({left: 0, top: 0, bottom: 0, right: 0})
    const draggleRef = useRef<HTMLDivElement>(null)

    const copyCommand = useMemoizedFn(() => {
        ipcRenderer.invoke("set-copy-clipboard", CodeGV.HomeWebsite)
        success("复制成功")
    })
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
                styles["yakit-qs-modal"],
                {[styles["modal-top-wrapper"]]: isTop === 2},
                visible ? styles["agr-and-qs-modal-wrapper"] : styles["agr-and-qs-modal-hidden-wrapper"]
            )}
            disabled={disabled}
            bounds={bounds}
            onStart={(event, uiData) => onStart(event, uiData)}
        >
            <div ref={draggleRef}>
                <div className={styles["yakit-agr-and-qs-modal"]} onClick={() => setIsTop(2)}>
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
                                <span>Yakit 软件官网下载链接</span>
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
                                <span className={styles["header-title"]}>Yakit 软件官网下载链接</span>
                                <div className={styles["close-wrapper"]} onClick={() => setVisible(false)}>
                                    <WinUIOpCloseSvgIcon className={styles["icon-style"]} />
                                </div>
                            </div>
                        )}
                        <div className={styles["modal-body"]}>
                            <div className={styles["yakit-update-hint"]}>如遇网络问题无法下载，可到官网下载安装：</div>

                            <div className={styles["yakit-update-link"]}>
                                官网地址
                                <div className={styles["link-wrapper"]}>
                                    {CodeGV.HomeWebsite}
                                    <div className={styles["copy-icon"]} onClick={copyCommand}>
                                        <YakitCopySvgIcon />
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

interface KillOldEngineProcessProps {
    loading?: boolean
    setVisible: (val: boolean) => any
    onSubmit: () => any
}

const KillOldEngineProcess: React.FC<KillOldEngineProcessProps> = React.memo((props) => {
    const {loading, setVisible, onSubmit} = props

    return (
        <div className={classNames(styles["kill-old-engine-modal"], styles["modal-top-wrapper"])}>
            <div className={styles["kill-old-engine-hint"]}>
                <div className={styles["yaklang-engine-hint-wrapper"]}>
                    <div className={styles["hint-left-wrapper"]}>
                        <div className={styles["hint-icon"]}>
                            <YaklangInstallHintSvgIcon />
                        </div>
                    </div>

                    <div className={styles["hint-right-wrapper"]}>
                        <div className={styles["hint-right-title"]}>发现新引擎版本</div>
                        <div className={styles["hint-right-content"]}>
                            发现本地引擎存在新版本待使用，是否关闭引擎使用新版本？
                        </div>

                        <div className={styles["hint-right-btn"]}>
                            <div></div>
                            <div className={styles["btn-group-wrapper"]}>
                                <YakitButton
                                    loading={loading}
                                    size='max'
                                    type='outline2'
                                    onClick={() => setVisible(false)}
                                >
                                    取消
                                </YakitButton>
                                <YakitButton loading={loading} size='max' onClick={onSubmit}>
                                    确定
                                </YakitButton>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
})

const StartAdminEngineHint: React.FC<KillOldEngineProcessProps> = React.memo((props) => {
    const {setVisible, onSubmit} = props

    return (
        <div className={classNames(styles["kill-old-engine-modal"], styles["modal-top-wrapper"])}>
            <div className={styles["kill-old-engine-hint"]}>
                <div className={styles["yaklang-engine-hint-wrapper"]}>
                    <div className={styles["hint-left-wrapper"]}>
                        <div className={styles["hint-icon"]}>
                            <YaklangInstallHintSvgIcon />
                        </div>
                    </div>

                    <div className={styles["hint-right-wrapper"]}>
                        <div className={styles["hint-right-title"]}>启动管理员权限引擎</div>
                        <div className={styles["hint-right-content"]}>
                            是否启动并连接管理员权限引擎
                            <br />
                            <span className={styles["warning-content"]}>
                                由于后续功能规划，管理员权限将逐步进行下架，建议使用本地模式，如出现问题，使用“设置-网卡权限修复”即可
                            </span>
                        </div>

                        <div className={styles["hint-right-btn"]}>
                            <div></div>
                            <div className={styles["btn-group-wrapper"]}>
                                <YakitButton size='max' type='outline2' onClick={() => setVisible(false)}>
                                    取消
                                </YakitButton>
                                <YakitButton size='max' onClick={onSubmit}>
                                    确定
                                </YakitButton>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
})
