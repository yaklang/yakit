import React, {useEffect, useState} from "react";
import {
    Button,
    Card,
    Col,
    Collapse,
    Descriptions,
    PageHeader,
    Row, Skeleton,
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
import {HTTPFlow} from "./HTTPFlowTable";
import {HTTPPacketEditor, YakEditor} from "../utils/editors";
import {failed} from "../utils/notification";
import {FuzzableParamList} from "./FuzzableParamList";
import {FuzzerResponse} from "../pages/fuzzer/HTTPFuzzerPage";
import {randomString} from "../utils/randomUtil";
import {HTTPPacketFuzzable} from "./HTTPHistory";
import {AutoSpin} from "./AutoSpin";
import {ResizeBox} from "./ResizeBox";
import ReactResizeDetector from "react-resize-detector";

const {ipcRenderer} = window.require("electron");

export type SendToFuzzerFunc = (req: Uint8Array, isHttps: boolean) => any;

export interface HTTPFlowDetailProp extends HTTPPacketFuzzable {
    hash: string
    noHeader?: boolean
    onClose?: () => any
    defaultHeight?: number

    //查看前/后一个请求内容
    isFront?: boolean
    isBehind?: boolean
    fetchRequest?: (kind: number) => any
}

const {Text} = Typography;

export interface FuzzerResponseToHTTPFlowDetail extends HTTPPacketFuzzable {
    response: FuzzerResponse
    onClosed?: () => any
    index?: number
    data?: FuzzerResponse[]
}

export const FuzzerResponseToHTTPFlowDetail = (rsp: FuzzerResponseToHTTPFlowDetail) => {
    const [response, setResponse] = useState<FuzzerResponse>()
    const [index, setIndex] = useState<number>()
    const [hash, setHash] = useState<string>();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>();

    useEffect(() => {
        setResponse(rsp.response)
        setIndex(rsp.index)
    }, [rsp.response])

    useEffect(() => {
        const flag = randomString(30);
        ipcRenderer.on(flag, (e: any, data: HTTPFlow) => {
            setHash(data.Hash)
            setLoading(false)
        })
        ipcRenderer.on(`ERROR:${flag}`, (e: any, data: string) => {
            setLoading(false)
            failed("分析参数失败：" + data)
        })

        ipcRenderer.invoke("analyze-fuzzer-response", response, flag)

        return () => {
            ipcRenderer.removeAllListeners(flag)
            ipcRenderer.removeAllListeners(`ERROR:${flag}`)
        }
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

    return <HTTPFlowDetail
        hash={hash || ""}
        onClose={rsp.onClosed}
        sendToWebFuzzer={rsp.sendToWebFuzzer}
        sendToPlugin={rsp.sendToPlugin}
        isFront={index === undefined ? undefined : index === 0}
        isBehind={index === undefined ? undefined : index === (rsp?.data || []).length - 1}
        fetchRequest={fetchInfo}
    />
}

export const HTTPFlowDetail: React.FC<HTTPFlowDetailProp> = (props) => {
    const [flow, setFlow] = useState<HTTPFlow>();
    const [loading, setLoading] = useState(false);

    const actionFuzzer = [
        {
            id: 'send-fuzzer-info',
            label: '发送到Fuzzer',
            contextMenuGroupId: 'send-fuzzer-info',
            run: () => (props as any).sendToWebFuzzer((flow as any).IsHTTPS, (flow as any).Request)
        },
        {
            id: 'send-to-plugin',
            label: '发送到数据包扫描',
            contextMenuGroupId: 'send-fuzzer-info',
            run: () => (props as any).sendToPlugin((flow as any).Request, (flow as any).IsHTTPS, (flow as any)?.Response || undefined)
        }
    ]

    useEffect(() => {
        if (!props.hash) {
            return
        }

        ipcRenderer.on(props.hash, (e: any, data: HTTPFlow) => {
            setFlow(data)
            setTimeout(() => setLoading(false), 300)
        })
        ipcRenderer.on(`ERROR:${props.hash}`, (e: any, details: any) => {
            failed(`查询该请求失败[${props.hash}]: ` + details)
        })

        setLoading(true)
        ipcRenderer.invoke("get-http-flow", props.hash)

        return () => {
            ipcRenderer.removeAllListeners(props.hash)
            ipcRenderer.removeAllListeners(`ERROR:${props.hash}`)
        }
    }, [props.hash])

    return <Spin spinning={loading} style={{width: "100%", marginBottom: 24}}>
        {flow ? <>
            {props.noHeader ? undefined : <PageHeader title={`请求详情`} subTitle={props.hash}
                                                      extra={
                                                          props.fetchRequest ?
                                                              <Space>
                                                                  <Tooltip title={"上一个请求"}>
                                                                      <Button type="link" disabled={!!props.isFront}
                                                                              icon={<LeftOutlined/>} onClick={() => {
                                                                          props?.fetchRequest!(1)
                                                                      }}></Button>
                                                                  </Tooltip>
                                                                  <Tooltip title={"下一个请求"}>
                                                                      <Button type="link" disabled={!!props.isBehind}
                                                                              icon={<RightOutlined/>} onClick={() => {
                                                                          props?.fetchRequest!(2)
                                                                      }}></Button>
                                                                  </Tooltip>
                                                              </Space>
                                                              :
                                                              <></>
                                                      }/>
            }
            <Space direction={"vertical"} style={{width: "100%"}}>
                <Descriptions column={4} bordered={true} size={"small"}>
                    <Descriptions.Item key={"method"} span={1} label={"HTTP 方法"}><Tag color={"geekblue"}><Text
                        style={{maxWidth: 500}}>{flow.Method}</Text></Tag></Descriptions.Item>
                    <Descriptions.Item key={"url"} span={3} label={"请求 URL"}>
                        <Text style={{maxWidth: 500}} copyable={true}>{flow.Url}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item key={"https"} span={1} label={"HTTPS"}><Tag color={"geekblue"}>
                        <div
                            style={{maxWidth: 500}}>{flow.IsHTTPS ? "True" : "False"}</div>
                    </Tag></Descriptions.Item>
                    <Descriptions.Item key={"status"} span={1} label={"StatusCode"}><Tag
                        color={"geekblue"}>{flow.StatusCode}</Tag></Descriptions.Item>
                    <Descriptions.Item key={"size"} span={1} label={"Body大小"}><Tag color={"geekblue"}>
                        <div style={{maxWidth: 500}}>{flow.BodySizeVerbose}</div>
                    </Tag></Descriptions.Item>
                    <Descriptions.Item key={"type"} span={1} label={"Content-Type"}><Tag color={"geekblue"}>
                        <div style={{maxWidth: 500}}>{flow.ContentType}</div>
                    </Tag></Descriptions.Item>
                </Descriptions>
                <div style={{width: "100%", overflow: "auto"}}>
                    {flow.GetParams.length > 0 || flow.PostParams.length > 0 || flow.CookieParams.length > 0 ? <Tabs>
                        {flow.GetParams.length > 0 && <Tabs.TabPane key={"get"} tab={"GET 参数"}>
                            <FuzzableParamList data={flow.GetParams} sendToWebFuzzer={(isHttps, request) => {
                                if (props.sendToWebFuzzer) {
                                    props.sendToWebFuzzer(isHttps, request)
                                    if (props.onClose) props.onClose();
                                }
                            }}/>
                        </Tabs.TabPane>}
                        {flow.PostParams.length > 0 && <Tabs.TabPane key={"post"} tab={"POST 参数"}>
                            <FuzzableParamList data={flow.PostParams} sendToWebFuzzer={(isHttps, request) => {
                                if (props.sendToWebFuzzer) {
                                    props.sendToWebFuzzer(isHttps, request);
                                    if (props.onClose) props.onClose();
                                }
                            }}/>
                        </Tabs.TabPane>}
                        {flow.CookieParams.length > 0 && <Tabs.TabPane key={"cookie"} tab={"Cookie 参数"}>
                            <FuzzableParamList data={flow.CookieParams} sendToWebFuzzer={(isHttps, request) => {
                                if (props.sendToWebFuzzer) {
                                    props.sendToWebFuzzer(isHttps, request)
                                    if (props.onClose) props.onClose();
                                }
                            }}/>
                        </Tabs.TabPane>}
                    </Tabs> : ""}
                </div>

                <Row gutter={8}>
                    <Col span={12}>
                        <Card title={"原始 HTTP 请求"} size={"small"} bodyStyle={{padding: 0}}>
                            <div style={{height: 350}}>
                                <YakEditor readOnly={true} type={"http"}//theme={"fuzz-http-theme"}
                                           value={new Buffer(flow.Request).toString("utf-8")}
                                           actions={[...actionFuzzer]}/>
                            </div>
                        </Card>
                    </Col>
                    <Col span={12}>
                        <Card title={"原始 HTTP 响应"} size={"small"} bodyStyle={{padding: 0}}>
                            <div style={{height: 350}}>
                                <YakEditor readOnly={true} type={"http"}// theme={"fuzz-http-theme"}
                                           value={new Buffer(flow.Response).toString("utf-8")}
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
                                <Descriptions bordered={true} column={1} size={"small"}>
                                    {(flow?.RequestHeader || []).sort((i, e) => {
                                        return i.Header.localeCompare(e.Header)
                                    }).map(i => {
                                        return <Descriptions.Item key={i.Header} label={<Text style={{width: 240}}>
                                            <Tag>{i.Header}</Tag>
                                        </Text>}>
                                            <Text
                                                copyable={true}
                                                style={{maxWidth: 500}}
                                                ellipsis={{tooltip: true}}>{i.Value}</Text>
                                        </Descriptions.Item>
                                    })}
                                </Descriptions>
                            </Collapse.Panel>
                        </Collapse>
                    </Col>
                    <Col span={12}>
                        <Collapse defaultActiveKey={"response"}>
                            <Collapse.Panel key={"response"} header={"Response Headers"}>
                                <Descriptions bordered={true} column={1} size={"small"}>
                                    {(flow?.ResponseHeader || []).sort((i, e) => {
                                        return i.Header.localeCompare(e.Header)
                                    }).map(i => {
                                        return <Descriptions.Item key={i.Header} label={<Text style={{width: 240}}>
                                            <Tag>{i.Header}</Tag>
                                        </Text>}>
                                            <Text
                                                copyable={true}
                                                style={{maxWidth: 500}}
                                                ellipsis={{tooltip: true}}>{i.Value}</Text>
                                        </Descriptions.Item>
                                    })}
                                </Descriptions>
                            </Collapse.Panel>
                        </Collapse>
                    </Col>
                </Row>
            </Space>
        </> : ""}
    </Spin>
};

export const HTTPFlowDetailMini: React.FC<HTTPFlowDetailProp> = (props) => {
    const [flow, setFlow] = useState<HTTPFlow>();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!props.hash) {
            setFlow(undefined)
            return
        }

        setFlow(undefined)
        setLoading(true)
        ipcRenderer.invoke("GetHTTPFlowByHash", {Hash: props.hash}).then((i: HTTPFlow) => {
            setFlow(i)
        }).catch((e: any) => {
            failed(`Query HTTPFlow failed: ${e}`)
        }).finally(() => {
            setTimeout(() => setLoading(false), 400)
        })
    }, [props.hash])

    if (!flow) {
        return <>
            <Spin tip={"选中 HTTP History Record 查看详情"} indicator={<PlusCircleOutlined/>}>
                <Col span={12} style={{padding: 20}}>
                    <Skeleton/>
                </Col>
            </Spin>
        </>
    }

    return <>
        {/*<ReactResizeDetector onResize={(h, w) => {*/}
        {/*    console.info(h, w)*/}
        {/*}}/>*/}
        <ResizeBox
            firstNode={<HTTPPacketEditor
                originValue={flow.Request} readOnly={true} sendToWebFuzzer={props.sendToWebFuzzer}
                defaultHeight={props.defaultHeight} defaultHttps={props.defaultHttps} hideSearch={true}
            />}
            firstMinSize={300}
            secondNode={<HTTPPacketEditor
                originValue={flow.Response}
                readOnly={true} defaultHeight={props.defaultHeight}
                hideSearch={true}
            />}
            secondMinSize={300}
        >
        </ResizeBox>
    </>
}