import React, {useEffect, useRef, useState} from "react"
import "react-resizable/css/styles.css"
import {HTTPFlow, HTTPFlowTable} from "./HTTPFlowTable/HTTPFlowTable"
import {HTTPFlowDetailMini} from "./HTTPFlowDetail"
import {AutoCard} from "./AutoCard"
import {useInViewport} from "ahooks"
import {Spin} from "antd"
import {YakQueryHTTPFlowRequest} from "@/utils/yakQueryHTTPFlow"
import {YakitResizeBox} from "./yakitUI/YakitResizeBox/YakitResizeBox"

export interface HTTPPacketFuzzable {
    defaultHttps?: boolean
    sendToWebFuzzer?: boolean | (() => any) | ((isHttps: boolean, request: string) => any)
    defaultPacket?: string
}

export interface HTTPHistoryProp extends HTTPPacketFuzzable {
    websocket?: boolean
    title?: string
}

export const HTTPHistory: React.FC<HTTPHistoryProp> = (props) => {
    const [selected, setSelectedHTTPFlow] = useState<HTTPFlow>()
    const [highlightSearch, setHighlightSearch] = useState("")
    const [onlyShowFirstNode, setOnlyShowFirstNode] = useState<boolean>(true)

    return (
        <AutoCard bodyStyle={{margin: 0, padding: 0, overflow: "hidden"}} bordered={false}>
            <YakitResizeBox
                firstNode={() => (
                    <HTTPFlowTable
                        noHeader={true}
                        params={
                            props?.websocket
                                ? ({
                                      OnlyWebsocket: true
                                  } as YakQueryHTTPFlowRequest)
                                : undefined
                        }
                        // tableHeight={200}
                        // tableHeight={selected ? 164 : undefined}
                        onSelected={(i) => {
                            setSelectedHTTPFlow(i)
                        }}
                        paginationPosition={"topRight"}
                        onSearch={setHighlightSearch}
                        title={props?.title}
                        onlyShowFirstNode={onlyShowFirstNode}
                        setOnlyShowFirstNode={setOnlyShowFirstNode}
                    />
                )}
                firstMinSize={160}
                isVer={true}
                freeze={!onlyShowFirstNode}
                firstRatio={onlyShowFirstNode ? "100%" : undefined}
                secondMinSize={onlyShowFirstNode ? "0px" : 50}
                secondNode={() => (
                    <>
                        {!onlyShowFirstNode && (
                            <div style={{width: "100%", height: "100%"}}>
                                <HTTPFlowDetailMini
                                    noHeader={true}
                                    search={highlightSearch}
                                    id={selected?.Id || 0}
                                    defaultHttps={selected?.IsHTTPS}
                                    sendToWebFuzzer={true}
                                    // defaultHeight={detailHeight}
                                />
                            </div>
                        )}
                    </>
                )}
            />
        </AutoCard>
    )
}
