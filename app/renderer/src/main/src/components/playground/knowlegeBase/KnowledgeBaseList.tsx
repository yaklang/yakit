import React, {useEffect, useState} from "react"
import {AutoCard} from "@/components/AutoCard"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {Form, Space, Divider, message, Pagination} from "antd"
import {useMemoizedFn} from "ahooks"
import {failed, success} from "@/utils/notification"
import {
    KnowledgeBase,
    KnowledgeBaseListProps,
    KnowledgeBaseFormData,
    GetKnowledgeBaseResponse,
    Pagination as PaginationType,
    StreamStatus
} from "./types"
import styles from "./KnowledgeBaseList.module.scss"
import {PlusIcon, TrashIcon} from "@/assets/newIcon"
import {OutlinePencilaltIcon, OutlineChatalt2Icon} from "@/assets/icon/outline"
import {SolidPlayIcon} from "@/assets/icon/solid"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

const {ipcRenderer} = window.require("electron")

export const KnowledgeBaseList: React.FC<KnowledgeBaseListProps> = ({
    selectedKbId,
    onSelectKb,
    onRefresh,
    onOpenQA
}) => {
    const {t} = useI18nNamespaces(["playground"])
    const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
    const [loading, setLoading] = useState(false)
    const [modalVisible, setModalVisible] = useState(false)
    const [editingKb, setEditingKb] = useState<KnowledgeBase>()
    const [form] = Form.useForm()
    const [searchKeyword, setSearchKeyword] = useState<string>("")
    const [pagination, setPagination] = useState<PaginationType>({
        Page: 1,
        Limit: 10
    })
    const [total, setTotal] = useState(0)
    const [embedStreams, setEmbedStreams] = useState<Map<string, StreamStatus>>(new Map())

    // 获取知识库列表
    const fetchKnowledgeBases = useMemoizedFn(async (resetPage = false) => {
        setLoading(true)
        try {
            const currentPagination = resetPage ? {...pagination, Page: 1} : pagination
            if (resetPage) {
                setPagination(currentPagination)
            }

            const response: GetKnowledgeBaseResponse = await ipcRenderer.invoke("CreateKnowledgeBaseV2", {
                Keyword: searchKeyword || undefined,
                Pagination: currentPagination
            })

            if (response && response.KnowledgeBases) {
                setKnowledgeBases(response.KnowledgeBases)
                setTotal(response.Total || 0)
                if (response.Pagination) {
                    setPagination(response.Pagination)
                }
            } else {
                setKnowledgeBases([])
                setTotal(0)
            }
        } catch (error) {
            failed(t("KnowledgeBaseList.fetchFailed", {error: String(error)}))
            setKnowledgeBases([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    })

    useEffect(() => {
        fetchKnowledgeBases()
    }, [pagination.Page, pagination.Limit])

    // 搜索功能
    const handleSearch = useMemoizedFn(() => {
        fetchKnowledgeBases(true)
    })

    // 分页变化
    const handlePageChange = useMemoizedFn((page: number, pageSize: number) => {
        setPagination({
            ...pagination,
            Page: page,
            Limit: pageSize
        })
    })

    // 为整个知识库建立索引
    const handleEmbedKnowledgeBase = useMemoizedFn(async (kb: KnowledgeBase) => {
        const streamKey = `kb_${kb.ID}`

        try {
            setEmbedStreams(
                (prev) =>
                    new Map(
                        prev.set(streamKey, {
                            token: "",
                            loading: true,
                            progress: t("KnowledgeBaseList.indexingInProgress")
                        })
                    )
            )

            await ipcRenderer.invoke("BuildVectorIndexForKnowledgeBase", {
                KnowledgeBaseId: kb.ID,
                DistanceFuncType: "cosine"
            })

            setEmbedStreams((prev) => {
                const newMap = new Map(prev)
                newMap.delete(streamKey)
                return newMap
            })
            success(t("KnowledgeBaseList.indexBuildSuccess"))
        } catch (error) {
            setEmbedStreams((prev) => {
                const newMap = new Map(prev)
                newMap.delete(streamKey)
                return newMap
            })
            failed(t("KnowledgeBaseList.indexBuildFailed", {error: String(error)}))
        }
    })

    // 取消建立索引
    const handleCancelEmbed = useMemoizedFn(async (streamKey: string) => {
        // 由于 BuildVectorIndexForKnowledgeBase 不是流式接口，无法中途取消
        // 这里只是清除UI状态
        setEmbedStreams((prev) => {
            const newMap = new Map(prev)
            newMap.delete(streamKey)
            return newMap
        })
        message.info(t("KnowledgeBaseList.indexBuildCancelled"))
    })

    // 创建知识库
    const handleCreate = useMemoizedFn(async (values: KnowledgeBaseFormData) => {
        try {
            await ipcRenderer.invoke("CreateKnowledgeBase", values)
            success(t("KnowledgeBaseList.createSuccess"))
            setModalVisible(false)
            form.resetFields()
            fetchKnowledgeBases()
            onRefresh()
        } catch (error) {
            failed(t("KnowledgeBaseList.createFailed", {error: String(error)}))
        }
    })

    // 更新知识库
    const handleUpdate = useMemoizedFn(async (values: KnowledgeBaseFormData) => {
        if (!editingKb) return
        try {
            await ipcRenderer.invoke("UpdateKnowledgeBase", {
                KnowledgeBaseId: editingKb.ID,
                ...values
            })
            success(t("KnowledgeBaseList.updateSuccess"))
            setModalVisible(false)
            setEditingKb(undefined)
            form.resetFields()
            fetchKnowledgeBases()
            onRefresh()
        } catch (error) {
            failed(t("KnowledgeBaseList.updateFailed", {error: String(error)}))
        }
    })

    // 删除知识库
    const handleDelete = useMemoizedFn(async (kb: KnowledgeBase) => {
        try {
            await ipcRenderer.invoke("DeleteKnowledgeBase", {
                KnowledgeBaseId: kb.ID
            })
            success(t("KnowledgeBaseList.deleteSuccess"))
            fetchKnowledgeBases()
            onRefresh()
        } catch (error) {
            failed(t("KnowledgeBaseList.deleteFailed", {error: String(error)}))
        }
    })

    // 打开新增对话框
    const handleOpenCreate = useMemoizedFn(() => {
        setEditingKb(undefined)
        form.resetFields()
        setModalVisible(true)
    })

    // 打开编辑对话框
    const handleOpenEdit = useMemoizedFn((kb: KnowledgeBase) => {
        setEditingKb(kb)
        form.setFieldsValue({
            KnowledgeBaseName: kb.KnowledgeBaseName,
            KnowledgeBaseDescription: kb.KnowledgeBaseDescription,
            KnowledgeBaseType: kb.KnowledgeBaseType
        })
        setModalVisible(true)
    })

    // 提交表单
    const handleSubmit = useMemoizedFn(() => {
        form.validateFields().then((values) => {
            if (editingKb) {
                handleUpdate(values)
            } else {
                handleCreate(values)
            }
        })
    })

    return (
        <div className={styles["knowledge-base-list"]}>
            <AutoCard
                title={t("KnowledgeBaseList.title")}
                size='small'
                bodyStyle={{padding: 12}}
                extra={
                    <Space>
                        <YakitInput.Search
                            placeholder={t("KnowledgeBaseList.searchPlaceholder")}
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            onSearch={handleSearch}
                            style={{width: 200}}
                            size='small'
                        />
                        <YakitButton type='primary' size='small' icon={<PlusIcon />} onClick={handleOpenCreate}>
                            {t("KnowledgeBaseList.addKnowledgeBase")}
                        </YakitButton>
                    </Space>
                }
            >
                <YakitSpin spinning={loading}>
                    {knowledgeBases.length === 0 ? (
                        <YakitEmpty description={t("KnowledgeBaseList.empty")} />
                    ) : (
                        <div className={styles["kb-list"]}>
                            {knowledgeBases.map((kb) => (
                                <div
                                    key={kb.ID}
                                    className={`${styles["kb-item"]} ${
                                        selectedKbId === kb.ID ? styles["selected"] : ""
                                    }`}
                                    onClick={() => onSelectKb(kb)}
                                >
                                    <div className={styles["kb-info"]}>
                                        <div className={styles["kb-name"]}>{kb.KnowledgeBaseName}</div>
                                        <div className={styles["kb-description"]}>
                                            {kb.KnowledgeBaseDescription || t("KnowledgeBaseList.noDescription")}
                                        </div>
                                        <div className={styles["kb-type"]}>{t("KnowledgeBaseList.type")}: {kb.KnowledgeBaseType}</div>
                                    </div>
                                    <div className={styles["kb-actions"]}>
                                        {(() => {
                                            const streamKey = `kb_${kb.ID}`
                                            const embedStatus = embedStreams.get(streamKey)

                                            if (embedStatus?.loading) {
                                                return (
                                                    <div className={styles["embed-progress"]}>
                                                        <YakitSpin size='small' />
                                                        <span className={styles["progress-text"]}>
                                                            {embedStatus.progress}
                                                        </span>
                                                        <YakitButton
                                                            type='text2'
                                                            size='small'
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleCancelEmbed(streamKey)
                                                            }}
                                                        >
                                                            {t("KnowledgeBaseList.cancel")}
                                                        </YakitButton>
                                                    </div>
                                                )
                                            }

                                            return (
                                                <>
                                                    <YakitButton
                                                        type='text2'
                                                        size='small'
                                                        icon={<SolidPlayIcon />}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleEmbedKnowledgeBase(kb)
                                                        }}
                                                        title={t("KnowledgeBaseList.buildIndex")}
                                                    />
                                                    {onOpenQA && (
                                                        <YakitButton
                                                            type='text2'
                                                            size='small'
                                                            icon={<OutlineChatalt2Icon />}
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                // 列表入口：默认仅查询当前知识库
                                                                onOpenQA(kb, false)
                                                            }}
                                                            title={t("KnowledgeBaseList.aiQa")}
                                                        />
                                                    )}
                                                    <YakitButton
                                                        type='text2'
                                                        size='small'
                                                        icon={<OutlinePencilaltIcon />}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleOpenEdit(kb)
                                                        }}
                                                    />
                                                    <YakitPopconfirm
                                                        title={t("KnowledgeBaseList.deleteConfirm")}
                                                        onConfirm={(e) => {
                                                            e?.stopPropagation()
                                                            handleDelete(kb)
                                                        }}
                                                        placement='topRight'
                                                    >
                                                        <YakitButton
                                                            type='text2'
                                                            size='small'
                                                            colors='danger'
                                                            icon={<TrashIcon />}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </YakitPopconfirm>
                                                </>
                                            )
                                        })()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </YakitSpin>

                {total > 0 && (
                    <div className={styles["pagination-wrapper"]}>
                        <Pagination
                            current={pagination.Page}
                            pageSize={pagination.Limit}
                            total={total}
                            showSizeChanger={true}
                            showQuickJumper={true}
                            showTotal={(total) => (
                                <div style={{color: "var(--Colors-Use-Neutral-Text-1-Title)"}}>
                                    {t("KnowledgeBaseList.totalRecords", {count: total})}
                                </div>
                            )}
                            onChange={handlePageChange}
                            pageSizeOptions={["10", "20", "50", "100"]}
                        />
                    </div>
                )}
            </AutoCard>

            <YakitModal
                title={editingKb ? t("KnowledgeBaseList.editKnowledgeBase") : t("KnowledgeBaseList.addKnowledgeBase")}
                visible={modalVisible}
                onCancel={() => {
                    setModalVisible(false)
                    setEditingKb(undefined)
                    form.resetFields()
                }}
                onOk={handleSubmit}
                width={600}
                okText={t("KnowledgeBaseList.confirm")}
                cancelText={t("KnowledgeBaseList.cancel")}
            >
                <Form form={form} layout='vertical' style={{marginTop: 16}}>
                    <Form.Item
                        label={t("KnowledgeBaseList.knowledgeBaseName")}
                        name='KnowledgeBaseName'
                        rules={[{required: true, message: t("KnowledgeBaseList.enterKnowledgeBaseName")} ]}
                    >
                        <YakitInput placeholder={t("KnowledgeBaseList.enterKnowledgeBaseName")} />
                    </Form.Item>
                    <Form.Item label={t("KnowledgeBaseList.knowledgeBaseDescription")} name='KnowledgeBaseDescription'>
                        <YakitInput.TextArea placeholder={t("KnowledgeBaseList.enterKnowledgeBaseDescription")} rows={3} maxLength={500} showCount />
                    </Form.Item>
                    <Form.Item
                        label={t("KnowledgeBaseList.knowledgeBaseType")}
                        name='KnowledgeBaseType'
                        rules={[{required: true, message: t("KnowledgeBaseList.enterKnowledgeBaseType")} ]}
                    >
                        <YakitInput placeholder={t("KnowledgeBaseList.enterKnowledgeBaseType")} />
                    </Form.Item>
                </Form>
            </YakitModal>
        </div>
    )
}
