import React, {ReactNode, Ref, useEffect, useMemo, useRef, useState} from "react"
import {Button, Divider, Empty, Form, Input, Popover, Select, Space, Tooltip, Badge} from "antd"
import {YakQueryHTTPFlowRequest} from "../../utils/yakQueryHTTPFlow"
import {showDrawer} from "../../utils/showModal"
import {PaginationSchema} from "../../pages/invoker/schema"
import {InputItem, ManyMultiSelectForString, SwitchItem} from "../../utils/inputUtil"
import {HTTPFlowDetail} from "../HTTPFlowDetail"
import {yakitInfo, yakitNotify} from "../../utils/notification"
import style from "./HTTPFlowTable.module.scss"
import {formatTime, formatTimestamp} from "../../utils/timeUtil"
import {useHotkeys} from "react-hotkeys-hook"
import {useClickAway, useDebounceEffect, useDebounceFn, useGetState, useMemoizedFn, useVirtualList} from "ahooks"
import ReactResizeDetector from "react-resize-detector"
import {callCopyToClipboard} from "../../utils/basic"
import {
    generateCSRFPocByRequest,
    generateYakCodeByRequest,
    RequestToYakCodeTemplate
} from "../../pages/invoker/fromPacketToYakCode"
import {execPacketScan} from "@/pages/packetScanner/PacketScanner"
import {GetPacketScanByCursorMenuItem, packetScanDefaultValue} from "@/pages/packetScanner/DefaultPacketScanGroup"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {FooterBottom, TableVirtualResize} from "../TableVirtualResize/TableVirtualResize"
import {
    CheckCircleIcon,
    FilterIcon,
    RefreshIcon,
    RemoveIcon,
    SearchIcon,
    StatusOfflineIcon,
    ColorSwatchIcon,
    ChevronDownIcon,
    ArrowCircleRightSvgIcon,
    ChromeFrameSvgIcon,
    CheckIcon,
    TrashIcon,
    SaveIcon
} from "@/assets/newIcon"
import classNames from "classnames"
import {ColumnsTypeProps, FiltersItemProps, SortProps} from "../TableVirtualResize/TableVirtualResizeType"
import {saveABSFileToOpen} from "@/utils/openWebsite"
import {showResponseViaHTTPFlowID, showResponseViaResponseRaw} from "@/components/ShowInBrowser"
import {YakitSelect} from "../yakitUI/YakitSelect/YakitSelect"
import {YakitCheckbox} from "../yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitCheckableTag} from "../yakitUI/YakitTag/YakitCheckableTag"
import {YakitInput} from "../yakitUI/YakitInput/YakitInput"
import {YakitMenu, YakitMenuItemProps} from "../yakitUI/YakitMenu/YakitMenu"
import {YakitDropdownMenu} from "../yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {YakitPopover} from "../yakitUI/YakitPopover/YakitPopover"
import {showByRightContext} from "../yakitUI/YakitMenu/showByRightContext"
import {YakitInputNumber} from "../yakitUI/YakitInputNumber/YakitInputNumber"
import {showYakitModal} from "../yakitUI/YakitModal/YakitModalConfirm"
import {ShareModal} from "@/pages/fuzzer/components/ShareData"
import { YakitRoute } from "@/routes/newRoute"
import {useSize} from "ahooks"
import { HTTPFlowTableFormConfiguration, HTTPFlowTableFormConsts, HTTPFlowTableFromValue } from "./HTTPFlowTableForm"
import { YakitTag } from "../yakitUI/YakitTag/YakitTag"
import { CheckedSvgIcon } from "../layout/icons"
import { ExportSelect } from "../DataExport/DataExport"

const {ipcRenderer} = window.require("electron")

const {Option} = Select

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

export type FilterDropdownStringProp = TableFilterDropdownStringProp<YakQueryHTTPFlowRequest>

export const TableFilterDropdownForm: React.FC<TableFilterDropdownStringProp<any>> = (
    props: TableFilterDropdownStringProp<any>
) => {
    return <HTTLFlowFilterDropdownForm {...props} />
}

export const HTTLFlowFilterDropdownForm: React.FC<FilterDropdownStringProp> = (props) => {
    const {params, setParams, setSelectedKeys, restSearch} = props
    return (
        <div style={{padding: 8}}>
            <Form
                size={"small"}
                onSubmitCapture={(e) => {
                    e.preventDefault()

                    if (setSelectedKeys) {
                        // @ts-ignore
                        if (params[props.filterName]) {
                            setSelectedKeys([
                                `${props.filterName}: ${JSON.stringify(
                                    // @ts-ignore
                                    params ? {result: params[props.filterName]} : {}
                                )}`
                            ])
                        } else {
                            setSelectedKeys([])
                        }
                    }
                    if (props.confirm) {
                        props.confirm()
                    }
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
                                    if (e === "") {
                                        if (setSelectedKeys) {
                                            setSelectedKeys([])
                                        }
                                    }
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
                                setSelectedKeys && setSelectedKeys([])
                                if (params && setParams) {
                                    const newParams = {...params}
                                    // @ts-ignore
                                    newParams[props.filterName] = ""
                                    setParams(newParams)
                                    setTimeout(() => {
                                        if (restSearch) restSearch()
                                    }, 300)
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
    setOnlyShowFirstNode?:(i:boolean)=>void
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
            return "color-opacity-bg-red"
        case "GREEN":
            return "color-opacity-bg-green"
        case "BLUE":
            return "color-opacity-bg-blue"
        case "YELLOW":
            return "color-opacity-bg-yellow"
        case "ORANGE":
            return "color-opacity-bg-orange"
        case "PURPLE":
            return "color-opacity-bg-purple"
        case "CYAN":
            return "color-opacity-bg-cyan"
        case "GREY":
            return "color-opacity-bg-grey"
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

const TableFirstLinePlaceholder: HTTPFlow = {
    Method: "",
    Path: "",
    Hash: "",
    IsHTTPS: false,
    Url: "",
    Request: new Uint8Array(),
    Response: new Uint8Array(),
    StatusCode: 0,
    BodyLength: -1,
    ContentType: "null",
    SourceType: "",
    RequestHeader: [],
    ResponseHeader: [],
    GetParamsTotal: 0,
    PostParamsTotal: 0,
    CookieParamsTotal: 0,
    CreatedAt: 0,
    UpdatedAt: 0,
    GetParams: [],
    PostParams: [],
    CookieParams: [],
    Tags: "",
    Id: -1,
    IsPlaceholder: true
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
            className =
                (colors.length > 0 && TableRowColor(colors?.pop()?.split("_")?.pop()?.toUpperCase() || "")) || ""
        }
        const newItem = {
            ...item,
            cellClassName: className
        }
        newData.push(newItem)
    }
    return newData
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

export const HTTPFlowTable = React.memo<HTTPFlowTableProp>((props) => {
    const { onlyShowFirstNode,setOnlyShowFirstNode,inViewport = true } = props
    const [data, setData, getData] = useGetState<HTTPFlow[]>([])
    const [color, setColor] = useState<string[]>([])
    const [isShowColor, setIsShowColor] = useState<boolean>(false)
    const [params, setParams, getParams] = useGetState<YakQueryHTTPFlowRequest>({
        ...(props.params || {SourceType: "mitm", Tags: []}),
        SourceType: props.params?.SourceType || "mitm"
    })
    const [tagsQuery, setTagsQuery] = useState<string[]>([])
    const [contentTypeQuery, setContentTypeQuery] = useState<string>("")

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

    const [compareLeft, setCompareLeft] = useState<CompateData>({content: "", language: "http"})
    const [compareRight, setCompareRight] = useState<CompateData>({content: "", language: "http"})
    const [compareState, setCompareState] = useState(0)

    // 屏蔽数据
    const [shieldData, setShieldData] = useState<ShieldData>({
        data: []
    })
    const [isRefresh, setIsRefresh] = useState<boolean>(false) // 刷新表格，滚动至0
    const [_, setBodyLengthUnit, getBodyLengthUnit] = useGetState<"B" | "K" | "M">("B")
    const [maxId, setMaxId, getMaxId] = useGetState<number>(0)
    const [tags, setTags] = useState<FiltersItemProps[]>([])
    // const [statusCode, setStatusCode] = useState<FiltersItemProps[]>([])
    const [currentIndex, setCurrentIndex] = useState<number>(0)
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
    const [selectedRows, setSelectedRows] = useState<HTTPFlow[]>([])
    const [isAllSelect, setIsAllSelect] = useState<boolean>(false)
    const [offsetData, setOffsetData, getOffsetData] = useGetState<HTTPFlow[]>([])
    const [afterBodyLength, setAfterBodyLength, getAfterBodyLength] = useGetState<number>()
    const [beforeBodyLength, setBeforeBodyLength, getBeforeBodyLength] = useGetState<number>()
    const [isReset, setIsReset] = useState<boolean>(false)

    const [checkBodyLength, setCheckBodyLength] = useState<boolean>(false) // 查询BodyLength大于0

    const [batchVisible, setBatchVisible] = useState<boolean>(false)

    const [exportTitle,setExportTitle] = useState<string[]>([])

    const [drawerFormVisible,setDrawerFormVisible] = useState<boolean>(false)

    // 高级筛选所选项
    const [filterMode,setFilterMode] = useState<"shield"|"show">("shield")
    const [hostName,setHostName] = useState<string[]>([])
    const [urlPath,setUrlPath] = useState<string[]>([])
    const [fileSuffix,setFileSuffix] = useState<string[]>([])
    const [searchContentType,setSearchContentType] = useState<string>("")
    // 表格排序
    const sortRef = useRef<SortProps>(defSort)

    const tableRef = useRef<any>(null)
    const HTTP_FLOW_TABLE_SHIELD_DATA = "HTTP_FLOW_TABLE_SHIELD_DATA"

    const ref = useHotkeys("ctrl+r, enter", (e) => {
        const selected = getSelected()
        if (selected) {
            ipcRenderer.invoke("send-to-tab", {
                type: "fuzzer",
                data: {
                    isHttps: selected?.IsHTTPS,
                    request: new Buffer(selected.Request).toString()
                }
            })
        }
    })

    const size = useSize(ref)

    // 初次进入页面 获取默认高级筛选项
    useEffect(()=>{
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
                const ContentType:string = e
                setSearchContentType(ContentType)
            }
        })
    },[])

    useDebounceEffect(()=>{
        let newParams = {...params}
        // 屏蔽
        if(filterMode==="shield"){
            newParams = {
                ...newParams,
                SearchContentType:"",
                ExcludeInUrl:hostName,
                IncludeInUrl:[]
            }
        }
        // 展示
        else{
            newParams = {
                ...newParams,
                SearchContentType:searchContentType,
                ExcludeInUrl:[],
                IncludeInUrl:hostName
            }
        }
        console.log("请求参数：",newParams);
        
        setParams(newParams)
        setTimeout(() => {
            update(1)
        }, 10)
    },[filterMode,hostName,urlPath,fileSuffix,searchContentType],{wait: 500})

    const isFilter:boolean = useMemo(() => {
        return hostName.length>0||urlPath.length>0||fileSuffix.length>0||searchContentType?.length>0
    },[hostName,urlPath,fileSuffix,searchContentType])
    
    // 向主页发送对比数据
    useEffect(() => {
        if (compareLeft.content) {
            const params = {info: compareLeft, type: 1}
            setCompareState(compareState === 0 ? 1 : 0)

            ipcRenderer.invoke("add-data-compare", params)
        }
    }, [compareLeft])

    useEffect(() => {
        if (compareRight.content) {
            const params = {info: compareRight, type: 2}
            setCompareState(compareState === 0 ? 2 : 0)

            ipcRenderer.invoke("add-data-compare", params)
        }
    }, [compareRight])

    useEffect(() => {
        // 判断是否第一次加载页面
        if (isOneceLoading.current) {
            getShieldList()
        } else {
            // 持久化存储
            setRemoteValue(HTTP_FLOW_TABLE_SHIELD_DATA, JSON.stringify(shieldData))
            // setRemoteValue(HTTP_FLOW_TABLE_SHIELD_DATA, JSON.stringify({
            //     data:[],
            // }))
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
        getNewData()
        getHTTPFlowsFieldGroup(true)
    }, [])
    // useEffect(() => {
    //     // 刷新
    //     getHTTPFlowsFieldGroup(true)
    // }, [total])
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
                    update(1)
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
            if (filter["Tags"]) {
                setTagsQuery(filter["Tags"])
            }
            if (filter["ContentType"]) {
                setTagsQuery(filter["ContentType"].join(","))
                filter["SearchContentType"] = filter["ContentType"].join(",")
            }
            setParams({
                ...params,
                ...filter,
                bodyLength: !!(afterBodyLength || beforeBodyLength), // 用来判断响应长度的icon颜色是否显示蓝色
                AfterBodyLength: afterBodyLength,
                BeforeBodyLength: beforeBodyLength
            })
            sortRef.current = sort
            setTimeout(() => {
                update(1, limit)
            }, 10)
        },
        {wait: 500}
    ).run

    const update = useMemoizedFn(
        (page?: number, limit?: number, order?: string, orderBy?: string, sourceType?: string, noLoading?: boolean) => {
            const paginationProps = {
                Page: page || 1,
                Limit: limit || pagination.Limit,
                Order: sortRef.current.order,
                OrderBy: sortRef.current.orderBy || "id"
            }
            if (!noLoading) setLoading(true)

            const l = data.length
            const query = {
                SourceType: sourceType,
                ...params,
                Tags: params.Tags,
                Pagination: {...paginationProps},
                OffsetId:
                    paginationProps.Page == 1
                        ? undefined
                        : data[l - 1] && data[l - 1].Id && (Math.ceil(data[l - 1].Id) as number),
                AfterBodyLength: params.AfterBodyLength
                    ? onConvertBodySizeByUnit(params.AfterBodyLength, getBodyLengthUnit())
                    : undefined,
                BeforeBodyLength: params.BeforeBodyLength
                    ? onConvertBodySizeByUnit(params.BeforeBodyLength, getBodyLengthUnit())
                    : undefined
            }

            if (checkBodyLength && !query.AfterBodyLength) {
                query.AfterBodyLength = 1
            }
            
            ipcRenderer
                .invoke("QueryHTTPFlows", query)
                .then((rsp: YakQueryHTTPFlowResponse) => {
                    // if (rsp?.Data.length === 0) return
                    if (paginationProps.Page == 1) {
                        setTotal(rsp.Total)
                    }
                    if (noLoading && rsp?.Data.length > 0 && data.length > 0 && rsp?.Data[0].Id === data[0].Id) return

                    const newData: HTTPFlow[] = getClassNameData(rsp?.Data || [])
                    if (paginationProps.Page == 1) {
                        setSelectedRowKeys([])
                        setSelectedRows([])
                        setIsRefresh(!isRefresh)
                    }
                    const d = paginationProps.Page == 1 ? newData : data.concat(newData)
                    setPagination(rsp.Pagination)
                    setData(d)
                })
                .catch((e: any) => {
                    yakitNotify("error", `query HTTP Flow failed: ${e}`)
                })
                .finally(() => setTimeout(() => setLoading(false), 100))
        }
    )

    // 第一次启动的时候等待缓存条件加载
    // OnlyWebsocket 变的时候加载一下
    useEffect(() => {
        if (!isOneceLoading.current) {
            update(1)
        }
    }, [params.OnlyWebsocket])

    useEffect(() => {
        if (!isOneceLoading.current) {
            update()
        }
    }, [params.ExcludeId, params.ExcludeInUrl])

    // 获取最新的数据
    const getNewData = useMemoizedFn(() => {
        ipcRenderer
            .invoke("QueryHTTPFlows", {
                // SourceType: "mitm",
                SourceType: props.params?.SourceType || "mitm",
                ...params,
                Pagination: {Page: 1, Limit: 1, Order: "desc", OrderBy: "id"}
            })
            .then((rsp: YakQueryHTTPFlowResponse) => {
                if (rsp.Data.length > 0) {
                    setMaxId(rsp.Data[0].Id)
                }
                setTotal(rsp.Total)
            })
            .catch((e: any) => {
                yakitNotify("error", `query HTTP Flow failed: ${e}`)
            })
    })

    // 获取tags等分组
    const getHTTPFlowsFieldGroup = useMemoizedFn((RefreshRequest: boolean) => {
        ipcRenderer
            .invoke("HTTPFlowsFieldGroup", {
                RefreshRequest
            })
            .then((rsp: HTTPFlowsFieldGroupResponse) => {
                // const statusCode = rsp.StatusCode.map((ele) => ({value: ele.Value, total: ele.Total, label: ele.Value}))
                const tags = rsp.Tags
                setTags(tags.map((ele) => ({label: ele.Value, value: ele.Value})))
                // setStatusCode([...statusCode])
            })
            .catch((e: any) => {
                yakitNotify("error", `query HTTP Flows Field Group failed: ${e}`)
            })
    })

    const scrollUpdateTop = useMemoizedFn(() => {
        const scrollTop = tableRef.current?.containerRef?.scrollTop
        if (scrollTop < 10) {
            update(1, undefined, undefined, undefined, undefined, true)
            setOffsetData([])
            return
        }
        const paginationProps = {
            Page: 1,
            Limit: OFFSET_STEP,
            Order: "desc",
            OrderBy: "id"
        }
        const query = {
            ...params,
            Tags: params.Tags,
            Color: color ? [color] : undefined,
            AfterBodyLength: params.AfterBodyLength
                ? onConvertBodySizeByUnit(params.AfterBodyLength, getBodyLengthUnit())
                : undefined,
            BeforeBodyLength: params.BeforeBodyLength
                ? onConvertBodySizeByUnit(params.BeforeBodyLength, getBodyLengthUnit())
                : undefined,
            // SourceType: "mitm",
            SourceType: props.params?.SourceType || "mitm",
            AfterId: maxId, // 用于计算增量的
            Pagination: {...paginationProps}
        }
        // 查询数据
        ipcRenderer
            .invoke("QueryHTTPFlows", query)
            .then((rsp: YakQueryHTTPFlowResponse) => {
                const resData = rsp?.Data || []
                if (resData.length <= 0) {
                    // 没有增量数据
                    return
                }

                // 有增量数据刷新total
                const newTotal: number = Math.ceil(total) + Math.ceil(rsp.Total)
                // setLoading(true)
                setTotal(newTotal)
                const newData = getClassNameData(resData)
                const newOffsetData = newData.concat(getOffsetData())
                setMaxId(newOffsetData[0].Id)
                setOffsetData(newOffsetData)
            })
            .catch((e: any) => {
                yakitNotify('error',`query HTTP Flow failed: ${e}`)
            })
            .finally(() => setTimeout(() => setLoading(false), 200))
    })

    // 给设置做防抖
    useDebounceEffect(
        () => {
            props.onSelected && props.onSelected(selected)
        },
        [selected],
        {wait: 400, trailing: true, leading: true}
    )
    // 设置是否自动刷新
    useEffect(() => {
        if (inViewport) {
            scrollUpdateTop()
            let id = setInterval(scrollUpdateTop, 1000)
            return () => clearInterval(id)
        }
    }, [inViewport])

    // 保留数组中非重复数据
    const filterNonUnique = (arr) => arr.filter((i) => arr.indexOf(i) === arr.lastIndexOf(i))
    // 数组去重
    const filterItem = (arr) => arr.filter((item, index) => arr.indexOf(item) === index)

    // 取消屏蔽筛选
    const cancleFilter = (value) => {
        const newArr = filterNonUnique([...shieldData.data, value])
        const newObj = {...shieldData, data: newArr}
        setShieldData(newObj)
    }

    const onColorSure = useMemoizedFn(() => {
        if (isShowColor) {
            setIsShowColor(false)
        }
        setParams({
            ...params,
            Color: color
        })
        setTimeout(() => {
            update(1)
        }, 100)
    })

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
    const onRowClick = useMemoizedFn((rowDate: HTTPFlow) => {  
        if (!rowDate.Hash) return
        if (rowDate.Hash !== selected?.Hash) {
            setSelected(rowDate)
            setOnlyShowFirstNode&&setOnlyShowFirstNode(false)
        } else {
            // setSelected(undefined)
            setOnlyShowFirstNode&&setOnlyShowFirstNode(!onlyShowFirstNode)
        }
    })
    const onSetCurrentRow = useDebounceFn(
        (rowDate: HTTPFlow) => {
            onRowClick(rowDate)
        },
        {wait: 200}
    ).run

    const onCheckThan0 = useDebounceFn(
        (check: boolean) => {
            setCheckBodyLength(check)
            setTimeout(() => {
                update(1)
            }, 100)
        },
        {wait: 200}
    ).run
    const columns: ColumnsTypeProps[] = useMemo<ColumnsTypeProps[]>(() => {
        return [
            {
                title: "序号",
                dataKey: "Id",
                fixed: "left",
                ellipsis: false,
                width: 96,
                enableDrag: false
            },
            {
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
                        },
                    ]
                }
            },
            {
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
                    ]
                },
                render: (text) => <div className={style["status-code"]}>{text}</div>
            },
            {
                title: "URL",
                dataKey: "Url",
                width: 400
            },
            {
                title: "Title",
                dataKey: "HtmlTitle"
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
                    filtersType: "select",
                    filterMultiple: true,
                    filterSearchInputProps: {
                        size: "small"
                    },
                    filterIcon: <SearchIcon />,
                    filters: tags
                }
            },
            {
                title: "IP",
                dataKey: "IPAddress",
                width: 200
            },
            {
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
                                    AfterBodyLength: getAfterBodyLength(),
                                    BeforeBodyLength: getBeforeBodyLength()
                                })
                                setBeforeBodyLength(undefined)
                                setAfterBodyLength(undefined)
                                setBodyLengthUnit("B")
                            }}
                            onSure={() => {
                                setParams({
                                    ...getParams(),
                                    AfterBodyLength: getAfterBodyLength(),
                                    BeforeBodyLength: getBeforeBodyLength()
                                })
                                setTimeout(() => {
                                    update(1)
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
                                    <YakitSelect value='k'>K</YakitSelect>
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
                                        [style["body-length-text-red"]]: rowData.BodyLength > 1000000
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
                title: "参数",
                dataKey: "GetParamsTotal",
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
                            <CheckCircleIcon className={style["check-circle-icon"]} />
                        )}
                    </div>
                )
            },
            {
                title: "响应类型",
                dataKey: "ContentType",
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
                    filterIcon: <SearchIcon />,
                    filters: contentType
                }
            },
            {
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
                render: (text) => <div title={formatTimestamp(text)}>{text === 0 ? "-" : formatTime(text)}</div>
            },
            {
                title: "请求大小",
                dataKey: "RequestSizeVerbose",
                // fixed: "right",
                enableDrag: false
            },
            {
                title: "操作",
                dataKey: "action",
                width: 80,
                fixed: "right",
                render: (_, rowData) => {
                    if (!rowData.Hash) return <></>
                    return (
                        <div className={style["action-btn-group"]}>
                            <ChromeFrameSvgIcon
                                className={style["icon-style"]}
                                onClick={() => {
                                    ipcRenderer
                                        .invoke("GetHTTPFlowById", {Id: rowData?.Id})
                                        .then((i: HTTPFlow) => {
                                            showResponseViaResponseRaw(i?.Response)
                                        })
                                        .catch((e: any) => {
                                            yakitNotify('error',`Query HTTPFlow failed: ${e}`)
                                        })
                                }}
                            />
                            <div className={style["divider-style"]}></div>

                            <ArrowCircleRightSvgIcon
                                className={style["icon-style"]}
                                onClick={(e) => {
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
        ]
    }, [tags, checkBodyLength])

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
                update()
            })
            .finally(() => setTimeout(() => setLoading(false), 100))
    })
    //删除 重置请求 ID
    const onRemoveHttpHistoryAllAndResetId = useMemoizedFn(() => {
        setLoading(true)
        ipcRenderer
            .invoke("DeleteHTTPFlows", {DeleteAll: true})
            .then(() => {
                update(1)
            })
            .catch((e: any) => {
                yakitNotify('error', `历史记录删除失败: ${e}`)
            })
            .finally(() => {
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
                const newParams: YakQueryHTTPFlowRequest = {
                    ...(props.params || {SourceType: "mitm"}),
                    SourceType: props.params?.SourceType || "mitm",
                    ExcludeId: params.ExcludeId,
                    ExcludeInUrl: params.ExcludeInUrl
                }
                setParams({...newParams})
                update(1)
            })
            .catch((e: any) => {
                yakitNotify('error', `历史记录删除失败: ${e}`)
            })
            .finally(() => {
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
                if(["Request","Response"].includes(j)){
                    return new Buffer(v[j]).toString("utf8")
                }
                if(j === "UpdatedAt"){
                    return formatTimestamp(v[j])
                }
                return v[j]
            })
        )
    }

    // 数据导出
    const initExcelData = (resolve,newExportData: HTTPFlow[],rsp) => {
        let exportData: any = []
        const header: string[] = []
        const filterVal: string[] = []
        exportTitle.map((item)=>{
            if(item==="请求包"){
                header.push(item)
                filterVal.push("Request")
            }
            else if(item==="响应包"){
                header.push(item)
                filterVal.push("Response")
            }
            else{
                const itemData = columns.filter((itemIn)=>itemIn.title===item)[0]
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

    const getExcelData = useMemoizedFn((pagination,list:HTTPFlow[]) => {
        return new Promise((resolve) => {
        const l = data.length
            const query = {
                ...params,
                Tags: params.Tags,
                Pagination: {...pagination},
                OffsetId:
                    pagination.Page == 1
                        ? undefined
                        : data[l - 1] && data[l - 1].Id && (Math.ceil(data[l - 1].Id) as number),
                AfterBodyLength: params.AfterBodyLength
                    ? onConvertBodySizeByUnit(params.AfterBodyLength, getBodyLengthUnit())
                    : undefined,
                BeforeBodyLength: params.BeforeBodyLength
                    ? onConvertBodySizeByUnit(params.BeforeBodyLength, getBodyLengthUnit())
                    : undefined,
                Full: true
            }

            if (checkBodyLength && !query.AfterBodyLength) {
                query.AfterBodyLength = 1
            }
            if (isAllSelect) {
                ipcRenderer
                .invoke("QueryHTTPFlows", query)
                .then((rsp: YakQueryHTTPFlowResponse) => {
                    const newData: HTTPFlow[] = getClassNameData(rsp?.Data || [])
                    initExcelData(resolve,newData,rsp)
                })
                .catch((e: any) => {
                    yakitNotify("error", `query HTTP Flow failed: ${e}`)
                })
                .finally(() => setTimeout(() => setLoading(false), 100))
            }
            else{
                const Ids:number[] = list.map((item)=>parseInt(item.Id+""))
                ipcRenderer
                .invoke("GetHTTPFlowByIds", {Ids})
                .then((rsp: {Data:HTTPFlow[]}) => {
                    initExcelData(resolve,rsp.Data,{
                        Data:rsp.Data,
                        Total:rsp.Data.length,
                        Pagination:{
                            Limit: "100000",
                            Order: "",
                            OrderBy: "",
                            Page: "1"
                        }
                    })
                })
            }
            
            })
    })
    const menuData = [
        {
            key: "发送到 Web Fuzzer",
            label: "发送到 Web Fuzzer",
            number: 10,
            onClickSingle: (v) => onSendToTab(v),
            onClickBatch: (_, number) => onBatch(onSendToTab, number, selectedRowKeys.length === total)
        },
        {
            key: "数据包扫描",
            label: "数据包扫描",
            number: 10,
            onClickSingle: () => {},
            onClickBatch: () => {},
            children: GetPacketScanByCursorMenuItem(selected?.Id || 0)?.subMenuItems?.map((ele) => ({
                key: ele.title,
                label: ele.title
            }))
        },
        {
            key: "复制 URL",
            label: "复制 URL",
            number: 30,
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
            onClickSingle: (v) => {
                ipcRenderer.invoke("GetResponseBodyByHTTPFlowID", {Id: v.Id}).then((bytes: {Raw: Uint8Array}) => {
                    saveABSFileToOpen(`response-body.txt`, bytes.Raw)
                })
            }
        },
        {
            key: "浏览器中打开",
            label: "浏览器中打开",
            onClickSingle: (v) => {
                showResponseViaHTTPFlowID(v)
            }
        },
        {
            key: "复制为 CSRF Poc",
            label: "复制为 CSRF Poc",
            onClickSingle: (v) => {
                const flow = v as HTTPFlow
                if (!flow) return
                generateCSRFPocByRequest(flow.Request, (e) => {
                    callCopyToClipboard(e)
                })
            }
        },
        {
            key: "复制为 Yak PoC 模版",
            label: "复制为 Yak PoC 模版",
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
            number: 20,
            onClickSingle: (v) => onRemoveCalloutColor(v, data, setData),
            onClickBatch: (list, n) => onRemoveCalloutColorBatch(list, n)
        },
        {
            key: "发送到对比器",
            label: "发送到对比器",
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
            onClickSingle: (v) => onShareData([v.Id], 50),
            onClickBatch: (list, n) => {
                const ids: string[] = list.map((ele) => ele.Id)
                onShareData(ids, n)
            }
        },
        {
            key: "导出数据",
            label: "导出数据",
            onClickBatch: (list, n) => {
                const titleValue = columns.filter((item)=>!["序号","操作"].includes(item.title)).map((item)=>item.title)
                const exportValue = [...titleValue,"请求包","响应包"]
                const m = showYakitModal({
                    title: "导出字段",
                    content: <ExportSelect 
                                exportValue={exportValue}
                                setExportTitle={(v:string[])=>setExportTitle(["序号",...v])}
                                exportKey="MITM-HTTP-HISTORY-EXPORT-KEY"
                                fileName="History"
                                getData={(pagination)=>getExcelData(pagination,list)}
                            />,
                    onCancel:()=>{
                        m.destroy()
                        setSelectedRowKeys([])
                        setSelectedRows([])
                    },
                    width:650,
                    footer: null
                })
            }
        }
    ]
    const onRowContextMenu = (rowData: HTTPFlow, _, event: React.MouseEvent) => {
        if (rowData) {
            setSelected(rowData)
        }
        showByRightContext(
            {
                width: 180,
                data: menuData.map((ele) => {
                    return {
                        label: ele.label,
                        key: ele.key,
                        children: ele.children || []
                    }
                }),
                // openKeys:['复制为 Yak PoC 模版',],
                onClick: ({key, keyPath}) => {
                    if (keyPath.includes("数据包扫描")) {
                        const scanItem = packetScanDefaultValue.find((e) => e.Verbose === key)
                        if (!scanItem) return
                        execPacketScan([rowData.Id], scanItem.Keyword)
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
            ExcludeInUrl: params.ExcludeInUrl
        }
        setParams(newParams)
        setIsReset(!isReset)
        setTagsQuery([])
        setContentTypeQuery('')
        setColor([])
        setCheckBodyLength(false)
        setTimeout(() => {
            update(1)
        }, 100)
    })
    /** 
     * @description 分享数据包
     * @param ids 分享数据得ids
     */
    const onShareData = useMemoizedFn((ids: string[], number: number) => {
        if (isAllSelect) {
            yakitNotify('warning', "该批量操作不支持全选")
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
            title: "导入分享数据",
            content: <ShareModal module={YakitRoute.DB_HTTPHistory} shareContent={JSON.stringify(ids)} />,
            onCancel:()=>{
                m.destroy()
                setSelectedRowKeys([])
                setSelectedRows([])
            },
            footer: null
        })
    })
    return (
        // <AutoCard bodyStyle={{padding: 0, margin: 0}} bordered={false}>
        <div ref={ref as Ref<any>} tabIndex={-1} style={{width: "100%", height: "100%", overflow: "hidden"}}>
            <ReactResizeDetector
                onResize={(width, height) => {
                    if (!width || !height) {
                        return
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
                    query={params}
                    titleHeight={38}
                    renderTitle={
                        <div className={style["http-history-table-title"]}>
                            <div
                                className={classNames(
                                    style["http-history-table-title-space-between"],
                                    style["http-history-table-row"]
                                )}
                            >
                                <div className={classNames(style["http-history-table-flex"])}>
                                    {SourceType.map((tag) => (
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
                                                    const selectTypeList = (params.SourceType?.split(",") || []).filter(
                                                        (ele) => ele !== tag.value
                                                    )
                                                    setParams({...params, SourceType: selectTypeList.join(",")})
                                                }
                                                setTimeout(() => {
                                                    update(1)
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
                                    <YakitButton type='text' onClick={() => {
                                        setDrawerFormVisible(true)
                                    }}>高级筛选</YakitButton>
                                    {isFilter&&<YakitTag color={"success"}>
                                        已配置
                                        <CheckedSvgIcon style={{marginLeft: 8}}/>
                                    </YakitTag>}
                                    <Divider type='vertical' style={{margin: "0px 8px 0px 0px", top: 1}}/>
                                    <div className={classNames(style["http-history-table-right-item"])}>
                                        {size?.width&&size?.width>1060&&<div className={style["http-history-table-right-label"]}>协议类型</div>}
                                        <YakitSelect
                                            size='small'
                                            value={params.IsWebsocket || ""}
                                            wrapperStyle={{width: 150}}
                                            onSelect={(val) => {
                                                setParams({...params, IsWebsocket: val})
                                                setTimeout(() => {
                                                    update(1)
                                                }, 50)
                                            }}
                                        >
                                            <YakitSelect.Option value=''>全部</YakitSelect.Option>
                                            <YakitSelect.Option value='http/https'>http/https</YakitSelect.Option>
                                            <YakitSelect.Option value='websocket'>websocket</YakitSelect.Option>
                                        </YakitSelect>
                                    </div>
                                    <YakitInput.Search
                                        className={style["http-history-table-right-search"]}
                                        placeholder='请输入关键词搜索'
                                        value={params.Keyword}
                                        onChange={(e) => {
                                            setParams({...params, Keyword: e.target.value})
                                        }}
                                        onSearch={(v) => {
                                            update(1)
                                        }}
                                        // 这个事件很关键哈，不要用 onChange
                                        onBlur={(e) => {
                                            if (props.onSearch) {
                                                props.onSearch(e.target.value)
                                            }
                                        }}
                                    />
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
                                    {(selectedRowKeys.length === 0 && (
                                        <YakitButton
                                            type="outline2"
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
                                                    data={menuData
                                                        .filter((f) => f.onClickBatch)
                                                        .map((m) => {
                                                            return {
                                                                key: m.key,
                                                                label: m.label,
                                                                children: m.children?.map((ele) => ({
                                                                    key: ele.key,
                                                                    label: ele.label
                                                                }))
                                                            }
                                                        })}
                                                    onClick={({key, keyPath}) => {
                                                        if (keyPath.includes("数据包扫描")) {
                                                            const currentItemScan = menuData.find(
                                                                (f) => f.onClickBatch && f.key === "数据包扫描"
                                                            )
                                                            if (!currentItemScan) return
                                                            onBatch(
                                                                (v) => execPacketScan([v.Id], key),
                                                                currentItemScan.number || 0,
                                                                selectedRowKeys.length === total
                                                            )
                                                            return
                                                        }
                                                        if (keyPath.includes("标注颜色")) {
                                                            const currentItemColor = menuData.find(
                                                                (f) => f.onClickBatch && f.key === "标注颜色"
                                                            )
                                                            const colorItem = availableColors.find(
                                                                (e) => e.title === key
                                                            )
                                                            if (!currentItemColor || !colorItem) return
                                                            CalloutColorBatch(
                                                                selectedRows,
                                                                currentItemColor?.number || 0,
                                                                colorItem
                                                            )
                                                            return
                                                        }
                                                        switch (key) {
                                                            case "删除记录":
                                                                onRemoveHttpHistory({Id: selectedRowKeys})
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
                                                                const hosts = selectedRows.map(
                                                                    (ele) => ele.HostPort?.split(":")[0]
                                                                )
                                                                onRemoveHttpHistory({
                                                                    Filter: {
                                                                        IncludeInUrl: hosts
                                                                    }
                                                                })
                                                                break
                                                            default:
                                                                const currentItem = menuData.find(
                                                                    (f) => f.onClickBatch && f.key === key
                                                                )
                                                                if (!currentItem) return
                                                                if (currentItem.onClickBatch)
                                                                    currentItem.onClickBatch(
                                                                        selectedRows,
                                                                        currentItem.number
                                                                    )
                                                                break
                                                        }
                                                        setBatchVisible(false)
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
                                    <div className={style["empty-button"]}>
                                        {!props.noDeleteAll && <YakitDropdownMenu
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
                                            <YakitButton
                                                type='outline1'
                                                colors="danger"
                                            >
                                                清空
                                            </YakitButton>
                                        </YakitDropdownMenu>}
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
                                                        update(1)
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
                                            <YakitButton type="text2" icon={<RefreshIcon />} onClick={(e) => e.stopPropagation()} />
                                        </Badge>
                                    </YakitDropdownMenu>
                                    </div>
                                </div>
                            </div>
                        </div>
                    }
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
                        onChange: update
                    }}
                    onChange={onTableChange}
                    onSetCurrentRow={onSetCurrentRow}
                    useUpAndDown={true}
                />
            </div>

            <HTTPFlowTableFormConfiguration
                responseType={contentType}
                visible={drawerFormVisible}
                setVisible={setDrawerFormVisible}
                onSave={(val) => {
                    const {filterMode,hostName,urlPath,fileSuffix,searchContentType} = val
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
        // </AutoCard>
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

interface MultipleSelectProps {
    onSelect: (values: string[], option?: FiltersItemProps | FiltersItemProps[]) => void
    value: string | string[]
    options: FiltersItemProps[]
    onSure: () => void
}

const MultipleSelect: React.FC<MultipleSelectProps> = (props) => {
    const {onSelect, value, options} = props
    const [showList, setShowList] = useState<boolean>(false)
    const containerRef = useRef(null)
    const wrapperRef = useRef(null)
    const scrollDomRef = useRef<any>(null)
    const selectRef = useRef<any>(null)
    const listRef = useRef<any>(null)
    useClickAway(() => {
        if (showList) setShowList(false)
    }, listRef)
    useEffect(() => {
        // 新版UI组件之前的过度写法
        const scrollDom = selectRef.current?.firstChild?.firstChild?.firstChild
        if (!scrollDom) return
        scrollDomRef.current = scrollDom
    }, [])
    const onHandleScroll = useMemoizedFn(() => {
        scrollDomRef.current.scrollLeft = scrollDomRef.current.scrollWidth
        // setShowList(true)
    })
    const onChangeSelect = useMemoizedFn((values: string[], option: FiltersItemProps[]) => {
        onSelect(values, option)
        // 滑动至最右边
        onHandleScroll()
        setTimeout(() => {
            onSure()
        }, 100)
    })
    // const originalList = useMemo(() => Array.from(Array(99999).keys()), [])
    const [list] = useVirtualList(options, {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: 30,
        overscan: 10
    })
    const onSelectMultiple = useMemoizedFn((selectItem: FiltersItemProps) => {
        if (value) {
            if (!Array.isArray(value)) return
            const index = value.findIndex((ele) => ele === selectItem.value)
            if (index === -1) {
                onSelect([...value, selectItem.value], selectItem)
            } else {
                value.splice(index, 1)
                onSelect(value, selectItem)
            }
        } else {
            onSelect([selectItem.value], selectItem)
        }
        setTimeout(() => {
            onHandleScroll()
        }, 100)
    })

    const onReset = useMemoizedFn(() => {
        onSelect([])
    })

    const onSure = useMemoizedFn(() => {
        if (props.onSure) props.onSure()
        setShowList(false)
    })
    return (
        <div className={style["select-search-multiple"]} ref={listRef}>
            <div className={style["select-heard"]} ref={selectRef} onClick={() => setShowList(true)}>
                <YakitSelect
                    size='small'
                    mode='tags'
                    style={{width: 150}}
                    onChange={(values, option) => onChangeSelect(values, option as FiltersItemProps[])}
                    allowClear
                    value={Array.isArray(value) ? [...value] : []}
                    dropdownStyle={{height: 0, padding: 0}}
                    options={options}
                    className='select-small'
                    onFocus={() => onHandleScroll()}
                />
            </div>
            <div
                className={classNames(style["select-search"], {
                    [style["select-search-show"]]: showList
                })}
                onMouseLeave={() => {
                    setTimeout(() => {
                        onSure()
                    }, 200)
                }}
            >
                <div ref={containerRef} className={classNames(style["select-list"])}>
                    <div ref={wrapperRef}>
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
                                        <span className={style["select-item-text"]}>{item.data.label}</span>
                                        {checked && <CheckIcon className={style["check-icon"]} />}
                                    </div>
                                )
                            })) || <div className={style["no-data"]}>暂无数据</div>}
                    </div>
                </div>
                <FooterBottom onReset={onReset} onSure={onSure} />
            </div>
        </div>
    )
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

// 发送web fuzzerconst
export const onSendToTab = (rowData) => {
    ipcRenderer.invoke("send-to-tab", {
        type: "fuzzer",
        data: {
            isHttps: rowData.IsHTTPS,
            request: new Buffer(rowData.Request).toString("utf8")
        }
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
            yakitNotify('success', `设置 HTTPFlow 颜色成功`)
            let newData: HTTPFlow[] = []
            const l = data.length
            for (let index = 0; index < l; index++) {
                const item = data[index]
                if (item.Hash === flow.Hash) {
                    item.cellClassName = i.className
                    item.Tags = `YAKIT_COLOR_${i.color.toUpperCase()}`
                }
                newData.push(item)
            }
            setData(newData)
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
