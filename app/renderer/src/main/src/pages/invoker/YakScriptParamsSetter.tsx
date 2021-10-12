import React, {useEffect, useState} from "react";
import {YakScript, YakScriptParam} from "./schema";
import {Button, Card, Empty, Form, Input, InputNumber, Space, Switch, Tag, Tooltip} from "antd";
import {QuestionOutlined} from "@ant-design/icons";
import {YakExecutorParam} from "./YakExecutorParams";
import {SelectOne} from "../../utils/inputUtil";

export interface YakScriptParamsSetterProps extends YakScript {
    params: YakExecutorParam[]
    onParamsConfirm: (params: YakExecutorParam[]) => any
    submitVerbose?: string
}

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
    const [originParams, setOriginParams] = useState<YakScriptParam[]>(props.Params || []);

    useEffect(() => {
        setOriginParams(props.Params)
    }, [props.Params])

    useEffect(() => {
        if ((props.params || []).length > 0) {
            originParams.forEach(e => {
                for (let i = 0; i < props.params.length; i++) {
                    const {Key, Value} = props.params[i];
                    if (e.Field === Key) {
                        e.Value = Value
                        break
                    }
                }
            })
            setOriginParams([...originParams])
        }
    }, [props.params])

    return <div>
        <Card title={""} bodyStyle={{padding: 0}} bordered={false}>
            <Form onSubmitCapture={e => {
                e.preventDefault()
                let params = originParams.filter(i => {
                    if (!i.Value) {
                        return !isBoolean(i.TypeVerbose)
                    }
                    return true
                })
                props.onParamsConfirm(params.map(i => {
                    return {Key: i.Field, Value: i.Value || i.DefaultValue}
                }))
            }} labelCol={{span: 7}} wrapperCol={{span: 14}}>
                {
                    originParams.map(i => {
                        return <Form.Item
                            style={{marginBottom: i.Help ? undefined : 8}}
                            label={<Space size={2}>
                                <>{i.FieldVerbose && `${i.FieldVerbose}/`}{i.Field}</>
                                {i.Help && <Tooltip title={i.Help}>
                                    <Button icon={<QuestionOutlined/>} type={"link"} size={"small"}/>
                                </Tooltip>}
                            </Space>}
                            help={i.Help || undefined}
                        >
                            <TypeVerboseToInput
                                TypeVerbose={i.TypeVerbose}
                                value={i.Value || i.DefaultValue}
                                placeholder={i.DefaultValue}
                                defaultValue={i.DefaultValue}
                                setValue={value => {
                                    originParams.forEach(e => {
                                        if (e.Field === i.Field) {
                                            e.Value = value
                                        }
                                    });
                                    setOriginParams([...originParams])
                                }}
                            />
                        </Form.Item>
                    })
                }
                {originParams.length <= 0 && <Form.Item label={" "} colon={false}>
                    <h2>本模块无需设置额外参数</h2>
                </Form.Item>}
                <Form.Item colon={false} label={" "}>
                    <Button type="primary"
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
}

export const TypeVerboseToInput: React.FC<TypeVerboseToInputProp> = (props) => {
    useEffect(() => {
        props.setValue(props.value)
    }, [])

    switch ((props.TypeVerbose).toLowerCase()) {
        case "int":
        case "integer":
            return <InputNumber
                value={props.value as number} onChange={e => props.setValue(e)}
                step={1}
            />
        case "uint":
            return <InputNumber
                step={1} min={1}
                value={props.value as number} onChange={e => props.setValue(e)}
            />
        case "float":
        case "float32":
        case "float64":
        case "double":
            return <InputNumber
                value={props.value as number} onChange={e => props.setValue(e)}
                step={0.1}
            />
        case "bool":
        case "boolean":
            return <Switch checked={props.value as boolean} onChange={props.setValue}/>
        case "str":
        case "string":
        default:
            return <Input
                value={props.value as string}
                onChange={e => {
                    props.setValue(e.target.value)
                }} placeholder={props.placeholder}
                required={true}
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