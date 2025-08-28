import React, {useEffect, useRef, useState} from "react"
import {useCreation, useDebounceFn, useInViewport, useMemoizedFn, useUpdateEffect} from "ahooks"
import {yakitNotify} from "@/utils/notification"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {ColumnsTypeProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
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
import {shallow} from "zustand/shallow"
import {YakitRoute} from "@/enums/yakitRoute"
import {defaultYakRunnerScanHistoryPageInfo} from "@/defaultConstants/yakRunnerScanHistory"
import emiter from "@/utils/eventBus/eventBus"
import classNames from "classnames"
import {formatTimestamp} from "@/utils/timeUtil"

import styles from "./YakRunnerScanHistory.module.scss"
const {ipcRenderer} = window.require("electron")

interface YakRunnerScanHistoryProp {}
const YakRunnerScanHistory: React.FC<YakRunnerScanHistoryProp> = (props) => {
    const {queryPagesDataById} = usePageInfo(
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
            return {...currentItem.pageParamsInfo.yakRunnerScanHistory}
        }
        return {...defaultYakRunnerScanHistoryPageInfo}
    })
    const [pageInfo, setPageInfo] = useState<YakRunnerScanHistoryPageInfoProps>(initPageInfo())
    const isInitRequestRef = useRef<boolean>(true)
    const yakRunnerScanHistoryRef = useRef<HTMLDivElement>(null)
    const [inViewport] = useInViewport(yakRunnerScanHistoryRef)

    const onYakRunnerScanHistoryPageInfo = useMemoizedFn((info) => {
        try {
            const data = JSON.parse(info) as unknown as YakRunnerScanHistoryPageInfoProps
            if (!data) return
            isInitRequestRef.current = true
            setQuery((prev) => ({
                ...prev,
                Filter: {
                    ...prev.Filter,
                    Programs: data.Programs
                }
            }))
        } catch (error) {}
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

    useEffect(() => {
        setQuery((prev) => ({
            ...prev,
            Filter: {
                ...prev.Filter,
                Programs: pageInfo.Programs
            }
        }))
    }, [])

    const queyChangeUpdateData = useDebounceFn(
        () => {
            update(1)
        },
        {wait: 300}
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
                width: 85,
                fixed: "right",
                render: (_, record: SyntaxFlowScanTask) => (
                    <YakitButton
                        type='text'
                        onClick={() => {
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
                )
            }
        ],
        [query]
    )

    return (
        <div className={styles["YakRunnerScanHistory"]} ref={yakRunnerScanHistoryRef}>
            <TableVirtualResize<SyntaxFlowScanTask>
                loading={loading}
                query={query}
                isRefresh={isRefresh}
                titleHeight={42}
                renderTitle={<div className={styles["YakRunnerScanHistory-table-title"]}>扫描历史</div>}
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
            ></TableVirtualResize>
        </div>
    )
}

export default YakRunnerScanHistory
