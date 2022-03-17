import React, {useEffect, useState} from "react";
import useHoldingIPCRStream from "../../hook/useHoldingIPCRStream";
import {randomString} from "../../utils/randomUtil";
import {AutoCard} from "../../components/AutoCard";
import {PluginResultUI} from "../yakitStore/viewers/base";
import {showDrawer} from "../../utils/showModal";
import {failed} from "../../utils/notification";

export interface ExecutePacketYakScriptProp {
    ScriptName: string
    IsHttps: boolean
    Request: Uint8Array
    Response?: Uint8Array
}

const {ipcRenderer} = window.require("electron");

export const ExecutePacketYakScript: React.FC<ExecutePacketYakScriptProp> = (props) => {
    const [token, setToken] = useState(randomString(20))
    const [finished, setFinished] = useState(false);
    const [loading, setLoading] = useState(true);
    const [infoState, {
        reset,
        setXtermRef
    }] = useHoldingIPCRStream(`execute-packet-yak-script`, "ExecutePacketYakScript", token, () => {
        setFinished(true)
        setLoading(false)
    }, () => {
        ipcRenderer.invoke("ExecutePacketYakScript", props, token).then(() => {

        }).catch(e => {
            failed(`Start Packet Checker Error: ${e}`)
        })
    });

    return (
        <AutoCard title={"execute-packet-yak-script"}>
            <PluginResultUI
                results={infoState.messageState}
                progress={infoState.processState}
                featureType={infoState.featureTypeState}
                feature={infoState.featureMessageState}
                statusCards={infoState.statusState}
                loading={loading} onXtermRef={setXtermRef}
            />
        </AutoCard>
    )
};

export const execTest = () => {
    showDrawer({
        title: "TEST", width: "70%", content: <>
            <ExecutePacketYakScript ScriptName={"asdfad"} IsHttps={false} Request={new Buffer(`GET /Ttes HTTP/1.1
Host: www.baidu.com

`)}/>
        </>
    })
}