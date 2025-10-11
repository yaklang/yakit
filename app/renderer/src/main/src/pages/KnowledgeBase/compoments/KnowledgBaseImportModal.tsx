import {useMemoizedFn, useSafeState} from "ahooks"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {failed, success} from "@/utils/notification"
import type {TImportModalProps} from "../TKnowledgeBase"
import {Form, Progress} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import styles from "../knowledgeBase.module.scss"
import {useEffect} from "react"

const {ipcRenderer} = window.require("electron")

// 进度信息类型
interface GeneralProgress {
    Percent: number
    Message: string
    MessageType: string
}

// 导入知识库弹窗（创建新知识库）
const ImportModal: React.FC<TImportModalProps> = (props) => {
    const {visible, refreshAsync, onVisible} = props
    const [form] = Form.useForm()
    const [importLoading, setImportLoading] = useSafeState(false)
    const [progress, setProgress] = useSafeState<GeneralProgress>({
        Percent: 0,
        Message: "",
        MessageType: ""
    })
    const [token, setToken] = useSafeState<string>("")

    useEffect(() => {
        if (visible) {
            // 生成唯一token
            const newToken = `import-kb-${Date.now()}`
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
            setImportLoading(false)
            failed(`导入知识库失败: ${error}`)
        }

        // 监听完成
        const handleEnd = () => {
            setImportLoading(false)
            success("导入知识库成功")
            refreshAsync()
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
    }, [token])

    const handleImport = useMemoizedFn(async () => {
        try {
            const values = await form.validateFields()
            setImportLoading(true)
            setProgress({Percent: 0, Message: "开始导入...", MessageType: "info"})
            
            // 调用流式接口，创建新知识库
            await ipcRenderer.invoke("ImportKnowledgeBase", {
                NewKnowledgeBaseName: values.knowledgeBaseName,
                InputPath: values.importPath
            }, token)
        } catch (error: any) {
            if (error?.errorFields) {
                // 表单验证错误，不显示错误提示
                return
            }
            setImportLoading(false)
            failed(`导入知识库失败: ${error}`)
        }
    })

    const handleCancel = useMemoizedFn(() => {
        if (importLoading && token) {
            // 取消导入
            ipcRenderer.invoke("cancel-ImportKnowledgeBase", token)
        }
        onVisible(false)
        form.resetFields()
        setProgress({Percent: 0, Message: "", MessageType: ""})
        setImportLoading(false)
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
                    <YakitButton 
                        type='primary' 
                        loading={importLoading} 
                        onClick={handleImport}
                        disabled={importLoading}
                    >
                        导入并创建
                    </YakitButton>
                </div>
            ]}
        >
            <Form form={form} layout='vertical'>
                <Form.Item
                    label='新知识库名称'
                    name='knowledgeBaseName'
                    rules={[
                        {required: true, message: "请输入知识库名称"},
                        {
                            validator: (_, value) => {
                                if (typeof value === "string" && value.length > 0 && value.trim() === "") {
                                    return Promise.reject(new Error("知识库名称不能为空字符串"))
                                }
                                return Promise.resolve()
                            }
                        }
                    ]}
                    extra='导入将创建一个新的知识库'
                >
                    <YakitInput 
                        placeholder='请输入新知识库名称' 
                        disabled={importLoading}
                    />
                </Form.Item>
                <Form.Item
                    label='导入文件路径'
                    name='importPath'
                    rules={[{required: true, message: "请输入文件路径"}]}
                    extra='请输入要导入的文件完整路径'
                >
                    <YakitInput 
                        placeholder='例如: /Users/username/Downloads/knowledge_base.kb' 
                        disabled={importLoading}
                    />
                </Form.Item> 
                
                {importLoading && (
                    <div style={{marginTop: 16}}>
                        <Progress 
                            percent={Math.round(progress.Percent * 100)} 
                            status={progress.MessageType === "error" ? "exception" : "active"}
                        />
                        {progress.Message && (
                            <div style={{marginTop: 8, fontSize: 12, color: "#666"}}>
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

