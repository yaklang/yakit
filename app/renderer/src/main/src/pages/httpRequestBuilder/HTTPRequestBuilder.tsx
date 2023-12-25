import React, {useState, useImperativeHandle, useRef} from "react"
import {useMemoizedFn, useUpdateEffect} from "ahooks"
import {Divider, Form} from "antd"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {NewHTTPPacketEditor} from "@/utils/editors"
import {StringToUint8Array} from "@/utils/str"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {PlusIcon, ResizerIcon, TrashIcon} from "@/assets/newIcon"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {yakitFailed} from "@/utils/notification"
import {AutoTextarea} from "../fuzzer/components/AutoTextarea/AutoTextarea"
import styles from "./HTTPRequestBuilder.module.scss"
import {PluginTypes} from "../pluginDebugger/PluginDebuggerPage"
import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"
import {SetVariableItem} from "../fuzzer/HttpQueryAdvancedConfig/HttpQueryAdvancedConfig"

const {YakitPanel} = YakitCollapse

export interface HTTPRequestBuilderProp {
    pluginType: PluginTypes
    value: HTTPRequestBuilderParams
    setValue: (params: HTTPRequestBuilderParams) => any
}

export interface KVPair {
    Key: string
    Value: string
}

type fields = keyof HTTPRequestBuilderParams

export const getDefaultHTTPRequestBuilderParams = (): HTTPRequestBuilderParams => {
    return {
        Body: new Uint8Array(),
        Method: "GET",
        Input: "",
        GetParams: [{Key: "", Value: ""}],
        Cookie: [],
        Headers: [
            {
                Key: "User-Agent",
                Value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36"
            }
        ],
        IsHttps: false,
        IsRawHTTPRequest: false,
        MultipartFileParams: [],
        MultipartParams: [],
        Path: ["/"],
        PostParams: [],
        RawHTTPRequest: new Uint8Array()
    }
}

export const HTTPRequestBuilder: React.FC<HTTPRequestBuilderProp> = (props) => {
    const {pluginType} = props
    const [form] = Form.useForm()
    const [params, setParams] = useState(props.value || getDefaultHTTPRequestBuilderParams())
    const [reqType, setReqType] = useState<"raw" | "template">("template")
    const [activeKey, setActiveKey] = useState<string[]>(["GET 参数"])
    const getParamsRef = useRef<any>()
    const postParamsRef = useRef<any>()
    const headersRef = useRef<any>()
    const cookieRef = useRef<any>()

    // 表单字段改变回调
    const onValuesChange = useMemoizedFn((changedValues, allValues) => {
        const key = Object.keys(changedValues)[0]
        const value = allValues[key]
        if (key === "reqType") {
            setParams({...params, IsRawHTTPRequest: value === "raw"})
            setReqType(value)
            return
        }
        setParams({...params, [key]: value})
    })

    const onReset = useMemoizedFn((restValue) => {
        setParams({
            ...params,
            ...restValue
        })
        form.setFieldsValue({...restValue})
    })

    // 重置
    const handleReset = (
        e: React.MouseEvent<HTMLElement, MouseEvent>,
        field: fields,
        ref: React.MutableRefObject<any>
    ) => {
        e.stopPropagation()
        onReset({
            [field]: [{Key: "", Value: ""}]
        })
        ref.current.setVariableActiveKey(["0"])
    }

    // 添加
    const handleAdd = (
        e: React.MouseEvent<HTMLElement, MouseEvent>,
        field: fields,
        actKey: string,
        ref: React.MutableRefObject<any>
    ) => {
        e.stopPropagation()
        const v = form.getFieldsValue()
        const variables = v[field] || []
        const index = variables.findIndex((ele: {Key: string; Value: string}) => !ele || (!ele.Key && !ele.Value))
        if (index === -1) {
            onReset({
                [field]: [...variables, {Key: "", Value: ""}]
            })
            ref.current.setVariableActiveKey([...(ref.current.variableActiveKey || []), `${variables?.length || 0}`])
        } else {
            yakitFailed(`请将已添加【变量${index}】设置完成后再进行添加`)
        }
        if (activeKey?.findIndex((ele) => ele === actKey) === -1) {
            setActiveKey([...activeKey, actKey])
        }
    }

    // 删除
    const handleRemove = (e: React.MouseEvent<Element, MouseEvent>, i: number, field: fields) => {
        e.stopPropagation()
        const v = form.getFieldsValue()
        const variables = v[field] || []
        variables.splice(i, 1)
        onReset({
            [field]: [...variables]
        })
    }

    const rawEditorChange = useMemoizedFn((editorVal) => {
        setParams({...params, RawHTTPRequest: StringToUint8Array(editorVal)})
    })

    useUpdateEffect(() => {
        props.setValue(params)
    }, [params])

    useUpdateEffect(() => {
        if (pluginType === "nuclei") {
            onReset(getDefaultHTTPRequestBuilderParams())
        }
    }, [pluginType])

    return (
        <Form
            form={form}
            colon={false}
            onSubmitCapture={(e) => e.preventDefault()}
            labelCol={{span: 6}}
            wrapperCol={{span: 18}}
            initialValues={{...params, reqType}}
            style={{height: "100%"}}
            onValuesChange={onValuesChange}
        >
            {pluginType !== "nuclei" && (
                <Form.Item label='HTTPS' name='IsHttps' valuePropName='checked' style={{marginBottom: 4}}>
                    <YakitSwitch />
                </Form.Item>
            )}
            <Form.Item label='请求类型' name='reqType' style={{marginBottom: 4}}>
                <YakitRadioButtons
                    size='small'
                    buttonStyle='solid'
                    options={
                        pluginType !== "nuclei"
                            ? [
                                  {
                                      value: "raw",
                                      label: "原始请求"
                                  },
                                  {
                                      value: "template",
                                      label: "请求配置"
                                  }
                              ]
                            : [
                                  {
                                      value: "template",
                                      label: "请求配置"
                                  }
                              ]
                    }
                />
            </Form.Item>
            {reqType === "raw" ? (
                <div className={styles.rawEditor}>
                    <NewHTTPPacketEditor
                        originValue={params.RawHTTPRequest}
                        onChange={rawEditorChange}
                        noMinimap={true}
                        noLineNumber={true}
                        showLineBreaksState={true}
                        isShowBeautifyRender={false}
                        hideSearch={true}
                        noTitle={true}
                        noHex={true}
                        simpleMode={true}
                        noModeTag={true}
                    />
                </div>
            ) : (
                <>
                    <Form.Item
                        label='扫描目标'
                        name='Input'
                        style={{marginBottom: 4}}
                        rules={[{required: true, message: "请输入扫描目标"}]}
                    >
                        <YakitInput.TextArea placeholder='请输入扫描目标' size='small' />
                    </Form.Item>
                    {pluginType !== "nuclei" && (
                        <>
                            <Form.Item label='HTTP方法' name='Method' style={{marginBottom: 4}}>
                                <YakitSelect
                                    options={["GET", "POST", "DELETE", "PATCH", "HEAD", "OPTIONS", "CONNECT"].map(
                                        (item) => ({
                                            value: item,
                                            label: item
                                        })
                                    )}
                                    size='small'
                                />
                            </Form.Item>
                            <Form.Item label='请求路径' name='Path' style={{marginBottom: 12}}>
                                <YakitSelect
                                    allowClear
                                    options={["/", "/admin"].map((item) => ({value: item, label: item}))}
                                    size='small'
                                    mode='tags'
                                    maxTagCount='responsive'
                                    placeholder='请输入...'
                                />
                            </Form.Item>
                            <YakitCollapse
                                destroyInactivePanel={false}
                                activeKey={activeKey}
                                onChange={(key) => setActiveKey(key as string[])}
                                className={styles["arg-keys-list"]}
                            >
                                <YakitPanel
                                    header='GET 参数'
                                    key='GET 参数'
                                    // className={styles["arg-keys-list-panel"]}
                                    extra={
                                        <>
                                            <YakitButton
                                                type='text'
                                                colors='danger'
                                                onClick={(e) => handleReset(e, "GetParams", getParamsRef)}
                                                size='small'
                                            >
                                                重置
                                            </YakitButton>
                                            <Divider type='vertical' style={{margin: 0}} />
                                            <YakitButton
                                                type='text'
                                                onClick={(e) => handleAdd(e, "GetParams", "GET 参数", getParamsRef)}
                                                style={{paddingRight: 0}}
                                                size='small'
                                            >
                                                添加
                                                <PlusIcon />
                                            </YakitButton>
                                        </>
                                    }
                                >
                                    <VariableList
                                        ref={getParamsRef}
                                        field='GetParams'
                                        extra={(i: number) => {
                                            return (
                                                <div
                                                    className={styles["variable-list-panel-extra"]}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                    }}
                                                >
                                                    <TrashIcon
                                                        onClick={(e) => handleRemove(e, i, "GetParams")}
                                                        className={styles["variable-list-remove"]}
                                                    />
                                                </div>
                                            )
                                        }}
                                    ></VariableList>
                                </YakitPanel>
                                <YakitPanel
                                    header='POST 参数'
                                    key='POST 参数'
                                    extra={
                                        <>
                                            <YakitButton
                                                type='text'
                                                colors='danger'
                                                onClick={(e) => handleReset(e, "PostParams", postParamsRef)}
                                                size='small'
                                            >
                                                重置
                                            </YakitButton>
                                            <Divider type='vertical' style={{margin: 0}} />
                                            <YakitButton
                                                type='text'
                                                onClick={(e) => handleAdd(e, "PostParams", "POST 参数", postParamsRef)}
                                                style={{paddingRight: 0}}
                                                size='small'
                                            >
                                                添加
                                                <PlusIcon />
                                            </YakitButton>
                                        </>
                                    }
                                >
                                    <VariableList
                                        ref={postParamsRef}
                                        field='PostParams'
                                        extra={(i: number) => {
                                            return (
                                                <div
                                                    className={styles["variable-list-panel-extra"]}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                    }}
                                                >
                                                    <TrashIcon
                                                        onClick={(e) => handleRemove(e, i, "PostParams")}
                                                        className={styles["variable-list-remove"]}
                                                    />
                                                </div>
                                            )
                                        }}
                                    ></VariableList>
                                </YakitPanel>
                                <YakitPanel
                                    header='Header'
                                    key='Header'
                                    extra={
                                        <>
                                            <YakitButton
                                                type='text'
                                                colors='danger'
                                                onClick={(e) => handleReset(e, "Headers", headersRef)}
                                                size='small'
                                            >
                                                重置
                                            </YakitButton>
                                            <Divider type='vertical' style={{margin: 0}} />
                                            <YakitButton
                                                type='text'
                                                onClick={(e) => handleAdd(e, "Headers", "Header", headersRef)}
                                                style={{paddingRight: 0}}
                                                size='small'
                                            >
                                                添加
                                                <PlusIcon />
                                            </YakitButton>
                                        </>
                                    }
                                >
                                    <VariableList
                                        ref={headersRef}
                                        field='Headers'
                                        extra={(i: number) => {
                                            return (
                                                <div
                                                    className={styles["variable-list-panel-extra"]}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                    }}
                                                >
                                                    <TrashIcon
                                                        onClick={(e) => handleRemove(e, i, "Headers")}
                                                        className={styles["variable-list-remove"]}
                                                    />
                                                </div>
                                            )
                                        }}
                                    ></VariableList>
                                </YakitPanel>
                                <YakitPanel
                                    header='Cookie'
                                    key='Cookie'
                                    extra={
                                        <>
                                            <YakitButton
                                                type='text'
                                                colors='danger'
                                                onClick={(e) => handleReset(e, "Cookie", cookieRef)}
                                                size='small'
                                            >
                                                重置
                                            </YakitButton>
                                            <Divider type='vertical' style={{margin: 0}} />
                                            <YakitButton
                                                type='text'
                                                onClick={(e) => handleAdd(e, "Cookie", "Cookie", cookieRef)}
                                                style={{paddingRight: 0}}
                                                size='small'
                                            >
                                                添加
                                                <PlusIcon />
                                            </YakitButton>
                                        </>
                                    }
                                >
                                    <VariableList
                                        ref={cookieRef}
                                        field='Cookie'
                                        extra={(i: number) => {
                                            return (
                                                <div
                                                    className={styles["variable-list-panel-extra"]}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                    }}
                                                >
                                                    <TrashIcon
                                                        onClick={(e) => handleRemove(e, i, "Cookie")}
                                                        className={styles["variable-list-remove"]}
                                                    />
                                                </div>
                                            )
                                        }}
                                    ></VariableList>
                                </YakitPanel>
                            </YakitCollapse>
                        </>
                    )}
                </>
            )}
        </Form>
    )
}

interface VariableListProps {
    field: fields
    extra: (i: number) => React.ReactNode
    ref: React.Ref<any>
}
export const VariableList: React.FC<VariableListProps> = React.forwardRef(({extra, field}, ref) => {
    const [variableActiveKey, setVariableActiveKey] = useState<string[]>(["0"])

    useImperativeHandle(ref, () => ({
        variableActiveKey,
        setVariableActiveKey
    }))

    return (
        <Form.List name={field}>
            {(fields, {add}) => {
                return (
                    <>
                        <YakitCollapse
                            destroyInactivePanel={true}
                            defaultActiveKey={variableActiveKey}
                            activeKey={variableActiveKey}
                            onChange={(key) => setVariableActiveKey(key as string[])}
                            className={styles["variable-list"]}
                            bordered={false}
                        >
                            {fields.map(({key, name}, i) => (
                                <YakitPanel
                                    key={`${key + ""}`}
                                    header={`变量 ${name}`}
                                    className={styles["variable-list-panel"]}
                                    extra={extra(i)}
                                >
                                    <SetVariableItem name={name}/>
                                </YakitPanel>
                            ))}
                        </YakitCollapse>
                        {fields?.length === 0 && (
                            <>
                                <YakitButton
                                    type='outline2'
                                    onClick={() => {
                                        add({Key: "", Value: ""})
                                        setVariableActiveKey([
                                            ...(variableActiveKey || []),
                                            `${variableActiveKey?.length}`
                                        ])
                                    }}
                                    icon={<PlusIcon />}
                                    block
                                >
                                    添加
                                </YakitButton>
                            </>
                        )}
                    </>
                )
            }}
        </Form.List>
    )
})
