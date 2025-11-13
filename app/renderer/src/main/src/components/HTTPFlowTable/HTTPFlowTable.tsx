import React, {ReactNode, Ref, useEffect, useMemo, useRef, useState, useContext} from "react"
import {Divider, Form, Input, Tooltip, Badge, Progress, Modal} from "antd"
import {HistoryPluginSearchType, YakQueryHTTPFlowRequest} from "../../utils/yakQueryHTTPFlow"
import {PaginationSchema, YakScript} from "../../pages/invoker/schema"
import {HTTPFlowDetail, HTTPFlowDetailProp} from "../HTTPFlowDetail"
import {info, yakitNotify, yakitFailed} from "../../utils/notification"
import style from "./HTTPFlowTable.module.scss"
import {formatTimestamp} from "../../utils/timeUtil"
import {
    useControllableValue,
    useCreation,
    useDebounceEffect,
    useDebounceFn,
    useGetState,
    useMemoizedFn,
    useUpdateEffect,
    useVirtualList,
    useInViewport
} from "ahooks"
import ReactResizeDetector from "react-resize-detector"
import {
    generateCSRFPocByRequest,
    generateYakCodeByRequest,
    RequestToYakCodeTemplate
} from "../../pages/invoker/fromPacketToYakCode"
import {execPacketScan, execPacketScanWithNewTab} from "@/pages/packetScanner/PacketScanner"
import {GetPacketScanByCursorMenuItem, packetScanDefaultValue} from "@/pages/packetScanner/DefaultPacketScanGroup"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {FooterBottom, TableVirtualResize} from "../TableVirtualResize/TableVirtualResize"
import {
    CheckCircleIcon,
    RemoveIcon,
    StatusOfflineIcon,
    ColorSwatchIcon,
    ChevronDownIcon,
    ArrowCircleRightSvgIcon,
    ChromeFrameSvgIcon,
    CheckIcon,
    CloudDownloadIcon,
    DragSortIcon
} from "@/assets/newIcon"
import classNames from "classnames"
import {
    ColumnsTypeProps,
    FiltersItemProps,
    SelectSearchProps,
    SortProps
} from "../TableVirtualResize/TableVirtualResizeType"
import {minWinSendToChildWin, openExternalWebsite, openPacketNewWindow, saveABSFileToOpen} from "@/utils/openWebsite"
import {showResponseViaHTTPFlowID} from "@/components/ShowInBrowser"
import {YakitSelect} from "../yakitUI/YakitSelect/YakitSelect"
import {YakitCheckbox} from "../yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitCheckableTag} from "../yakitUI/YakitTag/YakitCheckableTag"
import {YakitInput} from "../yakitUI/YakitInput/YakitInput"
import {YakitMenu} from "../yakitUI/YakitMenu/YakitMenu"
import {YakitDropdownMenu} from "../yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {YakitPopover} from "../yakitUI/YakitPopover/YakitPopover"
import {showByRightContext} from "../yakitUI/YakitMenu/showByRightContext"
import {YakitInputNumber} from "../yakitUI/YakitInputNumber/YakitInputNumber"
import {showYakitModal} from "../yakitUI/YakitModal/YakitModalConfirm"
import {ShareModal} from "@/pages/fuzzer/components/ShareImportExportData"
import {useSize} from "ahooks"
import {HTTPFlowTableFormConfiguration, HTTPFlowTableFormConsts} from "./HTTPFlowTableForm"
import {YakitTag} from "../yakitUI/YakitTag/YakitTag"
import {CheckedSvgIcon} from "../layout/icons"
import {ExportSelect} from "../DataExport/DataExport"
import emiter from "@/utils/eventBus/eventBus"
import {MITMConsts} from "@/pages/mitm/MITMConsts"
import {HTTPHistorySourcePageType} from "../HTTPHistory"
import {useHttpFlowStore} from "@/store/httpFlow"
import {
    OutlineArrownarrowdownIcon,
    OutlineArrownarrowupIcon,
    OutlineBanIcon,
    OutlineCogIcon,
    OutlineFilterIcon,
    OutlineInformationcircleIcon,
    OutlineQuestionmarkcircleIcon,
    OutlineRefreshIcon,
    OutlineSearchIcon,
    OutlineSelectorIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {serverPushStatus} from "@/utils/duplex/duplex"
import {useCampare} from "@/hook/useCompare/useCompare"
import {queryYakScriptList} from "@/pages/yakitStore/network"
import {IconSolidAIIcon, IconSolidAIWhiteIcon} from "@/assets/icon/colors"
import {YakitRoute} from "@/enums/yakitRoute"
import {PluginSwitchToTag} from "@/pages/pluginEditor/defaultconstants"
import {Uint8ArrayToString} from "@/utils/str"
import {newWebsocketFuzzerTab} from "@/pages/websocket/WebsocketFuzzer"
import cloneDeep from "lodash/cloneDeep"
import {setClipboardText} from "@/utils/clipboard"
import {RemoteHistoryGV} from "@/enums/history"
import {YakitCombinationSearch} from "../YakitCombinationSearch/YakitCombinationSearch"
import {v4 as uuidv4} from "uuid"
import {YakitModal} from "../yakitUI/YakitModal/YakitModal"
import {
    filterColorTag,
    getSingleColorType,
    isCellRedSingleColor,
    TableCellToColorTag
} from "../TableVirtualResize/utils"
import {randomString} from "@/utils/randomUtil"
import {handleSaveFileSystemDialog} from "@/utils/fileSystemDialog"
import {usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {DragDropContext, Draggable, Droppable} from "@hello-pangea/dnd"
import {showYakitDrawer, YakitDrawer} from "../yakitUI/YakitDrawer/YakitDrawer"
import {ExclamationCircleOutlined} from "@ant-design/icons"
import MITMContext from "@/pages/mitm/Context/MITMContext"
import {
    getGlobalShortcutKeyEvents,
    GlobalShortcutKey,
    ShortcutKeyFocusType
} from "@/utils/globalShortcutKey/events/global"
import {convertKeyboardToUIKey} from "@/utils/globalShortcutKey/utils"
import useShortcutKeyTrigger from "@/utils/globalShortcutKey/events/useShortcutKeyTrigger"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import {DebouncedFunc, isEqual} from "lodash"
import {defalutColumnsOrder} from "@/pages/hTTPHistoryAnalysis/HTTPHistory/HTTPHistoryFilter"
import {isEnpriTrace} from "@/utils/envfile"
import {HTTPFlowsToOnlineRequest} from "@/utils/login"
import {NowProjectDescription} from "@/pages/globalVariable"
import {useStore} from "@/store"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import {YakitEmpty} from "../yakitUI/YakitEmpty/YakitEmpty"
import i18n from "@/i18n/i18n"
const {ipcRenderer} = window.require("electron")

export interface codecHistoryPluginProps {
    key: string
    label: string
    isAiPlugin: boolean
}

export interface HTTPHeaderItem {
    Header: string
    Value: string
}

export interface HTTPFlow {
    Id: number
    Method: string
    Path: string
    Hash: string
    IsHTTPS: boolean
    Url: string
    Request: Uint8Array
    Response: Uint8Array
    StatusCode: number
    BodyLength: number
    BodySizeVerbose?: string
    RequestLength?: number
    RequestSizeVerbose?: string
    ContentType: string
    SourceType: string
    RequestHeader: HTTPHeaderItem[]
    ResponseHeader: HTTPHeaderItem[]
    GetParamsTotal: number
    PostParamsTotal: number
    CookieParamsTotal: number
    CreatedAt: number
    UpdatedAt: number
    HostPort?: string
    IPAddress?: string
    HtmlTitle?: string

    GetParams: FuzzableParams[]
    PostParams: FuzzableParams[]
    CookieParams: FuzzableParams[]

    Tags?: string

    // Placeholder
    IsPlaceholder?: boolean

    IsWebsocket?: boolean
    WebsocketHash?: string

    // 仅仅是前端 表格单元格样式
    cellClassName?: string

    /*
     * */
    InvalidForUTF8Request?: boolean
    InvalidForUTF8Response?: boolean
    RawRequestBodyBase64?: string
    RawResponseBodyBase64?: string
    SafeHTTPRequest?: string

    /*
    Extracted
    * */
    Domains?: string[]
    RootDomains?: string[]
    JsonObjects?: string[]

    /**
     * 超大响应
     */
    IsTooLargeResponse: boolean
    TooLargeResponseHeaderFile: string
    TooLargeResponseBodyFile: string
    DisableRenderStyles: boolean

    /**前端 Uint8Array对应的string */
    RequestString: string
    ResponseString: string

    HiddenIndex?: string

    FromPlugin: string
}
/**获取请求包Request和响应包Response  string */
export const getHTTPFlowReqAndResToString = (flow: HTTPFlow) => {
    return {
        ...flow,
        RequestString: !!flow?.Request?.length ? Uint8ArrayToString(flow.Request) : "",
        ResponseString: !!flow?.Response?.length ? Uint8ArrayToString(flow.Response) : ""
    }
}

export interface FuzzableParams {
    Position: string
    ParamName: string
    OriginValue: Uint8Array
    AutoTemplate: Uint8Array
    IsHTTPS: boolean
}

export const onExpandHTTPFlow = (
    flow: HTTPFlow | undefined,
    onClosed: () => any,
    downstreamProxyStr: string,
    t?: (keys: string) => string // 部分调用位置不确认，暂时为可选参数
) => {
    if (!flow) {
        return <YakitEmpty title={t?.("HTTPFlowTable.requestDetailsNotFound") || "找不到该请求详情"}></YakitEmpty>
    }

    return (
        <div style={{width: "100%"}}>
            <HTTPFlowDetail id={flow.Id} onClose={onClosed} downstreamProxyStr={downstreamProxyStr} />
        </div>
    )
}

export interface HistoryTableTitleShow {
    /**是否显示表格title */
    noTableTitle?: boolean
    /** 是否显示类型切换*/
    showSourceType?: boolean
    /** 是否显示高级配置 */
    showAdvancedSearch?: boolean
    /** 是否显示协议切换 */
    showProtocolType?: boolean
    /** 是否显示搜索 */
    showHistorySearch?: boolean
    /** 是否显示颜色切换 */
    showColorSwatch?: boolean
    /** 是否显示批量操作 */
    showBatchActions?: boolean
    /** 是否显示清空 */
    showDelAll?: boolean
    /** 是否显示设置 */
    showSetting?: boolean
    /** 是否显示刷新 */
    showRefresh?: boolean
}

export interface HTTPFlowTableProp extends HistoryTableTitleShow {
    onSelected?: (i?: HTTPFlow) => any
    params?: YakQueryHTTPFlowRequest
    inViewport?: boolean
    onSearch?: (i: string) => any
    title?: string
    onlyShowFirstNode?: boolean
    setOnlyShowFirstNode?: (i: boolean) => void
    refresh?: boolean
    importRefresh?: boolean
    httpHistoryTableTitleStyle?: React.CSSProperties
    // 多开页面使用此组件，采用historyId区分
    historyId?: string
    // 使用此组件页面类型
    pageType?: HTTPHistorySourcePageType
    searchURL?: string
    includeInUrl?: string | string[]
    onQueryParams?: (queryParams: string, execFlag: boolean) => void
    titleHeight?: number
    containerClassName?: string
    /** RuntimeId 流量过滤条件(RuntimeId) */
    runTimeId?: string
    /** 下游代理地址 */
    downstreamProxyStr?: string
    /** 进程名 */
    ProcessName?: string[]
    onSetTableTotal?: (t: number) => void
    onSetTableSelectNum?: (s: number) => void
    onSetHasNewData?: (f: boolean) => void
}

export const StatusCodeToColor = (code: number) => {
    if (code >= 400) {
        return "var( --yakit-danger-5)"
    } else if (code < 400 && code >= 300) {
        return "var( --Colors-Use-Warning-Primary)"
    } else {
        return "var( --Colors-Use-Success-Primary)"
    }
}

export const DurationMsToColor = (code: number) => {
    if (code >= 600) {
        return "var( --yakit-danger-5)"
    } else if (code < 600 && code >= 300) {
        return "var( --Colors-Use-Warning-Primary)"
    } else {
        return "var( --Colors-Use-Success-Primary)"
    }
}

export const LogLevelToCode = (level: string) => {
    switch (level.toLowerCase()) {
        case "info":
        case "information":
        case "low":
            return "blue"
        case "debug":
            return "gray"
        case "finished":
        case "success":
            return "green"
        case "fatal":
        case "error":
        case "panic":
        case "err":
        case "high":
        case "critical":
            return "red"
        case "warning":
        case "warn":
        case "middle":
        case "medium":
            return "orange"
        default:
            return "blue"
    }
}

// 通过关键词输出渲染颜色
const TableRowColor = (key: string) => {
    switch (key) {
        case "RED":
            return "color-opacity-bg-red color-text-red color-font-weight-red"
        case "GREEN":
            return "color-opacity-bg-green color-text-green color-font-weight-green"
        case "BLUE":
            return "color-opacity-bg-blue color-text-blue color-font-weight-blue"
        case "YELLOW":
            return "color-opacity-bg-yellow color-text-yellow color-font-weight-yellow"
        case "ORANGE":
            return "color-opacity-bg-orange color-text-orange color-font-weight-orange"
        case "PURPLE":
            return "color-opacity-bg-purple color-text-purple color-font-weight-purple"
        case "CYAN":
            return "color-opacity-bg-cyan color-text-cyan color-font-weight-cyan"
        case "GREY":
            return "color-opacity-bg-grey color-text-grey color-font-weight-grey"
        default:
            return ""
    }
}

export const availableColors = [
    {
        color: "RED",
        title: "红色[#F4736B]",
        className: TableRowColor("RED"),
        searchWord: TableCellToColorTag["RED"],
        render: (t) => (
            <div className={classNames(style["history-color-tag"])}>
                <div className={classNames(style["tag-color-display"], "color-bg-red")}></div>
                {t("YakitTable.red")}
            </div>
        )
    },
    {
        color: "GREEN",
        title: "绿色[#56C991]",
        className: TableRowColor("GREEN"),
        searchWord: TableCellToColorTag["GREEN"],
        render: (t) => (
            <div className={classNames(style["history-color-tag"])}>
                <div className={classNames(style["tag-color-display"], "color-bg-green")}></div>
                {t("YakitTable.green")}
            </div>
        )
    },
    {
        color: "BLUE",
        title: "蓝色[#4A94F8]",
        className: TableRowColor("BLUE"),
        searchWord: TableCellToColorTag["BLUE"],
        render: (t) => (
            <div className={classNames(style["history-color-tag"])}>
                <div className={classNames(style["tag-color-display"], "color-bg-blue")}></div>
                {t("YakitTable.blue")}
            </div>
        )
    },
    {
        color: "YELLOW",
        title: "黄色[#FFD583]",
        searchWord: TableCellToColorTag["YELLOW"],
        className: TableRowColor("YELLOW"),
        render: (t) => (
            <div className={classNames(style["history-color-tag"])}>
                <div className={classNames(style["tag-color-display"], "color-bg-yellow")}></div>
                {t("YakitTable.yellow")}
            </div>
        )
    },
    {
        color: "ORANGE",
        title: "橙色[#FFB660]",
        searchWord: TableCellToColorTag["ORANGE"],
        className: TableRowColor("ORANGE"),
        render: (t) => (
            <div className={classNames(style["history-color-tag"])}>
                <div className={classNames(style["tag-color-display"], "color-bg-orange")}></div>
                {t("YakitTable.orange")}
            </div>
        )
    },
    {
        color: "PURPLE",
        title: "紫色[#8863F7]",
        searchWord: TableCellToColorTag["PURPLE"],
        className: TableRowColor("PURPLE"),
        render: (t) => (
            <div className={classNames(style["history-color-tag"])}>
                <div className={classNames(style["tag-color-display"], "color-bg-purple")}></div>
                {t("YakitTable.purple")}
            </div>
        )
    },
    {
        color: "CYAN",
        title: "青色[#35D8EE]",
        searchWord: TableCellToColorTag["CYAN"],
        className: TableRowColor("CYAN"),
        render: (t) => (
            <div className={classNames(style["history-color-tag"])}>
                <div className={classNames(style["tag-color-display"], "color-bg-cyan")}></div>
                {t("YakitTable.cyan")}
            </div>
        )
    },
    {
        color: "GREY",
        title: "灰色[#B4BBCA]",
        searchWord: TableCellToColorTag["GREY"],
        className: TableRowColor("GREY"),
        render: (t) => (
            <div className={classNames(style["history-color-tag"])}>
                <div className={classNames(style["tag-color-display"], "color-bg-grey")}></div>
                {t("YakitTable.grey")}
            </div>
        )
    }
]

export interface YakQueryHTTPFlowResponse {
    Data: HTTPFlow[]
    Total: number
    Pagination: PaginationSchema
}

export interface HTTPFlowsToOnlineBatchRequest {
    ToOnlineWhere: HTTPFlowsToOnlineRequest
    UploadHTTPFlowsWhere: YakQueryHTTPFlowRequest
}

export interface HTTPFlowsToOnlineBatchResponse {
    SuccessCount: number
    FailedCount: number
}

export interface HTTPFlowsFieldGroupResponse {
    Tags: TagsCode[]
    StatusCode: TagsCode[]
}

interface TagsCode {
    Value: string
    Total: number
}

export interface CompateData {
    content: string
    language: string
}

const OFFSET_LIMIT = 30
const OFFSET_STEP = 100

export interface ShieldData {
    data: (string | number)[]
}

const defSort: SortProps = {
    order: "desc",
    orderBy: "id"
}

export const SourceType = [
    {text: (t) => t("YakitRoute.MITM"), value: "mitm"},
    {text: (t) => t("HTTPFlowTable.plugin"), value: "scan"},
    {
        text: (t) => t("HTTPFlowTable.crawler"),
        value: "basic-crawler"
    }
]

interface UpdateCacheData {
    id: number
    tags: string
}

export const getClassNameData = (resData: HTTPFlow[]) => {
    let newData: HTTPFlow[] = []
    const length = resData.length
    if (length > 0) {
    }
    for (let index = 0; index < length; index++) {
        const item: HTTPFlow = resData[index]
        let className: string | undefined = ""
        className = filterColorTag(item.Tags) || undefined
        const newItem = {
            ...item,
            cellClassName: className
        }
        newData.push(newItem)
    }
    return newData
}

export const filterData = (filterArr: HTTPFlow[], key: keyof HTTPFlow) => {
    const uniqueData: HTTPFlow[] = []
    const idSet = new Set<HTTPFlow[keyof HTTPFlow]>()
    filterArr.forEach((item) => {
        if (!idSet.has(item[key])) {
            idSet.add(item[key])
            uniqueData.push(item)
        }
    })
    return uniqueData
}

/**
 * @description 根据单位转为对应的值
 * @returns {number}
 */
export const onConvertBodySizeByUnit = (length: number, unit: "B" | "K" | "M") => {
    switch (unit) {
        case "K":
            return Number(length) * 1024
        case "M":
            return Number(length) * 1024 * 1024
        default:
            return Number(length)
    }
}

/**
 * @description 根据单位转为B
 * @returns {number}
 */
export const onConvertBodySizeToB = (length: number, unit: "B" | "K" | "M") => {
    let v = length
    switch (unit) {
        case "K":
            v = Number(length) / 1024
            break
        case "M":
            v = Number(length) / 1024 / 1024
            break
        default:
            v = Number(length)
            break
    }
    return Math.ceil(v)
}

const HTTP_FLOW_TABLE_SHIELD_DATA = "HTTP_FLOW_TABLE_SHIELD_DATA"

export interface ExportHTTPFlowStreamRequest {
    Filter: YakQueryHTTPFlowRequest
    FieldName?: string[]
    ExportType: "csv" | "har"
    TargetPath: string
}

interface ImportExportStreamResponse {
    ExportFilePath?: string
    Percent: number
    Verbose: string
}

export const HTTPFlowTable = React.memo<HTTPFlowTableProp>((props) => {
    const {
        noTableTitle = false,
        showSourceType = true,
        showAdvancedSearch = true,
        showProtocolType = true,
        showHistorySearch = true,
        showColorSwatch = true,
        showBatchActions = true,
        showDelAll = true,
        showSetting = true,
        showRefresh = true,
        onlyShowFirstNode,
        setOnlyShowFirstNode,
        inViewport = true,
        refresh,
        importRefresh,
        pageType,
        historyId,
        titleHeight = 38,
        containerClassName = "",
        runTimeId,
        downstreamProxyStr = "",
        onSetTableTotal,
        onSetTableSelectNum,
        onSetHasNewData
    } = props
    const {t, i18n} = useI18nNamespaces(["yakitUi", "yakitRoute", "history"])
    const {currentPageTabRouteKey} = usePageInfo(
        (s) => ({
            currentPageTabRouteKey: s.currentPageTabRouteKey
        }),
        shallow
    )

    const mitmContent = useContext(MITMContext)

    const mitmVersion = useCreation(() => {
        return mitmContent.mitmStore.version
    }, [mitmContent.mitmStore.version])
    const [data, setData] = useState<HTTPFlow[]>([])
    const [color, setColor] = useState<string[]>([])
    const [isShowColor, setIsShowColor] = useState<boolean>(false)
    const [params, setParams] = useState<YakQueryHTTPFlowRequest>({
        SourceType: props.params?.SourceType || "mitm",
        RuntimeIDs: runTimeId && runTimeId.indexOf(",") !== -1 ? runTimeId.split(",") : undefined,
        RuntimeId: runTimeId && runTimeId.indexOf(",") === -1 ? runTimeId : undefined,
        FromPlugin: "",
        Full: false,
        Tags: []
    })
    const [tagsFilter, setTagsFilter] = useState<string[]>([])
    const [tagSearchVal, setTagSearchVal] = useState<string>("")

    const [pagination, setPagination] = useState<PaginationSchema>({
        Limit: OFFSET_LIMIT,
        Order: "desc",
        OrderBy: "created_at",
        Page: 1
    })
    const isOneceLoading = useRef<boolean>(true)

    const [total, setTotal] = useState<number>(0)
    const [loading, setLoading] = useState(false)
    const [selected, setSelected, getSelected] = useGetState<HTTPFlow>()

    const {compareState, setCompareState, setCompareLeft, setCompareRight} = useHttpFlowStore()

    // 屏蔽数据
    const [shieldData, setShieldData] = useState<ShieldData>({
        data: []
    })
    const [isRefresh, setIsRefresh] = useState<boolean>(false) // 刷新表格，滚动至0
    const [_, setBodyLengthUnit, getBodyLengthUnit] = useGetState<"B" | "K" | "M">("B")
    // 最新一条数据ID
    const maxIdRef = useRef<number>(0)
    // 最后一条数据ID
    const minIdRef = useRef<number>(0)
    // 接口是否正在请求
    const isGrpcRef = useRef<boolean>(false)
    const [tags, setTags] = useState<FiltersItemProps[]>([])
    const [currentIndex, setCurrentIndex] = useState<number>()
    const [scrollToIndex, setScrollToIndex] = useState<number | string>()
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
    const [selectedRows, setSelectedRows] = useState<HTTPFlow[]>([])
    const [isAllSelect, setIsAllSelect] = useState<boolean>(false)
    const [offsetData, setOffsetData, getOffsetData] = useGetState<HTTPFlow[]>([])
    const [afterBodyLength, setAfterBodyLength, getAfterBodyLength] = useGetState<number>()
    const [beforeBodyLength, setBeforeBodyLength, getBeforeBodyLength] = useGetState<number>()
    const [isReset, setIsReset] = useState<boolean>(false)

    const [checkBodyLength, setCheckBodyLength] = useState<boolean>(false) // 查询BodyLength大于0

    const [batchVisible, setBatchVisible] = useState<boolean>(false)

    const [exportDataKey, setExportDataKey] = useState<string[]>([])

    const [drawerFormVisible, setDrawerFormVisible] = useState<boolean>(false)
    // 高级筛选所选项
    const [filterMode, setFilterMode] = useState<"shield" | "show">("shield")
    const [hostName, setHostName] = useState<string[]>([])
    const [urlPath, setUrlPath] = useState<string[]>([])
    const [fileSuffix, setFileSuffix] = useState<string[]>([])
    const [searchContentType, setSearchContentType] = useState<string>("")
    const [excludeKeywords, setExcludeKeywords] = useState<string[]>([])
    const [statusCode, setStatusCode] = useState<string>("")
    // 表格排序
    const sortRef = useRef<SortProps>(defSort)

    const tableRef = useRef<any>(null)

    const boxHeightRef = useRef<number>()

    const ref = useRef(null)

    const refreshTabsContRef = useRef<boolean>(false)

    useShortcutKeyTrigger("sendAndJump*common", (focus) => {
        let item = (focus || []).find((item) => item.startsWith(ShortcutKeyFocusType.Monaco))
        // 为约束monaco与history同时存在相同快捷键所导致的2次触发(在monaco中执行)
        // 此时focus用于标记manaco中是否有焦点 有则不执行
        if (inViewport && !item) {
            const selected = getSelected()
            if (selected) {
                selected.IsWebsocket
                    ? newWebsocketFuzzerTab(selected.IsHTTPS, selected.Request)
                    : onSendToTab(selected, true, downstreamProxyStr)
            }
        }
    })

    useShortcutKeyTrigger("send*common", (focus) => {
        let item = (focus || []).find((item) => item.startsWith(ShortcutKeyFocusType.Monaco))
        if (inViewport && !item) {
            const selected = getSelected()
            if (selected) {
                selected.IsWebsocket
                    ? newWebsocketFuzzerTab(selected.IsHTTPS, selected.Request, false)
                    : onSendToTab(selected, false, downstreamProxyStr)
            }
        }
    })

    const size = useSize(ref)

    useUpdateEffect(() => {
        updateData()
    }, [refresh])

    const onScrollToByClickEvent = useMemoizedFn((v) => {
        try {
            const obj: {historyId: string; id: string} = JSON.parse(v)
            if (historyId === obj.historyId) {
                let scrollToIndex: number | undefined = undefined
                data.some((item, index) => {
                    if (item.Id + "" === obj.id) {
                        scrollToIndex = index
                    }
                    return item.Id + "" === obj.id
                })
                if (scrollToIndex !== undefined) {
                    // 加随机值触发更新渲染执行表格跳转方法
                    setScrollToIndex(scrollToIndex + "_" + Math.random())
                }
            }
        } catch (error) {}
    })
    useEffect(() => {
        emiter.on("onScrollToByClick", onScrollToByClickEvent)
        return () => {
            emiter.off("onScrollToByClick", onScrollToByClickEvent)
        }
    }, [])

    const updateAdvancedSearch = useMemo(() => {
        return ["History", "MITM"].includes(pageType || "") || showAdvancedSearch
    }, [pageType, showAdvancedSearch])
    // 获取默认高级筛选项
    useEffect(() => {
        if (updateAdvancedSearch) {
            // 筛选模式
            getRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableFilterMode).then((e) => {
                if (!!e) {
                    setFilterMode(e)
                }
            })
            // HostName
            getRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableHostName).then((e) => {
                if (!!e) {
                    let hostName = JSON.parse(e)
                    setHostName(hostName)
                }
            })
            // URL路径
            getRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableUrlPath).then((e) => {
                if (!!e) {
                    let pathArr = JSON.parse(e)
                    setUrlPath(pathArr)
                }
            })
            // 文件后缀
            getRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableFileSuffix).then((e) => {
                if (!!e) {
                    let fileSuffix = JSON.parse(e)
                    setFileSuffix(fileSuffix)
                }
            })
            // 响应类型
            getRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableContentType).then((e) => {
                if (!!e) {
                    const ContentType: string = e
                    setSearchContentType(ContentType)
                }
            })
            // 关键字
            getRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableExcludeKeywords).then((e) => {
                if (!!e) {
                    let excludeKeywords = JSON.parse(e)
                    setExcludeKeywords(excludeKeywords)
                }
            })
            // 状态码
            getRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableStatusCode).then((e) => {
                if (!!e) {
                    const statusCode: string = e
                    setStatusCode(statusCode)
                }
            })
        }
    }, [updateAdvancedSearch])

    const comHostName = useCampare(hostName)
    const comUrlPath = useCampare(urlPath)
    const comFileSuffix = useCampare(fileSuffix)
    const comExcludeKeywords = useCampare(excludeKeywords)
    useDebounceEffect(
        useMemoizedFn(() => {
            if (updateAdvancedSearch) {
                let newParams = {...params}

                let urlArr: string[] = []
                shieldData.data.map((item) => {
                    if (typeof item === "string") {
                        urlArr = [...urlArr, item]
                    }
                })

                // 屏蔽
                if (filterMode === "shield") {
                    urlArr.push(...hostName)
                    newParams = {
                        ...newParams,
                        SearchContentType: "",
                        ExcludeContentType: searchContentType.length === 0 ? [] : searchContentType.split(","),
                        IncludeInUrl: [],
                        ExcludeInUrl: [...new Set(urlArr)],
                        IncludePath: [],
                        ExcludePath: urlPath,
                        IncludeSuffix: [],
                        ExcludeSuffix: fileSuffix,
                        ExcludeKeywords: excludeKeywords,
                        ExcludeStatusCode: statusCode
                    }
                }
                // 展示
                else {
                    newParams = {
                        ...newParams,
                        SearchContentType: searchContentType,
                        ExcludeContentType: [],
                        IncludeInUrl: hostName,
                        ExcludeInUrl: urlArr,
                        IncludePath: urlPath,
                        ExcludePath: [],
                        IncludeSuffix: fileSuffix,
                        ExcludeSuffix: [],
                        ExcludeKeywords: [],
                        ExcludeStatusCode: ""
                    }
                }
                setParams(newParams)

                emiter.emit(
                    "onGetAdvancedSearchDataEvent",
                    JSON.stringify({
                        advancedSearchData: {
                            filterMode,
                            hostName,
                            urlPath,
                            fileSuffix,
                            searchContentType,
                            excludeKeywords,
                            statusCode
                        }
                    })
                )
            }
        }),
        [
            // ⚠️ 注意：此处依赖如果是引用值 请务必用useCampare处理
            updateAdvancedSearch,
            filterMode,
            comHostName,
            comUrlPath,
            comFileSuffix,
            searchContentType,
            comExcludeKeywords,
            statusCode
        ],
        {wait: 500}
    )
    const isFilter: boolean = useMemo(() => {
        return (
            hostName.length > 0 ||
            urlPath.length > 0 ||
            fileSuffix.length > 0 ||
            searchContentType?.length > 0 ||
            excludeKeywords.length > 0 ||
            statusCode?.length > 0
        )
    }, [hostName, urlPath, fileSuffix, searchContentType, excludeKeywords, statusCode])
    const onGetOtherPageAdvancedSearchData = useMemoizedFn((str: string) => {
        try {
            const value = JSON.parse(str)
            const {advancedSearchData} = value
            setFilterMode(advancedSearchData.filterMode)
            setHostName(advancedSearchData.hostName)
            setUrlPath(advancedSearchData.urlPath)
            setFileSuffix(advancedSearchData.fileSuffix)
            setSearchContentType(advancedSearchData.searchContentType)
            setExcludeKeywords(advancedSearchData.excludeKeywords)
            setStatusCode(advancedSearchData.statusCode)
        } catch (error) {}
    })
    useEffect(() => {
        if (updateAdvancedSearch) {
            emiter.on("onGetOtherPageAdvancedSearchDataEvent", onGetOtherPageAdvancedSearchData)
        }
        return () => {
            if (updateAdvancedSearch) {
                emiter.off("onGetOtherPageAdvancedSearchDataEvent", onGetOtherPageAdvancedSearchData)
            }
        }
    }, [updateAdvancedSearch])
    const handleShieldDataUpdate = useMemoizedFn(() => {
        setRemoteValue(HTTP_FLOW_TABLE_SHIELD_DATA, JSON.stringify(shieldData))
        let idArr: number[] = []
        let urlArr: string[] = []
        shieldData.data.map((item) => {
            if (typeof item === "string") {
                urlArr = [...urlArr, item]
            } else {
                idArr = [...idArr, item]
            }
        })

        setParams((prev) => {
            // 高级筛选 屏蔽hostName
            if (filterMode === "shield" && hostName.length) {
                urlArr.push(...hostName)
            }
            return {
                ...prev,
                ExcludeId: idArr,
                ExcludeInUrl: [...new Set(urlArr)]
            }
        })
    })
    useEffect(() => {
        if (pageType === "MITM") {
            emiter.emit("onGetMITMShieldDataEvent", JSON.stringify({shieldData, version: mitmVersion}))
        }
        // 判断是否第一次加载页面
        if (isOneceLoading.current) {
            getShieldList()
        } else {
            handleShieldDataUpdate()
        }
    }, [shieldData])
    useEffect(() => {
        getShieldList()
    }, [inViewport])
    useEffect(() => {
        if (inViewport) {
            getHTTPFlowsFieldGroup(true)
            searchCodecSingleHistoryPlugin()
            searchCodecMultipleHistoryPlugin()
        }
    }, [inViewport])

    const onRefreshPluginCodecMenu = useMemoizedFn(() => {
        if (inViewport) {
            searchCodecSingleHistoryPlugin()
            searchCodecMultipleHistoryPlugin()
        }
    })

    useEffect(() => {
        emiter.on("onRefPluginCodecMenu", onRefreshPluginCodecMenu)
        return () => {
            emiter.off("onRefPluginCodecMenu", onRefreshPluginCodecMenu)
        }
    }, [])

    const getShieldList = useMemoizedFn(() => {
        getRemoteValue(HTTP_FLOW_TABLE_SHIELD_DATA)
            .then((data) => {
                if (!data) return
                try {
                    const cacheData = JSON.parse(data)
                    setShieldData({
                        data: cacheData?.data || []
                    })
                } catch (e) {
                    updateData()
                    yakitNotify("error", `${t("HTTPFlowTable.loadBlockedParamsFailed")}${e}`)
                }
            })
            .finally(() => {
                isOneceLoading.current = false
            })
    })
    const onTableChange = useDebounceFn(
        (page: number, limit: number, sort: SortProps, filter: any) => {
            if (sort.order === "none") {
                sort.order = "desc"
            }
            if (filter["UpdatedAt"]) {
                const time = filter["UpdatedAt"]
                filter.AfterUpdatedAt = time[0]
                filter.BeforeUpdatedAt = time[1]
            } else {
                filter.AfterUpdatedAt = undefined
                filter.BeforeUpdatedAt = undefined
            }
            if (filter["ContentType"]) {
                filter["SearchContentType"] = filter["ContentType"].join(",")
            }
            setParams((prev) => {
                const newParams = {
                    ...prev,
                    ...filter,
                    Tags: [...tagsFilter],
                    bodyLength: !!(afterBodyLength || beforeBodyLength || checkBodyLength) // 用来判断响应长度的icon颜色是否显示蓝色
                }
                return newParams
            })
            setTriggerParamsWatch((old) => !old)
            if (sort.orderBy === "DurationMs") {
                sort.orderBy = "duration"
            }
            sortRef.current = sort
        },
        {wait: 500}
    ).run

    const campareProcessName = useCampare(props.ProcessName)
    useUpdateEffect(() => {
        if (pageType === "History") {
            setParams((prev) => ({
                ...prev,
                ProcessName: props.ProcessName || []
            }))
            setScrollToIndex(0)
            setCurrentIndex(undefined)
            setSelected(undefined)
            setSelectedRowKeys([])
            setSelectedRows([])
            setIsAllSelect(false)
        }
    }, [campareProcessName, pageType])

    /**
     * 网站树部分
     */
    useUpdateEffect(() => {
        if (["History", "Plugin"].includes(pageType || "")) {
            setParams((prev) => ({
                ...prev,
                SearchURL: props.searchURL,
                IncludeInUrl: props.includeInUrl
                    ? Array.isArray(props.includeInUrl)
                        ? props.includeInUrl
                        : [props.includeInUrl]
                    : [""]
            }))
            setScrollToIndex(0)
            setCurrentIndex(undefined)
            setSelected(undefined)
            setSelectedRowKeys([])
            setSelectedRows([])
            setIsAllSelect(false)
        }
    }, [props.searchURL, props.includeInUrl, pageType])
    useUpdateEffect(() => {
        if (params.SearchURL === "") {
            refreshTabsContRef.current = true
        }
    }, [params.SearchURL])
    const [queryParams, setQueryParams] = useState<string>("")
    useDebounceEffect(
        () => {
            if (queryParams !== "" && inViewport) {
                let refreshFlag = false
                if (refreshTabsContRef.current) {
                    refreshTabsContRef.current = false
                    refreshFlag = true
                }
                props.onQueryParams && props.onQueryParams(queryParams, refreshFlag)
            }
        },
        [queryParams, inViewport],
        {wait: 200}
    )
    const updateQueryParams = (query) => {
        const copyQuery = structuredClone(query)
        copyQuery.Color = copyQuery.Color ? copyQuery.Color : []
        copyQuery.StatusCode = copyQuery.StatusCode ? copyQuery.StatusCode : ""
        setQueryParams(JSON.stringify(copyQuery))
    }

    const extraTimerRef = useRef<any>() // 用于控制获取total和最大id的轮询
    useEffect(() => {
        return () => {
            clearInterval(extraTimerRef.current)
        }
    }, [])

    // 方法请求
    const getDataByGrpc = useMemoizedFn(async (query, type: "top" | "bottom" | "update" | "offset") => {
        // 插件执行中流量数据必有runTimeId
        if (["Plugin"].includes(pageType || "") && !runTimeId) {
            setTimeout(() => {
                setLoading(false)
                isGrpcRef.current = false
            }, 100)
            return
        }

        // history 页面时，判断倒序情况，并且未加载的数据超过200条时刷新页面(这里的数据是减去了缓存数据[offsetdata]数量后的数据)
        // start
        let isInitRefresh: boolean = false
        if (
            !backgroundRefresh &&
            pageType !== "MITM" &&
            type === "top" &&
            sortRef.current.order !== "asc" &&
            maxIdRef.current
        ) {
            const paginationProps = {
                Page: 1,
                Limit: 300,
                Order: "desc",
                OrderBy: sortRef.current.orderBy || "id"
            }
            const query = {
                ...params,
                Pagination: {...paginationProps},
                AfterId: maxIdRef.current
            }
            // 真正需要传给后端的查询数据
            const realQuery = cloneDeep(query)
            try {
                let res = (await ipcRenderer.invoke("QueryHTTPFlows", realQuery)) as YakQueryHTTPFlowResponse
                isInitRefresh = Number(res.Total) > 200
            } catch (error) {}
        }
        if (isInitRefresh) {
            updateData()
            return
        }
        // end

        if (isGrpcRef.current) return
        isGrpcRef.current = true

        // 真正需要传给后端的查询数据
        const realQuery = cloneDeep(query)
        // 表格上的顺序
        const tableOrder = query.Pagination.Order
        // 倒序时需要额外处理传给后端顺序
        if (["desc", "none"].includes(tableOrder)) {
            if (["top", "offset"].includes(type)) {
                realQuery.Pagination.Order = "asc"
            }
        }
        updateQueryParams(realQuery)
        ipcRenderer
            .invoke("QueryHTTPFlows", realQuery)
            .then((rsp: YakQueryHTTPFlowResponse) => {
                const resData = rsp?.Data || []
                const newData: HTTPFlow[] = getClassNameData(resData)
                const copyData = newData.slice()
                if (type === "top") {
                    if (newData.length <= 0) {
                        // 没有数据
                        serverPushStatus && setIsLoop(false)
                        return
                    }
                    if (["desc", "none"].includes(tableOrder)) {
                        const reverseData = copyData.reverse()
                        setData([...reverseData, ...data])
                        maxIdRef.current = reverseData[0].Id
                    } else {
                        // 升序
                        if (rsp.Pagination.Limit - data.length >= 0) {
                            setData([...data, ...newData])
                            maxIdRef.current = newData[newData.length - 1].Id
                        }
                    }
                } else if (type === "bottom") {
                    if (newData.length <= 0) {
                        // 没有数据
                        serverPushStatus && setIsLoop(false)
                        return
                    }
                    const arr = [...data, ...newData]
                    setData(arr)
                    if (["desc", "none"].includes(tableOrder)) {
                        minIdRef.current = newData[newData.length - 1].Id
                    } else {
                        // 升序
                        maxIdRef.current = newData[newData.length - 1].Id
                    }
                } else if (type === "offset") {
                    if (resData.length <= 0) {
                        // 没有数据
                        serverPushStatus && setIsLoop(false)
                        return
                    }
                    if (["desc", "none"].includes(tableOrder)) {
                        const reverseData = copyData.reverse()
                        const newOffsetData = reverseData.concat(getOffsetData())
                        maxIdRef.current = newOffsetData[0].Id
                        setOffsetData(newOffsetData)
                    }
                } else {
                    if (resData.length <= 0) {
                        // 没有数据
                        serverPushStatus && setIsLoop(false)
                    }
                    setSelectedRowKeys([])
                    setSelectedRows([])
                    setIsRefresh(!isRefresh)
                    setPagination(rsp.Pagination)
                    setData([...newData])
                    if (["desc", "none"].includes(tableOrder)) {
                        maxIdRef.current = newData.length > 0 ? newData[0].Id : 0
                        minIdRef.current = newData.length > 0 ? newData[newData.length - 1].Id : 0
                    } else {
                        maxIdRef.current = newData.length > 0 ? newData[newData.length - 1].Id : 0
                        minIdRef.current = newData.length > 0 ? newData[0].Id : 0
                    }
                    setTotal(rsp.Total)
                    // 开启定时器 用于算total和拿最新的最大id
                    if (extraTimerRef.current) {
                        clearInterval(extraTimerRef.current)
                    }
                    extraTimerRef.current = setInterval(() => getAddDataByGrpc(realQuery), 1000)
                }
            })
            .catch((e: any) => {
                if (idRef.current) {
                    clearInterval(idRef.current)
                }
                yakitNotify("error", `query HTTP Flow failed: ${e}`)
            })
            .finally(() =>
                setTimeout(() => {
                    setLoading(false)
                    isGrpcRef.current = false
                }, 100)
            )
    })

    const getAddDataByGrpc = useMemoizedFn((query) => {
        if (!isLoop) return
        const clientHeight = tableRef.current?.containerRef?.clientHeight
        // 解决页面未显示时 此接口轮询导致接口锁死
        if (clientHeight === 0) return
        const copyQuery = structuredClone(query)
        copyQuery.Pagination = {
            Page: 1,
            Limit: pagination.Limit,
            Order: "desc",
            OrderBy: "Id"
        }
        ipcRenderer
            .invoke("QueryHTTPFlows", copyQuery)
            .then((rsp: YakQueryHTTPFlowResponse) => {
                const resData = rsp?.Data || []
                if (resData.length) {
                    setTotal(rsp.Total)
                }
            })
            .catch(() => {
                if (extraTimerRef.current) {
                    clearInterval(extraTimerRef.current)
                }
            })
    })

    // 偏移量更新顶部数据
    const updateTopData = useMemoizedFn(() => {
        // 倒序的时候有储存的偏移量 则直接使用
        if (getOffsetData().length && ["desc", "none"].includes(sortRef.current.order)) {
            setData([...getOffsetData(), ...data])
            setOffsetData([])
            return
        }
        // 如无偏移 则直接请求数据
        if (maxIdRef.current === 0) {
            updateData()
            return
        }
        const paginationProps = {
            Page: 1,
            Limit: pagination.Limit,
            Order: sortRef.current.order,
            OrderBy: sortRef.current.orderBy || "id"
        }

        const query = {
            ...params,
            Pagination: {...paginationProps},
            AfterId: maxIdRef.current
        }
        if (pageType === "MITM" && query.AfterUpdatedAt === undefined && query.BeforeUpdatedAt === undefined) {
            updateMITMPageQuery(query, "top")
            return
        }
        getDataByGrpc(query, "top")
    })

    // 偏移量更新底部数据
    const updateBottomData = useMemoizedFn(() => {
        // 如无偏移 则直接请求数据
        if (minIdRef.current === 0) {
            updateData()
            return
        }
        const paginationProps = {
            Page: 1,
            Limit: pagination.Limit,
            Order: sortRef.current.order,
            OrderBy: sortRef.current.orderBy || "id"
        }

        const query = {
            ...params,
            BeforeId: ["desc", "none"].includes(paginationProps.Order) ? minIdRef.current : undefined,
            AfterId: ["desc", "none"].includes(paginationProps.Order) ? undefined : maxIdRef.current,
            Pagination: {...paginationProps}
        }
        if (pageType === "MITM" && query.AfterUpdatedAt === undefined && query.BeforeUpdatedAt === undefined) {
            updateMITMPageQuery(query, "bottom")
            return
        }
        getDataByGrpc(query, "bottom")
    })

    const queyChangeUpdateData = useDebounceFn(
        () => {
            updateData()
        },
        {wait: 500}
    ).run
    const [triggerParamsWatch, setTriggerParamsWatch] = useState<boolean>(false)
    const comParams = useCampare(params)
    useUpdateEffect(() => {
        queyChangeUpdateData()
    }, [comParams, triggerParamsWatch])
    // 根据页面大小动态计算需要获取的最新数据条数(初始请求)
    const updateData = useMemoizedFn(() => {
        if (boxHeightRef.current) {
            setOffsetData([])
            maxIdRef.current = 0
            minIdRef.current = 0
            const limitCount: number = Math.ceil(boxHeightRef.current / 28)
            const paginationProps = {
                Page: 1,
                Limit: limitCount,
                Order: sortRef.current.order,
                OrderBy: sortRef.current.orderBy || "id"
            }
            isGrpcRef.current = false
            const query = {
                ...params,
                Pagination: {...paginationProps}
            }
            if (pageType === "MITM" && query.AfterUpdatedAt === undefined && query.BeforeUpdatedAt === undefined) {
                updateMITMPageQuery(query, "update")
                return
            }
            setSelectedRowKeys([])
            setSelectedRows([])
            setScrollToIndex(0)
            setCurrentIndex(undefined)
            setOnlyShowFirstNode && setOnlyShowFirstNode(true)
            setUpdateCacheData([])
            getDataByGrpc(query, "update")
        } else {
            setIsLoop(true)
        }
    })

    // 滚轮处于中间时 监听是否有数据更新
    const updateOffsetData = useMemoizedFn(() => {
        const paginationProps = {
            Page: 1,
            Limit: OFFSET_STEP,
            Order: "desc",
            OrderBy: "id"
        }
        const query = {
            ...params,
            AfterId: maxIdRef.current,
            Pagination: {...paginationProps}
        }

        if (pageType === "MITM" && query.AfterUpdatedAt === undefined && query.BeforeUpdatedAt === undefined) {
            updateMITMPageQuery(query, "offset")
            return
        }
        getDataByGrpc(query, "offset")
    })

    const updateMITMPageQuery = useMemoizedFn((query, type: "top" | "bottom" | "update" | "offset") => {
        getRemoteValue(MITMConsts.MITMStartTimeStamp).then((time: string) => {
            if (!data) return
            query.AfterUpdatedAt = parseInt(time)
            getDataByGrpc(query, type)
        })
    })

    // 获取tags等分组
    const getHTTPFlowsFieldGroup = useMemoizedFn(
        (RefreshRequest: boolean, callBack?: (tags: FiltersItemProps[]) => void) => {
            ipcRenderer
                .invoke("HTTPFlowsFieldGroup", {
                    RefreshRequest
                })
                .then((rsp: HTTPFlowsFieldGroupResponse) => {
                    const tags = rsp.Tags.filter((item) => item.Value)
                    const realTags: FiltersItemProps[] = tags.map((ele) => ({label: ele.Value, value: ele.Value}))
                    setTags(realTags)
                    callBack && callBack(realTags)
                })
                .catch((e: any) => {
                    yakitNotify("error", `query HTTP Flows Field Group failed: ${e}`)
                })
        }
    )

    const scrollUpdate = useMemoizedFn(() => {
        if (isGrpcRef.current) return
        const scrollTop = tableRef.current?.containerRef?.scrollTop
        const clientHeight = tableRef.current?.containerRef?.clientHeight
        const scrollHeight = tableRef.current?.containerRef?.scrollHeight
        // let scrollBottom: number|undefined = undefined
        let scrollBottomPercent: number | undefined = undefined
        if (typeof scrollTop === "number" && typeof clientHeight === "number" && typeof scrollHeight === "number") {
            // scrollBottom = parseInt((scrollHeight - scrollTop - clientHeight).toFixed())
            scrollBottomPercent = Number(((scrollTop + clientHeight) / scrollHeight).toFixed(2))
        }

        // 如果页面可见，更新滚动条位置信息
        // 记录的滚动条位置信息为了，在后台刷新时使用，因为在后台时，该页面已被 display:none
        if (inViewport) {
            scrollSize.current = {scrollTop, scrollBottomPercent: scrollBottomPercent || 0}
        }

        // 滚动条接近触顶
        if (scrollSize.current.scrollTop < 10) {
            updateTopData()
            setOffsetData([])
        }
        // 滚动条接近触底
        else if (
            typeof scrollSize.current.scrollBottomPercent === "number" &&
            scrollSize.current.scrollBottomPercent > 0.9
        ) {
            updateBottomData()
            setOffsetData([])
        }
        // 滚动条在中间 增量
        else {
            if (data.length === 0) {
                updateData()
            } else {
                // 倒序的时候才需要掉接口拿偏移数据
                if (["desc", "none"].includes(sortRef.current.order)) {
                    updateOffsetData()
                }
            }
        }
    })

    useEffect(() => {
        props.onSelected && props.onSelected(selected)
    }, [selected])

    // 是否循环接口
    const [isLoop, setIsLoop] = useState<boolean>(!serverPushStatus)
    const [updateCacheData, setUpdateCacheData] = useState<UpdateCacheData[]>([])

    const onRefreshQueryHTTPFlowsFun = useMemoizedFn((data) => {
        try {
            const updateData = JSON.parse(data)
            if (typeof updateData !== "string") {
                if (updateData.action === "update") {
                    setUpdateCacheData((prev) => prev.concat(updateData))
                }
            }
        } catch (error) {}
        setIsLoop(true)
    })
    useEffect(() => {
        emiter.on("onRefreshQueryHTTPFlows", onRefreshQueryHTTPFlowsFun)
        return () => {
            emiter.off("onRefreshQueryHTTPFlows", onRefreshQueryHTTPFlowsFun)
        }
    }, [])

    useEffect(() => {
        let sTop, cHeight, sHeight
        let id = setInterval(() => {
            const scrollTop = tableRef.current?.containerRef?.scrollTop
            const clientHeight = tableRef.current?.containerRef?.clientHeight
            const scrollHeight = tableRef.current?.containerRef?.scrollHeight
            if (sTop !== scrollTop || cHeight !== clientHeight || sHeight !== scrollHeight) {
                setIsLoop(true)
            }
            sTop = scrollTop
            cHeight = clientHeight
            sHeight = scrollHeight
        }, 1000)
        return () => clearInterval(id)
    }, [])

    // 设置是否自动刷新
    const idRef = useRef<any>()
    useEffect(() => {
        return () => {
            clearInterval(idRef.current)
        }
    }, [])

    /** ---------- 后台刷新 Start ---------- */
    const [backgroundRefresh, setBackgroundRefresh] = useState<boolean>(false)
    const isBackgroundRefresh = useMemo(() => {
        return backgroundRefresh && pageType !== "MITM"
    }, [backgroundRefresh, pageType])
    useEffect(() => {
        // 获取缓存的后台刷新状态
        getRemoteValue(RemoteHistoryGV.BackgroundRefresh)
            .then((value) => {
                setBackgroundRefresh(!!value)
            })
            .catch(() => {})
    }, [inViewport])

    // 实时更新滚动条位置
    const scrollSize = useRef<{scrollTop: number; scrollBottomPercent: number}>({scrollTop: 0, scrollBottomPercent: 0})
    /** ---------- 后台刷新 End ---------- */

    useEffect(() => {
        if (inViewport || isBackgroundRefresh) {
            scrollUpdate()
            if (isLoop) {
                if (idRef.current) {
                    clearInterval(idRef.current)
                }
                idRef.current = setInterval(scrollUpdate, 1000)
            }
        }
        return () => clearInterval(idRef.current)
    }, [inViewport, isLoop, isBackgroundRefresh])

    // 保留数组中非重复数据
    const filterNonUnique = (arr) => arr.filter((i) => arr.indexOf(i) === arr.lastIndexOf(i))
    // 数组去重
    const filterItem = (arr) => arr.filter((item, index) => arr.indexOf(item) === index)

    // 取消屏蔽筛选
    const cancleFilter = useMemoizedFn((value) => {
        const newArr = filterNonUnique([...shieldData.data, value])
        const newObj = {...shieldData, data: newArr}
        setShieldData(newObj)
    })
    // 取消所有屏蔽筛选
    const cancleAllFilter = useMemoizedFn((version) => {
        if (version !== mitmVersion) return
        const newObj = {...shieldData, data: []}
        setShieldData(newObj)
    })

    const cancleMitmFilter = useMemoizedFn((str: string) => {
        try {
            const data = JSON.parse(str)
            const {version, value} = data
            if (version !== mitmVersion) return
            cancleFilter(value)
        } catch (error) {}
    })

    const cleanLogTableData = useMemoizedFn((version) => {
        if (version !== mitmVersion) return
        setOnlyShowFirstNode && setOnlyShowFirstNode(true)
        setData([])
        setParams((prev) => ({
            ...prev,
            AfterUpdatedAt: undefined,
            BeforeUpdatedAt: undefined
        }))
    })

    const onColorSure = useDebounceFn(
        useMemoizedFn(() => {
            if (isShowColor) {
                setIsShowColor(false)
            }
            setParams((prev) => ({
                ...prev,
                Color: color
            }))
        }),
        {wait: 300}
    ).run

    useEffect(() => {
        if (!selectedRowKeys.length) {
            setIsAllSelect(false)
        }
    }, [selectedRowKeys])

    useEffect(() => {
        setIsAllSelect(false)
    }, [data])

    const onSelectAll = (newSelectedRowKeys: string[], selected: HTTPFlow[], checked: boolean) => {
        setIsAllSelect(checked)
        setSelectedRowKeys(newSelectedRowKeys)
        setSelectedRows(selected)
    }
    const onSelectChange = useMemoizedFn((c: boolean, keys: string, rows: HTTPFlow) => {
        if (c) {
            setSelectedRowKeys([...selectedRowKeys, keys])
            setSelectedRows([...selectedRows, rows])
        } else {
            setIsAllSelect(false)
            const newSelectedRowKeys = selectedRowKeys.filter((ele) => ele !== keys)
            const newSelectedRows = selectedRows.filter((ele) => ele.Id !== rows.Id)
            setSelectedRowKeys(newSelectedRowKeys)
            setSelectedRows(newSelectedRows)
        }
    })
    const onRowClick = useMemoizedFn((rowDate?: HTTPFlow) => {
        if (rowDate) {
            setSelected(rowDate)
            setOnlyShowFirstNode && setOnlyShowFirstNode(false)
            minWinSendToChildWin({
                type: "openPacketNewWindow",
                data: getPacketNewWindow(rowDate)
            })
        } else {
            setSelected(undefined)
            setOnlyShowFirstNode && setOnlyShowFirstNode(!onlyShowFirstNode)
        }
    })

    // 如果YakitResizeBox只展示第一个节点，则要清除Selected
    useEffect(() => {
        onlyShowFirstNode && setCurrentIndex(undefined)
    },[onlyShowFirstNode] )

    const onSetCurrentRow = useDebounceFn(
        (rowDate: HTTPFlow | undefined) => {
            onRowClick(rowDate ? getHTTPFlowReqAndResToString(rowDate) : undefined)
        },
        {wait: 200, leading: true}
    ).run

    const onCheckThan0 = useDebounceFn(
        (check: boolean) => {
            setCheckBodyLength(check)
            setParams((prev) => {
                if (!getAfterBodyLength()) {
                    prev.AfterBodyLength = check ? 1 : undefined
                }
                return {
                    ...prev
                }
            })
        },
        {wait: 200}
    ).run

    // #region 表格自定义相关（excludeCustomColumnsKey这个变量暂时勿动，没有做其他列兼容）
    // 需要完全排除列字段，表格不可能出现的列
    const noColumnsKey: string[] = ["Payloads"]
    // 不需要参与自定义的列（也就是不需要存进缓存）
    const excludeCustomColumnsKey: string[] = ["Payloads"]
    const specialCustoms = useMemoizedFn((key) => {
        return excludeCustomColumnsKey.includes(key) || noColumnsKey.includes(key)
    })
    // 排除展示的列（包含noColumnsKey）
    const [excludeColumnsKey, setExcludeColumnsKey] = useState<string[]>(noColumnsKey)
    // 默认所有列展示顺序
    const defalutColumnsOrderRef = useRef<string[]>(defalutColumnsOrder.filter((key) => !noColumnsKey.includes(key)))
    // 所有列展示顺序（不包含excludeCustomColumnsKey）
    const [columnsOrder, setColumnsOrder] = useState<string[]>([])
    useEffect(() => {
        if (inViewport) {
            Promise.allSettled([
                getRemoteValue(RemoteHistoryGV.HistroyExcludeColumnsKey),
                getRemoteValue(RemoteHistoryGV.HistroyColumnsOrder)
            ]).then((res) => {
                let refreshTabelKey = false
                if (res[0].status === "fulfilled") {
                    const arr = res[0].value.split(",")
                    const excludeKeys = [...arr, ...noColumnsKey].filter((key) => key)
                    // 确保顺序缓存里面的key一定在默认所有列中存在
                    const realArr = excludeKeys.filter((key: string) => defalutColumnsOrderRef.current.includes(key))
                    if (!isEqual(realArr, excludeColumnsKey)) {
                        refreshTabelKey = true
                        setExcludeColumnsKey(realArr)
                    }
                    setRemoteValue(
                        RemoteHistoryGV.HistroyExcludeColumnsKey,
                        realArr.filter((key) => !specialCustoms(key)) + ""
                    )
                }
                if (res[1].status === "fulfilled") {
                    try {
                        const arr = JSON.parse(res[1].value) || []
                        // 确保顺序缓存里面的key一定在默认所有列中存在
                        const arr2 = arr.filter((key: string) => defalutColumnsOrderRef.current.includes(key))
                        // 按照 defalutColumnsOrderRef.current 顺序补充新增列
                        defalutColumnsOrderRef.current.forEach((key: string, idx: number) => {
                            if (!arr2.includes(key)) {
                                let insertIdx = arr2.findIndex((k) => defalutColumnsOrderRef.current.indexOf(k) > idx)
                                if (insertIdx === -1) {
                                    arr2.push(key)
                                } else {
                                    arr2.splice(insertIdx, 0, key)
                                }
                            }
                        })
                        const realArr = arr2.filter((key) => !specialCustoms(key))
                        setRemoteValue(RemoteHistoryGV.HistroyColumnsOrder, JSON.stringify(realArr))
                        if (!isEqual(realArr, columnsOrder)) {
                            refreshTabelKey = true
                            setColumnsOrder(realArr)
                        }
                    } catch (error) {}
                }

                if (refreshTabelKey) {
                    setTableKeyNumber(uuidv4())
                }
            })
        }
    }, [inViewport])
    // 表格可配置列
    const configColumnRef = useRef<ColumnAllInfoItem[]>([])
    // 表格的key值
    const [tableKeyNumber, setTableKeyNumber] = useState<string>(uuidv4())
    // 序号是否固定
    const [idFixed, setIdFixed] = useState<boolean>(true)
    const columns: ColumnsTypeProps[] = useCreation<ColumnsTypeProps[]>(() => {
        // ⚠️ 注意：此处新增或删除列请务必同步 流量分析页面，还有处理 defalutColumnsOrder 变量，这个变量是存的全部的列默认顺序key
        const columnArr: ColumnsTypeProps[] = [
            {
                title: t("YakitTable.order"),
                dataKey: "Id",
                fixed: idFixed ? "left" : undefined,
                ellipsis: false,
                width: 96,
                enableDrag: false,
                sorterProps: {
                    sorter: true
                }
            },
            {
                title: t("HTTPFlowTable.method"),
                dataKey: "Method",
                width: 100,
                filterProps: {
                    filterKey: "Methods",
                    filtersType: "select",
                    filterMultiple: true,
                    filters: [
                        {
                            label: "GET",
                            value: "GET"
                        },
                        {
                            label: "POST",
                            value: "POST"
                        },
                        {
                            label: "HEAD",
                            value: "HEAD"
                        },
                        {
                            label: "PUT",
                            value: "PUT"
                        },
                        {
                            label: "DELETE",
                            value: "DELETE"
                        },
                        {
                            label: "PATCH",
                            value: "PATCH"
                        }
                    ]
                }
            },
            {
                title: t("HTTPFlowTable.statusCode"),
                dataKey: "StatusCode",
                width: 120,
                filterProps: {
                    filterKey: "StatusCode",
                    filtersType: "input",
                    filterIcon: <OutlineSearchIcon className={style["filter-icon"]} />,
                    filterInputProps: {
                        placeholder: t("YakitInput.supportInputFormat"),
                        wrapperStyle: {width: 270},
                        onRegular: (value) => {
                            // 只允许输入数字、逗号和连字符，去掉所有其他字符
                            return value.replace(/[^0-9,-]/g, "")
                        }
                    }
                },
                render: (text, rowData) => {
                    return (
                        <div
                            className={classNames({
                                [style["status-code"]]: !isCellRedSingleColor(rowData.cellClassName)
                            })}
                        >
                            {text}
                        </div>
                    )
                }
            },
            {
                title: "URL",
                dataKey: "Url",
                width: 400,
                filterProps: {
                    filterKey: "SearchURL",
                    filtersType: "input",
                    filterIcon: <OutlineSearchIcon className={style["filter-icon"]} />
                }
            },
            {
                title: "Host",
                dataKey: "Host",
                width: 200
            },
            {
                title: "Path",
                dataKey: "Path",
                width: 400
            },
            {
                title: t("HTTPFlowTable.fromPlugin"),
                dataKey: "FromPlugin",
                width: 200,
                filterProps: {
                    filterKey: "FromPlugin",
                    filtersType: "input",
                    filterIcon: <OutlineSearchIcon className={style["filter-icon"]} />
                }
            },
            {
                title: "Tags",
                dataKey: "Tags",
                width: 150,
                render: (text) => {
                    return text
                        ? `${text}`
                              .split("|")
                              .filter((i) => !i.startsWith("YAKIT_COLOR_"))
                              .join(", ")
                        : ""
                },
                filterProps: {
                    filterKey: "Tags",
                    filterMultiple: true,
                    filterIcon: (
                        <OutlineSearchIcon
                            className={style["filter-icon"]}
                            onClick={() => getHTTPFlowsFieldGroup(true)}
                        />
                    ),
                    filterRender: (closePopover: () => void) => {
                        return (
                            <MultipleSelect
                                filterProps={{
                                    filterSearch: true,
                                    filterSearchInputProps: {
                                        prefix: <OutlineSearchIcon className='search-icon' />,
                                        allowClear: true
                                    }
                                }}
                                originalList={tags}
                                searchVal={tagSearchVal}
                                onChangeSearchVal={setTagSearchVal}
                                value={tagsFilter}
                                onSelect={(v, item) => {
                                    if (Array.isArray(v)) {
                                        setTagsFilter(v)
                                        if (pageType === "MITM") {
                                            emiter.emit(
                                                "onHistoryTagToMitm",
                                                JSON.stringify({
                                                    tags: v.join(","),
                                                    version: mitmVersion
                                                })
                                            )
                                        }
                                    }
                                }}
                                onClose={() => {
                                    closePopover()
                                }}
                                onQuery={() => {
                                    // 这里重置过后的 tagsFilter 不一定是最新的
                                    setParams((prev) => ({...prev, Tags: []}))
                                }}
                                selectContainerStyle={{
                                    maxHeight: "40vh"
                                }}
                            ></MultipleSelect>
                        )
                    }
                }
            },
            {
                title: "IP",
                dataKey: "IPAddress",
                width: 200
            },
            {
                title: t("HTTPFlowTable.bodyLength"),
                dataKey: "BodyLength",
                width: 130,
                filterProps: {
                    filterKey: "bodyLength",
                    filterIcon: <OutlineSelectorIcon className={style["filter-icon"]} />,
                    filterRender: (closePopover: () => void) => (
                        <RangeInputNumberTableWrapper
                            checkBodyLength={checkBodyLength}
                            onCheckThan0={onCheckThan0}
                            minNumber={getAfterBodyLength()}
                            setMinNumber={setAfterBodyLength}
                            maxNumber={getBeforeBodyLength()}
                            setMaxNumber={setBeforeBodyLength}
                            onReset={() => {
                                setParams((prev) => ({
                                    ...prev,
                                    AfterBodyLength: checkBodyLength ? 1 : undefined,
                                    BeforeBodyLength: undefined
                                }))
                                setBeforeBodyLength(undefined)
                                setAfterBodyLength(undefined)
                                setBodyLengthUnit("B")
                                setTimeout(() => {
                                    closePopover()
                                }, 50)
                            }}
                            onSure={() => {
                                const afterBodyLen = getAfterBodyLength()
                                const beforeBodyLen = getBeforeBodyLength()
                                setParams((prev) => ({
                                    ...prev,
                                    AfterBodyLength:
                                        checkBodyLength && !afterBodyLen
                                            ? 1
                                            : afterBodyLen
                                            ? onConvertBodySizeByUnit(afterBodyLen, getBodyLengthUnit())
                                            : undefined,
                                    BeforeBodyLength: beforeBodyLen
                                        ? onConvertBodySizeByUnit(beforeBodyLen, getBodyLengthUnit())
                                        : undefined
                                }))
                                setTimeout(() => {
                                    closePopover()
                                }, 50)
                            }}
                            extra={
                                <YakitSelect
                                    value={getBodyLengthUnit()}
                                    onSelect={(val) => {
                                        setBodyLengthUnit(val)
                                    }}
                                    wrapperClassName={style["unit-select"]}
                                    size='small'
                                >
                                    <YakitSelect value='B'>B</YakitSelect>
                                    <YakitSelect value='K'>K</YakitSelect>
                                    <YakitSelect value='M'>M</YakitSelect>
                                </YakitSelect>
                            }
                        />
                    )
                },
                render: (_, rowData) => {
                    return (
                        <>
                            {/* 1M 以上的话，是红色*/}
                            {rowData.BodyLength !== -1 && (
                                <div
                                    className={classNames({
                                        [style["body-length-text-red"]]:
                                            rowData.BodyLength > 1000000 && !isCellRedSingleColor(rowData.cellClassName)
                                    })}
                                >
                                    {rowData.BodySizeVerbose ? rowData.BodySizeVerbose : rowData.BodyLength}
                                </div>
                            )}
                        </>
                    )
                }
            },
            {
                title: "Title",
                dataKey: "HtmlTitle",
                width: 200
            },
            {
                title: t("HTTPFlowTable.params"),
                dataKey: "GetParamsTotal",
                width: 130,
                filterProps: {
                    filterKey: "HaveParamsTotal",
                    filtersType: "select",
                    filtersSelectAll: {
                        isAll: true
                    },
                    filters: [
                        {
                            label: t("HTTPFlowTable.have"),
                            value: "true"
                        },
                        {
                            label: t("HTTPFlowTable.none"),
                            value: "false"
                        }
                    ]
                },
                render: (_, rowData) => (
                    <div className={style["check-circle"]}>
                        {(rowData.GetParamsTotal > 0 || rowData.PostParamsTotal > 0) && (
                            <CheckCircleIcon
                                className={classNames({
                                    [style["check-circle-icon"]]: !isCellRedSingleColor(rowData.cellClassName)
                                })}
                            />
                        )}
                    </div>
                )
            },
            {
                title: t("HTTPFlowTable.contentType"),
                dataKey: "ContentType",
                width: 150,
                render: (text) => {
                    let contentTypeFixed =
                        text
                            .split(";")
                            .map((el: any) => el.trim())
                            .filter((i: any) => !i.startsWith("charset"))
                            .join(",") || "-"
                    if (contentTypeFixed.includes("/")) {
                        const contentTypeFixedNew = contentTypeFixed.split("/").pop()
                        if (!!contentTypeFixedNew) {
                            contentTypeFixed = contentTypeFixedNew
                        }
                    }
                    return <div>{contentTypeFixed === "null" ? "" : contentTypeFixed}</div>
                },
                filterProps: {
                    filtersType: "select",
                    filterMultiple: true,
                    filterSearchInputProps: {
                        size: "small"
                    },
                    filterIcon: <OutlineSearchIcon className={style["filter-icon"]} />,
                    filters: contentType
                }
            },
            {
                title: t("HTTPFlowTable.durationMs"),
                dataKey: "DurationMs",
                width: 120,
                render: (text, rowData) => {
                    let timeMs: number = parseInt(text)
                    return (
                        <div
                            className={classNames({
                                [style["duration-ms"]]: !isCellRedSingleColor(rowData.cellClassName)
                            })}
                        >
                            {timeMs}
                        </div>
                    )
                }
            },
            {
                title: t("HTTPFlowTable.updatedAt"),
                dataKey: "UpdatedAt",
                filterProps: {
                    filterKey: "UpdatedAt",
                    filtersType: "dateTime"
                },
                width: 200,
                render: (text) => <div title={formatTimestamp(text)}>{text === 0 ? "-" : formatTimestamp(text)}</div>
            },
            {
                title: t("HTTPFlowTable.requestSizeVerbose"),
                dataKey: "RequestSizeVerbose",
                enableDrag: false,
                width: 120
            },
            {
                title: t("YakitTable.action"),
                dataKey: "action",
                width: 80,
                fixed: "right",
                render: (_, rowData) => {
                    if (!rowData.Hash) return <></>
                    const colorType = getSingleColorType(rowData.cellClassName) // 获取颜色类型
                    return (
                        <div
                            className={classNames(style["action-btn-group"], {
                                [style[`hover-${colorType}-row`]]: !!colorType // 添加 hover 类
                            })}
                        >
                            <ChromeFrameSvgIcon
                                className={classNames(style["icon-hover"], {
                                    [style["icon-style"]]: !colorType
                                })}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    ipcRenderer
                                        .invoke("GetHTTPFlowById", {Id: rowData?.Id})
                                        .then((i: HTTPFlow) => {
                                            i.Url && openExternalWebsite(i.Url)
                                        })
                                        .catch((e: any) => {
                                            yakitNotify("error", `Query HTTPFlow failed: ${e}`)
                                        })
                                }}
                            />
                            <div className={style["divider-style"]}></div>

                            <ArrowCircleRightSvgIcon
                                className={classNames(style["icon-hover"], {
                                    [style["icon-style"]]: !colorType
                                })}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    let m = showYakitDrawer({
                                        width: "80%",
                                        content: onExpandHTTPFlow(rowData, () => m.destroy(), downstreamProxyStr, t),
                                        bodyStyle: {paddingTop: 5}
                                    })
                                }}
                            />
                        </div>
                    )
                }
            }
        ]

        let finalColumns: ColumnsTypeProps[] = []
        // 排序
        if (columnsOrder.length) {
            // 提取 Id 和 action
            const idColumn = columnArr.find((col) => col.dataKey === "Id")
            const actionColumn = columnArr.find((col) => col.dataKey === "action")
            // 过滤掉 Id 和 action以及不可能出现的列
            const middleColumns = columnArr.filter((item) => !["Id", "action", ...noColumnsKey].includes(item.dataKey))

            // 先按 columnsOrder 排序
            const sortedColumns = middleColumns.sort(
                (a, b) => columnsOrder.indexOf(a.dataKey) - columnsOrder.indexOf(b.dataKey)
            )

            // 先加上Id
            if (idColumn) finalColumns.push(idColumn)
            sortedColumns.forEach((col) => {
                // 加入当前 columnsOrder 里的字段
                finalColumns.push(col)
            })
            // 最后加上action
            if (actionColumn) finalColumns.push(actionColumn)
        } else {
            finalColumns = columnArr.slice()
        }

        const arr = finalColumns
            .filter((item) => !["Id", "action", ...noColumnsKey].includes(item.dataKey))
            .map((item) => ({
                dataKey: item.dataKey,
                title: item.title,
                isShow: !excludeColumnsKey.includes(item.dataKey)
            }))
        configColumnRef.current = arr

        const realColumns = finalColumns.filter((ele) => !excludeColumnsKey.includes(ele.dataKey))
        setIdFixed(realColumns.length !== 2)
        return realColumns
    }, [
        tags,
        tagsFilter,
        tagSearchVal,
        checkBodyLength,
        downstreamProxyStr,
        pageType,
        queryParams,
        columnsOrder,
        excludeColumnsKey,
        idFixed,
        i18n.language
    ])
    // #endregion

    // 高级配置
    const [advancedSetVisible, setAdvancedSetVisible] = useState<boolean>(false)
    const isAdvancedSet = useMemo(() => {
        const realDefalutColumnsOrder = defalutColumnsOrderRef.current.filter((key) => !specialCustoms(key))
        const orderFlag1 =
            columnsOrder.length === 0 ? false : JSON.stringify(realDefalutColumnsOrder) !== JSON.stringify(columnsOrder)
        const orderFlag2 = !!excludeColumnsKey.filter((key) => !specialCustoms(key)).length
        return orderFlag1 || orderFlag2 || isBackgroundRefresh
    }, [isBackgroundRefresh, excludeColumnsKey, columnsOrder])

    // 标注颜色批量
    const CalloutColorBatch = useMemoizedFn((flowList: HTTPFlow[], number: number, i: any) => {
        if (flowList.length === 0) {
            yakitNotify("warning", t("HTTPFlowTable.pleaseSelectData"))
            return
        }
        if (flowList.length > number) {
            yakitNotify("warning", t("HTTPFlowTable.maxOperateData", {number}))
            return
        }
        const newList = flowList.map((flow) => {
            const existedTags = flow.Tags
                ? flow.Tags.split("|").filter((i) => !!i && !i.startsWith("YAKIT_COLOR_"))
                : []
            existedTags.push(`YAKIT_COLOR_${i.color.toUpperCase()}`)
            return {Id: flow.Id, Hash: flow.Hash, Tags: existedTags}
        })
        ipcRenderer
            .invoke("SetTagForHTTPFlow", {
                CheckTags: newList
            })
            .then(() => {
                // info(`设置 HTTPFlow 颜色成功`)
                let newData: HTTPFlow[] = []
                const l = data.length
                for (let index = 0; index < l; index++) {
                    const item = data[index]
                    const find = newList.find((ele) => ele.Hash === item.Hash)
                    if (!!find) {
                        item.Tags = (find.Tags || []).join("|")
                        item.cellClassName = filterColorTag(item.Tags) || undefined
                    }
                    newData.push(item)
                }
                setData(newData)
                setSelectedRowKeys([])
                setSelectedRows([])
            })
    })
    // 移除颜色  批量
    const onRemoveCalloutColorBatch = useMemoizedFn((flowList: HTTPFlow[], number: number) => {
        if (flowList.length === 0) {
            yakitNotify("warning", t("HTTPFlowTable.pleaseSelectData"))
            return
        }
        if (flowList.length > number) {
            yakitNotify("warning", t("HTTPFlowTable.maxOperateData", {number}))
            return
        }
        const newList = flowList.map((flow) => {
            const existedTags = flow.Tags
                ? flow.Tags.split("|").filter((i) => !!i && !i.startsWith("YAKIT_COLOR_"))
                : []
            // existedTags.pop() // 不知道为什么需要 pop
            return {Id: flow.Id, Hash: flow.Hash, Tags: existedTags}
        })
        ipcRenderer
            .invoke("SetTagForHTTPFlow", {
                CheckTags: newList
            })
            .then(() => {
                // info(`清除 HTTPFlow 颜色成功`)
                let newData: HTTPFlow[] = []
                const l = data.length
                for (let index = 0; index < l; index++) {
                    const item = data[index]
                    const find = newList.find((ele) => ele.Hash === item.Hash)
                    if (!!find) {
                        item.Tags = (find.Tags || []).join("|")
                        item.cellClassName = ""
                    }
                    newData.push(item)
                }
                setData(newData)
                setSelectedRowKeys([])
                setSelectedRows([])
            })
    })

    //删除
    const onRemoveHttpHistory = useMemoizedFn((query) => {
        setLoading(true)
        if (isAllSelect) {
            onRemoveHttpHistoryAll(true, query)
            return
        }
        ipcRenderer
            .invoke("DeleteHTTPFlows", {
                ...query
            })
            .then(() => {
                yakitNotify("info", t("YakitNotification.deleted"))
                refreshTabsContRef.current = true
                updateData()
            })
            .finally(() => setTimeout(() => setLoading(false), 100))
    })

    const onDeleteToUpdateEvent = useMemoizedFn((v: string) => {
        const {sourcePage}: {sourcePage?: HTTPHistorySourcePageType} = JSON.parse(v)
        if (sourcePage && pageType && sourcePage !== pageType) {
            updateData()
        }
    })

    useEffect(() => {
        emiter.on("onDeleteToUpdate", onDeleteToUpdateEvent)
        return () => {
            emiter.off("onDeleteToUpdate", onDeleteToUpdateEvent)
        }
    }, [])

    // 删除成功时 通知所有使用该组件的控件更新
    const onUpdateOtherPage = useMemoizedFn(() => {
        // 说明： 此处emit并非是通知当前组件 而是通知复用此组件的其余组件 根据pageType区分
        emiter.emit("onDeleteToUpdate", JSON.stringify({sourcePage: pageType}))
        emiter.emit("onDeleteToUpdateHTTPHistoryFilter")
    })

    //删除 重置请求 ID
    const onRemoveHttpHistoryAllAndResetId = useMemoizedFn(() => {
        setLoading(true)
        ipcRenderer
            .invoke("DeleteHTTPFlows", {DeleteAll: true})
            .then(() => {
                setOnlyShowFirstNode && setOnlyShowFirstNode(true)
                onResetRefresh()
            })
            .catch((e: any) => {
                yakitNotify("error", `${t("HTTPFlowTable.historyDeleteFailed")}${e}`)
            })
            .finally(() => {
                onUpdateOtherPage()
                setTimeout(() => setLoading(false), 500)
            })
    })
    // 不重置请求 ID
    const onRemoveHttpHistoryAll = useMemoizedFn((isAddQuery?: boolean, query?: any) => {
        let newParams = {
            Filter: {},
            DeleteAll: false
        }
        if (isAddQuery) {
            newParams = {
                Filter: {
                    ...params,
                    ...(query?.Filter || {})
                },
                DeleteAll: false
            }
        }
        setLoading(true)
        ipcRenderer
            .invoke("DeleteHTTPFlows", newParams)
            .then((i: HTTPFlow) => {
                setOnlyShowFirstNode && setOnlyShowFirstNode(true)
                onResetRefresh()
            })
            .catch((e: any) => {
                yakitNotify("error", `${t("HTTPFlowTable.historyDeleteFailed")}${e}`)
            })
            .finally(() => {
                onUpdateOtherPage()
                setTimeout(() => setLoading(false), 300)
            })
        setLoading(true)
        yakitNotify("info", t("HTTPFlowTable.deletingPleaseRefresh"))
        setCompareLeft({content: "", language: "http"})
        setCompareRight({content: "", language: "http"})
        setCompareState(0)
        setTimeout(() => {
            if (props.onSelected) props.onSelected(undefined)
        }, 400)
    })
    const onBatch = useMemoizedFn((f: Function, number: number, all?: boolean) => {
        const length = selectedRows.length
        if (length <= 0) {
            yakitNotify("warning", t("HTTPFlowTable.pleaseSelectData"))
            return
        }
        if (isAllSelect && !all) {
            yakitNotify("warning", t("HTTPFlowTable.batchOperationNoSelectAll"))
            return
        }
        if (number < length) {
            yakitNotify("warning", t("HTTPFlowTable.maxSendData", {number}))
            return
        }
        for (let i = 0; i < length; i++) {
            const element = selectedRows[i]
            f(element)
            if (i === length - 1) {
                setSelectedRowKeys([])
                setSelectedRows([])
            }
        }
    })

    const formatJson = (filterVal, jsonData) => {
        return jsonData.map((v, index) =>
            filterVal.map((j) => {
                if (["Request", "Response"].includes(j)) {
                    return new Buffer(v[j]).toString("utf8")
                }
                if (j === "UpdatedAt") {
                    return formatTimestamp(v[j])
                }
                return v[j]
            })
        )
    }

    const getPageSize = useMemo(() => {
        if (total > 5000) {
            return 500
        } else if (total < 1000) {
            return 100
        } else {
            return Math.round(total / 1000) * 100
        }
    }, [total])

    /**
     * @description 导出为Excel
     */
    const initExcelData = (resolve, newExportData: HTTPFlow[], rsp, arrList) => {
        let exportData: any = []
        const header: string[] = []
        const filterVal: string[] = []
        exportDataKey.map((item) => {
            const title = arrList.filter((i) => i.dataKey === item)[0]?.title || item
            header.push(title)
            if (item === "request") {
                filterVal.push("Request")
            } else if (item === "response") {
                filterVal.push("Response")
            } else if (item === "Id") {
                filterVal.push("Id")
            } else {
                const itemData = configColumnRef.current.filter((itemIn) => itemIn.dataKey === item)[0]
                filterVal.push(itemData.dataKey)
            }
        })
        exportData = formatJson(filterVal, newExportData)
        resolve({
            header,
            exportData,
            response: rsp
        })
    }
    const getExcelData = useMemoizedFn((pagination, list: HTTPFlow[]) => {
        return new Promise((resolve) => {
            const query: any = {
                ...params,
                Pagination: {...pagination},
                // OffsetId:
                //     pagination.Page === 1
                //         ? undefined
                //         : data[l - 1] && data[l - 1].Id && (Math.ceil(data[l - 1].Id) as number),
                OffsetId: undefined
            }

            let exportParams: any = {}
            // 这里的key值为数据库的key
            const arrList = [
                {
                    title: t("YakitTable.order"),
                    key: "id",
                    dataKey: "Id"
                },
                {
                    title: t("HTTPFlowTable.method"),
                    key: "method",
                    dataKey: "Method"
                },
                {
                    title: t("HTTPFlowTable.statusCode"),
                    key: "status_code",
                    dataKey: "StatusCode"
                },
                {
                    title: "URL",
                    key: "url",
                    dataKey: "Url"
                },
                {
                    title: "Host",
                    key: "host",
                    dataKey: "Host"
                },
                {
                    title: "Path",
                    key: "path",
                    dataKey: "Path"
                },
                {
                    title: t("HTTPFlowTable.fromPlugin"),
                    key: "from_plugin",
                    dataKey: "FromPlugin"
                },
                {
                    title: "Tags",
                    key: "tags",
                    dataKey: "Tags"
                },
                {
                    title: "IP",
                    key: "iP_address",
                    dataKey: "IPAddress"
                },
                {
                    title: t("HTTPFlowTable.bodyLength"),
                    key: "body_length",
                    dataKey: "BodyLength"
                },
                {
                    title: "Title",
                    key: "response",
                    dataKey: "HtmlTitle"
                },
                {
                    title: t("HTTPFlowTable.params"),
                    key: "get_params_total",
                    dataKey: "GetParamsTotal"
                },
                {
                    title: t("HTTPFlowTable.contentType"),
                    key: "content_type",
                    dataKey: "ContentType"
                },
                {
                    title: t("HTTPFlowTable.durationMs"),
                    key: "duration",
                    dataKey: "DurationMs"
                },
                {
                    title: t("HTTPFlowTable.updatedAt"),
                    key: "updated_at",
                    dataKey: "UpdatedAt"
                },
                {
                    title: t("HTTPFlowTable.requestSizeVerbose"),
                    key: "request",
                    dataKey: "RequestSizeVerbose"
                },
                {
                    title: t("HTTPFlowTable.requestPacket"),
                    key: "request",
                    dataKey: "request"
                },
                {
                    title: t("HTTPFlowTable.responsePacket"),
                    key: "response",
                    dataKey: "response"
                }
            ]
            const FieldName = arrList.filter((item) => exportDataKey.includes(item.dataKey)).map((item) => item.key)

            const Ids: number[] = list.map((item) => parseInt(item.Id + ""))
            // 最大请求条数
            let pageSize = getPageSize
            // 需要多少次请求
            let count = Math.ceil((isAllSelect ? total : Ids.length) / pageSize)
            const resultArray: number[] = []
            for (let i = 1; i <= count; i++) {
                resultArray.push(i)
            }
            const promiseList = resultArray.map((item) => {
                query.Pagination.Limit = pageSize
                query.Pagination.Page = item
                exportParams = {ExportWhere: query, FieldName}
                if (!isAllSelect) {
                    exportParams.Ids = Ids
                }
                return new Promise((resolve, reject) => {
                    ipcRenderer
                        .invoke("ExportHTTPFlows", exportParams)
                        .then((rsp: YakQueryHTTPFlowResponse) => {
                            resolve(rsp)
                        })
                        .catch((e) => {
                            reject(e)
                        })
                        .finally(() => {})
                })
            })
            Promise.allSettled(promiseList).then((results) => {
                let rsp: YakQueryHTTPFlowResponse = {
                    Data: [],
                    Pagination: {...pagination, Page: 1, OrderBy: "id", Order: ""},
                    Total: parseInt(total + "")
                }
                let message: string = ""
                results.forEach((item) => {
                    if (item.status === "fulfilled") {
                        const value = item.value as YakQueryHTTPFlowResponse
                        rsp.Data = [...rsp.Data, ...value.Data]
                    } else {
                        message = item.reason?.message
                    }
                })
                if (message.length > 0) {
                    yakitNotify("warning", `${t("HTTPFlowTable.partialExportMissing")}${message}`)
                }
                initExcelData(resolve, rsp.Data, rsp, arrList)
            })
        })
    })
    const onExcelExport = (list) => {
        percentContainerRef.current = currentPageTabRouteKey
        const titleValue = configColumnRef.current.map((item) => ({title: item.title, key: item.dataKey}))
        const exportValue = [
            ...titleValue,
            {title: t("HTTPFlowTable.requestPacket"), key: "request"},
            {title: t("HTTPFlowTable.responsePacket"), key: "response"}
        ]
        const m = showYakitModal({
            title: t("HTTPFlowTable.exportFields"),
            content: (
                <ExportSelect
                    exportValue={exportValue}
                    initCheckValue={exportValue}
                    setExportTitle={(v: string[]) => {
                        setExportDataKey(["Id", ...v])
                    }}
                    exportKey={"MITM-HISTORY-EXPORT-KEYS"}
                    fileName={"History"}
                    getData={(pagination) => getExcelData(pagination, list)}
                    onClose={() => m.destroy()}
                    getContainer={
                        document.getElementById(`main-operator-page-body-${percentContainerRef.current}`) || undefined
                    }
                />
            ),
            onCancel: () => {
                m.destroy()
                setSelectedRowKeys([])
                setSelectedRows([])
            },
            width: 650,
            footer: null,
            maskClosable: false,
            getContainer: document.getElementById(`main-operator-page-body-${percentContainerRef.current}`) || undefined
        })
    }

    /**
     * @description 导出为HAR
     */
    const [exportToken, setExportToken] = useState<string>("")
    const [percentVisible, setPercentVisible] = useState<boolean>(false)
    const percentContainerRef = useRef<string>(currentPageTabRouteKey)
    const onHarExport = (ids: number[]) => {
        handleSaveFileSystemDialog({
            title: t("HTTPFlowTable.saveFile"),
            defaultPath: "History",
            filters: [
                {name: "HAR Files", extensions: ["har"]} // 只允许保存 .har 文件
            ]
        }).then((file) => {
            if (!file.canceled) {
                const filePath = file?.filePath?.toString()
                if (filePath) {
                    const exportParams: ExportHTTPFlowStreamRequest = {
                        Filter: {
                            IncludeId: ids,
                            ...params
                        },
                        ExportType: "har",
                        TargetPath: filePath
                    }

                    const token = randomString(40)
                    setExportToken(token)
                    ipcRenderer
                        .invoke("ExportHTTPFlowStream", exportParams, token)
                        .then(() => {
                            percentContainerRef.current = currentPageTabRouteKey
                            setPercentVisible(true)
                        })
                        .catch((error) => {
                            yakitNotify("error", `[ExportHTTPFlowStream] error: ${error}`)
                        })
                }
            }
        })
    }

    const getPacketNewWindow = useMemoizedFn((r) => {
        return {
            showParentPacketCom: {
                components: "HTTPFlowDetailMini",
                props: {
                    noHeader: true,
                    id: r?.Id || 0,
                    sendToWebFuzzer: true,
                    selectedFlow: getHTTPFlowReqAndResToString(r),
                    downstreamProxyStr: downstreamProxyStr,
                    pageType: pageType,
                    showEditTag: false,
                    showJumpTree: false,
                    showFlod: !["Plugin"].includes(pageType || "")
                } as HTTPFlowDetailProp
            }
        }
    })
    const onHTTPFlowTableRowDoubleClick = useMemoizedFn((r) => {
        openPacketNewWindow(getPacketNewWindow(r))
    })

    // 插件扩展(单选)
    const [codecSingleHistoryPlugin, setCodecSingleHistoryPlugin] = useState<codecHistoryPluginProps[]>([])
    const searchCodecSingleHistoryPlugin = useMemoizedFn((): any => {
        queryYakScriptList(
            "codec",
            (i: YakScript[], total) => {
                if (!total || total === 0) {
                    return
                }
                setCodecSingleHistoryPlugin(
                    i.map((script) => {
                        const isAiPlugin: boolean = script.Tags.includes("AI工具")
                        return {
                            key: script.ScriptName,
                            label: script.ScriptName,
                            isAiPlugin
                        }
                    })
                )
            },
            undefined,
            10,
            undefined,
            undefined,
            undefined,
            undefined,
            [PluginSwitchToTag.PluginCodecSingleHistorySwitch]
        )
    })

    // 插件扩展(多选)
    const [codecMultipleHistoryPlugin, setCodecMultipleHistoryPlugin] = useState<codecHistoryPluginProps[]>([])
    const searchCodecMultipleHistoryPlugin = useMemoizedFn((): any => {
        queryYakScriptList(
            "codec",
            (i: YakScript[], total) => {
                if (!total || total === 0) {
                    return
                }
                setCodecMultipleHistoryPlugin(
                    i.map((script) => {
                        const isAiPlugin: boolean = script.Tags.includes("AI工具")
                        return {
                            key: script.ScriptName,
                            label: script.ScriptName,
                            isAiPlugin
                        }
                    })
                )
            },
            undefined,
            10,
            undefined,
            undefined,
            undefined,
            undefined,
            [PluginSwitchToTag.PluginCodecMultipleHistorySwitch]
        )
    })

    const addIconLabel = useMemoizedFn((data: codecHistoryPluginProps[]) => {
        return data.map((item) => ({
            ...item,
            label: (
                <>
                    {item.isAiPlugin && (
                        <>
                            <IconSolidAIIcon className={"ai-plugin-menu-icon-default"} />
                            <IconSolidAIWhiteIcon className={"ai-plugin-menu-icon-hover"} />
                        </>
                    )}
                    {item.key}
                </>
            )
        }))
    })
    const getCodecHistoryPlugin = useMemoizedFn(() => {
        if (selectedRowKeys.length > 1) {
            return codecMultipleHistoryPlugin.length > 0
                ? addIconLabel(codecMultipleHistoryPlugin)
                : [
                      {
                          key: "Get*plug-in",
                          label: (
                              <>
                                  <CloudDownloadIcon style={{marginRight: 4}} />
                                  {t("HTTPFlowTable.getPlugin")}
                              </>
                          )
                      }
                  ]
        } else {
            return codecSingleHistoryPlugin.length > 0
                ? addIconLabel(codecSingleHistoryPlugin)
                : [
                      {
                          key: "Get*plug-in",
                          label: (
                              <>
                                  <CloudDownloadIcon style={{marginRight: 4}} />
                                  {t("HTTPFlowTable.getPlugin")}
                              </>
                          )
                      }
                  ]
        }
    })

    const getCodecAIPlugin = useMemoizedFn(() => {
        if (selectedRowKeys.length > 1) {
            const codecMultipleHistoryAIPlugin = codecMultipleHistoryPlugin
                .filter((item) => item.isAiPlugin)
                .map((item) => {
                    // 此处为了防止菜单key值重复
                    return {
                        ...item,
                        key: `aiplugin-${item.key}`
                    }
                })
            return codecMultipleHistoryAIPlugin.length > 0
                ? codecMultipleHistoryAIPlugin
                : [
                      {
                          key: "Get*ai-plug-in",
                          label: (
                              <>
                                  <CloudDownloadIcon style={{marginRight: 4}} />
                                  {t("HTTPFlowTable.getPlugin")}
                              </>
                          )
                      }
                  ]
        } else {
            const codecSingleHistoryAIPlugin = codecSingleHistoryPlugin
                .filter((item) => item.isAiPlugin)
                .map((item) => {
                    // 此处为了防止菜单key值重复
                    return {
                        ...item,
                        key: `aiplugin-${item.key}`
                    }
                })
            return codecSingleHistoryAIPlugin.length > 0
                ? codecSingleHistoryAIPlugin
                : [
                      {
                          key: "Get*ai-plug-in",
                          label: (
                              <>
                                  <CloudDownloadIcon style={{marginRight: 4}} />
                                  {t("HTTPFlowTable.getPlugin")}
                              </>
                          )
                      }
                  ]
        }
    })

    const [editTagsVisible, setEditTagsVisible] = useState<boolean>(false)
    const editTagsRef = useRef<EditTagsInfo>()
    const onEditTags = useMemoizedFn((flow: HTTPFlow) => {
        editTagsRef.current = {Id: flow.Id, Hash: flow.Hash, Tags: flow.Tags?.split("|").filter((tag) => tag) || []}
        setEditTagsVisible(true)
    })
    const editTagsSuccess = useMemoizedFn((params: EditTagsInfo) => {
        ipcRenderer
            .invoke("SetTagForHTTPFlow", params)
            .then(() => {
                yakitNotify("success", t("HTTPFlowTable.editTagSuccess"))
                let newData: HTTPFlow[] = []
                const l = data.length
                for (let index = 0; index < l; index++) {
                    const item = {...data[index]}
                    if (item.Hash === params.Hash) {
                        item.Tags = params.Tags.join("|")
                    }
                    newData.push(item)
                }
                setData(newData)
            })
            .catch((e) => {
                yakitFailed(e + "")
            })
    })
    const onEditTagEvent = useMemoizedFn((infos) => {
        try {
            const info = JSON.parse(infos) || {}
            const tagItem = data.find((item) => item.Id == info.id)
            if (tagItem && info.historyId === historyId) {
                onEditTags(tagItem)
            }
        } catch (error) {}
    })
    useEffect(() => {
        emiter.on("onEditTag", onEditTagEvent)
        return () => {
            emiter.off("onEditTag", onEditTagEvent)
        }
    }, [])

    const {userInfo} = useStore()
    const codecMultipleHistoryPluginCom = useCampare(codecMultipleHistoryPlugin)
    const codecSingleHistoryPluginCom = useCampare(codecSingleHistoryPlugin)
    const selectedRowKeysCom = useCampare(selectedRowKeys)
    const menuData = useMemo(() => {
        let menu = [
            {
                key: "发送到 Web Fuzzer",
                label: t("HTTPFlowTable.RowContextMenu.sendToWebFuzzer"),
                number: 10,
                default: true,
                webSocket: false,
                children: [
                    {
                        key: "sendAndJumpToWebFuzzer",
                        label: t("HTTPFlowTable.RowContextMenu.sendAndRedirect"),
                        keybindings: getGlobalShortcutKeyEvents()[GlobalShortcutKey.CommonSendAndJumpToWebFuzzer].keys
                    },
                    {
                        key: "sendToWebFuzzer",
                        label: t("HTTPFlowTable.RowContextMenu.sendOnly"),
                        keybindings: getGlobalShortcutKeyEvents()[GlobalShortcutKey.CommonSendToWebFuzzer].keys
                    }
                ],
                onClickBatch: () => {}
            },
            {
                key: "发送到 WS Fuzzer",
                label: t("HTTPFlowTable.RowContextMenu.sendToWSFuzzer"),
                number: 10,
                webSocket: true,
                default: false,
                children: [
                    {
                        key: "sendAndJumpToWS",
                        label: t("HTTPFlowTable.RowContextMenu.sendAndRedirect"),
                        keybindings: getGlobalShortcutKeyEvents()[GlobalShortcutKey.CommonSendAndJumpToWebFuzzer].keys
                    },
                    {
                        key: "sendToWS",
                        label: t("HTTPFlowTable.RowContextMenu.sendOnly"),
                        keybindings: getGlobalShortcutKeyEvents()[GlobalShortcutKey.CommonSendToWebFuzzer].keys
                    }
                ],
                onClickBatch: () => {}
            },
            {
                key: "数据包扫描",
                label: t("HTTPFlowTable.RowContextMenu.packetScan"),
                number: 200,
                default: true,
                webSocket: false,
                onClickSingle: () => {},
                onClickBatch: () => {},
                children: GetPacketScanByCursorMenuItem(selected?.Id || 0)?.subMenuItems?.map((ele) => ({
                    key: ele.title,
                    label: t(ele.title)
                }))
            },
            {
                key: "插件扩展",
                label: t("HTTPFlowTable.RowContextMenu.pluginExtension"),
                default: true,
                webSocket: false,
                onClickSingle: () => {},
                onClickBatch: () => {},
                children: getCodecHistoryPlugin()
            },
            {
                key: "AI插件",
                label: (
                    <>
                        <IconSolidAIIcon className={"ai-plugin-menu-icon-default"} />
                        <IconSolidAIWhiteIcon className={"ai-plugin-menu-icon-hover"} />
                        {t("HTTPFlowTable.RowContextMenu.aiPlugin")}
                    </>
                ),
                default: true,
                webSocket: false,
                onClickSingle: () => {},
                onClickBatch: () => {},
                children: getCodecAIPlugin()
            },
            {
                key: "复制 URL",
                label: t("HTTPFlowTable.RowContextMenu.copyURL"),
                number: 30,
                webSocket: true,
                default: true,
                onClickSingle: (v) => setClipboardText(v.Url),
                onClickBatch: (v, number) => {
                    if (v.length === 0) {
                        yakitNotify("warning", t("HTTPFlowTable.pleaseSelectData"))
                        return
                    }
                    if (v.length < number) {
                        setClipboardText(v.map((ele) => `${ele.Url}`).join("\r\n"))
                        setSelectedRowKeys([])
                        setSelectedRows([])
                    } else {
                        yakitNotify("warning", t("HTTPFlowTable.copyLimit", {number}))
                    }
                }
            },
            {
                key: "下载 Response Body",
                label: t("HTTPFlowTable.RowContextMenu.downloadResponseBody"),
                default: true,
                webSocket: false,
                onClickSingle: (v) => {
                    ipcRenderer.invoke("GetResponseBodyByHTTPFlowID", {Id: v.Id}).then((bytes: {Raw: Uint8Array}) => {
                        saveABSFileToOpen(`response-body.txt`, bytes.Raw)
                    })
                }
            },
            {
                key: "浏览器中打开URL",
                label: t("HTTPFlowTable.RowContextMenu.openURLInBrowser"),
                default: true,
                webSocket: false,
                onClickSingle: (v) => {
                    v.Url && openExternalWebsite(v.Url)
                }
            },
            {
                key: "浏览器中查看响应",
                label: t("HTTPFlowTable.RowContextMenu.viewResponseInBrowser"),
                default: true,
                webSocket: false,
                onClickSingle: (v) => {
                    showResponseViaHTTPFlowID(v)
                }
            },
            {
                key: "复制为 CSRF Poc",
                label: t("HTTPFlowTable.RowContextMenu.copyAsCSRFPoc"),
                default: true,
                webSocket: false,
                onClickSingle: (v) => {
                    const flow = v as HTTPFlow
                    if (!flow) return
                    generateCSRFPocByRequest(flow.Request, flow.IsHTTPS, (e) => {
                        setClipboardText(e)
                    })
                }
            },
            {
                key: "复制为 Yak PoC 模版",
                label: t("HTTPFlowTable.RowContextMenu.copyAsYakPoCTemplate"),
                default: true,
                webSocket: false,
                onClickSingle: () => {},
                children: [
                    {
                        key: "数据包 PoC 模版",
                        label: t("HTTPFlowTable.RowContextMenu.packetPoCTemplate")
                    },
                    {
                        key: "批量检测 PoC 模版",
                        label: t("HTTPFlowTable.RowContextMenu.batchTestPoCTemplate")
                    }
                ]
            },
            {
                key: "标注颜色",
                label: t("HTTPFlowTable.RowContextMenu.tagColor"),
                default: true,
                webSocket: false,
                number: 20,
                onClickSingle: () => {},
                onClickBatch: () => {},
                children: availableColors.map((i) => {
                    return {
                        key: i.title,
                        label: i.render(t),
                        onClick: (v) => CalloutColor(v, i, data, setData),
                        onClickBatch: (list, n) => CalloutColorBatch(list, n, i)
                    }
                })
            },
            {
                key: "移除颜色",
                label: t("HTTPFlowTable.RowContextMenu.removeColor"),
                default: true,
                webSocket: false,
                number: 20,
                onClickSingle: (v) => onRemoveCalloutColor(v, data, setData),
                onClickBatch: (list, n) => onRemoveCalloutColorBatch(list, n)
            },
            {
                key: "发送到对比器",
                label: t("HTTPFlowTable.RowContextMenu.sendToComparer"),
                default: true,
                webSocket: false,
                onClickSingle: () => {},
                children: [
                    {
                        key: "发送到对比器左侧",
                        label: t("HTTPFlowTable.RowContextMenu.sendToComparerLeft"),
                        // disabled: [false, true, false][compareState]
                    },
                    {
                        key: "发送到对比器右侧",
                        label: t("HTTPFlowTable.RowContextMenu.sendToComparerRight"),
                        // disabled: [false, false, true][compareState]
                    }
                ]
            },
            {
                key: "屏蔽",
                label: t("HTTPFlowTable.RowContextMenu.block"),
                webSocket: true,
                default: true,
                onClickSingle: () => {},
                children: [
                    {
                        key: "屏蔽该记录",
                        label: t("HTTPFlowTable.RowContextMenu.blockRecord")
                    },
                    {
                        key: "屏蔽URL",
                        label: t("HTTPFlowTable.RowContextMenu.blockURL")
                    },
                    {
                        key: "屏蔽域名",
                        label: t("HTTPFlowTable.RowContextMenu.blockDomain")
                    }
                ]
            },
            {
                key: "删除",
                label: t("HTTPFlowTable.RowContextMenu.delete"),
                webSocket: true,
                default: true,
                onClickSingle: () => {},
                onClickBatch: () => {},
                all: true,
                children: [
                    {
                        key: "删除记录",
                        label: t("HTTPFlowTable.RowContextMenu.deleteRecord"),
                        onClick: (v) => onRemoveHttpHistory({Id: [v.Id]}),
                        onClickBatch: (list) => {
                            onRemoveHttpHistory({Id: list.map((ele) => ele.Id)})
                        }
                    },
                    {
                        key: "删除URL",
                        label: t("HTTPFlowTable.RowContextMenu.deleteURL"),
                        onClick: (v) => onRemoveHttpHistory({URLPrefix: v.Url}),
                        onClickBatch: (list) => {
                            const urls = list.map((ele) => ele.Url)
                            onRemoveHttpHistory({
                                Filter: {
                                    IncludeInUrl: urls
                                }
                            })
                        }
                    },
                    {
                        key: "删除域名",
                        label: t("HTTPFlowTable.RowContextMenu.deleteDomain"),
                        onClick: (v) => onRemoveHttpHistory({URLPrefix: v?.HostPort?.split(":")[0]}),
                        onClickBatch: (list) => {
                            const hosts = list.map((ele) => ele.HostPort?.split(":")[0])
                            onRemoveHttpHistory({
                                Filter: {
                                    IncludeInUrl: hosts
                                }
                            })
                        }
                    }
                ]
            },
            {
                key: "分享数据包",
                label: t("HTTPFlowTable.RowContextMenu.sharePacket"),
                number: 30,
                default: true,
                webSocket: false,
                onClickSingle: (v) => onShareData([v.Id], 50),
                onClickBatch: (list, n) => {
                    const ids: string[] = list.map((ele) => ele.Id)
                    onShareData(ids, n)
                }
            },
            {
                key: "导出数据",
                label: t("HTTPFlowTable.RowContextMenu.exportData"),
                default: true,
                webSocket: false,
                onClickSingle: () => {},
                onClickBatch: () => {},
                children: [
                    {
                        key: "导出为Excel",
                        label: t("HTTPFlowTable.RowContextMenu.exportToExcel"),
                        onClick: (v) => onExcelExport([v]),
                        onClickBatch: (list) => {
                            onExcelExport(list)
                        }
                    },
                    {
                        key: "导出为HAR",
                        label: t("HTTPFlowTable.RowContextMenu.exportToHAR"),
                        onClick: (v) => onHarExport([v.Id]),
                        onClickBatch: (list) => {
                            onHarExport(list.map((item) => item.Id))
                        }
                    }
                ]
            },
            {
                key: "编辑tag",
                label: t("HTTPFlowTable.RowContextMenu.editTag"),
                default: true,
                webSocket: true,
                onClickSingle: (v) => onEditTags(v)
            },
            {
                key: "新窗口打开",
                label: t("HTTPFlowTable.RowContextMenu.openInNewWindow"),
                default: true,
                webSocket: true,
                onClickSingle: (v) => {
                    onHTTPFlowTableRowDoubleClick(v)
                }
            }
        ]
        if (isEnpriTrace() && userInfo.isLogin) {
            menu.push({
                key: "上传数据",
                label: t("HTTPFlowTable.RowContextMenu.uploadData"),
                number: 30,
                default: true,
                webSocket: false,
                onClickSingle: (v) => onUploadData([v.Id]),
                onClickBatch: (list) => {
                    const ids: string[] = list.map((ele) => ele.Id)
                    onUploadData(ids)
                }
            })
        }
        return menu
    }, [
        userInfo.isLogin,
        i18n.language,
        codecMultipleHistoryPluginCom,
        codecSingleHistoryPluginCom,
        selectedRowKeysCom
    ])

    /** 菜单自定义快捷键渲染处理事件 */
    const contextMenuKeybindingHandle = useMemoizedFn((data) => {
        const menus: any = []
        for (let item of data) {
            /** 处理带快捷键的菜单项 */
            const info = {...item}
            if (info.children && info.children.length > 0) {
                info.children = contextMenuKeybindingHandle(info.children)
            } else {
                if (info.keybindings && info.keybindings.length > 0) {
                    const keysContent = convertKeyboardToUIKey(info.keybindings)

                    info.label = keysContent ? (
                        <div className={style["editor-context-menu-keybind-wrapper"]}>
                            <div className={style["content-style"]}>{info.label}</div>
                            <div className={classNames(style["keybind-style"], "keys-style")}>{keysContent}</div>
                        </div>
                    ) : (
                        info.label
                    )
                }
            }
            menus.push(info)
        }
        return menus
    })

    const getRowContextMenu = useMemoizedFn((rowData: HTTPFlow) => {
        return contextMenuKeybindingHandle(menuData)
            .filter((item) => (rowData.IsWebsocket ? item.webSocket : item.default))
            .map((ele) => {
                return {
                    label: ele.label,
                    key: ele.key,
                    children: ele.children || []
                }
            })
    })

    const onRowContextMenu = (rowData: HTTPFlow, _, event: React.MouseEvent) => {
        if (rowData) {
            setSelected(rowData)
        }
        let rowContextmenu: any[] = []
        // 当存在history勾选时，替换为批量菜单
        if (selectedRowKeys.length > 0) {
            rowContextmenu = getBatchContextMenu()
        } else {
            rowContextmenu = getRowContextMenu(rowData)
        }

        showByRightContext(
            {
                width: 180,
                data: rowContextmenu,
                // openKeys:['复制为 Yak PoC 模版',],
                onClick: ({key, keyPath}) => {
                    if (selectedRowKeys.length > 0) {
                        onMultipleClick(key, keyPath)
                        return
                    }
                    if (keyPath.length === 2) {
                        const menuName = keyPath[1]
                        let menuItemName = keyPath[0]
                        if (menuName === "插件扩展" || menuName === "AI插件") {
                            // 没有插件 下载codec插件
                            if (key === "Get*plug-in" || key === "Get*ai-plug-in") {
                                emiter.emit(
                                    "onOpenFuzzerModal",
                                    JSON.stringify({scriptName: key, isAiPlugin: "isGetPlugin"})
                                )
                                return
                            }
                            if (isAllSelect) {
                                yakitNotify("warning", t("HTTPFlowTable.batchOperationNoSelectAll"))
                                return
                            }
                            try {
                                rowContextmenu.forEach((item) => {
                                    if (item.key === menuName && Array.isArray(item.children)) {
                                        item.children.forEach((itemIn) => {
                                            if (itemIn.key === menuItemName) {
                                                // 由于为保持key值唯一 添加了特定字符 现在移除掉
                                                if (menuName === "AI插件" && menuItemName.startsWith("aiplugin-")) {
                                                    menuItemName = menuItemName.slice("aiplugin-".length)
                                                }
                                                emiter.emit(
                                                    "onOpenFuzzerModal",
                                                    JSON.stringify({
                                                        text: `${rowData.Id}`,
                                                        scriptName: menuItemName,
                                                        isAiPlugin: itemIn?.isAiPlugin
                                                    })
                                                )
                                            }
                                        })
                                    }
                                })
                            } catch (error) {}
                            return
                        }
                    }

                    if (keyPath.includes("数据包扫描")) {
                        const scanItem = packetScanDefaultValue.find((e) => e.Verbose === key || e.VerboseUi === key)
                        if (!scanItem) return
                        execPacketScan({
                            httpFlowIds: [rowData.Id],
                            value: scanItem,
                            https: rowData.IsHTTPS
                        })
                        return
                    }
                    if (keyPath.includes("标注颜色")) {
                        const colorItem = availableColors.find((e) => e.title === key)
                        if (!colorItem) return
                        CalloutColor(rowData, colorItem, data, setData)
                        return
                    }
                    switch (key) {
                        case "数据包 PoC 模版":
                            onPocMould(rowData)
                            break
                        case "批量检测 PoC 模版":
                            onBatchPocMould(rowData)
                            break
                        case "屏蔽该记录":
                            onShieldRecord(rowData)
                            break
                        case "屏蔽URL":
                            onShieldURL(rowData)
                            break
                        case "屏蔽域名":
                            onShieldDomain(rowData)
                            break
                        case "删除记录":
                            onRemoveHttpHistory({Id: [rowData.Id]})
                            break
                        case "删除URL":
                            onRemoveHttpHistory({URLPrefix: rowData.Url})
                            break
                        case "删除域名":
                            onRemoveHttpHistory({URLPrefix: rowData?.HostPort?.split(":")[0]})
                            break
                        case "发送到对比器左侧":
                            setCompareLeft({
                                content: new Buffer(rowData.Request).toString("utf8"),
                                language: "http"
                            })
                            break
                        case "发送到对比器右侧":
                            setCompareRight({
                                content: new Buffer(rowData.Request).toString("utf8"),
                                language: "http"
                            })
                            break
                        case "sendAndJumpToWebFuzzer":
                            onSendToTab(rowData, true, downstreamProxyStr)
                            break
                        case "sendToWebFuzzer":
                            onSendToTab(rowData, false, downstreamProxyStr)
                            break
                        case "sendAndJumpToWS":
                            newWebsocketFuzzerTab(rowData.IsHTTPS, rowData.Request)
                            break
                        case "sendToWS":
                            newWebsocketFuzzerTab(rowData.IsHTTPS, rowData.Request, false)
                            break
                        case "导出为Excel":
                            onExcelExport([rowData])
                            break
                        case "导出为HAR":
                            onHarExport([rowData.Id])
                            break
                        default:
                            const currentItem = menuData.find((f) => f.key === key)
                            if (!currentItem) return
                            if (currentItem.onClickSingle) currentItem.onClickSingle(rowData)
                            break
                    }
                }
            },
            event.clientX,
            event.clientY
        )
    }
    /**
     * @description 数据包 PoC 模版
     */
    const onPocMould = useMemoizedFn((v: HTTPFlow) => {
        const flow = v
        if (!flow) return
        generateYakCodeByRequest(
            flow.IsHTTPS,
            flow.Request,
            (code) => {
                setClipboardText(code)
            },
            RequestToYakCodeTemplate.Ordinary
        )
    })
    /**
     * @description 批量检测 PoC 模版
     */
    const onBatchPocMould = useMemoizedFn((v: HTTPFlow) => {
        const flow = v as HTTPFlow
        if (!flow) return
        generateYakCodeByRequest(
            flow.IsHTTPS,
            flow.Request,
            (code) => {
                setClipboardText(code)
            },
            RequestToYakCodeTemplate.Batch
        )
    })
    /**
     * @description 屏蔽该记录
     */
    const onShieldRecord = useMemoizedFn((v: HTTPFlow) => {
        if (!(v && v.Id)) return
        const id = Math.ceil(v.Id)
        const newArr = filterItem([...shieldData.data, id])
        const newObj = {...shieldData, data: newArr}
        setShieldData(newObj)
    })
    /**
     * @description 屏蔽URL
     */
    const onShieldURL = useMemoizedFn((v: HTTPFlow) => {
        let Url = v?.Url
        // 根据URL拿到ID数组
        const newArr = filterItem([...shieldData.data, Url])
        const newObj = {...shieldData, data: newArr}
        setShieldData(newObj)
    })
    /**
     * @description 屏蔽域名
     */
    const onShieldDomain = useMemoizedFn((v: HTTPFlow) => {
        const host = v?.HostPort?.split(":")[0] || ""
        // 根据host拿到对应ID数组
        const newArr = filterItem([...shieldData.data, host])
        const newObj = {...shieldData, data: newArr}
        setShieldData(newObj)
    })
    /**@description 重置查询条件并刷新 */
    const resetParams = useMemo(() => {
        const obj: YakQueryHTTPFlowRequest = {
            // 这里是外界传进来的条件重置时需要保留
            SourceType: props.params?.SourceType || "mitm",
            RuntimeIDs: runTimeId && runTimeId.indexOf(",") !== -1 ? runTimeId.split(",") : undefined,
            RuntimeId: runTimeId && runTimeId.indexOf(",") === -1 ? runTimeId : undefined,
            Full: false,
            // 屏蔽条件和高级筛选里面的参数需要保留
            ExcludeId: params.ExcludeId,
            ExcludeInUrl: params.ExcludeInUrl,
            // 高级筛选里面的参数，没有放开高级筛选按钮的一开始就不会获取下面的值，传进去也没有关系
            SearchContentType: params.SearchContentType,
            ExcludeContentType: params.ExcludeContentType,
            IncludeInUrl: params.IncludeInUrl,
            IncludePath: params.IncludePath,
            ExcludePath: params.ExcludePath,
            IncludeSuffix: params.IncludeSuffix,
            ExcludeSuffix: params.ExcludeSuffix,
            ExcludeKeywords: params.ExcludeKeywords
        }
        return obj
    }, [props.params, pageType, runTimeId, params])
    const resetAllFun = useMemoizedFn(() => {
        sortRef.current = defSort
        setIsReset(!isReset)
        setColor([])
        setCheckBodyLength(false)
        setBeforeBodyLength(undefined)
        setAfterBodyLength(undefined)
        setBodyLengthUnit("B")
        setSearchVal("")
        refreshTabsContRef.current = true
    })
    const onResetRefresh = useMemoizedFn(() => {
        setParams({...resetParams})
        setTriggerParamsWatch((old) => !old)
        resetAllFun()
    })
    /**@description 导入重置查询条件并刷新 */
    const onImportResetRefresh = useMemoizedFn(() => {
        const newParams = {
            ...resetParams,
            SourceType: ""
        }
        setParams(newParams)
        setTriggerParamsWatch((old) => !old)
        resetAllFun()
    })
    useUpdateEffect(() => {
        onImportResetRefresh()
    }, [importRefresh])

    /**
     * @description 分享数据包
     * @param ids 分享数据得ids
     */
    const onShareData = useMemoizedFn((ids: string[], number: number) => {
        if (isAllSelect) {
            yakitNotify("warning", t("HTTPFlowTable.batchOperationNoSelectAll"))
            return
        }
        if (ids.length === 0) {
            yakitNotify("warning", t("HTTPFlowTable.pleaseSelectData"))
            return
        }
        if (ids.length > number) {
            yakitNotify("warning", t("HTTPFlowTable.maxOperateData", {number}))
            return
        }
        const m = showYakitModal({
            title: t("HTTPFlowTable.shareData"),
            content: <ShareModal module={YakitRoute.DB_HTTPHistory} shareContent={JSON.stringify(ids)} />,
            onCancel: () => {
                m.destroy()
                setSelectedRowKeys([])
                setSelectedRows([])
            },
            footer: null
        })
    })

    const isUploadingRef = useRef<boolean>(false)
    /**
     * @description 上传数据（仅在企业版中生效）
     * @param ids 上传数据的ids
     */

    const onUploadData = useMemoizedFn((ids: string[]) => {
        if (isUploadingRef.current) {
            yakitNotify("warning", t("HTTPFlowTable.uploadingDataCannotClickAgain"))
            return
        }
        if (ids.length === 0) {
            yakitNotify("warning", t("HTTPFlowTable.pleaseSelectData"))
            return
        }
        if (!NowProjectDescription) {
            yakitNotify("warning", t("HTTPFlowTable.missingParameter"))
            return
        }
        const {ProjectName, Description, ExternalModule, ExternalProjectCode} = NowProjectDescription
        const newIds = ids.map((id) => parseInt(id + ""))
        const query: HTTPFlowsToOnlineBatchRequest = {
            ToOnlineWhere: {
                Token: userInfo.token,
                ProjectName,
                ProjectDescription: Description,
                ExternalModule,
                ExternalProjectCode
            },
            UploadHTTPFlowsWhere: {...params, IncludeId: isAllSelect ? [] : newIds}
        }
        isUploadingRef.current = true
        yakitNotify("info", t("HTTPFlowTable.dataUploading"))
        ipcRenderer
            .invoke("HTTPFlowsToOnlineBatch", query)
            .then((rsp: HTTPFlowsToOnlineBatchResponse) => {
                yakitNotify(
                    "success",
                    t("HTTPFlowTable.uploadResult", {SuccessCount: rsp.SuccessCount, FailedCount: rsp.FailedCount})
                )
            })
            .catch((e: any) => {
                yakitNotify("error", `query HTTP Flow failed: ${e}`)
            })
            .finally(() => (isUploadingRef.current = false))
    })

    const [searchVal, setSearchVal] = useState<string>("")
    const handleSearch = useMemoizedFn((searchValue, searchType) => {
        setParams((prev) => ({...prev, Keyword: searchValue, KeywordType: searchType}))
    })

    const getBatchContextMenu = useMemoizedFn(() => {
        return menuData
            .filter((f) => f.onClickBatch)
            .map((m) => {
                return {
                    key: m.key,
                    label: m.label,
                    children: m.children || []
                }
            })
    })

    const onMultipleClick = useMemoizedFn((key: string, keyPath: string[]) => {
        const batchContextMenu = getBatchContextMenu()
        if (keyPath.length === 2) {
            const menuName = keyPath[1]
            let menuItemName = keyPath[0]
            if (menuName === "插件扩展" || menuName === "AI插件") {
                // 没有插件 下载codec插件
                if (key === "Get*plug-in" || key === "Get*ai-plug-in") {
                    emiter.emit("onOpenFuzzerModal", JSON.stringify({scriptName: key, isAiPlugin: "isGetPlugin"}))
                    return
                }
                if (isAllSelect) {
                    yakitNotify("warning", t("HTTPFlowTable.batchOperationNoSelectAll"))
                    return
                }
                try {
                    batchContextMenu.forEach((item) => {
                        if (item.key === menuName && Array.isArray(item.children)) {
                            item.children.forEach((itemIn) => {
                                if (itemIn.key === menuItemName) {
                                    // 由于为保持key值唯一 添加了特定字符 现在移除掉
                                    if (menuName === "AI插件" && menuItemName.startsWith("aiplugin-")) {
                                        menuItemName = menuItemName.slice("aiplugin-".length)
                                    }
                                    emiter.emit(
                                        "onOpenFuzzerModal",
                                        JSON.stringify({
                                            text: selectedRowKeys.join(","),
                                            scriptName: menuItemName,
                                            isAiPlugin: itemIn?.isAiPlugin
                                        })
                                    )
                                }
                            })
                        }
                    })
                    setSelectedRowKeys([])
                    setSelectedRows([])
                } catch (error) {}
                return
            }
        }

        if (keyPath.includes("数据包扫描")) {
            let sendIds: string[] = selectedRowKeys
            if (isAllSelect) {
                if (total > 200) {
                    yakitNotify("warning", t("HTTPFlowTable.maxSendData", {number: 200}))
                    return
                } else {
                    sendIds = data.map((item) => item.Id + "")
                }
            } else {
                if (sendIds.length > 200) {
                    yakitNotify("warning", t("HTTPFlowTable.maxSendData", {number: 200}))
                    return
                }
            }
            const currentItemScan = menuData.find((f) => f.onClickBatch && f.key === "数据包扫描")
            const currentItemPacketScan = packetScanDefaultValue.find((f) => f.Verbose === key || f.VerboseUi === key)
            if (!currentItemScan || !currentItemPacketScan) return

            onBatchExecPacketScan({
                httpFlowIds: sendIds,
                maxLength: currentItemScan.number || 0,
                currentPacketScan: currentItemPacketScan
            })
            return
        }
        if (keyPath.includes("标注颜色")) {
            const currentItemColor = menuData.find((f) => f.onClickBatch && f.key === "标注颜色")
            const colorItem = availableColors.find((e) => e.title === key)
            if (!currentItemColor || !colorItem) return
            CalloutColorBatch(selectedRows, currentItemColor?.number || 0, colorItem)
            return
        }
        switch (key) {
            case "删除记录":
                onRemoveHttpHistory({
                    Id: selectedRowKeys
                })
                break
            case "删除URL":
                const urls = selectedRows.map((ele) => ele.Url)
                onRemoveHttpHistory({
                    Filter: {
                        IncludeInUrl: urls
                    }
                })
                break
            case "删除域名":
                const hosts = selectedRows.map((ele) => ele.HostPort?.split(":")[0])
                onRemoveHttpHistory({
                    Filter: {
                        IncludeInUrl: hosts
                    }
                })
                break
            case "sendAndJumpToWebFuzzer":
                const currentItemJumpToFuzzer = menuData.find((f) => f.onClickBatch && f.key === "发送到 Web Fuzzer")
                if (!currentItemJumpToFuzzer) return
                onBatch(
                    (el) => onSendToTab(el, true, downstreamProxyStr),
                    currentItemJumpToFuzzer?.number || 0,
                    selectedRowKeys.length === total
                )

                break
            case "sendToWebFuzzer":
                const currentItemToFuzzer = menuData.find((f) => f.onClickBatch && f.key === "发送到 Web Fuzzer")
                if (!currentItemToFuzzer) return
                onBatch(
                    (el) => onSendToTab(el, false, downstreamProxyStr),
                    currentItemToFuzzer?.number || 0,
                    selectedRowKeys.length === total
                )
                break
            case "sendAndJumpToWS":
                const currentItemJumpToWS = menuData.find((f) => f.onClickBatch && f.key === "发送到WS Fuzzer")
                if (!currentItemJumpToWS) return
                onBatch(
                    (el) => newWebsocketFuzzerTab(el.IsHTTPS, el.Request),
                    currentItemJumpToWS?.number || 0,
                    selectedRowKeys.length === total
                )

                break
            case "sendToWS":
                const currentItemToWS = menuData.find((f) => f.onClickBatch && f.key === "发送到WS Fuzzer")
                if (!currentItemToWS) return
                onBatch(
                    (el) => newWebsocketFuzzerTab(el.IsHTTPS, el.Request, false),
                    currentItemToWS?.number || 0,
                    selectedRowKeys.length === total
                )
                break
            case "导出为Excel":
                onExcelExport(selectedRows)
                break
            case "导出为HAR":
                onHarExport(isAllSelect ? [] : selectedRows.map((item) => item.Id))
                break
            default:
                const currentItem = menuData.find((f) => f.onClickBatch && f.key === key)
                if (!currentItem) return
                if (currentItem.onClickBatch) currentItem.onClickBatch(selectedRows, currentItem.number)
                break
        }
        setBatchVisible(false)
    })

    useEffect(() => {
        if (props.params?.SourceType !== undefined) {
            let selectTypeList = props.params?.SourceType.split(",") || [""]
            setParams((prev) => ({...prev, SourceType: selectTypeList.join(",")}))
        }
    }, [props.params?.SourceType])

    /**订阅的时候已经判断 pageType === "MITM" */
    const onHasParamsJumpHistory = useMemoizedFn((data) => {
        try {
            const value = JSON.parse(data)
            const {version = "", mitmHasParamsNames = ""} = value
            if (version !== mitmVersion) return
            const mitmHasParamsNamesArr = mitmHasParamsNames.split(",").filter((item) => item)
            let selectTypeList = (params.SourceType?.split(",") || []).filter((item) => item)
            if (mitmHasParamsNamesArr.length) {
                selectTypeList = ["mitm", "scan"]
            } else {
                selectTypeList = selectTypeList.filter((item) => item !== "scan")
                if (!selectTypeList.length) {
                    selectTypeList = ["mitm"]
                }
            }

            setParams((prev) => {
                const sourceType = selectTypeList.join(",")
                emiter.emit(
                    "onHistorySourceTypeToMitm",
                    JSON.stringify({
                        sourceType: sourceType,
                        version
                    })
                )
                return {
                    ...prev,
                    SourceType: sourceType,
                    FromPlugin: mitmHasParamsNames
                }
            })
        } catch (error) {}
    })

    const onMitmClearFromPlugin = useMemoizedFn((version) => {
        if (version !== mitmVersion) return
        setParams((prev) => ({
            ...prev,
            FromPlugin: ""
        }))
    })

    const onMitmSearchInputVal = useMemoizedFn((searchJson: string) => {
        try {
            const value = JSON.parse(searchJson) || {}
            const {version, ...searchObj} = value
            if (version !== mitmVersion) return
            setParams((prev) => ({
                ...prev,
                ...searchObj
            }))
        } catch (error) {}
    })

    const onMitmCurProcess = useMemoizedFn((data: string) => {
        try {
            const value = JSON.parse(data) || {}
            const {curProcess, version} = value
            if (version !== mitmVersion) return
            setParams((prev) => ({
                ...prev,
                ProcessName: curProcess
            }))
        } catch (error) {}
    })

    const onMitmNoResetRefresh = useMemoizedFn((version: string) => {
        if (version !== mitmVersion) return
        updateData()
    })

    const onMitmResetRefresh = useMemoizedFn((version: string) => {
        if (version !== mitmVersion) return
        onResetRefresh()
    })

    // mitm页面发送事件跳转过来
    useEffect(() => {
        if (pageType === "MITM") {
            emiter.on("onHasParamsJumpHistory", onHasParamsJumpHistory)
            emiter.on("onMitmClearFromPlugin", onMitmClearFromPlugin)
            emiter.on("onMitmSearchInputVal", onMitmSearchInputVal)
            emiter.on("onMitmCurProcess", onMitmCurProcess)
            emiter.on("cancleMitmFilterEvent", cancleMitmFilter)
            emiter.on("cancleMitmAllFilterEvent", cancleAllFilter)
            emiter.on("cleanMitmLogEvent", cleanLogTableData)
            emiter.on("onMitmNoResetRefreshEvent", onMitmNoResetRefresh)
            emiter.on("onMitmResetRefreshEvent", onMitmResetRefresh)
        }
        return () => {
            if (pageType === "MITM") {
                emiter.off("onHasParamsJumpHistory", onHasParamsJumpHistory)
                emiter.off("onMitmClearFromPlugin", onMitmClearFromPlugin)
                emiter.off("onMitmSearchInputVal", onMitmSearchInputVal)
                emiter.off("onMitmCurProcess", onMitmCurProcess)
                emiter.off("cancleMitmFilterEvent", cancleMitmFilter)
                emiter.off("cancleMitmAllFilterEvent", cancleAllFilter)
                emiter.off("cleanMitmLogEvent", cleanLogTableData)
                emiter.off("onMitmNoResetRefreshEvent", onMitmNoResetRefresh)
                emiter.off("onMitmResetRefreshEvent", onMitmResetRefresh)
            }
        }
    }, [pageType])

    useEffect(() => {
        onSetHasNewData && onSetHasNewData(offsetData.length > 0)
    }, [offsetData])

    useEffect(() => {
        onSetTableTotal && onSetTableTotal(total)
        onSetTableSelectNum && onSetTableSelectNum(isAllSelect ? total : selectedRowKeys?.length)
    }, [total, isAllSelect, selectedRowKeys])

    const realData = useMemo(() => {
        if (updateCacheData.length) {
            let findFlag = false
            const dataMap = new Map(data.map((item) => [+item.Id, item]))
            updateCacheData.forEach((target, index) => {
                if (dataMap.has(target.id)) {
                    const targetObject = dataMap.get(target.id)
                    if (targetObject) {
                        targetObject.Tags = target.tags
                        updateCacheData.splice(index, 1)
                        setUpdateCacheData(updateCacheData)
                        findFlag = true
                    }
                }
            })
            if (findFlag) {
                const newData = getClassNameData(data)
                setData(newData)
                return newData
            }
            return data
        } else {
            return data
        }
    }, [updateCacheData, data])

    return (
        <div ref={ref as Ref<any>} tabIndex={-1} className={style["http-history-flow-table-wrapper"]}>
            <ReactResizeDetector
                onResize={(width, height) => {
                    if (!width || !height) {
                        return
                    }
                    if (onlyShowFirstNode) {
                        // 窗口由小变大时 重新拉取数据
                        if (boxHeightRef.current && boxHeightRef.current < height) {
                            boxHeightRef.current = height
                            updateData()
                        } else {
                            boxHeightRef.current = height
                        }
                    }
                }}
                handleWidth={true}
                handleHeight={true}
                refreshMode={"debounce"}
                refreshRate={50}
            />
            <div className={classNames(style["table-virtual-resize"])}>
                <TableVirtualResize<HTTPFlow>
                    key={tableKeyNumber}
                    ref={tableRef}
                    currentIndex={currentIndex}
                    setCurrentIndex={setCurrentIndex}
                    scrollToIndex={scrollToIndex}
                    query={params}
                    titleHeight={titleHeight}
                    isShowTitle={!noTableTitle}
                    renderTitle={
                        !noTableTitle && (
                            <div
                                className={style["http-history-table-title"]}
                                style={{...props.httpHistoryTableTitleStyle}}
                            >
                                <div
                                    className={classNames(
                                        style["http-history-table-title-space-between"],
                                        style["http-history-table-row"]
                                    )}
                                >
                                    {showSourceType && (
                                        <div className={classNames(style["http-history-table-flex"])}>
                                            {SourceType.map((tag) => (
                                                <YakitCheckableTag
                                                    key={tag.value}
                                                    checked={!!params.SourceType?.split(",").includes(tag.value)}
                                                    onChange={(checked) => {
                                                        if (checked) {
                                                            setParams((prev) => {
                                                                const selectTypeList = [
                                                                    ...(params.SourceType?.split(",") || []),
                                                                    tag.value
                                                                ]
                                                                return {
                                                                    ...prev,
                                                                    SourceType: selectTypeList.join(",")
                                                                }
                                                            })
                                                        } else {
                                                            setParams((prev) => {
                                                                const selectTypeList = (
                                                                    params.SourceType?.split(",") || []
                                                                ).filter((ele) => ele !== tag.value)
                                                                return {
                                                                    ...prev,
                                                                    SourceType: selectTypeList.join(",")
                                                                }
                                                            })
                                                        }
                                                    }}
                                                >
                                                    {tag.text(t)}
                                                </YakitCheckableTag>
                                            ))}
                                        </div>
                                    )}
                                    <div className={style["http-history-table-flex"]} style={{gap: 8}}>
                                        {shieldData?.data.length > 0 && (
                                            <HTTPFlowShield
                                                shieldData={shieldData}
                                                cancleFilter={cancleFilter}
                                                cancleAllFilter={cancleAllFilter}
                                            />
                                        )}
                                        <div className={style["http-history-table-total"]}>
                                            <div className={style["http-history-table-total-item"]}>
                                                <span className={style["http-history-table-total-item-text"]}>
                                                    Total
                                                </span>
                                                <span className={style["http-history-table-total-item-number"]}>
                                                    {total}
                                                </span>
                                            </div>
                                            <Divider type='vertical' />
                                            <div className={style["http-history-table-total-item"]}>
                                                <span className={style["http-history-table-total-item-text"]}>
                                                    Selected
                                                </span>
                                                <span className={style["http-history-table-total-item-number"]}>
                                                    {isAllSelect ? total : selectedRowKeys?.length}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={style["http-history-table-right"]}>
                                        {showAdvancedSearch && (
                                            <>
                                                <YakitButton
                                                    type='text'
                                                    onClick={() => {
                                                        setDrawerFormVisible(true)
                                                    }}
                                                    style={{padding: 0}}
                                                >
                                                    {t("HTTPFlowTable.advancedFilter")}
                                                </YakitButton>
                                                {isFilter && (
                                                    <YakitTag color={"success"} style={{margin: 0}}>
                                                        {t("HTTPFlowTable.configured")}
                                                        <CheckedSvgIcon />
                                                    </YakitTag>
                                                )}
                                                <Divider type='vertical' style={{margin: 0, top: 1}} />
                                            </>
                                        )}
                                        {showProtocolType && (
                                            <div className={classNames(style["http-history-table-right-item"])}>
                                                {size?.width && size?.width > 1060 && (
                                                    <div className={style["http-history-table-right-label"]}>
                                                        {t("HTTPFlowTable.protocolType")}
                                                    </div>
                                                )}
                                                <YakitSelect
                                                    size='small'
                                                    value={params.IsWebsocket || ""}
                                                    wrapperStyle={{width: 150}}
                                                    onSelect={(val) => {
                                                        setParams((prev) => ({
                                                            ...prev,
                                                            IsWebsocket: val
                                                        }))
                                                    }}
                                                >
                                                    <YakitSelect.Option value=''>
                                                        {t("HTTPFlowTable.all")}
                                                    </YakitSelect.Option>
                                                    <YakitSelect.Option value='http/https'>
                                                        http/https
                                                    </YakitSelect.Option>
                                                    <YakitSelect.Option value='websocket'>websocket</YakitSelect.Option>
                                                </YakitSelect>
                                            </div>
                                        )}
                                        {showHistorySearch && (
                                            <HistorySearch
                                                searchVal={searchVal}
                                                setSearchVal={setSearchVal}
                                                showPopoverSearch={size?.width ? size?.width <= 1200 : true}
                                                handleSearch={handleSearch}
                                            />
                                        )}
                                        {showColorSwatch && (
                                            <div className={style["http-history-table-color-swatch"]}>
                                                <YakitPopover
                                                    overlayClassName={style["http-history-table-color-popover"]}
                                                    content={
                                                        <ColorSearch
                                                            color={cloneDeep(color)}
                                                            setColor={setColor}
                                                            onReset={() => setColor([])}
                                                            onSure={() => onColorSure()}
                                                            setIsShowColor={setIsShowColor}
                                                        />
                                                    }
                                                    trigger='click'
                                                    placement='bottomLeft'
                                                    visible={isShowColor}
                                                    onVisibleChange={(visible) => {
                                                        if (!visible) setIsShowColor(false)
                                                    }}
                                                >
                                                    <YakitButton
                                                        type='outline2'
                                                        isHover={isShowColor || !!color.length}
                                                        style={{padding: 4}}
                                                        onClick={() => setIsShowColor(true)}
                                                    >
                                                        <ColorSwatchIcon />
                                                    </YakitButton>
                                                </YakitPopover>
                                            </div>
                                        )}
                                        {showBatchActions && size?.width && size?.width >= 800 && (
                                            <>
                                                {(selectedRowKeys.length === 0 && (
                                                    <YakitButton
                                                        type='outline2'
                                                        disabled={selectedRowKeys.length === 0}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                        }}
                                                    >
                                                        {t("YakitButton.batchOperation")}
                                                        <ChevronDownIcon style={{color: "#85899E"}} />
                                                    </YakitButton>
                                                )) || (
                                                    <YakitPopover
                                                        overlayClassName={style["http-history-table-drop-down-popover"]}
                                                        content={
                                                            <YakitMenu
                                                                width={150}
                                                                selectedKeys={[]}
                                                                data={getBatchContextMenu()}
                                                                onClick={({key, keyPath}) => {
                                                                    onMultipleClick(key, keyPath)
                                                                }}
                                                            />
                                                        }
                                                        trigger='click'
                                                        placement='bottomLeft'
                                                        onVisibleChange={setBatchVisible}
                                                        visible={batchVisible}
                                                    >
                                                        <YakitButton
                                                            type='outline2'
                                                            disabled={selectedRowKeys.length === 0}
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                            }}
                                                        >
                                                            {t("YakitButton.batchOperation")}
                                                            <ChevronDownIcon />
                                                        </YakitButton>
                                                    </YakitPopover>
                                                )}
                                            </>
                                        )}
                                        {showDelAll && (
                                            <YakitDropdownMenu
                                                menu={{
                                                    data: [
                                                        {
                                                            key: "resetId",
                                                            label: t("HTTPFlowTable.resetRequestID")
                                                        },
                                                        {
                                                            key: "noResetId",
                                                            label: t("HTTPFlowTable.doNotResetRequestID")
                                                        }
                                                    ],
                                                    onClick: ({key}) => {
                                                        switch (key) {
                                                            case "resetId":
                                                                onRemoveHttpHistoryAllAndResetId()
                                                                break
                                                            case "noResetId":
                                                                onRemoveHttpHistoryAll()
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
                                                <YakitButton type='outline1' colors='danger'>
                                                    {t("YakitButton.clear")}
                                                </YakitButton>
                                            </YakitDropdownMenu>
                                        )}
                                        {showSetting && (
                                            <YakitButton
                                                icon={<OutlineCogIcon />}
                                                type={isAdvancedSet ? "text" : "text2"}
                                                onClick={() => {
                                                    setAdvancedSetVisible(true)
                                                }}
                                            >
                                                {isAdvancedSet && t("HTTPFlowTable.configured")}
                                            </YakitButton>
                                        )}
                                        {showRefresh && (
                                            <YakitDropdownMenu
                                                menu={{
                                                    data: [
                                                        {
                                                            key: "noResetRefresh",
                                                            label: t("YakitButton.refreshOnly")
                                                        },
                                                        {
                                                            key: "resetRefresh",
                                                            label: t("YakitButton.resetQueryAndRefresh")
                                                        }
                                                    ],
                                                    onClick: ({key}) => {
                                                        switch (key) {
                                                            case "noResetRefresh":
                                                                updateData()
                                                                break
                                                            case "resetRefresh":
                                                                onResetRefresh()
                                                                break
                                                            default:
                                                                break
                                                        }
                                                    }
                                                }}
                                                dropdown={{
                                                    trigger: ["hover"],
                                                    placement: "bottom"
                                                }}
                                            >
                                                <Badge
                                                    dot={offsetData.length > 0}
                                                    offset={[-5, 4]}
                                                    className={style["http-history-table-badge"]}
                                                >
                                                    <YakitButton
                                                        type='text2'
                                                        icon={<OutlineRefreshIcon />}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </Badge>
                                            </YakitDropdownMenu>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    }
                    isReset={isReset}
                    isRefresh={isRefresh}
                    renderKey='Id'
                    data={realData}
                    rowSelection={{
                        isAll: isAllSelect,
                        type: "checkbox",
                        selectedRowKeys,
                        onSelectAll: onSelectAll,
                        onChangeCheckboxSingle: onSelectChange
                    }}
                    loading={loading}
                    enableDrag={true}
                    columns={columns}
                    // onRowClick={(v)=>{
                    // 此处onRowClick会调用onSetCurrentRow导致重复响应
                    //     onRowClick(v)
                    // }}
                    onRowContextMenu={onRowContextMenu}
                    pagination={{
                        page: pagination.Page,
                        limit: pagination.Limit,
                        total,
                        onChange: (page, limit) => {}
                    }}
                    onChange={onTableChange}
                    onSetCurrentRow={onSetCurrentRow}
                    useUpAndDown={true}
                    containerClassName={containerClassName}
                    onRowDoubleClick={onHTTPFlowTableRowDoubleClick}
                />
            </div>
            {drawerFormVisible && (
                <HTTPFlowTableFormConfiguration
                    pageType={pageType}
                    responseType={contentType}
                    visible={drawerFormVisible}
                    setVisible={setDrawerFormVisible}
                    onSave={(filters) => {
                        const {
                            filterMode,
                            hostName,
                            urlPath,
                            fileSuffix,
                            searchContentType,
                            excludeKeywords,
                            statusCode
                        } = filters
                        setFilterMode(filterMode)
                        setHostName(hostName)
                        setUrlPath(urlPath)
                        setFileSuffix(fileSuffix)
                        setSearchContentType(searchContentType)
                        setExcludeKeywords(excludeKeywords)
                        setStatusCode(statusCode)
                        setDrawerFormVisible(false)
                    }}
                    filterMode={filterMode}
                    hostName={hostName}
                    urlPath={urlPath}
                    fileSuffix={fileSuffix}
                    searchContentType={searchContentType}
                    excludeKeywords={excludeKeywords}
                    statusCode={statusCode}
                />
            )}
            <EditTagsModal
                visible={editTagsVisible}
                editTagsInfo={editTagsRef.current}
                onCancel={() => setEditTagsVisible(false)}
                onOk={editTagsSuccess}
            ></EditTagsModal>
            {percentVisible && (
                <ImportExportProgress
                    getContainer={
                        document.getElementById(`main-operator-page-body-${percentContainerRef.current}`) || undefined
                    }
                    visible={percentVisible}
                    title={t("ImportExportProgress.exportHARData")}
                    token={exportToken}
                    apiKey='ExportHTTPFlowStream'
                    onClose={(finish) => {
                        setPercentVisible(false)
                        if (finish) {
                            yakitNotify("success", t("YakitNotification.exportSuccess"))
                        }
                    }}
                />
            )}
            {advancedSetVisible && (
                <AdvancedSet
                    columnsAllStr={JSON.stringify(
                        configColumnRef.current.filter((item) => !specialCustoms(item.dataKey))
                    )}
                    onCancel={() => {
                        setAdvancedSetVisible(false)
                    }}
                    onSave={(setting) => {
                        setAdvancedSetVisible(false)
                        const {backgroundRefresh: newBackgroundRefresh, configColumnsAll} = setting
                        // 后台刷新
                        if (newBackgroundRefresh !== backgroundRefresh) setBackgroundRefresh(newBackgroundRefresh)
                        // 自定义列
                        const unshowKeys = configColumnsAll.filter((item) => !item.isShow).map((item) => item.dataKey)
                        const newExcludeColumnsKey = [...noColumnsKey, ...unshowKeys]
                        const newColOrder = configColumnsAll.map((i) => i.dataKey)
                        if (
                            JSON.stringify(excludeColumnsKey) !== JSON.stringify(newExcludeColumnsKey) ||
                            JSON.stringify(newColOrder) !== JSON.stringify(columnsOrder)
                        ) {
                            setRemoteValue(RemoteHistoryGV.HistroyExcludeColumnsKey, unshowKeys + "")
                            setRemoteValue(RemoteHistoryGV.HistroyColumnsOrder, JSON.stringify(newColOrder))
                            setExcludeColumnsKey(newExcludeColumnsKey)
                            setColumnsOrder(newColOrder)
                            // 表格列宽度需要重新计算
                            setTableKeyNumber(uuidv4())
                        }
                    }}
                    defalutColumnsOrder={defalutColumnsOrderRef.current}
                ></AdvancedSet>
            )}
        </div>
    )
})

interface HTTPFlowShieldProps {
    shieldData: ShieldData
    cancleFilter: (s: string | number) => void
    cancleAllFilter: (mitmVersion: string) => void
}

export const HTTPFlowShield: React.FC<HTTPFlowShieldProps> = React.memo((props: HTTPFlowShieldProps) => {
    const {shieldData, cancleFilter, cancleAllFilter} = props
    const {t, i18n} = useI18nNamespaces(["yakitUi", "history"])
    const mitmContent = useContext(MITMContext)

    const mitmVersion = useCreation(() => {
        return mitmContent.mitmStore.version
    }, [mitmContent.mitmStore.version])
    return (
        <>
            {shieldData?.data.length > 0 && (
                <YakitPopover
                    placement='bottomLeft'
                    trigger='hover'
                    content={
                        <div className={style["title-header"]}>
                            {shieldData?.data.map((item: number | string) => (
                                <div className={style["title-selected-tag"]} key={item}>
                                    <Tooltip title={item}>
                                        <div className={classNames(style["tag-name-style"])}>{item}</div>
                                    </Tooltip>
                                    <div
                                        className={classNames(style["tag-del-style"])}
                                        onClick={() => cancleFilter(item)}
                                    >
                                        <RemoveIcon />
                                    </div>
                                </div>
                            ))}
                            <YakitButton
                                type='text'
                                className={style["shield-reset"]}
                                onClick={() => cancleAllFilter(mitmVersion)}
                            >
                                {t("YakitButton.reset")}
                            </YakitButton>
                        </div>
                    }
                    overlayClassName={style["http-history-table-shield-popover"]}
                >
                    <div
                        className={style["http-history-table-left-shield"]}
                        style={{width: i18n.language === "zh" ? 115 : 150}}
                    >
                        <span className='content-ellipsis'>{t("HTTPFlowShield.conditionBlocked")}</span>
                        <span className={style["http-history-table-left-number"]}>{shieldData?.data.length}</span>
                        <StatusOfflineIcon className={style["http-history-table-left-shield-icon"]} />
                    </div>
                </YakitPopover>
            )}
        </>
    )
})

interface ColorSearchProps {
    color: string[]
    setColor: (s: string[]) => void
    onReset: () => void
    onSure: () => void
    setIsShowColor: (b: boolean) => void
}

export const ColorSearch = React.memo((props: ColorSearchProps) => {
    const {color, setColor, onReset, onSure, setIsShowColor} = props
    const {t, i18n} = useI18nNamespaces(["yakitUi"])
    const onMouseLeave = useMemoizedFn(() => {
        setIsShowColor(false)
        onSure()
    })
    const onSelect = useMemoizedFn((ele) => {
        const index = color.findIndex((c) => c === ele.searchWord)
        if (index === -1) {
            const newColor: string[] = [...color, ele.searchWord]
            setColor(newColor)
        } else {
            color.splice(index, 1)
            setColor([...color])
        }
    })
    return (
        <div onMouseLeave={onMouseLeave}>
            <div className={style["http-history-table-color-item-list"]}>
                {availableColors.map((ele) => {
                    const checked = color.findIndex((c) => c === ele.searchWord) !== -1
                    return (
                        <div
                            className={classNames(style["http-history-table-color-item"], {
                                [style["http-history-table-color-item-active"]]: checked
                            })}
                            onClick={() => onSelect(ele)}
                            key={ele.color}
                        >
                            <div className={style["http-history-table-color-item-render"]}>{ele.render(t)}</div>
                            {checked && <CheckIcon className={style["check-icon"]} />}
                        </div>
                    )
                })}
            </div>
            <FooterBottom className={style["color-select-footer"]} onReset={onReset} onSure={onSure} />
        </div>
    )
})

export const contentType: FiltersItemProps[] = [
    {
        value: "javascript",
        label: "javascript"
    },
    {
        value: "x-javascript",
        label: "x-javascript"
    },
    {
        value: "html",
        label: "html"
    },
    {
        value: "plain",
        label: "plain"
    },
    {
        value: "xml",
        label: "xml"
    },
    {
        value: "json",
        label: "json"
    },
    {
        value: "form-data",
        label: "form-data"
    },

    {
        value: "octet-stream",
        label: "octet-stream"
    },
    {
        value: "x-www-form-urlencoded",
        label: "x-www-form-urlencoded"
    },
    {
        value: "xhtml+xml",
        label: "xhtml+xml"
    },
    {
        value: "atom+xml",
        label: "atom+xml"
    },
    {
        value: "pdf",
        label: "pdf"
    },
    {
        value: "msword",
        label: "msword"
    },
    {
        value: "gif",
        label: "gif"
    },
    {
        value: "jpeg",
        label: "jpeg"
    },
    {
        value: "png",
        label: "png"
    }
]

export const MultipleSelect: React.FC<SelectSearchProps> = (props) => {
    const {
        originalList,
        onSelect,
        value,
        filterProps,
        onClose,
        onQuery,
        searchVal,
        onChangeSearchVal,
        selectContainerStyle
    } = props
    const {t, i18n} = useI18nNamespaces(["yakitUi"])
    const {filterSearch, filterSearchInputProps = {}} = filterProps || {}

    const containerRef = useRef(null)
    const wrapperRef = useRef(null)
    const scrollDomRef = useRef<any>(null)
    const selectRef = useRef<any>(null)

    const [data, setData] = useState<FiltersItemProps[]>(originalList)
    useEffect(() => {
        if (!searchVal) {
            setData(originalList)
        }
    }, [originalList, searchVal])
    useEffect(() => {
        // 新版UI组件之前的过度写法
        const scrollDom = selectRef.current?.firstChild?.firstChild?.firstChild
        if (!scrollDom) return
        scrollDomRef.current = scrollDom
    }, [])

    const [list] = useVirtualList(data, {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: 34,
        overscan: 15
    })

    const onHandleScroll = useDebounceFn(
        useMemoizedFn(() => {
            scrollDomRef.current.scrollLeft = scrollDomRef.current.scrollWidth
        }),
        {wait: 500}
    ).run

    const getRealOriginalList = useMemoizedFn(() => {
        return originalList
    })
    useDebounceEffect(
        () => {
            if (searchVal) {
                const newData = getRealOriginalList().filter((ele) =>
                    ele.label.toLocaleLowerCase().includes(searchVal.toLocaleLowerCase() || "")
                )
                setData(newData)
            } else {
                setData(getRealOriginalList())
            }
        },
        [searchVal],
        {wait: 300}
    )

    const onSelectMultiple = useMemoizedFn((selectItem: FiltersItemProps) => {
        if (value) {
            if (!Array.isArray(value)) return
            const index = value.findIndex((ele) => ele === selectItem.value)
            if (index === -1) {
                onSelect([...value, selectItem.value], selectItem)
            } else {
                const copyValue = structuredClone(value)
                copyValue.splice(index, 1)
                onSelect(copyValue, selectItem)
            }
        } else {
            onSelect([selectItem.value], selectItem)
        }
        setTimeout(() => {
            if (filterSearch) onHandleScroll()
        }, 50)
    })

    const onReset = useMemoizedFn(() => {
        onSelect([])
        setTimeout(() => {
            onQuery()
        }, 200)
    })

    const onSure = useMemoizedFn(() => {
        onClose()
    })

    const renderMultiple = useMemoizedFn(() => {
        return (
            <div
                className={classNames(style["select-search-multiple"], {
                    [style["select-search-multiple-filterSearch"]]: filterSearch
                })}
            >
                {filterSearch && (
                    <div className={style["select-heard"]} ref={selectRef}>
                        <div className={classNames(style["select-search-input"])}>
                            <YakitInput
                                className={style["select-header-input"]}
                                size='middle'
                                value={searchVal}
                                onChange={(e) => {
                                    onChangeSearchVal && onChangeSearchVal(e.target.value)
                                }}
                                {...filterSearchInputProps}
                            />
                        </div>
                    </div>
                )}
                <div ref={containerRef} className={style["select-container"]} style={selectContainerStyle}>
                    <div ref={wrapperRef} className={style["select-wrapper"]}>
                        {(list.length > 0 &&
                            list.map((item) => {
                                const checked = Array.isArray(value)
                                    ? value?.findIndex((ele) => ele === item.data.value) !== -1
                                    : false
                                return (
                                    <div
                                        key={item.data.value}
                                        className={classNames(style["select-item"], {
                                            [style["select-item-active"]]: checked
                                        })}
                                        onClick={() => onSelectMultiple(item.data)}
                                    >
                                        <span className={classNames(style["select-item-text"], "content-ellipsis")}>
                                            {item.data.label}
                                        </span>
                                        {checked && <CheckIcon className={style["check-icon"]} />}
                                    </div>
                                )
                            })) || <div className={classNames(style["no-data"])}>{t("YakitEmpty.noData")}</div>}
                    </div>
                    <FooterBottom onReset={onReset} onSure={onSure} />
                </div>
            </div>
        )
    })

    return <div className={style["select-search"]}>{renderMultiple()}</div>
}

interface RangeInputNumberTableWrapperProps extends RangeInputNumberProps {
    showSort?: boolean
    bodyLengthSort?: "asc" | "desc" | false
    onBodyLengthSort?: (s: "asc" | "desc") => void
    checkBodyLength: boolean
    onCheckThan0: DebouncedFunc<(check: boolean) => void>
}
export const RangeInputNumberTableWrapper: React.FC<RangeInputNumberTableWrapperProps> = React.memo((props) => {
    const ref = useRef<HTMLDivElement>(null)
    const {
        showSort = false,
        bodyLengthSort,
        onBodyLengthSort,
        checkBodyLength,
        onCheckThan0,
        minNumber,
        maxNumber,
        onSure,
        onReset,
        ...reset
    } = props
    const {t, i18n} = useI18nNamespaces(["history", "yakitUi"])
    const [show, setShow] = useState<boolean>(false)

    // valueChanged判断用户输入值 点击其他区域触发筛选列表
    const [_, setValueChanged, getValueChanged] = useGetSetState<boolean>(false)
    
    const onchangeValued = useMemoizedFn(() => {
        setValueChanged(true)
    })

    const [inViewport] = useInViewport(ref);

    useUpdateEffect(()=>{
        if(!inViewport && getValueChanged()){
            onSure?.()
        }
    },[inViewport])

    return (
        <div className={style["rangeInputNumberTableWrapper"]} style={{padding: show ? undefined : "0 8px 8px"}} ref={ref}>
            {show ? (
                <RangeInputNumberTable
                    {...reset}
                    minNumber={minNumber}
                    maxNumber={maxNumber}
                    onSure={() => {
                        setValueChanged(false)
                        setShow(false)
                        onSure?.()
                    }}
                    onReset={() => {
                        setValueChanged(false)
                        setShow(false)
                        onReset?.()
                    }}
                    onchangeValued={onchangeValued}
                />
            ) : (
                <>
                    {showSort && (
                        <>
                            <div
                                className={classNames(style["body-length-filter"], {
                                    [style["body-length-filter-active"]]: bodyLengthSort === "asc"
                                })}
                                onClick={() => {
                                    onBodyLengthSort?.("asc")
                                }}
                            >
                                <OutlineArrownarrowupIcon className={style["outlineFilterIcon"]} />{" "}
                                {t("YakitTable.asc")}
                            </div>
                            <div
                                className={classNames(style["body-length-filter"], {
                                    [style["body-length-filter-active"]]: bodyLengthSort === "desc"
                                })}
                                onClick={() => {
                                    onBodyLengthSort?.("desc")
                                }}
                            >
                                <OutlineArrownarrowdownIcon className={style["outlineFilterIcon"]} />{" "}
                                {t("YakitTable.desc")}
                            </div>
                        </>
                    )}
                    <div
                        className={classNames(style["body-length-filter"], {
                            [style["body-length-filter-active"]]:
                                typeof minNumber === "number" || typeof maxNumber === "number"
                        })}
                        onClick={() => {
                            setShow(true)
                        }}
                    >
                        <OutlineFilterIcon className={style["outlineFilterIcon"]} />{" "}
                        {t("RangeInputNumberTableWrapper.filter")}
                    </div>
                    <Divider style={{margin: "4px 0"}}></Divider>
                    <div className={style["body-length-checkbox"]}>
                        <span className={style["tip"]}>{t("RangeInputNumberTableWrapper.greaterThanZeroOnly")}</span>
                        <YakitCheckbox checked={checkBodyLength} onChange={(e) => onCheckThan0(e.target.checked)} />
                    </div>
                </>
            )}
        </div>
    )
})
interface RangeInputNumberProps {
    minNumber?: number
    setMinNumber?: (b: number) => void
    maxNumber?: number
    setMaxNumber?: (b: number) => void
    extra?: ReactNode
    onReset?: () => void
    onSure?: () => void
    showFooter?: boolean
    onchangeValued?: () => void 
}

export const RangeInputNumberTable: React.FC<RangeInputNumberProps> = React.memo((props) => {
    const {minNumber, setMinNumber, maxNumber, setMaxNumber, extra, onReset, onSure, showFooter, onchangeValued} = props
    return (
        <div className={style["table-body-length-filter"]}>
            <Input.Group compact size='small' className={style["input-group"]}>
                <YakitInputNumber
                    className={style["input-left"]}
                    placeholder='Minimum'
                    min={0}
                    value={minNumber}
                    onChange={(v) => {
                        if (setMinNumber) setMinNumber(v as number)
                        onchangeValued?.();
                    }}
                    size='small'
                />
                <div className={style["input-split"]}>~</div>
                <YakitInputNumber
                    className={style["input-right"]}
                    placeholder='Maximum'
                    min={minNumber}
                    value={maxNumber}
                    onChange={(v) => {
                        if (setMaxNumber) setMaxNumber(v as number)
                        onchangeValued?.();
                    }}
                    size='small'
                />
                {extra}
            </Input.Group>
            {showFooter !== false && (
                <FooterBottom
                    className={style["input-footer"]}
                    onReset={() => {
                        if (onReset) onReset()
                    }}
                    onSure={() => {
                        if (onSure) onSure()
                    }}
                />
            )}
        </div>
    )
})

// 发送web fuzzer const
export const onSendToTab = async (rowData, openFlag?: boolean, downstreamProxyStr?: string) => {
    ipcRenderer
        .invoke("send-to-tab", {
            type: "fuzzer",
            data: {
                openFlag,
                isHttps: rowData.IsHTTPS,
                downstreamProxyStr,
                request: rowData.InvalidForUTF8Request
                    ? rowData.SafeHTTPRequest!
                    : new Buffer(rowData.Request).toString("utf8")
            }
        })
        .then(() => {
            openFlag === false && info(i18n.language === "zh" ? "发送成功" : "Sent Successfully")
        })
}

// 标注颜色
export const CalloutColor = (flow: HTTPFlow, i: any, data: HTTPFlow[], setData) => {
    if (!flow) {
        return
    }
    const existedTags = flow.Tags ? flow.Tags.split("|").filter((i) => !!i && !i.startsWith("YAKIT_COLOR_")) : []
    existedTags.push(`YAKIT_COLOR_${i.color.toUpperCase()}`)
    ipcRenderer
        .invoke("SetTagForHTTPFlow", {
            Id: flow.Id,
            Hash: flow.Hash,
            Tags: existedTags
        })
        .then(() => {
            yakitNotify(
                "success",
                i18n.language === "zh" ? `设置 HTTPFlow 颜色成功` : "Set HTTPFlow color successfully"
            )
            let newData: HTTPFlow[] = []
            const l = data.length
            for (let index = 0; index < l; index++) {
                const item = {...data[index]}
                if (item.Hash === flow.Hash) {
                    item.Tags = (existedTags || []).join("|")
                    item.cellClassName = filterColorTag(item.Tags) || undefined
                }
                newData.push(item)
            }
            setData(newData)
        })
        .catch((e) => {
            yakitFailed(e + "")
        })
}

// 移除颜色
export const onRemoveCalloutColor = (flow: HTTPFlow, data: HTTPFlow[], setData) => {
    if (!flow) return
    const existedTags = flow.Tags ? flow.Tags.split("|").filter((i) => !!i && !i.startsWith("YAKIT_COLOR_")) : []
    ipcRenderer
        .invoke("SetTagForHTTPFlow", {
            Id: flow.Id,
            Hash: flow.Hash,
            Tags: existedTags
        })
        .then(() => {
            yakitNotify(
                "success",
                i18n.language === "zh" ? `清除 HTTPFlow 颜色成功` : "Clear HTTPFlow color successfully"
            )
            let newData: HTTPFlow[] = []
            const l = data.length
            for (let index = 0; index < l; index++) {
                const item = data[index]
                if (item.Hash === flow.Hash) {
                    item.cellClassName = ""
                    item.Tags = existedTags.join("|")
                }
                newData.push(item)
            }
            setData(newData)
        })
}

const onBatchExecPacketScan = (params: {
    httpFlowIds: string[]
    maxLength: number
    currentPacketScan: {Keyword?: string; Verbose: string}
}) => {
    const {httpFlowIds, maxLength, currentPacketScan} = params
    if (httpFlowIds.length > maxLength) {
        yakitNotify(
            "warning",
            i18n.language === "zh"
                ? `最多同时只能发送${maxLength}条数据`
                : `You can only send a maximum of ${maxLength} data entries at a time`
        )
        return
    }
    execPacketScanWithNewTab({
        httpFlowIds,
        https: false,
        keyword: currentPacketScan.Keyword || "",
        verbose: currentPacketScan.Verbose
    })
}

interface HistorySearchProps {
    searchVal?: string
    setSearchVal?: (s: string) => void
    showPopoverSearch: boolean
    handleSearch: (searchValue: string, searchType: HistoryPluginSearchType) => void
}
export const HistorySearch = React.memo<HistorySearchProps>((props) => {
    const {showPopoverSearch, handleSearch} = props
    const {t, i18n} = useI18nNamespaces(["history"])
    const [isHoverSearch, setIsHoverSearch] = useState<boolean>(false)
    const [searchType, setSearchType, getSearchType] = useGetSetState<HistoryPluginSearchType>("all")
    const [searchVal, setSearchVal] = useControllableValue<string>(props, {
        defaultValue: "",
        valuePropName: "searchVal",
        trigger: "setSearchVal"
    })
    const onSelectBeforeOption = useMemoizedFn((o: string) => {
        setSearchType(o as HistoryPluginSearchType)
    })
    useUpdateEffect(() => {
        onSearch()
    }, [searchType])
    const onInputUpadte = useMemoizedFn((e: any) => {
        setSearchVal(e.target.value)
    })
    const onSearch = useDebounceFn(
        useMemoizedFn(() => {
            handleSearch(searchVal, getSearchType())
        }),
        {wait: 300}
    ).run
    const handleSearchBlur = useMemoizedFn(() => {
        if (searchVal === "") {
            onSearch()
        }
    })
    const searchNode = useMemoizedFn(() => {
        return (
            <YakitCombinationSearch
                wrapperClassName={style["http-history-table-right-search"]}
                afterModuleType='input'
                valueBeforeOption={searchType}
                onSelectBeforeOption={onSelectBeforeOption}
                selectProps={{size: "small"}}
                beforeOptionWidth={100}
                addonBeforeOption={[
                    {
                        label: t("HistorySearch.keyword"),
                        value: "all"
                    },
                    {
                        label: t("HistorySearch.request"),
                        value: "request"
                    },
                    {
                        label: t("HistorySearch.response"),
                        value: "response"
                    }
                ]}
                inputSearchModuleTypeProps={{
                    size: "middle",
                    value: searchVal,
                    onChange: onInputUpadte,
                    onSearch: onSearch,
                    onBlur: handleSearchBlur
                    // wrapperClassName: style["inputSearchModule"]
                }}
            ></YakitCombinationSearch>
        )
    })
    return (
        <div className={style["http-history-search-wrapper"]}>
            {showPopoverSearch ? (
                <YakitPopover
                    overlayClassName={style["http-history-search-drop-down-popover"]}
                    trigger='click'
                    placement='bottomRight'
                    content={searchNode}
                    visible={isHoverSearch}
                    onVisibleChange={setIsHoverSearch}
                >
                    <YakitButton icon={<OutlineSearchIcon />} type='outline2' isHover={isHoverSearch || !!searchVal} />
                </YakitPopover>
            ) : (
                searchNode()
            )}
            <Tooltip title={t("HistorySearch.fuzzSearchExplanation")}>
                <OutlineQuestionmarkcircleIcon className={style["http-history-search-question-icon"]} />
            </Tooltip>
        </div>
    )
})

interface EditTagsInfo {
    Id: number
    Hash: string
    Tags: string[]
}
interface EditTagsModalProps {
    visible: boolean
    editTagsInfo?: EditTagsInfo
    onCancel: () => void
    onOk: (params: EditTagsInfo) => void
}
const EditTagsModal = React.memo<EditTagsModalProps>((props) => {
    const {visible, editTagsInfo, onCancel, onOk} = props
    const {t, i18n} = useI18nNamespaces(["yakitUi", "history"])
    const [form] = Form.useForm()

    useEffect(() => {
        if (editTagsInfo) {
            const tagsStr = editTagsInfo.Tags?.filter((tag) => !tag.startsWith("YAKIT_")).join(",") || ""
            form.setFieldsValue({tags: tagsStr})
        }
    }, [editTagsInfo])

    const handleOk = useMemoizedFn(() => {
        form.validateFields().then((res) => {
            if (editTagsInfo) {
                const {tags} = res
                const formTags = tags.split(",")
                const colorTags = editTagsInfo.Tags.filter((item) => item.startsWith("YAKIT_"))
                const existedTags = [...new Set([...formTags, ...colorTags])].filter((item) => item)
                onOk({
                    Id: editTagsInfo.Id,
                    Hash: editTagsInfo.Hash,
                    Tags: existedTags
                })
            }

            onCancel()
        })
    })

    return (
        <YakitModal
            visible={visible}
            title={t("EditTagsModal.editTag")}
            width={600}
            destroyOnClose={true}
            okText={t("YakitButton.save")}
            onCancel={onCancel}
            onOk={handleOk}
        >
            <Form form={form} colon={false} labelCol={{span: 3}} wrapperCol={{span: 21}}>
                <Form.Item label='Tag' name='tags'>
                    <YakitInput.TextArea
                        placeholder={t("EditTagsModal.multipleTagsComma")}
                        rows={5}
                    ></YakitInput.TextArea>
                </Form.Item>
            </Form>
        </YakitModal>
    )
})

declare type getContainerFunc = () => HTMLElement
interface ImportExportProgressProps {
    visible: boolean
    onClose: (finish: boolean, streamData: ImportExportStreamResponse[]) => void
    getContainer?: string | HTMLElement | getContainerFunc | false
    title: string
    subTitle?: string
    token: string
    apiKey: string
}
export const ImportExportProgress: React.FC<ImportExportProgressProps> = React.memo((props) => {
    const {visible, onClose, getContainer, title, subTitle, token, apiKey} = props
    const {t, i18n} = useI18nNamespaces(["yakitUi"])
    const timeRef = useRef<any>(null)
    const [importExportStream, setImportExportStream] = useState<ImportExportStreamResponse[]>([])
    const importExportStreamRef = useRef<ImportExportStreamResponse[]>([])

    const cancelImportExportHTTPFlowStream = () => {
        ipcRenderer.invoke(`cancel-${apiKey}`, token)
        ipcRenderer.removeAllListeners(`${token}-data`)
        ipcRenderer.removeAllListeners(`${token}-error`)
        ipcRenderer.removeAllListeners(`${token}-end`)
        clearInterval(timeRef.current)
    }
    useEffect(() => {
        const updateImportExportHTTPFlowStream = () => {
            setImportExportStream(importExportStreamRef.current.slice())
        }
        timeRef.current = setInterval(updateImportExportHTTPFlowStream, 300)
        ipcRenderer.on(`${token}-data`, async (e, data: ImportExportStreamResponse) => {
            importExportStreamRef.current.push(data)
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            yakitNotify("error", `error: ${error}`)
            closeModal()
        })
        return () => {
            cancelImportExportHTTPFlowStream()
        }
    }, [token])

    const closeModal = useMemoizedFn(() => {
        onClose(importExportStream[importExportStream.length - 1]?.Percent === 1, importExportStream)
        cancelImportExportHTTPFlowStream()
    })
    useEffect(() => {
        if (importExportStream[importExportStream.length - 1]?.Percent === 1) {
            setTimeout(() => {
                closeModal()
            }, 500)
        }
    }, [JSON.stringify(importExportStream)])

    return (
        <YakitModal
            visible={visible}
            getContainer={getContainer}
            type='white'
            title={title}
            onCancel={closeModal}
            width={680}
            closable={true}
            maskClosable={false}
            destroyOnClose={true}
            bodyStyle={{padding: 0}}
            footerStyle={{justifyContent: "flex-end"}}
            footer={
                <YakitButton type={"outline2"} onClick={closeModal}>
                    {importExportStream[importExportStream.length - 1]?.Percent === 1
                        ? t("YakitButton.finish")
                        : t("YakitButton.cancel")}
                </YakitButton>
            }
        >
            <div style={{padding: 15}} className='yakit-progress-wrapper'>
                {importExportStream[importExportStream.length - 1]?.Percent === undefined && <div>{subTitle}</div>}
                <Progress
                    strokeColor='var(--Colors-Use-Main-Primary)'
                    trailColor='var(--Colors-Use-Neutral-Bg)'
                    percent={Math.trunc(importExportStream[importExportStream.length - 1]?.Percent * 100)}
                    format={(percent) => `${percent}%`}
                />
            </div>
        </YakitModal>
    )
})

export interface ColumnAllInfoItem {
    dataKey: string
    title: string
    isShow: boolean
}
interface AdvancedSetSaveItem {
    backgroundRefresh: boolean
    configColumnsAll: ColumnAllInfoItem[]
}
interface AdvancedSetProps {
    showBackgroundRefresh?: boolean
    columnsAllStr: string
    onCancel: () => void
    onSave: (setting: AdvancedSetSaveItem) => void
    defalutColumnsOrder: string[]
}
export const AdvancedSet: React.FC<AdvancedSetProps> = React.memo((props) => {
    const {showBackgroundRefresh = true, columnsAllStr, onCancel, onSave, defalutColumnsOrder} = props
    const {t, i18n} = useI18nNamespaces(["yakitUi", "history"])
    /** ---------- 后台刷新 Start ---------- */
    const [backgroundRefresh, setBackgroundRefresh] = useState<boolean>(false)
    const oldBackgroundRefresh = useRef<boolean>(false)
    useEffect(() => {
        getRemoteValue(RemoteHistoryGV.BackgroundRefresh).then((e) => {
            oldBackgroundRefresh.current = !!e
            setBackgroundRefresh(!!e)
        })
    }, [])
    /** ---------- 后台刷新 End ---------- */

    /** ---------- 自定义列 Start ---------- */
    const [curColumnsAll, setCurColumnsAll] = useState<ColumnAllInfoItem[]>([])
    useEffect(() => {
        try {
            setCurColumnsAll(JSON.parse(columnsAllStr))
        } catch (error) {}
    }, [columnsAllStr])
    // 处理拖拽结束
    const handleDragEnd = (result: any) => {
        if (!result.destination) return // 没有目标位置，直接返回
        const newItems = [...curColumnsAll]
        const [movedItem] = newItems.splice(result.source.index, 1) // 移除被拖拽的项
        newItems.splice(result.destination.index, 0, movedItem) // 插入到新位置
        setCurColumnsAll(newItems)
    }
    const handleResetColumn = useMemoizedFn(() => {
        const newItems = [...curColumnsAll]
        newItems.forEach((item) => {
            item.isShow = true
        })
        const sortedArr = newItems.sort((x, y) => {
            const keyX = x.dataKey
            const keyY = y.dataKey
            return defalutColumnsOrder.indexOf(keyX) - defalutColumnsOrder.indexOf(keyY)
        })
        setCurColumnsAll(sortedArr)
    })
    /** ---------- 自定义列 End ---------- */

    const handleOk = useMemoizedFn(() => {
        // 缓存后台刷新状态
        if (oldBackgroundRefresh.current !== backgroundRefresh) {
            setRemoteValue(RemoteHistoryGV.BackgroundRefresh, backgroundRefresh ? "true" : "")
        }
        onSave({backgroundRefresh, configColumnsAll: curColumnsAll})
    })

    // 判断是否有修改
    const handleJudgeModify = useMemoizedFn(async () => {
        try {
            // 是否有修改
            let isModify: boolean = false
            if (oldBackgroundRefresh.current !== backgroundRefresh || columnsAllStr !== JSON.stringify(curColumnsAll)) {
                isModify = true
            }
            return isModify
        } catch (error) {
            yakitNotify("error", `${error}`)
            return null
        }
    })
    const handleClose = useMemoizedFn(async () => {
        const result = await handleJudgeModify()
        if (result == null) return

        if (result) {
            Modal.confirm({
                title: t("YakitModal.friendlyReminder"),
                icon: <ExclamationCircleOutlined />,
                content: t("AdvancedSet.saveAdvancedConfigAndClose"),
                okText: t("YakitButton.save"),
                cancelText: t("YakitButton.doNotSave"),
                closable: true,
                closeIcon: (
                    <div
                        onClick={(e) => {
                            e.stopPropagation()
                            Modal.destroyAll()
                        }}
                        className='modal-remove-icon'
                    >
                        <OutlineXIcon />
                    </div>
                ),
                onOk: handleOk,
                onCancel: onCancel,
                cancelButtonProps: {size: "small", className: "modal-cancel-button"},
                okButtonProps: {size: "small", className: "modal-ok-button"}
            })
        } else {
            onCancel()
        }
    })

    return (
        <YakitDrawer
            visible={true}
            width='40%'
            className={style["history-advanced-set-wrapper"]}
            onClose={handleClose}
            title={
                <div className={style["advanced-configuration-drawer-title"]}>
                    <div className={style["advanced-configuration-drawer-title-text"]}>
                        {t("AdvancedSet.advancedConfig")}
                    </div>
                    <div className={style["advanced-configuration-drawer-title-btns"]}>
                        <YakitButton type='outline2' onClick={onCancel}>
                            {t("YakitButton.cancel")}
                        </YakitButton>
                        <YakitButton type='primary' onClick={handleOk}>
                            {t("YakitButton.save")}
                        </YakitButton>
                    </div>
                </div>
            }
            maskClosable={false}
        >
            <div className={style["history-advanced-set-cont"]}>
                {showBackgroundRefresh && (
                    <div className={style["history-advanced-set-item"]}>
                        <div className={style["history-advanced-set-item-title"]}>{t("AdvancedSet.refreshConfig")}</div>
                        <div className={style["history-advanced-set-item-cont"]}>
                            <div className={style["backgroundRefresh"]}>
                                <YakitCheckbox
                                    checked={backgroundRefresh}
                                    onChange={(e) => {
                                        setBackgroundRefresh(e.target.checked)
                                    }}
                                />
                                <span className={style["title-style"]}>{t("AdvancedSet.backgroundRefresh")}</span>
                                <Tooltip title={t("AdvancedSet.keepRefreshingTrafficData")}>
                                    <OutlineInformationcircleIcon className={style["hint-style"]} />
                                </Tooltip>
                            </div>
                        </div>
                    </div>
                )}
                <div className={style["history-advanced-set-item"]}>
                    <div className={style["history-advanced-set-item-title"]}>
                        {t("AdvancedSet.listDisplayFieldsAndOrder")}
                        <YakitButton type='text' size='small' onClick={handleResetColumn}>
                            {t("YakitButton.reset")}
                        </YakitButton>
                    </div>
                    <div className={style["history-advanced-set-item-desc"]}>
                        {t("AdvancedSet.listDisplayConfigTips")}
                    </div>
                    <div className={style["history-advanced-set-item-cont"]}>
                        <DragDropContext onDragEnd={handleDragEnd}>
                            <Droppable droppableId='history-column-list'>
                                {(provided) => (
                                    <div
                                        className={style["columnSet"]}
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                    >
                                        {curColumnsAll.map((item, index) => (
                                            <Draggable key={item.dataKey} draggableId={item.dataKey} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        className={classNames(style["column-item"], {
                                                            [style["column-item-not-allowed"]]: !item.isShow
                                                        })}
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                    >
                                                        <DragSortIcon />
                                                        <div className={style["column-title"]}>{item.title}</div>
                                                        <Tooltip
                                                            title={
                                                                item.isShow
                                                                    ? t("YakitButton.disable")
                                                                    : t("YakitButton.enable")
                                                            }
                                                        >
                                                            <OutlineBanIcon
                                                                className={classNames(style["ban-icon"])}
                                                                onClick={() => {
                                                                    setCurColumnsAll((prev) => {
                                                                        const arr = prev.slice()
                                                                        arr.forEach((i) => {
                                                                            if (i.dataKey === item.dataKey) {
                                                                                i.isShow = !item.isShow
                                                                            }
                                                                        })
                                                                        return arr
                                                                    })
                                                                }}
                                                            />
                                                        </Tooltip>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    </div>
                </div>
            </div>
        </YakitDrawer>
    )
})
