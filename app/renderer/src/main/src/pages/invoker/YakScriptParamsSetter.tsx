import React, {useEffect, useRef, useState} from "react";
import {YakScriptParam} from "./schema";
import {
    Button,
    Card,
    Form,
    Input,
    InputNumber,
    Space,
    Switch,
    Tooltip,
    Typography,
    Popover,
    Spin,
    Upload,
    Divider
} from "antd";
import {QuestionOutlined} from "@ant-design/icons";
import {YakExecutorParam} from "./YakExecutorParams";
import {useMemoizedFn, useUpdate} from "ahooks";
import {HTTPPacketEditor, YakCodeEditor} from "../../utils/editors";
import cloneDeep from "lodash/cloneDeep"
import {ContentUploadInput} from "../../components/functionTemplate/ContentUploadTextArea";
import {failed, info} from "../../utils/notification";
import {ItemSelects} from "../../components/baseTemplate/FormItemUtil";
import {getRemoteValue, setRemoteValue} from "@/utils/kv";

const {Title} = Typography;

export interface YakScriptParamsSetterProps {
    Params: YakScriptParam[]
    onParamsConfirm: (params: YakExecutorParam[]) => any
    onCanceled?: () => any
    onClearData?: () => any
    primaryParamsOnly?: boolean
    submitVerbose?: string
    cancelVerbose?: string
    hideClearButton?: boolean
    saveDebugParams?: boolean

    styleSize?: "big" | "small"
    loading?: boolean
}

const YAKIT_PLUGIN_DEBUG_PARAMS = "YAKIT_PLUGIN_DEBUG_PARAMS"

export const getValueFromParams = (params: YakExecutorParam[], key: string): any => {
    let res = params.filter(i => i.Key === key);
    if (res.length > 0) {
        return res[0].Value
    }
    return ""
}

export const putValueToParams = (params: YakExecutorParam[], key: string, value: any): YakExecutorParam[] => {
    params = removeRepeatedParams(params)
    if (params.length <= 0) {
        return [{Key: key, Value: value}]
    }

    let index = -1;
    params.forEach((e, i) => {
        if (e.Key === key) {
            index = i
        }
    })
    const newParams = index >= 0 ? params.splice(index, 1) : [...params]
    newParams.push({Key: key, Value: value})
    return removeRepeatedParams(params)
}

export const removeRepeatedParams = (params: YakExecutorParam[]): YakExecutorParam[] => {
    let keys: string[] = [];
    params.forEach(i => !keys.includes(i.Key) && keys.push(i.Key))
    return [...params.filter(i => keys.includes(i.Key))]
}

export const YakScriptParamsSetter: React.FC<YakScriptParamsSetterProps> = (props) => {
    // 新参数组件标记数组
    const newParamCom: string[] = ["upload-path", "select"]
    const [propsOriginParams, setPropsOriginParams] = useState<YakScriptParam[]>(props.Params);
    const [originParams, setOriginParams] = useState<YakScriptParam[]>(props.Params || []);
    const [groupStates, setGroupStates] = useState<{ group: string, hidden: boolean }[]>([]);

    // 参数组数据流
    const [extraGroup, setExtraGroup] = useState<string[]>([])
    const [requiredParams, setRequiredParams] = useState<YakScriptParam[]>([])
    const groupToParams = useRef<Map<string, YakScriptParam[]>>(new Map<string, YakScriptParam[]>())

    // 控制局部组件的加载状态
    const [templateLoading, setTemplateLoading] = useState<boolean>(false)
    // 上传组件多选时定时器和临时数据暂存点
    const timerToData = useRef<{ time: any, data: string }>({time: undefined, data: ""})
    // antd的Form表单验证，此变量非常重要，复制Form验证功能必须
    const [form] = Form.useForm()

    useEffect(() => {
        if ((props.Params || []).length === 0) return
        const cloneParams = props.Params.map(item => {
            item.Value = item.DefaultValue ? item.DefaultValue : undefined
            return item
        })

        if (!props.saveDebugParams) {
            setOriginParams(cloneParams)
            form.resetFields()
            form.setFieldsValue({originParams: cloneParams})
        } else {
            getRemoteValue(YAKIT_PLUGIN_DEBUG_PARAMS).then(data => {
                try {
                    const debugParams = JSON.parse(data) as { Key: string, Value: string }[];
                    debugParams.forEach(value => {
                        cloneParams.forEach(origin => {
                            if (origin.Field !== value.Key) {
                                return
                            }

                            origin.DefaultValue = value.Value
                            origin.Value = value.Value
                        })
                    })
                    info("加载调试参数成功")
                } catch (e) {
                    failed("加载调试参数失败")
                }
            }).finally(() => {
                setOriginParams(cloneParams)
                form.resetFields()
                form.setFieldsValue({originParams: cloneParams})
            })
        }

    }, [props.Params, props.saveDebugParams])

    useEffect(() => {
        const groupToParam = new Map<string, YakScriptParam[]>();
        const extraGroup: string[] = [];
        for (let item of originParams) {
            const group = item.Required ? "required" : (item.Group || "default");
            if (group !== "required" && !extraGroup.includes(group)) {
                extraGroup.push(group)
            }

            let params: YakScriptParam[] | undefined = groupToParam.get(group)
            if (params === undefined) {
                groupToParam.set(group, [])
                params = groupToParam.get(group)
            }
            if (params) params.push(item)
        }
        const requiredParam: YakScriptParam[] = groupToParam.get("required") || [];

        groupToParams.current = groupToParam
        setRequiredParams(requiredParam)
        setExtraGroup(extraGroup)
    }, [originParams])

    const yakScriptParamToNode = (i: YakScriptParam, required: boolean, key: string, disabled: boolean, formItemStyle?: React.CSSProperties) => {
        let index = 0
        for (let id in originParams) {
            if (originParams[id].Field === i.Field) {
                index = +id
                break
            }
        }

        return <Form.Item
            labelCol={{span: 6}}
            key={key}
            style={{marginBottom: 8, ...formItemStyle}}
            label={<Space size={2}>
                <>{i.FieldVerbose ? `${i.FieldVerbose}` : `${i.Field}`}</>
                {i.Help && <Tooltip title={i.Help}>
                    <Button icon={<QuestionOutlined/>} type={"link"} size={"small"}/>
                </Tooltip>}
            </Space>}
            // help={i.Help || undefined}
            required={required}
            name={["originParams", `${index}`, "Value"]}
            rules={[{
                validator: async (rule, value) => {
                    if (i.TypeVerbose === "boolean") return
                    else if (i.TypeVerbose === "float") {
                        if (value === undefined || value === null) throw new Error('该参数为必填项!')
                    } else {
                        if (required && (value || []).length === 0) throw new Error('该参数为必填项!')
                    }
                }
            }]}
        >
            <TypeVerboseToInput
                TypeVerbose={i.TypeVerbose}
                value={i.Value || i.DefaultValue}
                placeholder={i.DefaultValue}
                defaultValue={i.DefaultValue}
                disabled={disabled}
                setValue={value => {
                    originParams[index].Value = value
                    setOriginParams([...originParams])
                    form.setFieldsValue({originParams: {...originParams}})
                }}
            />
        </Form.Item>
    }

    const yakScriptParamToNewNode = (
        i: YakScriptParam,
        required: boolean,
        key: string,
        disabled: boolean,
        formItemStyle?: React.CSSProperties
    ) => {
        let index = 0
        for (let id in originParams) {
            if (originParams[id].Field === i.Field) {
                index = +id
                break
            }
        }

        let extraSetting: any = undefined
        try {
            extraSetting = JSON.parse(i.ExtraSetting || "{}")
        } catch (error) {
            failed("获取参数配置数据错误，请重新打开该页面")
        }

        if (i.TypeVerbose === "upload-path") {
            const before = (f: any) => {
                if (!timerToData.current.time) setTemplateLoading(true)
                if (timerToData.current.time) {
                    clearTimeout(timerToData.current.time)
                    timerToData.current.time = null
                }

                timerToData.current.data = timerToData.current.data ? `${timerToData.current.data},${f.path}` : f.path
                timerToData.current.time = setTimeout(() => {
                    for (let item of originParams) {
                        if (item.Field === i.Field) {
                            item.Value = item.Value ? `${item.Value},${timerToData.current.data}` : timerToData.current.data
                            break
                        }
                    }
                    setOriginParams([...originParams])
                    form.setFieldsValue({originParams: {...originParams}})
                    timerToData.current = {time: undefined, data: ""}
                    setTimeout(() => setTemplateLoading(false), 50)
                }, 100);

                return false
            }

            return (
                <Spin key={key} spinning={templateLoading}>
                    <ContentUploadInput
                        type={extraSetting.isTextArea ? "textarea" : "input"}
                        beforeUpload={(f: any) => before(f)}
                        dragger={{
                            accept: "",
                            multiple: true,
                            disabled: disabled || templateLoading
                        }}
                        item={{
                            style: {marginBottom: 8, ...formItemStyle},
                            labelCol: {span: 6},
                            label: (
                                <Space size={2}>
                                    <>{i.FieldVerbose ? `${i.FieldVerbose}` : `${i.Field}`}</>
                                    {i.Help && (
                                        <Tooltip title={i.Help}>
                                            <Button icon={<QuestionOutlined/>} type={"link"} size={"small"}/>
                                        </Tooltip>
                                    )}
                                </Space>
                            ),
                            required: required,
                            help: (
                                <div className='content-upload-input-help'>
                                    点击此处
                                    <Upload
                                        // accept={"text/plain"}
                                        accept={"*"}
                                        multiple={true}
                                        maxCount={1}
                                        showUploadList={false}
                                        beforeUpload={(f) => {
                                            before(f)
                                            return false
                                        }}
                                    >
                                        <span className='help-hint-title'>上传文件</span>
                                    </Upload>
                                    <Divider style={{margin: "0 5px"}} type="vertical"/>
                                    <Upload
                                        directory
                                        multiple={false}
                                        maxCount={1}
                                        showUploadList={false}
                                        beforeUpload={(f) => {
                                            before(f)
                                            return false
                                        }}
                                    >
                                        <span className='help-hint-title'>上传文件夹</span>
                                    </Upload>
                                </div>
                            ),
                            name: ["originParams", `${index}`, "Value"],
                            rules: [{
                                validator: async (rule, value) => {
                                    if (required && (value || []).length === 0) throw new Error('该参数为必填项!')
                                }
                            }],
                        }}
                        input={{
                            isBubbing: true,
                            setValue: (value) => {
                                originParams[index].Value = value
                                setOriginParams([...originParams])
                                form.setFieldsValue({originParams: {...originParams}})
                            },
                            value: i.Value,
                            placeholder: "获取文件路径，支持多选文件，文件夹，路径以逗号分隔",
                            disabled: disabled
                        }}
                        textarea={{
                            isBubbing: true,
                            setValue: (value) => {
                                originParams[index].Value = value
                                setOriginParams([...originParams])
                                form.setFieldsValue({originParams: {...originParams}})
                            },
                            rows: 1,
                            value: i.Value,
                            placeholder: "获取文件路径，支持多选文件，文件夹，路径以逗号分隔",
                            disabled: disabled
                        }}
                    />
                </Spin>
            )
        }

        if (i.TypeVerbose === "select") {
            return (
                <ItemSelects
                    key={key}
                    item={{
                        style: {marginBottom: 8, ...formItemStyle},
                        labelCol: {span: 6},
                        label: (
                            <Space size={2}>
                                <>{i.FieldVerbose ? `${i.FieldVerbose}` : `${i.Field}`}</>
                                {i.Help && (
                                    <Tooltip title={i.Help}>
                                        <Button icon={<QuestionOutlined/>} type={"link"} size={"small"}/>
                                    </Tooltip>
                                )}
                            </Space>
                        ),
                        name: ["originParams", `${index}`, "Value"],
                        required: required,
                        rules: [{
                            validator: async (rule, value) => {
                                if (required && (value || []).length === 0) throw new Error('该参数为必填项!')
                            }
                        }],
                    }}
                    select={{
                        tokenSeparators: [","],
                        allowClear: true,
                        data: extraSetting.data || [],
                        optText: "key",
                        value: (`${i.Value}` || "").split(",").filter(i => !!i),
                        setValue: (value) => {
                            originParams[index].Value = value
                            setOriginParams([...originParams])
                            form.setFieldsValue({originParams: {...originParams}})
                        },
                        mode: !!extraSetting.double ? 'tags' : undefined,
                        maxTagCount: !!extraSetting.double ? 'responsive' : undefined,
                        disabled: disabled
                    }}
                />
            )
        }
        return <div style={{height: 0}}></div>
    }

    const setHideGroup = (group: string, hidden: boolean) => {
        let newGroups: { group: string, hidden: boolean }[] = [
            ...groupStates.filter(i => i.group !== group),
            {group, hidden: hidden}];

        setGroupStates(newGroups)
    };

    const submit = () => {
        if (props.onClearData) props.onClearData()

        let params = originParams.filter(i => {
            // 处理 Bool 的情况
            if (isBoolean(i.TypeVerbose)) {
                return !!i.Value
            }

            // 真实的为空值
            if (!(i.Value || i.DefaultValue)) {
                if (i.Required) {
                    i.Value = `${i.TypeVerbose}_undefined`
                    return true
                } else {
                    return false
                }
            }

            // 处理其他参数的情况
            return true
        })
        const finalParams = params.map(i => {
            return {Key: i.Field, Value: i.Value || i.DefaultValue}
        });

        if (props.saveDebugParams) {
            setRemoteValue(YAKIT_PLUGIN_DEBUG_PARAMS, JSON.stringify(finalParams))
        }

        props.onParamsConfirm(finalParams)
    }

    const isGroupHidden = useMemoizedFn((group: string, defaultValue: boolean) => {
        if (group === "default") return false

        let res = defaultValue;
        groupStates.filter(i => i.group === group).forEach(i => {
            res = i.hidden
        })
        return res;
    })

    const renderExtraParams = (defaultExpand?: boolean) => {
        return <>
            {
                (extraGroup.length <= 1 && extraGroup.length > 0) ? <>
                    {/*<Title level={5} style={{fontSize: 14}}>*/}
                    {/*    <Space>*/}
                    {/*    <span>*/}
                    {/*        默认参数组*/}
                    {/*        </span>*/}
                    {/*        <Switch*/}
                    {/*            size={"small"}*/}
                    {/*            defaultChecked={!isGroupHidden("default", !defaultExpand)}*/}
                    {/*            onChange={(res) => {*/}
                    {/*                setHideGroup('default', !res)*/}
                    {/*            }}*/}
                    {/*        />*/}
                    {/*    </Space>*/}
                    {/*</Title>*/}
                    {!isGroupHidden(extraGroup[0] || "default", !defaultExpand) && <>
                        {(groupToParams.current.get(extraGroup[0] || "default") || []).map((i: YakScriptParam, index) => {
                            if (newParamCom.includes(i.TypeVerbose)) return yakScriptParamToNewNode(i, false, `defaultParamsGroup-${index}`, !!props.loading)
                            else return yakScriptParamToNode(i, false, `defaultParamsGroup-${index}`, !!props.loading)
                        })}
                    </>}
                </> : <>
                    {extraGroup.map((i, index) => {
                        if ((groupToParams.current.get(i) || []).length <= 0) {
                            return <></>
                        }
                        return <div key={`${index}`}>
                            <Title level={5} style={{fontSize: 14}}>
                                <Space>
                                    <span>
                                    参数组：{i}
                                    </span>
                                    <Switch
                                        size={"small"}
                                        checked={!isGroupHidden(i, !defaultExpand)}
                                        onChange={(res) => setHideGroup(i, !res)}
                                    />
                                </Space>
                            </Title>
                            {!isGroupHidden(i, !defaultExpand) && <>
                                {(groupToParams.current.get(i) || []).map((i: YakScriptParam, index) => {
                                    if (newParamCom.includes(i.TypeVerbose)) return yakScriptParamToNewNode(i, false, `paramsGroup-${index}`, !!props.loading)
                                    else return yakScriptParamToNode(i, false, `paramsGroup-${index}`, !!props.loading)
                                })}
                            </>}
                        </div>
                    })}
                </>
            }
        </>
    }

    if (props.primaryParamsOnly) {
        return (
            <Form
                form={form}
                onFinish={(value) => {
                    form.validateFields()
                        .then(values => submit())
                }}
                // onSubmitCapture={(e) => {
                //     e.preventDefault()
                //     // submit()
                // }}
                {...{labelCol: {span: 7}, wrapperCol: {span: 15}}}
            >
                {requiredParams.length > 0 ? (
                    <>
                        <div style={{marginTop: 0}}>
                            {requiredParams.map((i, index) => {
                                if (newParamCom.includes(i.TypeVerbose)) return yakScriptParamToNewNode(i, true, `params-${index}`, !!props.loading)
                                else return yakScriptParamToNode(i, true, `params-${index}`, !!props.loading)
                            })}
                        </div>
                        <Form.Item
                            label={" "}
                            colon={false}
                            style={{width: "100%", textAlign: "right"}}
                            labelCol={{span: 6}}
                        >
                            <Space>
                                {!props.hideClearButton && (
                                    <Button
                                        type={"link"}
                                        size={"small"}
                                        danger={true}
                                        onClick={() => {
                                            if (props.onClearData) props.onClearData()
                                        }}
                                    >
                                        清除缓存
                                    </Button>
                                )}
                                {groupToParams.current.size > 0 &&
                                (groupToParams.current.size === 1 &&
                                (groupToParams.current.get("default") || []).length <= 0 ? (
                                    ""
                                ) : (
                                    <Popover
                                        title={"设置额外参数"}
                                        trigger={"click"}
                                        content={<div style={{width: 700}}>{renderExtraParams(true)}</div>}
                                    >
                                        <Button size={"small"} type={"link"}>
                                            额外参数
                                        </Button>
                                    </Popover>
                                ))}
                                {props.loading ? (
                                    <Button
                                        style={{width: 120}}
                                        danger={true}
                                        onClick={() => {
                                            if (props.onCanceled) props.onCanceled()
                                        }}
                                        type={"primary"}
                                    >
                                        {props.cancelVerbose ? props.cancelVerbose : "停止任务"}
                                    </Button>
                                ) : (
                                    <Button style={{width: 120}} htmlType={"submit"} type={"primary"}>
                                        {props.submitVerbose ? props.submitVerbose : "启动任务"}
                                    </Button>
                                )}
                            </Space>
                        </Form.Item>
                    </>
                ) : (
                    <>
                        <Form.Item style={{width: "100%", textAlign: "right"}}>
                            <Space>
                                {props.loading ? (
                                    <Button
                                        style={{width: 200}}
                                        danger={true}
                                        onClick={() => {
                                            if (props.onCanceled) props.onCanceled()
                                        }}
                                        type={"primary"}
                                    >
                                        停止任务
                                    </Button>
                                ) : (
                                    <Button style={{width: 200}} htmlType={"submit"} type={"primary"}>
                                        启动任务
                                    </Button>
                                )}
                                {groupToParams.current.size > 0 && (
                                    <Popover
                                        title={"设置额外参数"}
                                        trigger={"click"}
                                        content={<div style={{width: 700}}>{renderExtraParams(true)}</div>}
                                    >
                                        <Button size={"small"} type={"link"}>
                                            额外参数
                                        </Button>
                                    </Popover>
                                )}
                            </Space>
                        </Form.Item>
                    </>
                )}
            </Form>
        )
    }

    return <div style={{
        marginLeft: props.styleSize === "big" ? 80 : undefined,
        marginRight: props.styleSize === "big" ? 100 : undefined,
    }}>
        <Card title={""} bodyStyle={{padding: 0}} bordered={false}>
            <Form
                onSubmitCapture={e => {
                    e.preventDefault()
                    submit()
                }}
                {...(props.styleSize !== "big" ? {
                    labelCol: {span: 7}, wrapperCol: {span: 14}
                } : {
                    layout: "vertical",
                })}
            >
                {/* 设置基础必须的参数，剩下其他参数不一定是必须的*/}
                {requiredParams.length > 0 && <>
                    <Title level={5} style={{fontSize: 14}}>
                        <Space>
                        <span>
                        必要参数
                        </span>
                            <Tooltip title={'执行该脚本不可或缺的参数 / Necessary Params'}>
                                <Button icon={<QuestionOutlined/>} type={"link"} size={"small"}/>
                            </Tooltip>
                        </Space>
                    </Title>
                    {requiredParams.map((i, index) => {
                        if (newParamCom.includes(i.TypeVerbose)) return yakScriptParamToNewNode(i, true, `params-${index}`, !!props.loading)
                        else return yakScriptParamToNode(i, true, `params-${index}`, !!props.loading)
                    })}
                </>}
                {renderExtraParams()}
                {originParams.length <= 0 && <Form.Item label={" "} colon={false}>
                    <h2>本模块无需设置额外参数</h2>
                </Form.Item>}
                <Form.Item colon={false} label={" "}>
                    <Button type="primary" loading={!!props.loading}
                            htmlType="submit"> {props.submitVerbose ? props.submitVerbose : "提交已设置的参数"} </Button>
                </Form.Item>
            </Form>
        </Card>
    </div>
};

export interface TypeVerboseToInputProp {
    TypeVerbose: string
    value: string | boolean | number
    placeholder?: string
    defaultValue?: string
    setValue: (s: string | boolean | number) => any
    data?: { value: any, label: string }[]
    baseRequired?: boolean
    disabled?: boolean
}

export const TypeVerboseToInput: React.FC<TypeVerboseToInputProp> = (props) => {
    useEffect(() => {
        props.setValue(props.value)
    }, [])

    switch ((props.TypeVerbose).toLowerCase()) {
        case "int":
        case "integer":
            return <InputNumber
                required={!!props.baseRequired}
                value={props.value as number} onChange={e => props.setValue(e)}
                step={1}
                disabled={!!props.disabled}
            />
        case "uint":
            return <InputNumber
                step={1} min={1}
                required={!!props.baseRequired}
                value={props.value as number} onChange={e => props.setValue(e)}
                disabled={!!props.disabled}
            />
        case "float":
        case "float32":
        case "float64":
        case "double":
            return <InputNumber
                required={!!props.baseRequired}
                value={props.value as number} onChange={e => props.setValue(e)}
                step={0.1}
                disabled={!!props.disabled}
            />
        case "bool":
        case "boolean":
            return <Switch checked={props.value as boolean} disabled={!!props.disabled} onChange={props.setValue}/>
        case "textarea":
        case "text":
            return <Input.TextArea
                value={props.value as string} rows={3}
                onChange={e => {
                    props.setValue(e.target.value)
                }} placeholder={props.placeholder}
                required={!!props.baseRequired}
                disabled={!!props.disabled}
            />
        case "http-packet":
            return <div style={{height: 300, width: "100%"}}>
                <HTTPPacketEditor
                    noHeader={true} noHex={true}
                    originValue={new Buffer((props?.value || "") as string)}
                    onChange={i => {
                        props.setValue(i.toString())
                    }}
                />
            </div>
        case "yak":
            return <div style={{height: 300, width: "100%"}}>
                <YakCodeEditor
                    originValue={Buffer.from(`${props.value || ""}`, "utf8")}
                    onChange={i => {
                        props.setValue(i.toString())
                    }}
                />
            </div>
        case "str":
        case "string":
        default:
            return <Input
                value={props.value as string}
                onChange={e => {
                    props.setValue(e.target.value)
                }} placeholder={props.placeholder}
                required={!!props.baseRequired}
                disabled={!!props.disabled}
            />
    }
};

const isBoolean = (typeVerbose: string) => {
    switch (typeVerbose.toLowerCase()) {
        case "bool":
        case "boolean":
            return true
        default:
            return false
    }
}