import React, {useEffect, useMemo, useRef, useState} from "react"
import {
    YakitRiskSelectTagProps,
    YakitAuditHoleTableProps,
    YakURLDataItemProps,
    SSARisk,
    DeleteSSARisksRequest,
    QuerySSARisksRequest,
    YakitAuditRiskDetailsProps,
    AuditResultHistoryProps
} from "./YakitAuditHoleTableType"
import styles from "./YakitAuditHoleTable.module.scss"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {Badge, Divider, Form, Input, Tooltip} from "antd"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useControllableValue, useCreation, useInViewport, useMemoizedFn, useUpdateEffect} from "ahooks"
import {YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {
    OutlineChevrondownIcon,
    OutlineEyeIcon,
    OutlineOpenIcon,
    OutlineRefreshIcon,
    OutlineSearchIcon,
    OutlineTerminalIcon,
    OutlineTrashIcon,
    OutlineUploadIcon
} from "@/assets/icon/outline"
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {formatTimestamp} from "@/utils/timeUtil"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {
    GroupTableColumnRequest,
    SSARiskFeedbackToOnlineRequest,
    CreateSSARiskDisposalsRequest,
    apiDeleteSSARisks,
    apiGroupTableColumn,
    apiNewRiskRead,
    apiQuerySSARisks,
    apiSSARiskFeedbackToOnline,
    apiCreateSSARiskDisposals,
    apiGetSSARiskDisposal,
    GetSSARiskDisposalResponse,
    SSARiskDisposalData,
    apiDeleteSSARiskDisposals
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
import {AuditResultCollapse, AuditResultDescribe, SeverityMapTag} from "@/pages/risks/YakitRiskTable/YakitRiskTable"
import {CodeRangeProps} from "@/pages/yakRunnerAuditCode/RightAuditDetail/RightAuditDetail"
import {VirtualPaging} from "@/hook/useVirtualTableHook/useVirtualTableHookType"
import {getRemoteValue} from "@/utils/kv"
import {yakitNotify} from "@/utils/notification"
import {NoPromptHint} from "@/pages/pluginHub/utilsUI/UtilsTemplate"
import {RemoteAuditHoleGV} from "@/enums/auditHole"
import {useStore} from "@/store"
import {PopoverArrowIcon} from "@/pages/pluginHub/pluginLog/PluginLogOpt"
import {LogNodeStatusModifyIcon} from "@/assets/icon/colors"
import {SolidPaperairplaneIcon} from "@/assets/icon/solid"
import {TextAreaRef} from "antd/lib/input/TextArea"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"

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

const initResDataFun = (data: SSARisk[]) => {
    const newData = data.map((ele) => ({
        ...ele,
        cellClassName: ele.IsRead ? "" : styles["yakit-ssa-risk-table-cell-unread"]
    }))
    return newData
}

export const YakitAuditHoleTable: React.FC<YakitAuditHoleTableProps> = React.memo((props) => {
    const {
        setRiskLoading,
        renderTitle,
        riskWrapperClassName = "",
        tableVirtualResizeProps,
        excludeColumnsKey = [],
        query,
        setQuery,
        setAllTotal
    } = props
    const {userInfo} = useStore()

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

    const [showType, setShowType] = useState<"detail" | "code" | "history">("detail")

    useUpdateEffect(() => {
        setAllTotal && setAllTotal(tableTotal)
    }, [tableTotal])

    useEffect(() => {
        const newParams: QuerySSARisksRequest = {
            Pagination: {
                ...tableParams.Pagination,
                ...Pagination
            },
            Filter: {
                ...tableParams.Filter,
                ...query
            }
        }
        if (query.Severity) {
            newParams.Filter.Severity = query.Severity
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
        emiter.on("onRefAuditRiskList", onRefAuditRiskList)
        emiter.on("onRefreshQuerySSARisks", onStartInterval)
        return () => {
            emiter.off("onRefAuditRiskList", onRefAuditRiskList)
            emiter.off("onRefreshQuerySSARisks", onStartInterval)
        }
    }, [])

    /**重新加载表格 */
    const onRefAuditRiskList = useMemoizedFn(() => {
        debugVirtualTableEvent.noResetRefreshT()
    })

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
    const getLabelByValue = (value) => {
        // 使用 find 方法查找匹配的 value
        const option = defaultTags.find((option) => option.value === value)

        // 如果找到匹配的 value，返回对应的 label，否则返回 null
        return option ? option.label : value.replaceAll("|", ",")
    }
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
                dataKey: "LatestDisposalStatus",
                filterProps: {
                    filterKey: "LatestDisposalStatus",
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
                                e.stopPropagation()
                                onOpenSelect(record)
                            }}
                        >
                            <span>{!!text ? getLabelByValue(text) : "-"}</span>
                            <OutlineChevrondownIcon className={styles["table-tag-icon"]} />
                        </div>
                    </>
                )
            },
            {
                title: "发现时间",
                dataKey: "CreatedAt",
                filterProps: {
                    filterKey: "CreatedAt",
                    filtersType: "dateTime"
                },
                render: (text) => (text ? formatTimestamp(text) : "-")
            },
            {
                title: "操作",
                dataKey: "action",
                width: 140,
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
                                        Query: [{Key: "result_id", Value: record.ResultID || 0}],
                                        CodeRange: record.CodeRange
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
                        <Divider type='vertical' />
                        <Tooltip
                            title='误报反馈'
                            destroyTooltipOnHide={true}
                            overlayStyle={{paddingBottom: 0}}
                            placement='top'
                        >
                            <OutlineUploadIcon
                                className={styles["misstatement-icon"]}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onClickSSARiskFeedbackToOnline(record)
                                }}
                            />
                        </Tooltip>
                    </>
                )
            }
        ]
        return columnArr.filter((ele) => !excludeColumnsKey.includes(ele.dataKey))
    }, [riskTypeVerbose, excludeColumnsKey])

    /**误报上传 start */
    const [misstatementVisible, setMisstatementVisible] = useState<boolean>(false)
    const misstatementHintCache = useRef<boolean>(false)
    const ssaRiskFeedbackToOnlineParams = useRef<SSARiskFeedbackToOnlineRequest>()
    useEffect(() => {
        getRemoteValue(RemoteAuditHoleGV.AuditHoleMisstatementNoPrompt).then((res) => {
            misstatementHintCache.current = res === "true"
        })
    }, [])
    const handleMisstatementHint = (isOk: boolean, cache: boolean) => {
        if (isOk) {
            misstatementHintCache.current = cache
            fetchMisstatement()
        }
        setMisstatementVisible(false)
    }
    const onClickSSARiskFeedbackToOnline = useMemoizedFn((record: SSARisk) => {
        if (!userInfo.isLogin) {
            yakitNotify("info", "请先登录账号")
            return
        }
        ssaRiskFeedbackToOnlineParams.current = {
            Token: userInfo.token,
            Filter: {
                Hash: [record.Hash]
            }
        }
        if (!misstatementHintCache.current) {
            setMisstatementVisible(true)
        } else {
            fetchMisstatement()
        }
    })
    const fetchMisstatement = () => {
        const params = ssaRiskFeedbackToOnlineParams.current
        if (params) {
            apiSSARiskFeedbackToOnline(params).then(() => {
                yakitNotify("success", "反馈成功")
            })
        }
    }
    /**误报上传 end */

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
            content: <YakitRiskSelectTag ids={[record.Id]} onClose={() => m.destroy()} onCreate={onCreateTags} />,
            footer: null,
            onCancel: () => {
                m.destroy()
            }
        })
    })

    const [disposalData, setDisposalData] = useState<SSARiskDisposalData[]>([])
    const getSSARiskDisposal = useMemoizedFn((newInfo) => {
        apiGetSSARiskDisposal({RiskId: newInfo.Id}).then((data) => {
            // if ((data.Data || []).length === 0 && showType === "history") {
            //     setShowType("detail")
            // }
            setDisposalData(data.Data || [])
        })
    })

    const onCreateTags = useMemoizedFn((params: CreateSSARiskDisposalsRequest) => {
        apiCreateSSARiskDisposals(params).then(() => {
            const newTableData = tableData.map((item) => {
                if (params.RiskIds.includes(item.Id)) {
                    return {
                        ...item,
                        LatestDisposalStatus: !!params.Status ? params.Status : "not_set"
                    }
                }
                return item
            })
            debugVirtualTableEvent.setTData(newTableData)
            if (currentSelectItem) {
                getSSARiskDisposal(currentSelectItem)
            }
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
        if (filter["CreatedAt"]) {
            const time = filter["CreatedAt"]
            filter.AfterCreatedAt = time[0]
            filter.BeforeCreatedAt = time[1]
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

    const setLatestDisposalStatus = useMemoizedFn((info: SSARisk, status: string) => {
        const newTableData = tableData.map((item) => {
            if (item.Id === info.Id) {
                return {
                    ...item,
                    LatestDisposalStatus: !!status ? status : "not_set"
                }
            }
            return item
        })
        debugVirtualTableEvent.setTData(newTableData)
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
                                        <YakitButton
                                            type='outline2'
                                            disabled={selectedRowKeys.length === 0}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                const m = showYakitModal({
                                                    title: <div className='content-ellipsis'>批量处置</div>,
                                                    content: (
                                                        <YakitRiskSelectTag
                                                            ids={selectedRowKeys}
                                                            onClose={() => m.destroy()}
                                                            onCreate={onCreateTags}
                                                        />
                                                    ),
                                                    footer: null,
                                                    onCancel: () => {
                                                        m.destroy()
                                                    }
                                                })
                                            }}
                                        >
                                            批量处置
                                        </YakitButton>

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
                                showType={showType}
                                setShowType={setShowType}
                                setLatestDisposalStatus={setLatestDisposalStatus}
                                disposalData={disposalData}
                                setDisposalData={setDisposalData}
                                getSSARiskDisposal={getSSARiskDisposal}
                            />
                        </>
                    )
                }
                {...ResizeBoxProps}
            />
            {/* 误报反馈提示 */}
            <NoPromptHint
                visible={misstatementVisible}
                title='误报反馈提醒'
                content='确认反馈后，整条漏洞信息将会被上传至后台，开发人员将获取漏洞信息进行误报修复。是否确认反馈？'
                cacheKey={RemoteAuditHoleGV.AuditHoleMisstatementNoPrompt}
                onCallback={handleMisstatementHint}
            />
        </div>
    )
})
const defaultTags = [
    {
        label: "有问题",
        value: "is_issue"
    },
    {
        label: "不是问题",
        value: "not_issue"
    },
    {
        label: "存疑",
        value: "suspicious"
    },
    {
        label: "未处置",
        value: "not_set"
    }
]
export const YakitRiskSelectTag: React.FC<YakitRiskSelectTagProps> = React.memo((props) => {
    const {ids, onClose, onCreate} = props

    const onFinish = useMemoizedFn((value) => {
        onCreate({RiskIds: ids, Status: value.Tag, Comment: value.Description})
        if (onClose) onClose()
    })

    return (
        <div className={styles["yakit-ssa-risk-select-tag"]}>
            <Form onFinish={onFinish} labelCol={{span: 4}} wrapperCol={{span: 20}}>
                <Form.Item label='处置状态' name='Tag'>
                    <YakitSelect allowClear>
                        {defaultTags.map((item) => {
                            return (
                                <YakitSelect.Option key={item.value} value={item.value}>
                                    {item.label}
                                </YakitSelect.Option>
                            )
                        })}
                    </YakitSelect>
                </Form.Item>
                <Form.Item label='说明' name='Description'>
                    <YakitInput.TextArea spellCheck={false} autoSize={{minRows: 3, maxRows: 10}} />
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
    const {info, className, border, isShowExtra, isExtraClick, setLatestDisposalStatus, getSSARiskDisposal} = props
    const [yakURLData, setYakURLData] = useState<YakURLDataItemProps[]>([])
    const [disposalData, setDisposalData] = useControllableValue<SSARiskDisposalData[]>(props, {
        defaultValue: [],
        valuePropName: "disposalData",
        trigger: "setDisposalData"
    })
    const [showType, setShowType] = useControllableValue<"detail" | "code" | "history">(props, {
        defaultValue: "detail",
        valuePropName: "showType",
        trigger: "setShowType"
    })
    useEffect(() => {
        initData()
        getSSARiskDisposal && getSSARiskDisposal(info)
    }, [info])

    const getOptions = useMemo(() => {
        let options = [
            {
                label: "漏洞详情",
                value: "detail"
            },
            {
                label: "代码片段",
                value: "code"
            }
        ]
        // if (disposalData.length > 0) {
            options.push({
                label: "处置历史",
                value: "history"
            })
        // }
        return options
    }, [disposalData])

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
        const {ProgramName, Variable, ResultID, CodeRange} = info
        if (ResultID && Variable && ProgramName) {
            // 跳转到审计页面的参数
            const params: AuditCodePageInfoProps = {
                Schema: "syntaxflow",
                Location: ProgramName,
                Path: `/`,
                Variable,
                Value: value,
                Query: [{Key: "result_id", Value: ResultID}],
                CodeRange
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
                                    isExtraClick && isExtraClick()
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
            <YakitRadioButtons
                style={{margin: 6}}
                value={showType}
                onChange={(e) => {
                    const value = e.target.value
                    setShowType(value)
                }}
                buttonStyle='solid'
                options={getOptions}
            />
            {showType === "detail" && <AuditResultDescribe info={info} />}

            {showType === "code" && (
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
            )}
            {showType === "history" && (
                <AuditResultHistory
                    info={info}
                    disposalData={disposalData}
                    setDisposalData={setDisposalData}
                    setLatestDisposalStatus={setLatestDisposalStatus}
                    getSSARiskDisposal={getSSARiskDisposal}
                />
            )}
        </div>
    )
})

export const AuditResultHistory: React.FC<AuditResultHistoryProps> = React.memo((props) => {
    const {info, setLatestDisposalStatus, style, getSSARiskDisposal,refreshFileOrRuleTree} = props
    const [disposalData, setDisposalData] = useControllableValue<SSARiskDisposalData[]>(props, {
        defaultValue: [],
        valuePropName: "disposalData",
        trigger: "setDisposalData"
    })
    // 文本内容相关
    const textAreaRef = useRef<TextAreaRef>(null)
    const [value, setValue] = useState<string>("")
    const [loading, setLoading] = useState<boolean>(false)
    const [selectValue, setSelectValue] = useState<string>("")
    const disabled = useMemo(() => {
        return value.length === 0 || selectValue.length === 0
    }, [value, selectValue])
    const onDeleteSSARiskDisposals = useMemoizedFn((id: number) => {
        apiDeleteSSARiskDisposals({Filter: {ID: [id]}})
            .then(() => {
                const newDisposalData = disposalData.filter((item) => item.Id !== id)
                setLatestDisposalStatus &&
                    setLatestDisposalStatus(info, newDisposalData.length > 0 ? newDisposalData[0].Status : "not_set")
                setDisposalData(newDisposalData)
                refreshFileOrRuleTree?.()
                yakitNotify("success", "删除成功")
            })
            .catch((e) => {
                yakitNotify("error", `删除失败: ${e}`)
            })
    })

    const AuditResultHistoryItem = useMemoizedFn((info: SSARiskDisposalData, index: number) => {
        const getLabelByValue = (value) => {
            // 使用 find 方法查找匹配的 value
            const option = defaultTags.find((option) => option.value === value)

            // 如果找到匹配的 value，返回对应的 label，否则返回 null
            return option ? option.label : "未识别状态"
        }
        return (
            <div className={classNames(styles["audit-result-history"])}>
                <div className={styles["audit-result-history-opt"]}>
                    <PopoverArrowIcon className={styles["arrow-icon"]} />
                    <div className={styles["icon-wrapper"]}>
                        <LogNodeStatusModifyIcon />
                    </div>
                    <div
                        className={classNames(styles["line-tail"], {
                            [styles["hidden-line-tail"]]: index + 1 === disposalData.length
                        })}
                    >
                        <div className={styles["line-wrapper"]}>
                            <div className={styles["line-top-dot"]}></div>
                            <div className={styles["line-style"]}></div>
                            <div className={styles["line-bottom-dot"]}></div>
                        </div>
                    </div>
                </div>

                <div className={styles["audit-result-history-info"]}>
                    <div className={styles["info-body"]}>
                        {/* 头部信息 */}
                        <div
                            className={classNames(styles["info-header"], {
                                [styles["info-header-line-additional"]]: true
                            })}
                        >
                            <div className={styles["header-content"]}>
                                {/* <AuthorImg src={info.headImg || UnLogin} wrapperClassName={styles["img-style"]} /> */}
                                <div className={styles["author-name"]}>处置状态：{getLabelByValue(info.Status)}</div>
                                {/* <div className={styles["log-content"]}>content</div> */}
                                <div className={styles["log-time"]}>{formatTimestamp(info.UpdatedAt)}</div>
                                {info.TaskName && <YakitTag color={"info"}>{info.TaskName}</YakitTag>}
                                <div className={styles["option"]}>
                                    <YakitPopconfirm
                                        title={"确认删除此处置记录吗？"}
                                        onConfirm={(e) => {
                                            e?.stopPropagation()
                                            onDeleteSSARiskDisposals(info.Id)
                                        }}
                                        placement='left'
                                    >
                                        <YakitButton danger type='text' size='small'>
                                            删除
                                        </YakitButton>
                                    </YakitPopconfirm>
                                </div>
                            </div>
                        </div>
                        {/* 附加信息 */}
                        <div className={styles["info-additional"]}>
                            <div
                                className={classNames(styles["description-style"], "yakit-content-multiLine-ellipsis")}
                            >
                                {info.Comment || "暂无处置说明"}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    })

    const onSubmit = useMemoizedFn(() => {
        setLoading(true)
        const params: CreateSSARiskDisposalsRequest = {
            RiskIds: [info.Id],
            Status: selectValue,
            Comment: value
        }
        apiCreateSSARiskDisposals(params).then(() => {
            setLatestDisposalStatus && setLatestDisposalStatus(info, selectValue)
            getSSARiskDisposal && getSSARiskDisposal(info)
            setValue("")
            setSelectValue("")
            setLoading(false)
            yakitNotify("success", "处置成功")
            refreshFileOrRuleTree?.()
        })
    })
    /** ----------  操作相关 Start ---------- */
    const [textareaFocus, setTextareaFocus] = useState<boolean>(false)
    // 文本区域聚焦状态
    const handleFocus = useMemoizedFn(() => {
        setTextareaFocus(true)
        textAreaRef.current!.focus({cursor: "end"})
    })
    // 文本区域失焦状态
    const handleBlur = useMemoizedFn(() => {
        setTextareaFocus(false)
    })
    // 文本区域聚焦后光标设置到文本内容最后
    const handleTextareaFocus = useMemoizedFn(() => {
        textAreaRef.current!.focus({cursor: "end"})
    })
    /** ---------- 操作相关 End ---------- */
    return (
        <div className={styles["audit-result-history-wrapper"]} style={style}>
            <div className={styles["audit-result-history-list"]}>
                {disposalData.length > 0 ? (
                    <>{disposalData.map((item, index) => AuditResultHistoryItem(item, index))}</>
                ) : (
                    <YakitEmpty title='暂无漏洞处置信息' />
                )}
            </div>

            <div
                className={classNames(styles["footer-textarea"], {
                    [styles["footer-textarea-focus"]]: textareaFocus
                })}
                onClick={handleTextareaFocus}
            >
                <div className={styles["select-wrapper"]}>
                    <div className={styles["label"]}>处置状态：</div>
                    <div
                        className={styles["option"]}
                        onClick={(e) => {
                            e.stopPropagation()
                        }}
                    >
                        <YakitSelect
                            allowClear
                            value={selectValue}
                            onChange={(v) => {
                                setSelectValue(v)
                            }}
                            size='small'
                        >
                            {defaultTags.map((item) => {
                                return (
                                    <YakitSelect.Option key={item.value} value={item.value}>
                                        {item.label}
                                    </YakitSelect.Option>
                                )
                            })}
                        </YakitSelect>
                    </div>
                </div>

                <Input.TextArea
                    ref={textAreaRef}
                    className={styles["textarea-body"]}
                    value={value}
                    bordered={false}
                    autoSize={{minRows: 1, maxRows: 3}}
                    placeholder='请留下对处置的说明...'
                    spellCheck={false}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onChange={(e) => setValue(e.target.value)}
                    size='small'
                />
                <div className={styles["right-footer"]}>
                    <YakitButton size="small" loading={loading} disabled={disabled} onClick={onSubmit}>
                        <SolidPaperairplaneIcon />
                        发布处置
                    </YakitButton>
                </div>
            </div>
        </div>
    )
})
