import React, {useState} from "react";
import {ResizeBox} from "@/components/ResizeBox";
import {WebsocketClientOperator} from "@/pages/websocket/WebsocketClientOperator";
import {randomString} from "@/utils/randomUtil";
import {WebsocketFlowViewer} from "@/pages/websocket/WebsocketFlowViewer";

export interface WebsocketFuzzerProp {

}

export const WebsocketFuzzer: React.FC<WebsocketFuzzerProp> = (props) => {
    const [token, setToken] = useState("")

    return <div style={{height: "100%", width: "100%"}}>
        <ResizeBox
            firstNode={() => {
                return <WebsocketClientOperator onToken={setToken}/>
            }}
            firstRatio={'500px'}
            firstMinSize={'500px'}
            secondNode={() => {
                return <WebsocketFlowViewer token={token}/>
            }}
        />
    </div>
};