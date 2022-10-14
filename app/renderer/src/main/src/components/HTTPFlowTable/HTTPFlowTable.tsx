import React, {ReactNode, Ref, useEffect, useMemo, useRef, useState} from "react"
import {
    Button,
    Checkbox,
    Col,
    Divider,
    Empty,
    Form,
    Input,
    PageHeader,
    Popconfirm,
    Popover,
    Row,
    Select,
    Space,
    Switch,
    Tag,
    Tooltip,
    Badge
} from "antd"
import {YakQueryHTTPFlowRequest} from "../../utils/yakQueryHTTPFlow"
import {showByCursorMenu} from "../../utils/showByCursor"
import {showDrawer} from "../../utils/showModal"
import {PaginationSchema} from "../../pages/invoker/schema"
import {CheckOutlined, ReloadOutlined, SearchOutlined} from "@ant-design/icons"
import {InputItem, ManyMultiSelectForString, SwitchItem} from "../../utils/inputUtil"
import {HTTPFlowDetail} from "../HTTPFlowDetail"
import {failed, info, success} from "../../utils/notification"
import "../style.css"
import style from "./HTTPFlowTable.module.scss"
import {TableResizableColumn} from "../TableResizableColumn"
import {formatTime, formatTimestamp} from "../../utils/timeUtil"
import {useHotkeys} from "react-hotkeys-hook"
import {useCreation, useDebounceEffect, useDebounceFn, useGetState, useMemoizedFn, useThrottleFn} from "ahooks"
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
import {TableVirtualResize} from "../TableVirtualResize/TableVirtualResize"
import {CheckCircleIcon, FilterIcon, RefreshIcon, RemoveIcon, SearchIcon, StatusOfflineIcon} from "@/assets/newIcon"
import classNames from "classnames"
import {ColumnsTypeProps, SortProps} from "../TableVirtualResize/TableVirtualResizeType"

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
        title: "红色[#fcf1f0]",
        className: TableRowColor("RED"),
        render: (
            <div className={classNames(style["history-color-tag"])}>
                红色
                <div className={classNames(style["tag-color-display"], style["row-bg-color-red"])}></div>
            </div>
        )
    },
    {
        color: "GREEN",
        title: "绿色[#f0f9f4]",
        className: TableRowColor("GREEN"),
        render: (
            <div className={classNames(style["history-color-tag"])}>
                绿色
                <div className={classNames(style["tag-color-display"], style["row-bg-color-green"])}></div>
            </div>
        )
    },
    {
        color: "BLUE",
        title: "蓝色[#eff4fe]",
        className: TableRowColor("BLUE"),
        render: (
            <div className={classNames(style["history-color-tag"])}>
                蓝色
                <div className={classNames(style["tag-color-display"], style["row-bg-color-blue"])}></div>
            </div>
        )
    },
    {
        color: "YELLOW",
        title: "黄色[#fef8ef]",
        className: TableRowColor("YELLOW"),
        render: (
            <div className={classNames(style["history-color-tag"])}>
                黄色
                <div className={classNames(style["tag-color-display"], style["row-bg-color-yellow"])}></div>
            </div>
        )
    },
    {
        color: "ORANGE",
        title: "橙色[#f7f8fa]",
        className: TableRowColor("ORANGE"),
        render: (
            <div className={classNames(style["history-color-tag"])}>
                橙色
                <div className={classNames(style["tag-color-display"], style["row-bg-color-orange"])}></div>
            </div>
        )
    },
    {
        color: "PURPLE",
        title: "紫色[#f3effe]",
        className: TableRowColor("PURPLE"),
        render: (
            <div className={classNames(style["history-color-tag"])}>
                紫色
                <div className={classNames(style["tag-color-display"], style["row-bg-color-purple"])}></div>
            </div>
        )
    },
    {
        color: "CYAN",
        title: "天蓝色[#B5F5EC]",
        className: TableRowColor("CYAN"),
        render: (
            <div className={classNames(style["history-color-tag"])}>
                天蓝色
                <div className={classNames(style["tag-color-display"], style["row-bg-color-cyan"])}></div>
            </div>
        )
    },
    {
        color: "GREY",
        title: "灰色[#D9D9D9]",
        className: TableRowColor("GREY"),
        render: (
            <div className={classNames(style["history-color-tag"])}>
                灰色
                <div className={classNames(style["tag-color-display"], style["row-bg-color-grey"])}></div>
            </div>
        )
    }
]

export interface YakQueryHTTPFlowResponse {
    Data: HTTPFlow[]
    Total: number
    Pagination: PaginationSchema
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

const OFFSET_LIMIT = 30
const OFFSET_STEP = 20
const ROW_HEIGHT = 42
const MAX_ROW_COUNT = Math.abs(OFFSET_LIMIT * 2)

interface shieldData {
    data: (string | number)[]
}

export const HTTPFlowTable: React.FC<HTTPFlowTableProp> = (props) => {
    const [data, setData, getData] = useGetState<HTTPFlow[]>([])
    const [params, setParams] = useState<YakQueryHTTPFlowRequest>(props.params || {SourceType: "mitm"})
    const [pagination, setPagination] = useState<PaginationSchema>({
        Limit: OFFSET_LIMIT,
        Order: "desc",
        OrderBy: "created_at",
        Page: 1
    })

    // const [autoReload, setAutoReload, getAutoReload] = useGetState(false);
    const autoReloadRef = useRef<boolean>(false)
    const isOneceLoading = useRef<boolean>(true)
    const autoReload = autoReloadRef.current
    const setAutoReload = (b: boolean) => {
        autoReloadRef.current = b
    }
    const getAutoReload = () => autoReloadRef.current

    const [total, setTotal] = useState<number>(0)
    const [loading, setLoading] = useState(false)
    const [selected, setSelected, getSelected] = useGetState<HTTPFlow>()
    const [_lastSelected, setLastSelected, getLastSelected] = useGetState<HTTPFlow>()

    const [compareLeft, setCompareLeft] = useState<CompateData>({content: "", language: "http"})
    const [compareRight, setCompareRight] = useState<CompateData>({content: "", language: "http"})
    const [compareState, setCompareState] = useState(0)
    const [tableContentHeight, setTableContentHeight, getTableContentHeight] = useGetState<number>(0)
    // 用于记录适合
    const [_scrollY, setScrollYRaw, getScrollY] = useGetState(0)
    const setScrollY = useThrottleFn(setScrollYRaw, {wait: 300}).run
    // 如果这个大于等于 0 ，就 Lock 住，否则忽略
    const [_trigger, setLockedScroll, getLockedScroll] = useGetState(-1)
    const lockScrollTimeout = (size: number, timeout: number) => {
        setLockedScroll(size)
        setTimeout(() => setLockedScroll(-1), timeout)
    }
    // 屏蔽数据
    const [shieldData, setShieldData, getShieldData] = useGetState<shieldData>({
        data: []
    })

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

    // 使用上下箭头
    useHotkeys("up", () => {
        setLastSelected(getSelected())
        const data = getData()
        const dataLength = data.length
        if (dataLength <= 0) {
            return
        }
        if (!getSelected()) {
            setSelected(data[0])
            return
        }
        // const expected = parseInt(`${parseInt(`${getSelected()?.Id as number}`) + 1}`)
        // // 如果上点的话，应该是选择更新的内容
        // for (let i = 0; i < data.length; i++) {
        //     let current = parseInt(`${data[i]?.Id}`)
        //     if (current === expected) {
        //         setSelected(data[i])
        //         return
        //     }
        // }
        // 如果上点的话，应该是选择更新的内容
        for (let i = 0; i < dataLength; i++) {
            if (data[i]?.Id === getSelected()?.Id) {
                if (i === 0) {
                    setSelected(data[i])
                    return
                } else {
                    setSelected(data[i - 1])
                    return
                }
            }
        }
        setSelected(undefined)
    })
    useHotkeys("down", () => {
        setLastSelected(getSelected())
        const data = getData()
        const dataLength = data.length

        if (dataLength <= 0) {
            return
        }
        if (!getSelected()) {
            setSelected(data[0])
            return
        }
        // 如果上点的话，应该是选择更新的内容
        // for (let i = 0; i < data.length; i++) {
        //     if (data[i]?.Id == (getSelected()?.Id as number) - 1) {
        //         setSelected(data[i])
        //         return
        //     }
        // }

        for (let i = 0; i < dataLength; i++) {
            if (data[i]?.Id === getSelected()?.Id) {
                if (i === dataLength - 1) {
                    setSelected(data[i])
                    return
                } else {
                    setSelected(data[i + 1])
                    return
                }
            }
        }

        setSelected(undefined)
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
                    try {
                        const cacheData = JSON.parse(data)
                        setShieldData({
                            data: cacheData?.data || []
                        })
                    } catch (e) {
                        update(1)
                        failed("加载屏蔽参数失败")
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
            // console.log("清空缓存")
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

    const sortRef = useRef<SortProps>({
        order: "desc",
        orderBy: "Id"
    })

    const onTableChange = useMemoizedFn((page: number, limit: number, sort: SortProps, filter: any) => {
        if (sort.order === "none") {
            sort.order = "desc"
        }
        setParams({
            ...params,
            ...filter
        })

        sortRef.current = sort
        setTimeout(() => {
            update(page, limit, sort.order, sort.orderBy)
        }, 100)
    })

    const update = useMemoizedFn(
        (page?: number, limit?: number, order?: string, orderBy?: string, sourceType?: string, noLoading?: boolean) => {
            const paginationProps = {
                Page: page || 1,
                Limit: limit || pagination.Limit,
                // Order: order || "desc",
                // OrderBy: orderBy || "id"
                Order: sortRef.current.order,
                OrderBy: sortRef.current.orderBy
            }
            if (!noLoading) {
                setLoading(true)
                // setAutoReload(false)
            }
            // yakQueryHTTPFlow({
            //     SourceType: sourceType, ...params,
            //     Pagination: {...paginationProps},
            // })

            console.log("paginationProps", {
                SourceType: sourceType,
                ...params,
                Pagination: {...paginationProps}
            })
            ipcRenderer
                .invoke("QueryHTTPFlows", {
                    SourceType: sourceType,
                    ...params,
                    Pagination: {...paginationProps}
                })
                .then((rsp: YakQueryHTTPFlowResponse) => {
                    let newData = rsp?.Data || []
                    if (newData.length > 0) {
                        newData = newData.map((item) => {
                            let className = ""
                            if (item.Tags && item.Tags.indexOf("YAKIT_COLOR") > -1) {
                                const colors = item.Tags.split("|")
                                className =
                                    (colors.length > 0 &&
                                        TableRowColor(colors?.pop()?.split("_")?.pop()?.toUpperCase() || "")) ||
                                    ""
                            }
                            const newItem = {
                                ...item,
                                cellClassName: className
                            }
                            return newItem
                        })
                    }
                    // console.log(
                    //     "rsp?.Data",
                    //     rsp?.Data.map((ele) => ele.Id)
                    // )

                    setData(paginationProps.Page == 1 ? newData : data.concat(newData))
                    setPagination(rsp.Pagination)
                    setTotal(rsp.Total)
                })
                .catch((e: any) => {
                    failed(`query HTTP Flow failed: ${e}`)
                })
                .finally(() => setTimeout(() => setLoading(false), 300))
        }
    )

    const getNewestId = useMemoizedFn(() => {
        let max = 0
        ;(getData() || []).forEach((e) => {
            const id = parseInt(`${e.Id}`)
            if (id >= max) {
                max = id
            }
        })
        return max
    })

    const getOldestId = useMemoizedFn(() => {
        if (getData().length <= 0) {
            return 0
        }
        let min = parseInt(`${getData()[0].Id}`)
        ;(getData() || []).forEach((e) => {
            const id = parseInt(`${e.Id}`)
            if (id <= min) {
                min = id
            }
        })
        return min
    })

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
    const scrollTableTo = useMemoizedFn((index: number) => {
        if (!tableRef || !tableRef.current) return
        // const table = tableRef.current as unknown as {
        //     scrollTop: (number) => any
        //     scrollLeft: (number) => any
        // }
        // table.scrollTop(size)
        tableRef.current.scrollTo(index)
    })

    const [isHaveIncrement, setIsHaveIncrement] = useState<boolean>(false)
    const [maxId, setMaxId] = useState<number>(0)
    useEffect(() => {
        getNewData()
    }, [])
    const getNewData = useMemoizedFn(() => {
        ipcRenderer
            .invoke("QueryHTTPFlows", {
                SourceType: "mitm",
                ...params,
                Pagination: {Page: 1, Limit: 1, Order: "desc", OrderBy: "id"}
            })
            .then((rsp: YakQueryHTTPFlowResponse) => {
                console.log("rsp", rsp)
                if (rsp.Data.length > 0) {
                    setMaxId(rsp.Data[0].Id)
                }
            })
            .catch((e: any) => {
                failed(`query HTTP Flow failed: ${e}`)
            })
    })
    const scrollUpdateTop = useDebounceFn(
        useMemoizedFn(() => {
            const paginationProps = {
                Page: 1,
                Limit: OFFSET_STEP,
                // Order: "asc",
                // OrderBy: "id"
                Order: sortRef.current.order,
                OrderBy: sortRef.current.orderBy
            }
            // let offsetId = getNewestId()

            // 查询数据
            ipcRenderer
                .invoke("QueryHTTPFlows", {
                    SourceType: "mitm",
                    ...params,
                    AfterId: maxId, // 用于计算增量的
                    Pagination: {...paginationProps}
                })
                .then((rsp: YakQueryHTTPFlowResponse) => {
                    const offsetDeltaData = rsp?.Data || []
                    // console.log('offsetDeltaData',offsetDeltaData);
                    if (offsetDeltaData.length <= 0) {
                        setIsHaveIncrement(false)
                        // 没有增量数据
                        return
                    }

                    if (sortRef.current.order === "desc" && sortRef.current.orderBy === "Id") {
                        setMaxId(offsetDeltaData[0].Id)
                        setLoading(true)
                        let offsetData = offsetDeltaData.concat(data)
                        if (offsetData.length > MAX_ROW_COUNT) {
                            offsetData = offsetData.splice(0, MAX_ROW_COUNT)
                        }
                        setData(offsetData)
                        // scrollTableTo(0)
                    } else {
                        setIsHaveIncrement(true)
                    }
                })
                .catch((e: any) => {
                    failed(`query HTTP Flow failed: ${e}`)
                })
                .finally(() => setTimeout(() => setLoading(false), 200))
        }),
        {wait: 600, leading: true, trailing: false}
    ).run

    // 这是用来设置选中坐标的，不需要做防抖
    useEffect(() => {
        if (!getLastSelected() || !getSelected()) {
            return
        }

        const lastSelected = getLastSelected() as HTTPFlow
        const up = parseInt(`${lastSelected?.Id}`) < parseInt(`${selected?.Id}`)
        // if (up) {
        //     console.info("up")
        // } else {
        //     console.info("down")
        // }
        // console.info(lastSelected.Id, selected?.Id)
        const screenRowCount = Math.floor(getTableContentHeight() / ROW_HEIGHT) - 1

        if (!autoReload) {
            let count = 0
            const data = getData()
            for (let i = 0; i < data.length; i++) {
                if (data[i].Id != getSelected()?.Id) {
                    count++
                } else {
                    break
                }
            }

            let minCount = count
            if (minCount < 0) {
                minCount = 0
            }
            const viewHeightMin = getScrollY() + tableContentHeight
            const viewHeightMax = getScrollY() + tableContentHeight * 2
            const minHeight = minCount * ROW_HEIGHT
            const maxHeight = minHeight + tableContentHeight
            const maxHeightBottom = minHeight + tableContentHeight + 3 * ROW_HEIGHT
            if (maxHeight < viewHeightMin) {
                // 往下滚动
                // scrollTableTo(minHeight)
                return
            }
            if (maxHeightBottom > viewHeightMax) {
                // 上滚动
                const offset = minHeight - (screenRowCount - 2) * ROW_HEIGHT
                // console.info(screenRowCount, minHeight, minHeight - (screenRowCount - 1) * ROW_HEIGHT)
                if (offset > 0) {
                    // scrollTableTo(offset)
                }
                return
            }
        }
    }, [selected])

    // 给设置做防抖
    useDebounceEffect(
        () => {
            props.onSelected && props.onSelected(selected)
        },
        [selected],
        {wait: 400, trailing: true, leading: true}
    )

    // 设置是否自动刷新
    const autoUpdateTop = getScrollY() < ROW_HEIGHT
    useEffect(() => {
        if (autoReload) {
            return
        }
        if (autoUpdateTop) {
            scrollUpdateTop()
            let id = setInterval(scrollUpdateTop, 1000)
            return () => clearInterval(id)
        }
    }, [autoUpdateTop, autoReload])

    useEffect(() => {
        if (autoReload) {
            const id = setInterval(() => {
                if (!props.inViewport) {
                    return
                }
                update(1, undefined, "desc", undefined, undefined, true)
            }, 1000)
            return () => {
                clearInterval(id)
            }
        }
    }, [autoReload, props.inViewport])

    useEffect(() => {
        if (props.inViewport) {
            // scrollTableTo(getScrollY())
        }
    }, [props.inViewport])

    const clearHistoryAction = useMemoizedFn((e: MouseEvent) => {
        showByCursorMenu(
            {
                content: [
                    {
                        title: "重置请求 ID",
                        onClick: () => {
                            ipcRenderer
                                .invoke("DeleteHTTPFlows", {DeleteAll: true})
                                .then(() => {})
                                .catch((e: any) => {
                                    failed(`历史记录删除失败: ${e}`)
                                })
                                .finally(() => update(1))
                        }
                    },
                    {
                        title: "不重置请求 ID",
                        onClick: () => {
                            const newParams = {
                                Filter: {
                                    ...params
                                },
                                DeleteAll: false
                            }
                            ipcRenderer
                                .invoke("DeleteHTTPFlows", newParams)
                                .then((i: HTTPFlow) => {
                                    setParams(props.params || {SourceType: "mitm"})
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
                        }
                    }
                ]
            },
            e.clientX,
            e.clientY
        )
    })

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

    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])

    const [isAll, setIsAll] = useState<boolean>(false)
    const [spinning, setSpinning] = useState<boolean>(false)

    const onSelectAll = (newSelectedRowKeys: string[], _, checked: boolean) => {
        setIsAll(checked)
        setSelectedRowKeys(newSelectedRowKeys)
    }
    const onSelectChange = useMemoizedFn((c: boolean, selectedRowsKey: string) => {
        if (c) {
            setSelectedRowKeys([...selectedRowKeys, selectedRowsKey])
        } else {
            const newSelectedRowKeys = selectedRowKeys.filter((ele) => ele !== selectedRowsKey)
            setSelectedRowKeys(newSelectedRowKeys)
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

    const columns: ColumnsTypeProps[] = useMemo(() => {
        return [
            {
                title: "序号",
                dataKey: "Id",
                fixed: "left",
                ellipsis: false,
                sorterProps: {
                    sorter: true
                }
            },
            {
                title: "方法",
                dataKey: "Method",
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
                sorterProps: {
                    sorterKey: "status_code",
                    sorter: true
                },
                filterProps: {
                    filtersType: "select",
                    filterMultiple: true,
                    filterSearchInputProps: {
                        size: "small"
                    },
                    filters: [
                        {
                            label: "200",
                            value: "200"
                        },
                        {
                            label: "204",
                            value: "204"
                        },
                        {
                            label: "401",
                            value: "401"
                        },
                        {
                            label: "404",
                            value: "404"
                        },
                        {
                            label: "502",
                            value: "502"
                        },
                        {
                            label: "302",
                            value: "302"
                        },
                        {
                            label: "500",
                            value: "500"
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
                sorterProps: {
                    sorterKey: "body_length",
                    sorter: true
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
                    filterKey: "HaveCommonParams",
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
                render: (text) => (
                    <div>{text > 0 ? <CheckCircleIcon className={style["check-circle-icon"]} /> : ""}</div>
                )
            },
            {
                title: "响应类型",
                dataKey: "ContentType"
            },
            {
                title: "请求时间",
                dataKey: "UpdatedAt",
                sorterProps: {
                    sorterKey: "updated_at",
                    sorter: true
                },
                render: (text) => <div title={formatTimestamp(text)}>{text === 0 ? "-" : formatTime(text)}</div>
            },
            {
                title: "请求大小",
                dataKey: "RequestSizeVerbose",
                sorterProps: {
                    sorter: true
                }
            },
            {
                title: "操作",
                dataKey: "action",
                // width: 68,
                align: "center",
                fixed: "right",
                render: (_, rowData) => {
                    if (!rowData.Hash) return <></>
                    return (
                        <a
                            onClick={(e) => {
                                let m = showDrawer({
                                    width: "80%",
                                    content: onExpandHTTPFlow(rowData, () => m.destroy())
                                })
                            }}
                        >
                            详情
                        </a>
                    )
                }
            }
        ]
    }, [])
    // console.log(
    //     "data",
    //     data.map((ele) => ele.Id)
    // )

    const [isReset, setIsReset] = useState<boolean>(false)

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
                    setTableContentHeight(height - 38)
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
            <div className="filter-box">
                  <div className="filter-box-item filter-box-item-left">
                  <Space>
                        <span>{props?.title ? props.title : "HTTP History"}</span>
                        <Button
                            icon={<ReloadOutlined />}
                            type={"link"}
                            size={"small"}
                            onClick={(e) => {
                                update(1, undefined, "desc")
                            }}
                        />
                        <Input.Search
                            placeholder={"全局搜索"}
                            enterButton={true}
                            size={"small"}
                            style={{width: 170}}
                            value={params.Keyword}
                            // 这个事件很关键哈，不要用 onChange
                            onBlur={(e) => {
                                if (props.onSearch) {
                                    props.onSearch(e.target.value)
                                }
                            }}
                            onChange={(e) => {
                                setParams({...params, Keyword: e.target.value})
                            }}
                            onSearch={(v) => {
                                // if (props.onSearch) {
                                //     props.onSearch(params.Keyword || "")
                                // }
                                update(1)
                            }}
                        />
                        {props.noHeader && (
                            <Button
                                danger={true}
                                size={"small"}
                                onClick={(e) => clearHistoryAction(e as any)}
                                onContextMenu={(e) => clearHistoryAction(e as any)}
                            >
                                清空 HTTP History
                            </Button>
                        )}
                        <Checkbox
                            checked={params.OnlyWebsocket}
                            onChange={() => {
                                setParams({...params, OnlyWebsocket: !params.OnlyWebsocket})
                            }}
                        >
                            只看 Websocket
                        </Checkbox>
                    </Space>
                  </div>
                  <div className="filter-box-item">
                    <Tag>{total} Records</Tag>
                 </div>          
            </div>
            <div className={style["table-virtual-resize"]}>
                {/* @ts-ignore */}
                <TableVirtualResize<HTTPFlow>
                    ref={tableRef}
                    title='HTTP History'
                    isReset={isReset}
                    extra={
                        <div className={style["http-history-table-extra"]}>
                            {shieldData?.data.length > 0 && (
                                <Popover
                                    placement='bottom'
                                    trigger='click'
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
                                    overlayClassName={style["shield-popover"]}
                                >
                                    <div className={style["extra-left-shield"]}>
                                        <span>已屏蔽条件</span>
                                        <span className={style["extra-left-number"]}>{shieldData?.data.length}</span>
                                        <StatusOfflineIcon className={style["extra-left-shield-icon"]} />
                                    </div>
                                </Popover>
                            )}

                            <div className={style["extra-right"]}>
                                <div className={style["extra-right-item"]}>
                                    <div className={style["extra-right-label"]}>只看 Websocket</div>
                                    <Switch size='small' defaultChecked={true} />
                                </div>
                                <div className={style["extra-right-filter-small"]}>
                                    <Button size='small' icon={<FilterIcon />}></Button>
                                </div>
                                <TableFilter style={{color: "#85899E"}} />
                                <Input
                                    size='small'
                                    className={style["extra-right-search"]}
                                    placeholder='请输入关键词搜索'
                                    prefix={<SearchIcon style={{color: "#85899E"}} />}
                                />
                                <div className={style["extra-right-search-icon"]}>
                                    <Button size='small' icon={<SearchIcon style={{color: "#85899E"}} />}></Button>
                                </div>
                                <Divider type='vertical' />
                                <div className={style["extra-right-button"]}>
                                    <Button danger ghost size='small'>
                                        删除
                                    </Button>
                                </div>
                                <Badge dot={isHaveIncrement} offset={[-5, 0]}>
                                    <div
                                        onClick={() => {
                                            sortRef.current = {
                                                order: "desc",
                                                orderBy: "Id"
                                            }
                                            setParams(props.params || {SourceType: "mitm"})
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
                    }
                    // data={autoReload ? data : [TableFirstLinePlaceholder].concat(data)}
                    renderKey='Id'
                    // data={data.filter((_,index)=>index<5)}
                    data={data}
                    rowSelection={{
                        isAll,
                        type: "checkbox",
                        selectedRowKeys,
                        onSelectAll: onSelectAll,
                        onChangeCheckboxSingle: onSelectChange
                    }}
                    loading={loading}
                    enableDrag={true}
                    columns={columns}
                    currentRowData={getSelected()}
                    onRowClick={onRowClick}
                    onRowContextMenu={(rowData: HTTPFlow, event: React.MouseEvent) => {
                        if (rowData) {
                            setSelected(rowData)
                        }
                        showByCursorMenu(
                            {
                                content: [
                                    {
                                        title: "发送到 Web Fuzzer",
                                        onClick: () => {
                                            ipcRenderer.invoke("send-to-tab", {
                                                type: "fuzzer",
                                                data: {
                                                    isHttps: rowData.IsHTTPS,
                                                    request: new Buffer(rowData.Request).toString("utf8")
                                                }
                                            })
                                        }
                                    },
                                    GetPacketScanByCursorMenuItem(rowData.Id),
                                    // {
                                    //     title: "发送到 数据包扫描",
                                    //     onClick: () => {
                                    //         ipcRenderer
                                    //             .invoke("GetHTTPFlowById", {Id: rowData.Id})
                                    //             .then((i: HTTPFlow) => {
                                    //                 ipcRenderer.invoke("send-to-packet-hack", {
                                    //                     request: i.Request,
                                    //                     ishttps: i.IsHTTPS,
                                    //                     response: i.Response
                                    //                 })
                                    //             })
                                    //             .catch((e: any) => {
                                    //                 failed(`Query Response failed: ${e}`)
                                    //             })
                                    //     }
                                    // },
                                    {
                                        title: "复制 URL",
                                        onClick: () => {
                                            callCopyToClipboard(rowData.Url)
                                        }
                                    },
                                    {
                                        title: "复制为 CSRF Poc",
                                        onClick: () => {
                                            const flow = rowData as HTTPFlow
                                            if (!flow) return
                                            generateCSRFPocByRequest(flow.Request, (e) => {
                                                callCopyToClipboard(e)
                                            })
                                        }
                                    },
                                    {
                                        title: "复制为 Yak PoC 模版",
                                        onClick: () => {},
                                        subMenuItems: [
                                            {
                                                title: "数据包 PoC 模版",
                                                onClick: () => {
                                                    const flow = rowData as HTTPFlow
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
                                                onClick: () => {
                                                    const flow = rowData as HTTPFlow
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
                                        subMenuItems: availableColors.map((i) => {
                                            return {
                                                title: i.title,
                                                render: i.render,
                                                onClick: () => {
                                                    const flow = rowData as HTTPFlow
                                                    if (!flow) {
                                                        return
                                                    }
                                                    const existedTags = flow.Tags
                                                        ? flow.Tags.split("|").filter(
                                                              (i) => !!i && !i.startsWith("YAKIT_COLOR_")
                                                          )
                                                        : []
                                                    existedTags.push(`YAKIT_COLOR_${i.color.toUpperCase()}`)
                                                    ipcRenderer
                                                        .invoke("SetTagForHTTPFlow", {
                                                            Id: flow.Id,
                                                            Hash: flow.Hash,
                                                            Tags: existedTags
                                                        })
                                                        .then(() => {
                                                            info(`设置 HTTPFlow 颜色成功`)
                                                            if (!autoReload) {
                                                                setData(
                                                                    data.map((item) => {
                                                                        if (item.Hash === flow.Hash) {
                                                                            item.cellClassName = i.className
                                                                            item.Tags = `YAKIT_COLOR_${i.color.toUpperCase()}`
                                                                            return item
                                                                        }
                                                                        return item
                                                                    })
                                                                )
                                                            }
                                                        })
                                                }
                                            }
                                        }),
                                        onClick: () => {}
                                    },
                                    {
                                        title: "移除颜色",
                                        onClick: () => {
                                            const flow = rowData as HTTPFlow
                                            if (!flow) return

                                            const existedTags = flow.Tags
                                                ? flow.Tags.split("|").filter(
                                                      (i) => !!i && !i.startsWith("YAKIT_COLOR_")
                                                  )
                                                : []
                                            existedTags.pop()
                                            ipcRenderer
                                                .invoke("SetTagForHTTPFlow", {
                                                    Id: flow.Id,
                                                    Hash: flow.Hash,
                                                    Tags: existedTags
                                                })
                                                .then(() => {
                                                    info(`清除 HTTPFlow 颜色成功`)
                                                    if (!autoReload) {
                                                        setData(
                                                            data.map((item) => {
                                                                if (item.Hash === flow.Hash) {
                                                                    item.cellClassName = ""
                                                                    item.Tags = ""
                                                                    return item
                                                                }
                                                                return item
                                                            })
                                                        )
                                                    }
                                                })
                                            return
                                        }
                                    },
                                    {
                                        title: "发送到对比器",
                                        onClick: () => {},
                                        subMenuItems: [
                                            {
                                                title: "发送到对比器左侧",
                                                onClick: () => {
                                                    setCompareLeft({
                                                        content: new Buffer(rowData.Request).toString("utf8"),
                                                        language: "http"
                                                    })
                                                },
                                                disabled: [false, true, false][compareState]
                                            },
                                            {
                                                title: "发送到对比器右侧",
                                                onClick: () => {
                                                    setCompareRight({
                                                        content: new Buffer(rowData.Request).toString("utf8"),
                                                        language: "http"
                                                    })
                                                },
                                                disabled: [false, false, true][compareState]
                                            }
                                        ]
                                    },
                                    {
                                        title: "屏蔽",
                                        onClick: () => {},
                                        subMenuItems: [
                                            {
                                                title: "屏蔽该记录",
                                                onClick: () => {
                                                    const id = parseInt(rowData?.Id)
                                                    const newArr = filterItem([...shieldData.data, id])
                                                    const newObj = {...shieldData, data: newArr}
                                                    setShieldData(newObj)
                                                }
                                            },
                                            {
                                                title: "屏蔽URL",
                                                onClick: () => {
                                                    let Url = rowData?.Url
                                                    // 根据URL拿到ID数组
                                                    const newArr = filterItem([...shieldData.data, Url])
                                                    const newObj = {...shieldData, data: newArr}
                                                    setShieldData(newObj)
                                                }
                                            },
                                            {
                                                title: "屏蔽域名",
                                                onClick: () => {
                                                    const host = rowData?.HostPort?.split(":")[0] || ""

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
                                        onClick: () => {},
                                        subMenuItems: [
                                            {
                                                title: "删除该记录",
                                                onClick: () => {
                                                    setLoading(true)
                                                    ipcRenderer
                                                        .invoke("DeleteHTTPFlows", {
                                                            Id: [rowData.Id]
                                                        })
                                                        .then(() => {
                                                            info("删除成功")
                                                            update()
                                                        })
                                                        .finally(() => setTimeout(() => setLoading(false), 100))
                                                },
                                                danger: true
                                            },
                                            {
                                                title: "删除URL",
                                                onClick: () => {
                                                    setLoading(true)
                                                    const flow = rowData as HTTPFlow
                                                    ipcRenderer
                                                        .invoke("DeleteHTTPFlows", {
                                                            URLPrefix: flow?.Url
                                                        })
                                                        .then(() => {
                                                            info("删除成功")
                                                            update()
                                                        })
                                                        .finally(() => setTimeout(() => setLoading(false), 100))
                                                }
                                            },
                                            {
                                                title: "删除域名",
                                                onClick: () => {
                                                    setLoading(true)
                                                    const flow = rowData as HTTPFlow
                                                    const host = flow?.HostPort?.split(":")[0]
                                                    ipcRenderer
                                                        .invoke("DeleteHTTPFlows", {
                                                            URLPrefix: host
                                                        })
                                                        .then(() => {
                                                            info("删除成功")
                                                            update()
                                                        })
                                                        .finally(() => setTimeout(() => setLoading(false), 100))
                                                }
                                            }
                                        ]
                                    }
                                ]
                            },
                            event.clientX,
                            event.clientY
                        )
                    }}
                    pagination={{
                        page: pagination.Page,
                        limit: pagination.Limit,
                        total,
                        onChange: update
                    }}
                    onChange={onTableChange}
                />
            </div>
        </div>
        // </AutoCard>
    )
}

const TableFilter: React.FC = () => {
    return (
        <div className={style["extra-right-filter-large"]}>
            <div className={style["extra-right-filter-item"]}>
                <span className={style["extra-right-label"]}>响应类型</span>
                <Select defaultValue='all' size='small' className={style["extra-right-filter-select"]}>
                    <Option value='all'>all</Option>
                    <Option value='jack'>Jack</Option>
                    <Option value='lucy'>Lucy</Option>
                    <Option value='Yiminghe'>yiminghe</Option>
                </Select>
            </div>
            <div className={style["extra-right-filter-item"]}>
                <span className={style["extra-right-label"]}>Tags</span>
                <Select
                    placeholder='请选择...'
                    size='small'
                    className={style["extra-right-filter-select"]}
                    mode='multiple'
                    maxTagCount={1}
                >
                    <Option value='jack'>Jack</Option>
                    <Option value='lucy'>Lucy</Option>
                    <Option value='Yiminghe'>yiminghe</Option>
                </Select>
            </div>
        </div>
    )
}
