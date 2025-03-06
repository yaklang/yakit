import React, {ForwardedRef, useEffect, useImperativeHandle, useRef, useState} from "react"
import {defTablePage} from "./constants"
import {API} from "@/services/swagger/resposeType"
import {useCreation, useDebounceFn, useInViewport, useMemoizedFn, useUpdateEffect} from "ahooks"
import {YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteMisstatementGV} from "@/enums/misstatement"
import {Tooltip} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineCloseIcon,
    OutlineFilterIcon,
    OutlineOpenIcon,
    OutlineRefreshIcon,
    OutlineSearchIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import classNames from "classnames"
import {FieldGroup} from "../risks/YakitRiskTable/utils"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {
    httpAuditHoleGroup,
    httpAuditHoleTableColumn,
    httpAuditHoleTags,
    httpDelAuditHoleList,
    httpDelRiskList,
    httpGetAuditHoleList,
    httpGetRiskList,
    httpRiskFeedBackGroup,
    httpRiskFeedBackTags,
    httpRiskFeedBackType,
    RiskFeedBackRequest
} from "./utils"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {FieldName} from "../risks/RiskTable"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitTagColor} from "@/components/yakitUI/YakitTag/YakitTagType"
import {formatTimestamp} from "@/utils/timeUtil"
import {SeverityMapTag} from "../risks/YakitRiskTable/YakitRiskTable"
import {MisstatementAuditRiskDetails, MisstatementRiskDetails} from "./MisstatementDetail/MisstatementDetail"
import useGetSetState from "../pluginHub/hooks/useGetSetState"
import {yakitNotify} from "@/utils/notification"
import styles from "./Misstatement.module.scss"

const batchRefreshMenuData: YakitMenuItemProps[] = [
    {
        key: "noResetRefresh",
        label: "仅刷新"
    },
    {
        key: "resetRefresh",
        label: "重置查询条件刷新"
    }
]

type MisstatementType = "risk" | "auditHole"
interface MisstatementProp {}
export const Misstatement: React.FC<MisstatementProp> = (props) => {
    const ref = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(ref)
    const [advancedQuery, setAdvancedQuery] = useState<boolean>(true)
    const [tableType, setTableType, getTableType] = useGetSetState<MisstatementType>("risk")
    const [keywords, setKeywords] = useState<string>("")
    const misstatementQueryRef = useRef<MisstatementQueryPropsRef>(null)
    const [selectStatisticsList, setSelectStatisticsList] = useState<string[]>([])

    const [tableQuery, setTableQuery] = useState<RiskFeedBackRequest | API.SSARiskWhereRequest>({...defTablePage})
    const [tableResponse, setTableResponse] = useState<API.RiskFeedBackResponse | API.SSARiskResponse>({
        data: [],
        pagemeta: {
            page: 1,
            limit: 20,
            total: 0,
            total_page: 0
        }
    })
    const isInitRequestRef = useRef<boolean>(true)
    const [isRefresh, setIsRefresh] = useState<boolean>(false)
    const [scrollToIndex, setScrollToIndex] = useState<number | string>()
    const [tableLoading, setTableLoading] = useState(false)
    const [currentSelectItem, setCurrentSelectItem] = useState<API.RiskFeedBackData | API.SSARiskResponseData>()
    const [excludeColumnsKey, setExcludeColumnsKey] = useState<string[]>(["programName"])

    const [riskTypeVerbose, setRiskTypeVerbose] = useState<FieldName[]>([])
    const [tag, setTag] = useState<FieldGroup[]>([])
    const [riskProgramList, setRiskProgramList] = useState<string[]>([])
    const getRiskType = useMemoizedFn(() => {
        setRiskTypeVerbose([])
        if (getTableType() === "risk") {
            httpRiskFeedBackType().then((res) => {
                const data = res.data || []
                const arr = data.map((item) => ({Name: item.name, Verbose: item.verbose, Total: item.total, Delta: 0}))
                setRiskTypeVerbose(arr as FieldName[])
            })
        } else {
            httpAuditHoleTableColumn({type: "risk_type"}).then((res) => {
                const data = res.data || []
                setRiskTypeVerbose(data.map((item) => ({Name: item, Verbose: item, Total: 0, Delta: 0})))
            })
        }
    })
    const getRiskTags = useMemoizedFn(() => {
        setTag([])
        if (getTableType() === "risk") {
            httpRiskFeedBackTags().then((res) => {
                const data = res.data || []
                setTag(data.map((item) => ({Name: item, Total: 0})))
            })
        } else {
            httpAuditHoleTags().then((res) => {
                const data = res.data || []
                setTag(data.map((item) => ({Name: item, Total: 0})))
            })
        }
    })
    const getRiskProject = useMemoizedFn(() => {
        setRiskProgramList([])
        httpAuditHoleTableColumn({type: "program_name"}).then((res) => {
            const data = res.data || []
            setRiskProgramList(data)
        })
    })
    const columns: ColumnsTypeProps[] = useCreation<ColumnsTypeProps[]>(() => {
        const tagTable = tag.map((item) => ({
            value: item.Name,
            label: item.Name,
            total: item.Total
        }))
        const riskTypeVerboseTable = riskTypeVerbose.map((item) => ({
            value: item.Verbose,
            label: item.Verbose,
            total: item.Total
        }))
        const riskProgramTable = riskProgramList.map((item) => ({
            value: item,
            label: item
        }))

        const columnArr: ColumnsTypeProps[] = [
            {
                title: "序号",
                dataKey: "id",
                fixed: "left",
                ellipsis: false,
                width: 96,
                enableDrag: false,
                sorterProps: {
                    sorter: true,
                    sorterKey: "id"
                }
            },
            {
                title: "标题",
                dataKey: "titleVerbose",
                filterProps: {
                    filterKey: "title",
                    filtersType: "input",
                    filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />
                },
                render: (_, record) => record?.titleVerbose || record.title || "-"
            },
            {
                title: "类型",
                dataKey: "riskTypeVerbose",
                width: 100,
                filterProps: {
                    filterKey: tableType === "risk" ? "riskTypeList" : "riskType",
                    filtersType: "select",
                    filterMultiple: true,
                    filters: riskTypeVerboseTable,
                    filterIcon: <OutlineFilterIcon className={styles["filter-icon"]} onClick={getRiskType} />
                }
            },
            {
                title: "等级",
                dataKey: "severity",
                width: 75,
                align: "center",
                render: (_, i) => {
                    const title = SeverityMapTag.filter((item) => item.key.includes(i.severity || ""))[0]
                    return (
                        <YakitTag color={title?.tag as YakitTagColor} className={styles["table-severity-tag"]}>
                            {title ? title.name : i.severity || "-"}
                        </YakitTag>
                    )
                },
                filterProps: {
                    filterKey: tableType === "risk" ? "severityList" : "severity",
                    filtersType: "select",
                    filterMultiple: true,
                    filters: [
                        {
                            value: "critical",
                            label: "严重"
                        },
                        {
                            value: "high",
                            label: "高危"
                        },
                        {
                            value: "warning",
                            label: "中危"
                        },
                        {
                            value: "low",
                            label: "低危"
                        },
                        {
                            value: "info",
                            label: "信息"
                        }
                    ]
                }
            },
            {
                title: "IP",
                dataKey: "ip",
                width: 120,
                filterProps: {
                    filterKey: "net_work",
                    filtersType: "input",
                    filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />
                }
            },
            {
                title: "url",
                dataKey: "url"
            },
            {
                title: "所属项目",
                dataKey: "programName",
                filterProps: {
                    filterKey: "programName",
                    filtersType: "select",
                    filterMultiple: true,
                    filters: riskProgramTable,
                    filterIcon: <OutlineFilterIcon className={styles["filter-icon"]} onClick={getRiskProject} />
                }
            },
            {
                title: "处置状态",
                dataKey: "tags",
                minWidth: 120,
                filterProps: {
                    filterKey: tableType === "risk" ? "tagList" : "tags",
                    filtersType: "select",
                    filterMultiple: true,
                    filters: tagTable,
                    filterIcon: <OutlineFilterIcon className={styles["filter-icon"]} onClick={getRiskTags} />
                },
                render: (text, record, index) => (
                    <>
                        <div className={styles["table-tag"]}>
                            <span>{!!text ? text.replaceAll("|", ",") : "-"}</span>
                        </div>
                    </>
                )
            },
            {
                title: "发现时间",
                dataKey: tableType === "risk" ? "riskCreatedAt" : "ssaRiskCreatedAt",
                width: 180,
                render: (text) => (text ? formatTimestamp(text) : "-")
            },
            {
                title: "提交时间",
                dataKey: "created_at",
                width: 180,
                fixed: "right",
                render: (text) => (text ? formatTimestamp(text) : "-")
            },
            {
                title: "操作",
                dataKey: "action",
                width: 60,
                fixed: "right",
                render: (text, record) => (
                    <>
                        <YakitButton
                            type='text'
                            danger
                            onClick={(e) => {
                                e.stopPropagation()
                                onRemoveSingle(record)
                            }}
                            icon={<OutlineTrashIcon />}
                        />
                    </>
                )
            }
        ]
        return columnArr.filter((ele) => !excludeColumnsKey.includes(ele.dataKey))
    }, [tableType, riskTypeVerbose, tag, riskProgramList, excludeColumnsKey])

    const onRemoveSingle = useMemoizedFn((record: API.RiskFeedBackData | API.SSARiskResponseData) => {
        if (getTableType() === "risk") {
            const riskHash = (record as API.RiskFeedBackData).riskHash
            const delParams: API.GetRiskWhere = {
                hash: [riskHash]
            }
            httpDelRiskList(delParams).then((res) => {
                if (res.ok) {
                    yakitNotify("success", "删除成功")
                    setTableResponse((prev) => {
                        return {
                            data: (prev.data as API.RiskFeedBackData[]).filter((item) => item.riskHash !== riskHash),
                            pagemeta: {
                                ...prev.pagemeta,
                                total: prev.pagemeta.total - 1 > 0 ? prev.pagemeta.total - 1 : 0
                            }
                        }
                    })
                    misstatementQueryRef.current?.onRefreshGroup()
                }
            })
        } else {
            const delParams: API.SSARiskWhere = {
                id: [record.id]
            }
            httpDelAuditHoleList(delParams).then((res) => {
                if (res.ok) {
                    yakitNotify("success", "删除成功")
                    setTableResponse((prev) => {
                        return {
                            data: (prev.data as API.SSARiskResponseData[]).filter((item) => item.id !== record.id),
                            pagemeta: {
                                ...prev.pagemeta,
                                total: prev.pagemeta.total - 1 > 0 ? prev.pagemeta.total - 1 : 0
                            }
                        }
                    })
                    misstatementQueryRef.current?.onRefreshGroup()
                }
            })
        }
    })

    const queyChangeUpdateData = useDebounceFn(
        () => {
            // 初次不通过此处请求数据
            if (!isInitRequestRef.current) {
                update(1)
            }
        },
        {wait: 300}
    ).run
    useUpdateEffect(() => {
        queyChangeUpdateData()
    }, [tableQuery])
    const onTableChange = useMemoizedFn((page: number, limit: number, newSort: SortProps, filter: any) => {
        let sort = {...newSort}
        if (sort.order === "none") {
            sort.order = "desc"
            sort.orderBy = "id"
        }

        const newQuery = {
            ...tableQuery,
            ...filter,
            order_by: sort.orderBy,
            order: sort.order
        }

        if (tableType === "risk") {
            if (filter.riskTypeList) {
                newQuery.risk_type = filter.riskTypeList.join(",")
            }
            if (filter.severityList) {
                newQuery.severity = filter.severityList.join(",")
            }
            if (filter.tagList) {
                newQuery.tags = filter.tagList.join(",")
            }
        }

        setTableQuery(newQuery)
    })

    useEffect(() => {
        if (inViewport) {
            update(1)
        }
    }, [inViewport])

    const update = useMemoizedFn((page: number) => {
        const isInit = page === 1
        isInitRequestRef.current = false
        if (isInit) {
            setTableLoading(true)
        }

        if (tableType === "risk") {
            const params = {
                ...(tableQuery as RiskFeedBackRequest),
                page
            }
            delete params.riskTypeList
            delete params.severityList
            delete params.tagList
            httpGetRiskList(params)
                .then((res) => {
                    const data = res.data || []
                    const d = isInit ? data : (tableResponse.data as API.RiskFeedBackData[]).concat(data)
                    setTableResponse({
                        ...res,
                        data: d as API.RiskFeedBackData[]
                    })
                    if (isInit) {
                        setIsRefresh((prevIsRefresh) => !prevIsRefresh)
                    }
                })
                .finally(() => {
                    setTableLoading(false)
                })
        } else {
            const params = {
                ...(tableQuery as API.SSARiskWhereRequest),
                page
            }
            httpGetAuditHoleList(params)
                .then((res) => {
                    const data = res.data || []
                    const d = isInit ? data : (tableResponse.data as API.SSARiskResponseData[]).concat(data)
                    setTableResponse({
                        ...res,
                        data: d as API.SSARiskResponseData[]
                    })
                    if (isInit) {
                        setIsRefresh((prevIsRefresh) => !prevIsRefresh)
                    }
                })
                .finally(() => {
                    setTableLoading(false)
                })
        }
    })

    const onSetCurrentRow = useMemoizedFn((val?: API.RiskFeedBackData | API.SSARiskResponseData) => {
        if (!val) {
            setCurrentSelectItem(undefined)
            return
        }
        if (val?.id !== currentSelectItem?.id) {
            setCurrentSelectItem(val)
        }
    })
    const ResizeBoxProps = useCreation(() => {
        let p = {
            firstRatio: "50%",
            secondRatio: "50%"
        }
        if (!currentSelectItem?.id) {
            p.secondRatio = "0%"
            p.firstRatio = "100%"
        }
        return p
    }, [currentSelectItem])

    const onClickIP = useMemoizedFn((info: API.RiskFeedBackData | API.SSARiskResponseData) => {
        const index = tableResponse.data.findIndex((item) => item.id === info.id)
        // 加随机值触发更新渲染执行表格跳转方法
        if (index !== -1) setScrollToIndex(index + "_" + Math.random())
    })

    // 获取筛选展示状态
    useEffect(() => {
        getRemoteValue(RemoteMisstatementGV.MisstatementQueryShow).then((value: string) => {
            setAdvancedQuery(value !== "false")
        })
    }, [])
    const onSetQueryShow = useMemoizedFn((val) => {
        setAdvancedQuery(val)
        setRemoteValue(RemoteMisstatementGV.MisstatementQueryShow, `${val}`)
    })

    // 统计数据筛选
    useEffect(() => {
        setSelectStatisticsList([])
    }, [tableType])
    const onSelectStatistics = useMemoizedFn((v: FieldGroup) => {
        let arr = selectStatisticsList.slice()
        if (arr.includes(v.Name)) {
            arr = arr.filter((i) => i !== v.Name)
        } else {
            arr.push(v.Name)
        }
        setSelectStatisticsList(arr)

        if (tableType === "risk") {
            setTableQuery((prev) => ({...prev, fromYakScript: arr.join(",")}))
        } else {
            setTableQuery((prev) => ({...prev, fromRule: arr}))
        }
    })

    // 关键字搜索
    const onSearch = useMemoizedFn((val) => {
        setTableQuery((prev) => ({...prev, search: val}))
    })
    const onPressEnter = useMemoizedFn(() => {
        onSearch(keywords)
    })

    // 刷新操作
    const onRefreshMenuSelect = useMemoizedFn((key: string) => {
        switch (key) {
            case "noResetRefresh":
                noResetRefresh()
                break
            case "resetRefresh":
                resetRefresh()
                break
            default:
                break
        }
    })
    const noResetRefresh = useMemoizedFn(() => {
        update(1)
    })
    const resetRefresh = useMemoizedFn(() => {
        setKeywords("")
        setTableQuery({...defTablePage})
    })

    return (
        <div className={styles["misstatement-page"]} ref={ref}>
            <MisstatementQuery
                ref={misstatementQueryRef}
                inViewport={inViewport}
                tableType={tableType}
                advancedQuery={advancedQuery}
                setAdvancedQuery={onSetQueryShow}
                selectList={selectStatisticsList}
                onSelect={onSelectStatistics}
            />
            <div
                className={styles["misstatement-page-right"]}
                style={{width: advancedQuery ? "calc(100% - 300px)" : "100%"}}
            >
                <div className={styles["renderTitle-wrapper"]}>
                    <div className={styles["renderTitle-wrapper-left"]}>
                        {!advancedQuery && (
                            <Tooltip title='展开筛选' placement='topLeft' overlayClassName='plugins-tooltip'>
                                <YakitButton
                                    type='text2'
                                    onClick={() => {
                                        onSetQueryShow(true)
                                    }}
                                    icon={<OutlineOpenIcon />}
                                ></YakitButton>
                            </Tooltip>
                        )}
                        <div className={styles["renderTitle-text"]}>误报提交记录</div>
                        <YakitRadioButtons
                            value={tableType}
                            onChange={(e) => {
                                const val = e.target.value
                                if (val === "risk") {
                                    setExcludeColumnsKey(["programName"])
                                } else {
                                    setExcludeColumnsKey(["ip", "url"])
                                }
                                setScrollToIndex(undefined)
                                setCurrentSelectItem(undefined)
                                setTableType(val)
                                setKeywords("")
                                setTableQuery({...defTablePage})
                            }}
                            buttonStyle='solid'
                            options={[
                                {
                                    value: "risk",
                                    label: "插件"
                                },
                                {
                                    value: "auditHole",
                                    label: "规则"
                                }
                            ]}
                        />
                        <div className={styles["virtual-table-heard-right"]}>
                            <div className={styles["virtual-table-heard-right-item"]}>
                                <span className={styles["virtual-table-heard-right-text"]}>Total</span>
                                <span className={styles["virtual-table-heard-right-number"]}>
                                    {tableResponse.pagemeta.total}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className={styles["renderTitle-wrapper-right"]}>
                        <YakitInput.Search
                            value={keywords}
                            onChange={(e) => setKeywords(e.target.value)}
                            placeholder='请输入关键词搜索'
                            onSearch={onSearch}
                            onPressEnter={onPressEnter}
                        />
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
                            <YakitButton type='text2' icon={<OutlineRefreshIcon />} />
                        </YakitDropdownMenu>
                    </div>
                </div>
                <div className={styles["misstatement-table"]}>
                    <div className={styles["yakit-misstatement-table"]}>
                        <YakitResizeBox
                            firstMinSize={160}
                            secondMinSize={200}
                            isVer={true}
                            lineStyle={{display: !!currentSelectItem?.id ? "" : "none"}}
                            lineDirection='bottom'
                            secondNodeStyle={{
                                display: !currentSelectItem?.id ? "none" : "",
                                padding: !currentSelectItem?.id ? 0 : undefined
                            }}
                            firstNode={
                                <TableVirtualResize<API.RiskFeedBackData | API.SSARiskResponseData>
                                    key={tableType}
                                    query={tableQuery}
                                    scrollToIndex={scrollToIndex}
                                    loading={tableLoading}
                                    isRefresh={isRefresh}
                                    isShowTitle={false}
                                    renderKey='id'
                                    data={tableResponse.data}
                                    pagination={{
                                        total: tableResponse.pagemeta.total,
                                        limit: tableResponse.pagemeta.limit,
                                        page: tableResponse.pagemeta.page,
                                        onChange: (page) => update(page)
                                    }}
                                    columns={columns}
                                    onSetCurrentRow={onSetCurrentRow}
                                    enableDrag={true}
                                    useUpAndDown
                                    onChange={onTableChange}
                                />
                            }
                            secondNode={
                                currentSelectItem && (
                                    <>
                                        {tableType === "risk" ? (
                                            <MisstatementRiskDetails<API.RiskFeedBackData>
                                                info={currentSelectItem as API.RiskFeedBackData}
                                                onClickIP={onClickIP}
                                                className={styles["yakit-misstatement-details"]}
                                                border={true}
                                            />
                                        ) : (
                                            <MisstatementAuditRiskDetails<API.SSARiskResponseData>
                                                info={currentSelectItem as API.SSARiskResponseData}
                                                onClickIP={onClickIP}
                                                className={styles["yakit-misstatement-details"]}
                                                border={true}
                                            />
                                        )}
                                    </>
                                )
                            }
                            {...ResizeBoxProps}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

interface MisstatementQueryPropsRef {
    onRefreshGroup: () => void
}
interface MisstatementQueryProps {
    ref: ForwardedRef<MisstatementQueryPropsRef>
    inViewport: boolean
    tableType: MisstatementType
    advancedQuery: boolean
    setAdvancedQuery: (b: boolean) => void
    selectList: string[]
    onSelect: (v: FieldGroup) => void
}
const MisstatementQuery: React.FC<MisstatementQueryProps> = React.forwardRef((props, ref) => {
    const {inViewport, tableType, advancedQuery, setAdvancedQuery, selectList, onSelect} = props
    const [list, setList] = useState<FieldGroup[]>([])

    useImperativeHandle(
        ref,
        () => ({
            onRefreshGroup: onRefresh
        }),
        []
    )

    const onClose = useMemoizedFn(() => {
        setAdvancedQuery(false)
    })

    useEffect(() => {
        if (inViewport) {
            onRefresh()
        }
    }, [tableType, inViewport])

    const onRefresh = useMemoizedFn(() => {
        setList([])
        if (tableType === "risk") {
            httpRiskFeedBackGroup().then((res) => {
                const data = res.data || []
                const arr = data
                    .map((item) => ({Name: item.name || "", Total: item.total || 0}))
                    .sort((a, b) => b.Total - a.Total)
                setList(arr)
            })
        } else {
            httpAuditHoleGroup().then((res) => {
                const data = res.data || []
                const arr = data
                    .map((item) => ({Name: item.name || "", Total: item.total || 0}))
                    .sort((a, b) => b.Total - a.Total)
                setList(arr)
            })
        }
    })

    return (
        <div
            className={classNames(styles["misstatement-query"], {
                [styles["misstatement-query-hidden"]]: !advancedQuery
            })}
        >
            <div className={styles["misstatement-query-heard"]}>
                <span>高级查询</span>
                <Tooltip title='收起筛选' placement='top' overlayClassName='plugins-tooltip'>
                    <YakitButton type='text2' onClick={onClose} icon={<OutlineCloseIcon />}></YakitButton>
                </Tooltip>
            </div>
            <div className={styles["misstatement-query-body"]}>
                <MisstatementList
                    tableType={tableType}
                    list={list}
                    selectList={selectList}
                    onSelect={onSelect}
                    onRefresh={onRefresh}
                />
                <div className={styles["to-end"]}>已经到底啦～</div>
            </div>
        </div>
    )
})

interface MisstatementListProps {
    tableType: MisstatementType
    list: FieldGroup[]
    selectList: string[]
    onSelect: (v: FieldGroup) => void
    onRefresh: () => void
}
const MisstatementList: React.FC<MisstatementListProps> = React.memo((props) => {
    const {tableType, list, onSelect, selectList, onRefresh} = props

    return (
        <div className={styles["misstatement-list-body"]}>
            <div className={styles["misstatement-list-heard"]}>
                <div className={styles["misstatement-list-heard-title"]}>
                    {tableType === "risk" ? "插件" : "代码审计规则"}误报数统计
                </div>
                <YakitButton
                    type='text2'
                    className={styles["btn-padding-right-0"]}
                    icon={<OutlineRefreshIcon />}
                    onClick={onRefresh}
                />
            </div>
            <div className={styles["misstatement-list-content"]}>
                <RollingLoadList<FieldGroup>
                    data={list}
                    page={-1}
                    hasMore={false}
                    loadMoreData={() => {}}
                    loading={false}
                    rowKey='value'
                    defItemHeight={32}
                    renderRow={(record, index: number) => (
                        <MisstatementListItem
                            key={index}
                            item={record}
                            onSelect={onSelect}
                            isSelect={selectList.includes(record.Name)}
                        />
                    )}
                />
            </div>
        </div>
    )
})
interface MisstatementListItemProps {
    item: FieldGroup
    isSelect: boolean
    onSelect: (v: FieldGroup) => void
}
const MisstatementListItem: React.FC<MisstatementListItemProps> = React.memo((props) => {
    const {item, onSelect, isSelect} = props
    return (
        <div
            className={classNames(styles["misstatement-list-item"], {
                [styles["misstatement-list-item-active"]]: isSelect
            })}
            onClick={() => onSelect(item)}
        >
            <div className={classNames(styles["misstatement-list-item-label"], "content-ellipsis")} title={item.Name}>
                {item.Name}
            </div>
            <div className={styles["misstatement-list-item-value"]}>{item.Total}</div>
        </div>
    )
})
