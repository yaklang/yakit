import {FC, memo, useMemo, useRef} from "react"
import {useGetState, useMemoizedFn, useRequest, useSafeState, useUpdateEffect} from "ahooks"
import ReactResizeDetector from "react-resize-detector"

import {KnowledgeBaseEntry, SearchKnowledgeEntryParams} from "@/components/playground/knowlegeBase"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {OutlinePencilaltIcon} from "@/assets/icon/outline"
import {SolidPlayIcon} from "@/assets/icon/solid"
import {TrashIcon} from "@/assets/newIcon"
import {ColumnsTypeProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {Space} from "antd"
import styles from "./knowledgeBase.module.scss"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {failed, success} from "@/utils/notification"

import {getEntityColumns, getKnowledgeColumns, getVectorColumns} from "./compoments/KnowledgBaseColumns"
import {KnowledgeModalVisible} from "./compoments/KnowledgeModalVisible"
import {VectorDetailModal} from "./compoments/VectorDetailModal"

const {ipcRenderer} = window.require("electron")

const defaultParams = {
    KnowledgeBaseId: -1,
    Pagination: {
        Page: 1,
        Limit: 10,
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

const KnowledgeBaseTable: FC<{knowledgeBaseId?: number}> = ({knowledgeBaseId}) => {
    const [type, setType] = useSafeState("Knowledge")
    const [tableData, setTableData] = useSafeState<KnowledgeBaseEntry[]>([])
    const [knowledgeModalData, setKnowledgeModalData] = useSafeState({
        data: {},
        visible: false
    })
    const [isRefresh, setIsRefresh] = useSafeState(false)
    const [tableSearchValue, setTableSearchValue] = useSafeState("")
    const [vectorDetailModalData, setVectorDetailModalData] = useSafeState({
        vectorDetailModalVisible: false,
        selectedEntryDetail: {}
    })
    const [changePage, setChangePage, getChangePage] = useGetState(1)

    const boxHeightRef = useRef(0)

    const {data, runAsync, params} = useRequest(
        async (params) => {
            console.log(params, "params")
            let resultData
            if (type === "Knowledge") {
                const result = await ipcRenderer.invoke("SearchKnowledgeBaseEntry", {
                    ...params,
                    KnowledgeBaseId: knowledgeBaseId
                })
                resultData = {...result, list: result?.KnowledgeBaseEntries}
            } else if (type === "Entity") {
                const result = await ipcRenderer.invoke("QueryEntity", {
                    ...params,
                    Filter: {
                        Names: params.Keyword,
                        BaseIndex: knowledgeBaseId
                    },
                    KnowledgeBaseId: undefined,
                    Keyword: undefined
                })
                resultData = {...result, list: result?.Entities}
            } else if (type === "Vector") {
                const result = await ipcRenderer.invoke("ListVectorStoreEntries", {
                    ...params,
                    CollectionID: knowledgeBaseId
                })
                resultData = {...result, list: result?.Entries}
            }
            resultData?.Pagination?.Page == "1" && setIsRefresh((preValue) => !preValue)
            console.log(resultData.list, "resultData.list")
            setTableData(resultData.list ?? [])
            return resultData
        },
        {
            manual: true,
            onError: (err) => failed("查询列表失败" + err)
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
            KnowledgeBaseId: knowledgeBaseId
        }
        console.log(Requsetparams, "Requsetparams")
        runAsync(Requsetparams)
    })

    useUpdateEffect(() => {
        setTableData([])
        updateData()
        setTableSearchValue("")
        setIsRefresh(!isRefresh)
        setChangePage(1)
    }, [knowledgeBaseId, type])

    const onSearch = async (value: string) => {
        const limitCount: number = boxHeightRef.current > 0 ? Math.ceil(boxHeightRef.current / 28) : 30
        await runAsync({
            Pagination: {
                ...defaultParams.Pagination,
                Limit: limitCount
            },
            Keyword: value
        })
    }

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type, knowledgeBaseId])

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
                        onChange={(e) => {
                            setType(e.target.value)
                        }}
                    />
                    <div>
                        <YakitInput.Search
                            placeholder='请输入关键字搜索'
                            value={tableSearchValue}
                            onChange={(e) => setTableSearchValue(e.target.value)}
                            onSearch={(value) => onSearch(value)}
                        />
                        <YakitButton>添加</YakitButton>
                    </div>
                </div>
            </div>
        )
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type, tableSearchValue])

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
                    total: data?.Total,
                    onChange: async (page, limit) => {
                        const oldParams = params?.[0] ?? defaultParams
                        setChangePage(page)
                        const dat =
                            oldParams.Pagination.Page != getChangePage()
                                ? await runAsync({
                                      ...oldParams,
                                      Pagination: {
                                          ...oldParams?.Pagination,
                                          Page: changePage,
                                          Limit: limit
                                      }
                                  })
                                : {list: []}
                        console.log(getChangePage(), page, changePage, "sss")
                        setTableData(() => [...tableData, ...dat?.list])
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
                knowledgeBaseId={knowledgeBaseId}
            />
        </div>
    )
}

export default memo(KnowledgeBaseTable)
