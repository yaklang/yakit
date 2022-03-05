import React, {useEffect, useState} from "react";
import "react-resizable/css/styles.css"
import {Card} from "antd";
import {HTTPFlow, HTTPFlowTable} from "./HTTPFlowTable";
import {HTTPFlowDetailMini} from "./HTTPFlowDetail";
import {VerticalResize} from "../components/VerticalResize";
import {ResizeBox} from "./ResizeBox";
import {AutoCard} from "./AutoCard";
import ReactResizeDetector from "react-resize-detector";
import {useDebounceFn, useMemoizedFn, useThrottleFn} from "ahooks";

export interface HTTPPacketFuzzable {
    defaultHttps?: boolean
    sendToWebFuzzer?: (isHttps: boolean, request: string) => any
    sendToPlugin?: (request: Uint8Array, isHTTPS: boolean, response?: Uint8Array) => any
}

export interface HTTPHistoryProp extends HTTPPacketFuzzable {

}

export const HTTPHistory: React.FC<HTTPHistoryProp> = (props) => {
    const [selected, setSelectedHTTPFlow] = useState<HTTPFlow>();
    const [layoutTrigger, setLayoutTrigger] = useState(false);
    const [fullHeight, setFullHeight] = useState(0);

    const refresh = useDebounceFn(useMemoizedFn((height: number) => {
        setFullHeight(height)
        setLayoutTrigger(!layoutTrigger)
    }), {wait: 200})

    return <div style={{
        width: "100%", height: "100%",
        // display: "flex", flexDirection: "column",
        overflowY: selected ? "hidden" : "hidden", overflowX: "hidden"
    }}>
        <ReactResizeDetector onResize={(_, height) => {
            refresh.run(height || 0)
        }} refreshMode={"debounce"} refreshRate={50} handleWidth={false} handleHeight={true}/>
        <AutoCard bodyStyle={{margin: 0, padding: 0}}>
            <ResizeBox
                // layoutTrigger={layoutTrigger}
                style={{
                    overflow: "hidden",
                    height: fullHeight > 0 ? fullHeight : undefined}}
                firstNode={<HTTPFlowTable
                    noHeader={true}
                    // tableHeight={200}
                    // tableHeight={selected ? 164 : undefined}
                    onSendToWebFuzzer={props.sendToWebFuzzer}
                    onSelected={(i) => {
                        setSelectedHTTPFlow(i)
                    }}
                    paginationPosition={"topRight"}
                    sendToPlugin={props.sendToPlugin}
                />}
                firstMinSize={160}
                isVer={true} secondMinSize={300}
                secondNode={<>
                    <HTTPFlowDetailMini
                        noHeader={true}
                        hash={selected?.Hash || ""}
                        defaultHttps={selected?.IsHTTPS}
                        sendToWebFuzzer={props.sendToWebFuzzer}
                        // defaultHeight={detailHeight}
                    />
                </>}
            />
        </AutoCard>
    </div>
};