import React, {useEffect, useState} from "react";
import {SimplePluginList} from "@/components/SimplePluginList";
import {showDrawer, showModal} from "@/utils/showModal";
import {ResizeBox} from "@/components/ResizeBox";
import {getRemoteValue} from "@/utils/kv";
import {Card, Col, Form, Row, Space} from "antd";
import {PluginResultUI} from "@/pages/yakitStore/viewers/base";
import {PacketScanForm} from "@/pages/packetScanner/PacketScanForm";
import {randomString} from "@/utils/randomUtil";
import {useCreation} from "ahooks";
import {PacketScanResult} from "@/pages/packetScanner/PacketScanResult";
import {HTTPPacketEditor} from "@/utils/editors";
import {HttpFlowViewer} from "@/pages/packetScanner/HttpFlowViewer";
import {genDefaultPagination, QueryYakScriptRequest} from "@/pages/invoker/schema";

export interface PacketScannerProp {
    HttpFlowIds?: number[]
    Https?: boolean
    HttpRequest?: Uint8Array
    Keyword?: string
}

const PACKET_SCANNER_PRESET_PLUGIN_LIST = "PACKET_SCANNER_PRESET_PLUGIN_LISTNAMES"

export const PacketScanner: React.FC<PacketScannerProp> = (props) => {
    const [presetPacketScanPlugin, setPresetPacketScanPlugin] = useState<string[]>([]);
    const [initQuery, setInitQuery] = useState<QueryYakScriptRequest>({
        Keyword: props.Keyword, Pagination: genDefaultPagination(200),
    });
    const {Https, HttpRequest, Keyword} = props;

    useEffect(() => {
        getRemoteValue(PACKET_SCANNER_PRESET_PLUGIN_LIST).then((e: string) => {
            try {
                if (e.startsWith("[") && e.endsWith("]")) {
                    const result: string[] = JSON.parse(e);
                    setPresetPacketScanPlugin([...result])
                }
            } catch (e) {

            }
        })
    }, [])

    return <div style={{height: "100%", width: "100%"}}>
        <ResizeBox
            isVer={false}
            firstNode={<>
                <SimplePluginList
                    initialQuery={initQuery}
                    autoSelectAll={!!Keyword}
                    pluginTypes={"mitm,port-scan"}
                    disabled={false} readOnly={!!Keyword}
                    bordered={false} verbose={"插件"}
                    onSelected={(names) => {
                        console.info("数据包扫描默认筛选出内容:", names)
                        setPresetPacketScanPlugin(names)
                    }} initialSelected={presetPacketScanPlugin}
                />
            </>}
            firstRatio={"300px"}
            firstMinSize={"300px"}
            secondNode={() => <>
                <PacketScannerViewer
                    plugins={presetPacketScanPlugin}
                    flowIds={props.HttpFlowIds}
                    https={Https} httpRequest={HttpRequest}
                />
            </>}
        >

        </ResizeBox>

    </div>
};

interface PacketScannerFormProp {
    flowIds?: number[]
    plugins: string[]
    https?: boolean
    httpRequest?: Uint8Array
}

const PacketScannerViewer: React.FC<PacketScannerFormProp> = React.memo((props) => {
    const token = useCreation(() => randomString(20), [])

    useEffect(() => {
        console.info("数据包扫描右控制台", props.plugins)
    }, [props])

    return <div style={{width: "100%", height: "100%", display: "flex", flexDirection: "column"}}>
        <div style={{height: 200, marginBottom: 8, marginTop: 8}}>
            <Row gutter={8} style={{height: "100%"}}>
                <Col span={16}>
                    {(props?.flowIds || []).length <= 0 ? <div style={{height: "100%"}}>
                        <HTTPPacketEditor noTitle={true} noHeader={true} readOnly={true}
                                          originValue={props?.httpRequest || new Uint8Array}/>
                    </div> : <div style={{height: "100%"}}>
                        <HttpFlowViewer ids={props.flowIds || []}/>
                    </div>}
                </Col>
                <Col span={8}>
                    <PacketScanForm
                        httpFlowIds={props.flowIds} token={token} plugins={props.plugins}
                        https={props.https} httpRequest={props.httpRequest}
                    />
                </Col>
            </Row>
        </div>
        <div style={{flex: 1}}>
            <PacketScanResult token={token}/>
        </div>
    </div>
});

export const execPacketScan = (ids: number[], keyword?: string) => {
    execPacketScanWithNewTab(ids, false, new Uint8Array, keyword)
};

export const execPacketScanFromRaw = (https: boolean, request: Uint8Array, keywrod?: string) => {
    execPacketScanWithNewTab([], https, request, keywrod)
}

const {ipcRenderer} = window.require("electron");

export const execPacketScanWithNewTab = (httpFlowIds: number[], https: boolean, request: Uint8Array, keyword?: string) => {
    ipcRenderer.invoke("send-to-tab", {
        type: "exec-packet-scan",
        data: {
            httpRequest: request,
            https: https,
            httpFlows: httpFlowIds,
            keyword: keyword,
        }
    })
}