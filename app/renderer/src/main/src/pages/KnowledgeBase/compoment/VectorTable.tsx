import {useRef, type FC} from "react"

import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import useVirtualTableHook from "@/hook/useVirtualTableHook/useVirtualTableHook"
import {useCreation, useMemoizedFn, useSafeState, useUpdateEffect} from "ahooks"
import ReactResizeDetector from "react-resize-detector"
import styles from "../knowledgeBase.module.scss"

import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {apiListVectorStoreEntries, documentType} from "../utils"

import {KnowledgeBaseEntry, ListVectorStoreEntriesRequest, VectorStoreEntry} from "../TKnowledgeBase"
import {genDefaultPagination} from "@/pages/invoker/schema"
import {KnowledgeBaseTableHeaderProps} from "./KnowledgeBaseTableHeader"

import {Divider} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {VectorDetailDrawer} from "./VectorDetailDrawer"

const VectorTable: FC<KnowledgeBaseTableHeaderProps> = (props) => {
    const {streams, knowledgeBaseItems, setTableProps, tableProps} = props
    const tableBoxRef = useRef<HTMLDivElement>(null)
    const boxHeightRef = useRef<number>()
    const tableRef = useRef<any>(null)

    const [isRefresh, setIsRefresh] = useSafeState<boolean>(false)
    const [currentSelectItem, setCurrentSelectItem] = useSafeState<any>()

    const [selectList, setSelectList] = useSafeState<any>([])
    const [allCheck, setAllCheck] = useSafeState<boolean>(false)
    const [scrollToIndex, setScrollToIndex] = useSafeState<number>()

    const [openVectorDetailDrawerData, setOpenVectorDetailDrawerData] = useSafeState<{
        vectorDetailModalVisible: boolean
        selectedVectorDetail?: VectorStoreEntry
    }>({
        vectorDetailModalVisible: false,
        selectedVectorDetail: undefined
    })

    const onFirst = useMemoizedFn(() => {
        setIsRefresh(!isRefresh)
        setSelectList([])
        setAllCheck(false)
        setCurrentSelectItem(undefined)
    })

    const [tableParams, tableData, tableTotal, pagination, tableLoading, offsetData, debugVirtualTableEvent] =
        useVirtualTableHook<ListVectorStoreEntriesRequest, VectorStoreEntry, "Entries", "ID">({
            tableBoxRef,
            tableRef,
            boxHeightRef,
            grpcFun: apiListVectorStoreEntries,
            onFirst,
            defaultParams: {
                Filter: {CollectionID: Number(knowledgeBaseItems?.ID)},
                Pagination: genDefaultPagination(20)
            },
            responseKey: {data: "Entries", id: "ID"}
        })

    useUpdateEffect(() => {
        debugVirtualTableEvent.setP({
            ...tableParams,
            Filter: {
                ...tableParams.Filter,
                KnowledgeBaseId: knowledgeBaseItems.ID
            }
        })
    }, [knowledgeBaseItems.ID])

    useUpdateEffect(() => {
        setTableProps((preValue) => ({
            ...preValue,
            tableTotal: tableTotal
        }))
    }, [tableTotal])

    useUpdateEffect(() => {
        if (allCheck) return setTableProps((preValue) => ({...preValue, selectNum: tableTotal}))
        else return setTableProps((preValue) => ({...preValue, selectNum: selectList.length}))
    }, [allCheck, selectList, tableTotal])

    const onTableResize = useMemoizedFn((width, height) => {
        if (!width || !height) {
            return
        }
        if (!currentSelectItem?.ID) {
            // 窗口由小变大时 重新拉取数据
            if (boxHeightRef.current && boxHeightRef.current < height) {
                boxHeightRef.current = height
                // updateData()
            } else {
                boxHeightRef.current = height
            }
        }
    })

    const selectedRowKeys = useCreation(() => {
        return selectList.map((ele) => ele.ID) || []
    }, [selectList])

    const onSelectAll = useMemoizedFn((newSelectedRowKeys: string[], selected: any[], checked: boolean) => {
        if (checked) {
            setAllCheck(true)
            setSelectList(tableData)
        } else {
            setAllCheck(false)
            setSelectList([])
        }
    })

    const onChangeCheckboxSingle = useMemoizedFn((c: boolean, key: string, selectedRows: any) => {
        if (c) {
            setSelectList((s) => [...s, selectedRows])
        } else {
            setSelectList((s) => s.filter((ele) => ele.ID !== selectedRows.ID))
            setAllCheck(false)
        }
    })

    const onSetCurrentRow = useMemoizedFn((val?: any) => {
        if (!val) {
            setCurrentSelectItem(undefined)
            return
        }
        if (val?.ID !== currentSelectItem?.ID) {
            setCurrentSelectItem(val)
        }
    })

    const columns = useCreation(() => {
        const columnsArr: ColumnsTypeProps[] = [
            {
                title: "ID",
                dataKey: "ID",
                width: 80
            },
            {
                title: "向量类型",
                dataKey: "DocumentType",
                width: 100,
                render: (item) => documentType.find((it) => it.value === item)?.label ?? "-"
            },
            {
                title: "内容",
                dataKey: "Content",
                enableDrag: false
            },
            {
                title: "操作",
                dataKey: "HiddenIndex",
                width: 150,
                fixed: "right",
                render: (_, item: VectorStoreEntry) => {
                    const showJumpList = ["knowledge", "entity"]
                    return (
                        <div className={styles["knowledge-base-render"]}>
                            {showJumpList.includes(item.DocumentType) ? (
                                <>
                                    <YakitButton
                                        type='text'
                                        onClick={(e) => {
                                            e.stopPropagation()
                                        }}
                                    >
                                        跳转
                                    </YakitButton>
                                    <Divider type='vertical' />
                                </>
                            ) : (
                                <div style={{width: 64}} />
                            )}

                            <YakitButton
                                type='text'
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setOpenVectorDetailDrawerData({
                                        vectorDetailModalVisible: true,
                                        selectedVectorDetail: item
                                    })
                                }}
                            >
                                详情
                            </YakitButton>
                        </div>
                    )
                }
            }
        ]
        return columnsArr
    }, [tableProps.type])

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
                    IsRead: tableProps.type === "all" ? 0 : -1
                }
            }
            debugVirtualTableEvent.setP(finalParams)
        }
    })

    return (
        <div ref={tableBoxRef} className={styles["knowledge-base-table"]}>
            <ReactResizeDetector
                onResize={onTableResize}
                handleWidth={true}
                handleHeight={true}
                refreshMode={"debounce"}
                refreshRate={50}
            />

            <TableVirtualResize
                ref={tableRef}
                query={tableParams.Filter}
                scrollToIndex={scrollToIndex}
                // loading={tableLoading}
                isRefresh={isRefresh}
                titleHeight={32}
                isShowTitle={false}
                renderKey='ID'
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
                    page: pagination.Page,
                    onChange: () => null
                }}
                columns={columns}
                enableDrag={true}
                useUpAndDown
                onChange={onTableChange}
            />
            <VectorDetailDrawer
                openVectorDetailDrawerData={openVectorDetailDrawerData}
                setOpenVectorDetailDrawerData={setOpenVectorDetailDrawerData}
                knowledgeBaseId={knowledgeBaseItems.ID}
            />
        </div>
    )
}

export {VectorTable}
