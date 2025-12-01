import React, {useEffect, useMemo, useRef, useState} from "react"
import {useCreation, useDebounceEffect, useMemoizedFn, useUpdateEffect} from "ahooks"
import {MacUIOp} from "./MacUIOp"
import {PerformanceDisplay, yakProcess} from "./PerformanceDisplay"
import {FuncDomain} from "./FuncDomain"
import {TemporaryProjectPop, WinUIOp} from "./WinUIOp"
import {GlobalState} from "./GlobalState"
import {YakitGlobalHost} from "./YakitGlobalHost"
import {
    EngineOtherOperation,
    EngineWatchDogCallbackType,
    YakitSettingCallbackType,
    YakitStatusType,
    YakitSystem,
    YaklangEngineMode
} from "@/yakitGVDefine"
import {failed, info, warn, yakitFailed, yakitNotify} from "@/utils/notification"
import {LocalGV, RemoteGV} from "@/yakitGV"
import {EngineModeVerbose, YakitLoading} from "../basics/YakitLoading"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {getLocalValue, getRemoteValue, setLocalValue, setRemoteValue} from "@/utils/kv"
import {YaklangEngineWatchDog, YaklangEngineWatchDogCredential} from "@/components/layout/YaklangEngineWatchDog"
import {StringToUint8Array} from "@/utils/str"
import {EngineLog} from "./EngineLog"
import {
    GetConnectPort,
    getReleaseEditionName,
    isCommunityEdition,
    isEnpriTrace,
    isEnpriTraceAgent,
    isEnterpriseEdition,
    isMemfit
} from "@/utils/envfile"
import {AllKillEngineConfirm} from "./AllKillEngineConfirm"
import {SoftwareSettings} from "@/pages/softwareSettings/SoftwareSettings"
import {PolygonIcon, StopIcon} from "@/assets/newIcon"
import EnterpriseJudgeLogin from "@/pages/EnterpriseJudgeLogin"
import {
    ExportProjectProps,
    getEnvTypeByProjects,
    NewProjectAndFolder,
    ProjectDescription,
    ProjectIOProgress,
    ProjectParamsProp,
    TransferProject
} from "@/pages/softwareSettings/ProjectManage"
import {YakitHint} from "../yakitUI/YakitHint/YakitHint"
import {YakitSpin} from "../yakitUI/YakitSpin/YakitSpin"
import {useScreenRecorder} from "@/store/screenRecorder"
import {ResultObjProps, remoteOperation} from "@/pages/dynamicControl/DynamicControl"
import {useEeSystemConfig, useStore, yakitDynamicStatus} from "@/store"
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
import {SolidCheckCircleIcon, SolidHomeIcon} from "@/assets/icon/solid"
import {setNowProjectDescription} from "@/pages/globalVariable"
import {
    handleAIConfig,
    apiGetGlobalNetworkConfig,
    apiSetGlobalNetworkConfig
} from "@/pages/spaceEngine/utils"
import {GlobalNetworkConfig} from "../configNetwork/ConfigNetworkPage"
import {showYakitModal} from "../yakitUI/YakitModal/YakitModalConfirm"
import {YakitGetOnlinePlugin} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import {CodecParamsProps} from "../yakChat/chatCS"
import NewThirdPartyApplicationConfig from "../configNetwork/NewThirdPartyApplicationConfig"
import {usePerformanceSampling} from "@/store/performanceSampling"
import {YakitPopover} from "../yakitUI/YakitPopover/YakitPopover"
import {OutlineExitIcon, OutlineRefreshIcon} from "@/assets/icon/outline"
import {CopyComponents} from "../yakitUI/YakitTag/YakitTag"
import {Tooltip} from "antd"
import {openABSFileLocated} from "@/utils/openWebsite"
import {clearTerminalMap, getMapAllTerminalKey} from "@/pages/yakRunner/BottomEditorDetails/TerminalBox/TerminalMap"
import {grpcFetchLatestYakVersion, grpcFetchYakInstallResult} from "@/apiUtils/grpc"
import {visitorsStatisticsFun} from "@/utils/visitorsStatistics"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import {handleFetchArchitecture, handleFetchIsDev, SystemInfo} from "@/constants/hardware"
import {getEnginePortCacheKey} from "@/utils/localCache/engine"
import {
    apiSplitUpload,
    ExportProjectRequest,
    grpcExportProject,
    grpcGetProjects,
    SplitUploadRequest,
    useUploadInfoByEnpriTrace
} from "./utils"
import moment from "moment"
import {debugToPrintLog} from "@/utils/logCollection"
import {usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {NewYakitLoading} from "../basics/NewYakitLoading"

import classNames from "classnames"
import styles from "./uiLayout.module.scss"

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
    const {currentPageTabRouteKey} = usePageInfo(
        (s) => ({
            currentPageTabRouteKey: s.currentPageTabRouteKey
        }),
        shallow
    )
    // #region 软件级功能设置
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
    // #endregion

    /** ---------- 软件状态相关属性 Start ---------- */
    const [system, setSystem] = useState<YakitSystem>("Darwin")

    /** 本地引擎自检输出日志 */
    const [checkLog, setCheckLog] = useState<string[]>(["软件启动中，开始前置检查..."])

    /** 引擎是否安装 */
    const isEngineInstalled = useRef<boolean>(false)

    /** 当前引擎模式 */
    const [engineMode, setEngineMode, getEngineMode] = useGetSetState<YaklangEngineMode>()
    const onSetEngineMode = useMemoizedFn((v?: YaklangEngineMode) => {
        setEngineMode(v)
        SystemInfo.mode = v
    })
    /** 是否为远程模式 */
    const isRemoteEngine = useMemo(() => engineMode === "remote", [engineMode])

    /** 认证信息 */
    const [credential, setCredential] = useState<YaklangEngineWatchDogCredential>({...DefaultCredential})

    /** yakit使用状态 */
    const [yakitStatus, setYakitStatus, getYakitStatus] = useGetSetState<YakitStatusType>("")

    /** 当前引擎连接状态 */
    const [engineLink, setEngineLink, getEngineLink] = useGetSetState<boolean>(false)

    /** 是否为初次启动本地连接 */
    const isInitLocalLink = useRef<boolean>(true)

    // 本地连接ref
    const localEngineRef = useRef<LocalEngineLinkFuncProps>(null)
    // 是否持续监听引擎进程的连接状态
    const [keepalive, setKeepalive] = useState<boolean>(false)
    /** ---------- 软件状态相关属性 End ---------- */

    // #region 新窗口引擎已经启动好，只需要看门狗检查是否ready，此处默认初始化一些变量
    const [oldLink, setOldLink, getOldLink] = useGetSetState<boolean>(false)
    const [showLoadingPage, setShowLoadingPage] = useState<boolean>(false)
    /** 本地引擎自检输出日志 */
    const [newCheckLog, setNewCheckLog] = useState<string[]>([])
    useEffect(() => {
        ipcRenderer.on("from-engineLinkWin", (e, data) => {
            setOldLink(data.useOldLink)
            if (!data.useOldLink) {
                setNewCheckLog(["引擎连接中..."])
                setShowLoadingPage(true)
                handleFetchBaseInfo()
                setCredential(data.credential)
                onSetEngineMode(data.credential.Mode)
                setYakitStatus("ready")
                if (data.credential.Mode === "local") {
                    setTimeout(() => {
                        setKeepalive(true)
                    }, 500)
                } else {
                    setKeepalive(true)
                }
                setTimeout(() => {
                    setNewCheckLog([])
                }, 2000)
            } else {
                setShowLoadingPage(false)
            }
        })
        return () => {
            ipcRenderer.removeAllListeners("from-engineLinkWin")
        }
    }, [])
    // #endregion

    const {userInfo} = useStore()

    // 引擎状态断开时清空yakrunner
    useUpdateEffect(() => {
        if (getMapAllTerminalKey().length > 0 && !engineLink) {
            clearTerminalMap()
            ipcRenderer.invoke("runner-terminal-clear")
        }
    }, [engineLink])

    // 获取企业版配置信息
    const {eeSystemConfig} = useEeSystemConfig()
    const isLoginFirstRef = useRef<boolean>(true) // 只是登录的那一下需要传login参数的标志
    useDebounceEffect(
        () => {
            let collectData = false
            eeSystemConfig.forEach((item) => {
                if (item.configName === "collectData") {
                    collectData = item.isOpen
                }
            })
            let timer
            if (collectData && userInfo.isLogin) {
                const token = userInfo.token
                if (isLoginFirstRef.current) {
                    visitorsStatisticsFun(token, "login")
                    isLoginFirstRef.current = false
                } else {
                    visitorsStatisticsFun(token)
                }
                timer = setInterval(() => {
                    visitorsStatisticsFun(token)
                }, 60000)
            } else {
                isLoginFirstRef.current = true
                timer && clearInterval(timer)
            }
            return () => {
                isLoginFirstRef.current = true
                timer && clearInterval(timer)
            }
        },
        [eeSystemConfig, userInfo],
        {wait: 300}
    )

    // #region 企业版登录成功后根据配置信息看是否需要自动上传项目
    const projectListRef = useRef<ProjectDescription[]>([])
    const [uploadProjectEvent] = useUploadInfoByEnpriTrace()
    useEffect(() => {
        // 登录根据配置参数判断是否自动上传项目
        uploadProjectEvent.startUpload({
            isAutoUploadProject: true
        })
    }, [userInfo.isLogin])

    useEffect(() => {
        emiter.on("autoUploadProject", (data) => {
            try {
                onGetProjects(JSON.parse(data).day)
            } catch (error) {}
        })
        return () => {
            emiter.off("autoUploadProject")
        }
    }, [])

    const onGetProjects = useMemoizedFn((day) => {
        const time = moment().subtract(day, "days").startOf("day")
        const query: ProjectParamsProp = {
            Type: "project",
            FrontendType: "project",
            AfterUpdatedAt: time.unix(),
            Pagination: {
                Page: 1,
                Limit: -1,
                Order: "desc",
                OrderBy: "updated_at"
            }
        }
        grpcGetProjects(query).then((res) => {
            const {Projects} = res
            const name = currentProject?.ProjectName || ""
            projectListRef.current = [...(Projects || [])].filter((item) => item.ProjectName !== name) // 过滤当前打开的项目
            if (projectListRef.current.length > 0) {
                onExportProject()
            }
        })
    })
    const onExportProject = useMemoizedFn(() => {
        if (!projectListRef.current.length) return
        const value = projectListRef.current.shift()
        if (!value) return
        const token = `${value.Id}-${moment().valueOf()}`
        let filePath = ""
        let hasError = false
        ipcRenderer.on(`${token}-data`, (e, data: ProjectIOProgress) => {
            if (!!data.TargetPath) {
                filePath = data.TargetPath.replace(/\\/g, "\\")
            }
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            hasError = true
            failed(`${value.ProjectName}项目数据同步失败,请手动上传`)
        })
        ipcRenderer.once(`${token}-end`, (e, data) => {
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-data`)
            if (hasError) {
                onExportProject()
                return
            }
            const onlineToken = `${filePath}-${moment().valueOf()}`
            const onlineParams: SplitUploadRequest = {
                url: "fragment/upload",
                path: filePath,
                token: onlineToken,
                type: "Project"
            }
            apiSplitUpload(onlineParams).then((TaskStatus) => {
                if (!TaskStatus) {
                    failed(`${projectName}项目数据同步失败,请手动上传`)
                }
                onExportProject()
            })
        })
        const params: ExportProjectRequest = {
            Id: value.Id,
            token
        }
        grpcExportProject(params)
    })
    // #endregion

    /** ---------- 引擎状态和连接相关逻辑 Start ---------- */
    /** 插件漏洞信息库自检 */
    const handleBuiltInCheck = useMemoizedFn(() => {
        if (!getOldLink()) return
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
        debugToPrintLog(`------ 主窗口获取系统基础信息 ------`)
        try {
            if (SystemInfo.isDev === undefined) await handleFetchIsDev()
        } catch (error) {}
        try {
            const systemName: YakitSystem = await ipcRenderer.invoke("fetch-system-name")
            setSystem(systemName)
        } catch (error) {}
        try {
            if (SystemInfo.architecture === undefined) await handleFetchArchitecture()
        } catch (error) {}
        try {
            const isInstalled = await grpcFetchYakInstallResult(true)
            isEngineInstalled.current = isInstalled
        } catch (error) {}

        if (!getOldLink()) return
        if (nextFunc) nextFunc()
    })

    /** 获取上次连接引擎的模式 */
    const handleLinkEngineMode = useMemoizedFn(() => {
        if (!getOldLink()) return
        debugToPrintLog(`------ （旧）获取上次连接引擎的模式 ------`)
        setCheckLog(["获取上次连接引擎的模式..."])
        getLocalValue(LocalGV.YaklangEngineMode).then((val: YaklangEngineMode) => {
            switch (val) {
                case "remote":
                    setCheckLog((arr) => arr.concat(["获取连接模式成功——远程模式"]))
                    debugToPrintLog(`------ （旧）连接引擎的模式: remote ------`)
                    setTimeout(() => {
                        handleChangeLinkMode(true)
                    }, 1000)

                    return
                case "local":
                    setCheckLog((arr) => arr.concat(["获取连接模式成功——本地模式"]))
                    debugToPrintLog(`------ （旧）连接引擎的模式: local ------`)
                    setTimeout(() => {
                        handleChangeLinkMode()
                    }, 1000)
                    return
                default:
                    setCheckLog((arr) => arr.concat(["未获取到连接模式-默认(本地)模式"]))
                    debugToPrintLog(`------ （旧）连接引擎的模式: local ------`)
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
        setYakitStatus("")
        setShowLoadingPage(false)
        onSetEngineMode("remote")
    })
    // 本地连接的状态设置
    const setLinkLocalEngine = useMemoizedFn((isDown?: boolean) => {
        onDisconnect()
        setYakitStatus("")
        onSetEngineMode("local")
        if (isDown || !getOldLink()) {
            setOldLink(false)
            openEngineLinkWin("local")
        } else {
            debugToPrintLog(`------ （旧）启动本地引擎连接逻辑 ------`)
            handleStartLocalLink(isInitLocalLink.current)
            isInitLocalLink.current = false
        }
    })
    // 切换本地模式
    const handleLinkLocalMode = useMemoizedFn(() => {
        if (!getOldLink()) return
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
            debugToPrintLog(`------ （旧）启动无本地引擎逻辑 ------`)
            setCheckLog(["检查本地是否已安装引擎..."])
            setCheckLog((arr) => arr.concat(["本地未安装引擎，准备启动安装引擎弹窗"]))
            setTimeout(() => {
                setYakitStatus("install")
                onSetEngineMode(undefined)
            }, 1000)
        }
    })

    // 切换连接模式
    const handleChangeLinkMode = useMemoizedFn((isRemote?: boolean) => {
        if (!getOldLink()) return
        setCheckLog([])
        if (!!isRemote) {
            handleLinkRemoteMode()
        } else {
            handleLinkLocalMode()
        }
    })

    // 本地连接的两种模式
    const handleStartLocalLink = useMemoizedFn((isInit?: boolean) => {
        if (!getOldLink()) return
        if (isInit) {
            if (localEngineRef.current) localEngineRef.current.init()
        } else {
            if (localEngineRef.current) localEngineRef.current.link()
        }
    })

    // 软件开始进行逻辑启动
    useEffect(() => {
        if (!getOldLink()) return
        setTimeout(() => {
            /**
             * dev环境下，如果已连接本地引擎，则不需要再次连接
             */
            if (SystemInfo.isDev) {
                if (getEngineLink() && getEngineMode() === "local") return
            }

            handleBuiltInCheck()
            handleFetchBaseInfo(() => {
                handleLinkEngineMode()
            })
        }, 1000)
    }, [oldLink])

    /** 校验版本有问题 没有内置版本则 安装最新引擎 **/
    const [onlyInstallLatestEngine, setOnlyInstallLatestEngine] = useState<boolean>(false)
    const checkEngineDownloadLatestVersion = () => {
        if (!getOldLink()) return
        yakEngineVersionExistsAndCorrectness(
            yaklangLastVersionRef.current,
            () => {
                // 直接安装完成后
                handleStatusCompleted("install")
            },
            (err) => {
                if (err.message === "operation not permitted") {
                    emiter.emit("checkEngineDownloadLatestVersionCancel")
                } else {
                    // 引擎文件已经被删除了
                    setYakitStatus("")
                    setOldLink(false)
                    openEngineLinkWin("install")
                }
            },
            () => {
                // 走下载安装逻辑
                // setOnlyInstallLatestEngine(true)
                // setYakitStatus("install")

                setYakitStatus("")
                setOldLink(false)
                openEngineLinkWin("installNetWork")
            }
        )
    }

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
                setYakitStatus("link")
                if (getOldLink()) {
                    setShowEngineLog(false)
                }
            }

            setLocalValue(LocalGV.YaklangEngineMode, getEngineMode())

            const waitTime: number = 20000
            const id = setInterval(() => {
                grpcFetchYakInstallResult(true)
                    .then((flag: boolean) => {
                        if (isEngineInstalled.current === flag) return
                        isEngineInstalled.current = flag
                        if (getOldLink()) {
                            isInitLocalLink.current = true
                        }
                        // 清空主进程yaklang版本缓存
                        ipcRenderer.invoke("clear-local-yaklang-version-cache")
                    })
                    .catch()
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
        setEngineLink(false)
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
                setYakitStatus("")
                setOldLink(false)
                openEngineLinkWin("local")
                return

            default:
                return
        }
    })

    // 开始本地连接引擎
    const handleLinkLocalEngine = useMemoizedFn((port: number) => {
        if (!getOldLink()) return
        debugToPrintLog(`------ （旧）开始启动引擎, 指定端口: ${port} ------`)
        setCheckLog([`本地普通权限引擎模式，开始启动本地引擎-端口: ${port}`])
        setCredential({
            Host: "127.0.0.1",
            IsTLS: false,
            Password: "",
            PemBytes: undefined,
            Port: port,
            Mode: "local"
        })
        setYakitStatus("ready")
        onStartLinkEngine()
    })

    const [remoteLinkLoading, setRemoteLinkLoading] = useState<boolean>(false)
    // 开始远程连接引擎
    const handleLinkRemoteEngine = useMemoizedFn((info: RemoteLinkInfo) => {
        setRemoteLinkLoading(true)
        const obj = {
            Host: info.host,
            IsTLS: info.tls,
            Password: info.tls ? info.password : "",
            PemBytes: StringToUint8Array(info.tls ? info.caPem || "" : ""),
            Port: parseInt(info.port),
            Mode: "remote"
        }
        setCredential(obj as unknown as YaklangEngineWatchDogCredential)
        ipcRenderer.invoke("updateCredential", {credential: obj})
        onStartLinkEngine()
    })
    // 远程切换本地
    const handleRemoteToLocal = useMemoizedFn(() => {
        onSetEngineMode(undefined)
        if (getOldLink()) {
            handleChangeLinkMode()
        } else {
            onDisconnect()
            openEngineLinkWin("local")
        }
    })
    /** ---------- 软件状态与是否连接引擎相关方法 End ---------- */

    /** ---------- 各种操作逻辑处理 Start ---------- */
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
    const loadingClickCallback = useMemoizedFn((type: YaklangEngineMode | YakitStatusType | EngineOtherOperation) => {
        if (!getOldLink()) return
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
            case "changePort":
                // 手动改变连接端口
                setTimeoutLoading(setRestartLoading)
                handleStartLocalLink(isInitLocalLink.current)
                isInitLocalLink.current = false
                setKeepalive(false)
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

            case "engine-error":
                setTimeoutLoading(setRestartLoading)
                if (localEngineRef.current) localEngineRef.current.resetBuiltIn()
                return

            default:
                return
        }
    })

    const newLoadingClickCallback = useMemoizedFn((type: YaklangEngineMode | YakitStatusType) => {
        switch (type) {
            case "control-remote":
                // 远程控制连接时的刷新
                setTimeoutLoading(setRemoteControlRefreshLoading)
                onStartLinkEngine(true)
                break
            case "local":
                setTimeoutLoading(setRestartLoading)
                setLinkLocalEngine()
                return
            default:
                return
        }
    })

    const openEngineLinkWin = useMemoizedFn((type: YakitSettingCallbackType | YaklangEngineMode | YakitStatusType) => {
        setShowLoadingPage(true)
        setNewCheckLog(["即将退出..."])
        killCurrentProcess(() => {
            setTimeout(() => {
                // 先销毁 antd 消息通知 弹窗
                emiter.emit("destroyMainWinAntdUiEvent")
                ipcRenderer.invoke("yakitMainWin-done", {yakitStatus: type})
            }, 1000)
            setTimeout(() => {
                setNewCheckLog([])
            }, 2000)
        }, [GetConnectPort()])
    })
    const killCurrentProcess = useMemoizedFn(async (callback: () => void, extraPorts?: number[]) => {
        let finalPorts: number[] = []

        // ---------- 1. 获取 fetch-yaklang-engine-addr 的端口 ----------
        try {
            const data = await ipcRenderer.invoke("fetch-yaklang-engine-addr")
            const parts = (data.addr as string).split(":")
            if (parts.length === 2) {
                const fetchPort = Number(parts[1]) || 0
                if (fetchPort) finalPorts.push(fetchPort)
            }
        } catch (err) {}

        // 合并额外端口
        if (Array.isArray(extraPorts)) {
            finalPorts.push(...extraPorts)
        }

        // 去重
        finalPorts = Array.from(new Set(finalPorts))

        // ---------- 2. PS 查询所有 yak 进程 ----------
        ipcRenderer
            .invoke("ps-yak-grpc")
            .then(async (res) => {
                // 查找 PID
                const pidsToKill = res
                    .filter((p) => finalPorts.includes(Number(p.port)))
                    .map((p) => p.pid)
                    .filter(Boolean)

                if (pidsToKill.length === 0) {
                    callback()
                    return
                }

                // ---------- 4. kill ----------
                for (const pid of pidsToKill) {
                    try {
                        await ipcRenderer.invoke("kill-yak-grpc", pid)
                        info(`KILL yak PROCESS: ${pid}`)
                    } catch (err) {
                        failed(`Kill yak process failed: ${err}`)
                    }
                }

                callback()
            })
            .catch(() => {
                callback()
            })
    })

    const handleOperations = useMemoizedFn((type: YakitSettingCallbackType | YaklangEngineMode) => {
        switch (type) {
            case "break":
                if (getYakitStatus() === "link") {
                    setYakitStatus("break")
                    setTimeout(() => {
                        getOldLink() && setCheckLog(["已主动断开, 请点击手动连接引擎"])
                        onDisconnect()
                    }, 100)

                    if (!getOldLink()) {
                        openEngineLinkWin("break")
                    }
                }
                return

            case "local":
                info(`引擎状态切换为: ${EngineModeVerbose("local")}`)
                delTemporaryProject()
                onDisconnect()
                onSetEngineMode(undefined)
                if (getOldLink()) {
                    handleLinkLocalMode()
                } else {
                    if (isEngineInstalled.current) {
                        setLinkLocalEngine()
                    } else {
                        openEngineLinkWin("install")
                    }
                }
                return
            case "remote":
                info(`引擎状态切换为: ${EngineModeVerbose("remote")}`)
                delTemporaryProject()
                onSetEngineMode(undefined)
                setTimeout(() => {
                    handleLinkRemoteMode()
                }, 500)
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
    // 是否为内网yakit更新
    const [intranetYakit, setIntranetYakit] = useState<boolean>(false)
    // 更新yaklang前置-关闭所有引擎进程modal
    const [yaklangKillPss, setYaklangKillPss] = useState<boolean>(false)
    const [yaklangKillBuildInEngine, setYaklangKillBuildInEngine] = useState<boolean>(false)
    // 更新yaklang-modal
    const [yaklangDownload, setYaklangDownload] = useState<boolean>(false)
    // 更新yaklang-modal文案
    const [yaklangKillPssText, setYaklangKillPssText] = useState<{title: string; content: string}>({
        title: "更新引擎，需关闭所有本地进程",
        content: "关闭所有引擎，包括正在连接的本地引擎进程，同时页面将进入加载页。"
    })
    const [yaklangSpecifyVersion, setYaklangSpecifyVersion] = useState<string>("")
    const yaklangLastVersionRef = useRef<string>("")
    useEffect(() => {
        grpcFetchLatestYakVersion(true)
            .then((data: string) => {
                const v = data
                yaklangLastVersionRef.current = v
            })
            .catch((err) => {})
    }, [])
    // 监听UI上的更新yakit或yaklang更新功能
    const handleActiveDownloadModal = useMemoizedFn((type: string) => {
        if (yaklangKillPss || yakitDownload) return
        if (type === "intranetYakit") {
            setYakitDownload(true)
            setIntranetYakit(true)
        }
        if (type === "yakit") {
            setYakitDownload(true)
            setIntranetYakit(false)
        }
        if (type === "yaklang") setYaklangKillPss(true)
    })
    // kill完引擎进程后开始更新引擎
    const killedEngineToUpdate = useMemoizedFn(() => {
        setYaklangKillPss(false)
        if (!yaklangDownload) {
            setEngineLink(false)
            setKeepalive(false)
            if (!yaklangSpecifyVersion) {
                setYaklangKillPssText({
                    title: "更新引擎，需关闭所有本地进程",
                    content: "关闭所有引擎，包括正在连接的本地引擎进程，同时页面将进入加载页。"
                })
                setYaklangDownload(true)
                return
            }
            yakEngineVersionExistsAndCorrectness(
                yaklangSpecifyVersion,
                () => {
                    setYaklangSpecifyVersion("")
                    setLinkLocalEngine(true)
                },
                (err) => {
                    if (err.message === "operation not permitted") {
                        setYaklangSpecifyVersion("")
                        setLinkLocalEngine(true)
                    } else {
                        // 引擎文件已经被删除了
                        setYakitStatus("")
                        setOldLink(false)
                        openEngineLinkWin("install")
                    }
                },
                () => {
                    setYaklangDownload(true)
                }
            )
        }
    })
    // 判断引擎版本没有问题，则直接安装，否则重新下载
    const yakEngineVersionExistsAndCorrectness = async (
        version: string,
        installSuccessCallback: () => void,
        installErrCallback: (err) => void,
        errCallback: () => void
    ) => {
        try {
            const res = await ipcRenderer.invoke("yak-engine-version-exists-and-correctness", version)
            if (res === true) {
                // 清空主进程yaklang版本缓存
                ipcRenderer.invoke("clear-local-yaklang-version-cache")
                ipcRenderer
                    .invoke("install-yak-engine", version)
                    .then(() => {
                        yakitNotify("success", `安装成功，如未生效，重启 ${getReleaseEditionName()} 即可`)
                        installSuccessCallback()
                    })
                    .catch((err: any) => {
                        failed(
                            `安装失败: ${
                                err.message.indexOf("operation not permitted") > -1 ? "请关闭引擎后重试" : err
                            }`
                        )
                        installErrCallback(err)
                    })
            } else {
                errCallback && errCallback()
            }
        } catch (error) {
            errCallback && errCallback()
        }
    }

    const initBuildInEngine = () => {
        ipcRenderer
            .invoke("RestoreEngineAndPlugin", {})
            .then(() => {
                ipcRenderer.invoke("write-engine-key-to-yakit-projects").finally(() => {
                    yakitNotify("info", "解压内置引擎成功")
                    showYakitModal({
                        closable: false,
                        maskClosable: false,
                        keyboard: false,
                        type: "white",
                        title: "引擎解压成功，需要重启",
                        content: (
                            <div style={{height: 80, padding: 24, display: "flex", alignItems: "center"}}>
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
            })
            .catch((e) => {
                yakitNotify("error", `初始化内置引擎失败：${e}`)
            })
    }

    // kill完引擎进程后解压内置引擎
    const killedEngineToBuildInEngine = useMemoizedFn(() => {
        setYaklangKillBuildInEngine(false)
        setYaklangKillPss(false)
        setEngineLink(false)
        setKeepalive(false)
        initBuildInEngine()
    })

    // kill完引擎进程后开始更新指定Yaklang版本引擎
    const downYaklangSpecifyVersion = (res: string) => {
        try {
            const {version, killPssText = {}} = JSON.parse(res) || {}
            setYaklangSpecifyVersion(version)
            setYaklangKillPssText({
                title: killPssText.title || "更新引擎，需关闭所有本地进程",
                content: killPssText.content || "关闭所有引擎，包括正在连接的本地引擎进程，同时页面将进入加载页。"
            })
            handleActiveDownloadModal("yaklang")
        } catch (error) {}
    }

    // 使用官方引擎 - 下载最新引擎
    const useOfficialEngineByDownload = () => {
        downYaklangSpecifyVersion(
            JSON.stringify({
                version: yaklangLastVersionRef.current,
                killPssText: {
                    title: "使用官方引擎，需关闭所有本地进程",
                    content:
                        "确认下载并安装官方引擎，将会关闭所有引擎，包括正在连接的本地引擎进程，同时页面将进入加载页。"
                }
            })
        )
    }

    // 使用官方引擎 - 内置引擎
    const useOfficialEngineByDownloadByBuiltIn = () => {
        setYaklangKillBuildInEngine(true)
        setYaklangKillPssText({
            title: "使用官方引擎，需关闭所有本地进程",
            content: "确认安装内置引擎，将会关闭所有引擎，包括正在连接的本地引擎进程，同时页面将进入加载页。"
        })
        handleActiveDownloadModal("yaklang")
    }
    const onDownloadedYaklang = useMemoizedFn(() => {
        setYaklangSpecifyVersion("")
        setYaklangDownload(false)
        // 下载完成后，需要延迟一会，否则可能获取的引擎版本号不是最新
        setTimeout(() => {
            setLinkLocalEngine(true)
        }, 200)
    })

    const [killOldEngine, setKillOldEngine] = useState<boolean>(false)
    const [killLoading, setKillLoading] = useState<boolean>(false)
    const killOldProcess = useMemoizedFn((callback?: () => void) => {
        let isFailed: boolean = false
        let port: number = 0
        let pid: number = 0

        if (getEngineLink()) {
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
                                    setLinkLocalEngine(true)
                                    callback && callback()
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
        emiter.on("useOfficialEngineByDownloadByBuiltIn", useOfficialEngineByDownloadByBuiltIn)
        emiter.on("useOfficialEngineByDownload", useOfficialEngineByDownload)
        emiter.on("downYaklangSpecifyVersion", downYaklangSpecifyVersion)
        emiter.on("activeUpdateYakitOrYaklang", handleActiveDownloadModal)
        ipcRenderer.on("kill-old-engine-process-callback", () => {
            setKillOldEngine(true)
        })
        return () => {
            emiter.off("useOfficialEngineByDownloadByBuiltIn", useOfficialEngineByDownloadByBuiltIn)
            emiter.off("useOfficialEngineByDownload", useOfficialEngineByDownload)
            emiter.off("downYaklangSpecifyVersion", downYaklangSpecifyVersion)
            emiter.off("activeUpdateYakitOrYaklang", handleActiveDownloadModal)
            ipcRenderer.removeAllListeners("kill-old-engine-process-callback")
        }
    }, [])
    /** ---------- yakit和yaklang的更新(以连接引擎的状态下) & kill引擎进程 End ---------- */

    // #region 远程控制(控制端)
    const {dynamicStatus, setDynamicStatus} = yakitDynamicStatus()

    useEffect(() => {
        // 监听退出远程控制
        ipcRenderer.on("login-out-dynamic-control-callback", async (params) => {
            if (dynamicStatus.isDynamicStatus) {
                // 切换到本地
                if (getOldLink()) {
                    handleLinkLocalMode()
                } else {
                    setLinkLocalEngine()
                }

                setDynamicStatus({...dynamicStatus, isDynamicStatus: false})
                await remoteOperation(false, dynamicStatus)
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
                    if (!getOldLink()) {
                        setNewCheckLog(["远程控制连接中..."])
                        setShowLoadingPage(true)
                    } else {
                        setCheckLog(["远程控制连接中..."])
                    }
                    setYakitStatus("control-remote")
                    onDisconnect()
                    
                    const obj = {
                        Host: resultObj.host,
                        IsTLS: true,
                        Password: resultObj.secret,
                        PemBytes: StringToUint8Array(res?.Result || ""),
                        Port: resultObj.port,
                        Mode: "remote"
                    }
                    setCredential(obj as unknown as YaklangEngineWatchDogCredential)
                    ipcRenderer.invoke("updateCredential", {credential: obj})
                    onStartLinkEngine(true)
                })
                .catch((err) => {
                    warn(`Base64 解码失败:${err}`)
                })
        } catch (error) {
            warn(`解析失败:${error}`)
        }
    })
    // #endregion

    /** 是否展示引擎日志内容 */
    const [showEngineLog, setShowEngineLog] = useState<boolean>(false)

    // #region EE版-license
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
    // #endregion

    // #region 项目管理 & 项目导出 & 临时项目
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

    const onOkEnterProjectMag = useMemoizedFn(() => {
        ipcRenderer.invoke("SetCurrentProject", {
            Type: getEnvTypeByProjects()
        })
        setYakitMode("soft")
        // 刷新项目管理列表
        if (showProjectManage) {
            emiter.emit("onRefreshProjectList")
        }
        setShowProjectManage(true)
        setCurrentProject(undefined)
        setNowProjectDescription(undefined)
    })

    /** 项目管理的选中项目回调 */
    const softwareSettingFinish = useMemoizedFn(() => {
        setYakitMode("")
        setShowProjectManage(false)
        ipcRenderer
            .invoke("GetCurrentProjectEx", {
                Type: getEnvTypeByProjects()
            })
            .then((rsp: ProjectDescription) => {
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
    // #endregion

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
        if (engineLink) {
            setSwitchEngineLoading(false)
        }
    }, [engineLink])

    useEffect(() => {
        emiter.on("onSwitchEngine", onOkEnterProjectMag)
        return () => {
            emiter.off("onSwitchEngine", onOkEnterProjectMag)
        }
    }, [])
    /** ---------- 切换引擎时的逻辑 End ---------- */

    // #region ChatCS
    const openAIByChatCS = useMemoizedFn((obj: CodecParamsProps) => {
        emiter.emit("onRunChatcsAIByFuzzer", JSON.stringify(obj))
    })

    const [coedcPluginShow, setCoedcPluginShow] = useState<boolean>(false)

    // 判断打开 ChatCS-AI插件执行/全局网络配置第三方应用框
    const percentContainerRef = useRef<string>(currentPageTabRouteKey)
    const onFuzzerModal = useMemoizedFn(async (value) => {
        try {
            const val: {text?: string; scriptName?: string; code?: string; isAiPlugin: any} = JSON.parse(value)
            if (val.isAiPlugin === "isGetPlugin") {
                percentContainerRef.current = currentPageTabRouteKey
                setCoedcPluginShow(true)
                return
            }
            if (val.isAiPlugin) {
                try {
                    const res = await ipcRenderer.invoke("CheckHahValidAiConfig")
                    apiGetGlobalNetworkConfig().then((obj: GlobalNetworkConfig) => {
                        // 如若已配置 则打开执行框
                        if (res.Ok) {
                            openAIByChatCS({...val})
                        } else {
                            let m = showYakitModal({
                                title: "添加第三方应用",
                                width: 600,
                                footer: null,
                                closable: true,
                                maskClosable: false,
                                content: (
                                    <>
                                        <div className={styles["ai-describe"]}>
                                            请选择AI类型进行APIKey配置，如配置多个，可在全局配置中配置使用优先级
                                        </div>
                                        <NewThirdPartyApplicationConfig
                                            isOnlyShowAiType={true}
                                            onAdd={(data) => {
                                                // 新增，有影响ai优化级
                                                const newParams = handleAIConfig({
                                                    AppConfigs: obj.AppConfigs,
                                                    AiApiPriority: obj.AiApiPriority
                                                }, data)
                                                if (!newParams) {
                                                    yakitNotify("error", "onFuzzerModal 参数错误")
                                                    return
                                                }
                                                const params:GlobalNetworkConfig = {...obj,...newParams}
                                                apiSetGlobalNetworkConfig(params).then(() => {
                                                    openAIByChatCS({...val})
                                                    m.destroy()
                                                })
                                            }}
                                            onCancel={() => m.destroy()}
                                        />
                                    </>
                                )
                            })
                        }
                    })
                } catch (error) {
                    yakitNotify("error", error + "")
                }
            } else {
                openAIByChatCS({text: val.text, scriptName: val.scriptName, isAiPlugin: val.isAiPlugin})
            }
        } catch (error) {}
    })

    useEffect(() => {
        // YakitWindow
        emiter.on("onOpenFuzzerModal", onFuzzerModal)
        return () => {
            emiter.off("onOpenFuzzerModal", onFuzzerModal)
        }
    }, [])

    // #endregion

    // #region 软件顶部展示采样中、录屏中
    /** ---------- 软件顶部展示采样中 Start ---------- */
    const {performanceSamplingInfo, setPerformanceSamplingLog, setSampling} = usePerformanceSampling()
    const [isShowSamplingInfo, setIsShowSamplingInfo] = useState<boolean>(false)
    const resetPerformanceSampling = useMemoizedFn(() => {
        setSampling(false)
        setPerformanceSamplingLog([])
        setIsShowSamplingInfo(false)
    })
    useEffect(() => {
        if (!performanceSamplingInfo.isPerformanceSampling) {
            setIsShowSamplingInfo(true)
        }
    }, [performanceSamplingInfo.isPerformanceSampling])

    const performanceSampling = useCreation(() => {
        return (
            <>
                {performanceSamplingInfo.isPerformanceSampling ? (
                    <YakitButton
                        type='primary'
                        colors='infoBlue'
                        className={styles["stop-screen-recorder"]}
                        size='middle'
                        onClick={() => {
                            emiter.emit("cancelPerformanceSampling")
                        }}
                    >
                        <div className={styles["stop-icon"]}>
                            <StopIcon />
                        </div>
                        <span className={styles["stop-text"]}>采样中</span>
                    </YakitButton>
                ) : (
                    <>
                        {performanceSamplingInfo.log.length ? (
                            <YakitPopover
                                overlayClassName={styles["sampling-popover"]}
                                content={
                                    <div
                                        onBlur={() => {
                                            setIsShowSamplingInfo(false)
                                        }}
                                    >
                                        {performanceSamplingInfo.log.map((item, index) => (
                                            <div className={classNames(styles["sampling-info"])} key={index}>
                                                <Tooltip
                                                    title='点击打开所在目录'
                                                    placement='top'
                                                    align={{targetOffset: [-10, -15]}}
                                                >
                                                    <span
                                                        className={classNames(styles["sampling-info-item"])}
                                                        onClick={() => {
                                                            ipcRenderer
                                                                .invoke("is-file-exists", item.path)
                                                                .then((flag: boolean) => {
                                                                    if (flag) {
                                                                        openABSFileLocated(item.path)
                                                                    } else {
                                                                        failed("目标文件已不存在!")
                                                                    }
                                                                })
                                                                .catch(() => {})
                                                        }}
                                                    >
                                                        {item.path.substring(
                                                            Math.max(
                                                                item.path.lastIndexOf("/"),
                                                                item.path.lastIndexOf("\\")
                                                            ) + 1
                                                        )}
                                                    </span>
                                                </Tooltip>
                                                <CopyComponents copyText={item.path} />
                                            </div>
                                        ))}
                                        <div className={classNames(styles["sampling-footer"])}>
                                            <div
                                                className={classNames(styles["footer-bottom"], styles["sampling-exit"])}
                                                onClick={resetPerformanceSampling}
                                            >
                                                <OutlineExitIcon />
                                                退出
                                            </div>
                                            <div
                                                className={classNames(
                                                    styles["footer-bottom"],
                                                    styles["sampling-refresh"]
                                                )}
                                                onClick={() => {
                                                    resetPerformanceSampling()
                                                    emiter.emit("performanceSampling")
                                                }}
                                            >
                                                <OutlineRefreshIcon />
                                                重新采样
                                            </div>
                                        </div>
                                    </div>
                                }
                                trigger='click'
                                placement='bottom'
                                visible={isShowSamplingInfo}
                                onVisibleChange={(visible) => {
                                    if (!visible) setIsShowSamplingInfo(false)
                                }}
                            >
                                <Tooltip title='采样完成' placement='bottom'>
                                    <YakitButton
                                        type='primary'
                                        colors='success'
                                        className={styles["stop-screen-recorder"]}
                                        size='middle'
                                        onClick={() => setIsShowSamplingInfo(true)}
                                    >
                                        <div className={styles["stop-icon"]}>
                                            <SolidCheckCircleIcon />
                                        </div>
                                        <span className={styles["stop-text"]}>采样完成</span>
                                    </YakitButton>
                                </Tooltip>
                            </YakitPopover>
                        ) : (
                            <></>
                        )}
                    </>
                )}
            </>
        )
    }, [performanceSamplingInfo, isShowSamplingInfo])
    /** ---------- 软件顶部展示采样中 End ---------- */

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
                        size='middle'
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
    // #endregion

    const SELinkedEngine = useMemoizedFn(() => {
        setEngineLink(true)
    })
    const onLinkedEngine = useMemoizedFn(async () => {
        // EE & CE
        try {
            const flag = await getRemoteValue(RemoteGV.TemporaryProjectNoPrompt)
            if (flag) {
                setTemporaryProjectNoPromptFlag(flag === "true")
            }
            /**
             * INFO 开发环境默认每次进入项目都是默认项目 避免每次都进项目管理页面去选项目
             * INFO memfit 项目同样遵循该规则，启动后自动进入默认项目
             */
            if (SystemInfo.isDev || isMemfit()) {
                const res = await ipcRenderer.invoke("GetDefaultProjectEx", {
                    Type: getEnvTypeByProjects()
                })
                if (res) {
                    ipcRenderer.invoke("SetCurrentProject", {Id: +res.Id, Type: getEnvTypeByProjects()})
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

        setTimeout(() => setEngineLink(true), 100)
    })

    /**
     * 启动引擎进程的监听，用于显示启动进程错误时的报错信息
     */
    useEffect(() => {
        if (!getOldLink()) return
        ipcRenderer.on("start-yaklang-engine-error", (_, error: string) => {
            setCheckLog((arr) => arr.concat([`${error}`]))
        })
        return () => {
            ipcRenderer.removeAllListeners("start-yaklang-engine-error")
        }
    }, [])

    const onReady = useMemoizedFn(() => {
        // debugToPrintLog(`------ 进程存活，准备连接中... ------`)
        if (!getEngineLink()) {
            isEnpriTraceAgent() ? SELinkedEngine() : onLinkedEngine()
        }

        setCheckLog([])
        setYakitStatus("link")
        if (!getOldLink()) return
        // 连接成功，保存一下端口缓存
        switch (getEngineMode()) {
            case "local":
                if (dynamicStatus.isDynamicStatus) return
                setLocalValue(getEnginePortCacheKey(), credential.Port)
                return
        }
    })
    const onFailed = useMemoizedFn((count: number) => {
        if (getOldLink()) {
            // 20以上的次数属于无效次数
            if (count > 20) {
                setKeepalive(false)
                return
            }
            debugToPrintLog(`[INFO] （旧）目标引擎进程不存在: 探活失败${count}次`)

            setEngineLink(false)

            if (dynamicStatus.isDynamicStatus && getYakitStatus() !== "control-remote") {
                setCheckLog(["远程控制重连中..."])
                setYakitStatus("control-remote")
                return
            } else {
                if (getYakitStatus() === "control-remote") {
                    if (count === 5) {
                        setCheckLog(["远程控制异常退出, 无法连接"])
                        failed("远程控制异常退出, 无法连接。")
                        setDynamicStatus({...dynamicStatus, isDynamicStatus: false})
                        remoteOperation(false, dynamicStatus, userInfo)
                        setYakitStatus("control-remote-timeout")
                        onDisconnect()
                    }
                    return
                }
            }

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
                    failed("远程连接已断开")
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
        } else {
            // 20以上的次数属于无效次数
            if (count > 20) {
                setKeepalive(false)
                return
            }
            debugToPrintLog(`[INFO] 目标引擎进程不存在: 主窗口探活失败${count}次`)
            setEngineLink(false)

            if (dynamicStatus.isDynamicStatus && getYakitStatus() !== "control-remote") {
                setNewCheckLog(["远程控制重连中..."])
                setYakitStatus("control-remote")
                return
            } else {
                if (getYakitStatus() === "control-remote") {
                    if (count === 5) {
                        setNewCheckLog(["远程控制异常退出, 无法连接"])
                        failed("远程控制异常退出, 无法连接。")
                        setDynamicStatus({...dynamicStatus, isDynamicStatus: false})
                        remoteOperation(false, dynamicStatus, userInfo)
                        setYakitStatus("control-remote-timeout")
                        onDisconnect()
                    }
                    return
                }
            }

            if (getYakitStatus() === "error" && count === 20) {
                // 连接断开后的20次尝试过后，不在进行尝试
                return
            }

            if (getYakitStatus() === "link" || getYakitStatus() === "ready") {
                // 连接中或正在连接中触发
                if (getEngineMode() === "remote") {
                    failed("远程连接已断开")
                    onDisconnect()
                    setYakitStatus("")
                    handleOperations("remote")
                }
                if (getEngineMode() === "local") {
                    if (count > 4) {
                        setYakitStatus("error")
                        openEngineLinkWin("error")
                    }
                }
            }
        }
    })

    const onWatchDogCallback = useMemoizedFn((type: EngineWatchDogCallbackType) => {
        switch (type) {
            case "control-remote-connect-failed":
                if (getOldLink()) {
                    setCheckLog(["远程控制异常退出, 无法连接"])
                } else {
                    setNewCheckLog(["远程控制异常退出, 无法连接"])
                }
                setYakitStatus("control-remote-timeout")
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

    const onDevToolRefresh = useMemoizedFn(() => {
        killCurrentProcess(() => {
            setOldLink(false)
            onDisconnect()
            setYakitStatus("")
            onSetEngineMode(undefined)
        })
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
                        oldLink={oldLink}
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
                                        <PerformanceDisplay
                                            engineMode={engineMode}
                                            typeCallback={handleOperations}
                                            engineLink={engineLink}
                                        />
                                    </div>
                                </div>
                                <div
                                    className={classNames(styles["header-title"], {
                                        [styles["header-title-drop"]]: drop
                                    })}
                                    onDoubleClick={maxScreen}
                                />
                                <div className={styles["header-right"]}>
                                    {performanceSampling}

                                    {stopScreen}

                                    <HelpDoc system={system} />

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
                                                onDevToolRefresh={onDevToolRefresh}
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
                                                    onDevToolRefresh={onDevToolRefresh}
                                                />
                                            </div>
                                        </>
                                    )}

                                    <HelpDoc system={system} />

                                    {stopScreen}

                                    {performanceSampling}
                                </div>

                                <div
                                    className={classNames(styles["header-title"], {
                                        [styles["header-title-drop"]]: drop
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
                        {yakitStatus === "install" && oldLink && (
                            // 本地没有引擎时的下载引擎
                            <InstallEngine
                                visible={yakitStatus === "install"}
                                system={system}
                                onSuccess={() => handleStatusCompleted("install")}
                                onRemoreLink={() => {
                                    setCheckLog([])
                                    handleLinkRemoteMode()
                                }}
                                onlyInstallLatestEngine={onlyInstallLatestEngine}
                                setYakitStatus={setYakitStatus}
                            />
                        )}

                        {!engineLink && !isRemoteEngine && yaklangDownload && (
                            // 更新引擎
                            <DownloadYaklang
                                yaklangSpecifyVersion={yaklangSpecifyVersion}
                                system={system}
                                visible={yaklangDownload}
                                onCancel={onDownloadedYaklang}
                            />
                        )}

                        {oldLink && (
                            <LocalEngine
                                ref={localEngineRef}
                                setLog={setCheckLog}
                                onLinkEngine={handleLinkLocalEngine}
                                setYakitStatus={setYakitStatus}
                                checkEngineDownloadLatestVersion={checkEngineDownloadLatestVersion}
                                setOldLink={setOldLink}
                                openEngineLinkWin={openEngineLinkWin}
                            />
                        )}

                        {!engineLink && !showLoadingPage && isRemoteEngine && yakitStatus !== "control-remote" && (
                            <RemoteEngine
                                loading={remoteLinkLoading}
                                setLoading={setRemoteLinkLoading}
                                installedEngine={isEngineInstalled.current}
                                onSubmit={handleLinkRemoteEngine}
                                onSwitchLocalEngine={handleRemoteToLocal}
                            />
                        )}
                        {!engineLink && !isRemoteEngine && oldLink && (
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
                        {!engineLink && showLoadingPage && !oldLink && (
                            <NewYakitLoading
                                yakitStatus={yakitStatus}
                                checkLog={newCheckLog}
                                restartLoading={restartLoading}
                                remoteControlRefreshLoading={remoteControlRefreshLoading}
                                btnClickCallback={newLoadingClickCallback}
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
                                    title={yaklangKillPssText.title}
                                    content={yaklangKillPssText.content}
                                    visible={yaklangKillPss}
                                    setVisible={setYaklangKillPss}
                                    onCancelFun={() => {
                                        setYaklangSpecifyVersion("")
                                    }}
                                    onSuccess={() =>
                                        yaklangKillBuildInEngine
                                            ? killedEngineToBuildInEngine()
                                            : killedEngineToUpdate()
                                    }
                                />
                                {/* 更新yakit */}
                                <DownloadYakit
                                    system={system}
                                    visible={yakitDownload}
                                    setVisible={setYakitDownload}
                                    intranetYakit={intranetYakit}
                                />
                            </div>
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
            {oldLink && (
                <div
                    className={classNames({
                        [styles["uilayout-log"]]: showEngineLog,
                        [styles["uilayout-hidden-log"]]: !showEngineLog,
                        [styles["uilayout-noshow-log"]]: engineLink
                    })}
                >
                    <EngineLog visible={engineLink} setVisible={setShowEngineLog} />
                </div>
            )}
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

            <YakitGetOnlinePlugin
                visible={coedcPluginShow}
                pluginType={["codec"]}
                setVisible={(v) => {
                    setCoedcPluginShow(v)
                }}
                onFinish={() => {
                    // 此处通知刷新各类基于codec插件菜单
                    emiter.emit("onRefPluginCodecMenu")
                }}
                getContainer={
                    document.getElementById(`main-operator-page-body-${percentContainerRef.current}`) || undefined
                }
            />
        </div>
    )
}

export default UILayout
