import {OutlineRefreshIcon} from "@/assets/icon/outline"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {useControllableValue, useMemoizedFn, useCreation} from "ahooks"
import React, {ForwardedRef, forwardRef, useEffect, useImperativeHandle, useRef, useState} from "react"
import {
    ExecBatchYakScriptUnfinishedTask,
    GetExecBatchYakScriptUnfinishedTaskByUidRequest,
    GetExecBatchYakScriptUnfinishedTaskResponse,
    apiGetExecBatchYakScriptUnfinishedTask,
    apiPopExecBatchYakScriptUnfinishedTaskByUid
} from "./utils"
import {formatTimestamp} from "@/utils/timeUtil"
import {Divider, Progress} from "antd"
import {ColumnsTypeProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import emiter from "@/utils/eventBus/eventBus"

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
const SimpleDetectTaskList: React.FC<SimpleDetectTaskListProps> = React.memo(
    forwardRef((props, ref) => {
        const {visible, setVisible} = props

        const [loading, setLoading] = useState<boolean>(false)
        const [isRefresh, setIsRefresh] = useState<boolean>(false)
        const [isAllSelect, setIsAllSelect] = useState<boolean>(false)
        const [response, setResponse] = useState<ExecBatchYakScriptUnfinishedTask[]>([])

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
            update()
        }, [visible, isRefresh])

        const columns: ColumnsTypeProps[] = useCreation<ColumnsTypeProps[]>(() => {
            return [
                {
                    title: "扫描目标",
                    dataKey: "TaskName",
                    width: 160,
                    fixed: "left"
                },
                {
                    title: "进度",
                    dataKey: "Percent",
                    render: (v) => <Progress percent={Math.trunc(v * 100)} status='active' />
                },
                {
                    title: "更新时间",
                    dataKey: "CreatedAt",
                    render: (v) => (v ? formatTimestamp(v) : "-")
                },
                {
                    title: "操作",
                    dataKey: "action",
                    fixed: "right",
                    width: 120,
                    render: (_, record: ExecBatchYakScriptUnfinishedTask) => (
                        <>
                            <YakitButton
                                type='text'
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onDetails(record.Uid)
                                }}
                            >
                                继续
                            </YakitButton>
                            <Divider type='vertical' style={{margin: 0}} />
                            <YakitButton
                                type='text'
                                danger
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onRemoveSingle(record.Uid)
                                }}
                            >
                                删除
                            </YakitButton>
                        </>
                    )
                }
            ]
        }, [visible, isRefresh])
        const onDetails = useMemoizedFn((runtimeId: string) => {
            // const current: PageNodeItemProps | undefined = getBatchExecutorByRuntimeId(runtimeId)
            // if (!!current) {
            //     emiter.emit("switchSubMenuItem", JSON.stringify({pageId: current.pageId}))
            //     setTimeout(() => {
            //         // 页面打开的情况下，查看只需要切换二级菜单选中项，不需要重新查询数据
            //         if (hybridScanMode !== "status") {
            //             emiter.emit(
            //                 "switchTaskStatus",
            //                 JSON.stringify({runtimeId, hybridScanMode, pageId: current.pageId})
            //             )
            //         }
            //     }, 200)
            // } else {
            //     emiter.emit(
            //         "openPage",
            //         JSON.stringify({
            //             route: YakitRoute.BatchExecutorPage,
            //             params: {
            //                 runtimeId,
            //                 hybridScanMode
            //             }
            //         })
            //     )
            // }
            // setVisible(false)
        })
        const update = useMemoizedFn(() => {
            setLoading(true)
            apiGetExecBatchYakScriptUnfinishedTask()
                .then((res) => {
                    console.log("res", res)
                    setResponse(res.Tasks.reverse())
                })
                .finally(() => setTimeout(() => setLoading(false), 300))
        })
        const onRefresh = useMemoizedFn(() => {
            setIsRefresh(!isRefresh)
        })
        const onSelectAll = (
            newSelectedRowKeys: string[],
            selected: ExecBatchYakScriptUnfinishedTask[],
            checked: boolean
        ) => {
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
        const onRemoveSingle = useMemoizedFn((Uid: string) => {
            const removeParams: GetExecBatchYakScriptUnfinishedTaskByUidRequest = {
                Uid
            }
            apiPopExecBatchYakScriptUnfinishedTaskByUid(removeParams).then(() => {
                setResponse(response.filter((ele) => ele.Uid !== Uid) || [])
            })
        })
        const onBatchRemove = useMemoizedFn(() => {
            const removeParams: GetExecBatchYakScriptUnfinishedTaskByUidRequest = {
                Uid: selectedRowKeys.join(",")
            }
            setLoading(true)
            apiPopExecBatchYakScriptUnfinishedTaskByUid(removeParams)
                .then(() => {
                    update()
                })
                .finally(() =>
                    setTimeout(() => {
                        setLoading(false)
                    }, 300)
                )
        })
        return (
            <TableVirtualResize<ExecBatchYakScriptUnfinishedTask>
                size='middle'
                extra={<YakitButton type='text2' icon={<OutlineRefreshIcon />} onClick={onRefresh} />}
                isRefresh={isRefresh}
                renderKey='TaskId'
                data={response || []}
                loading={loading}
                enableDrag={true}
                columns={columns}
                pagination={{
                    page: 1,
                    limit: 20,
                    total: Number(response.length || 0),
                    onChange: () => {}
                }}
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
