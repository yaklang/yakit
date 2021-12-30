import React, { useEffect, useState } from "react"
import {
    Button,
    Card,
    Divider,
    Form,
    PageHeader,
    Popconfirm,
    Popover,
    Space,
    Switch,
    Tabs,
    Tag
} from "antd"
import { EditOutlined } from "@ant-design/icons"
import { failed, success } from "../../../../utils/notification"
import { YakScript } from "../../../../pages/invoker/schema"
import { formatTimestamp } from "../../../../utils/timeUtil"
import { showDrawer, showModal } from "../../../../utils/showModal"
import { YakScriptCreatorForm } from "../../../../pages/invoker/YakScriptCreator"
import { openABSFile } from "../../../../utils/openWebsite"
import { CopyableField, InputItem } from "../../../../utils/inputUtil"
import { DocumentEditor } from "../../../../pages/yakitStore/DocumentEditor"
import { YakEditor } from "../../../../utils/editors"
import { YakScriptExecResultTable } from "../../../YakScriptExecResultTable"
import { PluginExecutor } from "../../../../pages/yakitStore/PluginExecutor"
import { PluginHistoryTable } from "../../../../pages/yakitStore/PluginHistory"
import MDEditor from "@uiw/react-md-editor"

import "./style.css"

const { ipcRenderer } = window.require("electron")

export interface BasicCrawlerProp {
    pluginInfo: YakScript
    fromMenu: boolean
    size?: "big" | "small"
    trigger?: boolean
    update: () => void
    updateGroups: () => void
}

export const BasicCrawlerModule: React.FC<BasicCrawlerProp> = (props) => {
    const { pluginInfo, trigger } = props

    const [markdown, setMarkdown] = useState("")

    useEffect(() => {
        ipcRenderer
            .invoke("GetMarkdownDocument", {
                YakScriptId: pluginInfo?.Id,
                YakScriptName: pluginInfo?.ScriptName
            })
            .then((data: { Markdown: string }) => {
                setMarkdown(data.Markdown)
            })
            .catch((e: any) => {
                setMarkdown("")
            })
    }, [props.pluginInfo])

    return (
        <div style={{ overflow: "hidden" }}>
            <PageHeader className={"plugin-basic-crawler-header"} title={pluginInfo?.ScriptName}>
                <Space direction={"vertical"}>
                    <Space size={0}>
                        <p style={{ color: "#999999", marginBottom: 0 }}>
                            Author: {pluginInfo?.Author}
                        </p>
                        <Divider type={"vertical"} />
                        {pluginInfo?.Tags
                            ? (pluginInfo?.Tags || "")
                                  .split(",")
                                  .filter((i) => !!i)
                                  .map((i) => {
                                      return <Tag key={`${i}`}>{i}</Tag>
                                  })
                            : "No Tags"}
                    </Space>
                    <Space>
                        <CopyableField noCopy={false} text={pluginInfo?.Help} />
                    </Space>
                </Space>
            </PageHeader>

            <Tabs type={"card"} defaultValue={"runner"}>
                <Tabs.TabPane tab={"执行器 / Runner"} key={"runner"}>
                    {pluginInfo && <PluginExecutor script={pluginInfo} size={props.size} />}
                </Tabs.TabPane>
                <Tabs.TabPane tab={"文档 / Docs"} key={"docs"} disabled={!markdown}>
                    <MDEditor.Markdown source={markdown} />
                </Tabs.TabPane>
                <Tabs.TabPane tab={"插件源码 / Source Code"} key={"code"}>
                    <div style={{ height: 500 }}>
                        <YakEditor
                            type={pluginInfo?.Type || "yak"}
                            value={pluginInfo?.Content}
                            readOnly={true}
                        />
                    </div>
                </Tabs.TabPane>
                <Tabs.TabPane tab={"执行历史 / History"} key={"history"}>
                    {pluginInfo && <PluginHistoryTable script={pluginInfo} trigger={!!trigger} />}
                    {/*<ExecHistoryTable mini={false} trigger={null as any}/>*/}
                </Tabs.TabPane>
                <Tabs.TabPane tab={"结果存储 / Results"} key={"results"}>
                    {pluginInfo && (
                        <YakScriptExecResultTable
                            YakScriptName={pluginInfo.ScriptName}
                            trigger={!!trigger}
                        />
                    )}
                </Tabs.TabPane>
            </Tabs>
        </div>
    )
}

export interface AddToMenuActionFormProp {
    script: YakScript
}

export const AddToMenuActionForm: React.FC<AddToMenuActionFormProp> = (props) => {
    const { script } = props

    const [params, setParams] = useState<{
        Group: string
        YakScriptId: number
        Verbose: string
    }>({ Group: "社区组件", Verbose: props.script.ScriptName, YakScriptId: props.script.Id })

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
                            success("添加成功")
                        })
                        .catch((e: any) => {
                            failed(`${e}`)
                        })
                }}
            >
                <InputItem
                    label={"菜单选项名(展示名称)"}
                    setValue={(Verbose) => setParams({ ...params, Verbose })}
                    value={params.Verbose}
                />
                <InputItem
                    label={"菜单分组"}
                    setValue={(Group) => setParams({ ...params, Group })}
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
