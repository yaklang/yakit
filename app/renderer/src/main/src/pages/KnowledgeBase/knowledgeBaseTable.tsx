import {FC, useMemo, useRef} from "react"
import {useRequest, useSafeState, useUpdateEffect} from "ahooks"
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

import {getKnowledgeColumns} from "./compoments/KnowledgBaseColumns"
import {KnowledgeModalVisible} from "./compoments/KnowledgeModalVisible"

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

const KnowledgeBaseTable: FC<{knowledgeBaseId?: number}> = ({knowledgeBaseId}) => {
    const [type, setType] = useSafeState("Knowledge")
    const [tableData, setTableData] = useSafeState<KnowledgeBaseEntry[]>([])
    const [knowledgeModalData, setKnowledgeModalData] = useSafeState({
        data: {},
        visible: false
    })

    const {data, loading, runAsync, params} = useRequest(
        async (params: SearchKnowledgeEntryParams) => {
            setTableData([])
            const result = await ipcRenderer.invoke("SearchKnowledgeBaseEntry", params)
            return result
        },
        {
            manual: true,
            defaultParams: [defaultParams],
            onSuccess: (res) => {
                setTableData((preValue) => preValue.concat(res?.KnowledgeBaseEntries ?? []))
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

    useUpdateEffect(() => {
        setTableData([])
        runAsync({...defaultParams, KnowledgeBaseId: knowledgeBaseId!})
    }, [knowledgeBaseId])

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
                        options={[
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
                        ]}
                        value={type}
                        onChange={(e) => {
                            setType(e.target.value)
                        }}
                    />
                    <div>
                        <YakitInput.Search
                            placeholder='请输入关键字搜索'
                            onSearch={async (value) => {
                                await runAsync({
                                    ...defaultParams,
                                    KnowledgeBaseId: knowledgeBaseId!,
                                    Keyword: value
                                })
                            }}
                        />
                        <YakitButton>添加</YakitButton>
                    </div>
                </div>
            </div>
        )
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type])

    return (
        <div style={{height: "100%"}}>
            <ReactResizeDetector
                onResize={(width, height) => {
                    if (!width || !height) {
                        return
                    }
                }}
                handleWidth={true}
                handleHeight={true}
                refreshMode={"debounce"}
                refreshRate={50}
            />
            <TableVirtualResize<KnowledgeBaseEntry>
                loading={loading}
                columns={getKnowledgeColumns(deleteRunAsunc, setKnowledgeModalData)}
                data={tableData}
                renderKey='ID'
                isRefresh={false}
                renderTitle={knowledgeBaseTableRenderTitle}
                pagination={{
                    page: data?.Pagination?.Page,
                    limit: data?.Pagination?.Limit,
                    total: 20,
                    onChange: (page, limit) => {
                        const oldParams = params?.[0] ?? defaultParams
                        runAsync({
                            ...oldParams,
                            Pagination: {
                                ...oldParams?.Pagination,
                                Page: page,
                                Limit: limit
                            },
                            KnowledgeBaseId: knowledgeBaseId!
                        })
                    }
                }}
            />
            <KnowledgeModalVisible
                knowledgeModalData={knowledgeModalData}
                setKnowledgeModalData={setKnowledgeModalData}
            />
        </div>
    )
}

export {KnowledgeBaseTable}
