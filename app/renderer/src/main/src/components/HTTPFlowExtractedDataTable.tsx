import React, {useEffect, useImperativeHandle, useRef, useState} from "react"
import {Typography, Table, Tooltip} from "antd"
import {Paging} from "@/utils/yakQueryHTTPFlow"
import {genDefaultPagination, QueryGeneralRequest, QueryGeneralResponse} from "@/pages/invoker/schema"
import {useControllableValue, useCreation, useDebounceEffect, useInViewport, useMemoizedFn} from "ahooks"
import styles from "./hTTPFlowDetail.module.scss"
import {OutlinePositionIcon, OutlineSearchIcon} from "@/assets/icon/outline"
import {HTTPFlowsFieldGroupResponse, MultipleSelect} from "./HTTPFlowTable/HTTPFlowTable"
import classNames from "classnames"
import {yakitNotify} from "@/utils/notification"
import {FiltersItemProps} from "./TableVirtualResize/TableVirtualResizeType"
import {HistoryHighLightText} from "./HTTPFlowDetail"
import {ColumnsType} from "antd/lib/table"
const {Text} = Typography

export interface HTTPFlowExtractedDataTableRefProps {
    jumpDataProjectHighLight: (direction: "next" | "prev") => void
}
export interface HTTPFlowExtractedDataTableProp {
    ref?: React.ForwardedRef<HTTPFlowExtractedDataTableRefProps>
    title: React.ReactNode
    invalidForUTF8Request: boolean
    InvalidForUTF8Response: boolean
    hiddenIndex: string
    onSetHighLightText: (highLightText: HistoryHighLightText[]) => void
    onSetExportMITMRuleFilter: (filter: ExtractedDataFilter) => void
    onSetHighLightItem: (highLightItem?: HistoryHighLightText) => void
    currId?: number
    onSetCurrId: (currIndex: number | undefined) => void
    onSetExtractedData: (extractedData: HTTPFlowExtractedData[]) => void
}

const {ipcRenderer} = window.require("electron")

export interface HTTPFlowExtractedData {
    Id: number
    CreatedAt: number
    SourceType: "httpflow" | string
    TraceId: string
    Regexp: string
    RuleName: string
    Data: string
    Index: number
    Length: number
    IsMatchRequest: boolean
}

export interface ExtractedDataFilter {
    TraceID: string[]
    RuleVerbose: string[]
}
export interface QueryMITMRuleExtractedDataRequest extends QueryGeneralRequest {
    Filter: ExtractedDataFilter
}

export const HTTPFlowExtractedDataTable: React.FC<HTTPFlowExtractedDataTableProp> = React.forwardRef((props, ref) => {
    const [pagination, setPagination] = useState<Paging>(genDefaultPagination())
    const [loading, setLoading] = useState(false)
    const [data, setData] = useControllableValue<HTTPFlowExtractedData[]>(props, {
        defaultValue: [],
        valuePropName: "extractedData",
        trigger: "onSetExtractedData"
    })
    const [params, setParams] = useState<QueryMITMRuleExtractedDataRequest>({
        Filter: {
            TraceID: [props.hiddenIndex],
            RuleVerbose: []
        },
        Pagination: genDefaultPagination()
    })
    const [total, setTotal] = useState(0)
    const [ruleVerboseSearchVal, setRuleVerboseSearchVal] = useState<string>("")
    const [tags, setTags] = useState<FiltersItemProps[]>([])
    const ruleVerboseOpenRef = useRef<boolean>(false)
    const clickOpenRef = useRef<boolean>(false)
    const [currId, setCurrId] = useControllableValue<number | undefined>(props, {
        defaultValue: props.currId,
        valuePropName: "currId",
        trigger: "onSetCurrId"
    })

    useImperativeHandle(
        ref,
        () => ({
            jumpDataProjectHighLight
        }),
        []
    )

    useDebounceEffect(
        () => {
            props.onSetExportMITMRuleFilter(params.Filter)
        },
        [params],
        {wait: 300}
    )

    const update = useMemoizedFn((page?: number, limit?: number, Filter?: ExtractedDataFilter) => {
        const paginationProps = {
            Page: page || 1,
            Limit: limit || pagination.Limit
        }
        setLoading(true)
        const query = {
            ...params,
            Pagination: paginationProps
        }
        if (Filter) {
            query.Filter = Filter
        }
        ipcRenderer
            .invoke("QueryMITMRuleExtractedData", query)
            .then((r: QueryGeneralResponse<HTTPFlowExtractedData>) => {
                setData(r.Data)
                if (r.Data.length && !props.invalidForUTF8Request && !props.InvalidForUTF8Response) {
                    setCurrId(r.Data[0].Id)
                    props.onSetHighLightItem({
                        startOffset: r.Data[0].Index,
                        highlightLength: r.Data[0].Length,
                        hoverVal: r.Data[0].RuleName,
                        IsMatchRequest: r.Data[0].IsMatchRequest
                    })
                    props.onSetHighLightText(
                        r.Data.map((i) => ({
                            startOffset: i.Index,
                            highlightLength: i.Length,
                            hoverVal: i.RuleName,
                            IsMatchRequest: i.IsMatchRequest
                        }))
                    )
                } else {
                    setCurrId(undefined)
                    props.onSetHighLightItem(undefined)
                    props.onSetHighLightText([])
                }
                setPagination(r.Pagination)
                setTotal(r.Total)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })

    useEffect(() => {
        if (!props.hiddenIndex) {
            return
        }
        resetUpdate()
    }, [props.hiddenIndex])

    const resetUpdate = useMemoizedFn(() => {
        const newParams = {
            ...params,
            Filter: {
                TraceID: [props.hiddenIndex],
                RuleVerbose: []
            }
        }
        setParams(newParams)
        update(1, 10, newParams.Filter)
    })

    // 获取tags等分组
    const getHTTPFlowsFieldGroup = useMemoizedFn(() => {
        const newParams = {
            Filter: {
                TraceID: [props.hiddenIndex],
                RuleVerbose: []
            },
            Page: 1,
            Limit: 10,
            OnlyName: true
        }
        ipcRenderer
            .invoke("QueryMITMRuleExtractedData", newParams)
            .then((rsp: QueryGeneralResponse<HTTPFlowExtractedData>) => {
                if (rsp.Data.length) {
                    const ruleNames = rsp.Data.map((item) => item.RuleName)
                    const tags = [...new Set(ruleNames)]
                    const realTags: FiltersItemProps[] = tags.map((tag) => ({label: tag, value: tag}))
                    setTags(realTags)
                } else {
                    setTags([])
                }
            })
            .catch((e: any) => {
                yakitNotify("error", `${e}`)
            })
    })

    const jumpDataProjectHighLight = useMemoizedFn((direction: "next" | "prev") => {
        if (currId !== undefined) {
            const currIndex = data.findIndex((item) => item.Id == currId)
            let index = currIndex
            if (direction === "next") {
                index = currIndex + 1 >= data.length ? data.length - 1 : currIndex + 1
            } else {
                index = currIndex - 1 < 0 ? 0 : currIndex - 1
            }
            if (index !== -1) {
                setCurrId(+data[index].Id)
                props.onSetHighLightItem({
                    startOffset: data[index].Index,
                    highlightLength: data[index].Length,
                    hoverVal: data[index].RuleName,
                    IsMatchRequest: data[index].IsMatchRequest
                })
            }
        }
    })

    const columns: ColumnsType<HTTPFlowExtractedData> = [
        {
            title: "规则名",
            ellipsis: {
                showTitle: false
            },
            render: (i: HTTPFlowExtractedData) => (
                <Text
                    ellipsis={{
                        tooltip: <div style={{maxHeight: 300, overflowY: "auto"}}>{i.RuleName}</div>
                    }}
                >
                    {i.RuleName}
                </Text>
            ),
            width: 150,
            filterIcon: () => {
                return (
                    <OutlineSearchIcon
                        className={classNames(styles["filter-icon"], {
                            [styles["filter-icon-color"]]:
                                !ruleVerboseOpenRef.current && !!params.Filter.RuleVerbose.length
                        })}
                        onClick={getHTTPFlowsFieldGroup}
                    />
                )
            },
            filterDropdown: ({confirm}) => {
                return (
                    <div style={{paddingTop: 5}}>
                        <MultipleSelect
                            filterProps={{
                                filterSearch: true,
                                filterSearchInputProps: {
                                    prefix: <OutlineSearchIcon className='search-icon' />,
                                    allowClear: true
                                }
                            }}
                            originalList={tags}
                            searchVal={ruleVerboseSearchVal}
                            onChangeSearchVal={setRuleVerboseSearchVal}
                            value={params.Filter.RuleVerbose}
                            onSelect={(v, item) => {
                                if (Array.isArray(v)) {
                                    const newParams = {
                                        ...params,
                                        Filter: {
                                            TraceID: [props.hiddenIndex],
                                            RuleVerbose: v
                                        }
                                    }
                                    setParams(newParams)
                                }
                            }}
                            onClose={() => {
                                clickOpenRef.current = true
                                confirm({closeDropdown: true})
                                update()
                            }}
                            onQuery={() => {
                                // 重置
                                clickOpenRef.current = true
                                resetUpdate()
                            }}
                        ></MultipleSelect>
                    </div>
                )
            },
            onFilterDropdownVisibleChange: (visible) => {
                ruleVerboseOpenRef.current = visible
                if (visible) {
                    clickOpenRef.current = false
                } else {
                    if (!clickOpenRef.current) {
                        update()
                    }
                }
            }
        },
        {
            title: "规则数据",
            ellipsis: {
                showTitle: false
            },
            render: (i: HTTPFlowExtractedData) => (
                <Text
                    ellipsis={{
                        tooltip: <div style={{maxHeight: 300, overflowY: "auto"}}>{i.Data}</div>
                    }}
                >
                    {i.Data}
                </Text>
            )
        },
        {
            title: "操作",
            width: 55,
            align: "center",
            render: (i: HTTPFlowExtractedData, record) => {
                return (
                    <Tooltip title='定位'>
                        <OutlinePositionIcon
                            className={classNames(styles["position-icon"], {
                                [styles["position-icon-active"]]: currId == i.Id
                            })}
                            onClick={() => {
                                if (props.invalidForUTF8Request || props.InvalidForUTF8Response) {
                                    yakitNotify("info", "含有二进制流的数据包无法定位")
                                    return
                                }
                                setCurrId(+i.Id)
                                props.onSetHighLightItem({
                                    startOffset: i.Index,
                                    highlightLength: i.Length,
                                    hoverVal: i.RuleName,
                                    IsMatchRequest: i.IsMatchRequest
                                })
                            }}
                        />
                    </Tooltip>
                )
            }
        }
    ]

    return (
        <div className={styles["httpFlow-data-table"]}>
            <Table<HTTPFlowExtractedData>
                bordered={true}
                title={() => <>{props.title}</>}
                dataSource={data}
                key={"Id"}
                columns={columns}
                loading={loading}
                size={"small"}
                style={{margin: 0, padding: 0, maxWidth: "100%"}}
                pagination={{
                    pageSize: pagination.Limit,
                    showSizeChanger: true,
                    total,
                    pageSizeOptions: ["5", "10", "20"],
                    onChange: (page: number, limit?: number) => {
                        update(page, limit)
                    },
                    onShowSizeChange: (old, limit) => {
                        update(1, limit)
                    }
                }}
            ></Table>
        </div>
    )
})
