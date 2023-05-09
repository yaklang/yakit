import React, {useState, useEffect, useRef, useMemo} from "react"
import {failed, info, success} from "@/utils/notification"
import {showModal} from "@/utils/showModal"
import {YaklangEngineMode} from "@/yakitGVDefine"
import {LoadingOutlined} from "@ant-design/icons"
import {useInViewport, useMemoizedFn} from "ahooks"
import {Popconfirm} from "antd"
import {Sparklines, SparklinesCurve} from "react-sparklines"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {YakitPopover} from "../yakitUI/YakitPopover/YakitPopover"
import {YakitTag} from "../yakitUI/YakitTag/YakitTag"
import {CheckedSvgIcon, GooglePhotosLogoSvgIcon} from "./icons"

import classNames from "classnames"
import styles from "./performanceDisplay.module.scss"
import {YaklangEngineWatchDogCredential} from "@/components/layout/YaklangEngineWatchDog";

const {ipcRenderer} = window.require("electron")

interface PerformanceDisplayProps {
    engineMode: YaklangEngineMode | undefined
    typeCallback: (type: "console" | "adminMode" | "break") => any
}

export const PerformanceDisplay: React.FC<PerformanceDisplayProps> = React.memo((props) => {
    // cpu和内存可视图数据
    const [cpu, setCpu] = useState<number[]>([])

    const [showLine, setShowLine] = useState<boolean>(true)
    const showLineTime = useRef<any>(null)

    useEffect(() => {
        ipcRenderer.invoke("start-compute-percent")
        const time = setInterval(() => {
            ipcRenderer.invoke("fetch-compute-percent").then((res) => setCpu(res))
        }, 500)

        return () => {
            clearInterval(time)
            ipcRenderer.invoke("clear-compute-percent")
        }
    }, [])

    const onWinResize = (e: UIEvent) => {
        if (showLineTime.current) clearTimeout(showLineTime.current)
        showLineTime.current = setTimeout(() => {
            if (document) {
                const header = document.getElementById("yakit-header")
                if (header) {
                    setShowLine(header.clientWidth >= 1000)
                }
            }
        }, 100)
    }

    useEffect(() => {
        if (window) {
            window.addEventListener("resize", onWinResize)
            return () => {
                window.removeEventListener("resize", onWinResize)
                if (showLineTime.current) clearTimeout(showLineTime.current)
                showLineTime.current = null
            }
        }
    }, [])

    return (
        <div className={styles["system-func-wrapper"]}>
            <div className={styles["cpu-wrapper"]}>
                <div className={styles["cpu-title"]}>
                    <span className={styles["title-headline"]}>CPU </span>
                    <span className={styles["title-content"]}>{`${cpu[cpu.length - 1] || 0}%`}</span>
                </div>

                {showLine && (
                    <div className={styles["cpu-spark"]}>
                        <Sparklines data={cpu} width={96} height={10} max={96}>
                            <SparklinesCurve color='#85899E'/>
                        </Sparklines>
                    </div>
                )}
            </div>
            <UIEngineList {...props} />
        </div>
    )
})

export interface yakProcess {
    port: number
    pid: number
    cmd: string
    origin: any
}

interface UIEngineListProp {
    engineMode: YaklangEngineMode | undefined
    typeCallback: (type: "console" | "adminMode" | "break") => any
}

/** @name 已启动引擎列表 */
const UIEngineList: React.FC<UIEngineListProp> = React.memo((props) => {
    const isDev = useRef<boolean>(false)

    const {engineMode, typeCallback} = props

    const [show, setShow] = useState<boolean>(false)

    const listRef = useRef(null)
    const [inViewport] = useInViewport(listRef)

    const [psLoading, setPSLoading] = useState<boolean>(false)
    const [process, setProcess] = useState<yakProcess[]>([])

    const [port, setPort] = useState<number>(0)

    const fetchPSList = useMemoizedFn(() => {
        if (psLoading) return

        setPSLoading(true)
        ipcRenderer
            .invoke("ps-yak-grpc")
            .then((i: yakProcess[]) => {
                setProcess(
                    i.map((element: yakProcess) => {
                        return {
                            port: element.port,
                            pid: element.pid,
                            cmd: element.cmd,
                            origin: element.origin
                        }
                    })
                )
            })
            .catch((e) => {
                failed(`PS | GREP yak failed ${e}`)
            })
            .finally(() => {
                setPSLoading(false)
            })
    })
    const fetchCurrentPort = () => {
        ipcRenderer
            .invoke("fetch-yaklang-engine-addr")
            .then((data) => {
                const hosts: string[] = (data.addr as string).split(":")
                if (hosts.length !== 2) return
                if (+hosts[1]) setPort(+hosts[1])
            })
            .catch(() => {
            })
    }
    useEffect(() => {
        ipcRenderer.invoke("is-dev").then((flag: boolean) => (isDev.current = flag))
        if (inViewport) {
            fetchPSList()
            fetchCurrentPort()

            let id = setInterval(() => {
                fetchPSList()
                fetchCurrentPort()
            }, 3000)
            return () => {
                clearInterval(id)
            }
        }
    }, [inViewport])

    const allClose = useMemoizedFn(() => {
        ;(process || []).forEach((i) => {
            ipcRenderer.invoke("kill-yak-grpc", i.pid).then((val) => {
                if (!val) {
                    info(`KILL yak PROCESS: ${i.pid}`)
                    if (+i.port === port && isLocal) typeCallback("break")
                }
            })
        })
        setTimeout(() => success("引擎进程关闭中..."), 1000)
    })

    const isLocal = useMemo(() => {
        return engineMode === "admin" || engineMode === "local"
    }, [engineMode])
    console.log("isDev", isDev)
    return (
        <YakitPopover
            visible={show}
            overlayClassName={classNames(styles["ui-op-dropdown"], styles["ui-engine-list-dropdown"])}
            placement={"bottomRight"}
            content={
                <div ref={listRef} className={styles["ui-engine-list-wrapper"]}>
                    <div className={styles["ui-engine-list-body"]}>
                        <div className={styles["engine-list-header"]}>
                            本地 Yak 进程管理
                            <Popconfirm
                                title={"重置引擎版本会恢复最初引擎出厂版本，同时强制重启"}
                                onConfirm={() => {
                                    process.map(i => {
                                        ipcRenderer.invoke(`kill-yak-grpc`, i.pid)
                                    })
                                    ipcRenderer.invoke("RestoreEngineAndPlugin", {}).finally(() => {
                                        info("恢复引擎成功")
                                        ipcRenderer.invoke("relaunch")
                                    }).catch(e => {
                                        failed(`恢复引擎失败：${e}`)
                                    })
                                }}
                            >
                                <YakitButton type={"danger"} style={{marginLeft: 8}}>重置引擎版本</YakitButton>
                            </Popconfirm>
                            {psLoading && <LoadingOutlined className={styles["loading-icon"]}/>}
                        </div>
                        <div className={styles["engine-list-container"]}>
                            {process.map((i) => {
                                return (
                                    <div key={i.pid} className={styles["engine-list-opt"]}>
                                        <div className={styles["left-body"]}>
                                            <YakitTag color={isLocal && +i.port === port ? "success" : undefined}>
                                                {`PID: ${i.pid}`}
                                                {isLocal && +i.port === port && (
                                                    <CheckedSvgIcon style={{marginLeft: 8}}/>
                                                )}
                                            </YakitTag>
                                            <div className={styles["engine-ps-info"]}>
                                                {`yak grpc --port ${i.port === 0 ? "获取中" : i.port}`}
                                                &nbsp;
                                                {isLocal && +i.port === port && (
                                                    <span className={styles["current-ps-info"]}>{"(当前)"}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className={styles["right-body"]}>
                                            <YakitButton
                                                type='text'
                                                onClick={() => {
                                                    setShow(false)
                                                    showModal({
                                                        title: "YakProcess 详情",
                                                        content: <div style={{padding: 8}}>{JSON.stringify(i)}</div>
                                                    })
                                                }}
                                            >
                                                Details
                                            </YakitButton>
                                            {isDev ? (
                                                <Popconfirm
                                                    title={
                                                        <>
                                                            确定是否切换连接的引擎,
                                                        </>
                                                    }
                                                    onConfirm={() => {
                                                        const switchEngine: YaklangEngineWatchDogCredential = {
                                                            Mode: "local",
                                                            Port: i.port,
                                                            Host: "127.0.0.1",
                                                        }
                                                        ipcRenderer
                                                            .invoke("connect-yaklang-engine", switchEngine)
                                                            .then(() => {
                                                                ipcRenderer.invoke("switch-conn-refresh", true)
                                                                success(`切换核心引擎成功！`)
                                                            })
                                                            .catch((e) => {
                                                                failed(e)
                                                            })
                                                    }}
                                                >

                                                    <YakitButton type='outline2' disabled={isLocal && +i.port === port}
                                                                 themeClass={styles["success-btn-coloc"]}>
                                                        切换引擎
                                                    </YakitButton>
                                                </Popconfirm>
                                            ) : null}
                                            <Popconfirm
                                                title={
                                                    <>
                                                        确定关闭将会强制关闭进程,
                                                        <br/>
                                                        如为当前连接引擎,未关闭Yakit再次连接引擎,
                                                        <br/>
                                                        则需在加载页点击"其他连接模式-手动启动引擎"
                                                    </>
                                                }
                                                onConfirm={() => {
                                                    ipcRenderer
                                                        .invoke("kill-yak-grpc", i.pid)
                                                        .then((val) => {
                                                            if (!val) {
                                                                if (isLocal && +i.port === port) typeCallback("break")
                                                                success("引擎进程关闭中...")
                                                            }
                                                        })
                                                        .catch((e: any) => {
                                                        })
                                                        .finally(fetchPSList)
                                                }}
                                            >
                                                <YakitButton type='outline2' themeClass={styles["del-btn-coloc"]}>
                                                    关闭引擎
                                                </YakitButton>
                                            </Popconfirm>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <div className={styles["engine-list-footer"]}>
                            <div></div>
                            <Popconfirm
                                title={
                                    <>
                                        确定关闭将会强制关闭进程,
                                        <br/>
                                        如为当前连接引擎,未关闭Yakit再次连接引擎,
                                        <br/>
                                        则需在加载页点击"其他连接模式-手动启动引擎"
                                    </>
                                }
                                onConfirm={() => allClose()}
                            >
                                <div className={styles["engine-list-footer-btn"]}>全部关闭</div>
                            </Popconfirm>
                        </div>
                    </div>
                </div>
            }
            onVisibleChange={(visible) => setShow(visible)}
        >
            <div className={styles["ui-op-btn-wrapper"]}>
                <div className={classNames(styles["op-btn-body"], {[styles["op-btn-body-hover"]]: show})}>
                    <GooglePhotosLogoSvgIcon className={classNames({[styles["icon-rotate-animation"]]: !show})}/>
                </div>
            </div>
        </YakitPopover>
    )
})
