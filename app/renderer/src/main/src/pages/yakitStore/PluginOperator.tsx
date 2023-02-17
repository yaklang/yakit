import React, {useEffect, useRef, useState} from "react"
import {
    Button,
    Upload,
    Empty,
    Form,
    PageHeader,
    Popconfirm,
    Popover,
    Row,
    Space,
    Tabs,
    Tag,
    Tooltip,
    Card,
    Badge,
    MenuItemProps
} from "antd"
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
import {EditOutlined, QuestionOutlined, SettingOutlined, CloudUploadOutlined, CloseOutlined} from "@ant-design/icons"
import {YakScriptExecResultTable} from "../../components/YakScriptExecResultTable"
import {getLocalValue, setLocalValue} from "../../utils/kv"
import {useDebounceEffect, useGetState, useHover, useMemoizedFn} from "ahooks"
import {YakitPluginInfoOnline} from "./YakitPluginInfoOnline/YakitPluginInfoOnline"
import "./PluginOperator.scss"
import {ResizeBox} from "../../components/ResizeBox"
import {SimplePluginList} from "../../components/SimplePluginList"
import {YakExecutorParam} from "../invoker/YakExecutorParams"
import {API} from "@/services/swagger/resposeType"
import {GetYakScriptByOnlineIDRequest} from "./YakitStorePage"
import {YakitPluginOnlineJournal} from "./YakitPluginOnlineJournal/YakitPluginOnlineJournal"
import {UserInfoProps} from "@/store"
import {NetWorkApi} from "@/services/fetch"
import {getRemoteValue} from "@/utils/kv"
import {YakitAutoComplete} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {MenuByGroupProps} from "../layout/HeardMenu/HeardMenuType"
import {MenuItemGroup} from "../MainOperator"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {RemoveIcon} from "@/assets/newIcon"

export interface YakScriptOperatorProp {
    yakScriptId: number
    yakScriptIdOnlineId?: number
    yakScriptUUIdOnlineUUId?: string
    size?: "big" | "small"
    fromMenu?: boolean

    setTrigger?: () => void
    setScript?: (item?: any) => any
    deletePluginLocal?: (i: YakScript) => void

    deletePluginOnline?: (p: API.YakitPluginDetail) => void
    updatePluginOnline?: (p: API.YakitPluginDetail) => void

    userInfo?: UserInfoProps
    plugSource?: string
    setMonitorEdit?: (v: boolean) => void
}

interface PromptRequest {
    id: number
}

const {ipcRenderer} = window.require("electron")

export const PluginOperator: React.FC<YakScriptOperatorProp> = (props) => {
    const {userInfo, plugSource, setMonitorEdit} = props
    const [script, setScript, getScript] = useGetState<YakScript>()
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [groups, setGroups] = useState<string[]>([])
    const [markdown, setMarkdown] = useState("")
    const [trigger, setTrigger] = useState(false)
    const [extraParams, setExtraParams] = useState<YakExecutorParam[]>()
    const [isShowJournalDot, setIsShowJournalDot] = useState(false)
    const [isEdit, setIsEdit] = useState(false)

    const [settingShow, setSettingShow] = useState<boolean>(false)
    // 是否展示（根据插件url与私有域比较）
    const [isShowPrivateDom, setIsShowPrivateDom] = useState<boolean>(true)
    const [patternMenu, setPatternMenu] = useState<"expert" | "new">("expert")

    const updateGroups = () => {
        getRemoteValue("PatternMenu").then((patternMenu) => {
            const menuMode = patternMenu || "expert"
            setPatternMenu(menuMode)
            ipcRenderer
                .invoke("QueryGroupsByYakScriptId", {YakScriptId: props.yakScriptId, Mode: menuMode})
                .then((data: {Groups: string[]}) => {
                    setGroups(data.Groups)
                })
                .catch((e: any) => {
                    console.info(e)
                })
                .finally()
        })
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

    // 来源于菜单进入以及开启了插件选择的话，就打开
    const enablePluginSelector = !!script?.EnablePluginSelector && props.fromMenu

    // OnlineBaseUrl与私有域不匹配则屏蔽云端/修改按钮并不可点击线上与日志
    useEffect(() => {
        if (getScript()?.OnlineBaseUrl && plugSource === "local") {
            getRemoteValue("httpSetting").then((value) => {
                if (getScript()?.OnlineBaseUrl && getScript()?.OnlineBaseUrl !== JSON.parse(value)?.BaseUrl) {
                    setIsShowPrivateDom(false)
                } else {
                    setIsShowPrivateDom(true)
                }
            })
        }
    }, [script])

    const executor = useMemoizedFn(() => {
        return (
            script && (
                <>
                    {(isEdit && (
                        <div className='edit-plugin-body'>
                            <div className='edit-plugin-title'>
                                <div className='title content-ellipsis'>修改插件:{script.ScriptName}</div>
                                <div>
                                    <CloseOutlined
                                        onClick={() => {
                                            setMonitorEdit && setMonitorEdit(false)
                                            setIsEdit(false)
                                            if (props.setScript) props.setScript(script)
                                            if (props.setTrigger) props.setTrigger()
                                        }}
                                    />
                                </div>
                            </div>
                            <div className='edit-plugin-form'>
                                <YakScriptCreatorForm
                                    modified={script}
                                    noClose={true}
                                    showButton={isShowPrivateDom}
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
                            </div>
                        </div>
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
                                        <Tooltip title={`插件id:${script.UUID || "-"}`}>
                                            <p className='script-author'>作者:{script?.Author}</p>
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
                                        <Tooltip placement='top' title={"插件管理"}>
                                            <Button
                                                type={"link"}
                                                icon={<SettingOutlined />}
                                                onClick={() => setSettingShow(!settingShow)}
                                            />
                                        </Tooltip>
                                        <Tooltip placement='top' title={"编辑插件"}>
                                            <Button
                                                type={"link"}
                                                icon={<EditOutlined />}
                                                style={{color: "#a7a7a7"}}
                                                onClick={(e) => {
                                                    setMonitorEdit && setMonitorEdit(true)
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
                                    patternMenu={patternMenu}
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
    const [pluginUUIdOnlineUUId, setPluginUUIdOnlineUUId] = useState<string>()
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
            // 有本地走本地
            setPluginIdOnlineId(script?.OnlineId)
            setPluginUUIdOnlineUUId(script?.UUID)
        } else {
            // 没本地走线上
            setPluginIdOnlineId(props.yakScriptIdOnlineId)
            setPluginUUIdOnlineUUId(props.yakScriptUUIdOnlineUUId)
        }
    })
    const getYakScriptLocal = useMemoizedFn((id, uuid) => {
        setLoading(true)
        ipcRenderer
            .invoke("GetYakScriptByOnlineID", {
                OnlineID: id,
                UUID: uuid
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
        // 下载插件后，刷新
        ipcRenderer.on("ref-plugin-operator", async (e: any, data: any) => {
            const {pluginOnlineId, pluginUUID} = data
            if (getScript()?.OnlineId == pluginOnlineId || getPluginIdOnlineId() === pluginOnlineId) {
                getYakScriptLocal(pluginOnlineId, pluginUUID)
            }
        })
        return () => {
            ipcRenderer.removeAllListeners("ref-plugin-operator")
        }
    }, [])
    useEffect(() => {
        if (userInfo?.isLogin) getJournalDot()
    }, [userInfo?.isLogin, pluginIdOnlineId, activeKey])

    const getJournalDot = useMemoizedFn(() => {
        if (!pluginIdOnlineId) return
        NetWorkApi<PromptRequest, boolean>({
            method: "get",
            url: "apply/prompt",
            params: {
                id: pluginIdOnlineId
            }
        })
            .then((res) => {
                setIsShowJournalDot(res)
            })
            .catch((err) => {
                // failed("获取日志红点失败:" + err)
            })
    })

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
                <Tabs.TabPane tab={"执行"} key={"runner"} disabled={isDisabledLocal}>
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
                                    sourceType='PLUGIN_OPERATOR'
                                />
                            }
                            firstMinSize={"300px"}
                            firstRatio={"320px"}
                            secondNode={executor()}
                        />
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
                </Tabs.TabPane>
                <Tabs.TabPane tab={"文档"} key={"docs"} disabled={isDisabledLocal}>
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
                        <div className='docs-markdown'>
                            <MDEditor.Markdown source={markdown} />
                        </div>
                    ) : (
                        <Empty style={{marginTop: 80}} description={"插件作者未添加文档"} />
                    )}
                </Tabs.TabPane>
                <Tabs.TabPane tab={"源码"} key={"code"} disabled={isDisabledLocal}>
                    <div style={{height: "100%"}}>
                        <YakEditor
                            type={script?.Type === "nuclei" ? "yaml" : "yak"}
                            value={script?.Content}
                            readOnly={true}
                        />
                    </div>
                </Tabs.TabPane>
                <Tabs.TabPane tab={"历史"} key={"history"} disabled={isDisabledLocal}>
                    {script && <PluginHistoryTable script={script} trigger={trigger} />}
                    {/*<ExecHistoryTable mini={false} trigger={null as any}/>*/}
                </Tabs.TabPane>
                <Tabs.TabPane tab={"结果"} key={"results"} disabled={isDisabledLocal}>
                    {script && <YakScriptExecResultTable YakScriptName={script.ScriptName} trigger={trigger} />}
                </Tabs.TabPane>
                <Tabs.TabPane tab={"线上"} key={"online"} disabled={!isShowPrivateDom || isDisabledOnline}>
                    {pluginIdOnlineId && pluginIdOnlineId > 0 && activeKey === "online" && (
                        <YakitPluginInfoOnline
                            pluginId={pluginIdOnlineId}
                            pluginUUId={pluginUUIdOnlineUUId}
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
                <Tabs.TabPane
                    tab={
                        isShowJournalDot ? (
                            <Badge dot offset={[5, -5]}>
                                <span className={`${(activeKey === "journal" && "journal-active") || ""}`}>日志</span>
                            </Badge>
                        ) : (
                            "日志"
                        )
                    }
                    key={"journal"}
                    disabled={!isShowPrivateDom || isDisabledOnline}
                >
                    {pluginIdOnlineId && pluginIdOnlineId > 0 && activeKey === "journal" && (
                        <YakitPluginOnlineJournal pluginId={pluginIdOnlineId} />
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
    visible: boolean
    updateGroups?: () => any
    setVisible: (b: boolean) => any
}

interface OptionsProps {
    label: string
    value: string
}

interface AddToMenuRequest {
    YakScriptId: number
    Group: string
    Verbose: string
    MenuSort: number
    GroupSort: number
}

export const AddToMenuActionForm: React.FC<AddToMenuActionFormProp> = (props) => {
    const [form] = Form.useForm()
    const {script, visible, setVisible} = props
    const updateGroups = props?.updateGroups ? props.updateGroups : () => {}
    const [patternMenu, setPatternMenu] = useState<"expert" | "new">("expert")
    const [menuData, setMenuData] = useState<MenuItemGroup[]>([])
    const [option, setOption] = useState<OptionsProps[]>([])

    useEffect(() => {
        form.setFieldsValue({
            Group: "社区组件",
            Verbose: props.script.ScriptName
        })
    }, [props.script])
    useEffect(() => {
        getRemoteValue("PatternMenu").then((patternMenu) => {
            const menuMode = patternMenu || "expert"
            setPatternMenu(menuMode)
            init(menuMode)
        })
    }, [visible])
    /**
     * @description:获取一级菜单
     */
    const init = useMemoizedFn((menuMode: string, updateSubMenu?: boolean) => {
        ipcRenderer
            .invoke("QueryAllMenuItem", {Mode: menuMode})
            .then((rsp: MenuByGroupProps) => {
                setOption(rsp.Groups.map((ele) => ({label: ele.Group, value: ele.Group})))
                setMenuData(rsp.Groups)
            })
            .catch((err) => {
                failed("获取菜单失败：" + err)
            })
    })
    return (
        <div>
            <Form
                size={"small"}
                form={form}
                onFinish={(values) => {
                    if (!script) {
                        failed("No Yak Modeule Selected")
                        return
                    }
                    const index = menuData.findIndex((ele) => ele.Group === values.Group)
                    // 一级排序
                    let MenuSort = menuData.length + 1
                    // 二级排序
                    let GroupSort = 0
                    if (index === -1) {
                        if (menuData.length >= 50) {
                            failed("最多添加50个一级菜单")
                            return
                        }
                    } else {
                        if (menuData[index].Items.length >= 50) {
                            failed("同一个一级菜单最多添加50个二级菜单")
                            return
                        }
                        MenuSort = menuData[index].MenuSort
                        const subIndex = menuData[index].Items.findIndex((ele) => ele.Verbose === values.Verbose)
                        GroupSort =
                            subIndex === -1
                                ? menuData[index].Items.length + 1
                                : menuData[index].Items[subIndex].GroupSort || 0
                    }
                    const prams: AddToMenuRequest = {
                        ...values,
                        YakScriptId: props.script.Id,
                        Mode: patternMenu,
                        MenuSort,
                        GroupSort
                    }
                    ipcRenderer
                        .invoke("AddToMenu", prams)
                        .then(() => {
                            ipcRenderer.invoke("change-main-menu")
                            updateGroups()
                            setVisible(false)
                            success("添加成功")
                        })
                        .catch((e: any) => {
                            failed(`${e}`)
                        })
                }}
                className='old-theme-html'
            >
                <Form.Item
                    label={"菜单选项名(展示名称)"}
                    name='Verbose'
                    rules={[{required: true, message: "该项为必填"}]}
                >
                    <YakitInput size='small' />
                </Form.Item>
                <Form.Item label={"菜单分组"} name='Group' rules={[{required: true, message: "该项为必填"}]}>
                    <YakitAutoComplete size='small' options={option} dropdownClassName='old-theme-html' />
                </Form.Item>

                <Form.Item colon={false} label={" "}>
                    <YakitButton type='primary' htmlType='submit'>
                        添加
                    </YakitButton>
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
    patternMenu: "expert" | "new"
    setScript?: (item: any) => any
    deletePluginLocal?: (i: YakScript) => void
}

export const PluginManagement: React.FC<PluginManagementProps> = React.memo<PluginManagementProps>((props) => {
    const {script, groups, style, patternMenu} = props
    const [visibleRemove, setVisibleRemove] = useState<boolean>(false)
    const [visibleAdd, setVisibleAdd] = useState<boolean>(false)
    const update = props?.update ? props.update : () => {}
    const updateGroups = props?.updateGroups ? props.updateGroups : () => {}
    return (
        <Space style={{...style}} direction={props.vertical ? "vertical" : "horizontal"}>
            <Popover
                title={`添加到菜单栏中[${script?.Id}]`}
                content={
                    <>
                        {script && (
                            <AddToMenuActionForm
                                visible={visibleAdd}
                                setVisible={setVisibleAdd}
                                script={script}
                                updateGroups={updateGroups}
                            />
                        )}
                    </>
                }
                trigger={["click"]}
                visible={visibleAdd}
                onVisibleChange={(visible) => {
                    setVisibleAdd(visible)
                }}
            >
                <Button size={"small"} type={"primary"} ghost>
                    添加到菜单栏
                </Button>
            </Popover>
            <Button
                size={"small"}
                danger={true}
                onClick={(e) => {
                    updateGroups()
                    setVisibleRemove(true)
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
            <Button
                size={"small"}
                onClick={() => {
                    showModal({
                        title: "导出插件配置",
                        width: "40%",
                        content: (
                            <>
                                <OutputPluginForm YakScriptId={script.Id} YakScriptName={script.ScriptName} />
                            </>
                        )
                    })
                }}
            >
                导出插件
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
                本地调试
            </Button>
            <Popconfirm
                title={"确定要删除该插件?如果添加左侧菜单栏也会同步删除，且不可恢复"}
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
                    删除插件
                </Button>
            </Popconfirm>
            <YakitModal
                title='移除菜单栏'
                visible={visibleRemove}
                onCancel={() => setVisibleRemove(false)}
                footer={null}
                closable={true}
                closeIcon={<RemoveIcon className='modal-remove-icon' />}
            >
                <Space direction={"vertical"} className='modal-remove-menu'>
                    {(groups &&
                        groups.length > 0 &&
                        groups.map((element) => {
                            return (
                                <Button
                                    onClick={() => {
                                        ipcRenderer
                                            .invoke("RemoveFromMenu", {
                                                YakScriptId: script?.Id,
                                                Group: element,
                                                Mode: patternMenu
                                            })
                                            .then(() => {
                                                ipcRenderer.invoke("change-main-menu")
                                                updateGroups()
                                                setVisibleRemove(false)
                                            })
                                            .catch((e: any) => {
                                                failed("移除菜单失败：" + e)
                                            })
                                            .finally()
                                    }}
                                >
                                    从 {element} 中移除
                                </Button>
                            )
                        })) ||
                        "暂无数据"}
                </Space>
            </YakitModal>
        </Space>
    )
})

export interface OutputPluginFormProp {
    YakScriptId?: number
    YakScriptName?: string
    YakScriptIds?: number[]
    isSelectAll?: boolean
}

interface ParamsProps {
    OutputDir: string
    OutputPluginDir?: string
    YakScriptId?: number
    YakScriptIds?: number[]
    All?: boolean
}

export const OutputPluginForm: React.FC<OutputPluginFormProp> = React.memo((props) => {
    const {YakScriptId, YakScriptName, YakScriptIds, isSelectAll} = props
    const [_, setLocalPath, getLocalPath] = useGetState("")
    const [pluginDirName, setPluginDirName, getPluginDirName] = useGetState(YakScriptName || "")
    const [cachePath, setCachePath, getCachePath] = useGetState<string[]>([])
    useEffect(() => {
        getLocalValue("YAKIT_DEFAULT_LOAD_LOCAL_PATH").then((e) => {
            if (e) {
                setLocalPath(e)
            }
        })

        getLocalValue("YAKIT_CACHE_LOAD_LOCAL_PATH").then((data) => {
            if (data) {
                setCachePath(JSON.parse(data))
            }
        })
    }, [])

    return (
        <>
            <Form
                onSubmitCapture={(e) => {
                    e.preventDefault()
                    let params: ParamsProps = {
                        OutputDir: getLocalPath()
                    }
                    if (YakScriptId) {
                        params.OutputPluginDir = getPluginDirName()
                        params.YakScriptId = YakScriptId
                    }
                    if (YakScriptIds && !isSelectAll) params.YakScriptIds = YakScriptIds
                    if (isSelectAll) params.All = true
                    ipcRenderer
                        .invoke("ExportYakScript", params)
                        .then((data: {OutputDir: string}) => {
                            const newCachePath = Array.from(new Set([...getCachePath(), getLocalPath()]))
                            const savePath = newCachePath.slice(-5)
                            setLocalValue("YAKIT_CACHE_LOAD_LOCAL_PATH", JSON.stringify(savePath))
                            showModal({
                                title: "导出成功!",
                                width: 520,
                                content: (
                                    <>
                                        <Space direction={"vertical"}>
                                            <CopyableField text={data.OutputDir} maxWidth='470px' />
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
                }}
            >
                <div style={{position: "relative"}}>
                    <InputItem
                        style={{width: "calc(100% - 20px)"}}
                        label={"本地仓库路径"}
                        help={"可在【导出】或仓库配置中配置"}
                        value={getLocalPath()}
                        setValue={setLocalPath}
                        required={true}
                        autoComplete={getCachePath()}
                    />
                    <Tooltip title={"选择导出路径"}>
                        <CloudUploadOutlined
                            onClick={() => {
                                ipcRenderer
                                    .invoke("openDialog", {
                                        title: "请选择文件夹",
                                        properties: ["openDirectory"]
                                    })
                                    .then((data: any) => {
                                        if (data.filePaths.length) {
                                            let absolutePath = data.filePaths[0].replace(/\\/g, "\\")
                                            setLocalPath(absolutePath)
                                        }
                                    })
                            }}
                            style={{position: "absolute", right: 0, top: 8, cursor: "pointer"}}
                        />
                    </Tooltip>
                </div>

                {YakScriptId && (
                    <InputItem
                        label={"插件文件夹名"}
                        help={"插件文件夹名，尽量精简，无特殊字符"}
                        value={getPluginDirName()}
                        setValue={setPluginDirName}
                        required={true}
                    />
                )}
                <Form.Item colon={false} label={" "}>
                    <Button type='primary' htmlType='submit'>
                        {" "}
                        导出到目标路径{" "}
                    </Button>
                </Form.Item>
            </Form>
        </>
    )
})
