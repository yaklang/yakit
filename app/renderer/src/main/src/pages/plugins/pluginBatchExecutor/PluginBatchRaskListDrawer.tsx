import {useCreation, useDebounceFn, useMemoizedFn} from "ahooks"
import React, {ForwardedRef, forwardRef, useEffect, useImperativeHandle, useRef, useState} from "react"
import styles from "./PluginBatchExecutor.module.scss"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {formatTimestamp} from "@/utils/timeUtil"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {HybridScanTask} from "@/models/HybridScan"
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

interface PluginBatchRaskListDrawerProps {
    visible: boolean
    setVisible: (b: boolean) => void
}
const PluginBatchRaskListDrawer: React.FC<PluginBatchRaskListDrawerProps> = React.memo((props) => {
    const {visible, setVisible} = props

    const [removeLoading, setRemoveLoading] = useState<boolean>(false)

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
                    <YakitButton loading={removeLoading} type='primary' danger onClick={onRemove}>
                        清空
                    </YakitButton>
                </>
            }
            bodyStyle={{overflow: "hidden"}}
        >
            <PluginBatchRaskList visible={visible} setVisible={setVisible} ref={pluginBatchRaskListRef} />
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
}
const PluginBatchRaskList: React.FC<PluginBatchRaskListProps> = React.memo(
    forwardRef((props, ref) => {
        const {visible, setVisible} = props
        const [isRefresh, setIsRefresh] = useState<boolean>(false)
        const [params, setParams] = useState<QueryHybridScanTaskRequest>({
            Pagination: genDefaultPagination(20, 1),
            FromId: 0,
            UntilId: 0,
            Status: ""
        })
        const [loading, setLoading] = useState<boolean>(false)
        const [isAllSelect, setIsAllSelect] = useState<boolean>(false)
        const [response, setResponse] = useState<QueryHybridScanTaskResponse>({
            Pagination: genDefaultPagination(),
            Data: [],
            Total: 0
        })
        const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])

        useImperativeHandle(
            ref,
            () => ({
                onRemove: () => {
                    onRemove()
                }
            }),
            []
        )

        useEffect(() => {
            update(1)
        }, [])
        const getStatusNode = useMemoizedFn((text: string) => {
            switch (text) {
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
                            <Tooltip title='失败原因'>
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
                    dataKey: "TaskId",
                    width: 160,
                    fixed: "left",
                    filterProps: {
                        filtersType: "input"
                    }
                },
                {
                    title: "状态",
                    dataKey: "Status",
                    width: 90,
                    render: (text: string) => getStatusNode(text),
                    filterProps: {
                        filtersType: "select",
                        filtersSelectAll: {
                            isAll: true
                        },
                        filters: [
                            {
                                label: "done",
                                value: "已完成"
                            },
                            {
                                label: "executing",
                                value: "执行中"
                            },
                            {
                                label: "paused",
                                value: "暂停"
                            },
                            {
                                label: "error",
                                value: "失败"
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
                            <YakitButton
                                type='text'
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onDetails(record.TaskId)
                                }}
                            >
                                查看
                            </YakitButton>
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
                    ...oldParams,
                    ...filter,
                    Pagination: {
                        ...oldParams.Pagination,
                        Order: sorter.order === "asc" ? "asc" : "desc",
                        OrderBy: sorter.order === "none" ? "updated_at" : sorter.orderBy
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
        const onDetails = useMemoizedFn((runtimeId: string) => {
            emiter.emit(
                "openPage",
                JSON.stringify({
                    route: YakitRoute.BatchExecutorPage,
                    params: {
                        runtimeId
                    }
                })
            )
            setVisible(false)
        })
        const onRemoveSingle = useMemoizedFn((taskId: string) => {
            const removeParams: DeleteHybridScanTaskRequest = {
                TaskId: taskId,
                DeleteAll: false
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
        const onRemove = useMemoizedFn(() => {
            const removeParams: DeleteHybridScanTaskRequest = {
                TaskId: selectedRowKeys.join(","),
                DeleteAll: false
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
        const onPaused = useMemoizedFn((record: HybridScanTask) => {})
        /**继续任务 */
        const onContinue = useMemoizedFn((record: HybridScanTask) => {})
        return (
            <TableVirtualResize<HybridScanTask>
                query={params}
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
                currentSelectItem={undefined}
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
