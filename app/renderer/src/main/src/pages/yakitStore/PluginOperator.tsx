import React, {useEffect, useState} from "react";
import {Button, Card, Col, Divider, Empty, Form, PageHeader, Popconfirm, Popover, Row, Space, Tabs, Tag} from "antd";
import {YakScript} from "../invoker/schema";
import {failed, success} from "../../utils/notification";
import {formatTimestamp} from "../../utils/timeUtil";
import {CopyableField, InputItem} from "../../utils/inputUtil";
import {YakScriptParamsSetter} from "../invoker/YakScriptParamsSetter";
import {YakExecutorParam} from "../invoker/YakExecutorParams";
import ReactMarkdown from "react-markdown";
import {YakEditor} from "../../utils/editors";
import {showModal} from "../../utils/showModal";

export interface YakScriptOperatorProp {
    yakScriptId: number
    size?: "big" | "small"
    fromMenu?: boolean
}

const {ipcRenderer} = window.require("electron");

export const PluginOperator: React.FC<YakScriptOperatorProp> = (props) => {
    const [script, setScript] = useState<YakScript>();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [groups, setGroups] = useState<string[]>([]);

    const updateGroups = () => {
        ipcRenderer.invoke("QueryGroupsByYakScriptId", {YakScriptId: props.yakScriptId}).then(
            (data: { Groups: string[] }) => {
                setGroups(data.Groups)
            }
        ).catch(e => {
            console.info(e)
        }).finally()
    }

    const update = () => {
        if (props.yakScriptId <= 0) {
            return
        }
        updateGroups()

        setLoading(true)
        ipcRenderer.invoke("GetYakScriptById", {Id: props.yakScriptId}).then((e: YakScript) => {
            setScript(e)
        }).catch(e => {
            failed("Query YakScript By ID failed")
        }).finally(() => setTimeout(() => setLoading(false), 300))
    }

    useEffect(() => {
        update()
    }, [props.yakScriptId])

    return <div style={{marginLeft: 16}}>
        <PageHeader
            style={{paddingLeft: 2, paddingBottom: 12}}
            title={script?.ScriptName} subTitle={<Space size={2}>
            {script?.Author}
        </Space>}>
            <Space direction={"vertical"}>
                <Space>
                    {script?.ScriptName && <Tag>{formatTimestamp(script?.CreatedAt)}</Tag>}
                    <Divider type={"vertical"}/>
                    {script?.Tags ? (script?.Tags || "").split(",").filter(i => !!i).map(i => {
                        return <Tag>{i}</Tag>
                    }) : "No Tags"}
                </Space>
                <Space>
                    <CopyableField noCopy={false} text={script?.Help}/>
                </Space>
                <Space>
                    <Popover
                        title={`添加到左侧菜单栏中[${script?.Id}]`}
                        content={<>
                            {script && <AddToMenuActionForm script={script}/>}
                        </>}
                    >
                        <Button size={"small"} type={"primary"}>添加到菜单栏</Button>
                    </Popover>
                    {props.fromMenu && groups.length > 0 && <Button
                        size={"small"} danger={true}
                        onClick={e => {
                            let m = showModal({
                                title: "移除菜单栏",
                                content: <Space direction={"vertical"}>
                                    {groups.map(element => {
                                        return <Button onClick={() => {
                                            ipcRenderer.invoke(
                                                "RemoveFromMenu",
                                                {YakScriptId: script?.Id, Group: element}
                                            ).then(() => {
                                                updateGroups()
                                                m.destroy()
                                            }).catch(e => {
                                                console.info(e)
                                            }).finally()
                                        }}>
                                            从 {element} 中移除
                                        </Button>
                                    })}
                                </Space>
                            })
                        }}
                    >
                        移除菜单栏
                    </Button>}
                    <Button size={"small"} danger={true}
                            onClick={e => {
                                alert("1")
                            }}
                    >不再关注 / 隐藏</Button>
                </Space>
            </Space>
        </PageHeader>
        {/*<Divider/>*/}
        <Tabs type={"card"} defaultValue={"runner"}>
            <Tabs.TabPane tab={"执行器 / Runner"} key={"runner"}>
                <div style={{width: "100%", textAlign: "center", marginBottom: 24}}>
                    <h2>输入参数以执行插件 {script?.ScriptName}</h2>
                </div>
                {script && <YakScriptParamsSetter
                    {...script}
                    params={[]}
                    onParamsConfirm={(p: YakExecutorParam[]) => {
                        alert(1)
                    }}
                    styleSize={props.size}
                />}
            </Tabs.TabPane>
            <Tabs.TabPane tab={"文档 / Docs"} key={"docs"}>
                <ReactMarkdown children={`# this is markdown`}/>
            </Tabs.TabPane>
            <Tabs.TabPane tab={"插件源码 / Source Code"} key={"code"}>
                <div style={{height: 500}}>
                    <YakEditor value={script?.Content} readOnly={true}/>
                </div>
            </Tabs.TabPane>
            <Tabs.TabPane tab={"执行历史 / History"} key={"history"}>
                <Empty/>
            </Tabs.TabPane>
        </Tabs>
    </div>
};

export interface AddToMenuActionFormProp {
    script: YakScript
}

export const AddToMenuActionForm: React.FC<AddToMenuActionFormProp> = (props) => {
    const {script} = props;

    const [params, setParams] = useState<{
        Group: string, YakScriptId: number, Verbose: string
    }>({Group: "社区组件", Verbose: props.script.ScriptName, YakScriptId: props.script.Id});

    useEffect(() => {
        setParams({Group: "社区组件", Verbose: props.script.ScriptName, YakScriptId: props.script.Id})
    }, [props.script])

    return <div>
        <Form
            size={"small"}
            onSubmitCapture={e => {
                e.preventDefault()

                if (!script) {
                    failed("No Yak Modeule Selected")
                    return
                }

                ipcRenderer.invoke("AddToMenu", params).then(() => {
                    success("添加成功")
                }).catch(e => {
                    failed(`${e}`)
                })
            }}
        >
            <InputItem label={"菜单选项名(展示名称)"} setValue={Verbose => setParams({...params, Verbose})}
                       value={params.Verbose}/>
            <InputItem label={"菜单分组"} setValue={Group => setParams({...params, Group})} value={params.Group}/>
            <Form.Item colon={false} label={" "}>
                <Button type="primary" htmlType="submit"> 添加 </Button>
            </Form.Item>
        </Form>
    </div>
};