import React, {useEffect, useState} from "react";
import {Button, Card, Form, List, Popconfirm, Space, Tag} from "antd";
import {InputItem, ManySelectOne, SelectOne} from "../../utils/inputUtil";
import {YakScript, YakScriptParam} from "./schema";
import {YakEditor} from "../../utils/editors";
import {PlusOutlined} from "@ant-design/icons";
import {showModal} from "../../utils/showModal";
import {failed, info} from "../../utils/notification";
import {putValueToParams, YakScriptParamsSetter} from "./YakScriptParamsSetter";
import {YakScriptRunner} from "./ExecYakScript";

export interface YakScriptCreatorFormProp {
    onCreated?: (i: YakScript) => any
    modified?: YakScript
}

const {ipcRenderer} = window.require("electron");

export const YakScriptCreatorForm: React.FC<YakScriptCreatorFormProp> = (props) => {
    const [params, setParams] = useState<YakScript>(props.modified || {
        Content: "", Tags: "", Author: "", Level: "", IsHistory: false,
        CreatedAt: 0,
        Help: "",
        Id: 0,
        Params: [],
        ScriptName: "",
        Type: "yak"
    });
    const [paramsLoading, setParamsLoading] = useState(false);
    const [modified, setModified] = useState<YakScript | undefined>(props.modified);

    const isNucleiPoC = params.Type === "nuclei";

    useEffect(() => {
        if (paramsLoading) {
            setTimeout(() => {
                setParamsLoading(false)
            }, 400)
        }
    }, [paramsLoading])

    return <div>
        <Form
            onSubmitCapture={e => {
                e.preventDefault()

                ipcRenderer.invoke("SaveYakScript", params).then((data) => {
                    info("创建 / 保存 Yak 脚本成功")
                    props.onCreated && props.onCreated(params)
                }).catch(e => {
                    failed(`保存 Yak 模块失败: ${e}`)
                })
            }}
            labelCol={{span: 5}} wrapperCol={{span: 14}}
        >
            <SelectOne disabled={!!modified} label={"模块类型"} data={[
                {value: "yak", text: "Yak 原生模块"},
                {value: "nuclei", text: "nuclei Yaml模块"},
            ]} setValue={Type => setParams({...params, Type})} value={params.Type}
            />
            <InputItem
                label={"Yak 模块名"} required={true}
                setValue={ScriptName => setParams({...params, ScriptName})} value={params.ScriptName}
            />
            <InputItem
                label={"简要描述"}
                setValue={Help => setParams({...params, Help})} value={params.Help}
            />
            <InputItem
                label={"模块作者"} setValue={Author => setParams({...params, Author})} value={params.Author}
            />
            {params.Type === "yak" && <Form.Item label={"增加参数"}>
                <Button type={"link"}
                        onClick={() => {
                            let m = showModal({
                                title: "添加新参数",
                                width: "60%",
                                content: <>
                                    <CreateYakScriptParamForm onCreated={param => {
                                        let existed = -1;
                                        (params.Params || []).forEach((e, index) => {
                                            if (e.Field === param.Field) existed = index;
                                        });
                                        if (existed >= 0) {
                                            info(`参数 [${param.Field}]${param.FieldVerbose ? `(${param.FieldVerbose})` : ""} 已经存在，已覆盖旧参数`)
                                            const currentParams = params.Params.splice(existed, 1)
                                            currentParams.push(param);
                                            setParams({...params, Params: [...currentParams]})
                                        } else {
                                            setParams({...params, Params: [...params.Params, param]})
                                        }
                                        m.destroy()
                                    }}/>
                                </>

                            })
                        }}
                >添加 / 设置一个参数 <PlusOutlined/></Button>
            </Form.Item>}
            {params.Params.length > 0 ? <Form.Item label={" "} colon={false}>
                <List
                    size={"small"} bordered={true} pagination={false}
                    renderItem={p => {
                        return <List.Item key={p.Field}>
                            参数名：
                            <Tag
                                color={"geekblue"}>{p.FieldVerbose && `${p.FieldVerbose} / `}{p.Field}
                            </Tag>
                            类型：<Tag color={"blue"}>{p.TypeVerbose} {p.DefaultValue && `默认值：${p.DefaultValue}`}</Tag>
                            {p.DefaultValue && `默认值为: ${p.DefaultValue}`}
                            {!isNucleiPoC && <Popconfirm
                                title={"确认要删除该参数吗？"}
                                onConfirm={e => {
                                    setParamsLoading(true)
                                    setParams({...params, Params: params.Params.filter(i => i.Field !== p.Field)})
                                }}
                            >
                                <Button type={"link"} danger={true}>删除参数</Button>
                            </Popconfirm>}
                        </List.Item>
                    }}
                    dataSource={params.Params}
                >

                </List>
            </Form.Item> : ""}
            <Form.Item label={"源码"}>
                <div style={{height: 400}}>
                    <YakEditor
                        type={"yak"}
                        setValue={Content => setParams({...params, Content})}
                        value={params.Content}
                    />
                </div>
            </Form.Item>
            <Form.Item colon={false} label={" "}>
                <Space>
                    <Button type="primary" htmlType="submit"> {modified ? "修改当前" : "创建新的"} Yak 模块 </Button>
                    <Button onClick={() => {
                        ipcRenderer.invoke("SaveYakScript", params).then((data: YakScript) => {
                            info("创建 / 保存 Yak 脚本成功")
                            setModified(data)
                            setParams(data)
                            // YakScriptParamsSetter
                            if (data.Params.length <= 0) {
                                showModal({
                                    title: "立即执行", width: 1000,
                                    content: <>
                                        <YakScriptRunner script={data} params={[]}/>
                                    </>
                                })
                            } else {
                                let m = showModal({
                                    title: "确认想要执行的参数",
                                    content: <>
                                        <YakScriptParamsSetter params={[]} {...data} onParamsConfirm={params => {
                                            m.destroy()
                                            showModal({
                                                title: "立即执行", width: 1000,
                                                content: <>
                                                    <YakScriptRunner script={data} params={params}/>
                                                </>
                                            })
                                        }}/>
                                    </>
                                })
                            }

                        }).catch(e => {
                            failed(`保存 Yak 模块失败: ${e}`)
                        })
                    }}> 调试：创建(修改)并立即执行 </Button>
                </Space>
            </Form.Item>
        </Form>
    </div>
};

export interface CreateYakScriptParamFormProp {
    onCreated: (params: YakScriptParam) => any
}

export const CreateYakScriptParamForm: React.FC<CreateYakScriptParamFormProp> = (props) => {
    const [params, setParams] = useState<YakScriptParam>({
        DefaultValue: "",
        Field: "",
        FieldVerbose: "",
        Help: "",
        TypeVerbose: ""
    });

    return <>
        <Form
            onSubmitCapture={e => {
                e.preventDefault()

                props.onCreated(params)
            }}
            labelCol={{span: 5}} wrapperCol={{span: 14}}
        >
            <InputItem
                label={"参数名（英文）"} required={true} placeholder={"填入想要增加的参数名"}
                setValue={Field => setParams({...params, Field})} value={params.Field}
                help={"参数名应该避免特殊符号，只允许英文 / '-' 等"}
            />
            <InputItem
                label={"参数显示名称(可中文)"} placeholder={"输入想要显示的参数名"}
                setValue={FieldVerbose => setParams({...params, FieldVerbose})} value={params.FieldVerbose}
            />
            <ManySelectOne
                label={"选择参数类型"}
                data={[
                    {text: "字符串 / string", value: "string"},
                    {text: "布尔值 / boolean", value: "boolean"},
                    {text: "Yak 代码块 / yak", value: "yak"},
                    {text: "文本块 / text", value: "text"},
                    {text: "整数（大于零） / uint", value: "uint"},
                    {text: "浮点数 / float", value: "float"},
                ]}
                setValue={TypeVerbose => setParams({...params, TypeVerbose})} value={params.TypeVerbose}
            />
            <InputItem
                label={"默认值"} placeholder={"该参数的默认值"}
                setValue={DefaultValue => setParams({...params, DefaultValue})} value={params.DefaultValue}
            />
            <InputItem
                label={"参数帮助信息"}
                setValue={Help => setParams({...params, Help})} value={params.Help}
                textarea={true} textareaRow={4} placeholder={"填写该参数的帮助信息，帮助用户更容易理解该内容"}
            />
            <Form.Item colon={false} label={" "}>
                <Button type="primary" htmlType="submit"> 添加参数 </Button>
            </Form.Item>
        </Form>
    </>
};