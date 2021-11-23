import React, {useEffect, useState} from "react";
import {YakScript, YakScriptParam} from "./schema";
import {Button, Card, Divider, Form, Input, InputNumber, Space, Switch, Tooltip} from "antd";
import {QuestionOutlined} from "@ant-design/icons";
import {YakExecutorParam} from "./YakExecutorParams";

export interface YakScriptParamsSetterProps extends YakScript {
    params: YakExecutorParam[]
    onParamsConfirm: (params: YakExecutorParam[]) => any
    submitVerbose?: string

    styleSize?: "big" | "small"
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
    const [groupStates, setGroupStates] = useState<{ group: string, hidden: boolean }[]>([]);

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

    const groupToParams = new Map<string, YakScriptParam[]>();
    const extraGroup: string[] = [];
    originParams.forEach((k) => {
        const group = k.Required ? "required" : (k.Group || "default");
        if (group !== "required" && !extraGroup.includes(group)) {
            extraGroup.push(group)
        }

        let params: YakScriptParam[] | undefined = groupToParams.get(group)
        if (params === undefined) {
            groupToParams.set(group, [])
            params = groupToParams.get(group)
        }
        if (params) params.push(k)
    })
    const requiredParams: YakScriptParam[] = groupToParams.get("required") || [];

    const yakScriptParamToNode = (i: YakScriptParam, required: boolean,key:string) => {
        return <Form.Item
            key={key}
            style={{marginBottom: i.Help ? undefined : 8}}
            label={<Space size={2}>
                <>{i.FieldVerbose && `${i.FieldVerbose}/`}{i.Field}</>
                {i.Help && <Tooltip title={i.Help}>
                    <Button icon={<QuestionOutlined/>} type={"link"} size={"small"}/>
                </Tooltip>}
            </Space>}
            // help={i.Help || undefined}
            required={required}
        >
            <TypeVerboseToInput
                required={required}
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
    }

    const setHideGroup = (group: string, hidden: boolean) => {
        let newGroups: { group: string, hidden: boolean }[] = [
            ...groupStates.filter(i => i.group !== group),
            {group, hidden: hidden}];

        setGroupStates(newGroups)
    };
    const isGroupHidden = (group: string, defaultValue: boolean) => {
        let res = defaultValue;
        groupStates.filter(i => i.group === group).forEach(i => {
            res = i.hidden
        })
        return res;
    }

    return <div style={{
        marginLeft: props.styleSize === "big" ? 80 : undefined,
        marginRight: props.styleSize === "big" ? 100 : undefined,
    }}>
        <Card title={""} bodyStyle={{padding: 0}} bordered={false}>
            <Form
                onSubmitCapture={e => {
                    e.preventDefault()
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
                    props.onParamsConfirm(params.map(i => {
                        return {Key: i.Field, Value: i.Value || i.DefaultValue}
                    }))
                }}
                {...(props.styleSize !== "big" ? {
                    labelCol: {span: 7}, wrapperCol: {span: 14}
                } : {
                    layout: "vertical",
                })}
            >
                {/* 设置基础必须的参数，剩下其他参数不一定是必须的*/}
                {requiredParams.length > 0 && <>
                    <Divider orientation={"left"} style={{fontSize: 14}}>
                        <Space>
                            <span>
                            必要参数
                            </span>
                            <Tooltip title={'执行该脚本不可或缺的参数 / Necessary Params'}>
                                <Button icon={<QuestionOutlined/>} type={"link"} size={"small"}/>
                            </Tooltip>
                        </Space>
                    </Divider>
                    {requiredParams.map((i,index) => yakScriptParamToNode(i, true,`params-${index}`))}
                </>}
                {extraGroup.length <= 1 ? <>
                    <Divider orientation={"left"} style={{fontSize: 14}}>
                        <Space>
                            <span>
                            默认参数组
                            </span>
                            <Switch
                                checked={!isGroupHidden("default", false)}
                                onChange={(res) => {
                                    setHideGroup('default', !res)
                                }}
                            />
                        </Space>
                    </Divider>
                    {!isGroupHidden("default", false) && <>
                        {(groupToParams.get("default") || []).map((i: YakScriptParam,index) => yakScriptParamToNode(i, false,`defaultParamsGroup-${index}`))}
                    </>}
                </> : <>
                    {extraGroup.map((i,index) => {
                        if ((groupToParams.get(i) || []).length <= 0) {
                            return <></>
                        }
                        return <div key={`${index}`}>
                            <Divider orientation={"left"} style={{fontSize: 14}}>
                                <Space>
                                    <span>
                                    参数组：{i}
                                    </span>
                                    <Switch
                                        size={"small"}
                                        checked={!isGroupHidden(i, true)}
                                        onChange={(res) => {
                                            setHideGroup(i, !res)
                                        }}
                                    />
                                </Space>
                            </Divider>
                            {!isGroupHidden(i, true) && <>
                                {(groupToParams.get(i) || []).map((i: YakScriptParam,index) => yakScriptParamToNode(i, false,`paramsGroup-${index}`))}
                            </>}
                        </div>
                    })}
                </>}
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
    required?: boolean
}

export const TypeVerboseToInput: React.FC<TypeVerboseToInputProp> = (props) => {
    useEffect(() => {
        props.setValue(props.value)
    }, [])

    switch ((props.TypeVerbose).toLowerCase()) {
        case "int":
        case "integer":
            return <InputNumber
                required={props.required}
                value={props.value as number} onChange={e => props.setValue(e)}
                step={1}
            />
        case "uint":
            return <InputNumber
                step={1} min={1}
                required={props.required}
                value={props.value as number} onChange={e => props.setValue(e)}
            />
        case "float":
        case "float32":
        case "float64":
        case "double":
            return <InputNumber
                required={props.required}
                value={props.value as number} onChange={e => props.setValue(e)}
                step={0.1}
            />
        case "bool":
        case "boolean":
            return <Switch checked={props.value as boolean} onChange={props.setValue}/>
        case "textarea":
            return <Input.TextArea
                value={props.value as string} rows={5}
                onChange={e => {
                    props.setValue(e.target.value)
                }} placeholder={props.placeholder}
                required={props.required}
            />
        case "str":
        case "string":
        default:
            return <Input
                value={props.value as string}
                onChange={e => {
                    props.setValue(e.target.value)
                }} placeholder={props.placeholder}
                required={props.required}
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