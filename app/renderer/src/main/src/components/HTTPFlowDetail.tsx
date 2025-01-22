import React, {useEffect, useState, useMemo, useRef, ReactNode, ReactElement} from "react"
import {Button, Card, Col, Descriptions, Empty, PageHeader, Row, Space, Tag, Tooltip} from "antd"
import {LeftOutlined, RightOutlined} from "@ant-design/icons"
import {HTTPFlow} from "./HTTPFlowTable/HTTPFlowTable"
import {IMonacoEditor, NewHTTPPacketEditor, RenderTypeOptionVal} from "../utils/editors"
import {failed, yakitNotify} from "../utils/notification"
import {FuzzableParamList} from "./FuzzableParamList"
import {FuzzerResponse} from "../pages/fuzzer/HTTPFuzzerPage"
import {HTTPHistorySourcePageType, HTTPPacketFuzzable} from "./HTTPHistory"
import {Buffer} from "buffer"
import {Uint8ArrayToString} from "@/utils/str"
import {HTTPFlowForWebsocketViewer, WebSocketEditor} from "@/pages/websocket/HTTPFlowForWebsocketViewer"
import {WebsocketFrameHistory} from "@/pages/websocket/WebsocketFrameHistory"

import styles from "./hTTPFlowDetail.module.scss"
import {useDebounceEffect, useMemoizedFn, useUpdateEffect} from "ahooks"
import {
    ExtractedDataFilter,
    HTTPFlowExtractedData,
    HTTPFlowExtractedDataTable,
    HTTPFlowExtractedDataTableRefProps,
    QueryMITMRuleExtractedDataRequest
} from "@/components/HTTPFlowExtractedDataTable"
import {ChevronDownIcon, ChevronUpIcon, ChromeSvgIcon, SideBarCloseIcon, SideBarOpenIcon} from "@/assets/newIcon"
import {YakitEmpty} from "./yakitUI/YakitEmpty/YakitEmpty"
import classNames from "classnames"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {YakitResizeBox} from "./yakitUI/YakitResizeBox/YakitResizeBox"
import {YakitButton} from "./yakitUI/YakitButton/YakitButton"
import {YakitCheckableTag} from "./yakitUI/YakitTag/YakitCheckableTag"
import {CopyComponents, YakitTag} from "./yakitUI/YakitTag/YakitTag"
import {YakitDropdownMenu} from "./yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {openABSFileLocated, openExternalWebsite} from "@/utils/openWebsite"
import emiter from "@/utils/eventBus/eventBus"
import {OutlineLog2Icon} from "@/assets/icon/outline"
import {useHttpFlowStore} from "@/store/httpFlow"
import {RemoteGV} from "@/yakitGV"
import {QueryGeneralResponse} from "@/pages/invoker/schema"
import {YakitPopover} from "./yakitUI/YakitPopover/YakitPopover"
import {SolidCheckIcon} from "@/assets/icon/solid"
import {YakitCopyText} from "./yakitUI/YakitCopyText/YakitCopyText"
import YakitCollapse from "./yakitUI/YakitCollapse/YakitCollapse"
import PluginTabs from "./businessUI/PluginTabs/PluginTabs"
import {YakitSpin} from "./yakitUI/YakitSpin/YakitSpin"
import {asynSettingState} from "@/utils/optimizeRender"
import {HighLightText} from "./yakitUI/YakitEditor/YakitEditorType"
const {TabPane} = PluginTabs
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

    historyId?: string
    downstreamProxyStr?: string
    loading?: boolean
    pageType?: HTTPHistorySourcePageType
}

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

    return (
        <HTTPFlowDetail
            onClose={rsp.onClosed}
            id={id}
            payloads={rsp?.response ? rsp.response.Payloads : undefined}
            isFront={index === undefined ? undefined : index === 0}
            isBehind={index === undefined ? undefined : index === (rsp?.data || []).length - 1}
            fetchRequest={fetchInfo}
            loading={loading}
        />
    )
}

export const HTTPFlowDetail: React.FC<HTTPFlowDetailProp> = (props) => {
    const [flow, setFlow] = useState<HTTPFlow>()
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        setLoading(props.loading || false)
    }, [props.loading])

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

    const onCloseDetails = useMemoizedFn((e, res) => {
        const {type, data} = res
        if ((type === "fuzzer" || type === "websocket-fuzzer") && data.openFlag === false) return
        if (props.onClose) props.onClose()
    })

    useEffect(() => {
        // 发送webfuzzer后关闭详情
        ipcRenderer.on("fetch-send-to-tab", onCloseDetails)

        return () => {
            ipcRenderer.removeListener("fetch-send-to-tab", onCloseDetails)
        }
    }, [])

    // 编辑器发送到对比器
    const {compareState, setCompareLeft, setCompareRight} = useHttpFlowStore()
    const sendCodeCompareMenuItem = (type: string) => {
        return {
            codeCompare: {
                menu: [
                    {
                        key: "code-compare",
                        label: "发送到对比器",
                        children: [
                            {
                                key: "code-compare-left",
                                label: "发送到对比器左侧",
                                disabled: [false, true, false][compareState]
                            },
                            {
                                key: "code-compare-right",
                                label: "发送到对比器右侧",
                                disabled: [false, false, true][compareState]
                            }
                        ]
                    }
                ],
                onRun: (editor, key) => {
                    if (type === "response" && flow?.Response) {
                        if (key === "code-compare-left") {
                            setCompareLeft({
                                content: new Buffer(flow?.Response).toString("utf8"),
                                language: "http"
                            })
                        } else {
                            setCompareRight({
                                content: new Buffer(flow?.Response).toString("utf8"),
                                language: "http"
                            })
                        }
                        return
                    }

                    if (type === "request" && flow?.Request) {
                        if (key === "code-compare-left") {
                            setCompareLeft({
                                content: new Buffer(flow?.Request).toString("utf8"),
                                language: "http"
                            })
                        } else {
                            setCompareRight({
                                content: new Buffer(flow?.Request).toString("utf8"),
                                language: "http"
                            })
                        }
                        return
                    }
                }
            }
        }
    }

    return (
        <YakitSpin spinning={loading} style={{width: "100%", marginBottom: 24}} tip='正在分析详细参数'>
            {flow ? (
                <>
                    {props.noHeader ? undefined : (
                        <PageHeader
                            title={`请求详情`}
                            subTitle={`${props.id}${
                                (props.payloads || []).length > 0 ? `  Payload: ${props.payloads?.join(",")}` : ""
                            }`}
                            style={{padding: 0, paddingBottom: 5}}
                            extra={
                                props.fetchRequest ? (
                                    <Space>
                                        <Tooltip title={"上一个请求"}>
                                            <YakitButton
                                                type='text'
                                                disabled={!!props.isFront}
                                                icon={<LeftOutlined />}
                                                onClick={() => {
                                                    props?.fetchRequest!(1)
                                                }}
                                            ></YakitButton>
                                        </Tooltip>
                                        <Tooltip title={"下一个请求"}>
                                            <YakitButton
                                                type='text'
                                                disabled={!!props.isBehind}
                                                icon={<RightOutlined />}
                                                onClick={() => {
                                                    props?.fetchRequest!(2)
                                                }}
                                            ></YakitButton>
                                        </Tooltip>
                                    </Space>
                                ) : (
                                    <></>
                                )
                            }
                        />
                    )}
                    <Space direction={"vertical"} style={{width: "100%"}}>
                        <Descriptions
                            column={4}
                            bordered={true}
                            size={"small"}
                            className={classNames(styles["detail-header-info"], "yakit-descriptions")}
                        >
                            <Descriptions.Item key={"method"} span={1} label={"HTTP 方法"}>
                                <YakitTag color='blue'>{flow.Method}</YakitTag>
                            </Descriptions.Item>
                            <Descriptions.Item key={"url"} span={3} label={"请求 URL"}>
                                <div style={{display: "flex"}}>
                                    <Tooltip title={flow.Url} overlayInnerStyle={{maxHeight: 300, overflowY: "auto"}}>
                                        <span className='content-ellipsis'>{flow.Url}</span>
                                    </Tooltip>
                                    <CopyComponents copyText={flow.Url} />
                                </div>
                            </Descriptions.Item>
                            {(props?.payloads || []).length > 0 && (
                                <Descriptions.Item key={"payloads"} span={4} label={"Payloads"}>
                                    <YakitCopyText showText={props.payloads?.join(",") || ""}></YakitCopyText>
                                </Descriptions.Item>
                            )}
                            <Descriptions.Item key={"https"} span={1} label={"HTTPS"}>
                                <YakitTag color='blue'>{flow.IsHTTPS ? "True" : "False"}</YakitTag>
                            </Descriptions.Item>
                            <Descriptions.Item key={"status"} span={1} label={"StatusCode"}>
                                <YakitTag color='blue'>{flow.StatusCode}</YakitTag>
                            </Descriptions.Item>
                            <Descriptions.Item key={"size"} span={1} label={"Body大小"}>
                                <YakitTag color='blue'>{flow.BodySizeVerbose}</YakitTag>
                            </Descriptions.Item>
                            <Descriptions.Item key={"type"} span={1} label={"Content-Type"}>
                                <Tooltip title={flow.ContentType}>
                                    <YakitTag
                                        color='blue'
                                        className='content-ellipsis'
                                        style={{
                                            maxWidth: "100%",
                                            display: "inline-block",
                                            lineHeight: "12px"
                                        }}
                                    >
                                        {flow.ContentType}
                                    </YakitTag>
                                </Tooltip>
                            </Descriptions.Item>
                        </Descriptions>
                        <div style={{width: "100%", overflow: "auto"}}>
                            {flow.GetParams.length > 0 || flow.PostParams.length > 0 || flow.CookieParams.length > 0 ? (
                                <PluginTabs>
                                    {flow.GetParams.length > 0 && (
                                        <TabPane key={"get"} tab={"GET 参数"}>
                                            <FuzzableParamList
                                                data={flow.GetParams}
                                                sendToWebFuzzer={() => {
                                                    if (props.onClose) props.onClose()
                                                }}
                                            />
                                        </TabPane>
                                    )}
                                    {flow.PostParams.length > 0 && (
                                        <TabPane key={"post"} tab={"POST 参数"}>
                                            <FuzzableParamList
                                                data={flow.PostParams}
                                                sendToWebFuzzer={() => {
                                                    if (props.onClose) props.onClose()
                                                }}
                                            />
                                        </TabPane>
                                    )}
                                    {flow.CookieParams.length > 0 && (
                                        <TabPane key={"cookie"} tab={"Cookie 参数"}>
                                            <FuzzableParamList
                                                data={flow.CookieParams}
                                                sendToWebFuzzer={() => {
                                                    if (props.onClose) props.onClose()
                                                }}
                                            />
                                        </TabPane>
                                    )}
                                </PluginTabs>
                            ) : (
                                ""
                            )}
                        </div>

                        <Row gutter={8}>
                            <Col span={12}>
                                <Card title={"原始 HTTP 请求"} size={"small"} bodyStyle={{padding: 0}}>
                                    <div style={{height: 350}}>
                                        {flow.IsWebsocket ? (
                                            <WebSocketEditor flow={flow} value={flow.RequestString} />
                                        ) : (
                                            <NewHTTPPacketEditor
                                                readOnly={true}
                                                hideSearch={true}
                                                noHex={true}
                                                noHeader={true}
                                                originValue={flow.RequestString}
                                                defaultHttps={flow?.IsHTTPS}
                                                // actions={[...actionFuzzer]}
                                                extraEditorProps={{
                                                    isShowSelectRangeMenu: true
                                                }}
                                                contextMenu={{
                                                    ...sendCodeCompareMenuItem("request")
                                                }}
                                                url={flow.Url}
                                                downstreamProxyStr={props.downstreamProxyStr}
                                                downbodyParams={{Id: flow.Id, IsRequest: true}}
                                            />
                                        )}
                                    </div>
                                </Card>
                            </Col>
                            <Col span={12}>
                                <Card title={"原始 HTTP 响应"} size={"small"} bodyStyle={{padding: 0}}>
                                    <div style={{height: 350}}>
                                        {flow.IsWebsocket ? (
                                            <WebSocketEditor flow={flow} value={flow.ResponseString} />
                                        ) : (
                                            <NewHTTPPacketEditor
                                                readOnly={true}
                                                hideSearch={true}
                                                noHex={true}
                                                noHeader={true}
                                                originValue={flow.ResponseString}
                                                defaultHttps={flow?.IsHTTPS}
                                                // actions={[...actionFuzzer]}
                                                webFuzzerValue={flow.RequestString || ""}
                                                extraEditorProps={{
                                                    isShowSelectRangeMenu: true
                                                }}
                                                contextMenu={{
                                                    ...sendCodeCompareMenuItem("response")
                                                }}
                                                url={flow.Url}
                                                downstreamProxyStr={props.downstreamProxyStr}
                                                downbodyParams={{Id: flow.Id, IsRequest: false}}
                                            />
                                        )}
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
                                <YakitCollapse defaultActiveKey={"request"}>
                                    <YakitCollapse.YakitPanel key={"request"} header={"Request Headers"}>
                                        <Descriptions
                                            className={classNames(
                                                styles["http-flow-detail-descriptions"],
                                                "yakit-descriptions"
                                            )}
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
                                                                <Tooltip title={i.Header}>
                                                                    <YakitTag
                                                                        className='content-ellipsis'
                                                                        style={{
                                                                            maxWidth: "100%",
                                                                            display: "inline-block",
                                                                            lineHeight: "12px"
                                                                        }}
                                                                    >
                                                                        {i.Header}
                                                                    </YakitTag>
                                                                </Tooltip>
                                                            }
                                                        >
                                                            <div style={{display: "flex"}}>
                                                                <Tooltip
                                                                    title={i.Value}
                                                                    overlayInnerStyle={{
                                                                        maxHeight: 300,
                                                                        overflowY: "auto"
                                                                    }}
                                                                >
                                                                    <span className='content-ellipsis'>{i.Value}</span>
                                                                </Tooltip>
                                                                <CopyComponents copyText={i.Value} />
                                                            </div>
                                                        </Descriptions.Item>
                                                    )
                                                })}
                                        </Descriptions>
                                    </YakitCollapse.YakitPanel>
                                </YakitCollapse>
                            </Col>
                            <Col span={12}>
                                <YakitCollapse defaultActiveKey={"response"}>
                                    <YakitCollapse.YakitPanel key={"response"} header={"Response Headers"}>
                                        <Descriptions
                                            className={classNames(
                                                styles["http-flow-detail-descriptions"],
                                                "yakit-descriptions"
                                            )}
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
                                                                <Tooltip title={i.Header}>
                                                                    <YakitTag
                                                                        className='content-ellipsis'
                                                                        style={{
                                                                            maxWidth: "100%",
                                                                            display: "inline-block",
                                                                            lineHeight: "12px"
                                                                        }}
                                                                    >
                                                                        {i.Header}
                                                                    </YakitTag>
                                                                </Tooltip>
                                                            }
                                                        >
                                                            <div style={{display: "flex"}}>
                                                                <Tooltip
                                                                    title={i.Value}
                                                                    overlayInnerStyle={{
                                                                        maxHeight: 300,
                                                                        overflowY: "auto"
                                                                    }}
                                                                >
                                                                    <span className='content-ellipsis'>{i.Value}</span>
                                                                </Tooltip>
                                                                <CopyComponents copyText={i.Value} />
                                                            </div>
                                                        </Descriptions.Item>
                                                    )
                                                })}
                                        </Descriptions>
                                    </YakitCollapse.YakitPanel>
                                </YakitCollapse>
                            </Col>
                        </Row>
                    </Space>
                </>
            ) : (
                ""
            )}
        </YakitSpin>
    )
}

type HTTPFlowInfoType = "domains" | "json" | "rules"

export interface HistoryHighLightText extends HighLightText {
    IsMatchRequest?: boolean
}

export const HTTPFlowDetailMini: React.FC<HTTPFlowDetailProp> = (props) => {
    const {id, selectedFlow, refresh, defaultFold = true} = props
    const [flow, setFlow] = useState<HTTPFlow>()
    const [flowRequestLoad, setFlowRequestLoad] = useState<boolean>(false)
    const [flowResponseLoad, setFlowResponseLoad] = useState<boolean>(false)
    const [isSelect, setIsSelect] = useState<boolean>(false)
    const [infoType, setInfoType] = useState<HTTPFlowInfoType>()
    const [infoTypeLoading, setInfoTypeLoading] = useState(false)
    const [existedInfoType, setExistedInfoType] = useState<HTTPFlowInfoType[]>([])
    const [isFold, setFold] = useState<boolean>(defaultFold)
    const lastIdRef = useRef<number>()
    const [highLightText, setHighLightText] = useState<HistoryHighLightText[]>([])
    const [highLightItem, setHighLightItem] = useState<HistoryHighLightText>()

    useEffect(() => {
        update()
    }, [id])

    useUpdateEffect(() => {
        update(true)
    }, [refresh])

    useUpdateEffect(() => {
        setRemoteValue("HISTORY_FOLD", JSON.stringify(isFold))
        if (isFold) {
            setHighLightItem(undefined)
            setCurrId(undefined)
        }
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

        // 是否获取Request
        let isGetRequest: boolean = true
        let isGetResponse: boolean = true

        // 请求不为空直接使用
        if (selectedFlow?.RequestString && !isSkip) {
            isGetRequest = false
        }
        if (selectedFlow?.ResponseString && !isSkip) {
            isGetResponse = false
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
                    Page: 1,
                    Limit: 10
                },
                Filter: {
                    TraceID: [i.HiddenIndex]
                }
            } as QueryMITMRuleExtractedDataRequest)
            .then((rsp: QueryGeneralResponse<HTTPFlowExtractedData>) => {
                setHighLightItem(undefined)
                setCurrId(undefined)

                if (rsp.Total > 0) {
                    existedExtraInfos.push("rules")

                    if (i?.InvalidForUTF8Request || i?.InvalidForUTF8Response) {
                        setHighLightText([])
                    } else {
                        // 当侧边栏为关闭的时候，需要重新设置一下更新一下高亮
                        if (isFold) {
                            setHighLightText(
                                rsp.Data.map((i) => ({
                                    startOffset: i.Index,
                                    highlightLength: i.Length,
                                    hoverVal: i.RuleName,
                                    IsMatchRequest: i.IsMatchRequest
                                }))
                            )
                        }
                    }
                } else {
                    setHighLightText([])
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

    const httpFlowTableRef = useRef<HTTPFlowExtractedDataTableRefProps>(null)
    const [currId, setCurrId] = useState<number | undefined>()
    const [extractedData, setExtractedData] = useState<HTTPFlowExtractedData[]>([])
    const [exportMITMRuleFilter, setExportMITMRuleFilter] = useState<ExtractedDataFilter>({
        TraceID: [],
        RuleVerbose: []
    })
    const exportMITMRuleExtractedData = useMemoizedFn(() => {
        ipcRenderer
            .invoke("ExportMITMRuleExtractedData", {
                Filter: exportMITMRuleFilter
            })
            .then((ExportFilePath: string) => {
                openABSFileLocated(ExportFilePath)
                yakitNotify("success", "导出成功")
            })
            .catch((err) => {
                yakitNotify("error", "导出失败：" + err)
            })
    })
    const disablePrev = useMemo(() => {
        if (flow?.InvalidForUTF8Request || flow?.InvalidForUTF8Response) {
            return true
        }
        if (extractedData.length === 0) {
            return true
        }
        if (currId === undefined) {
            return true
        }
        const currIndex = extractedData.findIndex((item) => item.Id == currId)
        if (currIndex <= 0) {
            return true
        }
    }, [flow, currId, extractedData])
    const disableNext = useMemo(() => {
        if (flow?.InvalidForUTF8Request || flow?.InvalidForUTF8Response) {
            return true
        }
        if (extractedData.length === 0) {
            return true
        }
        if (currId === undefined) {
            return true
        }
        const currIndex = extractedData.findIndex((item) => item.Id == currId)
        if (currIndex >= extractedData.length - 1) {
            return true
        }
    }, [flow, currId, extractedData])

    return isSelect ? (
        <div className={styles["http-history-box"]}>
            <YakitResizeBox
                key={isFold + "" + flow?.Id + flow?.HiddenIndex}
                freeze={!isFold}
                isRecalculateWH={!isFold}
                firstNode={
                    flow && (
                        <HTTPFlowDetailRequestAndResponse
                            flow={flow}
                            flowRequestLoad={flowRequestLoad}
                            flowResponseLoad={flowResponseLoad}
                            highLightText={highLightText}
                            highLightItem={highLightItem}
                            {...props}
                        />
                    )
                }
                firstMinSize='650px'
                firstRatio={isFold ? "calc(100% - 36px)" : "80%"}
                secondNode={
                    <div style={{paddingRight: 2, height: "100%"}}>
                        {isFold ? (
                            <div
                                className={classNames(
                                    styles["http-history-fold-box"],
                                    styles["http-history-fold-border-box"]
                                )}
                            >
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
                        ) : (
                            <div className={styles["http-history-detail-wrapper"]}>
                                {infoType !== "rules" && existedInfoType.filter((i) => i !== "rules").length > 0 && (
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
                                                    return (
                                                        "# 根域 (Root-Domains)\r\n" +
                                                        (flow?.RootDomains || []).join("\r\n") +
                                                        "\r\n\r\n# 域名 (Domain) \r\n" +
                                                        (flow?.Domains || []).join("\r\n")
                                                    )
                                                case "json":
                                                    return (flow?.JsonObjects || []).join("\r\n")
                                                default:
                                                    return ""
                                            }
                                        })()}
                                        editorOperationRecord='HTTP_FLOW_DETAIL_MINI'
                                        isShowBeautifyRender={false}
                                        showDownBodyMenu={false}
                                    />
                                )}
                                {infoType === "rules" && existedInfoType.filter((i) => i === "rules").length > 0 && (
                                    <HTTPFlowExtractedDataTable
                                        ref={httpFlowTableRef}
                                        hiddenIndex={flow?.HiddenIndex || ""}
                                        invalidForUTF8Request={!!flow?.InvalidForUTF8Request}
                                        InvalidForUTF8Response={!!flow?.InvalidForUTF8Response}
                                        onSetExportMITMRuleFilter={setExportMITMRuleFilter}
                                        title={
                                            <div className={styles["table-header"]}>
                                                <Space>
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
                                                    <Tooltip title={"上一个规则"}>
                                                        <YakitButton
                                                            type='text'
                                                            size='small'
                                                            icon={<LeftOutlined />}
                                                            disabled={disablePrev}
                                                            onClick={() => {
                                                                httpFlowTableRef.current?.jumpDataProjectHighLight(
                                                                    "prev"
                                                                )
                                                            }}
                                                        ></YakitButton>
                                                    </Tooltip>
                                                    <Tooltip title={"下一个规则"}>
                                                        <YakitButton
                                                            type='text'
                                                            size='small'
                                                            icon={<RightOutlined />}
                                                            disabled={disableNext}
                                                            onClick={() => {
                                                                httpFlowTableRef.current?.jumpDataProjectHighLight(
                                                                    "next"
                                                                )
                                                            }}
                                                        ></YakitButton>
                                                    </Tooltip>
                                                </Space>

                                                <Space>
                                                    <YakitButton
                                                        type='primary'
                                                        size='small'
                                                        onClick={exportMITMRuleExtractedData}
                                                    >
                                                        导出
                                                    </YakitButton>
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
                                                </Space>
                                            </div>
                                        }
                                        onSetHighLightText={setHighLightText}
                                        onSetHighLightItem={setHighLightItem}
                                        currId={currId}
                                        onSetCurrId={setCurrId}
                                        onSetExtractedData={setExtractedData}
                                    />
                                )}
                                {existedInfoType.length === 0 && (
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
                                )}
                            </div>
                        )}
                    </div>
                }
                secondRatio={isFold ? "36px" : "20%"}
                secondMinSize={isFold ? "36px" : "350px"}
            ></YakitResizeBox>
        </div>
    ) : null
}

interface HTTPFlowDetailRequestAndResponseProps extends HTTPFlowDetailProp {
    flow?: HTTPFlow
    flowRequestLoad?: boolean
    flowResponseLoad?: boolean
    pageType?: HTTPHistorySourcePageType
    highLightText?: HistoryHighLightText[]
    highLightItem?: HistoryHighLightText
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
        highLightText,
        highLightItem,
        flowRequestLoad,
        flowResponseLoad,
        historyId,
        pageType,
        downstreamProxyStr
    } = props

    // 编辑器发送到对比器
    const {compareState, setCompareLeft, setCompareRight} = useHttpFlowStore()
    const sendCodeCompareMenuItem = (type: string) => {
        return {
            codeCompare: {
                menu: [
                    {
                        key: "code-compare",
                        label: "发送到对比器",
                        children: [
                            {
                                key: "code-compare-left",
                                label: "发送到对比器左侧",
                                disabled: [false, true, false][compareState]
                            },
                            {
                                key: "code-compare-right",
                                label: "发送到对比器右侧",
                                disabled: [false, false, true][compareState]
                            }
                        ]
                    }
                ],
                onRun: (editor, key) => {
                    if (type === "response" && flow?.Response) {
                        if (key === "code-compare-left") {
                            setCompareLeft({
                                content: new Buffer(flow?.Response).toString("utf8"),
                                language: "http"
                            })
                        } else {
                            setCompareRight({
                                content: new Buffer(flow?.Response).toString("utf8"),
                                language: "http"
                            })
                        }
                        return
                    }

                    if (type === "request" && flow?.Request) {
                        if (key === "code-compare-left") {
                            setCompareLeft({
                                content: new Buffer(flow?.Request).toString("utf8"),
                                language: "http"
                            })
                        } else {
                            setCompareRight({
                                content: new Buffer(flow?.Request).toString("utf8"),
                                language: "http"
                            })
                        }
                        return
                    }
                }
            }
        }
    }

    // 是否显示原始数据
    const [isShowBeforeData, setShowBeforeData] = useState<boolean>(false)
    // 请求/原始请求
    const [resType, setResType] = useState<"current" | "request">("current")
    // 响应/原始响应
    const [rspType, setRspType] = useState<"current" | "response">("current")
    // 编辑器展示originValue
    const [originResValue, setOriginResValue] = useState<string>("")
    const [originRspValue, setOriginRspValue] = useState<string>("")
    // 原始数据
    const [beforeResValue, setBeforeResValue] = useState<string>("")
    const [beforeRspValue, setBeforeRspValue] = useState<string>("")
    // 编辑器实例
    const [reqEditor, setReqEditor] = useState<IMonacoEditor>()
    const [resEditor, setResEditor] = useState<IMonacoEditor>()
    useUpdateEffect(() => {
        setOriginResValue(fetchSsafeHTTPRequest() || "")
    }, [flowRequestLoad])

    // 获取request内容
    const fetchSsafeHTTPRequest = useMemoizedFn(() => {
        return (flow && (flow.InvalidForUTF8Request ? flow.SafeHTTPRequest! : flow.RequestString)) || ""
    })

    useEffect(() => {
        // 复原数据
        setResType("current")
        setRspType("current")
        setOriginResValue(fetchSsafeHTTPRequest())
        // id 比 flow 先更新，导致可能设置的内容是上一条数据的内容
        if (id == flow?.Id) setOriginRspValue(flow?.ResponseString || "")
        // 编辑器滚轮回到顶部
        reqEditor?.setScrollTop(0)
        resEditor?.setScrollTop(0)
        const existedTags = Tags ? Tags.split("|").filter((i) => !!i && !i.startsWith("YAKIT_COLOR_")) : []
        if (existedTags.includes("[手动修改]") || existedTags.includes("[响应被丢弃]")) {
            setShowBeforeData(true)
            handleGetHTTPFlowBare("request")
            handleGetHTTPFlowBare("response")
        } else {
            setShowBeforeData(false)
            setBeforeResValue("")
            setBeforeRspValue("")
        }
    }, [id])

    useEffect(() => {
        if (resType === "request") {
            setOriginResValue(beforeResValue)
        } else {
            setOriginResValue(fetchSsafeHTTPRequest())
        }
    }, [resType, flow?.Request])

    // 定时赋值的计时器
    const setValueTimer = useRef<any>(null)
    useEffect(() => {
        if (rspType === "response") {
            setOriginRspValue(beforeRspValue)
        } else {
            if (setValueTimer.current) {
                clearInterval(setValueTimer.current)
                setValueTimer.current = null
            }
            if (!flow?.ResponseString) setOriginRspValue(flow?.ResponseString || "")
            // 超大数据分片赋值
            else setValueTimer.current = asynSettingState(flow?.ResponseString || "", setOriginRspValue)
        }
    }, [rspType, flow?.Response])

    const onInitBeforeValue = useMemoizedFn((data: "request" | "response") => {
        if (data === "request") {
            setBeforeResValue("")
        }
        if (data === "response") {
            setBeforeRspValue("")
        }
    })
    const handleGetHTTPFlowBare = useMemoizedFn((data: "request" | "response") => {
        ipcRenderer
            .invoke("GetHTTPFlowBare", {
                Id: parseInt(id + ""),
                BareType: data
            })
            .then((res: HTTPFlowBareProps) => {
                if (res.Data && res.Data.length > 0) {
                    if (data === "request") {
                        setBeforeResValue(Uint8ArrayToString(res.Data))
                    }
                    if (data === "response") {
                        setBeforeRspValue(Uint8ArrayToString(res.Data))
                    }
                } else {
                    onInitBeforeValue(data)
                }
            })
            .catch((err) => {
                onInitBeforeValue(data)
            })
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
            try {
                let url = new URL(flow.Url)
                emiter.emit("onHistoryJumpWebTree", JSON.stringify({host: url.host}))
            } catch (error) {
                return ""
            }
        }
    })

    // 编辑器美化缓存
    const [reqTypeOptionVal, setReqTypeOptionVal] = useState<RenderTypeOptionVal>()
    const [resTypeOptionVal, setResTypeOptionVal] = useState<RenderTypeOptionVal>()
    // 编辑器编码
    const [codeKey, setCodeKey] = useState<string>("utf-8")
    const [codeLoading, setCodeLoading] = useState<boolean>(false)
    const [codeValue, setCodeValue] = useState<string>("")
    useDebounceEffect(
        () => {
            if (flow) {
                setCodeKey("utf-8")
                const reqArr = highLightItem?.IsMatchRequest ? [highLightItem] : []
                const resArr = highLightItem ? (!highLightItem.IsMatchRequest ? [highLightItem] : []) : []
                if (reqArr.length) {
                    setReqTypeOptionVal(undefined)
                } else {
                    getRemoteValue(RemoteGV.HistoryRequestEditorBeautify).then((res) => {
                        if (!!res) {
                            setReqTypeOptionVal(res)
                        } else {
                            setReqTypeOptionVal(undefined)
                        }
                    })
                }

                if (resArr.length) {
                    setResTypeOptionVal(undefined)
                } else {
                    getRemoteValue(RemoteGV.HistoryResponseEditorBeautify).then((res) => {
                        if (!!res) {
                            setResTypeOptionVal(res)
                        } else {
                            setResTypeOptionVal(undefined)
                        }
                    })
                }
            }
        },
        [flow, highLightItem],
        {wait: 300}
    )

    // 响应额外按钮
    const secondNodeResExtraBtn = () => {
        let extraBtn: ReactElement[] = []
        if (flow?.IsTooLargeResponse) {
            extraBtn.push(
                <YakitDropdownMenu
                    key='intact-rsp'
                    menu={{
                        data: [
                            {key: "tooLargeResponseHeaderFile", label: "查看Header"},
                            {key: "tooLargeResponseBodyFile", label: "查看Body"}
                        ],
                        onClick: ({key}) => {
                            switch (key) {
                                case "tooLargeResponseHeaderFile":
                                    ipcRenderer
                                        .invoke("is-file-exists", flow.TooLargeResponseHeaderFile)
                                        .then((flag: boolean) => {
                                            if (flag) {
                                                openABSFileLocated(flow.TooLargeResponseHeaderFile)
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
                                                openABSFileLocated(flow.TooLargeResponseBodyFile)
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
        } else {
            extraBtn.push(
                <Button
                    key='chrome'
                    className={styles["extra-chrome-btn"]}
                    type={"text"}
                    size={"small"}
                    icon={<ChromeSvgIcon />}
                    onClick={() => {
                        flow?.Url && openExternalWebsite(flow?.Url)
                    }}
                />
            )
        }
        return extraBtn
    }

    const resEditorLoading = useMemo(() => {
        return flowResponseLoad || codeLoading
    }, [flowResponseLoad, codeLoading])

    return (
        <YakitResizeBox
            firstNode={() => {
                if (flow === undefined) {
                    return <Empty description={"选择想要查看的 HTTP 记录请求"} />
                }
                if (flow?.IsWebsocket) {
                    return (
                        <HTTPFlowForWebsocketViewer
                            flow={flow}
                            historyId={historyId}
                            pageType={pageType}
                            highLightText={highLightText}
                            highLightItem={highLightItem}
                            highLightFindClass='hight-light-rule-color'
                        />
                    )
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
                            // history页面
                            if (pageType === "History") {
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
                        downstreamProxyStr={downstreamProxyStr}
                        defaultHeight={defaultHeight}
                        loading={flowRequestLoad}
                        defaultHttps={defaultHttps}
                        hideSearch={true}
                        noHex={true}
                        noMinimap={true}
                        contextMenu={{
                            ...sendCodeCompareMenuItem("request")
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
                            leftCode: resType === "request" ? flow?.RequestString || "" : undefined,
                            leftTitle: "请求",
                            rightTitle: "原始请求"
                        }}
                        onEditor={(Editor) => {
                            setReqEditor(Editor)
                        }}
                        typeOptionVal={reqTypeOptionVal}
                        onTypeOptionVal={(typeOptionVal) => {
                            if (typeOptionVal === "beautify") {
                                setReqTypeOptionVal(typeOptionVal)
                                setRemoteValue(RemoteGV.HistoryRequestEditorBeautify, typeOptionVal)
                            } else {
                                setReqTypeOptionVal(undefined)
                                setRemoteValue(RemoteGV.HistoryRequestEditorBeautify, "")
                            }
                        }}
                        highLightText={highLightText?.filter((i) => i.IsMatchRequest)}
                        highLightFind={highLightItem?.IsMatchRequest ? [highLightItem] : []}
                        highLightFindClass='hight-light-rule-color'
                        isPositionHighLightCursor={highLightItem?.IsMatchRequest ? true : false}
                        url={flow.Url}
                        downbodyParams={{Id: flow.Id, IsRequest: true}}
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
                        typeOptionVal={resTypeOptionVal}
                        onTypeOptionVal={(typeOptionVal) => {
                            if (typeOptionVal !== undefined) {
                                setResTypeOptionVal(typeOptionVal)
                                setRemoteValue(RemoteGV.HistoryResponseEditorBeautify, typeOptionVal)
                            } else {
                                setResTypeOptionVal(undefined)
                                setRemoteValue(RemoteGV.HistoryResponseEditorBeautify, "")
                            }
                        }}
                        isShowBeautifyRender={!flow?.IsTooLargeResponse}
                        title={(() => {
                            let titleEle = [
                                <span style={{fontSize: 12}} key={"title-Response"}>
                                    Response
                                </span>
                            ]
                            if (isShowBeforeData && beforeRspValue.length > 0) {
                                titleEle = [
                                    <div className={classNames(styles["type-options-checkable-tag"])} key={"title-Res"}>
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
                                    <YakitTag style={{marginLeft: 8}} color='danger' key={"title-IsTooLargeResponse"}>
                                        超大响应
                                    </YakitTag>
                                )
                            }
                            return titleEle
                        })()}
                        contextMenu={{
                            ...sendCodeCompareMenuItem("response")
                        }}
                        extra={secondNodeResExtraBtn()}
                        AfterBeautifyRenderBtn={
                            <>
                                <YakitButton
                                    size='small'
                                    onClick={() => {
                                        emiter.emit("onEditTag", JSON.stringify({id: flow.Id, historyId}))
                                    }}
                                >
                                    编辑tag
                                </YakitButton>
                                <CodingPopover
                                    key='coding'
                                    originValue={flow.Response}
                                    onSetCodeLoading={setCodeLoading}
                                    codeKey={codeKey}
                                    onSetCodeKey={(codeKey) => {
                                        setCodeKey(codeKey)
                                    }}
                                    onSetCodeValue={setCodeValue}
                                />
                            </>
                        }
                        isResponse={true}
                        noHex={true}
                        noMinimap={originRspValue.length < 1024 * 2}
                        loading={resEditorLoading}
                        originValue={codeKey === "utf-8" ? originRspValue : codeValue}
                        originalPackage={flow.Response}
                        readOnly={true}
                        defaultHeight={props.defaultHeight}
                        hideSearch={true}
                        defaultSearchKeyword={props.search}
                        defaultHttps={props.defaultHttps}
                        webFuzzerValue={flow?.RequestString || ""}
                        editorOperationRecord='HTTP_FLOW_DETAIL_REQUEST_AND_RESPONSE'
                        extraEditorProps={{
                            isShowSelectRangeMenu: true
                        }}
                        dataCompare={{
                            rightCode: beforeRspValue,
                            leftCode: rspType === "response" ? flow?.ResponseString || "" : undefined,
                            leftTitle: "响应",
                            rightTitle: "原始响应"
                        }}
                        onEditor={(Editor) => {
                            setResEditor(Editor)
                        }}
                        highLightText={highLightText?.filter((i) => !i.IsMatchRequest)}
                        highLightFind={highLightItem ? (!highLightItem.IsMatchRequest ? [highLightItem] : []) : []}
                        highLightFindClass='hight-light-rule-color'
                        isPositionHighLightCursor={highLightItem?.IsMatchRequest ? false : true}
                        url={flow.Url}
                        downbodyParams={{Id: flow.Id, IsRequest: false}}
                    />
                )
            }}
            secondMinSize={300}
        />
    )
})

interface CodingPopoverProps {
    originValue: Uint8Array
    codeKey: string
    onSetCodeLoading: (loading: boolean) => void
    onSetCodeKey: (codeKey: string) => void
    onSetCodeValue: (codeValue: string) => void
}
export const CodingPopover: React.FC<CodingPopoverProps> = (props) => {
    const {originValue, codeKey, onSetCodeKey, onSetCodeValue, onSetCodeLoading} = props
    const [codeShow, setCodeShow] = useState<boolean>(false)

    useDebounceEffect(
        () => {
            if (codeKey) {
                if (codeKey === "utf-8") {
                    onSetCodeValue(Uint8ArrayToString(originValue))
                } else {
                    fetchNewCodec(codeKey)
                }
            }
        },
        [originValue],
        {
            wait: 500
        }
    )

    const handleClickCoding = (codeVal: string) => {
        if (codeKey === codeVal) return
        if (codeVal === "utf-8") {
            onSetCodeValue(Uint8ArrayToString(originValue))
            onSetCodeKey(codeVal)
        } else {
            fetchNewCodec(codeVal)
        }
    }

    const fetchNewCodec = (codeVal: string) => {
        const newCodecParams = {
            InputBytes: originValue,
            WorkFlow: [
                {
                    CodecType: "CharsetToUTF8",
                    Params: [
                        {
                            Key: "charset",
                            Value: codeVal
                        }
                    ]
                }
            ]
        }
        onSetCodeLoading(true)
        ipcRenderer
            .invoke("NewCodec", newCodecParams)
            .then((data: {Result: string; RawResult: Uint8Array}) => {
                onSetCodeValue(Uint8ArrayToString(data.RawResult))
                onSetCodeKey(codeVal)
            })
            .catch((e) => {
                onSetCodeValue(Uint8ArrayToString(originValue))
                yakitNotify("error", `${e}`)
            })
            .finally(() => {
                setTimeout(() => {
                    onSetCodeLoading(false)
                }, 250)
            })
    }

    return (
        <YakitPopover
            trigger='click'
            overlayClassName={styles["codec-menu-popover"]}
            overlayStyle={{paddingTop: 2}}
            placement='bottomLeft'
            content={
                <div className={styles["codec-menu-cont-wrapper"]}>
                    {[
                        {label: "gb18030", codeKey: "gb18030"},
                        {label: "windows-1252", codeKey: "windows-1252"},
                        {label: "iso-8859-1", codeKey: "iso-8859-1"},
                        {label: "big5", codeKey: "big5"},
                        {label: "utf-16", codeKey: "utf-16"},
                        {label: "utf-8", codeKey: "utf-8"}
                    ].map((item) => (
                        <div
                            key={item.codeKey}
                            className={classNames(styles["codec-menu-item"], {
                                [styles["active"]]: codeKey === item.codeKey
                            })}
                            onClick={() => handleClickCoding(item.codeKey)}
                        >
                            {item.label}
                            {codeKey === item.codeKey && <SolidCheckIcon className={styles["check-icon"]} />}
                        </div>
                    ))}
                </div>
            }
            visible={codeShow}
            onVisibleChange={(visible) => setCodeShow(visible)}
        >
            <YakitButton
                size='small'
                type={codeKey !== "" ? "primary" : "outline2"}
                onClick={(e) => e.preventDefault()}
            >
                编码
                {codeShow ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </YakitButton>
        </YakitPopover>
    )
}

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
