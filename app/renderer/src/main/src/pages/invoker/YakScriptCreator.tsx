import React, {useEffect, useState} from "react";
import {Button, Card, Form, List, Popconfirm, Space, Tag} from "antd";
import {InputItem, ManyMultiSelectForString, ManySelectOne, SelectOne, SwitchItem} from "../../utils/inputUtil";
import {YakScript, YakScriptParam} from "./schema";
import {YakEditor} from "../../utils/editors";
import {PlusOutlined} from "@ant-design/icons";
import {showDrawer, showModal} from "../../utils/showModal";
import {failed, info} from "../../utils/notification";
import {putValueToParams, YakScriptParamsSetter} from "./YakScriptParamsSetter";
import {YakScriptRunner} from "./ExecYakScript";
import {FullscreenOutlined, FullscreenExitOutlined} from "@ant-design/icons"

export interface YakScriptCreatorFormProp {
    onCreated?: (i: YakScript) => any
    modified?: YakScript
    onChanged?: (i: YakScript) => any
}

const {ipcRenderer} = window.require("electron");

export const mitmPluginTemplate = `# mitm plugin template

yakit_output(MITM_PARAMS)

#-----------------------MITM Hooks I/O-------------------------
/*
#如何使用插件参数？

## 例如，如果你设置了一个参数为 url_keyword 的参数，可以通过 MITM_PARAMS 来使用它！
urlKeyword = MITM_PARAMS["url_keyword"]

# 如何输出给 Yakit 给用户查看？

yakit_output(i: any) // 可以只输出到 "Console 界面"
yakit_save(i: any)   // 可以输出并保存到数据库中，在 "插件输出" 中查看
*/
#----------------MITM Hooks Test And Quick Debug-----------------
/*
# __test__ 是 yakit mitm 插件用于调试的函数 【注意：这个函数在 MITM hooks劫持环境下不会被导入】

在这个函数中，你可以使用 yakit.GenerateYakitMITMHooksParams(method: string, url: string, opts ...http.Option) 来方便的生成可供 hooks 调用的参数，参考代码模版中的用法～

*/


#--------------------------WORKSPACE-----------------------------
__test__ = func() {
    results, err := yakit.GenerateYakitMITMHooksParams("GET", "https://example.com")
    if err != nil {
        return
    }
    isHttps, url, reqRaw, rspRaw, body = results

    mirrorHTTPFlow(results...)
    mirrorFilteredHTTPFlow(results...)
    mirrorNewWebsite(results...)
    mirrorNewWebsitePath(results...)
    mirrorNewWebsitePathParams(results...)
}


# mirrorHTTPFlow 会镜像所有的流量到这里，包括 .js / .css / .jpg 这类一般会被劫持程序过滤的请求
mirrorHTTPFlow = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorFilteredHTTPFlow 劫持到的流量为 MITM 自动过滤出的可能和 "业务" 有关的流量，会自动过滤掉 js / css 等流量
mirrorFilteredHTTPFlow = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorNewWebsite 每新出现一个网站，这个网站的第一个请求，将会在这里被调用！
mirrorNewWebsite = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorNewWebsitePath 每新出现一个网站路径，关于这个网站路径的第一个请求，将会在这里被传入回调
mirrorNewWebsitePath = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorNewWebsitePathParams 每新出现一个网站路径且带有一些参数，参数通过常见位置和参数名去重，去重的第一个 HTTPFlow 在这里被调用
mirrorNewWebsitePathParams = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}
`

export const mitmPluginTemplateShort = `# mirrorHTTPFlow 会镜像所有的流量到这里，包括 .js / .css / .jpg 这类一般会被劫持程序过滤的请求
mirrorHTTPFlow = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorFilteredHTTPFlow 劫持到的流量为 MITM 自动过滤出的可能和 "业务" 有关的流量，会自动过滤掉 js / css 等流量
mirrorFilteredHTTPFlow = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorNewWebsite 每新出现一个网站，这个网站的第一个请求，将会在这里被调用！
mirrorNewWebsite = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorNewWebsitePath 每新出现一个网站路径，关于这个网站路径的第一个请求，将会在这里被传入回调
mirrorNewWebsitePath = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorNewWebsitePathParams 每新出现一个网站路径且带有一些参数，参数通过常见位置和参数名去重，去重的第一个 HTTPFlow 在这里被调用
mirrorNewWebsitePathParams = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

`


export const YakScriptCreatorForm: React.FC<YakScriptCreatorFormProp> = (props) => {
    const [params, setParams] = useState<YakScript>(props.modified || {
        Content: "", Tags: "", Author: "", Level: "",
        IsHistory: false,
        CreatedAt: 0,
        Help: "",
        Id: 0,
        Params: [],
        ScriptName: "",
        Type: "yak"
    });
    const [paramsLoading, setParamsLoading] = useState(false);
    const [modified, setModified] = useState<YakScript | undefined>(props.modified);
    const [fullscreen, setFullscreen] = useState(false);
    const [loading, setLoading] = useState(false);

    const isNucleiPoC = params.Type === "nuclei";

    const debugButton = (primary?: boolean) => {
        if (loading) {
            return <Button disabled={true}>执行中...无法调试</Button>
        }
        return
    }

    useEffect(() => {
        if (paramsLoading) {
            setTimeout(() => {
                setParamsLoading(false)
            }, 400)
        }
    }, [paramsLoading])

    useEffect(() => {
        if (params.Type === "mitm" && params.Content === "") {
            setParams({...params, Content: mitmPluginTemplate})
            return
        } else {
            setParams({...params, Content: ""})
        }
    }, [params.Type])

    useEffect(() => {
        if (props.modified) setParams({...props.modified});
    }, [props.modified])

    return <div>
        <Form
            onSubmitCapture={e => {
                e.preventDefault()

                ipcRenderer.invoke("SaveYakScript", params).then((data) => {
                    info("创建 / 保存 Yak 脚本成功")
                    props.onCreated && props.onCreated(params)
                    props.onChanged && props.onChanged(data)
                }).catch(e => {
                    failed(`保存 Yak 模块失败: ${e}`)
                })
            }}
            labelCol={{span: 5}} wrapperCol={{span: 14}}
        >
            <SelectOne disabled={!!modified} label={"模块类型"} data={[
                {value: "yak", text: "Yak 原生模块"},
                {value: "nuclei", text: "nuclei Yaml模块"},
                {value: "mitm", text: "MITM 模块"},
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
            <ManyMultiSelectForString
                label={"Tags"}
                data={[
                    {value: "教程", label: "教程"}
                ]} mode={"tags"}
                setValue={Tags => setParams({...params, Tags})} value={params.Tags}
            />
            {["yak", "mitm"].includes(params.Type) && <Form.Item label={"增加参数"}>
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
                            <Space size={1}>
                                {p.Required && <div
                                    style={{
                                        marginBottom: 0, color: "red"
                                    }}>*</div>}
                                参数名：
                            </Space>
                            <Tag
                                color={"geekblue"}>{p.FieldVerbose && `${p.FieldVerbose} / `}{p.Field}
                            </Tag>
                            类型：<Tag color={"blue"}>{p.TypeVerbose} {p.DefaultValue && `默认值：${p.DefaultValue}`}</Tag>
                            {p.DefaultValue && `默认值为: ${p.DefaultValue}`}
                            {!isNucleiPoC && <Space style={{marginLeft: 20}}>
                                <Button size={"small"} onClick={() => {
                                    let m = showModal({
                                        title: `修改已知参数: ${p.FieldVerbose}(${p.Field})`,
                                        width: "60%",
                                        content: <>
                                            <CreateYakScriptParamForm
                                                modifiedParam={p}
                                                onCreated={param => {
                                                    setParams({
                                                        ...params, Params: [
                                                            ...params.Params.filter(i => i.Field !== param.Field),
                                                            param,
                                                        ]
                                                    })
                                                    m.destroy()
                                                }}/>
                                        </>
                                    })
                                }}>修改参数</Button>
                                <Popconfirm
                                    title={"确认要删除该参数吗？"}
                                    onConfirm={e => {
                                        setParamsLoading(true)
                                        setParams({...params, Params: params.Params.filter(i => i.Field !== p.Field)})
                                    }}
                                >
                                    <Button size={"small"} type={"link"} danger={true}>删除参数</Button>
                                </Popconfirm>
                            </Space>}
                        </List.Item>
                    }}
                    dataSource={params.Params}
                >

                </List>
            </Form.Item> : ""}
            <Form.Item label={"源码"} help={<>
                <Button icon={<FullscreenOutlined/>}
                        onClick={() => {
                            setFullscreen(true)
                            let m = showDrawer({
                                title: "Edit Code",
                                width: "100%",
                                closable: false,
                                keyboard: false,
                                content: <>
                                    <YakScriptLargeEditor
                                        script={params}
                                        onExit={(data) => {
                                            m.destroy()
                                            setFullscreen(false)
                                            ipcRenderer.invoke("QueryYakScript", {})
                                        }}
                                        onUpdate={(data: YakScript) => {
                                            props.onChanged && props.onChanged(data)
                                            setParams({...data})
                                        }}
                                    />
                                </>
                            })
                        }}
                        type={"link"} style={{
                    marginBottom: 12, marginTop: 6
                }}>大屏模式</Button>
            </>}>
                {!fullscreen && <div style={{height: 400}}>
                    <YakEditor
                        type={"yak"}
                        setValue={Content => setParams({...params, Content})}
                        value={params.Content}
                    />
                </div>}
            </Form.Item>
            <Form.Item colon={false} label={" "}>
                <Space>
                    <Button type="primary" htmlType="submit"> {modified ? "修改当前" : "创建新的"} Yak 模块 </Button>
                    <Button
                        // type={primary ? "primary" : undefined}
                        disabled={[
                            // "mitm",
                            "",
                        ].includes(params.Type)}
                        onClick={() => {
                            setLoading(true)
                            ipcRenderer.invoke("SaveYakScript", params).then((data: YakScript) => {
                                info("创建 / 保存 Yak 脚本成功")
                                setModified(data)
                                setParams(data)
                                props.onChanged && props.onChanged(data)
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
                                        width: "70%",
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
                            }).finally(() => {
                                setTimeout(() => setLoading(false), 400)
                            })
                        }}> 调试：创建(修改)并立即执行 </Button>
                </Space>
            </Form.Item>
        </Form>
    </div>
};

export interface CreateYakScriptParamFormProp {
    modifiedParam?: YakScriptParam;
    onCreated: (params: YakScriptParam) => any
}

export const CreateYakScriptParamForm: React.FC<CreateYakScriptParamFormProp> = (props) => {
    const [params, setParams] = useState<YakScriptParam>(props.modifiedParam || {
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
                disable={!!props.modifiedParam}
                label={"参数名（英文）"} required={true} placeholder={"填入想要增加的参数名"}
                setValue={Field => setParams({...params, Field})} value={params.Field}
                help={"参数名应该避免特殊符号，只允许英文 / '-' 等"}
            />
            <InputItem
                label={"参数显示名称(可中文)"} placeholder={"输入想要显示的参数名"}
                setValue={FieldVerbose => setParams({...params, FieldVerbose})} value={params.FieldVerbose}
            />
            <SwitchItem label={"必要参数"} setValue={Required => setParams({...params, Required})} value={params.Required}/>
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
            {!params.Required && <InputItem
                label={"参数组"}
                setValue={Group => setParams({...params, Group})} value={params.Group}
                placeholder={"参数组，在用户输入界面将会把参数分成组，一般用于设置可选参数`"}
            />}
            <Form.Item colon={false} label={" "}>
                <Button type="primary" htmlType="submit"> 添加参数 </Button>
            </Form.Item>
        </Form>
    </>
};

export interface YakScriptLargeEditorProp {
    script: YakScript
    onUpdate: (data: YakScript) => any
    onExit: (data: YakScript) => any
}

export const YakScriptLargeEditor: React.FC<YakScriptLargeEditorProp> = (props) => {
    const {script} = props;
    const [params, setParams] = useState<YakScript>({...script})

    useEffect(() => {
        setParams({...script})
    }, [props.script])

    return <>
        <Card title={`ScriptName: ${params.ScriptName}`} extra={[
            <Space>
                <Button danger={true} onClick={() => {
                    // m.destroy()
                    // setFullscreen(false)
                    ipcRenderer.invoke("SaveYakScript", params).then((data) => {
                        info("创建 / 保存 Yak 脚本成功")
                        props.onUpdate(data)
                        // setModified(data)
                    }).catch(e => {
                        failed(`保存 Yak 模块失败: ${e}`)
                    }).finally(() => {
                        props.onExit(params)
                    })
                }}>退出编辑界面</Button>
                <Button
                    disabled={[
                        // "mitm",
                        "",
                    ].includes(params.Type)}
                    onClick={() => {
                        ipcRenderer.invoke("SaveYakScript", params).then((data: YakScript) => {
                            info("创建 / 保存 Yak 脚本成功")
                            props.onUpdate(data)
                            // setModified(data)
                            // setParams(data)
                            // props.onChanged && props.onChanged(data)
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
                                    width: "70%",
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
                        }).finally(() => {
                            // setTimeout(() => setLoading(false), 400)
                        })
                    }}> 调试：创建(修改)并立即执行 </Button>
            </Space>
        ]} bodyStyle={{padding: 0}}>
            <div style={{
                width: "100%",
                height: 1000,
            }}>
                <YakEditor
                    type={"yak"}
                    setValue={Content => setParams({...params, Content})}
                    value={params.Content}
                />
            </div>
        </Card>
    </>
};