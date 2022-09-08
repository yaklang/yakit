import React, {useEffect, useState} from "react";
import {AutoCard} from "../../components/AutoCard";
import {Button, Checkbox, Form, List, Space, Table, Typography} from "antd";
import {failed, info} from "../../utils/notification";
import {InputInteger, InputItem, ManyMultiSelectForString, ManySelectOne, SwitchItem} from "../../utils/inputUtil";
import {showDrawer, showModal} from "../../utils/showModal";
import {MITMContentReplacerExport} from "./MITMContentReplacerImport";
import {randomString} from "../../utils/randomUtil";

export interface MITMContentReplacerProp {
    rules: MITMContentReplacerRule[]
    onSaved: (i: MITMContentReplacerRule[]) => any
}

export interface MITMContentReplacerRule {
    // 文本字符串，正则/Re2/字符串硬匹配
    Index: number
    Rule: string
    NoReplace: boolean
    Result: string
    Color: "red" | "blue" | "green" | "grey" | "purple" | "yellow" | "orange" | "cyan"
    EnableForRequest: boolean
    EnableForResponse: boolean
    EnableForBody: boolean
    EnableForHeader: boolean
    ExtraTag: string[]
    Disabled: boolean
    VerboseName: string
}

const {Text} = Typography;

const {ipcRenderer} = window.require("electron");

export const MITMContentReplacer: React.FC<MITMContentReplacerProp> = (props) => {
    const [rules, setRules] = useState<MITMContentReplacerRule[]>(props.rules);
    const [allowSaved, setAllowSaved] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!allowSaved) {
            return
        }
        setLoading(true)
        ipcRenderer.invoke("mitm-content-replacers", {
            replacers: rules,
        }).then(() => {
            try {
                props.onSaved(rules)
            } catch (e) {
                console.info(e)
            }
        }).finally(() => setTimeout(() => setLoading(false), 500))
        setAllowSaved(false)
    }, [rules, allowSaved])

    return <AutoCard loading={loading} title={<Space>
        根据规则替换请求或响应的内容
        <Button size={"small"} onClick={() => {
            let m = showModal({
                title: "新增规则", width: "60%", content: (
                    <CreateMITMContentReplacer existed={rules} onCreated={i => {
                        setRules([...rules, i].sort((a, b) => a.Index - b.Index))
                        m.destroy()
                    }}/>
                )
            })
        }}>新增规则</Button>
        <Button size={"small"} onClick={() => {
            setAllowSaved(true)
        }} type={"primary"}>更新到引擎</Button>
        <Button size={"small"} onClick={() => {
            showModal({title: "导出配置", width: "50%", content: (<MITMContentReplacerExport/>)})
        }} type={"link"}>导出配置</Button>
    </Space>} size={"small"} bodyStyle={{overflowY: "auto"}}>
        <Table<MITMContentReplacerRule>
            dataSource={rules}
            pagination={false}
            bordered={true}
            scroll={{x: 1200}}
            size={"small"}
            rowKey={i => `${i.Index}`}
            columns={[
                {
                    title: "执行顺序", render: (i: MITMContentReplacerRule) => <InputInteger
                        width={50} label={""} value={i.Index} min={1}
                        setValue={value => {
                            if (rules.filter(i => i.Index === value).length > 0) {
                                failed("执行顺序(Index)已存在，请手动调整优先级，输入未使用的顺序")
                                return
                            }

                            rules.forEach(target => {
                                if (target.Index != i.Index) {
                                    return
                                }
                                target.Index = value
                            })
                            setRules([...rules].sort((a, b) => a.Index - b.Index))
                        }}
                        formItemStyle={{marginBottom: 0}} size={"small"}
                    />, fixed: "left",
                },
                {
                    title: "规则名称", width: 150, render: (i: MITMContentReplacerRule) => <div
                        style={{maxWidth: 128}}
                    >
                        <Text
                            editable={{
                                onChange: newResult => {
                                    rules.forEach(target => {
                                        if (target.Index != i.Index) {
                                            return
                                        }
                                        target.VerboseName = newResult
                                    })
                                    setRules([...rules])
                                }
                            }} ellipsis={true}
                            code={false}
                        >{i.VerboseName}</Text>
                    </div>, fixed: "left",
                },
                {
                    title: "规则内容", width: 240, render: (i: MITMContentReplacerRule) => <div
                        style={{maxWidth: 240}}
                    >
                        <Text
                            editable={{
                                onChange: newResult => {
                                    rules.forEach(target => {
                                        if (target.Index != i.Index) {
                                            return
                                        }
                                        target.Rule = newResult
                                    })
                                    setRules([...rules])
                                }
                            }} ellipsis={true}
                        >{i.Rule}</Text>
                    </div>
                },
                {
                    title: "替换结果",
                    width: 120,
                    render: (i: MITMContentReplacerRule) => <div
                        style={{maxWidth: 120}}
                    >
                        <Text
                            editable={i.NoReplace ? false : {
                                onChange: newResult => {
                                    rules.forEach(target => {
                                        if (target.Index != i.Index) {
                                            return
                                        }
                                        target.Result = newResult
                                    })
                                    setRules([...rules])
                                }
                            }}

                        >{i.Result}</Text>
                    </div>
                },
                {
                    title: "完全禁用", render: (i: MITMContentReplacerRule) => <Checkbox
                        checked={i.Disabled}
                        onChange={() => {
                            rules.forEach(target => {
                                if (target.Index != i.Index) {
                                    return
                                }
                                target.Disabled = !target.Disabled
                            })
                            setRules([...rules])
                        }}
                    />
                },
                {
                    title: "不替换内容", render: (i: MITMContentReplacerRule) => <Checkbox
                        disabled={i.Disabled}
                        checked={i.NoReplace}
                        onChange={() => {
                            rules.forEach(target => {
                                if (target.Index != i.Index) {
                                    return
                                }
                                target.NoReplace = !target.NoReplace
                            })
                            setRules([...rules])
                        }}
                    />
                },
                {
                    title: "对请求生效", render: (i: MITMContentReplacerRule) => <Checkbox
                        checked={i.EnableForRequest}
                        disabled={i.Disabled}
                        onChange={() => {
                            rules.forEach(target => {
                                if (target.Index != i.Index) {
                                    return
                                }
                                target.EnableForRequest = !target.EnableForRequest
                            })
                            setRules([...rules])
                        }}
                    />
                },
                {
                    title: "对响应生效", render: (i: MITMContentReplacerRule) => <Checkbox
                        checked={i.EnableForResponse}
                        disabled={i.Disabled}
                        onChange={() => {
                            rules.forEach(target => {
                                if (target.Index != i.Index) {
                                    return
                                }
                                target.EnableForResponse = !target.EnableForResponse
                            })
                            setRules([...rules])
                        }}
                    />
                },
                {
                    title: "对 Header 生效", render: (i: MITMContentReplacerRule) => <Checkbox
                        checked={i.EnableForHeader}
                        disabled={i.Disabled}
                        onChange={() => {
                            rules.forEach(target => {
                                if (target.Index != i.Index) {
                                    return
                                }
                                target.EnableForHeader = !target.EnableForHeader
                            })
                            setRules([...rules])
                        }}
                    />
                },
                {
                    title: "对 Body 生效", render: (i: MITMContentReplacerRule) => <Checkbox
                        checked={i.EnableForBody}
                        disabled={i.Disabled}
                        onChange={() => {
                            rules.forEach(target => {
                                if (target.Index != i.Index) {
                                    return
                                }
                                target.EnableForBody = !target.EnableForBody
                            })
                            setRules([...rules])
                        }}
                    />
                },
                {
                    title: "命中颜色", render: (i: MITMContentReplacerRule) => <ManySelectOne
                        disabled={i.Disabled}
                        formItemStyle={{marginBottom: 0}}
                        data={["red", "blue", "cyan", "green", "grey", "purple", "yellow", "orange"].map(i => {
                            return {value: i, text: i}
                        })}
                        value={i.Color}
                        setValue={value => {
                            rules.forEach(target => {
                                if (target.Index != i.Index) {
                                    return
                                }
                                target.Color = value
                            })
                            setRules([...rules])
                        }}
                    />
                },
                {
                    title: "追加 Tag", width: 200, render: (i: MITMContentReplacerRule) => <ManyMultiSelectForString
                        data={["敏感信息", "疑似漏洞", "KEY泄漏"].map(i => {
                            return {value: i, label: i}
                        })}
                        label={""} mode={"tags"}
                        disabled={i.Disabled}
                        setValue={tagSTr => {
                            rules.forEach(target => {
                                if (target.Index != i.Index) {
                                    return
                                }
                                target.ExtraTag = tagSTr.split(",")
                            })
                            setRules([...rules])
                        }} value={i.ExtraTag.join(",")}
                        formItemStyle={{marginBottom: 0}}
                    />
                },
                {
                    title: "操作", render: (i: MITMContentReplacerRule) => <Space>
                        <Button size={"small"} onClick={() => {
                            setRules(rules.filter(t => t.Index !== i.Index))
                        }} danger={true}>删除</Button>
                    </Space>

                },
            ]}
        >

        </Table>
    </AutoCard>
};

interface CreateMITMContentReplacerProp {
    existed: MITMContentReplacerRule[]
    onCreated: (i: MITMContentReplacerRule) => any
}

const CreateMITMContentReplacer: React.FC<CreateMITMContentReplacerProp> = (props) => {
    const [params, setParams] = useState<MITMContentReplacerRule>({
        Color: "red",
        EnableForRequest: false,
        EnableForResponse: true,
        EnableForBody: true,
        EnableForHeader: true,
        Index: props.existed.length + 1,
        NoReplace: false,
        Result: "",
        Rule: "",
        ExtraTag: [],
        Disabled: false,
        VerboseName: "RULE:" + randomString(10),
    })
    return <Form
        style={{marginBottom: 20}}
        labelCol={{span: 5}} wrapperCol={{span: 14}}
        onSubmitCapture={e => {
            e.preventDefault()

            if (props.existed.filter(i => i.Index === params.Index).length > 0) {
                showModal({title: "错误", content: "执行顺序冲突（Index 冲突），重新设置执行顺序"})
                return
            }

            props.onCreated({...params})
        }}
    >
        <InputInteger label={"执行顺序"} setValue={Index => setParams({...params, Index})} value={params.Index}/>
        <InputItem label={"规则名称"} setValue={VerboseName => setParams({...params, VerboseName})}
                   value={params.VerboseName}/>
        <InputItem label={"规则内容"} setValue={Rule => setParams({...params, Rule})} value={params.Rule} required={true}/>
        <InputItem label={"替换结果"} setValue={Result => setParams({...params, Result})} value={params.Result}
                   placeholder={"想要替换成的内容，可以为空~"}/>
        {/*<SwitchItem label={"禁用规则"} setValue={NoReplace => setParams({...params, NoReplace})} value={params.NoReplace}/>*/}
        {/*{!params.NoReplace && <>*/}
        {/*    <SwitchItem label={"对 Request 生效"} setValue={EnableForRequest => setParams({...params, EnableForRequest})}*/}
        {/*                value={params.EnableForRequest}/>*/}
        {/*    <SwitchItem label={"对 Response 生效"}*/}
        {/*                setValue={EnableForResponse => setParams({...params, EnableForResponse})}*/}
        {/*                value={params.EnableForResponse}/>*/}
        {/*    <SwitchItem label={"对 Header 生效"}*/}
        {/*                setValue={EnableForHeader => setParams({...params, EnableForHeader})}*/}
        {/*                value={params.EnableForHeader}*/}
        {/*    />*/}
        {/*    <SwitchItem label={"对 Body 生效"}*/}
        {/*                setValue={EnableForBody => setParams({...params, EnableForBody})} value={params.EnableForBody}*/}
        {/*    />*/}
        {/*</>}*/}
        <ManySelectOne
            label={"命中颜色"}
            data={["red", "blue", "cyan", "green", "grey", "purple", "yellow", "orange"].map(i => {
                return {value: i, text: i}
            })}
            setValue={Color => setParams({...params, Color})} value={params.Color}
        />
        <ManyMultiSelectForString
            mode={"tags"} data={[]} label={"标记 Tag"} defaultSep={","}
            setValue={e => setParams({...params, ExtraTag: e.split(",")})} value={(params?.ExtraTag || []).join(",")}
        />
        <Form.Item colon={false} label={" "}>
            <Button type="primary" htmlType="submit"> 添加该规则 </Button>
        </Form.Item>
    </Form>
};