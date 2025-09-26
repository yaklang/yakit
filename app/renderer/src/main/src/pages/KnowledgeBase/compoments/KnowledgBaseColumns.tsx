import {KnowledgeBaseEntry} from "@/components/playground/knowlegeBase"
import {VectorStoreEntry} from "@/components/playground/ragManager/types"
import {ColumnsTypeProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {v4 as uuidv4} from "uuid"

type TgetKnowledgeColumnsProps = (
    handleDelete: (item: KnowledgeBaseEntry) => Promise<void>,
    setKnowledgeModalData: (value: {data: {}; visible: boolean}) => void,
    setKnowledgeDetailModalData: (value: {data: Record<any, any>; visible: boolean}) => void
) => ColumnsTypeProps[]

const getKnowledgeColumns: TgetKnowledgeColumnsProps = (
    handleDelete,
    setKnowledgeModalData,
    setKnowledgeDetailModalData
) => {
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
            dataKey: "KnowledgeType",
            width: 150
        },
        {
            title: "关键词",
            dataKey: "Keywords",
            width: 200,
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
            dataKey: "Summary"
        },
        {
            title: "操作",
            dataKey: "actions",
            width: 160,
            fixed: "right",
            render: (_, item: KnowledgeBaseEntry) => (
                <div style={{display: "flex", gap: 4}}>
                    <YakitButton
                        size='small'
                        onClick={(e) => {
                            e.stopPropagation()
                            setKnowledgeDetailModalData({
                                data: item,
                                visible: true
                            })
                        }}
                    >
                        详情
                    </YakitButton>
                    <YakitButton
                        size='small'
                        onClick={(e) => {
                            e.stopPropagation()
                            setKnowledgeModalData({
                                data: item,
                                visible: true
                            })
                        }}
                    >
                        编辑
                    </YakitButton>
                    <YakitPopconfirm
                        title='确认删除此条知识吗？'
                        onConfirm={(e) => {
                            e?.stopPropagation()
                            handleDelete(item)
                        }}
                        onCancel={(e) => e?.stopPropagation()}
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

const getEntityColumns = (getEntryDetailModalData) => [
    {
        title: "ID",
        dataKey: "ID",
        width: 80
    },
    {
        title: "名称",
        dataKey: "Name",
        width: 150
    },
    {
        title: "类型",
        dataKey: "Type",
        width: 150
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
            return value?.map((it) => (
                <YakitTag style={{marginRight: 4}} key={it + uuidv4()}>
                    {it?.Value}
                </YakitTag>
            ))
        }
    },
    {
        title: "操作",
        dataKey: "actions",
         width: 80,
        fixed: "right",
        render: (_, item: VectorStoreEntry) => (
            <YakitButton
                size='small'
                onClick={(e) => {
                    e.stopPropagation()
                    getEntryDetailModalData({
                        EntityDetailModalVisible: true,
                        selectedEntryDetail: item
                    })
                }}
            >
                详情
            </YakitButton>
        )
    }
]

const getVectorColumns = (
    getVectorDetailModalData: (preValue: {
        vectorDetailModalVisible: boolean
        selectedVectorDetail: Record<string, any>
    }) => void
) => [
    {
        title: "ID",
        dataKey: "ID",
        width: 80
    },
    {
        title: "实体ID",
        dataKey: "UID",
        width: 100
    },
    {
        title: "关联实体",
        dataKey: "Metadata",
        width: 100
    },
    {
        title: "文件ID",
        dataKey: "file_ID",
        width: 100
    },
    {
        title: "文件类型",
        dataKey: "file_type",
        width: 100
    },
    {
        title: "内容",
        dataKey: "Content"
    },
    {
        title: "操作",
        dataKey: "actions",
        width: 80,
        fixed: "right",
        render: (_, item: VectorStoreEntry) => (
            <YakitButton
                size='small'
                onClick={(e) => {
                    e.stopPropagation()
                    getVectorDetailModalData({
                        vectorDetailModalVisible: true,
                        selectedVectorDetail: item
                    })
                }}
            >
                详情
            </YakitButton>
        )
    }
]

export {getKnowledgeColumns, getVectorColumns, getEntityColumns}
