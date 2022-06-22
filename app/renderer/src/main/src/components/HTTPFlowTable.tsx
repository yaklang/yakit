import React, {ReactNode, Ref, useEffect, useMemo, useRef, useState} from "react"
import {Button, Col, Empty, Form, Input, PageHeader, Popconfirm, Popover, Row, Select, Space, Tag, Tooltip} from "antd"
import {YakQueryHTTPFlowRequest} from "../utils/yakQueryHTTPFlow"
import {showByCursorMenu} from "../utils/showByCursor"
import {showDrawer} from "../utils/showModal"
import {PaginationSchema} from "../pages/invoker/schema"
import {CheckOutlined, ReloadOutlined, SearchOutlined} from "@ant-design/icons"
import {InputItem, ManyMultiSelectForString, SwitchItem} from "../utils/inputUtil"
import {HTTPFlowDetail} from "./HTTPFlowDetail"
import {failed, info, success} from "../utils/notification"
import "./style.css"
import {TableResizableColumn} from "./TableResizableColumn"
import {formatTime, formatTimestamp} from "../utils/timeUtil"
import {useHotkeys} from "react-hotkeys-hook"
import {useDebounceEffect, useDebounceFn, useGetState, useMemoizedFn, useThrottleFn} from "ahooks"
import ReactResizeDetector from "react-resize-detector"
import {callCopyToClipboard} from "../utils/basic"
import {generateYakCodeByRequest, RequestToYakCodeTemplate} from "../pages/invoker/fromPacketToYakCode"

const {ipcRenderer} = window.require("electron")

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
    const {params, setParams, setSelectedKeys} = props
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
            <HTTPFlowDetail id={flow.Id} onClose={onClosed}/>
        </div>
    )
}

export interface HTTPFlowTableProp {
    onSelected?: (i?: HTTPFlow) => any
    noHeader?: boolean
    tableHeight?: number
    paginationPosition?: "topRight" | "bottomRight"
    params?: YakQueryHTTPFlowRequest
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

const availableColors = [
    {
        color: "RED",
        title: "红色[#FFCCC7]",
        render: (
            <div className='history-color-tag'>
                红色
                <div style={{backgroundColor: "#FFCCC7"}} className='tag-color-display'></div>
            </div>
        )
    },
    // {color: "", title: "移除颜色", render: <div>移除颜色</div>},
    {
        color: "GREEN",
        title: "绿色[#D9F7BE]",
        render: (
            <div className='history-color-tag'>
                绿色
                <div style={{backgroundColor: "#D9F7BE"}} className='tag-color-display'></div>
            </div>
        )
    },
    {
        color: "BLUE",
        title: "蓝色[#D6E4FF]",
        render: (
            <div className='history-color-tag'>
                蓝色
                <div style={{backgroundColor: "#D6E4FF"}} className='tag-color-display'></div>
            </div>
        )
    },
    {
        color: "YELLOW",
        title: "黄色[#FFFFB8]",
        render: (
            <div className='history-color-tag'>
                黄色
                <div style={{backgroundColor: "#FFFFB8"}} className='tag-color-display'></div>
            </div>
        )
    },
    {
        color: "ORANGE",
        title: "橙色[#FFE7BA]",
        render: (
            <div className='history-color-tag'>
                橙色
                <div style={{backgroundColor: "#FFE7BA"}} className='tag-color-display'></div>
            </div>
        )
    },
    {
        color: "PURPLE",
        title: "紫色[#EfDBFF]",
        render: (
            <div className='history-color-tag'>
                紫色
                <div style={{backgroundColor: "#EfDBFF"}} className='tag-color-display'></div>
            </div>
        )
    },
    {
        color: "CYAN",
        title: "天蓝色[#B5F5EC]",
        render: (
            <div className='history-color-tag'>
                天蓝色
                <div style={{backgroundColor: "#B5F5EC"}} className='tag-color-display'></div>
            </div>
        )
    },
    {
        color: "GREY",
        title: "灰色[#D9D9D9]",
        render: (
            <div className='history-color-tag'>
                灰色
                <div style={{backgroundColor: "#D9D9D9"}} className='tag-color-display'></div>
            </div>
        )
    }
]

// 通过关键词输出渲染颜色
const TableRowColor = (key: string) => {
    switch (key) {
        case "RED":
            return "#ffccc7"
        case "GREEN":
            return "#d9f7be"
        case "BLUE":
            return "#d6e4ff"
        case "YELLOW":
            return "#ffffb8"
        case "ORANGE":
            return "#ffe7ba"
        case "PURPLE":
            return "#efdbff"
        case "CYAN":
            return "#b5f5ec"
        case "GREY":
            return "#d9d9d9"
        default:
            return "#ffffff"
    }
}

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

    const tableRef = useRef(null)

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

    const update = useMemoizedFn(
        (page?: number, limit?: number, order?: string, orderBy?: string, sourceType?: string, noLoading?: boolean) => {
            const paginationProps = {
                Page: page || 1,
                Limit: limit || pagination.Limit,
                Order: order || "desc",
                OrderBy: orderBy || "id"
            }
            if (!noLoading) {
                setLoading(true)
                // setAutoReload(false)
            }
            // yakQueryHTTPFlow({
            //     SourceType: sourceType, ...params,
            //     Pagination: {...paginationProps},
            // })
            ipcRenderer
                .invoke("QueryHTTPFlows", {
                    SourceType: sourceType,
                    ...params,
                    Pagination: {...paginationProps}
                })
                .then((rsp: YakQueryHTTPFlowResponse) => {
                    setData(rsp?.Data || [])
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

    // 第一次启动的时候加载一下
    useEffect(() => {
        update(1)
    }, [])

    const scrollTableTo = useMemoizedFn((size: number) => {
        if (!tableRef || !tableRef.current) return
        const table = tableRef.current as unknown as {
            scrollTop: (number) => any
            scrollLeft: (number) => any
        }
        table.scrollTop(size)
    })

    const scrollUpdateTop = useDebounceFn(
        useMemoizedFn(() => {
            const paginationProps = {
                Page: 1,
                Limit: OFFSET_STEP,
                Order: "desc",
                OrderBy: "id"
            }

            const offsetId = getNewestId()
            // 查询数据
            ipcRenderer
                .invoke("QueryHTTPFlows", {
                    SourceType: "mitm",
                    ...params,
                    AfterId: offsetId, // 用于计算增量的
                    Pagination: {...paginationProps}
                })
                .then((rsp: YakQueryHTTPFlowResponse) => {
                    const offsetDeltaData = rsp?.Data || []
                    if (offsetDeltaData.length <= 0) {
                        // 没有增量数据
                        return
                    }
                    setLoading(true)
                    let offsetData = offsetDeltaData.concat(data)
                    if (offsetData.length > MAX_ROW_COUNT) {
                        offsetData = offsetData.splice(0, MAX_ROW_COUNT)
                    }
                    setData(offsetData)
                    scrollTableTo((offsetDeltaData.length + 1) * ROW_HEIGHT)
                })
                .catch((e: any) => {
                    failed(`query HTTP Flow failed: ${e}`)
                })
                .finally(() => setTimeout(() => setLoading(false), 200))
        }),
        {wait: 600, leading: true, trailing: false}
    ).run
    const scrollUpdateButt = useDebounceFn(
        useMemoizedFn((tableClientHeight: number) => {
            const paginationProps = {
                Page: 1,
                Limit: OFFSET_STEP,
                Order: "desc",
                OrderBy: "id"
            }

            const offsetId = getOldestId()
            console.info("触底：", offsetId)

            // 查询数据
            ipcRenderer
                .invoke("QueryHTTPFlows", {
                    SourceType: "mitm",
                    ...params,
                    BeforeId: offsetId, // 用于计算增量的
                    Pagination: {...paginationProps}
                })
                .then((rsp: YakQueryHTTPFlowResponse) => {
                    const offsetDeltaData = rsp?.Data || []
                    if (offsetDeltaData.length <= 0) {
                        // 没有增量数据
                        return
                    }
                    setLoading(true)
                    const originDataLength = data.length
                    let offsetData = data.concat(offsetDeltaData)
                    let metMax = false
                    const originOffsetLength = offsetData.length

                    if (originOffsetLength > MAX_ROW_COUNT) {
                        metMax = true
                        offsetData = offsetData.splice(originOffsetLength - MAX_ROW_COUNT, MAX_ROW_COUNT)
                    }
                    setData(offsetData)
                    setTimeout(() => {
                        if (!metMax) {
                            // 没有丢结果的裁剪问题
                            scrollTableTo((originDataLength + 1) * ROW_HEIGHT - tableClientHeight)
                        } else {
                            // 丢了结果之后的裁剪计算
                            const a = originOffsetLength - offsetDeltaData.length
                            scrollTableTo(
                                (originDataLength + 1 + MAX_ROW_COUNT - originOffsetLength) * ROW_HEIGHT -
                                tableClientHeight
                            )
                        }
                    }, 50)
                })
                .catch((e: any) => {
                    failed(`query HTTP Flow failed: ${e}`)
                })
                .finally(() => setTimeout(() => setLoading(false), 60))
        }),
        {wait: 600, leading: true, trailing: false}
    ).run

    const sortFilter = useMemoizedFn((column: string, type: any) => {
        const keyRelation: any = {
            UpdatedAt: "updated_at",
            BodyLength: "body_length",
            StatusCode: "status_code"
        }

        if (column && type) {
            update(1, OFFSET_LIMIT, type, keyRelation[column])
        } else {
            update(1, OFFSET_LIMIT)
        }
    })

    // 这是用来设置选中坐标的，不需要做防抖
    useEffect(() => {
        if (!getLastSelected() || !getSelected()) {
            return
        }

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
                scrollTableTo(minHeight)
                return
            }
            if (maxHeightBottom > viewHeightMax) {
                // 上滚动
                const offset = minHeight - (screenRowCount - 2) * ROW_HEIGHT
                if (offset > 0) {
                    scrollTableTo(offset)
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
                update(1, undefined, "desc", undefined, undefined, true)
            }, 1000)
            return () => {
                clearInterval(id)
            }
        }
    }, [autoReload])

    return (
        // <AutoCard bodyStyle={{padding: 0, margin: 0}} bordered={false}>
        <div ref={ref as Ref<any>} tabIndex={-1} style={{width: "100%", height: "100%", overflow: "hidden"}}>
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
                    title={"HTTP History"}
                    subTitle={
                        <Space>
                            {"所有相关请求都在这里"}
                            <Button
                                icon={<ReloadOutlined/>}
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
            <Row style={{margin: "5px 0 5px 5px"}}>
                <Col span={12}>
                    <Space>
                        <span>HTTP History</span>
                        <Button
                            icon={<ReloadOutlined/>}
                            type={"link"}
                            size={"small"}
                            onClick={(e) => {
                                update(1, undefined, "desc")
                            }}
                        />
                        {/* <Space>
                            自动刷新:
                            <Switch size={"small"} checked={autoReload} onChange={setAutoReload}/>
                        </Space> */}
                        <Input.Search
                            placeholder={"URL关键字"}
                            enterButton={true}
                            size={"small"}
                            style={{width: 170}}
                            value={params.SearchURL}
                            onChange={(e) => {
                                setParams({...params, SearchURL: e.target.value})
                            }}
                            onSearch={(v) => {
                                update(1)
                            }}
                        />
                        {props.noHeader && (
                            <Popconfirm
                                title={"确定想要删除所有记录吗？不可恢复"}
                                onConfirm={(e) => {
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
                                }}
                            >
                                <Button danger={true} size={"small"}>
                                    删除历史记录
                                </Button>
                            </Popconfirm>
                        )}
                        {/*{autoReload && <Tag color={"green"}>自动刷新中...</Tag>}*/}
                    </Space>
                </Col>
                <Col span={12} style={{textAlign: "right"}}>
                    <Tag>{total} Records</Tag>
                </Col>
            </Row>
            <TableResizableColumn
                tableRef={tableRef}
                virtualized={true}
                className={"httpFlowTable"}
                loading={loading}
                columns={[
                    {
                        dataKey: "Id",
                        width: 80,
                        headRender: () => "序号",
                        cellRender: ({rowData, dataKey, ...props}: any) => {
                            return `${rowData[dataKey] <= 0 ? "..." : rowData[dataKey]}`
                        }
                    },
                    {
                        dataKey: "Method",
                        width: 70,
                        headRender: (params1: any) => {
                            return (
                                <div style={{display: "flex", justifyContent: "space-between"}}>
                                    方法
                                    <Popover
                                        placement='bottom'
                                        trigger='click'
                                        content={
                                            params &&
                                            setParams && (
                                                <HTTLFlowFilterDropdownForms
                                                    label={"搜索方法"}
                                                    params={params}
                                                    setParams={setParams}
                                                    filterName={"Methods"}
                                                    autoCompletions={["GET", "POST", "HEAD"]}
                                                    submitFilter={() => update(1)}
                                                />
                                            )
                                        }
                                    >
                                        <Button
                                            style={{
                                                paddingLeft: 4,
                                                paddingRight: 4,
                                                marginLeft: 4,
                                                color: !!params.Methods ? undefined : "gray"
                                            }}
                                            type={!!params.Methods ? "primary" : "link"}
                                            size={"small"}
                                            icon={<SearchOutlined/>}
                                        />
                                    </Popover>
                                </div>
                            )
                        },
                        cellRender: ({rowData, dataKey, ...props}: any) => {
                            // return (
                            //     <Tag color={"geekblue"} style={{marginRight: 20}}>
                            //         {rowData[dataKey]}
                            //     </Tag>
                            // )
                            return rowData[dataKey]
                        }
                    },
                    {
                        dataKey: "StatusCode",
                        width: 100,
                        sortable: true,
                        headRender: () => {
                            return (
                                <div style={{display: "inline-flex"}}>
                                    状态码
                                    <Popover
                                        placement='bottom'
                                        trigger='click'
                                        content={
                                            params &&
                                            setParams && (
                                                <HTTLFlowFilterDropdownForms
                                                    label={"搜索状态码"}
                                                    params={params}
                                                    setParams={setParams}
                                                    filterName={"StatusCode"}
                                                    autoCompletions={[
                                                        "200",
                                                        "300-305",
                                                        "400-404",
                                                        "500-502",
                                                        "200-299",
                                                        "300-399",
                                                        "400-499"
                                                    ]}
                                                    submitFilter={() => update(1)}
                                                />
                                            )
                                        }
                                    >
                                        <Button
                                            style={{
                                                paddingLeft: 4,
                                                paddingRight: 4,
                                                marginLeft: 4,
                                                color: !!params.StatusCode ? undefined : "gray"
                                            }}
                                            type={!!params.StatusCode ? "primary" : "link"}
                                            size={"small"}
                                            icon={<SearchOutlined/>}
                                        />
                                    </Popover>
                                </div>
                            )
                        },
                        cellRender: ({rowData, dataKey, ...props}: any) => {
                            return (
                                <div style={{color: StatusCodeToColor(rowData[dataKey])}}>
                                    {rowData[dataKey] === 0 ? "" : rowData[dataKey]}
                                </div>
                            )
                        }
                    },
                    {
                        dataKey: "Url",
                        resizable: true,
                        headRender: () => {
                            return (
                                <div style={{display: "flex", justifyContent: "space-between"}}>
                                    URL
                                    <Popover
                                        placement='bottom'
                                        trigger='click'
                                        content={
                                            params &&
                                            setParams && (
                                                <HTTLFlowFilterDropdownForms
                                                    label={"搜索URL关键字"}
                                                    params={params}
                                                    setParams={setParams}
                                                    filterName={"SearchURL"}
                                                    pureString={true}
                                                    submitFilter={() => update(1)}
                                                />
                                            )
                                        }
                                    >
                                        <Button
                                            style={{
                                                paddingLeft: 4,
                                                paddingRight: 4,
                                                marginLeft: 4,
                                                color: !!params.SearchURL ? undefined : "gray"
                                            }}
                                            type={!!params.SearchURL ? "primary" : "link"}
                                            size={"small"}
                                            icon={<SearchOutlined/>}
                                        />
                                    </Popover>
                                </div>
                            )
                        },
                        cellRender: ({rowData, dataKey, ...props}: any) => {
                            if (rowData.IsPlaceholder) {
                                return <div style={{color: "#888585"}}>{"滚轮上滑刷新..."}</div>
                            }
                            return (
                                <div style={{width: "100%", display: "flex"}}>
                                    <div className='resize-ellipsis' title={rowData.Url}>
                                        {!params.SearchURL ? rowData.Url : rowData.Url}
                                    </div>
                                </div>
                            )
                        },
                        width: 600
                    },
                    {
                        dataKey: "HtmlTitle",
                        width: 120,
                        resizable: true,
                        headRender: () => {
                            return "Title"
                        },
                        cellRender: ({rowData, dataKey, ...props}: any) => {
                            return rowData[dataKey] ? rowData[dataKey] : ""
                        }
                    },
                    {
                        dataKey: "Tags",
                        width: 120,
                        resizable: true,
                        headRender: () => {
                            return "Tags"
                        },
                        cellRender: ({rowData, dataKey, ...props}: any) => {
                            return rowData[dataKey]
                                ? `${rowData[dataKey]}`
                                    .split("|")
                                    .filter((i) => !i.startsWith("YAKIT_COLOR_"))
                                    .join(", ")
                                : ""
                        }
                    },
                    {
                        dataKey: "IPAddress",
                        width: 140,
                        resizable: true,
                        headRender: () => {
                            return "IP"
                        },
                        cellRender: ({rowData, dataKey, ...props}: any) => {
                            return rowData[dataKey] ? rowData[dataKey] : ""
                        }
                    },
                    {
                        dataKey: "BodyLength",
                        width: 120,
                        sortable: true,
                        headRender: () => {
                            return (
                                <div style={{display: "inline-block", position: "relative"}}>
                                    响应长度
                                    <Popover
                                        placement='bottom'
                                        trigger='click'
                                        content={
                                            params &&
                                            setParams && (
                                                <HTTLFlowFilterDropdownForms
                                                    label={"是否存在Body？"}
                                                    params={params}
                                                    setParams={setParams}
                                                    filterName={"HaveBody"}
                                                    pureBool={true}
                                                    submitFilter={() => update(1)}
                                                />
                                            )
                                        }
                                    >
                                        <Button
                                            style={{
                                                paddingLeft: 4,
                                                paddingRight: 4,
                                                marginLeft: 4,
                                                color: !!params.HaveBody ? undefined : "gray"
                                            }}
                                            type={!!params.HaveBody ? "primary" : "link"}
                                            size={"small"}
                                            icon={<SearchOutlined/>}
                                        />
                                    </Popover>
                                </div>
                            )
                        },
                        cellRender: ({rowData, dataKey, ...props}: any) => {
                            return (
                                <div style={{width: 100}}>
                                    {/* 1M 以上的话，是红色*/}
                                    {rowData.BodyLength !== -1 ? (
                                        <div style={{color: rowData.BodyLength > 1000000 ? "red" : undefined}}>
                                            {rowData.BodySizeVerbose ? rowData.BodySizeVerbose : rowData.BodyLength}
                                        </div>
                                    ) : (
                                        <div></div>
                                    )}
                                </div>
                            )
                        }
                    },
                    // {
                    //     dataKey: "UrlLength",
                    //     width: 90,
                    //     headRender: () => {
                    //         return "URL 长度"
                    //     },
                    //     cellRender: ({rowData, dataKey, ...props}: any) => {
                    //         const len = (rowData.Url || "").length
                    //         return len > 0 ? <div>{len}</div> : "-"
                    //     }
                    // },
                    {
                        dataKey: "GetParamsTotal",
                        width: 65,
                        align: "center",
                        headRender: () => {
                            return (
                                <div style={{display: "flex", justifyContent: "space-between"}}>
                                    参数
                                    <Popover
                                        placement='bottom'
                                        trigger='click'
                                        content={
                                            params &&
                                            setParams && (
                                                <HTTLFlowFilterDropdownForms
                                                    label={"过滤是否存在基础参数"}
                                                    params={params}
                                                    setParams={setParams}
                                                    filterName={"HaveCommonParams"}
                                                    pureBool={true}
                                                    submitFilter={() => update(1)}
                                                />
                                            )
                                        }
                                    >
                                        <Button
                                            style={{
                                                paddingLeft: 4,
                                                paddingRight: 4,
                                                marginLeft: 4,
                                                color: !!params.HaveCommonParams ? undefined : "gray"
                                            }}
                                            type={!!params.HaveCommonParams ? "primary" : "link"}
                                            size={"small"}
                                            icon={<SearchOutlined/>}
                                        />
                                    </Popover>
                                </div>
                            )
                        },
                        cellRender: ({rowData, dataKey, ...props}: any) => {
                            return (
                                <Space>
                                    {(rowData.GetParamsTotal > 0 || rowData.PostParamsTotal > 0) && <CheckOutlined/>}
                                </Space>
                            )
                        }
                    },
                    {
                        dataKey: "ContentType",
                        resizable: true,
                        width: 80,
                        headRender: () => {
                            return "响应类型"
                        },
                        cellRender: ({rowData, dataKey, ...props}: any) => {
                            let contentTypeFixed =
                                rowData.ContentType.split(";")
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
                        dataKey: "UpdatedAt",
                        sortable: true,
                        width: 110,
                        headRender: () => {
                            return "请求时间"
                        },
                        cellRender: ({rowData, dataKey, ...props}: any) => {
                            return (
                                <Tooltip title={rowData[dataKey] === 0 ? "" : formatTimestamp(rowData[dataKey])}>
                                    {rowData[dataKey] === 0 ? "" : formatTime(rowData[dataKey])}
                                </Tooltip>
                            )
                        }
                    },
                    {
                        dataKey: "operate",
                        width: 90,
                        headRender: () => "操作",
                        cellRender: ({rowData}: any) => {
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
                ]}
                data={autoReload ? data : [TableFirstLinePlaceholder].concat(data)}
                // data={data}
                autoHeight={tableContentHeight <= 0}
                height={tableContentHeight}
                sortFilter={sortFilter}
                renderRow={(children: ReactNode, rowData: any) => {
                    if (rowData)
                        return (
                            <div
                                id='http-flow-row'
                                ref={(node) => {
                                    const color =
                                        rowData.Hash === selected?.Hash
                                            ? "rgba(78, 164, 255, 0.4)"
                                            : rowData.Tags.indexOf("YAKIT_COLOR") > -1
                                            ? TableRowColor(
                                                rowData.Tags.split("|").pop().split("_").pop().toUpperCase()
                                            )
                                            : "#ffffff"
                                    if (node) {
                                        if (color) node.style.setProperty("background-color", color, "important")
                                        else node.style.setProperty("background-color", "#ffffff")
                                    }
                                }}
                                style={{height: "100%"}}
                            >
                                {children}
                            </div>
                        )
                    return children
                }}
                onRowContextMenu={(rowData: HTTPFlow | any, event: React.MouseEvent) => {
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
                                {
                                    title: "发送到 数据包扫描",
                                    onClick: () => {
                                        ipcRenderer
                                            .invoke("GetHTTPFlowById", {Id: rowData.Id})
                                            .then((i: HTTPFlow) => {
                                                ipcRenderer.invoke("send-to-packet-hack", {
                                                    request: i.Request,
                                                    ishttps: i.IsHTTPS,
                                                    response: i.Response
                                                })
                                            })
                                            .catch((e: any) => {
                                                failed(`Query Response failed: ${e}`)
                                            })
                                    }
                                },
                                {
                                    title: "复制 URL",
                                    onClick: () => {
                                        callCopyToClipboard(rowData.Url)
                                    }
                                },
                                {
                                    title: "复制为 Yak PoC 模版",
                                    onClick: () => {
                                    },
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
                                    onClick: () => {
                                    }
                                },
                                {
                                    title: "移除颜色",
                                    onClick: () => {
                                        const flow = rowData as HTTPFlow
                                        if (!flow) return

                                        const existedTags = flow.Tags
                                            ? flow.Tags.split("|").filter((i) => !!i && !i.startsWith("YAKIT_COLOR_"))
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
                                    onClick: () => {
                                    },
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
                                }
                            ]
                        },
                        event.clientX,
                        event.clientY
                    )
                }}
                onRowClick={(rowDate: any) => {
                    if (!rowDate.Hash) return
                    if (rowDate.Hash !== selected?.Hash) {
                        setSelected(rowDate)
                    } else {
                        // setSelected(undefined)
                    }
                }}
                onScroll={(scrollX, scrollY) => {
                    setScrollY(scrollY)
                    // 防止无数据触发加载
                    if (data.length === 0 && !getAutoReload()) {
                        setAutoReload(true)
                        return
                    }

                    // 根据页面展示内容决定是否自动刷新
                    let contextHeight = (data.length + 1) * ROW_HEIGHT // +1 是要把表 title 算进去
                    let offsetY = scrollY + tableContentHeight
                    if (contextHeight < tableContentHeight) {
                        setAutoReload(true)
                        return
                    }
                    setAutoReload(false)

                    // 向下刷新数据
                    if (contextHeight <= offsetY) {
                        setAutoReload(false)
                        scrollUpdateButt(tableContentHeight)
                        return
                    }

                    // 锁住滚轮
                    if (getLockedScroll() > 0 && getLockedScroll() >= scrollY) {
                        if (scrollY === getLockedScroll()) {
                            return
                        }
                        // scrollTableTo(getLockedScroll())
                        return
                    }
                    const toTop = scrollY <= 0
                    if (toTop) {
                        lockScrollTimeout(ROW_HEIGHT, 600)
                        scrollUpdateTop()
                    }
                }}
            />
        </div>
        // </AutoCard>
    )
}