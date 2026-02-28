import React, { useEffect, useMemo, useRef, useState } from "react"
import { useControllableValue, useCreation, useDebounceFn, useInViewport, useMemoizedFn, useUpdateEffect } from "ahooks"
import { failed, success, yakitNotify } from "@/utils/notification"
import { TableVirtualResize } from "@/components/TableVirtualResize/TableVirtualResize"
import { ColumnsTypeProps } from "@/components/TableVirtualResize/TableVirtualResizeType"
import { YakitButton } from "@/components/yakitUI/YakitButton/YakitButton"
import {
    QuerySyntaxFlowScanTaskRequest,
    QuerySyntaxFlowScanTaskResponse,
    SyntaxFlowScanTask
} from "../yakRunnerCodeScan/CodeScanTaskListDrawer/CodeScanTaskListDrawer"
import {
    AuditCodePageInfoProps,
    PageNodeItemProps,
    usePageInfo,
    YakRunnerScanHistoryPageInfoProps
} from "@/store/pageInfo"
import { shallow } from "zustand/shallow"
import { YakitRoute } from "@/enums/yakitRoute"
import { defaultYakRunnerScanHistoryPageInfo } from "@/defaultConstants/yakRunnerScanHistory"
import emiter from "@/utils/eventBus/eventBus"
import classNames from "classnames"
import { formatTimestamp } from "@/utils/timeUtil"
import styles from "./YakRunnerScanHistory.module.scss"
import { YakitInput } from "@/components/yakitUI/YakitInput/YakitInput"
import { showYakitModal } from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import { YakitResizeBox } from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import { genDefaultPagination, QueryGeneralResponse } from "../invoker/schema"
import { YakitPopconfirm } from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import { Tooltip } from "antd"
import {
    OutlineArrowcirclerightIcon,
    OutlineChevrondownIcon,
    OutlineChevronrightIcon,
    OutlineRefreshIcon,
    OutlineReloadScanIcon,
    OutlineScanIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import { RollingLoadList } from "@/components/RollingLoadList/RollingLoadList"
import { VirtualPaging } from "@/hook/useVirtualTableHook/useVirtualTableHookType"
import { YakitCheckbox } from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import { CheckboxChangeEvent } from "antd/lib/checkbox"
import { apiQuerySSAPrograms } from "./utils"
import { getGroupNamesTotal } from "../yakRunnerCodeScan/utils"
import { JSONParseLog } from "@/utils/tool"
const { ipcRenderer } = window.require("electron")
export interface GenerateSSAReportResponse {
    Success: boolean
    Message: string
    ReportData: string
}

interface YakRunnerScanHistoryProp { }
const YakRunnerScanHistory: React.FC<YakRunnerScanHistoryProp> = (props) => {
    const { queryPagesDataById } = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById
        }),
        shallow
    )
    const initPageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(
            YakitRoute.YakRunner_ScanHistory,
            YakitRoute.YakRunner_ScanHistory
        )
        if (currentItem && currentItem.pageParamsInfo.yakRunnerScanHistory) {
            return { ...currentItem.pageParamsInfo.yakRunnerScanHistory }
        }
        return { ...defaultYakRunnerScanHistoryPageInfo }
    })
    const [pageInfo, setPageInfo] = useState<YakRunnerScanHistoryPageInfoProps>(initPageInfo())

    const isInitRequestRef = useRef<boolean>(true)
    const yakRunnerScanHistoryRef = useRef<HTMLDivElement>(null)
    const [inViewport] = useInViewport(yakRunnerScanHistoryRef)

    const onYakRunnerScanHistoryPageInfo = useMemoizedFn((info) => {
        try {
            const data = JSONParseLog(info, { page: "yakRunnerScanHistory", fun: "onYakRunnerScanHistoryPageInfo" }) as unknown as YakRunnerScanHistoryPageInfoProps
            if (!data) return
            isInitRequestRef.current = true
            setQuery((prev) => ({
                ...prev,
                Filter: {
                    ...prev.Filter,
                    Programs: data.Programs,
                    ProjectIds: data.ProjectIds
                }
            }))
            setPageInfo(data)
        } catch (error) { }
    })
    useEffect(() => {
        emiter.on("onYakRunnerScanHistoryPageInfo", onYakRunnerScanHistoryPageInfo)
        return () => {
            emiter.off("onYakRunnerScanHistoryPageInfo", onYakRunnerScanHistoryPageInfo)
        }
    }, [])
    useUpdateEffect(() => {
        if (inViewport && !isInitRequestRef.current) {
            update(1)
        }
    }, [inViewport])

    const [isRefresh, setIsRefresh] = useState<boolean>(false)
    const [query, setQuery] = useState<QuerySyntaxFlowScanTaskRequest>({
        Pagination: {
            Page: 1,
            Limit: 20,
            OrderBy: "created_at",
            Order: "desc"
        },
        Filter: {
            Kind: ["scan"],
            Programs: []
        },
        ShowDiffRisk: true
    })
    const [loading, setLoading] = useState(false)
    const [response, setResponse] = useState<QuerySyntaxFlowScanTaskResponse>({
        Data: [],
        Pagination: {
            Page: 1,
            Limit: 20,
            Order: "desc",
            OrderBy: "created_at"
        },
        Total: 0
    })
    const [clickItem, setClickItem] = useState<SSAProgram>()

    useEffect(() => {
        if (!clickItem) return
        setQuery((prev) => ({
            ...prev,
            Filter: {
                ...prev.Filter,
                Programs: [clickItem.Name]
            }
        }))
    }, [clickItem])

    const queyChangeUpdateData = useDebounceFn(
        () => {
            update(1)
        },
        { wait: 300 }
    ).run

    useEffect(() => {
        queyChangeUpdateData()
    }, [query])

    const update = useMemoizedFn((page: number) => {
        const params: QuerySyntaxFlowScanTaskRequest = {
            ...query,
            Pagination: {
                ...query.Pagination,
                Page: page
            }
        }
        isInitRequestRef.current = false
        const isInit = page === 1
        if ((params?.Filter?.Programs || []).length === 0) return
        if (isInit) {
            setLoading(true)
        }

        ipcRenderer
            .invoke("QuerySyntaxFlowScanTask", params)
            .then((res: QuerySyntaxFlowScanTaskResponse) => {
                const d = isInit ? res.Data : response.Data.concat(res.Data)
                setResponse({
                    ...res,
                    Data: d
                })
                if (isInit) {
                    setIsRefresh((prevIsRefresh) => !prevIsRefresh)
                }
            })
            .catch((e) => {
                yakitNotify("error", "获取扫描历史失败：" + e)
            })
            .finally(() => {
                setLoading(false)
            })
    })

    const renderRisk = useMemoizedFn((riskArr) => {
        return (
            <>
                {riskArr.map((item) => {
                    return item.count > 0 ? (
                        <div className={classNames(styles["risk-tag"], styles[`${item.risk}`])} key={item.text}>
                            <div className={styles["risk-text"]}>{item.text}</div>
                            <div className={styles["risk-num"]}>{item.count}</div>
                        </div>
                    ) : null
                })}
            </>
        )
    })

    const exportReport = useMemoizedFn((record: SyntaxFlowScanTask) => {
        let reportName = !!query.Filter?.Programs?.length ? `${query.Filter?.Programs[0]}-SSA扫描报告` : undefined
        const m = showYakitModal({
            title: "导出报告",
            content: (
                <div style={{ padding: 20 }}>
                    <YakitInput
                        defaultValue={reportName}
                        placeholder='请输入报告名称'
                        onChange={(e) => {
                            reportName = e.target.value
                        }}
                    />
                </div>
            ),
            onCancel: () => {
                m.destroy()
            },
            onOk: () => {
                ipcRenderer
                    .invoke("GenerateSSAReport", {
                        TaskID: record.TaskId,
                        ReportName: reportName
                    })
                    .then((res: GenerateSSAReportResponse) => {
                        yakitNotify("success", res.Message)
                        emiter.emit("openPage", JSON.stringify({ route: YakitRoute.DB_Report }))
                        m.destroy()
                    })
                    .catch((e) => {
                        yakitNotify("error", "导出报告失败：" + e)
                    })
            }
        })
    })

    const columns: ColumnsTypeProps[] = useCreation<ColumnsTypeProps[]>(
        () => [
            {
                title: "扫描时间",
                dataKey: "CreatedAt",
                width: 150,
                render: (text) => <div title={formatTimestamp(text)}>{text === 0 ? "-" : formatTimestamp(text)}</div>
            },
            {
                title: "漏洞数",
                dataKey: "oldRisk",
                render: (_, record: SyntaxFlowScanTask) => {
                    return (
                        <div className={styles["risk-tag-wrapper"]}>
                            {renderRisk([
                                {
                                    risk: "info",
                                    count: +record.InfoCount,
                                    text: "信息"
                                },
                                {
                                    risk: "low",
                                    count: +record.LowCount,
                                    text: "低危"
                                },
                                {
                                    risk: "warning",
                                    count: +record.WarningCount,
                                    text: "中危"
                                },
                                {
                                    risk: "high",
                                    count: +record.HighCount,
                                    text: "高危"
                                },
                                {
                                    risk: "critical",
                                    count: +record.CriticalCount,
                                    text: "严重"
                                }
                            ])}
                        </div>
                    )
                }
            },
            {
                title: "新增漏洞（与上次扫描对比）",
                dataKey: "newRisk",
                render: (_, record: SyntaxFlowScanTask) => {
                    return (
                        <div className={styles["risk-tag-wrapper"]}>
                            {renderRisk([
                                {
                                    risk: "info",
                                    count: +record.NewInfoCount,
                                    text: "信息"
                                },
                                {
                                    risk: "low",
                                    count: +record.NewLowCount,
                                    text: "低危"
                                },
                                {
                                    risk: "warning",
                                    count: +record.NewWarningCount,
                                    text: "中危"
                                },
                                {
                                    risk: "high",
                                    count: +record.NewHighCount,
                                    text: "高危"
                                },
                                {
                                    risk: "critical",
                                    count: +record.NewCriticalCount,
                                    text: "严重"
                                }
                            ])}
                        </div>
                    )
                }
            },
            {
                title: "操作",
                dataKey: "action",
                width: 160,
                fixed: "right",
                render: (_, record: SyntaxFlowScanTask) => (
                    <>
                        <YakitButton
                            type='text'
                            onClick={(e) => {
                                e.stopPropagation()
                                const params: AuditCodePageInfoProps = {
                                    Schema: "syntaxflow",
                                    Location: !!query.Filter?.Programs?.length ? query.Filter?.Programs[0] : "",
                                    Path: `/`,
                                    leftTabActive: "file",
                                    runtimeId: record.TaskId,
                                    refreshRiskOrRuleList: true,
                                    isShowCompare: true
                                }
                                emiter.emit(
                                    "openPage",
                                    JSON.stringify({
                                        route: YakitRoute.YakRunner_Audit_Code,
                                        params: params
                                    })
                                )
                            }}
                        >
                            查看详情
                        </YakitButton>
                        <YakitButton
                            type='text'
                            onClick={(e) => {
                                e.stopPropagation()
                                exportReport(record)
                            }}
                        >
                            导出报告
                        </YakitButton>
                    </>
                )
            }
        ],
        [query]
    )

    const ResizeBoxProps = useCreation(() => {
        let p = {
            firstRatio: "280px"
        }
        return p
    }, [])
    return (
        <div className={styles["YakRunnerScanHistory"]} ref={yakRunnerScanHistoryRef} id='yakrunner-scan-history'>
            <div className={classNames("yakit-content-single-ellipsis", styles["YakRunnerScanHistory-title"])}>
                {pageInfo.Programs.length > 0 ? pageInfo.Programs[0] : "未识别项目名"}
            </div>
            <div className={styles["YakRunnerScanHistory-main"]}>
                <YakitResizeBox
                    firstMinSize={"280px"}
                    firstNode={
                        <CompileHistoryList pageInfo={pageInfo} clickItem={clickItem} setClickItem={setClickItem} />
                    }
                    secondNode={
                        <TableVirtualResize<SyntaxFlowScanTask>
                            loading={loading}
                            query={query}
                            isRefresh={isRefresh}
                            titleHeight={42}
                            renderTitle={
                                <div className={styles["YakRunnerScanHistory-table-title"]}>
                                    扫描历史
                                    <YakitButton type='text' icon={<OutlineRefreshIcon />} onClick={() => update(1)} />
                                </div>
                            }
                            data={response.Data}
                            enableDrag={false}
                            renderKey='Id'
                            columns={columns}
                            useUpAndDown
                            pagination={{
                                total: response.Total,
                                limit: response.Pagination.Limit,
                                page: response.Pagination.Page,
                                onChange: (page) => {
                                    update(page)
                                }
                            }}
                        />
                    }
                    {...ResizeBoxProps}
                />
            </div>
        </div>
    )
}

interface SSAProgramFilter {
    ProgramNames?: string[]
    Languages?: string[]
    Ids?: number[]
    // update range
    BeforeUpdatedAt?: number
    AfterUpdatedAt?: number
    // fuzz search
    Keyword?: string
    // id range
    AfterID?: number
    BeforeID?: number

    ProjectIds?: number[]
}

export interface QuerySSAProgramRequest {
    Pagination: VirtualPaging
    Filter: SSAProgramFilter
}

export interface SSAProgram {
    // basic info
    CreateAt: number
    UpdateAt: number
    Name: string
    Description: string
    Dbpath: string
    Language: string
    EngineVersion: string

    // need re-compile
    Recompile: boolean

    Id: number
    // risk number
    CriticalRiskNumber: number
    HighRiskNumber: number
    WarnRiskNumber: number
    LowRiskNumber: number
    InfoRiskNumber: number

    SSAProjectID: number

    // incremental compilation info
    IsIncrementalCompile?: boolean
    IncrementalGroupId?: string
    HeadProgramName?: string
    OverlayLayers?: string[]
}

export type QuerySSAProgramResponse = QueryGeneralResponse<SSAProgram>

export interface DeleteSSAProgramRequest {
    DeleteAll?: boolean
    Filter?: SSAProgramFilter
}

/** 编译历史展示项：增量编译组根节点 / 增量编译子节点 / 独立节点 */
export interface CompileHistoryDisplayItem {
    displayId: string
    program: SSAProgram
    isGroupRoot?: boolean
    children?: SSAProgram[]
    groupId?: string
    isGroupChild?: boolean
}

/** 将 programs 聚合为展示列表：IsIncrementalCompile 且 IncrementalGroupId 相同的聚成 2 层树，HeadProgramName 为根 */
export function buildCompileHistoryDisplayList(programs: SSAProgram[]): CompileHistoryDisplayItem[] {
    if (!programs.length) return []
    const incrementalGroups = new Map<string, SSAProgram[]>()
    const nonIncremental: SSAProgram[] = []

    for (const p of programs) {
        if (p.IsIncrementalCompile && p.IncrementalGroupId) {
            const group = incrementalGroups.get(p.IncrementalGroupId) || []
            group.push(p)
            incrementalGroups.set(p.IncrementalGroupId, group)
        } else {
            nonIncremental.push(p)
        }
    }

    type GroupInfo = { groupId: string; root: SSAProgram; children: SSAProgram[] }
    const groups: GroupInfo[] = []
    for (const [groupId, groupPrograms] of incrementalGroups) {
        const headName = groupPrograms[0]?.HeadProgramName || groupPrograms[0]?.Name
        const rootProgram = groupPrograms.find((p) => p.Name === headName) || groupPrograms[0]
        const childPrograms = groupPrograms.filter((p) => p.Name !== headName)
        groups.push({ groupId, root: rootProgram, children: childPrograms })
    }

    const topLevel = [
        ...groups.map((g) => ({ type: "group" as const, updateAt: g.root.UpdateAt, data: g })),
        ...nonIncremental.map((p) => ({ type: "single" as const, updateAt: p.UpdateAt, data: p }))
    ].sort((a, b) => b.updateAt - a.updateAt)

    const result: CompileHistoryDisplayItem[] = []
    for (const item of topLevel) {
        if (item.type === "group") {
            const { groupId, root, children } = item.data
            result.push({
                displayId: `group-root-${groupId}`,
                program: root,
                isGroupRoot: true,
                children,
                groupId
            })
            for (const child of children.sort((a, b) => b.UpdateAt - a.UpdateAt)) {
                result.push({
                    displayId: `group-child-${child.Id}`,
                    program: child,
                    isGroupChild: true,
                    groupId
                })
            }
        } else {
            result.push({
                displayId: `single-${item.data.Id}`,
                program: item.data,
                isGroupRoot: false,
                isGroupChild: false
            })
        }
    }
    return result
}

interface CompileHistoryListProps {
    pageInfo: YakRunnerScanHistoryPageInfoProps
    clickItem: SSAProgram | undefined
    setClickItem: (item: SSAProgram) => void
}

// 编译历史列表
const CompileHistoryList: React.FC<CompileHistoryListProps> = (props) => {
    const { pageInfo } = props
    const [loading, setLoading] = useState<boolean>(false)
    const [hasMore, setHasMore] = useState<boolean>(false)
    const [isRefresh, setIsRefresh] = useState<boolean>(false)
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
    const [checkedList, setCheckedList] = useState<number[]>([])
    const [clickItem, setClickItem] = useControllableValue<SSAProgram>(props, {
        defaultValue: undefined,
        valuePropName: "clickItem",
        trigger: "setClickItem"
    })
    const [query, setQuery] = useState<QuerySSAProgramRequest>({
        Pagination: {
            Page: 1,
            Limit: 20,
            OrderBy: "created_at",
            Order: "desc"
        },
        Filter: {}
    })
    const [response, setResponse] = useState<QuerySSAProgramResponse>({
        Pagination: genDefaultPagination(20),
        Data: [],
        Total: 0
    })
    useEffect(() => {
        update(1)
    }, [pageInfo])

    const update = useMemoizedFn((page: number) => {
        setLoading(true)
        const paginationProps = {
            ...query.Pagination,
            Page: page,
            Limit: 20
        }
        const finalParams: QuerySSAProgramRequest = {
            Filter: {
                ...query.Filter,
                ProjectIds: pageInfo.ProjectIds
            },
            Pagination: paginationProps
        }

        const isInit = page === 1
        apiQuerySSAPrograms(finalParams)
            .then((res: QuerySSAProgramResponse) => {
                const resData = res?.Data || []
                if (resData.length > 0) {
                    setQuery((prevQuery) => ({
                        ...prevQuery,
                        Pagination: {
                            ...prevQuery.Pagination,
                            Page: +res.Pagination.Page
                        }
                    }))
                }
                const d = isInit ? resData : (response?.Data || []).concat(resData)
                const displayItems = buildCompileHistoryDisplayList(d)
                if (displayItems.length > 0) {
                    setClickItem(displayItems[0].program)
                }
                const isMore = resData.length < res.Pagination.Limit || d.length === response.Total

                setHasMore(!isMore)
                setResponse({
                    ...res,
                    Data: d
                })
                if (isInit) {
                    setIsRefresh((prevIsRefresh) => !prevIsRefresh)
                }
            })
            .finally(() => {
                setLoading(false)
            })
            .catch(() => { })
    })

    const handleCheckboxChange = useMemoizedFn((e: CheckboxChangeEvent, id: number) => {
        const checked = e.target.checked
        setCheckedList((prevCheckedList) => {
            if (checked) {
                return [...prevCheckedList, id]
            } else {
                return prevCheckedList.filter((item) => item !== id)
            }
        })
    })

    // 多个删除
    const onRemoveMultiple = useMemoizedFn(() => {
        setLoading(true)
        let params: DeleteSSAProgramRequest = {
            Filter: {
                Ids: checkedList
            }
        }
        if (checkedList.length === 0) {
            params = {
                DeleteAll: true
            }
        }
        ipcRenderer
            .invoke("DeleteSSAPrograms", params)
            .then(() => {
                update(1)
                setCheckedList([])
                success("删除成功")
            })
            .catch((error) => {
                setLoading(false)
                failed(`删除失败${error}`)
            })
    })

    // 单个删除
    const onDelete = useMemoizedFn((params: DeleteSSAProgramRequest, isHasChildren: boolean) => {
        try {
            setLoading(true)
            ipcRenderer.invoke("DeleteSSAPrograms", params).then(() => {
                if(isHasChildren){
                    update(1)
                    setCheckedList([])
                    success("删除成功")
                    return
                }
                setResponse((prevResponse) => {
                    const newData = prevResponse.Data.filter(
                        (item) => item.Id !== (params.Filter?.Ids ? params.Filter.Ids[0] : -1)
                    )
                    return {
                        ...prevResponse,
                        Data: newData,
                        Total: prevResponse.Total - 1
                    }
                })
                setCheckedList([])
                setLoading(false)
                success("删除成功")
            })
        } catch (error) {
            setLoading(false)
            failed(`删除失败${error}`)
        }
    })

    const toggleGroupExpand = useMemoizedFn((groupId: string) => {
        setCollapsedGroups((prev) => {
            const next = new Set(prev)
            if (next.has(groupId)) next.delete(groupId)
            else next.add(groupId)
            return next
        })
    })

    const displayList = useMemo(() => {
        const full = buildCompileHistoryDisplayList(response.Data)
        return full.filter(
            (item) =>
                !item.isGroupChild || !(item.groupId && collapsedGroups.has(item.groupId))
        )
    }, [response.Data, collapsedGroups])

    const renderProgramRow = useMemoizedFn(
        (rowData: CompileHistoryDisplayItem) => {
            const program = rowData.program
            const isChecked = checkedList.includes(program.Id)
            const isClick = clickItem?.Id === program.Id
            const isExpanded = rowData.groupId ? !collapsedGroups.has(rowData.groupId) : false
            const hasChildren = !!rowData.children?.length

            return (
                <div
                    className={classNames(styles["history-item-box"], {
                        [styles["history-item-box-active"]]: isClick,
                        [styles["history-item-box-no-active"]]: !isClick,
                        [styles["history-item-box-child"]]: rowData.isGroupChild
                    })}
                    key={rowData.displayId}
                    onClick={() => setClickItem(program)}
                >
                    <div className={styles["header"]}>
                        {rowData.isGroupRoot && hasChildren ? (
                            <div
                                className={styles["expand-icon"]}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    toggleGroupExpand(rowData.groupId!)
                                }}
                            >
                                {isExpanded ? (
                                    <OutlineChevrondownIcon
                                        className={classNames(styles["chevron-icon"], {
                                            [styles["chevron-icon-active"]]: isClick,
                                        })}
                                    />
                                ) : (
                                    <OutlineChevronrightIcon
                                        className={classNames(styles["chevron-icon"], {
                                            [styles["chevron-icon-active"]]: isClick,
                                        })}
                                    />
                                )}
                            </div>
                        ) : (
                            <div className={styles["expand-placeholder"]} />
                        )}
                        {!rowData.isGroupChild && <YakitCheckbox
                            checked={isChecked}
                            onChange={(e) => handleCheckboxChange(e, program.Id)}
                            onClick={(e) => e.stopPropagation()}
                        />}
                        <div
                            className={classNames(styles["time"], {
                                [styles["time-active"]]: isClick
                            })}
                        >
                            {formatTimestamp(program.UpdateAt)}
                        </div>
                    </div>

                    <div className={styles["option"]}>
                        <Tooltip title={"代码扫描"}>
                            <div
                                className={classNames(styles["icon-wrapper"], {
                                    [styles["icon-wrapper-active"]]: isClick
                                })}
                                onClick={async (e) => {
                                    e.stopPropagation()
                                    try {
                                        const selectTotal = await getGroupNamesTotal([program.Language])
                                        emiter.emit(
                                            "openPage",
                                            JSON.stringify({
                                                route: YakitRoute.YakRunner_Code_Scan,
                                                params: {
                                                    projectName:
                                                        pageInfo.Programs.length > 0
                                                            ? pageInfo.Programs[0]
                                                            : "项目名异常",
                                                    projectId:
                                                        pageInfo.ProjectIds.length > 0
                                                            ? pageInfo.ProjectIds[0]
                                                            : 0,
                                                    historyName: [program.Name],
                                                    GroupNames: [program.Language],
                                                    selectTotal
                                                }
                                            })
                                        )
                                    } catch (error) {
                                        failed(`跳转代码扫描页失败${error}`)
                                    }
                                }}
                            >
                                <OutlineScanIcon />
                            </div>
                        </Tooltip>
                        <Tooltip title={"打开项目"}>
                            <div
                                className={classNames(styles["icon-wrapper"], {
                                    [styles["icon-wrapper-active"]]: isClick
                                })}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    const params: AuditCodePageInfoProps = {
                                        Schema: "syntaxflow",
                                        Location: program.Name,
                                        Path: `/`
                                    }
                                    emiter.emit(
                                        "openPage",
                                        JSON.stringify({
                                            route: YakitRoute.YakRunner_Audit_Code,
                                            params
                                        })
                                    )
                                }}
                            >
                                <OutlineArrowcirclerightIcon />
                            </div>
                        </Tooltip>
                        {!rowData.isGroupChild && <div
                            className={classNames(styles["icon-wrapper"], styles["icon-wrapper-error"], {
                                [styles["icon-wrapper-active"]]: isClick
                            })}
                            onClick={(e) => {
                                e.stopPropagation()
                                const isHasChildren = !!(rowData.isGroupRoot && hasChildren)
                                onDelete({ Filter: { Ids: [program.Id] } }, isHasChildren)
                            }}
                        >
                            <OutlineTrashIcon />
                        </div>}
                    </div>
                </div>
            )
        }
    )

    return (
        <div className={styles["compile-history"]}>
            <div className={styles["compile-history-header"]}>
                <div className={classNames("yakit-content-single-ellipsis", styles["compile-history-title"])}>
                    编译历史
                    <YakitButton type='text' icon={<OutlineRefreshIcon />} onClick={() => update(1)} />
                </div>
                <div className={styles["compile-history-sub-title"]}>
                    <div className={styles["modal-sub-title"]}>
                        <YakitPopconfirm
                            title={checkedList.length > 0 ? "确定删除勾选数据吗？" : "确定清空列表数据吗?"}
                            onConfirm={() => {
                                onRemoveMultiple()
                            }}
                            placement='bottomRight'
                        >
                            <YakitButton
                                disabled={response.Data.length === 0}
                                className={styles["clear-button"]}
                                type='text'
                                colors='danger'
                            >
                                {checkedList.length > 0 ? "删除" : "清空"}
                            </YakitButton>
                        </YakitPopconfirm>
                    </div>
                </div>
            </div>

            <div className={styles["compile-history-list-container"]}>
                <RollingLoadList<CompileHistoryDisplayItem>
                    loading={loading}
                    isRef={isRefresh}
                    hasMore={hasMore}
                    data={displayList}
                    page={response.Pagination.Page}
                    loadMoreData={() => {
                        update(+response.Pagination.Page + 1)
                    }}
                    rowKey='displayId'
                    defItemHeight={36}
                    renderRow={(rowData) => renderProgramRow(rowData)}
                />
            </div>
        </div>
    )
}

export default YakRunnerScanHistory
