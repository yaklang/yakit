import React, {useEffect, useState} from "react";
import {Button, Card, Col, Form, Modal, notification, Popconfirm, Row, Space, Spin, Tag, Typography} from "antd";
import {ExecHistoryTable} from "./YakExecutorHistoryTable";
import "./xtermjs-yak-executor.css"
import {IMonacoEditor, YakEditor} from "../../utils/editors";
import {DeleteOutlined, QuestionCircleOutlined, ReloadOutlined} from "@ant-design/icons";
import {YakScriptManagerPage} from "./YakScriptManager";
import {getRandomInt, randomString} from "../../utils/randomUtil";
import {showDrawer, showModal} from "../../utils/showModal";
import {failed, info} from "../../utils/notification";
import {ExecResult, YakScript, YakScriptParam} from "./schema";
import {YakScriptParamsSetter} from "./YakScriptParamsSetter";
import {YakExecutorParam} from "./YakExecutorParams";
import {SelectOne} from "../../utils/inputUtil";
import {editor} from "monaco-editor";
import {monacoEditorClear, monacoEditorWrite} from "../fuzzer/fuzzerTemplates";

const {Text} = Typography;

export interface YakExecutorProp {
}

const {ipcRenderer} = window.require("electron");

export const YakExecutor: React.FC<YakExecutorProp> = (props) => {
    const [code, setCode] = useState("# input your yak code\nprintln(`Hello Yak World!`)");
    const [errors, setErrors] = useState<string[]>([]);
    const [executing, setExecuting] = useState(false);
    const [currentOutputEditor, setCurrentOutputEditor] = useState<IMonacoEditor>();
    const [params, setParams] = useState<{ Key: string, Value: any }[]>([]);
    const [yakScript, setYakScript] = useState<YakScript>();
    const [outputEncoding, setOutputEncoding] = useState<"utf8" | "latin1">("utf8");

    // trigger for updating
    const [triggerForUpdatingHistory, setTriggerForUpdatingHistory] = useState<any>(0);
    const render = ipcRenderer;

    useEffect(() => {
        // let buffer = "";
        render.on("client-yak-error", async (e, data) => {
            notification["error"]({message: `FoundError: ${JSON.stringify(data)}`})
            if (typeof data === 'object') {
                setErrors([...errors, `${JSON.stringify(data)}`])
            } else if (typeof data === 'string') {
                setErrors([...errors, data])
            } else {
                setErrors([...errors, `${data}`])
            }
        })
        render.on("client-yak-end", () => {
            notification["info"]({message: "Yak 代码执行完毕"})
            setTriggerForUpdatingHistory(getRandomInt(100000))
            setTimeout(() => {
                setExecuting(false)
            }, 300)
        })
        render.on("client-yak-data", async (e, data: ExecResult) => {
            if (data.IsMessage) {
                // alert(Buffer.from(data.Message).toString("utf8"))
            }
            if (data?.Raw && currentOutputEditor) {
                monacoEditorWrite(currentOutputEditor, Buffer.from(data.Raw).toString(outputEncoding).replaceAll("\n", "\r\n"))
            }
        })
        return () => {
            render.removeAllListeners("client-yak-data")
            render.removeAllListeners("client-yak-end")
            render.removeAllListeners("client-yak-error")
        }
    }, [currentOutputEditor])

    return <div style={{margin: 0}}>
        <Spin spinning={false}>
            <div>
                <Space direction={"vertical"} style={{marginLeft: 12, marginRight: 12, width: "98%"}}>
                    <Card
                        bodyStyle={{width: "100%", paddingTop: 0}} style={{width: "100%"}} size={"small"}
                        headStyle={{paddingTop: 0,}}
                    >
                        {/*<Row gutter={8} style={{marginBottom: 8, width: "100%"}}>*/}
                        {/*    <YakExecutorParams onParams={(p) => {*/}
                        {/*        setParams((p || []).map(i => {*/}
                        {/*            return {Key: i.key, Value: i.value}*/}
                        {/*        }))*/}
                        {/*    }}/>*/}
                        {/*</Row>*/}
                        <Row gutter={8} style={{width: "100%"}}>
                            <Col span={18}>
                                <Card
                                    size={"small"} bordered={false} bodyStyle={{padding: 0}}
                                    title={yakScript ? <Space>
                                        <div>{`模块库中加载:`}
                                            <Text style={{maxWidth: 200}}
                                                  ellipsis={{tooltip: triggerForUpdatingHistory}}>{yakScript.ScriptName}</Text>
                                        </div>
                                        {yakScript?.Type ? <Tag color={"green"}>{yakScript?.Type}</Tag> :
                                            <Tag color={"orange"}>{"default"}</Tag>}
                                        {yakScript?.Help &&
                                        <Button
                                            icon={<QuestionCircleOutlined/>}
                                            onClick={e => {
                                                showModal({
                                                    title: "帮助信息",
                                                    content: <>
                                                        <Text>{yakScript?.Help}</Text>
                                                    </>
                                                })
                                            }}
                                            type={"link"}
                                            size={"small"}
                                        />}
                                    </Space> : "Yak Code Runner"} headStyle={{paddingRight: 0}}
                                    extra={
                                        <Space>
                                            <Button
                                                style={{height: 30}} type={"link"}
                                                size={"small"}
                                                onClick={e => {
                                                    let m = showDrawer({
                                                        width: "60%",
                                                        placement: "left",
                                                        title: "选择你的 Yak 模块执行特定功能",
                                                        content: <>
                                                            <YakScriptManagerPage
                                                                type={"yak"}
                                                                onLoadYakScript={s => {
                                                                    info(`加载 Yak 模块：${s.ScriptName}`)
                                                                    monacoEditorClear(currentOutputEditor)
                                                                    setCode(s.Content);
                                                                    setYakScript(s)
                                                                    setParams([])
                                                                    m.destroy()
                                                                }}/>
                                                        </>,
                                                    })
                                                }}
                                            >选择已有的 Yak 脚本</Button>
                                            {yakScript?.Params && (yakScript.Params || []).length > 0 && <Button
                                                size={"small"} style={{width: 120, height: 30}}
                                                onClick={e => {
                                                    let m = showModal({
                                                        title: "设置 Yak 模块参数",
                                                        width: "50%",
                                                        content: <>
                                                            <YakScriptParamsSetter
                                                                {...yakScript}
                                                                params={params}
                                                                onParamsConfirm={(p: YakExecutorParam[]) => {
                                                                    setParams(p)
                                                                    m.destroy()
                                                                }}/>
                                                        </>
                                                    })
                                                }}
                                            >设置参数</Button>}
                                            <Popconfirm
                                                title={"确定要清除已设置的参数吗？"}
                                                onConfirm={e => {
                                                    setParams([])
                                                }}
                                            >
                                                <Button
                                                    size={"small"} style={{width: 80, height: 30}}
                                                    danger={true}
                                                >重置参数</Button>
                                            </Popconfirm>
                                            {executing ?
                                                <Button
                                                    type={"primary"} danger={true}
                                                    size={"small"} style={{width: 200, height: 30}}
                                                    onClick={() => {
                                                        render.invoke("cancel-yak")
                                                    }}
                                                >
                                                    立即停止
                                                </Button>
                                                : <Button
                                                    type={"primary"}
                                                    size={"small"}
                                                    style={{width: 200, height: 30}}
                                                    onClick={() => {
                                                        // 如果是脚本，则需要检查
                                                        if (yakScript && (yakScript.Params || []).length > 0) {
                                                            if (yakScript.Params.length > params.length) {
                                                                const existed: string[] = params.map(i => i.Key);
                                                                const missedParams: YakScriptParam[] = yakScript.Params.filter(i => !existed.includes(i.Field));

                                                                Modal.warn({
                                                                    title: "Yak 模块执行参数检查失败",
                                                                    content: <>
                                                                        <Space direction={"vertical"}>
                                                                            <Tag color={"green"}>Yak
                                                                                模块所需参数：{(yakScript?.Params || []).length}</Tag>
                                                                            <Tag
                                                                                color={"red"}>当前设置的参数：{(params || []).length}</Tag>
                                                                            缺乏如下参数：
                                                                            {missedParams.map(i => {
                                                                                return <Tag>{i.FieldVerbose ? `参数名：「${i.FieldVerbose}」/ ` : ""}{i.Field}</Tag>
                                                                            })}
                                                                        </Space>
                                                                    </>
                                                                })
                                                                return
                                                            }
                                                        }

                                                        setErrors([])
                                                        setExecuting(true)
                                                        render.invoke("exec-yak", {
                                                            Script: code, Params: params,
                                                        })
                                                    }}
                                                >立即执行</Button>}
                                        </Space>
                                    }
                                >

                                </Card>
                                <Space direction={"vertical"} style={{width: "100%", marginBottom: 10, marginTop: 4}}>
                                    <div style={{backgroundColor: "rgba(146,221,120,0.65)"}}>
                                        <Text>
                                            <Text> yak [script].yak </Text>
                                            <Text copyable={false}>
                                                {params.map(i => {
                                                    const prefix = i.Key.startsWith("--") ? `${i.Key}` : `--${i.Key}`
                                                    switch (typeof i.Value) {
                                                        case "boolean":
                                                            return <Text>
                                                                <Text delete={!i.Value}>{prefix}</Text>
                                                                <Text>{" "}</Text>
                                                            </Text>
                                                        case "string":
                                                            if (!i.Value) {
                                                                return <Text>
                                                                    <Text delete={!i.Value}>{prefix}</Text>
                                                                    <Text>{" "}</Text>
                                                                </Text>
                                                            }
                                                            return <Text>
                                                                {prefix} <Text
                                                                mark={true}>{i.Value}</Text><Text> </Text>
                                                            </Text>
                                                        default:
                                                            return <Text>
                                                                {prefix} <Text
                                                                mark={true}>{i.Value}</Text><Text> </Text>
                                                            </Text>
                                                    }
                                                })}
                                            </Text>
                                        </Text>
                                    </div>

                                    <Spin spinning={executing}>
                                        <div style={{height: 380}}>
                                            <YakEditor
                                                type={"yak"}
                                                value={code} setValue={setCode}
                                            />
                                        </div>
                                    </Spin>
                                </Space>
                            </Col>
                            <Col span={6}>
                                <Card
                                    title={<Space>
                                        执行记录
                                        <Button
                                            type={"link"}
                                            size={"small"}
                                            style={{height: 30}}
                                            onClick={() => {
                                                setTriggerForUpdatingHistory(randomString(20))
                                            }}
                                            icon={<ReloadOutlined/>}
                                        />
                                    </Space>}
                                    bordered={false} size={"small"}
                                    bodyStyle={{padding: 0}}
                                >
                                    <ExecHistoryTable mini={true} trigger={triggerForUpdatingHistory}/>
                                </Card>
                            </Col>
                            <Col span={24}>
                                <Card
                                    title={<Space>
                                        执行结果 Stdout / Stderr
                                        <Form><SelectOne
                                            label={<Tag color={"geekblue"}>编码</Tag>} formItemStyle={{marginBottom: 0}}
                                            value={outputEncoding} setValue={setOutputEncoding} size={"small"}
                                            data={[
                                                {text: "GBxxx编码", value: "latin1"},
                                                {text: "UTF-8编码", value: "utf8"},
                                            ]}
                                        /></Form>
                                        <Button
                                            size={"small"} icon={<DeleteOutlined/>}
                                            danger={true} type={"link"}
                                            onClick={e => {
                                                monacoEditorClear(currentOutputEditor)
                                            }}
                                        />
                                    </Space>} size={"small"} bordered={true}
                                    bodyStyle={{padding: 0}}
                                >
                                    {/*@ts-ignore*/}
                                    <div style={{height: 260}}>
                                        <YakEditor
                                            // value={currentOutput}
                                            readOnly={false}
                                            editorDidMount={setCurrentOutputEditor}
                                        />
                                    </div>
                                </Card>
                            </Col>
                        </Row>
                    </Card>
                </Space>
            </div>
        </Spin>
    </div>
};