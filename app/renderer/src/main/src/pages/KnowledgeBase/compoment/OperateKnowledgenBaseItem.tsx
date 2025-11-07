import {FC, useEffect} from "react"

import {SolidDotsverticalIcon} from "@/assets/icon/solid"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {getNextSelectedID, manageMenuList} from "../utils"
import {useMemoizedFn, useRequest, useSafeState, useUpdateEffect} from "ahooks"

import styles from "../knowledgeBase.module.scss"
import {KnowledgeBaseItem, useKnowledgeBase} from "../hooks/useKnowledgeBase"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {failed, success} from "@/utils/notification"

import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {Form, Progress} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {TKnowledgeBaseSidebarProps} from "./KnowledgeBaseSidebar"
import useMultipleHoldGRPCStream from "../hooks/useMultipleHoldGRPCStream"
import {apiCancelDebugPlugin} from "@/pages/plugins/utils"
import {handleSaveFileSystemDialog} from "@/utils/fileSystemDialog"

const {ipcRenderer} = window.require("electron")

interface TOperateKnowledgenBaseItemProps extends Pick<TKnowledgeBaseSidebarProps, "setKnowledgeBaseID"> {
    items: KnowledgeBaseItem
    setMenuSelectedId: (menuOpenProps?: string) => void
    knowledgeBase: KnowledgeBaseItem[]
    api?: ReturnType<typeof useMultipleHoldGRPCStream>[1]
}

const OperateKnowledgenBaseItem: FC<TOperateKnowledgenBaseItemProps> = ({
    items,
    setMenuSelectedId,
    setKnowledgeBaseID,
    knowledgeBase,
    api
}) => {
    const [menuOpen, setMenuOpen] = useSafeState(false)
    const [deleteVisible, setDeleteVisible] = useSafeState(false)
    const [editVisible, setEditVisible] = useSafeState(false)
    const [exportVisible, setExportVisible] = useSafeState<{open: boolean; filePath?: string}>({
        filePath: "",
        open: false
    })

    useUpdateEffect(() => {
        !menuOpen && setMenuSelectedId("")
    }, [menuOpen])

    const exportFile = useMemoizedFn(async () => {
        try {
            // 打开保存文件对话框
            const file = await handleSaveFileSystemDialog({
                title: "导出知识库",
                defaultPath: "knowledge",
                filters: [{name: "Files", extensions: ["kb"]}]
            })

            if (!file?.filePath) return
            setExportVisible({
                open: true,
                filePath: file.filePath
            })
        } catch (error) {
            failed(`导出知识库失败: ${error}`)
        }
    })

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
                                exportFile()
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
            <DeleteConfirm
                visible={deleteVisible}
                setVisible={setDeleteVisible}
                KnowledgeBaseId={items.ID}
                setKnowledgeBaseID={setKnowledgeBaseID}
                knowledgeBase={knowledgeBase}
                api={api}
            />
            <EditKnowledgenBaseModal visible={editVisible} setVisible={setEditVisible} items={items} />
            <ExportModal exportVisible={exportVisible} setExportVisible={setExportVisible} KnowledgeBaseId={items.ID} />
        </div>
    )
}

interface DeleteConfirmProps extends Partial<Pick<TKnowledgeBaseSidebarProps, "setKnowledgeBaseID">> {
    visible: boolean
    setVisible: (preValue: boolean) => void
    KnowledgeBaseId: string
    knowledgeBase?: KnowledgeBaseItem[]
}
const DeleteConfirm: FC<
    DeleteConfirmProps & {
        api?: ReturnType<typeof useMultipleHoldGRPCStream>[1]
    }
> = (props) => {
    const {visible, setVisible, KnowledgeBaseId, setKnowledgeBaseID, knowledgeBase, api} = props
    const {deleteKnowledgeBase} = useKnowledgeBase()

    const {runAsync, loading} = useRequest(
        async () => {
            await ipcRenderer.invoke("DeleteKnowledgeBase", {
                KnowledgeBaseId
            })
        },
        {
            manual: true,
            onSuccess: async () => {
                const selectedID = knowledgeBase && getNextSelectedID(knowledgeBase, KnowledgeBaseId)
                selectedID && setKnowledgeBaseID?.(selectedID)
                deleteKnowledgeBase(KnowledgeBaseId)
                const streamToken = knowledgeBase?.find((it) => it.ID === KnowledgeBaseId)?.streamToken
                if (streamToken && api?.tokens.includes(streamToken)) {
                    await apiCancelDebugPlugin(streamToken)
                    api?.removeStream(streamToken)
                }

                setVisible(false)
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
                    <YakitButton size='large' onClick={() => runAsync()} loading={loading}>
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
        try {
            const result = await form.validateFields()
            const transformData = {
                ...items,
                ...result
            }
            await editKnowledgRunAsync(transformData)
            editKnowledgeBase(items.ID, transformData)
        } catch (error) {}
    }

    return (
        <YakitModal
            title={"修改基础信息"}
            visible={visible}
            onCancel={onClose}
            width={600}
            destroyOnClose
            maskClosable={false}
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
                        label='描述：'
                        name='KnowledgeBaseDescription'
                        rules={[{max: 500, message: "描述最多 500 个字符"}]}
                    >
                        <YakitInput.TextArea maxLength={500} placeholder='请输入描述' rows={3} showCount />
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
    setExportVisible: (preValue: {open: boolean; filePath?: string}) => void

    exportVisible: {
        open: boolean
        filePath?: string
    }
    KnowledgeBaseId: string
}

const ExportModal: React.FC<TExportModalProps> = (props) => {
    const {setExportVisible, exportVisible, KnowledgeBaseId} = props
    const [exportLoading, setExportLoading] = useSafeState(false)
    const [progress, setProgress] = useSafeState<GeneralProgress>({
        Percent: 0,
        Message: "",
        MessageType: ""
    })
    const [token, setToken] = useSafeState<string>("")

    // 每次打开弹窗生成新 token
    useEffect(() => {
        if (exportVisible.open) {
            const newToken = `export-kb-${Date.now()}`
            setToken(newToken)
            handleExport(newToken)
        }
    }, [exportVisible.open])

    // 监听流式事件
    useEffect(() => {
        if (!token) return

        const handleData = (_: any, data: GeneralProgress) => {
            setProgress(data)
        }

        const handleError = (_: any, error: any) => {
            setExportLoading(false)
            failed(`导出知识库失败: ${error}`)
        }

        const handleEnd = () => {
            setExportLoading(false)
            success("导出知识库成功")
            setExportVisible({
                open: false,
                filePath: ""
            })
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

    // 点击导出按钮逻辑
    const handleExport = useMemoizedFn(async (token: string) => {
        try {
            setProgress({Percent: 0, Message: "开始导出...", MessageType: "info"})

            // 调用流式接口
            await ipcRenderer.invoke(
                "ExportKnowledgeBase",
                {
                    KnowledgeBaseId,
                    TargetPath: exportVisible.filePath
                },
                token
            )
        } catch (error: any) {
            setExportLoading(false)
            if (error?.message !== "cancelled") {
                failed(`导出知识库失败: ${error}`)
            }
        }
    })

    // 取消导出 / 关闭
    const handleCancel = useMemoizedFn(() => {
        if (exportLoading && token) {
            ipcRenderer.invoke("cancel-ExportKnowledgeBase", token)
        }
        setExportVisible({
            open: false,
            filePath: ""
        })
        setProgress({Percent: 0, Message: "", MessageType: ""})
        setExportLoading(false)
    })

    return (
        <YakitModal
            title='导出知识库'
            visible={exportVisible.open}
            onCancel={handleCancel}
            width={600}
            destroyOnClose
            maskClosable={!exportLoading}
            footer={[
                <div className={styles["knowledge-base-modal-footer"]} key='footer'>
                    <YakitButton type='outline1' onClick={handleCancel}>
                        {exportLoading ? "取消导出" : "取消"}
                    </YakitButton>
                </div>
            ]}
        >
            {exportLoading && (
                <div style={{marginTop: 16}}>
                    <Progress
                        percent={Math.round(progress.Percent * 100)}
                        style={{width: "100%"}}
                        status={progress.MessageType === "error" ? "exception" : "active"}
                    />
                    {progress.Message && (
                        <div style={{marginTop: 8, fontSize: 12, color: "var(--Colors-Use-Neutral-Text-3-Secondary)"}}>
                            {progress.Message}
                        </div>
                    )}
                </div>
            )}
            {!exportLoading && (
                <div style={{color: "var(--Colors-Use-Neutral-Text-3-Secondary)", fontSize: 13}}>
                    点击“导出”后将弹出文件保存对话框，请选择导出位置。
                </div>
            )}
        </YakitModal>
    )
}

export {OperateKnowledgenBaseItem, DeleteConfirm, EditKnowledgenBaseModal, ExportModal}
