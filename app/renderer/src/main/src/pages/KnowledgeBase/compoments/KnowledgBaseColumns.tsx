// KnowledgeColumns.tsx
import {KnowledgeBaseEntry} from "@/components/playground/knowlegeBase"
import {ColumnsTypeProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {v4 as uuidv4} from "uuid"

type TgetKnowledgeColumnsProps = (
    handleDelete: (item: KnowledgeBaseEntry) => Promise<void>,
    setKnowledgeModalData: (value: {data: {}; visible: boolean}) => void
) => ColumnsTypeProps[]

const getKnowledgeColumns: TgetKnowledgeColumnsProps = (handleDelete, setKnowledgeModalData) => {
    return [
        {
            title: "ID",
            dataKey: "ID",
            width: 80
        },
        {
            title: "标题",
            dataKey: "KnowledgeTitle",
            width: 200
        },
        {
            title: "类型",
            dataKey: "KnowledgeType"
        },
        {
            title: "关键词",
            dataKey: "Keywords",
            render: (value) => {
                return value?.map((it) => (
                    <YakitTag style={{marginRight: 4}} key={it + uuidv4()}>
                        {it}
                    </YakitTag>
                ))
            }
        },
        {
            title: "摘要",
            dataKey: "Summary",
            width: 300
        },
        {
            title: "操作",
            dataKey: "actions",
            width: 160,
            fixed: "right",
            render: (_, item: KnowledgeBaseEntry) => (
                <div style={{display: "flex", gap: 4}}>
                    <YakitButton size='small'>详情</YakitButton>
                    <YakitButton size='small' onClick={() => setKnowledgeModalData({
                        data: item,
                        visible: true
                    })}>
                        编辑
                    </YakitButton>
                    <YakitPopconfirm
                        title='删除后无法恢复，确认删除此知识库吗？'
                        onConfirm={(e) => {
                            e?.stopPropagation()
                            handleDelete(item)
                        }}
                        placement='topRight'
                    >
                        <YakitButton size='small' onClick={(e) => e.stopPropagation()}>
                            删除
                        </YakitButton>
                    </YakitPopconfirm>
                </div>
            )
        }
    ]
}

export {getKnowledgeColumns}
