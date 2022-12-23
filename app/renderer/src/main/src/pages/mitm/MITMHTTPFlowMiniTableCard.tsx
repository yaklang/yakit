import React from "react";
import {Button, Card, Col, List, Popconfirm, Row, Space} from "antd";
import {genDefaultPagination, YakScriptHookItem, YakScriptHooks} from "../invoker/schema";
import {HTTPFlowMiniTable} from "../../components/HTTPFlowMiniTable";
import {MITMPluginListProp} from "./MITMPluginList";


export interface MITMPluginCardProp extends MITMPluginListProp {

}

const {ipcRenderer} = window.require("electron");

export const MITMHTTPFlowMiniTableCard: React.FC<MITMPluginCardProp> = React.memo((props) => {
    return <div style={{height: "100%"}}>
        <div style={{height: "100%", overflow: "hidden"}}>
            <HTTPFlowMiniTable
                onTotal={() => {
                }}
                simple={true}
                filter={{
                    SearchURL: "", SourceType: "mitm",
                    Pagination: {...genDefaultPagination(), Page: 1, Limit: 20}
                }}
                source={""}
                autoUpdate={true}
            />
        </div>
    </div>
});

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