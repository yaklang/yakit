import React, {ForwardedRef, forwardRef, useEffect, useImperativeHandle, useRef, useState} from "react"
import {Divider, Tooltip} from "antd"
import {useControllableValue, useCreation, useDebounceFn, useGetState, useMemoizedFn} from "ahooks"
import styles from "./CodeScanTaskListDrawer.module.scss"
import {yakitNotify} from "@/utils/notification"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {OutlineLoadingIcon, OutlineQuestionmarkcircleIcon, OutlineRefreshIcon} from "@/assets/icon/outline"
import {genDefaultPagination} from "@/pages/invoker/schema"
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {formatTimestamp} from "@/utils/timeUtil"
import {Paging} from "@/utils/yakQueryHTTPFlow"
import {SolidCheckCircleIcon, SolidPlayIcon, SolidXcircleIcon} from "@/assets/icon/solid"
import {HybridScanModeType} from "@/models/HybridScan"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/enums/yakitRoute"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {SyntaxFlowScanRequest} from "../YakRunnerCodeScanType"
const {ipcRenderer} = window.require("electron")
interface CodeScanTaskListForwardedRefProps {
    onRemove: () => void
}

export interface CodeScanTaskListDrawerProps {
    visible: boolean
    setVisible: (v: boolean) => void
}
export const CodeScanTaskListDrawer: React.FC<CodeScanTaskListDrawerProps> = (props) => {
    const {visible, setVisible} = props

    const [removeLoading, setRemoveLoading] = useState<boolean>(false)
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
    const codeScanBatchRaskListRef = useRef<CodeScanTaskListForwardedRefProps>({
        onRemove: () => {}
    })
    const onClose = useMemoizedFn(() => {
        setVisible(false)
    })
    const onRemove = useMemoizedFn(async () => {
        setRemoveLoading(true)
        try {
            await codeScanBatchRaskListRef.current.onRemove()
        } catch (error) {}

        setTimeout(() => {
            setRemoveLoading(false)
        }, 300)
    })

    return (
        <YakitDrawer
            visible={visible}
            onClose={onClose}
            width='45%'
            title='任务列表'
            extra={
                <>
                    {selectedRowKeys.length === 0 ? (
                        <YakitPopconfirm title='该操作会清空下面所有数据' onConfirm={onRemove}>
                            <YakitButton loading={removeLoading} type='primary' danger>
                                清空
                            </YakitButton>
                        </YakitPopconfirm>
                    ) : (
                        <YakitPopconfirm title='该操作会删除勾选数据' onConfirm={onRemove}>
                            <YakitButton loading={removeLoading} type='primary' danger>
                                删除
                            </YakitButton>
                        </YakitPopconfirm>
                    )}
                </>
            }
            bodyStyle={{overflow: "hidden"}}
        >
            <CodeScanTaskList
                visible={visible}
                setVisible={setVisible}
                selectedRowKeys={selectedRowKeys}
                setSelectedRowKeys={setSelectedRowKeys}
                ref={codeScanBatchRaskListRef}
            />
        </YakitDrawer>
    )
}

interface SyntaxFlowScanTaskFilter {
    Programs?: string[]
    Status?: string[]
    TaskIds?: string[]
    FromId?: number
    UntilId?: number
    Kind?: string[]
}

interface QuerySyntaxFlowScanTaskRequest {
    Pagination: Paging
    Filter?: SyntaxFlowScanTaskFilter
}

interface SyntaxFlowScanTask {
    Id: number
    CreatedAt: number
    UpdatedAt: number
    TaskId: string
    Programs: string[]
    RuleCount: number
    // executing / paused / done / error
    Status: string
    Reason: string
    FailedQuery: number
    SkipQuery: number
    SuccessQuery: number
    RiskCount: number
    TotalQuery: number

    Config: SyntaxFlowScanRequest
    Kind: "debug" | "scan"
}

interface QuerySyntaxFlowScanTaskResponse {
    Pagination: Paging
    Data: SyntaxFlowScanTask[]
    Total: number
}

interface DeleteSyntaxFlowScanTaskRequest {
    DeleteAll?: boolean
    Filter?: SyntaxFlowScanTaskFilter
}

interface CodeScanTaskListProps {
    ref?: ForwardedRef<CodeScanTaskListForwardedRefProps>
    visible: boolean
    setVisible: (v: boolean) => void
    selectedRowKeys: string[]
    setSelectedRowKeys: (v: string[]) => void
}

const CodeScanTaskList: React.FC<CodeScanTaskListProps> = React.memo(
    forwardRef((props, ref) => {
        const {getPageInfoByRuntimeId} = usePageInfo(
            (s) => ({
                getPageInfoByRuntimeId: s.getPageInfoByRuntimeId
            }),
            shallow
        )
        const {visible, setVisible} = props
        const [isRefresh, setIsRefresh] = useState<boolean>(false)
        const [params, setParams] = useState<QuerySyntaxFlowScanTaskRequest>({
            Pagination: genDefaultPagination(20, 1)
        })
        const [loading, setLoading] = useState<boolean>(false)
        const [isAllSelect, setIsAllSelect] = useState<boolean>(false)
        const [response, setResponse] = useState<QuerySyntaxFlowScanTaskResponse>({
            Pagination: genDefaultPagination(),
            Data: [],
            Total: 0
        })
        const [selectedRowKeys, setSelectedRowKeys] = useControllableValue<string[]>(props, {
            defaultValue: [],
            valuePropName: "selectedRowKeys",
            trigger: "setSelectedRowKeys"
        })

        useImperativeHandle(
            ref,
            () => ({
                onRemove: () => {
                    onBatchRemove()
                }
            }),
            []
        )

        useEffect(() => {
            update(1)
        }, [visible])

        const getStatusNode = useMemoizedFn((record: SyntaxFlowScanTask) => {
            switch (record.Status) {
                case "done":
                    return (
                        <div className={styles["table-status-item"]}>
                            <SolidCheckCircleIcon className={styles["icon-success"]} />
                            <span className={styles["status-text"]}>已完成</span>
                        </div>
                    )
                case "executing":
                    return (
                        <div className={styles["table-status-item"]}>
                            <OutlineLoadingIcon className={styles["icon-primary"]} />
                            <span className={styles["status-text"]}>执行中</span>
                        </div>
                    )
                case "paused":
                    return (
                        <div className={styles["table-status-item"]}>
                            <SolidPlayIcon className={styles["icon-helper"]} />
                            <span className={styles["status-text"]}>暂停</span>
                        </div>
                    )
                default:
                    return (
                        <div className={styles["table-status-item"]}>
                            <SolidXcircleIcon className={styles["icon-danger"]} />
                            <span className={styles["status-text"]}>失败</span>
                            <Tooltip title={record.Reason || "未知原因"}>
                                <OutlineQuestionmarkcircleIcon className={styles["icon-question"]} />
                            </Tooltip>
                        </div>
                    )
            }
        })

        const getAction = useMemoizedFn((record: SyntaxFlowScanTask) => {
            switch (record.Status) {
                case "executing":
                    return (
                        <YakitButton
                            type='text'
                            onClick={(e) => {
                                e.stopPropagation()
                                onPaused(record)
                            }}
                        >
                            暂停
                        </YakitButton>
                    )
                case "paused":
                    return (
                        <YakitButton
                            type='text'
                            onClick={(e) => {
                                e.stopPropagation()
                                onContinue(record)
                            }}
                        >
                            继续
                        </YakitButton>
                    )
                default:
                    return (
                        <YakitButton
                            type='text'
                            danger
                            onClick={(e) => {
                                e.stopPropagation()
                                onRemoveSingle(record.TaskId)
                            }}
                        >
                            删除
                        </YakitButton>
                    )
            }
        })

        const columns: ColumnsTypeProps[] = useCreation<ColumnsTypeProps[]>(() => {
            return [
                {
                    title: "扫描目标",
                    dataKey: "FirstTarget",
                    width: 160,
                    fixed: "left",
                    render: (_, record: SyntaxFlowScanTask) => {
                        return <>{record.Programs.join(",")}</>
                    },
                    filterProps: {
                        filtersType: "input",
                        filterKey: "keyword"
                    }
                },
                {
                    title: "状态",
                    dataKey: "Status",
                    width: 90,
                    render: (_, record: SyntaxFlowScanTask) => getStatusNode(record),
                    filterProps: {
                        filtersType: "select",
                        filterMultiple: true,
                        filtersSelectAll: {
                            isAll: true
                        },
                        filterKey: "Status",
                        filters: [
                            {
                                label: "已完成",
                                value: "done"
                            },
                            {
                                label: "执行中",
                                value: "executing"
                            },
                            {
                                label: "暂停",
                                value: "paused"
                            },
                            {
                                label: "失败",
                                value: "error"
                            }
                        ]
                    }
                },
                {
                    title: "任务类型",
                    dataKey: "Kind",
                    render: (value) => {
                        switch (value) {
                            case "debug":
                                return "规则调试"
                            case "scan":
                                return "代码扫描"
                            default:
                                return "-"
                        }
                    },
                    filterProps: {
                        filtersType: "select",
                        filterMultiple: true,
                        filtersSelectAll: {
                            isAll: true
                        },
                        filterKey: "Kind",
                        filters: [
                            {
                                label: "代码扫描",
                                value: "scan"
                            },
                            {
                                label: "规则调试",
                                value: "debug"
                            }
                        ]
                    }
                },
                {
                    title: "创建时间",
                    dataKey: "CreatedAt",
                    render: (v) => (v ? formatTimestamp(v) : "-"),
                    sorterProps: {
                        sorterKey: "created_at",
                        sorter: true
                    }
                },
                {
                    title: "更新时间",
                    dataKey: "UpdatedAt",
                    render: (v) => (v ? formatTimestamp(v) : "-"),
                    enableDrag: false,
                    sorterProps: {
                        sorterKey: "updated_at",
                        sorter: true
                    }
                },
                {
                    title: "操作",
                    dataKey: "action",
                    fixed: "right",
                    width: 120,
                    render: (_, record: SyntaxFlowScanTask) => (
                        <>
                            {getAction(record)}
                            <Divider type='vertical' style={{margin: 0}} />
                            {record.Status === "error" ? (
                                <YakitButton
                                    type='text'
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onDetails(record, "new")
                                    }}
                                >
                                    重试
                                </YakitButton>
                            ) : (
                                <YakitButton
                                    type='text'
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onDetails(record, "status")
                                    }}
                                >
                                    查看
                                </YakitButton>
                            )}
                        </>
                    )
                }
            ]
        }, [visible, isRefresh])

        const update = useMemoizedFn((page?: number, limit?: number) => {
            const paginationProps = {
                ...params.Pagination,
                Page: page || 1,
                Limit: limit || params.Pagination.Limit
            }
            setLoading(true)
            const finalParams: QuerySyntaxFlowScanTaskRequest = {
                ...params,
                Pagination: paginationProps
            }
            ipcRenderer
                .invoke("QuerySyntaxFlowScanTask", finalParams)
                .then((res: QuerySyntaxFlowScanTaskResponse) => {
                    const newPage = +res.Pagination.Page
                    const d = newPage === 1 ? res.Data : (response?.Data || []).concat(res.Data)
                    setResponse({
                        ...res,
                        Data: d
                    })
                    if (newPage === 1) {
                        setIsRefresh(!isRefresh)
                        setSelectedRowKeys([])
                        setIsAllSelect(false)
                    }
                    if (+res.Total !== selectedRowKeys.length) {
                        setIsAllSelect(false)
                    }
                })
                .catch((e) => {
                    yakitNotify("error", "获取任务列表失败:" + e)
                })
                .finally(() => setTimeout(() => setLoading(false), 300))
        })

        const onRefresh = useMemoizedFn(() => {
            update(1)
        })

        const onDetails = useMemoizedFn((record: SyntaxFlowScanTask, codeScanMode: HybridScanModeType) => {
            const runtimeId = record.TaskId
            const projectName = record.Programs
            const selectGroupListByKeyWord = record.Config.Filter?.GroupNames
            const route = YakitRoute.YakRunner_Code_Scan
            const current: PageNodeItemProps | undefined = getPageInfoByRuntimeId(route, runtimeId)
            // 重试new 都是新建页面
            if (!!current && codeScanMode !== "new") {
                emiter.emit("switchSubMenuItem", JSON.stringify({pageId: current.pageId}))
                setTimeout(() => {
                    // 页面打开的情况下，查看只需要切换二级菜单选中项，不需要重新查询数据
                    if (codeScanMode !== "status") {
                        emiter.emit(
                            "onSetCodeScanTaskStatus",
                            JSON.stringify({
                                runtimeId,
                                codeScanMode,
                                projectName,
                                selectGroupListByKeyWord,
                                pageId: current.pageId
                            })
                        )
                    }
                }, 200)
            } else {
                emiter.emit(
                    "openPage",
                    JSON.stringify({
                        route,
                        params: {
                            runtimeId,
                            codeScanMode,
                            projectName,
                            selectGroupListByKeyWord
                        }
                    })
                )
            }
            setVisible(false)
        })

        const onTableChange = useDebounceFn(
            (page: number, limit: number, sorter: SortProps, filter: any) => {
                setParams((oldParams) => ({
                    Pagination: {
                        ...oldParams.Pagination,
                        Order: sorter.order === "asc" ? "asc" : "desc",
                        OrderBy: sorter.order === "none" ? "updated_at" : sorter.orderBy
                    },
                    Filter: {
                        ...oldParams.Filter,
                        ...filter
                    }
                }))
                setTimeout(() => {
                    update(1, limit)
                }, 100)
            },
            {wait: 500}
        ).run

        const onRemoveSingle = useMemoizedFn((taskId: string) => {
            const removeParams: DeleteSyntaxFlowScanTaskRequest = {
                Filter: {
                    TaskIds: [taskId]
                }
            }
            ipcRenderer
                .invoke("DeleteSyntaxFlowScanTask", removeParams)
                .then(() => {
                    setResponse({
                        ...response,
                        Total: response.Total - 1,
                        Data: response.Data.filter((item) => item.TaskId !== taskId)
                    })
                })
                .finally(() =>
                    setTimeout(() => {
                        setLoading(false)
                    }, 300)
                )
        })
        const onBatchRemove = useMemoizedFn(() => {
            const filter = isAllSelect ? {...params.Filter} : {}
            const removeParams: DeleteSyntaxFlowScanTaskRequest = {
                Filter: {
                    ...filter,
                    TaskIds: isAllSelect ? [] : selectedRowKeys
                }
            }
            setLoading(true)
            ipcRenderer
                .invoke("DeleteSyntaxFlowScanTask", removeParams)
                .then(() => {
                    update(1)
                })
                .finally(() =>
                    setTimeout(() => {
                        setLoading(false)
                    }, 300)
                )
        })
        const onSelectAll = (newSelectedRowKeys: string[], selected: SyntaxFlowScanTask[], checked: boolean) => {
            setIsAllSelect(checked)
            setSelectedRowKeys(newSelectedRowKeys)
        }
        const onChangeCheckboxSingle = useMemoizedFn((c: boolean, keys: string) => {
            if (c) {
                setSelectedRowKeys((s) => [...s, keys])
            } else {
                setSelectedRowKeys((s) => s.filter((ele) => ele !== keys))
                setIsAllSelect(false)
            }
        })

        /**暂停任务 */
        const onPaused = useMemoizedFn((record: SyntaxFlowScanTask) => {
            onDetails(record, "pause")
        })
        /**继续任务 */
        const onContinue = useMemoizedFn((record: SyntaxFlowScanTask) => {
            onDetails(record, "resume")
        })
        return (
            <TableVirtualResize<SyntaxFlowScanTask>
                query={params.Filter}
                size='middle'
                extra={<YakitButton type='text2' icon={<OutlineRefreshIcon />} onClick={onRefresh} />}
                isRefresh={isRefresh}
                renderKey='TaskId'
                data={response?.Data || []}
                loading={loading}
                enableDrag={true}
                columns={columns}
                pagination={{
                    page: response?.Pagination.Page || 0,
                    limit: response?.Pagination.Limit || 20,
                    total: response?.Total && response?.Total > 0 ? Number(response.Total) : 0,
                    onChange: update
                }}
                onChange={onTableChange}
                isShowTotal={true}
                rowSelection={{
                    isAll: isAllSelect,
                    type: "checkbox",
                    selectedRowKeys: selectedRowKeys,
                    onSelectAll,
                    onChangeCheckboxSingle
                }}
            />
        )
    })
)
