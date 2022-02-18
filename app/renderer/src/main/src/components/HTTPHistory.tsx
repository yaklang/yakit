import React, {useEffect, useState} from "react";
import "react-resizable/css/styles.css"
import {Card} from "antd";
import {HTTPFlow, HTTPFlowTable} from "./HTTPFlowTable";
import {HTTPFlowDetailMini} from "./HTTPFlowDetail";
import {VerticalResize} from "../components/VerticalResize";

export interface HTTPPacketFuzzable {
    defaultHttps?: boolean
    sendToWebFuzzer?: (isHttps: boolean, request: string) => any
    sendToPlugin?: (request: Uint8Array | string, isHTTPS: boolean, response?: Uint8Array) => any
}

export interface HTTPHistoryProp extends HTTPPacketFuzzable {

}

export const HTTPHistory: React.FC<HTTPHistoryProp> = (props) => {
    const [selected, setSelectedHTTPFlow] = useState<HTTPFlow>();

    // 外部 DIV 配置
    const [refreshTrigger, setRefresh] = useState(false);
    const refresh = () => {
        setRefresh(!refreshTrigger)
    }

    return <div style={{
        width: "100%", height: "100%",
        // display: "flex", flexDirection: "column",
        overflowY: selected ? "hidden" : "auto", overflowX: "hidden"
    }}>
        <div style={{
            marginBottom: 0,
            ...(selected ? {height: "33%", overflow: "auto"} : {})
        }}>
            <HTTPFlowTable
                noHeader={true}
                // tableHeight={selected ? 164 : undefined}
                onSendToWebFuzzer={props.sendToWebFuzzer}
                onSelected={(i) => {
                    setSelectedHTTPFlow(i)
                }}
                paginationPosition={"topRight"}
                sendToPlugin={props.sendToPlugin}
            />
        </div>
        {selected && <div style={{height: "67%"}}>
            <HTTPFlowDetailMini
                noHeader={true}
                hash={selected.Hash}
                defaultHttps={selected.IsHTTPS}
                sendToWebFuzzer={props.sendToWebFuzzer}
                // defaultHeight={detailHeight}
            />
        </div>}
        {/*<VerticalResize*/}
        {/*    firstResizable={(_, h: number) => {*/}
        {/*        if (selected) {*/}
        {/*            setTableHeight(h - 98)*/}
        {/*        }*/}
        {/*    }}*/}
        {/*    firstHideResize={!selected}*/}
        {/*    firstInitHeight={340}*/}
        {/*    firstMaxHeight={500}*/}
        {/*    firstNode={<div style={{height: '100%'}}>*/}
        {/*        <HTTPFlowTable*/}
        {/*            noHeader={true}*/}
        {/*            tableHeight={tableHeight}*/}
        {/*            onSendToWebFuzzer={props.sendToWebFuzzer}*/}
        {/*            onSelected={(i) => {*/}
        {/*                showDetail(i)*/}
        {/*            }}*/}
        {/*            paginationPosition={"topRight"}*/}
        {/*        />*/}
        {/*    </div>}*/}
        {/*    secondHideResize={true} secondMinHeight={detailHeight} secondMaxHeight={detailHeight}*/}
        {/*    secondNode={selected && <div style={{overflow: "hidden", height: '100%'}}>*/}
        {/*        <Card bodyStyle={{padding: 0}} bordered={false}>*/}
        {/*            <HTTPFlowDetailMini*/}
        {/*                noHeader={true}*/}
        {/*                hash={selected.Hash}*/}
        {/*                sendToWebFuzzer={props.sendToWebFuzzer}*/}
        {/*                defaultHeight={detailHeight}*/}
        {/*            />*/}
        {/*        </Card>*/}
        {/*    </div>}*/}
        {/*    reseze={reseze}*/}
        {/*/>*/}

    </div>
};