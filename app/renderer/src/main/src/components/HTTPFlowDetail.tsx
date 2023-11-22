import React, {useEffect, useState, useMemo, useRef, ReactNode} from "react"
import {
    Button,
    Card,
    Col,
    Collapse,
    Descriptions,
    Empty,
    PageHeader,
    Radio,
    Row,
    Space,
    Spin,
    Tabs,
    Tag,
    Tooltip,
    Typography
} from "antd"
import {LeftOutlined, RightOutlined} from "@ant-design/icons"
import {HTTPFlow} from "./HTTPFlowTable/HTTPFlowTable"
import {IMonacoEditor, NewHTTPPacketEditor} from "../utils/editors"
import {failed} from "../utils/notification"
import {FuzzableParamList} from "./FuzzableParamList"
import {FuzzerResponse} from "../pages/fuzzer/HTTPFuzzerPage"
import {HTTPHistorySourcePageType, HTTPPacketFuzzable} from "./HTTPHistory"
import {AutoSpin} from "./AutoSpin"
import {Buffer} from "buffer"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {HTTPFlowForWebsocketViewer} from "@/pages/websocket/HTTPFlowForWebsocketViewer"
import {WebsocketFrameHistory} from "@/pages/websocket/WebsocketFrameHistory"

import styles from "./hTTPFlowDetail.module.scss"
import {callCopyToClipboard} from "@/utils/basic"
import {useMemoizedFn, useUpdateEffect, useDebounceEffect} from "ahooks"
import {HTTPFlowExtractedDataTable} from "@/components/HTTPFlowExtractedDataTable"
import {showResponseViaResponseRaw} from "@/components/ShowInBrowser"
import {ChromeSvgIcon, SideBarCloseIcon, SideBarOpenIcon} from "@/assets/newIcon"
import {OtherMenuListProps} from "./yakitUI/YakitEditor/YakitEditorType"
import {YakitEmpty} from "./yakitUI/YakitEmpty/YakitEmpty"
import classNames from "classnames"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {YakitResizeBox} from "./yakitUI/YakitResizeBox/YakitResizeBox"
import {YakitButton} from "./yakitUI/YakitButton/YakitButton"
import {YakitCheckableTag} from "./yakitUI/YakitTag/YakitCheckableTag"
import {YakitTag} from "./yakitUI/YakitTag/YakitTag"
import {YakitDropdownMenu} from "./yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {openABSFileLocated} from "@/utils/openWebsite"
import emiter from "@/utils/eventBus/eventBus"
import {OutlineLog2Icon} from "@/assets/icon/outline"

const {ipcRenderer} = window.require("electron")

export type SendToFuzzerFunc = (req: Uint8Array, isHttps: boolean) => any

export interface HTTPFlowDetailProp extends HTTPPacketFuzzable {
    id: number
    payloads?: string[]
    noHeader?: boolean
    onClose?: () => any
    defaultHeight?: number
    Tags?: string

    // 查看前/后一个请求内容
    isFront?: boolean
    isBehind?: boolean
    fetchRequest?: (kind: number) => any
    search?: string
    selectedFlow?: HTTPFlow

    refresh?: boolean
    defaultFold?: boolean

    pageType?: "MITM" | "history"
    historyId?: string
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
        return <Spin tip={"正在分析详细参数"} />
    }

    return (
        <HTTPFlowDetail
            onClose={rsp.onClosed}
            id={id}
            payloads={rsp?.response ? rsp.response.Payloads : undefined}
            isFront={index === undefined ? undefined : index === 0}
            isBehind={index === undefined ? undefined : index === (rsp?.data || []).length - 1}
            fetchRequest={fetchInfo}
        />
    )
}

export const HTTPFlowDetail: React.FC<HTTPFlowDetailProp> = (props) => {
    const [flow, setFlow] = useState<HTTPFlow>()
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (props.id <= 0) {
            return
        }
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

        return () => {}
    }, [props.id])

    const onCloseDetails = useMemoizedFn(() => {
        if (props.onClose) props.onClose()
    })

    useEffect(() => {
        // 发送webfuzzer后关闭详情
        ipcRenderer.on("fetch-send-to-tab", onCloseDetails)

        return () => {
            ipcRenderer.removeListener("fetch-send-to-tab", onCloseDetails)
        }
    }, [])

    // 编辑器复制Url菜单项
    const copyUrlMenuItem: OtherMenuListProps = useMemo(() => {
        return {
            copyUrl: {
                menu: [
                    {
                        key: "copy-url",
                        label: "复制URL"
                    }
                ],
                onRun: (editor, key) => {
                    callCopyToClipboard(flow?.Url || "")
                },
                order: 14
            }
        }
    }, [flow?.Url])

    return (
        <Spin spinning={loading} style={{width: "100%", marginBottom: 24}}>
            {flow ? (
                <>
                    {props.noHeader ? undefined : (
                        <PageHeader
                            title={`请求详情`}
                            subTitle={`${props.id}${
                                (props.payloads || []).length > 0 ? `  Payload: ${props.payloads?.join(",")}` : ""
                            }`}
                            extra={
                                props.fetchRequest ? (
                                    <Space>
                                        <Tooltip title={"上一个请求"}>
                                            <Button
                                                type='link'
                                                disabled={!!props.isFront}
                                                icon={<LeftOutlined />}
                                                onClick={() => {
                                                    props?.fetchRequest!(1)
                                                }}
                                            ></Button>
                                        </Tooltip>
                                        <Tooltip title={"下一个请求"}>
                                            <Button
                                                type='link'
                                                disabled={!!props.isBehind}
                                                icon={<RightOutlined />}
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
                            {(props?.payloads || []).length > 0 && (
                                <Descriptions.Item key={"payloads"} span={4} label={"Payloads"}>
                                    <Text style={{maxWidth: 500}} copyable={true}>
                                        {props.payloads?.join(",")}
                                    </Text>
                                </Descriptions.Item>
                            )}
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
                                        <NewHTTPPacketEditor
                                            readOnly={true}
                                            hideSearch={true}
                                            noHex={true}
                                            noHeader={true}
                                            originValue={new Buffer(flow.Request)}
                                            defaultHttps={flow?.IsHTTPS}
                                            // actions={[...actionFuzzer]}
                                            extraEditorProps={{
                                                isShowSelectRangeMenu: true
                                            }}
                                            contextMenu={{...copyUrlMenuItem}}
                                        />
                                    </div>
                                </Card>
                            </Col>
                            <Col span={12}>
                                <Card title={"原始 HTTP 响应"} size={"small"} bodyStyle={{padding: 0}}>
                                    <div style={{height: 350}}>
                                        <NewHTTPPacketEditor
                                            readOnly={true}
                                            hideSearch={true}
                                            noHex={true}
                                            noHeader={true}
                                            originValue={new Buffer(flow.Response)}
                                            defaultHttps={flow?.IsHTTPS}
                                            // actions={[...actionFuzzer]}
                                            webFuzzerValue={new Buffer(flow.Request)}
                                            extraEditorProps={{
                                                isShowSelectRangeMenu: true
                                            }}
                                            contextMenu={{...copyUrlMenuItem}}
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

type HTTPFlowInfoType = "domains" | "json" | "rules"

export const HTTPFlowDetailMini: React.FC<HTTPFlowDetailProp> = (props) => {
    const {id, selectedFlow, refresh, defaultFold = false, pageType} = props
    const [flow, setFlow] = useState<HTTPFlow>()
    const [flowRequest, setFlowRequest] = useState<Uint8Array>()
    const [flowResponse, setFlowResponse] = useState<Uint8Array>()
    const [flowRequestLoad, setFlowRequestLoad] = useState<boolean>(false)
    const [flowResponseLoad, setFlowResponseLoad] = useState<boolean>(false)
    const [isSelect, setIsSelect] = useState<boolean>(false)
    const [infoType, setInfoType] = useState<HTTPFlowInfoType>()
    const [infoTypeLoading, setInfoTypeLoading] = useState(false)
    const [existedInfoType, setExistedInfoType] = useState<HTTPFlowInfoType[]>([])
    const [isFold, setFold] = useState<boolean>(defaultFold)
    const lastIdRef = useRef<number>()

    useEffect(() => {
        update()
    }, [id])

    useUpdateEffect(() => {
        update(true)
    }, [refresh])

    useUpdateEffect(() => {
        setRemoteValue("HISTORY_FOLD", JSON.stringify(isFold))
    }, [isFold])

    const update = useMemoizedFn((isSkip: boolean = false) => {
        if (!id) {
            setIsSelect(false)
            return
        }
        lastIdRef.current = id
        setIsSelect(true)
        getRemoteValue("IsFoldValue").then((data) => {
            if (!data) {
                return
            }
            const parseData = JSON.parse(data)
            if (parseData.id == lastIdRef.current) {
                setFold(parseData.is)
            }
        })
        setFlowRequestLoad(false)
        setFlowResponseLoad(false)
        setFlow(selectedFlow)
        setFlowRequest(undefined)
        setFlowResponse(undefined)

        // 是否获取Request
        let isGetRequest: boolean = true
        let isGetResponse: boolean = true

        // 请求不为空直接使用
        if (Uint8ArrayToString(selectedFlow?.Request as Uint8Array) && !isSkip) {
            isGetRequest = false
            setFlowRequest(selectedFlow?.Request)
        }
        if (Uint8ArrayToString(selectedFlow?.Response as Uint8Array) && !isSkip) {
            isGetResponse = false
            setFlowResponse(selectedFlow?.Response)
        }
        if (!isGetRequest && !isGetResponse && !isSkip) {
            queryMITMRuleExtractedData(selectedFlow as HTTPFlow)
        }
        // 请求或响应只要有一个为0或者为isSkip就走接口拿取数据
        if (isGetRequest || isGetResponse || isSkip) {
            isGetRequest && setFlowRequestLoad(true)
            isGetResponse && setFlowResponseLoad(true)
            ipcRenderer
                .invoke("GetHTTPFlowById", {Id: id})
                .then((i: HTTPFlow) => {
                    if (+i.Id == lastIdRef.current) {
                        if (isGetRequest) {
                            setFlowRequest(i?.Request)
                        }
                        if (isGetResponse) {
                            setFlowResponse(i?.Response)
                        }
                        setFlow(i)
                        queryMITMRuleExtractedData(i)
                    }
                })
                .catch((e: any) => {
                    failed(`Query HTTPFlow failed: ${e}`)
                })
                .finally(() => {
                    setTimeout(() => {
                        setFlowRequestLoad(false)
                        setFlowResponseLoad(false)
                    }, 300)
                })
        }
    })

    const queryMITMRuleExtractedData = (i: HTTPFlow) => {
        const existedExtraInfos: HTTPFlowInfoType[] = []
        ipcRenderer
            .invoke("QueryMITMRuleExtractedData", {
                Pagination: {
                    Order: "asc",
                    OrderBy: "created_at",
                    Page: 1,
                    Limit: 1
                },
                HTTPFlowHash: i.Hash
            })
            .then((rsp: {Total: number}) => {
                if (rsp.Total > 0) {
                    existedExtraInfos.push("rules")
                }
            })
            .catch((e) => {
                failed("获取规则提取数据失败")
            })
            .finally(() => {
                if ((i.Domains || []).length > 0 || (i.RootDomains || []).length > 0) {
                    existedExtraInfos.push("domains")
                }

                if ((i.JsonObjects || []).length > 0) {
                    existedExtraInfos.push("json")
                }

                if (existedExtraInfos.length > 0) {
                    setInfoType(existedExtraInfos[0])
                    setExistedInfoType([...existedExtraInfos])
                } else {
                    setInfoType(undefined)
                    setExistedInfoType([])
                }
            })
    }

    useEffect(() => {
        if (!infoType) {
            return
        }
        setInfoTypeLoading(true)
        setTimeout(() => setInfoTypeLoading(false), 300)
    }, [infoType])

    const mainCol: number = useMemo(() => {
        if (pageType === "MITM") {
            return 24
        }
        let col: number = 19
        if (isFold) {
            col = 24
        }
        return col
    }, [isFold])

    return isSelect ? (
        <div className={styles["http-history-box"]}>
            <Row className={styles["http-history-detail-wrapper"]} gutter={8}>
                <Col span={mainCol} style={{height: "100%"}}>
                    {flow && (
                        <HTTPFlowDetailRequestAndResponse
                            flow={flow}
                            flowRequest={flowRequest}
                            flowResponse={flowResponse}
                            flowRequestLoad={flowRequestLoad}
                            flowResponseLoad={flowResponseLoad}
                            {...props}
                        />
                    )}
                </Col>
                {pageType !== "MITM" && (
                    <>
                        {infoType !== "rules" && existedInfoType.filter((i) => i !== "rules").length > 0 && !isFold && (
                            <Col span={5}>
                                <NewHTTPPacketEditor
                                    title={
                                        <Button.Group size={"small"}>
                                            {existedInfoType.map((i) => {
                                                return (
                                                    <YakitButton
                                                        size='small'
                                                        type={infoType === i ? "primary" : "outline2"}
                                                        onClick={() => {
                                                            setInfoType(i)
                                                        }}
                                                        key={i}
                                                    >
                                                        {infoTypeVerbose(i)}
                                                    </YakitButton>
                                                )
                                            })}
                                        </Button.Group>
                                    }
                                    readOnly={true}
                                    noLineNumber={true}
                                    noMinimap={true}
                                    noHex={true}
                                    hideSearch={true}
                                    refreshTrigger={infoType}
                                    loading={infoTypeLoading}
                                    extraEnd={
                                        <div className={classNames(styles["http-history-fold-box"])}>
                                            <div className={styles["http-history-icon-box"]}>
                                                <Tooltip placement='top' title='向右收起'>
                                                    <SideBarOpenIcon
                                                        className={styles["fold-icon"]}
                                                        onClick={() => {
                                                            setRemoteValue(
                                                                "IsFoldValue",
                                                                JSON.stringify({is: true, id})
                                                            )
                                                            setFold(true)
                                                        }}
                                                    />
                                                </Tooltip>
                                            </div>
                                        </div>
                                    }
                                    originValue={(() => {
                                        switch (infoType) {
                                            case "domains":
                                                return StringToUint8Array(
                                                    "# 根域 (Root-Domains)\r\n" +
                                                        (flow?.RootDomains || []).join("\r\n") +
                                                        "\r\n\r\n# 域名 (Domain) \r\n" +
                                                        (flow?.Domains || []).join("\r\n")
                                                )
                                            case "json":
                                                return StringToUint8Array((flow?.JsonObjects || []).join("\r\n"))
                                            default:
                                                return new Uint8Array()
                                        }
                                    })()}
                                    editorOperationRecord='HTTP_FLOW_DETAIL_MINI'
                                    isShowBeautifyRender={false}
                                />
                            </Col>
                        )}
                        {infoType === "rules" && existedInfoType.filter((i) => i === "rules").length > 0 && !isFold && (
                            <Col span={5}>
                                <HTTPFlowExtractedDataTable
                                    httpFlowHash={flow?.Hash || ""}
                                    title={
                                        <div className={styles["table-header"]}>
                                            <Button.Group size={"small"}>
                                                {existedInfoType.map((i) => {
                                                    return (
                                                        <YakitButton
                                                            size='small'
                                                            type={infoType === i ? "primary" : "outline2"}
                                                            onClick={() => {
                                                                setInfoType(i)
                                                            }}
                                                            key={i}
                                                        >
                                                            {infoTypeVerbose(i)}
                                                        </YakitButton>
                                                    )
                                                })}
                                            </Button.Group>
                                            <div className={classNames(styles["http-history-fold-box"])}>
                                                <div className={styles["http-history-icon-box"]}>
                                                    <Tooltip placement='top' title='向右收起'>
                                                        <SideBarOpenIcon
                                                            className={styles["fold-icon"]}
                                                            onClick={() => {
                                                                setRemoteValue(
                                                                    "IsFoldValue",
                                                                    JSON.stringify({is: true, id})
                                                                )
                                                                setFold(true)
                                                            }}
                                                        />
                                                    </Tooltip>
                                                </div>
                                            </div>
                                        </div>
                                    }
                                />
                            </Col>
                        )}
                        {existedInfoType.length === 0 && !isFold && (
                            <Col span={5}>
                                <div className={styles["empty-box"]}>
                                    <div className={classNames(styles["empty-box-fold-box"])}>
                                        <div className={styles["empty-box-icon-box"]}>
                                            <Tooltip placement='top' title='向右收起'>
                                                <SideBarOpenIcon
                                                    className={styles["fold-icon"]}
                                                    onClick={() => {
                                                        setRemoteValue("IsFoldValue", JSON.stringify({is: true}))
                                                        setFold(true)
                                                    }}
                                                />
                                            </Tooltip>
                                        </div>
                                    </div>
                                    <YakitEmpty style={{paddingTop: 48}} title='暂无数据' />
                                </div>
                            </Col>
                        )}
                    </>
                )}
            </Row>
            {isFold && pageType !== "MITM" && (
                <div className={classNames(styles["http-history-fold-box"], styles["http-history-fold-border-box"])}>
                    <div className={classNames(styles["http-history-icon-box"])} style={{height: 32}}>
                        <Tooltip placement='top' title='向左展开'>
                            <SideBarCloseIcon
                                className={styles["fold-icon"]}
                                onClick={() => {
                                    setRemoteValue("IsFoldValue", JSON.stringify({is: false, id}))
                                    setFold(false)
                                }}
                            />
                        </Tooltip>
                    </div>
                </div>
            )}
        </div>
    ) : null
}

interface HTTPFlowDetailRequestAndResponseProps extends HTTPFlowDetailProp {
    flow?: HTTPFlow
    flowRequest?: Uint8Array
    flowResponse?: Uint8Array
    flowRequestLoad?: boolean
    flowResponseLoad?: boolean
    pageType?: "MITM" | "history"
}

interface HTTPFlowBareProps {
    Id: number
    Data: Uint8Array
}

export const HTTPFlowDetailRequestAndResponse: React.FC<HTTPFlowDetailRequestAndResponseProps> = React.memo((props) => {
    const {
        flow,
        sendToWebFuzzer,
        defaultHeight,
        defaultHttps,
        search,
        id,
        Tags,
        flowRequest,
        flowResponse,
        flowRequestLoad,
        flowResponseLoad,
        historyId,
        pageType
    } = props

    const copyRequestBase64BodyMenuItem: OtherMenuListProps | {} = useMemo(() => {
        if (!flow?.RawRequestBodyBase64) return {}
        return {
            copyRequestBase64Body: {
                menu: [
                    {
                        key: "copy-request-base64-body",
                        label: "复制请求Body (Base64)"
                    }
                ],
                onRun: () => {
                    callCopyToClipboard(flow?.RawRequestBodyBase64 || "")
                }
            }
        }
    }, [flow?.RawRequestBodyBase64])

    const copyResponseBase64BodyMenuItem: OtherMenuListProps | {} = useMemo(() => {
        if (!flow?.RawResponseBodyBase64) return {}
        return {
            copyResponseBase64Body: {
                menu: [
                    {
                        key: "copy-response-base64-body",
                        label: "复制响应Body (Base64)"
                    }
                ],
                onRun: () => {
                    callCopyToClipboard(flow?.RawResponseBodyBase64 || "")
                }
            }
        }
    }, [flow?.RawResponseBodyBase64])

    // 编辑器复制Url菜单项
    const copyUrlMenuItem: OtherMenuListProps = useMemo(() => {
        return {
            copyUrl: {
                menu: [
                    {
                        key: "copy-url",
                        label: "复制URL"
                    }
                ],
                onRun: (editor, key) => {
                    callCopyToClipboard(flow?.Url || "")
                },
                order: 14
            }
        }
    }, [flow?.Url])

    // 是否显示原始数据
    const [isShowBeforeData, setShowBeforeData] = useState<boolean>(false)
    // 请求/原始请求
    const [resType, setResType] = useState<"current" | "request">("current")
    // 响应/原始响应
    const [rspType, setRspType] = useState<"current" | "response">("current")
    // 编辑器展示originValue
    const [originResValue, setOriginResValue] = useState<Uint8Array>(new Uint8Array())
    const [originRspValue, setOriginRspValue] = useState<Uint8Array>(new Uint8Array())
    // 原始数据
    const [beforeResValue, setBeforeResValue] = useState<Uint8Array>(new Uint8Array())
    const [beforeRspValue, setBeforeRspValue] = useState<Uint8Array>(new Uint8Array())
    // 编辑器实例
    const [reqEditor, setReqEditor] = useState<IMonacoEditor>()
    const [resEditor, setResEditor] = useState<IMonacoEditor>()
    useUpdateEffect(() => {
        setOriginResValue(flowRequest || new Uint8Array())
    }, [flowRequestLoad])

    useEffect(() => {
        // 复原数据
        setResType("current")
        setRspType("current")
        setOriginResValue(flow?.Request || new Uint8Array())
        setOriginRspValue(flow?.Response || new Uint8Array())
        // 编辑器滚轮回到顶部
        reqEditor?.setScrollTop(0)
        resEditor?.setScrollTop(0)
        const existedTags = Tags ? Tags.split("|").filter((i) => !!i && !i.startsWith("YAKIT_COLOR_")) : []
        if (existedTags.includes("[手动修改]")) {
            setShowBeforeData(true)
            handleGetHTTPFlowBare("request")
            handleGetHTTPFlowBare("response")
        } else {
            setShowBeforeData(false)
            setBeforeResValue(new Uint8Array())
            setBeforeRspValue(new Uint8Array())
        }
    }, [id])

    useEffect(() => {
        if (resType === "request") {
            setOriginResValue(beforeResValue)
        } else {
            setOriginResValue(flow?.Request || new Uint8Array())
        }
    }, [resType, flow?.Request])
    useEffect(() => {
        if (rspType === "response") {
            setOriginRspValue(beforeRspValue)
        } else {
            setOriginRspValue(flow?.Response || new Uint8Array())
        }
    }, [rspType, flow?.Response])
    const handleGetHTTPFlowBare = useMemoizedFn((data: "request" | "response") => {
        ipcRenderer
            .invoke("GetHTTPFlowBare", {
                Id: parseInt(id + ""),
                BareType: data
            })
            .then((res: HTTPFlowBareProps) => {
                if (res.Data && res.Data.length > 0) {
                    if (data === "request") {
                        setBeforeResValue(res.Data)
                    }
                    if (data === "response") {
                        setBeforeRspValue(res.Data)
                    }
                }
            })
            .catch((err) => {})
            .finally(() => {})
    })
    const onScrollTo = useMemoizedFn(() => {
        if (historyId) {
            emiter.emit("onScrollToByClick", JSON.stringify({historyId, id}))
        }
    })

    // 跳转指定网站树节点
    const handleJumpWebTree = useMemoizedFn(() => {
        if (flow?.Url) {
            console.log(123, flow)
            let treeData = {
                title: "https://www.baidu.com",
                key: "https://www.baidu.com",
                isLeaf: false,
                data: {
                    Extra: [
                        {
                            Key: "url",
                            Value: "https://www.baidu.com"
                        }
                    ],
                    ResourceType: "dir",
                    VerboseType: "filesystem-directory",
                    ResourceName: "/",
                    VerboseName: "https://www.baidu.com",
                    Size: "0",
                    SizeVerbose: "",
                    ModifiedTimestamp: "0",
                    Path: "/",
                    YakURLVerbose: "website://www.baidu.com/",
                    Url: {
                        Query: [
                            {
                                Key: "schema",
                                Value: "https"
                            },
                            {
                                Key: "op",
                                Value: "list"
                            }
                        ],
                        FromRaw: "",
                        Schema: "website",
                        User: "",
                        Pass: "",
                        Location: "www.baidu.com",
                        Path: "/"
                    },
                    HaveChildrenNodes: true
                },
                icon: {
                    key: null,
                    ref: null,
                    props: {},
                    _owner: null,
                    _store: {}
                },
                children: [
                    {
                        title: "sugrec/[16]",
                        key: "sugrec",
                        isLeaf: false,
                        data: {
                            Extra: [
                                {
                                    Key: "url",
                                    Value: "https://www.baidu.com/sugrec"
                                }
                            ],
                            ResourceType: "path",
                            VerboseType: "website-path",
                            ResourceName: "sugrec",
                            VerboseName: "sugrec/[16]",
                            Size: "16",
                            SizeVerbose: "16",
                            ModifiedTimestamp: "0",
                            Path: "/sugrec",
                            YakURLVerbose: "",
                            Url: {
                                Query: [
                                    {
                                        Key: "schema",
                                        Value: "https"
                                    },
                                    {
                                        Key: "op",
                                        Value: "list"
                                    },
                                    {
                                        Key: "op",
                                        Value: "list"
                                    }
                                ],
                                FromRaw: "",
                                Schema: "website",
                                User: "",
                                Pass: "",
                                Location: "www.baidu.com",
                                Path: "/sugrec"
                            },
                            HaveChildrenNodes: true
                        },
                        icon: {
                            key: null,
                            ref: null,
                            props: {
                                className: "yakitTreeNode-icon"
                            },
                            _owner: null,
                            _store: {}
                        },
                        children: [
                            {
                                title: "wd",
                                key: "wd",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/sugrec"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "wd",
                                    VerboseName: "wd",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/sugrec",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/sugrec"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "sid",
                                key: "sid",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/sugrec"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "sid",
                                    VerboseName: "sid",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/sugrec",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/sugrec"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "sc",
                                key: "sc",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/sugrec"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "sc",
                                    VerboseName: "sc",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/sugrec",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/sugrec"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "req",
                                key: "req",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/sugrec"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "req",
                                    VerboseName: "req",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/sugrec",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/sugrec"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "prod",
                                key: "prod",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/sugrec"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "prod",
                                    VerboseName: "prod",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/sugrec",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/sugrec"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "pre",
                                key: "pre",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/sugrec"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "pre",
                                    VerboseName: "pre",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/sugrec",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/sugrec"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "p",
                                key: "p",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/sugrec"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "p",
                                    VerboseName: "p",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/sugrec",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/sugrec"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "json",
                                key: "json",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/sugrec"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "json",
                                    VerboseName: "json",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/sugrec",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/sugrec"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "ie",
                                key: "ie",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/sugrec"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "ie",
                                    VerboseName: "ie",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/sugrec",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/sugrec"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "hisdata",
                                key: "hisdata",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/sugrec"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "hisdata",
                                    VerboseName: "hisdata",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/sugrec",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/sugrec"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "from",
                                key: "from",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/sugrec"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "from",
                                    VerboseName: "from",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/sugrec",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/sugrec"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "csor",
                                key: "csor",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/sugrec"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "csor",
                                    VerboseName: "csor",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/sugrec",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/sugrec"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "cb",
                                key: "cb",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/sugrec"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "cb",
                                    VerboseName: "cb",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/sugrec",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/sugrec"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "bs",
                                key: "bs",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/sugrec"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "bs",
                                    VerboseName: "bs",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/sugrec",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/sugrec"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "_t",
                                key: "_t",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/sugrec"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "_t",
                                    VerboseName: "_t",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/sugrec",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/sugrec"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "_",
                                key: "_",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/sugrec"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "_",
                                    VerboseName: "_",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/sugrec",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/sugrec"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            }
                        ]
                    },
                    {
                        title: "s/[32]",
                        key: "s",
                        isLeaf: false,
                        data: {
                            Extra: [
                                {
                                    Key: "url",
                                    Value: "https://www.baidu.com/s"
                                }
                            ],
                            ResourceType: "path",
                            VerboseType: "website-path",
                            ResourceName: "s",
                            VerboseName: "s/[32]",
                            Size: "32",
                            SizeVerbose: "32",
                            ModifiedTimestamp: "0",
                            Path: "/s",
                            YakURLVerbose: "",
                            Url: {
                                Query: [
                                    {
                                        Key: "schema",
                                        Value: "https"
                                    },
                                    {
                                        Key: "op",
                                        Value: "list"
                                    },
                                    {
                                        Key: "op",
                                        Value: "list"
                                    }
                                ],
                                FromRaw: "",
                                Schema: "website",
                                User: "",
                                Pass: "",
                                Location: "www.baidu.com",
                                Path: "/s"
                            },
                            HaveChildrenNodes: true
                        },
                        icon: {
                            key: null,
                            ref: null,
                            props: {
                                className: "yakitTreeNode-icon"
                            },
                            _owner: null,
                            _store: {}
                        },
                        children: [
                            {
                                title: "wd",
                                key: "wd",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "wd",
                                    VerboseName: "wd",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "ver",
                                key: "ver",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "ver",
                                    VerboseName: "ver",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "usm",
                                key: "usm",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "usm",
                                    VerboseName: "usm",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "tn",
                                key: "tn",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "tn",
                                    VerboseName: "tn",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "sug",
                                key: "sug",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "sug",
                                    VerboseName: "sug",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "sa",
                                key: "sa",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "sa",
                                    VerboseName: "sa",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "rsv_t",
                                key: "rsv_t",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "rsv_t",
                                    VerboseName: "rsv_t",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "rsv_sug7",
                                key: "rsv_sug7",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "rsv_sug7",
                                    VerboseName: "rsv_sug7",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "rsv_sug4",
                                key: "rsv_sug4",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "rsv_sug4",
                                    VerboseName: "rsv_sug4",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "rsv_sug3",
                                key: "rsv_sug3",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "rsv_sug3",
                                    VerboseName: "rsv_sug3",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "rsv_sug2",
                                key: "rsv_sug2",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "rsv_sug2",
                                    VerboseName: "rsv_sug2",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "rsv_sug1",
                                key: "rsv_sug1",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "rsv_sug1",
                                    VerboseName: "rsv_sug1",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "rsv_stat",
                                key: "rsv_stat",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "rsv_stat",
                                    VerboseName: "rsv_stat",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "rsv_sid",
                                key: "rsv_sid",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "rsv_sid",
                                    VerboseName: "rsv_sid",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "rsv_pq",
                                key: "rsv_pq",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "rsv_pq",
                                    VerboseName: "rsv_pq",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "rsv_n",
                                key: "rsv_n",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "rsv_n",
                                    VerboseName: "rsv_n",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "rsv_idx",
                                key: "rsv_idx",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "rsv_idx",
                                    VerboseName: "rsv_idx",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "rsv_enter",
                                key: "rsv_enter",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "rsv_enter",
                                    VerboseName: "rsv_enter",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "rsv_dl",
                                key: "rsv_dl",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "rsv_dl",
                                    VerboseName: "rsv_dl",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "rsv_btype",
                                key: "rsv_btype",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "rsv_btype",
                                    VerboseName: "rsv_btype",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "rsv_bp",
                                key: "rsv_bp",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "rsv_bp",
                                    VerboseName: "rsv_bp",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "rsp",
                                key: "rsp",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "rsp",
                                    VerboseName: "rsp",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "rsf",
                                key: "rsf",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "rsf",
                                    VerboseName: "rsf",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "rqlang",
                                key: "rqlang",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "rqlang",
                                    VerboseName: "rqlang",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "rqid",
                                key: "rqid",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "rqid",
                                    VerboseName: "rqid",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "pstg",
                                key: "pstg",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "pstg",
                                    VerboseName: "pstg",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "prefixsug",
                                key: "prefixsug",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "prefixsug",
                                    VerboseName: "prefixsug",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "pn",
                                key: "pn",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "pn",
                                    VerboseName: "pn",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "oq",
                                key: "oq",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "oq",
                                    VerboseName: "oq",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "mod",
                                key: "mod",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "mod",
                                    VerboseName: "mod",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "istc",
                                key: "istc",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "istc",
                                    VerboseName: "istc",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "isnop",
                                key: "isnop",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "isnop",
                                    VerboseName: "isnop",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "isid",
                                key: "isid",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "isid",
                                    VerboseName: "isid",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "isbd",
                                key: "isbd",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "isbd",
                                    VerboseName: "isbd",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "inputT",
                                key: "inputT",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "inputT",
                                    VerboseName: "inputT",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "ie",
                                key: "ie",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "ie",
                                    VerboseName: "ie",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "hsug",
                                key: "hsug",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "hsug",
                                    VerboseName: "hsug",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "hisfilter",
                                key: "hisfilter",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "hisfilter",
                                    VerboseName: "hisfilter",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "from",
                                key: "from",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "from",
                                    VerboseName: "from",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "fr",
                                key: "fr",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "fr",
                                    VerboseName: "fr",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "fenlei",
                                key: "fenlei",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "fenlei",
                                    VerboseName: "fenlei",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "f4s",
                                key: "f4s",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "f4s",
                                    VerboseName: "f4s",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "f",
                                key: "f",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "f",
                                    VerboseName: "f",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "csq",
                                key: "csq",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "csq",
                                    VerboseName: "csq",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "csor",
                                key: "csor",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "csor",
                                    VerboseName: "csor",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "cqid",
                                key: "cqid",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "cqid",
                                    VerboseName: "cqid",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "clist",
                                key: "clist",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "clist",
                                    VerboseName: "clist",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "cl",
                                key: "cl",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "cl",
                                    VerboseName: "cl",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "chk",
                                key: "chk",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "chk",
                                    VerboseName: "chk",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "bs",
                                key: "bs",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "bs",
                                    VerboseName: "bs",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "_ss",
                                key: "_ss",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "_ss",
                                    VerboseName: "_ss",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "_cr1",
                                key: "_cr1",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "_cr1",
                                    VerboseName: "_cr1",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "_ck",
                                key: "_ck",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/s"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "_ck",
                                    VerboseName: "_ck",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/s",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/s"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            }
                        ]
                    },
                    {
                        title: "link/[15]",
                        key: "link",
                        isLeaf: false,
                        data: {
                            Extra: [
                                {
                                    Key: "url",
                                    Value: "https://www.baidu.com/link"
                                }
                            ],
                            ResourceType: "path",
                            VerboseType: "website-path",
                            ResourceName: "link",
                            VerboseName: "link/[15]",
                            Size: "15",
                            SizeVerbose: "15",
                            ModifiedTimestamp: "0",
                            Path: "/link",
                            YakURLVerbose: "",
                            Url: {
                                Query: [
                                    {
                                        Key: "schema",
                                        Value: "https"
                                    },
                                    {
                                        Key: "op",
                                        Value: "list"
                                    },
                                    {
                                        Key: "op",
                                        Value: "list"
                                    }
                                ],
                                FromRaw: "",
                                Schema: "website",
                                User: "",
                                Pass: "",
                                Location: "www.baidu.com",
                                Path: "/link"
                            },
                            HaveChildrenNodes: true
                        },
                        icon: {
                            key: null,
                            ref: null,
                            props: {
                                className: "yakitTreeNode-icon"
                            },
                            _owner: null,
                            _store: {}
                        },
                        children: [
                            {
                                title: "wd",
                                key: "wd",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/link"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "wd",
                                    VerboseName: "wd",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/link",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/link"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "url",
                                key: "url",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/link"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "url",
                                    VerboseName: "url",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/link",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/link"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            },
                            {
                                title: "eqid",
                                key: "eqid",
                                isLeaf: true,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/link"
                                        }
                                    ],
                                    ResourceType: "file",
                                    VerboseType: "website-file-with-query",
                                    ResourceName: "eqid",
                                    VerboseName: "eqid",
                                    Size: "1",
                                    SizeVerbose: "1",
                                    ModifiedTimestamp: "0",
                                    Path: "/link",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/link"
                                    },
                                    HaveChildrenNodes: false
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                }
                            }
                        ]
                    },
                    {
                        title: "content-search.xml/[6]",
                        key: "content-search.xml",
                        isLeaf: true,
                        data: {
                            Extra: [
                                {
                                    Key: "url",
                                    Value: "https://www.baidu.com/content-search.xml"
                                }
                            ],
                            ResourceType: "",
                            VerboseType: "",
                            ResourceName: "content-search.xml",
                            VerboseName: "content-search.xml/[6]",
                            Size: "6",
                            SizeVerbose: "6",
                            ModifiedTimestamp: "0",
                            Path: "/content-search.xml",
                            YakURLVerbose: "",
                            Url: {
                                Query: [
                                    {
                                        Key: "schema",
                                        Value: "https"
                                    },
                                    {
                                        Key: "op",
                                        Value: "list"
                                    }
                                ],
                                FromRaw: "",
                                Schema: "website",
                                User: "",
                                Pass: "",
                                Location: "www.baidu.com",
                                Path: "/content-search.xml"
                            },
                            HaveChildrenNodes: false
                        },
                        icon: {
                            key: null,
                            ref: null,
                            props: {},
                            _owner: null,
                            _store: {}
                        }
                    },
                    {
                        title: "cache/[2]",
                        key: "cache",
                        isLeaf: false,
                        data: {
                            Extra: [
                                {
                                    Key: "url",
                                    Value: "https://www.baidu.com/cache"
                                }
                            ],
                            ResourceType: "path",
                            VerboseType: "website-path",
                            ResourceName: "cache",
                            VerboseName: "cache/[2]",
                            Size: "2",
                            SizeVerbose: "2",
                            ModifiedTimestamp: "0",
                            Path: "/cache",
                            YakURLVerbose: "",
                            Url: {
                                Query: [
                                    {
                                        Key: "schema",
                                        Value: "https"
                                    },
                                    {
                                        Key: "op",
                                        Value: "list"
                                    },
                                    {
                                        Key: "op",
                                        Value: "list"
                                    }
                                ],
                                FromRaw: "",
                                Schema: "website",
                                User: "",
                                Pass: "",
                                Location: "www.baidu.com",
                                Path: "/cache"
                            },
                            HaveChildrenNodes: true
                        },
                        icon: {
                            key: null,
                            ref: null,
                            props: {
                                className: "yakitTreeNode-icon"
                            },
                            _owner: null,
                            _store: {}
                        },
                        children: [
                            {
                                title: "aladdin/[2]",
                                key: "aladdin",
                                isLeaf: false,
                                data: {
                                    Extra: [
                                        {
                                            Key: "url",
                                            Value: "https://www.baidu.com/cache/aladdin"
                                        }
                                    ],
                                    ResourceType: "path",
                                    VerboseType: "website-path",
                                    ResourceName: "aladdin",
                                    VerboseName: "aladdin/[2]",
                                    Size: "2",
                                    SizeVerbose: "2",
                                    ModifiedTimestamp: "0",
                                    Path: "/cache/aladdin",
                                    YakURLVerbose: "",
                                    Url: {
                                        Query: [
                                            {
                                                Key: "schema",
                                                Value: "https"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            },
                                            {
                                                Key: "op",
                                                Value: "list"
                                            }
                                        ],
                                        FromRaw: "",
                                        Schema: "website",
                                        User: "",
                                        Pass: "",
                                        Location: "www.baidu.com",
                                        Path: "/cache/aladdin"
                                    },
                                    HaveChildrenNodes: true
                                },
                                icon: {
                                    key: null,
                                    ref: null,
                                    props: {
                                        className: "yakitTreeNode-icon"
                                    },
                                    _owner: null,
                                    _store: {}
                                },
                                children: [
                                    {
                                        title: "ui/[2]",
                                        key: "ui",
                                        isLeaf: false,
                                        data: {
                                            Extra: [
                                                {
                                                    Key: "url",
                                                    Value: "https://www.baidu.com/cache/aladdin/ui"
                                                }
                                            ],
                                            ResourceType: "path",
                                            VerboseType: "website-path",
                                            ResourceName: "ui",
                                            VerboseName: "ui/[2]",
                                            Size: "2",
                                            SizeVerbose: "2",
                                            ModifiedTimestamp: "0",
                                            Path: "/cache/aladdin/ui",
                                            YakURLVerbose: "",
                                            Url: {
                                                Query: [
                                                    {
                                                        Key: "schema",
                                                        Value: "https"
                                                    },
                                                    {
                                                        Key: "op",
                                                        Value: "list"
                                                    },
                                                    {
                                                        Key: "op",
                                                        Value: "list"
                                                    },
                                                    {
                                                        Key: "op",
                                                        Value: "list"
                                                    },
                                                    {
                                                        Key: "op",
                                                        Value: "list"
                                                    }
                                                ],
                                                FromRaw: "",
                                                Schema: "website",
                                                User: "",
                                                Pass: "",
                                                Location: "www.baidu.com",
                                                Path: "/cache/aladdin/ui"
                                            },
                                            HaveChildrenNodes: true
                                        },
                                        icon: {
                                            key: null,
                                            ref: null,
                                            props: {
                                                className: "yakitTreeNode-icon"
                                            },
                                            _owner: null,
                                            _store: {}
                                        },
                                        children: [
                                            {
                                                title: "tabs5/[2]",
                                                key: "tabs5",
                                                isLeaf: false,
                                                data: {
                                                    Extra: [
                                                        {
                                                            Key: "url",
                                                            Value: "https://www.baidu.com/cache/aladdin/ui/tabs5"
                                                        }
                                                    ],
                                                    ResourceType: "path",
                                                    VerboseType: "website-path",
                                                    ResourceName: "tabs5",
                                                    VerboseName: "tabs5/[2]",
                                                    Size: "2",
                                                    SizeVerbose: "2",
                                                    ModifiedTimestamp: "0",
                                                    Path: "/cache/aladdin/ui/tabs5",
                                                    YakURLVerbose: "",
                                                    Url: {
                                                        Query: [
                                                            {
                                                                Key: "schema",
                                                                Value: "https"
                                                            },
                                                            {
                                                                Key: "op",
                                                                Value: "list"
                                                            },
                                                            {
                                                                Key: "op",
                                                                Value: "list"
                                                            },
                                                            {
                                                                Key: "op",
                                                                Value: "list"
                                                            },
                                                            {
                                                                Key: "op",
                                                                Value: "list"
                                                            },
                                                            {
                                                                Key: "op",
                                                                Value: "list"
                                                            }
                                                        ],
                                                        FromRaw: "",
                                                        Schema: "website",
                                                        User: "",
                                                        Pass: "",
                                                        Location: "www.baidu.com",
                                                        Path: "/cache/aladdin/ui/tabs5"
                                                    },
                                                    HaveChildrenNodes: true
                                                },
                                                icon: {
                                                    key: null,
                                                    ref: null,
                                                    props: {
                                                        className: "yakitTreeNode-icon"
                                                    },
                                                    _owner: null,
                                                    _store: {}
                                                },
                                                children: [
                                                    {
                                                        title: "tabs5.js/[2]",
                                                        key: "tabs5.js",
                                                        isLeaf: false,
                                                        data: {
                                                            Extra: [
                                                                {
                                                                    Key: "url",
                                                                    Value: "https://www.baidu.com/cache/aladdin/ui/tabs5/tabs5.js"
                                                                }
                                                            ],
                                                            ResourceType: "path",
                                                            VerboseType: "website-path",
                                                            ResourceName: "tabs5.js",
                                                            VerboseName: "tabs5.js/[2]",
                                                            Size: "2",
                                                            SizeVerbose: "2",
                                                            ModifiedTimestamp: "0",
                                                            Path: "/cache/aladdin/ui/tabs5/tabs5.js",
                                                            YakURLVerbose: "",
                                                            Url: {
                                                                Query: [
                                                                    {
                                                                        Key: "schema",
                                                                        Value: "https"
                                                                    },
                                                                    {
                                                                        Key: "op",
                                                                        Value: "list"
                                                                    },
                                                                    {
                                                                        Key: "op",
                                                                        Value: "list"
                                                                    },
                                                                    {
                                                                        Key: "op",
                                                                        Value: "list"
                                                                    },
                                                                    {
                                                                        Key: "op",
                                                                        Value: "list"
                                                                    },
                                                                    {
                                                                        Key: "op",
                                                                        Value: "list"
                                                                    },
                                                                    {
                                                                        Key: "op",
                                                                        Value: "list"
                                                                    }
                                                                ],
                                                                FromRaw: "",
                                                                Schema: "website",
                                                                User: "",
                                                                Pass: "",
                                                                Location: "www.baidu.com",
                                                                Path: "/cache/aladdin/ui/tabs5/tabs5.js"
                                                            },
                                                            HaveChildrenNodes: true
                                                        },
                                                        icon: {
                                                            key: null,
                                                            ref: null,
                                                            props: {
                                                                className: "yakitTreeNode-icon"
                                                            },
                                                            _owner: null,
                                                            _store: {}
                                                        },
                                                        children: [
                                                            {
                                                                title: "v",
                                                                key: "v",
                                                                isLeaf: true,
                                                                data: {
                                                                    Extra: [
                                                                        {
                                                                            Key: "url",
                                                                            Value: "https://www.baidu.com/cache/aladdin/ui/tabs5/tabs5.js"
                                                                        }
                                                                    ],
                                                                    ResourceType: "file",
                                                                    VerboseType: "website-file-with-query",
                                                                    ResourceName: "v",
                                                                    VerboseName: "v",
                                                                    Size: "1",
                                                                    SizeVerbose: "1",
                                                                    ModifiedTimestamp: "0",
                                                                    Path: "/cache/aladdin/ui/tabs5/tabs5.js",
                                                                    YakURLVerbose: "",
                                                                    Url: {
                                                                        Query: [
                                                                            {
                                                                                Key: "schema",
                                                                                Value: "https"
                                                                            },
                                                                            {
                                                                                Key: "op",
                                                                                Value: "list"
                                                                            },
                                                                            {
                                                                                Key: "op",
                                                                                Value: "list"
                                                                            },
                                                                            {
                                                                                Key: "op",
                                                                                Value: "list"
                                                                            },
                                                                            {
                                                                                Key: "op",
                                                                                Value: "list"
                                                                            },
                                                                            {
                                                                                Key: "op",
                                                                                Value: "list"
                                                                            },
                                                                            {
                                                                                Key: "op",
                                                                                Value: "list"
                                                                            }
                                                                        ],
                                                                        FromRaw: "",
                                                                        Schema: "website",
                                                                        User: "",
                                                                        Pass: "",
                                                                        Location: "www.baidu.com",
                                                                        Path: "/cache/aladdin/ui/tabs5/tabs5.js"
                                                                    },
                                                                    HaveChildrenNodes: false
                                                                },
                                                                icon: {
                                                                    key: null,
                                                                    ref: null,
                                                                    props: {
                                                                        className: "yakitTreeNode-icon"
                                                                    },
                                                                    _owner: null,
                                                                    _store: {}
                                                                }
                                                            }
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }

            let url = new URL(flow.Url)
            let path: string[] = url.pathname.split("/").filter((item) => item)
            path.unshift(url.origin)
            emiter.emit("onJumpWebTree", JSON.stringify({treeData, path}))
        }
    })

    return (
        <YakitResizeBox
            firstNode={() => {
                if (flow === undefined) {
                    return <Empty description={"选择想要查看的 HTTP 记录请求"} />
                }
                if (flow?.IsWebsocket) {
                    return <HTTPFlowForWebsocketViewer flow={flow} />
                }
                return (
                    <NewHTTPPacketEditor
                        title={(() => {
                            let titleEle: ReactNode[] = []
                            if (isShowBeforeData && beforeResValue.length > 0) {
                                titleEle.push(
                                    <div className={classNames(styles["type-options-checkable-tag"])}>
                                        <YakitCheckableTag
                                            checked={resType === "current"}
                                            onChange={(checked) => {
                                                if (checked) {
                                                    setResType("current")
                                                }
                                            }}
                                        >
                                            请求
                                        </YakitCheckableTag>
                                        <YakitCheckableTag
                                            checked={resType === "request"}
                                            onChange={(checked) => {
                                                if (checked) {
                                                    setResType("request")
                                                }
                                            }}
                                        >
                                            原始请求
                                        </YakitCheckableTag>
                                    </div>
                                )
                            } else {
                                titleEle.push(<span style={{fontSize: 12}}>Request</span>)
                            }
                            titleEle.push(
                                <YakitTag
                                    color={"info"}
                                    style={{marginLeft: 6, cursor: "pointer"}}
                                    onClick={onScrollTo}
                                >
                                    id：{id}
                                </YakitTag>
                            )
                            if (pageType === "history") {
                                titleEle.push(
                                    <OutlineLog2Icon className={styles["jump-web-tree"]} onClick={handleJumpWebTree} />
                                )
                            }
                            return titleEle
                        })()}
                        originValue={originResValue}
                        readOnly={true}
                        noLineNumber={true}
                        sendToWebFuzzer={sendToWebFuzzer}
                        defaultHeight={defaultHeight}
                        loading={flowRequestLoad}
                        defaultHttps={defaultHttps}
                        hideSearch={true}
                        noHex={true}
                        noMinimap={true}
                        contextMenu={{
                            ...copyRequestBase64BodyMenuItem,
                            ...copyUrlMenuItem
                        }}
                        // 这个为了解决不可见字符的问题
                        defaultPacket={!!flow?.SafeHTTPRequest ? flow.SafeHTTPRequest : undefined}
                        extra={flow.InvalidForUTF8Request ? <Tag color={"red"}>含二进制流</Tag> : undefined}
                        defaultSearchKeyword={search}
                        editorOperationRecord='HTTP_FLOW_DETAIL_REQUEST_AND_REQUEST'
                        extraEditorProps={{
                            isShowSelectRangeMenu: true
                        }}
                        dataCompare={{
                            rightCode: beforeResValue,
                            leftCode: resType === "request" ? flow?.Request || new Uint8Array() : undefined,
                            leftTitle: "请求",
                            rightTitle: "原始请求"
                        }}
                        onEditor={(Editor) => {
                            setReqEditor(Editor)
                        }}
                    />
                )
            }}
            firstMinSize={300}
            secondNode={() => {
                if (flow === undefined) {
                    return <Empty description={"选择想要查看的 HTTP 记录响应"} />
                }
                if (flow?.IsWebsocket) {
                    return <WebsocketFrameHistory websocketHash={flow.WebsocketHash || ""} />
                }
                return (
                    <NewHTTPPacketEditor
                        language={flow?.DisableRenderStyles ? "text" : undefined}
                        isShowBeautifyRender={!flow?.IsTooLargeResponse}
                        title={(() => {
                            let titleEle = [<span style={{fontSize: 12}}>Response</span>]
                            if (isShowBeforeData && beforeRspValue.length > 0) {
                                titleEle = [
                                    <div className={classNames(styles["type-options-checkable-tag"])}>
                                        <YakitCheckableTag
                                            checked={rspType === "current"}
                                            onChange={(checked) => {
                                                if (checked) {
                                                    setRspType("current")
                                                }
                                            }}
                                        >
                                            响应
                                        </YakitCheckableTag>
                                        <YakitCheckableTag
                                            checked={rspType === "response"}
                                            onChange={(checked) => {
                                                if (checked) {
                                                    setRspType("response")
                                                }
                                            }}
                                        >
                                            原始响应
                                        </YakitCheckableTag>
                                    </div>
                                ]
                            }
                            // 超大响应
                            if (flow?.IsTooLargeResponse) {
                                titleEle.push(
                                    <YakitTag style={{marginLeft: 8}} color='danger'>
                                        超大响应
                                    </YakitTag>
                                )
                            }
                            return titleEle
                        })()}
                        contextMenu={{
                            ...copyResponseBase64BodyMenuItem,
                            ...copyUrlMenuItem
                        }}
                        extra={[
                            (() => {
                                if (flow?.IsTooLargeResponse)
                                    return (
                                        <YakitDropdownMenu
                                            menu={{
                                                data: [
                                                    {key: "tooLargeResponseHeaderFile", label: "查看Header"},
                                                    {key: "tooLargeResponseBodyFile", label: "查看Body"}
                                                ],
                                                onClick: ({key}) => {
                                                    switch (key) {
                                                        case "tooLargeResponseHeaderFile":
                                                            ipcRenderer
                                                                .invoke(
                                                                    "is-file-exists",
                                                                    flow.TooLargeResponseHeaderFile
                                                                )
                                                                .then((flag: boolean) => {
                                                                    if (flag) {
                                                                        openABSFileLocated(
                                                                            flow.TooLargeResponseHeaderFile
                                                                        )
                                                                    } else {
                                                                        failed("目标文件已不存在!")
                                                                    }
                                                                })
                                                                .catch(() => {})
                                                            break
                                                        case "tooLargeResponseBodyFile":
                                                            ipcRenderer
                                                                .invoke("is-file-exists", flow.TooLargeResponseBodyFile)
                                                                .then((flag: boolean) => {
                                                                    if (flag) {
                                                                        openABSFileLocated(
                                                                            flow.TooLargeResponseBodyFile
                                                                        )
                                                                    } else {
                                                                        failed("目标文件已不存在!")
                                                                    }
                                                                })
                                                                .catch(() => {})
                                                            break
                                                        default:
                                                            break
                                                    }
                                                }
                                            }}
                                            dropdown={{
                                                trigger: ["click"],
                                                placement: "bottom"
                                            }}
                                        >
                                            <YakitButton type='primary' size='small'>
                                                完整响应
                                            </YakitButton>
                                        </YakitDropdownMenu>
                                    )
                                return (
                                    <Button
                                        className={styles["extra-chrome-btn"]}
                                        type={"text"}
                                        size={"small"}
                                        icon={<ChromeSvgIcon />}
                                        onClick={() => {
                                            showResponseViaResponseRaw(flow?.Response)
                                        }}
                                    />
                                )
                            })()
                        ]}
                        isResponse={true}
                        noHex={true}
                        noMinimap={originRspValue.length < 1024 * 2}
                        loading={flowResponseLoad}
                        originValue={originRspValue}
                        readOnly={true}
                        defaultHeight={props.defaultHeight}
                        hideSearch={true}
                        defaultSearchKeyword={props.search}
                        defaultHttps={props.defaultHttps}
                        webFuzzerValue={flow?.Request || new Uint8Array()}
                        editorOperationRecord='HTTP_FLOW_DETAIL_REQUEST_AND_RESPONSE'
                        extraEditorProps={{
                            isShowSelectRangeMenu: true
                        }}
                        dataCompare={{
                            rightCode: beforeRspValue,
                            leftCode: rspType === "response" ? flow?.Response || new Uint8Array() : undefined,
                            leftTitle: "响应",
                            rightTitle: "原始响应"
                        }}
                        onEditor={(Editor) => {
                            setResEditor(Editor)
                        }}
                    />
                )
            }}
            secondMinSize={300}
        />
    )
})

function infoTypeVerbose(i: HTTPFlowInfoType) {
    switch (i) {
        case "domains":
            return "域名 "
        case "json":
            return "对象 "
        case "rules":
            return "规则 "
        default:
            return "-"
    }
}
