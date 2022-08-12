import React, {useEffect, useState} from "react";
import {SimplePluginList} from "@/components/SimplePluginList";
import {showDrawer, showModal} from "@/utils/showModal";
import {ResizeBox} from "@/components/ResizeBox";
import {getRemoteValue} from "@/utils/kv";
import {Form, Space} from "antd";
import {PluginResultUI} from "@/pages/yakitStore/viewers/base";
import {PacketScanForm} from "@/pages/packetScanner/PacketScanForm";
import {randomString} from "@/utils/randomUtil";
import {useCreation} from "ahooks";
import {PacketScanResult} from "@/pages/packetScanner/PacketScanResult";

export interface PacketScannerProp {
    HttpFlowIds: number[]
    Https?: boolean
    HttpRequest?: Uint8Array
}

const PACKET_SCANNER_PRESET_PLUGIN_LIST = "PACKET_SCANNER_PRESET_PLUGIN_LISTNAMES"

export const PacketScanner: React.FC<PacketScannerProp> = (props) => {
    const [presetPacketScanPlugin, setPresetPacketScanPlugin] = useState<string[]>([]);
    const {Https, HttpRequest} = props;

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
                    pluginTypes={"mitm,port-scan"}
                    disabled={false} readOnly={false}
                    bordered={false} verbose={"插件"}
                    onSelected={(names) => {
                        setPresetPacketScanPlugin(names)
                    }} initialSelected={presetPacketScanPlugin}
                />
            </>}
            firstRatio={"400px"}
            firstMinSize={400}
            secondNode={() => <>
                <PacketScannerViewer
                    plugins={presetPacketScanPlugin} flowIds={props.HttpFlowIds}
                    https={Https} httpRequest={HttpRequest}
                />
            </>}
        >

        </ResizeBox>

    </div>
};

interface PacketScannerFormProp {
    flowIds: number[]
    plugins: string[]
    https?: boolean
    httpRequest?: Uint8Array
}

const PacketScannerViewer: React.FC<PacketScannerFormProp> = (props) => {
    const token = useCreation(() => randomString(20), [])

    useEffect(() => {
        console.info(props.plugins)
    }, [props])

    return <div style={{width: "100%", height: "100%"}}>
        <ResizeBox
            isVer={true}
            firstNode={() => {
                return <PacketScanForm
                    httpFlowIds={props.flowIds} token={token} plugins={props.plugins}
                    https={props.https} httpRequest={props.httpRequest}
                />
            }}
            firstRatio={"100"}
            firstMinSize={100}
            secondNode={() => {
                return <PacketScanResult token={token}/>
            }}
        >

        </ResizeBox>
    </div>
};

export const execPacketScan = (ids: number[]) => {
    execPacketScanWithNewTab(ids, false, new Uint8Array)
};

export const execPacketScanFromRaw = (https: boolean, request: Uint8Array) => {
    execPacketScanWithNewTab([], https, request)
}

const {ipcRenderer} = window.require("electron");

export const execPacketScanWithNewTab = (httpFlowIds: number[], https: boolean, request: Uint8Array) => {
    ipcRenderer.invoke("send-to-tab", {
        type: "exec-packet-scan",
        data: {
            httpRequest: request,
            https: https,
            httpFlows: httpFlowIds,
        }
    })
}