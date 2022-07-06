import React, {useEffect, useState} from "react";
import {Button, Card, Form, Input, List, notification, PageHeader, Popconfirm, Space, Spin, Tabs, Tag} from "antd";
import {randomString} from "../../utils/randomUtil";
import {failed, info, warn} from "../../utils/notification";
import {showDrawer} from "../../utils/showModal";
import {YakEditor, IMonacoEditor} from "../../utils/editors";
import {ManySelectOne, SelectOne} from "../../utils/inputUtil";
import {encodeOperators, FuzzOperatorItem, fuzzOperators} from "./fuzzerTemplates";
import {Typography} from "antd";

const {Text} = Typography;
const {ipcRenderer} = window.require("electron");

export interface StringFuzzerProp {
    advanced?: boolean
    disableBasicMode?: boolean
    insertCallback?: (s: string) => any
}

export const StringFuzzer: React.FC<StringFuzzerProp> = (props) => {
    const [template, setTemplate] = useState("");
    const [loading, setLoading] = useState(false);
    const [random, _] = useState(randomString(20));
    const token = `client-string-fuzzer-${random}`;

    // 高级配置选项
    const [advanced, setAdvanced] = useState(props.advanced ? "advanced" : "ordinary");
    const [buildTemp, setBuildTemp] = useState<string>();
    const [encodeTemp, setEncodeTemp] = useState<string>();

    const getCurrentEncodeTemplate = () => {
        const res = encodeOperators.filter(i => i.name === encodeTemp);
        if (res.length > 0 && res[0]) {
            return res[0];
        }
        return false
    };

    const getCurrentBuildTemplate = () => {
        const res = fuzzOperators.filter(i => i.name === buildTemp);
        if (res.length > 0 && res[0]) {
            return res[0];
        }
        return false
    };

    useEffect(() => {
        const temp = getCurrentEncodeTemplate();
        if (temp && template && !template.includes(`{{${temp.tag}(`)) {
            setEncodeTemp(undefined)
        }

        if (!template) {
            setBuildTemp(undefined)
        }
    }, [template])

    useEffect(() => {
        if (!random) {
            return
        }

        ipcRenderer.on(token, (e, data: { error: any, data: { Results: string[] } }) => {
            if (data.error) {
                failed(((data.error?.details) || data.error?.detail) || "未知错误")
                return
            }
            const {Results} = data.data;
            let m = showDrawer({
                content: <div style={{height: "100%", overflow: "auto"}}>
                    <PageHeader title={"Payload 测试结果"}>

                    </PageHeader>
                    <div style={{height: "80%"}}>
                        <List
                            size={"small"} dataSource={Results}
                            pagination={{
                                pageSize: 15, showTotal: r => {
                                    return <Tag>总量:{r}</Tag>
                                }, size: "small",
                            }} bordered={true}
                            renderItem={e => {
                                return <List.Item>
                                    <Text
                                        copyable={true}
                                        // ellipsis={{tooltip: true}}
                                        // style={{width: 300}}
                                    >{e}</Text>
                                </List.Item>
                            }}>

                        </List>
                    </div>
                </div>,
                width: "35%", mask: true,
            })
            setLoading(false)
        })
        return () => {
            ipcRenderer.removeAllListeners(token)
        }
    }, [random])

    const removeEncodeTemplateTag = () => {
        const res = encodeOperators.filter(i => i.name === encodeTemp);
        if (res.length > 0 && res[0] && template) {
            const item = res[0];
            let newTemp = template.replace(`{{${item.tag}(`, "");
            const index = newTemp.lastIndexOf(")}}");
            if (index >= 0 && newTemp.length >= (index + 3)) {
                newTemp = newTemp.substr(0, index) + newTemp.substr(index + 3)
                setTemplate(newTemp)
            } else {
                warn("移除编码标签失败（标签结构已被破坏，请重构）")
            }
        } else {
            warn("移除编码标签失败: 找不到标签内容（标签类型）")
        }
        setEncodeTemp(undefined)
    };

    const removeBuildTemplateTag = () => {
        const t = getCurrentBuildTemplate()
        if (t && template) {
            if (!t.tag) {
                warn("不支持移除带参数的基础标签");
                setBuildTemp(undefined)
                return
            }
            let newTemp = template.replace(`{{${t.tag}`, "");
            const index = newTemp.lastIndexOf("}}");
            if (index >= 0 && newTemp.length >= (index + 2)) {
                newTemp = newTemp.substr(0, index) + newTemp.substr(index + 2)
                setTemplate(newTemp)
            } else {
                warn("移除基础标签失败（标签结构已被破坏，请重构）")
            }
        } else {
            warn("移除基础标签失败，空 Payload 或找不到标签数据")
        }
        setBuildTemp(undefined)
    }

    const submit = () => {
        if (!template) {
            notification["warning"]({message: "Fuzz模版为空"})
            return
        }

        setLoading(true)
        ipcRenderer.invoke("string-fuzzer", {template, token})
    }

    return <Spin spinning={loading}>
        <PageHeader title={"Fuzzer Tag 调试工具"}>

        </PageHeader>
        <Tabs defaultActiveKey={advanced}>
            <Tabs.TabPane tab={"简易模式"} key={"ordinary"} disabled={props.disableBasicMode}>
                <PageHeader title={<div style={{fontSize: 14}}>
                    简易模式适合复制 Fuzz 过后的 Payload 来查看结果
                </div>}/>
                <Form
                    onSubmitCapture={e => {
                        e.preventDefault()
                        submit()
                    }}
                    labelCol={{span: 7}} wrapperCol={{span: 15}}
                >
                    <Form.Item label={"Fuzz模版"}>
                        <Input placeholder={"{{randstr}}"} value={template}
                               onChange={e => setTemplate(e.target.value)}/>
                    </Form.Item>
                    <Form.Item label={" "} colon={false}>
                        <Space>
                            <Button type={"primary"} htmlType={"submit"}>
                                查看 Fuzz 结果
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Tabs.TabPane>
            <Tabs.TabPane key={"advanced"} tab={"调试模式"}>
                <PageHeader title={"调试模式"} subTitle={"调试模式适合生成或者修改 Payload，在调试完成后，可以在 Web Fuzzer 中使用"}/>
                <Space direction={"vertical"} style={{width: "100%"}} size={24}>
                    <div style={{height: 120}}>
                        <YakEditor type={"http"}
                                   value={template} readOnly={false} setValue={setTemplate}/>
                    </div>
                    <Form layout={"horizontal"} onSubmitCapture={e => {
                        e.preventDefault()
                        submit()
                    }} labelCol={{span: 7}} wrapperCol={{span: 14}}>
                        <ManySelectOne
                            label={`选择基础 Fuzz 标签`}
                            value={buildTemp}
                            data={fuzzOperators.map(i => {
                                return {value: i.name, text: i.name}
                            })}
                            setValue={r => {
                                setBuildTemp(r)
                                setEncodeTemp(undefined)
                            }}
                        >

                        </ManySelectOne>
                        {/* {buildTemp && <Form.Item label={" "} colon={false}>
                            <Card bordered={true} title={"基础标签"} size={"small"} extra={[
                                <Button
                                    danger={true}
                                    onClick={() => {
                                        removeBuildTemplateTag()
                                    }}
                                >移除编码标签</Button>
                            ]}>
                                {(() => {
                                    if (!buildTemp) {
                                        return
                                    }
                                    const res = fuzzOperators.filter(i => i.name === buildTemp);
                                    // @ts-ignore
                                    if (res.length > 0 && res[0].optionsRender) {
                                        return res[0].optionsRender(template, setTemplate)
                                    }
                                })()}
                            </Card>
                        </Form.Item>} */}
                        <ManySelectOne
                            disabled={!!encodeTemp}
                            label={"Payload 编码 / 编码标签"}
                            value={encodeTemp}
                            setValue={e => {
                                setEncodeTemp(e)
                            }}
                            data={encodeOperators.map(i => {
                                return {value: i.name, text: i.name}
                            })}
                        >

                        </ManySelectOne>
                        {/* {encodeTemp && <Form.Item
                            label={" "} colon={false}
                            help={"本标签一般负责对 Payload 进行编码等处理，可以嵌套在一个普通(基础)标签外部"}
                        >
                            <Card bordered={true} title={"编码标签"} size={"small"} extra={[
                                <Button
                                    danger={true}
                                    onClick={() => {
                                        removeEncodeTemplateTag()
                                    }}
                                >移除编码标签</Button>
                            ]}>
                                {(() => {
                                    if (!encodeTemp) {
                                        return
                                    }

                                    const res = encodeOperators.filter(i => i.name === encodeTemp);
                                    // @ts-ignore
                                    if (res.length > 0 && res[0].optionsRender) {
                                        return res[0].optionsRender(template, setTemplate)
                                    }
                                })()}
                            </Card>
                        </Form.Item>} */}
                        <Form.Item label={" "} colon={false}>
                            <Space>
                                <Button htmlType={"submit"}>查看生成后的 Payload</Button>
                                {props.insertCallback && <Button
                                    type={"primary"}
                                    onClick={() => {
                                        if (props.insertCallback) {
                                            props.insertCallback(template)

                                        }
                                    }}
                                >插入标签所在位置</Button>}
                                <Popconfirm
                                    title={"确认要重置你的 Payload 吗？"}
                                    onConfirm={() => {
                                        setBuildTemp("")
                                        setEncodeTemp("")
                                        setTemplate("")
                                    }}
                                >
                                    <Button>重置</Button>
                                </Popconfirm>
                            </Space>
                        </Form.Item>
                    </Form>
                </Space>
            </Tabs.TabPane>
        </Tabs>
    </Spin>
};