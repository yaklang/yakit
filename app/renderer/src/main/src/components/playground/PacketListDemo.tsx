import React, {useEffect, useMemo, useRef, useState} from "react"
import {useCreation, useGetState, useInfiniteScroll, useMemoizedFn} from "ahooks"
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
import YakitTree, {TreeNode} from "@/components/yakitUI/YakitTree/YakitTree"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {DownOutlined} from "@ant-design/icons"
import {number} from "echarts"
import styles from "./PacketListDemo.module.scss"
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
    const HexEditorRef = React.useRef<any>(null)
    const [treeData, setTreeData] = useState<TreeNode[]>()
    const [showData, setShowData] = useState<Uint8Array>(new Buffer([]))
    const [nonce, setNonce] = useState(0)
    const [viewer, setViewer] = useState("packet")
    const [keyToScope, setKeyToScope] = useState<{[key: string]: any}>({})

    const [treeHeight, setTreeHeight] = useState<number>(0)
    const TreeBoxRef = useRef<any>()

    const selectIdRef = useRef<number>()
    const [show,setShow] = useState<boolean>(false)

    useEffect(() => {
        if(TreeBoxRef.current){
            setTreeHeight(TreeBoxRef.current.offsetHeight)
        }
    }, [TreeBoxRef.current])

    const handleSetValue = React.useCallback(
        (offset, value) => {
            console.log("offset, value",offset, value);
            
            showData[offset] = value
            setShowData(showData)
            setNonce((v) => v + 1)
        },
        [showData]
    )
    const parseData = useMemoizedFn((data: TrafficPacket | TrafficSession | TrafficTCPReassembled) => {
        // 反选
        if(selectIdRef.current===data.Id){
            setShow(false)
            selectIdRef.current = undefined
        }
        else{
            selectIdRef.current = data.Id
            setShow(true)
            // 选中
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
        }
        
    })

    const ResizeBoxProps = useCreation(() => {
        let p = {
            firstRatio: "50%",
            secondRatio: "50%"
        }
        if (!show) {
            p.secondRatio = "0%"
            p.firstRatio = "100%"
        }
        return p
    }, [show])

    return (
        <YakitResizeBox
            onMouseUp={()=>{
                setTimeout(()=>{
                    setTreeHeight(TreeBoxRef.current.offsetHeight)
                },200)
            }}
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
                    {show&&<YakitResizeBox
                        isVer={true}
                        firstRatio='30%'
                        onMouseUp={(firstSize)=>{
                            setTreeHeight(firstSize)
                        }}
                        firstNode={
                            <div ref={TreeBoxRef} style={{height: "100%"}}>
                               {treeData&&treeData.length>0&&<YakitTree
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
                                height={treeHeight}
                                virtual={true}
                                showSearch={false}
                                onSelectedKeys={(selectedKeys, info) => {
                                    console.log("select keys", selectedKeys)
                                    console.log("info", info)
                                    console.log("keyToScope", keyToScope)
                                    let scope = keyToScope[selectedKeys[0]]
                                    console.log("scope", scope)
                                    if (scope?.length == 2) {
                                        console.log({start: scope[0] / 8, end: scope[1] / 8})
                                        HexEditorRef.current.setSelectionRange(scope[0] / 8, scope[1] / 8);
                                    }
                                }}
                                treeData={treeData}
                                titleRender={(item) => (
                                    <MemoTooltip title={item.title as any}>{item.title as any}</MemoTooltip>
                                )}
                            /> }
                            </div>
                        }
                        secondNode={
                            <div className={styles['hex-editor']}>
                               <HexEditor
                                readOnly={true}
                                ref={HexEditorRef}
                                asciiWidth={18}
                                data={showData}
                                nonce={nonce}
                                setValue={handleSetValue}
                                overscanCount={0x03}
                                showAscii={true}
                                showColumnLabels={true}
                                showRowLabels={true}
                                highlightColumn={true}
                            /> 
                           </div>
                        }
                    ></YakitResizeBox>}
                </div>
            }
            lineStyle={{display: !show ? "none" : ""}}
            secondNodeStyle={{display: show ? "block" : "none"}}
            {...ResizeBoxProps}
        />
    )
}
