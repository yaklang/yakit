import {FC, useEffect} from "react"

import {SolidDotsverticalIcon} from "@/assets/icon/solid"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {getNextSelectedID, knowledgeTypeOptions, manageMenuList} from "../utils"
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

    useUpdateEffect(() => {
        !menuOpen && setMenuSelectedId("")
    }, [menuOpen])

    const [exportToken, setExportToken] = useSafeState("")
    const exportFile = async (KnowledgeBaseId: number) => {
        const defaultName = items.KnowledgeBaseName ? `export-${items.KnowledgeBaseName}` : "default-knowledge"
        try {
            const file = await handleSaveFileSystemDialog({
                title: "导出知识库",
                defaultPath: defaultName,
                filters: [{name: "Files", extensions: ["rag"]}]
            })

            if (!file || file.canceled) return

            const filePath = file.filePath
            if (!filePath) return

            const token = `export-kb-${Date.now()}`
            setExportToken(token)

            await ipcRenderer.invoke("ExportKnowledgeBase", {KnowledgeBaseId, TargetPath: filePath}, token)
        } catch (error) {
            failed("导出知识库失败：" + error)
        }
    }

    useEffect(() => {
        if (!exportToken) return

        const onError = (_: any, err: any) => {
            failed("导出知识库失败: " + err)
            setExportToken("")
        }

        const onEnd = () => {
            success("导出知识库成功")
            setExportToken("")
        }

        ipcRenderer.on(`${exportToken}-error`, onError)
        ipcRenderer.on(`${exportToken}-end`, onEnd)

        return () => {
            ipcRenderer.removeAllListeners(`${exportToken}-error`)
            ipcRenderer.removeAllListeners(`${exportToken}-end`)
        }
    }, [exportToken])

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
                                exportFile(items.ID)
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
            form.setFieldsValue({
                ...items
            })
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
                <Form.Item label='Tags：' name='Tags'>
                    <YakitSelect mode='tags' placeholder='请选择' options={knowledgeTypeOptions} />
                </Form.Item>
                <Form.Item
                    label='描述：'
                    name='KnowledgeBaseDescription'
                    rules={[{max: 500, message: "描述最多 500 个字符"}]}
                >
                    <YakitInput.TextArea maxLength={500} placeholder='请输入描述' rows={3} showCount />
                </Form.Item>
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

export {OperateKnowledgenBaseItem, DeleteConfirm, EditKnowledgenBaseModal}
