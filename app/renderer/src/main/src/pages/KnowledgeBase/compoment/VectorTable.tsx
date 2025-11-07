import {Dispatch, SetStateAction, useEffect, useRef, type FC} from "react"

import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import useVirtualTableHook from "@/hook/useVirtualTableHook/useVirtualTableHook"
import {useCreation, useMemoizedFn, useSafeState, useUpdateEffect} from "ahooks"
import ReactResizeDetector from "react-resize-detector"
import styles from "../knowledgeBase.module.scss"

import {ColumnsTypeProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {apiListVectorStoreEntries, documentType} from "../utils"

import {ListVectorStoreEntriesRequest, VectorStoreEntry} from "../TKnowledgeBase"
import {genDefaultPagination} from "@/pages/invoker/schema"
import {KnowledgeBaseTableHeaderProps} from "./KnowledgeBaseTableHeader"

import {Divider} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {VectorDetailDrawer} from "./VectorDetailDrawer"
import emiter from "@/utils/eventBus/eventBus"

const VectorTable: FC<KnowledgeBaseTableHeaderProps & {setLinkId: Dispatch<SetStateAction<string[]>>}> = (props) => {
    const {streams, knowledgeBaseItems, setTableProps, tableProps, query, setLinkId} = props
    const tableBoxRef = useRef<HTMLDivElement>(null)
    const boxHeightRef = useRef<number>()
    const tableRef = useRef<any>(null)

    const [isRefresh, setIsRefresh] = useSafeState<boolean>(false)
    const [currentSelectItem, setCurrentSelectItem] = useSafeState<any>()

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
                CollectionID: Number(knowledgeBaseItems?.ID)
            }
        })
    }, [knowledgeBaseItems.ID, tableProps.type])

    useEffect(() => {
        debugVirtualTableEvent.setP({
            ...tableParams,
            Filter: {
                ...tableParams.Filter,
                Keyword: query
            }
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query])

    useUpdateEffect(() => {
        setTableProps((preValue) => ({
            ...preValue,
            tableTotal: tableTotal
        }))
    }, [tableTotal])

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

    const columns = useCreation(() => {
        const columnsArr: ColumnsTypeProps[] = [
            {
                title: "ID",
                dataKey: "ID",
                width: 80,
                sorterProps: {
                    sorter: true,
                    sorterKey: "ID"
                }
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
                                            if (item.UID) {
                                                console.log(item, "sss")
                                                // setLinkId([`${item.UID}`])
                                                // setTableProps((preValue) => ({...preValue, type: item.DocumentType}))
                                            }
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

    const onVectorStoreDocumentFun = useMemoizedFn((data) => {
        try {
            const updateData = JSON.parse(data)
            if (updateData === "create") {
                debugVirtualTableEvent.startT()
            }
        } catch (error) {}
    })

    useEffect(() => {
        emiter.on("onVectorStoreDocument", onVectorStoreDocumentFun)
        return () => {
            emiter.off("onVectorStoreDocument", onVectorStoreDocumentFun)
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
                pagination={{
                    total: tableTotal,
                    limit: pagination.Limit,
                    page: pagination.Page,
                    onChange: () => null
                }}
                columns={columns}
                enableDrag={true}
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
