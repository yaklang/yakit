import React, {useEffect, useState} from "react";
import {
    Alert,
    Button,
    Card,
    Checkbox,
    Col,
    Collapse,
    Empty,
    Form,
    List,
    PageHeader,
    Radio,
    Row,
    Space,
    Tag
} from "antd";
import {YakExecutorParam} from "../invoker/YakExecutorParams";
import {showModal} from "../../utils/showModal";
import {YakModuleList} from "../yakitStore/YakitStorePage";
import {YakitLogViewers} from "../invoker/YakitLogFormatter";
import ReactJson from "react-json-view";
import {YakScriptParamsSetter} from "../invoker/YakScriptParamsSetter";
import {mitmPluginTemplateShort} from "../invoker/YakScriptCreator";
import "../main.css";
import {MITMPluginCardProp, YakScriptHooksViewer} from "./MITMPluginCard";
import {CopyableField, SelectOne, SwitchItem} from "../../utils/inputUtil";
import {EditorProps, YakCodeEditor} from "../../utils/editors";
import {YakScript, YakScriptHooks} from "../invoker/schema";
import {useMap} from "ahooks";
import {failed} from "../../utils/notification";
import {CloseOutlined, PoweroffOutlined} from "@ant-design/icons";
import {AutoCard} from "../../components/AutoCard";

const defaultScript = mitmPluginTemplateShort;

const {ipcRenderer} = window.require("electron");

const updateHooks = () => {
    ipcRenderer.invoke("mitm-get-current-hook").catch(e => {
        failed(`更新 MITM 插件状态失败: ${e}`)
    })
}

export const MITMPluginOperator: React.FC<MITMPluginCardProp> = (props) => {
    const [initialed, setInitialed] = useState(false);

    const [script, setScript] = useState(defaultScript);
    // const [userDefined, setUserDefined] = useState(false);
    const [hooks, handlers] = useMap<string, boolean>(new Map<string, boolean>());
    const [mode, setMode] = useState<"hot-patch" | "loaded" | "all">("all");

    const userDefined = mode === "hot-patch";

    useEffect(() => {
        // 用于 MITM 的 查看当前 Hooks
        ipcRenderer.on("client-mitm-hooks", (e, data: YakScriptHooks[]) => {
            const tmp = new Map<string, boolean>()
            data.forEach(i => {
                i.Hooks.map(hook => {
                    tmp.set(hook.YakScriptName, true)
                })
            })
            handlers.setAll(tmp)
        })
        updateHooks()
        setTimeout(() => {
            setInitialed(true)
        }, 300)
        return () => {
            ipcRenderer.removeAllListeners("client-mitm-hooks");
        }
    }, []);

    let hooksItem: { name: string }[] = [];
    hooks.forEach((value, key) => {
        if (value) {
            hooksItem.push({name: key})
        }
    });
    hooksItem = hooksItem.sort((a, b) => a.name.localeCompare(b.name))

    return <div id={"plugin-operator"} style={{height: "100%"}}>
        <Row style={{height: "100%"}} gutter={12}>
            <Col span={userDefined ? 12 : 8}
                 style={{height: "100%", overflowY: "auto", display: "flex", flexDirection: "column"}}>
                <Alert type={"success"} style={{marginBottom: 12, fontSize: 15}} message={<>
                    <Space direction={"vertical"}>
                        <Space> 设置代理 <CopyableField text={props.proxy}/> 以扫描流量 </Space>
                        {props.downloadCertNode}
                        {props.setFilterNode}
                    </Space>
                </>}/>
                <div style={{flex: 1}}>
                    <AutoCard
                        bordered={false}
                        bodyStyle={{padding: 0}}
                        loading={!initialed}
                        title={<Space>
                            <div>
                                MITM 插件
                            </div>
                            <Form size={"small"} onSubmitCapture={e => e.preventDefault()}>
                                <SelectOne
                                    data={[
                                        {text: "热加载", value: "hot-patch"},
                                        {text: "已启用", value: "loaded"},
                                        {text: "全部", value: "all"},
                                    ]}
                                    value={mode}
                                    formItemStyle={{marginBottom: 0}}
                                    setValue={setMode}
                                />
                            </Form>
                        </Space>} size={"small"}
                        extra={<>
                            <Space>
                                {userDefined && <Button
                                    size={"small"} type={"primary"}
                                    onClick={() => {
                                        props.onSubmitScriptContent && props.onSubmitScriptContent(script)
                                    }}
                                >加载当前代码</Button>}
                                {/*: <Button*/}
                                {/*    size={"small"} type={"primary"}*/}
                                {/*    onClick={() => {*/}
                                {/*        enablePlugin()*/}
                                {/*    }}*/}
                                {/*>加载插件</Button>}*/}
                                <Button
                                    danger={true}
                                    size={"small"} type={"primary"}
                                    onClick={() => {
                                        props.onExit && props.onExit()
                                    }}
                                    icon={<PoweroffOutlined/>}
                                >停止</Button>
                            </Space>
                        </>}
                    >
                        {mode === "hot-patch" && <>
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
                        </>}
                        {mode === "all" && <>
                            <YakModuleList
                                Type={"mitm"}
                                onClicked={(script: YakScript) => {
                                }}
                                Keyword={""}
                                onYakScriptRender={(i: YakScript) => {
                                    return <MITMYakScriptLoader
                                        script={i} hooks={hooks}
                                        onSubmitYakScriptId={props.onSubmitYakScriptId}
                                    />
                                }}
                            />
                        </>}
                        {mode === "loaded" && <>
                            {hooks.size > 0 ? <>
                                <List pagination={false}>
                                    {hooksItem.map(i => {
                                        return <>
                                            <MITMYakScriptLoader
                                                script={{ScriptName: i.name} as YakScript} hooks={hooks}
                                                onSubmitYakScriptId={props.onSubmitYakScriptId}
                                            />
                                        </>
                                    })}
                                </List>
                            </> : <>
                                <Empty description={"未启用 MITM 插件"}/>
                            </>}
                        </>}
                    </AutoCard>
                </div>
            </Col>
            <Col span={userDefined ? 12 : 16} style={{height: "100%", overflowY: "auto"}}>
                <YakitLogViewers data={props.messages}/>
            </Col>
        </Row>
    </div>
};

interface MITMYakScriptLoaderProps {
    script: YakScript
    hooks: Map<string, boolean>
    onSubmitYakScriptId?: (id: number, params: YakExecutorParam[]) => any
}

const MITMYakScriptLoader = React.memo((p: MITMYakScriptLoaderProps) => {
    const {hooks, script, onSubmitYakScriptId} = p;
    const i = script;
    return <Card
        onClick={() => {
            const checked = !!hooks.get(i.ScriptName);

            if (checked) {
                ipcRenderer.invoke("mitm-remove-hook", {
                    HookName: [],
                    RemoveHookID: [i.ScriptName],
                } as any)
                return
            }

            if (!p.onSubmitYakScriptId) {
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
                                onSubmitYakScriptId && onSubmitYakScriptId(script.Id, p)
                                m2.destroy()
                            }}
                            submitVerbose={"设置 MITM 参数"}
                        />
                    </>, width: "50%",
                })
            } else {
                p.onSubmitYakScriptId && p.onSubmitYakScriptId(script.Id, [])
            }
        }}
        size={"small"}
        bodyStyle={{paddingLeft: 12, paddingTop: 8, paddingBottom: 8, paddingRight: 12}}
        style={{
            width: "100%", marginBottom: 4,
            // backgroundColor: hooks.get(i.ScriptName) ? "#d6e4ff" : undefined
        }} hoverable={true}
    ><Space>
        <Checkbox checked={!!hooks.get(i.ScriptName)}/>{i.ScriptName}
    </Space></Card>

})