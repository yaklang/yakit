import React, {useState} from "react"
import {failed, info} from "@/utils/notification"
import {useGetState, useMemoizedFn} from "ahooks"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {YakitModal} from "../yakitUI/YakitModal/YakitModal"
import {yakProcess} from "./PerformanceDisplay"
import {Loading3QuartersSvgIcon, YaklangInstallHintSvgIcon} from "./icons"

import classnames from "classnames"
import styles from "./AllKillEngineConfirm.module.scss"

const {ipcRenderer} = window.require("electron")

export interface AllKillEngineConfirmProps {
    visible: boolean
    setVisible: (flag: boolean) => any
    onSuccess: () => any
}
/** 更新引擎-确认二次弹窗和kill操作 */
export const AllKillEngineConfirm: React.FC<AllKillEngineConfirmProps> = React.memo((props) => {
    const {visible, setVisible, onSuccess} = props

    const [loading, setLoading, getLoading] = useGetState<boolean>(false)

    const [currentPort, setCurrentPort] = useState<number>(0)
    const [process, setProcess] = useState<yakProcess[]>([])

    const fetchProcess = useMemoizedFn((callback: () => any) => {
        setLoading(true)
        ipcRenderer
            .invoke("fetch-yaklang-engine-addr")
            .then((data) => {
                if (!visible) return
                const hosts: string[] = (data.addr as string).split(":")
                if (hosts.length !== 2) return
                if (+hosts[1]) setCurrentPort(+hosts[1] || 0)
            })
            .catch((e) => {
                failed(`获取连接引擎端口错误 ${e}`)
                setTimeout(() => setLoading(false), 300)
            })
            .finally(() => {
                ipcRenderer
                    .invoke("ps-yak-grpc")
                    .then((i: yakProcess[]) => {
                        if (!visible) return
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
                        setTimeout(() => setLoading(false), 300)
                    })
                    .finally(() => {
                        if (getLoading())
                            setTimeout(() => {
                                callback()
                            }, 300)
                    })
            })
    })

    const onExecute = useMemoizedFn(async () => {
        const currentPS = process.filter((item) => +item.port === currentPort)[0]
        const otherPS = process.filter((item) => +item.port !== currentPort)
        /** 关闭是否正常进行标识位 */
        let killFlag: string = ""

        if (otherPS.length > 0) {
            for (let i of otherPS) {
                killFlag = await ipcRenderer.invoke("kill-yak-grpc", i.pid)
                if (!!killFlag) {
                    failed(`引擎进程(pid:${i.pid},port:${i.port})关闭失败 ${killFlag}`)
                    setLoading(false)
                    return
                } else {
                    info(`KILL yak PROCESS: ${i.pid}`)
                }
            }
        }
        if (currentPS) {
            const flag: string = await ipcRenderer.invoke("kill-yak-grpc", currentPS.pid)
            if (!!flag) return
            info(`KILL yak PROCESS: ${currentPS.pid}`)
        }
        if (process.length === 0) return
        onSuccess()
    })

    const onCancel = () => {
        setCurrentPort(0)
        setProcess([])
        setVisible(false)
    }
    const onOK = () => {
        fetchProcess(() => {
            onExecute()
        })
    }

    return (
        <YakitModal
            wrapClassName={styles["center-modal"]}
            visible={visible}
            footer={null}
            closable={false}
            maskClosable={false}
            keyboard={false}
            width={448}
        >
            <div className={styles["all-kill-engine-wrapper"]}>
                <div>
                    {loading ? (
                        <Loading3QuartersSvgIcon className={styles["icon-rotate-animation"]} />
                    ) : (
                        <YaklangInstallHintSvgIcon />
                    )}
                </div>

                <div className={styles["confirm-body"]}>
                    <div className={classnames(styles["body-title"], {[styles["loading-body-title"]]: loading})}>
                        {loading ? "进程关闭中，请稍等 ..." : "更新引擎，需关闭所有本地进程"}
                    </div>
                    {!loading && (
                        <div className={styles["body-content"]}>
                            关闭所有引擎，包括正在连接的本地引擎进程，同时页面将进入加载页。
                        </div>
                    )}

                    {!loading && (
                        <div className={styles["body-btn"]}>
                            <YakitButton loading={loading} type='outline2' size='max' onClick={onCancel}>
                                稍后再说
                            </YakitButton>
                            <YakitButton loading={loading} size='max' onClick={onOK}>
                                立即关闭
                            </YakitButton>
                        </div>
                    )}
                </div>
            </div>
        </YakitModal>
    )
})
