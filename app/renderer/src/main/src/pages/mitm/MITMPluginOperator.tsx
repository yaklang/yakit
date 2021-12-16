import React, {useEffect, useState} from "react";
import {Alert, Button, Card, Col, Collapse, Empty, Form, PageHeader, Row, Space, Tag} from "antd";
import {YakExecutorParam} from "../invoker/YakExecutorParams";
import {showModal} from "../../utils/showModal";
import {YakModuleList} from "../yakitStore/YakitStorePage";
import {YakitLogViewers} from "../invoker/YakitLogFormatter";
import ReactJson from "react-json-view";
import {YakScriptParamsSetter} from "../invoker/YakScriptParamsSetter";
import {mitmPluginTemplateShort} from "../invoker/YakScriptCreator";
import "../main.css";
import {MITMPluginCardProp, YakScriptHooksViewer} from "./MITMPluginCard";
import {CopyableField, SwitchItem} from "../../utils/inputUtil";
import {EditorProps, YakCodeEditor} from "../../utils/editors";

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
                <Alert type={"success"} style={{marginBottom: 12, fontSize: 15}} message={<>
                    <Space direction={"vertical"}>
                        <Space> 设置代理 <CopyableField text={props.proxy}/> 以扫描流量 </Space>
                        {props.downloadCertNode}
                        {props.setFilterNode}
                    </Space>
                </>}/>
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
    </div>
};
