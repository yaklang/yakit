import React, {useEffect, useLayoutEffect, useRef, useState} from "react"
import {useDebounce, useGetState, useMemoizedFn} from "ahooks"
import {Checkbox, Form, Input, Popconfirm, Progress, Select, Spin} from "antd"
import Draggable from "react-draggable"
import type {DraggableEvent, DraggableData} from "react-draggable"
import {MacUIOp} from "./MacUIOp"
import {
    HelpSvgIcon,
    MacUIOpCloseSvgIcon,
    WinUIOpCloseSvgIcon,
    YakitCopySvgIcon,
    YakitGraySvgIcon,
    // YakitStoreGraySvgIcon,
    // YakitStoreThemeSvgIcon,
    YakitThemeSvgIcon,
    YaklangInstallHintSvgIcon
} from "./icons"
import {PerformanceDisplay, yakProcess} from "./PerformanceDisplay"
import {FuncDomain} from "./FuncDomain"
import {WinUIOp} from "./WinUIOp"
import {GlobalReverseState} from "./GlobalReverseState"
import {YakitGlobalHost} from "./YakitGlobalHost"
import {DownloadingState, YakitSystem, YaklangEngineMode} from "@/yakitGVDefine"
import {failed, info, success, successControlled} from "@/utils/notification"
import {YakEditor} from "@/utils/editors"
import {CodeGV, LocalGV} from "@/yakitGV"
import {EngineModeVerbose, YakitLoading} from "../basics/YakitLoading"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {YakitPopover} from "../yakitUI/YakitPopover/YakitPopover"
import {YakitSwitch} from "../yakitUI/YakitSwitch/YakitSwitch"
import {getLocalValue, setLocalValue} from "@/utils/kv"
import {getRandomLocalEnginePort, outputToWelcomeConsole} from "@/components/layout/WelcomeConsoleUtil"
import {YaklangEngineWatchDog, YaklangEngineWatchDogCredential} from "@/components/layout/YaklangEngineWatchDog"
import {StringToUint8Array} from "@/utils/str"
import {EngineLog} from "./EngineLog"

import classnames from "classnames"
import styles from "./uiLayout.module.scss"

const {ipcRenderer} = window.require("electron")

export interface UILayoutProp {
    children?: React.ReactNode
    linkSuccess?: () => any
}

const UILayout: React.FC<UILayoutProp> = (props) => {
    const [system, setSystem] = useState<YakitSystem>("Darwin")
    const [__isYakInstalled, setIsYakInstalled, getIsYakInstalled] = useGetState<boolean>(false)

    /*  */
    const [localPort, setLocalPort] = useState<number>(0)
    const [adminPort, setAdminPort] = useState<number>(0)
    const [keepalive, setKeepalive] = useState<boolean>(false)

    /** 引擎未安装时的modal组件是否展示 */
    const [engineShow, setEngineShow] = useState<boolean>(false)

    /**
     * 认证信息
     */
    const [credential, setCredential, getCredential] = useGetState<YaklangEngineWatchDogCredential>({
        Host: "127.0.0.1",
        IsTLS: false,
        Password: "",
        PemBytes: undefined,
        Port: 0,
        Mode: undefined
    })

    /** 当前引擎连接状态 */
    const [engineLink, setEngineLink, getEngineLink] = useGetState<boolean>(false)

    /** 当前引擎模式 */
    const [engineMode, setEngineMode, getEngineMode] = useGetState<YaklangEngineMode>()
    const isRemoteEngine = engineMode === "remote"
    const [remoteConnectLoading, setRemoteConnectLoading] = useState(false)

    const [databaseError, setDatabaseError, getDatabaseError] = useGetState<boolean>(false)

    const getCacheEngineMode = useMemoizedFn(() => {
        getLocalValue(LocalGV.YaklangEngineMode).then((val: YaklangEngineMode) => {
            info(`加载上次引擎模式：${val}`)
            switch (val) {
                case "remote":
                    setEngineMode("remote")
                    return
                case "local":
                    setEngineMode("local")
                    return
                case "admin":
                    setEngineMode("admin")
                    return
                default:
                    setEngineMode("local")
                    return
            }
        })
    })

    const [isDev, setIsDev] = useState<boolean>(false)

    useEffect(() => {
        ipcRenderer.invoke("is-dev").then((flag: boolean) => setIsDev(!!flag))
        const id = setInterval(() => {
            if (getIsYakInstalled()) {
                return
            }

            ipcRenderer.invoke("is-yaklang-engine-installed").then((flag: boolean) => {
                setIsYakInstalled(flag)
            })
        }, 3000)
        return () => {
            clearInterval(id)
        }
    }, [])

    useEffect(() => {
        /** 连接成功，获取token进行登录 */
        if (engineLink && props.linkSuccess) {
            props.linkSuccess()
            setShowEngineLog(false)
        }
    }, [engineLink])

    /**
     * 1.获取操作系统信息
     * 2.获取yaklang引擎是否安装的状态
     *   - 判断上次使用引擎的状态，如果有使用，这判断是否可以启动引擎进入软件界面(未安装状态只限远程可以进入软件界面)
     *     1) 如果有使用，引擎未安装，则只限远程状态可以连接进入界面
     *     2) 如果有使用，引擎已安装，则正常连接上次使用状态的引擎
     */
    useLayoutEffect(() => {
        ipcRenderer.invoke("fetch-system-name").then((type: YakitSystem) => setSystem(type))
        outputToWelcomeConsole("识别引擎是否已安装...")
        ipcRenderer
            .invoke("is-yaklang-engine-installed")
            .then((flag: boolean) => {
                if (flag) {
                    outputToWelcomeConsole("引擎已安装")
                } else {
                    outputToWelcomeConsole("引擎未安装")
                }
                setIsYakInstalled(flag)
            })
            .finally(() => {
                if (!getIsYakInstalled()) {
                    /** 未安装引擎时，应该优先展示安装提示框 */
                    setEngineMode(undefined)
                    setEngineShow(true)
                    outputToWelcomeConsole("由于引擎未安装，仅开启远程模式或用户需安装核心引擎")
                    return
                } else {
                    outputToWelcomeConsole("已安装引擎，开始检查数据库权限是否正常")
                    /** 引擎已安装的情况下，优先检查数据库权限 */
                    ipcRenderer
                        .invoke("check-local-database")
                        .then((e) => {
                            if (e === "not allow to write") outputToWelcomeConsole("数据库权限错误，开始进行调整操作")
                            setDatabaseError(e === "not allow to write")
                        })
                        .finally(() => {
                            if (!getDatabaseError()) getCacheEngineMode()
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
        outputToWelcomeConsole(`当前引擎模式为 ${engineMode}`)
        switch (engineMode) {
            case "local":
                outputToWelcomeConsole(`本地普通权限引擎模式，开始启动本地引擎: ${localPort}`)
                setCredential({...getCredential(), Port: localPort, Mode: "local"})
                return
            case "remote":
                outputToWelcomeConsole("远程模式或调试模式，需要用户手动启动引擎")
                return
            case "admin":
                outputToWelcomeConsole(`管理员模式，启动本地引擎: ${adminPort}`)
                setCredential({...getCredential(), Port: adminPort, Mode: "admin"})
                return
            default:
        }
    }, [engineMode, localPort, adminPort])

    /** yaklang引擎切换启动模式 */
    const changeEngineMode = useMemoizedFn((type: YaklangEngineMode, keepalive?: boolean) => {
        info(`引擎状态切换为: ${EngineModeVerbose(type as YaklangEngineMode)}`)

        setKeepalive(!!keepalive)
        setEngineLink(false)

        /** 未安装引擎下的模式切换取消 */
        if (!getIsYakInstalled()) {
            setEngineMode(undefined)
            setEngineShow(true)
            return
        }

        // 修改状态，重连引擎
        setLocalValue(LocalGV.YaklangEngineMode, type)
        switch (type) {
            case "admin":
                setEngineMode("admin")
                return
            case "local":
                setEngineMode("local")
                return
            case "remote":
                setCredential({Host: "", IsTLS: false, Password: "", PemBytes: undefined, Port: 0, Mode: undefined})
                setEngineMode("remote")
                return
        }
    })

    /*
     * 连接远程模式引擎的内容
     * */
    const connectRemoteEngine = useMemoizedFn((info: RemoteLinkInfo) => {
        setCredential({
            Host: info.host,
            IsTLS: info.caPem !== "",
            Password: info.password,
            PemBytes: StringToUint8Array(info.caPem || ""),
            Port: parseInt(info.port),
            Mode: "remote"
        })
        setRemoteConnectLoading(true)
        setTimeout(() => {
            setRemoteConnectLoading(false)
        }, 300)
    })

    /** 是否展示引擎日志内容 */
    const [showEngineLog, setShowEngineLog] = useState<boolean>(false)

    useEffect(() => {
        ipcRenderer.on("update-yaklang-reconnect-callback", (e: any, version: string) => {
            ipcRenderer
                .invoke("install-yak-engine", version)
                .then(() => {
                    success("安装成功，如未生效，重启 Yakit 即可")
                })
                .catch((err: any) => failed(`安装失败: ${err}`))
                .finally(() => setTimeout(() => setYaklangDownload(false), 500))
        })

        return () => {
            ipcRenderer.removeAllListeners("update-yaklang-reconnect-callback")
        }
    }, [])

    const [yaklangDownload, setYaklangDownload, getYaklangDownload] = useGetState<boolean>(false)
    const [yakitDownload, setYakitDownload, getYakitDownload] = useGetState<boolean>(false)
    /**
     * 1. 监听激活 yaklang 和 yakit 更新下载
     */
    useEffect(() => {
        ipcRenderer.on("activate-download-yaklang-or-yakit", (e: any, type: "yaklang" | "yakit") => {
            if (getYaklangDownload() || getYakitDownload()) return
            if (type === "yakit") setYakitDownload(true)
            if (type === "yaklang") setYaklangDownload(true)
        })

        return () => {
            ipcRenderer.removeAllListeners("activate-download-yaklang-or-yakit")
        }
    }, [])

    const [yakitMode, setYakitMode] = useState<"soft" | "store">("soft")
    const changeYakitMode = useMemoizedFn((type: "soft" | "store") => {
        setYakitMode(type)
    })

    /** MACOS 上双击放大窗口(不是最大化) */
    const maxScreen = () => {
        ipcRenderer.invoke("UIOperate", "max").then(() => {})
    }

    const onReady = useMemoizedFn(() => {
        if (!getEngineLink()) setEngineLink(true)

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
        if (isDev) {
            if (count > 1) {
                setEngineLink(false)
            }
        } else {
            setEngineLink(false)
        }
    })

    // outputToWelcomeConsole("UILayout 刷新")
    return (
        <div className={styles["ui-layout-wrapper"]}>
            <div className={styles["ui-layout-container"]}>
                <div className={styles["container-wrapper"]}>
                    <YaklangEngineWatchDog
                        credential={credential}
                        /* keepalive 开启智慧才会触发 Ready 和 Failed */
                        keepalive={keepalive}
                        engineLink={engineLink}
                        onKeepaliveShouldChange={setKeepalive}
                        onReady={onReady}
                        onFailed={onFailed}
                    />
                    <div id='yakit-header' className={styles["ui-layout-header"]}>
                        {system === "Darwin" ? (
                            <div className={classnames(styles["header-body"], styles["mac-header-body"])}>
                                {/* <div
                            style={{left: yakitMode === "soft" ? 76 : 120}}
                            className={styles["header-border-yakit-mask"]}
                        ></div> */}

                                <div className={styles["yakit-header-title"]} onDoubleClick={maxScreen}>
                                    Yakit-{`${EngineModeVerbose(engineMode || "local")}`}
                                </div>

                                <div className={styles["header-left"]}>
                                    <div>
                                        <MacUIOp />
                                    </div>

                                    {engineLink && (
                                        <>
                                            <div
                                                className={classnames(styles["yakit-mode-icon"], {
                                                    [styles["yakit-mode-selected"]]: false && yakitMode === "soft"
                                                })}
                                                onClick={() => changeYakitMode("soft")}
                                            >
                                                {yakitMode === "soft" ? (
                                                    <YakitThemeSvgIcon style={{fontSize: 20}} />
                                                ) : (
                                                    <YakitGraySvgIcon style={{fontSize: 20}} />
                                                )}
                                            </div>

                                            {/* <div
                                        className={classnames(styles["yakit-mode-icon"], {
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
                                        <PerformanceDisplay engineMode={engineMode} />
                                    </div>
                                </div>
                                <div className={styles["header-title"]} onDoubleClick={maxScreen} />
                                {engineLink ? (
                                    <div className={styles["header-right"]}>
                                        <FuncDomain
                                            isEngineLink={engineLink}
                                            engineMode={engineMode || "remote"}
                                            isRemoteMode={engineMode === "remote"}
                                            onEngineModeChange={changeEngineMode}
                                        />
                                        <div className={styles["divider-wrapper"]}></div>
                                        <GlobalReverseState isEngineLink={engineLink} />
                                    </div>
                                ) : (
                                    <div></div>
                                )}
                            </div>
                        ) : (
                            <div className={classnames(styles["header-body"], styles["win-header-body"])}>
                                {/* <div
                            style={{left: yakitMode === "soft" ? 44 : 88}}
                            className={styles["header-border-yakit-mask"]}
                        ></div> */}

                                <div className={styles["yakit-header-title"]} onDoubleClick={maxScreen}>
                                    Yakit-{`${EngineModeVerbose(engineMode || "local")}`}
                                </div>

                                {engineLink ? (
                                    <div className={styles["header-left"]}>
                                        <GlobalReverseState isEngineLink={engineLink} />

                                        <div
                                            className={classnames(styles["yakit-mode-icon"], {
                                                [styles["yakit-mode-selected"]]: false && yakitMode === "soft"
                                            })}
                                            onClick={() => changeYakitMode("soft")}
                                        >
                                            {yakitMode === "soft" ? (
                                                <YakitThemeSvgIcon style={{fontSize: 20}} />
                                            ) : (
                                                <YakitGraySvgIcon style={{fontSize: 20}} />
                                            )}
                                        </div>

                                        {/* <div
                                    className={classnames(styles["yakit-mode-icon"], {
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
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div></div>
                                )}

                                <div className={styles["header-title"]} onDoubleClick={maxScreen}></div>

                                <div className={styles["header-right"]}>
                                    <div className={styles["left-cpu"]}>
                                        <PerformanceDisplay engineMode={engineMode} />
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
                    {engineLink || getIsYakInstalled() ? (
                        <div className={styles["ui-layout-body"]}>
                            {engineLink ? (
                                // 如果已经已经连接，那么应该直接渲染整个组件
                                props.children
                            ) : (
                                <>
                                    {isRemoteEngine && (
                                        <RemoteYaklangEngine
                                            loading={remoteConnectLoading}
                                            onSubmit={connectRemoteEngine}
                                            onEngineModeChange={changeEngineMode}
                                        />
                                    )}
                                </>
                            )}
                            {(!engineLink || !isRemoteEngine) && (
                                <YakitLoading
                                    engineMode={engineMode || "local"}
                                    onEngineModeChange={changeEngineMode}
                                    loading={engineLink}
                                    adminPort={adminPort}
                                    localPort={localPort}
                                    showEngineLog={showEngineLog}
                                    setShowEngineLog={setShowEngineLog}
                                />
                            )}

                            {/* 升级步骤是独立的操作，和连接不连接没有太大关系 */}
                            {(yaklangDownload || yakitDownload) && (
                                <div className={styles["ui-layout-body-mask"]}>
                                    <KillAllEngineHint visible={yaklangDownload} setVisible={setYaklangDownload} />

                                    <DownloadYakit
                                        system={system}
                                        visible={yakitDownload}
                                        setVisible={setYakitDownload}
                                    />
                                </div>
                            )}

                            {!engineLink && databaseError && system !== "Windows_NT" && (
                                <DatabaseErrorHint
                                    visible={databaseError}
                                    setVisible={setDatabaseError}
                                    startEngine={() => getCacheEngineMode()}
                                />
                            )}
                        </div>
                    ) : (
                        <div className={styles["ui-layout-mask"]}>
                            {isRemoteEngine ? (
                                <RemoteYaklangEngine
                                    loading={remoteConnectLoading}
                                    onSubmit={connectRemoteEngine}
                                    onEngineModeChange={changeEngineMode}
                                    engineNotInstalled={!getIsYakInstalled()}
                                    oncancel={() => {
                                        setEngineMode(undefined)
                                        setEngineShow(true)
                                    }}
                                />
                            ) : (
                                <YaklangEngineHint
                                    system={system}
                                    visible={engineShow}
                                    setIsRemoteEngine={() => {
                                        setEngineMode("remote")
                                        setEngineShow(false)
                                    }}
                                    startEngine={() => {
                                        setIsYakInstalled(true)
                                        setEngineMode("local")
                                        setEngineShow(false)
                                    }}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div
                className={classnames({
                    [styles["uilayout-log"]]: showEngineLog,
                    [styles["uilayout-hidden-log"]]: !showEngineLog,
                    [styles["uilayout-noshow-log"]]: engineLink
                })}
            >
                <EngineLog visible={engineLink} setVisible={setShowEngineLog} />
            </div>
        </div>
    )
}

export default UILayout

interface YaklangEngineHintProps {
    system: YakitSystem
    visible: boolean
    setIsRemoteEngine: (flag: boolean) => any
    startEngine: () => any
}

const YaklangEngineHint: React.FC<YaklangEngineHintProps> = React.memo((props) => {
    const {system, visible, setIsRemoteEngine, startEngine} = props

    const [platformArch, setPlatformArch] = useState<string>("")
    const [install, setInstall, getInstall] = useGetState<boolean>(false)
    /** 用户协议勾选状态 */
    const [agrCheck, setAgrCheck] = useState<boolean>(false)
    /** 执行一键安装功能时判断用户协议状态 */
    const [checkStatus, setCheckStatus] = useState<boolean>(false)
    /** 展示抖动动画 */
    const [isShake, setIsShake] = useState<boolean>(false)

    /** 用户协议弹窗是否展示 */
    const [agrShow, setAgrShow] = useState<boolean>(false)
    /** 常见文件弹窗是否展示 */
    const [qsShow, setQSShow] = useState<boolean>(false)

    /** 是否置顶 */
    const [isTop, setIsTop] = useState<0 | 1 | 2>(0)

    const [disabled, setDisabled] = useState(true)
    const [bounds, setBounds] = useState({left: 0, top: 0, bottom: 0, right: 0})
    const draggleRef = useRef<HTMLDivElement>(null)

    /** 远端最新yaklang引擎版本 */
    const [latestVersion, setLatestVersion] = useState("")
    /** 下载进度条数据 */
    const [downloadProgress, setDownloadProgress, getDownloadProgress] = useGetState<DownloadingState>()

    /**
     * 1. 获取最新引擎版本号(不带版本号前面的'v'字符)
     * 2. 获取系统-CPU架构信息
     * 3. 监听本地下载引擎进度数据
     * @returns 删除监听事件3
     */
    useEffect(() => {
        ipcRenderer
            .invoke("fetch-latest-yaklang-version")
            .then((data: string) => setLatestVersion(data.startsWith("v") ? data.slice(1) : data))
            .catch((e: any) => failed(`${e}`))

        ipcRenderer.invoke("fetch-system-and-arch").then((e: string) => setPlatformArch(e))

        ipcRenderer.on("download-yak-engine-progress", (e: any, state: DownloadingState) => {
            setDownloadProgress(state)
        })

        return () => {
            ipcRenderer.removeAllListeners("download-yak-engine-progress")
        }
    }, [])

    /** 复制功能 */
    const copyCommand = useMemoizedFn(() => {
        ipcRenderer.invoke("set-copy-clipboard", "softwareupdate --install-rosetta")
        success("复制成功")
    })

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

    /** 一键安装事件 */
    const installEngine = useMemoizedFn(() => {
        setCheckStatus(true)
        if (!agrCheck) {
            setIsShake(true)
            setTimeout(() => setIsShake(false), 1000)
            return
        }

        setInstall(true)
        ipcRenderer
            .invoke("download-latest-yak", `v${latestVersion}`)
            .then(() => {
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
                if (!getInstall()) return
                /** 安装yaklang引擎 */
                ipcRenderer
                    .invoke("install-yak-engine", `v${latestVersion}`)
                    .then(() => {
                        success("安装成功，如未生效，重启 Yakit 即可")
                        startEngine()
                    })
                    .catch((err: any) => {
                        failed(`安装失败: ${err}`)
                        onInstallClose()
                    })
            })
            .catch((e: any) => {
                failed(`下载失败: ${e}`)
                onInstallClose()
            })
    })

    /** 取消事件 */
    const onClose = useMemoizedFn(() => {
        ipcRenderer.invoke("UIOperate", "close")
    })
    /** 取消下载事件 */
    const onInstallClose = useMemoizedFn(() => {
        setDownloadProgress(undefined)
        setInstall(false)
    })

    return (
        <>
            <Draggable
                defaultClassName={classnames(
                    styles["yaklang-update-modal"],
                    visible ? styles["engine-hint-modal-wrapper"] : styles["engine-hint-modal-hidden-wrapper"],
                    {[styles["modal-top-wrapper"]]: isTop === 0}
                )}
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
                                    <HelpSvgIcon style={{fontSize: 20}} />
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
                                        <div style={{marginTop: 24}}>
                                            <YakitButton size='max' type='outline2' onClick={onClose}>
                                                取消
                                            </YakitButton>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className={styles["hint-right-title"]}>未安装引擎</div>
                                        <div className={styles["hint-right-content"]}>
                                            你可选择安装 Yak 引擎启动软件，或远程连接启动
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
                                                        <div className={styles["copy-icon"]} onClick={copyCommand}>
                                                            <YakitCopySvgIcon />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div
                                            className={classnames(styles["hint-right-agreement"], {
                                                [styles["agr-shake-animation"]]: !agrCheck && isShake
                                            })}
                                        >
                                            <Checkbox
                                                className={classnames(
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
                                            </span>
                                        </div>

                                        <div className={styles["hint-right-btn"]}>
                                            <div>
                                                <YakitButton size='max' type='outline2' onClick={onClose}>
                                                    取消
                                                </YakitButton>
                                            </div>
                                            <div className={styles["btn-group-wrapper"]}>
                                                <YakitButton
                                                    size='max'
                                                    type='outline2'
                                                    onClick={() => {
                                                        setCheckStatus(true)
                                                        if (!agrCheck) {
                                                            setIsShake(true)
                                                            setTimeout(() => setIsShake(false), 1000)
                                                            return
                                                        }
                                                        setIsRemoteEngine(true)
                                                    }}
                                                >
                                                    远程连接
                                                </YakitButton>
                                                <YakitButton size='max' onClick={installEngine}>
                                                    一键安装
                                                </YakitButton>
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
            defaultClassName={classnames(
                styles["yakit-agr-modal"],
                {[styles["modal-top-wrapper"]]: isTop === 1},
                visible ? styles["agr-and-qs-modal-wrapper"] : styles["agr-and-qs-modal-hidden-wrapper"]
            )}
            disabled={disabled}
            bounds={bounds}
            onStart={(event, uiData) => onStart(event, uiData)}
        >
            <div ref={draggleRef}>
                <div className={styles["yakit-agr-and-qs-modal"]} onClick={() => setIsTop(1)}>
                    <div className={styles["agreement-content-modal-wrapper"]}>
                        {system === "Darwin" ? (
                            <div
                                className={classnames(styles["modal-header"], styles["mac-header"])}
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
                                className={classnames(styles["modal-header"], styles["win-header"])}
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
const QuestionModal: React.FC<AgrAndQSModalProps> = React.memo((props) => {
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
            defaultClassName={classnames(
                styles["yaklang-qs-modal"],
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
                                className={classnames(styles["modal-header"], styles["mac-header"])}
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
                                className={classnames(styles["modal-header"], styles["win-header"])}
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
                                Windows 用户可以把引擎放在 %HOME%/yakit-projects/yak-engine/yak.exe 即可识别 MacOS /
                                Linux 用户可以把引擎放在 ~/yakit-projects/yak-engine/yak 即可识别
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
                        <div className={styles["title-style"]}>Yakit 远程连接模式</div>
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
                                    className={classnames(styles["input-style"], {
                                        [styles["error-border"]]: isCheck && !remote.host
                                    })}
                                    value={remote.host}
                                    onChange={(e) => setRemote({...remote, host: e.target.value})}
                                />
                            </Form.Item>
                            <Form.Item label='Yak gRPC 端口:' required={true}>
                                <Input
                                    className={classnames(styles["input-style"], {
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
                                            className={classnames(styles["pem-content"], {
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
                                        className={classnames(styles["input-style"], {
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
                                        <Popconfirm
                                            title={"启动管理员模式将需要用户额外认证"}
                                            onConfirm={() => {
                                                changeEngineMode("admin")
                                            }}
                                        >
                                            <YakitButton style={{marginLeft: 8}} size='max' type='outline2'>
                                                {EngineModeVerbose("admin")}
                                            </YakitButton>
                                        </Popconfirm>
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

interface KillAllEngineHintProps {
    visible: boolean
    setVisible: (flag: boolean) => any
}

/** @name 关闭全部引擎并更新的确认弹窗 */
const KillAllEngineHint: React.FC<KillAllEngineHintProps> = React.memo((props) => {
    const {visible, setVisible} = props

    const [disabled, setDisabled] = useState(true)
    const [bounds, setBounds] = useState({left: 0, top: 0, bottom: 0, right: 0})
    const draggleRef = useRef<HTMLDivElement>(null)

    const [loading, setLoading] = useState<boolean>(false)

    const onKill = useMemoizedFn(() => {
        setLoading(true)
        ipcRenderer
            .invoke("ps-yak-grpc")
            .then((i: yakProcess[]) => {
                ;(i || []).forEach((i) => {
                    ipcRenderer.invoke("kill-yak-grpc", i.pid).then(() => {
                        info(`KILL yak PROCESS: ${i.pid}`)
                    })
                })
                setTimeout(() => {
                    successControlled("引擎进程关闭中...", 5)
                    setVisible(false)
                }, 1000)
            })
            .catch((e) => {
                failed(`关闭引擎失败，请再次尝试关闭`)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 300)
            })
    })
    const onCancel = useMemoizedFn(() => setVisible(false))

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

    return (
        <>
            <Draggable
                defaultClassName={classnames(
                    styles["yaklang-update-modal"],
                    visible ? styles["engine-hint-modal-wrapper"] : styles["engine-hint-modal-hidden-wrapper"],
                    [styles["modal-top-wrapper"]]
                )}
                disabled={disabled}
                bounds={bounds}
                onStart={(event, uiData) => onStart(event, uiData)}
            >
                <div ref={draggleRef}>
                    <div className={styles["modal-yaklang-engine-hint"]}>
                        <div className={styles["yaklang-engine-hint-wrapper"]}>
                            <div
                                className={styles["hint-draggle-body"]}
                                onMouseEnter={() => {
                                    if (disabled) setDisabled(false)
                                }}
                                onMouseLeave={() => setDisabled(true)}
                            ></div>

                            <div className={styles["hint-left-wrapper"]}>
                                <div className={styles["hint-icon"]}>
                                    <YaklangInstallHintSvgIcon />
                                </div>
                            </div>

                            <div className={styles["hint-right-wrapper"]}>
                                <div className={styles["hint-right-title"]}>关闭所有引擎进程</div>
                                <div className={styles["hint-right-content"]}>
                                    更新引擎需关闭所有引擎进程，包括正在连接的本地引擎进程，同时页面将进入加载页，并需要在加载页点击”更新引擎“
                                </div>

                                <div className={styles["hint-right-btn"]}>
                                    <div></div>
                                    <div className={styles["btn-group-wrapper"]}>
                                        <YakitButton loading={loading} type='outline2' size='max' onClick={onCancel}>
                                            取消
                                        </YakitButton>
                                        <YakitButton loading={loading} size='max' onClick={onKill}>
                                            确认关闭
                                        </YakitButton>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Draggable>
        </>
    )
})

interface DownloadYaklangProps {
    system: YakitSystem
    visible: boolean
    setVisible: (flag: boolean) => any
    updateReconnect: () => any
    killEnginePid: () => any
}

/** @name Yaklang引擎更新下载弹窗 */
const DownloadYaklang: React.FC<DownloadYaklangProps> = React.memo((props) => {
    const {system, visible, setVisible, updateReconnect, killEnginePid} = props

    const [install, setInstall] = useState<boolean>(true)
    const [loading, setLoading] = useState<boolean>(false)

    /** 常见文件弹窗是否展示 */
    const [qsShow, setQSShow] = useState<boolean>(false)

    /** 是否置顶 */
    const [isTop, setIsTop] = useState<0 | 1 | 2>(0)

    const [disabled, setDisabled] = useState(true)
    const [bounds, setBounds] = useState({left: 0, top: 0, bottom: 0, right: 0})
    const draggleRef = useRef<HTMLDivElement>(null)

    /** 远端最新yaklang引擎版本 */
    const [latestVersion, setLatestVersion] = useState("")
    /** 下载进度条数据 */
    const [downloadProgress, setDownloadProgress, getDownloadProgress] = useGetState<DownloadingState>()

    // 是否中断下载进程
    const isBreakRef = useRef<boolean>(false)

    /**
     * 1. 获取最新引擎版本号(版本号内带有'v'字符)，并下载
     * 2. 监听本地下载引擎进度数据
     * @returns 删除监听事件2
     */
    useEffect(() => {
        if (visible) {
            isBreakRef.current = true
            ipcRenderer
                .invoke("fetch-latest-yaklang-version")
                .then((data: string) => {
                    setLatestVersion(data)

                    ipcRenderer
                        .invoke("download-latest-yak", data)
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
                            setInstall(false)
                        })
                        .catch((e: any) => {
                            if (!isBreakRef.current) return
                            failed(`下载失败: ${e}`)
                            setVisible(false)
                        })
                })
                .catch((e: any) => {
                    if (!isBreakRef.current) return
                    failed(`${e}`)
                    setVisible(false)
                })

            ipcRenderer.on("download-yak-engine-progress", (e: any, state: DownloadingState) => {
                if (!isBreakRef.current) return
                setDownloadProgress(state)
            })

            return () => {
                ipcRenderer.removeAllListeners("download-yak-engine-progress")
            }
        } else {
            isBreakRef.current = false
            setLoading(false)
        }
    }, [visible])

    /** 立即更新 */
    const onUpdate = useMemoizedFn(() => {
        setLoading(true)
        killEnginePid()

        setTimeout(() => setVisible(false), 500)
        setTimeout(() => {
            ipcRenderer
                .invoke("install-yak-engine", latestVersion)
                .then(() => {
                    success("安装成功，如未生效，重启 Yakit 即可")
                    updateReconnect()
                })
                .catch((err: any) => {
                    failed(
                        `安装失败: ${err.message.indexOf("operation not permitted") > -1 ? "请关闭引擎后重试" : err}`
                    )
                    onInstallClose()
                })
        }, 2000)
    })
    /** 稍后再说 */
    const onWait = useMemoizedFn(() => {
        ipcRenderer.invoke("download-update-wait", "yaklang")
        onInstallClose()
    })

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
    const onInstallClose = useMemoizedFn(() => {
        isBreakRef.current = false
        setVisible(false)
        setDownloadProgress(undefined)
        setInstall(true)
    })

    return (
        <>
            <Draggable
                defaultClassName={classnames(
                    styles["yaklang-update-modal"],
                    visible ? styles["engine-hint-modal-wrapper"] : styles["engine-hint-modal-hidden-wrapper"],
                    {[styles["modal-top-wrapper"]]: isTop === 0}
                )}
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
                                {install && (
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
                                )}
                            </div>

                            <div className={styles["hint-right-wrapper"]}>
                                {install ? (
                                    <div className={styles["hint-right-download"]}>
                                        <div className={styles["hint-right-title"]}>Yaklang 引擎下载中...</div>
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
                                        <div style={{marginTop: 24}}>
                                            <YakitButton size='max' type='outline2' onClick={onInstallClose}>
                                                取消
                                            </YakitButton>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className={styles["hint-right-title"]}>现在更新 Yaklang 引擎？</div>
                                        <div className={styles["hint-right-content"]}>
                                            更新 Yaklang 引擎，需要先断开当前连接，确定要现在更新吗？
                                        </div>

                                        <div className={styles["hint-right-btn"]}>
                                            <div></div>
                                            <div className={styles["btn-group-wrapper"]}>
                                                <YakitButton
                                                    loading={loading}
                                                    size='max'
                                                    type='outline2'
                                                    onClick={onWait}
                                                >
                                                    稍后再说
                                                </YakitButton>
                                                <YakitButton loading={loading} size='max' onClick={onUpdate}>
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
            </Draggable>
            <QuestionModal isTop={isTop} setIsTop={setIsTop} system={system} visible={qsShow} setVisible={setQSShow} />
        </>
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
                        .invoke("download-latest-yakit", version)
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
                defaultClassName={classnames(
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
            defaultClassName={classnames(
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
                                className={classnames(styles["modal-header"], styles["mac-header"])}
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
                                className={classnames(styles["modal-header"], styles["win-header"])}
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

interface DatabaseErrorHintProps {
    visible: boolean
    setVisible: (flag: boolean) => any
    startEngine: () => any
}

/** @name 数据库权限不足提示弹窗 */
const DatabaseErrorHint: React.FC<DatabaseErrorHintProps> = React.memo((props) => {
    const {visible, setVisible, startEngine} = props

    const [disabled, setDisabled] = useState(true)
    const [bounds, setBounds] = useState({left: 0, top: 0, bottom: 0, right: 0})
    const draggleRef = useRef<HTMLDivElement>(null)

    /** 立即修复 */
    const onRestart = useMemoizedFn(() => {
        ipcRenderer
            .invoke("fix-local-database")
            .then((e) => {
                info("修复成功")
                startEngine()
                setVisible(false)
            })
            .catch((e) => {
                failed(`修复数据库权限错误：${e}`)
            })
    })

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

    return (
        <>
            <Draggable
                defaultClassName={classnames(
                    styles["yaklang-update-modal"],
                    visible ? styles["engine-hint-modal-wrapper"] : styles["engine-hint-modal-hidden-wrapper"],
                    [styles["modal-top-wrapper"]]
                )}
                disabled={disabled}
                bounds={bounds}
                onStart={(event, uiData) => onStart(event, uiData)}
            >
                <div ref={draggleRef}>
                    <div className={styles["modal-yaklang-engine-hint"]}>
                        <div className={styles["yaklang-engine-hint-wrapper"]}>
                            <div
                                className={styles["hint-draggle-body"]}
                                onMouseEnter={() => {
                                    if (disabled) setDisabled(false)
                                }}
                                onMouseLeave={() => setDisabled(true)}
                            ></div>

                            <div className={styles["hint-left-wrapper"]}>
                                <div className={styles["hint-icon"]}>
                                    <YaklangInstallHintSvgIcon />
                                </div>
                            </div>

                            <div className={styles["hint-right-wrapper"]}>
                                <div className={styles["hint-right-title"]}>yaklang 数据库错误</div>
                                <div className={styles["hint-right-content"]}>
                                    尝试修复数据库写权限（可能要求 ROOT 权限）
                                </div>

                                <div className={styles["hint-right-btn"]}>
                                    <div></div>
                                    <div className={styles["btn-group-wrapper"]}>
                                        <YakitButton size='max' onClick={onRestart}>
                                            立即修复
                                        </YakitButton>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Draggable>
        </>
    )
})
