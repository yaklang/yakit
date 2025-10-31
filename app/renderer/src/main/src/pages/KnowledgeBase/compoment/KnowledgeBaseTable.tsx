import {FC, memo, useMemo} from "react"
import {KnowledgeBaseTableHeader} from "./KnowledgeBaseTableHeader"
import {IconProps} from "@/assets/newIcon"

import styles from "../knowledgeBase.module.scss"
import useMultipleHoldGRPCStream from "../hooks/useMultipleHoldGRPCStream"

import type {TExistsKnowledgeBaseAsync} from "../TKnowledgeBase"
import {KnowledgeBaseItem} from "../hooks/useKnowledgeBase"
import {KnowledgeTable} from "./KnowledgeTable"
import {useSafeState} from "ahooks"
import {tableHeaderGroupOptions} from "../utils"
import {VectorTable} from "./VectorTable"
import {EntityTable} from "./EntityTable"

type UseMultipleHoldGRPCStreamReturn = ReturnType<typeof useMultipleHoldGRPCStream>

// 分别提取 tuple 的类型
type StreamsType = UseMultipleHoldGRPCStreamReturn[0]
type APIType = UseMultipleHoldGRPCStreamReturn[1]

interface KnowledgeBaseTableProps extends Partial<TExistsKnowledgeBaseAsync> {
    // knowledgeBaseItems: KnowledgeBaseItem & {icon: (props: Partial<IconProps>) => JSX.Element}
    knowledgeBaseItems: KnowledgeBaseItem & {icon: (props: Partial<IconProps>) => JSX.Element}
    streams?: StreamsType
    api?: APIType
    onEditVisible?: (visible: boolean) => void
    onDeleteVisible?: (visible: boolean) => void
    onExportVisible?: (visible: boolean) => void
}

const KnowledgeBaseTable: FC<KnowledgeBaseTableProps> = (props) => {
    const {streams, knowledgeBaseItems, api, existsKnowledgeBaseAsync} = props
    const [tableProps, setTableProps] = useSafeState<{
        type: (typeof tableHeaderGroupOptions)[number]["value"]
        tableTotal: number
        selectNum: number
    }>({
        type: "Entity",
        tableTotal: 0,
        selectNum: 0
    })

    const TargetTableRender = useMemo(() => {
        switch (tableProps.type) {
            case "Entity":
                return (
                    <EntityTable
                        knowledgeBaseItems={knowledgeBaseItems}
                        streams={streams}
                        setTableProps={setTableProps}
                        tableProps={tableProps}
                    />
                )
            case "Knowledge":
                return (
                    <KnowledgeTable
                        knowledgeBaseItems={knowledgeBaseItems}
                        streams={streams}
                        setTableProps={setTableProps}
                        tableProps={tableProps}
                    />
                )
            case "Vector":
                return (
                    <VectorTable
                        knowledgeBaseItems={knowledgeBaseItems}
                        streams={streams}
                        setTableProps={setTableProps}
                        tableProps={tableProps}
                    />
                )

            default:
                break
        }
    }, [tableProps.type, knowledgeBaseItems.ID, knowledgeBaseItems.KnowledgeBaseName])

    return (
        <div className={styles["knowledge-base-table-container"]}>
            <KnowledgeBaseTableHeader
                streams={streams}
                knowledgeBaseItems={knowledgeBaseItems}
                existsKnowledgeBaseAsync={existsKnowledgeBaseAsync}
                onDeleteVisible={props.onDeleteVisible}
                onEditVisible={props.onEditVisible}
                onExportVisible={props.onExportVisible}
                setTableProps={setTableProps}
                tableProps={tableProps}
            />
            {TargetTableRender}
        </div>
    )
}

export default memo(KnowledgeBaseTable)
export type {KnowledgeBaseTableProps}
