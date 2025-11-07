import React, {useEffect, useState} from "react"
import {AutoCard} from "@/components/AutoCard"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {ColumnsTypeProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {Form, Space, InputNumber} from "antd"
import {useMemoizedFn} from "ahooks"
import {failed, success} from "@/utils/notification"
import {KnowledgeBaseEntry, KnowledgeEntryTableProps, KnowledgeEntryFormData, SearchKnowledgeEntryParams} from "./types"

import styles from "./KnowledgeEntryTable.module.scss"
import {PlusIcon, TrashIcon} from "@/assets/newIcon"
import {OutlinePencilaltIcon, OutlineSearchIcon} from "@/assets/icon/outline"
import {SolidPlayIcon} from "@/assets/icon/solid"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"

const {ipcRenderer} = window.require("electron")

export const KnowledgeEntryTable: React.FC<KnowledgeEntryTableProps> = ({knowledgeBase, onRefresh}) => {
    const [entries, setEntries] = useState<KnowledgeBaseEntry[]>([])
    const [searchLoading, setSearchLoading] = useState(false)
    const [modalVisible, setModalVisible] = useState(false)
    const [editingEntry, setEditingEntry] = useState<KnowledgeBaseEntry>()
    const [searchKeyword, setSearchKeyword] = useState("")
    const [total, setTotal] = useState(0)
    const [pagination, setPagination] = useState({
        Page: 1,
        Limit: 20,
        OrderBy: "id",
        Order: "desc" as "asc" | "desc"
    })
    const [form] = Form.useForm()
    const [indexingEntries, setIndexingEntries] = useState<Set<number>>(new Set())

    // 搜索知识条目
    const searchEntries = useMemoizedFn(async (params?: Partial<SearchKnowledgeEntryParams>) => {
        if (!knowledgeBase) {
            setEntries([])
            setTotal(0)
            return
        }

        setSearchLoading(true)
        try {
            const searchParams: SearchKnowledgeEntryParams = {
                KnowledgeBaseId: knowledgeBase.ID,
                Keyword: searchKeyword,
                Pagination: {
                    ...pagination,
                    ...params?.Pagination
                }
            }
            const response = await ipcRenderer.invoke("SearchKnowledgeBaseEntry", searchParams)
            setEntries(response.KnowledgeBaseEntries || [])
            setTotal(response.Total || 0)
        } catch (error) {
            failed(`搜索知识条目失败: ${error}`)
            setEntries([])
            setTotal(0)
        } finally {
            setSearchLoading(false)
        }
    })

    useEffect(() => {
        searchEntries()
    }, [knowledgeBase, searchKeyword, pagination])

    // 创建知识条目
    const handleCreate = useMemoizedFn(async (values: KnowledgeEntryFormData) => {
        if (!knowledgeBase) return

        try {
            const params = {
                ...values,
                KnowledgeBaseID: knowledgeBase.ID,
                Keywords: values.Keywords.filter((k) => k.trim() !== ""),
                PotentialQuestions: values.PotentialQuestions.filter((q) => q.trim() !== ""),
                PotentialQuestionsVector: [] // 向量会由后端生成
            }
            await ipcRenderer.invoke("CreateKnowledgeBaseEntry", params)
            success("创建知识条目成功")
            setModalVisible(false)
            form.resetFields()
            searchEntries()
            onRefresh()
        } catch (error) {
            failed(`创建知识条目失败: ${error}`)
        }
    })

    // 更新知识条目
    const handleUpdate = useMemoizedFn(async (values: KnowledgeEntryFormData) => {
        if (!editingEntry) return

        try {
            const params = {
                ...values,
                KnowledgeBaseEntryID: editingEntry.ID,
                KnowledgeBaseID: editingEntry.KnowledgeBaseId,
                KnowledgeBaseEntryHiddenIndex: editingEntry.HiddenIndex,
                Keywords: values.Keywords.filter((k) => k.trim() !== ""),
                PotentialQuestions: values.PotentialQuestions.filter((q) => q.trim() !== "")
            }
            await ipcRenderer.invoke("UpdateKnowledgeBaseEntry", params)
            success("更新知识条目成功")
            setModalVisible(false)
            setEditingEntry(undefined)
            form.resetFields()
            searchEntries()
            onRefresh()
        } catch (error) {
            failed(`更新知识条目失败: ${error}`)
        }
    })

    // 删除知识条目
    const handleDelete = useMemoizedFn(async (entry: KnowledgeBaseEntry) => {
        try {
            await ipcRenderer.invoke("DeleteKnowledgeBaseEntry", {
                KnowledgeBaseEntryId: entry.ID,
                KnowledgeBaseId: entry.KnowledgeBaseId,
                KnowledgeBaseEntryHiddenIndex: entry.HiddenIndex
            })
            success("删除知识条目成功")
            searchEntries()
            onRefresh()
        } catch (error) {
            failed(`删除知识条目失败: ${error}`)
        }
    })

    // 打开新增对话框
    const handleOpenCreate = useMemoizedFn(() => {
        setEditingEntry(undefined)
        form.resetFields()
        form.setFieldsValue({
            ImportanceScore: 5,
            SourcePage: 1,
            Keywords: [""],
            PotentialQuestions: [""]
        })
        setModalVisible(true)
    })

    // 打开编辑对话框
    const handleOpenEdit = useMemoizedFn((entry: KnowledgeBaseEntry) => {
        setEditingEntry(entry)
        form.setFieldsValue({
            KnowledgeTitle: entry.KnowledgeTitle,
            KnowledgeType: entry.KnowledgeType,
            ImportanceScore: entry.ImportanceScore,
            Keywords: entry.Keywords.length > 0 ? entry.Keywords : [""],
            KnowledgeDetails: entry.KnowledgeDetails,
            Summary: entry.Summary,
            SourcePage: entry.SourcePage,
            PotentialQuestions: entry.PotentialQuestions.length > 0 ? entry.PotentialQuestions : [""]
        })
        setModalVisible(true)
    })

    // 提交表单
    const handleSubmit = useMemoizedFn(() => {
        form.validateFields().then((values) => {
            if (editingEntry) {
                handleUpdate(values)
            } else {
                handleCreate(values)
            }
        })
    })

    // 为单个知识条目创建索引
    const handleCreateIndex = useMemoizedFn(async (entry: KnowledgeBaseEntry) => {
        try {
            setIndexingEntries((prev) => new Set(prev.add(entry.ID)))

            await ipcRenderer.invoke("BuildVectorIndexForKnowledgeBaseEntry", {
                KnowledgeBaseEntryId: entry.ID,
                KnowledgeBaseId: entry.KnowledgeBaseId,
                KnowledgeBaseEntryHiddenIndex: entry.HiddenIndex,
                DistanceFuncType: "cosine"
            })

            success(`为知识条目 "${entry.KnowledgeTitle}" 创建索引成功`)
        } catch (error) {
            failed(`为知识条目创建索引失败: ${error}`)
        } finally {
            setIndexingEntries((prev) => {
                const newSet = new Set(prev)
                newSet.delete(entry.ID)
                return newSet
            })
        }
    })

    const columns: ColumnsTypeProps[] = [
        {
            title: "ID",
            dataKey: "ID",
            width: 80,
            render: (text, item: KnowledgeBaseEntry) => item.ID
        },
        {
            title: "标题",
            dataKey: "KnowledgeTitle",
            width: 200,
            render: (text, item: KnowledgeBaseEntry) => (
                <div className={styles["title-cell"]}>{item.KnowledgeTitle}</div>
            )
        },
        {
            title: "类型",
            dataKey: "KnowledgeType",
            width: 120,
            render: (text, item: KnowledgeBaseEntry) => <YakitTag>{item.KnowledgeType}</YakitTag>
        },
        {
            title: "重要度",
            dataKey: "ImportanceScore",
            width: 100,
            render: (text, item: KnowledgeBaseEntry) => (
                <YakitTag
                    color={item.ImportanceScore > 7 ? "danger" : item.ImportanceScore > 4 ? "warning" : "success"}
                >
                    {item.ImportanceScore}
                </YakitTag>
            )
        },
        {
            title: "关键词",
            dataKey: "Keywords",
            width: 200,
            render: (_, item: KnowledgeBaseEntry) => (
                <div className={styles["keywords-cell"]}>
                    {item.Keywords.slice(0, 3).map((keyword, key) => (
                        <YakitTag size='small' key={key}>
                            {keyword}
                        </YakitTag>
                    ))}
                    {item.Keywords.length > 3 && <YakitTag size='small'>+{item.Keywords.length - 3}</YakitTag>}
                </div>
            )
        },
        {
            title: "摘要",
            dataKey: "Summary",
            width: 300,
            render: (text, item: KnowledgeBaseEntry) => (
                <div className={styles["summary-cell"]} title={item.Summary}>
                    {item.Summary}
                </div>
            )
        },
        {
            title: "页码",
            dataKey: "SourcePage",
            width: 80,
            render: (text, item: KnowledgeBaseEntry) => item.SourcePage
        },
        {
            title: "操作",
            dataKey: "actions",
            width: 160,
            fixed: "right",
            render: (text, item: KnowledgeBaseEntry) => (
                <Space>
                    {indexingEntries.has(item.ID) ? (
                        <YakitButton type='text2' size='small' loading={true} title='正在创建索引...'>
                            索引中...
                        </YakitButton>
                    ) : (
                        <YakitButton
                            type='text2'
                            size='small'
                            icon={<SolidPlayIcon />}
                            onClick={() => handleCreateIndex(item)}
                            title='为此条目创建向量索引'
                        >
                            索引
                        </YakitButton>
                    )}
                    <YakitButton
                        type='text2'
                        size='small'
                        icon={<OutlinePencilaltIcon />}
                        onClick={() => handleOpenEdit(item)}
                        title='编辑'
                    />
                    <YakitPopconfirm
                        title='确认删除此知识条目吗？'
                        onConfirm={() => handleDelete(item)}
                        placement='topRight'
                    >
                        <YakitButton type='text2' size='small' colors='danger' icon={<TrashIcon />} title='删除' />
                    </YakitPopconfirm>
                </Space>
            )
        }
    ]

    if (!knowledgeBase) {
        return (
            <div className={styles["knowledge-entry-table"]}>
                <AutoCard title='知识条目' bodyStyle={{padding: 24}}>
                    <YakitEmpty description='请先选择一个知识库' />
                </AutoCard>
            </div>
        )
    }

    return (
        <div className={styles["knowledge-entry-table"]}>
            <AutoCard
                title={`知识条目 - ${knowledgeBase.KnowledgeBaseName}`}
                size='small'
                bodyStyle={{padding: 0}}
                extra={
                    <Space>
                        <YakitInput
                            placeholder='搜索知识条目...'
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            style={{width: 200}}
                            suffix={<OutlineSearchIcon />}
                        />
                        <YakitButton type='primary' size='small' icon={<PlusIcon />} onClick={handleOpenCreate}>
                            新增条目
                        </YakitButton>
                    </Space>
                }
            >
                <TableVirtualResize<KnowledgeBaseEntry>
                    loading={searchLoading}
                    columns={columns}
                    data={entries}
                    renderKey='ID'
                    isRefresh={false}
                    pagination={{
                        page: pagination.Page,
                        limit: pagination.Limit,
                        total: total,
                        onChange: (page, limit) => {
                            setPagination((prev) => ({
                                ...prev,
                                Page: page,
                                Limit: limit || prev.Limit
                            }))
                        }
                    }}
                />
            </AutoCard>

            <YakitModal
                title={editingEntry ? "编辑知识条目" : "新增知识条目"}
                visible={modalVisible}
                onCancel={() => {
                    setModalVisible(false)
                    setEditingEntry(undefined)
                    form.resetFields()
                }}
                onOk={handleSubmit}
                width={800}
                okText='确认'
                cancelText='取消'
            >
                <Form form={form} layout='vertical' style={{marginTop: 16}}>
                    <Form.Item
                        label='知识标题'
                        name='KnowledgeTitle'
                        rules={[{required: true, message: "请输入知识标题"}]}
                    >
                        <YakitInput placeholder='请输入知识标题' />
                    </Form.Item>

                    <Form.Item
                        label='知识类型'
                        name='KnowledgeType'
                        rules={[{required: true, message: "请输入知识类型"}]}
                    >
                        <YakitInput placeholder='请输入知识类型' />
                    </Form.Item>

                    <Form.Item
                        label='重要度评分'
                        name='ImportanceScore'
                        rules={[{required: true, message: "请输入重要度评分"}]}
                    >
                        <YakitInputNumber min={1} max={10} style={{width: "100%"}} />
                    </Form.Item>

                    <Form.Item label='关键词' name='Keywords'>
                        <Form.List name='Keywords'>
                            {(fields, {add, remove}) => (
                                <>
                                    {fields.map(({key, name, ...restField}) => (
                                        <Space key={key} style={{display: "flex", marginBottom: 8}} align='baseline'>
                                            <Form.Item {...restField} name={[name]} style={{marginBottom: 0, flex: 1}}>
                                                <YakitInput placeholder='请输入关键词' />
                                            </Form.Item>
                                            <YakitButton
                                                type='text2'
                                                colors='danger'
                                                icon={<TrashIcon />}
                                                onClick={() => remove(name)}
                                            />
                                        </Space>
                                    ))}
                                    <YakitButton type='outline1' onClick={() => add()} icon={<PlusIcon />}>
                                        添加关键词
                                    </YakitButton>
                                </>
                            )}
                        </Form.List>
                    </Form.Item>

                    <Form.Item
                        label='知识详情'
                        name='KnowledgeDetails'
                        rules={[{required: true, message: "请输入知识详情"}]}
                    >
                        <YakitInput.TextArea placeholder='请输入知识详情' rows={6} maxLength={5000} showCount />
                    </Form.Item>

                    <Form.Item label='摘要' name='Summary'>
                        <YakitInput.TextArea placeholder='请输入摘要' rows={3} maxLength={500} showCount />
                    </Form.Item>

                    <Form.Item label='源页码' name='SourcePage'>
                        <InputNumber min={1} style={{width: "100%"}} />
                    </Form.Item>

                    <Form.Item label='潜在问题' name='PotentialQuestions'>
                        <Form.List name='PotentialQuestions'>
                            {(fields, {add, remove}) => (
                                <>
                                    {fields.map(({key, name, ...restField}) => (
                                        <Space key={key} style={{display: "flex", marginBottom: 8}} align='baseline'>
                                            <Form.Item {...restField} name={[name]} style={{marginBottom: 0, flex: 1}}>
                                                <YakitInput placeholder='请输入潜在问题' />
                                            </Form.Item>
                                            <YakitButton
                                                type='text2'
                                                colors='danger'
                                                icon={<TrashIcon />}
                                                onClick={() => remove(name)}
                                            />
                                        </Space>
                                    ))}
                                    <YakitButton type='outline1' onClick={() => add()} icon={<PlusIcon />}>
                                        添加问题
                                    </YakitButton>
                                </>
                            )}
                        </Form.List>
                    </Form.Item>
                </Form>
            </YakitModal>
        </div>
    )
}
