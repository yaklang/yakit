import { FromLayoutProps, YakScriptFormContent, YakScriptLargeEditor } from "@/pages/invoker/YakScriptCreator"
import { Route } from "@/routes/routeSpec"
import { Button, Card, Form, Space } from "antd"
import React, { useEffect, useRef, useState } from "react"
import { useCreation, useGetState, useMemoizedFn } from "ahooks"
import './YakitPluginJournalDetails.scss'
import { YakScript } from "@/pages/invoker/schema"
import { FullscreenOutlined } from "@ant-design/icons"
import { showDrawer } from "@/utils/showModal"
import { YakEditor } from "@/utils/editors"
import { CodeComparison, DataCompare } from "@/pages/compare/DataCompare"
import { LineConversionIcon } from "@/assets/icons"

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
    const [fullscreen, setFullscreen] = useState(false)
    const [params, setParams, getParams] = useGetState<YakScript>(defParams)
    const [originalCode, setOriginalCode,] = useState<string>(defParams.Content)
    const [modifiedCode, setModifiedCode,] = useState<string>("yakit.AutoInitYakit()\n\n# Input your code!\n\n55555\n\n",)

    const [rightParams, setRightParams, getRightParams] = useGetState<YakScript>({
        ...defParams,
    })
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
                                                width: "100%",
                                                closable: false,
                                                keyboard: false,
                                                content: (
                                                    <FullScreenCode
                                                        originalCode={originalCode}
                                                        setModifiedCode={setModifiedCode}
                                                        modifiedCode={modifiedCode}
                                                        onClose={() => { m.destroy(); setFullscreen(false) }}
                                                    />
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
                        {
                            !fullscreen &&
                            <div className="yak-editor-content">
                                <div className="yak-editor-tip">
                                    <div>当前插件源码</div>
                                    <div>申请人提交源码</div>
                                </div>
                                <div className="yak-editor-item">
                                    <CodeComparison
                                        leftCode={originalCode}
                                        setRightCode={setModifiedCode}
                                        rightCode={modifiedCode}
                                        originalEditable={false}
                                    />
                                </div>
                            </div>
                        }
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

interface FullScreenCodeProps {
    originalCode: string
    setModifiedCode: (s: string) => void
    modifiedCode: string
    onClose: () => void
}


const FullScreenCode: React.FC<FullScreenCodeProps> = (props) => {
    const { originalCode, setModifiedCode, modifiedCode, onClose } = props;
    const [noWrap, setNoWrap] = useState<boolean>(false)
    const [rightCode, setRightCode] = useState<string>(modifiedCode)
    const fullCodeComparisonRef = useRef<any>(null)
    useEffect(() => {
        setRightCode(modifiedCode)
    }, [modifiedCode])
    return (
        <Card
            bordered={false}
            title="数据对比"
            extra={
                <Space>
                    <Button
                        type="link"
                        size="small"
                        icon={<FullscreenOutlined style={{ fontSize: 20 }} />}
                        onClick={() => onClose()}
                    />
                    <Button
                        size={"small"}
                        type={!noWrap ? "primary" : "link"}
                        icon={<LineConversionIcon />}
                        onClick={() => {
                            fullCodeComparisonRef.current?.onChangeLineConversion()
                        }}
                    />
                </Space>
            }
            style={{ height: 'calc(100% - 48px)' }}
            bodyStyle={{ height: '100%', padding: 0 }}
        >
            <div className="yak-editor-tip">
                <div>当前插件源码</div>
                <div>申请人提交源码</div>
            </div>
            <div className="yak-editor-full-item">
                <CodeComparison
                    ref={fullCodeComparisonRef}
                    noWrap={noWrap}
                    setNoWrap={setNoWrap}
                    leftCode={originalCode}
                    setRightCode={(c) => {
                        setRightCode(c)
                        setModifiedCode(c)
                    }}
                    rightCode={rightCode}
                    originalEditable={false}
                />
            </div>
        </Card>
    )
}