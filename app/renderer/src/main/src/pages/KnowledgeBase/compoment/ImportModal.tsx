import {useMemoizedFn, useRequest, useSafeState} from "ahooks"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {failed, success} from "@/utils/notification"
import {Form, Progress} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import styles from "../knowledgeBase.module.scss"
import {Dispatch, SetStateAction, useEffect, useRef} from "react"
import {YakitFormDragger} from "@/components/yakitUI/YakitForm/YakitForm"
import {KnowledgeBaseContentProps} from "../TKnowledgeBase"
import {KnowledgeBaseItem, useKnowledgeBase} from "../hooks/useKnowledgeBase"
import {extractFileName} from "../utils"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"

const {ipcRenderer} = window.require("electron")

interface GeneralProgress {
    Percent: number
    Message: string
    MessageType: string
}

interface TImportModalProps {
    visible: boolean
    onVisible: (visible: boolean) => void
    setAddMode: Dispatch<SetStateAction<string[]>>
}

const ImportModal: React.FC<TImportModalProps> = (props) => {
    const {visible, onVisible, setAddMode} = props
    const [form] = Form.useForm()
    const [importLoading, setImportLoading] = useSafeState(false)
    const [progress, setProgress] = useSafeState<GeneralProgress>({
        Percent: 0,
        Message: "",
        MessageType: ""
    })
    const [token, setToken] = useSafeState<string>("")
    const [hasError, setHasError, getHasError] = useGetSetState(false)
    const knowledgeBaseNameRef = useRef<string>("")
    const {addKnowledgeBase, knowledgeBases} = useKnowledgeBase()

    useEffect(() => {
        if (visible) {
            const newToken = `import-kb-${Date.now()}`
            setToken(newToken)
            setHasError(false)
        }
    }, [visible])

    const {runAsync: existsKnowledgeBaseAsync} = useRequest(
        async () => {
            const result: KnowledgeBaseContentProps = await ipcRenderer.invoke("GetKnowledgeBase", {
                Pagination: {Limit: 9999}
            })
            const {KnowledgeBases} = result
            return KnowledgeBases
        },
        {
            manual: true,
            onError: (error) => {
                failed(`获取知识库列表失败: ${error}`)
            },
            onSuccess: (value) => {
                if (value) {
                    const importKnowledgeItem = value.find(
                        (item) => item.KnowledgeBaseName === knowledgeBaseNameRef.current
                    )
                    if (importKnowledgeItem) {
                        addKnowledgeBase({
                            ...importKnowledgeItem,
                            addManuallyItem: false,
                            historyGenerateKnowledgeList: [],
                            streamstep: "success"
                        } as KnowledgeBaseItem)
                    }
                }
            }
        }
    )

    useEffect(() => {
        if (!token) return

        const handleData = (e: any, data: GeneralProgress) => {
            setProgress(data)
        }

        const handleError = (e: any, error: any) => {
            setImportLoading(false)
            setHasError(true)
            failed(`${error}`)
        }

        const handleEnd = async () => {
            try {
                setImportLoading(false)
                // 失败时不显示成功提示，但仍然刷新和关闭
                if (!getHasError()) {
                    success("导入知识库成功")
                    await existsKnowledgeBaseAsync()
                    onVisible(false)
                    form.resetFields()
                    setAddMode((it) => [...it, "external"])
                }
                setProgress({Percent: 0, Message: "", MessageType: ""})
            } catch (error) {
                failed(error + "")
            }
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

    const handleImport = useMemoizedFn(async () => {
        try {
            setHasError(false)
            const values = await form.validateFields()
            setImportLoading(true)
            setProgress({Percent: 0, Message: "开始导入...", MessageType: "info"})

            const knowledgeBaseName = values.knowledgeBaseName
                ? values.knowledgeBaseName
                : values.importPath.substring(
                      values.importPath.lastIndexOf("/") + 1,
                      values.importPath.lastIndexOf(".")
                  )
            knowledgeBaseNameRef.current = knowledgeBaseName

            await ipcRenderer.invoke(
                "ImportKnowledgeBase",
                {
                    NewKnowledgeBaseName: knowledgeBaseName,
                    InputPath: values.importPath
                },
                token
            )
        } catch (error: any) {
            if (error?.errorFields) {
                return
            }
            setImportLoading(false)
            setHasError(true)
            failed(`${error}`)
        }
    })

    const handleCancel = useMemoizedFn(() => {
        if (importLoading && token) {
            ipcRenderer.invoke("cancel-ImportKnowledgeBase", token)
        }
        onVisible(false)
        form.resetFields()
        setProgress({Percent: 0, Message: "", MessageType: ""})
        setImportLoading(false)
        setHasError(false)
    })

    return (
        <YakitModal
            title='导入知识库'
            visible={visible}
            onCancel={handleCancel}
            width={600}
            destroyOnClose
            bodyStyle={{padding: 0}}
            maskClosable={!importLoading}
            className={styles["knowledge-import-export-modal"]}
            footer={[
                <div className={styles["knowledge-base-modal-footer"]} key='footer'>
                    <YakitButton type='outline1' onClick={handleCancel}>
                        {importLoading ? "取消导入" : "取消"}
                    </YakitButton>
                    <YakitButton type='primary' loading={importLoading} onClick={handleImport} disabled={importLoading}>
                        导入并创建
                    </YakitButton>
                </div>
            ]}
        >
            <div className={styles["import-hint"]}>
                只可导入从知识库里导出的rag文件，导入文件暂不支持修改。导入外部资源存在潜在风险，可能会被植入恶意代码或Payload，造成数据泄露、系统被入侵等严重后果。请务必谨慎考虑引入外部资源的必要性，并确保资源来源可信、内容安全。
            </div>
            <Form
                form={form}
                layout='vertical'
                className={styles["import-form"]}
                onValuesChange={(changedValues) => {
                    if (changedValues.importPath) {
                        const fileName = extractFileName(changedValues.importPath)
                        form.setFieldsValue({knowledgeBaseName: fileName})
                    }
                }}
            >
                <YakitFormDragger
                    formItemProps={{
                        label: "导入文件路径",
                        name: "importPath",
                        rules: [
                            {
                                validator: (_, value) => {
                                    if (!value) {
                                        return Promise.reject("请上传文件")
                                    }

                                    // 多个文件用逗号分隔
                                    const files = value.split(",").map((i) => i.trim())

                                    // 校验格式：必须有文件名 + 后缀
                                    const reg = /^[^.\/]+?\.[^.\/]+$/

                                    for (const file of files) {
                                        // 取文件名 (兼容 windows、mac 路径)
                                        const fileName = file.split("/").pop()?.split("\\").pop()

                                        if (!fileName || !reg.test(fileName)) {
                                            return Promise.reject("请上传有效的文件")
                                        }
                                    }

                                    return Promise.resolve()
                                }
                            }
                        ]
                    }}
                    multiple={false}
                    size='large'
                    help='可将文件拖入框内或'
                    selectType='file'
                    disabled={importLoading}
                    fileExtensionIsExist={false}
                />

                <Form.Item
                    label='新知识库名称'
                    name='knowledgeBaseName'
                    rules={[
                        {required: true, message: "该项为必填"},
                        {
                            validator(_, value) {
                                const findKnowledgeIdx = knowledgeBases.findIndex(
                                    (it) => it.KnowledgeBaseName === value
                                )
                                if (findKnowledgeIdx === 0) {
                                    return Promise.reject("知识库名称重复，请重新输入")
                                }
                                return Promise.resolve()
                            }
                        }
                    ]}
                >
                    <YakitInput placeholder='请输入新知识库名称' disabled={importLoading} />
                </Form.Item>

                {importLoading && (
                    <div style={{marginTop: 16}}>
                        <Progress
                            percent={Math.round(progress.Percent * 100)}
                            status={progress.MessageType === "error" ? "exception" : "active"}
                        />
                        {progress.Message && (
                            <div
                                style={{
                                    marginTop: 8,
                                    fontSize: 12,
                                    color: "var(--Colors-Use-Neutral-Text-1-Title)"
                                }}
                            >
                                {progress.Message}
                            </div>
                        )}
                    </div>
                )}
            </Form>
        </YakitModal>
    )
}

export {ImportModal}
