import React, {useEffect, useState} from "react"
import {Button, Divider, Empty, Form, PageHeader, Popconfirm, Popover, Row, Space, Tabs, Tag, Tooltip, Card} from "antd"
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
import {EditOutlined, QuestionOutlined, SettingOutlined, FieldNumberOutlined, CloseOutlined} from "@ant-design/icons"
import {YakScriptExecResultTable} from "../../components/YakScriptExecResultTable"
import {getValue} from "../../utils/kv"
import {useDebounceEffect, useGetState, useMemoizedFn} from "ahooks"
import {YakitPluginInfoOnline} from "./YakitPluginInfoOnline/index"
import "./PluginOperator.scss"
import {ResizeBox} from "../../components/ResizeBox"
import {SimplePluginList} from "../../components/SimplePluginList"
import {YakExecutorParam} from "../invoker/YakExecutorParams"
import {API} from "@/services/swagger/resposeType"
import {GetYakScriptByOnlineIDRequest} from "./YakitStorePage"

export interface YakScriptOperatorProp {
    yakScriptId: number
    yakScriptIdOnlineId?: number
    size?: "big" | "small"
    fromMenu?: boolean

    setTrigger?: () => void
    setScript?: (item?: any) => any
    deletePluginLocal?: (i: YakScript) => void

    deletePluginOnline?: (p: API.YakitPluginDetail) => void
    updatePluginOnline?: (p: API.YakitPluginDetail) => void
}

const {ipcRenderer} = window.require("electron")

export const PluginOperator: React.FC<YakScriptOperatorProp> = (props) => {
    const [script, setScript, getScript] = useGetState<YakScript>()
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [groups, setGroups] = useState<string[]>([])
    const [markdown, setMarkdown] = useState("")
    const [trigger, setTrigger] = useState(false)
    const [extraParams, setExtraParams] = useState<YakExecutorParam[]>()
    const [details, setDetails] = useState(true)
    const [isEdit, setIsEdit] = useState(false)

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
        getYakScriptById(props.yakScriptId)
    }

    const getYakScriptById = useMemoizedFn((yakScriptId: number) => {
        updateGroups()

        setLoading(true)
        ipcRenderer
            .invoke("GetYakScriptById", {Id: yakScriptId})
            .then((e: YakScript) => {
                getLocalScriptAfter(e)
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
    })

    const getLocalScriptAfter = useMemoizedFn((e: YakScript) => {
        setScript(e)
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

    useEffect(() => {
        update()
    }, [props.yakScriptId])

    // ??????????????????????????????????????????????????????????????????
    const enablePluginSelector = !!script?.EnablePluginSelector && props.fromMenu
    const executor = useMemoizedFn(() => {
        return (
            script && (
                <>
                    {(isEdit && (
                        <>
                            <div className='edit-plugin-title'>
                                <div className='title content-ellipsis'>????????????:{script.ScriptName}</div>
                                <div>
                                    <CloseOutlined
                                        onClick={() => {
                                            setIsEdit(false)
                                            if (props.setScript) props.setScript(script)
                                            if (props.setTrigger) props.setTrigger()
                                        }}
                                    />
                                </div>
                            </div>
                            <YakScriptCreatorForm
                                modified={script}
                                noClose={true}
                                setScript={setScript}
                                onCreated={(i) => {
                                    if (props.setScript) props.setScript(i)
                                    if (props.setTrigger) props.setTrigger()
                                }}
                                fromLayout={{
                                    labelCol: {span: 4},
                                    wrapperCol: {span: 18}
                                }}
                            />
                        </>
                    )) || (
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
                                        <Tooltip title={`??????id:${script.UUID || "-"}`}>
                                            <p className='script-author'>??????:{script?.Author}</p>
                                        </Tooltip>
                                        {script?.Tags && script?.Tags !== "null"
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
                                        <Tooltip placement='top' title={"????????????"}>
                                            <Button
                                                type={"link"}
                                                icon={<SettingOutlined />}
                                                onClick={() => setSettingShow(!settingShow)}
                                            />
                                        </Tooltip>
                                        <Tooltip placement='top' title={"????????????"}>
                                            <Button
                                                type={"link"}
                                                icon={<EditOutlined />}
                                                style={{color: "#a7a7a7"}}
                                                onClick={(e) => {
                                                    setIsEdit(true)
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
                                        if (props.setScript) props.setScript(undefined)
                                    }}
                                    updateGroups={updateGroups}
                                    setScript={props.setScript}
                                    deletePluginLocal={(value) => {
                                        if (props.deletePluginLocal) props.deletePluginLocal(value)
                                    }}
                                />
                            }
                        />
                    )}
                </>
            )
        )
    })
    const [isDisabledLocal, setIsDisabledLocal] = useState<boolean>(false)
    const [isDisabledOnline, setIsDisabledOnline] = useState<boolean>(false)
    const [activeKey, setActiveKey] = useState<string>("runner")
    const [pluginIdOnlineId, setPluginIdOnlineId, getPluginIdOnlineId] = useGetState<number>()
    const refTabsAndOnlinePlugin = useMemoizedFn(() => {
        if (script) {
            setIsDisabledLocal(false)
            setActiveKey("runner")
        } else {
            setIsDisabledLocal(true)
            setActiveKey("online")
        }
        if (script && script.OnlineId == 0) {
            setIsDisabledOnline(true)
        } else {
            setIsDisabledOnline(false)
        }
        if (script && script.OnlineId > 0) {
            // ??????????????????
            setPluginIdOnlineId(script?.OnlineId)
        } else {
            // ??????????????????
            setPluginIdOnlineId(props.yakScriptIdOnlineId)
        }
    })
    const getYakScriptLocal = useMemoizedFn((id) => {
        setLoading(true)
        ipcRenderer
            .invoke("GetYakScriptByOnlineID", {
                OnlineID: id
            } as GetYakScriptByOnlineIDRequest)
            .then((newSrcipt: YakScript) => {
                setIsDisabledLocal(false)
                setActiveKey("runner")
                setPluginIdOnlineId(0)
                if (props.setScript) props.setScript(newSrcipt)
                getLocalScriptAfter(newSrcipt)
            })
            .catch((e) => {})
            .finally(() => {
                setTimeout(() => {
                    setTrigger(!trigger)
                    setLoading(false)
                }, 300)
            })
    })
    useDebounceEffect(
        () => {
            refTabsAndOnlinePlugin()
        },
        [script?.OnlineId, props.yakScriptIdOnlineId],
        {wait: 200}
    )

    useEffect(() => {
        // ????????????????????????
        ipcRenderer.on("ref-plugin-operator", async (e: any, data: any) => {
            const {pluginOnlineId} = data
            if (getScript()?.OnlineId == pluginOnlineId || getPluginIdOnlineId() === pluginOnlineId) {
                getYakScriptLocal(pluginOnlineId)
            }
        })
        return () => {
            ipcRenderer.removeAllListeners("ref-plugin-operator")
        }
    }, [])
    const defaultContent = () => {
        return (
            <Tabs
                className='plugin-store-info'
                style={{height: "100%"}}
                type={"card"}
                tabPosition={"right"}
                activeKey={activeKey}
                onTabClick={setActiveKey}
            >
                <Tabs.TabPane tab={"??????"} key={"runner"} disabled={isDisabledLocal}>
                    {!enablePluginSelector && executor()}
                    {enablePluginSelector && (
                        <ResizeBox
                            firstNode={
                                <SimplePluginList
                                    pluginTypes={script?.PluginSelectorTypes || "mitm,port-scan"}
                                    onSelected={(names) => {
                                        setExtraParams([
                                            {Key: BUILDIN_PARAM_NAME_YAKIT_PLUGIN_NAMES, Value: names.join("|")}
                                        ])
                                    }}
                                />
                            }
                            firstMinSize={"300px"}
                            firstRatio={"320px"}
                            secondNode={executor()}
                        ></ResizeBox>
                    )}
                    {/* {script && (
                        <PluginExecutor
                            subTitle={
                                <Space>
                                    <Tooltip title={"12312312"}>
                                        <FieldNumberOutlined style={{fontSize: 20}} />
                                    </Tooltip>

                                    {script.Help && (
                                        <Tooltip title={script.Help}>
                                            <Button type={"link"} icon={<QuestionOutlined />} />
                                        </Tooltip>
                                    )}
                                    <Space size={8}>
                                        <p style={{color: "#999999", marginBottom: 0}}>??????:{script?.Author}</p>
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
                                        <Tooltip placement='top' title={"????????????"}>
                                            <Button
                                                type={"link"}
                                                icon={<SettingOutlined />}
                                                onClick={() => setSettingShow(!settingShow)}
                                            ></Button>
                                        </Tooltip>
                                        <Tooltip placement='top' title={"????????????"}>
                                            <Button
                                                type={"link"}
                                                icon={<EditOutlined />}
                                                style={{color: "#a7a7a7"}}
                                                onClick={(e) => {
                                                    let m = showDrawer({
                                                        title: `????????????: ${script?.ScriptName}`,
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
                    )} */}
                    {enablePluginSelector && (
                        <ResizeBox
                            firstNode={
                                <SimplePluginList
                                    pluginTypes={script?.PluginSelectorTypes || "mitm,port-scan"}
                                    onSelected={(names) => {
                                        setExtraParams([
                                            {Key: BUILDIN_PARAM_NAME_YAKIT_PLUGIN_NAMES, Value: names.join("|")}
                                        ])
                                    }}
                                />
                            }
                            firstMinSize={"300px"}
                            firstRatio={"320px"}
                            secondNode={executor()}
                        ></ResizeBox>
                    )}
                </Tabs.TabPane>
                <Tabs.TabPane tab={"??????"} key={"docs"} disabled={isDisabledLocal}>
                    {script && (
                        <div style={{textAlign: "right", marginBottom: 10}}>
                            <Button
                                onClick={(e) => {
                                    let m = showDrawer({
                                        title: "????????????",
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
                                ????????????
                            </Button>
                        </div>
                    )}
                    {markdown ? (
                        <div>
                            <MDEditor.Markdown source={markdown} />
                        </div>
                    ) : (
                        <Empty style={{marginTop: 80}} description={"???????????????????????????"} />
                    )}
                </Tabs.TabPane>
                <Tabs.TabPane tab={"??????"} key={"code"} disabled={isDisabledLocal}>
                    <div style={{height: "100%"}}>
                        <YakEditor
                            type={script?.Type === "nuclei" ? "yaml" : "yak"}
                            value={script?.Content}
                            readOnly={true}
                        />
                    </div>
                </Tabs.TabPane>
                <Tabs.TabPane tab={"??????"} key={"history"} disabled={isDisabledLocal}>
                    {script && <PluginHistoryTable script={script} trigger={trigger} />}
                    {/*<ExecHistoryTable mini={false} trigger={null as any}/>*/}
                </Tabs.TabPane>
                <Tabs.TabPane tab={"??????"} key={"results"} disabled={isDisabledLocal}>
                    {script && <YakScriptExecResultTable YakScriptName={script.ScriptName} trigger={trigger} />}
                </Tabs.TabPane>
                <Tabs.TabPane tab={"??????"} key={"online"} disabled={isDisabledOnline}>
                    {pluginIdOnlineId && pluginIdOnlineId > 0 && (
                        <YakitPluginInfoOnline
                            pluginId={pluginIdOnlineId}
                            deletePlugin={(p) => {
                                if (props.deletePluginOnline) props.deletePluginOnline(p)
                            }}
                            updatePlugin={(p) => {
                                if (props.updatePluginOnline) props.updatePluginOnline(p)
                            }}
                            deletePluginLocal={(s) => {
                                if (props.deletePluginLocal) props.deletePluginLocal(s)
                            }}
                        />
                    )}
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
    return (
        <div
            style={{
                marginLeft: 16,
                height: "100%"
            }}
        >
            {!!script && !!props.fromMenu ? showContent(script) : defaultContent()}
        </div>
    )
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
    }>({
        Group: "????????????",
        Verbose: props.script.ScriptName,
        YakScriptId: props.script.Id
    })

    useEffect(() => {
        setParams({
            Group: "????????????",
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
                            success("????????????")
                        })
                        .catch((e: any) => {
                            failed(`${e}`)
                        })
                }}
            >
                <InputItem
                    label={"???????????????(????????????)"}
                    setValue={(Verbose) => setParams({...params, Verbose})}
                    value={params.Verbose}
                />
                <InputItem
                    label={"????????????"}
                    setValue={(Group) => setParams({...params, Group})}
                    value={params.Group}
                />
                <Form.Item colon={false} label={" "}>
                    <Button type='primary' htmlType='submit'>
                        {" "}
                        ??????{" "}
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
    deletePluginLocal?: (i: YakScript) => void
}

export const PluginManagement: React.FC<PluginManagementProps> = React.memo<PluginManagementProps>((props) => {
    const {script, groups, style} = props
    const update = props?.update ? props.update : () => {}
    const updateGroups = props?.updateGroups ? props.updateGroups : () => {}

    return (
        <Space style={{...style}} direction={props.vertical ? "vertical" : "horizontal"}>
            <Popover
                title={`???????????????????????????[${script?.Id}]`}
                content={<>{script && <AddToMenuActionForm script={script} updateGroups={updateGroups} />}</>}
            >
                <Button size={"small"} type={"primary"} ghost>
                    ??????????????????
                </Button>
            </Popover>
            <Button
                size={"small"}
                danger={true}
                onClick={(e) => {
                    let m = showModal({
                        title: "???????????????",
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
                                            ??? {element} ?????????
                                        </Button>
                                    )
                                })}
                            </Space>
                        )
                    })
                }}
            >
                ???????????????
            </Button>
            {script?.IsIgnore ? (
                <>
                    <Popconfirm
                        title={"????????????????????????"}
                        onConfirm={() => {
                            ipcRenderer
                                .invoke("UnIgnoreYakScript", {
                                    Id: script?.Id
                                })
                                .then((e) => {
                                    success("???????????????")
                                })
                                .catch((e: any) => {})
                                .finally(() => {})
                        }}
                    >
                        <Button size={"small"}>???????????? / ????????????</Button>
                    </Popconfirm>
                </>
            ) : (
                <Popconfirm
                    title={"??????????????????????????????????????????????????????????????????????????????????????????"}
                    onConfirm={() => {
                        ipcRenderer
                            .invoke("IgnoreYakScript", {Id: script?.Id})
                            .then((e) => {
                                success("???????????????")
                            })
                            .catch((e: any) => {})
                            .finally(() => {})
                    }}
                >
                    <Button size={"small"} danger={true}>
                        ???????????? / ??????
                    </Button>
                </Popconfirm>
            )}
            <Button
                size={"small"}
                onClick={() => {
                    showModal({
                        title: "??????????????????",
                        width: "40%",
                        content: (
                            <>
                                <OutputPluginForm YakScriptId={script.Id} />
                            </>
                        )
                    })
                }}
            >
                ????????????
            </Button>
            <Button
                size={"small"}
                onClick={() => {
                    ipcRenderer.invoke("send-to-tab", {
                        type: "plugin-store",
                        data: {name: script.ScriptName, code: script.Content}
                    })
                }}
            >
                ????????????
            </Button>
            <Popconfirm
                title={"????????????????????????????????????????????????????????????????????????????????????????"}
                onConfirm={() => {
                    ipcRenderer.invoke("delete-yak-script", script.Id).then(() => {
                        ipcRenderer.invoke("change-main-menu")
                        if (props.deletePluginLocal) props.deletePluginLocal(script)
                        if (props.setScript) props.setScript(undefined)
                        update()
                    })
                }}
            >
                <Button size={"small"} danger={true}>
                    ????????????
                </Button>
            </Popconfirm>
        </Space>
    )
})

export interface OutputPluginFormProp {
    YakScriptId: any
}

export const OutputPluginForm: React.FC<OutputPluginFormProp> = React.memo((props) => {
    const [_, setLocalPath, getLocalPath] = useGetState("")
    const [pluginDirName, setPluginDirName, getPluginDirName] = useGetState("")

    useEffect(() => {
        getValue("YAKIT_DEFAULT_LOAD_LOCAL_PATH").then((e) => {
            if (e) {
                setLocalPath(e)
            }
        })
    }, [])

    return (
        <>
            <Form
                onSubmitCapture={(e) => {
                    e.preventDefault()

                    ipcRenderer
                        .invoke("ExportYakScript", {
                            YakScriptId: props.YakScriptId,
                            OutputDir: getLocalPath(),
                            OutputPluginDir: getPluginDirName()
                        })
                        .then((data: {OutputDir: string}) => {
                            showModal({
                                title: "????????????!",
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
                                                ?????????????????????
                                            </Button>
                                        </Space>
                                    </>
                                )
                            })
                        })
                        .catch((e: any) => {
                            failed(`????????????: ${e}`)
                        })
                }}
            >
                <InputItem
                    label={"??????????????????"}
                    help={"??????????????????????????????????????????"}
                    value={getLocalPath()}
                    setValue={setLocalPath}
                    required={true}
                />
                <InputItem
                    label={"??????????????????"}
                    help={"???????????????????????????????????????????????????"}
                    value={getPluginDirName()}
                    setValue={setPluginDirName}
                    required={true}
                />
                <Form.Item colon={false} label={" "}>
                    <Button type='primary' htmlType='submit'>
                        {" "}
                        ?????????????????????{" "}
                    </Button>
                </Form.Item>
            </Form>
        </>
    )
})
