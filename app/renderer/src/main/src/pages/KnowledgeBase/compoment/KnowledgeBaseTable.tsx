import {Dispatch, FC, memo, SetStateAction, useEffect, useMemo} from "react"
import {KnowledgeBaseTableHeader} from "./KnowledgeBaseTableHeader"
import {IconProps} from "@/assets/newIcon"

import styles from "../knowledgeBase.module.scss"
import useMultipleHoldGRPCStream from "../hooks/useMultipleHoldGRPCStream"

import {KnowledgeBaseItem} from "../hooks/useKnowledgeBase"
import {KnowledgeTable} from "./KnowledgeTable"
import {useSafeState, useUpdateEffect} from "ahooks"
import {tableHeaderGroupOptions} from "../utils"
import {VectorTable} from "./VectorTable"
import {EntityTable} from "./EntityTable"

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
    onExportKnowledgeBase?: (KnowledgeBaseId: number) => Promise<void>
    setOpenQA?: Dispatch<SetStateAction<boolean>>
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
    }, [tableProps.type, knowledgeBaseItems.ID, knowledgeBaseItems.KnowledgeBaseName, query, selectList, allCheck])

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
            />
            {TargetTableRender}
        </div>
    )
}

export default KnowledgeBaseTable
export type {KnowledgeBaseTableProps}
