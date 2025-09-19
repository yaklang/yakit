import {FC, memo, useMemo, useRef} from "react"
import {useMemoizedFn, useRequest, useSafeState, useUpdateEffect} from "ahooks"
import ReactResizeDetector from "react-resize-detector"

import {KnowledgeBaseEntry} from "@/components/playground/knowlegeBase"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import styles from "./knowledgeBase.module.scss"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {failed, success} from "@/utils/notification"

import {getEntityColumns, getKnowledgeColumns, getVectorColumns} from "./compoments/KnowledgBaseColumns"
import {KnowledgeModalVisible} from "./compoments/KnowledgeModalVisible"
import {VectorDetailModal} from "./compoments/VectorDetailModal"
import {AddKnowledgenBaseModal} from "./compoments/AddKnowledgenBaseModal"

const {ipcRenderer} = window.require("electron")

const defaultParams = {
    KnowledgeBaseId: -1,
    Pagination: {
        Page: 1,
        Limit: 30,
        OrderBy: "id",
        Order: "desc" as const
    },
    Keyword: ""
}

const tableHeaderGroupOptions = [
    {
        value: "Knowledge",
        label: "知识"
    },
    {
        value: "Entity",
        label: "实体"
    },
    {
        value: "Vector",
        label: "向量"
    }
]

const KnowledgeBaseTable: FC<{
    knowledgeBaseitems?: {
        id: number
        name: string
    }
}> = ({knowledgeBaseitems}) => {
    const [type, setType] = useSafeState("Knowledge")
    const [tableData, setTableData] = useSafeState<KnowledgeBaseEntry[]>([])
    const [isRefresh, setIsRefresh] = useSafeState(false)
    const [tableSearchValue, setTableSearchValue] = useSafeState("")

    const [knowledgeModalData, setKnowledgeModalData] = useSafeState({
        data: {},
        visible: false
    })
    const [vectorDetailModalData, setVectorDetailModalData] = useSafeState({
        vectorDetailModalVisible: false,
        selectedEntryDetail: {}
    })
    const [pagination, setPagination] = useSafeState(defaultParams.Pagination)
    const [total, setTotal] = useSafeState(0)
    const [addKnowledgenBaseModal, setAddKnowledgenBaseModal] = useSafeState({
        addKnowledgenBaseModalVisible: false,
        knowledgeBaseId: knowledgeBaseitems?.id,
        KnowledgeBaseName: knowledgeBaseitems?.name
    })

    const boxHeightRef = useRef(0)

    const {data, runAsync, params} = useRequest(
        async (params) => {
            let resultData
            if (type === "Knowledge") {
                const result = await ipcRenderer.invoke("SearchKnowledgeBaseEntry", {
                    ...params,
                    KnowledgeBaseId: knowledgeBaseitems?.id
                })
                resultData = {...result, list: result?.KnowledgeBaseEntries}
            } else if (type === "Entity") {
                const result = await ipcRenderer.invoke("QueryEntity", {
                    ...params,
                    Filter: {
                        Names: params.Keyword,
                        BaseIndex: knowledgeBaseitems?.id
                    },
                    KnowledgeBaseId: undefined,
                    Keyword: undefined
                })
                resultData = {...result, list: result?.Entities}
            } else if (type === "Vector") {
                const result = await ipcRenderer.invoke("ListVectorStoreEntries", {
                    ...params,
                    CollectionID: knowledgeBaseitems?.id
                })
                resultData = {...result, list: result?.Entries}
            }
            setTotal(resultData?.Total)
            return resultData
        },
        {
            manual: true,
            onError: (err) => failed("查询列表失败" + err),
            onSuccess: (values) => {
                setTableData((preList) => {
                    const list = [...preList, ...values?.list]
                    return Array.from(new Map(list.map((item) => [item.ID, item])).values())
                })
            }
        }
    )

    const {runAsync: deleteRunAsunc} = useRequest(
        async (item: KnowledgeBaseEntry) => {
            await ipcRenderer.invoke("DeleteKnowledgeBaseEntry", {
                KnowledgeBaseEntryId: item.ID,
                KnowledgeBaseId: item.KnowledgeBaseId,
                KnowledgeBaseEntryHiddenIndex: item.HiddenIndex
            })
            const resultData = tableData.filter((it) => it.ID !== item.ID)
            setTableData(resultData)
        },
        {
            manual: true,
            onError: (error) => failed("删除知识库列表失败" + error),
            onSuccess: () => success("删除知识条目成功")
        }
    )

    const updateData = useMemoizedFn(() => {
        const limitCount: number = boxHeightRef.current > 0 ? Math.ceil(boxHeightRef.current / 28) : 30
        const preParams = params?.[0]
        const Requsetparams = {
            ...defaultParams,
            ...preParams,
            Pagination: {
                ...defaultParams.Pagination,
                Limit: limitCount
            },
            KnowledgeBaseId: knowledgeBaseitems?.id
        }
        runAsync(Requsetparams)
    })

    useUpdateEffect(() => {
        setTableData([])
        setTableSearchValue("")
        setIsRefresh(!isRefresh)
        setTotal(0)
        setPagination((preValue) => ({...preValue, Page: 1}))
    }, [knowledgeBaseitems?.id, type])

    useUpdateEffect(() => {
        setTotal(0)
        runAsync({
            Pagination: pagination,
            Keyword: tableSearchValue
        })
    }, [pagination])

    // 搜索表格功能
    const onSearch = async (value: string) => {
        setIsRefresh(!isRefresh)
        setTableData([])
        const limitCount: number = boxHeightRef.current > 0 ? Math.ceil(boxHeightRef.current / 28) : 30
        await runAsync({
            Pagination: {
                ...defaultParams.Pagination,
                Limit: limitCount
            },
            Keyword: value
        })
    }

    // 表格头部 知识/实体/向量选择功能
    const onChangeType = useMemoizedFn(async (value: string) => {
        setType(value)
    })

    const targetColumns = useMemo(() => {
        switch (type) {
            case "Knowledge":
                return getKnowledgeColumns(deleteRunAsunc, setKnowledgeModalData)

            case "Entity":
                return getEntityColumns()
            case "Vector":
                return getVectorColumns(setVectorDetailModalData)

            default:
                break
        }
        return null
    }, [type, knowledgeBaseitems?.id])

    const handAddKnowledgenBase = useMemoizedFn(() => {
        setAddKnowledgenBaseModal({
            addKnowledgenBaseModalVisible: true,
            knowledgeBaseId: knowledgeBaseitems?.id,
            KnowledgeBaseName: knowledgeBaseitems?.name
        })
    })

    const knowledgeBaseTableRenderTitle = useMemo(() => {
        return (
            <div className={styles["knowledgeBase-render-header"]}>
                <div className={styles["knowledgeBase-render-header-title"]}>
                    <div>WebFuzzer 知识库</div>
                    <div>{/* <YakitButton>从实体生成</YakitButton> */}</div>
                </div>
                <div className={styles["knowledgeBase-render-header-operate"]}>
                    <YakitRadioButtons
                        buttonStyle='solid'
                        options={tableHeaderGroupOptions}
                        value={type}
                        onChange={(e) => onChangeType(e.target.value)}
                    />
                    <div>
                        <YakitInput.Search
                            placeholder='请输入关键字搜索'
                            value={tableSearchValue}
                            onChange={(e) => setTableSearchValue(e.target.value)}
                            onSearch={(value) => onSearch(value)}
                        />
                        <YakitButton onClick={handAddKnowledgenBase}>添加</YakitButton>
                    </div>
                </div>
            </div>
        )
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type, tableSearchValue, knowledgeBaseitems?.id])

    // grpcFetchLocalPluginDetail({Name: "核心引擎性能采样"}, true)

    return (
        <div className={styles["repository-manage-table"]}>
            <ReactResizeDetector
                onResize={(width, height) => {
                    if (!width || !height) {
                        return
                    }
                    // 窗口由小变大时 重新拉取数据
                    if (boxHeightRef.current && boxHeightRef.current < height) {
                        boxHeightRef.current = height
                        updateData()
                    } else {
                        boxHeightRef.current = height
                    }
                }}
                handleWidth={true}
                handleHeight={true}
                refreshMode={"debounce"}
                refreshRate={50}
            />
            <TableVirtualResize
                columns={targetColumns as any}
                data={tableData}
                renderKey='ID'
                isRefresh={isRefresh}
                renderTitle={knowledgeBaseTableRenderTitle}
                pagination={{
                    page: data?.Pagination?.Page,
                    limit: data?.Pagination?.Limit,
                    total: total,
                    onChange: async (page, limit) => {
                        setPagination((preValue) => ({
                            ...preValue,
                            Limit: limit,
                            Page: page
                        }))
                    }
                }}
            />
            <KnowledgeModalVisible
                knowledgeModalData={knowledgeModalData}
                setKnowledgeModalData={setKnowledgeModalData}
            />
            <VectorDetailModal
                vectorDetailModalData={vectorDetailModalData}
                handleCloseVectorDetailModal={setVectorDetailModalData}
                knowledgeBaseId={knowledgeBaseitems?.id}
            />
            <AddKnowledgenBaseModal
                addKnowledgenBaseModal={addKnowledgenBaseModal}
                setAddKnowledgenBaseModal={setAddKnowledgenBaseModal}
            />
        </div>
    )
}

export default memo(KnowledgeBaseTable)
