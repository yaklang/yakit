import React, {useEffect, useMemo, useRef, useState} from "react"
import {
    YakitRiskSelectTagProps,
    YakitAuditHoleTableProps,
    YakURLDataItemProps,
    SSARisk,
    DeleteSSARisksRequest,
    QuerySSARisksRequest,
    YakitAuditRiskDetailsProps
} from "./YakitAuditHoleTableType"
import styles from "./YakitAuditHoleTable.module.scss"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {Badge, Divider, Form, Tooltip} from "antd"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useCreation, useInViewport, useMemoizedFn, useUpdateEffect} from "ahooks"
import {YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {
    OutlineChevrondownIcon,
    OutlineEyeIcon,
    OutlineOpenIcon,
    OutlineRefreshIcon,
    OutlineSearchIcon,
    OutlineTerminalIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {formatTimestamp} from "@/utils/timeUtil"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {
    GroupTableColumnRequest,
    UpdateSSARiskTagsRequest,
    apiDeleteSSARisks,
    apiGroupTableColumn,
    apiNewRiskRead,
    apiQuerySSARisks,
    apiUpdateSSARiskTags
} from "./utils"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitTagColor} from "@/components/yakitUI/YakitTag/YakitTagType"
import {YakitResizeBox, YakitResizeBoxProps} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import classNames from "classnames"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import emiter from "@/utils/eventBus/eventBus"
import {FuncBtn} from "@/pages/plugins/funcTemplate"
import {YakitRoute} from "@/enums/yakitRoute"
import {AuditCodePageInfoProps} from "@/store/pageInfo"
import ReactResizeDetector from "react-resize-detector"
import {FieldName} from "@/pages/risks/RiskTable"
import {
    IconSolidDefaultRiskIcon,
    IconSolidHighRiskIcon,
    IconSolidInfoRiskIcon,
    IconSolidLowRiskIcon,
    IconSolidMediumRiskIcon,
    IconSolidSeriousIcon
} from "@/pages/risks/icon"
import useVirtualTableHook from "@/hook/useVirtualTableHook/useVirtualTableHook"
import {AuditResultCollapse, AuditResultDescribe} from "@/pages/risks/YakitRiskTable/YakitRiskTable"
import {CodeRangeProps} from "@/pages/yakRunnerAuditCode/RightAuditDetail/RightAuditDetail"
import {VirtualPaging} from "@/hook/useVirtualTableHook/useVirtualTableHookType"

export const defQuerySSARisksRequest: QuerySSARisksRequest = {
    Pagination: {Page: 1, Limit: 20, OrderBy: "id", Order: "desc"},
    Filter: {}
}

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

/**name字段里面的内容不可随意更改，与查询条件有关 */
export const SeverityMapTag = [
    {
        key: ["info", "fingerprint", "infof", "default"],
        value: "title-info",
        name: "信息",
        tag: "success"
    },
    {key: ["low"], value: "title-low", name: "低危", tag: "warning"},
    {
        key: ["middle", "warn", "warning", "medium"],
        value: "title-middle",
        name: "中危",
        tag: "info"
    },
    {key: ["high"], value: "title-high", name: "高危", tag: "danger"},
    {
        key: ["fatal", "critical", "panic"],
        value: "title-fatal",
        name: "严重",
        tag: "serious"
    }
]

const initResDataFun = (data: SSARisk[]) => {
    const newData = data.map((ele) => ({
        ...ele,
        cellClassName: ele.IsRead ? "" : styles["yakit-ssa-risk-table-cell-unread"]
    }))
    return newData
}

export const YakitAuditHoleTable: React.FC<YakitAuditHoleTableProps> = React.memo((props) => {
    const {
        advancedQuery,
        setAdvancedQuery,
        setRiskLoading,
        renderTitle,
        riskWrapperClassName = "",
        tableVirtualResizeProps,
        excludeColumnsKey = [],
        query,
        setQuery,
        setAllTotal
    } = props

    const [isRefresh, setIsRefresh] = useState<boolean>(false)
    const [scrollToIndex, setScrollToIndex] = useState<number>()
    const [keywords, setKeywords] = useState<string>("")
    const [type, setType] = useState<"all" | "unread">("all")
    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [selectList, setSelectList] = useState<SSARisk[]>([])
    const [currentSelectItem, setCurrentSelectItem] = useState<SSARisk>()

    const [riskTypeVerbose, setRiskTypeVerbose] = useState<string[]>([])
    const [riskProgramList, setRiskProgramList] = useState<string[]>([])

    const [Pagination, setPagination] = useState<VirtualPaging>()

    const onFirst = useMemoizedFn(() => {
        setIsRefresh(!isRefresh)
        setSelectList([])
        setAllCheck(false)
        setCurrentSelectItem(undefined)
    })

    // 此处为table的表格数据 使用此hook需满足与后端约定的请求、响应格式
    const tableBoxRef = useRef<HTMLDivElement>(null)
    const tableRef = useRef<any>(null)
    const boxHeightRef = useRef<number>()
    const [tableParams, tableData, tableTotal, pagination, tableLoading, offsetData, debugVirtualTableEvent] =
        useVirtualTableHook<QuerySSARisksRequest, SSARisk>({
            tableBoxRef,
            tableRef,
            boxHeightRef,
            grpcFun: apiQuerySSARisks,
            initResDataFun,
            onFirst
        })

    useUpdateEffect(() => {
        setAllTotal && setAllTotal(tableTotal)
    }, [tableTotal])

    useUpdateEffect(() => {
        const newParams: QuerySSARisksRequest = {
            Pagination: {
                ...tableParams.Pagination,
                ...Pagination
            },
            Filter: {
                ...tableParams.Filter,
                ...query,
                Severity: query.Severity ? query.Severity : []
            }
        }
        debugVirtualTableEvent.setP(newParams)
    }, [query, Pagination])

    // 选中插件的数量
    const selectNum = useMemo(() => {
        if (allCheck) return tableTotal
        else return selectList.length
    }, [allCheck, selectList, tableTotal])

    const [inViewport = true] = useInViewport(tableBoxRef)
    useEffect(() => {
        if (inViewport) {
            getRiskType()
            getRiskProject()
        }
    }, [inViewport])

    useUpdateEffect(() => {
        debugVirtualTableEvent.setP({
            ...tableParams,
            Filter: {
                ...tableParams.Filter,
                IsRead: type === "all" ? 0 : -1
            }
        })
    }, [type])

    useEffect(() => {
        // 组件存在既不卸载
        emiter.on("onRefreshQuerySSARisks", onStartInterval)
        return () => {
            emiter.off("onRefreshQuerySSARisks", onStartInterval)
        }
    }, [])

    /**开启实时数据刷新 */
    const onStartInterval = useMemoizedFn((data) => {
        try {
            const updateData = JSON.parse(data)
            const {RuntimeID} = query
            const runTimeId = RuntimeID?.[0]
            // 没有RuntimeID时直接更新
            if (!runTimeId) {
                debugVirtualTableEvent.startT()
            }
            if (typeof updateData !== "string" && updateData.task_id === runTimeId) {
                if (updateData.action === "create") {
                    debugVirtualTableEvent.startT()
                }
            }
        } catch (error) {}
    })

    const columns: ColumnsTypeProps[] = useCreation<ColumnsTypeProps[]>(() => {
        const riskTypeVerboseTable = riskTypeVerbose.map((item) => ({
            value: item,
            label: item
        }))

        const riskProgramTable = riskProgramList.map((item) => ({
            value: item,
            label: item
        }))
        const columnArr: ColumnsTypeProps[] = [
            {
                title: "序号",
                dataKey: "Id",
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
                dataKey: "TitleVerbose",
                filterProps: {
                    filterKey: "Title",
                    filtersType: "input",
                    filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />
                },
                render: (_, record) => record?.TitleVerbose || record.Title || "-"
            },
            {
                title: "类型",
                dataKey: "RiskTypeVerbose",
                filterProps: {
                    filterKey: "RiskType",
                    filtersType: "select",
                    filterMultiple: true,
                    filters: riskTypeVerboseTable
                }
            },
            {
                title: "等级",
                dataKey: "Severity",
                width: 75,
                align: "center",
                render: (_, i: SSARisk) => {
                    const title = SeverityMapTag.filter((item) => item.key.includes(i.Severity || ""))[0]
                    return (
                        <YakitTag color={title?.tag as YakitTagColor} className={styles["table-severity-tag"]}>
                            {title ? title.name : i.Severity || "-"}
                        </YakitTag>
                    )
                },
                filterProps: {
                    filterKey: "Severity",
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
                            value: "middle",
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
                title: "所属项目",
                dataKey: "ProgramName",
                filterProps: {
                    filterKey: "ProgramName",
                    filtersType: "select",
                    filterMultiple: true,
                    filters: riskProgramTable
                }
            },
            {
                title: "处置状态",
                dataKey: "Tags",
                filterProps: {
                    filterKey: "Tags",
                    filtersType: "select",
                    filterMultiple: true,
                    filters: defaultTags
                },
                minWidth: 120,
                render: (text, record, index) => (
                    <>
                        <div
                            className={styles["table-tag"]}
                            onClick={(e) => {
                                onOpenSelect(record)
                            }}
                        >
                            <span>{!!text ? text.replaceAll("|", ",") : "-"}</span>
                            <OutlineChevrondownIcon className={styles["table-tag-icon"]} />
                        </div>
                    </>
                )
            },
            {
                title: "发现时间",
                dataKey: "CreatedAt",
                render: (text) => (text ? formatTimestamp(text) : "-")
            },
            {
                title: "操作",
                dataKey: "action",
                width: 100,
                fixed: "right",
                render: (text, record: SSARisk, index) => (
                    <>
                        <YakitButton
                            type='text'
                            danger
                            onClick={(e) => {
                                e.stopPropagation()
                                onRemoveSingle(record.Id)
                            }}
                            icon={<OutlineTrashIcon />}
                        />
                        <Divider type='vertical' />
                        <Tooltip title={"在代码审计中打开"}>
                            <YakitButton
                                type='text'
                                icon={<OutlineTerminalIcon />}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    const params: AuditCodePageInfoProps = {
                                        Schema: "syntaxflow",
                                        Location: record.ProgramName || "",
                                        Path: `/`,
                                        Variable: record.Variable,
                                        Value: record.Index ? `/${record.Index}` : undefined,
                                        Query: [{Key: "result_id", Value: record.ResultID || 0}]
                                    }
                                    emiter.emit(
                                        "openPage",
                                        JSON.stringify({
                                            route: YakitRoute.YakRunner_Audit_Code,
                                            params
                                        })
                                    )
                                }}
                            />
                        </Tooltip>
                    </>
                )
            }
        ]
        return columnArr.filter((ele) => !excludeColumnsKey.includes(ele.dataKey))
    }, [riskTypeVerbose, excludeColumnsKey])

    const getRiskType = useMemoizedFn(() => {
        const query: GroupTableColumnRequest = {DatabaseName: "SSA", TableName: "ssa_risks", ColumnName: "risk_type"}
        apiGroupTableColumn(query).then((data) => {
            setRiskTypeVerbose(data.Data.filter((item) => item.length !== 0))
        })
    })

    const getRiskProject = useMemoizedFn(() => {
        const query: GroupTableColumnRequest = {DatabaseName: "SSA", TableName: "ssa_risks", ColumnName: "program_name"}
        apiGroupTableColumn(query).then((data) => {
            setRiskProgramList(data.Data.filter((item) => item.length !== 0))
        })
    })

    const onOpenSelect = useMemoizedFn((record: SSARisk) => {
        const m = showYakitModal({
            title: (
                <div className='content-ellipsis'>
                    序号【{record.Id}】- {record.TitleVerbose || record.Title}
                </div>
            ),
            content: <YakitRiskSelectTag info={record} onClose={() => m.destroy()} onSave={onSaveTags} />,
            footer: null,
            onCancel: () => {
                m.destroy()
            }
        })
    })
    const onSaveTags = useMemoizedFn((info: SSARisk) => {
        const params: UpdateSSARiskTagsRequest = {
            ID: info.Id,
            Tags: !!info.Tags ? info.Tags?.split("|") : []
        }
        apiUpdateSSARiskTags(params).then(() => {
            const index = tableData.findIndex((item) => item.Id === info.Id)
            if (index === -1) return
            tableData[index] = {
                ...info
            }
            debugVirtualTableEvent.setTData(tableData)
        })
    })
    const onRemoveSingle = useMemoizedFn((id) => {
        let removeQuery: DeleteSSARisksRequest = {
            Filter: {
                ID: [id]
            }
        }
        apiDeleteSSARisks(removeQuery).then(() => {
            debugVirtualTableEvent.setTData(tableData.filter((item) => item.Id !== id))
            emiter.emit("onRefAuditRiskFieldGroup")
        })
    })
    /**批量删除后，重置查询条件刷新 */
    const onRemove = useMemoizedFn(() => {
        const {RuntimeID} = query
        let removeQuery: DeleteSSARisksRequest = {
            Filter: {
                RuntimeID,
                ...tableParams.Filter
            }
        }
        if (!allCheck && selectList.length > 0) {
            // 勾选删除
            const ids = selectList.map((item) => item.Id)
            removeQuery.Filter = {
                ID: ids
            }
        }
        setRiskLoading && setRiskLoading(true)
        apiDeleteSSARisks(removeQuery)
            .then(() => {
                debugVirtualTableEvent.noResetRefreshT()
                emiter.emit("onRefAuditRiskFieldGroup")
            })
            .finally(() =>
                setTimeout(() => {
                    setRiskLoading && setRiskLoading(false)
                }, 200)
            )
    })

    const onRefreshMenuSelect = useMemoizedFn((key: string) => {
        switch (key) {
            case "noResetRefresh":
                debugVirtualTableEvent.noResetRefreshT()
                break
            case "resetRefresh":
                const {RuntimeID} = query
                setQuery && setQuery({})
                debugVirtualTableEvent.refreshT({RuntimeID})
                break
            default:
                break
        }
    })

    const onTableChange = useMemoizedFn((page: number, limit: number, newSort: SortProps, filter: any) => {
        let sort = {...newSort}
        if (sort.order === "none") {
            sort.order = "desc"
            sort.orderBy = "id"
        }

        if (setQuery) {
            const newPagination = {
                ...tableParams.Pagination,
                Order: sort.order,
                OrderBy: sort.orderBy
            }
            const newFilter = {
                ...tableParams.Filter,
                ...filter,
                IsRead: type === "all" ? 0 : -1
            }
            setPagination(newPagination)
            setQuery && setQuery(newFilter)
        } else {
            const finalParams = {
                Pagination: {
                    ...tableParams.Pagination,
                    Order: sort.order,
                    OrderBy: sort.orderBy
                },
                Filter: {
                    ...tableParams.Filter,
                    ...filter,
                    IsRead: type === "all" ? 0 : -1
                }
            }
            debugVirtualTableEvent.setP(finalParams)
        }
    })

    const onSearch = useMemoizedFn((val) => {
        debugVirtualTableEvent.setP({
            ...tableParams,
            Filter: {
                ...tableParams.Filter,
                Search: val
            }
        })
    })
    const onPressEnter = useMemoizedFn(() => {
        onSearch(keywords)
    })
    const onSelectAll = useMemoizedFn((newSelectedRowKeys: string[], selected: SSARisk[], checked: boolean) => {
        if (checked) {
            setAllCheck(true)
            setSelectList(tableData)
        } else {
            setAllCheck(false)
            setSelectList([])
        }
    })
    const onChangeCheckboxSingle = useMemoizedFn((c: boolean, key: string, selectedRows: SSARisk) => {
        if (c) {
            setSelectList((s) => [...s, selectedRows])
        } else {
            setSelectList((s) => s.filter((ele) => ele.Id !== selectedRows.Id))
            setAllCheck(false)
        }
    })
    const onSetCurrentRow = useMemoizedFn((val?: SSARisk) => {
        if (!val) {
            setCurrentSelectItem(undefined)
            return
        }
        if (val?.Id !== currentSelectItem?.Id) {
            setCurrentSelectItem(val)
        }
        if (!val.IsRead) {
            apiNewRiskRead({...tableParams.Filter, ID: [val.Id]}).then(() => {
                debugVirtualTableEvent.setTData(
                    tableData.map((ele) => {
                        if (ele.Id === val.Id) {
                            ele.IsRead = true
                            ele.cellClassName = ""
                        }
                        return ele
                    })
                )
            })
            emiter.emit("onRefRisksRead", JSON.stringify({Id: val.Id}))
        }
    })
    const onAllRead = useMemoizedFn(() => {
        apiNewRiskRead({...tableParams.Filter, ID: []}).then(() => {
            debugVirtualTableEvent.noResetRefreshT()
            emiter.emit("onRefRisksRead", JSON.stringify({Id: "", isAllRead: true}))
        })
    })
    const onExpend = useMemoizedFn(() => {
        if (setAdvancedQuery) setAdvancedQuery(true)
    })

    const ResizeBoxProps = useCreation(() => {
        let p = {
            firstRatio: "50%",
            secondRatio: "50%"
        }
        if (!currentSelectItem?.Id) {
            p.secondRatio = "0%"
            p.firstRatio = "100%"
        }
        return p
    }, [currentSelectItem])
    const selectedRowKeys = useCreation(() => {
        return selectList.map((ele) => ele.Id) || []
    }, [selectList])
    const onClickIP = useMemoizedFn((info: SSARisk) => {
        const index = tableData.findIndex((item) => item.Id === info.Id)
        if (index !== -1) setScrollToIndex(index)
    })
    /**table所在的div大小发生变化 */
    const onTableResize = useMemoizedFn((width, height) => {
        if (!width || !height) {
            return
        }
        if (!currentSelectItem?.Id) {
            // 窗口由小变大时 重新拉取数据
            if (boxHeightRef.current && boxHeightRef.current < height) {
                boxHeightRef.current = height
                // updateData()
            } else {
                boxHeightRef.current = height
            }
        }
    })

    return (
        <div className={classNames(styles["yakit-audit-hole-table"], riskWrapperClassName)} ref={tableBoxRef}>
            <ReactResizeDetector
                onResize={onTableResize}
                handleWidth={true}
                handleHeight={true}
                refreshMode={"debounce"}
                refreshRate={50}
            />
            <YakitResizeBox
                firstMinSize={160}
                secondMinSize={200}
                isVer={true}
                lineStyle={{display: !!currentSelectItem?.Id ? "" : "none"}}
                lineDirection='bottom'
                secondNodeStyle={{
                    display: !currentSelectItem?.Id ? "none" : "",
                    padding: !currentSelectItem?.Id ? 0 : undefined
                }}
                firstNode={
                    <TableVirtualResize<SSARisk>
                        ref={tableRef}
                        query={tableParams.Filter}
                        scrollToIndex={scrollToIndex}
                        tableLoading={tableLoading}
                        isRefresh={isRefresh}
                        titleHeight={32}
                        renderTitle={
                            renderTitle ? (
                                renderTitle
                            ) : (
                                <div className={styles["table-renderTitle"]}>
                                    <div className={styles["table-renderTitle-left"]}>
                                        {!advancedQuery && !query.RuntimeID && (
                                            <Tooltip
                                                title='展开筛选'
                                                placement='topLeft'
                                                overlayClassName='plugins-tooltip'
                                            >
                                                <YakitButton
                                                    type='text2'
                                                    onClick={onExpend}
                                                    icon={<OutlineOpenIcon onClick={onExpend} />}
                                                ></YakitButton>
                                            </Tooltip>
                                        )}
                                        <div className={styles["table-renderTitle-text"]}>审计漏洞</div>
                                        <YakitRadioButtons
                                            value={type}
                                            onChange={(e) => {
                                                setType(e.target.value)
                                            }}
                                            buttonStyle='solid'
                                            options={[
                                                {
                                                    value: "all",
                                                    label: "全部"
                                                },
                                                {
                                                    value: "false",
                                                    label: "未读"
                                                }
                                            ]}
                                        />
                                        <div className={styles["virtual-table-heard-right"]}>
                                            <div className={styles["virtual-table-heard-right-item"]}>
                                                <span className={styles["virtual-table-heard-right-text"]}>Total</span>
                                                <span className={styles["virtual-table-heard-right-number"]}>
                                                    {tableTotal}
                                                </span>
                                            </div>
                                            <Divider type='vertical' />
                                            <div className={styles["virtual-table-heard-right-item"]}>
                                                <span className={styles["virtual-table-heard-right-text"]}>
                                                    Selected
                                                </span>
                                                <span className={styles["virtual-table-heard-right-number"]}>
                                                    {selectNum}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles["table-head-extra"]}>
                                        <YakitInput.Search
                                            value={keywords}
                                            onChange={(e) => setKeywords(e.target.value)}
                                            placeholder='请输入关键词搜索'
                                            onSearch={onSearch}
                                            onPressEnter={onPressEnter}
                                        />
                                        <Divider type='vertical' style={{margin: 0}} />
                                        <FuncBtn
                                            maxWidth={1200}
                                            type='outline2'
                                            icon={<OutlineEyeIcon />}
                                            onClick={onAllRead}
                                            name='全部已读'
                                        />
                                        <YakitPopconfirm
                                            title={
                                                allCheck
                                                    ? "确定删除所有风险与漏洞吗? 不可恢复"
                                                    : "确定删除选择的风险与漏洞吗?不可恢复"
                                            }
                                            onConfirm={onRemove}
                                        >
                                            <FuncBtn
                                                maxWidth={1200}
                                                type='outline1'
                                                colors='danger'
                                                icon={<OutlineTrashIcon />}
                                                disabled={tableTotal === 0}
                                                name={selectNum === 0 ? "清空" : "删除"}
                                            />
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
                            )
                        }
                        renderKey='Id'
                        data={tableData}
                        rowSelection={{
                            isAll: allCheck,
                            type: "checkbox",
                            selectedRowKeys,
                            onSelectAll,
                            onChangeCheckboxSingle
                        }}
                        pagination={{
                            total: tableTotal,
                            limit: pagination.Limit,
                            page: pagination.Page
                        }}
                        columns={columns}
                        onSetCurrentRow={onSetCurrentRow}
                        enableDrag={true}
                        useUpAndDown
                        onChange={onTableChange}
                        {...(tableVirtualResizeProps || {})}
                    />
                }
                secondNode={
                    currentSelectItem && (
                        <>
                            <YakitAuditRiskDetails
                                info={currentSelectItem}
                                onClickIP={onClickIP}
                                className={styles["yakit-code-scan-SSARisk-details"]}
                                isShowExtra={true}
                            />
                        </>
                    )
                }
                {...ResizeBoxProps}
            />
        </div>
    )
})
const defaultTags = [
    {
        label: "误报",
        value: "误报"
    },
    {
        label: "忽略",
        value: "忽略"
    },
    {
        label: "已处理",
        value: "已处理"
    },
    {
        label: "待处理",
        value: "待处理"
    }
]
const YakitRiskSelectTag: React.FC<YakitRiskSelectTagProps> = React.memo((props) => {
    const {info, onClose, onSave} = props
    const initSelectTags = useCreation(() => {
        let tagList: {label: string; value: string}[] = []
        if (!!info?.Tags) {
            tagList =
                (info?.Tags || "").split("|").map((item) => ({
                    label: item,
                    value: item
                })) || []
        }
        return tagList
    }, [info.Tags])
    const tags = useCreation(() => {
        const list = initSelectTags.filter((item) => {
            return !defaultTags.find((i) => i.value === item.value)
        })
        return defaultTags.concat(list)
    }, [info.Tags, initSelectTags])
    const onFinish = useMemoizedFn((value) => {
        onSave({
            ...info,
            Tags: !!value.TagList ? value.TagList.join("|") : ""
        })
        if (onClose) onClose()
    })
    return (
        <div className={styles["yakit-ssa-risk-select-tag"]}>
            <Form onFinish={onFinish}>
                <Form.Item label='处置状态' name='TagList' initialValue={initSelectTags}>
                    <YakitSelect mode='tags' allowClear>
                        {tags.map((item) => {
                            return (
                                <YakitSelect.Option key={item.value} value={item.value}>
                                    {item.label}
                                </YakitSelect.Option>
                            )
                        })}
                    </YakitSelect>
                </Form.Item>
                <div className={styles["yakit-ssa-risk-select-tag-btns"]}>
                    <YakitButton
                        type='outline2'
                        onClick={() => {
                            if (onClose) onClose()
                        }}
                    >
                        取消
                    </YakitButton>
                    <YakitButton htmlType='submit'>确定</YakitButton>
                </div>
            </Form>
        </div>
    )
})

export const YakitAuditRiskDetails: React.FC<YakitAuditRiskDetailsProps> = React.memo((props) => {
    const {info, className, border, isShowExtra} = props
    const [yakURLData, setYakURLData] = useState<YakURLDataItemProps[]>([])

    useEffect(() => {
        initData()
    }, [info])

    const [isShowCollapse, setIsShowCollapse] = useState<boolean>(false)
    const initData = useMemoizedFn(async () => {
        try {
            const {Index, CodeRange, ProgramName, CodeFragment} = info
            if (Index && CodeRange) {
                const code_range: CodeRangeProps = JSON.parse(CodeRange)
                setYakURLData([
                    {
                        index: Index,
                        code_range,
                        source: CodeFragment,
                        ResourceName: ProgramName
                    }
                ])
                setIsShowCollapse(true)
            } else {
                setIsShowCollapse(false)
            }
        } catch (error) {
            setIsShowCollapse(false)
        }
    })

    const extraResizeBoxProps = useCreation(() => {
        let p: YakitResizeBoxProps = {
            firstNode: <></>,
            secondNode: <></>,
            firstRatio: "50%",
            secondRatio: "50%",
            lineStyle: {height: "auto"},
            firstNodeStyle: {height: "auto"}
        }
        if (!isShowCollapse) {
            p.firstRatio = "0%"
            p.secondRatio = "100%"
            p.lineStyle = {display: "none"}
            p.firstNodeStyle = {display: "none"}
            p.secondNodeStyle = {padding: 0}
        }
        return p
    }, [isShowCollapse])

    const onClickIP = useMemoizedFn(() => {
        if (props.onClickIP) props.onClickIP(info)
    })

    const severityInfo = useCreation(() => {
        const severity = SeverityMapTag.filter((item) => item.key.includes(info.Severity || ""))[0]
        let icon = <></>
        switch (severity?.name) {
            case "信息":
                icon = <IconSolidInfoRiskIcon />
                break
            case "低危":
                icon = <IconSolidLowRiskIcon />
                break
            case "中危":
                icon = <IconSolidMediumRiskIcon />
                break
            case "高危":
                icon = <IconSolidHighRiskIcon />
                break
            case "严重":
                icon = <IconSolidSeriousIcon />
                break
            default:
                icon = <IconSolidDefaultRiskIcon />
                break
        }
        return {
            icon,
            tag: severity?.tag || "default",
            name: severity?.name || info?.Severity || "-"
        }
    }, [info.Severity])

    // 跳转到代码审计页面
    const jumpCodeScanPage = useMemoizedFn((value?: string) => {
        const {ProgramName, Variable, ResultID} = info
        if (ResultID && Variable && ProgramName) {
            // 跳转到审计页面的参数
            const params: AuditCodePageInfoProps = {
                Schema: "syntaxflow",
                Location: ProgramName,
                Path: `/`,
                Variable,
                Value: value,
                Query: [{Key: "result_id", Value: ResultID}]
            }
            emiter.emit(
                "openPage",
                JSON.stringify({
                    route: YakitRoute.YakRunner_Audit_Code,
                    params
                })
            )
        }
    })

    return (
        <div
            className={classNames(
                styles["yakit-audit-risk-details-content"],
                "yakit-descriptions",
                {
                    [styles["yakit-audit-risk-details-content-no-border"]]: !border
                },
                className
            )}
        >
            <div className={styles["content-heard"]}>
                <div className={styles["content-heard-left"]}>
                    <div className={styles["content-heard-severity"]}>
                        {severityInfo.icon}
                        <span
                            className={classNames(
                                styles["content-heard-severity-name"],
                                styles[`severity-${severityInfo.tag}`]
                            )}
                        >
                            {severityInfo.name}
                        </span>
                    </div>
                    <Divider type='vertical' style={{height: 40, margin: "0 16px"}} />
                    <div className={styles["content-heard-body"]}>
                        <div className={classNames(styles["content-heard-body-title"], "content-ellipsis")}>
                            {info?.TitleVerbose || info.Title || "-"}
                        </div>
                        <div className={styles["content-heard-body-description"]}>
                            <YakitTag color='info' style={{cursor: "pointer"}} onClick={onClickIP}>
                                ID:{info.Id}
                            </YakitTag>
                            <Divider type='vertical' style={{height: 16, margin: "0 8px"}} />
                            <span className={styles["description-port"]}>所属项目:{info.ProgramName || "-"}</span>
                            <Divider type='vertical' style={{height: 16, margin: "0 8px"}} />
                            <span className={styles["content-heard-body-time"]}>
                                发现时间:{!!info.CreatedAt ? formatTimestamp(info.CreatedAt) : "-"}
                            </span>
                        </div>
                    </div>
                </div>
                {isShowExtra && (
                    <div className={styles["content-heard-right"]} style={{height: "100%", alignItems: "center"}}>
                        {isShowCollapse ? (
                            <YakitButton
                                type='outline2'
                                icon={<OutlineTerminalIcon />}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    jumpCodeScanPage(info.Index ? `/${info.Index}` : undefined)
                                }}
                            >
                                在代码审计中打开
                            </YakitButton>
                        ) : (
                            <Tooltip title={`相关数据已被删除`} placement='topLeft'>
                                <div className={styles["disabled-open"]}>
                                    <OutlineTerminalIcon />
                                    在代码审计中打开
                                </div>
                            </Tooltip>
                        )}
                    </div>
                )}
            </div>
            <YakitResizeBox
                {...extraResizeBoxProps}
                firstNode={
                    <div className={styles["content-resize-collapse"]}>
                        <div className={styles["main-title"]}>相关代码段</div>
                        <AuditResultCollapse
                            data={yakURLData}
                            jumpCodeScanPage={jumpCodeScanPage}
                            isShowExtra={false}
                            collapseProps={{
                                defaultActiveKey: ["collapse-list-0"]
                            }}
                        />
                    </div>
                }
                secondNode={<AuditResultDescribe info={info} />}
                firstMinSize={200}
                secondMinSize={400}
            />
        </div>
    )
})
