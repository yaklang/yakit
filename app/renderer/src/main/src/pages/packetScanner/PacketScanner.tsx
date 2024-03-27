import React, {useEffect, useState} from "react"
import {SimplePluginList} from "@/components/SimplePluginList"
import {showDrawer, showModal} from "@/utils/showModal"
import {ResizeBox} from "@/components/ResizeBox"
import {getRemoteValue} from "@/utils/kv"
import {Card, Col, Form, Layout, Row, Space} from "antd"
import {PluginResultUI} from "@/pages/yakitStore/viewers/base"
import {PacketScanForm} from "@/pages/packetScanner/PacketScanForm"
import {randomString} from "@/utils/randomUtil"
import {useCreation} from "ahooks"
import {PacketScanResult} from "@/pages/packetScanner/PacketScanResult"
import {HTTPPacketEditor} from "@/utils/editors"
import {HttpFlowViewer} from "@/pages/packetScanner/HttpFlowViewer"
import {genDefaultPagination, QueryYakScriptRequest} from "@/pages/invoker/schema"
import {AutoCard} from "@/components/AutoCard"
import ReactResizeDetector from "react-resize-detector"
import {xtermFit} from "@/utils/xtermUtils"
import {YakitRoute} from "@/routes/newRoute"
import emiter from "@/utils/eventBus/eventBus"

export interface PacketScannerProp {
    HttpFlowIds?: number[]
    Https?: boolean
    HttpRequest?: Uint8Array
    Keyword?: string
}

const PACKET_SCANNER_PRESET_PLUGIN_LIST = "PACKET_SCANNER_PRESET_PLUGIN_LISTNAMES"

export const PacketScanner: React.FC<PacketScannerProp> = (props) => {
    const [presetPacketScanPlugin, setPresetPacketScanPlugin] = useState<string[]>([])
    const [initQuery, setInitQuery] = useState<QueryYakScriptRequest>({
        Keyword: props.Keyword,
        Pagination: genDefaultPagination(200)
    })
    const {Https, HttpRequest, Keyword} = props

    useEffect(() => {
        getRemoteValue(PACKET_SCANNER_PRESET_PLUGIN_LIST).then((e: string) => {
            try {
                if (e.startsWith("[") && e.endsWith("]")) {
                    const result: string[] = JSON.parse(e)
                    setPresetPacketScanPlugin([...result])
                }
            } catch (e) {}
        })
    }, [])

    return (
        <div style={{height: "100%", width: "100%"}}>
            <ResizeBox
                isVer={false}
                firstNode={() => (
                    <>
                        <SimplePluginList
                            initialQuery={initQuery}
                            autoSelectAll={!!Keyword}
                            pluginTypes={"mitm,port-scan"}
                            disabled={false}
                            readOnly={!!Keyword}
                            bordered={false}
                            verbose={"插件"}
                            onSelected={(names) => {
                                setPresetPacketScanPlugin(names)
                            }}
                            initialSelected={presetPacketScanPlugin}
                            sourceType='PACKET_SCANNER'
                        />
                    </>
                )}
                firstRatio={"300px"}
                firstMinSize={"300px"}
                secondNode={() => (
                    <PacketScannerViewer
                        plugins={presetPacketScanPlugin}
                        flowIds={props.HttpFlowIds}
                        https={Https}
                        httpRequest={HttpRequest}
                    />
                )}
            />
        </div>
    )
}

interface PacketScannerFormProp {
    flowIds?: number[]
    plugins: string[]
    https?: boolean
    httpRequest?: Uint8Array
}

const PacketScannerViewer: React.FC<PacketScannerFormProp> = React.memo((props) => {
    const token = useCreation(() => randomString(20), [])
    const [viewerHeight, setViewerHeight] = useState(200)

    return (
        <ResizeBox
            isVer={true}
            firstRatio='200px'
            firstMinSize={200}
            secondMinSize={200}
            // freeze={true}
            firstNode={() => {
                return (
                    <Row gutter={8} style={{height: "100%"}}>
                        <Col span={16}>
                            {(props?.flowIds || []).length <= 0 ? (
                                <div style={{height: "100%"}}>
                                    <HTTPPacketEditor
                                        noTitle={true}
                                        noHeader={true}
                                        readOnly={true}
                                        originValue={props?.httpRequest || new Uint8Array()}
                                    />
                                </div>
                            ) : (
                                <div style={{height: "100%"}}>
                                    <HttpFlowViewer ids={props.flowIds || []} />
                                </div>
                            )}
                        </Col>
                        <Col span={8}>
                            <PacketScanForm
                                httpFlowIds={props.flowIds}
                                token={token}
                                plugins={props.plugins}
                                https={props.https}
                                httpRequest={props.httpRequest}
                            />
                        </Col>
                    </Row>
                )
            }}
            secondNode={() => {
                return <PacketScanResult token={token} />
            }}
        />
    )
})

export const execPacketScan = (ids: number[], value: {Keyword?: string; Verbose: string}) => {
    const {Keyword, Verbose} = value
    execPacketScanWithNewTab({
        httpFlowIds: ids,
        https: false,
        request: new Uint8Array(),
        keyword: Keyword || "",
        verbose: Verbose
    })
}

export const execPacketScanFromRaw = (
    https: boolean,
    request: Uint8Array,
    value: {Keyword?: string; Verbose: string}
) => {
    const {Keyword, Verbose} = value
    execPacketScanWithNewTab({httpFlowIds: [], https, request, keyword: Keyword || "", verbose: Verbose})
}

export const execPacketScanWithNewTab = (params: {
    httpFlowIds: number[] | string[]
    https: boolean
    request?: Uint8Array
    keyword: string
    verbose: string
}) => {
    const {httpFlowIds, https, request = new Uint8Array(), keyword, verbose} = params
    // keyword为undefined的时候去批量执行页面，有值去poc页面并需选中关键词组
    if (keyword) {
        emiter.emit(
            "openPage",
            JSON.stringify({
                route: YakitRoute.PoC,
                params: {
                    request,
                    https,
                    httpFlowIds,
                    verbose
                }
            })
        )
    } else {
        emiter.emit(
            "openPage",
            JSON.stringify({
                route: YakitRoute.BatchExecutorPage,
                params: {
                    request,
                    https,
                    httpFlowIds
                }
            })
        )
    }
}
