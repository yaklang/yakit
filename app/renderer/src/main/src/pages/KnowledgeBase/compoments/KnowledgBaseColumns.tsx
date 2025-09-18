// KnowledgeColumns.tsx
import {OutlineEyeIcon} from "@/assets/icon/outline"
import {KnowledgeBaseEntry} from "@/components/playground/knowlegeBase"
import {VectorStoreEntry} from "@/components/playground/ragManager/types"
import {ColumnsTypeProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {Space} from "antd"
import {v4 as uuidv4} from "uuid"
import styles from "../knowledgeBase.module.scss"

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
            dataKey: "KnowledgeType",
            width: 150
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
                    <YakitButton
                        size='small'
                        onClick={() =>
                            setKnowledgeModalData({
                                data: item,
                                visible: true
                            })
                        }
                    >
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


const getEntityColumns = () => [
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
        dataKey: "Rationale",
        width: 150
    },
    {
        title: "操作",
        dataKey: "actions",
        width: 100,
        fixed: "right"
        // render: (text, item: VectorStoreEntry) => (
        //     <Space>
        //         <YakitButton
        //             type='text2'
        //             size='small'
        //             icon={<OutlineEyeIcon />}
        //             onClick={() => handleViewDetail(item)}
        //             title='查看详情'
        //         />
        //     </Space>
        // )
    }
]

const getVectorColumns = (
    getVectorDetailModalData: (preValue: {
        vectorDetailModalVisible: boolean
        selectedEntryDetail: Record<string, any>
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
        render: (text, item: VectorStoreEntry) => (
            <YakitButton
                size='small'
                onClick={(e) => {
                    e.stopPropagation()
                    getVectorDetailModalData({
                        vectorDetailModalVisible: true,
                        selectedEntryDetail: item
                    })
                }}
            >
                详情
            </YakitButton>
        )
    }
]

export {getKnowledgeColumns, getVectorColumns, getEntityColumns}
