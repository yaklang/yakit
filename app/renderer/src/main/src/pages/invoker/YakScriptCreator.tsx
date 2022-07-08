import React, {useEffect, useState} from "react"
import {Button, Checkbox, Col, Form, Input, List, Popconfirm, Row, Space, Tag, Tooltip} from "antd"
import {InputItem, ManyMultiSelectForString, ManySelectOne, SelectOne, SwitchItem} from "../../utils/inputUtil"
import {YakScript, YakScriptParam} from "./schema"
import {YakCodeEditor, YakEditor} from "../../utils/editors"
import {PlusOutlined, QuestionCircleOutlined} from "@ant-design/icons"
import {showDrawer, showModal} from "../../utils/showModal"
import {failed, info, success, warn} from "../../utils/notification"
import {YakScriptParamsSetter} from "./YakScriptParamsSetter"
import {YakScriptRunner} from "./ExecYakScript"
import {FullscreenOutlined, DeleteOutlined} from "@ant-design/icons"
import {MITMPluginTemplate} from "./data/MITMPluginTamplate"
import {PacketHackPluginTemplate} from "./data/PacketHackPluginTemplate"
import {CodecPluginTemplate} from "./data/CodecPluginTemplate"
import {PortScanPluginTemplate} from "./data/PortScanPluginTemplate"
import {useMemoizedFn} from "ahooks"
import cloneDeep from "lodash/cloneDeep"

import "./YakScriptCreator.css"
import {queryYakScriptList} from "../yakitStore/network"
import {YakExecutorParam} from "./YakExecutorParams"
import {API} from "@/services/swagger/resposeType"
import {NetWorkApi} from "@/services/fetch"
import {useStore} from "@/store"
import {DownloadOnlinePluginProps} from "../yakitStoreOnline/YakitStoreOnline"

export const BUILDIN_PARAM_NAME_YAKIT_PLUGIN_NAMES = "__yakit_plugin_names__"

export interface YakScriptCreatorFormProp {
    onCreated?: (i: YakScript) => any
    modified?: YakScript
    onChanged?: (i: YakScript) => any
}

/*
*                            {value: "yak", text: "Yak 原生模块"},
                           {value: "mitm", text: "MITM 模块"},
                           {value: "packet-hack", text: "Packet 检查"},
                           {value: "port-scan", text: "端口扫描插件"},
                           {value: "codec", text: "Codec 模块"},
                           {value: "nuclei", text: "nuclei Yaml模块"},
* */
export const getPluginTypeVerbose = (t: "yak" | "mitm" | "port-scan" | "nuclei" | "codec" | "packet-hack" | string) => {
    switch (t) {
        case "nuclei":
            return "Nuclei Yaml模块"
        case "yak":
            return "Yak 原生模块"
        case "codec":
            return "Codec 编码模块"
        case "mitm":
            return "MITM 插件"
        case "port-scan":
            return "端口扫描插件"
        default:
            return "未知类型"
    }
}

const {ipcRenderer} = window.require("electron")

const executeYakScriptByParams = (data: YakScript) => {
    const exec = (extraParams?: YakExecutorParam[]) => {
        if (data.Params.length <= 0) {
            showModal({
                title: "立即执行",
                width: 1000,
                content: (
                    <>
                        <YakScriptRunner debugMode={true} script={data} params={[...(extraParams || [])]} />
                    </>
                )
            })
        } else {
            let m = showModal({
                title: "确认想要执行的参数",
                width: "70%",
                content: (
                    <>
                        <YakScriptParamsSetter
                            {...data}
                            onParamsConfirm={(params) => {
                                m.destroy()
                                showModal({
                                    title: "立即执行",
                                    width: 1000,
                                    content: (
                                        <>
                                            <YakScriptRunner
                                                debugMode={true}
                                                script={data}
                                                params={[...params, ...(extraParams || [])]}
                                            />
                                        </>
                                    )
                                })
                            }}
                        />
                    </>
                )
            })
        }
    }
    if (data.EnablePluginSelector) {
        queryYakScriptList(
            data.PluginSelectorTypes || "mitm,port-scan",
            (i) => {
                exec([{Key: BUILDIN_PARAM_NAME_YAKIT_PLUGIN_NAMES, Value: i.map((i) => i.ScriptName).join("|")}])
            },
            undefined,
            10,
            undefined,
            undefined,
            undefined,
            () => {
                exec([{Key: BUILDIN_PARAM_NAME_YAKIT_PLUGIN_NAMES, Value: "no-such-plugin"}])
            }
        )
    } else {
        exec()
    }
}

export const YakScriptCreatorForm: React.FC<YakScriptCreatorFormProp> = (props) => {
    const [params, setParams] = useState<YakScript>(
        props.modified || {
            Content: "",
            Tags: "",
            Author: "",
            Level: "",
            IsHistory: false,
            IsIgnore: false,
            CreatedAt: 0,
            Help: "",
            Id: 0,
            Params: [],
            ScriptName: "",
            Type: "yak",
            IsGeneralModule: false,
            PluginSelectorTypes: "mitm,port-scan",
            UserId: 0,
            OnlineId: 0,
            OnlineScriptName: "",
            OnlineContributors: "",
            GeneralModuleVerbose: "",
            GeneralModuleKey: "",
            FromGit: ""
        }
    )
    const [paramsLoading, setParamsLoading] = useState(false)
    const [modified, setModified] = useState<YakScript | undefined>(props.modified)
    const [fullscreen, setFullscreen] = useState(false)
    const [loading, setLoading] = useState(false)
    const {userInfo} = useStore()

    const isNucleiPoC = params.Type === "nuclei"

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
        switch (params.Type) {
            case "mitm":
                setParams({...params, Content: MITMPluginTemplate})
                return
            case "port-scan":
                setParams({
                    ...params,
                    Content: PortScanPluginTemplate,
                    Params: [
                        {
                            Field: "target",
                            FieldVerbose: "扫描的目标",
                            TypeVerbose: "string",
                            Required: true
                        } as YakScriptParam,
                        {
                            Field: "ports",
                            FieldVerbose: "端口",
                            TypeVerbose: "string",
                            Required: false,
                            DefaultValue: "80"
                        } as YakScriptParam
                    ]
                })
                return
            case "packet-hack":
                setParams({
                    ...params,
                    Content: PacketHackPluginTemplate,
                    Params: [
                        {Field: "request", TypeVerbose: "http-packet", Required: true} as YakScriptParam,
                        {Field: "response", TypeVerbose: "http-packet", Required: false} as YakScriptParam,
                        {Field: "isHttps", TypeVerbose: "bool"} as YakScriptParam
                    ]
                })
                return
            case "codec":
                setParams({...params, Content: CodecPluginTemplate})
                return
            case "nuclei":
                setParams({...params, Content: "# Add your nuclei formatted PoC!"})
                return
            default:
                setParams({...params, Content: "yakit.AutoInitYakit()\n\n# Input your code!\n\n"})
                return
        }
    }, [params.Type])

    useEffect(() => {
        if (props.modified) setParams({...props.modified})
    }, [props.modified])

    // 上传到插件商店后，如果没有插件id，需要下载到本地
    const upOnlinePlugin = useMemoizedFn(() => {
        const onlineParams: API.SaveYakitPlugin = {
            type: params.Type,
            script_name: params.OnlineScriptName ? params.OnlineScriptName : params.ScriptName,
            content: params.Content,
            tags: params.Tags && params.Tags !== "null" ? params.Tags.split(",") : undefined,
            params: params.Params.map((p) => ({
                field: p.Field,
                default_value: p.DefaultValue,
                type_verbose: p.TypeVerbose,
                field_verbose: p.FieldVerbose,
                help: p.Help,
                required: p.Required,
                group: p.Group,
                extra_setting: p.ExtraSetting
            })),
            help: params.Help,
            default_open: false
        }
        if (params.OnlineId) {
            onlineParams.id = params.OnlineId as number
        }
        NetWorkApi<API.SaveYakitPlugin, number>({
            method: "post",
            url: "yakit/plugin/save",
            data: onlineParams
        })
            .then((id) => {
                console.log("id", id)

                success("创建 / 保存 Yak 脚本成功")
                props.onCreated && props.onCreated(params)
                props.onChanged && props.onChanged(params)
                setTimeout(() => ipcRenderer.invoke("change-main-menu"), 100)
                ipcRenderer
                    .invoke("DownloadOnlinePluginById", {
                        OnlineID: id
                    } as DownloadOnlinePluginProps)
                    // .then((res) => {
                    //     console.log("本地成功",res)
                    // })
                    .catch((err) => {
                        failed("插件下载本地失败:" + err)
                    })
            })
            .catch((err) => {
                failed("插件上传失败:" + err)
            })
    })

    // 仅保存本地
    const onSaveLocal = useMemoizedFn(() => {
        if(!params.ScriptName){
            warn('请输入插件模块名!');
            return
        }
        ipcRenderer
            .invoke("SaveYakScript", params)
            .then((data) => {
                info("创建 / 保存 Yak 脚本成功")
                props.onCreated && props.onCreated(data)
                props.onChanged && props.onChanged(data)
                setTimeout(() => ipcRenderer.invoke("change-main-menu"), 100)
            })
            .catch((e: any) => {
                failed(`保存 Yak 模块失败: ${e}`)
            })
    })
    // 上传
    const uploadOnline = (item: YakScript) => {
        if (!userInfo.isLogin) {
            warn("未登录，请先登录!")
            return
        }
        if (!item.UserId && item.UserId > 0 && userInfo.user_id !== item.UserId) {
            warn("只能上传本人创建的插件!")
            return
        }

        const params: API.NewYakitPlugin = {
            type: item.Type,
            script_name: item.OnlineScriptName ? item.OnlineScriptName : item.ScriptName,
            content: item.Content,
            tags: item.Tags && item.Tags !== "null" ? item.Tags.split(",") : undefined,
            params: item.Params.map((p) => ({
                field: p.Field,
                default_value: p.DefaultValue,
                type_verbose: p.TypeVerbose,
                field_verbose: p.FieldVerbose,
                help: p.Help,
                required: p.Required,
                group: p.Group,
                extra_setting: p.ExtraSetting
            })),
            help: item.Help,
            default_open: false,
            contributors: item.Author
        }
        if (item.OnlineId) {
            params.id = parseInt(`${item.OnlineId}`)
        }
        NetWorkApi<API.NewYakitPlugin, number>({
            method: "post",
            url: "yakit/plugin",
            data: params
        })
            .then((id: number) => {
                if (id) {
                    // 上传插件到商店后，需要调用下载商店插件接口，给本地保存远端插件Id DownloadOnlinePluginProps
                    ipcRenderer
                        .invoke("DownloadOnlinePluginById", {
                            OnlineID: id
                        } as DownloadOnlinePluginProps)
                        // .then((res) => {
                        //     console.log("本地成功", res)
                        // })
                        .catch((err) => {
                            failed("插件下载本地失败:" + err)
                        })
                    success("插件上传成功")
                }
            })
            .catch((err) => {
                failed("插件上传失败:" + err)
            })
            .finally(() => {})
    }

    return (
        <div>
            <Form labelCol={{span: 5}} wrapperCol={{span: 14}}>
                <SelectOne
                    disabled={!!modified}
                    label={"模块类型"}
                    data={[
                        {value: "yak", text: "Yak 原生模块"},
                        {value: "mitm", text: "MITM 模块"},
                        {value: "packet-hack", text: "Packet 检查"},
                        {value: "port-scan", text: "端口扫描插件"},
                        {value: "codec", text: "Codec 模块"},
                        {value: "nuclei", text: "nuclei Yaml模块"}
                    ]}
                    setValue={(Type) => {
                        if (["packet-hack", "codec", "nuclei"].includes(Type))
                            setParams({
                                ...params,
                                Type,
                                IsGeneralModule: false
                            })
                        else setParams({...params, Type})
                    }}
                    value={params.Type}
                />
                <InputItem
                    label={"Yak 模块名"}
                    required={true}
                    setValue={(ScriptName) => setParams({...params, ScriptName})}
                    value={params.ScriptName}
                />
                <InputItem label={"简要描述"} setValue={(Help) => setParams({...params, Help})} value={params.Help} />
                <InputItem
                    label={"模块作者"}
                    setValue={(Author) => setParams({...params, Author})}
                    value={params.Author}
                />
                <ManyMultiSelectForString
                    label={"Tags"}
                    data={[{value: "教程", label: "教程"}]}
                    mode={"tags"}
                    setValue={(Tags) => setParams({...params, Tags})}
                    value={params.Tags}
                />
                {["yak", "mitm"].includes(params.Type) && (
                    <Form.Item label={"增加参数"}>
                        <Button
                            type={"link"}
                            onClick={() => {
                                let m = showModal({
                                    title: "添加新参数",
                                    width: "60%",
                                    content: (
                                        <>
                                            <CreateYakScriptParamForm
                                                onCreated={(param) => {
                                                    let flag = false
                                                    const paramArr = (params.Params || []).map((item) => {
                                                        if (item.Field === param.Field) {
                                                            flag = true
                                                            info(
                                                                `参数 [${param.Field}]${
                                                                    param.FieldVerbose ? `(${param.FieldVerbose})` : ""
                                                                } 已经存在，已覆盖旧参数`
                                                            )
                                                            return param
                                                        }
                                                        return item
                                                    })
                                                    if (!flag) paramArr.push(param)
                                                    setParams({...params, Params: [...paramArr]})
                                                    m.destroy()
                                                }}
                                            />
                                        </>
                                    )
                                })
                            }}
                        >
                            添加 / 设置一个参数 <PlusOutlined />
                        </Button>
                    </Form.Item>
                )}
                {params.Params.length > 0 ? (
                    <Form.Item label={" "} colon={false}>
                        <List
                            size={"small"}
                            bordered={true}
                            pagination={false}
                            renderItem={(p) => {
                                return (
                                    <List.Item key={p.Field}>
                                        <Space size={1}>
                                            {p.Required && <div className='form-item-required-title'>*</div>}
                                            参数名：
                                        </Space>
                                        <Tag color={"geekblue"}>
                                            {p.FieldVerbose && `${p.FieldVerbose} / `}
                                            {p.Field}
                                        </Tag>
                                        类型：
                                        <Tag color={"blue"}>
                                            {p.TypeVerbose} {p.DefaultValue && `默认值：${p.DefaultValue}`}
                                        </Tag>
                                        {p.DefaultValue && `默认值为: ${p.DefaultValue}`}
                                        {!isNucleiPoC && (
                                            <Space style={{marginLeft: 20}}>
                                                <Button
                                                    size={"small"}
                                                    onClick={() => {
                                                        let m = showModal({
                                                            title: `修改已知参数: ${p.FieldVerbose}(${p.Field})`,
                                                            width: "60%",
                                                            content: (
                                                                <>
                                                                    <CreateYakScriptParamForm
                                                                        modifiedParam={p}
                                                                        onCreated={(param) => {
                                                                            setParams({
                                                                                ...params,
                                                                                Params: [
                                                                                    ...params.Params.filter(
                                                                                        (i) => i.Field !== param.Field
                                                                                    ),
                                                                                    param
                                                                                ]
                                                                            })
                                                                            m.destroy()
                                                                        }}
                                                                    />
                                                                </>
                                                            )
                                                        })
                                                    }}
                                                >
                                                    修改参数
                                                </Button>
                                                <Popconfirm
                                                    title={"确认要删除该参数吗？"}
                                                    onConfirm={(e) => {
                                                        setParamsLoading(true)
                                                        setParams({
                                                            ...params,
                                                            Params: params.Params.filter((i) => i.Field !== p.Field)
                                                        })
                                                    }}
                                                >
                                                    <Button size={"small"} type={"link"} danger={true}>
                                                        删除参数
                                                    </Button>
                                                </Popconfirm>
                                            </Space>
                                        )}
                                    </List.Item>
                                )
                            }}
                            dataSource={params.Params}
                        ></List>
                    </Form.Item>
                ) : (
                    ""
                )}
                {params.Type === "yak" && (
                    <>
                        <SwitchItem
                            label={"启用插件联动 UI"}
                            value={params.EnablePluginSelector}
                            formItemStyle={{marginBottom: 2}}
                            setValue={(EnablePluginSelector) => setParams({...params, EnablePluginSelector})}
                        />
                        {params.EnablePluginSelector && (
                            <ManyMultiSelectForString
                                label={"联动插件类型"}
                                value={params.PluginSelectorTypes}
                                data={["mitm", "port-scan"].map((i) => {
                                    return {value: i, label: getPluginTypeVerbose(i)}
                                })}
                                mode={"multiple"}
                                setValue={(res) => {
                                    setParams({...params, PluginSelectorTypes: res})
                                }}
                                help={"通过 cli.String(`yakit-plugin-file`) 获取用户选择的插件"}
                            />
                        )}
                    </>
                )}
                <Form.Item
                    label={"源码"}
                    help={
                        <>
                            <Space>
                                <Button
                                    icon={<FullscreenOutlined />}
                                    onClick={() => {
                                        setFullscreen(true)
                                        let m = showDrawer({
                                            title: "Edit Code",
                                            width: "100%",
                                            closable: false,
                                            keyboard: false,
                                            content: (
                                                <>
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
                                            )
                                        })
                                    }}
                                    type={"link"}
                                    style={{
                                        marginBottom: 12,
                                        marginTop: 6
                                    }}
                                >
                                    大屏模式
                                </Button>
                                {!["packet-hack", "codec", "nuclei"].includes(params.Type) && (
                                    <Checkbox
                                        name={"默认启动"}
                                        style={{
                                            marginBottom: 12,
                                            marginTop: 6
                                        }}
                                        checked={params.IsGeneralModule}
                                        onChange={() =>
                                            setParams({
                                                ...params,
                                                IsGeneralModule: !params.IsGeneralModule
                                            })
                                        }
                                    >
                                        默认启动{" "}
                                        <Tooltip
                                            title={
                                                "设置默认启动后，将在恰当时候启动该插件(Yak插件不会自动启动，但会自动增加在左侧基础安全工具菜单栏)"
                                            }
                                        >
                                            <Button type={"link"} icon={<QuestionCircleOutlined />} />
                                        </Tooltip>
                                    </Checkbox>
                                )}
                            </Space>
                        </>
                    }
                >
                    {!fullscreen && (
                        <div style={{height: 400}}>
                            <YakEditor
                                type={"yak"}
                                setValue={(Content) => setParams({...params, Content})}
                                value={params.Content}
                            />
                        </div>
                    )}
                </Form.Item>
                <Form.Item colon={false} label={" "}>
                    <Space>
                        {(userInfo.isLogin && (
                            <>
                                <Popconfirm
                                    title='请选择保存方式'
                                    onCancel={onSaveLocal}
                                    onConfirm={upOnlinePlugin}
                                    cancelText='仅保存本地'
                                    okText='保存'
                                >
                                    <Button type='primary'>保存</Button>
                                </Popconfirm>
                                <Button onClick={() => uploadOnline(params)}>上传</Button>
                            </>
                        )) || (
                            <Button type='primary' onClick={onSaveLocal}>
                                保存
                            </Button>
                        )}
                        <Button
                            // type={primary ? "primary" : undefined}
                            disabled={[
                                // "mitm",
                                ""
                            ].includes(params.Type)}
                            onClick={() => {
                                setLoading(true)
                                ipcRenderer
                                    .invoke("SaveYakScript", params)
                                    .then((data: YakScript) => {
                                        info("创建 / 保存 Yak 脚本成功")
                                        setModified(data)
                                        setParams(data)
                                        props.onChanged && props.onChanged(data)
                                        executeYakScriptByParams(data)
                                    })
                                    .catch((e: any) => {
                                        failed(`保存 Yak 模块失败: ${e}`)
                                    })
                                    .finally(() => {
                                        setTimeout(() => setLoading(false), 400)
                                    })
                            }}
                        >
                            保存并调试
                        </Button>
                    </Space>
                </Form.Item>
            </Form>
        </div>
    )
}

export interface CreateYakScriptParamFormProp {
    modifiedParam?: YakScriptParam
    onCreated: (params: YakScriptParam) => any
}

export const CreateYakScriptParamForm: React.FC<CreateYakScriptParamFormProp> = (props) => {
    const [params, setParams] = useState<YakScriptParam>(
        props.modifiedParam || {
            DefaultValue: "",
            Field: "",
            FieldVerbose: "",
            Help: "",
            TypeVerbose: ""
        }
    )
    const [extraSetting, setExtraSetting] = useState<{[key: string]: any}>(
        props.modifiedParam?.ExtraSetting ? JSON.parse(props.modifiedParam.ExtraSetting) : {}
    )
    // 选择类型时的转换
    const typeChange = useMemoizedFn((type: string) => {
        switch (type) {
            case "select":
                setExtraSetting({
                    double: false,
                    data: []
                })
                break
            case "upload-path":
                setExtraSetting({isTextArea: false})
                break
            default:
                setExtraSetting({})
                break
        }
        setParams({...params, TypeVerbose: type})
    })
    // 提交参数信息的验证
    const verify = useMemoizedFn(() => {
        const type = params.TypeVerbose
        switch (type) {
            case "select":
                if (extraSetting.data.length === 0) {
                    failed("下拉框类型时，请最少添加一个选项数据")
                    return false
                }
                return true
            default:
                return true
        }
    })
    // 提交参数信息的转换
    const convert = useMemoizedFn(() => {
        const type = params.TypeVerbose
        const setting: YakScriptParam = cloneDeep(params)
        const extra = cloneDeep(extraSetting)
        const extraStr = JSON.stringify(extraSetting)

        switch (type) {
            case "select":
                const dataObj = {}
                extra.data.map((item) => {
                    if (item.value in dataObj && item.key) dataObj[item.value] = item.key
                    if (!(item.value in dataObj)) dataObj[item.value] = item.key
                })

                const data: any = []
                for (let item in dataObj) data.push({key: dataObj[item], value: item})
                extra.data = data
                setting.ExtraSetting = JSON.stringify(extra)

                return setting
            case "upload-path":
                extra.isTextArea = setting.Required ? extra.isTextArea : false
                setting.ExtraSetting = JSON.stringify(extra)
                return setting
            default:
                setting.ExtraSetting = extraStr === "{}" ? undefined : extraStr
                return setting
        }
    })

    const updateExtraSetting = useMemoizedFn((type: string, kind: string, key: string, value: any, index?: number) => {
        const extra = cloneDeep(extraSetting)
        switch (type) {
            case "select":
                if (Array.isArray(extra.data) && kind === "update" && index !== undefined) {
                    extra.data[index][key] = value
                    setExtraSetting({...extra})
                }
                if (Array.isArray(extra.data) && kind === "del" && index !== undefined) {
                    extra.data.splice(index, 1)
                    setExtraSetting({...extra})
                }
                return
            default:
                return
        }
    })

    const selectOptSetting = (item: {key: string; value: string}, index: number) => {
        return (
            <div key={index} className='select-type-opt'>
                <span className='opt-hint-title'>选项名称</span>
                <Input
                    className='opt-hint-input'
                    size='small'
                    value={item.key}
                    onChange={(e) => updateExtraSetting("select", "update", "key", e.target.value, index)}
                />
                <span className='opt-hint-title'>
                    <span className='form-item-required-title'>*</span>选项值
                </span>
                <Input
                    className='opt-hint-input'
                    required
                    size='small'
                    value={item.value}
                    placeholder='必填项'
                    onChange={(e) => updateExtraSetting("select", "update", "value", e.target.value, index)}
                />
                <Button
                    type='link'
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => updateExtraSetting("select", "del", "", "", index)}
                />
            </div>
        )
    }

    const extraSettingComponent = useMemoizedFn((type: string) => {
        switch (type) {
            case "select":
                return (
                    <div>
                        <SwitchItem
                            label={"是否支持多选"}
                            setValue={(value) => setExtraSetting({...extraSetting, double: value})}
                            value={!!extraSetting.double}
                            help={"多选状态时，用户选中数据保存格式为数组类型"}
                        />
                        <Form.Item label='下拉框选项数据' className='creator-form-item-margin'>
                            <Button
                                type='link'
                                onClick={() => {
                                    ;(extraSetting.data || []).push({key: "", value: ""})
                                    setExtraSetting({...extraSetting})
                                }}
                            >
                                新增选项 <PlusOutlined />
                            </Button>
                        </Form.Item>
                        <Form.Item label={" "} colon={false} className='creator-form-item-margin'>
                            {(extraSetting.data || []).map((item, index) => selectOptSetting(item, index))}
                        </Form.Item>
                    </div>
                )
            case "upload-path":
                if (!params.Required) {
                    return <></>
                }
                return (
                    <div>
                        <SwitchItem
                            label={"是否以文本域展示"}
                            setValue={(value) => setExtraSetting({...extraSetting, isTextArea: value})}
                            value={!!extraSetting.isTextArea}
                        />
                    </div>
                )
            default:
                break
        }
    })

    return (
        <>
            <Form
                onSubmitCapture={(e) => {
                    e.preventDefault()

                    if (!verify()) return false
                    props.onCreated(convert())
                }}
                labelCol={{span: 5}}
                wrapperCol={{span: 14}}
            >
                <InputItem
                    disable={!!props.modifiedParam}
                    label={"参数名（英文）"}
                    required={true}
                    placeholder={"填入想要增加的参数名"}
                    setValue={(Field) => setParams({...params, Field})}
                    value={params.Field}
                    help={"参数名应该避免特殊符号，只允许英文 / '-' 等"}
                />
                <InputItem
                    label={"参数显示名称(可中文)"}
                    placeholder={"输入想要显示的参数名"}
                    setValue={(FieldVerbose) => setParams({...params, FieldVerbose})}
                    value={params.FieldVerbose}
                />
                <SwitchItem
                    label={"必要参数"}
                    setValue={(Required) => setParams({...params, Required})}
                    value={params.Required}
                />
                <ManySelectOne
                    label={"选择参数类型"}
                    data={[
                        {text: "字符串 / string", value: "string"},
                        {text: "布尔值 / boolean", value: "boolean"},
                        {text: "HTTP 数据包 / yak", value: "http-packet"},
                        {text: "Yak 代码块 / yak", value: "yak"},
                        {text: "文本块 / text", value: "text"},
                        {text: "整数（大于零） / uint", value: "uint"},
                        {text: "浮点数 / float", value: "float"},
                        {text: "上传文件路径 / uploadPath", value: "upload-path"},
                        {text: "下拉框 / select", value: "select"}
                    ]}
                    setValue={(TypeVerbose) => typeChange(TypeVerbose)}
                    value={params.TypeVerbose}
                />
                {!["upload-path"].includes(params.TypeVerbose) && (
                    <InputItem
                        label={"默认值"}
                        placeholder={"该参数的默认值"}
                        setValue={(DefaultValue) => setParams({...params, DefaultValue})}
                        value={params.DefaultValue}
                        help={params.TypeVerbose === "select" ? "使用 逗号(,) 作为选项分隔符 " : undefined}
                    />
                )}

                {extraSettingComponent(params.TypeVerbose)}

                <InputItem
                    label={"参数帮助信息"}
                    setValue={(Help) => setParams({...params, Help})}
                    value={params.Help}
                    textarea={true}
                    textareaRow={4}
                    placeholder={"填写该参数的帮助信息，帮助用户更容易理解该内容"}
                />
                {!params.Required && (
                    <InputItem
                        label={"参数组"}
                        setValue={(Group) => setParams({...params, Group})}
                        value={params.Group}
                        placeholder={"参数组，在用户输入界面将会把参数分成组，一般用于设置可选参数`"}
                    />
                )}
                <Form.Item colon={false} label={" "}>
                    <Button type='primary' htmlType='submit'>
                        {" "}
                        添加参数{" "}
                    </Button>
                </Form.Item>
            </Form>
        </>
    )
}

export interface YakScriptLargeEditorProp {
    language?: string
    script: YakScript
    onUpdate: (data: YakScript) => any
    onExit: (data: YakScript) => any
}

export const YakScriptLargeEditor: React.FC<YakScriptLargeEditorProp> = (props) => {
    const {script} = props
    const [params, setParams] = useState<YakScript>({...script})

    useEffect(() => {
        setParams({...script})
    }, [props.script])

    return (
        <>
            <YakCodeEditor
                originValue={Buffer.from(script.Content, "utf8")}
                noTitle={true}
                noHex={true}
                onChange={(value) => setParams({...params, Content: new Buffer(value).toString("utf8")})}
                language={props.language || "yak"}
                noHeader={false}
                disableFullscreen={true}
                noPacketModifier={true}
                extra={
                    <Space style={{marginRight: 10}}>
                        <Button
                            danger={true}
                            onClick={() => {
                                // m.destroy()
                                // setFullscreen(false)
                                ipcRenderer
                                    .invoke("SaveYakScript", params)
                                    .then((data) => {
                                        info("创建 / 保存 Yak 脚本成功")
                                        props.onUpdate(data)
                                        // setModified(data)
                                    })
                                    .catch((e: any) => {
                                        failed(`保存 Yak 模块失败: ${e}`)
                                    })
                                    .finally(() => {
                                        props.onExit(params)
                                    })
                            }}
                        >
                            退出编辑界面
                        </Button>
                        <Button
                            type={"primary"}
                            disabled={[
                                // "mitm",
                                ""
                            ].includes(params.Type)}
                            onClick={() => {
                                ipcRenderer
                                    .invoke("SaveYakScript", params)
                                    .then((data: YakScript) => {
                                        info("创建 / 保存 Yak 脚本成功")
                                        props.onUpdate(data)
                                        executeYakScriptByParams(data)
                                    })
                                    .catch((e: any) => {
                                        failed(`保存 Yak 模块失败: ${e}`)
                                    })
                                    .finally(() => {
                                        // setTimeout(() => setLoading(false), 400)
                                    })
                            }}
                        >
                            {" "}
                            调试：创建(修改)并立即执行{" "}
                        </Button>
                    </Space>
                }
            />
            {/*<Card title={`ScriptName: ${params.ScriptName}`} extra={[*/}
            {/*    <Space>*/}

            {/*    </Space>*/}
            {/*]} bodyStyle={{padding: 0}}>*/}
            {/*    <div style={{*/}
            {/*        width: "100%",*/}
            {/*        height: 1000,*/}
            {/*    }}>*/}
            {/*        <YakEditor*/}
            {/*            type={"yak"}*/}
            {/*            setValue={Content => setParams({...params, Content})}*/}
            {/*            value={params.Content}*/}
            {/*        />*/}
            {/*    </div>*/}
            {/*</Card>*/}
        </>
    )
}
