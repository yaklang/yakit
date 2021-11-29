import React, { useEffect, useState } from "react";
import {
    Alert,
    Button, Card,
    Col, Divider,
    Form,
    Input,
    InputNumber,
    Modal,
    notification,
    PageHeader,
    Row,
    Space,
    Spin,
    Steps,
    Switch,
    Tag,
    Typography,
    Tooltip
} from "antd";
import { failed, info, success, warn } from "../../utils/notification";
import { CheckOutlined, PoweroffOutlined, ReloadOutlined } from "@ant-design/icons";
import { IMonacoActionDescriptor, YakEditor } from "../../utils/editors";
import { MITMFilters, MITMFilterSchema } from "./MITMFilters";
import { showDrawer, showModal } from "../../utils/showModal";
import { formatTimestamp } from "../../utils/timeUtil";
import { MITMPluginCard } from "./MITMPluginCard";
import { SwitchItem } from "../../utils/inputUtil";
import { ExecResult, YakScriptHooks } from "../invoker/schema";
import { ExecResultLog } from "../invoker/batch/ExecMessageViewer";
import { ExtractExecResultMessage } from "../../components/yakitLogSchema";
import { YakExecutorParam } from "../invoker/YakExecutorParams";

const { Text } = Typography;
const { Step } = Steps;
const { Item } = Form;
const { ipcRenderer } = window.require("electron");

export interface MITMPageProp {
    onSendToWebFuzzer?: (isHttps: boolean, request: string) => any
}

export interface MITMResponse extends MITMFilterSchema {
    isHttps: boolean,
    request: Uint8Array,
    url: string,
    id: number

    forResponse?: boolean
    response?: Uint8Array
    responseId?: number
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

export const MITMPage: React.FC<MITMPageProp> = (props) => {
    const [status, setStatus] = useState<"idle" | "hijacked" | "hijacking">("idle");
    const [error, setError] = useState("");
    const [host, setHost] = useState("127.0.0.1");
    const [port, setPort] = useState(8083);
    const [downstreamProxy, setDownstreamProxy] = useState<string>();
    const [loading, setLoading] = useState(false);
    const [currentPacket, setCurrentPacket] = useState<string>();
    const [currentPacketId, setCurrentPacketId] = useState(0);
    const [editor, setEditor] = useState<any>();
    const [autoForward, setAutoForward] = useState(true);
    const [initialed, setInitialed] = useState(false);
    const [allowHijackCurrentResponse, setAllowHijackCurrentResponse] = useState(false);
    const [forResponse, setForResponse] = useState(false);
    const [haveSideCar, setHaveSideCar] = useState(true);
    const [hostInfo, setHostInfo] = useState({ host: 'http://www.baidu.com', address: 'http://www.baidu.com/s?key=123', ip: '111.111.111.111' })

    // yakit log message
    const [logs, setLogs] = useState<ExecResultLog[]>([]);

    // filter 过滤器
    const [mitmFilter, setMITMFilter] = useState<MITMFilterSchema>({});

    // hooks 当前插件所有的 Hook 内容
    const [mitmHooks, setMITMHooks] = useState<YakScriptHooks[]>([]);

    // 这个 Forward 主要用来转发修改后的内容，同时可以转发请求和响应
    const forward = (pkg?: string, id?: number) => {
        // ID 不存在
        if (!id && !currentPacketId) {
            warn("无法转发 ID 为空的 HTTP Request / Response 劫持")
            return
        }

        setLoading(true);
        setStatus("hijacking");
        setAllowHijackCurrentResponse(false)
        setForResponse(false)

        if (forResponse) {
            ipcRenderer.invoke("mitm-forward-modified-response", pkg || currentPacket, id || currentPacketId).finally(() => {
                setCurrentPacket("");
                setCurrentPacketId(0);
                setTimeout(() => setLoading(false))
            })
        } else {
            ipcRenderer.invoke("mitm-forward-modified-request", pkg || currentPacket, id || currentPacketId).finally(() => {
                setCurrentPacket("");
                setCurrentPacketId(0);
                setTimeout(() => setLoading(false))
            })
        }
    }

    const recover = () => {
        ipcRenderer.invoke("mitm-recover").then(() => {
            // success("恢复 MITM 会话成功")
        })
    }

    useEffect(() => {
        setInitialed(false)
        // 用于前端恢复状态
        ipcRenderer.invoke("mitm-have-current-stream").then(data => {
            const { haveStream, host, port } = data;
            if (haveStream) {
                setStatus("hijacking")
                setHost(host);
                setPort(port);
            }
        }).finally(() => {
            recover()
            setTimeout(() => setInitialed(true), 500)
        })

        // 用于启动 MITM 开始之后，接受开始成功之后的第一个消息，如果收到，则认为说 MITM 启动成功了
        ipcRenderer.on("client-mitm-start-success", () => {
            setStatus("hijacking")
            setTimeout(() => {
                setLoading(false)
            }, 300)
        })

        // 用于 MITM 的 Message （YakitLog）
        let messages: ExecResultLog[] = [];
        ipcRenderer.on("client-mitm-message", (e, data: ExecResult) => {
            let msg = ExtractExecResultMessage(data);
            console.info(data, msg)
            if (msg !== undefined) {
                messages.push(msg as ExecResultLog)
                if (messages.length > 50) {
                    messages.shift()
                }
            }
        })

        // 用于 MITM 的 查看当前 Hooks
        ipcRenderer.on("client-mitm-hooks", (e, data: YakScriptHooks[]) => {
            setMITMHooks([...data])
        })


        // let currentFlow: HTTPFlow[] = []
        ipcRenderer.on("client-mitm-history-update", (e, data) => {
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
                    mask: true, title: "启动 MITM 服务器 ERROR!",
                    content: <>{error}</>
                })
            }
            ipcRenderer.invoke("mitm-stop-call")
            setError(`${msg}`)
            setStatus("idle")
            setTimeout(() => {
                setLoading(false)
            }, 300)
        });
        ipcRenderer.on("client-mitm-filter", (e, msg) => {
            setMITMFilter({
                includeSuffix: msg.includeSuffix,
                excludeMethod: msg.excludeMethod,
                excludeSuffix: msg.excludeSuffix,
                includeHostname: msg.includeHostname,
                excludeHostname: msg.excludeHostname,
            })
        })

        const updateLogs = () => {
            setLogs([...messages])
        }
        updateLogs()
        let id = setInterval(() => {
            updateLogs()
        }, 1000)

        return () => {
            clearInterval(id);
            ipcRenderer.removeAllListeners("client-mitm-error")
            // ipcRenderer.invoke("mitm-close-stream")
        }
    }, [])

    // 自动转发劫持，进行的操作
    const forwardHandler = (e: any, msg: MITMResponse) => {
        setMITMFilter({
            includeSuffix: msg.includeSuffix,
            excludeMethod: msg.excludeMethod,
            excludeSuffix: msg.excludeSuffix,
            includeHostname: msg.includeHostname,
            excludeHostname: msg.excludeHostname,
        })

        if (msg.forResponse) {
            if (!msg.response || !msg.responseId) {
                console.info(msg)
                failed("BUG: MITM 错误，未能获取到正确的 Response 或 Response ID")
                return
            }
            if (autoForward) {
                forwardResponse(msg.responseId || 0)
                if (!!currentPacket) {
                    setCurrentPacket("")
                    setCurrentPacketId(0)
                }
            } else {
                setForResponse(true)
                setStatus("hijacked")
                setCurrentPacket(new Buffer(msg.response).toString("utf8"))
                setCurrentPacketId(msg.responseId || 0);
            }
        } else {
            if (msg.request) {
                if (autoForward) {
                    forwardRequest(msg.id)
                    if (!!currentPacket) {
                        setCurrentPacket("")
                        setCurrentPacketId(0)
                    }
                    // setCurrentPacket(String.fromCharCode.apply(null, msg.request))
                } else {
                    setStatus("hijacked")
                    setForResponse(false)
                    setCurrentPacket(new Buffer(msg.request).toString("utf8"))
                    setCurrentPacketId(msg.id)
                }
            }
        }
    }

    useEffect(() => {
        ipcRenderer.on("client-mitm-hijacked", forwardHandler);
        return () => {
            ipcRenderer.removeAllListeners("client-mitm-hijacked")
        }
    }, [autoForward])

    useEffect(() => {
        if (!editor) {
            return
        }

        window.onresize = (e) => {
            if (editor) editor.layout();
        };
    }, [editor])
    const addr = `http://${host}:${port}`;

    if (!initialed) {
        return <div style={{ textAlign: "center", paddingTop: 120 }}>
            <Spin spinning={true} tip={"正在初始化 MITM"} />
        </div>
    }

    const start = () => {
        setLoading(true)
        setError("")
        ipcRenderer.invoke("mitm-start-call", host, port, downstreamProxy).catch(e => {
            notification["error"]({ message: `启动中间人劫持失败：${e}` })
        })
    }

    const hijacking = () => {
        setCurrentPacket("");
        setLoading(true);
        setStatus("hijacking");
    }

    function getCurrentId() {
        return currentPacketId
    }

    return <div style={{ height: "100%" }}>
        {error && <Alert style={{ marginBottom: 8 }} message={error} type={"error"} />}
        <Steps type={"navigation"} size={"small"} current={status === "idle" ? 0 : 1}>
            <Step
                title={"填写 MITM 代理端口"} active={status === "idle"}
                key={"idle"} subTitle={`${host}:${port}`}
                status={status === "idle" ? "process" : "finish"}
            >

            </Step>
            <Step title={"开始劫持"} key={"hijacked"}
                subTitle={status === "idle" ? undefined : <>
                    <Space>
                        <Divider type={"vertical"} />
                        <>工具栏</>
                        <Switch size={"small"} checked={haveSideCar} onChange={setHaveSideCar} />
                    </Space>
                </>}
                active={status === "hijacked" || status === "hijacking"}>
            </Step>
        </Steps>
        <div style={{ marginTop: 0 }}>
            {(() => {
                switch (status) {
                    case "idle":
                        return <Spin spinning={loading}>
                            <Form
                                style={{ marginTop: 40 }}
                                onSubmitCapture={e => {
                                    e.preventDefault()
                                    start()
                                }}
                                layout={"horizontal"} labelCol={{ span: 7 }}
                                wrapperCol={{ span: 13 }}
                            >
                                <Item label={"劫持代理监听主机"}>
                                    <Input value={host} onChange={e => setHost(e.target.value)} />
                                </Item>
                                <Item label={"劫持代理监听端口"}>
                                    <InputNumber value={port} onChange={e => setPort(e)} />
                                </Item>
                                <Item label={"下游代理"} help={"为经过该 MITM 代理的请求再设置一个代理，通常用于访问中国大陆无法访问的网站或访问特殊网络/内网"}>
                                    <Input value={downstreamProxy} onChange={e => setDownstreamProxy(e.target.value)} />
                                </Item>
                                <Item label={" "} colon={false}>
                                    <Button type={"primary"} htmlType={"submit"}>
                                        监听端口，启动劫持
                                    </Button>
                                </Item>
                            </Form>
                        </Spin>
                    case "hijacking":
                    case "hijacked":
                        return <div style={{ marginLeft: 12, marginRight: 12 }}>
                            <Row gutter={14} style={{ height: "100%" }}>
                                <Col span={haveSideCar ? 15 : 24}>
                                    <PageHeader
                                        title={'劫持 HTTP Request'}
                                        style={{ marginRight: 0, paddingRight: 0, paddingBottom: 8 }}
                                        extra={
                                            <Space>
                                                <Button
                                                    type={"link"}
                                                    onClick={() => {
                                                        const text = `wget -e use_proxy=yes -e http_proxy=${addr} http://download-mitm-cert.yaklang.io -O yakit-mitm-cert.pem`
                                                        showModal({
                                                            title: "下载 SSL/TLS 证书以调试 HTTPS",
                                                            content: <div>
                                                                点击复制以下命令在命令行中一键下载证书
                                                                <br />
                                                                <Text copyable={true}>{text}</Text>
                                                                <br />
                                                                <br />
                                                                <p style={{ color: "red" }}>
                                                                    如果遇到问题，可以在浏览器中设置代理:{addr} 后 <br />
                                                                    访问 http://download-mitm-cert.yaklang.io
                                                                    以自动下载证书
                                                                </p>
                                                            </div>
                                                        })
                                                    }}
                                                >请先下载 SSL/TLS 证书</Button>
                                                <Button danger={true} type={"primary"}
                                                    onClick={() => {
                                                        setLoading(true)
                                                        ipcRenderer.invoke("mitm-stop-call").then(() => {
                                                            setStatus("idle")
                                                        }).catch(e => {
                                                            notification["error"]({ message: `停止中间人劫持失败：${e}` })
                                                        }).finally(() => setTimeout(() => setLoading(false), 300))
                                                    }} icon={<PoweroffOutlined />}
                                                >停止劫持</Button>
                                            </Space>}>
                                        <Row>
                                            <Col span={12}>
                                                <div style={{ width: "100%", textAlign: "left" }}>
                                                    <Space>
                                                        <Button
                                                            disabled={status === "hijacking"}
                                                            onClick={() => {
                                                                forward()
                                                            }}>发送请求</Button>
                                                        <Button
                                                            disabled={status === "hijacking"}
                                                            danger={true}
                                                            onClick={() => {
                                                                hijacking()
                                                                if (forResponse) {
                                                                    dropResponse(currentPacketId).finally(() => {
                                                                        setTimeout(() => {
                                                                            setLoading(false)
                                                                        }, 300)
                                                                    })
                                                                } else {
                                                                    dropRequest(currentPacketId).finally(() => {
                                                                        setTimeout(() => setLoading(false), 300)
                                                                    })
                                                                }
                                                            }}>丢弃请求</Button>
                                                        {(!forResponse && !!currentPacket) && <Button
                                                            disabled={allowHijackCurrentResponse}
                                                            type={allowHijackCurrentResponse ? "primary" : "default"}
                                                            onClick={() => {
                                                                if (!allowHijackCurrentResponse) {
                                                                    allowHijackedResponseByRequest(currentPacketId)
                                                                    setAllowHijackCurrentResponse(true)
                                                                } else {
                                                                    setAllowHijackCurrentResponse(false)
                                                                }
                                                            }}>
                                                            劫持响应 {
                                                                allowHijackCurrentResponse &&
                                                                <CheckOutlined />
                                                            }
                                                        </Button>}
                                                    </Space>
                                                </div>
                                            </Col>
                                            <Col span={12}>
                                                <div style={{ width: "100%", textAlign: "right" }}>
                                                    <Space>
                                                        <Button type={"link"}
                                                            onClick={() => {
                                                                let m = showDrawer({
                                                                    placement: "top", height: "50%",
                                                                    content: <>
                                                                        <MITMFilters
                                                                            filter={mitmFilter}
                                                                            onFinished={(filter) => {
                                                                                setMITMFilter({ ...filter })
                                                                                m.destroy()
                                                                            }} />
                                                                    </>
                                                                });
                                                            }}
                                                        >设置过滤器</Button>
                                                        <div>
                                                            <span>自动放行：</span>
                                                            <Switch
                                                                checked={autoForward}
                                                                onChange={e => {
                                                                    if (e) {
                                                                        notification["info"]({ message: "切换为劫持自动放行模式（仅记录）" })
                                                                    } else {
                                                                        notification["info"]({ message: "切换为手动放行模式（可修改劫持）" })
                                                                    }
                                                                    setAutoForward(e)
                                                                    if (currentPacket && currentPacketId) {
                                                                        forward()
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    </Space>
                                                </div>
                                            </Col>
                                        </Row>
                                        <Row>
                                            <Col span={12}>
                                                <div style={{
                                                    width: "100%", textAlign: "left", height: '100%',
                                                    display: 'flex'
                                                }}>{autoForward ?
                                                    <Text style={{ alignSelf: 'center' }}>{`目标：自动放行中...`}</Text> :
                                                    <Tooltip placement="bottom" title={hostInfo.address}>
                                                        <Text style={{ alignSelf: 'center' }}>{`目标：${hostInfo.host}/... (${hostInfo.ip})`}</Text>
                                                    </Tooltip>}
                                                </div>
                                            </Col>
                                            <Col span={12}>
                                                <div style={{ width: "100%", textAlign: "right" }}>
                                                    <Button
                                                        type={"link"} onClick={() => recover()}
                                                        icon={<ReloadOutlined />}
                                                    >恢复请求</Button>
                                                </div>
                                            </Col>
                                        </Row>
                                    </PageHeader>
                                    <Spin spinning={status === "hijacking"}
                                        tip={`监听中`}>
                                        <div style={{ height: 478 }} id={"monaco-container"}>
                                            {forResponse ? <>
                                                <YakEditor
                                                    type={"http"}
                                                    value={currentPacket}
                                                    setValue={setCurrentPacket}
                                                    editorDidMount={(editor: any) => {
                                                        setEditor(editor)
                                                    }}
                                                    triggerId={currentPacketId}
                                                    actions={[
                                                        {
                                                            id: "forward-response",
                                                            label: "放行该 HTTP Response",
                                                            run: function () {
                                                                hijacking()
                                                                forwardResponse(getCurrentId()).finally(() => {
                                                                    setTimeout(() => setLoading(false), 300)
                                                                })
                                                            },
                                                            contextMenuGroupId: "Actions"
                                                        },
                                                        {
                                                            id: "drop-response",
                                                            label: "丢弃该 HTTP Response",
                                                            run: function () {
                                                                hijacking()
                                                                dropResponse(getCurrentId()).finally(() => {
                                                                    setTimeout(() => setLoading(false), 300)
                                                                })
                                                            },
                                                            contextMenuGroupId: "Actions"
                                                        },
                                                    ]}
                                                />
                                            </> : <>
                                                <YakEditor
                                                    actions={(() => {
                                                        return [
                                                            {
                                                                id: "send-to-fuzzer",
                                                                label: "发送到 Web Fuzzer",
                                                                run: function () {
                                                                    props.onSendToWebFuzzer && props.onSendToWebFuzzer(true, currentPacket || "")
                                                                },
                                                                contextMenuGroupId: "Actions"
                                                            },
                                                            {
                                                                id: "forward-response",
                                                                label: "放行该 HTTP Request",
                                                                run: function () {
                                                                    hijacking()
                                                                    forwardRequest(getCurrentId()).finally(() => {
                                                                        setTimeout(() => setLoading(false), 300)
                                                                    })
                                                                },
                                                                contextMenuGroupId: "Actions"
                                                            },
                                                            {
                                                                id: "drop-response",
                                                                label: "丢弃该 HTTP Request",
                                                                run: function () {
                                                                    hijacking()
                                                                    dropRequest(getCurrentId()).finally(() => {
                                                                        setTimeout(() => setLoading(false), 300)
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
                                                            },
                                                        ]
                                                    })()}
                                                    value={currentPacket}
                                                    setValue={setCurrentPacket}
                                                    editorDidMount={(editor: any) => {
                                                        setEditor(editor)
                                                    }}
                                                    triggerId={currentPacketId}
                                                />
                                            </>}

                                        </div>
                                    </Spin>
                                </Col>
                                {haveSideCar && <Col span={9} style={{ height: "100%" }}>
                                    <div style={{ marginTop: 20, height: "100%" }}>
                                        <MITMPluginCard
                                            messages={logs} hooks={mitmHooks}
                                            onSubmitScriptContent={e => {
                                                ipcRenderer.invoke("mitm-exec-script-content", e)
                                            }}
                                            onSubmitYakScriptId={(id: number, params: YakExecutorParam[]) => {
                                                info(`加载 MITM 插件[${id}]`)
                                                ipcRenderer.invoke("mitm-exec-script-by-id", id, params)
                                            }}
                                        />
                                    </div>
                                </Col>}
                            </Row>
                        </div>
                    default:
                        return <div />
                }
            })()}
        </div>
    </div>
};