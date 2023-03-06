import React, {useEffect, useState} from "react"
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
    setInitialed: (b: boolean) => void
}

const {ipcRenderer} = window.require("electron")

export interface CaCertData {
    CaCerts: Uint8Array
    LocalFile: string
}

const MITMFiltersModal = React.lazy(() => import("../MITMServerStartForm/MITMFiltersModal"))
const MITMCertificateDownloadModal = React.lazy(() => import("../MITMServerStartForm/MITMCertificateDownloadModal"))

export const MITMServerHijacking: React.FC<MITMServerHijackingProp> = (props) => {
    const {host, port, addr, status, setStatus, setVisible, setInitialed} = props

    const [caCerts, setCaCerts] = useState<CaCertData>({
        CaCerts: new Buffer(""),
        LocalFile: ""
    })

    // 存储修改前和修改后的包！
    const [currentPacketInfo, setCurrentPacketInfo] = useState<{
        currentPacket: Uint8Array
        currentPacketId: number
        isHttp: boolean
    }>({currentPacketId: 0, currentPacket: new Buffer([]), isHttp: true})
    const {currentPacket, currentPacketId, isHttp} = currentPacketInfo
    const clearCurrentPacket = () => {
        setCurrentPacketInfo({currentPacketId: 0, currentPacket: new Buffer([]), isHttp: true})
    }
    const [modifiedPacket, setModifiedPacket] = useState<Uint8Array>(new Buffer([]))

    // 自动转发 与 劫持响应的自动设置
    const [autoForward, setAutoForward, getAutoForward] = useGetState<"manual" | "log" | "passive">("log")
    const isManual = autoForward === "manual"

    const [hijackAllResponse, setHijackAllResponse] = useState(false) // 劫持所有请求
    const [allowHijackCurrentResponse, setAllowHijackCurrentResponse] = useState(false) // 仅劫持一个请求

    const [forResponse, setForResponse] = useState(false)

    const [urlInfo, setUrlInfo] = useState("监听中...")
    const [ipInfo, setIpInfo] = useState("")

    // 当前正在劫持的请求/响应，是否是 Websocket
    const [currentIsWebsocket, setCurrentIsWebsocket] = useState(false)
    // 当前正在劫持的请求/响应
    const [currentIsForResponse, setCurrentIsForResponse] = useState(false)

    // 内容替代模块
    const [replacers, setReplacers] = useState<MITMContentReplacerRule[]>([])

    // 操作系统类型
    const [system, setSystem] = useState<string>()

    const [downloadVisible, setDownloadVisible] = useState<boolean>(false)
    const [filtersVisible, setFiltersVisible] = useState<boolean>(false)

    useEffect(() => {
        ipcRenderer.invoke("fetch-system-name").then((res) => setSystem(res))
    }, [])

    useEffect(() => {
        if (!!props.enableInitialMITMPlugin && (props?.defaultPlugins || []).length > 0) {
            enableMITMPluginMode(props.defaultPlugins).then(() => {
                info("启动初始 MITM 插件成功")
            })
        }
    }, [props.enableInitialMITMPlugin, props.defaultPlugins])

    useEffect(() => {
        if (hijackAllResponse && currentPacketId > 0) {
            allowHijackedResponseByRequest(currentPacketId)
        }
    }, [hijackAllResponse, currentPacketId])

    useEffect(() => {
        ipcRenderer.on("client-mitm-hijacked", forwardHandler)
        return () => {
            ipcRenderer.removeAllListeners("client-mitm-hijacked")
        }
    }, [autoForward])

    useEffect(() => {
        ipcRenderer.invoke("mitm-auto-forward", !isManual).finally(() => {
            console.info(`设置服务端自动转发：${!isManual}`)
        })
    }, [autoForward])

    useEffect(() => {
        ipcRenderer.on("client-mitm-content-replacer-update", (e, data: MITMResponse) => {
            setReplacers(data?.replacers || [])
            return
        })
        return () => {
            ipcRenderer.removeAllListeners("client-mitm-content-replacer-update")
        }
    }, [])

    useEffect(() => {
        if (currentPacketId <= 0 && status === "hijacked") {
            recover()
            const id = setInterval(() => {
                recover()
            }, 500)
            return () => {
                clearInterval(id)
            }
        }
    }, [currentPacketId])

    useEffect(() => {
        ipcRenderer.invoke("DownloadMITMCert", {}).then((data: CaCertData) => {
            setCaCerts(data)
        })
        return () => {
            ipcRenderer.invoke("mitm-stop-call")
        }
    }, [])

    // const addr = `http://${host}:${port}`;

    // 自动转发劫持，进行的操作
    const forwardHandler = useMemoizedFn((e: any, msg: MITMResponse) => {
        if (msg?.RemoteAddr) {
            setIpInfo(msg?.RemoteAddr)
        } else {
            setIpInfo("")
        }
        setCurrentIsWebsocket(!!msg?.isWebsocket)
        setCurrentIsForResponse(!!msg?.forResponse)

        if (msg.forResponse) {
            if (!msg.response || !msg.responseId) {
                failed("BUG: MITM 错误，未能获取到正确的 Response 或 Response ID")
                return
            }
            if (!isManual) {
                forwardResponse(msg.responseId || 0)
                if (!!currentPacket) {
                    clearCurrentPacket()
                }
            } else {
                setForResponse(true)
                setStatus("hijacked")
                setCurrentPacketInfo({
                    currentPacket: msg.response,
                    currentPacketId: msg.responseId,
                    isHttp: msg.isHttps
                })
            }
        } else {
            if (msg.request) {
                if (!isManual) {
                    forwardRequest(msg.id)
                    if (!!currentPacket) {
                        clearCurrentPacket()
                    }
                    // setCurrentPacket(String.fromCharCode.apply(null, msg.request))
                } else {
                    setStatus("hijacked")
                    setForResponse(false)
                    // setCurrentPacket(msg.request)
                    // setCurrentPacketId(msg.id)
                    setCurrentPacketInfo({currentPacket: msg.request, currentPacketId: msg.id, isHttp: msg.isHttps})
                    setUrlInfo(msg.url)
                    // ipcRenderer.invoke("fetch-url-ip", msg.url.split('://')[1].split('/')[0]).then((res) => {
                    //     setIpInfo(res)
                    // })
                }
            }
        }
    })

    // 这个 Forward 主要用来转发修改后的内容，同时可以转发请求和响应
    const forward = useMemoizedFn(() => {
        // ID 不存在
        if (!currentPacketId) {
            return
        }

        // setLoading(true);
        setStatus("hijacking")
        setAllowHijackCurrentResponse(false)
        setForResponse(false)

        if (forResponse) {
            ipcRenderer.invoke("mitm-forward-modified-response", modifiedPacket, currentPacketId).finally(() => {
                clearCurrentPacket()
                // setTimeout(() => setLoading(false))
            })
        } else {
            ipcRenderer.invoke("mitm-forward-modified-request", modifiedPacket, currentPacketId).finally(() => {
                clearCurrentPacket()
                // setTimeout(() => setLoading(false))
            })
        }
    })

    const stop = useMemoizedFn(() => {
        // setLoading(true)
        ipcRenderer
            .invoke("mitm-stop-call")
            .then(() => {
                handleAutoForward("log")
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

    useEffect(() => {}, [props])

    const handleAutoForward = useMemoizedFn((e: "manual" | "log" | "passive") => {
        try {
            if (!isManual) {
                setHijackAllResponse(false)
            }
            setAutoForward(e)
            if (currentPacket && currentPacketId) {
                forward()
            }
        } catch (e) {
            console.info(e)
        }
    })

    const execFuzzer = useMemoizedFn((value: string) => {
        ipcRenderer.invoke("send-to-tab", {
            type: "fuzzer",
            data: {isHttps: currentPacketInfo.isHttp, request: value}
        })
    })
    const execPlugin = useMemoizedFn((value: string) => {
        ipcRenderer.invoke("send-to-packet-hack", {
            request: currentPacketInfo.currentPacket,
            ishttps: currentPacketInfo.isHttp
        })
    })

    // 快捷键切换模式
    const shiftAutoForwardHotkey = useHotkeys(
        "ctrl+t",
        () => {
            handleAutoForward(isManual ? "manual" : "log")
        },
        [autoForward]
    )
    return (
        <div className={style["mitm-server"]}>
            <div className={style["mitm-server-heard"]}>
                <div className={style["mitm-server-title"]}>
                    <div className={style["mitm-server-heard-name"]}>劫持 HTTP Request</div>
                    <div className={style["mitm-server-heard-addr"]}>{addr}</div>
                </div>
                <div className={style["mitm-server-extra"]}>
                    <div className={style["mitm-server-spans"]}>
                        <span onClick={() => props.setVisible(true)}>规则配置</span>
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
                        <ChromeLauncherButton isStartMITM={true} />
                    </div>
                    <div className={style["mitm-server-quit-icon"]}>
                        <QuitIcon onClick={() => stop()} />
                    </div>
                </div>
            </div>
            <Divider style={{margin: "8px 0"}} />
            <div className={style["mitm-server-body"]}>
                <MITMServer status={"hijacking"} setStatus={setStatus} />
            </div>
            <React.Suspense fallback={<div>loading...</div>}>
                <MITMFiltersModal visible={filtersVisible} setVisible={setFiltersVisible} isStartMITM={false} />
                <MITMCertificateDownloadModal visible={downloadVisible} setVisible={setDownloadVisible} />
            </React.Suspense>
        </div>
    )
}

const dropRequest = (id: number) => {
    return ipcRenderer.invoke("mitm-drop-request", id)
}

const dropResponse = (id: number) => {
    return ipcRenderer.invoke("mitm-drop-response", id)
}

const forwardRequest = (id: number) => {
    return ipcRenderer.invoke("mitm-forward-request", id)
}

const forwardResponse = (id: number) => {
    return ipcRenderer.invoke("mitm-forward-response", id)
}

const allowHijackedResponseByRequest = (id: number) => {
    return ipcRenderer.invoke("mitm-hijacked-current-response", id)
}

export const enableMITMPluginMode = (initPluginNames?: string[]) => {
    return ipcRenderer.invoke("mitm-enable-plugin-mode", initPluginNames)
}

const recover = () => {
    ipcRenderer.invoke("mitm-recover").then(() => {
        // success("恢复 MITM 会话成功")
    })
}
