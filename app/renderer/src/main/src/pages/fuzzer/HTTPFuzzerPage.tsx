import React, {CSSProperties, useEffect, useLayoutEffect, useMemo, useRef, useState, createRef} from "react"
import {Form, Result, Space, Popover, Tooltip, Divider, Descriptions} from "antd"
import {
    IMonacoEditor,
    NewHTTPPacketEditor,
    HTTP_PACKET_EDITOR_Response_Info,
    RenderTypeOptionVal
} from "../../utils/editors"
import {showDrawer} from "../../utils/showModal"
import {monacoEditorWrite} from "./fuzzerTemplates"
import {QueryFuzzerLabelResponseProps, StringFuzzer, StringFuzzerRef} from "./StringFuzzer"
import {CodingPopover, FuzzerResponseToHTTPFlowDetail} from "../../components/HTTPFlowDetail"
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
import {exportHTTPFuzzerResponse, exportPayloadResponse, exportExtractedDataResponse} from "./HTTPFuzzerPageExport"
import {StringToUint8Array, Uint8ArrayToString} from "../../utils/str"
import {PacketScanButton} from "@/pages/packetScanner/DefaultPacketScanGroup"
import styles from "./HTTPFuzzerPage.module.scss"
import {ShareImportExportData} from "./components/ShareImportExportData"
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    ChromeSvgIcon,
    ClockIcon,
    SearchIcon,
    StopIcon,
    ArrowsRetractIcon,
    ArrowsExpandIcon,
    QuestionMarkCircleIcon
} from "@/assets/newIcon"
import classNames from "classnames"
import {PaginationSchema, genDefaultPagination} from "../invoker/schema"
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
    DurationMsInputNumber,
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
    FuzzTagMode,
    ShowResponseMatcherAndExtractionProps
} from "./HttpQueryAdvancedConfig/HttpQueryAdvancedConfigType"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {
    ExtractorValueProps,
    HTTPResponseExtractor,
    HTTPResponseMatcher,
    MatcherActiveKey,
    MatcherAndExtractionRefProps,
    MatcherAndExtractionValueProps,
    MatcherValueProps,
    MatchingAndExtraction
} from "./MatcherAndExtractionCard/MatcherAndExtractionCardType"
import {HTTPHeader} from "../mitm/MITMContentReplacerHeaderOperator"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {MatcherAndExtraction} from "./MatcherAndExtractionCard/MatcherAndExtractionCard"
import _, {throttle} from "lodash"
import {YakitRoute} from "@/enums/yakitRoute"
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
    OutlineFilterIcon,
    OutlineSwitchhorizontalIcon,
    OutlineCogIcon
} from "@/assets/icon/outline"
import emiter from "@/utils/eventBus/eventBus"
import {shallow} from "zustand/shallow"
import {usePageInfo, PageNodeItemProps, WebFuzzerPageInfoProps, getFuzzerProcessedCacheData} from "@/store/pageInfo"
import {YakitCopyText} from "@/components/yakitUI/YakitCopyText/YakitCopyText"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {openABSFileLocated, openExternalWebsite, openPacketNewWindow} from "@/utils/openWebsite"
import {PayloadGroupNodeProps, ReadOnlyNewPayload} from "../payloadManager/newPayload"
import {createRoot, Root} from "react-dom/client"
import {SolidPauseIcon, SolidPlayIcon} from "@/assets/icon/solid"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import blastingIdmp4 from "@/assets/blasting-id.mp4"
import blastingPwdmp4 from "@/assets/blasting-pwd.mp4"
import blastingCountmp4 from "@/assets/blasting-count.mp4"
import {prettifyPacketCode} from "@/utils/prettifyPacket"
import {WebFuzzerType} from "./WebFuzzerPage/WebFuzzerPageType"
import cloneDeep from "lodash/cloneDeep"

import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {defYakitAutoCompleteRef} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {YakitAutoCompleteRefProps} from "@/components/yakitUI/YakitAutoComplete/YakitAutoCompleteType"
import {availableColors} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {
    DefFuzzerTableMaxData,
    defaultAdvancedConfigShow,
    defaultPostTemplate,
    emptyFuzzer,
    defaultWebFuzzerPageInfo,
    defaultLabel,
    defaultAdvancedConfigValue
} from "@/defaultConstants/HTTPFuzzerPage"
import {KVPair} from "@/models/kv"
import {FuncBtn} from "../plugins/funcTemplate"
import {
    FuzzerConfig,
    QueryFuzzerConfigRequest,
    SaveFuzzerConfigRequest,
    apiQueryFuzzerConfig,
    apiSaveFuzzerConfig
} from "../layout/mainOperatorContent/utils"
import {GetSystemProxyResult, apiGetSystemProxy} from "@/utils/ConfigSystemProxy"
import {setClipboardText} from "@/utils/clipboard"
import {FuzzerRemoteGV} from "@/enums/fuzzer"
import {setEditorContext} from "@/utils/monacoSpec/yakEditor"
import {filterColorTag} from "@/components/TableVirtualResize/utils"
import {FuzzerConcurrentLoad, FuzzerResChartData} from "./FuzzerConcurrentLoad/FuzzerConcurrentLoad"
import useGetSetState from "../pluginHub/hooks/useGetSetState"
import {WebFuzzerDroppedProps} from "./FuzzerSequence/FuzzerSequenceType"
import {YakitCheckableTag} from "@/components/yakitUI/YakitTag/YakitCheckableTag"
import useShortcutKeyTrigger from "@/utils/globalShortcutKey/events/useShortcutKeyTrigger"
import {convertKeyboardToUIKey, registerShortcutKeyHandle} from "@/utils/globalShortcutKey/utils"
import {
    getHttpFuzzerShortcutKeyEvents,
    getStorageHttpFuzzerShortcutKeyEvents
} from "@/utils/globalShortcutKey/events/page/httpFuzzer"
import {ShortcutKeyPage} from "@/utils/globalShortcutKey/events/pageMaps"
import {useSelectionByteCount} from "@/components/yakitUI/YakitEditor/useSelectionByteCount"
import {updateConcurrentLoad} from "@/utils/duplex/duplex"
import {debugToPrintLog} from "@/utils/logCollection"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import {formatTimeYMD} from "@/utils/timeUtil"
import {type LoggerData, useLogger} from "@/hook/useLogger/useLogger"
import i18n from "@/i18n/i18n"
import {maskProxyPassword} from "../mitm/MITMServerStartForm/MITMServerStartForm"
import { ExportDataType } from "@/utils/exporter"
import { YakitDrawer } from "@/components/yakitUI/YakitDrawer/YakitDrawer"

const PluginDebugDrawer = React.lazy(() => import("./components/PluginDebugDrawer/PluginDebugDrawer"))
const WebFuzzerSynSetting = React.lazy(() => import("./components/WebFuzzerSynSetting/WebFuzzerSynSetting"))
const HTTPHistoryAnalysis = React.lazy(() => import("../hTTPHistoryAnalysis/HTTPHistoryAnalysis").then(({HTTPHistoryAnalysis}) => ({default: HTTPHistoryAnalysis})))

// 保留数组中非重复数据
type TFilterNonUnique = <T>(arr: T[]) => T[]
const filterNonUnique: TFilterNonUnique = (arr) => arr.filter((i) => arr.indexOf(i) === arr.lastIndexOf(i))

const {ipcRenderer} = window.require("electron")

const httpFuzzerLog = ({name, title, content, status}: Partial<LoggerData>) => {
    return {
        name: name || "HTTPFuzzerPage",
        title: title || "sendRequest",
        content: content || (i18n.language === "zh" ? "发送请求" : "Send Request"),
        status,
        time: formatTimeYMD(Date.now())
    }
}

const logger = (log: LoggerData) => {
    ipcRenderer.invoke("add-log", log)
}

export type AdvancedConfigShowProps = Record<Exclude<WebFuzzerType, "sequence" | "concurrency">, boolean>
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
                    randomChunkedData={i.RandomChunkedData}
                />
            </>
        ),
        bodyStyle: {paddingTop: 5}
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
    TLSHandshakeDurationMs: number
    TCPDurationMs: number
    ConnectDurationMs: number
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
    Discard: boolean

    IsAutoFixContentType: boolean
    OriginalContentType: string
    FixContentType: string
    IsSetContentTypeOptions: boolean
    RandomChunkedData: RandomChunkedResponse[]
}
export interface RandomChunkedResponse {
    /**@name 当前的 chunked index */
    Index: number
    /**@name 当前的 chunked 数据 */
    Data: Uint8Array
    /**@name 当前的 chunked 长度 */
    ChunkedLength: number
    /**@name 当前的 chunked 延迟时间 */
    CurrentChunkedDelayTime: number
    /**@name 总的发送耗时 */
    TotalDelayTime: number
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
    MaxBodySize: number
    FuzzTagMode: FuzzTagMode
    FuzzTagSyncIndex: boolean
    Proxy: string
    PerRequestTimeoutSeconds: number
    DialTimeoutSeconds: number
    BatchTarget?: Uint8Array
    ActualAddr: string
    NoFollowRedirect: boolean
    SNI: string
    OverwriteSNI: boolean
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
    DisableUseConnPool: boolean
    DisableHotPatch: boolean
    RepeatTimes: number
    Extractors: HTTPResponseExtractor[]
    Matchers: HTTPResponseMatcher[]
    MatchersCondition?: string
    IsGmTLS: boolean
    RandomJA3: boolean

    HitColor?: string
    InheritVariables?: boolean
    InheritCookies?: boolean
    /**@name 序列化的item唯一key */
    FuzzerIndex?: string
    /**@name fuzzer Tab的唯一key */
    FuzzerTabIndex?: string

    /** 是否由引擎进行丢弃包逻辑 */
    EngineDropPacket?: boolean
    // Random Chunked
    EnableRandomChunked?: boolean
    RandomChunkedMinLength?: number
    RandomChunkedMaxLength?: number
    RandomChunkedMinDelay?: number
    RandomChunkedMaxDelay?: number
}

export const showDictsAndSelect = (fun: (i: string) => any) => {
    ipcRenderer
        .invoke("GetAllPayloadGroup")
        .then((res: {Nodes: PayloadGroupNodeProps[]}) => {
            if (res.Nodes.length === 0) {
                warn(
                    i18n.language === "zh"
                        ? "暂无字典，请先添加后再使用"
                        : "No dictionary available, please add one before using"
                )
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
            failed(`${i18n.language === "zh" ? "获取字典列表失败：" : "Failed to get dictionary list:"}${e}`)
        })
        .finally()
}

export function copyAsUrl(f: {Request: string; IsHTTPS: boolean}) {
    ipcRenderer
        .invoke("ExtractUrl", f)
        .then((data: {Url: string}) => {
            setClipboardText(data.Url)
        })
        .catch((e) => {
            failed(
                i18n.language === "zh"
                    ? "复制 URL 失败：包含 Fuzz 标签可能会导致 URL 不完整"
                    : "Failed to copy URL: including Fuzz tags may result in an incomplete URL"
            )
        })
}

export const getAction = (mode) => {
    switch (mode) {
        case "drop":
            return "discard"
        case "match":
            return "retain"
        default:
            return ""
    }
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
        OverwriteSNI: value.overwriteSNI !== "auto",
        SNI: value.sNI,
        FuzzTagSyncIndex: value.fuzzTagSyncIndex,
        IsHTTPS: value.isHttps,
        IsGmTLS: value.isGmTLS,
        RandomJA3: value.randomJA3,
        MaxBodySize: value.maxBodySize * 1024 * 1024,
        Concurrent: value.concurrent,
        PerRequestTimeoutSeconds: value.timeout,
        DialTimeoutSeconds: value.dialTimeoutSeconds,
        BatchTarget: value.batchTarget || new Uint8Array(),
        NoFixContentLength: value.noFixContentLength,
        NoSystemProxy: value.noSystemProxy,
        DisableUseConnPool: value.disableUseConnPool,
        DisableHotPatch: value.disableHotPatch,
        Proxy: value.proxy ? value.proxy.join(",") : "",
        ActualAddr: value.actualHost,
        HotPatchCode: "",
        HotPatchCodeWithParamGetter: "",
        DelayMinSeconds: value.minDelaySeconds,
        DelayMaxSeconds: value.maxDelaySeconds,
        RepeatTimes: value.repeatTimes,
        EnableRandomChunked: !!value.enableRandomChunked,
        RandomChunkedMinLength: value.randomChunkedMinLength,
        RandomChunkedMaxLength: value.randomChunkedMaxLength,
        RandomChunkedMinDelay: value.randomChunkedMinDelay,
        RandomChunkedMaxDelay: value.randomChunkedMaxDelay,

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
        Matchers: [],
        //提取器
        Extractors: value.extractors
    }

    if (value.matchers?.length > 0) {
        const matchers: HTTPResponseMatcher[] = value.matchers.map((ele) => ({
            ...ele,
            Action: getAction(ele.filterMode),
            HitColor: !!getAction(ele.filterMode) ? "" : ele.HitColor //只有仅匹配才传颜色
        }))
        fuzzerRequests.Matchers = matchers
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

export const newWebFuzzerTab = (params: {
    isHttps?: boolean
    request?: string
    downstreamProxyStr?: string
    shareContent?: string
    openFlag: boolean
}) => {
    return ipcRenderer
        .invoke("send-to-tab", {
            type: "fuzzer",
            data: {...params}
        })
        .then(() => {
            params.openFlag && info(i18n.language === "zh" ? "发送成功" : "Sent Successfully")
        })
}

/**@description 插入 yak.fuzz 语法 */
export const onInsertYakFuzzer = (reqEditor: IMonacoEditor) => {
    const stringFuzzerRef = createRef<StringFuzzerRef>()
    
    const m = showYakitModal({
        title: i18n.language === "zh" ? "Fuzzer Tag 调试工具" : "Fuzzer Tag Debug Tool",
        width: "70%",
        footer: null,
        maskClosable: false,
        keyboard: false,
        onCancel: () => {
            //关闭弹窗取消任务
            stringFuzzerRef.current?.handleCancel();
        },
        subTitle:
            i18n.language === "zh"
                ? "调试模式适合生成或者修改 Payload，嵌套默认嵌套在最外层，可以选中位置进行嵌套，插入则单纯在光标位置插入fuzztag"
                : 'Debug mode is suitable for generating or modifying payloads. Nesting defaults to the outermost level, but you can select a position to nest. "Insert" simply inserts the fuzztag at the cursor position.',
        content: (
            <StringFuzzer
                ref={stringFuzzerRef}
                insertCallback={(template: string) => {
                    if (!template) {
                        yakitNotify(
                            "warning",
                            i18n.language === "zh"
                                ? "Payload 为空 / Fuzz 模版为空"
                                : "Payload is empty / Fuzz template is empty"
                        )
                    } else {
                        if (reqEditor && template) {
                            reqEditor.trigger("keyboard", "type", {
                                text: template
                            })
                        } else {
                            yakitNotify("error", i18n.language === "zh" ? "BUG: 编辑器失效" : "BUG: Editor not working")
                        }
                        m.destroy()
                    }
                }}
                close={() => m.destroy()}
            />
        )
    })
}

export interface FuzzerCacheDataProps {
    proxy: string[]
    dnsServers: string[]
    etcHosts: KVPair[]
    advancedConfigShow: AdvancedConfigShowProps | null
    resNumlimit: number
    noSystemProxy: boolean
    disableUseConnPool: boolean
}
/**获取fuzzer高级配置中得 proxy dnsServers etcHosts resNumlimit*/
export const getFuzzerCacheData: () => Promise<FuzzerCacheDataProps> = () => {
    return new Promise(async (resolve, rejects) => {
        try {
            const proxy = await getRemoteValue(FuzzerRemoteGV.WEB_FUZZ_PROXY)
            const dnsServers = await getRemoteValue(FuzzerRemoteGV.WEB_FUZZ_DNS_Server_Config)
            const etcHosts = await getRemoteValue(FuzzerRemoteGV.WEB_FUZZ_DNS_Hosts_Config)
            const advancedConfigShow = await getRemoteValue(FuzzerRemoteGV.WebFuzzerAdvancedConfigShow)
            const resNumlimit = await getRemoteValue(FuzzerRemoteGV.FuzzerResMaxNumLimit)
            const noSystemProxy = await getRemoteValue(FuzzerRemoteGV.FuzzerNoSystemProxy)
            const disableUseConnPool = await getRemoteValue(FuzzerRemoteGV.FuzzerDisableUseConnPool)

            const value: FuzzerCacheDataProps = {
                proxy: !!proxy ? proxy.split(",") : [],
                dnsServers: !!dnsServers ? JSON.parse(dnsServers) : [],
                etcHosts: !!etcHosts ? JSON.parse(etcHosts) : [],
                advancedConfigShow: !!advancedConfigShow ? JSON.parse(advancedConfigShow) : null,
                resNumlimit: !!resNumlimit ? JSON.parse(resNumlimit) : DefFuzzerTableMaxData,
                noSystemProxy: noSystemProxy === "true",
                disableUseConnPool: disableUseConnPool === "true"
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
/*LINK - app\renderer\src\main\src\defaultConstants\HTTPFuzzerPage.ts*/
/*为避免文件相互引用造成数据问题,请将 HTTPFuzzerPage 页面的常用变量放在 app\renderer\src\main\src\defaultConstants\HTTPFuzzerPage.ts */
const HTTPFuzzerPage: React.FC<HTTPFuzzerPageProp> = (props) => {
    const {queryPagesDataById, updatePagesDataCacheById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById,
            updatePagesDataCacheById: s.updatePagesDataCacheById
        }),
        shallow
    )
    const {t, i18n} = useI18nNamespaces(["webFuzzer", "yakitUi", "yakitRoute"])
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
    const [currentFuzzerPage, setCurrentFuzzerPage] = useGetSetState<boolean>(true)
    const [redirectedResponse, setRedirectedResponse] = useState<FuzzerResponse>()
    const [affixSearch, setAffixSearch] = useState("")
    const [defaultResponseSearch, setDefaultResponseSearch] = useState("")

    const [currentSelectId, setCurrentSelectId] = useState<number>() // 历史中选中的记录id

    const [droppedCount, setDroppedCount] = useState(0)
    // state
    const [loading, setLoading] = useState(false)
    const [loadingText, setLoadingText] = useState<string>("sending packets")

    /*
     * 内容
     * */
    const [_firstResponse, setFirstResponse, getFirstResponse] = useGetState<FuzzerResponse>(emptyFuzzer)
    const [_successCount, setSuccessCount, getSuccessCount] = useGetState(0)
    const [_failedCount, setFailedCount, getFailedCount] = useGetState(0)

    const successFuzzerRef = useRef<FuzzerResponse[]>([]) // 成功的响应
    const failedFuzzerRef = useRef<FuzzerResponse[]>([]) // 失败的响应
    const fuzzerResChartDataBufferRef = useRef<FuzzerResChartData[]>([]) // 图表数据

    const successFuzzer: FuzzerResponse[] = useMemo(() => {
        // 当 dataVersion 变化时，创建 ref.current 的一个浅拷贝
        // 这样，传递给下游组件的 prop 引用会变化，触发其更新
        return [...successFuzzerRef.current]
    }, [_successCount])
    const failedFuzzer: FuzzerResponse[] = useMemo(() => {
        // 当 dataVersion 变化时，创建 ref.current 的一个浅拷贝
        // 这样，传递给下游组件的 prop 引用会变化，触发其更新
        return [...failedFuzzerRef.current]
    }, [_failedCount])
    const fuzzerResChartData: FuzzerResChartData[] = useMemo(() => {
        // 当 dataVersion 变化时，创建 ref.current 的一个浅拷贝
        // 这样，传递给下游组件的 prop 引用会变化，触发其更新
        return [...fuzzerResChartDataBufferRef.current]
    }, [_successCount, _failedCount])

    /**/

    const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false)

    // editor Response
    const [showMatcherAndExtraction, setShowMatcherAndExtraction] = useState<boolean>(false) // Response中显示匹配和提取器
    const [showExtra, setShowExtra] = useState<boolean>(false) // Response中显示payload和提取内容
    const [showResponseInfoSecondEditor, setShowResponseInfoSecondEditor] = useState<boolean>(true)
    // second Node
    const secondNodeRef = useRef(null)
    const secondNodeSize = useSize(secondNodeRef)
    const [showSuccess, setShowSuccess] = useState<FuzzerShowSuccess>("true")
    const [query, setQuery] = useState<HTTPFuzzerPageTableQuery>()

    // Matching And Extraction
    const [activeType, setActiveType] = useState<MatchingAndExtraction>("matchers")
    const [activeKey, setActiveKey] = useState<string>("")
    const [defActiveKeyAndOrder, setDefActiveKeyAndOrder] = useState<MatcherActiveKey>({
        order: 0,
        defActiveKey: ""
    }) // 匹配器

    const requestRef = useRef<string>(initWebFuzzerPageInfo().request)
    const {setSubscribeClose, getSubscribeClose} = useSubscribeClose()
    const fuzzerRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(fuzzerRef)
    const inViewportRef = useRef<boolean>(inViewport)

    const [hex, setHex] = useState<boolean>(false)

    const hotPatchCodeRef = useRef<string>(initWebFuzzerPageInfo().hotPatchCode)
    const hotPatchCodeWithParamGetterRef = useRef<string>("")

    const proxyListRef: React.MutableRefObject<YakitAutoCompleteRefProps> = useRef<YakitAutoCompleteRefProps>({
        ...defYakitAutoCompleteRef
    })
    const [fuzzerTableMaxData, setFuzzerTableMaxData] = useState<number>(DefFuzzerTableMaxData)
    const fuzzerTableMaxDataRef = useRef<number>(fuzzerTableMaxData)

    const [visibleDrawer, setVisibleDrawer] = useState<boolean>(false)
    const [pluginDebugCode, setPluginDebugCode] = useState<string>("")

    const [onlyOneResEditor, setOnlyOneResEditor] = useState<IMonacoEditor>()
    const onlyOneResSelectionByteCount = useSelectionByteCount(onlyOneResEditor, 500)
    //流量分析页面显示
    const [trafficAnalysisVisible, setTrafficAnalysisVisible] = useState<boolean>(false)

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

    useShortcutKeyTrigger(
        "saveHistoryData*httpFuzzer",
        useMemoizedFn(() => {
            if (inViewport) {
                emiter.emit("onSaveHistoryDataHttpFuzzer")
            }
        })
    )

    useEffect(() => {
        inViewportRef.current = inViewport
        if (inViewport) {
            registerShortcutKeyHandle(ShortcutKeyPage.HTTPFuzzer)
            getStorageHttpFuzzerShortcutKeyEvents()
            onRefWebFuzzerValue()
            emiter.on("onRefWebFuzzer", onRefWebFuzzerValue)
            emiter.on("onSwitchTypeWebFuzzerPage", onFuzzerAdvancedConfigShowType)
            emiter.on("onCurrentFuzzerPage", onCurrentFuzzerPage)
        }
        return () => {
            emiter.off("onRefWebFuzzer", onRefWebFuzzerValue)
            emiter.off("onSwitchTypeWebFuzzerPage", onFuzzerAdvancedConfigShowType)
            emiter.off("onCurrentFuzzerPage", onCurrentFuzzerPage)
        }
    }, [inViewport])
    /**高级配置显示/隐藏 【序列】tab没有下列操作*/
    const onSetAdvancedConfigShow = useMemoizedFn((data) => {
        if (!inViewport) return
        try {
            const value = JSON.parse(data)
            const {type} = value
            if (type === "sequence") return
            let newValue = {
                ...advancedConfigShow
            }
            if (type === advancedConfigShowType) {
                const c = !advancedConfigShow[type]
                newValue[type] = c
            } else {
                newValue[type] = true
            }
            emiter.emit("onGetFuzzerAdvancedConfigShow", JSON.stringify({type: type, checked: newValue[type]}))
            setAdvancedConfigShow(newValue)
            setRemoteValue(FuzzerRemoteGV.WebFuzzerAdvancedConfigShow, JSON.stringify(newValue))
        } catch (error) {}
    })
    const onRefWebFuzzerValue = useMemoizedFn(() => {
        if (!inViewport) return
        getRemoteValue(FuzzerRemoteGV.WEB_FUZZ_HOTPATCH_WITH_PARAM_CODE).then((remoteData) => {
            if (!!remoteData) {
                setHotPatchCodeWithParamGetter(`${remoteData}`)
            }
        })
        onUpdatePatchCode()
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
            setCurrentFuzzerPage(true)
            const value = JSON.parse(data)
            setAdvancedConfigShowType(value.type)
        } catch (error) {}
    })
    /* 当前是否是fuzzer页面不是序列页面 */
    const onCurrentFuzzerPage = useMemoizedFn((data) => {
        if (!inViewport) return
        setCurrentFuzzerPage(data)
    })
    /**更新热加载代码 */
    const onUpdatePatchCode = useMemoizedFn(() => {
        if (!inViewport) return
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, props.id)
        if (!currentItem) return
        const hotPatchCode = currentItem.pageParamsInfo.webFuzzerPageInfo?.hotPatchCode
        setHotPatchCode(hotPatchCode || "")
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
    /**从数据中心获取页面最新得高级配置数据,目前有提取器、匹配器、重复发包、并发配置、随机延迟代码相关数据 */
    const onUpdateAdvancedConfigValue = useMemoizedFn(() => {
        if (!inViewport) return
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, props.id)
        if (!currentItem) return
        let newAdvancedConfigValue = currentItem.pageParamsInfo.webFuzzerPageInfo?.advancedConfigValue
        if (!newAdvancedConfigValue) return
        setAdvancedConfigValue({...newAdvancedConfigValue})
    })

    useEffect(() => {
        setSubscribeClose(YakitRoute.HTTPFuzzer, {
            close: {
                title: t("YakitModal.closePrompt"),
                content: (
                    <div style={{color: "var(--Colors-Use-Neutral-Text-3-Secondary)"}}>
                        {t("HTTPFuzzerPage.closeMenuPrompt")}
                    </div>
                ),
                onOkText: t("YakitButton.ok"),
                onCancelText: t("YakitButton.cancel"),
                onOk: (m) => onCloseTab(m)
            }
        })
    }, [i18n.language])

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
        ipcRenderer
            .invoke("QueryFuzzerLabel")
            .then((data: {Data: QueryFuzzerLabelResponseProps[]}) => {
                const {Data} = data
                if (Array.isArray(Data) && Data.length === 0) {
                    ipcRenderer.invoke("SaveFuzzerLabel", {
                        Data: defaultLabel
                    })
                    // 缓存标签数量 用于添加生成标签Description
                    const defaultLabelCount = defaultLabel?.length ?? 0
                    setRemoteValue(FUZZER_LABEL_LIST_NUMBER, JSON.stringify({number: defaultLabelCount}))
                } else {
                    // 获取缓存的固有标签
                    let oldFixedArr: string[] = []
                    // 获取最新的固有标签
                    let newFixedArr = defaultLabel.map((item) => item.DefaultDescription)
                    Data.forEach((item) => {
                        if (item.DefaultDescription.endsWith("-fixed")) {
                            oldFixedArr.push(item.DefaultDescription)
                        }
                    })
                    let arr = filterNonUnique([...oldFixedArr, ...newFixedArr])
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
            .catch((err) => debugToPrintLog(err))
    })

    useEffect(() => {
        // 此次重构不兼容之前数据 所以在第一次进入页面时清空
        getRemoteValue("IS_DELETE_FUZZ_LABEL")
            .then((remoteData) => {
                if (!remoteData) {
                    ipcRenderer
                        .invoke("DeleteFuzzerLabel", {})
                        .then(() => {
                            isSaveFuzzerLabelFun()
                        })
                        .catch((err) => {
                            failed(`${t("HTTPFuzzerPage.clearOldDataFailed")}${err}`)
                        })
                    setRemoteValue("IS_DELETE_FUZZ_LABEL", JSON.stringify({isDelete: false}))
                    return
                }
                isSaveFuzzerLabelFun()
            })
            .catch((err) => debugToPrintLog(err))
    }, [])

    // 定时器
    const resetResponse = useMemoizedFn(async () => {
        setFirstResponse({...emptyFuzzer})
        successFuzzerRef.current = []
        failedFuzzerRef.current = []
        updateConcurrentLoad("rps", [])
        updateConcurrentLoad("cps", [])
        fuzzerResChartDataBufferRef.current = []
        setRedirectedResponse(undefined)
        setSuccessCount(0)
        setFailedCount(0)
        if (!retryRef.current) {
            runtimeIdRef.current = ""
        }
    })

    const retryRef = useRef<boolean>(false)
    const matchRef = useRef<boolean>(false)

    const refreshRequest = useMemoizedFn(() => {
        setRefreshTrigger(!refreshTrigger)
    })

    const loadHistory = useMemoizedFn((id: number) => {
        resetResponse()
        setLoading(true)
        setDroppedCount(0)
        setFuzzerTableMaxData(advancedConfigValue.resNumlimit)
        ipcRenderer.invoke("HTTPFuzzer", {HistoryWebFuzzerId: id}, tokenRef.current).then(() => {
            ipcRenderer
                .invoke("GetHistoryHTTPFuzzerTask", {Id: id})
                .then((data: {OriginRequest: HistoryHTTPFuzzerTask}) => {
                    const {OriginRequest} = data
                    if (OriginRequest.Request === "") {
                        requestRef.current = Uint8ArrayToString(OriginRequest.RequestRaw, "utf8")
                    } else {
                        requestRef.current = OriginRequest.Request
                    }
                    onSetFuzzerConfig(OriginRequest)
                    setCurrentSelectId(id)
                    refreshRequest()
                })
        })
    })
    const onSetFuzzerConfig = useMemoizedFn((historyData: HistoryHTTPFuzzerTask) => {
        const query: QueryFuzzerConfigRequest = {
            Pagination: {
                ...genDefaultPagination(),
                Limit: 1
            },
            PageId: [props.id]
        }
        const history = {
            isHttps: historyData.IsHTTPS,
            isGmTLS: historyData.IsGmTLS,
            proxy: historyData.Proxy ? historyData.Proxy.split(",") : []
        }
        apiQueryFuzzerConfig(query)
            .then(({Data = []}) => {
                try {
                    if (Data.length > 0) {
                        const item = {
                            ...JSON.parse(Data[0].Config).pageParams
                        }
                        setAdvancedConfigValue({
                            ...defaultAdvancedConfigValue,
                            actualHost: item.actualHost,
                            params: item.params,
                            extractors: item.extractors,
                            matchers: item.matchers,
                            ...history
                        })
                    }
                } catch (error) {
                    setAdvancedConfigValue((v) => ({...v, ...history}))
                    yakitNotify("error", `${t("HTTPFuzzerPage.wfHistoryDataRestoreFailed")}${error}`)
                }
            })
            .catch((err) => {
                setAdvancedConfigValue((v) => ({...v, ...history}))
                debugToPrintLog(err)
            })
    })
    const responseViewerRef = useRef<MatcherAndExtractionRefProps>({
        validate: () => new Promise(() => {})
    })

    const onValidateHTTPFuzzer = useMemoizedFn(() => {
        logger(
            httpFuzzerLog({
                title: t("HTTPFuzzerPage.run_function_start"),
                content: "onValidateHTTPFuzzer"
            })
        )
        if (showMatcherAndExtraction && responseViewerRef.current) {
            responseViewerRef.current
                .validate()
                .then((data: MatcherAndExtractionValueProps) => {
                    setAdvancedConfigValue({
                        ...advancedConfigValue,
                        matchers: data.matcher.matchersList || [],
                        extractors: data.extractor.extractorList || []
                    })
                })
                .catch(() => {})
                .finally(() => {
                    setTimeout(() => {
                        submitToHTTPFuzzer()
                        logger(
                            httpFuzzerLog({
                                title: t("HTTPFuzzerPage.run_function_end"),
                                content: "onValidateHTTPFuzzer"
                            })
                        )
                    }, 200)
                })
        } else {
            submitToHTTPFuzzer()
            logger(
                httpFuzzerLog({
                    title: t("HTTPFuzzerPage.run_function_end"),
                    content: "onValidateHTTPFuzzer"
                })
            )
        }
    })

    const getFuzzerRequestParams = useMemoizedFn(() => {
        return {
            ...advancedConfigValueToFuzzerRequests(advancedConfigValue),
            RequestRaw: Buffer.from(requestRef.current, "utf8"), // StringToUint8Array(request, "utf8"),
            HotPatchCode: hotPatchCodeRef.current,
            HotPatchCodeWithParamGetter: hotPatchCodeWithParamGetterRef.current,
            FuzzerTabIndex: props.id,
            EngineDropPacket: true
        }
    })

    const submitToHTTPFuzzer = useMemoizedFn(() => {
        logger(
            httpFuzzerLog({
                title: t("HTTPFuzzerPage.run_function_start"),
                content: "submitToHTTPFuzzer"
            })
        )
        resetResponse()

        //  更新默认搜索
        setDefaultResponseSearch(affixSearch)

        setLoading(true)
        setDroppedCount(0)

        // FuzzerRequestProps
        const httpParams: FuzzerRequestProps = getFuzzerRequestParams()
        if (advancedConfigValue.proxy && advancedConfigValue.proxy.length > 0) {
            getProxyList(advancedConfigValue.proxy)
        }
        setRemoteValue(FuzzerRemoteGV.WEB_FUZZ_PROXY, `${advancedConfigValue.proxy}`)
        setRemoteValue(FuzzerRemoteGV.WEB_FUZZ_DNS_Server_Config, JSON.stringify(httpParams.DNSServers))
        setRemoteValue(FuzzerRemoteGV.WEB_FUZZ_DNS_Hosts_Config, JSON.stringify(httpParams.EtcHosts))
        setRemoteValue(FuzzerRemoteGV.FuzzerResMaxNumLimit, JSON.stringify(advancedConfigValue.resNumlimit))
        setRemoteValue(FuzzerRemoteGV.FuzzerNoSystemProxy, advancedConfigValue.noSystemProxy + "")
        setRemoteValue(FuzzerRemoteGV.FuzzerDisableUseConnPool, advancedConfigValue.disableUseConnPool + "")
        setFuzzerTableMaxData(advancedConfigValue.resNumlimit)

        if (retryRef.current) {
            retryRef.current = false
            const retryTaskID = failedFuzzer?.length > 0 ? failedFuzzer[0]?.TaskId : undefined
            if (typeof retryTaskID === "number") {
                const params = {...httpParams, RetryTaskID: parseInt(retryTaskID + "", 10)}
                const retryParams = _.omit(params, ["Request", "RequestRaw"])
                ipcRenderer.invoke("HTTPFuzzer", retryParams, tokenRef.current)
                setIsPause(true)
            }
        } else if (matchRef.current) {
            matchRef.current = false
            const matchTaskID = successFuzzer?.length > 0 ? successFuzzer[0]?.TaskId : undefined
            const params = {...httpParams, ReMatch: true, HistoryWebFuzzerId: matchTaskID}
            setLoadingText(t("HTTPFuzzerPage.matchingInProgress"))
            ipcRenderer.invoke("HTTPFuzzer", params, tokenRef.current)
        } else {
            ipcRenderer.invoke("HTTPFuzzer", httpParams, tokenRef.current)
        }
        onSaveHTTPFuzzerByPageId()
        logger(
            httpFuzzerLog({
                title: t("HTTPFuzzerPage.run_function_end"),
                content: "submitToHTTPFuzzer"
            })
        )
    })
    /**保存当前页面的历史数据 */
    const onSaveHTTPFuzzerByPageId = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, props.id)
        if (!currentItem) return
        const cacheData = getFuzzerProcessedCacheData([currentItem])[0]
        if (!cacheData) return
        const pageData: FuzzerConfig = {
            PageId: cacheData.id,
            Type: "page",
            Config: JSON.stringify(cacheData)
        }
        const params: SaveFuzzerConfigRequest = {
            Data: [pageData]
        }
        apiSaveFuzzerConfig(params)
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

    // 目前按钮处于继续状态
    const canPlayAgain = useMemo(() => {
        return !loading && !isPause
    }, [isPause, loading])
    // 目前按钮处于发送请求状态
    const isbuttonIsSendReqStatus = useMemo(() => {
        return !loading && isPause
    }, [loading, isPause])
    useEffect(() => {
        if (isbuttonIsSendReqStatus) {
            setLoadingText("sending packets")
        }
    }, [isbuttonIsSendReqStatus])

    const cancelCurrentHTTPFuzzer = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-HTTPFuzzer", tokenRef.current)
    })
    const dCountRef = useRef<number>(0)
    const tokenRef = useRef<string>(randomString(60))
    const taskIDRef = useRef<string>("")
    const runtimeIdRef = useRef<string>("")
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
            yakitNotify("error", `${t("HTTPFuzzerPage.fuzzTestRequestFailed")}${details}`)
        })
        let count: number = 0 // 用于数据项请求字段

        const updateData = () => {
            if (count <= 0) {
                return
            }

            if (
                failedFuzzerRef.current.length +
                    successFuzzerRef.current.length +
                    failedCount +
                    successCount +
                    fuzzerResChartDataBufferRef.current.length ===
                0
            ) {
                return
            }
            setFailedCount(failedCount)
            setSuccessCount(successCount)
        }

        const releaseQueue: FuzzerResponse[] = []
        let releaseTimer: NodeJS.Timeout | null = null
        const scheduleRelease = (item: FuzzerResponse) => {
            releaseQueue.push(item)
            if (!releaseTimer) {
                releaseTimer = setInterval(() => {
                    if (releaseQueue.length === 0) {
                        clearInterval(releaseTimer!)
                        releaseTimer = null
                        return
                    }
                    // 每次释放 20 条旧数据
                    for (let i = 0; i < 20 && releaseQueue.length > 0; i++) {
                        const obj = releaseQueue.shift()!
                        obj.RequestRaw = null as unknown as Uint8Array
                        obj.ResponseRaw = null as unknown as Uint8Array
                    }
                }, 1000)
            }
        }

        const updateDataThrottle = throttle(updateData, 500, {leading: false, trailing: true})

        ipcRenderer.on(dataToken, (e: any, data: any) => {
            taskIDRef.current = data.TaskId

            if (runtimeIdRef.current) {
                if (!runtimeIdRef.current.includes(data.RuntimeID)) {
                    runtimeIdRef.current = runtimeIdRef.current + "," + data.RuntimeID
                }
            } else {
                runtimeIdRef.current = data.RuntimeID
            }

            if (count === 0) {
                // 重置extractedMap
                reset()
            }
            let r = {
                // 6.16
                ...data,
                Headers: data.Headers || [],
                UUID: data.UUID || randomString(16), // 新版yakit,成功和失败的数据都有UUID,旧版失败的数据没有UUID,兼容
                Count: count++,
                cellClassName: ""
            } as FuzzerResponse
            if (data.MatchedByMatcher) {
                let colors = filterColorTag(data.HitColor) || undefined
                r.cellClassName = colors
            }

            // 设置第一个 response
            if (getFirstResponse().RequestRaw?.length === 0) {
                setFirstResponse(r)
            }

            if (data.Ok) {
                successCount++
                successFuzzerRef.current.push(r)
                // 超过最大显示 展示最新数据
                if (successFuzzerRef.current.length > fuzzerTableMaxDataRef.current) {
                    const oldest = successFuzzerRef.current.shift()
                    if (oldest) scheduleRelease(oldest)
                }
            } else {
                failedCount++
                failedFuzzerRef.current.push(r)
            }

            fuzzerResChartDataBufferRef.current.push({
                Count: (r.Count as number) + 1,
                TLSHandshakeDurationMs: +r.TLSHandshakeDurationMs,
                TCPDurationMs: +r.TCPDurationMs,
                ConnectDurationMs: +r.ConnectDurationMs,
                DurationMs: +r.DurationMs
            } as FuzzerResChartData)
            if (fuzzerResChartDataBufferRef.current.length > 5000) {
                fuzzerResChartDataBufferRef.current.shift()
            }

            r = null as unknown as FuzzerResponse

            if (successCount + failedCount >= 1) {
                updateDataThrottle()
            } else {
                updateData()
            }
        })

        ipcRenderer.on(endToken, () => {
            updateData()
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
            stop()
            logger(httpFuzzerLog({content: t("HTTPFuzzerPage.send_complete"), status: "end"}))
        })

        return () => {
            ipcRenderer.invoke("cancel-HTTPFuzzer", token)
            ipcRenderer.removeAllListeners(errToken)
            ipcRenderer.removeAllListeners(dataToken)
            ipcRenderer.removeAllListeners(endToken)
        }
    }, [])

    const [extractedMap, {setAll, reset}] = useMap<string, string>()
    useEffect(() => {
        ipcRenderer.on("fetch-extracted-to-table", (_, data: {type: string; extractedMap: Map<string, string>}) => {
            if (data.type === "fuzzer") {
                setExtractedMap(data.extractedMap)
            }
        })
        return () => {
            ipcRenderer.removeAllListeners("fetch-extracted-to-table")
        }
    }, [])

    useEffect(() => {
        // 监听每次发送请求里的丢弃包数量
        const handleSetDroppedCount = (content: string) => {
            try {
                const data: WebFuzzerDroppedProps = JSON.parse(content)
                // data.fuzzer_index 存在代表是序列的丢弃数据
                if (!!data.fuzzer_index) return
                if (data.fuzzer_tab_index === props.id) {
                    setDroppedCount(Number(data.discard_count) || 0)
                }
            } catch (error) {}
        }
        emiter.on("onGetDiscardPackageCount", handleSetDroppedCount)
        return () => {
            emiter.off("onGetDiscardPackageCount", handleSetDroppedCount)
        }
    }, [props.id])

    const setExtractedMap = useMemoizedFn((extractedMap: Map<string, string>) => {
        if (inViewport) setAll(extractedMap)
    })
    const onlyOneResponse = useMemo(() => {
        return !loading && failedFuzzer.length + successFuzzer.length === 1
    }, [loading, failedFuzzer, successFuzzer])

    const sendFuzzerSettingInfo = useDebounceFn(
        () => {
            const webFuzzerPageInfo: WebFuzzerPageInfoProps = {
                pageId: props.id,
                advancedConfigValue,
                request: requestRef.current,
                advancedConfigShow,
                hotPatchCode: hotPatchCodeRef.current
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
                    request: param.request,
                    hotPatchCode: param.hotPatchCode
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
            keyboard: false,
            content: (
                <HTTPFuzzerHotPatch
                    pageId={props.id}
                    initialHotPatchCode={hotPatchCodeRef.current}
                    initialHotPatchCodeWithParamGetter={hotPatchCodeWithParamGetterRef.current}
                    onInsert={(tag) => {
                        if (webFuzzerNewEditorRef.current.reqEditor)
                            monacoEditorWrite(webFuzzerNewEditorRef.current.reqEditor, tag)
                        m.destroy()
                    }}
                    onSaveCode={(code) => {
                        setHotPatchCode(code)
                    }}
                    onSaveHotPatchCodeWithParamGetterCode={(code) => {
                        setHotPatchCodeWithParamGetter(code)
                        setRemoteValue(FuzzerRemoteGV.WEB_FUZZ_HOTPATCH_WITH_PARAM_CODE, code)
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

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const cachedTotal = useMemo(
        () => successFuzzer?.length + failedFuzzer?.length,
        [successFuzzer?.length, failedFuzzer?.length]
    )

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
                failed(t("YakitNotification.loadFailed", {colon: true}) + err)
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
            fuzzTagMode: val.fuzzTagMode === undefined ? "standard" : val.fuzzTagMode,
            fuzzTagSyncIndex: !!val.fuzzTagSyncIndex,
            minDelaySeconds: val.minDelaySeconds ? Number(val.minDelaySeconds) : 0,
            maxDelaySeconds: val.maxDelaySeconds ? Number(val.maxDelaySeconds) : 0,
            timeout: val.timeout ? Number(val.timeout) : 0,
            dialTimeoutSeconds: val.dialTimeoutSeconds ? Number(val.dialTimeoutSeconds) : 0,
            repeatTimes: val.repeatTimes ? Number(val.repeatTimes) : 0,
            randomChunkedMinLength: val.randomChunkedMinLength
                ? Number(val.randomChunkedMinLength)
                : defaultAdvancedConfigValue.randomChunkedMinLength,
            randomChunkedMaxLength: val.randomChunkedMaxLength
                ? Number(val.randomChunkedMaxLength)
                : defaultAdvancedConfigValue.randomChunkedMaxLength,
            randomChunkedMinDelay: val.randomChunkedMinDelay
                ? Number(val.randomChunkedMinDelay)
                : defaultAdvancedConfigValue.randomChunkedMinDelay,
            randomChunkedMaxDelay: val.randomChunkedMaxDelay
                ? Number(val.randomChunkedMaxDelay)
                : defaultAdvancedConfigValue.randomChunkedMaxDelay
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
    const onShowResponseMatcherAndExtraction = useMemoizedFn((params: ShowResponseMatcherAndExtractionProps) => {
        try {
            const {activeType, activeKey, order} = params
            setShowMatcherAndExtraction(true)
            setActiveType(activeType)

            switch (activeType) {
                case "extractors":
                    setActiveKey(activeKey)
                    break
                case "matchers":
                    setDefActiveKeyAndOrder({
                        order: order || 0,
                        defActiveKey: activeKey
                    })
                    break
                default:
                    break
            }
        } catch (err) {
            debugToPrintLog(err)
        }
    })
    const setHotPatchCodeRef = (val) => {
        hotPatchCodeRef.current = val
        setTimeout(() => {
            if (webFuzzerNewEditorRef.current?.reqEditor) {
                setEditorContext(webFuzzerNewEditorRef.current.reqEditor, "hotPatchCode", val)
            }
        }, 500)
    }
    const setHotPatchCode = useMemoizedFn((v: string) => {
        setHotPatchCodeRef(v)
        setRefreshTrigger(!refreshTrigger)
        sendFuzzerSettingInfo()
    })
    const setHotPatchCodeWithParamGetter = useMemoizedFn((v: string) => {
        hotPatchCodeWithParamGetterRef.current = v
        setTimeout(() => {
            if (webFuzzerNewEditorRef.current?.reqEditor) {
                setEditorContext(webFuzzerNewEditorRef.current.reqEditor, "hotPatchCodeWithParam", v)
            }
        }, 500)
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
            if (element.Header.toLocaleLowerCase() === "Location".toLocaleLowerCase()) {
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
                    {t("YakitButton.beautify")}
                </YakitButton>
                <YakitCheckableTag checked={hex} onChange={setHex}>
                    HEX
                </YakitCheckableTag>
                <YakitButton
                    size='small'
                    type='primary'
                    onClick={() => {
                        hotPatchTrigger()
                    }}
                    style={{marginLeft: -8}}
                >
                    {t("HTTPFuzzerPage.hotReload")}
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
                                            ...v,
                                            Text: v.Text.trim()
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
                                        {t("HTTPFuzzerPage.buildRequest")}
                                    </YakitButton>
                                </Form.Item>
                            </Form>
                        </div>
                    }
                >
                    <YakitButton size={"small"} type={"primary"}>
                        {t("HTTPFuzzerPage.buildRequest")}
                    </YakitButton>
                </YakitPopover>
            </div>
            <div className={styles["resize-card-icon"]} onClick={() => setFirstFull(!firstFull)}>
                {firstFull ? <ArrowsRetractIcon /> : <ArrowsExpandIcon />}
            </div>
        </>
    )

    const secondNodeTitle = () => {
        return (
            <>
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
                    showConcurrentAndLoad={true}
                    selectionByteCount={onlyOneResSelectionByteCount}
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
                isHttps={advancedConfigValue.isHttps}
                request={requestRef.current}
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
                setQuery={(q) => {
                    setQuery({...q})
                }}
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
                retryNoPopconfirm={!canPlayAgain}
                cancelCurrentHTTPFuzzer={cancelCurrentHTTPFuzzer}
                resumeAndPause={resumeAndPause}
            />
            <div className={styles["resize-card-icon"]} onClick={() => setSecondFull(!secondFull)}>
                {secondFull ? <ArrowsRetractIcon /> : <ArrowsExpandIcon />}
            </div>
        </>
    )

    const getNewCurrentPage = useMemoizedFn(() => {
        logger(
            httpFuzzerLog({
                title: t("HTTPFuzzerPage.run_function_start"),
                content: "getNewCurrentPage"
            })
        )
        const params = {
            Pagination: {Limit: 1, Order: "", OrderBy: "", Page: 1},
            Keyword: "",
            FuzzerTabIndex: props.id
        }
        ipcRenderer
            .invoke("QueryHistoryHTTPFuzzerTaskEx", params)
            .then((data: {Data: HTTPFuzzerTaskDetail[]; Total: number; Pagination: PaginationSchema}) => {
                setCurrentPage(Number(data.Total) + 1)
                logger(
                    httpFuzzerLog({
                        title: t("HTTPFuzzerPage.run_function_end"),
                        content: "getNewCurrentPage"
                    })
                )
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
                setVisibleDrawer(true)
                setPluginDebugCode(YamlContent)
            } else {
                throw new Error(Status.Reason)
            }
        } catch (error) {
            yakitFailed(error + "")
        }
    }
    /**同步WF数据 */
    const onSynWF = useMemoizedFn(() => {
        const m = showYakitModal({
            title: t("HTTPFuzzerPage.syncConfig"),
            content: (
                <React.Suspense>
                    <WebFuzzerSynSetting pageId={props.id} onClose={() => m.destroy()} />
                </React.Suspense>
            ),
            onCancel: () => m.destroy(),
            footer: null,
            bodyStyle: {padding: 0}
        })
    })
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

    useShortcutKeyTrigger(
        "sendRequest*httpFuzzer",
        useMemoizedFn(() => {
            if (inViewport && isbuttonIsSendReqStatus) {
                sendRequest()
            }
        })
    )

    const {start, stop} = useLogger(
        (logFn) => {
            // 日志超过一万条，记录长度
            if (successFuzzerRef.current.length < 10000 && failedFuzzerRef.current.length < 10000) return
            logFn(
                httpFuzzerLog({
                    title: t("HTTPFuzzerPage.success_and_failure_length"),
                    content: t("HTTPFuzzerPage.success_and_failure_length", {
                        success: successFuzzerRef.current.length,
                        failed: failedFuzzerRef.current.length
                    })
                })
            )
        },
        [],
        {immediate: false}
    )

    const sendRequest = useMemoizedFn(() => {
        logger(
            httpFuzzerLog({
                status: "start",
                content: t("HTTPFuzzerPage.send_request")
            })
        )
        const {repeatTimes, resNumlimit, concurrent} = advancedConfigValue
        logger(
            httpFuzzerLog({
                title: t("HTTPFuzzerPage.parameter"),
                content: JSON.stringify({
                    repeatTimes,
                    resNumlimit,
                    concurrent
                })
            })
        )
        start()
        setRedirectedResponse(undefined)
        sendFuzzerSettingInfo()
        onValidateHTTPFuzzer()
        getNewCurrentPage()
    })

    const jumpHTTPHistoryAnalysis = useMemoizedFn(() => {
        setTrafficAnalysisVisible(true)
        // 原来的逻辑是跳转的流量分析器 现在改为httpHistoryAnalysis组件覆盖
        // const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, props.id)
        // emiter.emit(
        //     "openPage",
        //     JSON.stringify({
        //         route: YakitRoute.DB_HTTPHistoryAnalysis,
        //         params: {
        //             webFuzzer: true,
        //             runtimeId: runtimeIdRef.current.split(","),
        //             sourceType: "scan",
        //             verbose: currentItem?.pageName ? `${currentItem?.pageName}-${t("HTTPFuzzerPage.allTraffic")}` : "",
        //             pageId: currentItem?.pageId || ""
        //         }
        //     })
        // )
    })

    const getContainerSize = useSize(fuzzerRef || document.body)
    // 抽屉展示高度
    const showHeight = useMemo(() => getContainerSize?.height || 400, [getContainerSize])

    /* 流量分析遮罩层 */
    const renderHistoryAnalysis = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, props.id)
        if (!trafficAnalysisVisible || !currentItem) return
        const params = {
            webFuzzer: true,
            runtimeId: runtimeIdRef.current.split(","),
            sourceType: "scan",
            verbose: `${currentItem.pageName}-${t("HTTPFuzzerPage.allTraffic")}`,
            pageId: currentItem.pageId
        }
        return (
             <YakitDrawer
                getContainer={fuzzerRef.current || document.body}
                placement='bottom'
                mask={false}
                keyboard={false}
                height={showHeight}
                visible={true}
                onClose={() => setTrafficAnalysisVisible(false)}
                className={styles["http-traffic-analysis-overlay"]}
            >
                    <React.Suspense fallback={<YakitSpin spinning={true} />}>
                        <HTTPHistoryAnalysis
                            pageId={currentItem.pageId}
                            params={params}
                            closable={false}
                        />
                    </React.Suspense>
            </YakitDrawer>
        )
    })

    const moreLimtAlertMsg = useMemo(
        () => (
            <div style={{fontSize: 12}}>
                {t("HTTPFuzzerPage.response_overflow", {maxData: fuzzerTableMaxData})}
                <YakitButton type='text' onClick={jumpHTTPHistoryAnalysis} style={{padding: 0}}>
                    {t("HTTPFuzzerPage.trafficAnalysisMode")}
                </YakitButton>
                {t("HTTPFuzzerPage.view_all_suffix")}
            </div>
        ),
        [fuzzerTableMaxData, i18n.language]
    )
    const noMoreLimtAlertMsg = useMemo(
        () => (
            <div style={{fontSize: 12}}>
                {t("HTTPFuzzerPage.advanced_filter_suggestion")}
                <YakitButton type='text' onClick={jumpHTTPHistoryAnalysis} style={{padding: 0}}>
                    {t("YakitRoute.historyAnalyzer")}
                </YakitButton>
                {t("HTTPFuzzerPage.performAction")}
            </div>
        ),
        [i18n.language]
    )

    const [skipSaveHTTPFlow, setSkipSaveHTTPFlow] = useState<boolean>(false)
    useEffect(() => {
        if (inViewport) {
            ipcRenderer.invoke("GetGlobalNetworkConfig", {}).then((res) => {
                setSkipSaveHTTPFlow(res.SkipSaveHTTPFlow)
            })
        }
    }, [inViewport])

    return (
        <>
            <div className={styles["http-fuzzer-body"]} ref={fuzzerRef}>
                <React.Suspense fallback={<>{t("YakitSpin.loading")}...</>}>
                    <HttpQueryAdvancedConfig
                        advancedConfigValue={advancedConfigValue}
                        visible={advancedConfigVisible}
                        onInsertYakFuzzer={onInsertYakFuzzerFun}
                        onValuesChange={onGetFormValue}
                        defaultHttpResponse={
                            Uint8ArrayToString(multipleReturnsHttpResponse.ResponseRaw || new Uint8Array()) || ""
                        }
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
                        cachedTotal={cachedTotal}
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
                                            {t("YakitButton.continue")}
                                        </YakitButton>
                                    ) : (
                                        <YakitButton onClick={sendRequest} type={"primary"} size='large'>
                                            {t("YakitButton.sendRequest")}{" "}
                                            {convertKeyboardToUIKey(
                                                getHttpFuzzerShortcutKeyEvents()["sendRequest*httpFuzzer"].keys
                                            )}
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
                                        {t("YakitButton.pause")}
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
                                        {t("YakitButton.stop")}
                                    </YakitButton>
                                </>
                            )}
                            <div className={styles["fuzzer-heard-force"]}>
                                <span className={styles["fuzzer-heard-https"]}>
                                    {t("HttpQueryAdvancedConfig.force_https")}
                                </span>
                                <YakitCheckbox
                                    checked={advancedConfigValue.isHttps}
                                    onChange={(e) =>
                                        setAdvancedConfigValue({...advancedConfigValue, isHttps: e.target.checked})
                                    }
                                />
                            </div>
                            <Divider type='vertical' style={{margin: 0, top: 1}} />
                            <div className={styles["display-flex"]}>
                                <YakitPopover
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
                                        {t("YakitButton.history")}
                                    </YakitButton>
                                </YakitPopover>
                            </div>
                            <div
                                className={styles["blasting-example"]}
                                onClick={() => {
                                    const m = showYakitModal({
                                        type: "white",
                                        title: t("HTTPFuzzerPage.webFuzzerDemo"),
                                        width: 480,
                                        content: <BlastingAnimationAemonstration></BlastingAnimationAemonstration>,
                                        footer: null,
                                        centered: true,
                                        destroyOnClose: true
                                    })
                                }}
                            >
                                {t("HTTPFuzzerPage.bruteForceExample")}
                                <QuestionMarkCircleIcon />
                            </div>
                            {loading && (
                                <div className={classNames(styles["spinning-text"], styles["display-flex"])}>
                                    <YakitSpin size={"small"} style={{width: "auto"}} />
                                    {loadingText}
                                </div>
                            )}

                            {onlyOneResponse && httpResponse.Ok && checkRedirect && (
                                <YakitButton
                                    onClick={() => {
                                        setLoading(true)
                                        const redirectRequestProps: RedirectRequestParams = {
                                            Request: new Buffer(httpResponse.RequestRaw).toString("utf8"),
                                            Response: new Buffer(httpResponse.ResponseRaw).toString("utf8"),
                                            IsHttps: advancedConfigValue.isHttps,
                                            IsGmTLS: advancedConfigValue.isGmTLS,
                                            PerRequestTimeoutSeconds: advancedConfigValue.timeout,
                                            Proxy: advancedConfigValue.proxy.join(","),
                                            Extractors: advancedConfigValue.extractors,
                                            Matchers: advancedConfigValue.matchers,
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
                                    {t("HTTPFuzzerPage.followRedirects")}
                                </YakitButton>
                            )}
                            <FuzzerExtraShow
                                droppedCount={droppedCount}
                                advancedConfigValue={advancedConfigValue}
                                setAdvancedConfigValue={setAdvancedConfigValue}
                                onlyOneResponse={onlyOneResponse}
                                httpResponse={httpResponse}
                            />
                        </div>
                        <div className={styles["fuzzer-heard-right"]}>
                            {getFuzzerRequestParams && typeof getFuzzerRequestParams === "function" ? (
                                <ShareImportExportData
                                    module='fuzzer'
                                    getShareContent={getShareContent}
                                    getFuzzerRequestParams={
                                        getFuzzerRequestParams as unknown as () =>
                                            | FuzzerRequestProps[]
                                            | FuzzerRequestProps
                                    }
                                />
                            ) : null}
                            <Divider type='vertical' style={{margin: 8}} />

                            <FuncBtn
                                maxWidth={1600}
                                type='outline2'
                                icon={<OutlineSwitchhorizontalIcon />}
                                onClick={onSynWF}
                                name={t("HTTPFuzzerPage.syncConfig")}
                                style={{marginRight: 8}}
                            />
                            <YakitDropdownMenu
                                menu={{
                                    data: [
                                        {key: "pathTemplate", label: t("HTTPFuzzerPage.generatePathTemplate")},
                                        {key: "rawTemplate", label: t("HTTPFuzzerPage.generateRawTemplate")}
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
                                    {t("HTTPFuzzerPage.generateYamlTemplate")}
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
                                hex={hex}
                                isHttps={advancedConfigValue.isHttps}
                                hotPatchCode={hotPatchCodeRef.current}
                                hotPatchCodeWithParamGetter={hotPatchCodeWithParamGetterRef.current}
                                setHotPatchCode={setHotPatchCode}
                                setHotPatchCodeWithParamGetter={setHotPatchCodeWithParamGetter}
                                firstNodeExtra={firstNodeExtra}
                                pageId={props.id}
                                oneResponseValue={
                                    onlyOneResponse
                                        ? {
                                              originValue: Uint8ArrayToString(httpResponse.ResponseRaw),
                                              originalPackage: httpResponse.ResponseRaw
                                          }
                                        : undefined
                                }
                            />
                        }
                        secondNode={
                            <div ref={secondNodeRef} style={{height: "100%", overflow: "hidden"}}>
                                {onlyOneResponse ? (
                                    <ResponseViewer
                                        keepSearchName='fuzzer-response'
                                        isHttps={advancedConfigValue.isHttps}
                                        ref={responseViewerRef}
                                        fuzzerResponse={httpResponse}
                                        request={requestRef.current}
                                        defaultResponseSearch={defaultResponseSearch}
                                        system={props.system}
                                        showMatcherAndExtraction={showMatcherAndExtraction}
                                        setShowMatcherAndExtraction={setShowMatcherAndExtraction}
                                        showExtra={showExtra}
                                        setShowExtra={setShowExtra}
                                        matcherValue={{
                                            matchersList: advancedConfigValue.matchers || []
                                        }}
                                        extractorValue={{
                                            extractorList: advancedConfigValue.extractors || []
                                        }}
                                        defActiveKey={activeKey}
                                        defActiveType={activeType}
                                        defActiveKeyAndOrder={defActiveKeyAndOrder}
                                        onSaveMatcherAndExtraction={(matcher, extractor) => {
                                            setAdvancedConfigValue({
                                                ...advancedConfigValue,
                                                matchers: matcher.matchersList,
                                                extractors: extractor.extractorList
                                            })
                                        }}
                                        webFuzzerValue={requestRef.current}
                                        showResponseInfoSecondEditor={showResponseInfoSecondEditor}
                                        setShowResponseInfoSecondEditor={setShowResponseInfoSecondEditor}
                                        secondNodeTitle={secondNodeTitle}
                                        secondNodeExtra={secondNodeExtra}
                                        onSetOnlyOneResEditor={setOnlyOneResEditor}
                                    />
                                ) : (
                                    <div
                                        className={classNames(styles["resize-card"], styles["resize-card-second"])}
                                        style={{display: firstFull ? "none" : ""}}
                                    >
                                        <div className={classNames(styles["resize-card-heard"])}>
                                            <div className={styles["resize-card-heard-title"]}>{secondNodeTitle()}</div>
                                            <div className={styles["resize-card-heard-extra"]}></div>
                                            {cachedTotal >= 1 && <YakitButton
                                                type='outline2'
                                                onClick={jumpHTTPHistoryAnalysis}
                                                className={styles["resize-card-heard-btn"]}
                                            >
                                                {t("HTTPFuzzerPage.trafficAnalysisMode")}
                                            </YakitButton>}
                                            {secondNodeExtra()}
                                        </div>
                                        {cachedTotal >= 1 ? (
                                            <>
                                                {showSuccess === "true" && (
                                                    <HTTPFuzzerPageTable
                                                        // onSendToWebFuzzer={onSendToWebFuzzer}
                                                        success={true}
                                                        data={successFuzzer}
                                                        setExportData={setExportData}
                                                        query={query}
                                                        setQuery={setQuery}
                                                        extractedMap={extractedMap}
                                                        isEnd={loading}
                                                        pageId={props.id}
                                                        moreLimtAlertMsg={moreLimtAlertMsg}
                                                        noMoreLimtAlertMsg={noMoreLimtAlertMsg}
                                                        fuzzerTableMaxData={fuzzerTableMaxData}
                                                        hasExtractorRules={!!advancedConfigValue.extractors.length}
                                                    />
                                                )}
                                                {showSuccess === "false" && (
                                                    <HTTPFuzzerPageTable
                                                        success={false}
                                                        data={failedFuzzer}
                                                        query={query}
                                                        setQuery={setQuery}
                                                        isEnd={loading}
                                                        extractedMap={extractedMap}
                                                        pageId={props.id}
                                                    />
                                                )}
                                                {showSuccess === "Concurrent/Load" && (
                                                    <div
                                                        style={{
                                                            height: "100%",
                                                            overflowY: "auto",
                                                            overflowX: "hidden"
                                                        }}
                                                        key={i18n.language}
                                                    >
                                                        <FuzzerConcurrentLoad
                                                            inViewportCurrent={inViewport && currentFuzzerPage}
                                                            fuzzerResChartData={fuzzerResChartData}
                                                        />
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <Result
                                                status={"warning"}
                                                title={t("HTTPFuzzerPage.editAndSendRequest")}
                                                subTitle={
                                                    <div>
                                                        {t("HTTPFuzzerPage.fuzzTestResultsInfo")}
                                                        {skipSaveHTTPFlow ? (
                                                            <>
                                                                {t("HTTPFuzzerPage.responseLimitExceeded")}
                                                                <YakitButton
                                                                    type='text'
                                                                    icon={<OutlineCogIcon />}
                                                                    style={{
                                                                        padding: 0,
                                                                        height: "auto",
                                                                        verticalAlign: "top"
                                                                    }}
                                                                    onClick={() => {
                                                                        emiter.emit(
                                                                            "menuOpenPage",
                                                                            JSON.stringify({
                                                                                route: YakitRoute.Beta_ConfigNetwork
                                                                            })
                                                                        )
                                                                    }}
                                                                >
                                                                    {t("HTTPFuzzerPage.saveHttpTrafficSettings")}
                                                                </YakitButton>
                                                            </>
                                                        ) : (
                                                            ""
                                                        )}
                                                    </div>
                                                }
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        }
                    />
                </div>
                <React.Suspense fallback={<>loading...</>}>
                    <PluginDebugDrawer
                        getContainer={fuzzerRef.current}
                        route={YakitRoute.HTTPFuzzer}
                        defaultCode={pluginDebugCode}
                        visible={visibleDrawer}
                        setVisible={setVisibleDrawer}
                    />
                </React.Suspense>
            </div>
            {renderHistoryAnalysis()}
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
                <YakitEditor fontSize={14} type={"plaintext"} readOnly={true} value={value} />
            </div>
        </YakitSpin>
    )
}

interface FuzzerExtraShowProps {
    droppedCount: number
    advancedConfigValue: AdvancedConfigValueProps
    setAdvancedConfigValue: (configValue: AdvancedConfigValueProps) => void
    onlyOneResponse: boolean
    httpResponse: FuzzerResponse
}
export const FuzzerExtraShow: React.FC<FuzzerExtraShowProps> = React.memo((props) => {
    const {droppedCount, advancedConfigValue, setAdvancedConfigValue, onlyOneResponse, httpResponse} = props
    const {t, i18n} = useI18nNamespaces(["webFuzzer"])
    const [systemProxy, setSystemProxy] = useState<GetSystemProxyResult>()
    const divRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(divRef)
    useEffect(() => {
        if (!inViewport) return
        getConfigSystemProxy()
        emiter.on("onRefConfigSystemProxy", getConfigSystemProxy)
        return () => {
            emiter.off("onRefConfigSystemProxy", getConfigSystemProxy)
        }
    }, [inViewport])
    const getConfigSystemProxy = useMemoizedFn(() => {
        apiGetSystemProxy()
            .then((res: GetSystemProxyResult) => {
                setSystemProxy({
                    ...res,
                    CurrentProxy: res.CurrentProxy ? res.CurrentProxy : "127.0.0.1:8083"
                })
            })
            .catch((err) => debugToPrintLog(err))
    })
    const isShowSystemProxy = useCreation(() => {
        return systemProxy?.Enable && !advancedConfigValue.noSystemProxy && !advancedConfigValue.proxy.length
    }, [systemProxy, advancedConfigValue.noSystemProxy, advancedConfigValue.proxy])
    const onCloseRandomChunked = useMemoizedFn(() => {
        setAdvancedConfigValue({
            ...advancedConfigValue,
            enableRandomChunked: false
        })
    })
    return (
        <div className={styles["display-flex"]} ref={divRef}>
            {droppedCount > 0 && (
                <YakitTag color='danger'>{t("FuzzerExtraShow.responsesDiscarded", {droppedCount})}</YakitTag>
            )}
            {advancedConfigValue.proxy.length > 0 && (
                <Tooltip title={advancedConfigValue.proxy.map((item) => maskProxyPassword(item))}>
                    <YakitTag
                        className={classNames(styles["proxy-text"], "content-ellipsis")}
                        closable={true}
                        onClose={() => {
                            setAdvancedConfigValue({
                                ...advancedConfigValue,
                                proxy: []
                            })
                        }}
                    >
                        {t("FuzzerExtraShow.proxy")}
                        {(() => {
                            const maxDisplay = 3 // 最多显示3条
                            const {proxy} = advancedConfigValue
                            const displayData = proxy
                                .map((item) => maskProxyPassword(item))
                                .slice(0, maxDisplay)
                                .join(", ") // 取前3个
                            const remainingCount = proxy.length - maxDisplay // 剩余数量

                            return remainingCount > 0 ? `${displayData} +${remainingCount}...` : displayData
                        })()}
                    </YakitTag>
                </Tooltip>
            )}
            {isShowSystemProxy && (
                <YakitTag color='green'>
                    {t("FuzzerExtraShow.systemProxy")}
                    {systemProxy?.CurrentProxy}
                </YakitTag>
            )}

            {advancedConfigValue.actualHost && (
                <YakitTag color='danger' className={classNames(styles["actualHost-text"], "content-ellipsis")}>
                    {t("FuzzerExtraShow.realHost")}
                    {advancedConfigValue.actualHost}
                </YakitTag>
            )}
            {onlyOneResponse && (
                <>
                    {httpResponse.MatchedByMatcher && (
                        <YakitTag color='success'>{t("FuzzerExtraShow.matchSuccess")}</YakitTag>
                    )}
                    {!httpResponse.MatchedByMatcher && advancedConfigValue.matchers?.length > 0 && (
                        <YakitTag color='danger'>{t("FuzzerExtraShow.matchFailed")}</YakitTag>
                    )}
                </>
            )}
            {advancedConfigValue.enableRandomChunked && (
                <YakitTag closable onClose={onCloseRandomChunked}>
                    {t("FuzzerExtraShow.enableChunkedTransfer")}
                </YakitTag>
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
    showSuccess?: FuzzerShowSuccess
    retrySubmit?: () => void
    isShowMatch?: boolean
    matchSubmit?: () => void
    pageId?: string
    extractedMap?: Map<string, string>
    noPopconfirm?: boolean
    retryNoPopconfirm?: boolean
    cancelCurrentHTTPFuzzer?: () => void
    resumeAndPause?: () => void
    isHttps?: boolean
    request?: string
}

/**
 * @description 右边的返回内容 头部 extra
 */
export const SecondNodeExtra: React.FC<SecondNodeExtraProps> = React.memo((props) => {
    const {
        rsp,
        isHttps,
        request,
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
        showSuccess = "true",
        retrySubmit,
        isShowMatch = false,
        matchSubmit,
        extractedMap,
        pageId,
        noPopconfirm = true,
        retryNoPopconfirm = true,
        cancelCurrentHTTPFuzzer
    } = props
    const {t, i18n} = useI18nNamespaces(["webFuzzer", "history", "yakitUi"])
    const [color, setColor] = useState<string[]>()
    const [keyWord, setKeyWord] = useState<string>()
    const [statusCode, setStatusCode] = useState<string>()
    const [bodyLength, setBodyLength] = useState<HTTPFuzzerPageTableQuery>({
        afterBodyLength: undefined,
        beforeBodyLength: undefined
        // bodyLengthUnit: "B"
    })
    const [durationMsLength, setDurationMsLength] = useState<HTTPFuzzerPageTableQuery>({
        afterDurationMs: undefined,
        beforeDurationMs: undefined
    })
    const [extractedResults, setExtractedResults] = useState<string>()

    const [responseExtractorVisible, setResponseExtractorVisible] = useState<boolean>(false)
    const bodyLengthRef = useRef<any>()
    const durationMsRef = useRef<any>()

    const [exportDataVisible, setExportDataVisible] = useState<boolean>(false)

    useEffect(() => {
        setStatusCode(query?.StatusCode)
        setKeyWord(query?.keyWord)
        setColor(query?.Color)
        setBodyLength({
            afterBodyLength: query?.afterBodyLength,
            beforeBodyLength: query?.beforeBodyLength
            // bodyLengthUnit: query?.bodyLengthUnit || "B"
        })
        setDurationMsLength({
            afterDurationMs: query?.afterDurationMs,
            beforeDurationMs: query?.beforeDurationMs
        })
        setExtractedResults(query?.ExtractedResults)
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
            const obj: {listTable: any; type: ExportDataType; pageId: string} = JSON.parse(v)
            if (obj.pageId === pageId) {
                const {listTable, type} = obj
                const newListTable = listTable.map((item) => ({
                    ...item,
                    RequestRaw: StringToUint8Array(item.RequestRaw),
                    ResponseRaw: StringToUint8Array(item.ResponseRaw)
                }))
                if (type === "all") {
                    exportHTTPFuzzerResponse(newListTable, extractedMap)
                } else if (type === "extracted") {
                    exportExtractedDataResponse(newListTable, extractedMap)
                } else {
                    exportPayloadResponse(newListTable)
                }
            }
        } catch (error) {
            debugToPrintLog(error)
        }
    })

    const renderExtractedDataBtn = useMemoizedFn(() => (
        <YakitButton
            size={size}
            type={"primary"}
            onClick={() => {
                setExportDataVisible(false)
                emiter.emit(
                    "onGetExportFuzzer",
                    JSON.stringify({
                        pageId,
                        type: "extracted"
                    })
                )
            }}
        >
            {t("SecondNodeExtra.exportExtractedData")}
        </YakitButton>
    ))

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
                placeholder={t("SecondNodeExtra.enterTargetResponse")}
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
                        {+(secondNodeSize?.width || 0) >= 650 && searchNode}
                        {+(secondNodeSize?.width || 0) < 650 && (
                            <YakitPopover content={searchNode}>
                                <YakitButton icon={<SearchIcon />} size={size} type='outline2' />
                            </YakitPopover>
                        )}
                        <Divider
                            type='vertical'
                            style={{margin: 0, top: 1, backgroundColor: "var(--Colors-Use-Neutral-Border)"}}
                        />
                        <ChromeSvgIcon
                            className={styles["extra-chrome-btn"]}
                            onClick={() => {
                                ipcRenderer
                                    .invoke("ExtractUrl", {Request: request, IsHTTPS: isHttps})
                                    .then((data: {Url: string}) => {
                                        openExternalWebsite(data.Url)
                                    })
                                    .catch((error) => {
                                        yakitNotify("error", error + "")
                                    })
                            }}
                        />
                        {((rsp.Payloads && rsp.Payloads.length > 0) ||
                            rsp.ExtractedResults.filter((i) => i.Key !== "" || i.Value !== "").length > 0) && (
                            <YakitButton type='outline2' size={size} onClick={() => setShowExtra(true)}>
                                {t("SecondNodeExtra.viewExtractionResults")}
                            </YakitButton>
                        )}
                    </>
                ) : (
                    <YakitDropdownMenu
                        menu={{
                            data: [
                                {key: "tooLargeResponseHeaderFile", label: t("SecondNodeExtra.viewHeader")},
                                {key: "tooLargeResponseBodyFile", label: t("SecondNodeExtra.viewBody")}
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
                                                    failed(t("SecondNodeExtra.targetFileNotExist"))
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
                                                    failed(t("SecondNodeExtra.targetFileNotExist"))
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
                            {t("SecondNodeExtra.fullResponse")}
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
                    {t("YakitButton.detail")}
                </YakitButton>
                <Tooltip
                    title={
                        showResponseInfoSecondEditor
                            ? t("SecondNodeExtra.hideResponseInfo")
                            : t("SecondNodeExtra.showResponseInfo")
                    }
                >
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
    if (!onlyOneResponse && cachedTotal > 1 && showSuccess === "true") {
        const searchNode = (
            <YakitInput.Search
                size={size === "small" ? "small" : "middle"}
                placeholder={t("YakitInput.searchKeyWordPlaceholder")}
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
                                <span>{t("SecondNodeExtra.highlightColor")}</span>
                                <YakitSelect
                                    size='small'
                                    mode='tags'
                                    options={availableColors.map((i) => ({value: i.searchWord, label: i.render(t)}))}
                                    allowClear
                                    value={color}
                                    onChange={setColor}
                                ></YakitSelect>
                            </div>
                            <div className={styles["second-node-search-item"]}>
                                <span>{t("SecondNodeExtra.statusCode")}</span>
                                <YakitInput
                                    value={statusCode}
                                    onChange={(e) => {
                                        let val = e.target.value
                                        // 只允许输入数字、逗号和连字符，去掉所有其他字符
                                        val = val.replace(/[^0-9,-]/g, "")
                                        setStatusCode(val)
                                    }}
                                    placeholder={t("YakitInput.supportInputFormat")}
                                ></YakitInput>
                            </div>
                            <div className={styles["second-node-search-item"]}>
                                <span>{t("SecondNodeExtra.responseSize")}</span>
                                <BodyLengthInputNumber
                                    ref={bodyLengthRef}
                                    query={bodyLength}
                                    setQuery={() => {}}
                                    showFooter={false}
                                />
                            </div>
                            <div className={styles["second-node-search-item"]}>
                                <span>{t("SecondNodeExtra.latency")}</span>
                                <DurationMsInputNumber
                                    ref={durationMsRef}
                                    query={durationMsLength}
                                    setQuery={() => {}}
                                    showFooter={false}
                                />
                            </div>
                            <div className={styles["second-node-search-item"]}>
                                <span>{t("SecondNodeExtra.extractData")}</span>
                                <YakitInput
                                    value={extractedResults}
                                    onChange={(e) => {
                                        let val = e.target.value
                                        setExtractedResults(val)
                                    }}
                                    placeholder={t("YakitInput.searchKeyWordPlaceholder")}
                                ></YakitInput>
                            </div>
                        </div>
                    }
                    onVisibleChange={(b) => {
                        if (!b) {
                            const l = bodyLengthRef?.current?.getValue() || {}
                            const d = durationMsRef?.current?.getValue() || {}
                            setQuery({
                                ...l,
                                ...d,
                                keyWord: keyWord,
                                StatusCode: statusCode,
                                Color: color,
                                ExtractedResults: extractedResults
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
                                query?.afterDurationMs ||
                                query?.beforeDurationMs ||
                                (query?.Color?.length || 0) > 0 ||
                                (query?.ExtractedResults?.length || 0) > 0
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
                                        type='primary'
                                        size={size}
                                        onClick={() => {
                                            matchSubmit && matchSubmit()
                                        }}
                                    >
                                        {t("SecondNodeExtra.matchAndExtract")}
                                    </YakitButton>
                                ) : (
                                    <YakitPopconfirm
                                        title={t("SecondNodeExtra.matchOnlyConfirm")}
                                        onConfirm={() => {
                                            cancelCurrentHTTPFuzzer && cancelCurrentHTTPFuzzer()
                                            matchSubmit && matchSubmit()
                                        }}
                                        placement='top'
                                    >
                                        <YakitButton type='primary' size={size}>
                                            {t("SecondNodeExtra.matchAndExtract")}
                                        </YakitButton>
                                    </YakitPopconfirm>
                                )}
                            </>
                        ) : (
                            <>
                                {noPopconfirm ? (
                                    <Tooltip title={t("SecondNodeExtra.matchAndExtract")}>
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
                                        title={t("SecondNodeExtra.matchOnlyConfirm")}
                                        onConfirm={() => {
                                            cancelCurrentHTTPFuzzer && cancelCurrentHTTPFuzzer()
                                            matchSubmit && matchSubmit()
                                        }}
                                        placement='top'
                                    >
                                        <Tooltip title={t("SecondNodeExtra.matchAndExtract")}>
                                            <YakitButton type='outline2' size={size} icon={<OutlinePlugsIcon />} />
                                        </Tooltip>
                                    </YakitPopconfirm>
                                )}
                            </>
                        )}
                    </>
                )}

                {/* {+(secondNodeSize?.width || 0) >= 610 ? (
                    <YakitButton
                        type='outline2'
                        size={size}
                        onClick={() => {
                            if (successFuzzer.length === 0) {
                                showYakitModal({
                                    title: t("SecondNodeExtra.noWebFuzzerResponse"),
                                    content: <></>,
                                    footer: null
                                })
                                return
                            }
                            setResponseExtractorVisible(true)
                        }}
                    >
                        {t("SecondNodeExtra.extractResponseData")}
                    </YakitButton>
                ) : (
                    <Tooltip title={t("SecondNodeExtra.extractResponseData")}>
                        <YakitButton
                            type='outline2'
                            size={size}
                            icon={<OutlineBeakerIcon />}
                            onClick={() => {
                                if (successFuzzer.length === 0) {
                                    showYakitModal({
                                        title: t("SecondNodeExtra.noWebFuzzerResponse"),
                                        content: <></>,
                                        footer: null
                                    })
                                    return
                                }
                                setResponseExtractorVisible(true)
                            }}
                        />
                    </Tooltip>
                )} */}
                {+(secondNodeSize?.width || 0) >= 610 ? (
                    <YakitPopover
                        title={t("SecondNodeExtra.exportData")}
                        trigger={["click"]}
                        content={
                            <>
                                <Space>
                                    <YakitButton
                                        size={size}
                                        type={"primary"}
                                        onClick={() => {
                                            setExportDataVisible(false)
                                            emiter.emit(
                                                "onGetExportFuzzer",
                                                JSON.stringify({
                                                    pageId,
                                                    type: "all"
                                                })
                                            )
                                        }}
                                    >
                                        {t("SecondNodeExtra.exportAll")}
                                    </YakitButton>
                                    <YakitButton
                                        size={size}
                                        type={"primary"}
                                        onClick={() => {
                                            setExportDataVisible(false)
                                            emiter.emit(
                                                "onGetExportFuzzer",
                                                JSON.stringify({
                                                    pageId,
                                                    type: "payload"
                                                })
                                            )
                                        }}
                                    >
                                        {t("SecondNodeExtra.exportPayloadOnly")}
                                    </YakitButton>
                                    {renderExtractedDataBtn()}
                                </Space>
                            </>
                        }
                        visible={exportDataVisible}
                        onVisibleChange={(visible) => {
                            setExportDataVisible(visible)
                        }}
                    >
                        <YakitButton type='outline2' size={size}>
                            {t("SecondNodeExtra.exportData")}
                        </YakitButton>
                    </YakitPopover>
                ) : (
                    <YakitPopover
                        title={t("SecondNodeExtra.exportData")}
                        trigger={["click"]}
                        content={
                            <>
                                <Space>
                                    <YakitButton
                                        size={size}
                                        type={"primary"}
                                        onClick={() => {
                                            setExportDataVisible(false)
                                            emiter.emit(
                                                "onGetExportFuzzer",
                                                JSON.stringify({
                                                    pageId,
                                                    type: "all"
                                                })
                                            )
                                        }}
                                    >
                                        {t("SecondNodeExtra.exportAll")}
                                    </YakitButton>
                                    <YakitButton
                                        size={size}
                                        type={"primary"}
                                        onClick={() => {
                                            setExportDataVisible(false)
                                            emiter.emit(
                                                "onGetExportFuzzer",
                                                JSON.stringify({
                                                    pageId,
                                                    type: "payload"
                                                })
                                            )
                                        }}
                                    >
                                        {t("SecondNodeExtra.exportPayloadOnly")}
                                    </YakitButton>
                                    {renderExtractedDataBtn()}
                                </Space>
                            </>
                        }
                        visible={exportDataVisible}
                        onVisibleChange={(visible) => {
                            setExportDataVisible(visible)
                        }}
                    >
                        <Tooltip title={t("SecondNodeExtra.exportData")}>
                            <YakitButton type='outline2' icon={<OutlineExportIcon />} size={size} />
                        </Tooltip>
                    </YakitPopover>
                )}

                <YakitModal
                    title={t("SecondNodeExtra.extractFromResponsePacket")}
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
    if (!onlyOneResponse && cachedTotal > 1 && showSuccess === "false") {
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
                        {t("YakitButton.retryAll")}
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
                        {t("YakitButton.retryAll")}
                    </YakitButton>
                )}
            </>
        )
    }
    return <></>
})

export type FuzzerShowSuccess = "true" | "false" | "Concurrent/Load"
interface SecondNodeTitleProps {
    cachedTotal: number
    rsp: FuzzerResponse
    onlyOneResponse: boolean
    successFuzzerLength: number
    failedFuzzerLength: number
    showSuccess: FuzzerShowSuccess
    setShowSuccess: (b: FuzzerShowSuccess) => void
    size?: YakitButtonProp["size"]
    showConcurrentAndLoad: boolean
    selectionByteCount?: number
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
        size = "small",
        showConcurrentAndLoad,
        selectionByteCount
    } = props
    const {t, i18n} = useI18nNamespaces(["webFuzzer"])

    if (onlyOneResponse) {
        if (rsp.IsTooLargeResponse) {
            return (
                <YakitTag style={{marginLeft: 8}} color='danger'>
                    {t("SecondNodeTitle.oversizedResponse")}
                </YakitTag>
            )
        }
        return (
            <>
                {rsp.IsHTTPS && <YakitTag>{rsp.IsHTTPS ? "https" : ""}</YakitTag>}
                {selectionByteCount ? (
                    <ByteCountTag selectionByteCount={selectionByteCount || 0} itemKey='webfuzzerOneRes'></ByteCountTag>
                ) : (
                    <YakitTag>
                        {rsp.BodyLength}bytes / {rsp.DurationMs}ms
                    </YakitTag>
                )}
                {rsp.IsAutoFixContentType && (
                    <YakitTag color='danger'>
                        <Tooltip title={t("SecondNodeTitle.contentTypeModified")}>Content-Type</Tooltip>
                    </YakitTag>
                )}
            </>
        )
    }
    if (cachedTotal >= 1) {
        const options = [
            {
                value: "true",
                label: t("SecondNodeTitle.success", {count: successFuzzerLength > 9999 ? "9999+" : successFuzzerLength})
            },
            {
                value: "false",
                label: t("SecondNodeTitle.failure", {count: failedFuzzerLength > 9999 ? "9999+" : failedFuzzerLength})
            }
        ]

        if (showConcurrentAndLoad) {
            options.push({
                value: "Concurrent/Load",
                label: t("SecondNodeTitle.concurrencyLoad")
            })
        }

        return (
            <div className={styles["second-node-title"]}>
                <YakitRadioButtons
                    size={size === "small" ? "small" : "middle"}
                    value={showSuccess}
                    onChange={(e) => {
                        setShowSuccess(e.target.value)
                    }}
                    buttonStyle='solid'
                    options={options}
                />
            </div>
        )
    }
    return <></>
})

let fizzOverlayRoot: Root | null = null
let fizzOverlayDomNode: HTMLDivElement | null = null
export const onAddOverlayWidget = (editor, rsp, isShow?: boolean) => {
    // 先移除旧的 widget 和卸载 React Root
    onRemoveOverlayWidget(editor)
    if (!isShow) return

    fizzOverlayDomNode = document.createElement("div")
    fizzOverlayRoot = createRoot(fizzOverlayDomNode)
    fizzOverlayRoot.render(<EditorOverlayWidget rsp={rsp} />)

    const fizzOverlayWidget = {
        getDomNode() {
            return fizzOverlayDomNode!
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
const onRemoveOverlayWidget = (editor) => {
    editor.removeOverlayWidget({
        getId() {
            return "monaco.fizz.overlaywidget"
        }
    })
    if (fizzOverlayRoot) {
        fizzOverlayRoot.unmount()
        fizzOverlayRoot = null
    }
    fizzOverlayDomNode = null
}

interface EditorOverlayWidgetProps {
    rsp: FuzzerResponse
}

const EditorOverlayWidget: React.FC<EditorOverlayWidgetProps> = React.memo((props) => {
    const {rsp} = props
    const {t, i18n} = useI18nNamespaces(["webFuzzer"])
    if (!rsp) return <></>
    return (
        <div className={styles["editor-overlay-widget"]}>
            {Number(rsp.DNSDurationMs) > 0 ? (
                <span>
                    {t("EditorOverlayWidget.dnsTime")}
                    {rsp.DNSDurationMs}ms
                </span>
            ) : (
                ""
            )}
            {rsp.RemoteAddr && (
                <span>
                    {t("EditorOverlayWidget.remoteAddress")}
                    {rsp.RemoteAddr}
                </span>
            )}
            {rsp.Proxy && (
                <span>
                    {t("EditorOverlayWidget.proxy")}
                    {rsp.Proxy}
                </span>
            )}
            {Number(rsp.FirstByteDurationMs) > 0 ? (
                <span>
                    {t("EditorOverlayWidget.responseTime")}
                    {rsp.FirstByteDurationMs}ms
                </span>
            ) : (
                ""
            )}
            {Number(rsp.TotalDurationMs) > 0 ? (
                <span>
                    {t("EditorOverlayWidget.totalTime")}
                    {rsp.TotalDurationMs}ms
                </span>
            ) : (
                ""
            )}
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
    defActiveKeyAndOrder: MatcherActiveKey
    onSaveMatcherAndExtraction: (matcherValue: MatcherValueProps, extractorValue: ExtractorValueProps) => void
    webFuzzerValue: string
    isHttps?: boolean
    request: string
    showResponseInfoSecondEditor: boolean
    setShowResponseInfoSecondEditor: (b: boolean) => void
    secondNodeTitle?: () => JSX.Element
    secondNodeExtra?: () => JSX.Element
    onSetOnlyOneResEditor: (editor: IMonacoEditor) => void

    keepSearchName?: string
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
            defActiveKeyAndOrder,
            onSaveMatcherAndExtraction,
            showResponseInfoSecondEditor,
            setShowResponseInfoSecondEditor,
            isHttps,
            secondNodeTitle,
            secondNodeExtra,
            webFuzzerValue,
            request,
            keepSearchName,
            onSetOnlyOneResEditor
        } = props
        const {t, i18n} = useI18nNamespaces(["webFuzzer"])

        const [showMatcherAndExtraction, setShowMatcherAndExtraction] = useControllableValue<boolean>(props, {
            defaultValuePropName: "showMatcherAndExtraction",
            valuePropName: "showMatcherAndExtraction",
            trigger: "setShowMatcherAndExtraction"
        })
        const [reason, setReason] = useState<string>(t("ResponseViewer.unknownReason"))

        const [activeKey, setActiveKey] = useState<string>("")
        const [activeType, setActiveType] = useState<MatchingAndExtraction>("matchers")
        const [activeKeyAndOrder, setDefActiveKeyAndOrder] = useState<MatcherActiveKey>({
            order: 0,
            defActiveKey: ""
        })
        useEffect(() => {
            setActiveKey(defActiveKey)
        }, [defActiveKey])
        useEffect(() => {
            setActiveType(defActiveType)
        }, [defActiveType])
        useEffect(() => {
            setDefActiveKeyAndOrder(defActiveKeyAndOrder)
        }, [defActiveKeyAndOrder])

        useEffect(() => {
            try {
                let r = t("ResponseViewer.unknownReason")
                r = fuzzerResponse!.Reason
                setReason(r)
                setShowExtra(
                    (fuzzerResponse.Payloads && fuzzerResponse.Payloads.length > 0) ||
                        fuzzerResponse.ExtractedResults.filter((i) => i.Key !== "" || i.Value !== "").length > 0
                )
            } catch (e) {}
        }, [fuzzerResponse, i18n.language])

        const responseEditorRightMenu: OtherMenuListProps = useMemo(() => {
            return {
                overlayWidgetv: {
                    menu: [
                        {
                            key: "is-show-add-overlay-widgetv",
                            label: showResponseInfoSecondEditor
                                ? t("ResponseViewer.hideResponseInfo")
                                : t("ResponseViewer.showResponseInfo")
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
                            label: t("ResponseViewer.matcher")
                        },
                        {
                            key: "show-extractors",
                            label: t("ResponseViewer.extractor")
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
        }, [showResponseInfoSecondEditor, i18n.language])
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
        // 编辑器编码
        const [codeKey, setCodeKey] = useState<string>("")
        const [codeLoading, setCodeLoading] = useState<boolean>(false)
        const [codeValue, setCodeValue] = useState<string>("")
        useEffect(() => {
            if (fuzzerResponse.ResponseRaw) {
                getRemoteValue(FuzzerRemoteGV.WebFuzzerOneResEditorBeautifyRender).then((res) => {
                    if (!!res) {
                        setResTypeOptionVal(res)
                    } else {
                        setResTypeOptionVal(undefined)
                    }
                })
                getRemoteValue(FuzzerRemoteGV.FuzzerCodeEnCoding).then((res) => {
                    if (!!res) {
                        setCodeKey(res)
                        if (res !== "utf-8") {
                            setCodeLoading(true)
                        }
                    } else {
                        setCodeKey("utf-8")
                    }
                })
            }
        }, [fuzzerResponse])

        const responseRawString = useCreation(() => {
            return Uint8ArrayToString(fuzzerResponse.ResponseRaw)
        }, [fuzzerResponse.ResponseRaw])

        const copyUrl = useMemoizedFn(() => {
            copyAsUrl({Request: request, IsHTTPS: !!isHttps})
        })
        const onClickOpenBrowserMenu = useMemoizedFn(() => {
            ipcRenderer
                .invoke("ExtractUrl", {Request: request, IsHTTPS: !!isHttps})
                .then((data: {Url: string}) => {
                    openExternalWebsite(data.Url)
                })
                .catch((e) => {
                    yakitNotify("error", t("ResponseViewer.copyUrlFailed"))
                })
        })

        const editorDownBodyParams = useMemo(() => {
            return {RuntimeId: fuzzerResponse.RuntimeID, IsRequest: false}
        }, [fuzzerResponse.RuntimeID])

        return (
            <>
                <YakitResizeBox
                    isVer={true}
                    lineStyle={{display: !show ? "none" : "", background: "var(--Colors-Use-Basic-Background)"}}
                    firstNodeStyle={{padding: !show ? 0 : undefined, background: "var(--Colors-Use-Basic-Background)"}}
                    firstNode={
                        <NewHTTPPacketEditor
                            keepSearchName={keepSearchName}
                            language={fuzzerResponse?.DisableRenderStyles ? "text" : undefined}
                            isShowBeautifyRender={!fuzzerResponse?.IsTooLargeResponse}
                            defaultHttps={isHttps}
                            defaultSearchKeyword={defaultResponseSearch}
                            originValue={codeKey === "utf-8" ? responseRawString : codeValue}
                            originalPackage={fuzzerResponse.ResponseRaw}
                            readOnly={true}
                            isResponse={true}
                            loading={codeLoading}
                            showDefaultExtra={false}
                            title={secondNodeTitle && secondNodeTitle()}
                            AfterBeautifyRenderBtn={
                                <CodingPopover
                                    key='coding'
                                    originValue={fuzzerResponse.ResponseRaw}
                                    onSetCodeLoading={setCodeLoading}
                                    codeKey={codeKey}
                                    onSetCodeKey={(codeKey) => {
                                        setCodeKey(codeKey)
                                        setRemoteValue(FuzzerRemoteGV.FuzzerCodeEnCoding, codeKey)
                                    }}
                                    onSetCodeValue={setCodeValue}
                                />
                            }
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
                                        title={t("ResponseViewer.requestFailedOrServerError")}
                                        // no such host
                                        subTitle={(() => {
                                            const reason = fuzzerResponse?.Reason || "unknown"
                                            if (reason.includes("tcp: i/o timeout")) {
                                                return t("ResponseViewer.networkTimeout")
                                            }
                                            if (reason.includes("no such host")) {
                                                return t("ResponseViewer.dnsOrHostError")
                                            }
                                            if (reason.includes("cannot create proxy")) {
                                                return t("ResponseViewer.cannotSetProxy")
                                            }
                                            if (reason.includes("empty response")) {
                                                return t("ResponseViewer.serverNoResponse")
                                            }
                                            return undefined
                                        })()}
                                        style={{height: "100%", backgroundColor: "var(--Colors-Use-Basic-Background)"}}
                                    >
                                        <>
                                            {t("ResponseViewer.detailedReason")}
                                            {fuzzerResponse.Reason}
                                        </>
                                    </Result>
                                )
                            }
                            isAddOverlayWidget={showResponseInfoSecondEditor}
                            contextMenu={responseEditorRightMenu}
                            webFuzzerValue={webFuzzerValue}
                            extraEditorProps={{
                                isShowSelectRangeMenu: true
                            }}
                            typeOptionVal={resTypeOptionVal}
                            onTypeOptionVal={(typeOptionVal) => {
                                if (typeOptionVal !== undefined) {
                                    setResTypeOptionVal(typeOptionVal)
                                    setRemoteValue(FuzzerRemoteGV.WebFuzzerOneResEditorBeautifyRender, typeOptionVal)
                                } else {
                                    setResTypeOptionVal(undefined)
                                    setRemoteValue(FuzzerRemoteGV.WebFuzzerOneResEditorBeautifyRender, "")
                                }
                            }}
                            onClickUrlMenu={copyUrl}
                            onClickOpenBrowserMenu={onClickOpenBrowserMenu}
                            downbodyParams={editorDownBodyParams}
                            onEditor={(editor) => {
                                onSetOnlyOneResEditor && onSetOnlyOneResEditor(editor)
                            }}
                            onClickOpenPacketNewWindowMenu={() => {
                                openPacketNewWindow({
                                    request: {
                                        originValue: request
                                    },
                                    response: {
                                        originValue: codeKey === "utf-8" ? responseRawString : codeValue,
                                        originalPackage: fuzzerResponse.ResponseRaw
                                    }
                                })
                            }}
                            fixContentType={fuzzerResponse.FixContentType}
                            originalContentType={fuzzerResponse.OriginalContentType}
                            fixContentTypeHoverMessage={
                                fuzzerResponse.IsSetContentTypeOptions === true
                                    ? t("ResponseViewer.xContentTypeOptionsNotice")
                                    : ""
                            }
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
                                    defActiveKeyAndOrder={activeKeyAndOrder}
                                    pageType='webfuzzer'
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
                        border: "1px solid var(--Colors-Use-Neutral-Border)",
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
    const {t, i18n} = useI18nNamespaces(["webFuzzer"])
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
                label: t("ResponseViewerSecondNode.extractContent")
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
                {fuzzerResponse.Payloads?.length === 0 && t("ResponseViewerSecondNode.none")}
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

                {fuzzerResponse.ExtractedResults?.length === 0 && t("ResponseViewerSecondNode.none")}
            </div>
        </div>
    )
})

// 爆破动画演示
interface BlastingAnimationAemonstrationProps {
    animationType?: string
    videoStyle?: CSSProperties
}
export const BlastingAnimationAemonstration: React.FC<BlastingAnimationAemonstrationProps> = React.memo((props) => {
    const {t, i18n} = useI18nNamespaces(["webFuzzer"])
    const [animationType, setAnimationType] = useState<string>(props.animationType || "id")

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
            {!props.animationType && (
                <YakitRadioButtons
                    size='large'
                    buttonStyle='solid'
                    value={animationType}
                    options={[
                        {
                            value: "id",
                            label: t("BlastingAnimationAemonstration.bruteForceId")
                        },
                        {
                            value: "pwd",
                            label: t("BlastingAnimationAemonstration.bruteForcePassword")
                        },
                        {
                            value: "count",
                            label: t("BlastingAnimationAemonstration.bruteForceAccount")
                        }
                    ]}
                    onChange={(e) => setAnimationType(e.target.value)}
                />
            )}

            <div className={styles["animation-cont-wrap"]}>
                <video src={animationResources} autoPlay loop style={props.videoStyle}></video>
            </div>
        </div>
    )
})

export const ByteCountTag: React.FC<{selectionByteCount?: number; itemKey: string; style?: CSSProperties}> = ({
    selectionByteCount = 0,
    itemKey,
    style = {}
}) => {
    return selectionByteCount > 0 ? (
        <YakitTag key={itemKey} style={style}>
            {selectionByteCount} bytes
        </YakitTag>
    ) : (
        <></>
    )
}
