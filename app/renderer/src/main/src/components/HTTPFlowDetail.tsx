import React, {useEffect, useState, useMemo} from "react"
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
import {NewHTTPPacketEditor} from "../utils/editors"
import {failed} from "../utils/notification"
import {FuzzableParamList} from "./FuzzableParamList"
import {FuzzerResponse} from "../pages/fuzzer/HTTPFuzzerPage"
import {HTTPPacketFuzzable} from "./HTTPHistory"
import {AutoSpin} from "./AutoSpin"
import {Buffer} from "buffer"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {HTTPFlowForWebsocketViewer} from "@/pages/websocket/HTTPFlowForWebsocketViewer"
import {WebsocketFrameHistory} from "@/pages/websocket/WebsocketFrameHistory"

import styles from "./hTTPFlowDetail.module.scss"
import {callCopyToClipboard} from "@/utils/basic"
import {useMemoizedFn, useUpdateEffect} from "ahooks"
import {HTTPFlowExtractedDataTable} from "@/components/HTTPFlowExtractedDataTable"
import {showResponseViaResponseRaw} from "@/components/ShowInBrowser"
import {ChromeSvgIcon, SideBarCloseIcon, SideBarOpenIcon} from "@/assets/newIcon"
import {OtherMenuListProps} from "./yakitUI/YakitEditor/YakitEditorType"
import {YakitEmpty} from "./yakitUI/YakitEmpty/YakitEmpty"
import classNames from "classnames"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import { YakitResizeBox } from "./yakitUI/YakitResizeBox/YakitResizeBox"
import { YakitButton } from "./yakitUI/YakitButton/YakitButton"
import { YakitCheckableTag } from "./yakitUI/YakitTag/YakitCheckableTag"

const {ipcRenderer} = window.require("electron")

export type SendToFuzzerFunc = (req: Uint8Array, isHttps: boolean) => any

export interface HTTPFlowDetailProp extends HTTPPacketFuzzable {
    id: number
    payloads?: string[]
    noHeader?: boolean
    onClose?: () => any
    defaultHeight?: number
    Tags?:string

    //查看前/后一个请求内容
    isFront?: boolean
    isBehind?: boolean
    fetchRequest?: (kind: number) => any
    search?: string
    selectedFlow?: HTTPFlow
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
            },
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
                                                isShowSelectRangeMenu:true
                                            }}
                                            contextMenu={{ ...copyUrlMenuItem }}
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
                                                isShowSelectRangeMenu:true
                                            }}
                                            contextMenu={{ ...copyUrlMenuItem }}
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
    const {id, selectedFlow} = props
    const [flow, setFlow] = useState<HTTPFlow>()
    const [isSelect, setIsSelect] = useState<boolean>(false)
    const [loading, setLoading] = useState(false)
    const [infoType, setInfoType] = useState<HTTPFlowInfoType>()
    const [infoTypeLoading, setInfoTypeLoading] = useState(false)
    const [existedInfoType, setExistedInfoType] = useState<HTTPFlowInfoType[]>([])
    const [isFold, setFold] = useState<boolean>(false)
    useEffect(() => {
        if (!id) {
            setIsSelect(false)
            return
        }
        setIsSelect(true)
        getRemoteValue("IsFoldValue").then((data) => {
            if (!data) {
                return
            }
            const is: boolean = JSON.parse(data).is
            setFold(is)
        })
        setFlow(undefined)
        // 小于500K不走接口拿数据
        if (
            selectedFlow?.BodySizeVerbose == '0' ||
            selectedFlow?.BodySizeVerbose?.endsWith('B') ||
            selectedFlow?.BodySizeVerbose?.endsWith('K') && Number(selectedFlow?.BodySizeVerbose?.slice(0, -1)) <= 500
        ) {
            setFlow(selectedFlow)
            queryMITMRuleExtractedData(selectedFlow)
            return
        }
        setLoading(true)
        ipcRenderer
            .invoke("GetHTTPFlowById", {Id: id})
            .then((i: HTTPFlow) => {
                setFlow(i)
                queryMITMRuleExtractedData(i)
            })
            .catch((e: any) => {
                failed(`Query HTTPFlow failed: ${e}`)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 300)
            })
        return () => {
            setExistedInfoType([])
        }
    }, [id])

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

    const spinning = !flow || loading

    const mainCol: number = useMemo(() => {
        let col: number = existedInfoType.length > 0 ? 19 : 24
        if (isFold) {
            col = 24
        }
        return col
    }, [existedInfoType.length, isFold])

    return isSelect ? (
        <AutoSpin spinning={spinning} tip={"选择想要查看的请求 / 等待加载"}>
            <div className={styles["http-history-box"]}>
                <Row className={styles["http-history-detail-wrapper"]} gutter={8}>
                    <Col span={mainCol} style={{height: "100%"}}>
                        <HTTPFlowDetailRequestAndResponse loading={loading} flow={flow} {...props} />
                    </Col>
                    {infoType !== "rules" && existedInfoType.filter((i) => i !== "rules").length > 0 && !isFold && (
                        <Col span={5}>
                            <NewHTTPPacketEditor
                                title={
                                    <Button.Group size={"small"}>
                                        {existedInfoType.map((i) => {
                                            return (
                                                <YakitButton
                                                    size="small"
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
                                                        setRemoteValue("IsFoldValue", JSON.stringify({is: true}))
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
                                                    <Button
                                                        type={infoType === i ? "primary" : "default"}
                                                        onClick={() => {
                                                            setInfoType(i)
                                                        }}
                                                        key={i}
                                                    >
                                                        {infoTypeVerbose(i)}
                                                    </Button>
                                                )
                                            })}
                                        </Button.Group>
                                        <div className={classNames(styles["http-history-fold-box"])}>
                                            <div className={styles["http-history-icon-box"]}>
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
                                    </div>
                                }
                            />
                        </Col>
                    )}
                </Row>
                {isFold && (
                    <div
                        className={classNames(styles["http-history-fold-box"], styles["http-history-fold-border-box"])}
                    >
                        <div
                            className={classNames(
                                styles["http-history-icon-box"],
                                styles["http-history-icon-paading-box"]
                            )}
                        >
                            <Tooltip placement='top' title='向左展开'>
                                <SideBarCloseIcon
                                    className={styles["fold-icon"]}
                                    onClick={() => {
                                        setRemoteValue("IsFoldValue", JSON.stringify({is: false}))
                                        setFold(false)
                                    }}
                                />
                            </Tooltip>
                        </div>
                    </div>
                )}
            </div>
        </AutoSpin>
    ) : (
        <YakitEmpty style={{paddingTop: 48}} title='未选中 HTTP History 数据' />
    )
}

interface HTTPFlowDetailRequestAndResponseProps extends HTTPFlowDetailProp {
    flow?: HTTPFlow
    loading: boolean
}

interface HTTPFlowBareProps {
    Id: number
    Data: Uint8Array
}

export const HTTPFlowDetailRequestAndResponse: React.FC<HTTPFlowDetailRequestAndResponseProps> = React.memo((props) => {
    const {flow, sendToWebFuzzer, defaultHeight, defaultHttps, search, loading,id,Tags} = props

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
            },
        }
    }, [flow?.Url])

    // 是否显示原始数据
    const [isShowBeforeData,setShowBeforeData] = useState<boolean>(false)
    // 请求/原始请求 
    const [resType, setResType] = useState<"current" | "request">("current")
    // 响应/原始响应
    const [rspType, setRspType] = useState<"current" | "response">("current")
    // 编辑器展示originValue
    const [originResValue,setOriginResValue] = useState<Uint8Array>(new Uint8Array())
    const [originRspValue,setOriginRspValue] = useState<Uint8Array>(new Uint8Array())
    // 原始数据
    const [beforeResValue,setBeforeResValue] = useState<Uint8Array>(new Uint8Array())
    const [beforeRspValue,setBeforeRspValue] = useState<Uint8Array>(new Uint8Array())
    useEffect(()=>{
        // 复原数据
        setResType("current")
        setRspType("current")
        setOriginResValue(flow?.Request|| new Uint8Array())
        setOriginRspValue(flow?.Response|| new Uint8Array())
        setBeforeResValue(new Uint8Array())
        setBeforeRspValue(new Uint8Array())
        const existedTags = Tags ? Tags.split("|").filter((i) => !!i && !i.startsWith("YAKIT_COLOR_")) : []
        if(existedTags.includes("[手动修改]")){
            setShowBeforeData(true)
        }
        else{
            setShowBeforeData(false)
        }
    },[id])

    useUpdateEffect(()=>{
        if(isShowBeforeData){
            // 获取原始数据内容后 有内容则展示 无内容不展示
            handleGetHTTPFlowBare("request")
            handleGetHTTPFlowBare("response")
        }
    },[isShowBeforeData,id])
    
    useEffect(()=>{
        if(resType==="request"){
            setOriginResValue(beforeResValue)
        }
        else{
            setOriginResValue(flow?.Request|| new Uint8Array())
        }
    },[resType,flow?.Request])
    useEffect(()=>{
        if(rspType==="response"){
            setOriginRspValue(beforeRspValue)
        }
        else{
            setOriginRspValue(flow?.Response|| new Uint8Array())
        }
    },[rspType,flow?.Response])
    const handleGetHTTPFlowBare = useMemoizedFn((data:"request"|"response") => {
        ipcRenderer
            .invoke("GetHTTPFlowBare", {
                Id:parseInt(id+""),
                BareType:data
            })
            .then((res:HTTPFlowBareProps) => {
                if(res.Data&&res.Data.length>0){
                    if(data==="request"){
                        setBeforeResValue(res.Data)
                    }
                    if(data==="response"){
                        setBeforeRspValue(res.Data)
                    }
                }
            })
            .catch((err) => {})
            .finally(() => {})
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
                    title={
                        isShowBeforeData&&beforeResValue.length>0&&<div className={classNames(styles["type-options-checkable-tag"])}>
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
                    }
                        originValue={originResValue}
                        readOnly={true}
                        noLineNumber={true}
                        sendToWebFuzzer={sendToWebFuzzer}
                        defaultHeight={defaultHeight}
                        loading={loading}
                        defaultHttps={defaultHttps}
                        hideSearch={true}
                        noHex={true}
                        noMinimap={true}
                        contextMenu={{ ...copyRequestBase64BodyMenuItem, ...copyUrlMenuItem }}
                        // 这个为了解决不可见字符的问题
                        defaultPacket={!!flow?.SafeHTTPRequest ? flow.SafeHTTPRequest : undefined}
                        extra={flow.InvalidForUTF8Request ? <Tag color={"red"}>含二进制流</Tag> : undefined}
                        defaultSearchKeyword={search}
                        editorOperationRecord='HTTP_FLOW_DETAIL_REQUEST_AND_REQUEST'
                        extraEditorProps={{
                            isShowSelectRangeMenu:true
                        }}
                        dataCompare={beforeResValue}
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
                    title={
                        isShowBeforeData&&beforeRspValue.length>0&&<div className={classNames(styles["type-options-checkable-tag"])}>
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
                    }
                        contextMenu={{ ...copyResponseBase64BodyMenuItem, ...copyUrlMenuItem }}
                        extra={[
                            <Button
                                className={styles["extra-chrome-btn"]}
                                type={"text"}
                                size={"small"}
                                icon={<ChromeSvgIcon />}
                                onClick={() => {
                                    showResponseViaResponseRaw(flow?.Response)
                                }}
                            />
                        ]}
                        isResponse={true}
                        noHex={true}
                        noMinimap={originRspValue.length < 1024 * 2}
                        loading={loading}
                        originValue={originRspValue}
                        readOnly={true}
                        defaultHeight={props.defaultHeight}
                        hideSearch={true}
                        defaultSearchKeyword={props.search}
                        defaultHttps={props.defaultHttps}
                        webFuzzerValue={flow?.Request || new Uint8Array()}
                        editorOperationRecord='HTTP_FLOW_DETAIL_REQUEST_AND_RESPONSE'
                        extraEditorProps={{
                            isShowSelectRangeMenu:true
                        }}
                        dataCompare={beforeRspValue}
                    />
                    // {
                    //     type==="render"&&prettifyPacketCode(new Buffer((flow?.Response || new Uint8Array())).toString("utf8"))
                    // }
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
