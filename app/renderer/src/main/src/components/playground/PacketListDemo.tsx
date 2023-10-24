import React, {useEffect, useMemo, useRef, useState} from "react";
import {useGetState, useInfiniteScroll, useMemoizedFn} from "ahooks";
import {TrafficPacket, TrafficSession, TrafficTCPReassembled} from "@/models/Traffic";
import {Paging} from "@/utils/yakQueryHTTPFlow";
import {info} from "@/utils/notification";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {genDefaultPagination, QueryGeneralResponse} from "@/pages/invoker/schema";
import {DemoVirtualTable} from "@/demoComponents/virtualTable/VirtualTable";
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox";
import {Form} from "antd";
import {DemoItemSelectButton, DemoItemSelectOne} from "@/demoComponents/itemSelect/ItemSelect";
import {YakEditor} from "@/utils/editors";
import {AutoCard} from "@/components/AutoCard";
import {DemoItemSwitch} from "@/demoComponents/itemSwitch/ItemSwitch";
import {DemoPacketTable} from "@/components/playground/traffic/DemoPacketTable";
import {DemoTCPReassembled} from "@/components/playground/traffic/DemoTCPReassembled";
import {DemoTrafficSessionTable} from "@/components/playground/traffic/DemoTrafficSessionTable";

export interface PacketListProp {
    onLoadingChanged?: (loading: boolean) => void
    onClickRow?: (row?: TrafficPacket) => void
}

const {ipcRenderer} = window.require("electron");

interface PacketScrollData {
    list: TrafficPacket[],
    paging: Paging,
    isNoMore: boolean,
}

export const PacketListDemo: React.FC<PacketListProp> = (props) => {
    const [clearTrigger, setClearTrigger] = useState(false);
    const clear = useMemoizedFn(() => {
        setClearTrigger(!clearTrigger)
    })
    const [realtime, setRealtime] = useState(true);

    const timestampNow = useMemo(() => {
        return Math.floor(Date.now() / 1000)
    }, []);
    const [selected, setSelected] = useState<TrafficPacket | TrafficSession | TrafficTCPReassembled>();
    const [viewer, setViewer] = useState("packet");

    return <YakitResizeBox
        isVer={true}
        firstNode={<AutoCard
            bodyStyle={{overflow: "hidden", paddingLeft: 0, paddingRight: 0, paddingBottom: 0}}
            size={"small"} bordered={false}
            title={<Form layout={"inline"} onSubmitCapture={e => e.preventDefault()}>
                <DemoItemSelectButton data={[
                    {value: "packet", label: "数据包"},
                    {value: "session", label: "会话"},
                    {value: "tcp-reassembled", label: "TCP数据帧"},
                ]} value={viewer} setValue={setViewer}/>
            </Form>}
            extra={<Form layout={"inline"} size={"small"}>
                <DemoItemSwitch label={"实时"} value={realtime} setValue={setRealtime}/>
                <YakitButton danger={true} onClick={clear}>清空</YakitButton>
            </Form>}
        >
            {viewer === "packet" &&
                <DemoPacketTable realtime={realtime} onClick={setSelected} fromTimestamp={timestampNow}/>}
            {viewer === "tcp-reassembled" &&
                <DemoTCPReassembled realtime={realtime} onClick={setSelected} fromTimestamp={timestampNow}/>}
            {viewer === "session" &&
                <DemoTrafficSessionTable realtime={realtime} onClick={setSelected} fromTimestamp={timestampNow}/>}
        </AutoCard>}
        secondNode={<div style={{height: "100%"}}>
            <YakEditor type={"html"} readOnly={true} value={JSON.stringify(selected, undefined, 4)}/>
        </div>}
    />
}