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
import {KnowledgeBase, KnowledgeBaseListProps, KnowledgeBaseFormData, GetKnowledgeBaseResponse, Pagination as PaginationType, StreamStatus} from "./types"
import styles from "./KnowledgeBaseList.module.scss"
import {PlusIcon, TrashIcon} from "@/assets/newIcon"
import {OutlinePencilaltIcon} from "@/assets/icon/outline"
import {SolidPlayIcon} from "@/assets/icon/solid"

const {ipcRenderer} = window.require("electron")

export const KnowledgeBaseList: React.FC<KnowledgeBaseListProps> = ({
    selectedKbId,
    onSelectKb,
    onRefresh
}) => {
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
            const currentPagination = resetPage ? { ...pagination, Page: 1 } : pagination
            if (resetPage) {
                setPagination(currentPagination)
            }
            
            const response: GetKnowledgeBaseResponse = await ipcRenderer.invoke("GetKnowledgeBase", {
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
            failed(`获取知识库列表失败: ${error}`)
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
            setEmbedStreams(prev => new Map(prev.set(streamKey, {
                token: "",
                loading: true,
                progress: "正在为知识库建立索引..."
            })))

            await ipcRenderer.invoke("BuildVectorIndexForKnowledgeBase", {
                KnowledgeBaseId: kb.ID,
                DistanceFuncType: "cosine"
            })

            setEmbedStreams(prev => {
                const newMap = new Map(prev)
                newMap.delete(streamKey)
                return newMap
            })
            success("知识库索引建立完成")

        } catch (error) {
            setEmbedStreams(prev => {
                const newMap = new Map(prev)
                newMap.delete(streamKey)
                return newMap
            })
            failed(`建立索引失败: ${error}`)
        }
    })

    // 取消建立索引
    const handleCancelEmbed = useMemoizedFn(async (streamKey: string) => {
        // 由于 BuildVectorIndexForKnowledgeBase 不是流式接口，无法中途取消
        // 这里只是清除UI状态
        setEmbedStreams(prev => {
            const newMap = new Map(prev)
            newMap.delete(streamKey)
            return newMap
        })
        message.info("已取消索引建立状态显示")
    })

    // 创建知识库
    const handleCreate = useMemoizedFn(async (values: KnowledgeBaseFormData) => {
        try {
            await ipcRenderer.invoke("CreateKnowledgeBase", values)
            success("创建知识库成功")
            setModalVisible(false)
            form.resetFields()
            fetchKnowledgeBases()
            onRefresh()
        } catch (error) {
            failed(`创建知识库失败: ${error}`)
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
            success("更新知识库成功")
            setModalVisible(false)
            setEditingKb(undefined)
            form.resetFields()
            fetchKnowledgeBases()
            onRefresh()
        } catch (error) {
            failed(`更新知识库失败: ${error}`)
        }
    })

    // 删除知识库
    const handleDelete = useMemoizedFn(async (kb: KnowledgeBase) => {
        try {
            await ipcRenderer.invoke("DeleteKnowledgeBase", {
                KnowledgeBaseId: kb.ID
            })
            console.log("id",kb.ID)
            success("删除知识库成功")
            fetchKnowledgeBases()
            onRefresh()
        } catch (error) {
            failed(`删除知识库失败: ${error}`)
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
                title="知识库列表"
                size="small"
                bodyStyle={{padding: 12}}
                extra={
                    <Space>
                        <YakitInput.Search
                            placeholder="搜索知识库"
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            onSearch={handleSearch}
                            style={{width: 200}}
                            size="small"
                        />
                        <YakitButton
                            type="primary"
                            size="small"
                            icon={<PlusIcon />}
                            onClick={handleOpenCreate}
                        >
                            新增知识库
                        </YakitButton>
                    </Space>
                }
            >
                <YakitSpin spinning={loading}>
                    {knowledgeBases.length === 0 ? (
                        <YakitEmpty description="暂无知识库" />
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
                                            {kb.KnowledgeBaseDescription || "暂无描述"}
                                        </div>
                                        <div className={styles["kb-type"]}>类型: {kb.KnowledgeBaseType}</div>
                                    </div>
                                    <div className={styles["kb-actions"]}>
                                        {(() => {
                                            const streamKey = `kb_${kb.ID}`
                                            const embedStatus = embedStreams.get(streamKey)
                                            
                                            if (embedStatus?.loading) {
                                                return (
                                                    <div className={styles["embed-progress"]}>
                                                        <YakitSpin size="small" />
                                                        <span className={styles["progress-text"]}>
                                                            {embedStatus.progress}
                                                        </span>
                                                        <YakitButton
                                                            type="text2"
                                                            size="small"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleCancelEmbed(streamKey)
                                                            }}
                                                        >
                                                            取消
                                                        </YakitButton>
                                                    </div>
                                                )
                                            }
                                            
                                            return (
                                                <>
                                                    <YakitButton
                                                        type="text2"
                                                        size="small"
                                                        icon={<SolidPlayIcon />}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleEmbedKnowledgeBase(kb)
                                                        }}
                                                        title="建立索引"
                                                    />
                                                    <YakitButton
                                                        type="text2"
                                                        size="small"
                                                        icon={<OutlinePencilaltIcon />}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleOpenEdit(kb)
                                                        }}
                                                    />
                                                    <YakitPopconfirm
                                                        title="删除后无法恢复，确认删除此知识库吗？"
                                                        onConfirm={(e) => {
                                                            e?.stopPropagation()
                                                            handleDelete(kb)
                                                        }}
                                                        placement="topRight"
                                                    >
                                                        <YakitButton
                                                            type="text2"
                                                            size="small"
                                                            colors="danger"
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
                            showTotal={(total, range) => `共 ${total} 条记录`}
                            onChange={handlePageChange}
                            pageSizeOptions={["10", "20", "50", "100"]}
                        />
                    </div>
                )}
            </AutoCard>

            <YakitModal
                title={editingKb ? "编辑知识库" : "新增知识库"}
                visible={modalVisible}
                onCancel={() => {
                    setModalVisible(false)
                    setEditingKb(undefined)
                    form.resetFields()
                }}
                onOk={handleSubmit}
                width={600}
                okText="确认"
                cancelText="取消"
            >
                <Form form={form} layout="vertical" style={{marginTop: 16}}>
                    <Form.Item
                        label="知识库名称"
                        name="KnowledgeBaseName"
                        rules={[{required: true, message: "请输入知识库名称"}]}
                    >
                        <YakitInput placeholder="请输入知识库名称" />
                    </Form.Item>
                    <Form.Item
                        label="知识库描述"
                        name="KnowledgeBaseDescription"
                    >
                        <YakitInput.TextArea
                            placeholder="请输入知识库描述"
                            rows={3}
                            maxLength={500}
                            showCount
                        />
                    </Form.Item>
                    <Form.Item
                        label="知识库类型"
                        name="KnowledgeBaseType"
                        rules={[{required: true, message: "请输入知识库类型"}]}
                    >
                        <YakitInput placeholder="请输入知识库类型" />
                    </Form.Item>
                </Form>
            </YakitModal>
        </div>
    )
} 