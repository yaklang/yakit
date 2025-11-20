import React, {useEffect, useMemo, useRef, useState} from "react"
import {TypeCallbackExtra, YakitStatusType, YaklangEngineMode, YaklangEngineWatchDogCredential} from "../../types"
import {useInViewport, useMemoizedFn} from "ahooks"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import classNames from "classnames"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {getReleaseEditionName} from "@/utils/envfile"
import {yakitNotify} from "@/utils/notification"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {LoadingOutlined} from "@ant-design/icons"
import {CheckedSvgIcon, GooglePhotosLogoSvgIcon} from "@/assets/newIcon"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {ipcEventPre} from "@/utils/ipcEventPre"
import {grpcRelaunch, grpcUnpackBuildInYak, grpcWriteEngineKeyToYakitProjects} from "../../grpc"
import styles from "./UIEngineList.module.scss"
const {ipcRenderer} = window.require("electron")

interface yakProcess {
    port: number
    pid: number
    ppid?: number
    cmd: string
    origin: any
}

interface UIEngineListProp {
    engineMode: YaklangEngineMode | undefined
    typeCallback: (type: YakitStatusType, extra?: TypeCallbackExtra) => any
    engineLink: boolean
}

/** @name 已启动引擎列表 */
export const UIEngineList: React.FC<UIEngineListProp> = React.memo((props) => {
    const {engineMode, typeCallback, engineLink} = props

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
            .invoke(ipcEventPre + "ps-yak-grpc")
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
                yakitNotify("error", `PS | GREP yak failed ${e}`)
            })
            .finally(() => {
                setPSLoading(false)
            })
    })
    const fetchCurrentPort = () => {
        ipcRenderer
            .invoke(ipcEventPre + "fetch-yaklang-engine-addr")
            .then((data) => {
                const hosts: string[] = (data.addr as string).split(":")
                if (hosts.length !== 2) return
                if (+hosts[1]) setPort(+hosts[1] || 0)
            })
            .catch(() => {})
    }
    useEffect(() => {
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

    const allClose = useMemoizedFn(async () => {
        ;(process || []).forEach((i) => {
            ipcRenderer.invoke(ipcEventPre + "kill-yak-grpc", i.pid).then((val) => {
                if (!val) {
                    yakitNotify("info", `KILL yak PROCESS: ${i.pid}`)
                    if (+i.port === port && isLocal) typeCallback("break")
                }
            })
        })
        setTimeout(() => yakitNotify("success", "引擎进程关闭中..."), 1000)
    })

    const isLocal = useMemo(() => {
        return engineMode === "local"
    }, [engineMode])

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
                            <YakitPopconfirm
                                title={"重置引擎版本会恢复最初引擎出厂版本，同时强制重启"}
                                onConfirm={async () => {
                                    process.map((i) => {
                                        ipcRenderer.invoke(ipcEventPre + `kill-yak-grpc`, i.pid)
                                    })
                                    grpcUnpackBuildInYak()
                                        .then(() => {
                                            grpcWriteEngineKeyToYakitProjects({}, true).finally(() => {
                                                yakitNotify("info", "恢复引擎成功")
                                                grpcRelaunch()
                                            })
                                        })
                                        .catch((err) => {
                                            typeCallback("skipAgreement_InstallNetWork", {message: err + ""})
                                        })
                                }}
                            >
                                <YakitButton style={{marginLeft: 8}}>重置引擎版本</YakitButton>
                            </YakitPopconfirm>
                            {psLoading && <LoadingOutlined className={styles["loading-icon"]} />}
                        </div>
                        <div className={styles["engine-list-container"]}>
                            {process.map((i) => {
                                return (
                                    <div key={i.pid} className={styles["engine-list-opt"]}>
                                        <div className={styles["left-body"]}>
                                            <YakitTag
                                                color={
                                                    isLocal && +i.port === port && engineLink ? "success" : undefined
                                                }
                                            >
                                                {`PID: ${i.pid}`}
                                                {isLocal && +i.port === port && engineLink && (
                                                    <CheckedSvgIcon style={{marginLeft: 8}} />
                                                )}
                                            </YakitTag>
                                            <div className={styles["engine-ps-info"]}>
                                                {`yak grpc --port ${i.port === 0 ? "获取中" : i.port}`}
                                                &nbsp;
                                                {isLocal && +i.port === port && engineLink && (
                                                    <span className={styles["current-ps-info"]}>{"(当前)"}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className={styles["right-body"]}>
                                            <YakitButton
                                                type='text'
                                                onClick={() => {
                                                    setShow(false)
                                                    showYakitModal({
                                                        title: "YakProcess 详情",
                                                        content: <div style={{padding: 8}}>{JSON.stringify(i)}</div>,
                                                        footer: null
                                                    })
                                                }}
                                            >
                                                Details
                                            </YakitButton>

                                            <YakitPopconfirm
                                                title={<>确定是否切换连接的引擎</>}
                                                onConfirm={async () => {
                                                    if (!isLocal) {
                                                        yakitNotify("info", "远程模式，不支持切换引擎")
                                                        return
                                                    }
                                                    let oldPort = port
                                                    const switchEngine: YaklangEngineWatchDogCredential = {
                                                        Port: i.port,
                                                        Host: "127.0.0.1"
                                                    }
                                                    ipcRenderer
                                                        .invoke(ipcEventPre + "connect-yaklang-engine", switchEngine)
                                                        .then(() => {
                                                            setTimeout(() => {
                                                                yakitNotify("success", `切换核心引擎成功！`)
                                                            }, 500)
                                                        })
                                                        .catch((e) => {
                                                            yakitNotify("error", "切换引擎失败，请尝试切换其他端口重连")
                                                            process.forEach((item) => {
                                                                if (item.port == oldPort) {
                                                                    ipcRenderer
                                                                        .invoke(ipcEventPre + `kill-yak-grpc`, item.pid)
                                                                        .then((val) => {
                                                                            if (!val) {
                                                                                yakitNotify(
                                                                                    "success",
                                                                                    "引擎进程关闭中..."
                                                                                )
                                                                                typeCallback("break")
                                                                            }
                                                                        })
                                                                        .catch((e: any) => {})
                                                                        .finally(fetchPSList)
                                                                }
                                                            })
                                                        })
                                                }}
                                            >
                                                <YakitButton
                                                    type='outline1'
                                                    colors='success'
                                                    disabled={+i.port === 0 || (isLocal && +i.port === port)}
                                                >
                                                    切换引擎
                                                </YakitButton>
                                            </YakitPopconfirm>
                                            <YakitPopconfirm
                                                title={
                                                    <>
                                                        确定关闭将会强制关闭进程,
                                                        <br />
                                                        如为当前连接引擎,未关闭{getReleaseEditionName()}再次连接引擎,
                                                        <br />
                                                        则需在加载页点击"其他连接模式-手动启动引擎"
                                                    </>
                                                }
                                                onConfirm={async () => {
                                                    ipcRenderer
                                                        .invoke(ipcEventPre + "kill-yak-grpc", i.pid)
                                                        .then((val) => {
                                                            if (!val) {
                                                                isLocal && +i.port === port && typeCallback("break")
                                                                yakitNotify("success", "引擎进程关闭中...")
                                                            }
                                                        })
                                                        .catch((e: any) => {})
                                                        .finally(fetchPSList)
                                                }}
                                            >
                                                <YakitButton type='outline1' colors='danger'>
                                                    关闭引擎
                                                </YakitButton>
                                            </YakitPopconfirm>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <div className={styles["engine-list-footer"]}>
                            <div></div>
                            <YakitPopconfirm
                                title={
                                    <div style={{width: 330}}>
                                        确定关闭将会强制关闭进程,
                                        <br />
                                        如为当前连接引擎,未关闭{getReleaseEditionName()}再次连接引擎,
                                        <br />
                                        则需在加载页点击"其他连接模式-手动启动引擎"
                                    </div>
                                }
                                onConfirm={() => allClose()}
                            >
                                <div className={styles["engine-list-footer-btn"]}>全部关闭</div>
                            </YakitPopconfirm>
                        </div>
                    </div>
                </div>
            }
            onVisibleChange={(visible) => setShow(visible)}
        >
            <div className={styles["ui-op-btn-wrapper"]}>
                <div className={classNames(styles["op-btn-body"], {[styles["op-btn-body-hover"]]: show})}>
                    <GooglePhotosLogoSvgIcon className={classNames({[styles["icon-rotate-animation"]]: !show})} />
                </div>
            </div>
        </YakitPopover>
    )
})
