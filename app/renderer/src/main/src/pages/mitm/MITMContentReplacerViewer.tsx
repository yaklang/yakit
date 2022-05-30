import React, {useEffect, useState} from "react";
import {Button, Checkbox, Space, Table, Typography} from "antd";
import {MITMContentReplacerRule} from "./MITMContentReplacer";
import {InputInteger, ManyMultiSelectForString, ManySelectOne} from "../../utils/inputUtil";
import {failed, info} from "../../utils/notification";
import {AutoCard} from "../../components/AutoCard";

export interface MITMContentReplacerViewerProp {
}

const {Text} = Typography;

const {ipcRenderer} = window.require("electron");

export const MITMContentReplacerViewer: React.FC<MITMContentReplacerViewerProp> = (props) => {
    const [rules, setRules] = useState<MITMContentReplacerRule[]>([]);

    useEffect(() => {
        ipcRenderer.invoke("GetCurrentRules", {}).then((rsp: { Rules: MITMContentReplacerRule[] }) => {
            setRules(rsp.Rules)
        })
    }, [])

    return <AutoCard
        size={"small"}
        bordered={false}
        title={(
            <Space>
                <div>
                    现有 MITM 内容规则
                </div>
                <Button
                    size={"small"} type={"primary"}
                    onClick={() => {
                        ipcRenderer.invoke("SetCurrentRules", {Rules: rules}).then(e => {
                            info("保存成功")
                        }).catch(e => {
                            failed(`保存失败: ${e}`)
                        })
                    }}
                >保存</Button>
            </Space>
        )}
        bodyStyle={{overflowY: "auto"}}
    >
        <Table<MITMContentReplacerRule>
            dataSource={rules}
            pagination={false}
            bordered={true}
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
                    />,
                },
                {
                    title: "规则内容", width: 380, render: (i: MITMContentReplacerRule) => <div
                        style={{maxWidth: 380}}

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
                            }}
                            code={true} copyable={true}
                        >{i.Rule}</Text>
                    </div>
                },
                {
                    title: "替换结果",
                    width: 200,
                    render: (i: MITMContentReplacerRule) => <div
                        style={{maxWidth: 200}}
                    >
                        <Text
                            copyable={!!i.Result && true}
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
                    title: "不替换内容", render: (i: MITMContentReplacerRule) => <Checkbox
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
                    title: "追加 Tag", render: (i: MITMContentReplacerRule) => <ManyMultiSelectForString
                        data={["敏感信息", "疑似漏洞", "KEY泄漏"].map(i => {
                            return {value: i, label: i}
                        })}
                        label={""} mode={"tags"}
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
                    >

                    </ManyMultiSelectForString>
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