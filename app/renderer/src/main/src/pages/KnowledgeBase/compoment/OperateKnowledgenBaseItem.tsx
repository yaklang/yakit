import {Dispatch, FC, SetStateAction, useEffect} from "react"

import {SolidDotsverticalIcon} from "@/assets/icon/solid"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {knowledgeTypeOptions, manageMenuList} from "../utils"
import {useRequest, useSafeState, useUpdateEffect} from "ahooks"

import styles from "../knowledgeBase.module.scss"
import {KnowledgeBaseItem, useKnowledgeBase} from "../hooks/useKnowledgeBase"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {failed, success} from "@/utils/notification"

import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {Form} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {TKnowledgeBaseSidebarProps} from "./KnowledgeBaseSidebar"
import useMultipleHoldGRPCStream from "../hooks/useMultipleHoldGRPCStream"
import {apiCancelDebugPlugin} from "@/pages/plugins/utils"
import {handleSaveFileSystemDialog} from "@/utils/fileSystemDialog"

const {ipcRenderer} = window.require("electron")

interface TOperateKnowledgenBaseItemProps {
    setKnowledgeBaseID?: (id: string) => void
    items: KnowledgeBaseItem
    setMenuSelectedId: (menuOpenProps?: string) => void
    knowledgeBase: KnowledgeBaseItem[]
    api?: ReturnType<typeof useMultipleHoldGRPCStream>[1]
    addMode: string[]
    setRefreshOlineRag?: Dispatch<SetStateAction<boolean>>
}

const OperateKnowledgenBaseItem: FC<TOperateKnowledgenBaseItemProps> = ({
    items,
    setMenuSelectedId,
    setKnowledgeBaseID,
    knowledgeBase,
    api,
    addMode,
    setRefreshOlineRag
}) => {
    const {editKnowledgeBase, knowledgeBases} = useKnowledgeBase()
    const [menuOpen, setMenuOpen] = useSafeState(false)
    const [deleteVisible, setDeleteVisible] = useSafeState(false)
    const [editVisible, setEditVisible] = useSafeState(false)

    useUpdateEffect(() => {
        !menuOpen && setMenuSelectedId("")
    }, [menuOpen])

    const [exportToken, setExportToken] = useSafeState("")
    const exportFile = async (KnowledgeBaseId: string) => {
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

    const {run} = useRequest(
        async (parmas) => {
            await ipcRenderer.invoke("UpdateKnowledgeBase", {
                KnowledgeBaseId: parmas?.ID,
                KnowledgeBaseName: parmas?.KnowledgeBaseName,
                KnowledgeBaseDescription: parmas?.KnowledgeBaseDescription,
                KnowledgeBaseType: parmas?.KnowledgeBaseType,
                Tags: parmas?.Tags ?? [],
                CreatedFromUI: parmas?.CreatedFromUI ?? true,
                IsDefault: parmas?.IsDefault
            })
        },
        {
            manual: true,
            onSuccess: () => {
                const prevDefault = knowledgeBases.find((it) => it.IsDefault === true)
                if (prevDefault && prevDefault.ID !== items.ID) {
                    editKnowledgeBase(prevDefault.ID, {
                        ...prevDefault,
                        IsDefault: false
                    })
                }
                editKnowledgeBase(items.ID, {
                    ...items,
                    IsDefault: true
                })
                success("设置成功")
            },
            onError: (error) => {
                failed(`设置失败: ${error}`)
            }
        }
    )

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
                            case "default":
                                run({
                                    ...items,
                                    IsDefault: true
                                })
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
                addMode={addMode}
                items={items}
                setRefreshOlineRag={setRefreshOlineRag}
            />
            <EditKnowledgenBaseModal
                visible={editVisible}
                setVisible={setEditVisible}
                items={items}
                setRefreshOlineRag={setRefreshOlineRag}
            />
        </div>
    )
}

interface DeleteConfirmProps extends Partial<Pick<TKnowledgeBaseSidebarProps, "setKnowledgeBaseID">> {
    visible: boolean
    setVisible: (preValue: boolean) => void
    KnowledgeBaseId: string
    knowledgeBase?: KnowledgeBaseItem[]
    items?: KnowledgeBaseItem
}
const DeleteConfirm: FC<
    DeleteConfirmProps & {
        api?: ReturnType<typeof useMultipleHoldGRPCStream>[1]
        addMode: string[]
        setRefreshOlineRag?: Dispatch<SetStateAction<boolean>>
    }
> = (props) => {
    const {
        visible,
        setVisible,
        KnowledgeBaseId,
        setKnowledgeBaseID,
        knowledgeBase,
        api,
        addMode,
        items,
        setRefreshOlineRag
    } = props
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
                try {
                    const nextKnowledgeBase = knowledgeBase?.filter((it) => it.ID !== KnowledgeBaseId) ?? []

                    const isExternal = (it) => it.IsImported === true && (it.CreatedFromUI ?? false) === false

                    const isManual = (it) => it.IsImported === false && it.CreatedFromUI === true

                    const isOther = (it) => it.IsImported === false && (it.CreatedFromUI ?? false) === false

                    const resultKnowledgeBase = nextKnowledgeBase?.filter((it) => {
                        if (addMode?.includes("external") && isExternal(it)) return true
                        if (addMode?.includes("manual") && isManual(it)) return true
                        if (addMode?.includes("other") && isOther(it)) return true
                        return false
                    })
                    const selectedID = resultKnowledgeBase?.[0]?.ID ?? ""

                    setKnowledgeBaseID?.(selectedID)
                    deleteKnowledgeBase(KnowledgeBaseId)
                    const streamToken = knowledgeBase?.find((it) => it.ID === KnowledgeBaseId)?.streamToken
                    if (streamToken && api?.tokens.includes(streamToken)) {
                        await apiCancelDebugPlugin(streamToken)
                        api?.removeStream(streamToken)
                    }

                    setVisible(false)

                    try {
                        setRefreshOlineRag?.((preValue) => !preValue)
                    } catch (e) {}

                    success("删除知识库成功")
                } catch (error) {
                    failed(error + "")
                }
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
    setRefreshOlineRag?: Dispatch<SetStateAction<boolean>>
}

const EditKnowledgenBaseModal: FC<TEditKnowledgeBaseModalProps> = (props) => {
    const {visible, setVisible, items, setRefreshOlineRag} = props
    const [form] = Form.useForm()
    const {editKnowledgeBase} = useKnowledgeBase()

    const {runAsync: editKnowledgRunAsync, loading: editKnowledgLoading} = useRequest(
        async (parmas) => {
            await ipcRenderer.invoke("UpdateKnowledgeBase", {
                KnowledgeBaseId: items?.ID,
                KnowledgeBaseName: parmas?.KnowledgeBaseName,
                KnowledgeBaseDescription: parmas?.KnowledgeBaseDescription,
                KnowledgeBaseType: parmas?.KnowledgeBaseType,
                Tags: parmas?.Tags ?? [],
                CreatedFromUI: parmas?.CreatedFromUI ?? true,
                IsDefault: parmas?.IsDefault ?? false
            })
        },
        {
            manual: true,
            onSuccess: async () => {
                success("编辑知识库成功")
                try {
                    form.resetFields()
                    setVisible(false)
                    setRefreshOlineRag?.((preValue) => !preValue)
                } catch (e) {}
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

export {OperateKnowledgenBaseItem, DeleteConfirm, EditKnowledgenBaseModal}
