import React, {useEffect, useState} from "react";
import {Button, Card, Col, Collapse, Empty, Form, Row, Space, Tag} from "antd";
import {YakScript, YakScriptHooks} from "../invoker/schema";
import {YakExecutorParam} from "../invoker/YakExecutorParams";
import {showModal} from "../../utils/showModal";
import {YakModuleList} from "../yakitStore/YakitStorePage";
import {YakitLogViewers} from "../invoker/YakitLogFormatter";
import {ExecResultLog} from "../invoker/batch/ExecMessageViewer";
import ReactJson from "react-json-view";
import {YakScriptParamsSetter} from "../invoker/YakScriptParamsSetter";
import {mitmPluginTemplateShort} from "../invoker/YakScriptCreator";
import "../main.css";
import {YakScriptHooksViewer} from "./MITMPluginCard";
import {SwitchItem} from "../../utils/inputUtil";
import {EditorProps, YakCodeEditor} from "../../utils/editors";
import ReactResizeDetector from "react-resize-detector";


export interface MITMPluginCardProp {
    hooks: YakScriptHooks[]
    messages: ExecResultLog[]
    onSubmitScriptContent?: (script: string) => any
    onSubmitYakScriptId?: (id: number, params: YakExecutorParam[]) => any
    onSendToWebFuzzer?: (isHttps: boolean, request: string) => any
    onExit?: () => any
}

const defaultScript = mitmPluginTemplateShort;

const {ipcRenderer} = window.require("electron");

export const MITMPluginOperator: React.FC<MITMPluginCardProp> = (props) => {
    const [initialed, setInitialed] = useState(false);

    const [script, setScript] = useState(defaultScript);
    const [userDefined, setUserDefined] = useState(false);

    useEffect(() => {
        setTimeout(() => {
            setInitialed(true)
        }, 1001)

        let id = setInterval(() => {
            ipcRenderer.invoke("mitm-get-current-hook")
        }, 1000)
        return () => {
            clearInterval(id)
        }
    }, [])

    const enablePlugin = () => {
        let m = showModal({
            title: "选择启用的 MITM 插件",
            width: "60%",
            content: <>
                <YakModuleList Type={"mitm"} Keyword={""} onClicked={(script) => {
                    if (!props.onSubmitYakScriptId) {
                        return
                    }

                    if ((script.Params || []).length > 0) {
                        let m2 = showModal({
                            title: `设置 [${script.ScriptName}] 的参数`,
                            content: <>
                                <YakScriptParamsSetter
                                    {...script}
                                    params={[]}
                                    onParamsConfirm={(p: YakExecutorParam[]) => {
                                        props.onSubmitYakScriptId && props.onSubmitYakScriptId(script.Id, p)
                                        m.destroy()
                                        m2.destroy()
                                    }}
                                    submitVerbose={"设置 MITM 参数"}
                                />
                            </>, width: "50%",
                        })
                    } else {
                        props.onSubmitYakScriptId && props.onSubmitYakScriptId(script.Id, [])
                        m.destroy()
                    }

                }} isIgnored={false} isHistory={false}/>
            </>
        })
    }

    return <div id={"plugin-operator"} style={{height: "100%"}}>
        <Row style={{height: "100%"}} gutter={12}>
            <Col span={userDefined ? 12 : 8} style={{height: "100%", overflowY: "auto"}}>
                <Card
                    className={"flex-card"}
                    bordered={false}
                    bodyStyle={{padding: 0}}
                    loading={!initialed}
                    title={<Space>
                        <div>
                            已加载
                        </div>
                        <Form size={"small"} onSubmitCapture={e => e.preventDefault()}>
                            <SwitchItem
                                label={<Tag color={"red"}>热加载模式</Tag>}
                                value={userDefined} setValue={setUserDefined}
                                formItemStyle={{marginBottom: 0}}
                            />
                        </Form>
                    </Space>} size={"small"}
                    extra={<>
                        <Space>
                            {userDefined ? <Button
                                size={"small"} type={"primary"}
                                onClick={() => {
                                    props.onSubmitScriptContent && props.onSubmitScriptContent(script)
                                }}
                            >加载当前代码</Button> : <Button
                                size={"small"} type={"primary"}
                                onClick={() => {
                                    enablePlugin()
                                }}
                            >加载插件</Button>}
                            <Button
                                danger={true}
                                size={"small"} type={"primary"}
                                onClick={() => {
                                    props.onExit && props.onExit()
                                }}
                            >停止被动扫描</Button>
                        </Space>
                    </>}
                >
                    {userDefined ? <>
                        {/* 用户热加载代码 */}
                        <YakCodeEditor
                            noHeader={true} noPacketModifier={true}
                            originValue={Buffer.from(script)}
                            onChange={e => setScript(e.toString())}
                            language={"yak"}
                            extraEditorProps={{
                                noMiniMap: true, noWordWrap: true,
                            } as EditorProps}
                        />
                    </> : <>
                        {/* 加载插件 */}
                        {((props.hooks || []).length > 0) ? <Collapse>
                            {(props.hooks || []).sort((a, b) => {
                                return a.HookName.localeCompare(b.HookName)
                            }).map(i => <Collapse.Panel
                                extra={<Tag onClick={() => {
                                    showModal({
                                        title: "JSON", content: <>
                                            <ReactJson src={props.hooks}/>
                                        </>
                                    })
                                }}>JSON</Tag>}
                                key={i.HookName} header={i.HookName}
                            >
                                <YakScriptHooksViewer hooks={i}/>
                            </Collapse.Panel>)}
                        </Collapse> : <Empty style={{
                            marginBottom: 50, marginTop: 50,
                        }}>
                            暂无 MITM 插件被启用 <br/>
                            <Button
                                type={"primary"}
                                onClick={enablePlugin}
                            >点击这里启用插件</Button>
                        </Empty>}
                    </>}

                </Card>
            </Col>
            <Col span={userDefined ? 12 : 16} style={{height: "100%", overflowY: "auto"}}>
                <YakitLogViewers data={props.messages}/>
            </Col>
        </Row>
        {/*<Tabs*/}
        {/*    className={"httphacker-tabs"}*/}
        {/*    size={"small"} type={"card"} activeKey={tab} onChange={setTab}*/}
        {/*    style={{*/}
        {/*        paddingTop: 4*/}
        {/*    }}*/}
        {/*>*/}
        {/*    <Tabs.TabPane key={"history"} tab={"历史请求"}>*/}
        {/*        <div style={{height: "100%", overflow: "hidden"}}>*/}
        {/*            <HTTPFlowMiniTable*/}
        {/*                simple={true}*/}
        {/*                onTotal={setTotal} // onSendToWebFuzzer={props.onSendToWebFuzzer}*/}
        {/*                filter={{*/}
        {/*                    SearchURL: "",*/}
        {/*                    Pagination: {...genDefaultPagination(), Page: 1, Limit: 20}*/}
        {/*                }}*/}
        {/*                source={""}*/}
        {/*                onSendToWebFuzzer={props.onSendToWebFuzzer}*/}
        {/*            />*/}
        {/*        </div>*/}
        {/*    </Tabs.TabPane>*/}
        {/*    <Tabs.TabPane key={"plugin"} tab={"劫持插件"}>*/}
        {/*        <div style={{height: "100%"}}>*/}
        {/*            <Card*/}
        {/*                className={"flex-card"}*/}
        {/*                style={{height: "100%"}}*/}
        {/*                title={<>*/}
        {/*                    <Space>*/}
        {/*                        <div>MITM 插件</div>*/}
        {/*                        <Divider type={"vertical"}/>*/}
        {/*                        <span style={{color: '#999'}}>*/}
        {/*                        <SelectOne*/}
        {/*                            size={"small"} formItemStyle={{marginBottom: 0}}*/}
        {/*                            data={[*/}
        {/*                                {value: false, text: "插件模式"},*/}
        {/*                                {value: true, text: "自定义模式"},*/}
        {/*                            ]} label={" "} colon={false} value={userDefined}*/}
        {/*                            setValue={setUserDefined}*/}
        {/*                        />*/}
        {/*                    </span>*/}
        {/*                    </Space>*/}
        {/*                </>}*/}
        {/*                size={"small"} bodyStyle={{padding: 0, height: "100%"}}*/}
        {/*                extra={[*/}
        {/*                    <Space>*/}
        {/*                        {*/}
        {/*                            userDefined ? <Button*/}
        {/*                                type={"primary"}*/}
        {/*                                size={"small"}*/}
        {/*                                onClick={() => {*/}
        {/*                                    props.onSubmitScriptContent && props.onSubmitScriptContent(script)*/}
        {/*                                    setTab("mitm-output")*/}
        {/*                                }}*/}
        {/*                            >热加载</Button> : <Button*/}
        {/*                                type={"link"}*/}
        {/*                                size={"small"}*/}
        {/*                                onClick={enablePlugin}>*/}
        {/*                                插件商店*/}
        {/*                            </Button>*/}
        {/*                        }*/}

        {/*                    </Space>*/}
        {/*                ]}*/}
        {/*            >*/}
        {/*                {userDefined ? <>*/}
        {/*                    <div style={{height: "100%", minHeight: 400}}>*/}
        {/*                        <YakCodeEditor*/}
        {/*                            noHeader={true} noPacketModifier={true}*/}
        {/*                            originValue={Buffer.from(script)}*/}
        {/*                            onChange={e => setScript(e.toString())}*/}
        {/*                            language={"yak"}*/}
        {/*                            extraEditorProps={{*/}
        {/*                                noMiniMap: true*/}
        {/*                            } as EditorProps}*/}
        {/*                        />*/}
        {/*                    </div>*/}
        {/*                </> : <>*/}
        {/*                    {(props.hooks || []).length > 0 ? <Collapse>*/}
        {/*                        {(props.hooks || []).sort((a, b) => {*/}
        {/*                            return a.HookName.localeCompare(b.HookName)*/}
        {/*                        }).map(i => <Collapse.Panel*/}
        {/*                            extra={<Tag onClick={() => {*/}
        {/*                                showModal({*/}
        {/*                                    title: "JSON", content: <>*/}
        {/*                                        <ReactJson src={props.hooks}/>*/}
        {/*                                    </>*/}
        {/*                                })*/}
        {/*                            }}>JSON</Tag>}*/}
        {/*                            key={i.HookName} header={i.HookName}*/}
        {/*                        >*/}
        {/*                            <YakScriptHooksViewer hooks={i}/>*/}
        {/*                        </Collapse.Panel>)}*/}
        {/*                    </Collapse> : <Empty style={{*/}
        {/*                        marginBottom: 50, marginTop: 50,*/}
        {/*                    }}>*/}
        {/*                        暂无 MITM 插件被启用 <br/>*/}
        {/*                        <Button*/}
        {/*                            type={"primary"}*/}
        {/*                            onClick={enablePlugin}*/}
        {/*                        >点击这里启用插件</Button>*/}
        {/*                    </Empty>}*/}
        {/*                </>}*/}
        {/*            </Card>*/}
        {/*        </div>*/}
        {/*    </Tabs.TabPane>*/}
        {/*    <Tabs.TabPane key={"mitm-output"} tab={"插件输出"}>*/}
        {/*        <div style={{overflowX: "auto", height: "100%"}}>*/}
        {/*            <YakitLogViewers data={props.messages}/>*/}
        {/*        </div>*/}
        {/*    </Tabs.TabPane>*/}
        {/*</Tabs>*/}
    </div>
};
