import { FromLayoutProps, YakScriptFormContent, YakScriptLargeEditor } from "@/pages/invoker/YakScriptCreator"
import { Route } from "@/routes/routeSpec"
import { Button, Card, Form, Space } from "antd"
import React, { useEffect, useState } from "react"
import { useCreation, useGetState, useMemoizedFn } from "ahooks"
import './YakitPluginJournalDetails.scss'
import { YakScript } from "@/pages/invoker/schema"
import { FullscreenOutlined } from "@ant-design/icons"
import { showDrawer } from "@/utils/showModal"
import { YakEditor } from "@/utils/editors"
import { DataCompare } from "@/pages/compare/DataCompare"

const { ipcRenderer } = window.require("electron")

interface YakitPluginJournalDetailsProps {
    YakitPluginJournalDetailsId: number
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


export const YakitPluginJournalDetails: React.FC<YakitPluginJournalDetailsProps> = (props) => {
    const defFromLayout = useCreation(() => {
        const col: FromLayoutProps = {
            labelCol: { span: 5 },
            wrapperCol: { span: 14 }
        }
        return col
    }, [])
    const { YakitPluginJournalDetailsId } = props;
    const [params, setParams, getParams] = useGetState<YakScript>(defParams)
    const [fullscreen, setFullscreen] = useState(false)
    return (
        <div>
            <Card title="修改详情" bordered={false}>
                <Form {...defFromLayout}>
                    <YakScriptFormContent params={params} setParams={setParams} />
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
                                                        <DataCompare />
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
                                </Space>
                            </>
                        }
                    >
                        {!fullscreen && (
                            <div className="yak-editor-content">
                                <div className="yak-editor-item">
                                    <p>提交的代码</p>
                                    <div className="yak-editor">
                                        <YakEditor
                                            type={"yak"}
                                            setValue={(Content) => setParams({ ...params, Content })}
                                            value={params.Content}
                                        />
                                    </div>
                                </div>
                                <div className="yak-editor-item">
                                    <p>最新的代码</p>
                                    <div className="yak-editor">
                                        <YakEditor
                                            type={"yak"}
                                            setValue={(Content) => setParams({ ...params, Content })}
                                            value={params.Content}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </Form.Item>
                    <Form.Item colon={false} label={" "}>
                        <Space>
                            <Button type='primary' danger onClick={() => { }} >
                                拒绝
                            </Button>
                            <Button type='primary' onClick={() => { }} >
                                同意
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    )
}
