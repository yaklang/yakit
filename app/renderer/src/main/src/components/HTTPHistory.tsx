import React, {useEffect, useRef, useState} from "react"
import "react-resizable/css/styles.css"
import {HTTPFlow, HTTPFlowTable} from "./HTTPFlowTable/HTTPFlowTable"
import {HTTPFlowDetailMini} from "./HTTPFlowDetail"
import {AutoCard} from "./AutoCard"
import {useInViewport, useUpdateEffect} from "ahooks"
import {useStore} from "@/store/mitmState"
import {YakQueryHTTPFlowRequest} from "@/utils/yakQueryHTTPFlow"
import {YakitResizeBox} from "./yakitUI/YakitResizeBox/YakitResizeBox"
import { getRemoteValue } from "@/utils/kv"

export interface HTTPPacketFuzzable {
    defaultHttps?: boolean
    sendToWebFuzzer?: boolean | (() => any) | ((isHttps: boolean, request: string) => any)
    defaultPacket?: string
}

export interface HTTPHistoryProp extends HTTPPacketFuzzable {
    websocket?: boolean
    pageType?: "MITM"
}

export const HTTPHistory: React.FC<HTTPHistoryProp> = (props) => {
    const {pageType} = props
    const ref = useRef(null)
    const [inViewport] = useInViewport(ref)
    const {isRefreshHistory, setIsRefreshHistory} = useStore()
    // 控制刷新数据
    const [refresh, setRefresh] = useState<boolean>(false)
    const [selected, setSelectedHTTPFlow] = useState<HTTPFlow>()
    const [highlightSearch, setHighlightSearch] = useState("")
    const [onlyShowFirstNode, setOnlyShowFirstNode] = useState<boolean>(true)
    useUpdateEffect(() => {
        if (isRefreshHistory) {
            setRefresh(!refresh)
            setIsRefreshHistory(false)
        }
    }, [inViewport])

    const [defaultFold,setDefaultFold] = useState<boolean>()
    useEffect(()=>{
        getRemoteValue("HISTORY_FOLD").then((result:string) => {
            if (!result) setDefaultFold(false)
            try {
                const foldResult:boolean = JSON.parse(result)
                setDefaultFold(foldResult)
            } catch (e) {setDefaultFold(false)}
        })
    },[])

    return (
        <div ref={ref} style={{width: "100%", height: "100%", overflow: "hidden"}}>
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
                            onlyShowFirstNode={onlyShowFirstNode}
                            setOnlyShowFirstNode={setOnlyShowFirstNode}
                            refresh={refresh}
                            pageType={pageType}
                        />
                    )}
                    firstMinSize={160}
                    isVer={true}
                    freeze={!onlyShowFirstNode}
                    firstRatio={onlyShowFirstNode ? "100%" : undefined}
                    secondNodeStyle={{padding: onlyShowFirstNode ? 0 : undefined, display: onlyShowFirstNode ? "none" : ""}}
                    secondMinSize={50}
                    secondNode={() => (
                        <>
                            {!onlyShowFirstNode && typeof defaultFold === 'boolean' && (
                                <div style={{width: "100%", height: "100%"}}>
                                    <HTTPFlowDetailMini
                                        noHeader={true}
                                        search={highlightSearch}
                                        id={selected?.Id || 0}
                                        defaultHttps={selected?.IsHTTPS}
                                        Tags={selected?.Tags}
                                        sendToWebFuzzer={true}
                                        selectedFlow={selected}
                                        refresh={refresh}
                                        defaultFold={defaultFold}
                                        pageType={pageType}
                                        // defaultHeight={detailHeight}
                                    />
                                </div>
                            )}
                        </>
                    )}
                />
            </AutoCard>
        </div>
    )
}
