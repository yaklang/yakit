import React, {Ref, useEffect, useMemo, useRef, useState} from "react"
import {
    Button,
    Checkbox,
    Divider,
    Empty,
    Form,
    Input,
    PageHeader,
    Popconfirm,
    Popover,
    Select,
    Space,
    Tag,
    Tooltip,
    Badge,
    Menu,
    InputNumber,
    Dropdown
} from "antd"
import {YakQueryHTTPFlowRequest} from "../../utils/yakQueryHTTPFlow"
import {showByCursorMenu} from "../../utils/showByCursor"
import {showDrawer} from "../../utils/showModal"
import {PaginationSchema} from "../../pages/invoker/schema"
import {ReloadOutlined} from "@ant-design/icons"
import {InputItem, ManyMultiSelectForString, SwitchItem} from "../../utils/inputUtil"
import {HTTPFlowDetail} from "../HTTPFlowDetail"
import {failed, info, warn} from "../../utils/notification"
import "../style.css"
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
import {GetPacketScanByCursorMenuItem} from "@/pages/packetScanner/DefaultPacketScanGroup"
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
    ChromeFrameSvgIcon
} from "@/assets/newIcon"
import classNames from "classnames"
import {ColumnsTypeProps, FiltersItemProps, SortProps} from "../TableVirtualResize/TableVirtualResizeType"
import {saveABSFileToOpen} from "@/utils/openWebsite"
import {showResponseViaHTTPFlowID, showResponseViaResponseRaw} from "@/components/ShowInBrowser"
import {YakitSelect} from "../yakitUI/YakitSelect/YakitSelect"
import {YakitCheckbox} from "../yakitUI/YakitCheckbox/YakitCheckbox"

const {ipcRenderer} = window.require("electron")

const {Option} = Select
const {Search} = Input
const {CheckableTag} = Tag

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
    RawResponseBodyBody64?: string
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
    tableHeight?: number
    paginationPosition?: "topRight" | "bottomRight"
    params?: YakQueryHTTPFlowRequest
    inViewport?: boolean
    onSearch?: (i: string) => any
    title?: string
}

export const StatusCodeToColor = (code: number) => {
    if (code >= 400) {
        return "red"
    } else if (code < 400 && code >= 300) {
        return "orange"
    } else {
        return "green"
    }
}

export const DurationMsToColor = (code: number) => {
    if (code >= 600) {
        return "red"
    } else if (code < 600 && code >= 300) {
        return "orange"
    } else {
        return "green"
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
            return classNames(style["row-bg-color-red"])
        case "GREEN":
            return classNames(style["row-bg-color-green"])
        case "BLUE":
            return classNames(style["row-bg-color-blue"])
        case "YELLOW":
            return classNames(style["row-bg-color-yellow"])
        case "ORANGE":
            return classNames(style["row-bg-color-orange"])
        case "PURPLE":
            return classNames(style["row-bg-color-purple"])
        case "CYAN":
            return classNames(style["row-bg-color-cyan"])
        case "GREY":
            return classNames(style["row-bg-color-grey"])
        default:
            return ""
    }
}

const availableColors = [
    {
        color: "RED",
        title: "红色[#F4736B]",
        className: TableRowColor("RED"),
        searchWord: "YAKIT_COLOR_RED",
        render: (
            <div className={classNames(style["history-color-tag"])}>
                红色
                <div className={classNames(style["tag-color-display"], "bg-color-red-opacity")}></div>
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
                绿色
                <div className={classNames(style["tag-color-display"], "bg-color-green-opacity")}></div>
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
                蓝色
                <div className={classNames(style["tag-color-display"], "bg-color-blue-opacity")}></div>
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
                黄色
                <div className={classNames(style["tag-color-display"], "bg-color-yellow-opacity")}></div>
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
                橙色
                <div className={classNames(style["tag-color-display"], "bg-color-orange-opacity")}></div>
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
                紫色
                <div className={classNames(style["tag-color-display"], "bg-color-purple-opacity")}></div>
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
                天蓝色
                <div className={classNames(style["tag-color-display"], "bg-color-cyan-opacity")}></div>
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
                灰色
                <div className={classNames(style["tag-color-display"], "bg-color-grey-opacity")}></div>
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

interface CompateData {
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

const OFFSET_LIMIT = 50
const OFFSET_STEP = 100

interface shieldData {
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

export const HTTPFlowTable = React.memo<HTTPFlowTableProp>((props) => {
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
    const [shieldData, setShieldData, getShieldData] = useGetState<shieldData>({
        data: []
    })
    const [isRefresh, setIsRefresh] = useState<boolean>(false) // 刷新表格，滚动至0
    const [_, setBodyLengthUnit, getBodyLengthUnit] = useGetState<"B" | "k" | "M">("B")
    const [maxId, setMaxId, getMaxId] = useGetState<number>(0)
    const [tags, setTags] = useState<FiltersItemProps[]>([])
    const [statusCode, setStatusCode] = useState<FiltersItemProps[]>([])
    const [currentIndex, setCurrentIndex] = useState<number>(0)
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
    const [selectedRows, setSelectedRows] = useState<HTTPFlow[]>([])
    const [isAllSelect, setIsAllSelect] = useState<boolean>(false)
    const [offsetData, setOffsetData, getOffsetData] = useGetState<HTTPFlow[]>([])
    const [afterBodyLength, setAfterBodyLength, getAfterBodyLength] = useGetState<number>()
    const [beforeBodyLength, setBeforeBodyLength, getBeforeBodyLength] = useGetState<number>()
    const [isReset, setIsReset] = useState<boolean>(false)

    const [checkBodyLength, setCheckBodyLength] = useState<boolean>(false) // 查询BodyLength大于0

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
                        failed(`加载屏蔽参数失败: ${e}`)
                    }
                })
                .finally(() => {
                    isOneceLoading.current = false
                })
        } else {
            // 持久化存储
            setRemoteValue(HTTP_FLOW_TABLE_SHIELD_DATA, JSON.stringify(getShieldData()))
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
        getNewData()
        getHTTPFlowsFieldGroup(false)
    }, [])
    useEffect(() => {
        // 刷新
        getHTTPFlowsFieldGroup(true)
    }, [total])
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
                AfterBodyLength: params.AfterBodyLength ? getLength(params.AfterBodyLength) : undefined,
                BeforeBodyLength: params.BeforeBodyLength ? getLength(params.BeforeBodyLength) : undefined
            }

            if (checkBodyLength && !query.AfterBodyLength) {
                query.AfterBodyLength = 1
            }

            ipcRenderer
                .invoke("QueryHTTPFlows", query)
                .then((rsp: YakQueryHTTPFlowResponse) => {
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
                    failed(`query HTTP Flow failed: ${e}`)
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
                failed(`query HTTP Flow failed: ${e}`)
            })
    })
    // 获取tags等分组
    const getHTTPFlowsFieldGroup = useMemoizedFn((RefreshRequest: boolean) => {
        ipcRenderer
            .invoke("HTTPFlowsFieldGroup", {
                RefreshRequest
            })
            .then((rsp: HTTPFlowsFieldGroupResponse) => {
                const statusCode = rsp.StatusCode.map((ele) => ({value: ele.Value, total: ele.Total, label: ele.Value}))
                const tags = rsp.Tags
                setTags(tags.map((ele) => ({label: ele.Value, value: ele.Value})))
                setStatusCode([...statusCode])
            })
            .catch((e: any) => {
                failed(`query HTTP Flows Field Group failed: ${e}`)
            })
    })

    const getClassNameData = (resData: HTTPFlow[]) => {
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
    const scrollUpdateTop = useMemoizedFn(() => {
        // if (maxId <= 0) return
        const scrollTop = tableRef.current?.containerRef?.scrollTop
        if (scrollTop < 10) {
            update(1, undefined, undefined, undefined, undefined, true)
            setOffsetData([])
            return
        }
        // if (getOffsetData().length > 0) return
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
            AfterBodyLength: params.AfterBodyLength ? getLength(params.AfterBodyLength) : undefined,
            BeforeBodyLength: params.BeforeBodyLength ? getLength(params.BeforeBodyLength) : undefined,
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
                failed(`query HTTP Flow failed: ${e}`)
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
        if (props.inViewport) {
            scrollUpdateTop()
            let id = setInterval(scrollUpdateTop, 1000)
            return () => clearInterval(id)
        }
    }, [props.inViewport])

    // 保留数组中非重复数据
    const filterNonUnique = (arr) => arr.filter((i) => arr.indexOf(i) === arr.lastIndexOf(i))
    // 数组去重
    const filterItem = (arr) => arr.filter((item, index) => arr.indexOf(item) === index)

    // 取消屏蔽筛选
    const cancleFilter = (value) => {
        const newArr = filterNonUnique([...getShieldData().data, value])
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

    const onFilterSure = useMemoizedFn(() => {
        setParams({
            ...params,
            Tags: tagsQuery,
            SearchContentType: contentTypeQuery
        })
        setTimeout(() => {
            update(1)
        }, 50)
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
        } else {
            // setSelected(undefined)
        }
    })
    const onSetCurrentRow = useDebounceFn(
        (rowDate: HTTPFlow) => {
            onRowClick(rowDate)
        },
        {wait: 200}
    ).run
    const getLength = useMemoizedFn((length: number) => {
        switch (getBodyLengthUnit()) {
            case "k":
                return length * 1024
            case "M":
                return length * 1024 * 1024
            default:
                return length
        }
    })

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
                        }
                    ]
                }
            },
            {
                title: "状态码",
                dataKey: "StatusCode",
                width: 100,
                filterProps: {
                    filtersType: "select",
                    filterMultiple: true,
                    filterSearchInputProps: {
                        size: "small"
                    },
                    filterOptionRender: (item: FiltersItemProps) => (
                        <div>
                            <span>{item.value}</span>
                            <span>{item.total}</span>
                        </div>
                    ),
                    filters: statusCode
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
                    <div className={classNames(style["body-length-checkbox"], "old-theme-html")}>
                        <YakitCheckbox checked={checkBodyLength} onChange={(e) => onCheckThan0(e.target.checked)} />
                        <span className={style["tip"]}>大于0</span>
                    </div>
                ),
                filterProps: {
                    filterKey: "bodyLength",
                    filterRender: () => (
                        <div className={style["table-body-length-filter"]}>
                            <Input.Group compact size='small' className={style["input-group"]}>
                                <InputNumber
                                    className={style["input-left"]}
                                    placeholder='Minimum'
                                    min={0}
                                    value={getAfterBodyLength()}
                                    onChange={(v) => setAfterBodyLength(v as number)}
                                    size='small'
                                />
                                <Input className={style["input-split"]} placeholder='~' disabled />
                                <InputNumber
                                    className={style["input-right"]}
                                    placeholder='Maximum'
                                    min={getAfterBodyLength()}
                                    value={getBeforeBodyLength()}
                                    onChange={(v) => {
                                        setBeforeBodyLength(v as number)
                                    }}
                                    size='small'
                                />
                                <Select
                                    value={getBodyLengthUnit()}
                                    onSelect={(val) => {
                                        setBodyLengthUnit(val)
                                    }}
                                >
                                    <Option value='B'>B</Option>
                                    <Option value='k'>k</Option>
                                    <Option value='M'>M</Option>
                                </Select>
                            </Input.Group>
                            <FooterBottom
                                className={style["input-footer"]}
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
                            />
                        </div>
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
                            <a
                                onClick={(e) => {
                                    ipcRenderer
                                        .invoke("GetHTTPFlowById", {Id: rowData?.Id})
                                        .then((i: HTTPFlow) => {
                                            showResponseViaResponseRaw(i?.Response)
                                        })
                                        .catch((e: any) => {
                                            failed(`Query HTTPFlow failed: ${e}`)
                                        })
                                }}
                            >
                                <ChromeFrameSvgIcon className={style["icon-style"]} />
                            </a>
                            <div className={style['divider-style']}></div>
                            <a
                                onClick={(e) => {
                                    let m = showDrawer({
                                        width: "80%",
                                        content: onExpandHTTPFlow(rowData, () => m.destroy())
                                    })
                                }}
                            >
                                <ArrowCircleRightSvgIcon className={style["icon-style"]} />
                            </a>
                        </div>
                    )
                }
            }
        ]
    }, [statusCode, tags, checkBodyLength])

    // 发送web fuzzer
    const onSendToTab = useMemoizedFn((rowData) => {
        ipcRenderer.invoke("send-to-tab", {
            type: "fuzzer",
            data: {
                isHttps: rowData.IsHTTPS,
                request: new Buffer(rowData.Request).toString("utf8")
            }
        })
    })
    // 标注颜色
    const CalloutColor = useMemoizedFn((flow: HTTPFlow, i: any) => {
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
                // info(`设置 HTTPFlow 颜色成功`)
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
    })
    // 标注颜色批量
    const CalloutColorBatch = useMemoizedFn((flowList: HTTPFlow[], number: number, i: any) => {
        if (flowList.length === 0) {
            warn("请选择数据")
            return
        }
        if (flowList.length > number) {
            warn(`最多同时只能操作${number}条数据`)
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
            warn("请选择数据")
            return
        }
        if (flowList.length > number) {
            warn(`最多同时只能操作${number}条数据`)
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
    // 移除颜色
    const onRemoveCalloutColor = useMemoizedFn((flow: HTTPFlow) => {
        if (!flow) return
        const existedTags = flow.Tags ? flow.Tags.split("|").filter((i) => !!i && !i.startsWith("YAKIT_COLOR_")) : []
        existedTags.pop()
        ipcRenderer
            .invoke("SetTagForHTTPFlow", {
                Id: flow.Id,
                Hash: flow.Hash,
                Tags: existedTags
            })
            .then(() => {
                // info(`清除 HTTPFlow 颜色成功`)
                let newData: HTTPFlow[] = []
                const l = data.length
                for (let index = 0; index < l; index++) {
                    const item = data[index]
                    if (item.Hash === flow.Hash) {
                        item.cellClassName = ""
                        item.Tags = ""
                    }
                    newData.push(item)
                }
                setData(newData)
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
                info("删除成功")
                update()
            })
            .finally(() => setTimeout(() => setLoading(false), 100))
    })
    //删除 重置请求 ID
    const onRemoveHttpHistoryAllAndResetId = useMemoizedFn(() => {
        ipcRenderer
            .invoke("DeleteHTTPFlows", {DeleteAll: true})
            .then(() => {})
            .catch((e: any) => {
                failed(`历史记录删除失败: ${e}`)
            })
            .finally(() => update(1))
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
            })
            .catch((e: any) => {
                failed(`历史记录删除失败: ${e}`)
            })
        setLoading(true)
        info("正在删除...如自动刷新失败请手动刷新")
        setCompareLeft({content: "", language: "http"})
        setCompareRight({content: "", language: "http"})
        setCompareState(0)
        setTimeout(() => {
            update(1)
            if (props.onSelected) props.onSelected(undefined)
        }, 400)
    })
    const onBatch = useMemoizedFn((f: Function, number: number, all?: boolean) => {
        const length = selectedRows.length
        if (length <= 0) {
            warn(`请选择数据`)
            return
        }
        if (isAllSelect && !all) {
            warn("该批量操作不支持全选")
            return
        }
        if (number < length) {
            warn(`最多同时只能发送${number}条数据`)
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
    const menuData = [
        {
            title: "发送到 Web Fuzzer",
            number: 10,
            onClickSingle: (v) => onSendToTab(v),
            onClickBatch: (_, number) => onBatch(onSendToTab, number, selectedRowKeys.length === total)
        },
        {
            title: "数据包扫描",
            number: 10,
            onClickSingle: () => {}
        },
        {
            title: "复制 URL",
            number: 30,
            onClickSingle: (v) => callCopyToClipboard(v.Url),
            onClickBatch: (v, number) => {
                if (v.length === 0) {
                    warn("请选择数据")
                    return
                }
                if (v.length < number) {
                    callCopyToClipboard(v.map((ele) => `${ele.Url}`).join("\r\n"))
                    setSelectedRowKeys([])
                    setSelectedRows([])
                } else {
                    warn(`最多同时只能复制${number}条数据`)
                }
            }
        },
        {
            title: "下载 Response Body",
            onClickSingle: (v) => {
                ipcRenderer.invoke("GetResponseBodyByHTTPFlowID", {Id: v.Id}).then((bytes: {Raw: Uint8Array}) => {
                    saveABSFileToOpen(`response-body.txt`, bytes.Raw)
                })
            }
        },
        {
            title: "浏览器中打开",
            onClickSingle: (v) => {
                showResponseViaHTTPFlowID(v)
            }
        },
        {
            title: "复制为 CSRF Poc",
            onClickSingle: (v) => {
                const flow = v as HTTPFlow
                if (!flow) return
                generateCSRFPocByRequest(flow.Request, (e) => {
                    callCopyToClipboard(e)
                })
            }
        },
        {
            title: "复制为 Yak PoC 模版",
            onClickSingle: () => {},
            subMenuItems: [
                {
                    title: "数据包 PoC 模版",
                    onClick: (v) => {
                        const flow = v as HTTPFlow
                        if (!flow) return
                        generateYakCodeByRequest(
                            flow.IsHTTPS,
                            flow.Request,
                            (code) => {
                                callCopyToClipboard(code)
                            },
                            RequestToYakCodeTemplate.Ordinary
                        )
                    }
                },
                {
                    title: "批量检测 PoC 模版",
                    onClick: (v) => {
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
                    }
                }
            ]
        },
        {
            title: "标注颜色",
            number: 20,
            onClickSingle: () => {},
            onClickBatch: () => {},
            subMenuItems: availableColors.map((i) => {
                return {
                    title: i.title,
                    render: i.render,
                    onClick: (v) => CalloutColor(v, i),
                    onClickBatch: (list, n) => CalloutColorBatch(list, n, i)
                }
            })
        },
        {
            title: "移除颜色",
            number: 20,
            onClickSingle: (v) => onRemoveCalloutColor(v),
            onClickBatch: (list, n) => onRemoveCalloutColorBatch(list, n)
        },
        {
            title: "发送到对比器",
            onClickSingle: () => {},
            subMenuItems: [
                {
                    title: "发送到对比器左侧",
                    onClick: (v) => {
                        setCompareLeft({
                            content: new Buffer(v.Request).toString("utf8"),
                            language: "http"
                        })
                    },
                    disabled: [false, true, false][compareState]
                },
                {
                    title: "发送到对比器右侧",
                    onClick: (v) => {
                        setCompareRight({
                            content: new Buffer(v.Request).toString("utf8"),
                            language: "http"
                        })
                    },
                    disabled: [false, false, true][compareState]
                }
            ]
        },
        {
            title: "屏蔽",
            onClickSingle: () => {},
            subMenuItems: [
                {
                    title: "屏蔽该记录",
                    onClick: (v) => {
                        if (!(v && v.Id)) return
                        const id = Math.ceil(v.Id)
                        const newArr = filterItem([...shieldData.data, id])
                        const newObj = {...shieldData, data: newArr}
                        setShieldData(newObj)
                    }
                },
                {
                    title: "屏蔽URL",
                    onClick: (v) => {
                        let Url = v?.Url
                        // 根据URL拿到ID数组
                        const newArr = filterItem([...shieldData.data, Url])
                        const newObj = {...shieldData, data: newArr}
                        setShieldData(newObj)
                    }
                },
                {
                    title: "屏蔽域名",
                    onClick: (v) => {
                        const host = v?.HostPort?.split(":")[0] || ""
                        // 根据host拿到对应ID数组
                        const newArr = filterItem([...shieldData.data, host])
                        const newObj = {...shieldData, data: newArr}
                        setShieldData(newObj)
                    }
                }
            ]
        },
        {
            title: "删除",
            onClickSingle: () => {},
            onClickBatch: () => {},
            all: true,
            subMenuItems: [
                {
                    title: "删除该记录",
                    titleBatch: "删除记录",
                    onClick: (v) => onRemoveHttpHistory({Id: [v.Id]}),
                    onClickBatch: (list) => {
                        onRemoveHttpHistory({Id: list.map((ele) => ele.Id)})
                    }
                },
                {
                    title: "删除URL",
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
                    title: "删除域名",
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
        }
    ]
    const onRowContextMenu = (rowData: HTTPFlow, event: React.MouseEvent) => {
        if (rowData) {
            setSelected(rowData)
        }
        showByCursorMenu(
            {
                content: menuData.map((ele) => {
                    if (ele.title === "数据包扫描") {
                        return GetPacketScanByCursorMenuItem(rowData.Id)
                    }
                    return {
                        title: ele.title,
                        onClick: () => ele.onClickSingle(rowData),
                        subMenuItems:
                            ele.subMenuItems?.map((subItem) => ({
                                title: subItem.title,
                                render: subItem.render ? subItem.render : undefined,
                                onClick: () => subItem.onClick(rowData)
                            })) || []
                    }
                })
            },
            event.clientX,
            event.clientY
        )
    }

    return (
        // <AutoCard bodyStyle={{padding: 0, margin: 0}} bordered={false}>
        <div
            className='http-flow-table'
            ref={ref as Ref<any>}
            tabIndex={-1}
            style={{width: "100%", height: "100%", overflow: "hidden"}}
        >
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
            {!props.noHeader && (
                <PageHeader
                    title={props?.title ? props.title : "HTTP History"}
                    subTitle={
                        <Space>
                            {"所有相关请求都在这里"}
                            <Button
                                icon={<ReloadOutlined />}
                                type={"link"}
                                onClick={(e) => {
                                    update(1)
                                }}
                            />
                        </Space>
                    }
                    extra={[
                        <Space>
                            <Form.Item label={"选择 HTTP History 类型"} style={{marginBottom: 0}}>
                                <Select
                                    mode={"multiple"}
                                    value={params.SourceType}
                                    style={{minWidth: 200}}
                                    onChange={(e) => {
                                        setParams({...params, SourceType: e})
                                        setLoading(true)
                                        setTimeout(() => {
                                            update(1, undefined, undefined, undefined, e)
                                        }, 200)
                                    }}
                                >
                                    <Select.Option value={"mitm"}>mitm: 中间人劫持</Select.Option>
                                    <Select.Option value={"fuzzer"}>fuzzer: 模糊测试分析</Select.Option>
                                </Select>
                            </Form.Item>
                            <Popconfirm
                                title={"确定想要删除记录吗？不可恢复"}
                                onConfirm={(e) => {
                                    ipcRenderer.invoke("delete-http-flows-all")
                                    setLoading(true)
                                    info("正在删除...如自动刷新失败请手动刷新")
                                    setTimeout(() => {
                                        update(1)
                                        if (props.onSelected) props.onSelected(undefined)
                                    }, 400)
                                }}
                            >
                                <Button danger={true}>清除全部历史记录？</Button>
                            </Popconfirm>
                        </Space>
                    ]}
                />
            )}
            <div className={classNames(style["table-virtual-resize"],'old-theme-html')}>
                <TableVirtualResize<HTTPFlow>
                    ref={tableRef}
                    currentIndex={currentIndex}
                    query={params}
                    titleHeight={85}
                    renderTitle={
                        <div className={style["http-history-table-title"]}>
                            <div className={style["http-history-table-title-space-between"]}>
                                <div
                                    className={classNames(
                                        style["http-history-table-flex"],
                                        style["http-history-table-check-tag"]
                                    )}
                                >
                                    <div className={style["http-history-table-text"]}>HTTP History</div>
                                    {SourceType.map((tag) => (
                                        <CheckableTag
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
                                        </CheckableTag>
                                    ))}
                                </div>
                                <div className={style["http-history-table-flex"]}>
                                    <Search
                                        size='small'
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
                                    <Divider type='vertical' />
                                    <div className={style["empty-button"]}>
                                        <Dropdown
                                            overlay={
                                                <Menu>
                                                    <Menu.Item onClick={() => onRemoveHttpHistoryAllAndResetId()}>
                                                        重置请求 ID
                                                    </Menu.Item>
                                                    <Menu.Item onClick={() => onRemoveHttpHistoryAll()}>
                                                        不重置请求 ID
                                                    </Menu.Item>
                                                </Menu>
                                            }
                                            trigger={["click"]}
                                            placement='bottom'
                                            overlayClassName={style["drop-down"]}
                                        >
                                            <Button danger ghost size='small'>
                                                清空
                                            </Button>
                                        </Dropdown>
                                    </div>
                                    <Badge
                                        dot={offsetData.length > 0}
                                        offset={[1, 2]}
                                        className={style["http-history-table-badge"]}
                                    >
                                        <div
                                            onClick={() => {
                                                sortRef.current = defSort
                                                const newParams: YakQueryHTTPFlowRequest = {
                                                    ...(props.params || {SourceType: "mitm"}),
                                                    SourceType: props.params?.SourceType || "mitm",
                                                    ExcludeId: params.ExcludeId,
                                                    ExcludeInUrl: params.ExcludeInUrl
                                                }
                                                setParams(newParams)
                                                setIsReset(!isReset)
                                                setTimeout(() => {
                                                    update(1)
                                                }, 100)
                                            }}
                                        >
                                            <RefreshIcon style={{color: "#85899E", cursor: "pointer"}} />
                                        </div>
                                    </Badge>
                                </div>
                            </div>
                            <div className={style["http-history-table-line"]} />
                            <div
                                className={classNames(
                                    style["http-history-table-title-space-between"],
                                    style["http-history-table-row"]
                                )}
                            >
                                <div className={style["http-history-table-flex"]}>
                                    {shieldData?.data.length > 0 && (
                                        <Popover
                                            placement='bottom'
                                            trigger='hover'
                                            content={
                                                <div className={style["title-header"]}>
                                                    {shieldData?.data.map((item: number | string) => (
                                                        <div className={style["title-selected-tag"]} key={item}>
                                                            <Tooltip title={item}>
                                                                <div className={classNames(style["tag-name-style"])}>
                                                                    {item}
                                                                </div>
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
                                                <span className={style["http-history-table-left-number"]}>
                                                    {shieldData?.data.length}
                                                </span>
                                                <StatusOfflineIcon
                                                    className={style["http-history-table-left-shield-icon"]}
                                                />
                                            </div>
                                        </Popover>
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
                                    <div
                                        className={classNames(style["http-history-table-right-item"], "old-theme-html")}
                                    >
                                        <div className={style["http-history-table-right-label"]}>协议类型</div>
                                        <YakitSelect
                                            size='small'
                                            value={params.IsWebsocket||''}
                                            dropdownClassName='old-theme-html'
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
                                    <div className={style["http-history-table-right-filter-small"]}>
                                        <Popover
                                            overlayClassName={style["http-history-table-right-filter-popover"]}
                                            content={
                                                <TableFilter
                                                    isVertical={true}
                                                    tags={tags}
                                                    setTags={(t) => {
                                                        setTagsQuery(t)
                                                    }}
                                                    setContentType={(t) => {
                                                        setContentTypeQuery(t.join(","))
                                                    }}
                                                    tagsValue={tagsQuery}
                                                    contentTypeValue={
                                                        contentTypeQuery ? contentTypeQuery?.split(",") : []
                                                    }
                                                    onSure={() => onFilterSure()}
                                                />
                                            }
                                            trigger='click'
                                            placement='bottomLeft'
                                        >
                                            <div
                                                className={classNames(style["filter-small-icon"], {
                                                    [style["filter-small-icon-active"]]:
                                                        tags.length > 0 || contentTypeQuery
                                                })}
                                            >
                                                <Button size='small' icon={<FilterIcon />}></Button>
                                            </div>
                                        </Popover>
                                    </div>
                                    <TableFilter
                                        tags={tags}
                                        contentTypeValue={contentTypeQuery ? contentTypeQuery?.split(",") : []}
                                        tagsValue={tagsQuery}
                                        setTags={(t) => {
                                            setTagsQuery(t)
                                        }}
                                        setContentType={(t) => {
                                            setContentTypeQuery(t.join(","))
                                        }}
                                        onSure={() => {
                                            setParams({
                                                ...params,
                                                Tags: tagsQuery,
                                                SearchContentType: contentTypeQuery
                                            })
                                            setTimeout(() => {
                                                update(1)
                                            }, 50)
                                        }}
                                    />
                                    <div className={style["http-history-table-color-swatch"]}>
                                        <Popover
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
                                            <div
                                                className={classNames(style["color-swatch-icon"], {
                                                    [style["color-swatch-icon-active"]]: color.length > 0
                                                })}
                                            >
                                                <Button
                                                    size='small'
                                                    icon={<ColorSwatchIcon />}
                                                    onClick={() => setIsShowColor(true)}
                                                ></Button>
                                            </div>
                                        </Popover>
                                    </div>
                                    {(selectedRowKeys.length === 0 && (
                                        <Button
                                            size='small'
                                            disabled={selectedRowKeys.length === 0}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                            }}
                                        >
                                            批量操作
                                            <ChevronDownIcon style={{color: "#85899E"}} />
                                        </Button>
                                    )) || (
                                        <Popover
                                            overlayClassName={style["http-history-table-drop-down-popover"]}
                                            content={
                                                <Menu
                                                    className={style["http-history-table-drop-down-batch"]}
                                                    // selectedKeys={["删除"]}
                                                    // openKeys={["删除"]}
                                                >
                                                    {menuData.map((m) => {
                                                        if (m.title === "数据包扫描") {
                                                            const dataPacket = GetPacketScanByCursorMenuItem(0)
                                                            return (
                                                                <Menu.SubMenu
                                                                    popupClassName={
                                                                        style["http-history-table-sub-menu"]
                                                                    }
                                                                    title={dataPacket.title}
                                                                    key={m.title}
                                                                >
                                                                    {dataPacket.subMenuItems?.map((ele) => (
                                                                        <Menu.Item
                                                                            onClick={() =>
                                                                                onBatch(
                                                                                    (v) =>
                                                                                        execPacketScan([v.Id], ele.id),
                                                                                    m.number || 0,
                                                                                    selectedRowKeys.length === total
                                                                                )
                                                                            }
                                                                            key={ele.title}
                                                                        >
                                                                            {ele.title}
                                                                        </Menu.Item>
                                                                    ))}
                                                                </Menu.SubMenu>
                                                            )
                                                        }
                                                        if (m.subMenuItems && m.onClickBatch) {
                                                            return (
                                                                <Menu.SubMenu
                                                                    title={m.title}
                                                                    key={m.title}
                                                                    popupClassName={
                                                                        style["http-history-table-sub-menu"]
                                                                    }
                                                                >
                                                                    {m.subMenuItems?.map((ele) => (
                                                                        <Menu.Item
                                                                            onClick={() => {
                                                                                if (ele.onClickBatch) {
                                                                                    ele.onClickBatch(
                                                                                        selectedRows,
                                                                                        m.number || 0
                                                                                    )
                                                                                } else {
                                                                                    onBatch(
                                                                                        ele.onClick,
                                                                                        m.number || 0,
                                                                                        selectedRowKeys.length === total
                                                                                    )
                                                                                }
                                                                            }}
                                                                            key={ele.titleBatch || ele.title}
                                                                        >
                                                                            {ele.render
                                                                                ? ele.render
                                                                                : ele.titleBatch || ele.title}
                                                                        </Menu.Item>
                                                                    ))}
                                                                </Menu.SubMenu>
                                                            )
                                                        }
                                                        return (
                                                            m.onClickBatch && (
                                                                <Menu.Item
                                                                    onClick={() => {
                                                                        if (m.onClickBatch)
                                                                            m.onClickBatch(selectedRows, m.number)
                                                                    }}
                                                                    key={m.title}
                                                                >
                                                                    {m.title}
                                                                </Menu.Item>
                                                            )
                                                        )
                                                    })}
                                                </Menu>
                                            }
                                            trigger='click'
                                            placement='bottomLeft'
                                        >
                                            <Button
                                                size='small'
                                                disabled={selectedRowKeys.length === 0}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                }}
                                            >
                                                批量操作
                                                <ChevronDownIcon style={{color: "#85899E"}} />
                                            </Button>
                                        </Popover>
                                    )}
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
                    onRowClick={onRowClick}
                    onRowContextMenu={onRowContextMenu}
                    pagination={{
                        page: pagination.Page,
                        limit: pagination.Limit,
                        total,
                        onChange: update
                    }}
                    onChange={onTableChange}
                    onSetCurrentRow={onSetCurrentRow}
                />
            </div>
        </div>
        // </AutoCard>
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
        <div>
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
                        <Checkbox checked={checked} />
                        {ele.render}
                    </div>
                )
            })}
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

interface TableFilterProps {
    isVertical?: boolean
    tags: FiltersItemProps[]
    contentTypeValue: string[]
    tagsValue: string[]
    setTags: (v: string[]) => void
    setContentType: (v: string[]) => void
    onSure: () => void
}

const TableFilter: React.FC<TableFilterProps> = (props) => {
    const {isVertical, tags, tagsValue, setTags, contentTypeValue, setContentType, onSure} = props
    const onSelect = useMemoizedFn((values: string[]) => {
        setTags([...values])
    })
    const onSelectType = useMemoizedFn((values: string[]) => {
        setContentType([...values])
    })
    return (
        <div className={classNames(style["http-history-table-right-filter-large"])}>
            <div
                className={classNames(style["http-history-table-right-filter-item"], {
                    [style["http-history-table-filter-vertical"]]: isVertical
                })}
            >
                <span className={style["http-history-table-right-label"]}>响应类型</span>
                <MultipleSelect
                    options={contentType}
                    value={contentTypeValue}
                    onSelect={onSelectType}
                    onSure={onSure}
                />
            </div>
            <div
                className={classNames(style["http-history-table-right-filter-item"], {
                    [style["http-history-table-filter-vertical"]]: isVertical
                })}
            >
                <span className={style["http-history-table-right-label"]}>Tags</span>
                <MultipleSelect options={tags} value={tagsValue} onSelect={onSelect} onSure={onSure} />
            </div>
        </div>
    )
}

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
        itemHeight: 34,
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
                <Select
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
                                        <Checkbox checked={checked} />
                                        <span className={style["select-item-text"]}>{item.data.label}</span>
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
