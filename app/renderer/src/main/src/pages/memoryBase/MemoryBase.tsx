import React, {useEffect, useRef, useState} from "react"
import {
    MemoryBaseProps,
    AITextareaProps,
    MemoryQueryProps,
    MemoryTableProps,
    AIMemoryEntityFilter,
    RatingListItem,
    MemorySelectQuery,
    AIMemoryEntity,
    QueryAIMemoryEntityRequest,
    CountAIMemoryEntityTagsResponse,
    AIMemorySearchParams,
    RateModeType
} from "./type"
import styles from "./MemoryBase.module.scss"
import classNames from "classnames"
import {ChevrondownButton, ChevronleftButton} from "../ai-re-act/aiReActChat/AIReActComponent"
import {QSInputTextarea} from "../ai-agent/template/template"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineArrowupIcon,
    OutlineQuestionmarkcircleIcon,
    OutlineRefreshIcon,
    OutlineTrashIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {Badge, Divider, RadioChangeEvent, Slider, Tooltip} from "antd"
import {OutlineSparklesColorsIcon} from "@/assets/icon/colors"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import numeral from "numeral"
import {TableTotalAndSelectNumber} from "@/components/TableTotalAndSelectNumber/TableTotalAndSelectNumber"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {
    useControllableValue,
    useCreation,
    useDebounceEffect,
    useDebounceFn,
    useInViewport,
    useMemoizedFn,
    useSelections
} from "ahooks"
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {AIMemoryContent} from "../ai-agent/chatTemplate/aiMemoryList/AIMemoryList"
import {YakitCombinationSearch} from "@/components/YakitCombinationSearch/YakitCombinationSearch"
import {YakitCombinationSearchProps} from "@/components/YakitCombinationSearch/YakitCombinationSearchType"
import useVirtualTableHook from "@/hook/useVirtualTableHook/useVirtualTableHook"
import {genDefaultPagination} from "../invoker/schema"
import {
    getAIMemoryEntityFilter,
    grpcCountAIMemoryEntityTags,
    grpcDeleteAIMemoryEntity,
    grpcQueryAIMemoryEntity
} from "./utils"
import emiter from "@/utils/eventBus/eventBus"
import {AIAgentGrpcApi} from "../ai-re-act/hooks/grpcApi"
import {LoadingOutlined} from "@ant-design/icons"
import ReactResizeDetector from "react-resize-detector"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {batchRefreshMenuData} from "../yakRunnerAuditHole/YakitAuditHoleTable/YakitAuditHoleTable"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {TagsCode} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {cloneDeep} from "lodash"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitSelectProps} from "@/components/yakitUI/YakitSelect/YakitSelectType"
import {yakitNotify} from "@/utils/notification"
import {NoPromptHint} from "../pluginHub/utilsUI/UtilsTemplate"
import {RemoteAIAgentGV} from "@/enums/aiAgent"
import {serverPushStatus} from "@/utils/duplex/duplex"

const {YakitPanel} = YakitCollapse

const defaultMemoryQuery: MemorySelectQuery = {
    rate: [],
    tags: [],
    tagMatchAll: false
}
const MemoryBase: React.FC<MemoryBaseProps> = React.memo((props) => {
    const [selectQuery, setSelectQuery] = useState<MemorySelectQuery>(cloneDeep(defaultMemoryQuery))
    return (
        <div className={styles["memory-base"]}>
            <MemoryQuery selectQuery={selectQuery} setSelectQuery={setSelectQuery} />
            <MemoryTable queryParams={selectQuery} setQueryParams={setSelectQuery} />
        </div>
    )
})

export default MemoryBase

const searchOptions: YakitCombinationSearchProps["addonBeforeOption"] = [
    {
        label: "语义搜索",
        value: "ai"
    },
    {
        label: "关键字",
        value: "keyword"
    }
]

interface RateRemoveListItem {
    label: string
    key: string
    params: AIMemoryEntityFilter
}
const rateRemoveList: RateRemoveListItem[] = [
    {
        label: "低相关",
        key: "delete_candidate_noise",
        params: {
            RScore: {
                Enabled: true,
                Max: 0.15,
                Min: 0.0
            }
        }
    },
    {
        label: "强负面且低信息量",
        key: "delete_candidate_emotional",
        params: {
            EScore: {
                Enabled: true,
                Max: 0.15,
                Min: 0.0
            },
            RScore: {
                Enabled: true,
                Max: 0.5,
                Min: 0.0
            },
            AScore: {
                Enabled: true,
                Max: 0.45,
                Min: 0.0
            },
            PScore: {
                Enabled: true,
                Max: 0.55,
                Min: 0.0
            }
        }
    },
    {
        label: "疑似过时且无复用价值",
        key: "delete_candidate_stale",
        params: {
            TScore: {
                Enabled: true,
                Max: 0.15,
                Min: 0.0
            },
            RScore: {
                Enabled: true,
                Max: 0.45,
                Min: 0.0
            },
            AScore: {
                Enabled: true,
                Max: 0.6,
                Min: 0.0
            },
            PScore: {
                Enabled: true,
                Max: 0.7,
                Min: 0.0
            }
        }
    }
]
const MemoryTable: React.FC<MemoryTableProps> = React.memo((props) => {
    const {queryParams, setQueryParams} = props
    const [isRefresh, setIsRefresh] = useState<boolean>(false)
    const [tagShow, setTagShow] = useState<boolean>(false)
    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [currentItem, setCurrentItem] = useState<AIMemoryEntity>()
    const [selectList, setSelectList] = useState<AIMemoryEntity[]>([])
    const [search, setSearch] = useState<AIMemorySearchParams>({
        type: "keyword",
        keyword: "",
        aiInput: ""
    })

    const tableBoxRef = useRef<HTMLDivElement>(null)
    const boxHeightRef = useRef<number>()
    const tableRef = useRef<HTMLUListElement>(null)

    useEffect(() => {
        emiter.on("onRefreshQueryAIMemoryEntity", onStartInterval)
        return () => {
            emiter.off("onRefreshQueryAIMemoryEntity", onStartInterval)
        }
    }, [])
    /**开启实时数据刷新 */
    const onStartInterval = useMemoizedFn(() => {
        if (search.type === "ai") return
        debugVirtualTableEvent.startT()
    })
    const onFirst = useMemoizedFn(() => {
        setIsRefresh(!isRefresh)
        setSelectList([])
        setAllCheck(false)
        setCurrentItem(undefined)
    })
    useDebounceEffect(
        () => {
            onSearch()
        },
        [queryParams],
        {wait: 200}
    )
    const [tableParams, tableData, tableTotal, pagination, tableLoading, offsetData, debugVirtualTableEvent] =
        useVirtualTableHook<QueryAIMemoryEntityRequest, AIMemoryEntity, "Data", "Id">({
            tableBoxRef,
            tableRef,
            boxHeightRef,
            grpcFun: grpcQueryAIMemoryEntity,
            onFirst,
            defaultParams: {
                Filter: getAIMemoryEntityFilter({query: queryParams, search}),
                Pagination: {
                    ...genDefaultPagination(50)
                }
            }
        })
    const columns: ColumnsTypeProps[] = useCreation(() => {
        const columnsArr: ColumnsTypeProps[] = [
            {
                title: "序号",
                dataKey: "Id",
                width: 80,
                sorterProps: {
                    sorter: true,
                    sorterKey: "Id"
                }
            },
            {
                title: "ID",
                dataKey: "MemoryID",
                render: (value) => (
                    <div className={styles["memory-id-cell"]}>
                        <span className={styles["text"]} title={value}>
                            {value}
                        </span>
                        <CopyComponents copyText={value} />
                    </div>
                )
            },
            {
                title: "Tags",
                dataKey: "Tags",
                render: (value) => {
                    return value && value.length > 0 ? value?.map((it) => <YakitTag key={it}>{it}</YakitTag>) : "-"
                }
            },
            {
                title: "记忆总结",
                dataKey: "Content",
                enableDrag: false
            },
            {
                title: "操作",
                dataKey: "HiddenIndex",
                width: 60,
                fixed: "right",
                render: (_, recorder) => (
                    <div>
                        <YakitPopconfirm
                            title='确认删除吗?'
                            onConfirm={(e) => {
                                e?.stopPropagation()
                                onRemove(recorder)
                            }}
                        >
                            <YakitButton
                                icon={<OutlineTrashIcon />}
                                type='text'
                                danger
                                onClick={(e) => {
                                    e.stopPropagation()
                                }}
                            />
                        </YakitPopconfirm>
                    </div>
                )
            }
        ]
        return columnsArr
    }, [])
    const onRemove = useMemoizedFn((recorder) => {
        if (!recorder.MemoryID) return
        grpcDeleteAIMemoryEntity({
            Filter: {MemoryID: [recorder.MemoryID]}
        }).then((res) => {
            debugVirtualTableEvent.noResetRefreshT()
        })
    })
    const onBatchRemove = useMemoizedFn(() => {
        let filterParams: AIMemoryEntityFilter = {}
        if (allCheck) {
            filterParams = getAIMemoryEntityFilter({query: queryParams, search})
        } else {
            filterParams = {
                MemoryID: selectList.map((ele) => ele.MemoryID)
            }
        }
        grpcDeleteAIMemoryEntity({
            Filter: filterParams
        }).then((res) => {
            debugVirtualTableEvent.noResetRefreshT()
        })
    })
    const onTableChange = useMemoizedFn((page: number, limit: number, newSort: SortProps, filter: any) => {
        let sort = {...newSort}
        if (sort.order === "none") {
            sort.order = "desc"
            sort.orderBy = "id"
        }

        const finalParams = {
            Pagination: {
                ...tableParams.Pagination,
                Order: sort.order,
                OrderBy: sort.orderBy
            },
            Filter: {
                ...tableParams.Filter,
                ...filter
            }
        }
        debugVirtualTableEvent.setP(finalParams)
    })

    const onSetCurrentRow = useMemoizedFn((val?: AIMemoryEntity) => {
        setCurrentItem(val)
    })
    const onClose = useMemoizedFn(() => {
        setQueryParams((prev) => ({
            ...prev,
            rate: [],
            tags: []
        }))
    })
    const onSelectBeforeOption = useMemoizedFn((o) => {
        setSearch((perv) => ({
            ...perv,
            type: o
        }))
    })
    const selectedRowKeys = useCreation(() => {
        return selectList.map((ele) => ele.Id) || []
    }, [selectList])
    const onSelectAll = useMemoizedFn((_: string[], __: AIMemoryEntity[], checked: boolean) => {
        if (checked) {
            setAllCheck(true)
            setSelectList(tableData)
        } else {
            setAllCheck(false)
            setSelectList([])
        }
    })

    const onChangeCheckboxSingle = useMemoizedFn((c: boolean, _: string, selectedRows: AIMemoryEntity) => {
        if (c) {
            setSelectList((s) => [...s, selectedRows])
        } else {
            setSelectList((s) => s.filter((ele) => ele.Id !== selectedRows.Id))
            setAllCheck(false)
        }
    })
    const currentSelectItem: AIAgentGrpcApi.MemoryEntry | null = useCreation(() => {
        if (!!currentItem) {
            const item: AIAgentGrpcApi.MemoryEntry = {
                id: `${currentItem.Id}`,
                created_at: "",
                created_at_timestamp: currentItem.CreatedAt,
                content: currentItem.Content,
                tags: currentItem.Tags,
                c_score: currentItem.CScore,
                o_score: currentItem.OScore,
                r_score: currentItem.RScore,
                e_score: currentItem.EScore,
                p_score: currentItem.PScore,
                a_score: currentItem.AScore,
                t_score: currentItem.TScore,
                core_pact_vector: currentItem.CorePactVector,
                potential_questions: currentItem.PotentialQuestions,
                memory_id: currentItem.MemoryID
            }
            return item
        }
        return null
    }, [currentItem])
    /**table所在的div大小发生变化 */
    const onTableResize = useMemoizedFn((width, height) => {
        if (!width || !height) {
            return
        }
        boxHeightRef.current = height
    })
    const onRefreshMenuSelect = useMemoizedFn((key: string) => {
        switch (key) {
            case "noResetRefresh":
                debugVirtualTableEvent.noResetRefreshT()
                break
            case "resetRefresh":
                setQueryParams(cloneDeep(defaultMemoryQuery))
                debugVirtualTableEvent.refreshT()
                break
            default:
                break
        }
    })
    const queryNumber = useCreation(() => {
        return (queryParams?.rate?.length || 0) + (queryParams?.tags?.length || 0)
    }, [queryParams])
    const onDelRate = useMemoizedFn((val: RatingListItem) => {
        setQueryParams((prev) => ({
            ...prev,
            rate: prev.rate.filter((ele) => ele.id !== val.id)
        }))
    })
    const onDelTag = useMemoizedFn((val: TagsCode) => {
        setQueryParams((prev) => ({
            ...prev,
            tags: prev.tags.filter((ele) => ele.Value !== val.Value)
        }))
    })
    const queryContent = useMemoizedFn(() => {
        return (
            <>
                {queryParams?.rate?.map((item) => {
                    return (
                        <Tooltip title={item.label} placement='top' overlayClassName='plugins-tooltip' key={item.id}>
                            <YakitTag closable onClose={() => onDelRate(item)} className={styles["tag-item"]}>
                                {item.label}({numeral(item.min).format("0.00")}~{numeral(item.max).format("0.00")})
                            </YakitTag>
                        </Tooltip>
                    )
                })}
                {queryParams?.tags?.map((item) => {
                    return (
                        <Tooltip title={item.Value} placement='top' overlayClassName='plugins-tooltip' key={item.Value}>
                            <YakitTag closable onClose={() => onDelTag(item)} className={styles["tag-item"]}>
                                {item.Value}
                            </YakitTag>
                        </Tooltip>
                    )
                })}
            </>
        )
    })
    const searchValue = useCreation(() => {
        switch (search.type) {
            case "keyword":
                return search.keyword
            case "ai":
                return search.aiInput
            default:
                return ""
        }
    }, [search])
    const onValueChange = useMemoizedFn((e) => {
        let newSearch: AIMemorySearchParams = {
            ...search
        }
        switch (search.type) {
            case "keyword":
                newSearch.keyword = e.target.value
                break
            case "ai":
                newSearch.aiInput = e.target.value
                break
            default:
                break
        }
        setSearch({
            ...newSearch
        })
    })
    const onSearch = useDebounceFn(
        useMemoizedFn(() => {
            const filter: AIMemoryEntityFilter = getAIMemoryEntityFilter({query: queryParams, search})

            const newParams: QueryAIMemoryEntityRequest = {
                Pagination: {
                    ...tableParams.Pagination,
                    Limit: !!filter.SemanticQuery ? 200 : tableParams.Pagination.Limit //ai 搜索限制200条
                },
                Filter: {
                    ...tableParams.Filter,
                    ...filter
                }
            }
            if (!!filter.SemanticQuery) {
                debugVirtualTableEvent.stopT()
                debugVirtualTableEvent.setP(newParams)
            } else {
                debugVirtualTableEvent.setP(newParams)
                debugVirtualTableEvent.onReset()
                debugVirtualTableEvent.startT()
            }
        }),
        {wait: 200}
    ).run
    const disabledBatchRemove = useCreation(() => {
        return selectList.length === 0 && !allCheck
    }, [selectList, allCheck])

    const [visibleRemove, setVisibleRemove] = useState<boolean>(false)
    const removeItemRef = useRef<RateRemoveListItem>()
    const onFastRemove = useMemoizedFn((key) => {
        const item = rateRemoveList.find((ele) => ele.key === key)
        if (!item) {
            yakitNotify("error", "未找到快捷删除配置")
            return
        }
        removeItemRef.current = item
        setVisibleRemove(true)
    })
    const delHintCallback = useMemoizedFn((isOk: boolean) => {
        if (isOk) {
            if (!removeItemRef.current) return
            const filterParams: AIMemoryEntityFilter = {...removeItemRef.current.params}
            grpcDeleteAIMemoryEntity({
                Filter: filterParams
            }).then(() => {
                yakitNotify("success", `已删除${removeItemRef.current?.label}的相关记忆`)
                setVisibleRemove(false)
                debugVirtualTableEvent.noResetRefreshT()
            })
        } else {
            setVisibleRemove(false)
        }
    })
    return (
        <div className={styles["memory-table-wrapper"]}>
            <div className={styles["memory-table"]} ref={tableBoxRef}>
                <ReactResizeDetector
                    onResize={onTableResize}
                    handleWidth={true}
                    handleHeight={true}
                    refreshMode={"debounce"}
                    refreshRate={50}
                />
                <TableVirtualResize<AIMemoryEntity>
                    ref={tableRef}
                    loading={tableLoading}
                    isRefresh={isRefresh}
                    titleHeight={48}
                    renderTitle={
                        <div className={styles["memory-table-heard"]}>
                            <div className={styles["memory-table-title"]}>
                                <div className={styles["memory-table-title-left"]}>
                                    <span className={styles["title-text"]}>记忆库</span>
                                    <TableTotalAndSelectNumber total={tableTotal} />
                                    {queryNumber > 2 ? (
                                        <YakitPopover
                                            onVisibleChange={setTagShow}
                                            content={<div className={styles["filter-popover"]}>{queryContent()}</div>}
                                        >
                                            <YakitTag
                                                color='white'
                                                closable
                                                onClose={onClose}
                                                className={classNames(styles["filter-tag"], {
                                                    [styles["active-tag"]]: tagShow
                                                })}
                                            >
                                                查询条件<span className={styles["select-number"]}>{queryNumber}</span>
                                            </YakitTag>
                                        </YakitPopover>
                                    ) : (
                                        <div>{queryContent()}</div>
                                    )}
                                </div>
                                <div className={styles["memory-table-title-extra"]}>
                                    <YakitCombinationSearch
                                        beforeOptionWidth={100}
                                        valueBeforeOption={search.type}
                                        afterModuleType='input'
                                        addonBeforeOption={searchOptions}
                                        onSelectBeforeOption={onSelectBeforeOption}
                                        inputSearchModuleTypeProps={{
                                            value: searchValue,
                                            onChange: onValueChange,
                                            onSearch: onSearch
                                        }}
                                    />
                                    <YakitDropdownMenu
                                        menu={{
                                            data: rateRemoveList,
                                            onClick: ({key}) => {
                                                onFastRemove(key)
                                            }
                                        }}
                                        dropdown={{
                                            trigger: ["click"],
                                            placement: "bottom"
                                        }}
                                    >
                                        <YakitButton className={styles["btn-style"]} type='outline1'>
                                            快捷删除
                                        </YakitButton>
                                    </YakitDropdownMenu>
                                    <YakitPopconfirm title={"确定删除吗?"} onConfirm={onBatchRemove}>
                                        <YakitButton danger type='outline1' disabled={disabledBatchRemove}>
                                            批量删除
                                        </YakitButton>
                                    </YakitPopconfirm>
                                    <YakitDropdownMenu
                                        menu={{
                                            data: batchRefreshMenuData,
                                            onClick: ({key}) => {
                                                onRefreshMenuSelect(key)
                                            }
                                        }}
                                        dropdown={{
                                            trigger: ["hover"],
                                            placement: "bottom"
                                        }}
                                    >
                                        <Badge dot={offsetData.length > 0} offset={[-5, 4]}>
                                            <YakitButton type='text2' icon={<OutlineRefreshIcon />} />
                                        </Badge>
                                    </YakitDropdownMenu>
                                </div>
                            </div>
                            <div className={styles["memory-table-subTitle"]}>
                                AI 长期记忆中心：通过 C.O.R.E.P.A.T 维度向量实现记忆的质量评估与动态检索。
                            </div>
                        </div>
                    }
                    renderKey='Id'
                    data={tableData}
                    pagination={{
                        total: tableTotal,
                        limit: pagination.Limit,
                        page: pagination.Page,
                        onChange: (page, limit) => {}
                    }}
                    rowSelection={{
                        isAll: allCheck,
                        type: "checkbox",
                        selectedRowKeys,
                        onSelectAll,
                        onChangeCheckboxSingle
                    }}
                    columns={columns}
                    onSetCurrentRow={onSetCurrentRow}
                    enableDrag={true}
                    useUpAndDown
                    onChange={onTableChange}
                />
            </div>
            {currentSelectItem && (
                <div className={styles["memory-detail"]}>
                    <div className={styles["memory-detail-header"]}>
                        <div>详情</div>
                        <YakitButton type='text2' icon={<OutlineXIcon />} onClick={() => setCurrentItem(undefined)} />
                    </div>
                    <div className={styles["memory-detail-content"]}>
                        <AIMemoryContent item={currentSelectItem} />
                    </div>
                </div>
            )}
            <NoPromptHint
                visible={visibleRemove}
                title='删除确认'
                content={`是否确认删除${removeItemRef.current?.label}的所有相关记忆,删除后不可恢复`}
                cacheKey={RemoteAIAgentGV.AIMemoryRemove}
                onCallback={delHintCallback}
            />
        </div>
    )
})
const ratingList: RatingListItem[] = [
    {
        id: "1",
        keyName: "CScore",
        label: "C",
        max: 1.0,
        min: 0.0
    },
    {
        id: "2",
        keyName: "OScore",
        label: "O",
        max: 1.0,
        min: 0.0
    },
    {
        id: "3",
        keyName: "RScore",
        label: "R",
        max: 1.0,
        min: 0.0
    },
    {
        id: "4",
        keyName: "EScore",
        label: "E",
        max: 1.0,
        min: 0.0
    },
    {
        id: "5",
        keyName: "PScore",
        label: "P",
        max: 1.0,
        min: 0.0
    },
    {
        id: "6",
        keyName: "AScore",
        label: "A",
        max: 1.0,
        min: 0.0
    },
    {
        id: "7",
        keyName: "TScore",
        label: "T",
        max: 1.0,
        min: 0.0
    }
]

const rateOption: YakitSelectProps["options"] = [
    {
        label: "无",
        value: "none"
    },
    {
        label: "关键偏好",
        value: "must_aware"
    },
    {
        label: "重要经验",
        value: "action_tips"
    },
    {
        label: "高相关但低可信",
        value: "reliability_warning"
    },
    {
        label: "强关联线索",
        value: "connection_links"
    }
]

const COREPAT_DATA = [
    {l: "C", en: "Connectivity", cn: "关联度"},
    {l: "O", en: "Origin", cn: "来源与确定性"},
    {l: "R", en: "Relevance", cn: "相关性"},
    {l: "E", en: "Emotion", cn: "情感"},
    {l: "P", en: "Preference", cn: "个人偏好"},
    {l: "A", en: "Actionability", cn: "可操作性"},
    {l: "T", en: "Temporality", cn: "时效性"}
]
const MemoryQuery: React.FC<MemoryQueryProps> = React.memo((props) => {
    const [show, setShow] = useState<boolean>(true)
    const [tags, setTags] = useState<CountAIMemoryEntityTagsResponse["TagsCount"]>([])
    const [tagsLoading, setTagsLoading] = useState<boolean>(true)
    const [selectQuery, setSelectQuery] = useControllableValue<MemorySelectQuery>(props, {
        defaultValue: cloneDeep(defaultMemoryQuery),
        trigger: "setSelectQuery",
        valuePropName: "selectQuery"
    })
    const [rateMode, setRateMode] = useState<RateModeType>("none")
    const [tagMatchAll, setTagMatchAll] = useState<boolean>(selectQuery.tagMatchAll)
    const [selectRateList, setSelectRateList] = useState<MemorySelectQuery["rate"]>(cloneDeep(ratingList))
    const [selectAllRate, setSelectAllRate] = useState<boolean>(false)

    const leftSideRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(leftSideRef)
    useEffect(() => {
        if (inViewport) {
            getTags()
        }
    }, [inViewport])
    useEffect(() => {
        if (selectQuery.rate.length === 0) {
            setSelectRateList(cloneDeep(ratingList))
            setSelectAllRate(false)
        }
    }, [selectQuery.rate.length])
    const getTags = useDebounceFn(
        useMemoizedFn(() => {
            setTagsLoading(true)
            grpcCountAIMemoryEntityTags({})
                .then((res) => {
                    setTags(res?.TagsCount || [])
                })
                .finally(() =>
                    setTimeout(() => {
                        setTagsLoading(false)
                    }, 100)
                )
        }),
        {wait: 500, leading: true}
    ).run
    /**
     * @name 选择评分范围
     */
    const onSelectRate = useMemoizedFn((item: RatingListItem, checked: boolean) => {
        if (checked) {
            const rateItem = selectRateList.find((it) => it.id === item.id)
            if (rateItem) {
                setSelectQuery((prev) => ({
                    ...prev,
                    rate: [...prev.rate, rateItem]
                }))
            }
        } else {
            setSelectQuery((prev) => ({
                ...prev,
                rate: prev.rate.filter((ele) => ele.id !== item.id)
            }))
        }
    })
    /**
     * @name 选择标签
     */
    const onnSelectTag = useMemoizedFn((item, checked: boolean) => {
        if (checked) {
            setSelectQuery((prev) => ({
                ...prev,
                tags: [...prev.tags, item],
                tagMatchAll
            }))
        } else {
            setSelectQuery((prev) => ({
                ...prev,
                tags: prev.tags.filter((ele) => ele.Value !== item.Value),
                tagMatchAll
            }))
        }
    })
    const onTagMatchAll = useMemoizedFn((e: RadioChangeEvent) => {
        const {value} = e.target
        setTagMatchAll(value)
        if (selectQuery?.tags?.length > 0) {
            setSelectQuery((prev) => ({
                ...prev,
                tagMatchAll: value
            }))
        }
    })
    const onSliderChange = useMemoizedFn((val: number[], item: RatingListItem) => {
        const [min, max] = val
        const index = selectQuery.rate.findIndex((it) => it.id === item.id)
        if (index !== -1) {
            setSelectQuery((prev) => ({
                ...prev,
                rate: prev.rate.map((it) => {
                    if (it.id === item.id) {
                        return {
                            ...it,
                            min,
                            max
                        }
                    }
                    return it
                })
            }))
        }
        setSelectRateList((prev) => {
            return prev.map((it) => {
                if (it.id === item.id) {
                    return {
                        ...it,
                        min,
                        max
                    }
                }
                return it
            })
        })
    })
    const onResetRate = useMemoizedFn((e) => {
        e.stopPropagation()
        const newSelectRateList = ratingList
        setSelectQuery((prev) => ({
            ...prev,
            rate: []
        }))
        setSelectRateList([...newSelectRateList])
        setRateMode("none")
        setSelectAllRate(false)
    })
    const onResetTags = useMemoizedFn((e) => {
        e.stopPropagation()
        setSelectQuery((prev) => ({
            ...prev,
            tags: [],
            tagMatchAll: false
        }))
        setTagMatchAll(false)
    })

    const indeterminate = useCreation(() => {
        return !!selectQuery.rate.length && selectQuery.rate.length < ratingList.length
    }, [selectQuery.rate])

    const onSelectAllRate = useMemoizedFn((e) => {
        const {checked} = e.target
        if (checked) {
            setSelectQuery((prev) => ({
                ...prev,
                rate: cloneDeep(selectRateList)
            }))
        } else {
            setSelectQuery((prev) => ({
                ...prev,
                rate: []
            }))
        }
        setSelectAllRate(checked)
    })
    const onRateSelect = useMemoizedFn((val: RateModeType) => {
        let newSelectRateList: MemorySelectQuery["rate"] = []
        let newRateQuery: MemorySelectQuery["rate"] = []
        let r, p, a, o, c
        ratingList.forEach((ele) => {
            if (ele.keyName === "RScore") {
                r = ele
            }
            if (ele.keyName === "PScore") {
                p = ele
            }
            if (ele.keyName === "AScore") {
                a = ele
            }
            if (ele.keyName === "OScore") {
                o = ele
            }
            if (ele.keyName === "CScore") {
                c = ele
            }
        })
        switch (val) {
            case "must_aware":
                if (r && p) {
                    newRateQuery = [
                        {
                            ...r,
                            min: 0.7,
                            max: 1.0
                        },
                        {
                            ...p,
                            min: 0.75,
                            max: 1.0
                        }
                    ]
                    newSelectRateList = selectRateList
                        .filter((ele) => ele.keyName !== "RScore" && ele.keyName !== "PScore")
                        .concat(newRateQuery)
                }
                break
            case "action_tips":
                if (r && a) {
                    newRateQuery = [
                        {
                            ...r,
                            min: 0.45,
                            max: 1.0
                        },
                        {
                            ...a,
                            min: 0.8,
                            max: 1.0
                        }
                    ]
                    newSelectRateList = selectRateList
                        .filter((ele) => ele.keyName !== "RScore" && ele.keyName !== "AScore")
                        .concat(newRateQuery)
                }
                break
            case "reliability_warning":
                if (r && o) {
                    newRateQuery = [
                        {
                            ...r,
                            min: 7,
                            max: 1.0
                        },
                        {
                            ...o,
                            min: 0,
                            max: 0.4
                        }
                    ]
                    newSelectRateList = selectRateList
                        .filter((ele) => ele.keyName !== "RScore" && ele.keyName !== "OScore")
                        .concat(newRateQuery)
                }
                break

            case "connection_links":
                if (r && c) {
                    newRateQuery = [
                        {
                            ...r,
                            min: 0.48,
                            max: 1.0
                        },
                        {
                            ...c,
                            min: 0.8,
                            max: 1.0
                        }
                    ]
                    newSelectRateList = selectRateList
                        .filter((ele) => ele.keyName !== "RScore" && ele.keyName !== "CScore")
                        .concat(newRateQuery)
                }
                break
            case "none":
                newSelectRateList = cloneDeep(ratingList)
                break
            default:
                break
        }
        setSelectRateList([...newSelectRateList])
        setSelectQuery((prev) => ({
            ...prev,
            rate: [...newRateQuery]
        }))
        setRateMode(val)
    })
    const [rateSelectVisible, setRateSelectVisible] = useState<boolean>(false)
    return (
        <div
            className={classNames(styles["content-left-side"], {
                [styles["content-left-side-hidden"]]: !show
            })}
            ref={leftSideRef}
        >
            <div className={classNames(styles["memory-left-side"], {[styles["memory-left-side-hidden"]]: !show})}>
                <div className={styles["query"]}>
                    <div className={styles["query-header"]} onClick={() => setShow(false)}>
                        <ChevronleftButton /> 高级查询
                    </div>
                </div>
                <YakitCollapse defaultActiveKey={["ratingRange", "Tags"]} className={styles["memory-query-collapse"]}>
                    <YakitPanel
                        header={
                            <div className={styles["panel-header"]}>
                                <span>评分范围</span>
                                <Tooltip
                                    title={
                                        <div className={styles["panel-header-tooltip-title"]}>
                                            {COREPAT_DATA.map((item) => (
                                                <React.Fragment key={item.l}>
                                                    <span className={styles["tooltip-title-box-one"]}>{item.l}</span>
                                                    <span className={styles["tooltip-title-box-two"]}>{item.en}</span>
                                                    <span className={styles["tooltip-title-box-three"]} style={{}}>
                                                        {item.cn}
                                                    </span>
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    }
                                >
                                    <OutlineQuestionmarkcircleIcon />
                                </Tooltip>
                            </div>
                        }
                        extra={
                            <>
                                <YakitButton
                                    type='text'
                                    colors='danger'
                                    className={styles["btn-padding-right-0"]}
                                    onClick={onResetRate}
                                    size='small'
                                >
                                    重置
                                </YakitButton>
                            </>
                        }
                        key='ratingRange'
                    >
                        <div className={styles["select-rate-mode"]}>
                            <div className={styles["select-all"]}>
                                <YakitCheckbox
                                    checked={selectAllRate}
                                    indeterminate={indeterminate}
                                    onChange={onSelectAllRate}
                                />
                                全选
                            </div>
                            <Divider className={styles["divider"]} type='vertical' />
                            <div
                                className={classNames(styles["select-wrapper"], {
                                    [styles["select-wrapper-active"]]: rateSelectVisible
                                })}
                                tabIndex={1}
                            >
                                <div className={styles["select-before"]}>预设</div>
                                <YakitSelect
                                    bordered={false}
                                    options={rateOption}
                                    value={rateMode}
                                    onSelect={onRateSelect}
                                    wrapperClassName={styles["select"]}
                                    size='small'
                                    onDropdownVisibleChange={setRateSelectVisible}
                                />
                            </div>
                        </div>
                        {ratingList.map((item) => {
                            const checked = selectQuery?.rate?.findIndex((it) => it.id === item.id) !== -1
                            const values = selectRateList.find((it) => it.id === item.id)
                            const min = values?.min ?? 0
                            const max = values?.max ?? 1
                            return (
                                <div key={item.id} className={styles["rating-item"]}>
                                    <YakitCheckbox
                                        checked={checked}
                                        onChange={(e) => onSelectRate(item, e.target.checked)}
                                    />
                                    <span className={styles["item-label"]}>{item.label}</span>
                                    <div className={styles["slider-wrapper"]}>
                                        <Slider
                                            className={styles["slider"]}
                                            step={0.01}
                                            range
                                            value={[min, max]}
                                            min={0}
                                            max={1}
                                            onChange={(val) => onSliderChange(val, item)}
                                        />
                                        <span className={styles["slider-value"]}>
                                            {numeral(min).format("0.00")}~{numeral(max).format("0.00")}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </YakitPanel>
                    <YakitPanel
                        header={
                            <div className={styles["panel-header"]}>Tags{tagsLoading && <LoadingOutlined spin />}</div>
                        }
                        key='Tags'
                        extra={
                            <>
                                <YakitRadioButtons
                                    value={tagMatchAll}
                                    onChange={onTagMatchAll}
                                    buttonStyle='solid'
                                    options={[
                                        {label: "AND", value: true},
                                        {label: "OR", value: false}
                                    ]}
                                    size='small'
                                    className={styles["tag-match-radio"]}
                                />
                                <YakitButton
                                    type='text'
                                    colors='danger'
                                    className={styles["btn-padding-right-0"]}
                                    onClick={onResetTags}
                                    size='small'
                                >
                                    重置
                                </YakitButton>
                            </>
                        }
                    >
                        <div className={styles["tag-list"]}>
                            {tags.map((tagItem) => {
                                const checked = selectQuery?.tags?.findIndex((it) => it.Value === tagItem.Value) !== -1
                                return (
                                    <div
                                        key={tagItem.Value}
                                        className={classNames(styles["tag-item"], {
                                            [styles["tag-item-checked"]]: checked
                                        })}
                                    >
                                        <div
                                            className={styles["tag-label-wrapper"]}
                                            onClick={() => onnSelectTag(tagItem, !checked)}
                                        >
                                            <YakitCheckbox checked={checked} />
                                            <span className={styles["tag-label"]}>{tagItem.Value}</span>
                                        </div>
                                        <span className={styles["tag-total"]}>{tagItem.Total}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </YakitPanel>
                </YakitCollapse>
            </div>
            <div className={styles["open-wrapper"]} onClick={() => setShow(true)}>
                <ChevrondownButton />
                <div className={styles["text"]}>高级查询</div>
            </div>
        </div>
    )
})

/**@deprecated UI发送变化，暂时不需要了 */
const AITextarea: React.FC<AITextareaProps> = React.memo((props) => {
    const {textProps} = props
    return (
        <div className={styles["query-input-wrapper"]}>
            <div className={styles["query-input-content"]}>
                <div className={styles["query-input"]}>
                    <OutlineSparklesColorsIcon />
                    <QSInputTextarea
                        placeholder='请输入关注内容，Al 将帮你聚焦相关记忆...'
                        className={styles["query-input-text-area"]}
                        {...textProps}
                    />
                </div>
                <div className={styles["query-input-footer"]}>
                    <Divider type='vertical' />
                    <YakitButton
                        radius='50%'
                        icon={<OutlineArrowupIcon />}
                        onClick={(e) => {
                            e.stopPropagation()
                        }}
                    />
                </div>
            </div>
        </div>
    )
})
