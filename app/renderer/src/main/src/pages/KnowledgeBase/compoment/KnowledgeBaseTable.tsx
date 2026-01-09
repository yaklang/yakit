import {Dispatch, FC, SetStateAction, useEffect, useMemo} from "react"
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
    setStructureTableHeaderGroupOptions?: Dispatch<
        SetStateAction<
            | {
                  value: string
                  label: string
              }[]
            | undefined
        >
    >
    hasBuildDataProps?: boolean
}

const {ipcRenderer} = window.require("electron")

// 需要命中 构建知识插件 中 的知识条目([multi-hops]: knowledge) ID
const targetCardStateRelationshipID = "[multi-hops]: knowledge"

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
    const {streams, knowledgeBaseItems, setOpenQA, setStructureTableHeaderGroupOptions, hasBuildDataProps} = props
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

    const {data: structureTableHeaderGroupOptions, run: knowledgeBaseIndexRun} = useRequest(
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

    useUpdateEffect(() => {
        setStructureTableHeaderGroupOptions?.(structureTableHeaderGroupOptions)
    }, [structureTableHeaderGroupOptions])

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

    const hasBuildData = useMemo(() => {
        // 检查是否需要执行筛选
        if (knowledgeBaseItems.streamToken || knowledgeBaseItems.historyGenerateKnowledgeList?.length > 0) {
            if (streams) {
                // 筛选单条构建流数据
                let result = false

                if (knowledgeBaseItems.streamToken) {
                    const findCardStateRelationshipItem = streams?.[knowledgeBaseItems.streamToken]?.cardState?.find(
                        (it) => it.tag === targetCardStateRelationshipID
                    )

                    const targetDataNumList = findCardStateRelationshipItem?.info
                        .find((it) => it.Id === targetCardStateRelationshipID)
                        ?.Data?.split("/")

                    result = targetDataNumList ? !targetDataNumList?.includes("0") : false
                }

                // 筛选多条历史流数据
                const validHistoryStreams = knowledgeBaseItems.historyGenerateKnowledgeList
                    .map((historyItem) => {
                        const streamData = streams[historyItem.token] // 根据 token 获取对应的流数据

                        if (streamData) {
                            // 查找 cardState 中的 item
                            const findCardStateRelationshipItem = streamData?.cardState?.find(
                                (it) => it.tag === targetCardStateRelationshipID
                            )

                            // 获取 targetDataNumList
                            const targetDataNumList = findCardStateRelationshipItem?.info
                                .find((it) => it.Id === targetCardStateRelationshipID)
                                ?.Data?.split("/")

                            // 判断是否包含 "0"
                            return targetDataNumList ? !targetDataNumList.includes("0") : false
                        }
                        return false // 如果没有对应的流数据，返回 false
                    })
                    .filter((isValid) => isValid) // 过滤出所有有效的流数据

                // 将单条构建流数据结果与多条历史流数据结果合并
                return result || validHistoryStreams?.length > 0
            } else {
                return false
            }
        } else {
            return false
        }
    }, [streams, knowledgeBaseItems])

    useEffect(() => {
        knowledgeBaseIndexRun()
    }, [knowledgeBaseItems])

    useEffect(() => {
        const timer = setTimeout(() => {
            knowledgeBaseIndexRun()
        }, 5000)
        return () => clearTimeout(timer)
    }, [knowledgeBaseItems, hasBuildDataProps])

    useEffect(() => {
        if (hasBuildData) {
            const timer = setTimeout(() => {
                knowledgeBaseIndexRun()
            }, 5000)
            return () => clearTimeout(timer)
        }
    }, [hasBuildData])

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
                knowledgeBaseIndexRun={knowledgeBaseIndexRun}
            />
            {structureTableHeaderGroupOptions && structureTableHeaderGroupOptions?.length > 0 ? (
                TargetTableRender
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
            <AddKnowledgeBaseModal
                addModalData={addModalData}
                setAddModalData={setAddModalData}
                addManuallyItem={false}
            />
        </div>
    )
}

export default KnowledgeBaseTable
export type {KnowledgeBaseTableProps}
