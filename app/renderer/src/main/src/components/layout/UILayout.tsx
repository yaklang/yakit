import React, {useEffect, useMemo, useRef, useState} from "react"
import {useCreation, useMemoizedFn, useUpdateEffect} from "ahooks"
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
import {BaseMiniConsole} from "../baseConsole/BaseConsole"
import {
    getReleaseEditionName,
    isCommunityEdition,
    isEnpriTrace,
    isEnpriTraceAgent,
    isEnterpriseEdition
} from "@/utils/envfile"
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
import {useEeSystemConfig, useStore, yakitDynamicStatus} from "@/store"
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
import {SolidCheckCircleIcon, SolidHomeIcon} from "@/assets/icon/solid"
import {ChatCSGV} from "@/enums/chatCS"
import {outputToPrintLog} from "./WelcomeConsoleUtil"
import {setNowProjectDescription} from "@/pages/globalVariable"
import {apiGetGlobalNetworkConfig, apiSetGlobalNetworkConfig} from "@/pages/spaceEngine/utils"
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
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {visitorsStatisticsFun} from "@/utils/visitorsStatistics"
import {setYakitEngineMode} from "@/constants/software"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import {handleFetchArchitecture, handleFetchIsDev, SystemInfo} from "@/constants/hardware"

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

    /** 本地引擎自检输出日志 */
    const [checkLog, setCheckLog] = useState<string[]>(["软件启动中，开始前置检查..."])

    /** 引擎是否安装 */
    const isEngineInstalled = useRef<boolean>(false)

    /** 当前引擎模式 */
    const [engineMode, setEngineMode, getEngineMode] = useGetSetState<YaklangEngineMode>()
    const onSetEngineMode = useMemoizedFn((v?: YaklangEngineMode) => {
        setYakitEngineMode(v)
        setEngineMode(v)
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

    // 引擎状态断开时清空yakrunner
    useUpdateEffect(() => {
        if (getMapAllTerminalKey().length > 0 && !engineLink) {
            clearTerminalMap()
            ipcRenderer.invoke("runner-terminal-clear")
        }
    }, [engineLink])

    // 获取企业版配置信息
    const {eeSystemConfig, setEeSystemConfig} = useEeSystemConfig()
    useEffect(() => {
        let collectData = false
        eeSystemConfig.forEach((item) => {
            if (item.configName === "collectData") {
                collectData = item.isOpen
            }
        })
        let timer
        if (collectData) {
            visitorsStatisticsFun(userInfo.token)
            timer = setInterval(visitorsStatisticsFun, 60000)
        }
        return () => {
            timer && clearInterval(timer)
        }
    }, [eeSystemConfig])
    useEffect(() => {
        if (engineLink && isEnpriTrace()) {
            NetWorkApi<any, API.SystemConfigResponse>({
                method: "get",
                url: "system/config"
            })
                .then((config) => {
                    const data = config.data || []
                    setEeSystemConfig([...data])
                })
                .catch(() => {
                    setEeSystemConfig([])
                })
        }
    }, [engineLink])

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
        setYakitStatus("")
        onSetEngineMode("remote")
    })
    // 本地连接的状态设置
    const setLinkLocalEngine = useMemoizedFn(() => {
        onDisconnect()
        setYakitStatus("")
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
                setYakitStatus("install")
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
            if (SystemInfo.isDev) {
                if (getEngineLink() && getEngineMode() === "local") return
            }

            handleBuiltInCheck()
            handleFetchBaseInfo(() => {
                handleLinkEngineMode()
            })
        }, 1000)
    }, [])

    /** 校验版本有问题 没有内置版本则 安装最新引擎 **/
    const [onlyInstallLatestEngine, setOnlyInstallLatestEngine] = useState<boolean>(false)
    const checkEngineDownloadLatestVersion = () => {
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
                    setYakitStatus("install")
                }
            },
            () => {
                // 走下载安装逻辑
                setOnlyInstallLatestEngine(true)
                setYakitStatus("install")
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
                setShowEngineLog(false)
            }

            setLocalValue(LocalGV.YaklangEngineMode, getEngineMode())

            const waitTime: number = 20000
            const id = setInterval(() => {
                grpcFetchYakInstallResult(true)
                    .then((flag: boolean) => {
                        if (isEngineInstalled.current === flag) return
                        isEngineInstalled.current = flag
                        isInitLocalLink.current = true
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
        setYakitStatus("ready")
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
    const loadingClickCallback = useMemoizedFn((type: YaklangEngineMode | YakitStatusType | EngineOtherOperation) => {
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

            default:
                return
        }
    })

    const handleOperations = useMemoizedFn((type: YakitSettingCallbackType | YaklangEngineMode) => {
        switch (type) {
            case "break":
                if (getYakitStatus() === "link") {
                    setYakitStatus("break")
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
        if (type === "yakit") setYakitDownload(true)
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
                    setLinkLocalEngine()
                },
                (err) => {
                    if (err.message === "operation not permitted") {
                        setYaklangSpecifyVersion("")
                        setLinkLocalEngine()
                    } else {
                        // 引擎文件已经被删除了
                        setYakitStatus("install")
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
            .invoke("InitBuildInEngine", {})
            .then(() => {
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
            setLinkLocalEngine()
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
                                    setLinkLocalEngine()
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
                    setYakitStatus("control-remote")
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

    const onOkEnterProjectMag = useMemoizedFn(() => {
        ipcRenderer.invoke("SetCurrentProject", {})
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

    const openAIByChatCS = useMemoizedFn((obj: CodecParamsProps) => {
        emiter.emit("onRunChatcsAIByFuzzer", JSON.stringify(obj))
    })

    const [coedcPluginShow, setCoedcPluginShow] = useState<boolean>(false)

    // 判断打开 ChatCS-AI插件执行/全局网络配置第三方应用框
    const onFuzzerModal = useMemoizedFn(async (value) => {
        try {
            const val: {text?: string; scriptName?: string; code?: string; isAiPlugin: any} = JSON.parse(value)
            if (val.isAiPlugin === "isGetPlugin") {
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
                                        <div style={{margin: 24}}>
                                            <NewThirdPartyApplicationConfig
                                                isOnlyShowAiType={true}
                                                onAdd={(e) => {
                                                    let existed = false
                                                    const existedResult = (obj.AppConfigs || []).map((i) => {
                                                        if (i.Type === e.Type) {
                                                            existed = true
                                                            return {...i, ...e}
                                                        }
                                                        return {...i}
                                                    })
                                                    if (!existed) {
                                                        existedResult.push(e)
                                                    }
                                                    const params = {...obj, AppConfigs: existedResult}
                                                    apiSetGlobalNetworkConfig(params).then(() => {
                                                        openAIByChatCS({...val})
                                                        m.destroy()
                                                    })
                                                }}
                                                onCancel={() => m.destroy()}
                                            />
                                        </div>
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

    /** ---------- ChatCS End ---------- */

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
            // INFO 开发环境默认每次进入项目都是默认项目 避免每次都进项目管理页面去选项目
            if (SystemInfo.isDev) {
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

        setTimeout(() => setEngineLink(true), 100)
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
        outputToPrintLog(`连接成功-start-engineLink:${getEngineLink()}`)
        if (!getEngineLink()) {
            isEnpriTraceAgent() ? SELinkedEngine() : onLinkedEngine()
        }

        setCheckLog([])
        setYakitStatus("link")

        // 连接成功，保存一下端口缓存
        switch (getEngineMode()) {
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
    })

    const onWatchDogCallback = useMemoizedFn((type: EngineWatchDogCallbackType) => {
        switch (type) {
            case "control-remote-connect-failed":
                setCheckLog(["远程控制异常退出, 无法连接"])
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

                                    <HelpDoc system={system} engineLink={engineLink} />

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

                                    <HelpDoc system={system} engineLink={engineLink} />

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

                        <LocalEngine
                            ref={localEngineRef}
                            system={system}
                            setLog={setCheckLog}
                            onLinkEngine={handleLinkLocalEngine}
                            setYakitStatus={setYakitStatus}
                            checkEngineDownloadLatestVersion={checkEngineDownloadLatestVersion}
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
                                <DownloadYakit system={system} visible={yakitDownload} setVisible={setYakitDownload} />
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
                onFinish={() => {
                    // 此处通知刷新各类基于codec插件菜单
                    emiter.emit("onRefPluginCodecMenu")
                }}
            />
        </div>
    )
}

export default UILayout
