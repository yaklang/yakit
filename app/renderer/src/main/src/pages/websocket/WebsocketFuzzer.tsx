import React from "react";
import {ResizeBox} from "@/components/ResizeBox";
import {WebsocketClientOperator} from "@/pages/websocket/WebsocketClientOperator";

export interface WebsocketFuzzerProp {

}

export const WebsocketFuzzer: React.FC<WebsocketFuzzerProp> = (props) => {
    return <div style={{height: "100%", width: "100%"}}>
        <ResizeBox
            firstNode={() => {
                return <WebsocketClientOperator/>
            }}
            firstRatio={'500px'}
            firstMinSize={'500px'}
            secondNode={() => {
                return <div>
                    ShowPage
                </div>
            }}
        />
    </div>
};