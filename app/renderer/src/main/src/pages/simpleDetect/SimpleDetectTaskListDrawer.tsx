import {OutlineRefreshIcon} from "@/assets/icon/outline"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {useControllableValue, useMemoizedFn, useCreation, useDebounceFn} from "ahooks"
import React, {ForwardedRef, forwardRef, useEffect, useImperativeHandle, useRef, useState} from "react"
import {
    UnfinishedTask,
    DeleteUnfinishedTaskRequest,
    apiQuerySimpleDetectUnfinishedTask,
    apiDeleteSimpleDetectUnfinishedTask,
    QueryUnfinishedTaskRequest,
    QueryUnfinishedTaskResponse
} from "./utils"
import {formatTimestamp} from "@/utils/timeUtil"
import {Divider, Progress} from "antd"
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import emiter from "@/utils/eventBus/eventBus"
import {genDefaultPagination} from "../invoker/schema"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitRoute} from "@/enums/yakitRoute"
import styles from "./SimpleDetectTaskListDrawer.module.scss"

interface SimpleDetectTaskListDrawerProps {
    visible: boolean
    setVisible: (b: boolean) => void
}

const SimpleDetectTaskListDrawer: React.FC<SimpleDetectTaskListDrawerProps> = React.memo((props) => {
    const {visible, setVisible} = props

    const [removeLoading, setRemoveLoading] = useState<boolean>(false)
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
    const simpleDetectTaskListRef = useRef<SimpleDetectTaskListRefProps>({
        onRemove: () => {}
    })

    const onClose = useMemoizedFn(() => {
        setVisible(false)
    })
    const onRemove = useMemoizedFn(async () => {
        setRemoveLoading(true)
        try {
            await simpleDetectTaskListRef.current.onRemove()
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
            <SimpleDetectTaskList
                ref={simpleDetectTaskListRef}
                visible={visible}
                setVisible={setVisible}
                selectedRowKeys={selectedRowKeys}
                setSelectedRowKeys={setSelectedRowKeys}
            />
        </YakitDrawer>
    )
})
export default SimpleDetectTaskListDrawer

interface SimpleDetectTaskListRefProps {
    onRemove: () => void
}
interface SimpleDetectTaskListProps {
    ref?: ForwardedRef<SimpleDetectTaskListRefProps>
    visible: boolean
    setVisible: (b: boolean) => void
    selectedRowKeys: string[]
    setSelectedRowKeys: (s: string[]) => void
}
const Limit = 20
const SimpleDetectTaskList: React.FC<SimpleDetectTaskListProps> = React.memo(
    forwardRef((props, ref) => {
        const {getPageInfoByRuntimeId} = usePageInfo(
            (s) => ({
                getPageInfoByRuntimeId: s.getPageInfoByRuntimeId
            }),
            shallow
        )

        const {visible, setVisible} = props

        const [loading, setLoading] = useState<boolean>(false)
        const [isRefresh, setIsRefresh] = useState<boolean>(false)
        const [isAllSelect, setIsAllSelect] = useState<boolean>(false)
        const [response, setResponse] = useState<QueryUnfinishedTaskResponse>({
            Tasks: [],
            Pagination: {...genDefaultPagination(Limit), OrderBy: "created_at", Order: "desc"},
            Total: 0
        })
        const [query, setQuery] = useState<QueryUnfinishedTaskRequest>({
            Pagination: {...genDefaultPagination(Limit), OrderBy: "created_at", Order: "desc"},
            Filter: {}
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

        const columns: ColumnsTypeProps[] = useCreation<ColumnsTypeProps[]>(() => {
            return [
                {
                    title: "任务名",
                    dataKey: "TaskName",
                    width: 160,
                    fixed: "left",
                    filterProps: {
                        filtersType: "input"
                    }
                },
                {
                    title: "扫描目标",
                    dataKey: "Target",
                    render: (v) => (v && v.length > 20 ? `${v.substring(0, 20)}等` : v),
                    filterProps: {
                        filtersType: "input"
                    }
                },
                {
                    title: "进度",
                    dataKey: "Percent",
                    render: (v) => (
                        <Progress percent={Math.trunc(v * 100)} status='active' className={styles["table-progress"]} />
                    ),
                    sorterProps: {
                        sorter: true,
                        sorterKey: "current_progress"
                    }
                },
                {
                    title: "创建时间",
                    dataKey: "CreatedAt",
                    render: (v) => (v ? formatTimestamp(v) : "-"),
                    enableDrag: false,
                    sorterProps: {
                        sorter: true,
                        sorterKey: "created_at"
                    }
                },
                {
                    title: "操作",
                    dataKey: "action",
                    fixed: "right",
                    width: 120,
                    render: (_, record: UnfinishedTask) => (
                        <>
                            <YakitButton
                                type='text'
                                danger
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onRemoveSingle(record.RuntimeId)
                                }}
                            >
                                删除
                            </YakitButton>
                            {record.Percent < 1 && (
                                <>
                                    <Divider type='vertical' style={{margin: 0}} />
                                    <YakitButton
                                        type='text'
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onDetails(record.RuntimeId)
                                        }}
                                    >
                                        继续
                                    </YakitButton>
                                </>
                            )}
                        </>
                    )
                }
            ]
        }, [visible, isRefresh])
        const onDetails = useMemoizedFn((runtimeId: string) => {
            const current: PageNodeItemProps | undefined = getPageInfoByRuntimeId(YakitRoute.SimpleDetect, runtimeId)
            if (!!current) {
                emiter.emit("switchSubMenuItem", JSON.stringify({pageId: current.pageId}))
                setTimeout(() => {
                    // 页面打开的情况下，查看只需要切换二级菜单选中项，不需要重新查询数据
                    emiter.emit("updateTaskStatus", JSON.stringify({runtimeId, pageId: current.pageId}))
                }, 200)
            } else {
                emiter.emit(
                    "openPage",
                    JSON.stringify({
                        route: YakitRoute.SimpleDetect,
                        params: {
                            runtimeId
                        }
                    })
                )
            }
            setVisible(false)
        })
        const update = useMemoizedFn((page: number, limit?: number) => {
            const paginationProps = {
                ...query.Pagination,
                Page: page || 1,
                Limit: limit || query.Pagination.Limit
            }
            setLoading(true)
            const finalParams: QueryUnfinishedTaskRequest = {
                ...query,
                Pagination: paginationProps
            }
            apiQuerySimpleDetectUnfinishedTask(finalParams)
                .then((res) => {
                    const newPage = +res.Pagination.Page
                    const d = newPage === 1 ? res.Tasks : (response?.Tasks || []).concat(res.Tasks)
                    setResponse({
                        ...res,
                        Tasks: d
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
        const onRefresh = useMemoizedFn(() => {
            update(1)
        })
        const onSelectAll = (newSelectedRowKeys: string[], selected: UnfinishedTask[], checked: boolean) => {
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
        const onRemoveSingle = useMemoizedFn((RuntimeId: string) => {
            const removeParams: DeleteUnfinishedTaskRequest = {
                Filter: {
                    RuntimeId: [RuntimeId]
                }
            }
            apiDeleteSimpleDetectUnfinishedTask(removeParams).then(() => {
                setResponse((old) => ({
                    ...old,
                    Tasks: old?.Tasks?.filter((ele) => ele.RuntimeId !== RuntimeId) || []
                }))
            })
        })
        const onBatchRemove = useMemoizedFn(() => {
            const filter = isAllSelect ? {...query.Filter} : {}
            let removeParams: DeleteUnfinishedTaskRequest = {
                Filter: {
                    ...filter,
                    RuntimeId: isAllSelect ? [] : selectedRowKeys
                }
            }
            setLoading(true)
            apiDeleteSimpleDetectUnfinishedTask(removeParams)
                .then(() => {
                    update(1)
                })
                .finally(() =>
                    setTimeout(() => {
                        setLoading(false)
                    }, 300)
                )
        })
        const onTableChange = useDebounceFn(
            (page: number, limit: number, sorter: SortProps, filter: any) => {
                setQuery((oldParams) => ({
                    Pagination: {
                        ...oldParams.Pagination,
                        Order: sorter.order === "asc" ? "asc" : "desc",
                        OrderBy: sorter.order === "none" ? "created_at" : sorter.orderBy
                    },
                    Filter: {
                        ...oldParams.Filter,
                        ...filter
                    }
                }))
                setTimeout(() => {
                    update(1)
                }, 100)
            },
            {wait: 500, leading: true}
        ).run
        return (
            <TableVirtualResize<UnfinishedTask>
                query={query.Filter}
                size='middle'
                extra={<YakitButton type='text2' icon={<OutlineRefreshIcon />} onClick={onRefresh} />}
                isRefresh={isRefresh}
                renderKey='RuntimeId'
                data={response.Tasks || []}
                loading={loading}
                enableDrag={true}
                columns={columns}
                pagination={{
                    page: response?.Pagination.Page || 0,
                    limit: response?.Pagination.Limit || Limit,
                    total: response?.Total && response?.Total > 0 ? Number(response.Total) : 0,
                    onChange: update
                }}
                isShowTotal={true}
                rowSelection={{
                    isAll: isAllSelect,
                    type: "checkbox",
                    selectedRowKeys: selectedRowKeys,
                    onSelectAll,
                    onChangeCheckboxSingle
                }}
                onChange={onTableChange}
            />
        )
    })
)
