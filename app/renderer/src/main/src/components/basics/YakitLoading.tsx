import React, {useEffect, useMemo, useRef, useState} from "react"
import {YakitLoadingSvgIcon, YakitThemeLoadingSvgIcon} from "./icon"
import {Dropdown, Popconfirm, Progress} from "antd"
import {DownloadingState, YaklangEngineMode} from "@/yakitGVDefine"
import {outputToWelcomeConsole} from "@/components/layout/WelcomeConsoleUtil"
import {YakitMenu} from "../yakitUI/YakitMenu/YakitMenu"
import {useGetState, useMemoizedFn} from "ahooks"
import {ArrowRightSvgIcon, ChevronDownSvgIcon, YaklangInstallHintSvgIcon} from "../layout/icons"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import { yakProcess } from "../layout/PerformanceDisplay"
import Draggable from "react-draggable"
import type {DraggableEvent, DraggableData} from "react-draggable"
import {failed, info, success} from "@/utils/notification"

import classnames from "classnames"
import styles from "./yakitLoading.module.scss"

/** 首屏加载蒙层展示语 */
const LoadingTitle: string[] = [
    "没有困难的工作，只有勇敢的打工人。",
    "打工累吗？累！但我不能哭，因为骑电动车擦眼泪不安全。",
    "亲们，起床打工了！",
    "打工不仅能致富，还能交友娶媳妇",
    "今天搬砖不狠，明天地位不稳",
    "打工可能会少活十年，不打工你一天也活不下去。",
    "早点睡，打工人。",
    "有人相爱，有人夜里看海，有人七八个闹钟起不来，早安打工人!",
    "累吗，累就对了，舒服是留给有钱人的，早安，打工人!",
    "爱情不是我生活的全部，打工才是。早安，打工人。",
    "打工人，打工魂，打工人是人上人",
    "@所有人，据说用了Yakit后就不必再卷了！",
    "再不用Yakit，卷王就是别人的了",
    "来用Yakit啦？安全圈还是你最成功",
    "这届网安人，人手一个Yakit，香惨了！"
]

export const EngineModeVerbose = (m: YaklangEngineMode) => {
    switch (m) {
        case "admin":
            return "管理权限"
        case "local":
            return "普通权限"
        case "remote":
            return "远程连接"
        default:
            return "未知模式"
    }
}

export interface YakitLoadingProp {
    loading: boolean
    engineMode: YaklangEngineMode
    localPort: number
    adminPort: number
    onEngineModeChange: (mode: YaklangEngineMode, keepalive?: boolean) => any
    showEngineLog: boolean
    setShowEngineLog: (flag: boolean) => any
}

const {ipcRenderer} = window.require("electron")

export const YakitLoading: React.FC<YakitLoadingProp> = (props) => {
    const {loading, showEngineLog, setShowEngineLog} = props

    const [__showLog, setShowLog, getShowLog] = useGetState<number>(0)
    const loadingTime = useRef<any>(null)

    const [download, setDownload] = useState<boolean>(false)

    const killAllEngine = useMemoizedFn(() => {
        setUpdateLoading(true)
        ipcRenderer
            .invoke("ps-yak-grpc")
            .then((i: yakProcess[]) => {
                ;(i || []).forEach((i) => {
                    ipcRenderer.invoke("kill-yak-grpc", i.pid).then(() => {
                        info(`KILL yak PROCESS: ${i.pid}`)
                    })
                })
            })
            .catch((e) => {})
            .finally(() => {
                setTimeout(() => {
                    setDownload(true)
                }, 2000)
            })
    })

    const [updateLoading, setUpdateLoading] = useState<boolean>(false)

    const loadingTitle = useMemo(() => LoadingTitle[Math.floor(Math.random() * (LoadingTitle.length - 0)) + 0], [])

    useEffect(() => {
        if (loading) {
            if (loadingTime.current) {
                clearInterval(loadingTime.current)
                loadingTime.current = null
                setShowLog(0)
            }
        } else {
            if (!loadingTime.current) {
                setShowLog(0)
                loadingTime.current = setInterval(() => {
                    setShowLog(getShowLog() + 1)
                    if (getShowLog() >= 5) {
                        clearInterval(loadingTime.current)
                    }
                }, 1000)
            }
        }
    }, [loading])

    const selectEngineMode = useMemoizedFn((key: string) => {
        if (key === "remote" && props.onEngineModeChange) {
            props.onEngineModeChange("remote")
        }
        if (key === "local") {
            const isAdmin = props.engineMode === "admin"
            ipcRenderer
                .invoke("start-local-yaklang-engine", {
                    port: isAdmin ? props.adminPort : props.localPort,
                    sudo: isAdmin
                })
                .then(() => {
                    outputToWelcomeConsole("手动引擎启动成功！")
                    if (props.onEngineModeChange) {
                        props.onEngineModeChange(props.engineMode, true)
                    }
                })
                .catch((e) => {
                    outputToWelcomeConsole("手动引擎启动失败！")
                    outputToWelcomeConsole(`失败原因:${e}`)
                })
        }
    })

    const menu = useMemo(() => {
        return (
            <YakitMenu
                width={170}
                selectedKeys={[]}
                data={[
                    {
                        key: "remote",
                        label: "远程模式"
                    },
                    {
                        key: "local",
                        label: `手动启动引擎(${EngineModeVerbose(props.engineMode)})`
                    }
                ]}
                onClick={({key}) => selectEngineMode(key)}
            ></YakitMenu>
        )
    }, [props.engineMode])

    return (
        <div className={styles["yakit-loading-wrapper"]}>
            <div className={styles["yakit-loading-body"]}>
                <div className={styles["yakit-loading-title"]}>
                    <div className={styles["title-style"]}>欢迎使用 Yakit</div>
                    <div className={styles["subtitle-stlye"]}>{loadingTitle}</div>
                </div>

                <div className={styles["yakit-loading-icon-wrapper"]}>
                    <div className={styles["theme-icon-wrapper"]}>
                        <div className={styles["theme-icon"]}>
                            <YakitThemeLoadingSvgIcon />
                        </div>
                    </div>
                    <div className={styles["white-icon"]}>
                        <YakitLoadingSvgIcon />
                    </div>
                </div>

                <div className={styles["yakit-loading-content"]}>
                    <div className={classnames({[styles["time-out-title"]]: getShowLog() >= 5})}>
                        {getShowLog() >= 5 ? "连接超时..." : `正在加载中 (${EngineModeVerbose(props.engineMode)}) ...`}
                    </div>
                    <div className={styles["engine-log-btn"]}>
                        {!showEngineLog && getShowLog() >= 5 && (
                            <YakitButton type='danger' size='max' onClick={() => setShowEngineLog(true)}>
                                查看日志
                                <ArrowRightSvgIcon />
                            </YakitButton>
                        )}
                        <Popconfirm
                            title={
                                <>
                                    将关闭所有本地引擎进程, 如未完全关闭所有引擎进程,
                                    <br />
                                    更新引擎可能会失败
                                </>
                            }
                            onConfirm={() => killAllEngine()}
                        >
                            <YakitButton loading={updateLoading} size='max' type="secondary1">
                                更新引擎
                            </YakitButton>
                        </Popconfirm>
                    </div>
                    <div className={styles["switch-engine-mode"]}>
                        <Dropdown placement='bottom' overlay={menu} overlayClassName={styles["switch-mode-overlay"]}>
                            <div style={{cursor: "pointer"}}>
                                其他连接模式
                                <ChevronDownSvgIcon style={{marginLeft: 4}} />
                            </div>
                        </Dropdown>
                    </div>
                </div>
            </div>
            <DownloadYaklang visible={download} setVisible={setDownload} updateFinal={() => setUpdateLoading(false)} />
        </div>
    )
}

interface DownloadYaklangProps {
    visible: boolean
    setVisible: (flag: boolean) => any
    updateFinal: () => any
}

/** @name Yaklang引擎更新下载弹窗 */
const DownloadYaklang: React.FC<DownloadYaklangProps> = React.memo((props) => {
    const {visible, setVisible, updateFinal} = props

    const [disabled, setDisabled] = useState(true)
    const [bounds, setBounds] = useState({left: 0, top: 0, bottom: 0, right: 0})
    const draggleRef = useRef<HTMLDivElement>(null)

    /** 远端最新yaklang引擎版本 */
    const [latestVersion, setLatestVersion] = useState("")
    /** 下载进度条数据 */
    const [downloadProgress, setDownloadProgress, getDownloadProgress] = useGetState<DownloadingState>()

    /**
     * 1. 获取最新引擎版本号(版本号内带有'v'字符)，并下载
     * 2. 监听本地下载引擎进度数据
     * @returns 删除监听事件2
     */
    useEffect(() => {
        if (visible) {
            ipcRenderer
                .invoke("fetch-latest-yaklang-version")
                .then((data: string) => {
                    setLatestVersion(data)

                    ipcRenderer
                        .invoke("download-latest-yak", data)
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
                            onUpdate()
                        })
                        .catch((e: any) => {
                            failed(`下载失败: ${e}`)
                            setVisible(false)
                        })
                })
                .catch((e: any) => {
                    failed(`${e}`)
                    updateFinal()
                    setVisible(false)
                })

            ipcRenderer.on("download-yak-engine-progress", (e: any, state: DownloadingState) => {
                setDownloadProgress(state)
            })

            return () => {
                ipcRenderer.removeAllListeners("download-yak-engine-progress")
            }
        }
    }, [visible])

    /** 立即更新 */
    const onUpdate = useMemoizedFn(() => {
        setTimeout(() => setVisible(false), 500)
        setTimeout(() => {
            ipcRenderer
                .invoke("install-yak-engine", latestVersion)
                .then(() => {
                    success("安装成功，需用户手动启动引擎，点击'其他连接模式-手动启动引擎'")
                })
                .catch((err: any) => {
                    failed(
                        `安装失败: ${err.message.indexOf("operation not permitted") > -1 ? "请关闭引擎后重试" : err}`
                    )
                    onInstallClose()
                })
                .finally(() => updateFinal())
        }, 1000)
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
        setVisible(false)
        setDownloadProgress(undefined)
    })

    return (
        <>
            <Draggable
                defaultClassName={classnames(
                    styles["yaklang-update-modal"],
                    visible ? styles["engine-hint-modal-wrapper"] : styles["engine-hint-modal-hidden-wrapper"]
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
                                        <div>下载速度 : {((downloadProgress?.speed || 0) / 1000000).toFixed(2)}M/s</div>
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
