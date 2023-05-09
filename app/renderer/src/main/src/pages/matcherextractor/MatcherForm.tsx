import React, {useEffect, useState} from "react";
import {Collapse, Form, Space, Tag} from "antd";
import {InputItem, SelectOne} from "@/utils/inputUtil";
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {failed} from "@/utils/notification";
import {AutoCard} from "@/components/AutoCard";

export interface MatcherFormProp {
    onExecute: (condition: "or" | "and", matchers: MatcherItem[]) => void
    onChange?: (condition: "or" | "and", matchers: MatcherItem[]) => void
}

export interface MatcherItem {
    MatcherType: string
    ExprType: "nuclei-dsl" | any
    Scope: string
    Group: string[]
    Condition: string
    Negative: boolean
}

const isMatcherItemEmpty = (i: MatcherItem) => {
    return (i?.Group || []).map(i => i.trim()).join("") === ""
}

const matcherTypeVerbose = name => {
    switch (name) {
        case "word":
        case "keyword":
            return "关键字"
        case "re":
        case "regex":
        case "regexp":
            return "正则表达式"
        case "status_code":
        case "status":
            return "状态码"
        case "hex":
        case "binary":
            return "十六进制数据"
        case "nuclei-dsl":
            return "表达式"
        default:
            return name
    }
}

const defaultMatcherItem = () => {
    return {
        MatcherType: "word",
        ExprType: "nuclei-dsl",
        Scope: "body",
        Group: [""],
        Condition: "and",
        Negative: false,
    }
}

const {ipcRenderer} = window.require("electron");

export const MatcherForm: React.FC<MatcherFormProp> = (props) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [matchers, setMatchers] = useState<MatcherItem[]>([defaultMatcherItem(), defaultMatcherItem()]);
    const [totalCondition, setTotalCondition] = useState<"or" | "and">("and");

    useEffect(() => {
        if (matchers.length === 0) {
            failed("匹配器不能为空")
            setMatchers([defaultMatcherItem()])
            return
        }

        if (props.onChange) {
            props.onChange(totalCondition, matchers)
        }
    }, [matchers, totalCondition]);

    return <AutoCard
        title={<Space>
            匹配器 {matchers.length > 1 && <Space>
            <div>[total:{matchers.length}]</div>
            <div><SelectOne
                oldTheme={false}
                formItemStyle={{margin: 0}}
                data={[
                    {value: "and", text: "and"},
                    {value: "or", text: "or"},
                ]}
                value={totalCondition}
                setValue={setTotalCondition}
            /></div>
        </Space>}
        </Space>}
        size={"small"}
        bodyStyle={{padding: 0, overflow: "auto"}}
        style={{padding: 0}}
        headStyle={{marginBottom: 2}}
        extra={<Space>
            <YakitButton
                type={"outline1"}
                onClick={() => {
                    if (matchers.filter(i => isMatcherItemEmpty(i)).length > 0) {
                        failed("已有空匹配器条件")
                        return
                    }
                    setMatchers([...matchers, defaultMatcherItem()])
                }}
            >添加条件</YakitButton>
            <YakitButton onClick={() => {
                if (matchers.filter(i => !isMatcherItemEmpty(i)).length === 0) {
                    failed("所有匹配条件均为空，请先设置条件")
                    return
                }
                props.onExecute(totalCondition, matchers)
            }}>执行规则</YakitButton>
        </Space>}
    >
        <Collapse
            bordered={false}
            activeKey={currentIndex}
            onChange={(key) => {
                if (!key) {
                    return
                }
                if (typeof key === "string") {
                    setCurrentIndex(Number(key))
                    return
                }
            }}
            accordion={true}
            defaultActiveKey={0}>
            {matchers.map((origin, matcherIndex) => {
                const isEmpty = isMatcherItemEmpty(origin)
                return <Collapse.Panel
                    style={{backgroundColor: "#f5f5f5", marginBottom: 12}}
                    header={<div>
                        ID[{matcherIndex}]: 类型[{origin.Negative ? "!" : ""}{matcherTypeVerbose(origin.MatcherType)}]
                        {isEmpty ?
                            <Tag style={{marginLeft: 8}} color={"red"}>暂未设置条件</Tag>
                            : <span> - 已设置{
                                origin.Group.length > 1 ?
                                    `[${origin.Condition}]` :
                                    ''
                            }：{origin.Group.length}组</span>}
                    </div>}
                    key={matcherIndex} collapsible={currentIndex === matcherIndex ? "header" : undefined}
                    extra={<>
                        <YakitButton type={"danger"} onClick={() => {
                            setMatchers([...matchers.filter((_, index) => index !== matcherIndex)])
                        }}>移除</YakitButton>
                    </>}
                >
                    {currentIndex === matcherIndex &&
                        <MatcherItemForm matcher={origin} onMatcherChange={(data: MatcherItem) => {
                            setMatchers([...matchers.map((origin, index) => {
                                if (index === currentIndex) {
                                    return data
                                }
                                return origin
                            })])
                        }}/>}
                    {currentIndex !== matcherIndex && <Tag onClick={() => {
                        setCurrentIndex(matchers.indexOf(origin))
                    }}>MatcherIndex: {matchers.indexOf(origin)}</Tag>}

                </Collapse.Panel>
            })}
        </Collapse>
    </AutoCard>
};

interface MatcherItemFormProp {
    matcher: MatcherItem
    onMatcherChange: (matcher: MatcherItem) => any
}

const MatcherItemForm: React.FC<MatcherItemFormProp> = (props) => {
    const [params, setParams] = useState(props.matcher)

    useEffect(() => {
        if (!params) {
            return
        }
        if (params.Group.length === 0) {
            failed("至少要有一个组数据项")
            setParams({...params, Group: [""]})
        }
        props.onMatcherChange(params)
    }, [params])

    return <Form
        labelCol={{span: 5}} wrapperCol={{span: 14}}
    >
        <SelectOne
            label={"匹配类型"}
            oldTheme={false}
            data={[
                {text: "关键字", value: "word"},
                {text: "正则表达式", value: "regex"},
                {text: "状态码", value: "status_code"},
                {text: "十六进制", value: "binary"},
                {text: "表达式", value: "nuclei-dsl"},
            ]}
            setValue={MatcherType => setParams({...params, MatcherType})} value={params.MatcherType}
        />
        <SelectOne
            label={"匹配位置"}
            oldTheme={false}
            data={[
                {text: "状态码", value: "status_code"},
                {text: "响应头", value: "all_headers"},
                {text: "响应体", value: "body"},
                {text: "全部响应", value: "raw"},
            ]}
            setValue={Scope => setParams({...params, Scope})} value={params.Scope}
        />
        {params.Group.map((data, index) => {
            return <InputItem
                required={true}
                label={`Data_${index}`}
                value={data}
                setValue={value => {
                    const newGroup = params.Group;
                    newGroup[index] = value;
                    setParams({...params, Group: [...newGroup]})
                }}
                help={<Space>
                    <YakitButton
                        onClick={() => {
                            const newGroup = params.Group;
                            newGroup.splice(index, 1);
                            setParams({...params, Group: [...newGroup]})
                        }}
                        type={"danger"} danger={true}
                    >移除该项</YakitButton>
                    {index === params.Group.length - 1 && <YakitButton onClick={() => {
                        setParams({...params, Group: [...params.Group, ""]})
                    }} type={"outline1"}>添加一个新条件</YakitButton>}
                </Space>}
            />
        })}
        <SelectOne
            oldTheme={false}
            label={"条件关系"}
            data={[
                {text: "AND", value: "and"},
                {text: "OR", value: "or"},
            ]}
            setValue={Condition => setParams({...params, Condition})} value={params.Condition}
        />
        <Form.Item label={"不匹配（取反）"}>
            <YakitSwitch checked={params.Negative} onChange={e => setParams({...params, Negative: e})}/>
        </Form.Item>
    </Form>
};