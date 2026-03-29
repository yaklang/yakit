import React, {useState} from "react"
import {failed, info, warn} from "@/utils/notification"
import {useGetState, useMemoizedFn} from "ahooks"
import {yakProcess} from "./PerformanceDisplay"
import {useTemporaryProjectStore} from "@/store/temporaryProject"
import {YakitHint} from "../yakitUI/YakitHint/YakitHint"
import {OutlineLoadingIcon} from "@/assets/icon/outline"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

import styles from "./AllKillEngineConfirm.module.scss"

const {ipcRenderer} = window.require("electron")

export interface AllKillEngineConfirmProps {
    title?: string
    content?: string
    visible: boolean
    setVisible: (flag: boolean) => any
    onSuccess: () => any
    onCancelFun: () => any
}
/** 更新引擎-确认二次弹窗和kill操作 */
export const AllKillEngineConfirm: React.FC<AllKillEngineConfirmProps> = React.memo((props) => {
    const {t} = useI18nNamespaces(["layout"])
    const {
        title = t("AllKillEngineConfirm.title"),
        content = t("AllKillEngineConfirm.content"),
        visible,
        setVisible,
        onSuccess,
        onCancelFun
    } = props

    const [loading, setLoading, getLoading] = useGetState<boolean>(false)

    const [currentPort, setCurrentPort] = useState<number>(0)
    const [process, setProcess] = useState<yakProcess[]>([])

    const onLoadingToFalse = useMemoizedFn(() => {
        setTimeout(() => {
            setLoading(false)
        }, 300)
    })

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
                failed(t("AllKillEngineConfirm.fetchPortError", {error: e}))
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
                        failed(t("AllKillEngineConfirm.fetchProcessError", {error: e}))
                    })
                    .finally(() => {
                        setTimeout(() => {
                            callback()
                        }, 300)
                    })
            })
    })

    const onExecute = useMemoizedFn(async () => {
        if (process.length === 0) {
            warn(t("AllKillEngineConfirm.noProcess"))
            onLoadingToFalse()
            return
        }

        const currentPS = process.find((item) => +item.port === currentPort)
        const otherPS = process.filter((item) => +item.port !== currentPort)
        /** 关闭是否正常进行标识位 */
        let killFlag: string = ""

        if (otherPS.length > 0) {
            for (let i of otherPS) {
                try {
                    killFlag = await ipcRenderer.invoke("kill-yak-grpc", i.pid)
                } catch (error) {}
                if (!!killFlag) {
                    failed(t("AllKillEngineConfirm.killProcessFailed", {pid: i.pid, port: i.port, error: killFlag}))
                    onLoadingToFalse()
                    return
                } else {
                    info(t("AllKillEngineConfirm.killProcessInfo", {pid: i.pid}))
                }
            }
        }
        if (currentPS) {
            let killFlag: string = ""
            try {
                killFlag = await ipcRenderer.invoke("kill-yak-grpc", currentPS.pid)
            } catch (error) {}
            if (!!killFlag) {
                failed(
                    t("AllKillEngineConfirm.killProcessFailed", {
                        pid: currentPS.pid,
                        port: currentPS.port,
                        error: killFlag
                    })
                )
                onLoadingToFalse()
                return
            }
            info(t("AllKillEngineConfirm.killProcessInfo", {pid: currentPS.pid}))
        }

        onSuccess()
    })

    const onCancel = useMemoizedFn(() => {
        setCurrentPort(0)
        setProcess([])
        setVisible(false)
        onCancelFun()
    })

    const {delTemporaryProject} = useTemporaryProjectStore()

    const onOK = useMemoizedFn(async () => {
        // 删掉临时项目
        await delTemporaryProject()
        fetchProcess(() => {
            onExecute()
        })
    })

    return (
        <YakitHint
            visible={visible}
            heardIcon={loading ? <OutlineLoadingIcon className={styles["icon-rotate-animation"]} /> : undefined}
            title={loading ? t("AllKillEngineConfirm.closing") : title}
            content={content}
            okButtonText={t("AllKillEngineConfirm.closeNow")}
            okButtonProps={{loading: loading}}
            onOk={onOK}
            cancelButtonText={t("AllKillEngineConfirm.later")}
            cancelButtonProps={{loading: loading}}
            onCancel={onCancel}
        />
    )
})
