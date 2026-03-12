import React, {ReactNode, useEffect, useMemo, useRef, useState} from "react"
import styles from "./AIMCPForm.module.scss"
import {Divider, Form, FormInstance} from "antd"
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
import {KVPair} from "@/models/kv"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {VariableList} from "@/pages/httpRequestBuilder/HTTPRequestBuilder"
import {SolidPlusIcon} from "@/assets/icon/solid"
import {yakitFailed} from "@/utils/notification"

const {YakitPanel} = YakitCollapse

const EMPTY_KV_PAIR: KVPair = {Key: "", Value: ""}

type MCPKVField = "Envs" | "Headers"

interface MCPKVConfigPanelProps {
    field: MCPKVField
    form: FormInstance<AddMCPServerRequest>
    title: string
}

const MCPKVConfigPanel: React.FC<MCPKVConfigPanelProps> = React.memo((props) => {
    const {field, form, title} = props
    const listRef = useRef<any>()
    const [activeKey, setActiveKey] = useState<string[]>([title])
    const values = Form.useWatch(field, form) as KVPair[] | undefined

    const updateFieldValue = useMemoizedFn((nextValues: KVPair[]) => {
        form.setFieldsValue({
            [field]: nextValues
        } as Partial<AddMCPServerRequest>)
    })

    const handleReset = useMemoizedFn((e: React.MouseEvent<HTMLElement, MouseEvent>) => {
        e.stopPropagation()
        updateFieldValue([{...EMPTY_KV_PAIR}])
        listRef.current?.setVariableActiveKey?.(["0"])
        setActiveKey([title])
    })

    const handleAdd = useMemoizedFn((e: React.MouseEvent<HTMLElement, MouseEvent>) => {
        e.stopPropagation()
        const variables = ((form.getFieldValue(field) || []) as KVPair[]).filter(Boolean)
        const emptyIndex = variables.findIndex((item) => !item.Key && !item.Value)
        if (emptyIndex !== -1) {
            yakitFailed(`请先完善第 ${emptyIndex + 1} 项${title}`)
            return
        }

        updateFieldValue([...variables, {...EMPTY_KV_PAIR}])
        listRef.current?.setVariableActiveKey?.([...(listRef.current?.variableActiveKey || []), `${variables.length}`])
        setActiveKey((prev) => Array.from(new Set([...prev, title])))
    })

    const handleRemove = useMemoizedFn((index: number) => {
        const variables = [...(((form.getFieldValue(field) || []) as KVPair[]).filter(Boolean) || [])]
        variables.splice(index, 1)
        updateFieldValue(variables)
    })

    return (
        <YakitCollapse
            destroyInactivePanel={false}
            activeKey={activeKey}
            onChange={(key) => setActiveKey(key as string[])}
            className={styles["kv-params-wrapper"]}
        >
            <YakitPanel
                key={title}
                forceRender={true}
                header={
                    <div className={styles["yakit-panel-heard"]}>
                        {title}
                        {values?.length ? <span className={styles["yakit-panel-heard-number"]}>{values.length}</span> : ""}
                    </div>
                }
                extra={
                    <>
                        <YakitButton type='text' colors='danger' onClick={handleReset} size='small'>
                            重置
                        </YakitButton>
                        <Divider type='vertical' style={{margin: 0}} />
                        <YakitButton type='text' onClick={handleAdd} style={{paddingRight: 0}} size='small'>
                            新增
                            <SolidPlusIcon className={styles["plus-icon"]} />
                        </YakitButton>
                    </>
                }
            >
                <VariableList
                    ref={listRef}
                    field={field}
                    onDel={handleRemove}
                    collapseWrapperClassName={styles["variable-list-wrapper"]}
                />
            </YakitPanel>
        </YakitCollapse>
    )
})

export const AIMCPForm: React.FC<AIMCPFormProps> = React.memo((props) => {
    const {onCancel, defaultValues} = props
    const [loading, setLoading] = useState<boolean>(false)
    const [form] = Form.useForm<AddMCPServerRequest>()
    const type = Form.useWatch("Type", form) || defaultValues?.Type || AIMCPServerTypeEnum.SSE

    useEffect(() => {
        form.setFieldsValue({
            Name: defaultValues?.Name || "",
            Type: defaultValues?.Type || AIMCPServerTypeEnum.SSE,
            URL: defaultValues?.URL || "",
            Command: defaultValues?.Command || "",
            Enable: !!defaultValues?.Enable,
            Envs: defaultValues?.Envs || [],
            Headers: defaultValues?.Headers || []
        })
    }, [defaultValues, form])

    const typeOptions: YakitSelectProps["options"] = useCreation(() => {
        return [
            {label: "sse", value: AIMCPServerTypeEnum.SSE},
            {label: "stdio", value: AIMCPServerTypeEnum.Stdio}
        ]
    }, [])

    const handleSubmit = useMemoizedFn(() => {
        form.validateFields().then(async (value: AddMCPServerRequest) => {
            try {
                setLoading(true)
                if (!!defaultValues?.ID) {
                    const updateValue: UpdateMCPServerRequest = {
                        ...value,
                        ID: defaultValues.ID
                    }
                    await grpcUpdateMCPServer(updateValue)
                } else {
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

    const extraConfigItems = useMemo(
        () => [
            {field: "Envs" as MCPKVField, title: "环境变量"},
            {field: "Headers" as MCPKVField, title: "请求头"}
        ],
        []
    )

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
                {extraConfigItems.map((item) => (
                    <Form.Item key={item.field} label={item.title} className={styles["extra-form-item"]}>
                        <MCPKVConfigPanel form={form} field={item.field} title={item.title} />
                    </Form.Item>
                ))}
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
