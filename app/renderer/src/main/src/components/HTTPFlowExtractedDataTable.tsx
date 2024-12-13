import React, {useEffect, useRef, useState} from "react"
import {Typography, Table} from "antd"
import {Paging} from "@/utils/yakQueryHTTPFlow"
import {genDefaultPagination, QueryGeneralRequest, QueryGeneralResponse} from "@/pages/invoker/schema"
import {useDebounceEffect, useMemoizedFn} from "ahooks"
import styles from "./hTTPFlowDetail.module.scss"
import {HighLightText} from "./HTTPFlowDetail"
import {OutlineSearchIcon} from "@/assets/icon/outline"
import {HTTPFlowsFieldGroupResponse, MultipleSelect} from "./HTTPFlowTable/HTTPFlowTable"
import classNames from "classnames"
import {yakitNotify} from "@/utils/notification"
import {FiltersItemProps} from "./TableVirtualResize/TableVirtualResizeType"
const {Text} = Typography
export interface HTTPFlowExtractedDataTableProp {
    title: React.ReactNode
    hiddenIndex: string
    onSetHighLightText: (highLightText: HighLightText[]) => void
    onSetExportMITMRuleFilter: (filter: ExtractedDataFilter) => void
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

export const HTTPFlowExtractedDataTable: React.FC<HTTPFlowExtractedDataTableProp> = (props) => {
    const [pagination, setPagination] = useState<Paging>(genDefaultPagination())
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<HTTPFlowExtractedData[]>([])
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
                props.onSetHighLightText(
                    r.Data.map((i) => ({
                        startOffset: i.Index,
                        highlightLength: i.Length,
                        hoverVal: i.RuleName,
                        IsMatchRequest: i.IsMatchRequest
                    }))
                )
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
        ipcRenderer
            .invoke("HTTPFlowsFieldGroup", {
                RefreshRequest: true
            })
            .then((rsp: HTTPFlowsFieldGroupResponse) => {
                const tags = rsp.Tags.filter((item) => item.Value)
                const realTags: FiltersItemProps[] = tags.map((ele) => ({label: ele.Value, value: ele.Value}))
                setTags(realTags)
            })
            .catch((e: any) => {
                yakitNotify("error", `query HTTP Flows Field Group failed: ${e}`)
            })
    })

    return (
        <div className={styles["httpFlow-data-table"]}>
            <Table<HTTPFlowExtractedData>
                bordered={true}
                title={() => <>{props.title}</>}
                dataSource={data}
                key={"Id"}
                columns={[
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
                        width: 100,
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
                        ),
                        width: 210
                    }
                ]}
                loading={loading}
                size={"small"}
                style={{margin: 0, padding: 0}}
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
}
