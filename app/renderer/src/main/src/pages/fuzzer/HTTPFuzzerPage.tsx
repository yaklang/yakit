import React, {useEffect, useMemo, useRef, useState} from "react"
import {Form, Modal, notification, Result, Space, Popover, Tooltip, Divider} from "antd"
import {IMonacoEditor, NewHTTPPacketEditor, HTTP_PACKET_EDITOR_Response_Info} from "../../utils/editors"
import {showDrawer, showModal} from "../../utils/showModal"
import {monacoEditorWrite} from "./fuzzerTemplates"
import {StringFuzzer} from "./StringFuzzer"
import {FuzzerResponseToHTTPFlowDetail} from "../../components/HTTPFlowDetail"
import {randomString} from "../../utils/randomUtil"
import {failed, info, yakitFailed, yakitNotify} from "../../utils/notification"
import {useGetState, useInViewport, useMap, useMemoizedFn, useSize} from "ahooks"
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
// import {showExtractFuzzerResponseOperator} from "@/utils/extractor"
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    ChromeSvgIcon,
    ClockIcon,
    FilterIcon,
    PaperAirplaneIcon,
    SearchIcon,
    StopIcon,
    TrashIcon,
    ResizerIcon
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
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {Size} from "re-resizable"
import {
    BodyLengthInputNumber,
    HTTPFuzzerPageTable,
    HTTPFuzzerPageTableQuery
} from "./components/HTTPFuzzerPageTable/HTTPFuzzerPageTable"
import {useWatch} from "antd/lib/form/Form"
import {useSubscribeClose} from "@/store/tabSubscribe"
import {monaco} from "react-monaco-editor"
import ReactDOM from "react-dom"
import {OtherMenuListProps} from "@/components/yakitUI/YakitEditor/YakitEditorType"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {WebFuzzerResponseExtractor} from "@/utils/extractor"
import {HttpQueryAdvancedConfig, WEB_FUZZ_PROXY_LIST} from "./HttpQueryAdvancedConfig/HttpQueryAdvancedConfig"
import {FuzzerParamItem, AdvancedConfigValueProps, KVPair} from "./HttpQueryAdvancedConfig/HttpQueryAdvancedConfigType"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {Route} from "@/routes/routeSpec"
import {HTTPResponseExtractor, HTTPResponseMatcher} from "./MatcherAndExtractionCard/MatcherAndExtractionCardType"
import {HTTPHeader} from "../mitm/MITMContentReplacerHeaderOperator"

const {ipcRenderer} = window.require("electron")

interface ShareValueProps {
    advancedConfig: boolean
    advancedConfiguration: AdvancedConfigValueProps
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

export interface RedirectRequestParams {
    Request: string
    Response: string
    IsHttps: boolean
    PerRequestTimeoutSeconds: number
    Proxy: string
}

export interface HTTPFuzzerPageProp {
    isHttps?: boolean
    isGmTLS?: boolean
    request?: string
    system?: string
    order?: string
    fuzzerParams?: fuzzerInfoProp
    shareContent?: string
}

export interface FuzzerResponse {
    Method: string
    StatusCode: number
    Host: string
    ContentType: string
    Headers: HTTPHeader[]
    ResponseRaw: Uint8Array
    BodyLength: number
    DurationMs: number
    UUID: string
    Timestamp: number
    RequestRaw: Uint8Array
    // GuessResponseEncoding: string;
    Ok: boolean
    Reason: string
    IsHTTPS?: boolean
    Count?: number
    Payloads?: string[]
    BodySimilarity?: number
    HeaderSimilarity?: number
    MatchedByFilter?: boolean
    Url?: string
    // TaskId: string;
    DNSDurationMs: number
    FirstByteDurationMs?: number
    TotalDurationMs: number
    Proxy?: string
    RemoteAddr?: string
    ExtractedResults: KVPair[]
    MatchedByMatcher: boolean
}

// export interface FuzzerResponse {
//     Method: string
//     StatusCode: number
//     Host: string
//     ContentType: string
//     Headers: {Header: string; Value: string}[]
//     ResponseRaw: Uint8Array
//     RequestRaw: Uint8Array
//     BodyLength: number
//     UUID: string
//     Timestamp: number
//     DurationMs: number

//     Ok: boolean
//     Reason: string
//     Payloads?: string[]

//     IsHTTPS?: boolean
//     Count?: number

//     HeaderSimilarity?: number
//     BodySimilarity?: number
//     MatchedByFilter?: boolean
//     Url?: string

//     Proxy?: string
//     RemoteAddr?: string
//     DNSDurationMs?: number
//     FirstByteDurationMs?: number
//     TotalDurationMs?: number

//     /**@name 提取响应数据*/
//     extracted?: string
// }

const defaultPostTemplate = `POST / HTTP/1.1
Content-Type: application/json
Host: www.example.com

{"key": "value"}`

export const WEB_FUZZ_PROXY = "WEB_FUZZ_PROXY"
const WEB_FUZZ_HOTPATCH_CODE = "WEB_FUZZ_HOTPATCH_CODE"
const WEB_FUZZ_HOTPATCH_WITH_PARAM_CODE = "WEB_FUZZ_HOTPATCH_WITH_PARAM_CODE"

const WEB_FUZZ_Advanced_Config_Switch_Checked = "WEB_FUZZ_Advanced_Config_Switch_Checked"
const WEB_FUZZ_DNS_Server_Config = "WEB_FUZZ_DNS_Server_Config"
const WEB_FUZZ_DNS_Hosts_Config = "WEB_FUZZ_DNS_Hosts_Config"

export interface HistoryHTTPFuzzerTask {
    Request: string
    RequestRaw: Uint8Array
    Proxy: string
    IsHTTPS: boolean

    IsGmTLS: boolean

    // 展示渲染，一般来说 Verbose > RequestRaw > Request
    Verbose?: string
}

export interface FuzzerRequestProps {
    // Request: string
    Params: FuzzerParamItem[]
    Concurrent: number
    IsHTTPS: boolean
    ForceFuzz: boolean
    Proxy: string
    PerRequestTimeoutSeconds: number
    ActualAddr: string
    NoFollowRedirect: boolean
    // NoFollowMetaRedirect: boolean
    FollowJSRedirect: boolean
    HistoryWebFuzzerId?: number
    NoFixContentLength: boolean
    HotPatchCode: string
    // Filter: FuzzerResponseFilter;
    RequestRaw: Uint8Array
    DelayMinSeconds: number
    DelayMaxSeconds: number
    HotPatchCodeWithParamGetter: string
    MaxRetryTimes: number
    RetryInStatusCode: string
    RetryNotInStatusCode: string
    // ResponseCharset: string
    RetryWaitSeconds: number
    RetryMaxWaitSeconds: number
    RedirectTimes: number
    DNSServers: string[]
    EtcHosts: KVPair[]
    NoSystemProxy: boolean
    RepeatTimes: number
    Extractors: HTTPResponseExtractor[]
    Matchers: HTTPResponseMatcher[]
    MatchersCondition: string
    IsGmTLS: boolean

    HitColor?: string
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

const emptyFuzzer: FuzzerResponse = {
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
    UUID: "",

    // 6.16
    DNSDurationMs: 0,
    TotalDurationMs: 0,
    ExtractedResults: [],
    MatchedByMatcher: false
}

export interface SelectOptionProps {
    label: string
    value: string
}

export const HTTPFuzzerPage: React.FC<HTTPFuzzerPageProp> = (props) => {
    const [advancedConfigValue, setAdvancedConfigValue] = useState<AdvancedConfigValueProps>({
        // 请求包配置
        forceFuzz: props.fuzzerParams?.forceFuzz || true,
        isHttps: props.fuzzerParams?.isHttps || props.isHttps || false,
        isGmTLS: props.fuzzerParams?.isGmTLS || props.isGmTLS || false,
        noFixContentLength: false,
        noSystemProxy: false,
        actualHost: props.fuzzerParams?.actualHost || "",
        timeout: props.fuzzerParams?.timeout || 30.0,
        // 发包配置
        concurrent: props.fuzzerParams?.concurrent || 20,
        proxy: props.fuzzerParams?.proxy?.split(",") || [],
        minDelaySeconds: 0,
        maxDelaySeconds: 0,
        repeatTimes: 0,
        // 重试配置
        maxRetryTimes: 0,
        retry: true,
        noRetry: false,
        retryConfiguration: {
            statusCode: "",
            keyWord: ""
        },
        noRetryConfiguration: {
            statusCode: "",
            keyWord: ""
        },
        retryWaitSeconds: 0,
        retryMaxWaitSeconds: 0,
        // 重定向配置
        redirectCount: 3,
        noFollowRedirect: true,
        followJSRedirect: false,
        redirectConfiguration: {
            statusCode: "",
            keyWord: ""
        },
        noRedirectConfiguration: {
            statusCode: "",
            keyWord: ""
        },
        // 过滤配置
        // filterMode: "drop",
        // statusCode: "",
        // regexps: "",
        // keyWord: "",
        // minBodySize: 0,
        // maxBodySize: 0,
        // dns config
        dnsServers: [],
        etcHosts: [],
        // 设置变量
        params: [{Key: "", Value: ""}],
        // 匹配器
        filterMode: "drop",
        matchers: [],
        matchersCondition: "and",
        hitColor: "red",
        // 提取器
        extractors: []
    })
    // params
    // const [isHttps, setIsHttps, getIsHttps] = useGetState<boolean>(
    //     props.fuzzerParams?.isHttps || props.isHttps || false
    // )
    // const [isGmTLS, setIsGmTLS] = useGetState<boolean>(props.fuzzerParams?.isGmTLS || props.isGmTLS || false)
    // const [noFixContentLength, setNoFixContentLength] = useState(false)
    // const [noSystemProxy, setNoSystemProxy] = useState(false)
    const [request, setRequest, getRequest] = useGetState(
        props.fuzzerParams?.request || props.request || defaultPostTemplate
    )

    // params
    // const [concurrent, setConcurrent] = useState(props.fuzzerParams?.concurrent || 20)
    // const [forceFuzz, setForceFuzz] = useState<boolean>(props.fuzzerParams?.forceFuzz || true)
    // const [timeout, setParamTimeout] = useState(props.fuzzerParams?.timeout || 30.0)
    // const [minDelaySeconds, setMinDelaySeconds] = useState<number>(0)
    // const [maxDelaySeconds, setMaxDelaySeconds] = useState<number>(0)
    // const [repeatTimes, setRepeatTimes] = useState<number>(0)
    // const [proxy, setProxy] = useState<string>(props.fuzzerParams?.proxy || "")
    // const [actualHost, setActualHost] = useState<string>(props.fuzzerParams?.actualHost || "")
    const [advancedConfig, setAdvancedConfig] = useState(false)
    const [redirectedResponse, setRedirectedResponse] = useState<FuzzerResponse>()
    const [historyTask, setHistoryTask] = useState<HistoryHTTPFuzzerTask>()
    const [hotPatchCode, setHotPatchCode] = useState<string>("")
    const [hotPatchCodeWithParamGetter, setHotPatchCodeWithParamGetter] = useState<string>("")
    const [affixSearch, setAffixSearch] = useState("")
    const [defaultResponseSearch, setDefaultResponseSearch] = useState("")
    // 重试
    // const [retryMaxTimes, setRetryMaxTimes] = useState(0)
    // const [retry, setRetry] = useState<boolean>(true)
    // const [noRetry, setNoRetry] = useState<boolean>(false)
    // const [retryInStatusCode, setRetryInStatusCode] = useState("")
    // const [retryNotInStatusCode, setRetryNotInStatusCode] = useState("")
    // const [retryWaitSeconds, setRetryWaitSeconds] = useState(0) // float
    // const [retryMaxWaitSeconds, setRetryMaxWaitSeconds] = useState(0)
    // 重定向配置
    // const [redirectMaxTimes, setRedirectMaxTimessetRedirectMaxTimes] = useState(3)
    // const [noFollowRedirect, setNoFollowRedirect] = useState(true)
    // const [followJSRedirect, setFollowJSRedirect] = useState(false)
    // dnsConfig
    // const [dnsServers, setDNSServers] = useState<string[]>([])
    // const [etcHosts, setETCHosts] = useState<{Key: string; Value: string}[]>([])

    // 设置变量
    // const [params, setParams] = useState<FuzzerParamItem[]>([{Key: "", Value: ""}])

    const [currentSelectId, setCurrentSelectId] = useState<number>() // 历史中选中的记录id
    /**@name 是否刷新高级配置中的代理列表 */
    const [refreshProxy, setRefreshProxy] = useState<boolean>(false)
    // filter
    // const [_, setFilter, getFilter] = useGetState<FuzzResponseFilter>({
    //     Keywords: [],
    //     MaxBodySize: 0,
    //     MinBodySize: 0,
    //     Regexps: [],
    //     StatusCode: []
    // })
    // const [_filterMode, setFilterMode, getFilterMode] = useGetState<"drop" | "match">("drop")
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

    // editor Second Editor
    const [noWordwrapSecondEditor, setNoWordwrapSecondEditor] = useState(false)
    const [fontSizeSecondEditor, setFontSizeSecondEditor] = useState<number>()
    const [showResponseInfoSecondEditor, setShowResponseInfoSecondEditor] = useState<boolean>(true)

    // second Node
    const secondNodeRef = useRef(null)
    const secondNodeSize = useSize(secondNodeRef)
    const [showSuccess, setShowSuccess] = useState(true)
    const [query, setQuery] = useState<HTTPFuzzerPageTableQuery>()
    const [isRefresh, setIsRefresh] = useState<boolean>(false)

    const {setSubscribeClose, removeSubscribeClose} = useSubscribeClose()
    const fuzzerRef = useRef<any>()
    const [inViewport] = useInViewport(fuzzerRef)
    useEffect(() => {
        setSubscribeClose(Route.HTTPFuzzer, {
            title: "关闭提示",
            content: "关闭一级菜单会关闭一级菜单下的所有二级菜单?",
            onOkText: "确定",
            onCancelText: "取消",
            onOk: (m) => onCloseTab(m)
        })
        return () => {
            removeSubscribeClose(Route.HTTPFuzzer)
        }
    }, [inViewport])

    const onCloseTab = useMemoizedFn((m) => {
        ipcRenderer
            .invoke("send-close-tab", {
                router: Route.HTTPFuzzer
            })
            .then(() => {
                m.destroy()
            })
    })

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
    useEffect(() => {
        /** 有分享内容按照分享内容中的 advancedConfig 为准 */
        if (props.shareContent) return
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
            data: {isHttps: isHttps, isGmTLS: advancedConfigValue.isGmTLS, request: request}
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
        // setIsHttps(historyTask.IsHTTPS)
        // setIsGmTLS(historyTask.IsGmTLS)
        // setProxy(historyTask.Proxy)
        setAdvancedConfigValue({
            ...advancedConfigValue,
            isHttps: historyTask.IsHTTPS,
            isGmTLS: historyTask.IsGmTLS
        })
        refreshRequest()
    }, [historyTask])

    useEffect(() => {
        // 缓存全局参数(将fuzz参数的缓存从本地文件替换到引擎数据库内)
        getLocalValue(WEB_FUZZ_PROXY).then((e) => {
            if (e) {
                setLocalValue(WEB_FUZZ_PROXY, "")
                setRemoteValue(WEB_FUZZ_PROXY, `${e}`)
                // setProxy(`${e}`)
                setAdvancedConfigValue({
                    ...advancedConfigValue,
                    proxy: e.split(",") || []
                })
            } else {
                getRemoteValue(WEB_FUZZ_PROXY).then((e) => {
                    if (!e) {
                        return
                    }
                    // setProxy(`${e}`)
                    setAdvancedConfigValue({
                        ...advancedConfigValue,
                        proxy: e.split(",") || []
                    })
                })
            }
        })
        getRemoteValue(WEB_FUZZ_DNS_Server_Config).then((e) => {
            if (!e) {
                return
            }
            try {
                // setDNSServers(JSON.parse(e))
                setAdvancedConfigValue({
                    ...advancedConfigValue,
                    dnsServers: JSON.parse(e)
                })
            } catch (error) {}
        })
        getRemoteValue(WEB_FUZZ_DNS_Hosts_Config).then((e) => {
            if (!e) {
                return
            }
            try {
                // setETCHosts(JSON.parse(e))
                setAdvancedConfigValue({
                    ...advancedConfigValue,
                    etcHosts: JSON.parse(e)
                })
            } catch (error) {}
        })
    }, [])

    useEffect(() => {
        // setIsHttps(!!props.isHttps)
        // setIsGmTLS(!!props.isGmTLS)
        setAdvancedConfigValue({
            ...advancedConfigValue,
            isHttps: !!props.isHttps,
            isGmTLS: !!props.isGmTLS
        })
        if (props.request) {
            setRequest(props.request)
            resetResponse()
        }
    }, [props.isHttps, props.isGmTLS, props.request])

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

        //  更新默认搜索
        setDefaultResponseSearch(affixSearch)

        setLoading(true)
        setDroppedCount(0)

        // FuzzerRequestProps
        const httpParams: FuzzerRequestProps = {
            // Request: request,
            RequestRaw: Buffer.from(request, "utf8"), // StringToUint8Array(request, "utf8"),
            ForceFuzz: !!advancedConfigValue.forceFuzz,
            IsHTTPS: advancedConfigValue.isHttps,
            IsGmTLS: advancedConfigValue.isGmTLS,
            Concurrent: advancedConfigValue.concurrent,
            PerRequestTimeoutSeconds: advancedConfigValue.timeout,
            NoFixContentLength: advancedConfigValue.noFixContentLength,
            NoSystemProxy: advancedConfigValue.noSystemProxy,
            Proxy: advancedConfigValue.proxy ? advancedConfigValue.proxy.join(",") : "",
            ActualAddr: advancedConfigValue.actualHost,
            HotPatchCode: hotPatchCode,
            HotPatchCodeWithParamGetter: hotPatchCodeWithParamGetter,
            DelayMinSeconds: advancedConfigValue.minDelaySeconds,
            DelayMaxSeconds: advancedConfigValue.maxDelaySeconds,
            RepeatTimes: advancedConfigValue.repeatTimes,

            // retry config
            MaxRetryTimes: advancedConfigValue.maxRetryTimes,
            RetryInStatusCode: advancedConfigValue.retry
                ? advancedConfigValue?.retryConfiguration?.statusCode || ""
                : "",
            RetryNotInStatusCode: advancedConfigValue.noRetry
                ? advancedConfigValue?.noRetryConfiguration?.statusCode || ""
                : "",
            RetryWaitSeconds: advancedConfigValue.retryWaitSeconds,
            RetryMaxWaitSeconds: advancedConfigValue.retryMaxWaitSeconds,

            // redirect config
            NoFollowRedirect: advancedConfigValue.noFollowRedirect,
            FollowJSRedirect: advancedConfigValue.followJSRedirect,
            RedirectTimes: advancedConfigValue.redirectCount,

            // dnsConfig
            DNSServers: advancedConfigValue.dnsServers,
            EtcHosts: advancedConfigValue.etcHosts,
            // 设置变量
            Params: advancedConfigValue.params,
            //匹配器
            Matchers: advancedConfigValue.matchers,
            MatchersCondition: advancedConfigValue.matchersCondition,
            HitColor: advancedConfigValue.filterMode === "onlyMatch" ? advancedConfigValue.hitColor : "",
            //提取器
            Extractors: advancedConfigValue.extractors
        }
        if (advancedConfigValue.proxy) {
            const proxyToArr = advancedConfigValue.proxy.map((ele) => ({label: ele, value: ele}))
            getProxyList(proxyToArr)
        }

        setRemoteValue(WEB_FUZZ_DNS_Server_Config, JSON.stringify(httpParams.DNSServers))
        setRemoteValue(WEB_FUZZ_DNS_Hosts_Config, JSON.stringify(httpParams.EtcHosts))
        console.log("httpParams", httpParams)
        ipcRenderer.invoke("HTTPFuzzer", httpParams, fuzzToken)
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
            if (advancedConfigValue.matchers.length > 0) {
                // 设置了 matchers
                const hit = data["MatchedByMatcher"] === true
                // 丢包的条件：
                //   1. 命中过滤器，同时过滤模式设置为丢弃
                //   2. 未命中过滤器，过滤模式设置为保留
                if (
                    (hit && advancedConfigValue.filterMode === "drop") ||
                    (!hit && advancedConfigValue.filterMode === "match")
                ) {
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
                Headers: data.Headers || [],
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
                Url: data.Url,
                Proxy: data.Proxy,
                RemoteAddr: data.RemoteAddr,
                FirstByteDurationMs: data.FirstByteDurationMs,
                DNSDurationMs: data.DNSDurationMs,
                TotalDurationMs: data.TotalDurationMs,
                // 6.16
                ...data
            } as FuzzerResponse
            console.log("r", r)
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
            setTimeout(() => {
                setLoading(false)
            }, 500)
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
            isHttps: advancedConfigValue.isHttps,
            forceFuzz: advancedConfigValue.forceFuzz,
            concurrent: advancedConfigValue.concurrent,
            proxy: advancedConfigValue.proxy.join(","),
            actualHost: advancedConfigValue.actualHost,
            timeout: advancedConfigValue.timeout,
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
    }, [
        advancedConfigValue.isHttps,
        advancedConfigValue.forceFuzz,
        advancedConfigValue.concurrent,
        advancedConfigValue.proxy,
        advancedConfigValue.actualHost,
        advancedConfigValue.timeout,
        request
    ])
    useEffect(() => {
        getRemoteValue(HTTP_PACKET_EDITOR_Response_Info)
            .then((data) => {
                setShowResponseInfoSecondEditor(data === "false" ? false : true)
            })
            .catch(() => {
                setShowResponseInfoSecondEditor(true)
            })
    }, [])
    const responseEditorRightMenu: OtherMenuListProps = useMemo(() => {
        return {
            overlayWidgetv: {
                menu: [
                    {
                        key: "is-show-add-overlay-widgetv",
                        label: showResponseInfoSecondEditor ? "隐藏响应信息" : "显示响应信息"
                    }
                ],
                onRun: () => {
                    setRemoteValue(HTTP_PACKET_EDITOR_Response_Info, `${!showResponseInfoSecondEditor}`)
                    setShowResponseInfoSecondEditor(!showResponseInfoSecondEditor)
                }
            }
        }
    }, [showResponseInfoSecondEditor])
    const responseViewer = useMemoizedFn((rsp: FuzzerResponse) => {
        let reason = "未知原因"
        try {
            reason = rsp!.Reason
        } catch (e) {}
        return (
            <NewHTTPPacketEditor
                defaultSearchKeyword={defaultResponseSearch}
                system={props.system}
                originValue={rsp.ResponseRaw}
                bordered={false}
                hideSearch={true}
                isResponse={true}
                noHex={true}
                noHeader={true}
                editorOperationRecord='HTTP_FUZZER_PAGE_EDITOR_RECORF_RESPONSE'
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
                onAddOverlayWidget={(editor, isShow) => {
                    onAddOverlayWidget(editor, rsp, isShow)
                }}
                isAddOverlayWidget={showResponseInfoSecondEditor}
                contextMenu={responseEditorRightMenu}
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
            advancedConfig,
            advancedConfiguration: advancedConfigValue
        }
        callback(params)
    })
    /**
     * 6.16更改分享的数据结构，需提示用户更新版本
     */
    const setUpShareContent = useMemoizedFn((shareContent: ShareValueProps) => {
        try {
            setAdvancedConfig(shareContent.advancedConfig)
            setAdvancedConfigValue(shareContent.advancedConfiguration)
        } catch (error) {
            yakitNotify("error", "获取的数据结构不是最新版,请分享人/被分享人更新版本")
        }
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
        setAdvancedConfigValue({
            ...val,
            forceFuzz: val.forceFuzz === undefined ? true : val.forceFuzz,
            minDelaySeconds: val.minDelaySeconds ? Number(val.minDelaySeconds) : 0,
            maxDelaySeconds: val.maxDelaySeconds ? Number(val.maxDelaySeconds) : 0,
            repeatTimes: val.repeatTimes ? Number(val.repeatTimes) : 0
        })
    })
    const onSetAdvancedConfig = useMemoizedFn((c: boolean) => {
        setAdvancedConfig(c)
        setRemoteValue(WEB_FUZZ_Advanced_Config_Switch_Checked, `${c}`)
    })

    const editorRightMenu: OtherMenuListProps = useMemo(() => {
        return {
            insertLabelTag: {
                menu: [
                    {type: "divider"},
                    {
                        key: "insert-label-tag",
                        label: "插入标签/字典",
                        children: [
                            {key: "insert-nullbyte", label: "插入空字节标签: {{hexd(00)}}"},
                            {key: "insert-temporary-file-tag", label: "插入临时字典"},
                            {key: "insert-intruder-tag", label: "插入模糊测试字典标签"},
                            {key: "insert-hotpatch-tag", label: "插入热加载标签"},
                            {key: "insert-fuzzfile-tag", label: "插入文件标签"}
                        ]
                    }
                ],
                onRun: (editor, key) => {
                    switch (key) {
                        case "insert-nullbyte":
                            editor.trigger("keyboard", "type", {text: "{{hexd(00)}}"})
                            return
                        case "insert-temporary-file-tag":
                            insertTemporaryFileFuzzTag((i) => monacoEditorWrite(editor, i))
                            return
                        case "insert-intruder-tag":
                            showDictsAndSelect((i) => {
                                monacoEditorWrite(editor, i, editor.getSelection())
                            })
                            return
                        case "insert-hotpatch-tag":
                            hotPatchTrigger()
                            return
                        case "insert-fuzzfile-tag":
                            insertFileFuzzTag((i) => monacoEditorWrite(editor, i))
                            return

                        default:
                            break
                    }
                }
            },
            copyURL: {
                menu: [{key: "copy-as-url", label: "复制为 URL"}],
                onRun: (editor, key) => {
                    copyAsUrl({Request: getRequest(), IsHTTPS: advancedConfigValue.isHttps})
                }
            }
        }
    }, [])

    const httpResponse: FuzzerResponse = useMemo(() => {
        return redirectedResponse ? redirectedResponse : getFirstResponse()
    }, [onlyOneResponse, redirectedResponse, getFirstResponse()])

    return (
        <div className={styles["http-fuzzer-body"]} ref={fuzzerRef}>
            <HttpQueryAdvancedConfig
                advancedConfigValue={{
                    ...advancedConfigValue
                }}
                visible={advancedConfig}
                setVisible={onSetAdvancedConfig}
                onInsertYakFuzzer={onInsertYakFuzzer}
                onValuesChange={(v) => onGetFormValue(v)}
                refreshProxy={refreshProxy}
                httpResponse=""
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

                                setRemoteValue(WEB_FUZZ_PROXY, `${advancedConfigValue.proxy}`)
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
                        <YakitCheckbox
                            checked={advancedConfigValue.isHttps}
                            onChange={(e) =>
                                setAdvancedConfigValue({...advancedConfigValue, isHttps: e.target.checked})
                            }
                        />
                    </div>
                    <div className={styles["fuzzer-heard-force"]}>
                        <span className={styles["fuzzer-heard-https"]}>国密TLS</span>
                        <YakitCheckbox
                            checked={advancedConfigValue.isGmTLS}
                            onChange={(e) =>
                                setAdvancedConfigValue({...advancedConfigValue, isGmTLS: e.target.checked})
                            }
                        />
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
                                const redirectRequestProps: RedirectRequestParams = {
                                    Request: request,
                                    Response: new Buffer(getFirstResponse().ResponseRaw).toString("utf8"),
                                    IsHttps: advancedConfigValue.isHttps,
                                    // IsGmTLS: advancedConfigValue.isGmTLS,
                                    PerRequestTimeoutSeconds: advancedConfigValue.timeout,
                                    // NoFixContentLength: advancedConfigValue.noFixContentLength,
                                    // NoSystemProxy: advancedConfigValue.noSystemProxy,
                                    Proxy: advancedConfigValue.proxy.join(",")
                                }
                                ipcRenderer
                                    .invoke("RedirectRequest", redirectRequestProps)
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
                        {advancedConfigValue.proxy.length > 0 && (
                            <Tooltip title={advancedConfigValue.proxy}>
                                <YakitTag className={classNames(styles["proxy-text"], "content-ellipsis")}>
                                    代理：{advancedConfigValue.proxy.join(",")}
                                </YakitTag>
                            </Tooltip>
                        )}
                        {advancedConfigValue.actualHost && (
                            <YakitTag
                                color='danger'
                                className={classNames(styles["actualHost-text"], "content-ellipsis")}
                            >
                                请求 Host:{advancedConfigValue.actualHost}
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
                                        return {
                                            httpRequest: StringToUint8Array(request),
                                            https: advancedConfigValue.isHttps
                                        }
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
                            </div>
                        )
                    }}
                    secondNodeProps={{
                        title: (
                            <>
                                <span style={{marginRight: 8}}>Responses</span>

                                <SecondNodeTitle
                                    cachedTotal={cachedTotal}
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
                            </div>
                        )
                    }}
                    firstNode={
                        <NewHTTPPacketEditor
                            system={props.system}
                            noHex={true}
                            noHeader={true}
                            refreshTrigger={refreshTrigger}
                            hideSearch={true}
                            bordered={false}
                            noMinimap={true}
                            utf8={true}
                            originValue={StringToUint8Array(request)}
                            contextMenu={editorRightMenu}
                            onEditor={setReqEditor}
                            onChange={(i) => setRequest(Uint8ArrayToString(i, "utf8"))}
                            noWordWrapState={noWordwrapFirstEditor}
                            fontSizeState={fontSizeFirstEditor}
                            showLineBreaksState={showLineBreaksFirstEditor}
                            editorOperationRecord='HTTP_FUZZER_PAGE_EDITOR_RECORF'
                        />
                    }
                    secondNode={
                        <div ref={secondNodeRef} style={{height: "100%", overflow: "hidden"}}>
                            <YakitSpin spinning={false} style={{height: "100%"}}>
                                {onlyOneResponse ? (
                                    <>
                                        {/* {redirectedResponse
                                            ? responseViewer(redirectedResponse)
                                            : responseViewer(getFirstResponse())} */}
                                        {responseViewer(httpResponse)}
                                    </>
                                ) : (
                                    <>
                                        {cachedTotal > 1 ? (
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
                                                        isEnd={loading}
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
                                                        isEnd={loading}
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

    const [responseExtractorVisible, setResponseExtractorVisible] = useState<boolean>(false)

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
                {+(secondNodeSize?.width || 0) > 620 && searchNode}
                {+(secondNodeSize?.width || 0) < 620 && (
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
    if (!onlyOneResponse && cachedTotal > 1) {
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
                {+(secondNodeSize?.width || 0) > 620 && searchNode}
                {+(secondNodeSize?.width || 0) < 620 && (
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
                        if (successFuzzer.length === 0) {
                            showYakitModal({title: "无 Web Fuzzer Response 以供提取信息", content: <></>, footer: null})
                            return
                        }
                        setResponseExtractorVisible(true)
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
                <YakitModal
                    title='提取响应数据包中内容'
                    onCancel={() => setResponseExtractorVisible(false)}
                    visible={responseExtractorVisible}
                    width='80%'
                    maskClosable={false}
                    footer={null}
                    closable={true}
                >
                    <WebFuzzerResponseExtractor responses={successFuzzer} />
                </YakitModal>
            </>
        )
    }
    return <></>
})

interface SecondNodeTitleProps {
    cachedTotal: number
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
    const {cachedTotal, rsp, onlyOneResponse, successFuzzerLength, failedFuzzerLength, showSuccess, setShowSuccess} =
        props
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
    if (cachedTotal > 1) {
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

export const onAddOverlayWidget = (editor, rsp, isShow?: boolean) => {
    editor.removeOverlayWidget({
        getId() {
            return "monaco.fizz.overlaywidget"
        }
    })
    if (!isShow) return
    const fizzOverlayWidget = {
        getDomNode() {
            const domNode = document.createElement("div")
            ReactDOM.render(<EditorOverlayWidget rsp={rsp} />, domNode)
            return domNode
        },
        getId() {
            return "monaco.fizz.overlaywidget"
        },
        getPosition() {
            return {
                preference: monaco.editor.OverlayWidgetPositionPreference.TOP_RIGHT_CORNER
            }
        }
    }
    editor.addOverlayWidget(fizzOverlayWidget)
}

interface EditorOverlayWidgetProps {
    rsp: FuzzerResponse
}

const EditorOverlayWidget: React.FC<EditorOverlayWidgetProps> = React.memo((props) => {
    const {rsp} = props
    if (!rsp) return <></>
    return (
        <div className={styles["editor-overlay-widget"]}>
            {Number(rsp.DNSDurationMs) > 0 ? <span>DNS耗时:{rsp.DNSDurationMs}ms</span> : ""}
            {rsp.RemoteAddr && <span>远端地址:{rsp.RemoteAddr}</span>}
            {rsp.Proxy && <span>代理:{rsp.Proxy}</span>}
            {Number(rsp.FirstByteDurationMs) > 0 ? <span>响应时间:{rsp.FirstByteDurationMs}ms</span> : ""}
            {Number(rsp.TotalDurationMs) > 0 ? <span>总耗时:{rsp.TotalDurationMs}ms</span> : ""}
            {rsp.Url && <span>URL:{rsp.Url.length > 30 ? rsp.Url.substring(0, 30) + "..." : rsp.Url}</span>}
        </div>
    )
})
