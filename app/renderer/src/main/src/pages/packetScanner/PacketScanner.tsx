import React, {useEffect, useState} from "react";
import {SimplePluginList} from "@/components/SimplePluginList";
import {showDrawer, showModal} from "@/utils/showModal";
import {ResizeBox} from "@/components/ResizeBox";
import {getRemoteValue} from "@/utils/kv";
import {Form, Space} from "antd";
import {PluginResultUI} from "@/pages/yakitStore/viewers/base";

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
            secondNode={<>
                <PacketScannerViewer plugins={[]} flowIds={props.HttpFlowIds}/>
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

    return <div style={{width: "100%", height: "100%"}}>
        <ResizeBox
            isVer={true}
            firstNode={() => {
                return <div>HHHH CALLBACK</div>
            }}
            firstRatio={"200px"}
            firstMinSize={200}
            secondNode={()=>{
                return
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