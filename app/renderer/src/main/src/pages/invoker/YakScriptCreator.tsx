import React, {useState} from "react"
import {Button, Form, Input, List, Popconfirm, Space, Tag} from "antd"
import {InputItem, ManyMultiSelectForString, ManySelectOne, SelectOne, SwitchItem} from "../../utils/inputUtil"
import {YakScript} from "./schema"
import {PlusOutlined} from "@ant-design/icons"
import {showModal} from "../../utils/showModal"
import {failed, info} from "../../utils/notification"
import {DeleteOutlined} from "@ant-design/icons"
import {CustomDnsLogPlatformTemplate, YakTemplate} from "./data/CodecPluginTemplate"
import {useMemoizedFn} from "ahooks"
import cloneDeep from "lodash/cloneDeep"
import "./YakScriptCreator.scss"
import { addTag, removeTag } from "../customizeMenu/utils"
import { YakParamProps } from "../plugins/pluginsType"

export const BUILDIN_PARAM_NAME_YAKIT_PLUGIN_NAMES = "__yakit_plugin_names__"

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

export interface FromLayoutProps {
    labelCol: object
    wrapperCol: object
}

const defParams = {
    Content: YakTemplate,
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
    FromGit: "",
    UUID: ""
}

interface YakScriptFormContentProps {
    params: YakScript
    setParams: (y: YakScript) => void
    modified?: YakScript | undefined
    setParamsLoading?: (b: boolean) => void
    isShowAuthor?: boolean
    disabled?: boolean
}

export const YakScriptFormContent: React.FC<YakScriptFormContentProps> = (props) => {
    const {params, modified, setParams, setParamsLoading, isShowAuthor = true, disabled} = props
    const isNucleiPoC = params.Type === "nuclei"
    return (
        <>
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
                disable={disabled}
            />
            <InputItem
                label={"简要描述"}
                setValue={(Help) => setParams({...params, Help})}
                value={params.Help}
                disable={disabled}
            />
            {isShowAuthor && (
                <InputItem
                    label={"模块作者"}
                    setValue={(Author) => setParams({...params, Author})}
                    value={params.Author}
                    disable={disabled}
                />
            )}
            <ManyMultiSelectForString
                label={"Tags"}
                data={[{value: "教程", label: "教程"}]}
                mode={"tags"}
                setValue={(Tags) => setParams({...params, Tags})}
                value={params.Tags && params.Tags !== "null" ? params.Tags : ""}
                disabled={disabled}
            />
            {["yak", "mitm"].includes(params.Type) && (
                <Form.Item label={"增加参数"}>
                    <Button
                        type={"link"}
                        onClick={() => {
                            if (disabled) return
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
                        disabled={disabled}
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
                                    {(!isNucleiPoC && (
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
                                                disabled={disabled}
                                            >
                                                修改参数
                                            </Button>
                                            <Popconfirm
                                                title={"确认要删除该参数吗？"}
                                                onConfirm={(e) => {
                                                    if (setParamsLoading) setParamsLoading(true)
                                                    setParams({
                                                        ...params,
                                                        Params: params.Params.filter((i) => i.Field !== p.Field)
                                                    })
                                                }}
                                            >
                                                <Button size={"small"} type={"link"} danger={true} disabled={disabled}>
                                                    删除参数
                                                </Button>
                                            </Popconfirm>
                                        </Space>
                                    )) ||
                                        "--"}
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
                        label='启用插件联动 UI'
                        value={params.EnablePluginSelector}
                        setValue={(EnablePluginSelector) => setParams({...params, EnablePluginSelector})}
                        disabled={disabled}
                    />
                    <SwitchItem
                        label='用于自定义 DNSLOG'
                        value={params.Tags && params.Tags.includes("custom-dnslog-platform") ? true : false}
                        setValue={(enalbed) => {
                            let obj = {
                                ...params, 
                                Tags: enalbed? addTag(params.Tags === "null"?"":params.Tags, "custom-dnslog-platform"): removeTag(params.Tags, "custom-dnslog-platform"),
                                Content:defParams.Content
                            }
                            if(enalbed){obj.Content = CustomDnsLogPlatformTemplate}
                            setParams(obj)
                        }}
                        disabled={disabled}
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
                            disabled={disabled}
                        />
                    )}
                </>
            )}
             {params.Type === "codec" && (
                <>
                    <SwitchItem
                        label='用于HTTP数据包变形'
                        value={  
                            params.Tags && params.Tags.includes("allow-custom-http-packet-mutate") ? true : false
                        }
                        setValue={(enalbed) => setParams({...params, Tags: enalbed? addTag(params.Tags === "null"?"":params.Tags, "allow-custom-http-packet-mutate"): removeTag(params.Tags, "allow-custom-http-packet-mutate")})}
                        disabled={disabled}
                    />
                </>
            )}
        </>
    )
}

export interface CreateYakScriptParamFormProp {
    modifiedParam?: YakParamProps
    onCreated: (params: YakParamProps) => any
}

export const CreateYakScriptParamForm: React.FC<CreateYakScriptParamFormProp> = (props) => {
    const [params, setParams] = useState<YakParamProps>(
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
        setParams({...params, TypeVerbose: type, DefaultValue: ""})
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
        const setting: YakParamProps = cloneDeep(params)
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
                {!["upload-path", "boolean"].includes(params.TypeVerbose) && (
                    <InputItem
                        label={"默认值"}
                        placeholder={"该参数的默认值"}
                        setValue={(DefaultValue) => setParams({...params, DefaultValue})}
                        value={params.DefaultValue}
                        help={params.TypeVerbose === "select" ? "使用 逗号(,) 作为选项分隔符 " : undefined}
                    />
                )}
                {["boolean"].includes(params.TypeVerbose) && (
                    <ManySelectOne
                        label={"默认值"}
                        placeholder={"该参数的默认值"}
                        data={[
                            {text: "布尔值 / true", value: "true"},
                            {text: "布尔值 / false", value: "false"}
                        ]}
                        setValue={(value) => {
                            setParams({...params, DefaultValue: value})
                        }}
                        value={params.DefaultValue}
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
