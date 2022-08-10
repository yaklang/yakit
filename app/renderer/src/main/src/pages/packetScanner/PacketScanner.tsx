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
}

const PACKET_SCANNER_PRESET_PLUGIN_LIST = "PACKET_SCANNER_PRESET_PLUGIN_LISTNAMES"

export const PacketScanner: React.FC<PacketScannerProp> = (props) => {
    const [presetPacketScanPlugin, setPresetPacketScanPlugin] = useState<string[]>([]);

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
                <PacketScannerViewer plugins={presetPacketScanPlugin} flowIds={props.HttpFlowIds}/>
            </>}
        >

        </ResizeBox>

    </div>
};

interface PacketScannerFormProp {
    flowIds: number[]
    plugins: string[]

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
                return <PacketScanForm httpFlowIds={props.flowIds} token={token} plugins={props.plugins}/>
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
    showDrawer({
        title: "数据包扫描", maskClosable: false,
        width: "95%",
        content: (
            <>
                <PacketScanner HttpFlowIds={ids}/>
            </>
        )
    })
}