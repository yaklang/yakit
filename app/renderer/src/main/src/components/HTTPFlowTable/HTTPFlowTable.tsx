import React, {ReactNode, Ref, useEffect, useMemo, useRef, useState} from "react"
import {Button, Divider, Empty, Form, Input, Select, Space, Tooltip, Badge} from "antd"
import {YakQueryHTTPFlowRequest} from "../../utils/yakQueryHTTPFlow"
import {showDrawer} from "../../utils/showModal"
import {PaginationSchema, YakScript} from "../../pages/invoker/schema"
import {InputItem, ManyMultiSelectForString, SwitchItem} from "../../utils/inputUtil"
import {HTTPFlowDetail} from "../HTTPFlowDetail"
import {info, yakitNotify, yakitFailed} from "../../utils/notification"
import style from "./HTTPFlowTable.module.scss"
import {formatTime, formatTimestamp} from "../../utils/timeUtil"
import {useHotkeys} from "react-hotkeys-hook"
import {
    useClickAway,
    useDebounceEffect,
    useDebounceFn,
    useGetState,
    useMemoizedFn,
    useThrottleEffect,
    useUpdateEffect,
    useVirtualList
} from "ahooks"
import ReactResizeDetector from "react-resize-detector"
import {callCopyToClipboard} from "../../utils/basic"
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
    CloudDownloadIcon
} from "@/assets/newIcon"
import classNames from "classnames"
import {
    ColumnsTypeProps,
    FiltersItemProps,
    SelectSearchProps,
    SortProps
} from "../TableVirtualResize/TableVirtualResizeType"
import {saveABSFileToOpen} from "@/utils/openWebsite"
import {showResponseViaHTTPFlowID, showResponseViaResponseRaw} from "@/components/ShowInBrowser"
import {YakitSelect} from "../yakitUI/YakitSelect/YakitSelect"
import {YakitCheckbox} from "../yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitCheckableTag} from "../yakitUI/YakitTag/YakitCheckableTag"
import {YakitInput} from "../yakitUI/YakitInput/YakitInput"
import {YakitMenu, YakitMenuItemType} from "../yakitUI/YakitMenu/YakitMenu"
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
import {OutlineRefreshIcon, OutlineSearchIcon} from "@/assets/icon/outline"
import {newWebsocketFuzzerTab} from "@/pages/websocket/WebsocketFuzzer"
import {YakitEditorKeyCode} from "../yakitUI/YakitEditor/YakitEditorType"
import {YakitSystem} from "@/yakitGVDefine"
import {convertKeyboard} from "../yakitUI/YakitEditor/editorUtils"
import {serverPushStatus} from "@/utils/duplex/duplex"
import {useCampare} from "@/hook/useCompare/useCompare"
import {PluginGV} from "@/pages/plugins/builtInData"
import {queryYakScriptList} from "@/pages/yakitStore/network"
import { IconSolidAIIcon, IconSolidAIWhiteIcon } from "@/assets/icon/colors"
import {YakitRoute} from "@/routes/newRouteConstants"

const {ipcRenderer} = window.require("electron")

const {Option} = Select

export interface codecHistoryPluginProps {
    key:string
    label: string
    isAiPlugin:boolean
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
}

export interface FuzzableParams {
    Position: string
    ParamName: string
    OriginValue: Uint8Array
    AutoTemplate: Uint8Array
    IsHTTPS: boolean
}

export interface TableFilterDropdownStringProp<T> {
    label: string
    pureBool?: boolean
    autoCompletions?: string[]
    pureString?: boolean
    filterName: string
    params?: T
    setParams?: (y: T) => any
    restSearch?: () => any

    // from parentcotnext
    confirm?: any
    setSelectedKeys?: (keys: React.Key[]) => any
}

export interface TableFilterDropdownStringsProp<T> {
    label: string
    pureBool?: boolean
    autoCompletions?: string[]
    pureString?: boolean
    filterName: string
    params?: T
    setParams?: (y: T) => any
    submitFilter: () => any
}

export type FilterDropdownStringsProp = TableFilterDropdownStringsProp<YakQueryHTTPFlowRequest>

export const HTTLFlowFilterDropdownForms: React.FC<FilterDropdownStringsProp> = (props) => {
    const {params, setParams} = props

    return (
        <div style={{padding: 8}}>
            <Form
                size={"small"}
                onSubmitCapture={(e) => {
                    e.preventDefault()
                    props.submitFilter()
                }}
            >
                {props.pureBool ? (
                    <>
                        <SwitchItem
                            formItemStyle={{marginBottom: 4}}
                            label={props.label}
                            // @ts-ignore
                            value={params[props.filterName]}
                            setValue={(e) => {
                                if (params && setParams) {
                                    const newParams = {...params}
                                    // @ts-ignore
                                    newParams[props.filterName] = e
                                    setParams(newParams)
                                }
                            }}
                        />
                    </>
                ) : (
                    <>
                        {props.pureString ? (
                            <InputItem
                                style={{marginBottom: 4}}
                                label={props.label}
                                // @ts-ignore
                                value={params[props.filterName]}
                                setValue={(e) => {
                                    if (params && setParams) {
                                        const newParams = {...params}
                                        // @ts-ignore
                                        newParams[props.filterName] = e
                                        setParams(newParams)
                                    }
                                }}
                            />
                        ) : (
                            <ManyMultiSelectForString
                                mode={"tags"}
                                formItemStyle={{marginBottom: 4}}
                                label={props.label}
                                data={(props.autoCompletions || []).map((i) => {
                                    return {value: i, label: i}
                                })}
                                // @ts-ignore
                                value={params[props.filterName]}
                                setValue={(e) => {
                                    if (params && setParams) {
                                        const newParams = {...params}
                                        // @ts-ignore
                                        newParams[props.filterName] = e
                                        setParams(newParams)
                                    }
                                }}
                            />
                        )}
                    </>
                )}
                <Form.Item style={{marginBottom: 0, marginTop: 0}} colon={false} label={" "}>
                    <Space>
                        <Button type='primary' htmlType='submit'>
                            {" "}
                            设置搜索条件{" "}
                        </Button>
                        <Button
                            onClick={() => {
                                if (params && setParams) {
                                    const newParams = {...params}
                                    // @ts-ignore
                                    newParams[props.filterName] = ""
                                    setParams(newParams)
                                }
                            }}
                        >
                            {" "}
                            重置搜索{" "}
                        </Button>
                    </Space>
                </Form.Item>
            </Form>
        </div>
    )
}

export const onExpandHTTPFlow = (flow: HTTPFlow | undefined, onClosed?: () => any) => {
    if (!flow) {
        return <Empty>找不到该请求详情</Empty>
    }

    return (
        <div style={{width: "100%"}}>
            <HTTPFlowDetail id={flow.Id} onClose={onClosed} />
        </div>
    )
}

export interface HTTPFlowTableProp {
    onSelected?: (i?: HTTPFlow) => any
    noHeader?: boolean
    noDeleteAll?: boolean
    tableHeight?: number
    paginationPosition?: "topRight" | "bottomRight"
    params?: YakQueryHTTPFlowRequest
    inViewport?: boolean
    onSearch?: (i: string) => any
    title?: string
    onlyShowFirstNode?: boolean
    setOnlyShowFirstNode?: (i: boolean) => void
    refresh?: boolean
    httpHistoryTableTitleStyle?: React.CSSProperties
    historyId?: string
    // 筛选控件隐藏
    onlyShowSearch?: boolean
    // 表格主要应用类型分为History和mitm两种，若其他页面需要使用此表格，pageType需要默认为History，需要额外再新加参数区分进行使用
    pageType?: HTTPHistorySourcePageType
    searchURL?: string
    includeInUrl?: string | string[]
    onQueryParams?: (queryParams: string, execFlag?: boolean) => void
    titleHeight?: number
    containerClassName?: string

    /** 是否为插件执行使用 */
    toPlugin?: boolean
    /** RuntimeId 流量过滤条件(RuntimeId) */
    runTimeId?: string
    /** 是否为webFuzzer使用 */
    toWebFuzzer?: boolean
    /** 是否显示批量操作 */
    showBatchActions?: boolean
}

export const StatusCodeToColor = (code: number) => {
    if (code >= 400) {
        return "var( --yakit-danger-5)"
    } else if (code < 400 && code >= 300) {
        return "var( --yakit-warning-5)"
    } else {
        return "var( --yakit-success-5)"
    }
}

export const DurationMsToColor = (code: number) => {
    if (code >= 600) {
        return "var( --yakit-danger-5)"
    } else if (code < 600 && code >= 300) {
        return "var( --yakit-warning-5)"
    } else {
        return "var( --yakit-success-5)"
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
        searchWord: "YAKIT_COLOR_RED",
        render: (
            <div className={classNames(style["history-color-tag"])}>
                <div className={classNames(style["tag-color-display"], "color-bg-red")}></div>
                红色
            </div>
        )
    },
    {
        color: "GREEN",
        title: "绿色[#56C991]",
        className: TableRowColor("GREEN"),
        searchWord: "YAKIT_COLOR_GREEN",
        render: (
            <div className={classNames(style["history-color-tag"])}>
                <div className={classNames(style["tag-color-display"], "color-bg-green")}></div>
                绿色
            </div>
        )
    },
    {
        color: "BLUE",
        title: "蓝色[#4A94F8]",
        className: TableRowColor("BLUE"),
        searchWord: "YAKIT_COLOR_BLUE",
        render: (
            <div className={classNames(style["history-color-tag"])}>
                <div className={classNames(style["tag-color-display"], "color-bg-blue")}></div>
                蓝色
            </div>
        )
    },
    {
        color: "YELLOW",
        title: "黄色[#FFD583]",
        searchWord: "YAKIT_COLOR_YELLOW",
        className: TableRowColor("YELLOW"),
        render: (
            <div className={classNames(style["history-color-tag"])}>
                <div className={classNames(style["tag-color-display"], "color-bg-yellow")}></div>
                黄色
            </div>
        )
    },
    {
        color: "ORANGE",
        title: "橙色[#FFB660]",
        searchWord: "YAKIT_COLOR_ORANGE",
        className: TableRowColor("ORANGE"),
        render: (
            <div className={classNames(style["history-color-tag"])}>
                <div className={classNames(style["tag-color-display"], "color-bg-orange")}></div>
                橙色
            </div>
        )
    },
    {
        color: "PURPLE",
        title: "紫色[#8863F7]",
        searchWord: "YAKIT_COLOR_PURPLE",
        className: TableRowColor("PURPLE"),
        render: (
            <div className={classNames(style["history-color-tag"])}>
                <div className={classNames(style["tag-color-display"], "color-bg-purple")}></div>
                紫色
            </div>
        )
    },
    {
        color: "CYAN",
        title: "天蓝色[#35D8EE]",
        searchWord: "YAKIT_COLOR_CYAN",
        className: TableRowColor("CYAN"),
        render: (
            <div className={classNames(style["history-color-tag"])}>
                <div className={classNames(style["tag-color-display"], "color-bg-cyan")}></div>
                天蓝色
            </div>
        )
    },
    {
        color: "GREY",
        title: "灰色[#B4BBCA]",
        searchWord: "YAKIT_COLOR_GREY",
        className: TableRowColor("GREY"),
        render: (
            <div className={classNames(style["history-color-tag"])}>
                <div className={classNames(style["tag-color-display"], "color-bg-grey")}></div>
                灰色
            </div>
        )
    }
]

export interface YakQueryHTTPFlowResponse {
    Data: HTTPFlow[]
    Total: number
    Pagination: PaginationSchema
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

const SourceType = [
    {text: "MITM", value: "mitm"},
    {text: "插件", value: "scan"},
    {
        text: "爬虫",
        value: "basic-crawler"
    }
]

export const getClassNameData = (resData: HTTPFlow[]) => {
    let newData: HTTPFlow[] = []
    const length = resData.length
    if (length > 0) {
    }
    for (let index = 0; index < length; index++) {
        const item: HTTPFlow = resData[index]
        let className = ""
        if (item.Tags && item.Tags.indexOf("YAKIT_COLOR") > -1) {
            const colors = item.Tags.split("|")
            const color = colors.find((i) => i.indexOf("YAKIT_COLOR") > -1)
            className = (color && TableRowColor(color.split("_")?.pop()?.toUpperCase() || "")) || ""
        }
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

export const HTTP_FLOW_TABLE_SHIELD_DATA = "HTTP_FLOW_TABLE_SHIELD_DATA"

export const HTTPFlowTable = React.memo<HTTPFlowTableProp>((props) => {
    const {
        onlyShowFirstNode,
        setOnlyShowFirstNode,
        inViewport = true,
        refresh,
        onlyShowSearch = false,
        pageType,
        historyId,
        titleHeight = 38,
        containerClassName = "",
        toPlugin = false,
        runTimeId,
        toWebFuzzer = false,
        showBatchActions = true
    } = props
    const [data, setData, getData] = useGetState<HTTPFlow[]>([])
    const [color, setColor] = useState<string[]>([])
    const [isShowColor, setIsShowColor] = useState<boolean>(false)
    const [params, setParams, getParams] = useGetState<YakQueryHTTPFlowRequest>({
        ...(props.params || {
            SourceType: "mitm",
            Tags: []
        }),
        SourceType: props.params?.SourceType || "mitm",
        WithPayload: toWebFuzzer,
        RuntimeIDs: runTimeId && runTimeId.indexOf(",") !== -1 ? runTimeId.split(",") : undefined,
        RuntimeId: runTimeId && runTimeId.indexOf(",") === -1 ? runTimeId : undefined
    })
    const [tagsFilter, setTagsFilter] = useState<string[]>([])
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
    // const [statusCode, setStatusCode] = useState<FiltersItemProps[]>([])
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

    const [exportTitle, setExportTitle] = useState<string[]>([])

    const [drawerFormVisible, setDrawerFormVisible] = useState<boolean>(false)
    // 高级筛选所选项
    const [filterMode, setFilterMode] = useState<"shield" | "show">("shield")
    const [hostName, setHostName] = useState<string[]>([])
    const [urlPath, setUrlPath] = useState<string[]>([])
    const [fileSuffix, setFileSuffix] = useState<string[]>([])
    const [searchContentType, setSearchContentType] = useState<string>("")
    // 表格排序
    const sortRef = useRef<SortProps>(defSort)

    const tableRef = useRef<any>(null)

    const boxHeightRef = useRef<number>()

    const ref = useRef(null)

    useHotkeys(
        "ctrl+r",
        (e) => {
            const selected = getSelected()
            if (selected) {
                selected.IsWebsocket ? newWebsocketFuzzerTab(selected.IsHTTPS, selected.Request) : onSendToTab(selected)
            }
        },
        {
            enabled: inViewport
        },
        [ref]
    )

    useHotkeys(
        "ctrl+shift+r",
        (e) => {
            e.stopPropagation()
            const selected = getSelected()
            if (selected) {
                selected.IsWebsocket
                    ? newWebsocketFuzzerTab(selected.IsHTTPS, selected.Request, false)
                    : onSendToTab(selected, false)
            }
        },
        {
            enabled: inViewport
        },
        [ref]
    )

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

    // 初次进入页面 获取默认高级筛选项
    useEffect(() => {
        if (pageType === "History") {
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
        }
    }, [])

    useDebounceEffect(
        () => {
            if (pageType === "History") {
                let newParams = {...params}
                // 屏蔽
                if (filterMode === "shield") {
                    newParams = {
                        ...newParams,
                        SearchContentType: "",
                        ExcludeContentType: searchContentType.length === 0 ? [] : searchContentType.split(","),
                        IncludeInUrl: [],
                        ExcludeInUrl: hostName,
                        IncludePath: [],
                        ExcludePath: urlPath,
                        IncludeSuffix: [],
                        ExcludeSuffix: fileSuffix
                    }
                }
                // 展示
                else {
                    newParams = {
                        ...newParams,
                        SearchContentType: searchContentType,
                        ExcludeContentType: [],
                        IncludeInUrl: hostName,
                        ExcludeInUrl: [],
                        IncludePath: urlPath,
                        ExcludePath: [],
                        IncludeSuffix: fileSuffix,
                        ExcludeSuffix: []
                    }
                }
                setParams(newParams)
                setTimeout(() => {
                    updateData()
                }, 10)
            }
        },
        [filterMode, hostName, urlPath, fileSuffix, searchContentType],
        {wait: 500}
    )

    const isFilter: boolean = useMemo(() => {
        return hostName.length > 0 || urlPath.length > 0 || fileSuffix.length > 0 || searchContentType?.length > 0
    }, [hostName, urlPath, fileSuffix, searchContentType])

    useEffect(() => {
        if (pageType === "MITM") {
            emiter.emit("onGetMITMShieldDataEvent", JSON.stringify(shieldData))
        }
        // 判断是否第一次加载页面
        if (isOneceLoading.current) {
            getShieldList()
        } else {
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
            setParams({...params, ExcludeId: idArr, ExcludeInUrl: urlArr})
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
                    yakitNotify("error", `加载屏蔽参数失败: ${e}`)
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
            setParams({
                ...params,
                ...filter,
                Tags: [...tagsFilter],
                bodyLength: !!(afterBodyLength || beforeBodyLength) // 用来判断响应长度的icon颜色是否显示蓝色
            })
            sortRef.current = sort
            setTimeout(() => {
                updateData()
            }, 10)
        },
        {wait: 500}
    ).run

    /**
     * @name 外面触发搜索条件的改变状态
     * @description 因为直接进行触发搜索时，可能当前已存在搜索过程，导致触发搜索失败
     */
    const triggerFilterValue = useRef<boolean>(false)
    /**
     * 网站树部分
     */
    useUpdateEffect(() => {
        if (pageType === "History") {
            setParams({
                ...params,
                SearchURL: props.searchURL,
                IncludeInUrl: props.includeInUrl
                    ? Array.isArray(props.includeInUrl)
                        ? props.includeInUrl
                        : [props.includeInUrl]
                    : [""]
            })
            setScrollToIndex(0)
            setCurrentIndex(undefined)
            setSelected(undefined)
            setSelectedRowKeys([])
            setSelectedRows([])
            setIsAllSelect(false)
            if (isGrpcRef.current) {
                triggerFilterValue.current = true
            } else {
                setTimeout(() => {
                    updateData()
                }, 10)
            }
        }
    }, [props.searchURL, props.includeInUrl, pageType])
    const [queryParams, setQueryParams] = useState<string>("")
    useEffect(() => {
        if (pageType === "History" && queryParams !== "" && inViewport) {
            props.onQueryParams && props.onQueryParams(queryParams)
        }
    }, [queryParams, pageType, inViewport])
    const updateQueryParams = (query) => {
        const copyQuery = structuredClone(query)
        // 此处删除与树相关得参数 由于queryParams参数需要带到网站树中去查询 是不需要searchURL与IncludeInUrl得 不然会造成死循环
        delete copyQuery.SearchURL
        delete copyQuery.IncludeInUrl
        delete copyQuery.Pagination
        delete copyQuery.AfterId
        delete copyQuery.BeforeId
        delete copyQuery.WithPayload
        delete copyQuery.RuntimeIDs
        delete copyQuery.AfterUpdatedAt
        copyQuery.Color = copyQuery.Color ? copyQuery.Color : []
        copyQuery.StatusCode = copyQuery.StatusCode ? copyQuery.StatusCode.join(",") : ""
        setQueryParams(JSON.stringify(copyQuery))
    }

    const extraTimerRef = useRef<any>() // 用于控制获取total和最大id的轮询
    useEffect(() => {
        return () => {
            clearInterval(extraTimerRef.current)
        }
    }, [])

    // 方法请求
    const getDataByGrpc = useMemoizedFn((query, type: "top" | "bottom" | "update" | "offset") => {
        // 插件执行中流量数据必有runTimeId
        if ((toPlugin || toWebFuzzer) && !runTimeId) {
            setTimeout(() => {
                setLoading(false)
                isGrpcRef.current = false
            }, 100)
            return
        }

        if (isGrpcRef.current) return
        isGrpcRef.current = true

        // 查询数据
        updateQueryParams(query)
        ipcRenderer
            .invoke("QueryHTTPFlows", query)
            .then((rsp: YakQueryHTTPFlowResponse) => {
                const resData = rsp?.Data || []
                const newData: HTTPFlow[] = getClassNameData(resData)

                if (type === "top") {
                    if (newData.length <= 0) {
                        // 没有数据
                        serverPushStatus && setIsLoop(false)
                        return
                    }

                    if (["desc", "none"].includes(query.Pagination.Order)) {
                        setData([...newData, ...data])
                        maxIdRef.current = newData[0].Id
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
                    if (["desc", "none"].includes(query.Pagination.Order)) {
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
                    if (["desc", "none"].includes(query.Pagination.Order)) {
                        const newOffsetData = newData.concat(getOffsetData())
                        maxIdRef.current = newOffsetData[0].Id
                        setOffsetData(newOffsetData)
                    }
                } else {
                    // if (rsp?.Data.length > 0 && data.length > 0 && rsp?.Data[0].Id === data[0].Id) return
                    if (resData.length <= 0) {
                        // 没有数据
                        serverPushStatus && setIsLoop(false)
                    }
                    setSelectedRowKeys([])
                    setSelectedRows([])
                    setIsRefresh(!isRefresh)
                    setPagination(rsp.Pagination)
                    setData([...newData])
                    if (["desc", "none"].includes(query.Pagination.Order)) {
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
                    extraTimerRef.current = setInterval(() => getAddDataByGrpc(query), 1000)
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

    // 第一次启动的时候等待缓存条件加载
    // OnlyWebsocket 变的时候加载一下
    useEffect(() => {
        if (!isOneceLoading.current) {
            updateData()
        }
    }, [params.OnlyWebsocket])

    const excludeIdCom = useCampare(params.ExcludeId)
    const excludeInUrlCom = useCampare(params.ExcludeInUrl)
    useEffect(() => {
        if (!isOneceLoading.current) {
            updateData()
        }
    }, [excludeIdCom, excludeInUrlCom])

    // 获取tags等分组
    const getHTTPFlowsFieldGroup = useMemoizedFn((RefreshRequest: boolean) => {
        ipcRenderer
            .invoke("HTTPFlowsFieldGroup", {
                RefreshRequest
            })
            .then((rsp: HTTPFlowsFieldGroupResponse) => {
                const tags = rsp.Tags.filter((item) => (toWebFuzzer ? item.Value === "webfuzzer" : item.Value))
                setTags(tags.map((ele) => ({label: ele.Value, value: ele.Value})))
            })
            .catch((e: any) => {
                yakitNotify("error", `query HTTP Flows Field Group failed: ${e}`)
            })
    })

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

        if (triggerFilterValue.current) {
            updateData()
            triggerFilterValue.current = false
        }

        // 滚动条接近触顶
        if (scrollTop < 10) {
            updateTopData()
            setOffsetData([])
        }
        // 滚动条接近触底
        else if (typeof scrollBottomPercent === "number" && scrollBottomPercent > 0.9) {
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

    const onRefreshQueryHTTPFlowsFun = useMemoizedFn(() => {
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
    useEffect(() => {
        if (inViewport) {
            scrollUpdate()
            if (isLoop) {
                if (idRef.current) {
                    clearInterval(idRef.current)
                }
                idRef.current = setInterval(scrollUpdate, 1000)
            }
        }
        return () => clearInterval(idRef.current)
    }, [inViewport, isLoop, scrollUpdate])

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

    const cancleMitmFilter = useMemoizedFn((str: string) => {
        const value = JSON.parse(str)
        cancleFilter(value)
    })

    useEffect(() => {
        /**
         * 清空log表格数据
         */
        const cleanLogTableData = () => {
            setOnlyShowFirstNode && setOnlyShowFirstNode(true)
            updateData()
        }
        pageType === "MITM" && emiter.on("cancleMitmFilterEvent", cancleMitmFilter)
        pageType === "MITM" && emiter.on("cleanMitmLogEvent", cleanLogTableData)
        return () => {
            emiter.off("cancleMitmFilterEvent", cancleMitmFilter)
            emiter.off("cleanMitmLogEvent", cleanLogTableData)
        }
    }, [])

    const onColorSure = useMemoizedFn(() => {
        if (isShowColor) {
            setIsShowColor(false)
        }
        setParams({
            ...params,
            Color: color
        })
        setTimeout(() => {
            updateData()
        }, 100)
    })

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
        } else {
            setSelected(undefined)
            setOnlyShowFirstNode && setOnlyShowFirstNode(!onlyShowFirstNode)
        }
    })
    const onSetCurrentRow = useDebounceFn(
        (rowDate: HTTPFlow) => {
            onRowClick(rowDate)
        },
        {wait: 200, leading: true}
    ).run

    const onCheckThan0 = useDebounceFn(
        (check: boolean) => {
            setCheckBodyLength(check)
            if (!getAfterBodyLength()) {
                params.AfterBodyLength = check ? 1 : undefined
            }
            setParams(params)
            setTimeout(() => {
                updateData()
            }, 100)
        },
        {wait: 200}
    ).run
    const columns: ColumnsTypeProps[] = useMemo<ColumnsTypeProps[]>(() => {
        const ID: ColumnsTypeProps = {
            title: "序号",
            dataKey: "Id",
            fixed: "left",
            ellipsis: false,
            width: 96,
            enableDrag: false,
            sorterProps: {
                sorter: true
            }
        }
        const Method: ColumnsTypeProps = {
            title: "方法",
            dataKey: "Method",
            width: 80,
            filterProps: {
                filterKey: "Methods",
                filtersType: "select",
                filtersSelectAll: {
                    isAll: true
                },
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
                    }
                ]
            }
        }
        const StatusCode: ColumnsTypeProps = {
            title: "状态码",
            dataKey: "StatusCode",
            width: 100,
            filterProps: {
                filterMultiple: true,
                filtersType: "select",
                filterSearchInputProps: {
                    size: "small"
                },
                filterOptionRender: (item: FiltersItemProps) => (
                    <div>
                        <span>{item.value}</span>
                        <span>{item.total}</span>
                    </div>
                ),
                filters: [
                    {
                        value: "100-199",
                        label: "[100,200)"
                    },
                    {
                        value: "200-299",
                        label: "[200-300)"
                    },
                    {
                        value: "300-399",
                        label: "[300-400)"
                    },
                    {
                        value: "400-499",
                        label: "[400-500)"
                    },
                    {
                        value: "500-600",
                        label: "[500-600]"
                    }
                ]
            },
            render: (text, rowData) => {
                return (
                    <div
                        className={classNames({
                            [style["status-code"]]: !hasRedOpacityBg(rowData.cellClassName)
                        })}
                    >
                        {text}
                    </div>
                )
            }
        }
        const Url: ColumnsTypeProps = {
            title: "URL",
            dataKey: "Url",
            width: 400,
            filterProps: {
                filterKey: "SearchURL",
                filtersType: "input",
                filterIcon: <OutlineSearchIcon className={style["filter-icon"]} />
            }
        }
        const HtmlTitle: ColumnsTypeProps = {
            title: "Title",
            dataKey: "HtmlTitle",
            width: 200
        }
        const WebPayloads: ColumnsTypeProps = {
            title: "Payloads",
            dataKey: "Payloads",
            width: 300,
            render: (v) => {
                return v ? v.join(",") : "-"
            }
        }
        const Tags: ColumnsTypeProps = {
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
                    <OutlineSearchIcon className={style["filter-icon"]} onClick={() => getHTTPFlowsFieldGroup(true)} />
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
                            value={tagsFilter}
                            onSelect={(v, item) => {
                                if (Array.isArray(v)) {
                                    setTagsFilter(v)
                                }
                            }}
                            onClose={() => {
                                closePopover()
                            }}
                            onQuery={() => {
                                // 这里重置过后的 tagsFilter 不一定是最新的
                                setParams({
                                    ...getParams(),
                                    Tags: []
                                })
                                setTimeout(() => {
                                    updateData()
                                }, 100)
                            }}
                        ></MultipleSelect>
                    )
                }
            }
        }
        const IPAddress: ColumnsTypeProps = {
            title: "IP",
            dataKey: "IPAddress",
            width: 200
        }
        const BodyLength: ColumnsTypeProps = {
            title: "响应长度",
            dataKey: "BodyLength",
            width: 200,
            minWidth: 140,
            beforeIconExtra: (
                <div className={classNames(style["body-length-checkbox"])}>
                    <YakitCheckbox checked={checkBodyLength} onChange={(e) => onCheckThan0(e.target.checked)} />
                    <span className={style["tip"]}>大于0</span>
                </div>
            ),
            filterProps: {
                filterKey: "bodyLength",
                filterRender: () => (
                    <RangeInputNumberTable
                        minNumber={getAfterBodyLength()}
                        setMinNumber={setAfterBodyLength}
                        maxNumber={getBeforeBodyLength()}
                        setMaxNumber={setBeforeBodyLength}
                        onReset={() => {
                            setParams({
                                ...getParams(),
                                AfterBodyLength: checkBodyLength ? 1 : undefined,
                                BeforeBodyLength: undefined
                            })
                            setBeforeBodyLength(undefined)
                            setAfterBodyLength(undefined)
                            setBodyLengthUnit("B")
                        }}
                        onSure={() => {
                            const afterBodyLen = getAfterBodyLength()
                            const beforeBodyLen = getBeforeBodyLength()

                            setParams({
                                ...getParams(),
                                AfterBodyLength:
                                    checkBodyLength && !afterBodyLen
                                        ? 1
                                        : afterBodyLen
                                        ? onConvertBodySizeByUnit(afterBodyLen, getBodyLengthUnit())
                                        : undefined,
                                BeforeBodyLength: beforeBodyLen
                                    ? onConvertBodySizeByUnit(beforeBodyLen, getBodyLengthUnit())
                                    : undefined
                            })
                            setTimeout(() => {
                                updateData()
                            }, 100)
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
                                        rowData.BodyLength > 1000000 && !hasRedOpacityBg(rowData.cellClassName)
                                })}
                            >
                                {rowData.BodySizeVerbose ? rowData.BodySizeVerbose : rowData.BodyLength}
                            </div>
                        )}
                    </>
                )
            }
        }
        const GetParamsTotal: ColumnsTypeProps = {
            title: "参数",
            dataKey: "GetParamsTotal",
            width: 100,
            filterProps: {
                filterKey: "HaveParamsTotal",
                filtersType: "select",
                filtersSelectAll: {
                    isAll: true
                },
                filters: [
                    {
                        label: "有",
                        value: "true"
                    },
                    {
                        label: "无",
                        value: "false"
                    }
                ]
            },
            render: (_, rowData) => (
                <div className={style["check-circle"]}>
                    {(rowData.GetParamsTotal > 0 || rowData.PostParamsTotal > 0) && (
                        <CheckCircleIcon
                            className={classNames({
                                [style["check-circle-icon"]]: !hasRedOpacityBg(rowData.cellClassName)
                            })}
                        />
                    )}
                </div>
            )
        }
        const ContentType: ColumnsTypeProps = {
            title: "响应类型",
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
        }
        const UpdatedAt: ColumnsTypeProps = {
            title: "请求时间",
            dataKey: "UpdatedAt",
            // sorterProps: {
            //     sorterKey: "updated_at",
            //     sorter: true
            // },
            filterProps: {
                filterKey: "UpdatedAt",
                filtersType: "dateTime"
            },
            // fixed: "right",
            width: 200,
            render: (text) => <div title={formatTimestamp(text)}>{text === 0 ? "-" : formatTime(text)}</div>
        }
        const RequestSizeVerbose: ColumnsTypeProps = {
            title: "请求大小",
            dataKey: "RequestSizeVerbose",
            // fixed: "right",
            enableDrag: false,
            width: 200
        }
        const action: ColumnsTypeProps = {
            title: "操作",
            dataKey: "action",
            width: 80,
            fixed: "right",
            render: (_, rowData) => {
                if (!rowData.Hash) return <></>
                return (
                    <div className={style["action-btn-group"]}>
                        <ChromeFrameSvgIcon
                            className={classNames(style["icon-hover"], {
                                [style["icon-style"]]: !hasRedOpacityBg(rowData.cellClassName)
                            })}
                            onClick={(e) => {
                                e.stopPropagation()
                                ipcRenderer
                                    .invoke("GetHTTPFlowById", {Id: rowData?.Id})
                                    .then((i: HTTPFlow) => {
                                        showResponseViaResponseRaw(i?.Response)
                                    })
                                    .catch((e: any) => {
                                        yakitNotify("error", `Query HTTPFlow failed: ${e}`)
                                    })
                            }}
                        />
                        <div className={style["divider-style"]}></div>

                        <ArrowCircleRightSvgIcon
                            className={classNames(style["icon-hover"], {
                                [style["icon-style"]]: !hasRedOpacityBg(rowData.cellClassName)
                            })}
                            onClick={(e) => {
                                e.stopPropagation()
                                let m = showDrawer({
                                    width: "80%",
                                    content: onExpandHTTPFlow(rowData, () => m.destroy())
                                })
                            }}
                        />
                    </div>
                )
            }
        }

        // toWebFuzzer
        if (toWebFuzzer) {
            return [
                ID,
                Method,
                StatusCode,
                Url,
                HtmlTitle,
                WebPayloads,
                Tags,
                IPAddress,
                BodyLength,
                GetParamsTotal,
                ContentType,
                UpdatedAt,
                RequestSizeVerbose,
                action
            ]
        }

        return [
            ID,
            Method,
            StatusCode,
            Url,
            HtmlTitle,
            Tags,
            IPAddress,
            BodyLength,
            GetParamsTotal,
            ContentType,
            UpdatedAt,
            RequestSizeVerbose,
            action
        ]
    }, [tags, tagsFilter, checkBodyLength, toWebFuzzer])

    // 背景颜色是否标注为红色
    const hasRedOpacityBg = (cellClassName: string) => cellClassName.indexOf("color-opacity-bg-red") !== -1

    // 标注颜色批量
    const CalloutColorBatch = useMemoizedFn((flowList: HTTPFlow[], number: number, i: any) => {
        if (flowList.length === 0) {
            yakitNotify("warning", "请选择数据")
            return
        }
        if (flowList.length > number) {
            yakitNotify("warning", `最多同时只能操作${number}条数据`)
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
                    if (newList.findIndex((ele) => ele.Hash === item.Hash) !== -1) {
                        item.cellClassName = i.className
                        item.Tags = `YAKIT_COLOR_${i.color.toUpperCase()}`
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
            yakitNotify("warning", "请选择数据")
            return
        }
        if (flowList.length > number) {
            yakitNotify("warning", `最多同时只能操作${number}条数据`)
            return
        }
        const newList = flowList.map((flow) => {
            const existedTags = flow.Tags
                ? flow.Tags.split("|").filter((i) => !!i && !i.startsWith("YAKIT_COLOR_"))
                : []
            existedTags.pop()
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
                    if (newList.findIndex((ele) => ele.Hash === item.Hash) !== -1) {
                        item.cellClassName = ""
                        item.Tags = ""
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
                yakitNotify("info", "删除成功")
                updateData()
            })
            .finally(() => setTimeout(() => setLoading(false), 100))
    })

    const onDeleteToUpdateEvent = useMemoizedFn((v: string) => {
        const {sourcePage}: {sourcePage?: HTTPHistorySourcePageType} = JSON.parse(v)
        if (
            sourcePage &&
            pageType &&
            sourcePage !== pageType &&
            ["History", "MITM"].includes(sourcePage) &&
            ["History", "MITM"].includes(pageType)
        ) {
            updateData()
        }
    })

    useEffect(() => {
        emiter.on("onDeleteToUpdate", onDeleteToUpdateEvent)
        return () => {
            emiter.off("onDeleteToUpdate", onDeleteToUpdateEvent)
        }
    }, [])

    // 删除成功时 通知History/Mitm页面更新
    const onUpdateHistoryOrMitm = useMemoizedFn(() => {
        // History更新通知MITM 反之亦然
        // 说明： 此处emit并非是通知当前组件 而是通知复用此组件的其余组件 根据pageType区分
        emiter.emit("onDeleteToUpdate", JSON.stringify({sourcePage: pageType}))
    })

    //删除 重置请求 ID
    const onRemoveHttpHistoryAllAndResetId = useMemoizedFn(() => {
        setLoading(true)
        ipcRenderer
            .invoke("DeleteHTTPFlows", {DeleteAll: true})
            .then(() => {
                setOnlyShowFirstNode && setOnlyShowFirstNode(true)
                if (pageType === "History") {
                    props.onQueryParams && props.onQueryParams(queryParams, true)
                }
                updateData()
            })
            .catch((e: any) => {
                yakitNotify("error", `历史记录删除失败: ${e}`)
            })
            .finally(() => {
                onUpdateHistoryOrMitm()
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
                const newParams: YakQueryHTTPFlowRequest = {
                    ...(props.params || {SourceType: "mitm"}),
                    SourceType: props.params?.SourceType || "mitm",
                    ExcludeId: params.ExcludeId,
                    ExcludeInUrl: params.ExcludeInUrl,
                    WithPayload: toWebFuzzer,
                    RuntimeIDs: runTimeId && runTimeId.indexOf(",") !== -1 ? runTimeId.split(",") : undefined,
                    RuntimeId: runTimeId && runTimeId.indexOf(",") === -1 ? runTimeId : undefined
                }
                setParams({...newParams})
                updateData()
            })
            .catch((e: any) => {
                yakitNotify("error", `历史记录删除失败: ${e}`)
            })
            .finally(() => {
                onUpdateHistoryOrMitm()
                setTimeout(() => setLoading(false), 300)
            })
        setLoading(true)
        yakitNotify("info", "正在删除...如自动刷新失败请手动刷新")
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
            yakitNotify("warning", `请选择数据`)
            return
        }
        if (isAllSelect && !all) {
            yakitNotify("warning", "该批量操作不支持全选")
            return
        }
        if (number < length) {
            yakitNotify("warning", `最多同时只能发送${number}条数据`)
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

    // 数据导出
    const initExcelData = (resolve, newExportData: HTTPFlow[], rsp) => {
        let exportData: any = []
        const header: string[] = []
        const filterVal: string[] = []
        exportTitle.map((item) => {
            if (item === "请求包") {
                header.push(item)
                filterVal.push("Request")
            } else if (item === "响应包") {
                header.push(item)
                filterVal.push("Response")
            } else {
                const itemData = columns.filter((itemIn) => itemIn.title === item)[0]
                header.push(item)
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
            const l = data.length
            const query: any = {
                ...params,
                Pagination: {...pagination},
                // OffsetId:
                //     pagination.Page === 1
                //         ? undefined
                //         : data[l - 1] && data[l - 1].Id && (Math.ceil(data[l - 1].Id) as number),
                OffsetId: undefined,
                Full: false
            }

            let exportParams: any = {}
            // 这里的key值 不一定和表格的key对应的上
            const arrList = [
                {
                    title: "序号",
                    key: "id"
                },
                {
                    title: "方法",
                    key: "method"
                },
                {
                    title: "状态码",
                    key: "status_code"
                },
                {
                    title: "URL",
                    key: "url"
                },
                {
                    title: "Title",
                    key: "response"
                },
                {
                    title: "Payloads",
                    key: "payloads"
                },
                {
                    title: "Tags",
                    key: "tags"
                },
                {
                    title: "IP",
                    key: "iP_address"
                },
                {
                    title: "响应长度",
                    key: "body_length"
                },
                {
                    title: "参数",
                    key: "get_params_total"
                },
                {
                    title: "响应类型",
                    key: "content_type"
                },
                {
                    title: "请求时间",
                    key: "updated_at"
                },
                {
                    title: "请求大小",
                    key: "request"
                },
                {
                    title: "请求包",
                    key: "request"
                },
                {
                    title: "响应包",
                    key: "response"
                }
            ]
            const FieldName = arrList.filter((item) => exportTitle.includes(item.title)).map((item) => item.key)

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
                    yakitNotify("warning", `部分导出内容缺失:${message}`)
                }
                initExcelData(resolve, rsp.Data, rsp)
            })
        })
    })

    const onExcelExport = (list) => {
        const titleValue = columns.filter((item) => !["序号", "操作"].includes(item.title)).map((item) => item.title)
        const exportValue = [...titleValue, "请求包", "响应包"]
        const m = showYakitModal({
            title: "导出字段",
            content: (
                <ExportSelect
                    exportValue={exportValue}
                    initCheckValue={
                        toWebFuzzer ? exportValue.filter((i) => !["参数", "请求包", "响应包"].includes(i)) : exportValue
                    }
                    setExportTitle={(v: string[]) => setExportTitle(["序号", ...v])}
                    exportKey={toWebFuzzer ? "WEBFUZZER-HISTORY-EXPORT-KEY" : "MITM-HTTP-HISTORY-EXPORT-KEY"}
                    fileName={!toWebFuzzer ? "History" : "WebFuzzer"}
                    getData={(pagination) => getExcelData(pagination, list)}
                />
            ),
            onCancel: () => {
                m.destroy()
                setSelectedRowKeys([])
                setSelectedRows([])
            },
            width: 650,
            footer: null,
            maskClosable: false
        })
    }

    const systemRef = useRef<YakitSystem>("Darwin")
    useEffect(() => {
        ipcRenderer.invoke("fetch-system-name").then((systemType: YakitSystem) => {
            systemRef.current = systemType
        })
    }, [])

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
            [PluginGV.PluginCodecSingleHistorySwitch]
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
            [PluginGV.PluginCodecMultipleHistorySwitch]
        )
    })

    const addIconLabel = useMemoizedFn((data:codecHistoryPluginProps[])=>{
        return data.map((item)=>({
            ...item,
            label:<>
            {item.isAiPlugin && (
                <>
                    <IconSolidAIIcon className={"ai-plugin-menu-icon-default"} />
                    <IconSolidAIWhiteIcon className={"ai-plugin-menu-icon-hover"} />
                </>
            )}
            {item.key}
        </>
        }))
    })
    const getCodecHistoryPlugin = useMemoizedFn(() => {
        if (selectedRows.length > 1) {
            return codecMultipleHistoryPlugin.length > 0
                ? addIconLabel(codecMultipleHistoryPlugin)
                : [
                      {
                          key: "Get*plug-in",
                          label: <><CloudDownloadIcon style={{marginRight:4}}/>获取插件</>
                      }
                  ]
        } else {
            return codecSingleHistoryPlugin.length > 0
                ? addIconLabel(codecSingleHistoryPlugin)
                : [
                      {
                          key: "Get*plug-in",
                          label: <><CloudDownloadIcon style={{marginRight:4}}/>获取插件</>
                      }
                  ]
        }
    })

    const getCodecAIPlugin = useMemoizedFn(() => {
        if (selectedRows.length > 1) {
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
                          label: <><CloudDownloadIcon style={{marginRight:4}}/>获取插件</>
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
                          label: <><CloudDownloadIcon style={{marginRight:4}}/>获取插件</>
                      }
                  ]
        }
    })

    const menuData = [
        {
            key: "发送到 Web Fuzzer",
            label: "发送到 Web Fuzzer",
            number: 10,
            default: true,
            webSocket: false,
            toWebFuzzer: true,
            children: [
                {
                    key: "sendAndJumpToWebFuzzer",
                    label: "发送并跳转",
                    keybindings: [YakitEditorKeyCode.Control, YakitEditorKeyCode.KEY_R]
                },
                {
                    key: "sendToWebFuzzer",
                    label: "仅发送",
                    keybindings: [YakitEditorKeyCode.Control, YakitEditorKeyCode.Shift, YakitEditorKeyCode.KEY_R]
                }
            ],
            onClickBatch: () => {}
        },
        {
            key: "发送到 WS Fuzzer",
            label: "发送到 WS Fuzzer",
            number: 10,
            webSocket: true,
            default: false,
            toWebFuzzer: false,
            children: [
                {
                    key: "sendAndJumpToWS",
                    label: "发送并跳转",
                    keybindings: [YakitEditorKeyCode.Control, YakitEditorKeyCode.KEY_R]
                },
                {
                    key: "sendToWS",
                    label: "仅发送",
                    keybindings: [YakitEditorKeyCode.Control, YakitEditorKeyCode.Shift, YakitEditorKeyCode.KEY_R]
                }
            ],
            onClickBatch: () => {}
        },
        {
            key: "数据包扫描",
            label: "数据包扫描",
            number: 10,
            default: true,
            webSocket: false,
            toWebFuzzer: true,
            onClickSingle: () => {},
            onClickBatch: () => {},
            children: GetPacketScanByCursorMenuItem(selected?.Id || 0)?.subMenuItems?.map((ele) => ({
                key: ele.title,
                label: ele.title
            }))
        },
        {
            key: "插件扩展",
            label: "插件扩展",
            default: true,
            webSocket: false,
            toWebFuzzer: true,
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
                    AI插件
                </>
            ),
            default: true,
            webSocket: false,
            toWebFuzzer: true,
            onClickSingle: () => {},
            onClickBatch: () => {},
            children: getCodecAIPlugin()
        },
        {
            key: "复制 URL",
            label: "复制 URL",
            number: 30,
            webSocket: true,
            default: true,
            toWebFuzzer: true,
            onClickSingle: (v) => callCopyToClipboard(v.Url),
            onClickBatch: (v, number) => {
                if (v.length === 0) {
                    yakitNotify("warning", "请选择数据")
                    return
                }
                if (v.length < number) {
                    callCopyToClipboard(v.map((ele) => `${ele.Url}`).join("\r\n"))
                    setSelectedRowKeys([])
                    setSelectedRows([])
                } else {
                    yakitNotify("warning", `最多同时只能复制${number}条数据`)
                }
            }
        },
        {
            key: "下载 Response Body",
            label: "下载 Response Body",
            default: true,
            webSocket: false,
            toWebFuzzer: true,
            onClickSingle: (v) => {
                ipcRenderer.invoke("GetResponseBodyByHTTPFlowID", {Id: v.Id}).then((bytes: {Raw: Uint8Array}) => {
                    saveABSFileToOpen(`response-body.txt`, bytes.Raw)
                })
            }
        },
        {
            key: "浏览器中打开",
            label: "浏览器中打开",
            default: true,
            webSocket: false,
            toWebFuzzer: true,
            onClickSingle: (v) => {
                showResponseViaHTTPFlowID(v)
            }
        },
        {
            key: "复制为 CSRF Poc",
            label: "复制为 CSRF Poc",
            default: true,
            webSocket: false,
            toWebFuzzer: true,
            onClickSingle: (v) => {
                const flow = v as HTTPFlow
                if (!flow) return
                generateCSRFPocByRequest(flow.Request, flow.IsHTTPS, (e) => {
                    callCopyToClipboard(e)
                })
            }
        },
        {
            key: "复制为 Yak PoC 模版",
            label: "复制为 Yak PoC 模版",
            default: true,
            webSocket: false,
            toWebFuzzer: true,
            onClickSingle: () => {},
            children: [
                {
                    key: "数据包 PoC 模版",
                    label: "数据包 PoC 模版"
                },
                {
                    key: "批量检测 PoC 模版",
                    label: "批量检测 PoC 模版"
                }
            ]
        },
        {
            key: "标注颜色",
            label: "标注颜色",
            default: true,
            webSocket: false,
            toWebFuzzer: true,
            number: 20,
            onClickSingle: () => {},
            onClickBatch: () => {},
            children: availableColors.map((i) => {
                return {
                    key: i.title,
                    label: i.render,
                    onClick: (v) => CalloutColor(v, i, data, setData),
                    onClickBatch: (list, n) => CalloutColorBatch(list, n, i)
                }
            })
        },
        {
            key: "移除颜色",
            label: "移除颜色",
            default: true,
            webSocket: false,
            toWebFuzzer: true,
            number: 20,
            onClickSingle: (v) => onRemoveCalloutColor(v, data, setData),
            onClickBatch: (list, n) => onRemoveCalloutColorBatch(list, n)
        },
        {
            key: "发送到对比器",
            label: "发送到对比器",
            default: true,
            webSocket: false,
            toWebFuzzer: true,
            onClickSingle: () => {},
            children: [
                {
                    key: "发送到对比器左侧",
                    label: "发送到对比器左侧",
                    disabled: [false, true, false][compareState]
                },
                {
                    key: "发送到对比器右侧",
                    label: "发送到对比器右侧",
                    disabled: [false, false, true][compareState]
                }
            ]
        },
        {
            key: "屏蔽",
            label: "屏蔽",
            webSocket: true,
            default: true,
            toWebFuzzer: true,
            onClickSingle: () => {},
            children: [
                {
                    key: "屏蔽该记录",
                    label: "屏蔽该记录"
                },
                {
                    key: "屏蔽URL",
                    label: "屏蔽URL"
                },
                {
                    key: "屏蔽域名",
                    label: "屏蔽域名"
                }
            ]
        },
        {
            key: "删除",
            label: "删除",
            webSocket: true,
            default: true,
            toWebFuzzer: true,
            onClickSingle: () => {},
            onClickBatch: () => {},
            all: true,
            children: [
                {
                    key: "删除记录",
                    label: "删除记录",
                    onClick: (v) => onRemoveHttpHistory({Id: [v.Id]}),
                    onClickBatch: (list) => {
                        onRemoveHttpHistory({Id: list.map((ele) => ele.Id)})
                    }
                },
                {
                    key: "删除URL",
                    label: "删除URL",
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
                    label: "删除域名",
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
            label: "分享数据包",
            number: 30,
            default: true,
            webSocket: false,
            toWebFuzzer: true,
            onClickSingle: (v) => onShareData([v.Id], 50),
            onClickBatch: (list, n) => {
                const ids: string[] = list.map((ele) => ele.Id)
                onShareData(ids, n)
            }
        },
        {
            key: "导出数据",
            label: "导出数据",
            default: true,
            webSocket: false,
            toWebFuzzer: true,
            onClickSingle: (v) => onExcelExport([v]),
            onClickBatch: (list, n) => onExcelExport(list)
        }
    ]
    /** 菜单自定义快捷键渲染处理事件 */
    const contextMenuKeybindingHandle = useMemoizedFn((data) => {
        const menus: any = []
        for (let item of data) {
            /** 处理带快捷键的菜单项 */
            const info = item
            if (info.children && info.children.length > 0) {
                info.children = contextMenuKeybindingHandle(info.children)
            } else {
                if (info.keybindings && info.keybindings.length > 0) {
                    const keysContent = convertKeyboard(systemRef.current, info.keybindings)

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
            .filter((item) => (rowData.IsWebsocket ? item.webSocket : toWebFuzzer ? item.toWebFuzzer : item.default))
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
                                yakitNotify("warning", "该批量操作不支持全选")
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
                        const scanItem = packetScanDefaultValue.find((e) => e.Verbose === key)
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
                            onSendToTab(rowData)
                            break
                        case "sendToWebFuzzer":
                            onSendToTab(rowData, false)
                            break
                        case "sendAndJumpToWS":
                            newWebsocketFuzzerTab(rowData.IsHTTPS, rowData.Request)
                            break
                        case "sendToWS":
                            newWebsocketFuzzerTab(rowData.IsHTTPS, rowData.Request, false)
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
                callCopyToClipboard(code)
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
                callCopyToClipboard(code)
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
    const onResetRefresh = useMemoizedFn(() => {
        sortRef.current = defSort
        const newParams: YakQueryHTTPFlowRequest = {
            ...(props.params || {SourceType: "mitm"}),
            SourceType: props.params?.SourceType || "mitm",
            ExcludeId: params.ExcludeId,
            ExcludeInUrl: params.ExcludeInUrl,
            WithPayload: toWebFuzzer,
            RuntimeIDs: runTimeId && runTimeId.indexOf(",") !== -1 ? runTimeId.split(",") : undefined,
            RuntimeId: runTimeId && runTimeId.indexOf(",") === -1 ? runTimeId : undefined
        }
        setParams(newParams)
        setIsReset(!isReset)
        setColor([])
        setCheckBodyLength(false)
        if (pageType === "History") {
            props.onQueryParams && props.onQueryParams(queryParams, true)
        }
        setTimeout(() => {
            updateData()
        }, 100)
    })
    /**
     * @description 分享数据包
     * @param ids 分享数据得ids
     */
    const onShareData = useMemoizedFn((ids: string[], number: number) => {
        if (isAllSelect) {
            yakitNotify("warning", "该批量操作不支持全选")
            return
        }
        if (ids.length === 0) {
            yakitNotify("warning", "请选择数据")
            return
        }
        if (ids.length > number) {
            yakitNotify("warning", `最多同时只能操作${number}条数据`)
            return
        }
        const m = showYakitModal({
            title: "分享数据",
            content: <ShareModal module={YakitRoute.DB_HTTPHistory} shareContent={JSON.stringify(ids)} />,
            onCancel: () => {
                m.destroy()
                setSelectedRowKeys([])
                setSelectedRows([])
            },
            footer: null
        })
    })

    const searchNode = useMemoizedFn(() => {
        return (
            <YakitInput.Search
                size='small'
                placeholder='请输入关键词搜索'
                value={params.Keyword}
                onChange={(e) => {
                    setParams({...params, Keyword: e.target.value})
                }}
                style={{maxWidth: 200}}
                onSearch={() => {
                    updateData()
                }}
                // 这个事件很关键哈，不要用 onChange
                onBlur={(e) => {
                    if (props.onSearch) {
                        props.onSearch(e.target.value)
                    }
                }}
            />
        )
    })

    const searchEle = useMemoizedFn(() => {
        return (
            <>
                {size?.width && size?.width < 1000 ? (
                    <YakitPopover trigger='click' placement='bottomRight' content={searchNode}>
                        <YakitButton icon={<OutlineSearchIcon />} type='outline2' />
                    </YakitPopover>
                ) : (
                    <YakitInput.Search
                        className={style["http-history-table-right-search"]}
                        placeholder='请输入关键词搜索'
                        value={params.Keyword}
                        onChange={(e) => {
                            setParams({...params, Keyword: e.target.value})
                        }}
                        onSearch={() => {
                            setTimeout(() => {
                                updateData()
                            }, 50)
                        }}
                        // 这个事件很关键哈，不要用 onChange
                        onBlur={(e) => {
                            if (props.onSearch) {
                                props.onSearch(e.target.value)
                            }
                        }}
                    />
                )}
            </>
        )
    })

    const getBatchContextMenu = useMemoizedFn(() => {
        return menuData
            .filter((f) => (toWebFuzzer ? f.onClickBatch && f.toWebFuzzer : f.onClickBatch))
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
                    yakitNotify("warning", "该批量操作不支持全选")
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
            if (isAllSelect) {
                yakitNotify("warning", "该批量操作不支持全选")
                return
            }
            const currentItemScan = menuData.find((f) => f.onClickBatch && f.key === "数据包扫描")
            const currentItemPacketScan = packetScanDefaultValue.find((f) => f.Verbose === key)
            if (!currentItemScan || !currentItemPacketScan) return

            onBatchExecPacketScan({
                httpFlowIds: selectedRowKeys,
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
                onBatch(onSendToTab, currentItemJumpToFuzzer?.number || 0, selectedRowKeys.length === total)

                break
            case "sendToWebFuzzer":
                const currentItemToFuzzer = menuData.find((f) => f.onClickBatch && f.key === "发送到 Web Fuzzer")
                if (!currentItemToFuzzer) return
                onBatch(
                    (el) => onSendToTab(el, false),
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
            default:
                const currentItem = menuData.find((f) => f.onClickBatch && f.key === key)
                if (!currentItem) return
                if (currentItem.onClickBatch) currentItem.onClickBatch(selectedRows, currentItem.number)
                break
        }
        setBatchVisible(false)
    })

    const batchActions = useMemoizedFn(() => {
        return (
            <>
                {size?.width && size?.width >= 1000 && (
                    <>
                        {(selectedRowKeys.length === 0 && (
                            <YakitButton
                                type='outline2'
                                disabled={selectedRowKeys.length === 0}
                                onClick={(e) => {
                                    e.stopPropagation()
                                }}
                            >
                                批量操作
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
                                    批量操作
                                    <ChevronDownIcon />
                                </YakitButton>
                            </YakitPopover>
                        )}
                    </>
                )}
            </>
        )
    })

    return (
        <div ref={ref as Ref<any>} tabIndex={-1} style={{width: "100%", height: "100%", overflow: "hidden"}}>
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
                    ref={tableRef}
                    currentIndex={currentIndex}
                    setCurrentIndex={setCurrentIndex}
                    scrollToIndex={scrollToIndex}
                    query={params}
                    titleHeight={titleHeight}
                    renderTitle={
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
                                <div
                                    style={onlyShowSearch ? {marginLeft: 8} : {}}
                                    className={classNames(style["http-history-table-flex"])}
                                >
                                    {!onlyShowSearch &&
                                        SourceType.map((tag) => (
                                            <YakitCheckableTag
                                                key={tag.value}
                                                checked={!!params.SourceType?.split(",").includes(tag.value)}
                                                onChange={(checked) => {
                                                    if (checked) {
                                                        const selectTypeList = [
                                                            ...(params.SourceType?.split(",") || []),
                                                            tag.value
                                                        ]
                                                        setParams({...params, SourceType: selectTypeList.join(",")})
                                                    } else {
                                                        const selectTypeList = (
                                                            params.SourceType?.split(",") || []
                                                        ).filter((ele) => ele !== tag.value)
                                                        setParams({...params, SourceType: selectTypeList.join(",")})
                                                    }
                                                    setTimeout(() => {
                                                        updateData()
                                                    }, 10)
                                                }}
                                            >
                                                {tag.text}
                                            </YakitCheckableTag>
                                        ))}
                                </div>
                                <div className={style["http-history-table-flex"]}>
                                    {shieldData?.data.length > 0 && (
                                        <div style={{marginRight: 16}}>
                                            <HTTPFlowShield shieldData={shieldData} cancleFilter={cancleFilter} />
                                        </div>
                                    )}
                                    <div className={style["http-history-table-total"]}>
                                        <div className={style["http-history-table-total-item"]}>
                                            <span className={style["http-history-table-total-item-text"]}>Total</span>
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
                                    {onlyShowSearch ? (
                                        <>
                                            {searchEle()}
                                            {showBatchActions && <div style={{marginLeft: 8}}>{batchActions()}</div>}
                                        </>
                                    ) : (
                                        <>
                                            <YakitButton
                                                type='text'
                                                onClick={() => {
                                                    setDrawerFormVisible(true)
                                                }}
                                            >
                                                高级筛选
                                            </YakitButton>
                                            {isFilter && (
                                                <YakitTag color={"success"}>
                                                    已配置
                                                    <CheckedSvgIcon style={{marginLeft: 8}} />
                                                </YakitTag>
                                            )}
                                            <Divider type='vertical' style={{margin: "0px 8px 0px 0px", top: 1}} />
                                            <div className={classNames(style["http-history-table-right-item"])}>
                                                {size?.width && size?.width > 1060 && (
                                                    <div className={style["http-history-table-right-label"]}>
                                                        协议类型
                                                    </div>
                                                )}
                                                <YakitSelect
                                                    size='small'
                                                    value={params.IsWebsocket || ""}
                                                    wrapperStyle={{width: 150}}
                                                    onSelect={(val) => {
                                                        setParams({...params, IsWebsocket: val})
                                                        setTimeout(() => {
                                                            updateData()
                                                        }, 50)
                                                    }}
                                                >
                                                    <YakitSelect.Option value=''>全部</YakitSelect.Option>
                                                    <YakitSelect.Option value='http/https'>
                                                        http/https
                                                    </YakitSelect.Option>
                                                    <YakitSelect.Option value='websocket'>websocket</YakitSelect.Option>
                                                </YakitSelect>
                                            </div>
                                            {searchEle()}
                                            <div className={style["http-history-table-color-swatch"]}>
                                                <YakitPopover
                                                    overlayClassName={style["http-history-table-color-popover"]}
                                                    content={
                                                        <ColorSearch
                                                            color={color}
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
                                                        isHover={isShowColor}
                                                        style={{padding: 4}}
                                                        onClick={() => setIsShowColor(true)}
                                                    >
                                                        <ColorSwatchIcon />
                                                    </YakitButton>
                                                </YakitPopover>
                                            </div>
                                            {showBatchActions && batchActions()}
                                        </>
                                    )}
                                    <div className={style["empty-button"]}>
                                        {!props.noDeleteAll && (
                                            <YakitDropdownMenu
                                                menu={{
                                                    data: [
                                                        {
                                                            key: "resetId",
                                                            label: "重置请求 ID"
                                                        },
                                                        {
                                                            key: "noResetId",
                                                            label: "不重置请求 ID"
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
                                                    清空
                                                </YakitButton>
                                            </YakitDropdownMenu>
                                        )}
                                        <YakitDropdownMenu
                                            menu={{
                                                data: [
                                                    {
                                                        key: "noResetRefresh",
                                                        label: "仅刷新"
                                                    },
                                                    {
                                                        key: "resetRefresh",
                                                        label: "重置查询条件刷新"
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
                                    </div>
                                </div>
                            </div>
                        </div>
                    }
                    isShowTitle={pageType !== "MITM"}
                    isReset={isReset}
                    isRefresh={isRefresh}
                    renderKey='Id'
                    data={data}
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
                />
            </div>

            <HTTPFlowTableFormConfiguration
                responseType={contentType}
                visible={drawerFormVisible}
                setVisible={setDrawerFormVisible}
                onSave={(val) => {
                    const {filterMode, hostName, urlPath, fileSuffix, searchContentType} = val
                    setFilterMode(filterMode)
                    setHostName(hostName)
                    setUrlPath(urlPath)
                    setFileSuffix(fileSuffix)
                    setSearchContentType(searchContentType)
                    setDrawerFormVisible(false)
                }}
                filterMode={filterMode}
                hostName={hostName}
                urlPath={urlPath}
                fileSuffix={fileSuffix}
                searchContentType={searchContentType}
            />
        </div>
    )
})

interface HTTPFlowShieldProps {
    shieldData: ShieldData
    cancleFilter: (s: string | number) => void
}

export const HTTPFlowShield: React.FC<HTTPFlowShieldProps> = React.memo((props: HTTPFlowShieldProps) => {
    const {shieldData, cancleFilter} = props
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
                        </div>
                    }
                    overlayClassName={style["http-history-table-shield-popover"]}
                >
                    <div className={style["http-history-table-left-shield"]}>
                        <span className='content-ellipsis'>已屏蔽条件</span>
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

const ColorSearch = React.memo((props: ColorSearchProps) => {
    const {color, setColor, onReset, onSure, setIsShowColor} = props
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
                            <div className={style["http-history-table-color-item-render"]}>{ele.render}</div>
                            {checked && <CheckIcon className={style["check-icon"]} />}
                        </div>
                    )
                })}
            </div>
            <FooterBottom className={style["color-select-footer"]} onReset={onReset} onSure={onSure} />
        </div>
    )
})

const contentType: FiltersItemProps[] = [
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

const MultipleSelect: React.FC<SelectSearchProps> = (props) => {
    const {originalList, onSelect, value, filterProps, onClose, onQuery} = props
    const {filterSearch, filterSearchInputProps = {}} = filterProps || {}

    const containerRef = useRef(null)
    const wrapperRef = useRef(null)
    const scrollDomRef = useRef<any>(null)
    const selectRef = useRef<any>(null)

    const [data, setData] = useState<FiltersItemProps[]>(originalList)
    useEffect(() => {
        setData(originalList)
    }, [originalList])
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

    const onSearch = useDebounceFn(
        useMemoizedFn((label: string) => {
            if (label) {
                const newData = originalList.filter((ele) => ele.label.includes(label))
                setData(newData)
            } else {
                setData(originalList)
            }
        }),
        {wait: 200}
    ).run

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
                                onSearch={onSearch}
                                onChange={(e) => onSearch(e.target.value)}
                                {...filterSearchInputProps}
                            />
                        </div>
                    </div>
                )}
                <div ref={containerRef} className={style["select-container"]}>
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
                            })) || <div className={classNames(style["no-data"])}>暂无数据</div>}
                    </div>
                    <FooterBottom onReset={onReset} onSure={onSure} />
                </div>
            </div>
        )
    })

    return <div className={style["select-search"]}>{renderMultiple()}</div>
}

interface RangeInputNumberProps {
    minNumber?: number
    setMinNumber?: (b: number) => void
    maxNumber?: number
    setMaxNumber?: (b: number) => void
    extra?: ReactNode
    onReset?: () => void
    onSure?: () => void
    showFooter?: boolean
}

export const RangeInputNumberTable: React.FC<RangeInputNumberProps> = React.memo((props) => {
    const {minNumber, setMinNumber, maxNumber, setMaxNumber, extra, onReset, onSure, showFooter} = props
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
export const onSendToTab = (rowData, openFlag?: boolean) => {
    ipcRenderer
        .invoke("send-to-tab", {
            type: "fuzzer",
            data: {
                openFlag,
                isHttps: rowData.IsHTTPS,
                request: rowData.InvalidForUTF8Request
                    ? rowData.SafeHTTPRequest!
                    : new Buffer(rowData.Request).toString("utf8")
            }
        })
        .then(() => {
            openFlag === false && info("发送成功")
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
            yakitNotify("success", `设置 HTTPFlow 颜色成功`)
            let newData: HTTPFlow[] = []
            const l = data.length
            for (let index = 0; index < l; index++) {
                const item = {...data[index]}
                if (item.Hash === flow.Hash) {
                    item.cellClassName = i.className
                    item.Tags = `YAKIT_COLOR_${i.color.toUpperCase()}`
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
            yakitNotify("success", `清除 HTTPFlow 颜色成功`)
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
        yakitNotify("warning", `最多同时只能发送${maxLength}条数据`)
        return
    }
    execPacketScanWithNewTab({
        httpFlowIds,
        https: false,
        keyword: currentPacketScan.Keyword || "",
        verbose: currentPacketScan.Verbose
    })
}
