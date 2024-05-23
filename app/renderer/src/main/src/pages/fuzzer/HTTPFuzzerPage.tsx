import React, {useEffect, useMemo, useRef, useState} from "react"
import {Form, Modal, Result, Space, Popover, Tooltip, Divider, Descriptions} from "antd"
import {
    IMonacoEditor,
    NewHTTPPacketEditor,
    HTTP_PACKET_EDITOR_Response_Info,
    RenderTypeOptionVal
} from "../../utils/editors"
import {showDrawer} from "../../utils/showModal"
import {monacoEditorWrite} from "./fuzzerTemplates"
import {QueryFuzzerLabelResponseProps, StringFuzzer} from "./StringFuzzer"
import {FuzzerResponseToHTTPFlowDetail} from "../../components/HTTPFlowDetail"
import {randomString} from "../../utils/randomUtil"
import {failed, info, yakitFailed, yakitNotify, warn} from "../../utils/notification"
import {
    useControllableValue,
    useCreation,
    useDebounceFn,
    useGetState,
    useInViewport,
    useMap,
    useMemoizedFn,
    useSize,
    useUpdateEffect
} from "ahooks"
import {getRemoteValue, setRemoteValue} from "../../utils/kv"
import {HTTPFuzzerHistorySelector, HTTPFuzzerTaskDetail} from "./HTTPFuzzerHistory"
import {HTTPFuzzerHotPatch} from "./HTTPFuzzerHotPatch"
import {callCopyToClipboard} from "../../utils/basic"
import {exportHTTPFuzzerResponse, exportPayloadResponse} from "./HTTPFuzzerPageExport"
import {StringToUint8Array, Uint8ArrayToString} from "../../utils/str"
import {PacketScanButton} from "@/pages/packetScanner/DefaultPacketScanGroup"
import styles from "./HTTPFuzzerPage.module.scss"
import {ShareImportExportData} from "./components/ShareImportExportData"
// import {showExtractFuzzerResponseOperator} from "@/utils/extractor"
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    ChromeSvgIcon,
    ClockIcon,
    PaperAirplaneIcon,
    SearchIcon,
    StopIcon,
    ArrowsRetractIcon,
    ArrowsExpandIcon,
    QuestionMarkCircleIcon
} from "@/assets/newIcon"
import classNames from "classnames"
import {PaginationSchema} from "../invoker/schema"
import {showResponseViaResponseRaw} from "@/components/ShowInBrowser"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitButton, YakitButtonProp} from "@/components/yakitUI/YakitButton/YakitButton"
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
import {useSubscribeClose} from "@/store/tabSubscribe"
import {monaco} from "react-monaco-editor"
import {OtherMenuListProps} from "@/components/yakitUI/YakitEditor/YakitEditorType"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {WebFuzzerResponseExtractor} from "@/utils/extractor"
import {HttpQueryAdvancedConfig} from "./HttpQueryAdvancedConfig/HttpQueryAdvancedConfig"
import {
    FuzzerParamItem,
    AdvancedConfigValueProps,
    KVPair,
    FuzzTagMode
} from "./HttpQueryAdvancedConfig/HttpQueryAdvancedConfigType"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {
    ExtractorValueProps,
    HTTPResponseExtractor,
    HTTPResponseMatcher,
    MatcherAndExtractionRefProps,
    MatcherAndExtractionValueProps,
    MatcherValueProps,
    MatchingAndExtraction
} from "./MatcherAndExtractionCard/MatcherAndExtractionCardType"
import {HTTPHeader} from "../mitm/MITMContentReplacerHeaderOperator"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {MatcherAndExtraction} from "./MatcherAndExtractionCard/MatcherAndExtractionCard"
import _ from "lodash"
import {YakitRoute} from "@/routes/newRouteConstants"
import {FUZZER_LABEL_LIST_NUMBER} from "./HTTPFuzzerEditorMenu"
import {WebFuzzerNewEditor} from "./WebFuzzerNewEditor/WebFuzzerNewEditor"
import {
    OutlineAnnotationIcon,
    OutlineBeakerIcon,
    OutlineExportIcon,
    OutlinePayloadIcon,
    OutlineXIcon,
    OutlineCodeIcon,
    OutlinePlugsIcon,
    OutlineSearchIcon,
    OutlineFilterIcon
} from "@/assets/icon/outline"
import emiter from "@/utils/eventBus/eventBus"
import {shallow} from "zustand/shallow"
import {usePageInfo, PageNodeItemProps, WebFuzzerPageInfoProps} from "@/store/pageInfo"
import {YakitCopyText} from "@/components/yakitUI/YakitCopyText/YakitCopyText"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {openABSFileLocated} from "@/utils/openWebsite"
import {PayloadGroupNodeProps, ReadOnlyNewPayload} from "../payloadManager/newPayload"
import {createRoot} from "react-dom/client"
import {SolidPauseIcon, SolidPlayIcon} from "@/assets/icon/solid"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {YakitWindow} from "@/components/yakitUI/YakitWindow/YakitWindow"
import blastingIdmp4 from "@/assets/blasting-id.mp4"
import blastingPwdmp4 from "@/assets/blasting-pwd.mp4"
import blastingCountmp4 from "@/assets/blasting-count.mp4"
import {prettifyPacketCode} from "@/utils/prettifyPacket"
import {RemoteGV} from "@/yakitGV"
import {WebFuzzerType} from "./WebFuzzerPage/WebFuzzerPageType"
import cloneDeep from "lodash/cloneDeep"

import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {defYakitAutoCompleteRef} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {YakitAutoCompleteRefProps} from "@/components/yakitUI/YakitAutoComplete/YakitAutoCompleteType"
import {availableColors} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {apiGetGlobalNetworkConfig, apiSetGlobalNetworkConfig} from "../spaceEngine/utils"
import {GlobalNetworkConfig} from "@/components/configNetwork/ConfigNetworkPage"
import {ThirdPartyApplicationConfigForm} from "@/components/configNetwork/ThirdPartyApplicationConfig"
import {
    DefFuzzerTableMaxData,
    defaultAdvancedConfigShow,
    defaultPostTemplate,
    emptyFuzzer,
    defaultWebFuzzerPageInfo,
    WEB_FUZZ_DNS_Hosts_Config,
    WEB_FUZZ_DNS_Server_Config,
    WEB_FUZZ_HOTPATCH_CODE,
    WEB_FUZZ_HOTPATCH_WITH_PARAM_CODE,
    WEB_FUZZ_PROXY,
    defaultLabel
} from "@/defaultConstants/HTTPFuzzerPage"

const ResponseAllDataCard = React.lazy(() => import("./FuzzerSequence/ResponseAllDataCard"))

const {ipcRenderer} = window.require("electron")

export type AdvancedConfigShowProps = Record<Exclude<WebFuzzerType, "sequence">, boolean>
export interface ShareValueProps {
    /**高级配置显示/隐藏 */
    advancedConfigShow: AdvancedConfigShowProps
    /**请求包 */
    request: string
    /**高级配置的数据 */
    advancedConfiguration: AdvancedConfigValueProps
}

export const analyzeFuzzerResponse = (
    i: FuzzerResponse,
    // setRequest: (isHttps: boolean, request: string) => any,
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
    Extractors: HTTPResponseExtractor[]
    Matchers: HTTPResponseMatcher[]
    MatchersCondition: string
    HitColor: string
    Params: FuzzerParamItem[]
    IsGmTLS: boolean
}

export interface HTTPFuzzerPageProp {
    system?: string
    id: string
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
    TaskId?: number
    DNSDurationMs: number
    FirstByteDurationMs?: number
    TotalDurationMs: number
    Proxy?: string
    RemoteAddr?: string
    ExtractedResults: KVPair[]
    MatchedByMatcher: boolean
    HitColor: string
    /**@name 仅作用于前端表格背景色样式 */
    cellClassName?: string

    /**
     * 超大响应
     */
    IsTooLargeResponse: boolean
    TooLargeResponseHeaderFile: string
    TooLargeResponseBodyFile: string
    DisableRenderStyles: boolean

    RuntimeID: string
}

export interface HistoryHTTPFuzzerTask {
    Request: string
    RequestRaw: Uint8Array
    Proxy: string
    IsHTTPS: boolean

    IsGmTLS: boolean

    // 展示渲染，一般来说 Verbose > RequestRaw > Request
    Verbose?: string
}

interface MutateMethod {
    Type: string
    Value: KVPair[]
}
export interface FuzzerRequestProps {
    // Request: string
    Params: FuzzerParamItem[]
    MutateMethods: MutateMethod[]
    Concurrent: number
    IsHTTPS: boolean
    FuzzTagMode: FuzzTagMode
    FuzzTagSyncIndex: boolean
    Proxy: string
    PerRequestTimeoutSeconds: number
    BatchTarget?: Uint8Array
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
    InheritVariables?: boolean
    InheritCookies?: boolean
    /**@name 序列化的item唯一key */
    FuzzerIndex?: string
    /**@name fuzzer Tab的唯一key */
    FuzzerTabIndex?: string
}

export const showDictsAndSelect = (fun: (i: string) => any) => {
    ipcRenderer
        .invoke("GetAllPayloadGroup")
        .then((res: {Nodes: PayloadGroupNodeProps[]}) => {
            if (res.Nodes.length === 0) {
                warn("暂无字典，请先添加后再使用")
            } else {
                const y = showYakitModal({
                    title: null,
                    footer: null,
                    width: 1200,
                    type: "white",
                    closable: false,
                    hiddenHeader: true,
                    content: (
                        <ReadOnlyNewPayload
                            selectorHandle={(e) => {
                                fun(e)
                                y.destroy()
                            }}
                            onClose={() => {
                                y.destroy()
                            }}
                            Nodes={res.Nodes}
                        />
                    )
                })
            }
        })
        .catch((e: any) => {
            failed(`获取字典列表失败：${e}`)
        })
        .finally()
}

export function copyAsUrl(f: {Request: string; IsHTTPS: boolean}) {
    ipcRenderer
        .invoke("ExtractUrl", f)
        .then((data: {Url: string}) => {
            callCopyToClipboard(data.Url)
        })
        .catch((e) => {
            failed("复制 URL 失败：包含 Fuzz 标签可能会导致 URL 不完整")
        })
}
/**
 * @description 前端类型转为HTTPFuzzer/HTTPFuzzerSequence接口需要的类型 advancedConfigValue类型转为FuzzerRequests类型
 * @param {AdvancedConfigValueProps} value
 * @returns {FuzzerRequestProps}
 */
export const advancedConfigValueToFuzzerRequests = (value: AdvancedConfigValueProps) => {
    const fuzzerRequests: FuzzerRequestProps = {
        // Request: request,
        RequestRaw: new Uint8Array(), // StringToUint8Array(request, "utf8"),
        FuzzTagMode: value.fuzzTagMode,
        FuzzTagSyncIndex: value.fuzzTagSyncIndex,
        IsHTTPS: value.isHttps,
        IsGmTLS: value.isGmTLS,
        Concurrent: value.concurrent,
        PerRequestTimeoutSeconds: value.timeout,
        BatchTarget: value.batchTarget || new Uint8Array(),
        NoFixContentLength: value.noFixContentLength,
        NoSystemProxy: value.noSystemProxy,
        Proxy: value.proxy ? value.proxy.join(",") : "",
        ActualAddr: value.actualHost,
        HotPatchCode: "",
        HotPatchCodeWithParamGetter: "",
        DelayMinSeconds: value.minDelaySeconds,
        DelayMaxSeconds: value.maxDelaySeconds,
        RepeatTimes: value.repeatTimes,

        // retry config
        MaxRetryTimes: value.maxRetryTimes,
        RetryInStatusCode: value.retry ? value?.retryConfiguration?.statusCode || "" : "",
        RetryNotInStatusCode: value.noRetry ? value?.noRetryConfiguration?.statusCode || "" : "",
        RetryWaitSeconds: value.retryWaitSeconds,
        RetryMaxWaitSeconds: value.retryMaxWaitSeconds,

        // redirect config
        NoFollowRedirect: value.noFollowRedirect,
        FollowJSRedirect: value.followJSRedirect,
        RedirectTimes: value.redirectCount,

        // dnsConfig
        DNSServers: value.dnsServers,
        EtcHosts: value.etcHosts,
        // 设置变量
        Params: (value.params || [])
            .filter((ele) => ele.Key || ele.Value)
            .map((ele) => ({
                Key: ele.Key,
                Value: ele.Value,
                Type: ele.Type
            })),
        MutateMethods: [],
        //匹配器
        Matchers: value.matchers,
        MatchersCondition: value.matchersCondition,
        HitColor: value.filterMode === "onlyMatch" ? value.hitColor : "",
        //提取器
        Extractors: value.extractors
    }

    let mutateMethods: any[] = []
    const getArr = (value.methodGet || []).filter((ele) => ele.Key || ele.Value)
    const postArr = (value.methodPost || []).filter((ele) => ele.Key || ele.Value)
    const headersArr = (value.headers || []).filter((ele) => ele.Key || ele.Value)
    const cookieArr = (value.cookie || []).filter((ele) => ele.Key || ele.Value)
    if (getArr.length) {
        mutateMethods.push({
            Type: "Get",
            Value: getArr.map((ele) => ({
                Key: ele.Key,
                Value: ele.Value
            }))
        })
    }
    if (postArr.length) {
        mutateMethods.push({
            Type: "Post",
            Value: postArr.map((ele) => ({
                Key: ele.Key,
                Value: ele.Value
            }))
        })
    }
    if (headersArr.length) {
        mutateMethods.push({
            Type: "Headers",
            Value: headersArr.map((ele) => ({
                Key: ele.Key,
                Value: ele.Value
            }))
        })
    }
    if (cookieArr.length) {
        mutateMethods.push({
            Type: "Cookie",
            Value: cookieArr.map((ele) => ({
                Key: ele.Key,
                Value: ele.Value
            }))
        })
    }

    fuzzerRequests.MutateMethods = mutateMethods

    return fuzzerRequests
}

export const newWebFuzzerTab = (isHttps: boolean, request: string, openFlag?: boolean) => {
    return ipcRenderer
        .invoke("send-to-tab", {
            type: "fuzzer",
            data: {isHttps: isHttps, request: request, openFlag}
        })
        .then(() => {
            openFlag === false && info("发送成功")
        })
}

/**@description 插入 yak.fuzz 语法 */
export const onInsertYakFuzzer = (reqEditor: IMonacoEditor) => {
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
                    close={() => m.destroy()}
                />
            </div>
        )
    })
}

export interface FuzzerCacheDataProps {
    proxy: string[]
    dnsServers: string[]
    etcHosts: KVPair[]
    advancedConfigShow: AdvancedConfigShowProps | null
    resNumlimit: number
}
/**获取fuzzer高级配置中得 proxy dnsServers etcHosts resNumlimit*/
export const getFuzzerCacheData: () => Promise<FuzzerCacheDataProps> = () => {
    return new Promise(async (resolve, rejects) => {
        try {
            const proxy = await getRemoteValue(WEB_FUZZ_PROXY)
            const dnsServers = await getRemoteValue(WEB_FUZZ_DNS_Server_Config)
            const etcHosts = await getRemoteValue(WEB_FUZZ_DNS_Hosts_Config)
            const advancedConfigShow = await getRemoteValue(RemoteGV.WebFuzzerAdvancedConfigShow)
            const resNumlimit = await getRemoteValue(RemoteGV.FuzzerResMaxNumLimit)
            const value: FuzzerCacheDataProps = {
                proxy: !!proxy ? proxy.split(",") : [],
                dnsServers: !!dnsServers ? JSON.parse(dnsServers) : [],
                etcHosts: !!etcHosts ? JSON.parse(etcHosts) : [],
                advancedConfigShow: !!advancedConfigShow ? JSON.parse(advancedConfigShow) : null,
                resNumlimit: !!resNumlimit ? JSON.parse(resNumlimit) : DefFuzzerTableMaxData
            }
            resolve(value)
        } catch (error) {
            rejects(error)
        }
    })
}

export interface SelectOptionProps {
    label: string
    value: string
}

/*为避免文件相互引用造成数据问题,请将 HTTPFuzzerPage 页面的常用变量放在 app\renderer\src\main\src\defaultConstants\HTTPFuzzerPage.ts */
const HTTPFuzzerPage: React.FC<HTTPFuzzerPageProp> = (props) => {
    const {queryPagesDataById, updatePagesDataCacheById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById,
            updatePagesDataCacheById: s.updatePagesDataCacheById
        }),
        shallow
    )
    const initWebFuzzerPageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, props.id)
        if (currentItem && currentItem.pageParamsInfo.webFuzzerPageInfo) {
            return currentItem.pageParamsInfo.webFuzzerPageInfo
        } else {
            return cloneDeep(defaultWebFuzzerPageInfo)
        }
    })
    const [advancedConfigValue, setAdvancedConfigValue] = useState<AdvancedConfigValueProps>(
        initWebFuzzerPageInfo().advancedConfigValue
    ) //  在新建页面的时候，就将高级配置的初始值存放在数据中心中，所以页面得高级配置得值可以直接通过页面得id在数据中心中获取

    // 高级配置的隐藏/显示
    const [advancedConfigShow, setAdvancedConfigShow] = useState<AdvancedConfigShowProps>({
        ...(initWebFuzzerPageInfo().advancedConfigShow || defaultAdvancedConfigShow)
    })

    // 切换【配置】/【规则】高级内容显示 type
    const [advancedConfigShowType, setAdvancedConfigShowType] = useState<WebFuzzerType>("config")
    const [redirectedResponse, setRedirectedResponse] = useState<FuzzerResponse>()
    const [historyTask, setHistoryTask] = useState<HistoryHTTPFuzzerTask>()
    const [affixSearch, setAffixSearch] = useState("")
    const [defaultResponseSearch, setDefaultResponseSearch] = useState("")

    const [currentSelectId, setCurrentSelectId] = useState<number>() // 历史中选中的记录id
    /**@name 是否刷新高级配置中的代理列表 */
    const [droppedCount, setDroppedCount] = useState(0)

    // state
    const [loading, setLoading] = useState(false)

    /*
     * 内容
     * */
    const [_firstResponse, setFirstResponse, getFirstResponse] = useGetState<FuzzerResponse>(emptyFuzzer)
    const [successFuzzer, setSuccessFuzzer] = useState<FuzzerResponse[]>([])
    const [failedFuzzer, setFailedFuzzer] = useState<FuzzerResponse[]>([])
    const [_successCount, setSuccessCount, getSuccessCount] = useGetState(0)
    const [_failedCount, setFailedCount, getFailedCount] = useGetState(0)

    /**/

    const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false)

    // editor Response
    const [showMatcherAndExtraction, setShowMatcherAndExtraction] = useState<boolean>(false) // Response中显示匹配和提取器
    const [showExtra, setShowExtra] = useState<boolean>(false) // Response中显示payload和提取内容
    const [showResponseInfoSecondEditor, setShowResponseInfoSecondEditor] = useState<boolean>(true)
    // second Node
    const secondNodeRef = useRef(null)
    const secondNodeSize = useSize(secondNodeRef)
    const [showSuccess, setShowSuccess] = useState(true)
    const [query, setQuery] = useState<HTTPFuzzerPageTableQuery>()

    // Matching And Extraction
    const [activeType, setActiveType] = useState<MatchingAndExtraction>("matchers")
    const [activeKey, setActiveKey] = useState<string>("")

    const requestRef = useRef<string>(initWebFuzzerPageInfo().request)
    const {setSubscribeClose, getSubscribeClose} = useSubscribeClose()
    const fuzzerRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(fuzzerRef)

    const hotPatchCodeRef = useRef<string>("")
    const hotPatchCodeWithParamGetterRef = useRef<string>("")

    const proxyListRef: React.MutableRefObject<YakitAutoCompleteRefProps> = useRef<YakitAutoCompleteRefProps>({
        ...defYakitAutoCompleteRef
    })
    const [fuzzerTableMaxData, setFuzzerTableMaxData] = useState<number>(DefFuzzerTableMaxData)
    const fuzzerTableMaxDataRef = useRef<number>(fuzzerTableMaxData)

    useEffect(() => {
        fuzzerTableMaxDataRef.current = fuzzerTableMaxData
    }, [fuzzerTableMaxData])

    useEffect(() => {
        getRemoteValue(HTTP_PACKET_EDITOR_Response_Info)
            .then((data) => {
                setShowResponseInfoSecondEditor(data === "false" ? false : true)
            })
            .catch(() => {
                setShowResponseInfoSecondEditor(true)
            })
        emiter.on("onSetAdvancedConfigShow", onSetAdvancedConfigShow)
        return () => {
            emiter.off("onSetAdvancedConfigShow", onSetAdvancedConfigShow)
        }
    }, [])
    useEffect(() => {
        if (inViewport) {
            onRefWebFuzzerValue()
            emiter.on("onRefWebFuzzer", onRefWebFuzzerValue)
            emiter.on("onSwitchTypeWebFuzzerPage", onFuzzerAdvancedConfigShowType)
        }
        return () => {
            emiter.off("onRefWebFuzzer", onRefWebFuzzerValue)
            emiter.off("onSwitchTypeWebFuzzerPage", onFuzzerAdvancedConfigShowType)
        }
    }, [inViewport])
    /**高级配置显示/隐藏 【序列】tab没有下列操作*/
    const onSetAdvancedConfigShow = useMemoizedFn((data) => {
        if (!inViewport) return
        try {
            const value = JSON.parse(data)
            const {type} = value
            if (type === "sequence") return
            const c = !advancedConfigShow[type]
            const newValue = {
                ...advancedConfigShow,
                [type]: c
            }
            setAdvancedConfigShow(newValue)
            setRemoteValue(RemoteGV.WebFuzzerAdvancedConfigShow, JSON.stringify(newValue))
            emiter.emit("onGetFuzzerAdvancedConfigShow", JSON.stringify({type: advancedConfigShowType, checked: c}))
        } catch (error) {}
    })
    const onRefWebFuzzerValue = useMemoizedFn(() => {
        if (!inViewport) return
        getRemoteValue(WEB_FUZZ_HOTPATCH_CODE).then((remoteData) => {
            if (!remoteData) {
                return
            }
            setHotPatchCode(`${remoteData}`)
        })
        getRemoteValue(WEB_FUZZ_HOTPATCH_WITH_PARAM_CODE).then((remoteData) => {
            if (!!remoteData) {
                setHotPatchCodeWithParamGetter(`${remoteData}`)
            }
        })
        onUpdateRequest()
        onUpdateAdvancedConfigValue()
    })
    /**
     * @description 高级配置得内容展示切换
     * 规则和配置之前得type切换，与序列无关
     * */
    const onFuzzerAdvancedConfigShowType = useMemoizedFn((data) => {
        if (!inViewport) return
        try {
            const value = JSON.parse(data)
            setAdvancedConfigShowType(value.type)
        } catch (error) {}
    })
    /**更新请求包 */
    const onUpdateRequest = useMemoizedFn(() => {
        if (!inViewport) return
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, props.id)
        if (!currentItem) return
        const newRequest = currentItem.pageParamsInfo.webFuzzerPageInfo?.request
        if (!newRequest) return
        if (requestRef.current === newRequest) return
        requestRef.current = newRequest || defaultPostTemplate
        refreshRequest()
    })
    /**从数据中心获取页面最新得高级配置数据,目前只有提取器和匹配器相关数据 */
    const onUpdateAdvancedConfigValue = useMemoizedFn(() => {
        if (!inViewport) return
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, props.id)
        if (!currentItem) return
        let newAdvancedConfigValue = currentItem.pageParamsInfo.webFuzzerPageInfo?.advancedConfigValue
        if (!newAdvancedConfigValue) return
        setAdvancedConfigValue({...newAdvancedConfigValue})
    })

    useEffect(() => {
        if (getSubscribeClose(YakitRoute.HTTPFuzzer)) return
        setSubscribeClose(YakitRoute.HTTPFuzzer, {
            close: {
                title: "关闭提示",
                content: "关闭一级菜单会关闭一级菜单下的所有二级菜单?",
                onOkText: "确定",
                onCancelText: "取消",
                onOk: (m) => onCloseTab(m)
            }
        })
    }, [])

    const onCloseTab = useMemoizedFn((m) => {
        ipcRenderer
            .invoke("send-close-tab", {
                router: YakitRoute.HTTPFuzzer
            })
            .then(() => {
                m.destroy()
            })
    })

    // 保留数组中非重复数据
    const filterNonUnique = (arr) => arr.filter((i) => arr.indexOf(i) === arr.lastIndexOf(i))
    const isSaveFuzzerLabelFun = useMemoizedFn(() => {
        // 常用标签默认存储
        ipcRenderer.invoke("QueryFuzzerLabel").then((data: {Data: QueryFuzzerLabelResponseProps[]}) => {
            const {Data} = data
            if (Array.isArray(Data) && Data.length === 0) {
                ipcRenderer.invoke("SaveFuzzerLabel", {
                    Data: defaultLabel
                })
                // 缓存标签数量 用于添加生成标签Description
                setRemoteValue(FUZZER_LABEL_LIST_NUMBER, JSON.stringify({number: defaultLabel.length}))
            } else {
                // 获取缓存的固有标签
                let oldFixedArr: string[] = []
                // 获取最新的固有标签
                let newFixedArr: string[] = defaultLabel.map((item) => item.DefaultDescription)
                Data.forEach((item) => {
                    if (item.DefaultDescription.endsWith("-fixed")) {
                        oldFixedArr.push(item.DefaultDescription)
                    }
                })
                let arr: string[] = filterNonUnique([...oldFixedArr, ...newFixedArr])
                arr.forEach((item) => {
                    // 需要新添的项
                    if (newFixedArr.includes(item)) {
                        ipcRenderer.invoke("SaveFuzzerLabel", {
                            Data: defaultLabel.filter((itemIn) => itemIn.DefaultDescription === item)
                        })
                    }
                    // 需要删除的项
                    else {
                        ipcRenderer.invoke("DeleteFuzzerLabel", {
                            Hash: Data.filter((itemIn) => itemIn.DefaultDescription === item)[0].Hash
                        })
                    }
                })
            }
        })
    })

    useEffect(() => {
        // 此次重构不兼容之前数据 所以在第一次进入页面时清空
        getRemoteValue("IS_DELETE_FUZZ_LABEL").then((remoteData) => {
            if (!remoteData) {
                ipcRenderer
                    .invoke("DeleteFuzzerLabel", {})
                    .then(() => {
                        isSaveFuzzerLabelFun()
                    })
                    .catch((err) => {
                        failed(`清空老数据失败：${err}`)
                    })
                setRemoteValue("IS_DELETE_FUZZ_LABEL", JSON.stringify({isDelete: false}))
                return
            }
            isSaveFuzzerLabelFun()
        })
    }, [])

    // 定时器
    const resetResponse = useMemoizedFn(() => {
        setFirstResponse({...emptyFuzzer})
        setSuccessFuzzer([])
        setRedirectedResponse(undefined)
        setFailedFuzzer([])
        setSuccessCount(0)
        setFailedCount(0)
        setRuntimeId("")
        setFuzzerTableMaxData(DefFuzzerTableMaxData)
    })

    // 从历史记录中恢复
    useEffect(() => {
        if (!historyTask) {
            return
        }
        if (historyTask.Request === "") {
            requestRef.current = Uint8ArrayToString(historyTask.RequestRaw, "utf8")
        } else {
            requestRef.current = historyTask.Request
        }
        setAdvancedConfigValue({
            ...advancedConfigValue,
            isHttps: historyTask.IsHTTPS,
            isGmTLS: historyTask.IsGmTLS,
            proxy: historyTask.Proxy ? historyTask.Proxy.split(",") : []
        })
        refreshRequest()
    }, [historyTask])
    const retryRef = useRef<boolean>(false)
    const matchRef = useRef<boolean>(false)

    const refreshRequest = useMemoizedFn(() => {
        setRefreshTrigger(!refreshTrigger)
    })

    const loadHistory = useMemoizedFn((id: number) => {
        resetResponse()
        setHistoryTask(undefined)
        setLoading(true)
        setDroppedCount(0)
        setFuzzerTableMaxData(advancedConfigValue.resNumlimit)
        ipcRenderer.invoke("HTTPFuzzer", {HistoryWebFuzzerId: id}, tokenRef.current).then(() => {
            ipcRenderer
                .invoke("GetHistoryHTTPFuzzerTask", {Id: id})
                .then((data: {OriginRequest: HistoryHTTPFuzzerTask}) => {
                    setHistoryTask(data.OriginRequest)
                    setCurrentSelectId(id)
                })
        })
    })
    const responseViewerRef = useRef<MatcherAndExtractionRefProps>({
        validate: () => new Promise(() => {})
    })

    const onValidateHTTPFuzzer = useMemoizedFn(() => {
        if (showMatcherAndExtraction && responseViewerRef.current) {
            responseViewerRef.current
                .validate()
                .then((data: MatcherAndExtractionValueProps) => {
                    setAdvancedConfigValue({
                        ...advancedConfigValue,
                        filterMode: data.matcher.filterMode || "drop",
                        hitColor: data.matcher.hitColor || "red",
                        matchersCondition: data.matcher.matchersCondition || "and",
                        matchers: data.matcher.matchersList || [],
                        extractors: data.extractor.extractorList || []
                    })
                })
                .catch(() => {})
                .finally(() => {
                    setTimeout(() => {
                        submitToHTTPFuzzer()
                    }, 200)
                })
        } else {
            submitToHTTPFuzzer()
        }
    })

    const getFuzzerRequestParams = useMemoizedFn(() => {
        return {
            ...advancedConfigValueToFuzzerRequests(advancedConfigValue),
            RequestRaw: Buffer.from(requestRef.current, "utf8"), // StringToUint8Array(request, "utf8"),
            HotPatchCode: hotPatchCodeRef.current,
            HotPatchCodeWithParamGetter: hotPatchCodeWithParamGetterRef.current,
            FuzzerTabIndex: props.id
        }
    })

    const submitToHTTPFuzzer = useMemoizedFn(() => {
        resetResponse()
        // 清楚历史任务的标记
        setHistoryTask(undefined)

        //  更新默认搜索
        setDefaultResponseSearch(affixSearch)

        setLoading(true)
        setDroppedCount(0)

        // FuzzerRequestProps
        const httpParams: FuzzerRequestProps = getFuzzerRequestParams()
        if (advancedConfigValue.proxy && advancedConfigValue.proxy.length > 0) {
            getProxyList(advancedConfigValue.proxy)
        }
        setRemoteValue(WEB_FUZZ_PROXY, `${advancedConfigValue.proxy}`)
        setRemoteValue(WEB_FUZZ_DNS_Server_Config, JSON.stringify(httpParams.DNSServers))
        setRemoteValue(WEB_FUZZ_DNS_Hosts_Config, JSON.stringify(httpParams.EtcHosts))
        setRemoteValue(RemoteGV.FuzzerResMaxNumLimit, JSON.stringify(advancedConfigValue.resNumlimit))
        setFuzzerTableMaxData(advancedConfigValue.resNumlimit)
        if (retryRef.current) {
            retryRef.current = false
            const retryTaskID = failedFuzzer.length > 0 ? failedFuzzer[0].TaskId : undefined
            if (retryTaskID) {
                const params = {...httpParams, RetryTaskID: parseInt(retryTaskID + "")}
                const retryParams = _.omit(params, ["Request", "RequestRaw"])
                ipcRenderer.invoke("HTTPFuzzer", retryParams, tokenRef.current)
                setIsPause(true)
            }
        } else if (matchRef.current) {
            matchRef.current = false
            const matchTaskID = successFuzzer.length > 0 ? successFuzzer[0].TaskId : undefined
            const params = {...httpParams, ReMatch: true, HistoryWebFuzzerId: matchTaskID}
            ipcRenderer.invoke("HTTPFuzzer", params, tokenRef.current)
        } else {
            ipcRenderer.invoke("HTTPFuzzer", httpParams, tokenRef.current)
        }
    })

    const getProxyList = useMemoizedFn((proxyList) => {
        if (proxyListRef.current) {
            proxyListRef.current.onSetRemoteValues(proxyList)
        }
    })

    const [isPause, setIsPause] = useState<boolean>(true) // 暂停或继续请求标识
    const resumeAndPause = useMemoizedFn(async () => {
        try {
            if (!taskIDRef.current) return
            await ipcRenderer.invoke(
                "HTTPFuzzer",
                {PauseTaskID: taskIDRef.current, IsPause: isPause, SetPauseStatus: true},
                tokenRef.current
            )
            setLoading(!isPause)
            setIsPause(!isPause)
        } catch (error) {
            yakitFailed(error + "")
        }
    })

    // 目前按钮处于发送请求状态
    const isbuttonIsSendReqStatus = useMemo(() => {
        return !loading && isPause
    }, [loading, isPause])

    const cancelCurrentHTTPFuzzer = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-HTTPFuzzer", tokenRef.current)
    })
    const dCountRef = useRef<number>(0)
    const tokenRef = useRef<string>(randomString(60))
    const taskIDRef = useRef<string>("")
    const [showAllDataRes, setShowAllDataRes] = useState<boolean>(false)
    const [runtimeId, setRuntimeId] = useState<string>("")

    useEffect(() => {
        const token = tokenRef.current

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
            yakitNotify("error", `提交模糊测试请求失败 ${details}`)
        })
        let successBuffer: FuzzerResponse[] = []
        let failedBuffer: FuzzerResponse[] = []

        let count: number = 0 // 用于数据项请求字段

        const updateData = () => {
            if (count <= 0) {
                return
            }

            if (failedBuffer.length + successBuffer.length + failedCount + successCount === 0) {
                return
            }

            setSuccessFuzzer([...successBuffer])
            setFailedFuzzer([...failedBuffer])
            setFailedCount(failedCount)
            setSuccessCount(successCount)
        }

        ipcRenderer.on(dataToken, (e: any, data: any) => {
            taskIDRef.current = data.TaskId
            setRuntimeId(data.RuntimeID)

            if (count === 0) {
                // 重置extractedMap
                reset()
            }

            if (onIsDropped(data)) return

            const r = {
                // 6.16
                ...data,
                Headers: data.Headers || [],
                UUID: data.UUID || randomString(16), // 新版yakit,成功和失败的数据都有UUID,旧版失败的数据没有UUID,兼容
                Count: count++,
                cellClassName: data.MatchedByMatcher
                    ? `color-opacity-bg-${data.HitColor} color-text-${data.HitColor} color-font-weight-${data.HitColor}`
                    : ""
            } as FuzzerResponse

            // 设置第一个 response
            if (getFirstResponse().RequestRaw.length === 0) {
                setFirstResponse(r)
            }

            if (data.Ok) {
                successCount++
                successBuffer.push(r)
                // 超过最大显示 展示最新数据
                if (successBuffer.length > fuzzerTableMaxDataRef.current) {
                    successBuffer.shift()
                }
            } else {
                failedCount++
                failedBuffer.push(r)
            }
        })

        ipcRenderer.on(endToken, () => {
            updateData()
            successBuffer = []
            failedBuffer = []
            count = 0
            successCount = 0
            failedCount = 0
            dCountRef.current = 0
            taskIDRef.current = ""
            setTimeout(() => {
                setIsPause(true)
                setLoading(false)
                getTotal()
            }, 500)
        })

        const updateDataId = setInterval(() => {
            updateData()
        }, 300)

        return () => {
            ipcRenderer.invoke("cancel-HTTPFuzzer", token)
            clearInterval(updateDataId)
            ipcRenderer.removeAllListeners(errToken)
            ipcRenderer.removeAllListeners(dataToken)
            ipcRenderer.removeAllListeners(endToken)
        }
    }, [])

    const [extractedMap, {setAll, reset}] = useMap<string, string>()
    useEffect(() => {
        ipcRenderer.on(
            "fetch-extracted-to-table",
            (e: any, data: {type: string; extractedMap: Map<string, string>}) => {
                if (data.type === "fuzzer") {
                    setExtractedMap(data.extractedMap)
                }
            }
        )
        return () => {
            ipcRenderer.removeAllListeners("fetch-extracted-to-table")
        }
    }, [])

    const setExtractedMap = useMemoizedFn((extractedMap: Map<string, string>) => {
        if (inViewport) setAll(extractedMap)
    })
    const onlyOneResponse = useMemo(() => {
        return !loading && failedFuzzer.length + successFuzzer.length === 1
    }, [loading, failedFuzzer, successFuzzer])

    /**@returns bool false没有丢弃的数据，true有丢弃的数据 */
    const onIsDropped = useMemoizedFn((data) => {
        if (advancedConfigValue.matchers?.length > 0) {
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
                dCountRef.current++
                setDroppedCount(dCountRef.current)
                return true
            }
            return false
        }
        return false
    })

    const sendFuzzerSettingInfo = useDebounceFn(
        () => {
            // 23.7.10 最新只保存 isHttps、actualHost和request
            const webFuzzerPageInfo: WebFuzzerPageInfoProps = {
                pageId: props.id,
                advancedConfigValue,
                request: requestRef.current,
                advancedConfigShow
            }
            onUpdateFuzzerSequenceDueToDataChanges(props.id || "", webFuzzerPageInfo)
        },
        {wait: 500}
    ).run
    useUpdateEffect(() => {
        sendFuzzerSettingInfo()
    }, [advancedConfigValue])

    /**
     * 因为页面数据变化更新fuzzer序列化
     */
    const onUpdateFuzzerSequenceDueToDataChanges = useMemoizedFn((key: string, param: WebFuzzerPageInfoProps) => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, key)
        if (!currentItem) return
        const newCurrentItem: PageNodeItemProps = {
            ...currentItem,
            pageParamsInfo: {
                webFuzzerPageInfo: {
                    ...(currentItem.pageParamsInfo?.webFuzzerPageInfo || {}),
                    pageId: param.pageId,
                    advancedConfigValue: {
                        ...param.advancedConfigValue
                    },
                    advancedConfigShow: {
                        ...(param.advancedConfigShow as AdvancedConfigShowProps)
                    },
                    request: param.request
                }
            }
        }
        updatePagesDataCacheById(YakitRoute.HTTPFuzzer, {...newCurrentItem})
    })

    const hotPatchTrigger = useMemoizedFn(() => {
        let m = showYakitModal({
            title: null,
            width: "80%",
            footer: null,
            maskClosable: false,
            closable: false,
            hiddenHeader: true,
            style: {top: "10%"},
            keyboard: false,
            content: (
                <HTTPFuzzerHotPatch
                    initialHotPatchCode={hotPatchCodeRef.current}
                    initialHotPatchCodeWithParamGetter={hotPatchCodeWithParamGetterRef.current}
                    onInsert={(tag) => {
                        if (webFuzzerNewEditorRef.current.reqEditor)
                            monacoEditorWrite(webFuzzerNewEditorRef.current.reqEditor, tag)
                        m.destroy()
                    }}
                    onSaveCode={(code) => {
                        setHotPatchCode(code)
                        setRemoteValue(WEB_FUZZ_HOTPATCH_CODE, code)
                    }}
                    onSaveHotPatchCodeWithParamGetterCode={(code) => {
                        setHotPatchCodeWithParamGetter(code)
                        setRemoteValue(WEB_FUZZ_HOTPATCH_WITH_PARAM_CODE, code)
                    }}
                    onCancel={() => m.destroy()}
                />
            )
        })
    })
    const getShareContent = useMemoizedFn((callback) => {
        const advancedConfiguration = {...advancedConfigValue}
        delete advancedConfiguration.batchTarget
        const params: ShareValueProps = {
            advancedConfigShow,
            request: requestRef.current,
            advancedConfiguration: advancedConfiguration
        }
        callback(params)
    })

    const cachedTotal = successFuzzer.length + failedFuzzer.length
    const [currentPage, setCurrentPage] = useState<number>(0)
    const [total, setTotal] = useState<number>()
    /**获取上一个/下一个 */
    const getList = useMemoizedFn((pageInt: number) => {
        setLoading(true)
        const params = {
            FuzzerTabIndex: props.id,
            Pagination: {Page: pageInt, Limit: 1}
        }
        ipcRenderer
            .invoke("QueryHistoryHTTPFuzzerTaskEx", params)
            .then((data: {Data: HTTPFuzzerTaskDetail[]; Total: number; Pagination: PaginationSchema}) => {
                setTotal(data.Total)
                if (data.Data.length > 0) {
                    loadHistory(data.Data[0].BasicInfo.Id)
                }
            })
            .catch((err) => {
                failed("加载失败:" + err)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })
    const onPrePage = useMemoizedFn(() => {
        if (!isbuttonIsSendReqStatus || currentPage === 0 || currentPage === 1) {
            return
        }
        setCurrentPage(currentPage - 1)
        getList(currentPage - 1)
    })
    const onNextPage = useMemoizedFn(() => {
        if (!Number(total)) return
        if (!isbuttonIsSendReqStatus) return
        if (currentPage >= Number(total)) {
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
                FuzzerTabIndex: props.id,
                Pagination: {Page: 1, Limit: 1}
            })
            .then((data: {Data: HTTPFuzzerTaskDetail[]; Total: number; Pagination: PaginationSchema}) => {
                setTotal(data.Total)
            })
    })

    const webFuzzerNewEditorRef = useRef<any>()

    /**
     * @@description 获取高级配置中的Form values
     */
    const onGetFormValue = useMemoizedFn((val: AdvancedConfigValueProps) => {
        const newValue: AdvancedConfigValueProps = {
            ...val,
            hitColor: val.hitColor || "red",
            fuzzTagMode: val.fuzzTagMode === undefined ? "standard" : val.fuzzTagMode,
            fuzzTagSyncIndex: !!val.fuzzTagSyncIndex,
            minDelaySeconds: val.minDelaySeconds ? Number(val.minDelaySeconds) : 0,
            maxDelaySeconds: val.maxDelaySeconds ? Number(val.maxDelaySeconds) : 0,
            repeatTimes: val.repeatTimes ? Number(val.repeatTimes) : 0
        }
        setAdvancedConfigValue(newValue)
    })

    const httpResponse: FuzzerResponse = useMemo(() => {
        return redirectedResponse ? redirectedResponse : getFirstResponse()
    }, [redirectedResponse, getFirstResponse()])
    /**多条数据返回的第一条数据 */
    const multipleReturnsHttpResponse: FuzzerResponse = useMemo(() => {
        return successFuzzer.length > 0 ? successFuzzer[0] : emptyFuzzer
    }, [successFuzzer])

    const [exportData, setExportData] = useState<FuzzerResponse[]>([])
    const onShowResponseMatcherAndExtraction = useMemoizedFn((activeType: MatchingAndExtraction, activeKey: string) => {
        setShowMatcherAndExtraction(true)
        setActiveType(activeType)
        setActiveKey(activeKey)
    })
    const setHotPatchCode = useMemoizedFn((v: string) => {
        hotPatchCodeRef.current = v
    })
    const setHotPatchCodeWithParamGetter = useMemoizedFn((v: string) => {
        hotPatchCodeWithParamGetterRef.current = v
    })
    const onSetRequest = useMemoizedFn((i: string) => {
        requestRef.current = i
        sendFuzzerSettingInfo()
    })
    const onInsertYakFuzzerFun = useMemoizedFn(() => {
        if (webFuzzerNewEditorRef.current) onInsertYakFuzzer(webFuzzerNewEditorRef.current.reqEditor)
    })
    const checkRedirect = useMemo(() => {
        const arr = httpResponse?.Headers || []
        for (let index = 0; index < arr.length; index++) {
            const element = arr[index]
            if (element.Header === "Location") {
                return true
            }
        }
        return false
    }, [httpResponse])

    const [firstFull, setFirstFull] = useState<boolean>(false)
    const [secondFull, setSecondFull] = useState<boolean>(false)
    const ResizeBoxProps = useCreation(() => {
        let p = {
            firstRatio: "50%",
            secondRatio: "50%"
        }
        if (secondFull) {
            p.firstRatio = "0%"
        }
        if (firstFull) {
            p.secondRatio = "0%"
            p.firstRatio = "100%"
        }
        return p
    }, [firstFull, secondFull])

    const firstNodeExtra = () => (
        <>
            <div className={styles["fuzzer-firstNode-extra"]}>
                <div className={styles["fuzzer-flipping-pages"]}>
                    <ChevronLeftIcon
                        className={classNames(styles["chevron-icon"], {
                            [styles["chevron-icon-disable"]]:
                                !isbuttonIsSendReqStatus || currentPage === 0 || currentPage === 1
                        })}
                        onClick={() => onPrePage()}
                    />
                    <ChevronRightIcon
                        className={classNames(styles["chevron-icon"], {
                            [styles["chevron-icon-disable"]]:
                                !isbuttonIsSendReqStatus || currentPage >= Number(total) || !Number(total)
                        })}
                        onClick={() => onNextPage()}
                    />
                </div>
                <PacketScanButton
                    packetGetter={() => {
                        return {
                            httpRequest: StringToUint8Array(requestRef.current),
                            https: advancedConfigValue.isHttps
                        }
                    }}
                />
                <YakitButton
                    size='small'
                    type='primary'
                    onClick={async () => {
                        if (!requestRef.current) return
                        const beautifyValue = await prettifyPacketCode(requestRef.current)
                        onSetRequest(Uint8ArrayToString(beautifyValue as Uint8Array, "utf8"))
                        refreshRequest()
                    }}
                >
                    美化
                </YakitButton>
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
                                    setAdvancedConfigValue({
                                        ...advancedConfigValue,
                                        isHttps: false
                                    })
                                    ipcRenderer
                                        .invoke("Codec", {
                                            ...v
                                        })
                                        .then((e) => {
                                            if (e?.Result) {
                                                requestRef.current = e.Result
                                                if (v.Text.includes("https://")) {
                                                    setAdvancedConfigValue({
                                                        ...advancedConfigValue,
                                                        isHttps: true
                                                    })
                                                }
                                                refreshRequest()
                                            }
                                        })
                                        .catch((e) => {
                                            failed(e.message)
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
            <div className={styles["resize-card-icon"]} onClick={() => setFirstFull(!firstFull)}>
                {firstFull ? <ArrowsRetractIcon /> : <ArrowsExpandIcon />}
            </div>
        </>
    )

    const secondNodeTitle = () => {
        let isShow: boolean = true
        if (+(secondNodeSize?.width || 0) < 700 && (getSuccessCount() > 999 || getFailedCount() > 999)) isShow = false

        return (
            <>
                {isShow && (
                    <span style={{marginRight: 8, fontSize: 12, fontWeight: 500, color: "#31343f"}}>Responses</span>
                )}
                <SecondNodeTitle
                    cachedTotal={cachedTotal}
                    onlyOneResponse={onlyOneResponse}
                    rsp={httpResponse}
                    successFuzzerLength={getSuccessCount()}
                    failedFuzzerLength={getFailedCount()}
                    showSuccess={showSuccess}
                    setShowSuccess={(v) => {
                        setShowSuccess(v)
                        setQuery(undefined)
                    }}
                />
            </>
        )
    }

    const matchSubmitFun = useMemoizedFn(() => {
        matchRef.current = true
        setRedirectedResponse(undefined)
        sendFuzzerSettingInfo()
        onValidateHTTPFuzzer()
        getNewCurrentPage()
    })

    const secondNodeExtra = () => (
        <>
            <SecondNodeExtra
                onlyOneResponse={onlyOneResponse}
                cachedTotal={cachedTotal}
                rsp={httpResponse}
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
                successFuzzer={successFuzzer}
                failedFuzzer={failedFuzzer}
                secondNodeSize={secondNodeSize}
                query={query}
                setQuery={(q) => setQuery({...q})}
                sendPayloadsType='fuzzer'
                setShowExtra={setShowExtra}
                showResponseInfoSecondEditor={showResponseInfoSecondEditor}
                setShowResponseInfoSecondEditor={setShowResponseInfoSecondEditor}
                showSuccess={showSuccess}
                retrySubmit={() => {
                    if (failedFuzzer.length > 0) {
                        retryRef.current = true
                        setRedirectedResponse(undefined)
                        sendFuzzerSettingInfo()
                        onValidateHTTPFuzzer()
                        getNewCurrentPage()
                    }
                }}
                isShowMatch={!loading}
                matchSubmit={() => {
                    if (advancedConfigValue.matchers.length > 0) {
                        matchSubmitFun()
                    } else {
                        emiter.emit("onOpenMatchingAndExtractionCard", props.id)
                    }
                }}
                extractedMap={extractedMap}
                pageId={props.id}
                noPopconfirm={isbuttonIsSendReqStatus}
                retryNoPopconfirm={!(!loading && !isPause)}
                cancelCurrentHTTPFuzzer={cancelCurrentHTTPFuzzer}
                resumeAndPause={resumeAndPause}
            />
            <div className={styles["resize-card-icon"]} onClick={() => setSecondFull(!secondFull)}>
                {secondFull ? <ArrowsRetractIcon /> : <ArrowsExpandIcon />}
            </div>
        </>
    )

    const getNewCurrentPage = useMemoizedFn(() => {
        const params = {
            Pagination: {Limit: 1, Order: "", OrderBy: "", Page: 1},
            Keyword: "",
            FuzzerTabIndex: props.id
        }
        ipcRenderer
            .invoke("QueryHistoryHTTPFuzzerTaskEx", params)
            .then((data: {Data: HTTPFuzzerTaskDetail[]; Total: number; Pagination: PaginationSchema}) => {
                setCurrentPage(Number(data.Total) + 1)
            })
    })

    // 跳转插件调试页面
    const handleSkipPluginDebuggerPage = async (tempType: "path" | "raw") => {
        const requests = getFuzzerRequestParams()
        const params = {
            Requests: {Requests: Array.isArray(requests) ? requests : [getFuzzerRequestParams()]},
            TemplateType: tempType
        }
        try {
            const {Status, YamlContent} = await ipcRenderer.invoke("ExportHTTPFuzzerTaskToYaml", params)
            if (Status.Ok) {
                ipcRenderer.invoke("send-to-tab", {
                    type: "**debug-plugin",
                    data: {generateYamlTemplate: true, YamlContent}
                })
            } else {
                throw new Error(Status.Reason)
            }
        } catch (error) {
            yakitFailed(error + "")
        }
    }
    const advancedConfigVisible = useCreation(() => {
        switch (advancedConfigShowType) {
            case "config":
                return advancedConfigShow.config
            case "rule":
                return advancedConfigShow.rule
            default:
                return false
        }
    }, [advancedConfigShowType, advancedConfigShow])
    return (
        <>
            <div className={styles["http-fuzzer-body"]} ref={fuzzerRef} style={{display: showAllDataRes ? "none" : ""}}>
                <React.Suspense fallback={<>加载中...</>}>
                    <HttpQueryAdvancedConfig
                        advancedConfigValue={advancedConfigValue}
                        visible={advancedConfigVisible}
                        onInsertYakFuzzer={onInsertYakFuzzerFun}
                        onValuesChange={onGetFormValue}
                        defaultHttpResponse={Uint8ArrayToString(multipleReturnsHttpResponse.ResponseRaw) || ""}
                        outsideShowResponseMatcherAndExtraction={
                            onlyOneResponse && !!Uint8ArrayToString(httpResponse.ResponseRaw)
                        }
                        onShowResponseMatcherAndExtraction={onShowResponseMatcherAndExtraction}
                        inViewportCurrent={inViewport === true}
                        id={props.id}
                        matchSubmitFun={matchSubmitFun}
                        showFormContentType={advancedConfigShowType}
                        proxyListRef={proxyListRef}
                        isbuttonIsSendReqStatus={isbuttonIsSendReqStatus}
                    />
                </React.Suspense>
                <div className={styles["http-fuzzer-page"]}>
                    <div className={styles["fuzzer-heard"]}>
                        <div className={styles["fuzzer-heard-left"]}>
                            {!loading ? (
                                <>
                                    {!isPause ? (
                                        <YakitButton
                                            onClick={resumeAndPause}
                                            icon={<SolidPlayIcon />}
                                            type={"primary"}
                                            size='large'
                                        >
                                            继续
                                        </YakitButton>
                                    ) : (
                                        <YakitButton
                                            onClick={() => {
                                                setRedirectedResponse(undefined)
                                                sendFuzzerSettingInfo()
                                                onValidateHTTPFuzzer()
                                                getNewCurrentPage()
                                            }}
                                            icon={<PaperAirplaneIcon />}
                                            type={"primary"}
                                            size='large'
                                        >
                                            发送请求
                                        </YakitButton>
                                    )}
                                </>
                            ) : (
                                <>
                                    <YakitButton
                                        disabled={cachedTotal <= 1}
                                        onClick={resumeAndPause}
                                        icon={<SolidPauseIcon />}
                                        type={"primary"}
                                        size='large'
                                    >
                                        暂停
                                    </YakitButton>
                                    <YakitButton
                                        onClick={() => {
                                            cancelCurrentHTTPFuzzer()
                                        }}
                                        icon={<StopIcon />}
                                        type={"primary"}
                                        colors='danger'
                                        size='large'
                                        style={{marginLeft: -8}}
                                    >
                                        停止
                                    </YakitButton>
                                </>
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
                            {/*<div className={styles["fuzzer-heard-force"]}>*/}
                            {/*    <span className={styles["fuzzer-heard-https"]}>国密TLS</span>*/}
                            {/*    <YakitCheckbox*/}
                            {/*        checked={advancedConfigValue.isGmTLS}*/}
                            {/*        onChange={(e) =>*/}
                            {/*            setAdvancedConfigValue({...advancedConfigValue, isGmTLS: e.target.checked})*/}
                            {/*        }*/}
                            {/*    />*/}
                            {/*</div>*/}
                            <Divider type='vertical' style={{margin: 0, top: 1}} />
                            <div className={styles["display-flex"]}>
                                <Popover
                                    trigger={"click"}
                                    placement={"leftTop"}
                                    destroyTooltipOnHide={true}
                                    content={
                                        <div style={{width: 400}}>
                                            <HTTPFuzzerHistorySelector
                                                currentSelectId={currentSelectId}
                                                onSelect={(e, page, showAll) => {
                                                    cancelCurrentHTTPFuzzer()
                                                    if (!showAll) setCurrentPage(page)
                                                    loadHistory(e)
                                                }}
                                                onDeleteAllCallback={() => {
                                                    setCurrentPage(0)
                                                    getTotal()
                                                }}
                                                fuzzerTabIndex={props.id}
                                            />
                                        </div>
                                    }
                                >
                                    <YakitButton type='text' icon={<ClockIcon />} style={{padding: "4px 0px"}}>
                                        历史
                                    </YakitButton>
                                </Popover>
                            </div>
                            <div
                                className={styles["blasting-example"]}
                                onClick={() => {
                                    const m = showYakitModal({
                                        type: "white",
                                        title: "WebFuzzer 爆破动画演示",
                                        width: 480,
                                        content: <BlastingAnimationAemonstration></BlastingAnimationAemonstration>,
                                        footer: null,
                                        centered: true,
                                        destroyOnClose: true
                                    })
                                }}
                            >
                                爆破示例
                                <QuestionMarkCircleIcon />
                            </div>
                            {loading && (
                                <div className={classNames(styles["spinning-text"], styles["display-flex"])}>
                                    <YakitSpin size={"small"} style={{width: "auto"}} />
                                    sending packets
                                </div>
                            )}

                            {onlyOneResponse && httpResponse.Ok && checkRedirect && (
                                <YakitButton
                                    onClick={() => {
                                        setLoading(true)
                                        const redirectRequestProps: RedirectRequestParams = {
                                            Request: requestRef.current,
                                            Response: new Buffer(httpResponse.ResponseRaw).toString("utf8"),
                                            IsHttps: advancedConfigValue.isHttps,
                                            IsGmTLS: advancedConfigValue.isGmTLS,
                                            PerRequestTimeoutSeconds: advancedConfigValue.timeout,
                                            Proxy: advancedConfigValue.proxy.join(","),
                                            Extractors: advancedConfigValue.extractors,
                                            Matchers: advancedConfigValue.matchers,
                                            MatchersCondition: advancedConfigValue.matchersCondition,
                                            HitColor:
                                                advancedConfigValue.filterMode === "onlyMatch"
                                                    ? advancedConfigValue.hitColor
                                                    : "",
                                            Params: advancedConfigValue.params || []
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
                            <FuzzerExtraShow
                                droppedCount={droppedCount}
                                advancedConfigValue={advancedConfigValue}
                                onlyOneResponse={onlyOneResponse}
                                httpResponse={httpResponse}
                            />
                        </div>
                        <div className={styles["fuzzer-heard-right"]}>
                            <ShareImportExportData
                                module='fuzzer'
                                getShareContent={getShareContent}
                                getFuzzerRequestParams={getFuzzerRequestParams}
                            />
                            <Divider type='vertical' style={{margin: 8}} />
                            <YakitDropdownMenu
                                menu={{
                                    data: [
                                        {key: "pathTemplate", label: "生成为 Path 模板"},
                                        {key: "rawTemplate", label: "生成为 Raw 模板"}
                                    ],
                                    onClick: ({key}) => {
                                        switch (key) {
                                            case "pathTemplate":
                                                handleSkipPluginDebuggerPage("path")
                                                break
                                            case "rawTemplate":
                                                handleSkipPluginDebuggerPage("raw")
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
                                <YakitButton type='primary' icon={<OutlineCodeIcon />}>
                                    生成 Yaml 模板
                                </YakitButton>
                            </YakitDropdownMenu>
                        </div>
                    </div>
                    <YakitResizeBox
                        firstMinSize={380}
                        secondMinSize={480}
                        isShowDefaultLineStyle={false}
                        style={{overflow: "hidden"}}
                        lineStyle={{display: firstFull || secondFull ? "none" : ""}}
                        secondNodeStyle={{padding: firstFull ? 0 : undefined, display: firstFull ? "none" : ""}}
                        firstNodeStyle={{padding: secondFull ? 0 : undefined, display: secondFull ? "none" : ""}}
                        {...ResizeBoxProps}
                        firstNode={
                            <WebFuzzerNewEditor
                                ref={webFuzzerNewEditorRef}
                                refreshTrigger={refreshTrigger}
                                request={requestRef.current}
                                setRequest={onSetRequest}
                                isHttps={advancedConfigValue.isHttps}
                                hotPatchCode={hotPatchCodeRef.current}
                                hotPatchCodeWithParamGetter={hotPatchCodeWithParamGetterRef.current}
                                setHotPatchCode={setHotPatchCode}
                                setHotPatchCodeWithParamGetter={setHotPatchCodeWithParamGetter}
                                firstNodeExtra={firstNodeExtra}
                            />
                        }
                        secondNode={
                            <div ref={secondNodeRef} style={{height: "100%", overflow: "hidden"}}>
                                {onlyOneResponse ? (
                                    <ResponseViewer
                                        isHttps={advancedConfigValue.isHttps}
                                        ref={responseViewerRef}
                                        fuzzerResponse={httpResponse}
                                        defaultResponseSearch={defaultResponseSearch}
                                        system={props.system}
                                        showMatcherAndExtraction={showMatcherAndExtraction}
                                        setShowMatcherAndExtraction={setShowMatcherAndExtraction}
                                        showExtra={showExtra}
                                        setShowExtra={setShowExtra}
                                        matcherValue={{
                                            hitColor: advancedConfigValue.hitColor || "red",
                                            matchersCondition: advancedConfigValue.matchersCondition || "and",
                                            matchersList: advancedConfigValue.matchers || [],
                                            filterMode: advancedConfigValue.filterMode || "drop"
                                        }}
                                        extractorValue={{
                                            extractorList: advancedConfigValue.extractors || []
                                        }}
                                        defActiveKey={activeKey}
                                        defActiveType={activeType}
                                        onSaveMatcherAndExtraction={(matcher, extractor) => {
                                            setAdvancedConfigValue({
                                                ...advancedConfigValue,
                                                filterMode: matcher.filterMode,
                                                hitColor: matcher.hitColor || "red",
                                                matchersCondition: matcher.matchersCondition,
                                                matchers: matcher.matchersList,
                                                extractors: extractor.extractorList
                                            })
                                        }}
                                        webFuzzerValue={StringToUint8Array(requestRef.current)}
                                        showResponseInfoSecondEditor={showResponseInfoSecondEditor}
                                        setShowResponseInfoSecondEditor={setShowResponseInfoSecondEditor}
                                        secondNodeTitle={secondNodeTitle}
                                        secondNodeExtra={secondNodeExtra}
                                    />
                                ) : (
                                    <div
                                        className={classNames(styles["resize-card"], styles["resize-card-second"])}
                                        style={{display: firstFull ? "none" : ""}}
                                    >
                                        <div className={classNames(styles["resize-card-heard"])}>
                                            <div className={styles["resize-card-heard-title"]}>{secondNodeTitle()}</div>
                                            <div className={styles["resize-card-heard-extra"]}></div>
                                            {secondNodeExtra()}
                                        </div>
                                        {cachedTotal >= 1 ? (
                                            <>
                                                {showSuccess && (
                                                    <HTTPFuzzerPageTable
                                                        // onSendToWebFuzzer={onSendToWebFuzzer}
                                                        success={showSuccess}
                                                        data={successFuzzer}
                                                        setExportData={setExportData}
                                                        query={query}
                                                        setQuery={setQuery}
                                                        extractedMap={extractedMap}
                                                        isEnd={loading}
                                                        pageId={props.id}
                                                        moreLimtAlertMsg={
                                                            <div style={{fontSize: 12}}>
                                                                响应数量超过{fuzzerTableMaxData}
                                                                ，为避免前端渲染压力过大，这里将丢弃部分数据包进行展示，请点击
                                                                <YakitButton
                                                                    type='text'
                                                                    onClick={() => {
                                                                        setShowAllDataRes(true)
                                                                    }}
                                                                    style={{padding: 0}}
                                                                >
                                                                    查看全部
                                                                </YakitButton>
                                                                查看所有数据
                                                            </div>
                                                        }
                                                        tableKeyUpDownEnabled={!showAllDataRes}
                                                        fuzzerTableMaxData={fuzzerTableMaxData}
                                                    />
                                                )}
                                                {!showSuccess && (
                                                    <HTTPFuzzerPageTable
                                                        success={showSuccess}
                                                        data={failedFuzzer}
                                                        query={query}
                                                        setQuery={setQuery}
                                                        isEnd={loading}
                                                        extractedMap={extractedMap}
                                                        pageId={props.id}
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
                                    </div>
                                )}
                            </div>
                        }
                    />
                </div>
            </div>
            <React.Suspense fallback={<>loading...</>}>
                <ResponseAllDataCard
                    runtimeId={runtimeId}
                    showAllDataRes={showAllDataRes}
                    setShowAllDataRes={() => setShowAllDataRes(false)}
                />
            </React.Suspense>
        </>
    )
}
export default HTTPFuzzerPage

export interface ContextMenuProp {
    text?: string
    scriptName: string
}
/** @name 自定义右键菜单执行组件 */
export const ContextMenuExecutor: React.FC<ContextMenuProp> = (props) => {
    const {scriptName, text} = props

    const [loading, setLoading] = useState<boolean>(true)
    const [value, setValue] = useState<string>("")
    useEffect(() => {
        ipcRenderer
            .invoke("Codec", {Text: text, ScriptName: scriptName})
            .then((result: {Result: string}) => {
                setValue(result.Result)
            })
            .catch((e) => {
                yakitNotify("error", `Codec ${e}`)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    }, [])

    return (
        <YakitSpin spinning={loading} style={{width: "100%", height: "100%"}}>
            <div style={{height: "100%"}}>
                <YakitEditor fontSize={14} type={"text"} readOnly={true} value={value} />
            </div>
        </YakitSpin>
    )
}

interface FuzzerExtraShowProps {
    droppedCount: number
    advancedConfigValue: AdvancedConfigValueProps
    onlyOneResponse: boolean
    httpResponse: FuzzerResponse
}
export const FuzzerExtraShow: React.FC<FuzzerExtraShowProps> = React.memo((props) => {
    const {droppedCount, advancedConfigValue, onlyOneResponse, httpResponse} = props
    return (
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
                <YakitTag color='danger' className={classNames(styles["actualHost-text"], "content-ellipsis")}>
                    真实Host:{advancedConfigValue.actualHost}
                </YakitTag>
            )}
            {onlyOneResponse && (
                <>
                    {httpResponse.MatchedByMatcher && <YakitTag color='success'>匹配成功</YakitTag>}
                    {!httpResponse.MatchedByMatcher && advancedConfigValue.matchers?.length > 0 && (
                        <YakitTag color='danger'>匹配失败</YakitTag>
                    )}
                </>
            )}
        </div>
    )
})
interface SecondNodeExtraProps {
    rsp: FuzzerResponse
    onlyOneResponse: boolean
    cachedTotal: number
    valueSearch: string
    onSearchValueChange: (s: string) => void
    onSearch: () => void
    successFuzzer: FuzzerResponse[]
    failedFuzzer: FuzzerResponse[]
    secondNodeSize?: Size
    query?: HTTPFuzzerPageTableQuery
    setQuery: (h: HTTPFuzzerPageTableQuery) => void
    sendPayloadsType: string
    size?: YakitButtonProp["size"]
    setShowExtra: (b: boolean) => void
    showResponseInfoSecondEditor: boolean
    setShowResponseInfoSecondEditor: (b: boolean) => void
    showSuccess?: boolean
    retrySubmit?: () => void
    isShowMatch?: boolean
    matchSubmit?: () => void
    pageId?: string
    extractedMap?: Map<string, string>
    noPopconfirm?: boolean
    retryNoPopconfirm?: boolean
    cancelCurrentHTTPFuzzer?: () => void
    resumeAndPause?: () => void
}

/**
 * @description 右边的返回内容 头部 extra
 */
export const SecondNodeExtra: React.FC<SecondNodeExtraProps> = React.memo((props) => {
    const {
        rsp,
        onlyOneResponse,
        cachedTotal,
        valueSearch,
        onSearchValueChange,
        onSearch,
        successFuzzer,
        failedFuzzer,
        secondNodeSize,
        query,
        setQuery,
        sendPayloadsType,
        size = "small",
        setShowExtra,
        showResponseInfoSecondEditor,
        setShowResponseInfoSecondEditor,
        showSuccess = true,
        retrySubmit,
        isShowMatch = false,
        matchSubmit,
        extractedMap,
        pageId,
        noPopconfirm = true,
        retryNoPopconfirm = true,
        cancelCurrentHTTPFuzzer,
        resumeAndPause
    } = props

    const [color, setColor] = useState<string[]>()
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
        setColor(query?.Color)
        setBodyLength({
            afterBodyLength: query?.afterBodyLength,
            beforeBodyLength: query?.beforeBodyLength
            // bodyLengthUnit: query?.bodyLengthUnit || "B"
        })
    }, [query])

    // 导出数据的回调
    useEffect(() => {
        emiter.on("onGetExportFuzzerCallBack", onGetExportFuzzerCallBackEvent)
        return () => {
            emiter.off("onGetExportFuzzerCallBack", onGetExportFuzzerCallBackEvent)
        }
    }, [])

    const onGetExportFuzzerCallBackEvent = useMemoizedFn((v) => {
        try {
            const obj: {listTable: any; type: "all" | "payload"; pageId: string} = JSON.parse(v)
            if (obj.pageId === pageId) {
                const {listTable, type} = obj
                const newListTable = listTable.map((item) => ({
                    ...item,
                    RequestRaw: StringToUint8Array(item.RequestRaw),
                    ResponseRaw: StringToUint8Array(item.ResponseRaw)
                }))
                if (type === "all") {
                    exportHTTPFuzzerResponse(newListTable, extractedMap)
                } else {
                    exportPayloadResponse(newListTable)
                }
            }
        } catch (error) {}
    })

    // const onViewExecResults = useMemoizedFn(() => {
    //     showYakitModal({
    //         title: "提取结果",
    //         width: "60%",
    //         footer: <></>,
    //         content: <ExtractionResultsContent list={rsp.ExtractedResults} />
    //     })
    // })

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
            <div className={styles["fuzzer-secondNode-extra"]}>
                {!rsp.IsTooLargeResponse ? (
                    <>
                        {+(secondNodeSize?.width || 0) >= 610 && searchNode}
                        {+(secondNodeSize?.width || 0) < 610 && (
                            <YakitPopover content={searchNode}>
                                <YakitButton icon={<SearchIcon />} size={size} type='outline2' />
                            </YakitPopover>
                        )}
                        <Divider type='vertical' style={{margin: 0, top: 1}} />
                        <ChromeSvgIcon
                            className={styles["extra-chrome-btn"]}
                            onClick={() => {
                                showResponseViaResponseRaw(rsp.ResponseRaw || "")
                            }}
                        />
                        {((rsp.Payloads && rsp.Payloads.length > 0) ||
                            rsp.ExtractedResults.filter((i) => i.Key !== "" || i.Value !== "").length > 0) && (
                            <YakitButton type='outline2' size={size} onClick={() => setShowExtra(true)}>
                                查看提取结果
                            </YakitButton>
                        )}
                    </>
                ) : (
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
                                            .invoke("is-file-exists", rsp.TooLargeResponseHeaderFile)
                                            .then((flag: boolean) => {
                                                if (flag) {
                                                    openABSFileLocated(rsp.TooLargeResponseHeaderFile)
                                                } else {
                                                    failed("目标文件已不存在!")
                                                }
                                            })
                                            .catch(() => {})
                                        break
                                    case "tooLargeResponseBodyFile":
                                        ipcRenderer
                                            .invoke("is-file-exists", rsp.TooLargeResponseBodyFile)
                                            .then((flag: boolean) => {
                                                if (flag) {
                                                    openABSFileLocated(rsp.TooLargeResponseBodyFile)
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
                )}
                <YakitButton
                    type='primary'
                    onClick={() => {
                        analyzeFuzzerResponse(rsp)
                    }}
                    size={size}
                >
                    详情
                </YakitButton>
                <Tooltip title={showResponseInfoSecondEditor ? "隐藏响应信息" : "显示响应信息"}>
                    <YakitButton
                        type='text2'
                        size='small'
                        icon={<OutlineAnnotationIcon />}
                        isActive={showResponseInfoSecondEditor}
                        onClick={() => {
                            setRemoteValue(HTTP_PACKET_EDITOR_Response_Info, `${!showResponseInfoSecondEditor}`)
                            setShowResponseInfoSecondEditor(!showResponseInfoSecondEditor)
                        }}
                    />
                </Tooltip>
            </div>
        )
    }
    if (!onlyOneResponse && cachedTotal > 1 && showSuccess) {
        const searchNode = (
            <YakitInput.Search
                size={size === "small" ? "small" : "middle"}
                placeholder='请输入关键词搜索'
                value={keyWord}
                onChange={(e) => {
                    setKeyWord(e.target.value)
                }}
                style={{minWidth: 130}}
                onSearch={(v) => {
                    setQuery({
                        ...query,
                        keyWord: v
                    })
                    setKeyWord(v)
                }}
                onPressEnter={(e) => {
                    e.preventDefault()
                    setQuery({
                        ...query,
                        keyWord: keyWord
                    })
                }}
            />
        )

        return (
            <div className={styles["fuzzer-secondNode-extra"]}>
                {+(secondNodeSize?.width || 0) >= 700 && searchNode}
                {+(secondNodeSize?.width || 0) < 700 && (
                    <YakitPopover
                        content={searchNode}
                        onVisibleChange={(b) => {
                            if (!b) {
                                setQuery({
                                    ...query,
                                    keyWord: keyWord
                                })
                            }
                        }}
                    >
                        <YakitButton
                            icon={<OutlineSearchIcon />}
                            size={size}
                            type='outline2'
                            isHover={!!query?.keyWord}
                        />
                    </YakitPopover>
                )}
                <YakitPopover
                    content={
                        <div className={styles["second-node-search-content"]}>
                            <div className={styles["second-node-search-item"]}>
                                <span>标注颜色</span>
                                <YakitSelect
                                    size='small'
                                    mode='tags'
                                    options={availableColors.map((i) => ({value: i.color, label: i.render}))}
                                    allowClear
                                    value={color}
                                    onChange={setColor}
                                ></YakitSelect>
                            </div>
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
                                StatusCode: statusCode,
                                Color: color
                            })
                        }
                    }}
                >
                    <YakitButton
                        icon={<OutlineFilterIcon />}
                        size={size}
                        type='outline2'
                        isHover={
                            !!(
                                (query?.StatusCode?.length || 0) > 0 ||
                                query?.afterBodyLength ||
                                query?.beforeBodyLength ||
                                (query?.Color?.length || 0) > 0
                            )
                        }
                    />
                </YakitPopover>

                <Divider type='vertical' style={{margin: 0, top: 1}} />

                {isShowMatch && (
                    <>
                        {+(secondNodeSize?.width || 0) >= 610 ? (
                            <>
                                {noPopconfirm ? (
                                    <YakitButton
                                        type='outline2'
                                        size={size}
                                        onClick={() => {
                                            matchSubmit && matchSubmit()
                                        }}
                                    >
                                        仅匹配
                                    </YakitButton>
                                ) : (
                                    <YakitPopconfirm
                                        title={"操作仅匹配会结束暂停状态，是否确定操作？"}
                                        onConfirm={() => {
                                            cancelCurrentHTTPFuzzer && cancelCurrentHTTPFuzzer()
                                            matchSubmit && matchSubmit()
                                        }}
                                        placement='top'
                                    >
                                        <YakitButton type='outline2' size={size}>
                                            仅匹配
                                        </YakitButton>
                                    </YakitPopconfirm>
                                )}
                            </>
                        ) : (
                            <>
                                {noPopconfirm ? (
                                    <Tooltip title='仅匹配'>
                                        <YakitButton
                                            type='outline2'
                                            size={size}
                                            icon={<OutlinePlugsIcon />}
                                            onClick={() => {
                                                matchSubmit && matchSubmit()
                                            }}
                                        />
                                    </Tooltip>
                                ) : (
                                    <YakitPopconfirm
                                        title={"操作仅匹配会结束暂停状态，是否确定操作？"}
                                        onConfirm={() => {
                                            cancelCurrentHTTPFuzzer && cancelCurrentHTTPFuzzer()
                                            matchSubmit && matchSubmit()
                                        }}
                                        placement='top'
                                    >
                                        <Tooltip title='仅匹配'>
                                            <YakitButton type='outline2' size={size} icon={<OutlinePlugsIcon />} />
                                        </Tooltip>
                                    </YakitPopconfirm>
                                )}
                            </>
                        )}
                    </>
                )}

                {+(secondNodeSize?.width || 0) >= 610 ? (
                    <YakitButton
                        type='outline2'
                        size={size}
                        onClick={() => {
                            if (successFuzzer.length === 0) {
                                showYakitModal({
                                    title: "无 Web Fuzzer Response 以供提取信息",
                                    content: <></>,
                                    footer: null
                                })
                                return
                            }
                            setResponseExtractorVisible(true)
                        }}
                    >
                        提取响应数据
                    </YakitButton>
                ) : (
                    <Tooltip title='提取响应数据'>
                        <YakitButton
                            type='outline2'
                            size={size}
                            icon={<OutlineBeakerIcon />}
                            onClick={() => {
                                if (successFuzzer.length === 0) {
                                    showYakitModal({
                                        title: "无 Web Fuzzer Response 以供提取信息",
                                        content: <></>,
                                        footer: null
                                    })
                                    return
                                }
                                setResponseExtractorVisible(true)
                            }}
                        />
                    </Tooltip>
                )}
                {+(secondNodeSize?.width || 0) >= 610 ? (
                    <YakitPopover
                        title={"导出数据"}
                        trigger={["click"]}
                        content={
                            <>
                                <Space>
                                    <YakitButton
                                        size={size}
                                        type={"primary"}
                                        onClick={() => {
                                            emiter.emit(
                                                "onGetExportFuzzer",
                                                JSON.stringify({
                                                    pageId,
                                                    type: "all"
                                                })
                                            )
                                        }}
                                    >
                                        导出所有请求
                                    </YakitButton>
                                    <YakitButton
                                        size={size}
                                        type={"primary"}
                                        onClick={() => {
                                            emiter.emit(
                                                "onGetExportFuzzer",
                                                JSON.stringify({
                                                    pageId,
                                                    type: "payload"
                                                })
                                            )
                                        }}
                                    >
                                        仅导出 Payload
                                    </YakitButton>
                                </Space>
                            </>
                        }
                    >
                        <YakitButton type='outline2' size={size}>
                            导出数据
                        </YakitButton>
                    </YakitPopover>
                ) : (
                    <YakitPopover
                        title={"导出数据"}
                        trigger={["click"]}
                        content={
                            <>
                                <Space>
                                    <YakitButton
                                        size={size}
                                        type={"primary"}
                                        onClick={() => {
                                            emiter.emit(
                                                "onGetExportFuzzer",
                                                JSON.stringify({
                                                    pageId,
                                                    type: "all"
                                                })
                                            )
                                        }}
                                    >
                                        导出所有请求
                                    </YakitButton>
                                    <YakitButton
                                        size={size}
                                        type={"primary"}
                                        onClick={() => {
                                            emiter.emit(
                                                "onGetExportFuzzer",
                                                JSON.stringify({
                                                    pageId,
                                                    type: "payload"
                                                })
                                            )
                                        }}
                                    >
                                        仅导出 Payload
                                    </YakitButton>
                                </Space>
                            </>
                        }
                    >
                        <Tooltip title='导出数据'>
                            <YakitButton type='outline2' icon={<OutlineExportIcon />} size={size} />
                        </Tooltip>
                    </YakitPopover>
                )}

                <YakitModal
                    title='提取响应数据包中内容'
                    onCancel={() => setResponseExtractorVisible(false)}
                    visible={responseExtractorVisible}
                    width='80%'
                    maskClosable={false}
                    footer={null}
                    closable={true}
                    bodyStyle={{padding: 0}}
                >
                    <WebFuzzerResponseExtractor responses={successFuzzer} sendPayloadsType={sendPayloadsType} />
                </YakitModal>
            </div>
        )
    }
    if (!onlyOneResponse && cachedTotal > 1 && !showSuccess) {
        return (
            <>
                {retryNoPopconfirm ? (
                    <YakitButton
                        type={"primary"}
                        size='small'
                        onClick={() => {
                            retrySubmit && retrySubmit()
                        }}
                        disabled={failedFuzzer.length === 0}
                    >
                        一键重试
                    </YakitButton>
                ) : (
                    // <YakitPopconfirm
                    //     title={"操作一键重试会结束暂停状态，是否确定操作？"}
                    //     onConfirm={() => {
                    //         resumeAndPause && resumeAndPause()
                    //         setTimeout(() => {
                    //             retrySubmit && retrySubmit()
                    //         }, 300)
                    //     }}
                    //     placement='top'
                    // >
                    //     <YakitButton
                    //         type={"primary"}
                    //         size='small'
                    //         disabled={failedFuzzer.length === 0}
                    //     >
                    //         一键重试
                    //     </YakitButton>
                    // </YakitPopconfirm>
                    <YakitButton type={"primary"} size='small' disabled={true}>
                        一键重试
                    </YakitButton>
                )}
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
    size?: YakitButtonProp["size"]
}

/**
 * @description 右边的返回内容 头部left内容
 */
export const SecondNodeTitle: React.FC<SecondNodeTitleProps> = React.memo((props) => {
    const {
        cachedTotal,
        rsp,
        onlyOneResponse,
        successFuzzerLength,
        failedFuzzerLength,
        showSuccess,
        setShowSuccess,
        size = "small"
    } = props

    if (onlyOneResponse) {
        if (rsp.IsTooLargeResponse) {
            return (
                <YakitTag style={{marginLeft: 8}} color='danger'>
                    超大响应
                </YakitTag>
            )
        }
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
                    size={size === "small" ? "small" : "middle"}
                    value={showSuccess}
                    onChange={(e) => {
                        setShowSuccess(e.target.value)
                    }}
                    buttonStyle='solid'
                    options={[
                        {
                            value: true,
                            label: `成功[${successFuzzerLength > 9999 ? "9999+" : successFuzzerLength}]`
                        },
                        {
                            value: false,
                            label: `失败[${failedFuzzerLength > 9999 ? "9999+" : failedFuzzerLength}]`
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
            createRoot(domNode).render(<EditorOverlayWidget rsp={rsp} />)
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

interface ResponseViewerProps {
    ref?: React.ForwardedRef<MatcherAndExtractionRefProps>
    fuzzerResponse: FuzzerResponse
    defaultResponseSearch: string
    system?: string
    showMatcherAndExtraction: boolean
    setShowMatcherAndExtraction: (b: boolean) => void
    showExtra: boolean
    setShowExtra: (b: boolean) => void
    matcherValue: MatcherValueProps
    extractorValue: ExtractorValueProps
    defActiveKey: string
    defActiveType: MatchingAndExtraction
    onSaveMatcherAndExtraction: (matcherValue: MatcherValueProps, extractorValue: ExtractorValueProps) => void
    webFuzzerValue?: Uint8Array
    isHttps?: boolean

    showResponseInfoSecondEditor: boolean
    setShowResponseInfoSecondEditor: (b: boolean) => void
    secondNodeTitle?: () => JSX.Element
    secondNodeExtra?: () => JSX.Element
}

export const ResponseViewer: React.FC<ResponseViewerProps> = React.memo(
    React.forwardRef((props, ref) => {
        const {
            fuzzerResponse,
            defaultResponseSearch,
            showExtra,
            setShowExtra,
            extractorValue,
            matcherValue,
            defActiveKey,
            defActiveType,
            onSaveMatcherAndExtraction,
            showResponseInfoSecondEditor,
            setShowResponseInfoSecondEditor,
            isHttps,
            secondNodeTitle,
            secondNodeExtra
        } = props

        const [showMatcherAndExtraction, setShowMatcherAndExtraction] = useControllableValue<boolean>(props, {
            defaultValuePropName: "showMatcherAndExtraction",
            valuePropName: "showMatcherAndExtraction",
            trigger: "setShowMatcherAndExtraction"
        })
        const [reason, setReason] = useState<string>("未知原因")

        const [activeKey, setActiveKey] = useState<string>("")
        const [activeType, setActiveType] = useState<MatchingAndExtraction>("matchers")
        useEffect(() => {
            setActiveKey(defActiveKey)
        }, [defActiveKey])
        useEffect(() => {
            setActiveType(defActiveType)
        }, [defActiveType])

        useEffect(() => {
            try {
                let r = "未知原因"
                r = fuzzerResponse!.Reason
                setReason(r)
                setShowExtra(
                    (fuzzerResponse.Payloads && fuzzerResponse.Payloads.length > 0) ||
                        fuzzerResponse.ExtractedResults.filter((i) => i.Key !== "" || i.Value !== "").length > 0
                )
            } catch (e) {}
        }, [fuzzerResponse])

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
                },
                showMatcherAndExtraction: {
                    menu: [
                        {type: "divider"},
                        {
                            key: "show-matchers",
                            label: "匹配器"
                        },
                        {
                            key: "show-extractors",
                            label: "提取器"
                        }
                    ],
                    onRun: (editor, key) => {
                        switch (key) {
                            case "show-matchers":
                                setShowMatcherAndExtraction(true)
                                setActiveType("matchers")
                                break
                            case "show-extractors":
                                setShowMatcherAndExtraction(true)
                                setActiveType("extractors")
                                break
                            default:
                                break
                        }
                    }
                }
            }
        }, [showResponseInfoSecondEditor])
        const ResizeBoxProps = useCreation(() => {
            let p = {
                firstRatio: "100%",
                secondRatio: "0%"
            }
            if (showMatcherAndExtraction) {
                p.secondRatio = "50%"
                p.firstRatio = "50%"
            }
            if (showExtra) {
                p.firstRatio = "80%"
                p.secondRatio = "20%"
            }
            return p
        }, [showMatcherAndExtraction, showExtra])
        const show = useMemo(() => showMatcherAndExtraction || showExtra, [showMatcherAndExtraction, showExtra])
        const otherEditorProps = useCreation(() => {
            const overlayWidget = {
                onAddOverlayWidget: (editor, isShow) => onAddOverlayWidget(editor, fuzzerResponse, isShow)
            }
            return overlayWidget
        }, [fuzzerResponse])
        const onClose = useMemoizedFn(() => {
            setShowMatcherAndExtraction(false)
        })

        // 一个响应的编辑器美化渲染缓存
        const [resTypeOptionVal, setResTypeOptionVal] = useState<RenderTypeOptionVal>()
        useEffect(() => {
            if (fuzzerResponse.ResponseRaw) {
                getRemoteValue(RemoteGV.WebFuzzerOneResEditorBeautifyRender).then((res) => {
                    if (!!res) {
                        setResTypeOptionVal(res)
                    } else {
                        setResTypeOptionVal(undefined)
                    }
                })
            }
        }, [fuzzerResponse])

        return (
            <>
                <YakitResizeBox
                    isVer={true}
                    lineStyle={{display: !show ? "none" : "", background: "#f0f2f5"}}
                    firstNodeStyle={{padding: !show ? 0 : undefined, background: "#f0f2f5"}}
                    firstNode={
                        <NewHTTPPacketEditor
                            language={fuzzerResponse?.DisableRenderStyles ? "text" : undefined}
                            isShowBeautifyRender={!fuzzerResponse?.IsTooLargeResponse}
                            defaultHttps={isHttps}
                            defaultSearchKeyword={defaultResponseSearch}
                            system={props.system}
                            originValue={fuzzerResponse.ResponseRaw}
                            hideSearch={true}
                            isResponse={true}
                            noHex={true}
                            // noHeader={true}
                            showDefaultExtra={false}
                            title={secondNodeTitle && secondNodeTitle()}
                            extraEnd={secondNodeExtra && secondNodeExtra()}
                            editorOperationRecord='HTTP_FUZZER_PAGE_EDITOR_RECORF_RESPONSE'
                            emptyOr={
                                !fuzzerResponse?.Ok && (
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
                                            const reason = fuzzerResponse?.Reason || "unknown"
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
                                        style={{height: "100%", backgroundColor: "#fff"}}
                                    >
                                        <>详细原因：{fuzzerResponse.Reason}</>
                                    </Result>
                                )
                            }
                            readOnly={true}
                            isAddOverlayWidget={showResponseInfoSecondEditor}
                            contextMenu={responseEditorRightMenu}
                            webFuzzerValue={props.webFuzzerValue}
                            extraEditorProps={{
                                isShowSelectRangeMenu: true
                            }}
                            typeOptionVal={resTypeOptionVal}
                            onTypeOptionVal={(typeOptionVal) => {
                                if (typeOptionVal !== undefined) {
                                    setResTypeOptionVal(typeOptionVal)
                                    setRemoteValue(RemoteGV.WebFuzzerOneResEditorBeautifyRender, typeOptionVal)
                                } else {
                                    setResTypeOptionVal(undefined)
                                    setRemoteValue(RemoteGV.WebFuzzerOneResEditorBeautifyRender, "")
                                }
                            }}
                            {...otherEditorProps}
                        />
                    }
                    secondNode={
                        <>
                            {showMatcherAndExtraction ? (
                                <MatcherAndExtraction
                                    ref={ref}
                                    onClose={onClose}
                                    onSave={onSaveMatcherAndExtraction}
                                    httpResponse={Uint8ArrayToString(fuzzerResponse.ResponseRaw)}
                                    matcherValue={matcherValue}
                                    extractorValue={extractorValue}
                                    defActiveKey={activeKey}
                                    defActiveType={activeType}
                                />
                            ) : (
                                <></>
                            )}
                            {showExtra ? (
                                <ResponseViewerSecondNode
                                    fuzzerResponse={fuzzerResponse}
                                    onClose={() => setShowExtra(false)}
                                />
                            ) : (
                                <></>
                            )}
                        </>
                    }
                    secondNodeStyle={{
                        display: show ? "" : "none",
                        padding: 0,
                        border: "1px solid rgb(240, 240, 240)",
                        borderRadius: "0px 0px 0px 4px"
                    }}
                    lineDirection='bottom'
                    secondMinSize={showMatcherAndExtraction ? 300 : 100}
                    {...ResizeBoxProps}
                />
            </>
        )
    })
)

interface ResponseViewerSecondNodeProps {
    fuzzerResponse: FuzzerResponse
    onClose: () => void
}
type tabType = "payload" | "extractContent"
const ResponseViewerSecondNode: React.FC<ResponseViewerSecondNodeProps> = React.memo((props) => {
    const {fuzzerResponse, onClose} = props
    const [type, setType] = useState<tabType>("payload")
    const option = useMemo(() => {
        return [
            {
                icon: <OutlinePayloadIcon />,
                value: "payload",
                label: "Payload"
            },
            {
                icon: <OutlineBeakerIcon />,
                value: "extractContent",
                label: "提取内容"
            }
        ]
    }, [])
    return (
        <div className={styles["payload-extract-content"]}>
            <div className={styles["payload-extract-content-heard"]}>
                <div className={styles["payload-extract-content-heard-tab"]}>
                    {option.map((item) => (
                        <div
                            key={item.value}
                            className={classNames(styles["payload-extract-content-heard-tab-item"], {
                                [styles["payload-extract-content-heard-tab-item-active"]]: type === item.value
                            })}
                            onClick={() => {
                                setType(item.value as tabType)
                            }}
                        >
                            <span className={styles["tab-icon"]}>{item.icon}</span>
                            {item.label}
                        </div>
                    ))}
                </div>
                <YakitButton type='text2' icon={<OutlineXIcon />} size='small' onClick={() => onClose()} />
            </div>
            <div className={styles["payload-extract-content-body"]} style={{display: type === "payload" ? "" : "none"}}>
                {fuzzerResponse.Payloads?.map((item, index) => <p key={index}>{item}</p>)}
                {fuzzerResponse.Payloads?.length === 0 && "暂无"}
            </div>
            <div
                className={classNames(styles["payload-extract-content-body"], "yakit-descriptions")}
                style={{display: type === "extractContent" ? "" : "none", padding: 0}}
            >
                <Descriptions bordered size='small' column={2}>
                    {fuzzerResponse.ExtractedResults.map((item, index) => (
                        <Descriptions.Item label={<YakitCopyText showText={item.Key} />} span={2} key={index}>
                            {item.Value ? <YakitCopyText showText={item.Value} /> : ""}
                        </Descriptions.Item>
                    ))}
                </Descriptions>

                {fuzzerResponse.ExtractedResults?.length === 0 && "暂无"}
            </div>
        </div>
    )
})

// 爆破动画演示
interface BlastingAnimationAemonstrationProps {}
const BlastingAnimationAemonstration: React.FC<BlastingAnimationAemonstrationProps> = React.memo((props) => {
    const [animationType, setAnimationType] = useState<string>("id")

    const [animationResources, setAnimationResources] = useState<string>(blastingIdmp4)

    useEffect(() => {
        if (animationType === "id") {
            setAnimationResources(blastingIdmp4)
        } else if (animationType === "pwd") {
            setAnimationResources(blastingPwdmp4)
        } else if (animationType === "count") {
            setAnimationResources(blastingCountmp4)
        }
    }, [animationType])

    return (
        <div className={styles["blasting-animation-aemonstration"]}>
            <YakitRadioButtons
                size='large'
                buttonStyle='solid'
                value={animationType}
                options={[
                    {
                        value: "id",
                        label: "爆破 ID"
                    },
                    {
                        value: "pwd",
                        label: "爆破密码"
                    },
                    {
                        value: "count",
                        label: "爆破账号"
                    }
                ]}
                onChange={(e) => setAnimationType(e.target.value)}
            />
            <div className={styles["animation-cont-wrap"]}>
                <video src={animationResources} autoPlay loop></video>
            </div>
        </div>
    )
})
