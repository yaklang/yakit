import React, {memo, useEffect, useState} from "react"
import {Form} from "antd"
import {useMemoizedFn} from "ahooks"
import {EditChatNameModalProps} from "./aiAgentType"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"

// import classNames from "classnames"
// import styles from "./AIAgent.module.scss"

export const EditChatNameModal: React.FC<EditChatNameModalProps> = memo((props) => {
    const {getContainer, info, visible, onCallback} = props

    const [form] = Form.useForm()

    useEffect(() => {
        if (visible) {
            form && form.setFieldsValue({name: info?.name || ""})
            return () => {
                form.resetFields()
            }
        }
    }, [visible])

    const [loading, setLoading] = useState(false)

    const handleOk = useMemoizedFn(() => {
        if (loading) return
        setLoading(true)
        form.validateFields()
            .then(async (values) => {
                values.name && onCallback(true, {...info, name: values.name})
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })
    const handleCancel = useMemoizedFn(() => {
        onCallback(false)
    })

    return (
        <YakitModal
            getContainer={getContainer}
            type='white'
            title='修改对话标题'
            width={400}
            maskClosable={false}
            centered={true}
            visible={visible}
            confirmLoading={loading}
            onOk={handleOk}
            onCancel={handleCancel}
        >
            <Form form={form} labelCol={{span: 6}} wrapperCol={{span: 18}}>
                <Form.Item label='对话框标题' name='name' rules={[{required: true, message: "请输入对话框标题"}]}>
                    <YakitInput showCount maxLength={50} allowClear />
                </Form.Item>
            </Form>
        </YakitModal>
    )
})
