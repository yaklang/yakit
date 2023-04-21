import React, {useEffect, useRef, useState} from "react"
import {
    Button,
    Form,
    Modal,
    notification,
    Result,
    Space,
    Typography,
    Popover,
    Tooltip,
    Divider,
    Collapse,
    Input
} from "antd"
import {
    HTTPPacketEditor,
    HTTP_PACKET_EDITOR_FONT_SIZE,
    HTTP_PACKET_EDITOR_Line_Breaks,
    IMonacoEditor
} from "../../utils/editors"
import {showDrawer, showModal} from "../../utils/showModal"
import {monacoEditorWrite} from "./fuzzerTemplates"
import {StringFuzzer} from "./StringFuzzer"
import {InputItem} from "../../utils/inputUtil"
import {FuzzerResponseToHTTPFlowDetail} from "../../components/HTTPFlowDetail"
import {randomString} from "../../utils/randomUtil"
import {failed, info, yakitFailed} from "../../utils/notification"
import {useGetState, useInViewport, useMap, useMemoizedFn, useSize, useUpdateEffect} from "ahooks"
import {getRemoteValue, getLocalValue, setLocalValue, setRemoteValue} from "../../utils/kv"
import {HTTPFuzzerHistorySelector, HTTPFuzzerTaskDetail} from "./HTTPFuzzerHistory"
import {PayloadManagerPage} from "../payloadManager/PayloadManager"
import {HackerPlugin} from "../hacker/HackerPlugin"
import {fuzzerInfoProp} from "../MainOperator"
import {HTTPFuzzerHotPatch} from "./HTTPFuzzerHotPatch"
import {callCopyToClipboard} from "../../utils/basic"
import {exportHTTPFuzzerResponse, exportPayloadResponse} from "./HTTPFuzzerPageExport"
import {StringToUint8Array, Uint8ArrayToString} from "../../utils/str"
import {insertFileFuzzTag, insertTemporaryFileFuzzTag} from "./InsertFileFuzzTag"
import {PacketScanButton} from "@/pages/packetScanner/DefaultPacketScanGroup"
import styles from "./HTTPFuzzerPage.module.scss"
import {ShareData} from "./components/ShareData"
import {showExtractFuzzerResponseOperator} from "@/utils/extractor"
import {
    ChevronDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ChromeSvgIcon,
    ClockIcon,
    CogIcon,
    FilterIcon,
    InformationCircleIcon,
    PaperAirplaneIcon,
    PlusSmIcon,
    SearchIcon,
    StopIcon,
    TrashIcon,
    WrapIcon
} from "@/assets/newIcon"
import classNames from "classnames"
import {PaginationSchema} from "../invoker/schema"
import {editor} from "monaco-editor"
import {showResponseViaResponseRaw} from "@/components/ShowInBrowser"
import {ResizeCardBox} from "@/components/ResizeCardBox/ResizeCardBox"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitAutoComplete} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {RuleContent} from "../mitm/MITMRule/MITMRuleFromModal"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {Size} from "re-resizable"
import {
    BodyLengthInputNumber,
    HTTPFuzzerPageTable,
    HTTPFuzzerPageTableQuery
} from "./components/HTTPFuzzerPageTable/HTTPFuzzerPageTable"
import {onConvertBodySizeByUnit, onConvertBodySizeToB} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {useWatch} from "antd/lib/form/Form"

const {ipcRenderer} = window.require("electron")
const {Panel} = Collapse

interface ShareValueProps {
    isHttps: boolean
    advancedConfig: boolean
    advancedConfiguration: AdvancedConfigurationProps
    request: any
    // retry config
    retry: boolean
    noRetry: boolean
    retryMaxTimes: number
    retryInStatusCode: string
    retryNotInStatusCode: string
    retryWaitSeconds: number
    retryMaxWaitSeconds: number
    // redirect config
    redirectMaxTimes: number
    noFollowRedirect: boolean
    followJSRedirect: boolean
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
    Url?: string

    /**@name 提取响应数据*/
    extracted?: string
}

const defaultPostTemplate = `POST / HTTP/1.1
Content-Type: application/json
Host: www.example.com

{"key": "value"}`

export const WEB_FUZZ_PROXY = "WEB_FUZZ_PROXY"
const WEB_FUZZ_HOTPATCH_CODE = "WEB_FUZZ_HOTPATCH_CODE"
const WEB_FUZZ_HOTPATCH_WITH_PARAM_CODE = "WEB_FUZZ_HOTPATCH_WITH_PARAM_CODE"
const WEB_FUZZ_PROXY_LIST = "WEB_FUZZ_PROXY_LIST"
const WEB_FUZZ_Advanced_Config_ActiveKey = "WEB_FUZZ_Advanced_Config_ActiveKey"
const WEB_FUZZ_Advanced_Config_Switch_Checked = "WEB_FUZZ_Advanced_Config_Switch_Checked"

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

    // /**@name 前端显示的响应大小最小值 */
    // minBodySizeInit?: number
    // /**@name 前端显示的响应大小最大值 */
    // maxBodySizeInit?: number

    // /**@name 响应大小最小值单位 */
    // minBodySizeUnit?: "B" | "K" | "M"
    // /**@name 响应大小最大值单位 */
    // maxBodySizeUnit?: "B" | "K" | "M"
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

interface SelectOptionProps {
    label: string
    value: string
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

    // params
    const [concurrent, setConcurrent] = useState(props.fuzzerParams?.concurrent || 20)
    const [forceFuzz, setForceFuzz] = useState<boolean>(props.fuzzerParams?.forceFuzz || true)
    const [timeout, setParamTimeout] = useState(props.fuzzerParams?.timeout || 30.0)
    const [minDelaySeconds, setMinDelaySeconds] = useState<number>(0)
    const [maxDelaySeconds, setMaxDelaySeconds] = useState<number>(0)
    const [proxy, setProxy] = useState<string>(props.fuzzerParams?.proxy || "")
    const [actualHost, setActualHost] = useState<string>(props.fuzzerParams?.actualHost || "")
    const [advancedConfig, setAdvancedConfig] = useState(false)
    const [redirectedResponse, setRedirectedResponse] = useState<FuzzerResponse>()
    const [historyTask, setHistoryTask] = useState<HistoryHTTPFuzzerTask>()
    const [hotPatchCode, setHotPatchCode] = useState<string>("")
    const [hotPatchCodeWithParamGetter, setHotPatchCodeWithParamGetter] = useState<string>("")
    const [affixSearch, setAffixSearch] = useState("")
    const [defaultResponseSearch, setDefaultResponseSearch] = useState("")
    // 重试
    const [retryMaxTimes, setRetryMaxTimes] = useState(0)
    const [retry, setRetry] = useState<boolean>(true)
    const [noRetry, setNoRetry] = useState<boolean>(false)
    const [retryInStatusCode, setRetryInStatusCode] = useState("")
    const [retryNotInStatusCode, setRetryNotInStatusCode] = useState("")
    const [retryWaitSeconds, setRetryWaitSeconds] = useState(0) // float
    const [retryMaxWaitSeconds, setRetryMaxWaitSeconds] = useState(0)
    // 重定向配置
    const [redirectMaxTimes, setRedirectMaxTimes] = useState(3)
    const [noFollowRedirect, setNoFollowRedirect] = useState(true)
    const [followJSRedirect, setFollowJSRedirect] = useState(false)

    const [currentSelectId, setCurrentSelectId] = useState<number>() // 历史中选中的记录id
    /**@name 是否刷新高级配置中的代理列表 */
    const [refreshProxy, setRefreshProxy] = useState<boolean>(false)
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
    const [curlCommandLine, setCurlCommandLine] = useState("")

    const [refreshTrigger, setRefreshTrigger] = useState(false)
    const refreshRequest = () => {
        setRefreshTrigger(!refreshTrigger)
    }
    const [urlPacketShow, setUrlPacketShow] = useState<boolean>(false)

    // editor First Editor
    const [noWordwrapFirstEditor, setNoWordwrapFirstEditor] = useState(false)
    const [fontSizeFirstEditor, setFontSizeFirstEditor] = useState<number>()
    const [showLineBreaksFirstEditor, setShowLineBreaksFirstEditor] = useState<boolean>(true)
    const [urlType, setUrlType] = useState<string>("")

    // editor Second Editor
    const [noWordwrapSecondEditor, setNoWordwrapSecondEditor] = useState(false)
    const [fontSizeSecondEditor, setFontSizeSecondEditor] = useState<number>()
    const [showLineBreaksSecondEditor, setShowLineBreaksSecondEditor] = useState<boolean>(true)

    // second Node
    const secondNodeRef = useRef(null)
    const secondNodeSize = useSize(secondNodeRef)
    const [showSuccess, setShowSuccess] = useState(true)
    const [query, setQuery] = useState<HTTPFuzzerPageTableQuery>()
    const [isRefresh, setIsRefresh] = useState<boolean>(false)

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
        getRemoteValue(WEB_FUZZ_Advanced_Config_Switch_Checked).then((c) => {
            if (c === "") {
                setAdvancedConfig(true)
            } else {
                setAdvancedConfig(c === "true")
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
        // 缓存全局参数(将fuzz参数的缓存从本地文件替换到引擎数据库内)
        getLocalValue(WEB_FUZZ_PROXY).then((e) => {
            if (e) {
                setLocalValue(WEB_FUZZ_PROXY, "")
                setRemoteValue(WEB_FUZZ_PROXY, `${e}`)
                setProxy(`${e}`)
            } else {
                getRemoteValue(WEB_FUZZ_PROXY).then((e) => {
                    if (!e) {
                        return
                    }
                    setProxy(`${e}`)
                })
            }
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

        setLoading(true)
        setDroppedCount(0)
        const params = {
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
            DelayMaxSeconds: maxDelaySeconds,

            // retry config
            MaxRetryTimes: retryMaxTimes,
            RetryInStatusCode: retry ? retryInStatusCode : "",
            RetryNotInStatusCode: noRetry ? retryNotInStatusCode : "",
            RetryWaitSeconds: retryWaitSeconds,
            RetryMaxWaitSeconds: retryMaxWaitSeconds,

            // redirect config
            NoFollowRedirect: noFollowRedirect,
            FollowJSRedirect: followJSRedirect,
            RedirectTimes: redirectMaxTimes
        }
        if (params.Proxy) {
            const proxyToArr = params.Proxy.split(",").map((ele) => ({label: ele, value: ele}))
            getProxyList(proxyToArr)
        }
        console.log("params", params)
        ipcRenderer.invoke("HTTPFuzzer", params, fuzzToken)
    })

    const getProxyList = useMemoizedFn((proxyList) => {
        getRemoteValue(WEB_FUZZ_PROXY_LIST).then((remoteData) => {
            try {
                const preProxyList = remoteData
                    ? JSON.parse(remoteData)
                    : [
                          {
                              label: "http://127.0.0.1:7890",
                              value: "http://127.0.0.1:7890"
                          },
                          {
                              label: "http://127.0.0.1:8080",
                              value: "http://127.0.0.1:8080"
                          },
                          {
                              label: "http://127.0.0.1:8082",
                              value: "http://127.0.0.1:8082"
                          }
                      ]

                const list = [...proxyList, ...preProxyList]
                const newProxyList: SelectOptionProps[] = []
                const l = list.length

                for (let i = 0; i < l; i++) {
                    const oldElement = list[i]
                    const index = newProxyList.findIndex((ele) => ele.value === oldElement.value)
                    if (index === -1) {
                        newProxyList.push(oldElement)
                    }
                    if (i >= 9) {
                        break
                    }
                }
                setRemoteValue(WEB_FUZZ_PROXY_LIST, JSON.stringify(newProxyList)).then(() => {
                    setRefreshProxy(!refreshProxy)
                })
            } catch (error) {
                yakitFailed("代理列表获取失败:" + error)
            }
        })
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
                UUID: data.UUID || randomString(16), // 新版yakit,成功和失败的数据都有UUID,旧版失败的数据没有UUID,兼容
                Timestamp: data.Timestamp,
                ResponseRaw: data.ResponseRaw,
                RequestRaw: data.RequestRaw,
                Payloads: data.Payloads,
                IsHTTPS: data.IsHTTPS,
                Count: count,
                BodySimilarity: data.BodySimilarity,
                HeaderSimilarity: data.HeaderSimilarity,
                Url: data.Url
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
    const [extractedMap, {setAll}] = useMap<string, string>()
    useEffect(() => {
        ipcRenderer.on("fetch-extracted-to-table", (e: any, data: {extractedMap: Map<string, string>}) => {
            setAll(data.extractedMap)
        })
        return () => {
            ipcRenderer.removeAllListeners("fetch-extracted-to-table")
        }
    }, [])

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
                defaultSearchKeyword={defaultResponseSearch}
                system={props.system}
                originValue={rsp.ResponseRaw}
                bordered={false}
                hideSearch={true}
                isResponse={true}
                noHex={true}
                noHeader={true}
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
                fontSizeState={fontSizeSecondEditor}
                noWordWrapState={noWordwrapSecondEditor}
            />
        )
    })

    const hotPatchTrigger = useMemoizedFn(() => {
        let m = showYakitModal({
            title: "调试 / 插入热加载代码",
            width: "80%",
            footer: null,
            content: (
                <div className={styles["http-fuzzer-hotPatch"]}>
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
            },
            // retry config
            retry,
            noRetry,
            retryMaxTimes,
            retryInStatusCode,
            retryNotInStatusCode,
            retryWaitSeconds,
            retryMaxWaitSeconds,
            // redirect config
            noFollowRedirect,
            followJSRedirect,
            redirectMaxTimes
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
        // 重试配置
        if (shareContent.retryMaxTimes > 0) {
            setRetryMaxTimes(shareContent.retryMaxTimes)
        } else {
            setRetryMaxTimes(0)
        }
        setRetry(shareContent.retry)
        setNoRetry(shareContent.noRetry)
        setRetryInStatusCode(shareContent.retryInStatusCode || "")
        setRetryNotInStatusCode(shareContent.retryNotInStatusCode || "")
        setRetryWaitSeconds(shareContent.retryWaitSeconds || 0)
        setRetryMaxWaitSeconds(shareContent.retryMaxWaitSeconds || 0)
        // 重定向配置
        setRedirectMaxTimes(shareContent.redirectMaxTimes || 0)
        setNoFollowRedirect(shareContent.noFollowRedirect)
        setFollowJSRedirect(shareContent.followJSRedirect)
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
        if (!total) return
        if (currentPage == total) {
            return
        }
        setCurrentPage(currentPage + 1)
        getList(currentPage + 1)
    })

    useEffect(() => {
        getTotal()
    }, [])

    const getTotal = useMemoizedFn(() => {
        ipcRenderer
            .invoke("QueryHistoryHTTPFuzzerTaskEx", {
                Pagination: {Page: 1, Limit: 1}
            })
            .then((data: {Data: HTTPFuzzerTaskDetail[]; Total: number; Pagination: PaginationSchema}) => {
                setTotal(data.Total)
            })
    })

    useEffect(() => {
        try {
            if (!reqEditor) {
                return
            }
            reqEditor?.getModel()?.pushEOL(editor.EndOfLineSequence.CRLF)
        } catch (e) {
            failed("初始化 EOL CRLF 失败")
        }
    }, [reqEditor])
    /**@description 插入 yak.fuzz 语法 */
    const onInsertYakFuzzer = useMemoizedFn(() => {
        const m = showYakitModal({
            title: "Fuzzer Tag 调试工具",
            width: "70%",
            footer: null,
            subTitle: "调试模式适合生成或者修改 Payload，在调试完成后，可以在 Web Fuzzer 中使用",
            content: (
                <div style={{padding: 24}}>
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
                                    reqEditor.trigger("keyboard", "type", {
                                        text: template
                                    })
                                } else {
                                    Modal.error({
                                        title: "BUG: 编辑器失效"
                                    })
                                }
                                m.destroy()
                            }
                        }}
                    />
                </div>
            )
        })
    })

    /**
     * @@description 获取高级配置中的Form values
     */
    const onGetFormValue = useMemoizedFn((val: AdvancedConfigValueProps) => {
        // 请求包配置
        setForceFuzz(val.forceFuzz || false)
        setIsHttps(val.isHttps)
        setNoFixContentLength(val.noFixContentLength)
        setActualHost(val.actualHost)
        setParamTimeout(val.timeout)
        // 发包配置
        setConcurrent(val.concurrent)
        setProxy(val.proxy ? val.proxy?.join(",") : "")
        setMinDelaySeconds(val.minDelaySeconds ? Number(val.minDelaySeconds) : 0)
        setMaxDelaySeconds(val.maxDelaySeconds ? Number(val.maxDelaySeconds) : 0)
        // 重试配置
        if (val.maxRetryTimes > 0) {
            setRetryMaxTimes(val.maxRetryTimes)
        } else {
            setRetryMaxTimes(0)
        }
        setRetry(val.retrying || false)
        setNoRetry(val.noRetrying || false)
        setRetryInStatusCode(val.retryConfiguration?.statusCode || "")
        setRetryNotInStatusCode(val.noRetryConfiguration?.statusCode || "")
        setRetryWaitSeconds(val.retryConfiguration?.waitTime || 0)
        setRetryMaxWaitSeconds(val.retryConfiguration?.maxWaitTime || 0)

        // 重定向配置
        setRedirectMaxTimes(val.redirectCount || 0)
        setNoFollowRedirect(val.noFollowRedirect)
        setFollowJSRedirect(val.followJSRedirect)

        // 过滤配置
        setFilterMode(val.filterMode)
        setFilter({
            Keywords: val.keyWord?.split(",") || [],
            MaxBodySize: Number(val.maxBodySize) || 0,
            MinBodySize: Number(val.minBodySize) || 0,
            Regexps: val.regexps?.split(",") || [],
            StatusCode: val.statusCode?.split(",") || []
        })
    })
    const onSetAdvancedConfig = useMemoizedFn((c: boolean) => {
        setAdvancedConfig(c)
        setRemoteValue(WEB_FUZZ_Advanced_Config_Switch_Checked, `${c}`)
    })
    return (
        <div className={styles["http-fuzzer-body"]}>
            <HttpQueryAdvancedConfig
                defAdvancedConfigValue={{
                    // 请求包配置
                    forceFuzz,
                    isHttps,
                    noFixContentLength,
                    actualHost,
                    timeout,
                    // 发包配置
                    concurrent,
                    proxy: proxy ? proxy?.split(",") : [],
                    minDelaySeconds,
                    maxDelaySeconds,
                    // 重试配置
                    maxRetryTimes: retryMaxTimes,
                    retrying: retry,
                    noRetrying: noRetry,
                    retryConfiguration: {
                        statusCode: retryInStatusCode,
                        keyWord: ""
                    },
                    noRetryConfiguration: {
                        statusCode: retryNotInStatusCode,
                        keyWord: ""
                    },
                    // 重定向配置
                    redirectCount: redirectMaxTimes,
                    noFollowRedirect: noFollowRedirect,
                    followJSRedirect: followJSRedirect,
                    redirectConfiguration: {
                        statusCode: "",
                        keyWord: ""
                    },
                    noRedirectConfiguration: {
                        statusCode: "",
                        keyWord: ""
                    },
                    // 过滤配置
                    filterMode: _filterMode || "drop",
                    statusCode: getFilter().StatusCode.join(",") || "",
                    regexps: getFilter().Regexps.join(","),
                    keyWord: getFilter().Keywords?.join(",") || "",
                    minBodySize: getFilter().MinBodySize,
                    maxBodySize: getFilter().MaxBodySize
                    // minBodySizeInit: onConvertBodySizeToB(getFilter().MinBodySize, getFilter().minBodySizeUnit || "B"),
                    // maxBodySizeInit: onConvertBodySizeToB(getFilter().MaxBodySize, getFilter().maxBodySizeUnit || "B"),
                    // minBodySizeUnit: getFilter().minBodySizeUnit || "B",
                    // maxBodySizeUnit: getFilter().maxBodySizeUnit || "B"
                }}
                isHttps={isHttps}
                setIsHttps={setIsHttps}
                visible={advancedConfig}
                setVisible={onSetAdvancedConfig}
                onInsertYakFuzzer={onInsertYakFuzzer}
                onValuesChange={(v) => onGetFormValue(v)}
                refreshProxy={refreshProxy}
            />
            <div className={styles["http-fuzzer-page"]}>
                <div className={styles["fuzzer-heard"]}>
                    {loading ? (
                        <YakitButton
                            onClick={() => {
                                cancelCurrentHTTPFuzzer()
                            }}
                            icon={<StopIcon className={styles["stop-icon"]} />}
                            className='button-primary-danger'
                            danger={true}
                            type={"primary"}
                            size='large'
                        >
                            强制停止
                        </YakitButton>
                    ) : (
                        <YakitButton
                            onClick={() => {
                                resetResponse()

                                setRemoteValue(WEB_FUZZ_PROXY, `${proxy}`)
                                setRedirectedResponse(undefined)
                                sendFuzzerSettingInfo()
                                submitToHTTPFuzzer()
                                setCurrentPage(1)
                            }}
                            icon={<PaperAirplaneIcon style={{height: 16}} />}
                            type={"primary"}
                            size='large'
                        >
                            发送请求
                        </YakitButton>
                    )}
                    {!advancedConfig && (
                        <div className={styles["display-flex"]}>
                            <span>高级配置</span>
                            <YakitSwitch checked={advancedConfig} onChange={onSetAdvancedConfig} />
                        </div>
                    )}
                    <div className={styles["fuzzer-heard-force"]}>
                        <span className={styles["fuzzer-heard-https"]}>强制 HTTPS</span>
                        <YakitCheckbox checked={isHttps} onChange={(e) => setIsHttps(e.target.checked)} />
                    </div>
                    <Divider type='vertical' style={{margin: 0, top: 1}} />
                    <div className={styles["display-flex"]}>
                        <ShareData module='fuzzer' getShareContent={getShareContent} />
                        <Divider type='vertical' style={{margin: "0 8px", top: 1}} />
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
                                        onDeleteAllCallback={() => {
                                            setCurrentPage(0)
                                            getTotal()
                                        }}
                                    />
                                </div>
                            }
                        >
                            <YakitButton type='text' icon={<ClockIcon />} style={{padding: "4px 0px"}}>
                                历史
                            </YakitButton>
                        </Popover>
                    </div>
                    {loading && (
                        <div className={classNames(styles["spinning-text"], styles["display-flex"])}>
                            <YakitSpin size={"small"} style={{width: "auto"}} />
                            sending packets
                        </div>
                    )}

                    {onlyOneResponse && getFirstResponse().Ok && (
                        <YakitButton
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
                            type='outline2'
                        >
                            跟随重定向
                        </YakitButton>
                    )}
                    <div className={styles["display-flex"]}>
                        {droppedCount > 0 && <YakitTag color='danger'>已丢弃[{droppedCount}]个响应</YakitTag>}
                        {proxy && (
                            <Tooltip title={proxy}>
                                <YakitTag className={classNames(styles["proxy-text"], "content-ellipsis")}>
                                    代理：{proxy}
                                </YakitTag>
                            </Tooltip>
                        )}
                        {actualHost && (
                            <YakitTag
                                color='danger'
                                className={classNames(styles["actualHost-text"], "content-ellipsis")}
                            >
                                请求 Host:{actualHost}
                            </YakitTag>
                        )}
                    </div>
                </div>
                {/*<Divider style={{marginTop: 6, marginBottom: 8, paddingTop: 0}}/>*/}
                <ResizeCardBox
                    firstMinSize={420}
                    secondMinSize={480}
                    style={{overflow: "hidden"}}
                    firstNodeProps={{
                        title: "Request",
                        extra: (
                            <div className={styles["fuzzer-firstNode-extra"]}>
                                <div className={styles["fuzzer-flipping-pages"]}>
                                    <ChevronLeftIcon
                                        className={classNames(styles["chevron-icon"], {
                                            [styles["chevron-icon-disable"]]: currentPage === 0 || currentPage === 1
                                        })}
                                        onClick={() => onPrePage()}
                                    />
                                    <ChevronRightIcon
                                        className={classNames(styles["chevron-icon"], {
                                            [styles["chevron-icon-disable"]]: currentPage == total || !total
                                        })}
                                        onClick={() => onNextPage()}
                                    />
                                </div>
                                <PacketScanButton
                                    packetGetter={() => {
                                        return {httpRequest: StringToUint8Array(request), https: isHttps}
                                    }}
                                />
                                <YakitButton
                                    size='small'
                                    type='primary'
                                    onClick={() => {
                                        hotPatchTrigger()
                                    }}
                                >
                                    热加载
                                </YakitButton>
                                <YakitPopover
                                    trigger={"click"}
                                    content={
                                        <div style={{width: 400}}>
                                            <Form
                                                layout={"vertical"}
                                                onFinish={(v) => {
                                                    ipcRenderer
                                                        .invoke("Codec", {
                                                            ...v
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
                                                <Form.Item name='Type' initialValue='packet-from-url'>
                                                    <YakitRadioButtons
                                                        buttonStyle='solid'
                                                        options={[
                                                            {
                                                                value: "packet-from-url",
                                                                label: "URL"
                                                            },
                                                            {
                                                                value: "packet-from-curl",
                                                                label: "cURL"
                                                            }
                                                        ]}
                                                    />
                                                </Form.Item>
                                                <Form.Item name='Text'>
                                                    <YakitInput size='small' />
                                                </Form.Item>
                                                <Form.Item style={{marginBottom: 8, marginTop: 8}}>
                                                    <YakitButton type={"primary"} htmlType={"submit"}>
                                                        构造请求
                                                    </YakitButton>
                                                </Form.Item>
                                            </Form>
                                        </div>
                                    }
                                >
                                    <YakitButton size={"small"} type={"primary"}>
                                        构造请求
                                    </YakitButton>
                                </YakitPopover>
                                <EditorsSetting
                                    noWordwrap={noWordwrapFirstEditor}
                                    setNoWordwrap={setNoWordwrapFirstEditor}
                                    fontSize={fontSizeFirstEditor}
                                    setFontSize={setFontSizeFirstEditor}
                                    showLineBreaks={showLineBreaksFirstEditor}
                                    setShowLineBreaks={setShowLineBreaksFirstEditor}
                                />
                            </div>
                        )
                    }}
                    secondNodeProps={{
                        title: (
                            <>
                                <span style={{marginRight: 8}}>Responses</span>
                                <SecondNodeTitle
                                    onlyOneResponse={onlyOneResponse}
                                    rsp={redirectedResponse ? redirectedResponse : getFirstResponse()}
                                    successFuzzerLength={(successFuzzer || []).length}
                                    failedFuzzerLength={(failedFuzzer || []).length}
                                    showSuccess={showSuccess}
                                    setShowSuccess={(v) => {
                                        setShowSuccess(v)
                                        setQuery(undefined)
                                    }}
                                />
                            </>
                        ),
                        extra: (
                            <div className={styles["fuzzer-secondNode-extra"]}>
                                <SecondNodeExtra
                                    onlyOneResponse={onlyOneResponse}
                                    cachedTotal={cachedTotal}
                                    rsp={redirectedResponse ? redirectedResponse : getFirstResponse()}
                                    valueSearch={affixSearch}
                                    onSearchValueChange={(value) => {
                                        setAffixSearch(value)
                                        if (value === "" && defaultResponseSearch !== "") {
                                            setDefaultResponseSearch("")
                                        }
                                    }}
                                    onSearch={() => {
                                        setDefaultResponseSearch(affixSearch)
                                    }}
                                    onRemove={() => {
                                        setSuccessFuzzer([])
                                        setFailedFuzzer([])
                                    }}
                                    successFuzzer={successFuzzer}
                                    secondNodeSize={secondNodeSize}
                                    query={query}
                                    setQuery={(q) => setQuery({...q})}
                                />
                                {onlyOneResponse && (
                                    <EditorsSetting
                                        fontSize={fontSizeSecondEditor}
                                        setFontSize={setFontSizeSecondEditor}
                                        noWordwrap={noWordwrapSecondEditor}
                                        setNoWordwrap={setNoWordwrapSecondEditor}
                                        showLineBreaks={showLineBreaksSecondEditor}
                                        setShowLineBreaks={setShowLineBreaksSecondEditor}
                                    />
                                )}
                            </div>
                        )
                    }}
                    firstNode={
                        <HTTPPacketEditor
                            system={props.system}
                            noHex={true}
                            noHeader={true}
                            refreshTrigger={refreshTrigger}
                            hideSearch={true}
                            bordered={false}
                            noMinimap={true}
                            utf8={true}
                            originValue={StringToUint8Array(request)}
                            actions={[
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
                                },
                                {
                                    id: "insert-temporary-file-tag",
                                    label: "插入临时字典",
                                    contextMenuGroupId: "1_urlPacket",
                                    run: (editor) => {
                                        insertTemporaryFileFuzzTag((i) => monacoEditorWrite(editor, i))
                                    }
                                }
                            ]}
                            onEditor={setReqEditor}
                            onChange={(i) => setRequest(Uint8ArrayToString(i, "utf8"))}
                            noWordWrapState={noWordwrapFirstEditor}
                            fontSizeState={fontSizeFirstEditor}
                            showLineBreaksState={showLineBreaksFirstEditor}
                        />
                    }
                    secondNode={
                        <div ref={secondNodeRef} style={{height: "100%", overflow: "hidden"}}>
                            <YakitSpin spinning={false} style={{height: "100%"}}>
                                {onlyOneResponse ? (
                                    <>
                                        {redirectedResponse
                                            ? responseViewer(redirectedResponse)
                                            : responseViewer(getFirstResponse())}
                                    </>
                                ) : (
                                    <>
                                        {cachedTotal > 0 ? (
                                            <>
                                                {showSuccess && (
                                                    <HTTPFuzzerPageTable
                                                        onSendToWebFuzzer={sendToFuzzer}
                                                        success={showSuccess}
                                                        data={successFuzzer}
                                                        query={query}
                                                        setQuery={setQuery}
                                                        isRefresh={isRefresh}
                                                        extractedMap={extractedMap}
                                                    />
                                                )}
                                                {!showSuccess && (
                                                    <HTTPFuzzerPageTable
                                                        success={showSuccess}
                                                        data={failedFuzzer}
                                                        query={query}
                                                        setQuery={setQuery}
                                                        isRefresh={isRefresh}
                                                        extractedMap={new Map()}
                                                    />
                                                )}
                                            </>
                                        ) : (
                                            <Result
                                                status={"warning"}
                                                title={"请在左边编辑并发送一个 HTTP 请求/模糊测试"}
                                                subTitle={
                                                    "本栏结果针对模糊测试的多个 HTTP 请求结果展示做了优化，可以自动识别单个/多个请求的展示"
                                                }
                                            />
                                        )}
                                    </>
                                )}
                            </YakitSpin>
                        </div>
                    }
                />
            </div>
        </div>
    )
}

interface SecondNodeExtraProps {
    rsp: FuzzerResponse
    onlyOneResponse: boolean
    cachedTotal: number
    valueSearch: string
    onSearchValueChange: (s: string) => void
    onSearch: () => void
    onRemove: () => void
    successFuzzer: FuzzerResponse[]
    secondNodeSize?: Size
    query?: HTTPFuzzerPageTableQuery
    setQuery: (h: HTTPFuzzerPageTableQuery) => void
}

/**
 * @description 右边的返回内容 头部 extra
 */
const SecondNodeExtra: React.FC<SecondNodeExtraProps> = React.memo((props) => {
    const {
        rsp,
        onlyOneResponse,
        cachedTotal,
        valueSearch,
        onSearchValueChange,
        onSearch,
        onRemove,
        successFuzzer,
        secondNodeSize,
        query,
        setQuery
    } = props

    const [keyWord, setKeyWord] = useState<string>()
    const [statusCode, setStatusCode] = useState<string[]>()
    const [bodyLength, setBodyLength] = useState<HTTPFuzzerPageTableQuery>({
        afterBodyLength: undefined,
        beforeBodyLength: undefined
        // bodyLengthUnit: "B"
    })

    const bodyLengthRef = useRef<any>()

    useEffect(() => {
        setStatusCode(query?.StatusCode)
        setKeyWord(query?.keyWord)
        setBodyLength({
            afterBodyLength: query?.afterBodyLength,
            beforeBodyLength: query?.beforeBodyLength
            // bodyLengthUnit: query?.bodyLengthUnit || "B"
        })
    }, [query])

    if (onlyOneResponse) {
        const searchNode = (
            <YakitInput.Search
                size='small'
                placeholder='请输入定位响应'
                value={valueSearch}
                onChange={(e) => {
                    const {value} = e.target
                    onSearchValueChange(value)
                }}
                style={{maxWidth: 200}}
                onSearch={() => onSearch()}
                onPressEnter={(e) => {
                    e.preventDefault()
                    onSearch()
                }}
            />
        )
        return (
            <>
                {(secondNodeSize?.width || 0) > 620 && searchNode}
                {(secondNodeSize?.width || 0) < 620 && (
                    <YakitPopover content={searchNode}>
                        <YakitButton
                            icon={<SearchIcon />}
                            size='small'
                            type='outline2'
                            className={styles["editor-cog-icon"]}
                        />
                    </YakitPopover>
                )}
                <Divider type='vertical' style={{margin: 0, top: 1}} />
                <ChromeSvgIcon
                    className={styles["extra-chrome-btn"]}
                    onClick={() => {
                        showResponseViaResponseRaw(rsp.ResponseRaw || "")
                    }}
                />
                <YakitButton
                    type='primary'
                    onClick={() => {
                        analyzeFuzzerResponse(rsp, () => {})
                    }}
                    size='small'
                >
                    详情
                </YakitButton>
                <Divider type='vertical' style={{margin: 0, top: 1}} />
                <YakitButton
                    type='outline2'
                    size='small'
                    icon={<TrashIcon />}
                    className={classNames("button-text-danger", styles["trash-icon-btn"])}
                    onClick={() => onRemove()}
                />
            </>
        )
    }

    if (!onlyOneResponse && cachedTotal > 0) {
        const searchNode = (
            <YakitInput.Search
                size='small'
                placeholder='请输入关键词搜索'
                value={keyWord}
                onChange={(e) => {
                    setKeyWord(e.target.value)
                }}
                style={{minWidth: 130}}
                onSearch={(v) => {
                    setQuery({
                        ...query,
                        // bodyLengthUnit: query?.bodyLengthUnit || "B",
                        keyWord: v
                    })
                    setKeyWord(v)
                }}
                onPressEnter={(e) => {
                    e.preventDefault()
                    setQuery({
                        ...query,
                        // bodyLengthUnit: query?.bodyLengthUnit || "B",
                        keyWord: keyWord
                    })
                }}
            />
        )
        return (
            <>
                {(secondNodeSize?.width || 0) > 620 && searchNode}
                {(secondNodeSize?.width || 0) < 620 && (
                    <YakitPopover
                        content={searchNode}
                        onVisibleChange={(b) => {
                            if (!b) {
                                setQuery({
                                    ...query,
                                    // bodyLengthUnit: query?.bodyLengthUnit || "B",
                                    keyWord: keyWord
                                })
                            }
                        }}
                    >
                        <YakitButton
                            icon={<SearchIcon />}
                            size='small'
                            type='outline2'
                            className={classNames(styles["editor-cog-icon"], {
                                [styles["active-icon"]]: query?.keyWord
                            })}
                        />
                    </YakitPopover>
                )}
                <YakitPopover
                    content={
                        <div className={styles["second-node-search-content"]}>
                            <div className={styles["second-node-search-item"]}>
                                <span>状态码</span>
                                <YakitSelect
                                    value={statusCode}
                                    onChange={setStatusCode}
                                    size='small'
                                    mode='tags'
                                    allowClear
                                    options={[
                                        {
                                            value: "100-200",
                                            label: "100-200"
                                        },
                                        {
                                            value: "200-300",
                                            label: "200-300"
                                        },
                                        {
                                            value: "300-400",
                                            label: "300-400"
                                        },
                                        {
                                            value: "400-500",
                                            label: "400-500"
                                        },
                                        {
                                            value: "500-600",
                                            label: "500-600"
                                        }
                                    ]}
                                />
                            </div>
                            <div className={styles["second-node-search-item"]}>
                                <span>响应大小</span>
                                <BodyLengthInputNumber
                                    ref={bodyLengthRef}
                                    query={bodyLength}
                                    setQuery={() => {}}
                                    showFooter={false}
                                />
                            </div>
                        </div>
                    }
                    onVisibleChange={(b) => {
                        if (!b) {
                            const l = bodyLengthRef?.current?.getValue() || {}
                            setQuery({
                                ...l,
                                keyWord: keyWord,
                                StatusCode: statusCode
                            })
                        }
                    }}
                >
                    <YakitButton
                        icon={<FilterIcon />}
                        size='small'
                        type='outline2'
                        className={classNames(styles["editor-cog-icon"], {
                            [styles["active-icon"]]:
                                (query?.StatusCode?.length || 0) > 0 ||
                                query?.afterBodyLength ||
                                query?.beforeBodyLength
                        })}
                    />
                </YakitPopover>

                <Divider type='vertical' style={{margin: 0, top: 1}} />
                <YakitButton
                    type='outline2'
                    size='small'
                    onClick={() => {
                        showExtractFuzzerResponseOperator(successFuzzer)
                    }}
                >
                    提取响应数据
                </YakitButton>
                <YakitPopover
                    title={"导出数据"}
                    trigger={["click"]}
                    content={
                        <>
                            <Space>
                                <YakitButton
                                    size={"small"}
                                    type={"primary"}
                                    onClick={() => {
                                        exportHTTPFuzzerResponse(successFuzzer)
                                    }}
                                >
                                    导出所有请求
                                </YakitButton>
                                <YakitButton
                                    size={"small"}
                                    type={"primary"}
                                    onClick={() => {
                                        exportPayloadResponse(successFuzzer)
                                    }}
                                >
                                    仅导出 Payload
                                </YakitButton>
                            </Space>
                        </>
                    }
                >
                    <YakitButton type='outline2' size='small'>
                        导出数据
                    </YakitButton>
                </YakitPopover>
            </>
        )
    }
    return <></>
})

interface SecondNodeTitleProps {
    rsp: FuzzerResponse
    onlyOneResponse: boolean
    successFuzzerLength: number
    failedFuzzerLength: number
    showSuccess: boolean
    setShowSuccess: (b: boolean) => void
}

/**
 * @description 右边的返回内容 头部left内容
 */
const SecondNodeTitle: React.FC<SecondNodeTitleProps> = React.memo((props) => {
    const {rsp, onlyOneResponse, successFuzzerLength, failedFuzzerLength, showSuccess, setShowSuccess} = props
    // if (!rsp.BodyLength) return <></>
    if (onlyOneResponse) {
        return (
            <>
                {rsp.IsHTTPS && <YakitTag>{rsp.IsHTTPS ? "https" : ""}</YakitTag>}
                <YakitTag>
                    {rsp.BodyLength}bytes / {rsp.DurationMs}ms
                </YakitTag>
            </>
        )
    }
    if (successFuzzerLength > 0 || failedFuzzerLength > 0) {
        return (
            <div className={styles["second-node-title"]}>
                <YakitRadioButtons
                    size='small'
                    value={showSuccess}
                    onChange={(e) => {
                        setShowSuccess(e.target.value)
                    }}
                    buttonStyle='solid'
                    options={[
                        {
                            value: true,
                            label: `成功[${successFuzzerLength}]`
                        },
                        {
                            value: false,
                            label: `失败[${failedFuzzerLength}]`
                        }
                    ]}
                />
            </div>
        )
    }
    return <></>
})

interface AdvancedConfigValueProps {
    // 请求包配置
    forceFuzz?: boolean
    isHttps: boolean
    /**@name 不修复长度 */
    noFixContentLength: boolean
    actualHost: string
    timeout: number
    // 发包配置
    concurrent: number
    proxy: string[]
    minDelaySeconds: number
    maxDelaySeconds: number
    // 重试配置
    maxRetryTimes: number
    /**@name 重试条件的checked */
    retrying: boolean
    /**@name 不重试条件的checked */
    noRetrying: boolean
    retryConfiguration?: {
        statusCode: string
        keyWord: string
        waitTime?: number
        maxWaitTime?: number
    }
    noRetryConfiguration?: {
        statusCode: string
        keyWord: string
    }
    // 重定向配置
    redirectCount: number
    noFollowRedirect: boolean
    followJSRedirect: boolean
    redirectConfiguration?: {
        statusCode: string
        keyWord: string
    }
    noRedirectConfiguration?: {
        statusCode: string
        keyWord: string
    }
    // 过滤配置
    filterMode: "drop" | "match"
    statusCode: string
    regexps: string
    keyWord: string
    /**@name 转换后转给后端的的响应大小最大值 */
    minBodySize: number
    /**@name 转换后转给后端的的响应大小最小值 */
    maxBodySize: number
    // /**@name 前端显示的响应大小最小值 */
    // minBodySizeInit?: number
    // /**@name 前端显示的响应大小最大值 */
    // maxBodySizeInit?: number
    // /**@name 响应大小最小值单位 */
    // minBodySizeUnit: "B" | "K" | "M"
    // /**@name 响应大小最大值单位 */
    // maxBodySizeUnit: "B" | "K" | "M"
}

interface HttpQueryAdvancedConfigProps {
    defAdvancedConfigValue: AdvancedConfigValueProps
    isHttps: boolean
    setIsHttps: (b: boolean) => void
    visible: boolean
    setVisible: (b: boolean) => void
    onInsertYakFuzzer: () => void
    onValuesChange: (v: AdvancedConfigValueProps) => void
    /**刷新设置代理的list */
    refreshProxy: boolean
}

const HttpQueryAdvancedConfig: React.FC<HttpQueryAdvancedConfigProps> = React.memo((props) => {
    const {
        defAdvancedConfigValue,
        isHttps,
        setIsHttps,
        visible,
        setVisible,
        onInsertYakFuzzer,
        onValuesChange,
        refreshProxy
    } = props

    const [retryActive, setRetryActive] = useState<string[]>(["重试条件"])

    const [redirect, setRedirect] = useState<boolean>(true)
    const [noRedirect, setNoRedirect] = useState<boolean>(false)
    const [redirectActive, setRedirectActive] = useState<string[] | string>(["重定向条件"])

    const [proxyList, setProxyList] = useState<SelectOptionProps[]>([]) // 代理代表
    const [activeKey, setActiveKey] = useState<string[]>() // Collapse打开的key

    const ruleContentRef = useRef<any>()
    const [form] = Form.useForm()
    const queryRef = useRef(null)
    const [inViewport] = useInViewport(queryRef)

    const retrying = useWatch("retrying", form)
    const noRetrying = useWatch("noRetrying", form)

    useEffect(() => {
        let newRetryActive = retryActive
        if (retrying) {
            newRetryActive = [...newRetryActive, "重试条件"]
        } else {
            newRetryActive = newRetryActive.filter((ele) => ele !== "重试条件")
        }
        if (noRetrying) {
            newRetryActive = [...newRetryActive, "不重试条件"]
        } else {
            newRetryActive = newRetryActive.filter((ele) => ele !== "不重试条件")
        }
        setRetryActive(newRetryActive)
    }, [retrying, noRetrying])

    useEffect(() => {
        getRemoteValue(WEB_FUZZ_Advanced_Config_ActiveKey).then((data) => {
            try {
                setActiveKey(data ? JSON.parse(data) : "请求包配置")
            } catch (error) {
                yakitFailed("获取折叠面板的激活key失败:" + error)
            }
        })
    }, [])

    useEffect(() => {
        // 代理数据 最近10条
        getRemoteValue(WEB_FUZZ_PROXY_LIST).then((remoteData) => {
            try {
                setProxyList(
                    remoteData
                        ? JSON.parse(remoteData)
                        : [
                              {
                                  label: "http://127.0.0.1:7890",
                                  value: "http://127.0.0.1:7890"
                              },
                              {
                                  label: "http://127.0.0.1:8080",
                                  value: "http://127.0.0.1:8080"
                              },
                              {
                                  label: "http://127.0.0.1:8082",
                                  value: "http://127.0.0.1:8082"
                              }
                          ]
                )
            } catch (error) {
                yakitFailed("代理列表获取失败:" + error)
            }
        })
    }, [inViewport, refreshProxy])
    useEffect(() => {
        form.setFieldsValue({isHttps: isHttps})
    }, [isHttps])
    useEffect(() => {
        form.setFieldsValue({
            ...defAdvancedConfigValue
        })
        ruleContentRef?.current?.onSetValue(defAdvancedConfigValue.regexps)
    }, [defAdvancedConfigValue])
    const onSetValue = useMemoizedFn((allFields: AdvancedConfigValueProps) => {
        let newValue: AdvancedConfigValueProps = {...allFields}

        onValuesChange({
            ...newValue
        })
    })
    /**
     * @description 切换折叠面板，缓存activeKey
     */
    const onSwitchCollapse = useMemoizedFn((key) => {
        setActiveKey(key)
        setRemoteValue(WEB_FUZZ_Advanced_Config_ActiveKey, JSON.stringify(key))
    })
    return (
        <div className={styles["http-query-advanced-config"]} style={{display: visible ? "" : "none"}} ref={queryRef}>
            <div className={styles["advanced-config-heard"]}>
                <span>高级配置</span>
                <YakitSwitch checked={visible} onChange={setVisible} />
            </div>
            <Form
                form={form}
                colon={false}
                onValuesChange={(changedFields, allFields) => onSetValue(allFields)}
                size='small'
                labelCol={{span: 10}}
                wrapperCol={{span: 14}}
                style={{overflowY: "auto"}}
                initialValues={{
                    ...defAdvancedConfigValue
                }}
            >
                <Collapse
                    activeKey={activeKey}
                    onChange={(key) => onSwitchCollapse(key)}
                    ghost
                    expandIcon={(e) => (e.isActive ? <ChevronDownIcon /> : <ChevronRightIcon />)}
                >
                    <Panel
                        header='请求包配置'
                        key='请求包配置'
                        extra={
                            <YakitButton
                                type='text'
                                className='button-text-danger'
                                onClick={(e) => {
                                    e.stopPropagation()
                                    const restValue = {
                                        forceFuzz: true,
                                        isHttps: false,
                                        noFixContentLength: false,
                                        actualHost: "",
                                        timeout: 30
                                    }
                                    form.setFieldsValue({
                                        ...restValue
                                    })
                                    const v = form.getFieldsValue()
                                    onSetValue({
                                        ...v,
                                        ...restValue
                                    })
                                }}
                            >
                                重置
                            </YakitButton>
                        }
                    >
                        <Form.Item label='Fuzztag 辅助'>
                            <YakitButton
                                size='small'
                                type='outline1'
                                onClick={() => onInsertYakFuzzer()}
                                icon={<PlusSmIcon className={styles["plus-sm-icon"]} />}
                            >
                                插入 yak.fuzz 语法
                            </YakitButton>
                        </Form.Item>
                        <Form.Item
                            label={
                                <span className={styles["advanced-config-form-label"]}>
                                    渲染 Fuzz
                                    <Tooltip title='关闭之后，所有的 Fuzz 标签将会失效' overlayStyle={{width: 150}}>
                                        <InformationCircleIcon className={styles["info-icon"]} />
                                    </Tooltip>
                                </span>
                            }
                            name='forceFuzz'
                            valuePropName='checked'
                        >
                            <YakitSwitch />
                        </Form.Item>
                        <Form.Item label='强制 HTTPS' name='isHttps' valuePropName='checked'>
                            <YakitSwitch onChange={setIsHttps} />
                        </Form.Item>
                        <Form.Item label='不修复长度' name='noFixContentLength' valuePropName='checked'>
                            <YakitSwitch />
                        </Form.Item>
                        <Form.Item label='请求 Host' name='actualHost'>
                            <YakitInput placeholder='请输入...' size='small' />
                        </Form.Item>
                        <Form.Item label='超时时长' name='timeout'>
                            <YakitInputNumber type='horizontal' size='small' />
                        </Form.Item>
                    </Panel>
                    <Panel
                        header='并发配置'
                        key='发包配置'
                        extra={
                            <YakitButton
                                type='text'
                                className='button-text-danger'
                                onClick={(e) => {
                                    e.stopPropagation()
                                    const restValue = {
                                        concurrent: 20,
                                        proxy: [],
                                        minDelaySeconds: undefined,
                                        maxDelaySeconds: undefined
                                    }
                                    form.setFieldsValue({
                                        ...restValue
                                    })
                                    const v = form.getFieldsValue()
                                    onSetValue({
                                        ...v,
                                        ...restValue
                                    })
                                }}
                            >
                                重置
                            </YakitButton>
                        }
                    >
                        <Form.Item label='并发线程' name='concurrent'>
                            <YakitInputNumber type='horizontal' size='small' />
                        </Form.Item>
                        <Form.Item
                            label={
                                <span className={styles["advanced-config-form-label"]}>
                                    设置代理
                                    <Tooltip
                                        title='设置多个代理时，会智能选择能用的代理进行发包'
                                        overlayStyle={{width: 150}}
                                    >
                                        <InformationCircleIcon className={styles["info-icon"]} />
                                    </Tooltip>
                                </span>
                            }
                            name='proxy'
                        >
                            <YakitSelect
                                allowClear
                                options={proxyList}
                                placeholder='请输入...'
                                mode='tags'
                                size='small'
                                maxTagCount={1}
                            />
                        </Form.Item>
                        <Form.Item label='随机延迟'>
                            <div className={styles["advanced-config-delay"]}>
                                <Form.Item
                                    name='minDelaySeconds'
                                    noStyle
                                    normalize={(value) => {
                                        return value.replace(/\D/g, "")
                                    }}
                                >
                                    <YakitInput
                                        prefix='Min'
                                        suffix='s'
                                        size='small'
                                        className={styles["delay-input-left"]}
                                    />
                                </Form.Item>
                                <Form.Item
                                    name='maxDelaySeconds'
                                    noStyle
                                    normalize={(value) => {
                                        return value.replace(/\D/g, "")
                                    }}
                                >
                                    <YakitInput
                                        prefix='Max'
                                        suffix='s'
                                        size='small'
                                        className={styles["delay-input-right"]}
                                    />
                                </Form.Item>
                            </div>
                        </Form.Item>
                    </Panel>
                    {/* 以下重试配置、重定向配置，后期再调试 勿删 */}
                    <Panel
                        header='重试配置'
                        key='重试配置'
                        extra={
                            <YakitButton
                                type='text'
                                className='button-text-danger'
                                onClick={(e) => {
                                    e.stopPropagation()
                                    const restValue = {
                                        maxRetryTimes: 3,
                                        retrying: true,
                                        noRetrying: false,
                                        retryConfiguration: {
                                            statusCode: undefined,
                                            keyWord: undefined
                                        },
                                        noRetryConfiguration: {
                                            statusCode: undefined,
                                            keyWord: undefined
                                        }
                                    }
                                    form.setFieldsValue({
                                        ...restValue
                                    })
                                    const v = form.getFieldsValue()
                                    onSetValue({
                                        ...v,
                                        ...restValue
                                    })
                                    // setNoRetrying(false)
                                }}
                            >
                                重置
                            </YakitButton>
                        }
                    >
                        <Form.Item label='重试次数' name='maxRetryTimes'>
                            <YakitInputNumber type='horizontal' size='small' min={0} />
                        </Form.Item>
                        <Collapse ghost activeKey={retryActive} onChange={(e) => setRetryActive(e as string[])}>
                            <Panel
                                header={
                                    <Form.Item name='retrying' noStyle valuePropName='checked'>
                                        <YakitCheckbox>
                                            <span style={{marginLeft: 6, cursor: "pointer"}}>重试条件</span>
                                        </YakitCheckbox>
                                    </Form.Item>
                                }
                                key='重试条件'
                                style={{borderBottom: 0}}
                            >
                                <Form.Item label='状态码' name={["retryConfiguration", "statusCode"]}>
                                    <YakitInput placeholder='200,300-399' size='small' disabled={!retrying} />
                                </Form.Item>
                                {/*<Form.Item label='关键字' name={["retryConfiguration", "keyWord"]}>*/}
                                {/*    <YakitInput placeholder='200,300-399' size='small' disabled={!retrying} />*/}
                                {/*</Form.Item>*/}
                            </Panel>
                            <Panel
                                header={
                                    <Form.Item name='noRetrying' noStyle valuePropName='checked'>
                                        <YakitCheckbox>
                                            <span style={{marginLeft: 6, cursor: "pointer"}}>不重试条件</span>
                                        </YakitCheckbox>
                                    </Form.Item>
                                }
                                key='不重试条件'
                                style={{borderBottom: 0}}
                            >
                                <Form.Item label='状态码' name={["noRetryConfiguration", "statusCode"]}>
                                    <YakitInput placeholder='200,300-399' size='small' disabled={!noRetrying} />
                                </Form.Item>
                                {/*<Form.Item label='关键字' name={["noRetryConfiguration", "keyWord"]}>*/}
                                {/*    <YakitInput placeholder='Login,登录成功' size='small' disabled={!noRetrying} />*/}
                                {/*</Form.Item>*/}
                            </Panel>
                        </Collapse>
                    </Panel>
                    <Panel
                        header='重定向配置'
                        key='重定向配置'
                        extra={
                            <YakitButton
                                type='text'
                                className='button-text-danger'
                                onClick={(e) => {
                                    e.stopPropagation()
                                    const restValue = {
                                        redirectCount: 3,
                                        redirectConfiguration: {
                                            statusCode: undefined,
                                            keyWord: undefined
                                        },
                                        noRedirectConfiguration: {
                                            statusCode: undefined,
                                            keyWord: undefined
                                        }
                                    }
                                    form.setFieldsValue({
                                        ...restValue
                                    })
                                    const v = form.getFieldsValue()
                                    onSetValue({
                                        ...v,
                                        ...restValue
                                    })
                                }}
                            >
                                重置
                            </YakitButton>
                        }
                    >
                        <Form.Item label='禁用重定向' name='noFollowRedirect' valuePropName={"checked"}>
                            <YakitSwitch />
                        </Form.Item>
                        <Form.Item label='重定向次数' name='redirectCount'>
                            <YakitInputNumber type='horizontal' size='small' />
                        </Form.Item>
                        <Form.Item label='JS 重定向' name='followJSRedirect' valuePropName={"checked"}>
                            <YakitSwitch />
                        </Form.Item>
                        {/*<Collapse ghost activeKey={redirectActive} onChange={(e) => setRedirectActive(e)}>*/}
                        {/*    <Panel*/}
                        {/*        header={*/}
                        {/*            <span className={styles["display-flex"]}>*/}
                        {/*                <YakitCheckbox*/}
                        {/*                    checked={redirect}*/}
                        {/*                    onClick={(e) => {*/}
                        {/*                        e.stopPropagation()*/}
                        {/*                    }}*/}
                        {/*                    onChange={(e) => {*/}
                        {/*                        setRedirect(e.target.checked)*/}
                        {/*                    }}*/}
                        {/*                />*/}
                        {/*                <span style={{marginLeft: 6}}>重定向条件</span>*/}
                        {/*            </span>*/}
                        {/*        }*/}
                        {/*        key='重定向条件'*/}
                        {/*        style={{borderBottom: 0}}*/}
                        {/*    >*/}
                        {/*        <Form.Item label='状态码' name={["redirectConfiguration", "statusCode"]}>*/}
                        {/*            <YakitInput placeholder='200,300-399' size='small' disabled={!redirect} />*/}
                        {/*        </Form.Item>*/}
                        {/*        <Form.Item label='关键字' name={["redirectConfiguration", "keyWord"]}>*/}
                        {/*            <YakitInput placeholder='200,300-399' size='small' disabled={!redirect} />*/}
                        {/*        </Form.Item>*/}
                        {/*    </Panel>*/}
                        {/*    <Panel*/}
                        {/*        header={*/}
                        {/*            <span className={styles["display-flex"]}>*/}
                        {/*                <YakitCheckbox*/}
                        {/*                    checked={noRedirect}*/}
                        {/*                    onClick={(e) => {*/}
                        {/*                        e.stopPropagation()*/}
                        {/*                    }}*/}
                        {/*                    onChange={(e) => {*/}
                        {/*                        setNoRedirect(e.target.checked)*/}
                        {/*                    }}*/}
                        {/*                />*/}
                        {/*                <span style={{marginLeft: 6}}>不重定向条件</span>*/}
                        {/*            </span>*/}
                        {/*        }*/}
                        {/*        key='不重定向条件'*/}
                        {/*        style={{borderBottom: 0}}*/}
                        {/*    >*/}
                        {/*        <Form.Item label='状态码' name={["noRedirectConfiguration", "statusCode"]}>*/}
                        {/*            <YakitInput placeholder='200,300-399' size='small' disabled={!noRedirect} />*/}
                        {/*        </Form.Item>*/}
                        {/*        <Form.Item label='关键字' name={["noRedirectConfiguration", "keyWord"]}>*/}
                        {/*            <YakitInput placeholder='Login,登录成功' size='small' disabled={!noRedirect} />*/}
                        {/*        </Form.Item>*/}
                        {/*    </Panel>*/}
                        {/*</Collapse>*/}
                    </Panel>
                    <Panel
                        header='过滤配置(丢包)'
                        key='过滤配置'
                        extra={
                            <YakitButton
                                type='text'
                                className='button-text-danger'
                                onClick={(e) => {
                                    e.stopPropagation()
                                    const restValue = {
                                        filterMode: "drop",
                                        statusCode: "",
                                        regexps: "",
                                        keyWord: "",
                                        maxBodySize: undefined,
                                        minBodySize: undefined
                                    }
                                    form.setFieldsValue({
                                        ...restValue
                                    })
                                    ruleContentRef?.current?.onSetValue("")
                                    const v = form.getFieldsValue()
                                    onSetValue({
                                        ...v,
                                        ...restValue
                                    })
                                }}
                            >
                                重置
                            </YakitButton>
                        }
                    >
                        <Form.Item label='过滤器模式' name='filterMode'>
                            <YakitRadioButtons
                                buttonStyle='solid'
                                options={[
                                    {
                                        value: "drop",
                                        label: "丢弃"
                                    },
                                    {
                                        value: "match",
                                        label: "保留"
                                    }
                                ]}
                            />
                        </Form.Item>
                        <Form.Item label='状态码' name='statusCode'>
                            <YakitInput placeholder='200,300-399' size='small' />
                        </Form.Item>
                        <Form.Item label='正则' name='regexps'>
                            <RuleContent
                                ref={ruleContentRef}
                                getRule={(val) => {
                                    const v = form.getFieldsValue()
                                    onSetValue({
                                        ...v,
                                        regexps: val
                                    })
                                }}
                                inputProps={{
                                    size: "small"
                                }}
                            />
                        </Form.Item>
                        <Form.Item label='关键字' name='keyWord'>
                            <YakitInput placeholder='Login,登录成功' size='small' />
                        </Form.Item>
                        <Form.Item label='响应大小'>
                            {/* className='yakit-input-group' */}
                            <Form.Item
                                name='minBodySize'
                                noStyle
                                normalize={(value) => {
                                    return value.replace(/\D/g, "")
                                }}
                            >
                                <YakitInput prefix='Min' size='small' />
                            </Form.Item>

                            <Form.Item
                                name='maxBodySize'
                                noStyle
                                normalize={(value) => {
                                    return value.replace(/\D/g, "")
                                }}
                            >
                                <YakitInput prefix='Max' size='small' />
                            </Form.Item>
                        </Form.Item>
                    </Panel>
                </Collapse>
            </Form>
        </div>
    )
})

interface EditorsSettingProps {
    /**@name 是否换行 */
    noWordwrap: boolean
    setNoWordwrap: (b: boolean) => void
    /**@name 字体大小 */
    fontSize?: number
    setFontSize: (n: number) => void
    /**@name 是否显示换行符 */
    showLineBreaks: boolean
    setShowLineBreaks: (b: boolean) => void
}

/**
 * @description 编辑器配置
 */
const EditorsSetting: React.FC<EditorsSettingProps> = React.memo((props) => {
    const {noWordwrap, setNoWordwrap, fontSize, setFontSize, showLineBreaks, setShowLineBreaks} = props
    useEffect(() => {
        // 无落如何都会设置，最小为 12
        getRemoteValue(HTTP_PACKET_EDITOR_FONT_SIZE)
            .then((data: string) => {
                try {
                    const size = parseInt(data)
                    if (size > 0) {
                        setFontSize(size)
                    } else {
                        setFontSize(12)
                    }
                } catch (e) {
                    setFontSize(12)
                }
            })
            .catch(() => {
                setFontSize(12)
            })
        getRemoteValue(HTTP_PACKET_EDITOR_Line_Breaks)
            .then((data) => {
                setShowLineBreaks(data === "true")
            })
            .catch(() => {
                setShowLineBreaks(true)
            })
    }, [])
    return (
        <>
            <Tooltip title={"不自动换行"}>
                <YakitButton
                    size={"small"}
                    type={noWordwrap ? "outline2" : "primary"}
                    icon={<WrapIcon />}
                    onClick={() => {
                        setNoWordwrap(!noWordwrap)
                    }}
                    className={classNames(styles["editor-cog-icon"], {
                        [styles["editor-wrap-icon"]]: !noWordwrap
                    })}
                />
            </Tooltip>
            <YakitPopover
                title={"配置编辑器"}
                content={
                    <>
                        <Form
                            onSubmitCapture={(e) => {
                                e.preventDefault()
                            }}
                            size={"small"}
                            layout={"horizontal"}
                            wrapperCol={{span: 14}}
                            labelCol={{span: 10}}
                        >
                            {(fontSize || 0) > 0 && (
                                <Form.Item label='字号'>
                                    <YakitRadioButtons
                                        value={fontSize}
                                        onChange={(e) => {
                                            const size = e.target.value
                                            setRemoteValue(HTTP_PACKET_EDITOR_FONT_SIZE, `${size}`)
                                            setFontSize(size)
                                        }}
                                        buttonStyle='solid'
                                        options={[
                                            {
                                                value: 12,
                                                label: "小"
                                            },
                                            {
                                                value: 16,
                                                label: "中"
                                            },
                                            {
                                                value: 20,
                                                label: "大"
                                            }
                                        ]}
                                    />
                                </Form.Item>
                            )}
                            <Form.Item label='是否显示换行符'>
                                <YakitSwitch
                                    checked={showLineBreaks}
                                    onChange={(checked) => {
                                        setRemoteValue(HTTP_PACKET_EDITOR_Line_Breaks, `${checked}`)
                                        setShowLineBreaks(checked)
                                    }}
                                />
                            </Form.Item>
                        </Form>
                    </>
                }
                overlayInnerStyle={{width: 300}}
                overlayClassName={styles["editor-cog-popover"]}
                placement='bottomRight'
            >
                <YakitButton icon={<CogIcon />} type='outline2' className={styles["editor-cog-icon"]} />
            </YakitPopover>
        </>
    )
})
