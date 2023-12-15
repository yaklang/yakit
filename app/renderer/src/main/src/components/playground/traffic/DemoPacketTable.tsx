import React, {useEffect, useState} from "react"
import {TrafficPacket, TrafficSession} from "@/models/Traffic"
import {DemoVirtualTable} from "@/demoComponents/virtualTable/VirtualTable"
import {info} from "@/utils/notification"
import {Paging} from "@/utils/yakQueryHTTPFlow"
import {TrafficViewerControlIf} from "@/components/playground/traffic/base"
import Item from "antd/lib/list/Item"
import { useMemoizedFn } from "ahooks"

export interface DemoPacketTableProp extends TrafficViewerControlIf {}

const {ipcRenderer} = window.require("electron")

export const DemoPacketTable: React.FC<DemoPacketTableProp> = (props) => {

    const onSelectFun = useMemoizedFn((data:TrafficPacket)=>{
        if (!data) {
            return
        }
        props.onClick&&props.onClick(data)
    })

    return (
        <DemoVirtualTable<TrafficPacket>
            isStop={!props.realtime}
            isScrollUpdate={!props.realtime}
            columns={[
                {
                    headerTitle: "Id",
                    key: "Id",
                    width: 90,
                    colRender: (item) => item.Id
                },
                {
                    headerTitle: "来源",
                    key: "source",
                    width: 150,
                    colRender: (i) => i.NetworkEndpointIPSrc + ":" + i.TransportEndpointPortSrc
                },
                {
                    headerTitle: "目标",
                    key: "destination",
                    width: 150,
                    colRender: (i) => i.NetworkEndpointIPDst + ":" + i.TransportEndpointPortDst
                },
                {headerTitle: "协议", key: "protocol", width: 80, colRender: (i) => i.Protocol},
                {headerTitle: "长度", key: "Id", width: 80, colRender: (i) => (i.Raw || []).length}
            ]}
            rowClick={(data) => {
                onSelectFun(data)
            }}
            loadMore={(data: TrafficPacket | undefined) => {
                return new Promise((resolve, reject) => {
                    if (!data) {
                        // info("加载初始化数据")
                        ipcRenderer
                            .invoke("QueryTrafficPacket", {
                                TimestampNow: props.fromTimestamp,
                                Pagination: {Limit: 10, Page: 1, OrderBy: "id", Order: "asc"}, // genDefaultPagination(),
                                FromId: 0
                            })
                            .then((rsp: {Data: TrafficPacket[]}) => {
                                resolve({
                                    data: rsp.Data
                                })
                                return
                            })
                        return
                    } else {
                        ipcRenderer
                            .invoke("QueryTrafficPacket", {
                                TimestampNow: props.fromTimestamp,
                                Pagination: {Limit: 10, Page: 1, OrderBy: "id", Order: "asc"},
                                FromId: data.Id
                            })
                            .then((rsp: {Data: TrafficPacket[]; Total: number; Pagination: Paging}) => {
                                resolve({
                                    data: rsp.Data
                                })
                                return
                            })
                        return
                    }
                })
            }}
            rowKey={"Id"}
        />
    )
}
