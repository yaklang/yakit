import React, {useEffect, useState} from "react"
import {
    Button,
    Card,
    Col,
    Collapse,
    Descriptions,
    Empty,
    PageHeader,
    Row,
    Skeleton,
    Space,
    Spin,
    Tabs,
    Tag,
    Tooltip,
    Typography
} from "antd";
import {
    LeftOutlined,
    RightOutlined,
    PlusCircleOutlined,
} from "@ant-design/icons"
import {HTTPFlow} from "./HTTPFlowTable/HTTPFlowTable";
import {HTTPPacketEditor, YakEditor, YakHTTPPacketViewer} from "../utils/editors";
import {failed} from "../utils/notification";
import {FuzzableParamList} from "./FuzzableParamList";
import {FuzzerResponse} from "../pages/fuzzer/HTTPFuzzerPage";
import {randomString} from "../utils/randomUtil";
import {HTTPPacketFuzzable} from "./HTTPHistory";
import {AutoSpin} from "./AutoSpin";
import {ResizeBox} from "./ResizeBox";
import ReactResizeDetector from "react-resize-detector";
import {Buffer} from "buffer";
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str";
import {HTTPFlowForWebsocketViewer} from "@/pages/websocket/HTTPFlowForWebsocketViewer";
import {WebsocketFrameHistory} from "@/pages/websocket/WebsocketFrameHistory";

import styles from "./hTTPFlowDetail.module.scss"
import {callCopyToClipboard} from "@/utils/basic";

const {ipcRenderer} = window.require("electron")

export type SendToFuzzerFunc = (req: Uint8Array, isHttps: boolean) => any

export interface HTTPFlowDetailProp extends HTTPPacketFuzzable {
    id: number
    noHeader?: boolean
    onClose?: () => any
    defaultHeight?: number

    //查看前/后一个请求内容
    isFront?: boolean
    isBehind?: boolean
    fetchRequest?: (kind: number) => any
    search?: string
}

const {Text} = Typography

export interface FuzzerResponseToHTTPFlowDetail extends HTTPPacketFuzzable {
    response: FuzzerResponse
    onClosed?: () => any
    index?: number
    data?: FuzzerResponse[]
}

export const FuzzerResponseToHTTPFlowDetail = (rsp: FuzzerResponseToHTTPFlowDetail) => {
    const [response, setResponse] = useState<FuzzerResponse>()
    const [index, setIndex] = useState<number>()
    const [id, setId] = useState(0)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string>()

    useEffect(() => {
        setResponse(rsp.response)
        setIndex(rsp.index)
    }, [rsp.response])

    useEffect(() => {
        if (!response) {
            return
        }
        setLoading(true)
        ipcRenderer
            .invoke("ConvertFuzzerResponseToHTTPFlow", {...response})
            .then((d: HTTPFlow) => {
                if (d.Id <= 0) {
                    return
                }
                setId(d.Id)
            })
            .catch((e) => {
                failed(`分析参数失败: ${e}`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    }, [response])

    const fetchInfo = (kind: number) => {
        if (index === undefined || !rsp.data || rsp.data.length === 0) return

        if (kind === 1) {
            setResponse(rsp.data[index - 1])
            setIndex(index - 1)
        }
        if (kind === 2) {
            setResponse(rsp.data[index + 1])
            setIndex(index + 1)
        }
    }

    if (loading) {
        return <Spin tip={"正在分析详细参数"}/>
    }

    return (
        <HTTPFlowDetail
            onClose={rsp.onClosed}
            id={id}
            isFront={index === undefined ? undefined : index === 0}
            isBehind={index === undefined ? undefined : index === (rsp?.data || []).length - 1}
            fetchRequest={fetchInfo}
        />
    )
}

export const HTTPFlowDetail: React.FC<HTTPFlowDetailProp> = (props) => {
    const [flow, setFlow] = useState<HTTPFlow>()
    const [loading, setLoading] = useState(false)

    const actionFuzzer = [
        {
            id: "send-fuzzer-info",
            label: "发送到Fuzzer",
            contextMenuGroupId: "send-fuzzer-info",
            run: () => {
                ipcRenderer.invoke("send-to-tab", {
                    type: "fuzzer",
                    data: {
                        isHttps: flow?.IsHTTPS,
                        request: Uint8ArrayToString(flow?.Request || new Uint8Array(), "utf8")
                    }
                })
                if (props.onClose) props.onClose()
            }
        }
        // {
        //     id: 'send-to-plugin',
        //     label: '发送到数据包扫描',
        //     contextMenuGroupId: 'send-fuzzer-info',
        //     run: () => ipcRenderer.invoke("send-to-packet-hack", {
        //         request: flow?.Request,
        //         ishttps: flow?.IsHTTPS,
        //         response: flow?.Response
        //     })
        // }
    ]

    useEffect(() => {
        if (props.id <= 0) {
            return
        }
        // ipcRenderer.on(props.hash, (e: any, data: HTTPFlow) => {
        //     setFlow(data)
        //     setTimeout(() => setLoading(false), 300)
        // })
        // ipcRenderer.on(`ERROR:${props.hash}`, (e: any, details: any) => {
        //     failed(`查询该请求失败[${props.hash}]: ` + details)
        // })

        setLoading(true)
        ipcRenderer
            .invoke("GetHTTPFlowById", {Id: props.id})
            .then((data: HTTPFlow) => {
                setFlow(data)
            })
            .catch((e) => {
                failed(`GetHTTPFlowById[${props.id}] failed`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
        // ipcRenderer.invoke("get-http-flow", props.hash)

        return () => {
            // ipcRenderer.removeAllListeners(props.hash)
            // ipcRenderer.removeAllListeners(`ERROR:${props.hash}`)
        }
    }, [props.id])

    return (
        <Spin spinning={loading} style={{width: "100%", marginBottom: 24}}>
            {flow ? (
                <>
                    {props.noHeader ? undefined : (
                        <PageHeader
                            title={`请求详情`}
                            subTitle={props.id}
                            extra={
                                props.fetchRequest ? (
                                    <Space>
                                        <Tooltip title={"上一个请求"}>
                                            <Button
                                                type='link'
                                                disabled={!!props.isFront}
                                                icon={<LeftOutlined/>}
                                                onClick={() => {
                                                    props?.fetchRequest!(1)
                                                }}
                                            ></Button>
                                        </Tooltip>
                                        <Tooltip title={"下一个请求"}>
                                            <Button
                                                type='link'
                                                disabled={!!props.isBehind}
                                                icon={<RightOutlined/>}
                                                onClick={() => {
                                                    props?.fetchRequest!(2)
                                                }}
                                            ></Button>
                                        </Tooltip>
                                    </Space>
                                ) : (
                                    <></>
                                )
                            }
                        />
                    )}
                    <Space direction={"vertical"} style={{width: "100%"}}>
                        <Descriptions column={4} bordered={true} size={"small"}>
                            <Descriptions.Item key={"method"} span={1} label={"HTTP 方法"}>
                                <Tag color={"geekblue"}>
                                    <Text style={{maxWidth: 500}}>{flow.Method}</Text>
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item key={"url"} span={3} label={"请求 URL"}>
                                <Text style={{maxWidth: 500}} copyable={true}>
                                    {flow.Url}
                                </Text>
                            </Descriptions.Item>
                            <Descriptions.Item key={"https"} span={1} label={"HTTPS"}>
                                <Tag color={"geekblue"}>
                                    <div style={{maxWidth: 500}}>{flow.IsHTTPS ? "True" : "False"}</div>
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item key={"status"} span={1} label={"StatusCode"}>
                                <Tag color={"geekblue"}>{flow.StatusCode}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item key={"size"} span={1} label={"Body大小"}>
                                <Tag color={"geekblue"}>
                                    <div style={{maxWidth: 500}}>{flow.BodySizeVerbose}</div>
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item key={"type"} span={1} label={"Content-Type"}>
                                <Tag color={"geekblue"}>
                                    <div style={{maxWidth: 500}}>{flow.ContentType}</div>
                                </Tag>
                            </Descriptions.Item>
                        </Descriptions>
                        <div style={{width: "100%", overflow: "auto"}}>
                            {flow.GetParams.length > 0 || flow.PostParams.length > 0 || flow.CookieParams.length > 0 ? (
                                <Tabs>
                                    {flow.GetParams.length > 0 && (
                                        <Tabs.TabPane key={"get"} tab={"GET 参数"}>
                                            <FuzzableParamList
                                                data={flow.GetParams}
                                                sendToWebFuzzer={() => {
                                                    if (props.onClose) props.onClose()
                                                }}
                                            />
                                        </Tabs.TabPane>
                                    )}
                                    {flow.PostParams.length > 0 && (
                                        <Tabs.TabPane key={"post"} tab={"POST 参数"}>
                                            <FuzzableParamList
                                                data={flow.PostParams}
                                                sendToWebFuzzer={() => {
                                                    if (props.onClose) props.onClose()
                                                }}
                                            />
                                        </Tabs.TabPane>
                                    )}
                                    {flow.CookieParams.length > 0 && (
                                        <Tabs.TabPane key={"cookie"} tab={"Cookie 参数"}>
                                            <FuzzableParamList
                                                data={flow.CookieParams}
                                                sendToWebFuzzer={() => {
                                                    if (props.onClose) props.onClose()
                                                }}
                                            />
                                        </Tabs.TabPane>
                                    )}
                                </Tabs>
                            ) : (
                                ""
                            )}
                        </div>

                        <Row gutter={8}>
                            <Col span={12}>
                                <Card title={"原始 HTTP 请求"} size={"small"} bodyStyle={{padding: 0}}>
                                    <div style={{height: 350}}>
                                        <YakEditor
                                            readOnly={true}
                                            type={"http"} //theme={"fuzz-http-theme"}
                                            value={new Buffer(flow.Request).toString("utf8")}
                                            actions={[...actionFuzzer]}
                                        />
                                    </div>
                                </Card>
                            </Col>
                            <Col span={12}>
                                <Card title={"原始 HTTP 响应"} size={"small"} bodyStyle={{padding: 0}}>
                                    <div style={{height: 350}}>
                                        <YakEditor
                                            readOnly={true}
                                            type={"http"} // theme={"fuzz-http-theme"}
                                            value={new Buffer(flow.Response).toString("utf8")}
                                        />
                                    </div>
                                </Card>
                            </Col>
                        </Row>

                        {/*<Collapse>*/}
                        {/*    <Collapse.Panel key={"request-raw"} header={"原始 HTTP 请求数据包内容"}>*/}

                        {/*    </Collapse.Panel>*/}
                        {/*    <Collapse.Panel key={"response-raw"} header={"原始 HTTP 响应数据包内容"}>*/}

                        {/*    </Collapse.Panel>*/}
                        {/*</Collapse>*/}
                        <Row gutter={8}>
                            <Col span={12}>
                                <Collapse defaultActiveKey={"request"}>
                                    <Collapse.Panel key={"request"} header={"Request Headers"}>
                                        <Descriptions
                                            className={styles["http-flow-detail-descriptions"]}
                                            bordered={true}
                                            column={2}
                                            size={"small"}
                                        >
                                            {(flow?.RequestHeader || [])
                                                .sort((i, e) => {
                                                    return i.Header.localeCompare(e.Header)
                                                })
                                                .map((i) => {
                                                    return (
                                                        <Descriptions.Item
                                                            key={i.Header}
                                                            span={2}
                                                            label={
                                                                <Text style={{width: 240}}>
                                                                    <Tooltip title={i.Header}>
                                                                        <Tag
                                                                            className='content-ellipsis'
                                                                            style={{maxWidth: "100%"}}
                                                                        >
                                                                            {i.Header}
                                                                        </Tag>
                                                                    </Tooltip>
                                                                </Text>
                                                            }
                                                        >
                                                            <Text
                                                                copyable={true}
                                                                style={{width: "100%", maxWidth: "100%"}}
                                                                ellipsis={{tooltip: true}}
                                                            >
                                                                {i.Value}
                                                            </Text>
                                                        </Descriptions.Item>
                                                    )
                                                })}
                                        </Descriptions>
                                    </Collapse.Panel>
                                </Collapse>
                            </Col>
                            <Col span={12}>
                                <Collapse defaultActiveKey={"response"}>
                                    <Collapse.Panel key={"response"} header={"Response Headers"}>
                                        <Descriptions
                                            className={styles["http-flow-detail-descriptions"]}
                                            bordered={true}
                                            column={2}
                                            size={"small"}
                                        >
                                            {(flow?.ResponseHeader || [])
                                                .sort((i, e) => {
                                                    return i.Header.localeCompare(e.Header)
                                                })
                                                .map((i) => {
                                                    return (
                                                        <Descriptions.Item
                                                            key={i.Header}
                                                            span={2}
                                                            label={
                                                                <Text style={{width: 240}}>
                                                                    <Tooltip title={i.Header}>
                                                                        <Tag
                                                                            className='content-ellipsis'
                                                                            style={{maxWidth: "100%"}}
                                                                        >
                                                                            {i.Header}
                                                                        </Tag>
                                                                    </Tooltip>
                                                                </Text>
                                                            }
                                                        >
                                                            <Text
                                                                copyable={true}
                                                                style={{width: "100%", maxWidth: "100%"}}
                                                                ellipsis={{tooltip: true}}
                                                            >
                                                                {i.Value}
                                                            </Text>
                                                        </Descriptions.Item>
                                                    )
                                                })}
                                        </Descriptions>
                                    </Collapse.Panel>
                                </Collapse>
                            </Col>
                        </Row>
                    </Space>
                </>
            ) : (
                ""
            )}
        </Spin>
    )
}

export const HTTPFlowDetailMini: React.FC<HTTPFlowDetailProp> = (props) => {
    const [flow, setFlow] = useState<HTTPFlow>()
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!props.id) {
            setFlow(undefined)
            return
        }

        setFlow(undefined)
        setLoading(true)
        ipcRenderer
            .invoke("GetHTTPFlowById", {Id: props.id})
            .then((i: HTTPFlow) => {
                setFlow(i)
            })
            .catch((e: any) => {
                failed(`Query HTTPFlow failed: ${e}`)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 300)
            })
    }, [props.id])

    // if (!flow) {
    //     return <>
    //         <AutoSpin tip={"选中 HTTP History Record 查看详情"} indicator={<PlusCircleOutlined/>}>
    //             <Col span={12} style={{padding: 20}}>
    //                 <Skeleton/>
    //             </Col>
    //         </AutoSpin>
    //     </>
    // }
    const spinning = !flow || loading

    return (
        <AutoSpin spinning={spinning} tip={"选择想要查看的请求 / 等待加载"}>
            <ResizeBox
                firstNode={() => {
                    if (flow === undefined) {
                        return <Empty description={"选择想要查看的 HTTP 记录请求"}/>
                    }
                    if (flow?.IsWebsocket) {
                        return <HTTPFlowForWebsocketViewer flow={flow}/>
                    }
                    return (
                        <HTTPPacketEditor
                            originValue={flow?.Request || new Uint8Array()}
                            readOnly={true}
                            sendToWebFuzzer={props.sendToWebFuzzer}
                            defaultHeight={props.defaultHeight}
                            loading={loading}
                            defaultHttps={props.defaultHttps}
                            hideSearch={true}
                            noHex={true}
                            actions={flow?.RawRequestBodyBase64 ? [
                                {
                                    contextMenuGroupId: "auto-suggestion",
                                    label: "复制请求Body (Base64)",
                                    id: "copy-request-base64-body",
                                    run: ()=>{
                                        callCopyToClipboard(flow?.RawRequestBodyBase64||"")
                                    }
                                }
                            ] : undefined}
                            // 这个为了解决不可见字符的问题
                            defaultPacket={(!!flow?.SafeHTTPRequest) ? flow.SafeHTTPRequest : undefined}
                            extra={flow.InvalidForUTF8Request ? <Tag color={"red"}>
                                含二进制流
                            </Tag> : undefined}
                            defaultSearchKeyword={props.search}
                        />
                    )
                }}
                firstMinSize={300}
                secondNode={() => {
                    if (flow === undefined) {
                        return <Empty description={"选择想要查看的 HTTP 记录响应"}/>
                    }
                    if (flow?.IsWebsocket) {
                        return <WebsocketFrameHistory websocketHash={flow.WebsocketHash || ""}/>
                    }
                    return (
                        <HTTPPacketEditor
                            actions={flow?.RawResponseBodyBody64 ? [
                                {
                                    contextMenuGroupId: "auto-suggestion",
                                    label: "复制响应Body (Base64)",
                                    id: "copy-response-base64-body",
                                    run: ()=>{
                                        callCopyToClipboard(flow?.RawResponseBodyBody64||"")
                                    }
                                }
                            ] : undefined}
                            isResponse={true}
                            noHex={true}
                            loading={loading}
                            originValue={flow?.Response || new Uint8Array()}
                            readOnly={true}
                            defaultHeight={props.defaultHeight}
                            hideSearch={true}
                            defaultSearchKeyword={props.search}
                            defaultHttps={props.defaultHttps}
                        />
                    )
                }}
                secondMinSize={300}
            />
        </AutoSpin>
    )
}
