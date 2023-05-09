import React, {useEffect, useState} from "react";
import {AutoCard} from "@/components/AutoCard";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {Collapse, Form, Space, Tag} from "antd";
import {failed} from "@/utils/notification";
import {InputInteger, InputItem, SelectOne} from "@/utils/inputUtil";

export interface ExtractorFormProp {
    onChange?: (extractors: ExtractorItem[]) => any
    onExecute?: (extractors: ExtractorItem[]) => any
}

export interface ExtractorItem {
    Name?: string
    Type: "regex" | "xpath" | "kval" | "json" | "nuclei-dsl"
    Scope: "body" | "header" | "raw"
    Groups: string[]
    RegexpMatchGroup?: number[]
    XPathAttribute?: string
}

const extractorNameVerbose = name => {
    switch (name) {
        case "regex":
            return "正则表达式"
        case "xpath":
            return "XPath"
        case "kval":
            return "键值对"
        case "json":
            return "JQ(*)"
        case "nuclei-dsl":
            return "表达式"
        default:
            return name
    }
}

const isExtractorEmpty = (item: ExtractorItem) => {
    return (item?.Groups || []).map(i => i.trim()).join("") === "";
}
export const ExtractorForm: React.FC<ExtractorFormProp> = (props) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [extractors, setExtractors] = useState<ExtractorItem[]>([
        {Type: "regex", Scope: "raw", Groups: [""]},
    ]);

    useEffect(() => {
        if (extractors.length === 0) {
            failed("提取器不能为空")
            setExtractors([{Type: "regex", Scope: "raw", Groups: [""]}])
            return
        }

        if (props.onChange) {
            props.onChange(extractors)
        }

    }, [extractors])

    return <AutoCard
        title={<div>
            数据提取器
        </div>}
        size={"small"} bodyStyle={{overflow: "auto", padding: 0}}
        extra={<Space>
            <YakitButton
                type={"outline1"}
                onClick={() => {
                    if (extractors.filter(i => isExtractorEmpty(i)).length > 0) {
                        failed("已有空提取器")
                        return
                    }
                    setExtractors([...extractors, {Type: "regex", Scope: "raw", Groups: [""]}])
                }}
            >添加条件</YakitButton>
            {props.onExecute && <YakitButton onClick={() => {
                if (extractors.filter(i => !isExtractorEmpty(i)).length <= 0) {
                    failed("没有有效提取器（都为空）")
                    return
                }

                if (props.onExecute) {
                    props.onExecute(extractors)
                }
            }}>提取内容</YakitButton>}
        </Space>}
    >
        <Form
            labelCol={{span: 5}} wrapperCol={{span: 14}}
        >
            <Collapse
                bordered={false}
                activeKey={currentIndex}
                onChange={key => {
                    if (!key) {
                        return
                    }

                    if (typeof key === "string") {
                        setCurrentIndex(Number(key))
                        return
                    }
                }}
                accordion={true}
                defaultActiveKey={0}
            >
                {extractors.map((origin, extractorIndex) => {
                    const isEmpty = isExtractorEmpty(origin)
                    return <Collapse.Panel
                        style={{backgroundColor: "#f5f5f5", marginBottom: 12}}
                        key={extractorIndex} collapsible={extractorIndex === currentIndex ? "header" : undefined}
                        header={<Space>
                            <div>ID[{extractorIndex}]: 类型[{origin.Type}]</div>
                            {isEmpty && <Tag color={"red"}>空提取器</Tag>}
                        </Space>}
                        extra={<>
                            <YakitButton type={"danger"} onClick={() => {
                                setExtractors([...extractors.filter((_, index) => index !== extractorIndex)])
                            }}>移除</YakitButton>
                        </>}
                    >
                        {currentIndex === extractorIndex &&
                            <ExtractorItemForm extractor={origin} onExtractorChange={data => {
                                setExtractors([...extractors.map((item, index) => {
                                    if (index === extractorIndex) {
                                        return data
                                    }
                                    return item
                                })])
                            }}/>}
                    </Collapse.Panel>
                })}
            </Collapse>
        </Form>
    </AutoCard>
};

interface ExtractorItemFormProp {
    extractor: ExtractorItem
    onExtractorChange: (item: ExtractorItem) => any
}

const ExtractorItemForm: React.FC<ExtractorItemFormProp> = (props) => {
    const [params, setParams] = useState(props.extractor)

    useEffect(() => {
        if (!params) {
            return
        }

        if (params.Groups.length === 0) {
            failed("至少要有一个提取数据项")
            setParams({...params, Groups: [""]})
        }
        props.onExtractorChange(params)
    }, [params])

    return <Form
        labelCol={{span: 5}} wrapperCol={{span: 14}}
        size={"small"}
    >
        <SelectOne
            oldTheme={false}
            label={"提取类型"}
            data={[
                "regex", "xpath", "kval", "json", "nuclei-dsl"
            ].map(i => {
                return {value: i, text: extractorNameVerbose(i)}
            })}
            setValue={Type => setParams({...params, Type})} value={params.Type}
        />
        <SelectOne
            oldTheme={false}
            label={"提取范围"}
            data={["body", "header", "raw"].map(i => {
                return {value: i, text: i}
            })}
            setValue={Scope => setParams({...params, Scope})} value={params.Scope}
        />
        {params.Groups.map((data, index) => {
            return <InputItem
                required={true}
                label={`Data_${index}`}
                value={data}
                setValue={value => {
                    const Groups = [...params.Groups]
                    Groups[index] = value
                    setParams({...params, Groups})
                }}
                help={<Space>
                    <YakitButton type={"danger"} onClick={() => {
                        setParams({...params, Groups: [...params.Groups.filter((_, i) => i !== index)]})
                    }}>移除该项</YakitButton>
                    {index === params.Groups.length - 1 && <YakitButton onClick={() => {
                        setParams({...params, Groups: [...params.Groups, ""]})
                    }}>新建提取内容</YakitButton>}
                </Space>}
            />
        })}
        {params.Type === 'xpath' && <InputItem
            label={"XPath 参数"}
            setValue={XPathAttribute => setParams({...params, XPathAttribute})} value={params.XPathAttribute}
            help={"可选，用来匹配 xml 或 html 中的标签参数"}
        />}
        {params.Type === 'regex' && <InputInteger
            label={"匹配正则分组"}
            setValue={RegexpMatchGroup => {
                if (RegexpMatchGroup > 0) {
                    setParams({...params, RegexpMatchGroup: [RegexpMatchGroup]})
                }
            }}
            min={0}
            value={
                params?.RegexpMatchGroup ? params.RegexpMatchGroup[0] : 0
            }
            help={`(go正则风格)可选，指定正则中分组匹配`}
        />}
    </Form>
};