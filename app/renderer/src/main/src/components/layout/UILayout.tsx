import React, {useEffect, useLayoutEffect, useRef, useState} from "react"
import {useGetState, useMemoizedFn} from "ahooks"
import {Button, Checkbox, Form, Input, Progress, Select, Switch} from "antd"
import Draggable from "react-draggable"
import type {DraggableEvent, DraggableData} from "react-draggable"
import {MacUIOp} from "./MacUIOp"
import {
    HelpSvgIcon,
    MacUIOpCloseSvgIcon,
    WinUIOpCloseSvgIcon,
    YakitCopySvgIcon,
    YakitStoreSvgIcon,
    YakitThemeSvgIcon,
    YaklangInstallHintSvgIcon
} from "./icons"
import {PerformanceDisplay} from "./PerformanceDisplay"
import {FuncDomain} from "./FuncDomain"
import {WinUIOp} from "./WinUIOp"
import {GlobalReverseState} from "./GlobalReverseState"
import {YakitGlobalHost} from "./YakitGlobalHost"
import {YakitSystem} from "@/yakitGVDefine"
import {failed, info, success} from "@/utils/notification"
import {YakEditor} from "@/utils/editors"
import {YakitPopover} from "../basics/YakitPopover"

import classnames from "classnames"
import styles from "./uiLayout.module.scss"

const {ipcRenderer} = window.require("electron")

export interface UILayoutProp {
    children?: React.ReactNode
}

const UILayout: React.FC<UILayoutProp> = (props) => {
    const [system, setSystem] = useState<YakitSystem>("Darwin")
    const [isYakInstalled, setIsYakInstalled] = useState<boolean>(false)

    /** 引擎未安装时的modal组件是否展示 */
    const [engineShow, setEngineShow] = useState<boolean>(true)
    /** 是否启动远程连接引擎 */
    const [isRemoteEngine, setIsRemoteEngine] = useState<boolean>(false)

    const [loading, setLoading] = useState<boolean>(true)

    /**
     * 1.获取操作系统信息
     * 2.获取yaklang引擎是否安装的状态
     */
    useLayoutEffect(() => {
        ipcRenderer.invoke("fetch-system-name").then((type: YakitSystem) => setSystem(type))
        ipcRenderer.invoke("is-yaklang-engine-installed").then((flag: boolean) => {
            setIsYakInstalled(flag)
            setEngineShow(!flag)
            if (flag) startEngine()
        })
    }, [])

    /** 启动本地引擎 */
    const startEngine = useMemoizedFn(() => {
        setEngineShow(false)
        ipcRenderer
            .invoke("start-local-yaklang-engine", {
                sudo: false
            })
            .then(() => {
                info("启动 yak grpc 进程成功")
            })
            .catch((e: Error) => failed(`${e.message}`))
    })
    /** 监听本地引擎是否启动成功 */
    useEffect(() => {
        ipcRenderer.on("create-yaklang-engine-success", async (e: any, isLocal: boolean) => {
            ipcRenderer.invoke("connect-yaklang-engine", {isLocal})
        })
        return () => {
            ipcRenderer.removeAllListeners("create-yaklang-engine-success")
        }
    }, [])

    useLayoutEffect(() => {
        ipcRenderer.on("client-yak-local-grpc-error", async (e: any, data: any) => {})

        return () => {
            ipcRenderer.removeAllListeners("client-yak-local-grpc-error")
        }
    }, [])

    // 启动本地引擎(包含启动本地缓存端口的引擎过程)
    // useEffect(() => {
    //     ipcRenderer.invoke("is-yaklang-engine-installed").then(async (flag: boolean) => {
    //         console.log("uilayout-是否安装引擎", flag)

    //         if (flag) {
    //             const value: any = await ipcRenderer.invoke("get-value", LocalGV.GlobalPort)
    //             console.log("uilayout-获取缓存引擎端口号", value)
    //             if (value) ipcRenderer.invoke("test-engine-started", value)
    //             else ipcRenderer.invoke("")
    //         }
    //     })

    //     ipcRenderer.on("callback-test-engine-started", async (e: any, flag: boolean) => {})

    //     return () => {
    //         ipcRenderer.removeAllListeners("callback-test-engine-started")
    //     }
    // }, [])

    const maxScreen = () => {
        ipcRenderer.invoke("UIOperate", "max")
    }

    const stopBubbling = (e: any) => {
        e.stopPropagation()
    }

    return (
        <div className={styles["ui-layout-wrapper"]}>
            <div className={styles["ui-layout-header"]}>
                {system === "Darwin" ? (
                    <div
                        className={classnames(styles["header-body"], styles["mac-header-body"])}
                        onDoubleClick={maxScreen}
                    >
                        <div className={styles["header-left"]}>
                            <div className={styles["left-operate"]} onClick={stopBubbling}>
                                <MacUIOp />
                            </div>

                            <div className={styles["divider-wrapper"]}></div>
                            <div className={styles["yakit-icon"]} onClick={stopBubbling}>
                                <YakitThemeSvgIcon style={{fontSize: 20}} />
                            </div>

                            <div className={styles["divider-wrapper"]}></div>
                            <div className={styles["yakit-store-icon"]} onClick={stopBubbling}>
                                <YakitStoreSvgIcon />
                            </div>

                            <div className={styles["divider-wrapper"]}></div>
                            <YakitGlobalHost />

                            <div className={styles["short-divider-wrapper"]}>
                                <div className={styles["divider-style"]}></div>
                            </div>
                            <div className={styles["left-cpu"]}>
                                <PerformanceDisplay />
                            </div>
                        </div>
                        <div className={styles["header-title"]}>Yakit</div>
                        <div className={styles["header-right"]}>
                            <FuncDomain />
                            <GlobalReverseState />
                        </div>
                    </div>
                ) : (
                    <div
                        className={classnames(styles["header-body"], styles["win-header-body"])}
                        onDoubleClick={maxScreen}
                    >
                        <div className={styles["header-left"]}>
                            <GlobalReverseState />

                            <div className={styles["divider-wrapper"]}></div>
                            <div className={styles["yakit-icon"]} onClick={stopBubbling}>
                                <YakitThemeSvgIcon style={{fontSize: 20}} />
                            </div>

                            <div className={styles["divider-wrapper"]}></div>
                            <div className={styles["yakit-store-icon"]} onClick={stopBubbling}>
                                <YakitStoreSvgIcon />
                            </div>

                            <div className={styles["divider-wrapper"]}></div>
                            <div>
                                <FuncDomain isReverse={true} />
                            </div>
                        </div>

                        <div className={styles["header-title"]}>Yakit</div>

                        <div className={styles["header-right"]}>
                            <div className={styles["left-cpu"]}>
                                <PerformanceDisplay />
                            </div>
                            <div className={styles["short-divider-wrapper"]}>
                                <div className={styles["divider-style"]}></div>
                            </div>
                            <YakitGlobalHost />
                            <div className={styles["divider-wrapper"]}></div>
                            <WinUIOp />
                        </div>
                    </div>
                )}
            </div>
            {isYakInstalled ? (
                <div className={styles["ui-layout-body"]}>{props.children}</div>
            ) : (
                <div className={styles["ui-layout-mask"]}>
                    {isRemoteEngine ? (
                        <RemoteYaklangEngine setIsRemoteEngine={setIsRemoteEngine} />
                    ) : (
                        <YaklangEngineHint
                            system={system}
                            visible={engineShow}
                            setIsRemoteEngine={setIsRemoteEngine}
                            startEngine={startEngine}
                        />
                    )}
                </div>
            )}
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
/** 下载引擎进度条-时间 */
interface DownloadingTime {
    /** elapsed 耗时 */
    elapsed: number
    /** remaining 剩余时间 */
    remaining: number
}
interface DownloadingSize {
    total: number
    transferred: number
}
/** 下载引擎进度条数据流 */
interface DownloadingState {
    time: DownloadingTime
    /** 下载速度 */
    speed: number
    /** 进度条百分比 */
    percent: number
    size: DownloadingSize
}
const YaklangEngineHint: React.FC<YaklangEngineHintProps> = React.memo((props) => {
    const {system, visible, setIsRemoteEngine, startEngine} = props

    const [platformArch, setPlatformArch] = useState<string>("")
    const [install, setInstall, getInstall] = useGetState<boolean>(false)
    /** 用户协议勾选状态 */
    const [agrCheck, setAgrCheck] = useState<boolean>(false)
    /** 执行一键安装功能时判断用户协议状态 */
    const [checkStatus, setCheckStatus] = useState<boolean>(false)

    /** 用户协议弹窗是否展示 */
    const [agrShow, setAgrShow] = useState<boolean>(false)
    /** 常见文件弹窗是否展示 */
    const [qsShow, setQSShow] = useState<boolean>(false)

    /** 是否置顶 */
    const [isTop, setIsTop] = useState<0 | 1 | 2>(0)

    const [disabled, setDisabled] = useState(false)
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

        ipcRenderer.on("download-yak-engine-progress", async (e: any, state: DownloadingState) => {
            console.log("state", state)
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
        if (!agrCheck) return

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
                                onMouseOver={() => {
                                    if (disabled) setDisabled(false)
                                }}
                                onMouseOut={() => setDisabled(true)}
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
                                            <Button
                                                className={classnames(
                                                    styles["btn-wrapper"],
                                                    styles["btn-default-wrapper"]
                                                )}
                                                onClick={onClose}
                                            >
                                                取消
                                            </Button>
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

                                        <div className={styles["hint-right-agreement"]}>
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
                                                <Button
                                                    className={classnames(
                                                        styles["btn-wrapper"],
                                                        styles["btn-default-wrapper"]
                                                    )}
                                                    onClick={onClose}
                                                >
                                                    取消
                                                </Button>
                                            </div>
                                            <div className={styles["btn-group-wrapper"]}>
                                                <Button
                                                    className={classnames(
                                                        styles["btn-wrapper"],
                                                        styles["btn-default-wrapper"]
                                                    )}
                                                    onClick={() => setIsRemoteEngine(true)}
                                                >
                                                    远程连接
                                                </Button>
                                                <Button
                                                    className={classnames(
                                                        styles["btn-wrapper"],
                                                        styles["btn-theme-wrapper"]
                                                    )}
                                                    onClick={installEngine}
                                                >
                                                    一键安装
                                                </Button>
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

    const [disabled, setDisabled] = useState(false)
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
                visible ? styles["agr-and-qs-modal-wrapper"] : styles["agr-and-qs-modal-hidden-wrapper"],
                {[styles["modal-top-wrapper"]]: isTop === 1}
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
                                onMouseOver={() => {
                                    if (disabled) setDisabled(false)
                                }}
                                onMouseOut={() => setDisabled(true)}
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
/** @name 常见问题弹窗 */
const QuestionModal: React.FC<AgrAndQSModalProps> = React.memo((props) => {
    const {isTop, setIsTop, system, visible, setVisible} = props

    const [show, setShow] = useState<boolean>(false)
    const [latestVersion, setLatestVersion] = useState("")

    const [disabled, setDisabled] = useState(false)
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
                visible ? styles["agr-and-qs-modal-wrapper"] : styles["agr-and-qs-modal-hidden-wrapper"],
                {[styles["modal-top-wrapper"]]: isTop === 2}
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
                                onMouseOver={() => {
                                    if (disabled) setDisabled(false)
                                }}
                                onMouseOut={() => setDisabled(true)}
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
    setIsRemoteEngine: (flag: boolean) => any
}
/** @name 远程连接配置参数 */
interface RemoteLinkInfo {
    /** 远程主机地址 */
    host: string
    /** 远程端口 */
    port: string
    /** 是否开启TLS */
    isTls: boolean
    /** 证书 */
    pem?: string
    password?: string
}
/** @name 远程连接UI UI写好，逻辑没有写 */
const RemoteYaklangEngine: React.FC<RemoteYaklangEngineProps> = React.memo((props) => {
    const {setIsRemoteEngine} = props
    /** 是否保存历史连接 */
    const [allowSave, setAllowSave] = useState<boolean>(true)
    /** 远程主机参数 */
    const [remote, setRemote] = useState<RemoteLinkInfo>({
        host: "127.0.0.1",
        port: "8087",
        isTls: false
    })
    /** 是否进入检查状态 */
    const [isCheck, setIsCheck] = useState<boolean>(false)

    const submit = useMemoizedFn(() => {
        setIsCheck(true)
        if (!remote.host) return
        if (!remote.port) return
        if (remote.isTls && !remote.pem) return
    })
    const cancel = useMemoizedFn(() => {
        setAllowSave(true)
        setRemote({
            host: "127.0.0.1",
            port: "8087",
            isTls: false
        })
        setIsCheck(false)
        setIsRemoteEngine(false)
    })

    return (
        <div className={styles["remote-yaklang-engine-wrapper"]}>
            <div className={styles["remote-yaklang-engine-body"]}>
                <div className={styles["remote-title"]}>
                    <YakitThemeSvgIcon style={{fontSize: 64}} />
                    <div className={styles["title-style"]}>Yakit 远程连接模式</div>
                    <div className={styles["remote-history"]}>
                        <div className={styles["select-title"]}>连接历史</div>
                        <Select className={styles["select-style"]} placeholder='请选择...'></Select>
                    </div>
                </div>

                <div className={styles["rmeote-divider"]}></div>
                <div className={styles["remote-info"]}>
                    <Form colon={false} labelAlign='right' labelCol={{span: 8}}>
                        <Form.Item label='Yak gRPC 主机地址:' rules={[{required: true, message: ""}]}>
                            <Input
                                className={classnames(styles["input-style"], {
                                    [styles["error-border"]]: isCheck && !remote.host
                                })}
                                value={remote.host}
                                onChange={(e) => setRemote({...remote, host: e.target.value})}
                            />
                        </Form.Item>
                        <Form.Item label='Yak gRPC 端口:' rules={[{required: true, message: ""}]}>
                            <Input
                                className={classnames(styles["input-style"], {
                                    [styles["error-border"]]: isCheck && !remote.port
                                })}
                                value={remote.port}
                                onChange={(e) => setRemote({...remote, port: e.target.value})}
                            />
                        </Form.Item>
                        <Form.Item label='启用通信加密认证 TLS:'>
                            <Switch checked={remote.isTls} onChange={(isTls) => setRemote({...remote, isTls})} />
                        </Form.Item>
                        {remote.isTls && (
                            <>
                                <Form.Item
                                    label={
                                        <div className={styles["pem-title"]}>
                                            gRPC Root-CA 证书(PEM){" "}
                                            <PEMExample>
                                                <HelpSvgIcon className={styles["icon-style"]} />
                                            </PEMExample>
                                            :
                                        </div>
                                    }
                                    required={true}
                                >
                                    <div
                                        className={classnames(styles["pem-content"], {
                                            [styles["error-border"]]: isCheck && !remote.pem
                                        })}
                                    >
                                        <YakEditor
                                            type={"pem"}
                                            value={remote.pem}
                                            setValue={(pem) => setRemote({...remote, pem})}
                                        />
                                    </div>
                                </Form.Item>
                                <Form.Item label='密码:'>
                                    <Input className={styles["input-style"]} />
                                </Form.Item>
                            </>
                        )}
                        <Form.Item label='保存为历史连接:'>
                            <Switch checked={allowSave} onChange={(checked: boolean) => setAllowSave(checked)} />
                        </Form.Item>
                        <Form.Item label=' '>
                            <Button className={classnames(styles["btn-style"], styles["btn-link"])} onClick={submit}>
                                启动连接
                            </Button>
                            <Button className={styles["btn-style"]} onClick={cancel}>
                                取消
                            </Button>
                        </Form.Item>
                    </Form>
                </div>
            </div>
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
}
/** @name PEM示例弹窗 */
const PEMExample: React.FC<PEMExampleProps> = React.memo((props) => {
    const {children} = props

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
        <YakitPopover overlayClassName={styles["pem-example-popover"]} content={content}>
            {children}
        </YakitPopover>
    )
})
