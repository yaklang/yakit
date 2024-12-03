import React, {forwardRef, useEffect, useRef, useState} from "react"
import {Divider} from "antd"
import {} from "@ant-design/icons"
import {useControllableValue, useCreation, useDebounceFn, useGetState, useMemoizedFn} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./CodeScanTaskListDrawer.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {OutlineRefreshIcon} from "@/assets/icon/outline"
import {genDefaultPagination} from "@/pages/invoker/schema"
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
const {ipcRenderer} = window.require("electron")
export interface CodeScanTaskListDrawerProps {
    visible: boolean
    setVisible: (v: boolean) => void
}
export const CodeScanTaskListDrawer: React.FC<CodeScanTaskListDrawerProps> = (props) => {
    const {visible, setVisible} = props

    const [removeLoading, setRemoveLoading] = useState<boolean>(false)
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
    const onClose = useMemoizedFn(() => {
        setVisible(false)
    })
    const onRemove = useMemoizedFn(async () => {
        setRemoveLoading(true)
        try {
            // await pluginBatchRaskListRef.current.onRemove()
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
            />
        </YakitDrawer>
    )
}

interface CodeScanTaskListProps {
    visible: boolean
    setVisible: (v: boolean) => void
    selectedRowKeys: string[]
    setSelectedRowKeys: (v: string[]) => void
}

const CodeScanTaskList: React.FC<CodeScanTaskListProps> = React.memo(
    forwardRef((props, ref) => {
        const {visible} = props
        const [isRefresh, setIsRefresh] = useState<boolean>(false)
        const [params, setParams] = useState<any>({
            Pagination: genDefaultPagination(20, 1)
        })
        const [loading, setLoading] = useState<boolean>(false)
        const [isAllSelect, setIsAllSelect] = useState<boolean>(false)
        const [response, setResponse] = useState<any>({
            Pagination: genDefaultPagination(),
            Data: [],
            Total: 0
        })
        const [selectedRowKeys, setSelectedRowKeys] = useControllableValue<string[]>(props, {
            defaultValue: [],
            valuePropName: "selectedRowKeys",
            trigger: "setSelectedRowKeys"
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
                    title: "操作",
                    dataKey: "action",
                    fixed: "right",
                    width: 120,
                    render: (_, record: any) => (
                        <>
                            <Divider type='vertical' style={{margin: 0}} />
                            {record.Status === "error" ? (
                                <YakitButton
                                    type='text'
                                    onClick={(e) => {
                                        e.stopPropagation()
                                    }}
                                >
                                    重试
                                </YakitButton>
                            ) : (
                                <YakitButton
                                    type='text'
                                    onClick={(e) => {
                                        e.stopPropagation()
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

        const update = useMemoizedFn((page?: number, limit?: number) => {})

        const onRefresh = useMemoizedFn(() => {
            update(1)
        })

        const onSelectAll = (newSelectedRowKeys: string[], selected: any[], checked: boolean) => {
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
        return (
            <TableVirtualResize<any>
                query={params.Filter}
                size='middle'
                extra={<YakitButton type='text2' icon={<OutlineRefreshIcon />} onClick={onRefresh} />}
                isRefresh={isRefresh}
                renderKey='id'
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
