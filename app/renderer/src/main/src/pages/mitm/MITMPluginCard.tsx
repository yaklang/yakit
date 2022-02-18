import React, {useEffect, useState} from "react";
import {Button, Card, Col, Collapse, Divider, Empty, List, Popconfirm, Row, Space, Tabs, Tag} from "antd";
import {EditorProps, HTTPPacketEditor, YakCodeEditor, YakEditor} from "../../utils/editors";
import {genDefaultPagination, YakScript, YakScriptHookItem, YakScriptHooks} from "../invoker/schema";
import {YakExecutorParam} from "../invoker/YakExecutorParams";
import {showModal} from "../../utils/showModal";
import {YakModuleList} from "../yakitStore/YakitStorePage";
import {HTTPFlowMiniTable} from "../../components/HTTPFlowMiniTable";
import {YakitLogViewers} from "../invoker/YakitLogFormatter";
import {ExecResultLog} from "../invoker/batch/ExecMessageViewer";
import ReactJson from "react-json-view";
import {SelectOne} from "../../utils/inputUtil";
import {YakScriptParamsSetter} from "../invoker/YakScriptParamsSetter";
import "../main.css";


export interface MITMPluginCardProp {
    proxy?: string
    downloadCertNode?: React.ReactNode
    setFilterNode?: React.ReactNode
    // hooks: YakScriptHooks[]
    messages: ExecResultLog[]
    onSubmitScriptContent?: (script: string) => any
    onSubmitYakScriptId?: (id: number, params: YakExecutorParam[]) => any
    onSendToWebFuzzer?: (isHttps: boolean, request: string) => any
    onExit?: () => any
    autoUpdate?: boolean

    sendToPlugin?: (request: Uint8Array, isHTTPS: boolean, response?: Uint8Array) => any
}

const {ipcRenderer} = window.require("electron");

export const MITMPluginCard: React.FC<MITMPluginCardProp> = (props) => {
    const [tab, setTab] = useState("history");

    // history
    const [total, setTotal] = useState(0);

    useEffect(() => {
        let id = setInterval(() => {
            ipcRenderer.invoke("mitm-get-current-hook")
        }, 1000)
        return () => {
            clearInterval(id)
        }
    }, [])

    return <div style={{height: "100%"}}>
        {/* <Tabs
            className={"httphacker-tabs"}
            size={"small"} type={"card"} activeKey={tab} onChange={setTab}
            style={{
                paddingTop: 4
            }}
        >
            <Tabs.TabPane key={"history"} tab={"历史请求"}> */}
                <div style={{height: "100%", overflow: "hidden"}}>
                    <HTTPFlowMiniTable
                        simple={true}
                        onTotal={setTotal} // onSendToWebFuzzer={props.onSendToWebFuzzer}
                        filter={{
                            SearchURL: "",
                            Pagination: {...genDefaultPagination(), Page: 1, Limit: 20}
                        }}
                        source={""}
                        autoUpdate={props.autoUpdate}
                        onSendToWebFuzzer={props.onSendToWebFuzzer}
                        sendToPlugin={props.sendToPlugin}
                    />
                </div>
            {/* </Tabs.TabPane>
        </Tabs> */}
    </div>
};

export interface YakScriptHooksViewerProp {
    hooks: YakScriptHooks
}

export const YakScriptHooksViewer: React.FC<YakScriptHooksViewerProp> = (props) => {
    return <List<YakScriptHookItem>
        pagination={false} size={"small"} split={true}
        dataSource={props.hooks!.Hooks} bordered={false}
        renderItem={i => {
            return <List.Item style={{width: "100%", padding: 0}} extra={<>

            </>}>
                <Card
                    size={"small"} bordered={false} hoverable={true}
                    style={{width: "100%"}}
                >
                    <Row>
                        <Col span={16}>
                            <Space style={{width: "100%", textAlign: "left"}}>
                                {i.YakScriptName ? `${i.YakScriptName}[${i.YakScriptId}]` : i.Verbose}

                            </Space>
                        </Col>
                        <Col span={8}>
                            <div style={{width: "100%", textAlign: "right"}}>
                                <Popconfirm
                                    title={"确定要移除该 Hook 吗？"}
                                    onConfirm={() => {
                                        ipcRenderer.invoke("mitm-remove-hook", {
                                            HookName: [props.hooks.HookName],
                                            RemoveHookID: [i.YakScriptName],
                                        } as any)
                                    }}
                                >
                                    <Button
                                        danger={true} size={"small"}
                                        type={"link"}
                                    >移除Hook</Button>
                                </Popconfirm>
                            </div>
                        </Col>

                    </Row>
                </Card>
            </List.Item>
        }}
    >

    </List>
};