import React, {Ref, useEffect, useState} from "react"
import {Divider, Modal, notification, Typography} from "antd"
import ChromeLauncherButton from "@/pages/mitm/MITMChromeLauncher"
import {failed, info} from "@/utils/notification"
import {useHotkeys} from "react-hotkeys-hook"
import {useGetState, useLatest, useMemoizedFn} from "ahooks"
import {ExecResultLog} from "@/pages/invoker/batch/ExecMessageViewer"
import {StatusCardProps} from "@/pages/yakitStore/viewers/base"
import {MITMFilterSchema} from "@/pages/mitm/MITMServerStartForm/MITMFilters"
import {ExecResult} from "@/pages/invoker/schema"
import {ExtractExecResultMessage} from "@/components/yakitLogSchema"
import {MITMResponse, MITMServer} from "@/pages/mitm/MITMPage"
import {showConfigSystemProxyForm} from "@/utils/ConfigSystemProxy"
import {MITMContentReplacerRule} from "../MITMRule/MITMRuleType"
import style from "./MITMServerHijacking.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {QuitIcon} from "@/assets/newIcon"

type MITMStatus = "hijacking" | "hijacked" | "idle"
const {Text} = Typography

export interface MITMServerHijackingProp {
    addr: string
    host: string
    port: number
    status: MITMStatus
    enableInitialMITMPlugin?: boolean
    defaultPlugins?: string[]
    setStatus: (status: MITMStatus) => any
    onLoading?: (loading: boolean) => any
    setVisible: (b: boolean) => void
    logs: ExecResultLog[]
    statusCards: StatusCardProps[]
}

const {ipcRenderer} = window.require("electron")

export interface CaCertData {
    CaCerts: Uint8Array
    LocalFile: string
}

const MITMFiltersModal = React.lazy(() => import("../MITMServerStartForm/MITMFiltersModal"))
const MITMCertificateDownloadModal = React.lazy(() => import("../MITMServerStartForm/MITMCertificateDownloadModal"))

export const MITMServerHijacking: React.FC<MITMServerHijackingProp> = (props) => {
    const {host, port, addr, status, setStatus, setVisible, logs, statusCards} = props

    const [downloadVisible, setDownloadVisible] = useState<boolean>(false)
    const [filtersVisible, setFiltersVisible] = useState<boolean>(false)

    useEffect(() => {
        if (!!props.enableInitialMITMPlugin && (props?.defaultPlugins || []).length > 0) {
            enableMITMPluginMode(props.defaultPlugins).then(() => {
                info("启动初始 MITM 插件成功")
            })
        }
    }, [props.enableInitialMITMPlugin, props.defaultPlugins])
    const stop = useMemoizedFn(() => {
        // setLoading(true)
        ipcRenderer
            .invoke("mitm-stop-call")
            .then(() => {
                setStatus("idle")
            })
            .catch((e: any) => {
                notification["error"]({message: `停止中间人劫持失败：${e}`})
            })
            .finally(() =>
                setTimeout(() => {
                    // setLoading(false)
                }, 300)
            )
    })
    return (
        <div className={style["mitm-server"]}>
            <div className={style["mitm-server-heard"]}>
                <div className={style["mitm-server-title"]}>
                    <div className={style["mitm-server-heard-name"]}>劫持 HTTP Request</div>
                    <div className={style["mitm-server-heard-addr"]}>{addr}</div>
                </div>
                <div className={style["mitm-server-extra"]}>
                    <div className={style["mitm-server-spans"]}>
                        <span onClick={() => setVisible(true)}>规则配置</span>
                        <Divider type='vertical' style={{margin: "0 4px"}} />
                        <span onClick={() => setFiltersVisible(true)}>过滤器</span>
                        <Divider type='vertical' style={{margin: "0 4px"}} />
                        <span onClick={() => setDownloadVisible(true)}>证书下载</span>
                    </div>
                    <YakitButton
                        onClick={() => {
                            showConfigSystemProxyForm(`${host === "0.0.0.0" ? "127.0.0.1" : host}:${port}`)
                        }}
                        type='outline2'
                    >
                        系统代理
                    </YakitButton>
                    <div className={style["mitm-server-chrome"]}>
                        <ChromeLauncherButton isStartMITM={true} host={host} port={port} />
                    </div>
                    <div className={style["mitm-server-quit-icon"]}>
                        <QuitIcon onClick={() => stop()} />
                    </div>
                </div>
            </div>
            <Divider style={{margin: "8px 0"}} />
            <div className={style["mitm-server-body"]}>
                <MITMServer status={status} setStatus={setStatus} logs={logs} statusCards={statusCards} />
            </div>
            <React.Suspense fallback={<div>loading...</div>}>
                <MITMFiltersModal visible={filtersVisible} setVisible={setFiltersVisible} isStartMITM={true} />
                <MITMCertificateDownloadModal visible={downloadVisible} setVisible={setDownloadVisible} />
            </React.Suspense>
        </div>
    )
}

export const enableMITMPluginMode = (initPluginNames?: string[]) => {
    return ipcRenderer.invoke("mitm-enable-plugin-mode", initPluginNames)
}
