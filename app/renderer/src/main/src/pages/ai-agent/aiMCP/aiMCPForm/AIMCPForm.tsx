import React, {ReactNode, useEffect, useState} from "react"
import styles from "./AIMCPForm.module.scss"
import {Form} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {useCreation, useMemoizedFn} from "ahooks"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitSelectProps} from "@/components/yakitUI/YakitSelect/YakitSelectType"
import {AIMCPServerTypeEnum} from "../../defaultConstant"
import {AIMCPFormProps} from "./type"
import {AddMCPServerRequest, MCPServerType, UpdateMCPServerRequest} from "../../type/aiMCP"
import {grpcAddMCPServer, grpcUpdateMCPServer} from "../utils"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
export const AIMCPForm: React.FC<AIMCPFormProps> = React.memo((props) => {
    const {onCancel, defaultValues} = props
    const [loading, setLoading] = useState<boolean>(false)
    const [form] = Form.useForm<AddMCPServerRequest>()
    const type = Form.useWatch("Type", form)
    useEffect(() => {
        if (!!defaultValues) {
            form.setFieldsValue({
                Name: defaultValues.Name || "",
                Type: defaultValues.Type || AIMCPServerTypeEnum.SSE,
                URL: defaultValues.URL || "",
                Command: defaultValues.Command || "",
                Enable: !!defaultValues.Enable
            })
        }
    }, [defaultValues])
    const typeOptions: YakitSelectProps["options"] = useCreation(() => {
        return [
            {label: "sse", value: AIMCPServerTypeEnum.SSE},
            {label: "stdio", value: AIMCPServerTypeEnum.Stdio}
        ]
    }, [])
    const handleSubmit = useMemoizedFn(() => {
        form.validateFields().then(async (value: AddMCPServerRequest) => {
            try {
                console.log("handleSubmit", value)
                setLoading(true)
                if (!!defaultValues?.ID) {
                    const updateValue: UpdateMCPServerRequest = {
                        ...value,
                        ID: defaultValues.ID
                    }
                    // 更新
                    await grpcUpdateMCPServer(updateValue)
                } else {
                    // 新增
                    await grpcAddMCPServer(value)
                }
                onCancel()
            } catch (error) {
            } finally {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            }
        })
    })
    const renderContentByType = useMemoizedFn((key: MCPServerType) => {
        let content: ReactNode = <></>
        switch (key) {
            case AIMCPServerTypeEnum.SSE:
                content = (
                    <Form.Item label='服务器URL' name='URL' rules={[{required: true, message: "请输入服务器URL"}]}>
                        <YakitInput placeholder='例如: http://localhost:3000/sse' />
                    </Form.Item>
                )
                break
            case AIMCPServerTypeEnum.Stdio:
                content = (
                    <Form.Item label='执行命令' name='Command' rules={[{required: true, message: "请输入执行命令"}]}>
                        <YakitInput placeholder='例如: npx -y @modelcontextprotocol/server-filesystem /path' />
                    </Form.Item>
                )
                break
            default:
                break
        }
        return content
    })
    return (
        <div>
            <Form form={form} labelCol={{span: 6}} wrapperCol={{span: 18}} className={styles["ai-mcp-form"]}>
                <Form.Item label='服务器名称' name='Name' rules={[{required: true, message: "请输入服务器名称"}]}>
                    <YakitInput />
                </Form.Item>
                <Form.Item label='启用' name='Enable' valuePropName='checked' initialValue={false}>
                    <YakitSwitch />
                </Form.Item>
                <Form.Item
                    label='服务器类型'
                    name='Type'
                    rules={[{required: true, message: "请选择服务器类型"}]}
                    initialValue={AIMCPServerTypeEnum.SSE}
                >
                    <YakitSelect options={typeOptions} />
                </Form.Item>
                <Form.Item noStyle shouldUpdate={(prev, curr) => prev.Type !== curr.Type}>
                    {renderContentByType(type)}
                </Form.Item>
            </Form>
            <div className={styles["button-group"]}>
                <YakitButton type='outline2' size='large' onClick={onCancel}>
                    取消
                </YakitButton>
                <YakitButton type='primary' size='large' loading={loading} onClick={handleSubmit}>
                    确定
                </YakitButton>
            </div>
        </div>
    )
})
