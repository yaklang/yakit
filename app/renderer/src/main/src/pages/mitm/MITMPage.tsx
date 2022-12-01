import React, {Ref, useEffect, useRef, useState} from "react"
import {
    Alert,
    Button,
    Checkbox,
    Col,
    Form,
    Modal,
    notification,
    PageHeader,
    Row,
    Space,
    Spin,
    Tag,
    Tooltip,
    Typography
} from "antd"
import {failed, info, success} from "../../utils/notification"
import {CheckOutlined, CopyOutlined, PoweroffOutlined, ReloadOutlined} from "@ant-design/icons"
import {HTTPPacketEditor, YakEditor} from "../../utils/editors"
import {MITMFilters, MITMFilterSchema} from "./MITMFilters"
import {showDrawer, showModal} from "../../utils/showModal"
import {MITMHTTPFlowMiniTableCard} from "./MITMHTTPFlowMiniTableCard"
import {ExecResult} from "../invoker/schema"
import {ExecResultLog} from "../invoker/batch/ExecMessageViewer"
import {ExtractExecResultMessage} from "../../components/yakitLogSchema"
import {YakExecutorParam} from "../invoker/YakExecutorParams"
import "./MITMPage.css"
import {CopyableField, SelectOne} from "../../utils/inputUtil"
import {useGetState, useInViewport, useLatest, useMemoizedFn} from "ahooks"
import {StatusCardProps} from "../yakitStore/viewers/base"
import {useHotkeys} from "react-hotkeys-hook"
import * as monaco from "monaco-editor"
import CopyToClipboard from "react-copy-to-clipboard"
import {AutoCard} from "../../components/AutoCard"
import {ResizeBox} from "../../components/ResizeBox"
import {MITMPluginLogViewer} from "./MITMPluginLogViewer"
import {MITMPluginList} from "./MITMPluginList"
import {saveABSFileToOpen} from "../../utils/openWebsite"
import {MITMContentReplacer, MITMContentReplacerRule} from "./MITMContentReplacer"
import {ChromeLauncherButton} from "./MITMChromeLauncher"
import {ClientCertificate, MITMServerStartForm} from "@/pages/mitm/MITMServerStartForm"
import {MITMServerHijacking} from "@/pages/mitm/MITMServerHijacking"
import {Uint8ArrayToString} from "@/utils/str"
import {MITMRule} from "./MITMRule/MITMRule"

const {Text} = Typography
const {Item} = Form
const {ipcRenderer} = window.require("electron")

export interface MITMPageProp {}

export interface MITMResponse extends MITMFilterSchema {
    isHttps: boolean
    request: Uint8Array
    url: string
    RemoteAddr?: string
    id: number

    forResponse?: boolean
    response?: Uint8Array
    responseId?: number

    justContentReplacer?: boolean
    replacers?: MITMContentReplacerRule[]

    isWebsocket?: boolean
}

export const CONST_DEFAULT_ENABLE_INITIAL_PLUGIN = "CONST_DEFAULT_ENABLE_INITIAL_PLUGIN"

export const MITMPage: React.FC<MITMPageProp> = (props) => {
    // 整体的劫持状态
    const [status, setStatus] = useState<"idle" | "hijacked" | "hijacking">("idle")

    const [loading, setLoading] = useState(false)

    // 通过启动表单的内容
    const [addr, setAddr] = useState("")
    const [host, setHost] = useState("127.0.0.1")
    const [port, setPort] = useState(8083)
    const [enableInitialMITMPlugin, setEnableInitialMITMPlugin] = useState(false)
    const [defaultPlugins, setDefaultPlugins] = useState<string[]>([])

    // 检测当前劫持状态
    useEffect(() => {
        // 用于启动 MITM 开始之后，接受开始成功之后的第一个消息，如果收到，则认为说 MITM 启动成功了
        ipcRenderer.on("client-mitm-start-success", () => {
            setStatus("hijacking")
            setTimeout(() => {
                setLoading(false)
            }, 300)
        })

        // 加载状态(从服务端加载)
        ipcRenderer.on("client-mitm-loading", (_, flag: boolean) => {
            setLoading(flag)
        })

        ipcRenderer.on("client-mitm-notification", (_, i: Uint8Array) => {
            try {
                info(Uint8ArrayToString(i))
            } catch (e) {}
        })

        return () => {
            ipcRenderer.removeAllListeners("client-mitm-start-success")
            ipcRenderer.removeAllListeners("client-mitm-loading")
            ipcRenderer.removeAllListeners("client-mitm-notification")
        }
    }, [])

    // 通过 gRPC 调用，启动 MITM 劫持
    const startMITMServer = useMemoizedFn(
        (targetHost, targetPort, downstreamProxy, enableHttp2, certs: ClientCertificate[]) => {
            setLoading(true)
            return ipcRenderer
                .invoke("mitm-start-call", targetHost, targetPort, downstreamProxy, enableHttp2, certs)
                .catch((e: any) => {
                    notification["error"]({message: `启动中间人劫持失败：${e}`})
                })
        }
    )

    // 设置开始服务器处理函数
    const startMITMServerHandler = useMemoizedFn(
        (host, port, downstreamProxy, enableInitialPlugin, plugins, enableHttp2, certs: ClientCertificate[]) => {
            setAddr(`https://${host}:${port}`)
            setHost(host)
            setPort(port)
            setLoading(true)
            setDefaultPlugins(plugins)
            setEnableInitialMITMPlugin(enableInitialPlugin)
            startMITMServer(host, port, downstreamProxy, enableHttp2, certs)
        }
    )

    // 开始渲染组件
    // if (!initialed) {
    //     return <div style={{textAlign: "center", paddingTop: 120}}>
    //         <Spin spinning={true} tip={"正在初始化 MITM"}/>
    //     </div>
    // }

    // 在没有开始的时候，渲染任务表单
    // if (status === "idle") {
    //     return <MITMServerStartForm onStartMITMServer={startMITMServerHandler} />
    // }
    const [visible, setVisible] = useState<boolean>(false)
    const [top, setTop] = useState<number>(0)
    const mitmPageRef = useRef<any>()
    const [inViewport] = useInViewport(mitmPageRef)
    useEffect(() => {
        if (!mitmPageRef.current) return
        const client = mitmPageRef.current.getBoundingClientRect()
        setTop(client.top)
    }, [mitmPageRef])
    return (
        <>
            <div className='mitm-page' ref={mitmPageRef}>
                {/* status === "idle" 在没有开始的时候，渲染任务表单 */}
                {(status === "idle" && (
                    <MITMServerStartForm onStartMITMServer={startMITMServerHandler} setVisible={setVisible} />
                )) || (
                    <MITMServerHijacking
                        port={port}
                        addr={addr}
                        host={host}
                        status={status}
                        setStatus={setStatus}
                        defaultPlugins={defaultPlugins}
                        enableInitialMITMPlugin={enableInitialMITMPlugin}
                    />
                )}
            </div>
            <MITMRule visible={visible && !!inViewport} setVisible={setVisible} top={top} />
        </>
    )
}
