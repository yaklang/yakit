import React, {ReactNode, useEffect, useRef, useState} from "react"
import styles from "./AIMCPForm.module.scss"
import {Divider, Form} from "antd"
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
import {yakitNotify} from "@/utils/notification"
import {OutlinePluscircleIcon, OutlineTrashIcon} from "@/assets/icon/outline"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {InputHTTPHeaderForm} from "@/pages/mitm/MITMRule/MITMRuleFromModal"
import {HTTPHeader} from "@/pages/mitm/MITMContentReplacerHeaderOperator"
import {KVPair} from "@/models/kv"
export const AIMCPForm: React.FC<AIMCPFormProps> = React.memo((props) => {
    const {onCancel, defaultValues} = props
    const [loading, setLoading] = useState<boolean>(false)
    const tableRef = useRef<HTMLDivElement>(null)
    const [form] = Form.useForm<AddMCPServerRequest>()
    const type = Form.useWatch("Type", form)
    const headers = Form.useWatch("Headers", form) || []
    const [visibleHTTPHeader, setVisibleHTTPHeader] = useState<boolean>(false)
    const headerItemRef = useRef<HTTPHeader>()
    const headerItemIndexRef = useRef<number>()

    useEffect(() => {
        if (!!defaultValues) {
            form.setFieldsValue({
                Name: defaultValues.Name || "",
                Type: defaultValues.Type || AIMCPServerTypeEnum.SSE,
                URL: defaultValues.URL || "",
                Command: defaultValues.Command || "",
                Enable: !!defaultValues.Enable,
                Envs: defaultValues.Envs || [],
                Headers: defaultValues.Headers || []
            })
        }
    }, [defaultValues])
    const typeOptions: YakitSelectProps["options"] = useCreation(() => {
        return [
            {label: "sse", value: AIMCPServerTypeEnum.SSE},
            {label: "stdio", value: AIMCPServerTypeEnum.Stdio},
            {label: "streamable_http", value: AIMCPServerTypeEnum.StreamableHTTP}
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
            case AIMCPServerTypeEnum.StreamableHTTP:
                content = (
                    <>
                        <Form.Item label='服务器URL' name='URL' rules={[{required: true, message: "请输入服务器URL"}]}>
                            <YakitInput placeholder='例如: http://localhost:3000/sse' />
                        </Form.Item>
                        <Form.Item label={"Header"} name='Headers'>
                            {(headers || []).map((i, index) => {
                                return (
                                    <YakitTag
                                        key={index}
                                        onClick={() => {
                                            headerItemRef.current = {
                                                Header: i.Key,
                                                Value: i.Value
                                            }
                                            headerItemIndexRef.current = index
                                            setVisibleHTTPHeader(true)
                                        }}
                                        closable
                                        onClose={() => {
                                            onRemoveHeaders(index)
                                        }}
                                    >
                                        {i.Key}
                                    </YakitTag>
                                )
                            })}
                            <YakitButton
                                type={"outline1"}
                                onClick={() => {
                                    headerItemRef.current = undefined
                                    headerItemIndexRef.current = undefined
                                    setVisibleHTTPHeader(true)
                                }}
                            >
                                添加
                            </YakitButton>
                        </Form.Item>
                    </>
                )
                break
            case AIMCPServerTypeEnum.Stdio:
                content = (
                    <>
                        <Form.Item
                            label='执行命令'
                            name='Command'
                            rules={[{required: true, message: "请输入执行命令"}]}
                        >
                            <YakitInput placeholder='例如: npx -y @modelcontextprotocol/server-filesystem /path' />
                        </Form.Item>
                        <Form.Item label='环境变量' className={styles["envs-rules"]}>
                            <Form.List name='Envs'>
                                {(fields, {add, remove}) => (
                                    <>
                                        <div className={styles["envs-rules-header"]}>
                                            <YakitButton
                                                type='text'
                                                style={{paddingLeft: 0}}
                                                icon={<OutlinePluscircleIcon />}
                                                onClick={() => {
                                                    const envs = form.getFieldValue("Envs") || []
                                                    if (envs.length > 0) {
                                                        const {Key, Value} = envs[envs.length - 1]
                                                        if (!Key && !Value) {
                                                            yakitNotify("error", "请设置完成后再添加")
                                                            return
                                                        }
                                                    }
                                                    add({Key: "", Value: ""})
                                                    setTimeout(() => {
                                                        if (tableRef.current) {
                                                            tableRef.current.scrollTop = tableRef.current.scrollHeight
                                                        }
                                                    }, 100)
                                                }}
                                            >
                                                添加
                                            </YakitButton>
                                            <Divider type='vertical' style={{margin: 0}} />
                                            <YakitButton
                                                type='text'
                                                danger
                                                onClick={() => {
                                                    form.setFieldsValue({Envs: [{Key: "", Value: ""}]})
                                                }}
                                            >
                                                重置
                                            </YakitButton>
                                        </div>
                                        <div ref={tableRef} className={styles["envs-rules-table"]}>
                                            <div className={styles["table-header"]}>
                                                <div className={styles["header-cell"]}>Key</div>
                                                <div className={styles["header-cell"]}>Value</div>
                                            </div>
                                            {fields.map((field) => (
                                                <div key={field.key} className={styles["table-row"]}>
                                                    <div className={styles["table-cell"]}>
                                                        <Form.Item
                                                            {...field}
                                                            name={[field.name, "Key"]}
                                                            style={{marginBottom: 0}}
                                                        >
                                                            <YakitInput size='small' style={{width: "100%"}} />
                                                        </Form.Item>
                                                    </div>
                                                    <div className={styles["table-cell"]}>
                                                        <Form.Item
                                                            {...field}
                                                            name={[field.name, "Value"]}
                                                            style={{marginBottom: 0, flex: 1}}
                                                        >
                                                            <YakitInput size='small' style={{width: "100%"}} />
                                                        </Form.Item>
                                                        <YakitButton
                                                            type='text'
                                                            onClick={() => remove(field.name)}
                                                            icon={<OutlineTrashIcon />}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </Form.List>
                        </Form.Item>
                    </>
                )
                break
            default:
                break
        }
        return content
    })
    const onSaveHeaders = useMemoizedFn((val, updateIndex) => {
        const obj = {
            Key: val.Header,
            Value: val.Value
        }
        let headersList: KVPair[] = []
        if (updateIndex === undefined) {
            headersList = [...headers, obj]
        } else {
            headers[updateIndex] = obj
            headersList = [...headers]
        }
        form.setFieldsValue({
            Headers: headersList
        })
    })
    const onRemoveHeaders = useMemoizedFn((index: number) => {
        form.setFieldsValue({
            Headers: headers.filter((_, i) => i !== index)
        })
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
                    label='协议类型'
                    name='Type'
                    rules={[{required: true, message: "请选择协议类型"}]}
                    initialValue={AIMCPServerTypeEnum.SSE}
                >
                    <YakitSelect options={typeOptions} />
                </Form.Item>
                <Form.Item noStyle shouldUpdate={(prev, curr) => prev.Type !== curr.Type}>
                    {renderContentByType(type)}
                </Form.Item>
            </Form>
            <InputHTTPHeaderForm
                initFormVal={headerItemRef.current}
                updateIndex={headerItemIndexRef.current}
                visible={visibleHTTPHeader}
                setVisible={setVisibleHTTPHeader}
                onSave={onSaveHeaders}
            />
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
