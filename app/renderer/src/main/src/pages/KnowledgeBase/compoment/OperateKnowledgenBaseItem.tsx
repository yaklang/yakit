import {FC, useEffect} from "react"

import {SolidDotsverticalIcon, SolidLightningBoltIcon} from "@/assets/icon/solid"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {manageMenuList} from "../utils"
import {useMemoizedFn, useRequest, useSafeState, useUpdateEffect} from "ahooks"

import styles from "../knowledgeBase.module.scss"
import classNames from "classnames"
import {OutlineLoadingIcon} from "@/assets/icon/outline"
import {KnowledgeBaseItem, useKnowledgeBase} from "../hooks/useKnowledgeBase"
import {IconProps} from "@/assets/newIcon"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {failed, success} from "@/utils/notification"

import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {Form, Progress} from "antd"
import loading from "@/alibaba/ali-react-table-dist/dist/base-table/loading"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"

const {ipcRenderer} = window.require("electron")

interface TOperateKnowledgenBaseItemProps {
    items: KnowledgeBaseItem
    setMenuSelectedId: (menuOpenProps?: string) => void
}

const OperateKnowledgenBaseItem: FC<TOperateKnowledgenBaseItemProps> = ({items, setMenuSelectedId}) => {
    const [menuOpen, setMenuOpen] = useSafeState(false)
    const [deleteVisible, setDeleteVisible] = useSafeState(false)
    const [editVisible, setEditVisible] = useSafeState(false)
    const [exportVisible, setExportVisible] = useSafeState(false)

    useUpdateEffect(() => {
        !menuOpen && setMenuSelectedId("")
    }, [menuOpen])

    return (
        <div>
            <YakitDropdownMenu
                menu={{
                    data: manageMenuList,
                    onClick: ({key}) => {
                        setMenuOpen(false)
                        setMenuSelectedId("")
                        switch (key) {
                            case "edit":
                                setEditVisible((prevalue) => !prevalue)
                                break
                            case "delete":
                                setDeleteVisible((preValue) => !preValue)
                                break
                            case "export":
                                setExportVisible((preValue) => !preValue)
                                break

                            default:
                                break
                        }
                    }
                }}
                dropdown={{
                    trigger: ["click"],
                    placement: "bottomRight",
                    onVisibleChange: (v) => {
                        setMenuOpen(v)
                    },
                    visible: menuOpen
                }}
            >
                <SolidDotsverticalIcon
                    onClick={(e) => {
                        e.stopPropagation()
                        setMenuSelectedId(items.ID)
                    }}
                    className={styles["dotsvertical-icon"]}
                />
            </YakitDropdownMenu>
            <DeleteConfirm visible={deleteVisible} setVisible={setDeleteVisible} KnowledgeBaseId={items.ID} />
            <EditKnowledgenBaseModal visible={editVisible} setVisible={setEditVisible} items={items} />
            <ExportModal visible={exportVisible} setVisible={setExportVisible} KnowledgeBaseId={items.ID} />
        </div>
    )
}

interface DeleteConfirmProps {
    visible: boolean
    setVisible: (preValue: boolean) => void
    KnowledgeBaseId: string
}
const DeleteConfirm: FC<DeleteConfirmProps> = (props) => {
    const {visible, setVisible, KnowledgeBaseId} = props
    const {deleteKnowledgeBase} = useKnowledgeBase()

    const {runAsync, loading} = useRequest(
        async () => {
            await ipcRenderer.invoke("DeleteKnowledgeBase", {
                KnowledgeBaseId
            })
        },
        {
            manual: true,
            onSuccess: () => {
                deleteKnowledgeBase(KnowledgeBaseId)
                success("删除知识库成功")
            },
            onError: (error) => {
                failed(`删除知识库失败: ${error}`)
            }
        }
    )

    return (
        <YakitHint
            visible={visible}
            title='是否要删除'
            content='确认删除后将会彻底删除'
            footer={
                <div className={styles["delete-yakit-hint"]}>
                    <YakitButton size='large' type='outline1' onClick={() => setVisible(false)}>
                        取消
                    </YakitButton>
                    <YakitButton size='large' onClick={runAsync} loading={loading}>
                        确定
                    </YakitButton>
                </div>
            }
        />
    )
}

interface TEditKnowledgeBaseModalProps extends Omit<DeleteConfirmProps, "KnowledgeBaseId"> {
    items: KnowledgeBaseItem
}

const EditKnowledgenBaseModal: FC<TEditKnowledgeBaseModalProps> = (props) => {
    const {visible, setVisible, items} = props
    const [form] = Form.useForm()
    const {editKnowledgeBase} = useKnowledgeBase()

    const {data, loading, runAsync} = useRequest(
        async () => {
            const result = await ipcRenderer.invoke("GetKnowledgeBaseTypeList")
            return result?.KnowledgeBaseTypes?.map((it) => ({
                value: it?.Name,
                label: it?.Name
            }))
        },
        {
            manual: true,
            onError: (error) => failed(`获取知识库类型失败: ${error}`)
        }
    )

    const {runAsync: editKnowledgRunAsync, loading: editKnowledgLoading} = useRequest(
        async (parmas) => {
            await ipcRenderer.invoke("UpdateKnowledgeBase", {
                KnowledgeBaseId: items?.ID,
                ...parmas
            })
        },
        {
            manual: true,
            onSuccess: () => {
                success("编辑知识库成功")
                form.resetFields()
                setVisible(false)
            },
            onError: (error) => {
                failed(`编辑知识库失败: ${error}`)
            }
        }
    )

    useUpdateEffect(() => {
        if (visible) {
            runAsync()
            form.setFieldsValue(items)
        }
    }, [visible])

    const onClose = () => {
        form.resetFields()
        setVisible(false)
    }

    const onOk = async () => {
        const result = await form.validateFields()
        const transformData = {
            ...items,
            ...result
        }
        await editKnowledgRunAsync(transformData)
        editKnowledgeBase(items.ID, transformData)
    }

    return (
        <YakitModal
            title={"修改基础信息"}
            visible={visible}
            onCancel={onClose}
            width={600}
            destroyOnClose
            maskClosable={false}
            okText='确认'
            cancelText='取消'
            footer={
                <div className={styles["delete-yakit-hint"]}>
                    <YakitButton type='outline1' onClick={onClose}>
                        取消
                    </YakitButton>
                    <YakitButton onClick={onOk} loading={editKnowledgLoading}>
                        确定
                    </YakitButton>
                </div>
            }
        >
            <Form form={form} layout='vertical'>
                <YakitSpin spinning={loading}>
                    <Form.Item
                        label='知识库名：'
                        name='KnowledgeBaseName'
                        rules={[
                            {required: true, message: "请输入知识库名"},
                            {
                                validator: (_, value) => {
                                    if (typeof value === "string" && value.length > 0 && value.trim() === "") {
                                        return Promise.reject(new Error("知识库名不能为空字符串"))
                                    }
                                    return Promise.resolve()
                                }
                            }
                        ]}
                    >
                        <YakitInput placeholder='请输入知识库名' />
                    </Form.Item>
                    <Form.Item
                        label='知识库类型：'
                        name='KnowledgeBaseType'
                        rules={[{required: true, message: "请输入知识库类型"}]}
                    >
                        <YakitSelect options={data} placeholder='请选择' />
                    </Form.Item>
                    <Form.Item
                        label='补充提示词：'
                        name='KnowledgeBaseDescription'
                        rules={[{max: 500, message: "描述最多 500 个字符"}]}
                    >
                        <YakitInput.TextArea maxLength={500} placeholder='请输入补充提示词' rows={3} showCount />
                    </Form.Item>
                </YakitSpin>
            </Form>
        </YakitModal>
    )
}

interface GeneralProgress {
    Percent: number
    Message: string
    MessageType: string
}

type TExportModalProps = {
    [K in keyof DeleteConfirmProps]: DeleteConfirmProps[K]
}

const ExportModal: React.FC<TExportModalProps> = (props) => {
    const {visible, setVisible, KnowledgeBaseId} = props
    const [form] = Form.useForm()
    const [exportLoading, setExportLoading] = useSafeState(false)
    const [progress, setProgress] = useSafeState<GeneralProgress>({
        Percent: 0,
        Message: "",
        MessageType: ""
    })
    const [token, setToken] = useSafeState<string>("")

    useEffect(() => {
        if (visible) {
            // 生成唯一token
            const newToken = `export-kb-${Date.now()}`
            setToken(newToken)
        }
    }, [visible])

    useEffect(() => {
        if (!token) return

        // 监听进度数据
        const handleData = (e: any, data: GeneralProgress) => {
            setProgress(data)
        }

        // 监听错误
        const handleError = (e: any, error: any) => {
            setExportLoading(false)
            failed(`导出知识库失败: ${error}`)
        }

        // 监听完成
        const handleEnd = () => {
            setExportLoading(false)
            success("导出知识库成功")
            setVisible(false)
            form.resetFields()
            setProgress({Percent: 0, Message: "", MessageType: ""})
        }

        ipcRenderer.on(`${token}-data`, handleData)
        ipcRenderer.on(`${token}-error`, handleError)
        ipcRenderer.on(`${token}-end`, handleEnd)

        return () => {
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [token])

    const handleExport = useMemoizedFn(async () => {
        try {
            const values = await form.validateFields()
            setExportLoading(true)
            setProgress({Percent: 0, Message: "开始导出...", MessageType: "info"})

            // 调用流式接口
            await ipcRenderer.invoke(
                "ExportKnowledgeBase",
                {
                    KnowledgeBaseId,
                    TargetPath: values.exportPath
                },
                token
            )
        } catch (error: any) {
            if (error?.errorFields) {
                // 表单验证错误，不显示错误提示
                return
            }
            setExportLoading(false)
            failed(`导出知识库失败: ${error}`)
        }
    })

    const handleCancel = useMemoizedFn(() => {
        if (exportLoading && token) {
            // 取消导出
            ipcRenderer.invoke("cancel-ExportKnowledgeBase", token)
        }
        setVisible(false)
        form.resetFields()
        setProgress({Percent: 0, Message: "", MessageType: ""})
        setExportLoading(false)
    })

    return (
        <YakitModal
            title='导出知识库'
            visible={visible}
            onCancel={handleCancel}
            width={600}
            destroyOnClose
            maskClosable={!exportLoading}
            footer={[
                <div className={styles["knowledge-base-modal-footer"]} key='footer'>
                    <YakitButton type='outline1' onClick={handleCancel}>
                        {exportLoading ? "取消导出" : "取消"}
                    </YakitButton>
                    <YakitButton type='primary' loading={exportLoading} onClick={handleExport} disabled={exportLoading}>
                        导出
                    </YakitButton>
                </div>
            ]}
        >
            <Form form={form} layout='vertical'>
                <Form.Item
                    label='导出路径'
                    name='exportPath'
                    rules={[{required: true, message: "请输入导出路径"}]}
                    extra='请输入导出文件的完整路径（包含文件名）'
                    style={{margin: 0}}
                >
                    <YakitInput
                        placeholder='例如: /Users/username/Downloads/knowledge_base.kb'
                        disabled={exportLoading}
                    />
                </Form.Item>

                {exportLoading && (
                    <div style={{marginTop: 16}}>
                        <Progress
                            percent={Math.round(progress.Percent * 100)}
                            style={{width: "100%"}}
                            status={progress.MessageType === "error" ? "exception" : "active"}
                        />
                        {progress.Message && (
                            <div style={{marginTop: 8, fontSize: 12, color: "#666"}}>{progress.Message}</div>
                        )}
                    </div>
                )}
            </Form>
        </YakitModal>
    )
}

export {OperateKnowledgenBaseItem, DeleteConfirm, EditKnowledgenBaseModal, ExportModal}
