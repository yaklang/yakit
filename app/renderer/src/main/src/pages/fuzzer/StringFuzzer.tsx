import React, {useEffect, useState} from "react"
import {Button, Card, Form, Input, List, notification, PageHeader, Popconfirm, Space, Spin, Tabs, Tag} from "antd"
import {randomString} from "../../utils/randomUtil"
import {failed, info, warn} from "../../utils/notification"
import {showDrawer} from "../../utils/showModal"
import {YakEditor, IMonacoEditor} from "../../utils/editors"
import {ManySelectOne, SelectOne} from "../../utils/inputUtil"
import {encodeOperators, FuzzOperatorItem, fuzzOperators} from "./fuzzerTemplates"
import {Typography} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import classNames from "classnames"
import styles from "./HTTPFuzzerPage.module.scss"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {showYakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"

const {Text} = Typography
const {ipcRenderer} = window.require("electron")

export interface StringFuzzerProp {
    advanced?: boolean
    disableBasicMode?: boolean
    insertCallback?: (s: string) => any
}

export const StringFuzzer: React.FC<StringFuzzerProp> = (props) => {
    const [template, setTemplate] = useState("")
    const [loading, setLoading] = useState(false)
    const [random, _] = useState(randomString(20))
    const token = `client-string-fuzzer-${random}`

    // 高级配置选项
    const [advanced, setAdvanced] = useState(props.advanced ? "advanced" : "ordinary")
    const [buildTemp, setBuildTemp] = useState<string>()
    const [encodeTemp, setEncodeTemp] = useState<string>()

    const getCurrentEncodeTemplate = () => {
        const res = encodeOperators.filter((i) => i.name === encodeTemp)
        if (res.length > 0 && res[0]) {
            return res[0]
        }
        return false
    }

    const getCurrentBuildTemplate = () => {
        const res = fuzzOperators.filter((i) => i.name === buildTemp)
        if (res.length > 0 && res[0]) {
            return res[0]
        }
        return false
    }

    useEffect(() => {
        const temp = getCurrentEncodeTemplate()
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

        ipcRenderer.on(token, (e, data: {error: any; data: {Results: string[]}}) => {
            if (data.error) {
                failed(data.error?.details || data.error?.detail || "未知错误")
                return
            }
            const {Results} = data.data
            let m = showYakitDrawer({
                title: "Payload 测试结果",
                content: (
                    <div style={{height: "100%", overflow: "auto"}}>
                        <div style={{height: "80%"}}>
                            <List
                                className='yakit-list yakit-list-bordered'
                                size={"small"}
                                dataSource={Results}
                                pagination={{
                                    pageSize: 15,
                                    showTotal: (r) => {
                                        return <YakitTag>总量:{r}</YakitTag>
                                    },
                                    size: "small"
                                }}
                                bordered={true}
                                renderItem={(e) => {
                                    return (
                                        <List.Item>
                                            <span className='content-ellipsis'>{e}</span>
                                            <CopyComponents copyText={e} />
                                        </List.Item>
                                    )
                                }}
                            ></List>
                        </div>
                    </div>
                ),
                width: "35%",
                mask: true
            })
            setLoading(false)
        })
        return () => {
            ipcRenderer.removeAllListeners(token)
        }
    }, [random])

    const removeEncodeTemplateTag = () => {
        const res = encodeOperators.filter((i) => i.name === encodeTemp)
        if (res.length > 0 && res[0] && template) {
            const item = res[0]
            let newTemp = template.replace(`{{${item.tag}(`, "")
            const index = newTemp.lastIndexOf(")}}")
            if (index >= 0 && newTemp.length >= index + 3) {
                newTemp = newTemp.substr(0, index) + newTemp.substr(index + 3)
                setTemplate(newTemp)
            } else {
                warn("移除编码标签失败（标签结构已被破坏，请重构）")
            }
        } else {
            warn("移除编码标签失败: 找不到标签内容（标签类型）")
        }
        setEncodeTemp(undefined)
    }

    const removeBuildTemplateTag = () => {
        const t = getCurrentBuildTemplate()
        if (t && template) {
            if (!t.tag) {
                warn("不支持移除带参数的基础标签")
                setBuildTemp(undefined)
                return
            }
            let newTemp = template.replace(`{{${t.tag}`, "")
            const index = newTemp.lastIndexOf("}}")
            if (index >= 0 && newTemp.length >= index + 2) {
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

    return (
        <Spin spinning={loading}>
            <Space direction={"vertical"} style={{width: "100%"}} size={24}>
                <div style={{height: 120}}>
                    <YakEditor type={"http"} value={template} readOnly={false} setValue={setTemplate} />
                </div>
                <Form
                    layout={"horizontal"}
                    onSubmitCapture={(e) => {
                        e.preventDefault()
                        submit()
                    }}
                    labelCol={{span: 7}}
                    wrapperCol={{span: 14}}
                >
                    <Form.Item label={`选择基础 Fuzz 标签`}>
                        <YakitSelect
                            value={buildTemp}
                            onChange={(v) => {
                                setBuildTemp(v)
                                setEncodeTemp(undefined)
                            }}
                            options={fuzzOperators.map((i) => {
                                return {value: i.name, label: i.name}
                            })}
                        />
                    </Form.Item>
                    {buildTemp && (
                        <Form.Item label={" "} colon={false}>
                            <Card
                                bordered={true}
                                title={"基础标签"}
                                size={"small"}
                                extra={[
                                    <YakitButton
                                        type='outline2'
                                        className='button-outline2-danger'
                                        onClick={() => {
                                            removeBuildTemplateTag()
                                        }}
                                    >
                                        移除编码标签
                                    </YakitButton>
                                ]}
                            >
                                {(() => {
                                    if (!buildTemp) {
                                        return
                                    }
                                    const res = fuzzOperators.filter((i) => i.name === buildTemp)
                                    // @ts-ignore
                                    if (res.length > 0 && res[0].optionsRender) {
                                        return res[0].optionsRender(template, setTemplate)
                                    }
                                })()}
                            </Card>
                        </Form.Item>
                    )}
                    <Form.Item label={"Payload 编码 / 编码标签"}>
                        <YakitSelect
                            disabled={!!encodeTemp}
                            value={encodeTemp}
                            onChange={(v) => {
                                setEncodeTemp(v)
                            }}
                            options={encodeOperators.map((i) => {
                                return {value: i.name, label: i.name}
                            })}
                        />
                    </Form.Item>
                    {
                        <div style={{display: "none"}}>
                            {(() => {
                                if (encodeTemp) {
                                    const res = encodeOperators.filter((i) => i.name === encodeTemp)
                                    // @ts-ignore
                                    if (res.length > 0 && res[0].optionsRender) {
                                        return res[0].optionsRender(template, setTemplate)
                                    }
                                }
                            })()}
                        </div>
                    }
                    <Form.Item label={" "} colon={false}>
                        <Space>
                            <YakitButton type='outline2' htmlType={"submit"}>
                                查看生成后的 Payload
                            </YakitButton>
                            {props.insertCallback && (
                                <YakitButton
                                    type={"primary"}
                                    onClick={() => {
                                        if (props.insertCallback) {
                                            props.insertCallback(template)
                                        }
                                    }}
                                >
                                    插入标签所在位置
                                </YakitButton>
                            )}
                            <YakitPopconfirm
                                title={"确认要重置你的 Payload 吗？"}
                                onConfirm={() => {
                                    setBuildTemp("")
                                    setEncodeTemp("")
                                    setTemplate("")
                                }}
                                placement='top'
                            >
                                <YakitButton type='outline2'>重置</YakitButton>
                            </YakitPopconfirm>
                        </Space>
                    </Form.Item>
                </Form>
            </Space>
        </Spin>
    )
}
