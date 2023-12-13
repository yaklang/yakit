import React, {useEffect, useMemo, useRef, useState} from "react"
import {useGetState, useInfiniteScroll, useMemoizedFn} from "ahooks"
import {TrafficPacket, TrafficSession, TrafficTCPReassembled} from "@/models/Traffic"
import {Paging} from "@/utils/yakQueryHTTPFlow"
import {failed, info} from "@/utils/notification"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {genDefaultPagination, QueryGeneralResponse} from "@/pages/invoker/schema"
import {DemoVirtualTable} from "@/demoComponents/virtualTable/VirtualTable"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {Form} from "antd"
import {YakEditor} from "@/utils/editors"
import HexEditor from "react-hex-editor"
import {AutoCard} from "@/components/AutoCard"
import {DemoItemSwitch} from "@/demoComponents/itemSwitch/ItemSwitch"
import {DemoPacketTable} from "@/components/playground/traffic/DemoPacketTable"
import {DemoTCPReassembled} from "@/components/playground/traffic/DemoTCPReassembled"
import {DemoTrafficSessionTable} from "@/components/playground/traffic/DemoTrafficSessionTable"
import {DemoItemRadioButton} from "@/demoComponents/itemRadioAndCheckbox/RadioAndCheckbox"
import {Tooltip, Tree} from "antd"
import {TreeNode} from "@/components/yakitUI/YakitTree/YakitTree"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {DownOutlined} from "@ant-design/icons"
import {number} from "echarts"
const DirectoryTree = Tree.DirectoryTree
const MemoTooltip = Tooltip || React.memo(Tooltip)
export interface PacketListProp {
    onLoadingChanged?: (loading: boolean) => void
    onClickRow?: (row?: TrafficPacket) => void
}

const {ipcRenderer} = window.require("electron")

interface PacketScrollData {
    list: TrafficPacket[]
    paging: Paging
    isNoMore: boolean
}

export const PacketListDemo: React.FC<PacketListProp> = (props) => {
    const [clearTrigger, setClearTrigger] = useState(false)
    const clear = useMemoizedFn(() => {
        setClearTrigger(!clearTrigger)
    })
    const [realtime, setRealtime] = useState(true)

    const timestampNow = useMemo(() => {
        return Math.floor(Date.now() / 1000)
    }, [])
    const [selected, setSelected] = useState<TrafficPacket | TrafficSession | TrafficTCPReassembled>()
    const ref = React.useRef<any>(null)
    const [treeData, setTreeData] = useState<TreeNode[]>()
    const [showData, setShowData] = useState<Uint8Array>(new Buffer([]))
    const [nonce, setNonce] = useState(0)
    const [viewer, setViewer] = useState("packet")
    const [highlightRanges, setHighlightRanges] = useState<{start: number; end: number}[]>([{start: 0, end: 6}])
    const [keyToScope, setKeyToScope] = useState<{[key: string]: any}>({})
    const handleSetValue = React.useCallback(
        (offset, value) => {
            showData[offset] = value
            setShowData(showData)
            setNonce((v) => v + 1)
        },
        [showData]
    )
    const parseData = useMemoizedFn((data: TrafficPacket | TrafficSession | TrafficTCPReassembled) => {
        let typ: string = ""
        if ("DeviceName" in data) {
            typ = "session"
        }
        if ("EthernetEndpointHardwareAddrSrc" in data) {
            typ = "packet"
        }
        if ("SessionUuid" in data) {
            typ = "reassembled"
        }
        ipcRenderer.invoke("ParseTraffic", {Id: data.Id, Type: typ}).then((data) => {
            let res = JSON.parse(data.Result)
            console.log(res)
            let result = res.Result
            let keyToScope = {}
            let toTreeData = (obj, keys: string[]) => {
                let data: TreeNode[] = []
                if (!(obj instanceof Object)) {
                    return undefined
                }
                Object.keys(obj).forEach((v) => {
                    let newKeys = [...keys, v]
                    if (obj[v]?.leaf) {
                        let title = obj[v] ? v + ":" + obj[v].verbose : obj[v]
                        data.push({
                            key: newKeys.join("-"),
                            title: title
                        })
                        keyToScope[newKeys.join("-")] = obj[v]?.scope
                    } else {
                        data.push({
                            key: newKeys.join("-"),
                            title: v,
                            children: toTreeData(obj[v], newKeys)
                        })
                    }
                })
                return data
            }
            let tdata = toTreeData(result, [])
            setKeyToScope(keyToScope)
            setTreeData(tdata)
            setShowData(StringToUint8Array(res.RAW, "utf8"))
            // res["RAW"]
            // if (data.OK) {
            //     let mapData = UnmarshJson(data.Result)
            //     console.log(mapData)
            // } else {
            //     failed(`get traffic error: ${data.Message}`)
            // }
        })
    })
    return (
        <YakitResizeBox
            isVer={true}
            firstNode={
                <AutoCard
                    bodyStyle={{overflow: "hidden", paddingLeft: 0, paddingRight: 0, paddingBottom: 0}}
                    size={"small"}
                    bordered={false}
                    title={
                        <Form layout={"inline"} onSubmitCapture={(e) => e.preventDefault()}>
                            <DemoItemRadioButton
                                data={[
                                    {value: "packet", label: "数据包"},
                                    {value: "session", label: "会话"},
                                    {value: "tcp-reassembled", label: "TCP数据帧"}
                                ]}
                                value={viewer}
                                setValue={setViewer}
                            />
                        </Form>
                    }
                    extra={
                        <Form layout={"inline"} size={"small"}>
                            <DemoItemSwitch label={"实时"} value={realtime} setValue={setRealtime} />
                            <YakitButton danger={true} onClick={clear}>
                                清空
                            </YakitButton>
                        </Form>
                    }
                >
                    {viewer === "packet" && (
                        <DemoPacketTable realtime={realtime} onClick={parseData} fromTimestamp={timestampNow} />
                    )}
                    {viewer === "tcp-reassembled" && (
                        <DemoTCPReassembled realtime={realtime} onClick={parseData} fromTimestamp={timestampNow} />
                    )}
                    {viewer === "session" && (
                        <DemoTrafficSessionTable realtime={realtime} onClick={parseData} fromTimestamp={timestampNow} />
                    )}
                </AutoCard>
            }
            secondNode={
                <div style={{height: "100%"}}>
                    <YakitResizeBox
                        isVer={true}
                        firstRatio='30%'
                        firstNode={
                            <Tree
                                // loadData={(node) => {
                                //     console.log("load", node)
                                //     return new Promise((resolve, reject) => {
                                //         const originData = node.data
                                //         if (originData === undefined) {
                                //             reject("node.data is empty")
                                //             return
                                //         }
                                //     })
                                // }}
                                virtual
                                onSelect={(selectedKeys, info) => {
                                    console.log("select keys", selectedKeys)
                                    console.log("info", info)
                                    console.log("keyToScope", keyToScope)
                                    let scope = keyToScope[info.node.key]
                                    console.log("scope", scope)
                                    if (scope?.length == 2) {
                                        console.log({start: scope[0] / 8, end: scope[1] / 8})
                                        setHighlightRanges([{start: scope[0] / 8, end: scope[1] / 8}])
                                    }
                                }}
                                treeData={treeData}
                                titleRender={(item) => (
                                    <MemoTooltip title={item.title as any}>{item.title as any}</MemoTooltip>
                                )}
                            />
                        }
                        secondNode={
                            <HexEditor
                                ref={ref}
                                // columns={16}
                                data={showData}
                                nonce={nonce}
                                setValue={handleSetValue}
                                overscanCount={0x03}
                                showAscii={true}
                                highlightRanges={highlightRanges}
                                showColumnLabels={true}
                                showRowLabels={true}
                                highlightColumn={true}
                            />
                        }
                    ></YakitResizeBox>
                </div>
            }
        />
    )
}
