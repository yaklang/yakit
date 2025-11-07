import {useMemoizedFn, useSafeState} from "ahooks"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {failed, success} from "@/utils/notification"
import {Form, Progress} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import styles from "../knowledgeBase.module.scss"
import {useEffect} from "react"
import {TExistsKnowledgeBaseAsync} from "../TKnowledgeBase"
import {YakitFormDragger} from "@/components/yakitUI/YakitForm/YakitForm"

const {ipcRenderer} = window.require("electron")

interface GeneralProgress {
    Percent: number
    Message: string
    MessageType: string
}

interface TImportModalProps {
    visible: boolean
    onVisible: (visible: boolean) => void
    existsKnowledgeBaseAsync: TExistsKnowledgeBaseAsync["existsKnowledgeBaseAsync"]
}

const ImportModal: React.FC<TImportModalProps> = (props) => {
    const {visible, onVisible, existsKnowledgeBaseAsync} = props
    const [form] = Form.useForm()
    const [importLoading, setImportLoading] = useSafeState(false)
    const [progress, setProgress] = useSafeState<GeneralProgress>({
        Percent: 0,
        Message: "",
        MessageType: ""
    })
    const [token, setToken] = useSafeState<string>("")
    const [hasError, setHasError] = useSafeState(false)

    useEffect(() => {
        if (visible) {
            const newToken = `import-kb-${Date.now()}`
            setToken(newToken)
            setHasError(false)
        }
    }, [visible])

    useEffect(() => {
        if (!token) return

        const handleData = (e: any, data: GeneralProgress) => {
            setProgress(data)
        }

        const handleError = (e: any, error: any) => {
            setImportLoading(false)
            setHasError(true)
            failed(`导入知识库失败: ${error}`)
        }

        const handleEnd = () => {
            setImportLoading(false)
            // 失败时不显示成功提示，但仍然刷新和关闭
            if (!hasError) {
                success("导入知识库成功")
            }
            existsKnowledgeBaseAsync()
            onVisible(false)
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
    }, [token, hasError])

    const handleImport = useMemoizedFn(async () => {
        try {
            const values = await form.validateFields()
            setImportLoading(true)
            setProgress({Percent: 0, Message: "开始导入...", MessageType: "info"})

            const knowledgeBaseName = values.knowledgeBaseName
                ? values.knowledgeBaseName
                : values.importPath.substring(
                      values.importPath.lastIndexOf("/") + 1,
                      values.importPath.lastIndexOf(".")
                  )

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
                // 表单验证错误
                return
            }
            setImportLoading(false)
            setHasError(true)
            failed(`导入知识库失败: ${error}`)
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
            maskClosable={!importLoading}
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
            <Form form={form} layout='vertical'>
                <YakitFormDragger
                    formItemProps={{
                        label: "导入文件路径",
                        name: "importPath",
                        rules: [{required: true, message: "请上传文件路径"}]
                    }}
                    multiple={false}
                    size='large'
                    help='可将文件拖入框内或'
                    selectType='file'
                    disabled={importLoading}
                    fileExtensionIsExist={false}
                />
                <Form.Item label='新知识库名称' name='knowledgeBaseName'>
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
