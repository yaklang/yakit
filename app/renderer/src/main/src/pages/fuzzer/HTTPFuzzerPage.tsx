import React, {useEffect, useRef, useState} from "react"
import {
    Button,
    Card,
    Col,
    Divider,
    Form,
    Input,
    Modal,
    notification,
    Result,
    Row,
    Space,
    Spin,
    Tag,
    Typography,
    Dropdown,
    Menu,
    Popover,
    Checkbox,
    Tooltip,
    InputNumber
} from "antd"
import {HTTPPacketEditor, IMonacoEditor} from "../../utils/editors"
import {showDrawer, showModal} from "../../utils/showModal"
import {monacoEditorReplace, monacoEditorWrite} from "./fuzzerTemplates"
import {StringFuzzer} from "./StringFuzzer"
import {
    CopyableField,
    InputFloat,
    InputInteger,
    InputItem,
    ManyMultiSelectForString,
    OneLine,
    SelectOne,
    SwitchItem
} from "../../utils/inputUtil"
import {FuzzerResponseToHTTPFlowDetail} from "../../components/HTTPFlowDetail"
import {randomString} from "../../utils/randomUtil"
import {
    ColumnWidthOutlined,
    DeleteOutlined,
    ProfileOutlined,
    LeftOutlined,
    RightOutlined,
    DownOutlined,
    HistoryOutlined,
    DownloadOutlined,
    QuestionCircleOutlined
} from "@ant-design/icons"
import {HTTPFuzzerResultsCard} from "./HTTPFuzzerResultsCard"
import {failed, info, success} from "../../utils/notification"
import {AutoSpin} from "../../components/AutoSpin"
import {ResizeBox} from "../../components/ResizeBox"
import {useGetState, useMemoizedFn} from "ahooks"
import {getRemoteValue, getLocalValue, setLocalValue, setRemoteValue, setRemoteValueTTL} from "../../utils/kv"
import {HTTPFuzzerHistorySelector, HTTPFuzzerTaskDetail} from "./HTTPFuzzerHistory"
import {PayloadManagerPage} from "../payloadManager/PayloadManager"
import {HackerPlugin} from "../hacker/HackerPlugin"
import {fuzzerInfoProp} from "../MainOperator"
import {ItemSelects} from "../../components/baseTemplate/FormItemUtil"
import {HTTPFuzzerHotPatch} from "./HTTPFuzzerHotPatch"
import {AutoCard} from "../../components/AutoCard"
import {callCopyToClipboard} from "../../utils/basic"
import {exportHTTPFuzzerResponse, exportPayloadResponse} from "./HTTPFuzzerPageExport"
import {StringToUint8Array, Uint8ArrayToString} from "../../utils/str"
import {insertFileFuzzTag} from "./InsertFileFuzzTag"
import {execPacketScan, execPacketScanFromRaw} from "@/pages/packetScanner/PacketScanner"
import {PacketScanButton} from "@/pages/packetScanner/DefaultPacketScanGroup"
import "./HTTPFuzzerPage.scss"
import {ShareIcon} from "@/assets/icons"
import {ShareData} from "./components/ShareData"
import {showExtractFuzzerResponseOperator} from "@/utils/extractor"
import {SearchOutlined} from "@ant-design/icons/lib"
import {ChevronLeftIcon, ChevronRightIcon} from "@/assets/newIcon"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import classNames from "classnames"
import {PaginationSchema} from "../invoker/schema"

const {ipcRenderer} = window.require("electron")

interface ShareValueProps {
    isHttps: boolean
    advancedConfig: boolean
    advancedConfiguration: AdvancedConfigurationProps
    request: any
}

interface AdvancedConfigurationProps {
    forceFuzz: boolean
    concurrent: number
    isHttps: boolean
    noFixContentLength: boolean
    proxy: string
    actualHost: string
    timeout: number
    minDelaySeconds: number
    maxDelaySeconds: number
    _filterMode: "drop" | "match"
    getFilter: FuzzResponseFilter
}

export const analyzeFuzzerResponse = (
    i: FuzzerResponse,
    setRequest: (isHttps: boolean, request: string) => any,
    index?: number,
    data?: FuzzerResponse[]
) => {
    let m = showDrawer({
        width: "90%",
        content: (
            <>
                <FuzzerResponseToHTTPFlowDetail
                    response={i}
                    onClosed={() => {
                        m.destroy()
                    }}
                    index={index}
                    data={data}
                />
            </>
        )
    })
}

export interface HTTPFuzzerPageProp {
    isHttps?: boolean
    request?: string
    system?: string
    order?: string
    fuzzerParams?: fuzzerInfoProp
    shareContent?: string
}

const Text = Typography.Text

export interface FuzzerResponse {
    Method: string
    StatusCode: number
    Host: string
    ContentType: string
    Headers: {Header: string; Value: string}[]
    ResponseRaw: Uint8Array
    RequestRaw: Uint8Array
    BodyLength: number
    UUID: string
    Timestamp: number
    DurationMs: number

    Ok: boolean
    Reason: string
    Payloads?: string[]

    IsHTTPS?: boolean
    Count?: number

    HeaderSimilarity?: number
    BodySimilarity?: number
    MatchedByFilter?: boolean
}

const defaultPostTemplate = `POST / HTTP/1.1
Content-Type: application/json
Host: www.example.com

{"key": "value"}`

export const WEB_FUZZ_PROXY = "WEB_FUZZ_PROXY"
const WEB_FUZZ_HOTPATCH_CODE = "WEB_FUZZ_HOTPATCH_CODE"
const WEB_FUZZ_HOTPATCH_WITH_PARAM_CODE = "WEB_FUZZ_HOTPATCH_WITH_PARAM_CODE"

export interface HistoryHTTPFuzzerTask {
    Request: string
    RequestRaw: Uint8Array
    Proxy: string
    IsHTTPS: boolean

    // 展示渲染，一般来说 Verbose > RequestRaw > Request
    Verbose?: string
}

export const showDictsAndSelect = (res: (i: string) => any) => {
    const m = showModal({
        title: "选择想要插入的字典",
        width: 1200,
        content: (
            <div style={{width: 1100, height: 500, overflow: "hidden"}}>
                <PayloadManagerPage
                    readOnly={true}
                    selectorHandle={(e) => {
                        res(e)
                        m.destroy()
                    }}
                />
            </div>
        )
    })
}

interface FuzzResponseFilter {
    MinBodySize: number
    MaxBodySize: number
    Regexps: string[]
    Keywords: string[]
    StatusCode: string[]
}

function removeEmptyFiledFromFuzzResponseFilter(i: FuzzResponseFilter): FuzzResponseFilter {
    i.Keywords = (i.Keywords || []).filter((i) => !!i)
    i.StatusCode = (i.StatusCode || []).filter((i) => !!i)
    i.Regexps = (i.Regexps || []).filter((i) => !!i)
    return {...i}
}

function filterIsEmpty(f: FuzzResponseFilter): boolean {
    return (
        f.MinBodySize === 0 &&
        f.MaxBodySize === 0 &&
        f.Regexps.length === 0 &&
        f.Keywords.length === 0 &&
        f.StatusCode.length === 0
    )
}

function copyAsUrl(f: {Request: string; IsHTTPS: boolean}) {
    ipcRenderer
        .invoke("ExtractUrl", f)
        .then((data: {Url: string}) => {
            callCopyToClipboard(data.Url)
        })
        .catch((e) => {
            failed("复制 URL 失败：包含 Fuzz 标签可能会导致 URL 不完整")
        })
}

export const newWebFuzzerTab = (isHttps: boolean, request: string) => {
    return ipcRenderer
        .invoke("send-to-tab", {
            type: "fuzzer",
            data: {isHttps: isHttps, request: request}
        })
        .then(() => {
            info("新开 WebFuzzer Tab")
        })
}

const ALLOW_MULTIPART_DATA_ALERT = "ALLOW_MULTIPART_DATA_ALERT"

const emptyFuzzer = {
    BodyLength: 0,
    BodySimilarity: 0,
    ContentType: "",
    Count: 0,
    DurationMs: 0,
    HeaderSimilarity: 0,
    Headers: [],
    Host: "",
    IsHTTPS: false,
    MatchedByFilter: false,
    Method: "",
    Ok: false,
    Payloads: [],
    Reason: "",
    RequestRaw: new Uint8Array(),
    ResponseRaw: new Uint8Array(),
    StatusCode: 0,
    Timestamp: 0,
    UUID: ""
}

export const HTTPFuzzerPage: React.FC<HTTPFuzzerPageProp> = (props) => {
    // params
    const [isHttps, setIsHttps, getIsHttps] = useGetState<boolean>(
        props.fuzzerParams?.isHttps || props.isHttps || false
    )
    const [noFixContentLength, setNoFixContentLength] = useState(false)
    const [request, setRequest, getRequest] = useGetState(
        props.fuzzerParams?.request || props.request || defaultPostTemplate
    )

    const [concurrent, setConcurrent] = useState(props.fuzzerParams?.concurrent || 20)
    const [forceFuzz, setForceFuzz] = useState<boolean>(props.fuzzerParams?.forceFuzz || true)
    const [timeout, setParamTimeout] = useState(props.fuzzerParams?.timeout || 30.0)
    const [minDelaySeconds, setMinDelaySeconds] = useState(0)
    const [maxDelaySeconds, setMaxDelaySeconds] = useState(0)
    const [proxy, setProxy] = useState(props.fuzzerParams?.proxy || "")
    const [actualHost, setActualHost] = useState(props.fuzzerParams?.actualHost || "")
    const [advancedConfig, setAdvancedConfig] = useState(false)
    const [redirectedResponse, setRedirectedResponse] = useState<FuzzerResponse>()
    const [historyTask, setHistoryTask] = useState<HistoryHTTPFuzzerTask>()
    const [hotPatchCode, setHotPatchCode] = useState<string>("")
    const [hotPatchCodeWithParamGetter, setHotPatchCodeWithParamGetter] = useState<string>("")
    const [affixSearch, setAffixSearch] = useState("")
    const [defaultResponseSearch, setDefaultResponseSearch] = useState("")

    const [currentSelectId, setCurrentSelectId] = useState<number>() // 历史中选中的记录id

    // filter
    const [_, setFilter, getFilter] = useGetState<FuzzResponseFilter>({
        Keywords: [],
        MaxBodySize: 0,
        MinBodySize: 0,
        Regexps: [],
        StatusCode: []
    })
    const [_filterMode, setFilterMode, getFilterMode] = useGetState<"drop" | "match">("drop")
    const [droppedCount, setDroppedCount] = useState(0)

    // state
    const [loading, setLoading] = useState(false)

    /*
     * 内容
     * */
    // const [content, setContent] = useState<FuzzerResponse[]>([])
    const [_firstResponse, setFirstResponse, getFirstResponse] = useGetState<FuzzerResponse>(emptyFuzzer)
    const [successFuzzer, setSuccessFuzzer] = useState<FuzzerResponse[]>([])
    const [failedFuzzer, setFailedFuzzer] = useState<FuzzerResponse[]>([])
    const [_successCount, setSuccessCount, getSuccessCount] = useGetState(0)
    const [_failedCount, setFailedCount, getFailedCount] = useGetState(0)

    /**/
    const [reqEditor, setReqEditor] = useState<IMonacoEditor>()
    const [fuzzToken, setFuzzToken] = useState("")
    const [search, setSearch] = useState("")
    const [targetUrl, setTargetUrl] = useState("")

    const [refreshTrigger, setRefreshTrigger] = useState(false)
    const refreshRequest = () => {
        setRefreshTrigger(!refreshTrigger)
    }
    const [urlPacketShow, setUrlPacketShow] = useState<boolean>(false)

    // filter
    const [keyword, setKeyword] = useState<string>("")
    const [filterContent, setFilterContent] = useState<FuzzerResponse[]>([])
    const [timer, setTimer] = useState<any>()

    useEffect(() => {
        if (props.shareContent) {
            setUpShareContent(JSON.parse(props.shareContent))
        }
    }, [props.shareContent])

    useEffect(() => {
        getLocalValue(WEB_FUZZ_HOTPATCH_CODE).then((data: any) => {
            if (!data) {
                getRemoteValue(WEB_FUZZ_HOTPATCH_CODE).then((remoteData) => {
                    if (!remoteData) {
                        return
                    }
                    setHotPatchCode(`${remoteData}`)
                })
                return
            }
            setHotPatchCode(`${data}`)
        })

        getRemoteValue(WEB_FUZZ_HOTPATCH_WITH_PARAM_CODE).then((remoteData) => {
            if (!!remoteData) {
                setHotPatchCodeWithParamGetter(`${remoteData}`)
            }
        })
    }, [])

    // 定时器
    const sendTimer = useRef<any>(null)
    const resetResponse = useMemoizedFn(() => {
        setFirstResponse({...emptyFuzzer})
        setSuccessFuzzer([])
        setRedirectedResponse(undefined)
        setFailedFuzzer([])
        setSuccessCount(0)
        setFailedCount(0)
    })

    const sendToFuzzer = useMemoizedFn((isHttps: boolean, request: string) => {
        ipcRenderer.invoke("send-to-tab", {
            type: "fuzzer",
            data: {isHttps: isHttps, request: request}
        })
    })
    const sendToPlugin = useMemoizedFn((request: Uint8Array, isHTTPS: boolean, response?: Uint8Array) => {
        let m = showDrawer({
            width: "80%",
            content: <HackerPlugin request={request} isHTTPS={isHTTPS} response={response}></HackerPlugin>
        })
    })

    // 从历史记录中恢复
    useEffect(() => {
        if (!historyTask) {
            return
        }
        if (historyTask.Request === "") {
            setRequest(Uint8ArrayToString(historyTask.RequestRaw, "utf8"))
        } else {
            setRequest(historyTask.Request)
        }
        setIsHttps(historyTask.IsHTTPS)
        setProxy(historyTask.Proxy)
        refreshRequest()
    }, [historyTask])

    useEffect(() => {
        // 缓存全局参数
        getLocalValue(WEB_FUZZ_PROXY).then((e) => {
            if (!e) {
                return
            }
            setProxy(`${e}`)
        })
    }, [])

    useEffect(() => {
        setIsHttps(!!props.isHttps)
        if (props.request) {
            setRequest(props.request)
            resetResponse()
        }
    }, [props.isHttps, props.request])

    const loadHistory = useMemoizedFn((id: number) => {
        resetResponse()
        setHistoryTask(undefined)
        setLoading(true)
        setDroppedCount(0)
        ipcRenderer.invoke("HTTPFuzzer", {HistoryWebFuzzerId: id}, fuzzToken).then(() => {
            ipcRenderer
                .invoke("GetHistoryHTTPFuzzerTask", {Id: id})
                .then((data: {OriginRequest: HistoryHTTPFuzzerTask}) => {
                    setHistoryTask(data.OriginRequest)
                    setCurrentSelectId(id)
                })
        })
    })

    const submitToHTTPFuzzer = useMemoizedFn(() => {
        // 清楚历史任务的标记
        setHistoryTask(undefined)

        // 更新默认搜索
        setDefaultResponseSearch(affixSearch)

        // saveValue(WEB_FUZZ_PROXY, proxy)
        setLoading(true)
        setDroppedCount(0)
        ipcRenderer.invoke(
            "HTTPFuzzer",
            {
                // Request: request,
                RequestRaw: Buffer.from(request, "utf8"), // StringToUint8Array(request, "utf8"),
                ForceFuzz: forceFuzz,
                IsHTTPS: isHttps,
                Concurrent: concurrent,
                PerRequestTimeoutSeconds: timeout,
                NoFixContentLength: noFixContentLength,
                Proxy: proxy,
                ActualAddr: actualHost,
                HotPatchCode: hotPatchCode,
                HotPatchCodeWithParamGetter: hotPatchCodeWithParamGetter,
                Filter: {
                    ...getFilter(),
                    StatusCode: getFilter().StatusCode.filter((i) => !!i),
                    Keywords: getFilter().Keywords.filter((i) => !!i),
                    Regexps: getFilter().Regexps.filter((i) => !!i)
                },
                DelayMinSeconds: minDelaySeconds,
                DelayMaxSeconds: maxDelaySeconds
            },
            fuzzToken
        )
    })

    const cancelCurrentHTTPFuzzer = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-HTTPFuzzer", fuzzToken)
    })

    useEffect(() => {
        const token = randomString(60)
        setFuzzToken(token)

        const dataToken = `${token}-data`
        const errToken = `${token}-error`
        const endToken = `${token}-end`

        /*
         * successCount
         * failedCount
         * */
        let successCount = 0
        let failedCount = 0

        ipcRenderer.on(errToken, (e, details) => {
            notification["error"]({
                message: `提交模糊测试请求失败 ${details}`,
                placement: "bottomRight"
            })
        })
        let successBuffer: FuzzerResponse[] = []
        let failedBuffer: FuzzerResponse[] = []
        let droppedCount = 0
        let count: number = 0
        let lastUpdateCount: number = 0
        const updateData = () => {
            if (count <= 0) {
                return
            }

            if (failedBuffer.length + successBuffer.length === 0) {
                return
            }

            if (lastUpdateCount <= 0 || lastUpdateCount != count || count === 1) {
                // setContent([...buffer])
                setSuccessFuzzer([...successBuffer])
                setFailedFuzzer([...failedBuffer])
                setFailedCount(failedCount)
                setSuccessCount(successCount)
                lastUpdateCount = count
            }
        }

        ipcRenderer.on(dataToken, (e: any, data: any) => {
            if (data.Ok) {
                successCount++
            } else {
                failedCount++
            }

            if (!filterIsEmpty(getFilter())) {
                // 设置了 Filter
                const hit = data["MatchedByFilter"] === true
                // 丢包的条件：
                //   1. 命中过滤器，同时过滤模式设置为丢弃
                //   2. 未命中过滤器，过滤模式设置为保留
                if ((hit && getFilterMode() === "drop") || (!hit && getFilterMode() === "match")) {
                    // 丢弃不匹配的内容
                    droppedCount++
                    setDroppedCount(droppedCount)
                    return
                }
            }
            const r = {
                StatusCode: data.StatusCode,
                Ok: data.Ok,
                Reason: data.Reason,
                Method: data.Method,
                Host: data.Host,
                ContentType: data.ContentType,
                Headers: (data.Headers || []).map((i: any) => {
                    return {Header: i.Header, Value: i.Value}
                }),
                DurationMs: data.DurationMs,
                BodyLength: data.BodyLength,
                UUID: data.UUID,
                Timestamp: data.Timestamp,
                ResponseRaw: data.ResponseRaw,
                RequestRaw: data.RequestRaw,
                Payloads: data.Payloads,
                IsHTTPS: data.IsHTTPS,
                Count: count,
                BodySimilarity: data.BodySimilarity,
                HeaderSimilarity: data.HeaderSimilarity
            } as FuzzerResponse

            // 设置第一个 response
            if (getFirstResponse().RequestRaw.length === 0) {
                setFirstResponse(r)
            }

            if (data.Ok) {
                successBuffer.push(r)
            } else {
                failedBuffer.push(r)
            }
            count++
            // setContent([...buffer])
        })
        ipcRenderer.on(endToken, () => {
            updateData()
            successBuffer = []
            failedBuffer = []
            count = 0
            droppedCount = 0
            lastUpdateCount = 0
            setLoading(false)
        })

        const updateDataId = setInterval(() => {
            updateData()
        }, 200)

        return () => {
            ipcRenderer.invoke("cancel-HTTPFuzzer", token)

            clearInterval(updateDataId)
            ipcRenderer.removeAllListeners(errToken)
            ipcRenderer.removeAllListeners(dataToken)
            ipcRenderer.removeAllListeners(endToken)
        }
    }, [])

    const searchContent = (keyword: string) => {
        if (timer) {
            clearTimeout(timer)
            setTimer(null)
        }
        setTimer(
            setTimeout(() => {
                try {
                    const filters = successFuzzer.filter((item) => {
                        return Buffer.from(item.ResponseRaw).toString("utf8").match(new RegExp(keyword, "g"))
                    })
                    setFilterContent(filters)
                } catch (error) {}
            }, 500)
        )
    }

    useEffect(() => {
        if (!!keyword) {
            searchContent(keyword)
        } else {
            setFilterContent([])
        }
    }, [keyword])

    useEffect(() => {
        if (keyword && successFuzzer.length !== 0) {
            const filters = successFuzzer.filter((item) => {
                return Buffer.from(item.ResponseRaw).toString("utf8").match(new RegExp(keyword, "g"))
            })
            setFilterContent(filters)
        }
    }, [successFuzzer])

    const onlyOneResponse = !loading && failedFuzzer.length + successFuzzer.length === 1

    const sendFuzzerSettingInfo = useMemoizedFn(() => {
        const info: fuzzerInfoProp = {
            time: new Date().getTime().toString(),
            isHttps: isHttps,
            forceFuzz: forceFuzz,
            concurrent: concurrent,
            proxy: proxy,
            actualHost: actualHost,
            timeout: timeout,
            request: request
        }
        if (sendTimer.current) {
            clearTimeout(sendTimer.current)
            sendTimer.current = null
        }
        sendTimer.current = setTimeout(() => {
            ipcRenderer.invoke("send-fuzzer-setting-data", {key: props.order || "", param: JSON.stringify(info)})
        }, 1000)
    })
    useEffect(() => {
        sendFuzzerSettingInfo()
    }, [isHttps, forceFuzz, concurrent, proxy, actualHost, timeout, request])

    const responseViewer = useMemoizedFn((rsp: FuzzerResponse) => {
        let reason = "未知原因"
        try {
            reason = rsp!.Reason
        } catch (e) {}
        return (
            <HTTPPacketEditor
                title={
                    <Form
                        size={"small"}
                        layout={"inline"}
                        onSubmitCapture={(e) => {
                            e.preventDefault()

                            setDefaultResponseSearch(affixSearch)
                        }}
                    >
                        <InputItem
                            width={150}
                            allowClear={true}
                            label={""}
                            value={affixSearch}
                            placeholder={"搜索定位响应"}
                            suffixNode={
                                <Button size={"small"} type='link' htmlType='submit' icon={<SearchOutlined />} />
                            }
                            setValue={(value) => {
                                setAffixSearch(value)
                                if (value === "" && defaultResponseSearch !== "") {
                                    setDefaultResponseSearch("")
                                }
                            }}
                            extraFormItemProps={{style: {marginBottom: 0}}}
                        />
                    </Form>
                }
                defaultSearchKeyword={defaultResponseSearch}
                system={props.system}
                originValue={rsp.ResponseRaw}
                bordered={true}
                hideSearch={true}
                isResponse={true}
                noHex={true}
                emptyOr={
                    !rsp?.Ok && (
                        <Result
                            status={
                                reason.includes("tcp: i/o timeout") ||
                                reason.includes("empty response") ||
                                reason.includes("no such host") ||
                                reason.includes("cannot create proxy")
                                    ? "warning"
                                    : "error"
                            }
                            title={"请求失败或服务端（代理）异常"}
                            // no such host
                            subTitle={(() => {
                                const reason = rsp?.Reason || "unknown"
                                if (reason.includes("tcp: i/o timeout")) {
                                    return `网络超时（请检查目标主机是否在线？）`
                                }
                                if (reason.includes("no such host")) {
                                    return `DNS 错误或主机错误 (请检查域名是否可以被正常解析？)`
                                }
                                if (reason.includes("cannot create proxy")) {
                                    return `无法设置代理（请检查代理是否可用）`
                                }
                                if (reason.includes("empty response")) {
                                    return `服务端没有任何返回数据`
                                }
                                return undefined
                            })()}
                        >
                            <>详细原因：{rsp.Reason}</>
                        </Result>
                    )
                }
                readOnly={true}
                extra={
                    <Space size={0}>
                        {loading && <Spin size={"small"} spinning={loading} />}
                        {onlyOneResponse ? (
                            <Space size={0}>
                                {rsp.IsHTTPS && <Tag>{rsp.IsHTTPS ? "https" : ""}</Tag>}
                                <Tag>
                                    {rsp.BodyLength}bytes / {rsp.DurationMs}ms
                                </Tag>
                                <Space key='single'>
                                    <Button
                                        size={"small"}
                                        onClick={() => {
                                            analyzeFuzzerResponse(rsp, (bool, r) => {
                                                // setRequest(r)
                                                // refreshRequest()
                                            })
                                        }}
                                        type={"primary"}
                                        icon={<ProfileOutlined />}
                                    />
                                    {/*    详情*/}
                                    {/*</Button>*/}
                                    <Button
                                        type={"primary"}
                                        size={"small"}
                                        onClick={() => {
                                            // setContent([])
                                            setSuccessFuzzer([])
                                            setFailedFuzzer([])
                                        }}
                                        danger={true}
                                        icon={<DeleteOutlined />}
                                    />
                                </Space>
                            </Space>
                        ) : (
                            <Space key='list'>
                                <Tag color={"green"}>成功:{getSuccessCount()}</Tag>
                                <Input
                                    size={"small"}
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value)
                                    }}
                                />
                                {/*<Tag>当前请求结果数[{(content || []).length}]</Tag>*/}
                                <Button
                                    size={"small"}
                                    onClick={() => {
                                        // setContent([])
                                        setSuccessFuzzer([])
                                        setFailedFuzzer([])
                                    }}
                                >
                                    清除数据
                                </Button>
                            </Space>
                        )}
                    </Space>
                }
            />
        )
    })

    // 设置最大延迟最小延迟
    useEffect(() => {
        if (minDelaySeconds > maxDelaySeconds) {
            setMaxDelaySeconds(minDelaySeconds)
        }
    }, [minDelaySeconds])

    useEffect(() => {
        if (maxDelaySeconds < minDelaySeconds) {
            setMinDelaySeconds(maxDelaySeconds)
        }
    }, [maxDelaySeconds])

    const hotPatchTrigger = useMemoizedFn(() => {
        let m = showModal({
            title: "调试 / 插入热加载代码",
            width: "80%",
            content: (
                <div>
                    <HTTPFuzzerHotPatch
                        initialHotPatchCode={hotPatchCode}
                        initialHotPatchCodeWithParamGetter={hotPatchCodeWithParamGetter}
                        onInsert={(tag) => {
                            if (reqEditor) monacoEditorWrite(reqEditor, tag)
                            m.destroy()
                        }}
                        onSaveCode={(code) => {
                            setHotPatchCode(code)
                            setLocalValue(WEB_FUZZ_HOTPATCH_CODE, code)
                            setRemoteValue(WEB_FUZZ_HOTPATCH_CODE, code)
                        }}
                        onSaveHotPatchCodeWithParamGetterCode={(code) => {
                            setHotPatchCodeWithParamGetter(code)
                            setRemoteValue(WEB_FUZZ_HOTPATCH_WITH_PARAM_CODE, code)
                        }}
                    />
                </div>
            )
        })
    })

    useEffect(() => {
        if (!props.request) {
            return
        }

        setLoading(true)
        getRemoteValue(ALLOW_MULTIPART_DATA_ALERT)
            .then((e) => {
                if (e === "1") {
                    setLoading(false)
                    return
                }
                ipcRenderer
                    .invoke("IsMultipartFormDataRequest", {
                        Request: StringToUint8Array(props.request || "", "utf8")
                    })
                    .then((e: {IsMultipartFormData: boolean}) => {
                        if (e.IsMultipartFormData) {
                            const notify = showModal({
                                title: "潜在的数据包编码问题提示",
                                content: (
                                    <Space direction={"vertical"}>
                                        <Space>
                                            <Typography>
                                                <Text>当前数据包包含一个</Text>
                                                <Text mark={true}>原始文件内容 mutlipart/form-data</Text>
                                                <Text>文件中的不可见字符进入编辑器将会被编码导致丢失信息。</Text>
                                            </Typography>
                                        </Space>
                                        <Typography>
                                            <Text>一般来说，上传文件内容不包含不可见字符时，没有信息丢失风险</Text>
                                        </Typography>
                                        <Typography>
                                            <Text>如果上传文件内容包含图片，将有可能导致</Text>
                                            <Text mark={true}>PNG 格式的图片被异常编码，</Text>
                                            <Text>破坏图片格式，导致</Text>
                                            <Text mark={true}>图片马</Text>
                                            <Text>上传失败</Text>
                                        </Typography>
                                        <br />
                                        <Space>
                                            <Typography>
                                                <Text>如需要插入具体文件内容，可右键</Text>
                                                <Text mark={true}>插入文件</Text>
                                            </Typography>
                                        </Space>
                                        <br />
                                        <Checkbox
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setRemoteValueTTL(ALLOW_MULTIPART_DATA_ALERT, "1", 3600 * 24 * 7)
                                                    notify.destroy()
                                                } else {
                                                    setRemoteValueTTL(ALLOW_MULTIPART_DATA_ALERT, "0", 3600 * 24 * 7)
                                                }
                                            }}
                                        >
                                            一周内不提醒
                                        </Checkbox>
                                        <Button type={"primary"} onClick={() => notify.destroy()}>
                                            我知道了
                                        </Button>
                                    </Space>
                                ),
                                width: "40%"
                            })
                        }
                    })
                    .finally(() => setLoading(false))
            })
            .catch((e) => {
                setLoading(false)
            })
    }, [props.request])
    const getShareContent = useMemoizedFn((callback) => {
        const params: ShareValueProps = {
            isHttps,
            advancedConfig: advancedConfig,
            request: getRequest(),
            advancedConfiguration: {
                forceFuzz,
                concurrent,
                isHttps,
                noFixContentLength,
                proxy,
                actualHost,
                timeout,
                minDelaySeconds,
                maxDelaySeconds,
                _filterMode: getFilterMode(),
                getFilter: getFilter()
            }
        }
        callback(params)
    })
    const setUpShareContent = useMemoizedFn((shareContent: ShareValueProps) => {
        setIsHttps(shareContent.isHttps)
        setAdvancedConfig(shareContent.advancedConfig)
        setRequest(shareContent.request || defaultPostTemplate)
        setForceFuzz(shareContent.advancedConfiguration.forceFuzz)
        setConcurrent(shareContent.advancedConfiguration.concurrent || 20)
        setNoFixContentLength(shareContent.advancedConfiguration.noFixContentLength)
        setProxy(shareContent.advancedConfiguration.proxy)
        setActualHost(shareContent.advancedConfiguration.actualHost)
        setParamTimeout(shareContent.advancedConfiguration.timeout || 30.0)
        setMinDelaySeconds(shareContent.advancedConfiguration.minDelaySeconds)
        setMaxDelaySeconds(shareContent.advancedConfiguration.maxDelaySeconds)
        setFilterMode(shareContent.advancedConfiguration._filterMode || "drop")
        setFilter(shareContent.advancedConfiguration.getFilter)
    })

    const cachedTotal = successFuzzer.length + failedFuzzer.length
    const [currentPage, setCurrentPage] = useState<number>(0)
    const [total, setTotal] = useState<number>()
    const getList = useMemoizedFn((pageInt: number) => {
        setLoading(true)
        ipcRenderer
            .invoke("QueryHistoryHTTPFuzzerTaskEx", {
                Pagination: {Page: pageInt, Limit: 1}
            })
            .then((data: {Data: HTTPFuzzerTaskDetail[]; Total: number; Pagination: PaginationSchema}) => {
                setTotal(data.Total)
                if (data.Data.length > 0) {
                    loadHistory(data.Data[0].BasicInfo.Id)
                    resetResponse()
                    setHistoryTask(undefined)
                    setDroppedCount(0)
                }
            })
            .catch((err) => {
                failed("加载失败:" + err)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })
    const onPrePage = useMemoizedFn(() => {
        if (currentPage === 0 || currentPage === 1) {
            return
        }
        setCurrentPage(currentPage - 1)
        getList(currentPage - 1)
    })
    const onNextPage = useMemoizedFn(() => {
        if (currentPage == total) {
            return
        }
        setCurrentPage(currentPage + 1)
        getList(currentPage + 1)
    })
    return (
        <div style={{height: "100%", width: "100%", display: "flex", flexDirection: "column", overflow: "hidden"}}>
            <Row gutter={8} style={{marginBottom: 8}}>
                <Col span={24} style={{textAlign: "left", marginTop: 4}}>
                    <Space style={{width: "100%", display: "flex", flexDirection: "row"}}>
                        {loading ? (
                            <Button
                                style={{width: 150}}
                                onClick={() => {
                                    cancelCurrentHTTPFuzzer()
                                }}
                                // size={"small"}
                                danger={true}
                                type={"primary"}
                            >
                                强制停止
                            </Button>
                        ) : (
                            <Button
                                style={{width: 150}}
                                onClick={() => {
                                    resetResponse()

                                    setRedirectedResponse(undefined)
                                    sendFuzzerSettingInfo()
                                    submitToHTTPFuzzer()
                                    setCurrentPage(1)
                                }}
                                // size={"small"}
                                type={"primary"}
                            >
                                发送数据包
                            </Button>
                        )}
                        <Checkbox checked={isHttps} onChange={() => setIsHttps(!isHttps)}>
                            强制 HTTPS
                        </Checkbox>
                        <SwitchItem
                            label={"高级配置"}
                            formItemStyle={{marginBottom: 0}}
                            value={advancedConfig}
                            setValue={setAdvancedConfig}
                            size={"small"}
                        />
                        <ShareData module='fuzzer' getShareContent={getShareContent} />
                        <Popover
                            trigger={"click"}
                            placement={"leftTop"}
                            destroyTooltipOnHide={true}
                            content={
                                <div style={{width: 400}}>
                                    <HTTPFuzzerHistorySelector
                                        currentSelectId={currentSelectId}
                                        onSelect={(e, page) => {
                                            setCurrentPage(page)
                                            loadHistory(e)
                                        }}
                                    />
                                </div>
                            }
                        >
                            <Button size={"small"} type={"link"} icon={<HistoryOutlined />}>
                                历史
                            </Button>
                        </Popover>

                        {droppedCount > 0 && <Tag color={"red"}>已丢弃[{droppedCount}]个响应</Tag>}
                        {onlyOneResponse && getFirstResponse().Ok && (
                            <Form.Item style={{marginBottom: 0}}>
                                <Button
                                    onClick={() => {
                                        setLoading(true)
                                        ipcRenderer
                                            .invoke("RedirectRequest", {
                                                Request: request,
                                                Response: new Buffer(getFirstResponse().ResponseRaw).toString("utf8"),
                                                IsHttps: isHttps,
                                                PerRequestTimeoutSeconds: timeout,
                                                NoFixContentLength: noFixContentLength,
                                                Proxy: proxy
                                            })
                                            .then((rsp: FuzzerResponse) => {
                                                setRedirectedResponse(rsp)
                                            })
                                            .catch((e) => {
                                                failed(`"ERROR in: ${e}"`)
                                            })
                                            .finally(() => {
                                                setTimeout(() => setLoading(false), 300)
                                            })
                                    }}
                                >
                                    跟随重定向
                                </Button>
                            </Form.Item>
                        )}
                        {loading && (
                            <Space>
                                <Spin size={"small"} />
                                <div style={{color: "#3a8be3"}}>sending packets</div>
                            </Space>
                        )}
                        {proxy && <Tag>代理：{proxy}</Tag>}
                        {/*<Popover*/}
                        {/*    trigger={"click"}*/}
                        {/*    content={*/}
                        {/*    }*/}
                        {/*>*/}
                        {/*    <Button type={"link"} size={"small"}>*/}
                        {/*        配置请求包*/}
                        {/*    </Button>*/}
                        {/*</Popover>*/}
                        {actualHost !== "" && <Tag color={"red"}>请求 Host:{actualHost}</Tag>}
                    </Space>
                </Col>
            </Row>

            {advancedConfig && (
                <Row style={{marginBottom: 8}} gutter={8}>
                    <Col span={16}>
                        {/*高级配置*/}
                        <Card bordered={true} size={"small"}>
                            <Spin style={{width: "100%"}} spinning={!reqEditor}>
                                <Form
                                    onSubmitCapture={(e) => e.preventDefault()}
                                    // layout={"horizontal"}
                                    size={"small"}
                                    // labelCol={{span: 8}}
                                    // wrapperCol={{span: 16}}
                                >
                                    <Row gutter={8}>
                                        <Col span={12} xl={8}>
                                            <Form.Item
                                                label={<OneLine width={68}>Intruder</OneLine>}
                                                style={{marginBottom: 4}}
                                            >
                                                <Button
                                                    style={{backgroundColor: "#08a701"}}
                                                    size={"small"}
                                                    type={"primary"}
                                                    onClick={() => {
                                                        const m = showModal({
                                                            width: "70%",
                                                            content: (
                                                                <>
                                                                    <StringFuzzer
                                                                        advanced={true}
                                                                        disableBasicMode={true}
                                                                        insertCallback={(template: string) => {
                                                                            if (!template) {
                                                                                Modal.warn({
                                                                                    title: "Payload 为空 / Fuzz 模版为空"
                                                                                })
                                                                            } else {
                                                                                if (reqEditor && template) {
                                                                                    reqEditor.trigger(
                                                                                        "keyboard",
                                                                                        "type",
                                                                                        {
                                                                                            text: template
                                                                                        }
                                                                                    )
                                                                                } else {
                                                                                    Modal.error({
                                                                                        title: "BUG: 编辑器失效"
                                                                                    })
                                                                                }
                                                                                m.destroy()
                                                                            }
                                                                        }}
                                                                    />
                                                                </>
                                                            )
                                                        })
                                                    }}
                                                >
                                                    插入 yak.fuzz 语法
                                                </Button>
                                            </Form.Item>
                                        </Col>
                                        <Col span={12} xl={8}>
                                            <SwitchItem
                                                label={<OneLine width={68}>渲染 fuzz</OneLine>}
                                                setValue={(e) => {
                                                    if (!e) {
                                                        Modal.confirm({
                                                            title: "确认关闭 Fuzz 功能吗？关闭之后，所有的 Fuzz 标签将会失效",
                                                            onOk: () => {
                                                                setForceFuzz(e)
                                                            }
                                                        })
                                                        return
                                                    }
                                                    setForceFuzz(e)
                                                }}
                                                size={"small"}
                                                value={forceFuzz}
                                                formItemStyle={{marginBottom: 4}}
                                            />
                                        </Col>
                                        <Col span={12} xl={8}>
                                            <InputInteger
                                                label={<OneLine width={68}>并发线程</OneLine>}
                                                size={"small"}
                                                setValue={(e) => {
                                                    setConcurrent(e)
                                                }}
                                                formItemStyle={{marginBottom: 4}} // width={40}
                                                width={50}
                                                value={concurrent}
                                            />
                                        </Col>
                                        <Col span={12} xl={8}>
                                            <SwitchItem
                                                label={<OneLine width={68}>HTTPS</OneLine>}
                                                setValue={(e) => {
                                                    setIsHttps(e)
                                                }}
                                                size={"small"}
                                                value={isHttps}
                                                formItemStyle={{marginBottom: 4}}
                                            />
                                        </Col>
                                        <Col span={12} xl={8}>
                                            <SwitchItem
                                                label={
                                                    <OneLine width={70}>
                                                        <Tooltip title={"不修复 Content-Length: 常用发送多个数据包"}>
                                                            不修复长度
                                                        </Tooltip>
                                                    </OneLine>
                                                }
                                                setValue={(e) => {
                                                    setNoFixContentLength(e)
                                                }}
                                                size={"small"}
                                                value={noFixContentLength}
                                                formItemStyle={{marginBottom: 4}}
                                            />
                                        </Col>
                                        <Col span={12} xl={8}>
                                            <ItemSelects
                                                item={{
                                                    style: {marginBottom: 4},
                                                    label: <OneLine width={68}>设置代理</OneLine>
                                                }}
                                                select={{
                                                    style: {width: "100%"},
                                                    allowClear: true,
                                                    autoClearSearchValue: true,
                                                    maxTagTextLength: 8,
                                                    mode: "tags",
                                                    data: [
                                                        {text: "http://127.0.0.1:7890", value: "http://127.0.0.1:7890"},
                                                        {text: "http://127.0.0.1:8080", value: "http://127.0.0.1:8080"},
                                                        {text: "http://127.0.0.1:8082", value: "http://127.0.0.1:8082"}
                                                    ],
                                                    value: proxy ? proxy.split(",") : [],
                                                    setValue: (value) => setProxy(value.join(",")),
                                                    maxTagCount: "responsive"
                                                }}
                                            />
                                        </Col>
                                        <Col span={12} xl={8}>
                                            <InputItem
                                                extraFormItemProps={{
                                                    style: {marginBottom: 0}
                                                }}
                                                label={<OneLine width={68}>请求 Host</OneLine>}
                                                setValue={setActualHost}
                                                value={actualHost}
                                            />
                                        </Col>
                                        <Col span={12} xl={8}>
                                            <InputFloat
                                                formItemStyle={{marginBottom: 4}}
                                                size={"small"}
                                                label={<OneLine width={68}>超时时间</OneLine>}
                                                setValue={setParamTimeout}
                                                value={timeout}
                                            />
                                        </Col>
                                        <Col span={12} xl={8}>
                                            <Form.Item
                                                label={<OneLine width={68}>随机延迟</OneLine>}
                                                style={{marginBottom: 4}}
                                            >
                                                <Input.Group>
                                                    <InputNumber
                                                        style={{width: 95}}
                                                        precision={1}
                                                        value={minDelaySeconds}
                                                        onChange={(e) => {
                                                            setMinDelaySeconds(e as number)
                                                        }}
                                                        min={0}
                                                        step={0.5}
                                                        formatter={(e) => {
                                                            return `min: ${e} s`
                                                        }}
                                                    />
                                                    <InputNumber
                                                        style={{width: 96}}
                                                        precision={1}
                                                        min={0}
                                                        step={0.5}
                                                        value={maxDelaySeconds}
                                                        onChange={(e) => {
                                                            setMaxDelaySeconds(e as number)
                                                        }}
                                                        formatter={(e) => {
                                                            return `max: ${e} s`
                                                        }}
                                                    />
                                                </Input.Group>
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                </Form>
                            </Spin>
                        </Card>
                    </Col>
                    <Col span={8}>
                        <AutoCard
                            title={
                                <Space>
                                    <Tooltip title={"通过过滤匹配，丢弃无用数据包，保证界面性能！"}>
                                        过滤器模式：
                                    </Tooltip>
                                    <Form onSubmitCapture={(e) => e.preventDefault()}>
                                        <SelectOne
                                            formItemStyle={{marginBottom: 0}}
                                            label={""}
                                            colon={false}
                                            size={"small"}
                                            data={[
                                                {value: "drop", text: "丢弃"},
                                                {value: "match", text: "保留"}
                                            ]}
                                            value={getFilterMode()}
                                            setValue={(e) => setFilterMode(e)}
                                        />
                                    </Form>
                                </Space>
                            }
                            bordered={false}
                            size={"small"}
                            bodyStyle={{paddingTop: 4}}
                            style={{marginTop: 0, paddingTop: 0}}
                        >
                            <Form size={"small"} onSubmitCapture={(e) => e.preventDefault()}>
                                <Row gutter={20}>
                                    <Col span={12}>
                                        <InputItem
                                            label={"状态码"}
                                            placeholder={"200,300-399"}
                                            disable={loading}
                                            value={getFilter().StatusCode.join(",")}
                                            setValue={(e) => {
                                                setFilter({...getFilter(), StatusCode: e.split(",")})
                                            }}
                                            extraFormItemProps={{style: {marginBottom: 0}}}
                                        />
                                    </Col>
                                    <Col span={12}>
                                        <InputItem
                                            label={"关键字"}
                                            placeholder={"Login,登录成功"}
                                            value={getFilter().Keywords.join(",")}
                                            disable={loading}
                                            setValue={(e) => {
                                                setFilter({...getFilter(), Keywords: e.split(",")})
                                            }}
                                            extraFormItemProps={{style: {marginBottom: 0}}}
                                        />
                                    </Col>
                                    <Col span={12}>
                                        <InputItem
                                            label={"正则"}
                                            placeholder={`Welcome\\s+\\w+!`}
                                            value={getFilter().Regexps.join(",")}
                                            disable={loading}
                                            setValue={(e) => {
                                                setFilter({...getFilter(), Regexps: e.split(",")})
                                            }}
                                            extraFormItemProps={{style: {marginBottom: 0, marginTop: 2}}}
                                        />
                                    </Col>
                                </Row>
                            </Form>
                        </AutoCard>
                    </Col>
                </Row>
            )}
            {/*<Divider style={{marginTop: 6, marginBottom: 8, paddingTop: 0}}/>*/}
            <ResizeBox
                firstMinSize={350}
                secondMinSize={360}
                style={{overflow: "hidden"}}
                firstNode={
                    <HTTPPacketEditor
                        system={props.system}
                        noHex={true}
                        refreshTrigger={refreshTrigger}
                        hideSearch={true}
                        bordered={true}
                        noMinimap={true}
                        utf8={true}
                        originValue={StringToUint8Array(request)}
                        actions={[
                            {
                                id: "packet-from-url",
                                label: "URL转数据包",
                                contextMenuGroupId: "1_urlPacket",
                                run: () => {
                                    setUrlPacketShow(true)
                                }
                            },
                            {
                                id: "copy-as-url",
                                label: "复制为 URL",
                                contextMenuGroupId: "1_urlPacket",
                                run: () => {
                                    copyAsUrl({Request: getRequest(), IsHTTPS: getIsHttps()})
                                }
                            },
                            {
                                id: "insert-intruder-tag",
                                label: "插入模糊测试字典标签",
                                contextMenuGroupId: "1_urlPacket",
                                run: (editor) => {
                                    showDictsAndSelect((i) => {
                                        monacoEditorWrite(editor, i, editor.getSelection())
                                    })
                                }
                            },
                            {
                                id: "insert-nullbyte",
                                label: "插入空字节标签: {{hexd(00)}}",
                                contextMenuGroupId: "1_urlPacket",
                                run: (editor) => {
                                    editor.trigger("keyboard", "type", {text: "{{hexd(00)}}"})
                                }
                            },
                            {
                                id: "insert-hotpatch-tag",
                                label: "插入热加载标签",
                                contextMenuGroupId: "1_urlPacket",
                                run: (editor) => {
                                    hotPatchTrigger()
                                }
                            },
                            {
                                id: "insert-fuzzfile-tag",
                                label: "插入文件标签",
                                contextMenuGroupId: "1_urlPacket",
                                run: (editor) => {
                                    insertFileFuzzTag((i) => monacoEditorWrite(editor, i))
                                }
                            }
                        ]}
                        onEditor={setReqEditor}
                        onChange={(i) => setRequest(Uint8ArrayToString(i, "utf8"))}
                        extra={
                            <Space size={2}>
                                <ChevronLeftIcon
                                    className={classNames("chevron-icon", {
                                        "chevron-icon-disable": currentPage === 0 || currentPage === 1
                                    })}
                                    onClick={() => onPrePage()}
                                />
                                <ChevronRightIcon
                                    className={classNames("chevron-icon", {
                                        "chevron-icon-disable": currentPage == total
                                    })}
                                    onClick={() => onNextPage()}
                                />
                                <PacketScanButton
                                    packetGetter={() => {
                                        return {httpRequest: StringToUint8Array(request), https: isHttps}
                                    }}
                                />
                                <Button
                                    style={{marginRight: 1}}
                                    size={"small"}
                                    type={"primary"}
                                    onClick={() => {
                                        hotPatchTrigger()
                                    }}
                                >
                                    热加载
                                </Button>
                                <Popover
                                    trigger={"click"}
                                    title={"从 URL 加载数据包"}
                                    content={
                                        <div style={{width: 400}}>
                                            <Form
                                                layout={"vertical"}
                                                onSubmitCapture={(e) => {
                                                    e.preventDefault()

                                                    ipcRenderer
                                                        .invoke("Codec", {
                                                            Type: "packet-from-url",
                                                            Text: targetUrl
                                                        })
                                                        .then((e) => {
                                                            if (e?.Result) {
                                                                setRequest(e.Result)
                                                                refreshRequest()
                                                            }
                                                        })
                                                        .finally(() => {})
                                                }}
                                                size={"small"}
                                            >
                                                <InputItem
                                                    label={"从 URL 构造请求"}
                                                    value={targetUrl}
                                                    setValue={setTargetUrl}
                                                    extraFormItemProps={{style: {marginBottom: 8}}}
                                                />
                                                <Form.Item style={{marginBottom: 8}}>
                                                    <Button type={"primary"} htmlType={"submit"}>
                                                        构造请求
                                                    </Button>
                                                </Form.Item>
                                            </Form>
                                        </div>
                                    }
                                >
                                    <Button size={"small"} type={"primary"}>
                                        URL
                                    </Button>
                                </Popover>
                                {/* <Popover
                                    trigger={"click"}
                                    placement={"leftTop"}
                                    destroyTooltipOnHide={true}
                                    content={
                                        <div style={{width: 400}}>
                                            <HTTPFuzzerHistorySelector
                                                onSelect={(e) => {
                                                    loadHistory(e)
                                                }}
                                            />
                                        </div>
                                    }
                                >
                                    <Button size={"small"} type={"link"} icon={<HistoryOutlined/>}/>
                                </Popover> */}
                            </Space>
                        }
                    />
                }
                secondNode={() => (
                    <AutoSpin spinning={false}>
                        {onlyOneResponse ? (
                            <>
                                {redirectedResponse
                                    ? responseViewer(redirectedResponse)
                                    : responseViewer(getFirstResponse())}
                            </>
                        ) : (
                            <>
                                {cachedTotal > 0 ? (
                                    <HTTPFuzzerResultsCard
                                        onSendToWebFuzzer={sendToFuzzer}
                                        sendToPlugin={sendToPlugin}
                                        setRequest={(r) => {
                                            setRequest(r)
                                            refreshRequest()
                                        }}
                                        extra={
                                            <Space>
                                                <Button
                                                    size={"small"}
                                                    onClick={() => {
                                                        showExtractFuzzerResponseOperator(successFuzzer)
                                                    }}
                                                >
                                                    提取响应数据
                                                </Button>
                                                <Popover
                                                    title={"导出数据"}
                                                    trigger={["click"]}
                                                    content={
                                                        <>
                                                            <Space>
                                                                <Button
                                                                    size={"small"}
                                                                    type={"primary"}
                                                                    onClick={() => {
                                                                        exportHTTPFuzzerResponse(successFuzzer)
                                                                    }}
                                                                >
                                                                    导出所有请求
                                                                </Button>
                                                                <Button
                                                                    size={"small"}
                                                                    type={"primary"}
                                                                    onClick={() => {
                                                                        exportPayloadResponse(successFuzzer)
                                                                    }}
                                                                >
                                                                    仅导出 Payload
                                                                </Button>
                                                            </Space>
                                                        </>
                                                    }
                                                >
                                                    <Button size={"small"}>导出数据</Button>
                                                </Popover>
                                                {/*<Input*/}
                                                {/*    value={keyword}*/}
                                                {/*    style={{maxWidth: 200}}*/}
                                                {/*    allowClear*/}
                                                {/*    placeholder="输入字符串或正则表达式"*/}
                                                {/*    onChange={e => setKeyword(e.target.value)}*/}
                                                {/*    addonAfter={*/}
                                                {/*        <DownloadOutlined style={{cursor: "pointer"}}*/}
                                                {/*                          onClick={downloadContent}/>*/}
                                                {/*    }></Input>*/}
                                            </Space>
                                        }
                                        failedResponses={failedFuzzer}
                                        successResponses={
                                            filterContent.length !== 0 ? filterContent : keyword ? [] : successFuzzer
                                        }
                                    />
                                ) : (
                                    <Result
                                        status={"info"}
                                        title={"请在左边编辑并发送一个 HTTP 请求/模糊测试"}
                                        subTitle={
                                            "本栏结果针对模糊测试的多个 HTTP 请求结果展示做了优化，可以自动识别单个/多个请求的展示"
                                        }
                                    />
                                )}
                            </>
                        )}
                    </AutoSpin>
                )}
            />
            <Modal
                visible={urlPacketShow}
                title='从 URL 加载数据包'
                onCancel={() => setUrlPacketShow(false)}
                footer={null}
            >
                <Form
                    layout={"vertical"}
                    onSubmitCapture={(e) => {
                        e.preventDefault()

                        ipcRenderer
                            .invoke("Codec", {
                                Type: "packet-from-url",
                                Text: targetUrl
                            })
                            .then((e) => {
                                if (e?.Result) {
                                    setRequest(e.Result)
                                    refreshRequest()
                                    setUrlPacketShow(false)
                                }
                            })
                            .finally(() => {})
                    }}
                    size={"small"}
                >
                    <InputItem
                        label={"从 URL 构造请求"}
                        value={targetUrl}
                        setValue={setTargetUrl}
                        extraFormItemProps={{style: {marginBottom: 8}}}
                    ></InputItem>
                    <Form.Item style={{marginBottom: 8}}>
                        <Button type={"primary"} htmlType={"submit"}>
                            构造请求
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}
