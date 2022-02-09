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
import {EditOutlined, QuestionOutlined, SettingOutlined} from "@ant-design/icons"
import {YakScriptCreatorForm} from "../invoker/YakScriptCreator"
import {YakScriptExecResultTable} from "../../components/YakScriptExecResultTable"

export interface YakScriptOperatorProp {
    yakScriptId: number
    size?: "big" | "small"
    fromMenu?: boolean

    setTrigger?: () => void
}

const {ipcRenderer} = window.require("electron")

export const PluginOperator: React.FC<YakScriptOperatorProp> = (props) => {
    const [script, setScript] = useState<YakScript>()
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [groups, setGroups] = useState<string[]>([])
    const [markdown, setMarkdown] = useState("")
    const [trigger, setTrigger] = useState(false)
    const [details, setDetails] = useState(true)

    const [settingShow, setSettingShow] = useState<boolean>(false)

    const updateGroups = () => {
        ipcRenderer
            .invoke("QueryGroupsByYakScriptId", {YakScriptId: props.yakScriptId})
            .then((data: {Groups: string[]}) => {
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
                    .then((data: {Markdown: string}) => {
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

    const defaultContent = () => {
        return (
            <Tabs type={"card"} defaultValue={"runner"} tabPosition={"right"}>
                <Tabs.TabPane tab={"执行"} key={"runner"}>
                    {script && (
                        <PluginExecutor
                            subTitle={
                                <Space>
                                    {script.Help && (
                                        <Tooltip title={script.Help}>
                                            <Button type={"link"} icon={<QuestionOutlined />} />
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
                                                icon={<SettingOutlined />}
                                                onClick={() => setSettingShow(!settingShow)}
                                            ></Button>
                                        </Tooltip>
                                        <Tooltip placement='top' title={"编辑插件"}>
                                            <Button
                                                type={"link"}
                                                icon={<EditOutlined />}
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
                            primaryParamsOnly={true}
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
                            <MDEditor.Markdown source={markdown} />
                        </div>
                    ) : (
                        <Empty style={{marginTop: 80}} description={"插件作者未添加文档"} />
                    )}
                </Tabs.TabPane>
                <Tabs.TabPane tab={"源码"} key={"code"}>
                    <div style={{height: 500}}>
                        <YakEditor type={script?.Type || "yak"} value={script?.Content} readOnly={true} />
                    </div>
                </Tabs.TabPane>
                <Tabs.TabPane tab={"历史"} key={"history"}>
                    {script && <PluginHistoryTable script={script} trigger={trigger} />}
                    {/*<ExecHistoryTable mini={false} trigger={null as any}/>*/}
                </Tabs.TabPane>
                <Tabs.TabPane tab={"结果"} key={"results"}>
                    {script && <YakScriptExecResultTable YakScriptName={script.ScriptName} trigger={trigger} />}
                </Tabs.TabPane>
            </Tabs>
        )
    }

    const showContent = (module: YakScript): JSX.Element => {
        if (!module) return <></>

        const key = module.GeneralModuleKey

        switch (key) {
            // case "basic-crawler":
            //     return (
            //         <BasicCrawlerModule
            //             pluginInfo={module}
            //             fromMenu={!!props.fromMenu}
            //             trigger={trigger}
            //             update={update}
            //             updateGroups={updateGroups}
            //         />
            //     )
            default:
                return defaultContent()
        }
    }

    useEffect(() => {
        update()
    }, [props.yakScriptId])

    return <div style={{marginLeft: 16}}>{!!script && !!props.fromMenu ? showContent(script) : defaultContent()}</div>
}

export interface AddToMenuActionFormProp {
    script: YakScript
    updateGroups?: () => any
}

export const AddToMenuActionForm: React.FC<AddToMenuActionFormProp> = (props) => {
    const {script} = props
    const updateGroups = props?.updateGroups ? props.updateGroups : () => {}

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
}

export const PluginManagement: React.FC<PluginManagementProps> = React.memo<PluginManagementProps>((props) => {
    const {script, groups, style} = props
    const update = props?.update ? props.update : () => {}
    const updateGroups = props?.updateGroups ? props.updateGroups : () => {}

    return (
        <Space style={{...style}} direction={props.vertical ? "vertical" : "horizontal"}>
            {/* <Button
                type={"link"}
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
                icon={<EditOutlined />}
                size={"small"}
            >
                修改插件
            </Button> */}
            <Popover
                title={`添加到左侧菜单栏中[${script?.Id}]`}
                content={<>{script && <AddToMenuActionForm script={script} updateGroups={updateGroups} />}</>}
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
                                .catch((e: any) => {})
                                .finally(() => {})
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
                            .catch((e: any) => {})
                            .finally(() => {})
                    }}
                >
                    <Button size={"small"} danger={true}>
                        不再关注 / 隐藏
                    </Button>
                </Popconfirm>
            )}
            <Popconfirm
                title={"导出成功后，将会自动打开导出的路径"}
                onConfirm={(e) => {
                    ipcRenderer
                        .invoke("ExportYakScript", {
                            YakScriptId: script?.Id
                        })
                        .then((data: {OutputDir: string}) => {
                            showModal({
                                title: "导出成功!",
                                content: (
                                    <>
                                        <Space direction={"vertical"}>
                                            <CopyableField text={data.OutputDir} />
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
                            console.info(e)
                        })
                }}
            >
                <Button size={"small"}>导出插件</Button>
            </Popconfirm>
            <Popconfirm
                title={"确定要删除该插件？删除之后不可恢复"}
                onConfirm={() => {
                    ipcRenderer.invoke("delete-yak-script", script.Id)
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
