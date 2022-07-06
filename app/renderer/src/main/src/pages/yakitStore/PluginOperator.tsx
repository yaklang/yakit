import React, {useEffect, useState} from "react"
import {Button, Divider, Empty, Form, PageHeader, Popconfirm, Popover, Row, Space, Tabs, Tag, Tooltip} from "antd"
import {YakScript} from "../invoker/schema"
import {failed, success} from "../../utils/notification"
import {formatTimestamp} from "../../utils/timeUtil"
import {CopyableField, InputItem} from "../../utils/inputUtil"
import {YakEditor} from "../../utils/editors"
import {showDrawer, showModal} from "../../utils/showModal"
import {PluginExecutor} from "./PluginExecutor"
import {DocumentEditor} from "./DocumentEditor"
import MDEditor from "@uiw/react-md-editor"
import {PluginHistoryTable} from "./PluginHistory"
import {openABSFile} from "../../utils/openWebsite"
import {BUILDIN_PARAM_NAME_YAKIT_PLUGIN_NAMES, YakScriptCreatorForm} from "../invoker/YakScriptCreator"
import {EditOutlined, QuestionOutlined, SettingOutlined, FieldNumberOutlined} from "@ant-design/icons"
import {YakScriptExecResultTable} from "../../components/YakScriptExecResultTable"
import {getValue} from "../../utils/kv";
import {useGetState, useMemoizedFn} from "ahooks";

import "./PluginOperator.css"
import {ResizeBox} from "../../components/ResizeBox";
import {SimplePluginList} from "../../components/SimplePluginList";
import {YakExecutorParam} from "../invoker/YakExecutorParams";

export interface YakScriptOperatorProp {
    yakScriptId: number
    size?: "big" | "small"
    fromMenu?: boolean

    setTrigger?: () => void
    setScript?: (item: any) => any
}

const {ipcRenderer} = window.require("electron")

export const PluginOperator: React.FC<YakScriptOperatorProp> = (props) => {
    const [script, setScript] = useState<YakScript>()
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [groups, setGroups] = useState<string[]>([])
    const [markdown, setMarkdown] = useState("")
    const [trigger, setTrigger] = useState(false)
    const [extraParams, setExtraParams] = useState<YakExecutorParam[]>();
    const [details, setDetails] = useState(true)

    const [settingShow, setSettingShow] = useState<boolean>(false)

    const updateGroups = () => {
        ipcRenderer
            .invoke("QueryGroupsByYakScriptId", {YakScriptId: props.yakScriptId})
            .then((data: { Groups: string[] }) => {
                setGroups(data.Groups)
            })
            .catch((e: any) => {
                console.info(e)
            })
            .finally()
    }

    const update = () => {
        if (props.yakScriptId <= 0) {
            return
        }
        updateGroups()

        setLoading(true)
        ipcRenderer
            .invoke("GetYakScriptById", {Id: props.yakScriptId})
            .then((e: YakScript) => {
                setScript(e)
                // setDetails(!e.IsGeneralModule)

                ipcRenderer
                    .invoke("GetMarkdownDocument", {
                        YakScriptId: e?.Id,
                        YakScriptName: e?.ScriptName
                    })
                    .then((data: { Markdown: string }) => {
                        setMarkdown(data.Markdown)
                    })
                    .catch((e: any) => {
                        setMarkdown("")
                    })
            })
            .catch((e: any) => {
                failed("Query YakScript By ID failed")
            })
            .finally(() =>
                setTimeout(() => {
                    setTrigger(!trigger)
                    setLoading(false)
                }, 300)
            )
    }

    useEffect(() => {
        update()
    }, [props.yakScriptId])

    // 来源于菜单进入以及开启了插件选择的话，就打开
    const enablePluginSelector = (!!script?.EnablePluginSelector) && props.fromMenu;
    const executor = useMemoizedFn(() => {
        return script && (
            <PluginExecutor
                subTitle={
                    <Space>
                        {script.Help && (
                            <Tooltip title={script.Help}>
                                <Button type={"link"} icon={<QuestionOutlined/>}/>
                            </Tooltip>
                        )}
                        <Space size={8}>
                            {/*{script?.ScriptName && (*/}
                            {/*    <Tag>{formatTimestamp(script?.CreatedAt)}</Tag>*/}
                            {/*)}*/}
                            <p style={{color: "#999999", marginBottom: 0}}>作者:{script?.Author}</p>
                            {script?.Tags
                                ? (script?.Tags || "")
                                    .split(",")
                                    .filter((i) => !!i)
                                    .map((i) => {
                                        return (
                                            <Tag
                                                style={{marginLeft: 2, marginRight: 0}}
                                                key={`${i}`}
                                                color={"geekblue"}
                                            >
                                                {i}
                                            </Tag>
                                        )
                                    })
                                : "No Tags"}
                        </Space>
                    </Space>
                }
                extraNode={
                    !props.fromMenu && (
                        <Space>
                            <Tooltip placement='top' title={"插件管理"}>
                                <Button
                                    type={"link"}
                                    icon={<SettingOutlined/>}
                                    onClick={() => setSettingShow(!settingShow)}
                                />
                            </Tooltip>
                            <Tooltip placement='top' title={"编辑插件"}>
                                <Button
                                    type={"link"}
                                    icon={<EditOutlined/>}
                                    style={{color: "#a7a7a7"}}
                                    onClick={(e) => {
                                        let m = showDrawer({
                                            title: `修改插件: ${script?.ScriptName}`,
                                            width: "100%",
                                            content: (
                                                <>
                                                    <YakScriptCreatorForm
                                                        modified={script}
                                                        onChanged={(i) => update()}
                                                        onCreated={() => {
                                                            m.destroy()
                                                        }}
                                                    />
                                                </>
                                            ),
                                            keyboard: false
                                        })
                                    }}
                                />
                            </Tooltip>
                        </Space>
                    )
                }
                script={script}
                size={props.size}
                extraYakExecutorParams={extraParams}
                settingShow={settingShow}
                settingNode={
                    <PluginManagement
                        style={{marginBottom: 10}}
                        script={script}
                        groups={groups}
                        update={() => {
                            setTimeout(() => props.setTrigger!(), 300)
                        }}
                        updateGroups={updateGroups}
                        setScript={props.setScript}
                    />
                }
            />
        )
    })

    const defaultContent = () => {
        return (
            <Tabs className="plugin-store-info" style={{height: "100%"}} type={"card"} defaultValue={"runner"}
                  tabPosition={"right"}>
                <Tabs.TabPane tab={"执行"} key={"runner"}>
                    {!enablePluginSelector && executor()}
                    {enablePluginSelector && <ResizeBox
                        firstNode={<SimplePluginList
                            pluginTypes={script?.PluginSelectorTypes || "mitm,port-scan"}
                            onSelected={names => {
                                setExtraParams([{Key: BUILDIN_PARAM_NAME_YAKIT_PLUGIN_NAMES, Value: names.join("|")}])
                            }}
                        />}
                        firstMinSize={"300px"}
                        firstRatio={"320px"}
                        secondNode={executor()}
                    >

                    </ResizeBox>}
                    {script && (
                        <PluginExecutor
                            subTitle={
                                <Space>
                                    <Tooltip title={'12312312'}><FieldNumberOutlined style={{fontSize: 20}} /></Tooltip>
                                    
                                    {script.Help && (
                                        <Tooltip title={script.Help}>
                                            <Button type={"link"} icon={<QuestionOutlined/>}/>
                                        </Tooltip>
                                    )}
                                    <Space size={8}>
                                        {/*{script?.ScriptName && (*/}
                                        {/*    <Tag>{formatTimestamp(script?.CreatedAt)}</Tag>*/}
                                        {/*)}*/}
                                        <p style={{color: "#999999", marginBottom: 0}}>作者:{script?.Author}</p>
                                        {script?.Tags
                                            ? (script?.Tags || "")
                                                .split(",")
                                                .filter((i) => !!i)
                                                .map((i) => {
                                                    return (
                                                        <Tag
                                                            style={{marginLeft: 2, marginRight: 0}}
                                                            key={`${i}`}
                                                            color={"geekblue"}
                                                        >
                                                            {i}
                                                        </Tag>
                                                    )
                                                })
                                            : "No Tags"}
                                    </Space>
                                </Space>
                            }
                            extraNode={
                                !props.fromMenu && (
                                    <Space>
                                        <Tooltip placement='top' title={"插件管理"}>
                                            <Button
                                                type={"link"}
                                                icon={<SettingOutlined/>}
                                                onClick={() => setSettingShow(!settingShow)}
                                            ></Button>
                                        </Tooltip>
                                        <Tooltip placement='top' title={"编辑插件"}>
                                            <Button
                                                type={"link"}
                                                icon={<EditOutlined/>}
                                                style={{color: "#a7a7a7"}}
                                                onClick={(e) => {
                                                    let m = showDrawer({
                                                        title: `修改插件: ${script?.ScriptName}`,
                                                        width: "100%",
                                                        content: (
                                                            <>
                                                                <YakScriptCreatorForm
                                                                    modified={script}
                                                                    onChanged={(i) => update()}
                                                                    onCreated={() => {
                                                                        m.destroy()
                                                                    }}
                                                                />
                                                            </>
                                                        ),
                                                        keyboard: false
                                                    })
                                                }}
                                            ></Button>
                                        </Tooltip>
                                    </Space>
                                )
                            }
                            script={script}
                            size={props.size}
                            settingShow={settingShow}
                            settingNode={
                                <PluginManagement
                                    style={{marginBottom: 10}}
                                    script={script}
                                    groups={groups}
                                    update={() => {
                                        setTimeout(() => props.setTrigger!(), 300)
                                    }}
                                    updateGroups={updateGroups}
                                    setScript={props.setScript}
                                />
                            }
                        />
                    )}
                </Tabs.TabPane>
                <Tabs.TabPane tab={"文档"} key={"docs"}>
                    {script && (
                        <div style={{textAlign: "right", marginBottom: 10}}>
                            <Button
                                onClick={(e) => {
                                    let m = showDrawer({
                                        title: "编辑文档",
                                        keyboard: false,
                                        width: "94%",
                                        onClose: () => {
                                            update()
                                            m.destroy()
                                        },
                                        content: (
                                            <>
                                                <DocumentEditor
                                                    onFinished={() => {
                                                        m.destroy()
                                                    }}
                                                    markdown={markdown}
                                                    yakScript={script}
                                                />
                                            </>
                                        )
                                    })
                                }}
                            >
                                编辑文档
                            </Button>
                        </div>
                    )}
                    {markdown ? (
                        <div>
                            <MDEditor.Markdown source={markdown}/>
                        </div>
                    ) : (
                        <Empty style={{marginTop: 80}} description={"插件作者未添加文档"}/>
                    )}
                </Tabs.TabPane>
                <Tabs.TabPane tab={"源码"} key={"code"}>
                    <div style={{height: "100%"}}>
                        <YakEditor
                            type={script?.Type === "nuclei" ? "yaml" : "yak"} value={script?.Content} readOnly={true}
                        />
                    </div>
                </Tabs.TabPane>
                <Tabs.TabPane tab={"历史"} key={"history"}>
                    {script && <PluginHistoryTable script={script} trigger={trigger}/>}
                    {/*<ExecHistoryTable mini={false} trigger={null as any}/>*/}
                </Tabs.TabPane>
                <Tabs.TabPane tab={"结果"} key={"results"}>
                    {script && <YakScriptExecResultTable YakScriptName={script.ScriptName} trigger={trigger}/>}
                </Tabs.TabPane>
            </Tabs>
        )
    }

    const showContent = (module: YakScript): JSX.Element => {
        if (!module) return <></>

        const key = module.GeneralModuleKey

        switch (key) {
            default:
                return defaultContent()
        }
    }

    return <div style={{
        marginLeft: 16,
        height: "100%"
    }}>{!!script && !!props.fromMenu ? showContent(script) : defaultContent()}</div>
}

export interface AddToMenuActionFormProp {
    script: YakScript
    updateGroups?: () => any
}

export const AddToMenuActionForm: React.FC<AddToMenuActionFormProp> = (props) => {
    const {script} = props
    const updateGroups = props?.updateGroups ? props.updateGroups : () => {
    }

    const [params, setParams] = useState<{
        Group: string
        YakScriptId: number
        Verbose: string
    }>({Group: "社区组件", Verbose: props.script.ScriptName, YakScriptId: props.script.Id})

    useEffect(() => {
        setParams({
            Group: "社区组件",
            Verbose: props.script.ScriptName,
            YakScriptId: props.script.Id
        })
    }, [props.script])

    return (
        <div>
            <Form
                size={"small"}
                onSubmitCapture={(e) => {
                    e.preventDefault()

                    if (!script) {
                        failed("No Yak Modeule Selected")
                        return
                    }

                    ipcRenderer
                        .invoke("AddToMenu", params)
                        .then(() => {
                            ipcRenderer.invoke("change-main-menu")
                            updateGroups()
                            success("添加成功")
                        })
                        .catch((e: any) => {
                            failed(`${e}`)
                        })
                }}
            >
                <InputItem
                    label={"菜单选项名(展示名称)"}
                    setValue={(Verbose) => setParams({...params, Verbose})}
                    value={params.Verbose}
                />
                <InputItem
                    label={"菜单分组"}
                    setValue={(Group) => setParams({...params, Group})}
                    value={params.Group}
                />
                <Form.Item colon={false} label={" "}>
                    <Button type='primary' htmlType='submit'>
                        {" "}
                        添加{" "}
                    </Button>
                </Form.Item>
            </Form>
        </div>
    )
}

interface PluginManagementProps {
    script: YakScript
    vertical?: boolean
    update?: () => any
    groups?: string[]
    updateGroups?: () => any
    style?: React.CSSProperties

    setScript?: (item: any) => any
}

export const PluginManagement: React.FC<PluginManagementProps> = React.memo<PluginManagementProps>((props) => {
    const {script, groups, style} = props
    const update = props?.update ? props.update : () => {
    }
    const updateGroups = props?.updateGroups ? props.updateGroups : () => {
    }

    return (
        <Space style={{...style}} direction={props.vertical ? "vertical" : "horizontal"}>
            <Popover
                title={`添加到左侧菜单栏中[${script?.Id}]`}
                content={<>{script && <AddToMenuActionForm script={script} updateGroups={updateGroups}/>}</>}
            >
                <Button size={"small"} type={"primary"} ghost>
                    添加到菜单栏
                </Button>
            </Popover>
            <Button
                size={"small"}
                danger={true}
                onClick={(e) => {
                    let m = showModal({
                        title: "移除菜单栏",
                        content: (
                            <Space direction={"vertical"}>
                                {(groups || []).map((element) => {
                                    return (
                                        <Button
                                            onClick={() => {
                                                ipcRenderer
                                                    .invoke("RemoveFromMenu", {
                                                        YakScriptId: script?.Id,
                                                        Group: element
                                                    })
                                                    .then(() => {
                                                        ipcRenderer.invoke("change-main-menu")
                                                        updateGroups()
                                                        m.destroy()
                                                    })
                                                    .catch((e: any) => {
                                                        console.info(e)
                                                    })
                                                    .finally()
                                            }}
                                        >
                                            从 {element} 中移除
                                        </Button>
                                    )
                                })}
                            </Space>
                        )
                    })
                }}
            >
                移除菜单栏
            </Button>
            {script?.IsIgnore ? (
                <>
                    <Popconfirm
                        title={"取消隐藏该模块？"}
                        onConfirm={() => {
                            ipcRenderer
                                .invoke("UnIgnoreYakScript", {
                                    Id: script?.Id
                                })
                                .then((e) => {
                                    success("显示该模块")
                                })
                                .catch((e: any) => {
                                })
                                .finally(() => {
                                })
                        }}
                    >
                        <Button size={"small"}>取消隐藏 / 取消忽略</Button>
                    </Popconfirm>
                </>
            ) : (
                <Popconfirm
                    title={"忽略该模块将会导致模块在插件仓库不可见，需要在插件仓库中查看"}
                    onConfirm={() => {
                        ipcRenderer
                            .invoke("IgnoreYakScript", {Id: script?.Id})
                            .then((e) => {
                                success("忽略该模块")
                            })
                            .catch((e: any) => {
                            })
                            .finally(() => {
                            })
                    }}
                >
                    <Button size={"small"} danger={true}>
                        不再关注 / 隐藏
                    </Button>
                </Popconfirm>
            )}
            <Button size={"small"} onClick={() => {
                showModal({
                    title: "导出插件配置", width: "40%", content: <>
                        <OutputPluginForm YakScriptId={script.Id}/>
                    </>
                })
            }}>导出插件</Button>
            <Button size={"small"} onClick={() => {
                ipcRenderer.invoke("send-to-tab", {
                    type: "plugin-store",
                    data: {name: script.ScriptName, code: script.Content}
                })
            }}>本地调试</Button>
            <Popconfirm
                title={"确定要删除该插件?如果添加左侧菜单栏也会同步删除，且不可恢复"}
                onConfirm={() => {
                    ipcRenderer.invoke("delete-yak-script", script.Id).then(
                        () => {
                            ipcRenderer.invoke("change-main-menu")
                            if (props.setScript) props.setScript(undefined)
                        })
                    update()
                    // setLoading(true)
                    // setTimeout(() => setTrigger(!trigger), 300)
                }}
            >
                <Button size={"small"} danger={true}>
                    删除插件
                </Button>
            </Popconfirm>
        </Space>
    )
})

export interface OutputPluginFormProp {
    YakScriptId: any
}

export const OutputPluginForm: React.FC<OutputPluginFormProp> = React.memo((props) => {
    const [_, setLocalPath, getLocalPath] = useGetState("");
    const [pluginDirName, setPluginDirName, getPluginDirName] = useGetState("");

    useEffect(() => {
        getValue("YAKIT_DEFAULT_LOAD_LOCAL_PATH").then(e => {
            if (e) {
                setLocalPath(e)
            }
        })
    }, [])

    return <>
        <Form onSubmitCapture={e => {
            e.preventDefault()

            ipcRenderer
                .invoke("ExportYakScript", {
                    YakScriptId: props.YakScriptId,
                    OutputDir: getLocalPath(),
                    OutputPluginDir: getPluginDirName(),
                })
                .then((data: { OutputDir: string }) => {
                    showModal({
                        title: "导出成功!",
                        content: (
                            <>
                                <Space direction={"vertical"}>
                                    <CopyableField text={data.OutputDir}/>
                                    <Button
                                        type={"link"}
                                        onClick={() => {
                                            openABSFile(data.OutputDir)
                                        }}
                                    >
                                        在文件夹中打开
                                    </Button>
                                </Space>
                            </>
                        )
                    })
                })
                .catch((e: any) => {
                    failed(`导出失败: ${e}`)
                })
        }}>
            <InputItem
                label={"本地仓库路径"}
                help={"可在【导出】或仓库配置中配置"}
                value={getLocalPath()}
                setValue={setLocalPath}
                required={true}
            />
            <InputItem
                label={"插件文件夹名"}
                help={"插件文件夹名，尽量精简，无特殊字符"}
                value={getPluginDirName()}
                setValue={setPluginDirName}
                required={true}
            />
            <Form.Item colon={false} label={" "}>
                <Button type="primary" htmlType="submit"> 导出到目标路径 </Button>
            </Form.Item>
        </Form>
    </>
});