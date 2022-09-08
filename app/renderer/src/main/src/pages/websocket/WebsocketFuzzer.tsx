import React, {useState} from "react";
import {ResizeBox} from "@/components/ResizeBox";
import {WebsocketClientOperator} from "@/pages/websocket/WebsocketClientOperator";
import {randomString} from "@/utils/randomUtil";
import {WebsocketFlowViewer} from "@/pages/websocket/WebsocketFlowViewer";
import {info} from "@/utils/notification";

export interface WebsocketFuzzerProp {
    tls?: boolean
    request?: Uint8Array
}

export const WebsocketFuzzer: React.FC<WebsocketFuzzerProp> = (props) => {
    const [token, setToken] = useState("")

    return <div style={{height: "100%", width: "100%"}}>
        <ResizeBox
            firstNode={() => {
                return <WebsocketClientOperator tls={props.tls} request={props.request} onToken={setToken}/>
            }}
            firstRatio={'500px'}
            firstMinSize={'500px'}
            secondNode={() => {
                return <WebsocketFlowViewer token={token}/>
            }}
        />
    </div>
};

const {ipcRenderer} = window.require("electron");

export const newWebsocketFuzzerTab = (isHttps: boolean, request: Uint8Array) => {
    return ipcRenderer
        .invoke("send-to-tab", {
            type: "websocket-fuzzer",
            data: {tls: isHttps, request: request}
        })
        .then(() => {
            info("新开 Websocket Fuzzer Tab")
        })
}