import {useControllableValue, useCreation, useDebounceFn, useMemoizedFn} from "ahooks"
import React, {ForwardedRef, forwardRef, useEffect, useImperativeHandle, useRef, useState} from "react"
import styles from "./PluginBatchExecutor.module.scss"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {formatTimestamp} from "@/utils/timeUtil"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {HybridScanModeType, HybridScanTask, HybridScanTaskSourceType} from "@/models/HybridScan"
import {
    DeleteHybridScanTaskRequest,
    QueryHybridScanTaskRequest,
    QueryHybridScanTaskResponse,
    apiDeleteHybridScanTask,
    apiQueryHybridScanTask
} from "./utils"
import {genDefaultPagination} from "@/pages/invoker/schema"
import {OutlineLoadingIcon, OutlineQuestionmarkcircleIcon, OutlineRefreshIcon} from "@/assets/icon/outline"
import {Divider, Tooltip} from "antd"
import {YakitRoute} from "@/routes/newRoute"
import emiter from "@/utils/eventBus/eventBus"
import {SolidCheckCircleIcon, SolidPlayIcon, SolidXcircleIcon} from "@/assets/icon/solid"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"

interface PluginBatchRaskListDrawerProps {
    visible: boolean
    setVisible: (b: boolean) => void
    hybridScanTaskSource: HybridScanTaskSourceType
}
const PluginBatchRaskListDrawer: React.FC<PluginBatchRaskListDrawerProps> = React.memo((props) => {
    const {visible, setVisible, hybridScanTaskSource} = props

    const [removeLoading, setRemoveLoading] = useState<boolean>(false)
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
    const pluginBatchRaskListRef = useRef<PluginBatchRaskListForwardedRefProps>({
        onRemove: () => {}
    })

    const onClose = useMemoizedFn(() => {
        setVisible(false)
    })
    const onRemove = useMemoizedFn(async () => {
        setRemoveLoading(true)
        try {
            await pluginBatchRaskListRef.current.onRemove()
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
            <PluginBatchRaskList
                visible={visible}
                setVisible={setVisible}
                ref={pluginBatchRaskListRef}
                selectedRowKeys={selectedRowKeys}
                setSelectedRowKeys={setSelectedRowKeys}
                hybridScanTaskSource={hybridScanTaskSource}
            />
        </YakitDrawer>
    )
})
export default PluginBatchRaskListDrawer

interface PluginBatchRaskListForwardedRefProps {
    onRemove: () => void
}
interface PluginBatchRaskListProps {
    ref?: ForwardedRef<PluginBatchRaskListForwardedRefProps>
    visible: boolean
    setVisible: (b: boolean) => void
    selectedRowKeys: string[]
    setSelectedRowKeys: (s: string[]) => void
    hybridScanTaskSource?: HybridScanTaskSourceType
}
const PluginBatchRaskList: React.FC<PluginBatchRaskListProps> = React.memo(
    forwardRef((props, ref) => {
        const {getBatchExecutorByRuntimeId} = usePageInfo(
            (s) => ({
                getBatchExecutorByRuntimeId: s.getBatchExecutorByRuntimeId
            }),
            shallow
        )
        const {visible, setVisible, hybridScanTaskSource} = props
        const [isRefresh, setIsRefresh] = useState<boolean>(false)
        const [params, setParams] = useState<QueryHybridScanTaskRequest>({
            Pagination: genDefaultPagination(20, 1),
            Filter: {
                HybridScanTaskSource: !!hybridScanTaskSource ? [hybridScanTaskSource] : []
            }
        })
        const [loading, setLoading] = useState<boolean>(false)
        const [isAllSelect, setIsAllSelect] = useState<boolean>(false)
        const [response, setResponse] = useState<QueryHybridScanTaskResponse>({
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
        const getStatusNode = useMemoizedFn((record: HybridScanTask) => {
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
        const getAction = useMemoizedFn((record: HybridScanTask) => {
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
                    filterProps: {
                        filtersType: "input",
                        filterKey: "Target"
                    }
                },
                {
                    title: "状态",
                    dataKey: "Status",
                    width: 90,
                    render: (_, record: HybridScanTask) => getStatusNode(record),
                    filterProps: {
                        filtersType: "select",
                        filtersSelectAll: {
                            isAll: true
                        },
                        filterKey: "StatusType",
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
                    render: (_, record: HybridScanTask) => (
                        <>
                            {getAction(record)}

                            <Divider type='vertical' style={{margin: 0}} />
                            {record.Status === "error" ? (
                                <YakitButton
                                    type='text'
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onDetails(record.TaskId, "new")
                                    }}
                                >
                                    重试
                                </YakitButton>
                            ) : (
                                <YakitButton
                                    type='text'
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onDetails(record.TaskId, "status")
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
            const finalParams: QueryHybridScanTaskRequest = {
                ...params,
                Pagination: paginationProps
            }
            apiQueryHybridScanTask(finalParams)
                .then((res) => {
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
                .finally(() => setTimeout(() => setLoading(false), 300))
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
                        ...filter,
                        Status: !!filter.StatusType ? [filter.StatusType] : []
                    }
                }))
                setTimeout(() => {
                    update(1, limit)
                }, 100)
            },
            {wait: 500}
        ).run
        const onRefresh = useMemoizedFn(() => {
            update(1)
        })
        const onDetails = useMemoizedFn((runtimeId: string, hybridScanMode: HybridScanModeType) => {
            const current: PageNodeItemProps | undefined = getBatchExecutorByRuntimeId(runtimeId)
            // 重试new 都是新建页面
            if (!!current && hybridScanMode !== "new") {
                emiter.emit("switchSubMenuItem", JSON.stringify({pageId: current.pageId}))
                setTimeout(() => {
                    // 页面打开的情况下，查看只需要切换二级菜单选中项，不需要重新查询数据
                    if (hybridScanMode !== "status") {
                        emiter.emit(
                            "switchTaskStatus",
                            JSON.stringify({runtimeId, hybridScanMode, pageId: current.pageId})
                        )
                    }
                }, 200)
            } else {
                emiter.emit(
                    "openPage",
                    JSON.stringify({
                        route: YakitRoute.BatchExecutorPage,
                        params: {
                            runtimeId,
                            hybridScanMode
                        }
                    })
                )
            }
            setVisible(false)
        })
        const onRemoveSingle = useMemoizedFn((taskId: string) => {
            const removeParams: DeleteHybridScanTaskRequest = {
                Filter: {
                    TaskId: [taskId],
                    Status: [],
                    Target: ""
                }
            }
            apiDeleteHybridScanTask(removeParams)
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
            const removeParams: DeleteHybridScanTaskRequest = {
                Filter: {
                    ...filter,
                    TaskId: isAllSelect ? [] : selectedRowKeys
                }
            }
            setLoading(true)
            apiDeleteHybridScanTask(removeParams)
                .then(() => {
                    update(1)
                })
                .finally(() =>
                    setTimeout(() => {
                        setLoading(false)
                    }, 300)
                )
        })
        const onSelectAll = (newSelectedRowKeys: string[], selected: HybridScanTask[], checked: boolean) => {
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
        const onPaused = useMemoizedFn((record: HybridScanTask) => {
            onDetails(record.TaskId, "pause")
        })
        /**继续任务 */
        const onContinue = useMemoizedFn((record: HybridScanTask) => {
            onDetails(record.TaskId, "resume")
        })
        return (
            <TableVirtualResize<HybridScanTask>
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
