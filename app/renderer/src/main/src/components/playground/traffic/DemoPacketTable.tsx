import React, {useEffect, useState} from "react"
import {TrafficPacket, TrafficSession} from "@/models/Traffic"
import {DemoVirtualTable} from "@/demoComponents/virtualTable/VirtualTable"
import {info} from "@/utils/notification"
import {Paging} from "@/utils/yakQueryHTTPFlow"
import {TrafficViewerControlIf} from "@/components/playground/traffic/base"
import Item from "antd/lib/list/Item"
import {useMemoizedFn} from "ahooks"
import styles from "./DemoPacketTable.module.scss"
export interface DemoPacketTableProp extends TrafficViewerControlIf {}

const {ipcRenderer} = window.require("electron")

export const DemoPacketTable: React.FC<DemoPacketTableProp> = (props) => {
    const onSelectFun = useMemoizedFn((data: TrafficPacket) => {
        if (!data) {
            return
        }
        props.onClick && props.onClick(data)
    })

    return (
        <div className={styles["demo-packet-table-box"]}>
            <DemoVirtualTable<TrafficPacket>
                isStop={!props.realtime}
                isScrollUpdate={!props.realtime}
                columns={[
                    {
                        headerTitle: "ID",
                        key: "Id",
                        width: 90,
                        colRender: (item) => item.Id
                    },
                    {
                        headerTitle: "来源",
                        key: "source",
                        width: 160,
                        colRender: (i) => i.NetworkEndpointIPSrc + ":" + i.TransportEndpointPortSrc
                    },
                    {
                        headerTitle: "目标",
                        key: "destination",
                        width: 160,
                        colRender: (i) => i.NetworkEndpointIPDst + ":" + i.TransportEndpointPortDst
                    },
                    {headerTitle: "协议", key: "Protocol", width: 160, colRender: (i) => i.Protocol},
                    {headerTitle: "长度", key: "Length", width: 80, colRender: (i) => (i.Raw || []).length},
                    {headerTitle: "信息", key: "Info", width: 160, colRender: (i) => i.Info}
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
        </div>
    )
}
