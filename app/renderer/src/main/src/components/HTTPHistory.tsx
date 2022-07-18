import React, {useEffect, useRef, useState} from "react"
import "react-resizable/css/styles.css"
import {HTTPFlow, HTTPFlowTable} from "./HTTPFlowTable"
import {HTTPFlowDetailMini} from "./HTTPFlowDetail"
import {ResizeBox} from "./ResizeBox"
import {AutoCard} from "./AutoCard"
import {useInViewport} from "ahooks";

export interface HTTPPacketFuzzable {
    defaultHttps?: boolean
    sendToWebFuzzer?: boolean | (() => any) | ((isHttps: boolean, request: string) => any)
}

export interface HTTPHistoryProp extends HTTPPacketFuzzable {
}

export const HTTPHistory: React.FC<HTTPHistoryProp> = (props) => {
    const [selected, setSelectedHTTPFlow] = useState<HTTPFlow>();

    const ref = useRef(null);
    const [inViewport] = useInViewport(ref);

    useEffect(() => {
        console.info("HTTPFlowTable view state", inViewport)
    }, [inViewport])

    return (
        <AutoCard bodyStyle={{margin: 0, padding: 0, overflow: "hidden"}}>
            <ResizeBox
                firstNode={
                    <HTTPFlowTable
                        noHeader={true}
                        inViewport={inViewport}
                        // tableHeight={200}
                        // tableHeight={selected ? 164 : undefined}
                        onSelected={(i) => setSelectedHTTPFlow(i)}
                        paginationPosition={"topRight"}
                    />
                }
                firstMinSize={160}
                isVer={true}
                secondMinSize={50}
                secondNode={
                    <div style={{width: "100%", height: "100%"}} ref={ref}>
                        <HTTPFlowDetailMini
                            noHeader={true}
                            id={selected?.Id || 0}
                            defaultHttps={selected?.IsHTTPS}
                            sendToWebFuzzer={true}
                            // defaultHeight={detailHeight}
                        />
                    </div>
                }
            />
        </AutoCard>
    )
}
