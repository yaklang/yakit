import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {success, failed} from "@/utils/notification"
import {useMemoizedFn, useRequest} from "ahooks"
import {Form} from "antd"
import {FC, useEffect, useMemo} from "react"
import {v4 as uuidv4} from "uuid"
import {TKnowledgeBaseProps} from "../TKnowledgeBase"
import styles from "../knowledgeBase.module.scss"

const {ipcRenderer} = window.require("electron")

const KnowledgeBaseFormModal: FC<TKnowledgeBaseProps> = ({
    visible,
    handOpenKnowledgeBasesModal,
    refreshAsync,
    itemsData,
    title
}) => {
    const [form] = Form.useForm()

    useEffect(() => {
        form.setFieldsValue(itemsData)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible])

    const targetStatusMemo = useMemo(() => (title?.includes("编辑") ? "edit" : "add"), [title])

    const {runAsync: createKnowledgRunAsync, loading: createKnowledgLoading} = useRequest(
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

    const {runAsync: editKnowledgRunAsync, loading: editKnowledgLoading} = useRequest(
        async (parmas) => {
            await ipcRenderer.invoke("UpdateKnowledgeBase", {
                KnowledgeBaseId: itemsData?.ID,
                ...parmas
            })
        },
        {
            manual: true,
            onSuccess: () => {
                success("编辑知识库成功")
            },
            onError: (error) => {
                failed(`编辑知识库失败: ${error}`)
            }
        }
    )

    // 创建 / 编辑知识库
    const handleSubmit = useMemoizedFn(async () => {
        const values = await form.validateFields()
        if (targetStatusMemo === "add") {
            await createKnowledgRunAsync(values)
        } else {
            itemsData?.ID &&
                (await editKnowledgRunAsync({
                    ...values,
                    KnowledgeBaseId: itemsData.ID
                }))
        }
        await refreshAsync()
        removeFormValue()
    })

    const removeFormValue = useMemoizedFn(() => {
        handOpenKnowledgeBasesModal?.()
        form.resetFields()
    })

    return (
        <YakitModal
            title={title}
            visible={visible}
            onCancel={() => removeFormValue()}
            width={600}
            getContainer={document.getElementById("repository-manage") || document.body}
            destroyOnClose
            maskClosable={false}
            okText='确认'
            footer={[
                <div className={styles["knowledge-base-modal-footer"]} key={uuidv4}>
                    <YakitButton key='cancel' onClick={() => removeFormValue()}>
                        取消
                    </YakitButton>
                    <YakitButton
                        key='add'
                        type='primary'
                        loading={createKnowledgLoading || editKnowledgLoading}
                        onClick={handleSubmit}
                        disabled={createKnowledgLoading || editKnowledgLoading}
                    >
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
