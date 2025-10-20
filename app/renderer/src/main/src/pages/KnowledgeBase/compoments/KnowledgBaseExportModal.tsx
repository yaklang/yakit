import {useMemoizedFn, useSafeState} from "ahooks"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {failed, success} from "@/utils/notification"
import type {TExportModalProps} from "../TKnowledgeBase"
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

// 导出知识库弹窗
const ExportModal: React.FC<TExportModalProps> = (props) => {
    const {visible, refreshAsync, onVisible, KnowledgeBaseId} = props
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

    const handleExport = useMemoizedFn(async () => {
        try {
            const values = await form.validateFields()
            setExportLoading(true)
            setProgress({Percent: 0, Message: "开始导出...", MessageType: "info"})
            
            // 调用流式接口
            await ipcRenderer.invoke("ExportKnowledgeBase", {
                KnowledgeBaseId,
                TargetPath: values.exportPath
            }, token)
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
        onVisible(false)
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
                    <YakitButton 
                        type='primary' 
                        loading={exportLoading} 
                        onClick={handleExport}
                        disabled={exportLoading}
                    >
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

export {ExportModal}

