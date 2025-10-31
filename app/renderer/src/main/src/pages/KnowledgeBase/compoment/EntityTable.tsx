import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import useVirtualTableHook from "@/hook/useVirtualTableHook/useVirtualTableHook"
import {useCreation, useMemoizedFn, useRequest, useSafeState, useUpdateEffect} from "ahooks"
import {useEffect, useRef, type FC} from "react"
import ReactResizeDetector from "react-resize-detector"
import styles from "../knowledgeBase.module.scss"

import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {apiQueryEntity} from "../utils"

import {QueryEntityRequest} from "../TKnowledgeBase"
import {genDefaultPagination} from "@/pages/invoker/schema"
import {KnowledgeBaseTableHeaderProps} from "./KnowledgeBaseTableHeader"
import {v4 as uuidv4} from "uuid"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {Divider} from "antd"
import {Entity} from "@/components/playground/entityRepository"
import {failed} from "@/utils/notification"
import emiter from "@/utils/eventBus/eventBus"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"

const {ipcRenderer} = window.require("electron")

const EntityTable: FC<KnowledgeBaseTableHeaderProps> = (props) => {
    const {streams, knowledgeBaseItems, setTableProps, tableProps} = props
    const tableBoxRef = useRef<HTMLDivElement>(null)
    const boxHeightRef = useRef<number>()
    const tableRef = useRef<any>(null)

    const [isRefresh, setIsRefresh] = useSafeState<boolean>(false)
    const [currentSelectItem, setCurrentSelectItem] = useSafeState<any>()

    const [selectList, setSelectList] = useSafeState<any>([])
    const [allCheck, setAllCheck] = useSafeState<boolean>(false)
    const [scrollToIndex, setScrollToIndex] = useSafeState<number>()

    const onFirst = useMemoizedFn(() => {
        setIsRefresh(!isRefresh)
        setSelectList([])
        setAllCheck(false)
        setCurrentSelectItem(undefined)
    })

    const [tableParams, tableData, tableTotal, pagination, tableLoading, offsetData, debugVirtualTableEvent] =
        useVirtualTableHook<QueryEntityRequest, Entity, "Entities", "ID">({
            tableBoxRef,
            tableRef,
            boxHeightRef,
            grpcFun: apiQueryEntity,
            onFirst,
            responseKey: {data: "Entities", id: "ID"}
        })

    const {run: knowledgeBaseIndexRun} = useRequest(
        async () => {
            const result = await ipcRenderer.invoke("ListEntityRepository", {})

            const targetBaseIndex = result?.EntityRepositories?.find(
                (it) => it.Name === knowledgeBaseItems?.KnowledgeBaseName
            )?.HiddenIndex
            return targetBaseIndex
        },
        {
            manual: true,
            onSuccess: (baseIndex) => {
                debugVirtualTableEvent.setP({
                    Pagination: genDefaultPagination(20),
                    Filter: {
                        ...tableParams.Filter,
                        BaseIndex: baseIndex
                    }
                })
            },
            onError: (err) => failed(`获取全局知识库失败: ${err}`)
        }
    )

    useUpdateEffect(() => {
        knowledgeBaseIndexRun()
    }, [knowledgeBaseItems.ID, tableProps.type])

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
                width: 80,
                sorterProps: {
                    sorter: true,
                    sorterKey: "ID"
                }
            },
            {
                title: "名称",
                dataKey: "Name",
                width: 100
            },
            {
                title: "类型",
                dataKey: "Type",
                width: 140,
                render: (value) => (value ? <YakitTag color='blue'>{value}</YakitTag> : "-")
            },

            {
                title: "描述",
                dataKey: "Description"
            },
            {
                title: "属性",
                dataKey: "Attributes",
                width: 200,
                render: (value) => {
                    return value && value.length > 0
                        ? value?.map((it) => (
                              <YakitTag style={{marginRight: 4}} key={it + uuidv4()}>
                                  {it.Value}
                              </YakitTag>
                          ))
                        : "-"
                },
                enableDrag: false
            },
            {
                title: "操作",
                dataKey: "HiddenIndex",
                width: 70,
                fixed: "right",
                render: (_, item: Entity) => (
                    <YakitButton
                        type='text'
                        onClick={(e) => {
                            e.stopPropagation()
                        }}
                    >
                        详情
                    </YakitButton>
                )
            }
        ]
        return columnsArr
    }, [tableProps.type, knowledgeBaseItems.ID])

    const ResizeBoxProps = useCreation(() => {
        let p = {
            firstRatio: "50%",
            secondRatio: "50%"
        }
        if (!currentSelectItem?.ID) {
            p.secondRatio = "0%"
            p.firstRatio = "100%"
        }
        return p
    }, [currentSelectItem])

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

    const onErModelRelationshipFun = useMemoizedFn((data) => {
        try {
            const updateData = JSON.parse(data)
            if (updateData === "create") {
                debugVirtualTableEvent.startT()
            }
        } catch (error) {}
    })

    useEffect(() => {
        emiter.on("onErModelRelationship", onErModelRelationshipFun)
        return () => {
            emiter.off("onErModelRelationship", onErModelRelationshipFun)
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
            <YakitResizeBox
                firstMinSize={160}
                secondMinSize={200}
                isVer={true}
                lineStyle={{display: !!currentSelectItem?.ID ? "" : "none"}}
                lineDirection='bottom'
                secondNodeStyle={{
                    display: !currentSelectItem?.ID ? "none" : "",
                    padding: !currentSelectItem?.ID ? 0 : undefined
                }}
                firstNode={
                    <TableVirtualResize
                        key={knowledgeBaseItems.ID + tableProps.type}
                        ref={tableRef}
                        query={tableParams.Filter}
                        scrollToIndex={scrollToIndex}
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
                        onSetCurrentRow={onSetCurrentRow}
                        enableDrag={true}
                        useUpAndDown
                        onChange={onTableChange}
                    />
                }
                secondNode={<div>123</div>}
                {...ResizeBoxProps}
            />
        </div>
    )
}

export {EntityTable}
