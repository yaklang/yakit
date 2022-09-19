import React, {Ref, useEffect, useMemo, useState} from "react"
import {
    Alert,
    Button,
    Checkbox,
    Col,
    Dropdown,
    Menu,
    Modal,
    notification,
    PageHeader,
    Row,
    Space,
    Tag,
    Tooltip,
    Typography
} from "antd"
import {ChromeLauncherButton} from "@/pages/mitm/MITMChromeLauncher"
import {CheckOutlined, CopyOutlined, PoweroffOutlined, ReloadOutlined} from "@ant-design/icons"
import {failed, info, success} from "@/utils/notification"
import {CopyableField, SelectOne} from "@/utils/inputUtil"
import CopyToClipboard from "react-copy-to-clipboard"
import {ResizeBox} from "@/components/ResizeBox"
import {MITMPluginList} from "@/pages/mitm/MITMPluginList"
import {YakExecutorParam} from "@/pages/invoker/YakExecutorParams"
import {AutoCard} from "@/components/AutoCard"
import {MITMHTTPFlowMiniTableCard} from "@/pages/mitm/MITMHTTPFlowMiniTableCard"
import {HTTPPacketEditor, YakEditor} from "@/utils/editors"
import * as monaco from "monaco-editor"
import {MITMPluginLogViewer} from "@/pages/mitm/MITMPluginLogViewer"
import {useHotkeys} from "react-hotkeys-hook"
import {useGetState, useLatest, useMemoizedFn} from "ahooks"
import {ExecResultLog} from "@/pages/invoker/batch/ExecMessageViewer"
import {StatusCardProps} from "@/pages/yakitStore/viewers/base"
import {MITMFilters, MITMFilterSchema} from "@/pages/mitm/MITMFilters"
import {MITMContentReplacer, MITMContentReplacerRule} from "@/pages/mitm/MITMContentReplacer"
import {ExecResult} from "@/pages/invoker/schema"
import {ExtractExecResultMessage} from "@/components/yakitLogSchema"
import {showDrawer, showModal} from "@/utils/showModal"
import {saveABSFileToOpen} from "@/utils/openWebsite"
import {MITMResponse} from "@/pages/mitm/MITMPage"
import {showConfigSystemProxyForm} from "@/utils/ConfigSystemProxy"

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
}

const {ipcRenderer} = window.require("electron")

interface CaCertData {
    CaCerts: Uint8Array
    LocalFile: string
}

export const MITMServerHijacking: React.FC<MITMServerHijackingProp> = (props) => {
    const {host, port, addr, status, setStatus} = props

    const [error, setError] = useState("")
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
    const [initialed, setInitialed] = useState(false)
    const [forResponse, setForResponse] = useState(false)

    const [urlInfo, setUrlInfo] = useState("监听中...")
    const [ipInfo, setIpInfo] = useState("")

    // 当前正在劫持的请求/响应，是否是 Websocket
    const [currentIsWebsocket, setCurrentIsWebsocket] = useState(false)
    // 当前正在劫持的请求/响应
    const [currentIsForResponse, setCurrentIsForResponse] = useState(false)

    // yakit log message
    const [logs, setLogs] = useState<ExecResultLog[]>([])
    const latestLogs = useLatest<ExecResultLog[]>(logs)
    const [_, setLatestStatusHash, getLatestStatusHash] = useGetState("")
    const [statusCards, setStatusCards] = useState<StatusCardProps[]>([])

    // filter 过滤器
    const [_mitmFilter, setMITMFilter, getMITMFilter] = useGetState<MITMFilterSchema>()

    // 内容替代模块
    const [replacers, setReplacers] = useState<MITMContentReplacerRule[]>([])

    // 操作系统类型
    const [system, setSystem] = useState<string>()

    useEffect(() => {
        ipcRenderer.invoke("fetch-system-name").then((res) => setSystem(res))
    }, [])

    // 用于接受后端传回的信息
    useEffect(() => {
        setInitialed(false)

        // 用于前端恢复状态，第一次打开不太需要恢复，退出的话直接关掉就好
        // ipcRenderer.invoke("mitm-have-current-stream").then(data => {
        //     const {haveStream, host, port} = data;
        //     if (haveStream) {
        //         setStatus("hijacking")
        //         setHost(host);
        //         setPort(port);
        //     }
        // }).finally(() => {
        //     recover()
        //     setTimeout(() => setInitialed(true), 500)
        // })

        // 用于 MITM 的 Message （YakitLog）
        const messages: ExecResultLog[] = []
        const statusMap = new Map<string, StatusCardProps>()
        let lastStatusHash = ""
        ipcRenderer.on("client-mitm-message", (e, data: ExecResult) => {
            let msg = ExtractExecResultMessage(data)
            if (msg !== undefined) {
                // logHandler.logs.push(msg as ExecResultLog)
                // if (logHandler.logs.length > 25) {
                //     logHandler.logs.shift()
                // }
                const currentLog = msg as ExecResultLog
                if (currentLog.level === "feature-status-card-data") {
                    lastStatusHash = `${currentLog.timestamp}-${currentLog.data}`

                    try {
                        // 解析 Object
                        const obj = JSON.parse(currentLog.data)
                        const {id, data} = obj
                        if (!data) {
                            statusMap.delete(`${id}`)
                        } else {
                            statusMap.set(`${id}`, {Data: data, Id: id, Timestamp: currentLog.timestamp})
                        }
                    } catch (e) {}
                    return
                }
                messages.push(currentLog)
                if (messages.length > 25) {
                    messages.shift()
                }
            }
        })

        // let currentFlow: HTTPFlow[] = []
        ipcRenderer.on("client-mitm-history-update", (e: any, data: any) => {
            // currentFlow.push(data.historyHTTPFlow as HTTPFlow)
            //
            // if (currentFlow.length > 30) {
            //     currentFlow = [...currentFlow.slice(0, 30)]
            // }
            // setFlows([...currentFlow])
        })

        ipcRenderer.on("client-mitm-error", (e, msg) => {
            if (!msg) {
                info("MITM 劫持服务器已关闭")
            } else {
                failed("MITM 劫持服务器异常或被关闭")
                Modal.error({
                    mask: true,
                    title: "启动 MITM 服务器 ERROR!",
                    content: <>{msg}</>
                })
            }
            ipcRenderer.invoke("mitm-stop-call")
            setError(`${msg}`)
            setStatus("idle")
        })
        ipcRenderer.on("client-mitm-filter", (e, msg) => {
            info("更新 MITM 过滤器状态")
            setMITMFilter({
                includeSuffix: msg.includeSuffix,
                excludeMethod: msg.excludeMethod,
                excludeSuffix: msg.excludeSuffix,
                includeHostname: msg.includeHostname,
                excludeHostname: msg.excludeHostname,
                excludeContentTypes: msg.excludeContentTypes
            })
        })

        const updateLogs = () => {
            if (latestLogs.current.length !== messages.length) {
                setLogs([...messages])
                return
            }

            if (latestLogs.current.length > 0 && messages.length > 0) {
                if (latestLogs.current[0].data !== messages[0].data) {
                    setLogs([...messages])
                    return
                }
            }

            if (getLatestStatusHash() !== lastStatusHash) {
                setLatestStatusHash(lastStatusHash)

                const tmpCurrent: StatusCardProps[] = []
                statusMap.forEach((value, key) => {
                    tmpCurrent.push(value)
                })
                setStatusCards(tmpCurrent.sort((a, b) => a.Id.localeCompare(b.Id)))
            }
        }
        updateLogs()
        let id = setInterval(() => {
            updateLogs()
        }, 1000)

        return () => {
            clearInterval(id)
            ipcRenderer.removeAllListeners("client-mitm-error")
            ipcRenderer.removeAllListeners("client-mitm-filter")
            ipcRenderer.removeAllListeners("client-mitm-history-update")
            ipcRenderer.removeAllListeners("client-mitm-message")
            // ipcRenderer.invoke("mitm-close-stream")
        }
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

    const hijacking = useMemoizedFn(() => {
        // setCurrentPacket(new Buffer([]));
        clearCurrentPacket()
        // setLoading(true);
        setStatus("hijacking")
    })

    useEffect(() => {}, [props])

    function getCurrentId() {
        return currentPacketId
    }

    const downloadCert = useMemoizedFn(() => {
        return (
            <Tooltip title={"请先下载 SSL/TLS 证书"}>
                <Button
                    type={"link"}
                    style={{padding: "4px 6px"}}
                    onClick={() => {
                        const text = `wget -e use_proxy=yes -e http_proxy=${addr} http://download-mitm-cert.yaklang.io -O yakit-mitm-cert.pem`
                        showModal({
                            title: "下载 SSL/TLS 证书以劫持 HTTPS",
                            width: "50%",
                            content: (
                                <Space direction={"vertical"} style={{width: "100%"}}>
                                    <AutoCard
                                        title={"证书配置"}
                                        extra={
                                            <Button
                                                type={"link"}
                                                onClick={() => {
                                                    saveABSFileToOpen("yakit证书.crt.pem", caCerts.CaCerts)
                                                    // openABSFileLocated(caCerts.LocalFile)
                                                }}
                                            >
                                                下载到本地并打开
                                            </Button>
                                        }
                                        size={"small"}
                                        bodyStyle={{padding: 0}}
                                    >
                                        <div style={{height: 360}}>
                                            <YakEditor bytes={true} valueBytes={caCerts.CaCerts} />
                                        </div>
                                    </AutoCard>
                                    <Alert
                                        message={
                                            <Space>
                                                在设置代理后访问：
                                                <CopyableField text={"http://download-mitm-cert.yaklang.io"} />{" "}
                                                可自动下载证书
                                            </Space>
                                        }
                                    />
                                </Space>
                            )
                        })
                    }}
                >
                    HTTPS 证书配置
                </Button>
            </Tooltip>
        )
    })

    const contentReplacer = useMemoizedFn(() => {
        return (
            <Button
                type={"link"}
                style={{padding: `4px 6px`}}
                onClick={() => {
                    let m = showDrawer({
                        placement: "top",
                        height: "50%",
                        content: (
                            <MITMContentReplacer
                                rules={replacers}
                                onSaved={(rules) => {
                                    setReplacers(rules)
                                    m.destroy()
                                }}
                            />
                        ),
                        maskClosable: false
                    })
                }}
            >
                标记 / 替换流量规则
            </Button>
        )
    })

    const setFilter = () => {
        return (
            <Button
                type={"link"}
                style={{padding: "4px 6px"}}
                onClick={() => {
                    let m = showDrawer({
                        placement: "top",
                        height: "50%",
                        content: (
                            <>
                                <MITMFilters
                                    filter={getMITMFilter()}
                                    onFinished={(filter) => {
                                        m.destroy()
                                    }}
                                    onClosed={() => {
                                        m.destroy()
                                    }}
                                />
                            </>
                        )
                    })
                }}
            >
                过滤劫持流量
            </Button>
        )
    }

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
        <div style={{height: "100%", width: "100%"}}>
            <div
                id={"mitm-hijacking-container"}
                ref={shiftAutoForwardHotkey as Ref<any>}
                tabIndex={-1}
                style={{marginLeft: 12, marginRight: 12, height: "100%"}}
            >
                <Row gutter={14} style={{height: "100%"}}>
                    <Col style={{display: "flex", flexDirection: "column", height: "100%", width: "100%"}}>
                        <PageHeader
                            className='mitm-header-title'
                            title={"劫持 HTTP Request"}
                            subTitle={addr}
                            style={{marginRight: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 8}}
                            extra={
                                <Space>
                                    <Button
                                        onClick={() => {
                                            showConfigSystemProxyForm(
                                                `${host === "0.0.0.0" ? "127.0.0.1" : host}:${port}`
                                            )
                                        }}
                                    >
                                        系统代理
                                    </Button>
                                    <ChromeLauncherButton host={host} port={port} />
                                    <Dropdown
                                        overlay={
                                            <Space direction={"vertical"}>
                                                {contentReplacer()}
                                                {setFilter()}
                                            </Space>
                                        }
                                    >
                                        <Button type={"link"}>过滤 / 替换流量</Button>
                                    </Dropdown>
                                    {downloadCert()}
                                    <Button
                                        danger={true}
                                        type={"link"}
                                        onClick={() => {
                                            stop()
                                            setUrlInfo("监听中...")
                                            setIpInfo("")
                                        }}
                                        icon={<PoweroffOutlined />}
                                    />
                                </Space>
                            }
                        >
                            <Row>
                                <Col span={12}>
                                    <div style={{width: "100%", textAlign: "left"}}>
                                        <Space>
                                            <Button
                                                type={"primary"}
                                                disabled={status === "hijacking"}
                                                onClick={() => {
                                                    forward()
                                                }}
                                            >
                                                提交数据
                                            </Button>
                                            <Button
                                                disabled={status === "hijacking"}
                                                danger={true}
                                                onClick={() => {
                                                    hijacking()
                                                    if (forResponse) {
                                                        dropResponse(currentPacketId).finally(() => {
                                                            setTimeout(() => {
                                                                // setLoading(false)
                                                            }, 300)
                                                        })
                                                    } else {
                                                        dropRequest(currentPacketId).finally(() => {
                                                            // setTimeout(() => setLoading(false), 300)
                                                        })
                                                    }
                                                    setUrlInfo("监听中...")
                                                    setIpInfo("")
                                                }}
                                            >
                                                丢弃请求
                                            </Button>
                                            {!forResponse &&
                                                !!currentPacket && // 劫持到的请求有内容
                                                status === "hijacked" && // 劫持到的状态是 hijacked
                                                !hijackAllResponse && ( // 如果已经设置了劫持所有请求，就不展示了
                                                    <Button
                                                        disabled={allowHijackCurrentResponse}
                                                        type={allowHijackCurrentResponse ? "primary" : "default"}
                                                        onClick={() => {
                                                            if (!allowHijackCurrentResponse) {
                                                                allowHijackedResponseByRequest(currentPacketId)
                                                                setAllowHijackCurrentResponse(true)
                                                            } else {
                                                                setAllowHijackCurrentResponse(false)
                                                            }
                                                        }}
                                                    >
                                                        劫持响应 {allowHijackCurrentResponse && <CheckOutlined />}
                                                    </Button>
                                                )}
                                        </Space>
                                    </div>
                                </Col>
                                <Col span={12}>
                                    <div style={{width: "100%", textAlign: "right"}}>
                                        <Space>
                                            {isManual && (
                                                <div>
                                                    <span style={{marginRight: 4}}>劫持响应:</span>
                                                    <Checkbox
                                                        checked={hijackAllResponse}
                                                        onClick={(e) => {
                                                            if (!hijackAllResponse) {
                                                                info("劫持所有响应内容")
                                                            } else {
                                                                info("仅劫持请求")
                                                            }
                                                            setHijackAllResponse(!hijackAllResponse)
                                                        }}
                                                    />
                                                </div>
                                            )}
                                            <SelectOne
                                                data={[
                                                    {text: "手动劫持", value: "manual"},
                                                    {text: "自动放行", value: "log"},
                                                    {text: "被动日志", value: "passive"}
                                                ]}
                                                value={autoForward}
                                                formItemStyle={{marginBottom: 0}}
                                                setValue={(e) => {
                                                    handleAutoForward(e)
                                                }}
                                            />
                                        </Space>
                                    </div>
                                </Col>
                            </Row>
                            <Row>
                                <Col span={12}>
                                    <div
                                        style={{
                                            width: "100%",
                                            textAlign: "left",
                                            height: "100%",
                                            display: "flex"
                                        }}
                                    >
                                        {!isManual && (
                                            <Text style={{alignSelf: "center"}}>{`目标：自动放行中...`}</Text>
                                        )}

                                        {autoForward === "manual" && (
                                            <>
                                                <Text
                                                    title={urlInfo}
                                                    ellipsis={true}
                                                    style={{
                                                        alignSelf: "center",
                                                        maxWidth: 300
                                                    }}
                                                >
                                                    {status === "hijacking" ? "目标：监听中..." : `目标：${urlInfo}`}
                                                </Text>
                                                {ipInfo && status !== "hijacking" && (
                                                    <Tag
                                                        color='green'
                                                        title={ipInfo}
                                                        style={{
                                                            marginLeft: 5,
                                                            alignSelf: "center",
                                                            maxWidth: 140,
                                                            cursor: "pointer"
                                                        }}
                                                    >
                                                        {`${ipInfo}`}
                                                        <CopyToClipboard
                                                            text={`${ipInfo}`}
                                                            onCopy={(text, ok) => {
                                                                if (ok) success("已复制到粘贴板")
                                                            }}
                                                        >
                                                            <CopyOutlined style={{marginLeft: 5}} />
                                                        </CopyToClipboard>
                                                    </Tag>
                                                )}
                                                {currentIsWebsocket && status !== "hijacking" ? (
                                                    <Tag
                                                        color={"red"}
                                                        style={{
                                                            marginLeft: 5,
                                                            alignSelf: "center",
                                                            maxWidth: 140,
                                                            cursor: "pointer"
                                                        }}
                                                    >
                                                        Websocket {currentIsForResponse ? "响应" : "请求"}
                                                    </Tag>
                                                ) : currentIsForResponse && status !== "hijacking" ? (
                                                    <Tag
                                                        color={"geekblue"}
                                                        style={{
                                                            marginLeft: 5,
                                                            alignSelf: "center",
                                                            maxWidth: 140,
                                                            cursor: "pointer"
                                                        }}
                                                    >
                                                        HTTP 响应
                                                    </Tag>
                                                ) : (
                                                    <Tag
                                                        color={"geekblue"}
                                                        style={{
                                                            marginLeft: 5,
                                                            alignSelf: "center",
                                                            maxWidth: 140,
                                                            cursor: "pointer"
                                                        }}
                                                    >
                                                        HTTP 请求
                                                    </Tag>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </Col>
                                <Col span={12}>
                                    <div style={{width: "100%", textAlign: "right"}}>
                                        <Button type={"link"} onClick={() => recover()} icon={<ReloadOutlined />}>
                                            恢复请求
                                        </Button>
                                    </div>
                                </Col>
                            </Row>
                        </PageHeader>
                        <div style={{flex: 1, overflowY: "hidden"}}>
                            <div style={{height: "100%"}}>
                                <ResizeBox
                                    isVer={false}
                                    firstNode={
                                        <MITMPluginList
                                            proxy={`http://${host}:${port}`}
                                            downloadCertNode={downloadCert}
                                            setFilterNode={setFilter}
                                            onExit={() => {
                                                stop()
                                            }}
                                            onSubmitScriptContent={(e) => {
                                                ipcRenderer.invoke("mitm-exec-script-content", e)
                                            }}
                                            onSubmitYakScriptId={(id: number, params: YakExecutorParam[]) => {
                                                info(`加载 MITM 插件[${id}]`)
                                                ipcRenderer.invoke("mitm-exec-script-by-id", id, params)
                                            }}
                                        />
                                    }
                                    firstMinSize={"330px"}
                                    secondMinSize={"340px"}
                                    firstRatio={"330px"}
                                    secondNode={
                                        <AutoCard
                                            style={{margin: 0, padding: 0}}
                                            bodyStyle={{margin: 0, padding: 0, overflowY: "hidden"}}
                                        >
                                            {autoForward === "log" && <MITMHTTPFlowMiniTableCard />}
                                            {autoForward === "manual" && (
                                                <HTTPPacketEditor
                                                    originValue={currentPacket}
                                                    noHeader={true}
                                                    isResponse={new Buffer(currentPacket.subarray(0, 5))
                                                        .toString("utf8")
                                                        .startsWith("HTTP/")}
                                                    bordered={false}
                                                    onChange={setModifiedPacket}
                                                    noPacketModifier={true}
                                                    readOnly={status === "hijacking"}
                                                    refreshTrigger={
                                                        (forResponse ? `rsp` : `req`) + `${currentPacketId}`
                                                    }
                                                    actions={[
                                                        // {
                                                        //     id: "send-to-scan-packet", label: "发送到数据包扫描器",
                                                        //     run: e => {
                                                        //         // console.info(mouseState)
                                                        //         scanPacket(mouseState, false, "GET / HTTP/1.1\r\nHost: www.baidu.com", "")
                                                        //     }, contextMenuGroupId: "Scanners",
                                                        // },
                                                        ...(forResponse
                                                            ? [
                                                                  {
                                                                      id: "trigger-auto-hijacked",
                                                                      label: "切换为自动劫持模式",
                                                                      keybindings: [
                                                                          monaco.KeyMod.Shift |
                                                                              (system === "Darwin"
                                                                                  ? monaco.KeyMod.WinCtrl
                                                                                  : monaco.KeyMod.CtrlCmd) |
                                                                              monaco.KeyCode.KEY_T
                                                                      ],
                                                                      run: () => {
                                                                          handleAutoForward(
                                                                              getAutoForward() === "manual"
                                                                                  ? "log"
                                                                                  : "manual"
                                                                          )
                                                                      },
                                                                      contextMenuGroupId: "Actions"
                                                                  },
                                                                  {
                                                                      id: "forward-response",
                                                                      label: "放行该 HTTP Response",
                                                                      run: function () {
                                                                          forward()
                                                                          // hijacking()
                                                                          // forwardResponse(getCurrentId()).finally(() => {
                                                                          //     setTimeout(() => setLoading(false), 300)
                                                                          // })
                                                                      },
                                                                      contextMenuGroupId: "Actions"
                                                                  },
                                                                  {
                                                                      id: "drop-response",
                                                                      label: "丢弃该 HTTP Response",
                                                                      run: function () {
                                                                          hijacking()
                                                                          dropResponse(getCurrentId()).finally(() => {
                                                                              // setTimeout(
                                                                              //     () => setLoading(false),
                                                                              //     300
                                                                              // )
                                                                          })
                                                                      },
                                                                      contextMenuGroupId: "Actions"
                                                                  }
                                                              ]
                                                            : [
                                                                  {
                                                                      id: "trigger-auto-hijacked",
                                                                      label: "切换为自动劫持模式",
                                                                      keybindings: [
                                                                          monaco.KeyMod.Shift |
                                                                              (system === "Darwin"
                                                                                  ? monaco.KeyMod.WinCtrl
                                                                                  : monaco.KeyMod.CtrlCmd) |
                                                                              monaco.KeyCode.KEY_T
                                                                      ],
                                                                      run: () => {
                                                                          handleAutoForward(
                                                                              getAutoForward() === "manual"
                                                                                  ? "log"
                                                                                  : "manual"
                                                                          )
                                                                      },
                                                                      contextMenuGroupId: "Actions"
                                                                  },
                                                                  {
                                                                      id: "send-to-fuzzer",
                                                                      label: "发送到 Web Fuzzer",
                                                                      keybindings: [
                                                                          monaco.KeyMod.Shift |
                                                                              (system === "Darwin"
                                                                                  ? monaco.KeyMod.WinCtrl
                                                                                  : monaco.KeyMod.CtrlCmd) |
                                                                              monaco.KeyCode.KEY_R
                                                                      ],
                                                                      run: function (StandaloneEditor: any) {
                                                                          execFuzzer(
                                                                              StandaloneEditor.getModel().getValue()
                                                                          )
                                                                      },
                                                                      contextMenuGroupId: "Actions"
                                                                  },
                                                                  // {
                                                                  //     id: "send-to-plugin",
                                                                  //     label: "发送到 数据包扫描",
                                                                  //     keybindings: [
                                                                  //         monaco.KeyMod.Shift |
                                                                  //         (system === "Darwin" ? monaco.KeyMod.WinCtrl : monaco.KeyMod.CtrlCmd) |
                                                                  //         monaco.KeyCode.KEY_E
                                                                  //     ],
                                                                  //     run: function (StandaloneEditor: any) {
                                                                  //         if (!StandaloneEditor.getModel().getValue()) return
                                                                  //         execPlugin(StandaloneEditor.getModel().getValue())
                                                                  //     },
                                                                  //     contextMenuGroupId: "Actions"
                                                                  // },
                                                                  {
                                                                      id: "forward-response",
                                                                      label: "放行该 HTTP Request",
                                                                      keybindings: [
                                                                          monaco.KeyMod.Shift |
                                                                              (system === "Darwin"
                                                                                  ? monaco.KeyMod.WinCtrl
                                                                                  : monaco.KeyMod.CtrlCmd) |
                                                                              monaco.KeyCode.KEY_F
                                                                      ],
                                                                      run: function () {
                                                                          forward()
                                                                          // hijacking()
                                                                          // forwardRequest(getCurrentId()).finally(() => {
                                                                          //     setTimeout(() => setLoading(false), 300)
                                                                          // })
                                                                      },
                                                                      contextMenuGroupId: "Actions"
                                                                  },
                                                                  {
                                                                      id: "drop-response",
                                                                      label: "丢弃该 HTTP Request",
                                                                      run: function () {
                                                                          hijacking()
                                                                          dropRequest(getCurrentId()).finally(() => {
                                                                              // setTimeout(
                                                                              //     () => setLoading(false),
                                                                              //     300
                                                                              // )
                                                                          })
                                                                      },
                                                                      contextMenuGroupId: "Actions"
                                                                  },
                                                                  {
                                                                      id: "hijack-current-response",
                                                                      label: "劫持该 Request 对应的响应",
                                                                      run: function () {
                                                                          allowHijackedResponseByRequest(getCurrentId())
                                                                      },
                                                                      contextMenuGroupId: "Actions"
                                                                  }
                                                              ])
                                                    ]}
                                                />
                                            )}
                                            {autoForward === "passive" && (
                                                <MITMPluginLogViewer messages={logs} status={statusCards} />
                                            )}
                                        </AutoCard>
                                    }
                                />
                            </div>
                        </div>
                    </Col>
                </Row>
            </div>
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
