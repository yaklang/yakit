import React, { useEffect, useState, useRef } from "react"
import { Button, Checkbox, Col, Form, Input, List, Popconfirm, Row, Space, Tag, Tooltip, Radio, Modal } from "antd"
import { InputItem, ManyMultiSelectForString, ManySelectOne, SelectOne, SwitchItem } from "../../utils/inputUtil"
import { QueryYakScriptRequest, QueryYakScriptsResponse, YakScript, YakScriptParam } from "./schema"
import { YakCodeEditor, YakEditor } from "../../utils/editors"
import { PlusOutlined, QuestionCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons"
import { showDrawer, showModal } from "../../utils/showModal"
import { failed, info, success, warn } from "../../utils/notification"
import { YakScriptParamsSetter } from "./YakScriptParamsSetter"
import { YakScriptRunner } from "./ExecYakScript"
import { FullscreenOutlined, DeleteOutlined } from "@ant-design/icons"
import { MITMPluginTemplate } from "./data/MITMPluginTamplate"
import { PacketHackPluginTemplate } from "./data/PacketHackPluginTemplate"
import { CodecPluginTemplate } from "./data/CodecPluginTemplate"
import { PortScanPluginTemplate } from "./data/PortScanPluginTemplate"
import { useCreation, useGetState, useMemoizedFn } from "ahooks"
import cloneDeep from "lodash/cloneDeep"
import "./YakScriptCreator.scss"
import { queryYakScriptList } from "../yakitStore/network"
import { YakExecutorParam } from "./YakExecutorParams"
import { onLocalScriptToOnlinePlugin, SyncCloudButton } from "@/components/SyncCloudButton/SyncCloudButton"
import { Route } from "@/routes/routeSpec"
import { useStore } from "@/store"
import { API } from "@/services/swagger/resposeType"
import { NetWorkApi } from "@/services/fetch"
import { SearchPluginDetailRequest } from "../yakitStore/YakitPluginInfoOnline/YakitPluginInfoOnline"

export const BUILDIN_PARAM_NAME_YAKIT_PLUGIN_NAMES = "__yakit_plugin_names__"

export interface YakScriptCreatorFormProp {
    onCreated?: (i: YakScript) => any
    modified?: YakScript
    onChanged?: (i: YakScript) => any
    fromLayout?: FromLayoutProps
    noClose?: boolean
    showButton?: boolean
    setScript?: (i: YakScript) => any
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

const { ipcRenderer } = window.require("electron")

const executeYakScriptByParams = (data: YakScript, saveDebugParams?: boolean) => {
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
                            saveDebugParams={saveDebugParams}
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
                exec([{ Key: BUILDIN_PARAM_NAME_YAKIT_PLUGIN_NAMES, Value: i.map((i) => i.ScriptName).join("|") }])
            },
            undefined,
            10,
            undefined,
            undefined,
            undefined,
            () => {
                exec([{ Key: BUILDIN_PARAM_NAME_YAKIT_PLUGIN_NAMES, Value: "no-such-plugin" }])
            }
        )
    } else {
        exec()
    }
}

export interface FromLayoutProps {
    labelCol: object
    wrapperCol: object
}

const defParams = {
    Content: "yakit.AutoInitYakit()\n\n# Input your code!\n\n",
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

export const YakScriptCreatorForm: React.FC<YakScriptCreatorFormProp> = (props) => {
    const {showButton=true} = props
    const defFromLayout = useCreation(() => {
        const col: FromLayoutProps = {
            labelCol: { span: 5 },
            wrapperCol: { span: 14 }
        }
        return col
    }, [])
    const [fromLayout, setFromLayout] = useState<FromLayoutProps>(defFromLayout)
    const [params, setParams, getParams] = useGetState<YakScript>(props.modified || defParams)
    const [paramsLoading, setParamsLoading] = useState(false)
    const [modified, setModified] = useState<YakScript | undefined>(props.modified)
    const [fullscreen, setFullscreen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [visible, setVisible] = useState<boolean>(false)
    const [saveLoading, setSaveLoading] = useState<boolean>(false)
    const [isQueryByYakScriptName, setIsQueryByYakScriptName] = useState<boolean>(false)
    useEffect(() => {
        setIsQueryByYakScriptName(!props.modified)
    }, [])

    const [updateLoading, setUpdateLoading] = useState<boolean>(false)
    const [isByMeCreatOnlienPlugin, setIsByMeCreatOnlienPlugin] = useState<boolean>(true)
    const { userInfo } = useStore()
    const debugButton = (primary?: boolean) => {
        if (loading) {
            return <Button disabled={true}>执行中...无法调试</Button>
        }
        return
    }

    const tabIsClose = useMemoizedFn((e, res: any) => {
        if (getParams().Id > 0) {
            onCloseTab()
            return
        }
        setVisible(true)
    })
    useEffect(() => {
        ipcRenderer.on("fetch-tab-isClose", tabIsClose)
        return () => {
            ipcRenderer.removeListener("fetch-tab-isClose", tabIsClose)
        }
    }, [])
    useEffect(() => {
        if (props.fromLayout) {
            setFromLayout(props.fromLayout)
        }
    }, [])

    useEffect(() => {
        if (paramsLoading) {
            setTimeout(() => {
                setParamsLoading(false)
            }, 400)
        }
    }, [paramsLoading])

    useEffect(() => {
        //创建插件才会有模块类型的修改
        switch (params.Type) {
            case "mitm":
                setParams({ ...params, Content: MITMPluginTemplate })
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
                            Required: true,
                            DefaultValue: ''
                        } as YakScriptParam,
                        {
                            Field: "ports",
                            FieldVerbose: "端口",
                            TypeVerbose: "string",
                            Required: false,
                            DefaultValue: "80",
                        } as YakScriptParam
                    ]
                })
                return
            case "packet-hack":
                setParams({
                    ...params,
                    Content: PacketHackPluginTemplate,
                    Params: [
                        { Field: "request", DefaultValue: '', TypeVerbose: "http-packet", Required: true } as YakScriptParam,
                        { Field: "response", DefaultValue: '', TypeVerbose: "http-packet", Required: false } as YakScriptParam,
                        { Field: "isHttps", DefaultValue: '', TypeVerbose: "bool" } as YakScriptParam
                    ]
                })
                return
            case "codec":
                setParams({ ...params, Content: CodecPluginTemplate })
                return
            case "nuclei":
                setParams({ ...params, Content: "# Add your nuclei formatted PoC!" })
                return
            default:
                setParams({ ...params, Content: "yakit.AutoInitYakit()\n\n# Input your code!\n\n" })
                return
        }
    }, [params.Type])

    useEffect(() => {
        if (props.modified) {
            setParams({
                ...props.modified
            })
            showButton&&getPluginDetail(props.modified?.OnlineId)
        }
    }, [props.modified])
    const getPluginDetail = useMemoizedFn((pluginId) => {
        if (!userInfo.isLogin) return
        if (pluginId as number == 0) return
        NetWorkApi<SearchPluginDetailRequest, API.YakitPluginDetailResponse>({
            method: "get",
            url: "yakit/plugin/detail",
            params: {
                id: pluginId
            }
        })
            .then((res: API.YakitPluginDetailResponse) => {
                if (res.data.user_id === userInfo.user_id) {
                    setIsByMeCreatOnlienPlugin(true)
                } else {
                    setIsByMeCreatOnlienPlugin(false)
                }
            })
            .catch((err) => {
                failed("插件详情获取失败:" + err)
            })
    })
    const onCloseTab = useMemoizedFn(() => {
        ipcRenderer
            .invoke("send-close-tab", {
                router: Route.AddYakitScript,
                singleNode: true
            })
            .then(() => {
                setVisible(false)
            })
    })
    // 仅保存本地
    const onSaveLocal = useMemoizedFn(() => {
        if (!params.ScriptName) {
            warn("请输入插件模块名!")
            return
        }
        if (isQueryByYakScriptName) {
            queryByYakScriptName()// 先查询再保存
        } else {
            onSaveYakScript()
        }
    })

    const onSaveYakScript = useMemoizedFn(() => {
        if (!params.ScriptName) {
            warn("请输入插件模块名!")
            return
        }
        setSaveLoading(true)
        ipcRenderer
            .invoke("SaveYakScript", params)
            .then((data) => {
                info("创建 / 保存 Yak 脚本成功")
                setParams(data)
                if (visible) {
                    // model提示保存后的处理
                    onCloseTab()
                    setVisible(false)
                    ipcRenderer.invoke("send-local-script-list")
                }
                props.onCreated && props.onCreated(data)
                props.onChanged && props.onChanged(data)
                setTimeout(() => ipcRenderer.invoke("change-main-menu"), 100)
            })
            .catch((e: any) => {
                failed(`保存 Yak 模块失败: ${e}`)
            })
            .finally(() => {
                setTimeout(() => {
                    setSaveLoading(false)
                }, 200)
            })
    })

    const queryByYakScriptName = useMemoizedFn(() => {
        if (!params.ScriptName) {
            warn("请输入插件模块名!")
            return
        }
        const newParams: QueryYakScriptRequest = {
            IncludedScriptNames: [params.ScriptName],
            Pagination: {
                Limit: 1,
                Page: 1,
                Order: "desc",
                OrderBy: "updated_at"
            },
        }
        setSaveLoading(true)
        ipcRenderer
            .invoke("QueryYakScript", newParams)
            .then((item: QueryYakScriptsResponse) => {
                if (item.Total as number > 0) {
                    failed(`保存 Yak 模块失败：插件名重复`)
                    return
                }
                onSaveYakScript()
            })
            .catch((e: any) => {
                failed("Query Local Yak Script failed: " + `${e}`)
            })
            .finally(() => {
                setTimeout(() => {
                    setSaveLoading(false)
                }, 200)
            })
    })
    // 修改提交内容
    const onSubmitEditContent = useMemoizedFn(() => {
        if (!userInfo.isLogin) {
            warn('请先登录');
            return
        }
        Modal.confirm({
            title: '提交的内容不会覆盖本地数据！',
            icon: <ExclamationCircleOutlined />,
            content: <div>
                <p>提交的内容只会展示给插件作者看，待审核通过后才会更新在插件商店中。</p>
                <p>提交的内容不会覆盖本地的代码，如需要保存本地，请先关闭该弹窗，在页面上点击【保存】按钮后，再点击【提交修改内容】</p>
            </div>,
            okText: '继续提交',
            cancelText: '关闭',
            onOk() {
                const newParams = onLocalScriptToOnlinePlugin(params);
                const onlineParams: API.ApplyPluginRequest = {
                    ...newParams,
                    id: parseInt(`${params.OnlineId}`),
                }
                setUpdateLoading(true)
                NetWorkApi<API.ApplyPluginRequest, API.ActionSucceeded>({
                    method: "post",
                    url: 'apply/update/plugin',
                    data: onlineParams
                }).then((res) => {
                    success('提交成功')
                }).catch((err) => {
                    failed("提交失败:" + err)
                })
                    .finally(() => {
                        setTimeout(() => {
                            setUpdateLoading(false)
                        }, 200)
                    })
            },
            onCancel() {
            },
        });

    })

    return (
        <div>
            <Form {...fromLayout}>
                <YakScriptFormContent params={params} setParams={setParams} modified={modified} setParamsLoading={setParamsLoading} />
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
                                                            setParams({ ...data })
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
                        <div style={{ height: 400 }}>
                            <YakEditor
                                type={"yak"}
                                setValue={(Content) => setParams({ ...params, Content })}
                                value={params.Content}
                            />
                        </div>
                    )}
                </Form.Item>
                <Form.Item colon={false} label={" "}>
                    <Space>
                        <Button type='primary' onClick={onSaveLocal} loading={saveLoading}>
                            保存
                        </Button>
                        {showButton&&<>
                        {
                            isByMeCreatOnlienPlugin &&
                            <SyncCloudButton
                                params={params}
                                setParams={(newSrcipt) => {
                                    setParams(newSrcipt)
                                    props.onCreated && props.onCreated(newSrcipt)
                                    props.onChanged && props.onChanged(newSrcipt)
                                }}
                            >
                                <Button>同步至云端</Button>
                            </SyncCloudButton>
                            ||
                            <>
                                <Button onClick={() => onSubmitEditContent()} loading={updateLoading}>提交修改内容</Button>
                            </>
                        }
                        </>}

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
                                        info("调试前保存插件成功")
                                        setModified(data)
                                        setParams(data)
                                        if (props.noClose) {
                                            // 不关闭修改这个模块，返回最新数据
                                            props.setScript && props.setScript(data)
                                        } else {
                                            props.onChanged && props.onChanged(data)
                                        }

                                        executeYakScriptByParams(data, true)
                                    })
                                    .catch((e: any) => {
                                        failed(`保存 Yak 模块失败: ${e} 无法调试`)
                                    })
                                    .finally(() => {
                                        setTimeout(() => setLoading(false), 400)
                                    })
                            }}
                        >
                            调试
                        </Button>
                    </Space>
                </Form.Item>
            </Form>

            <Modal
                visible={visible}
                onCancel={() => setVisible(false)}
                footer={[
                    <Button key='link' onClick={() => setVisible(false)}>
                        取消
                    </Button>,
                    <Button
                        key='submit'
                        onClick={() => {
                            onCloseTab()
                        }}
                    >
                        不保存
                    </Button>,
                    <Button key='back' type='primary' onClick={() => onSaveLocal()} loading={saveLoading}>
                        保存
                    </Button>
                ]}
            >
                <div className='save-script'>
                    <ExclamationCircleOutlined className='exclamation-icon' />
                    <span className='title'>插件未保存</span>
                    <div className='tip'>是否要保存该插件</div>
                </div>
            </Modal>
        </div>
    )
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
    const { params, modified, setParams, setParamsLoading, isShowAuthor = true, disabled } = props
    const isNucleiPoC = params.Type === "nuclei"
    return (
        <>
            <SelectOne
                disabled={!!modified}
                label={"模块类型"}
                data={[
                    { value: "yak", text: "Yak 原生模块" },
                    { value: "mitm", text: "MITM 模块" },
                    { value: "packet-hack", text: "Packet 检查" },
                    { value: "port-scan", text: "端口扫描插件" },
                    { value: "codec", text: "Codec 模块" },
                    { value: "nuclei", text: "nuclei Yaml模块" }
                ]}
                setValue={(Type) => {
                    if (["packet-hack", "codec", "nuclei"].includes(Type))
                        setParams({
                            ...params,
                            Type,
                            IsGeneralModule: false
                        })
                    else setParams({ ...params, Type })
                }}
                value={params.Type}
            />
            <InputItem
                label={"Yak 模块名"}
                required={true}
                setValue={(ScriptName) => setParams({ ...params, ScriptName })}
                value={params.ScriptName}
                disable={disabled}
            />
            <InputItem label={"简要描述"} setValue={(Help) => setParams({ ...params, Help })} value={params.Help} disable={disabled} />
            {
                isShowAuthor &&
                <InputItem
                    label={"模块作者"}
                    setValue={(Author) => setParams({ ...params, Author })}
                    value={params.Author}
                    disable={disabled}
                />
            }
            <ManyMultiSelectForString
                label={"Tags"}
                data={[{ value: "教程", label: "教程" }]}
                mode={"tags"}
                setValue={(Tags) => setParams({ ...params, Tags })}
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
                                                            `参数 [${param.Field}]${param.FieldVerbose ? `(${param.FieldVerbose})` : ""
                                                            } 已经存在，已覆盖旧参数`
                                                        )
                                                        return param
                                                    }
                                                    return item
                                                })
                                                if (!flag) paramArr.push(param)
                                                setParams({ ...params, Params: [...paramArr] })
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
                                    {!isNucleiPoC && (
                                        <Space style={{ marginLeft: 20 }}>
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
                                    ) || '--'}
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
                        label="启用插件联动 UI"
                        value={params.EnablePluginSelector}
                        setValue={(EnablePluginSelector) => setParams({ ...params, EnablePluginSelector })}
                        disabled={disabled}
                    />
                    {params.EnablePluginSelector && (
                        <ManyMultiSelectForString
                            label={"联动插件类型"}
                            value={params.PluginSelectorTypes}
                            data={["mitm", "port-scan"].map((i) => {
                                return { value: i, label: getPluginTypeVerbose(i) }
                            })}
                            mode={"multiple"}
                            setValue={(res) => {
                                setParams({ ...params, PluginSelectorTypes: res })
                            }}
                            help={"通过 cli.String(`yakit-plugin-file`) 获取用户选择的插件"}
                            disabled={disabled}
                        />
                    )}
                </>
            )}
        </>
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
    const [extraSetting, setExtraSetting] = useState<{ [key: string]: any }>(
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
                setExtraSetting({ isTextArea: false })
                break
            default:
                setExtraSetting({})
                break
        }
        setParams({ ...params, TypeVerbose: type,DefaultValue:"" })
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
                for (let item in dataObj) data.push({ key: dataObj[item], value: item })
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
                    setExtraSetting({ ...extra })
                }
                if (Array.isArray(extra.data) && kind === "del" && index !== undefined) {
                    extra.data.splice(index, 1)
                    setExtraSetting({ ...extra })
                }
                return
            default:
                return
        }
    })

    const selectOptSetting = (item: { key: string; value: string }, index: number) => {
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
                            setValue={(value) => setExtraSetting({ ...extraSetting, double: value })}
                            value={!!extraSetting.double}
                            help={"多选状态时，用户选中数据保存格式为数组类型"}
                        />
                        <Form.Item label='下拉框选项数据' className='creator-form-item-margin'>
                            <Button
                                type='link'
                                onClick={() => {
                                    ; (extraSetting.data || []).push({ key: "", value: "" })
                                    setExtraSetting({ ...extraSetting })
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
                            setValue={(value) => setExtraSetting({ ...extraSetting, isTextArea: value })}
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
                labelCol={{ span: 5 }}
                wrapperCol={{ span: 14 }}
            >
                <InputItem
                    disable={!!props.modifiedParam}
                    label={"参数名（英文）"}
                    required={true}
                    placeholder={"填入想要增加的参数名"}
                    setValue={(Field) => setParams({ ...params, Field })}
                    value={params.Field}
                    help={"参数名应该避免特殊符号，只允许英文 / '-' 等"}
                />
                <InputItem
                    label={"参数显示名称(可中文)"}
                    placeholder={"输入想要显示的参数名"}
                    setValue={(FieldVerbose) => setParams({ ...params, FieldVerbose })}
                    value={params.FieldVerbose}
                />
                <SwitchItem
                    label={"必要参数"}
                    setValue={(Required) => setParams({ ...params, Required })}
                    value={params.Required}
                />
                <ManySelectOne
                    label={"选择参数类型"}
                    data={[
                        { text: "字符串 / string", value: "string" },
                        { text: "布尔值 / boolean", value: "boolean" },
                        { text: "HTTP 数据包 / yak", value: "http-packet" },
                        { text: "Yak 代码块 / yak", value: "yak" },
                        { text: "文本块 / text", value: "text" },
                        { text: "整数（大于零） / uint", value: "uint" },
                        { text: "浮点数 / float", value: "float" },
                        { text: "上传文件路径 / uploadPath", value: "upload-path" },
                        { text: "下拉框 / select", value: "select" }
                    ]}
                    setValue={(TypeVerbose) => typeChange(TypeVerbose)}
                    value={params.TypeVerbose}
                />
                {!["upload-path","boolean"].includes(params.TypeVerbose) && (
                    <InputItem
                        label={"默认值"}
                        placeholder={"该参数的默认值"}
                        setValue={(DefaultValue) => setParams({ ...params, DefaultValue })}
                        value={params.DefaultValue}
                        help={params.TypeVerbose === "select" ? "使用 逗号(,) 作为选项分隔符 " : undefined}
                    />
                )}
                {
                  ["boolean"].includes(params.TypeVerbose)&&(
                    <ManySelectOne
                    label={"默认值"}
                    placeholder={"该参数的默认值"}
                    data={[
                        { text: "布尔值 / true", value: "true" },
                        { text: "布尔值 / false", value: "false" },
                    ]}
                    setValue={(value) => {
                        console.log("value",value,params.TypeVerbose)
                        setParams({ ...params, DefaultValue:value })
                    }}
                    value={params.DefaultValue}
                />
                  )
                }
                {extraSettingComponent(params.TypeVerbose)}

                <InputItem
                    label={"参数帮助信息"}
                    setValue={(Help) => setParams({ ...params, Help })}
                    value={params.Help}
                    textarea={true}
                    textareaRow={4}
                    placeholder={"填写该参数的帮助信息，帮助用户更容易理解该内容"}
                />
                {!params.Required && (
                    <InputItem
                        label={"参数组"}
                        setValue={(Group) => setParams({ ...params, Group })}
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
    const { script } = props
    const [params, setParams] = useState<YakScript>({ ...script })

    useEffect(() => {
        setParams({ ...script })
    }, [props.script])

    return (
        <>
            <YakCodeEditor
                originValue={Buffer.from(script.Content, "utf8")}
                noTitle={true}
                noHex={true}
                onChange={(value) => setParams({ ...params, Content: new Buffer(value).toString("utf8") })}
                language={props.language || "yak"}
                noHeader={false}
                disableFullscreen={true}
                noPacketModifier={true}
                extra={
                    <Space style={{ marginRight: 10 }}>
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
