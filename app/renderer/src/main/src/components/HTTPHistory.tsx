import React, {useEffect, useState} from "react"
import "react-resizable/css/styles.css"
import {HTTPFlow, HTTPFlowTable} from "./HTTPFlowTable"
import {HTTPFlowDetailMini} from "./HTTPFlowDetail"
import {ResizeBox} from "./ResizeBox"
import {AutoCard} from "./AutoCard"

export interface HTTPPacketFuzzable {
    defaultHttps?: boolean
    sendToWebFuzzer?: (isHttps: boolean, request: string) => any
    sendToPlugin?: (request: Uint8Array, isHTTPS: boolean, response?: Uint8Array) => any
}

export interface HTTPHistoryProp extends HTTPPacketFuzzable {}

export const HTTPHistory: React.FC<HTTPHistoryProp> = (props) => {
    const [selected, setSelectedHTTPFlow] = useState<HTTPFlow>()

    return (
        <AutoCard bodyStyle={{margin: 0, padding: 0, overflow: "hidden"}}>
            <ResizeBox
                firstNode={
                    <HTTPFlowTable
                        noHeader={true}
                        // tableHeight={200}
                        // tableHeight={selected ? 164 : undefined}
                        onSendToWebFuzzer={props.sendToWebFuzzer}
                        onSelected={(i) => {
                            setSelectedHTTPFlow(i)
                        }}
                        paginationPosition={"topRight"}
                        sendToPlugin={props.sendToPlugin}
                    />
                }
                firstMinSize={160}
                isVer={true}
                secondMinSize={300}
                secondNode={
                    <div style={{width: "100%", height: "100%"}}>
                        <HTTPFlowDetailMini
                            noHeader={true}
                            hash={selected?.Hash || ""}
                            defaultHttps={selected?.IsHTTPS}
                            sendToWebFuzzer={props.sendToWebFuzzer}
                            // defaultHeight={detailHeight}
                        />
                    </div>
                }
            />
        </AutoCard>
    )
}
