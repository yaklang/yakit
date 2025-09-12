import { YakitButton } from "@/components/yakitUI/YakitButton/YakitButton"
import { YakitInput } from "@/components/yakitUI/YakitInput/YakitInput"
import { YakitModal } from "@/components/yakitUI/YakitModal/YakitModal"
import { success, failed } from "@/utils/notification"
import { useRequest } from "ahooks"
import { Form } from "antd"
import { FC, useEffect } from "react"
import { TKnowledgeBaseProps } from "../TKnowledgeBase"
import styles from "../knowledgeBase.module.scss"

const {ipcRenderer} = window.require("electron")

const KnowledgeBaseFormModal: FC<TKnowledgeBaseProps> = ({
    visible,
    handOpenKnowledgeBasesModal,
    knowledgeBasesRunAsync,
    itemsData,
    title
}) => {
    const [form] = Form.useForm()

    useEffect(() => {
        form.setFieldsValue(itemsData)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible])

    const {runAsync, loading} = useRequest(
        async (params) => {
            await ipcRenderer.invoke("CreateKnowledgeBase", params)
        },
        {
            manual: true,
            onSuccess: () => {
                success("创建知识库成功")
            },
            onError: (error) => {
                failed(`创建知识库失败: ${error}`)
            }
        }
    )

    // 创建 / 编辑知识库
    const handleSubmit = async () => {
        const values = await form.validateFields()
        await runAsync(values)
        await knowledgeBasesRunAsync()
        removeFormValue()
    }

    const removeFormValue = () => {
        handOpenKnowledgeBasesModal?.()
        form.resetFields()
    }

    return (
        <YakitModal
            title={title}
            visible={visible}
            onCancel={() => removeFormValue()}
            width={600}
            destroyOnClose
            okText='确认'
            footer={[
                <div className={styles["knowledge-base-modal-footer"]}>
                    <YakitButton key='cancel' onClick={() => removeFormValue()}>
                        取消
                    </YakitButton>
                    <YakitButton key='add' type='primary' loading={loading} onClick={handleSubmit} disabled={loading}>
                        确认
                    </YakitButton>
                </div>
            ]}
            cancelText='取消'
            className={styles["knowledgeBase-modal"]}
        >
            <Form form={form} layout='vertical'>
                <Form.Item
                    label='知识库名称'
                    name='KnowledgeBaseName'
                    rules={[{required: true, message: "请输入知识库名称"}]}
                >
                    <YakitInput placeholder='请输入知识库名称' />
                </Form.Item>
                <Form.Item
                    label='知识库类型'
                    name='KnowledgeBaseType'
                    rules={[{required: true, message: "请输入知识库类型"}]}
                >
                    <YakitInput placeholder='请输入知识库类型' />
                </Form.Item>
                <Form.Item
                    label='知识库描述'
                    name='KnowledgeBaseDescription'
                    rules={[{max: 500, message: "描述最多 500 个字符"}]}
                >
                    <YakitInput.TextArea placeholder='请输入知识库描述' rows={3} showCount />
                </Form.Item>
            </Form>
        </YakitModal>
    )
}

export {KnowledgeBaseFormModal}