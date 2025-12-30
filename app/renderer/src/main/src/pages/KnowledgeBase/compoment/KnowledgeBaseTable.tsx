import {Dispatch, FC, memo, SetStateAction, useEffect, useMemo} from "react"
import {KnowledgeBaseTableHeader} from "./KnowledgeBaseTableHeader"
import {IconProps, PlusIcon} from "@/assets/newIcon"

import styles from "../knowledgeBase.module.scss"
import useMultipleHoldGRPCStream from "../hooks/useMultipleHoldGRPCStream"

import {KnowledgeBaseItem} from "../hooks/useKnowledgeBase"
import {KnowledgeTable} from "./KnowledgeTable"
import {useRequest, useSafeState, useUpdateEffect} from "ahooks"
import {
    apiListVectorStoreEntries,
    apiQueryEntity,
    apiSearchKnowledgeBaseEntry,
    tableHeaderGroupOptions,
    totalKeyMap
} from "../utils"
import {VectorTable} from "./VectorTable"
import {EntityTable} from "./EntityTable"
import {genDefaultPagination} from "@/pages/invoker/schema"
import {failed} from "@/utils/notification"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {AddKnowledgeBaseModal} from "./AddKnowledgeBaseModal"

type UseMultipleHoldGRPCStreamReturn = ReturnType<typeof useMultipleHoldGRPCStream>

// 分别提取 tuple 的类型
type StreamsType = UseMultipleHoldGRPCStreamReturn[0]
type APIType = UseMultipleHoldGRPCStreamReturn[1]

interface KnowledgeBaseTableProps {
    // knowledgeBaseItems: KnowledgeBaseItem & {icon: (props: Partial<IconProps>) => JSX.Element}
    knowledgeBaseItems: KnowledgeBaseItem & {icon: (props: Partial<IconProps>) => JSX.Element}
    streams?: StreamsType
    api?: APIType
    onEditVisible?: (visible: boolean) => void
    onDeleteVisible?: (visible: boolean) => void
    onExportKnowledgeBase?: (KnowledgeBaseId: string) => Promise<void>
    setOpenQA?: Dispatch<SetStateAction<boolean>>
}

const {ipcRenderer} = window.require("electron")

const loadTotals = async (knowledgeBaseItems: KnowledgeBaseTableProps["knowledgeBaseItems"]) => {
    const repoResult = await ipcRenderer.invoke("ListEntityRepository", {})

    const BaseIndex = repoResult?.EntityRepositories?.find((it) => it.Name === knowledgeBaseItems?.KnowledgeBaseName)
        ?.HiddenIndex

    const results = await Promise.allSettled([
        // 实体
        apiQueryEntity({
            Pagination: genDefaultPagination(20),
            Filter: {
                BaseIndex
            }
        }),

        // 知识
        apiSearchKnowledgeBaseEntry({
            Filter: {
                KnowledgeBaseId: knowledgeBaseItems?.ID
            },
            Pagination: genDefaultPagination(20)
        }),

        // 向量
        apiListVectorStoreEntries({
            Filter: {
                CollectionName: knowledgeBaseItems?.KnowledgeBaseName
            },
            Pagination: genDefaultPagination(20)
        })
    ])

    const totals = {
        entityTotal: results[0].status === "fulfilled" ? String(results[0].value?.Total ?? "0") : "0",

        knowledgeTotal: results[1].status === "fulfilled" ? String(results[1].value?.Total ?? "0") : "0",

        vectorTotal: results[2].status === "fulfilled" ? String(results[2].value?.Total ?? "0") : "0"
    }

    return totals
}

const KnowledgeBaseTable: FC<KnowledgeBaseTableProps> = (props) => {
    const {streams, knowledgeBaseItems, setOpenQA} = props
    const [query, setQuery] = useSafeState("")
    const [linkId, setLinkId] = useSafeState<string[]>([])
    const [tableProps, setTableProps] = useSafeState<{
        type: (typeof tableHeaderGroupOptions)[number]["value"]
        tableTotal: number
    }>({
        type: "entity",
        tableTotal: 0
    })

    const [selectList, setSelectList] = useSafeState<any[]>([])
    const [allCheck, setAllCheck] = useSafeState<boolean>(false)

    const {
        data: structureTableHeaderGroupOptions,
        run: knowledgeBaseIndexRun,
        loading: resultAllTableLoading
    } = useRequest(
        async () => {
            const result = await loadTotals(knowledgeBaseItems)
            return tableHeaderGroupOptions.filter((option) => {
                const totalKey = totalKeyMap[option.value]
                return result?.[totalKey] !== "0"
            })
        },
        {
            manual: true,
            onError: (err) => failed(`获取全局知识库失败: ${err}`)
        }
    )

    useEffect(() => {
        knowledgeBaseIndexRun()
    }, [knowledgeBaseItems.ID])

    const [addModalData, setAddModalData] = useSafeState({
        visible: false,
        KnowledgeBaseName: ""
    })

    const onOpenAddKnowledgeBaseModal = () => {
        setAddModalData({
            visible: true,
            KnowledgeBaseName: knowledgeBaseItems.KnowledgeBaseName
        })
    }

    const TargetTableRender = useMemo(() => {
        switch (tableProps.type) {
            case "entity":
                return (
                    <EntityTable
                        knowledgeBaseItems={knowledgeBaseItems}
                        streams={streams}
                        setTableProps={setTableProps}
                        tableProps={tableProps}
                        query={query}
                        linkId={linkId}
                        setSelectList={setSelectList}
                        selectList={selectList}
                        allCheck={allCheck}
                        setAllCheck={setAllCheck}
                    />
                )
            case "knowledge":
                return (
                    <KnowledgeTable
                        knowledgeBaseItems={knowledgeBaseItems}
                        streams={streams}
                        setTableProps={setTableProps}
                        tableProps={tableProps}
                        query={query}
                        linkId={linkId}
                        setSelectList={setSelectList}
                        selectList={selectList}
                        allCheck={allCheck}
                        setAllCheck={setAllCheck}
                    />
                )
            case "vector":
                return (
                    <VectorTable
                        knowledgeBaseItems={knowledgeBaseItems}
                        streams={streams}
                        setTableProps={setTableProps}
                        tableProps={tableProps}
                        query={query}
                        setLinkId={setLinkId}
                    />
                )

            default:
                break
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tableProps, knowledgeBaseItems, streams, query, linkId, selectList, allCheck])

    return (
        <div className={styles["knowledge-base-table-container"]}>
            <KnowledgeBaseTableHeader
                streams={streams}
                knowledgeBaseItems={knowledgeBaseItems}
                onDeleteVisible={props.onDeleteVisible}
                onEditVisible={props.onEditVisible}
                onExportKnowledgeBase={props.onExportKnowledgeBase}
                setTableProps={setTableProps}
                tableProps={tableProps}
                setQuery={setQuery}
                query={query}
                setLinkId={setLinkId}
                setOpenQA={setOpenQA}
                setSelectList={setSelectList}
                selectList={selectList}
                allCheck={allCheck}
                setAllCheck={setAllCheck}
                structureTableHeaderGroupOptions={structureTableHeaderGroupOptions}
                onOpenAddKnowledgeBaseModal={onOpenAddKnowledgeBaseModal}
            />
            {structureTableHeaderGroupOptions && structureTableHeaderGroupOptions?.length > 0 ? (
                <YakitSpin spinning={resultAllTableLoading}>{TargetTableRender}</YakitSpin>
            ) : (
                <YakitEmpty
                    style={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        borderTop: "1px solid var(--Colors-Use-Neutral-Border)",
                        margin: 0,
                        marginTop: "8px"
                    }}
                >
                    <YakitButton
                        disabled={!knowledgeBaseItems.streamstep || knowledgeBaseItems.streamstep !== "success"}
                        icon={<PlusIcon />}
                        type='secondary2'
                        onClick={() => onOpenAddKnowledgeBaseModal()}
                    >
                        添加
                    </YakitButton>
                </YakitEmpty>
            )}
            <AddKnowledgeBaseModal addModalData={addModalData} setAddModalData={setAddModalData} />
        </div>
    )
}

export default KnowledgeBaseTable
export type {KnowledgeBaseTableProps}
