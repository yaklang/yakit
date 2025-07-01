import React, {memo, useEffect, useRef, useState} from "react"
import {Form} from "antd"
import {useMemoizedFn} from "ahooks"
import {AddServerModalProps, EditChatNameModalProps, RenderMCPClientInfo} from "./aiAgentType"
import {MCPTransportTypeList} from "./defaultConstant"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {randomString} from "@/utils/randomUtil"
import {yakitNotify} from "@/utils/notification"
import {isValidURL} from "@/utils/tool"

// import classNames from "classnames"
// import styles from "./AIAgent.module.scss"

export const AddServerModal: React.FC<AddServerModalProps> = memo((props) => {
    const {info, visible, onCallback} = props

    const token = useRef<string>("")

    const [form] = Form.useForm()
    const type = Form.useWatch("type", form)

    useEffect(() => {
        if (visible) {
            token.current = randomString(16)

            return () => {
                form.resetFields()
                token.current = ""
            }
        }
    }, [visible, info])

    const [loading, setLoading] = useState(false)

    // 格式化数据
    const formatData = useMemoizedFn((value) => {
        if (!value || typeof value !== "object" || !value.type) {
            yakitNotify("error", "数据异常，请关闭后重试")
            return null
        }
        if (!["stdio", "sse"].includes(value.type)) {
            yakitNotify("error", "协议类型异常，请关闭后重试")
            return null
        }
        if (!token.current) token.current = randomString(16)

        // 没有兼容编辑功能，所以不需要判断是否存在 info
        const data: RenderMCPClientInfo = {
            isDefault: false,
            id: token.current,
            type: value.type,
            status: false
        }

        if (data.type === "sse" && !value.url) {
            yakitNotify("error", "SSE 协议下地址不能为空")
            return null
        }
        if (data.type === "sse") {
            data.url = value.url.trim()
        }

        if (data.type === "stdio" && !value.command) {
            yakitNotify("error", "STDIO 协议下可执行文件不能为空")
            return null
        }
        if (data.type === "stdio") {
            data.command = value.command.trim()
            data.args = value.args
                ? value.args
                      .split("\n")
                      .filter((item) => item)
                      .map((item) => item.trim())
                : undefined
            data.cwd = value.cwd || undefined
            try {
                data.env = value.env ? JSON.parse(value.env.trim()) : undefined
            } catch (error) {
                yakitNotify("error", `解析环境变量异常：${error}`)
                return null
            }
        }

        return data
    })

    const handleOk = useMemoizedFn(() => {
        if (loading) return
        setLoading(true)
        form.validateFields()
            .then(async (values) => {
                const obj = formatData(values)
                obj && onCallback(true, obj)
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
            type='white'
            title='添加服务器'
            width={480}
            maskClosable={false}
            centered={true}
            visible={visible}
            okText='添加'
            confirmLoading={loading}
            onOk={handleOk}
            onCancel={handleCancel}
        >
            <Form form={form} labelCol={{span: 6}} wrapperCol={{span: 18}} initialValues={{type: "sse"}}>
                <Form.Item label='协议' name='type'>
                    <YakitSelect options={MCPTransportTypeList}></YakitSelect>
                </Form.Item>

                {type === "sse" && (
                    <Form.Item
                        label='地址'
                        name='url'
                        rules={[
                            {required: true, message: "请输入地址"},
                            {
                                validator: (_, value) => {
                                    if (!value) {
                                        return Promise.resolve()
                                    }
                                    if (!isValidURL(value)) {
                                        return Promise.reject(new Error("地址格式不正确"))
                                    }
                                    return Promise.resolve()
                                }
                            }
                        ]}
                    >
                        <YakitInput placeholder='请输入地址' allowClear />
                    </Form.Item>
                )}

                {type === "stdio" && (
                    <>
                        <Form.Item
                            label='可执行文件'
                            name='command'
                            rules={[{required: true, message: "请输入可执行文件路径"}]}
                        >
                            <YakitInput placeholder='请输入可执行文件路径' allowClear />
                        </Form.Item>
                        <Form.Item label='参数' name='args'>
                            <YakitInput.TextArea
                                placeholder='请输入可执行文件的命令行参数(换行分隔)'
                                autoSize={{minRows: 2, maxRows: 3}}
                                allowClear
                            />
                        </Form.Item>
                        <Form.Item label='环境变量' name='env'>
                            <YakitInput placeholder='请输入进程使用的环境(json格式)' allowClear />
                        </Form.Item>
                        <Form.Item label='工作目录' name='cwd'>
                            <YakitInput placeholder='请输入进程使用的工作目录' allowClear />
                        </Form.Item>
                    </>
                )}
            </Form>
        </YakitModal>
    )
})

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
                    <YakitInput showCount maxLength={50} />
                </Form.Item>
            </Form>
        </YakitModal>
    )
})
