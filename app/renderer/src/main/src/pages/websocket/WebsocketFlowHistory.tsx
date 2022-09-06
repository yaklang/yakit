import React from "react";
import {HTTPHistory} from "@/components/HTTPHistory";

export interface WebsocketFuzzerHistoryProp {

}

export const WebsocketFlowHistory: React.FC<WebsocketFuzzerHistoryProp> = (props) => {
    return <HTTPHistory websocket={true} title={`Websocket History`}/>
};