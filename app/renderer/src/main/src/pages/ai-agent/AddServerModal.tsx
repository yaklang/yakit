import React, {useEffect, useRef, useState} from "react"
import {Form} from "antd"
import {useMemoizedFn} from "ahooks"
import {AddServerModalProps, AIAgentServerInfo} from "./aiAgentType"
import {AIAgentServerTypeList} from "./defaultConstant"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {randomString} from "@/utils/randomUtil"
import {yakitNotify} from "@/utils/notification"
import {isValidURL} from "@/utils/tool"
import {grpcCreateMCPServer} from "./grpc"

// import classNames from "classnames"
// import styles from "./AIAgent.module.scss"

export const AddServerModal: React.FC<AddServerModalProps> = (props) => {
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
        if (!token.current) token.current = randomString(16)
        if (!["stdio", "sse"].includes(value.type)) {
            yakitNotify("error", "协议类型异常，请关闭后重试")
            return null
        }

        const data: AIAgentServerInfo = {
            id: token.current,
            type: value.type,
            status: info?.status || false
        }

        if (data.type === "sse" && !value.url) {
            yakitNotify("error", "SSE 协议下地址不能为空")
            return null
        }
        if (data.type === "sse") {
            data.url = value.url
        }

        if (data.type === "stdio" && !value.command) {
            yakitNotify("error", "STDIO 协议下可执行文件不能为空")
            return null
        }
        if (data.type === "stdio") {
            data.command = value.command
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
                if (obj) {
                    try {
                        await grpcCreateMCPServer(obj)
                        onCallback(true, obj)
                    } catch (error) {}
                }
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
                    <YakitSelect options={AIAgentServerTypeList}></YakitSelect>
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
}
