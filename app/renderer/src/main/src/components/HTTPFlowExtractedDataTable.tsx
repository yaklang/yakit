import React, {useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {Typography, Table, Tooltip} from "antd"
import {Paging} from "@/utils/yakQueryHTTPFlow"
import {genDefaultPagination, QueryGeneralRequest, QueryGeneralResponse} from "@/pages/invoker/schema"
import {useControllableValue, useCreation, useDebounceEffect, useDebounceFn, useInViewport, useMemoizedFn} from "ahooks"
import styles from "./hTTPFlowDetail.module.scss"
import {OutlinePositionIcon, OutlineSearchIcon} from "@/assets/icon/outline"
import {HTTPFlowsFieldGroupResponse, MultipleSelect} from "./HTTPFlowTable/HTTPFlowTable"
import classNames from "classnames"
import {yakitNotify} from "@/utils/notification"
import {ColumnsTypeProps, FiltersItemProps, SortProps} from "./TableVirtualResize/TableVirtualResizeType"
import {HistoryHighLightText} from "./HTTPFlowDetail"
import {ColumnsType} from "antd/lib/table"
import {useCampare} from "@/hook/useCompare/useCompare"
import {CopyComponents} from "./yakitUI/YakitTag/YakitTag"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import {TableVirtualResize} from "./TableVirtualResize/TableVirtualResize"
import {showByRightContext} from "./yakitUI/YakitMenu/showByRightContext"
const {Text} = Typography

export interface HTTPFlowExtractedDataTableRefProps {
    jumpDataProjectHighLight: (direction: "next" | "prev") => void
    onDelete: () => void
}
export interface HTTPFlowExtractedDataTableProp {
    ref?: React.ForwardedRef<HTTPFlowExtractedDataTableRefProps>
    title: React.ReactNode
    invalidForUTF8Request: boolean
    InvalidForUTF8Response: boolean
    hiddenIndex: string
    analyzedIds?: number[]
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
    AnalyzedIds?: number[]
}
export interface QueryMITMRuleExtractedDataRequest extends QueryGeneralRequest {
    Filter: ExtractedDataFilter
}

export const HTTPFlowExtractedDataTable: React.FC<HTTPFlowExtractedDataTableProp> = React.forwardRef((props, ref) => {
    const {t, i18n} = useI18nNamespaces(["history", "yakitUi"])
    const [pagination, setPagination] = useState<Paging>(genDefaultPagination())
    const [loading, setLoading] = useState(false)
    const [data, setData] = useControllableValue<HTTPFlowExtractedData[]>(props, {
        defaultValue: [],
        valuePropName: "extractedData",
        trigger: "onSetExtractedData"
    })
    const [tagsFilter, setTagsFilter] = useState<string[]>([])
    const [params, setParams] = useState<QueryMITMRuleExtractedDataRequest>({
        Filter: {
            TraceID: [props.hiddenIndex],
            RuleVerbose: [],
            AnalyzedIds: props.analyzedIds
        },
        Pagination: genDefaultPagination()
    })
    const [total, setTotal] = useState(0)
    const [ruleVerboseSearchVal, setRuleVerboseSearchVal] = useState<string>("")
    const [tags, setTags] = useState<FiltersItemProps[]>([])
    const [currId, setCurrId] = useControllableValue<number | undefined>(props, {
        defaultValue: props.currId,
        valuePropName: "currId",
        trigger: "onSetCurrId"
    })
    const [isRefresh, setIsRefresh] = useState<boolean>(false)
    const [isAllSelect, setIsAllSelect] = useState<boolean>(false)
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])

    const onSelectAll = (newSelectedRowKeys: string[], selected: HTTPFlowExtractedData[], checked: boolean) => {
        setIsAllSelect(checked)
        setSelectedRowKeys(newSelectedRowKeys)
    }

    const onSelectChange = useMemoizedFn((c: boolean, keys: string, rows: HTTPFlowExtractedData) => {
        if (c) {
            setSelectedRowKeys([...selectedRowKeys, keys])
        } else {
            setIsAllSelect(false)
            const newSelectedRowKeys = selectedRowKeys.filter((ele) => ele !== keys)
            setSelectedRowKeys(newSelectedRowKeys)
        }
    })

    useImperativeHandle(
        ref,
        () => ({
            jumpDataProjectHighLight,
            onDelete
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
                if (paginationProps.Page === 1) {
                    setData(r.Data)
                    setIsRefresh(!isRefresh)
                } else {
                    setData((data) => [...data, ...r.Data])
                }
                setCurrId(undefined)
                props.onSetHighLightItem(undefined)

                if (r.Data.length && !props.invalidForUTF8Request && !props.InvalidForUTF8Response) {
                    props.onSetHighLightText(
                        r.Data.map((i) => ({
                            startOffset: i.Index,
                            highlightLength: i.Length,
                            hoverVal: i.RuleName,
                            IsMatchRequest: i.IsMatchRequest
                        }))
                    )
                } else {
                    props.onSetHighLightText([])
                }
                setPagination(r.Pagination)
                setTotal(r.Total)
            })
            .catch(() => {
                setCurrId(undefined)
                props.onSetHighLightItem(undefined)
                props.onSetHighLightText([])
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })

    const compareAnalyzedIds = useCampare(props.analyzedIds)
    useDebounceEffect(
        () => {
            if (!props.hiddenIndex) {
                return
            }
            resetUpdate()
        },
        [props.hiddenIndex, compareAnalyzedIds],
        {wait: 100}
    )

    const resetUpdate = useMemoizedFn(() => {
        const newParams = {
            ...params,
            Filter: {
                TraceID: [props.hiddenIndex],
                RuleVerbose: [],
                AnalyzedIds: props.analyzedIds
            }
        }
        setIsAllSelect(false)
        setSelectedRowKeys([])
        setParams(newParams)
        update(1, 10, newParams.Filter)
    })

    // 获取tags等分组
    const getHTTPFlowsFieldGroup = useMemoizedFn(() => {
        const newParams = {
            Filter: {
                TraceID: [props.hiddenIndex],
                RuleVerbose: [],
                AnalyzedIds: props.analyzedIds
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

    const columns: ColumnsTypeProps[] = useMemo<ColumnsTypeProps[]>(() => {
        return [
            {
                title: t("HTTPFlowExtractedDataTable.ruleName"),
                dataKey: "RuleName",
                ellipsis: true,
                width: 150,
                filterProps: {
                    filterKey: "RuleVerbose",
                    filterMultiple: true,
                    filterIcon: (
                        <OutlineSearchIcon className={styles["filter-icon"]} onClick={getHTTPFlowsFieldGroup} />
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
                                searchVal={ruleVerboseSearchVal}
                                onChangeSearchVal={setRuleVerboseSearchVal}
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
                                    resetUpdate()
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
                title: t("HTTPFlowExtractedDataTable.ruleData"),
                dataKey: "Data",
                render: (_, i: HTTPFlowExtractedData) => (
                    <div className={styles["table-rule-content"]}>
                        <Text
                            ellipsis={{
                                tooltip: (
                                    <div
                                        style={{
                                            maxHeight: 300,
                                            overflowY: "auto"
                                        }}
                                    >
                                        {i.Data}
                                    </div>
                                )
                            }}
                        >
                            {i.Data}
                        </Text>
                        <CopyComponents copyText={i.Data} />
                    </div>
                ),
                filterProps: {
                    filterKey: "ruleData",
                    filtersType: "input",
                    filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />
                }
            }
        ]
    }, [tags, params.Filter.RuleVerbose, ruleVerboseSearchVal, tagsFilter])

    const onLocation = useMemoizedFn((i: HTTPFlowExtractedData) => {
        if (props.invalidForUTF8Request || props.InvalidForUTF8Response) {
            yakitNotify("info", t("HTTPFlowExtractedDataTable.binaryStreamLocateError"))
            return
        }
        setCurrId(+i.Id)
        props.onSetHighLightItem({
            startOffset: i.Index,
            highlightLength: i.Length,
            hoverVal: i.RuleName,
            IsMatchRequest: i.IsMatchRequest
        })
    })

    const onDelete = useMemoizedFn((i?: number) => {
        const Ids: number[] = i ? [i] : selectedRowKeys.map((item) => parseInt(item))
        ipcRenderer
            .invoke("DeleteMITMRuleExtractedData", {Ids})
            .then(() => {
                yakitNotify("success", t("HTTPFlowExtractedDataTable.deleteSuccess"))
                resetUpdate()
            })
            .catch((e: any) => {
                yakitNotify("error", `${e}`)
            })
    })

    const onRowContextMenu = (rowData: HTTPFlowExtractedData, _, event: React.MouseEvent) => {
        showByRightContext(
            {
                width: 180,
                data: [
                    {
                        label: t("HTTPFlowExtractedDataTable.locate"),
                        key: "location"
                    },
                    {
                        label: t("YakitButton.delete"),
                        key: "delete",
                        type: "danger"
                    }
                ],
                onClick: ({key}) => {
                    switch (key) {
                        case "location":
                            onLocation(rowData)
                            return
                        case "delete":
                            onDelete(parseInt(rowData.Id + ""))
                            return
                    }
                }
            },
            event.clientX,
            event.clientY
        )
    }

    const onTableChange = useDebounceFn((page: number, limit: number, sort: SortProps, filter: any) => {
        console.log("onTableChange---", filter)
        // 处理表格变化
        const newParams = {
            ...params,
            Filter: {
                TraceID: [props.hiddenIndex],
                RuleVerbose: [...tagsFilter],
                AnalyzedIds: props.analyzedIds
            }
        }
        setParams(newParams)
        setIsAllSelect(false)
        setSelectedRowKeys([])
        update(1, 10, newParams.Filter)
    }).run
    return (
        <div className={styles["httpFlow-data-table"]}>
            <TableVirtualResize<HTTPFlowExtractedData>
                titleHeight={33}
                renderTitle={<>{props.title}</>}
                data={data}
                query={params.Filter}
                renderKey={"Id"}
                columns={columns}
                isRefresh={isRefresh}
                loading={loading}
                onRowContextMenu={onRowContextMenu}
                rowSelection={{
                    isAll: isAllSelect,
                    type: "checkbox",
                    selectedRowKeys,
                    onSelectAll,
                    onChangeCheckboxSingle: onSelectChange
                }}
                pagination={{
                    page: pagination.Page,
                    limit: pagination.Limit,
                    total,
                    onChange: (page: number, limit?: number) => {
                        update(page, limit)
                    }
                }}
                onChange={onTableChange}
            />
        </div>
    )
})
