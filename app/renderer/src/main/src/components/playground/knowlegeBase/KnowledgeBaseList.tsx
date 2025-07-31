import React, {useEffect, useState} from "react"
import {AutoCard} from "@/components/AutoCard"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {Form, Space, Divider} from "antd"
import {useMemoizedFn} from "ahooks"
import {failed, success} from "@/utils/notification"
import {KnowledgeBase, KnowledgeBaseListProps, KnowledgeBaseFormData} from "./types"
import styles from "./KnowledgeBaseList.module.scss"
import {PlusIcon, TrashIcon} from "@/assets/newIcon"
import {OutlinePencilaltIcon} from "@/assets/icon/outline"

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

    // 获取知识库列表
    const fetchKnowledgeBases = useMemoizedFn(async () => {
        setLoading(true)
        try {
            const response = await ipcRenderer.invoke("GetKnowledgeBaseNameList", {})
            // 根据实际返回的数据结构调整，这里假设返回的是知识库对象数组
            if (response && Array.isArray(response.KnowledgeBaseNames)) {
                // 如果返回的是字符串数组，需要转换为对象数组
                const kbArray = response.KnowledgeBaseNames.map((name: string, index: number) => ({
                    Id: index + 1, // 临时ID，实际应该从后端返回
                    KnowledgeBaseName: name,
                    KnowledgeBaseDescription: "",
                    KnowledgeBaseType: "默认"
                }))
                setKnowledgeBases(kbArray)
            } else if (response && Array.isArray(response)) {
                // 如果直接返回对象数组
                setKnowledgeBases(response)
            } else {
                setKnowledgeBases([])
            }
        } catch (error) {
            failed(`获取知识库列表失败: ${error}`)
            setKnowledgeBases([])
        } finally {
            setLoading(false)
        }
    })

    useEffect(() => {
        fetchKnowledgeBases()
    }, [])

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
                KnowledgeBaseId: editingKb.Id,
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
                KnowledgeBaseId: kb.Id
            })
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
                    <YakitButton
                        type="primary"
                        size="small"
                        icon={<PlusIcon />}
                        onClick={handleOpenCreate}
                    >
                        新增知识库
                    </YakitButton>
                }
            >
                <YakitSpin spinning={loading}>
                    {knowledgeBases.length === 0 ? (
                        <YakitEmpty description="暂无知识库" />
                    ) : (
                        <div className={styles["kb-list"]}>
                            {knowledgeBases.map((kb) => (
                                <div
                                    key={kb.Id}
                                    className={`${styles["kb-item"]} ${
                                        selectedKbId === kb.Id ? styles["selected"] : ""
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
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </YakitSpin>
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