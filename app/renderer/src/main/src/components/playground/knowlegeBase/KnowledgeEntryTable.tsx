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
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

const {ipcRenderer} = window.require("electron")

export const KnowledgeEntryTable: React.FC<KnowledgeEntryTableProps> = ({knowledgeBase, onRefresh}) => {
    const {t} = useI18nNamespaces(["playground"])
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
            failed(t("KnowledgeEntryTable.searchFailed", {error: String(error)}))
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
            success(t("KnowledgeEntryTable.createSuccess"))
            setModalVisible(false)
            form.resetFields()
            searchEntries()
            onRefresh()
        } catch (error) {
            failed(t("KnowledgeEntryTable.createFailed", {error: String(error)}))
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
            success(t("KnowledgeEntryTable.updateSuccess"))
            setModalVisible(false)
            setEditingEntry(undefined)
            form.resetFields()
            searchEntries()
            onRefresh()
        } catch (error) {
            failed(t("KnowledgeEntryTable.updateFailed", {error: String(error)}))
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
            success(t("KnowledgeEntryTable.deleteSuccess"))
            searchEntries()
            onRefresh()
        } catch (error) {
            failed(t("KnowledgeEntryTable.deleteFailed", {error: String(error)}))
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

            success(t("KnowledgeEntryTable.createIndexSuccess", {title: entry.KnowledgeTitle}))
        } catch (error) {
            failed(t("KnowledgeEntryTable.createIndexFailed", {error: String(error)}))
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
            title: t("KnowledgeEntryTable.id"),
            dataKey: "ID",
            width: 80,
            render: (text, item: KnowledgeBaseEntry) => item.ID
        },
        {
            title: t("KnowledgeEntryTable.title"),
            dataKey: "KnowledgeTitle",
            width: 200,
            render: (text, item: KnowledgeBaseEntry) => (
                <div className={styles["title-cell"]}>{item.KnowledgeTitle}</div>
            )
        },
        {
            title: t("KnowledgeEntryTable.type"),
            dataKey: "KnowledgeType",
            width: 120,
            render: (text, item: KnowledgeBaseEntry) => <YakitTag>{item.KnowledgeType}</YakitTag>
        },
        {
            title: t("KnowledgeEntryTable.importance"),
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
            title: t("KnowledgeEntryTable.keywords"),
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
            title: t("KnowledgeEntryTable.summary"),
            dataKey: "Summary",
            width: 300,
            render: (text, item: KnowledgeBaseEntry) => (
                <div className={styles["summary-cell"]} title={item.Summary}>
                    {item.Summary}
                </div>
            )
        },
        {
            title: t("KnowledgeEntryTable.sourcePage"),
            dataKey: "SourcePage",
            width: 80,
            render: (text, item: KnowledgeBaseEntry) => item.SourcePage
        },
        {
            title: t("KnowledgeEntryTable.actions"),
            dataKey: "actions",
            width: 160,
            fixed: "right",
            render: (text, item: KnowledgeBaseEntry) => (
                <Space>
                    {indexingEntries.has(item.ID) ? (
                        <YakitButton type='text2' size='small' loading={true} title={t("KnowledgeEntryTable.indexing") }>
                            {t("KnowledgeEntryTable.indexing")}
                        </YakitButton>
                    ) : (
                        <YakitButton
                            type='text2'
                            size='small'
                            icon={<SolidPlayIcon />}
                            onClick={() => handleCreateIndex(item)}
                            title={t("KnowledgeEntryTable.createIndexForEntry")}
                        >
                            {t("KnowledgeEntryTable.index")}
                        </YakitButton>
                    )}
                    <YakitButton
                        type='text2'
                        size='small'
                        icon={<OutlinePencilaltIcon />}
                        onClick={() => handleOpenEdit(item)}
                        title={t("KnowledgeEntryTable.edit")}
                    />
                    <YakitPopconfirm
                        title={t("KnowledgeEntryTable.deleteConfirm")}
                        onConfirm={() => handleDelete(item)}
                        placement='topRight'
                    >
                        <YakitButton type='text2' size='small' colors='danger' icon={<TrashIcon />} title={t("KnowledgeEntryTable.delete")} />
                    </YakitPopconfirm>
                </Space>
            )
        }
    ]

    if (!knowledgeBase) {
        return (
            <div className={styles["knowledge-entry-table"]}>
                <AutoCard title={t("KnowledgeEntryTable.title")} bodyStyle={{padding: 24}}>
                    <YakitEmpty description={t("KnowledgeEntryTable.selectKnowledgeBaseFirst")} />
                </AutoCard>
            </div>
        )
    }

    return (
        <div className={styles["knowledge-entry-table"]}>
            <AutoCard
                title={t("KnowledgeEntryTable.titleWithBase", {name: knowledgeBase.KnowledgeBaseName})}
                size='small'
                bodyStyle={{padding: 0}}
                extra={
                    <Space>
                        <YakitInput
                            placeholder={t("KnowledgeEntryTable.searchPlaceholder")}
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            style={{width: 200}}
                            suffix={<OutlineSearchIcon />}
                        />
                        <YakitButton type='primary' size='small' icon={<PlusIcon />} onClick={handleOpenCreate}>
                            {t("KnowledgeEntryTable.addEntry")}
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
                title={editingEntry ? t("KnowledgeEntryTable.editEntry") : t("KnowledgeEntryTable.addEntry")}
                visible={modalVisible}
                onCancel={() => {
                    setModalVisible(false)
                    setEditingEntry(undefined)
                    form.resetFields()
                }}
                onOk={handleSubmit}
                width={800}
                okText={t("KnowledgeEntryTable.confirm")}
                cancelText={t("KnowledgeEntryTable.cancel")}
            >
                <Form form={form} layout='vertical' style={{marginTop: 16}}>
                    <Form.Item
                        label={t("KnowledgeEntryTable.knowledgeTitle")}
                        name='KnowledgeTitle'
                        rules={[{required: true, message: t("KnowledgeEntryTable.enterKnowledgeTitle")} ]}
                    >
                        <YakitInput placeholder={t("KnowledgeEntryTable.enterKnowledgeTitle")} />
                    </Form.Item>

                    <Form.Item
                        label={t("KnowledgeEntryTable.knowledgeType")}
                        name='KnowledgeType'
                        rules={[{required: true, message: t("KnowledgeEntryTable.enterKnowledgeType")} ]}
                    >
                        <YakitInput placeholder={t("KnowledgeEntryTable.enterKnowledgeType")} />
                    </Form.Item>

                    <Form.Item
                        label={t("KnowledgeEntryTable.importanceScore")}
                        name='ImportanceScore'
                        rules={[{required: true, message: t("KnowledgeEntryTable.enterImportanceScore")} ]}
                    >
                        <YakitInputNumber min={1} max={10} style={{width: "100%"}} />
                    </Form.Item>

                    <Form.Item label={t("KnowledgeEntryTable.keywords")} name='Keywords'>
                        <Form.List name='Keywords'>
                            {(fields, {add, remove}) => (
                                <>
                                    {fields.map(({key, name, ...restField}) => (
                                        <Space key={key} style={{display: "flex", marginBottom: 8}} align='baseline'>
                                            <Form.Item {...restField} name={[name]} style={{marginBottom: 0, flex: 1}}>
                                                <YakitInput placeholder={t("KnowledgeEntryTable.enterKeyword")} />
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
                                        {t("KnowledgeEntryTable.addKeyword")}
                                    </YakitButton>
                                </>
                            )}
                        </Form.List>
                    </Form.Item>

                    <Form.Item
                        label={t("KnowledgeEntryTable.knowledgeDetails")}
                        name='KnowledgeDetails'
                        rules={[{required: true, message: t("KnowledgeEntryTable.enterKnowledgeDetails")} ]}
                    >
                        <YakitInput.TextArea placeholder={t("KnowledgeEntryTable.enterKnowledgeDetails")} rows={6} maxLength={5000} showCount />
                    </Form.Item>

                    <Form.Item label={t("KnowledgeEntryTable.summary")} name='Summary'>
                        <YakitInput.TextArea placeholder={t("KnowledgeEntryTable.enterSummary")} rows={3} maxLength={500} showCount />
                    </Form.Item>

                    <Form.Item label={t("KnowledgeEntryTable.sourcePage")} name='SourcePage'>
                        <InputNumber min={1} style={{width: "100%"}} />
                    </Form.Item>

                    <Form.Item label={t("KnowledgeEntryTable.potentialQuestions")} name='PotentialQuestions'>
                        <Form.List name='PotentialQuestions'>
                            {(fields, {add, remove}) => (
                                <>
                                    {fields.map(({key, name, ...restField}) => (
                                        <Space key={key} style={{display: "flex", marginBottom: 8}} align='baseline'>
                                            <Form.Item {...restField} name={[name]} style={{marginBottom: 0, flex: 1}}>
                                                <YakitInput placeholder={t("KnowledgeEntryTable.enterPotentialQuestion")} />
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
                                        {t("KnowledgeEntryTable.addQuestion")}
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
