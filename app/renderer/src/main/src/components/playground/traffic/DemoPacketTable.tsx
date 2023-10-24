import React, {useEffect, useState} from "react";
import {TrafficPacket, TrafficSession} from "@/models/Traffic";
import {DemoVirtualTable} from "@/demoComponents/virtualTable/VirtualTable";
import {info} from "@/utils/notification";
import {Paging} from "@/utils/yakQueryHTTPFlow";
import {TrafficViewerControlIf} from "@/components/playground/traffic/base";

export interface DemoPacketTableProp extends TrafficViewerControlIf {

}

const {ipcRenderer} = window.require("electron");

export const DemoPacketTable: React.FC<DemoPacketTableProp> = (props) => {
    const [selected, setSelected] = useState<TrafficPacket>();

    useEffect(() => {
        if (!selected) {
            return
        }

        if (props.onClick !== undefined) {
            props.onClick(selected)
        }
    }, [selected])

    return <DemoVirtualTable<TrafficPacket>
        isStop={!props.realtime}
        isScrollUpdate={!props.realtime}
        columns={[
            {
                headerTitle: "Id",
                key: "Id",
                width: 90,
                colRender: (item) => (item.Id),
            },
            {headerTitle: "链路层", key: "LinkLayerType", width: 60, colRender: (item) => item.LinkLayerType},
            {
                headerTitle: "网络层",
                key: "NetworkLayerType",
                width: 50,
                colRender: (item) => item.NetworkLayerType
            },
            {
                headerTitle: "传输层",
                key: "TransportLayerType",
                width: 50,
                colRender: (item) => item.TransportLayerType
            },
            {
                headerTitle: "源IP",
                key: "NetworkEndpointIPSrc",
                width: 120,
                colRender: (item) => item.NetworkEndpointIPSrc
            },
            {
                headerTitle: "源端口",
                key: "TransportEndpointPortSrc",
                width: 60,
                colRender: (item) => item.TransportEndpointPortSrc
            },
            {
                headerTitle: "目的IP",
                key: "NetworkEndpointIPDst",
                width: 120,
                colRender: (item) => item.NetworkEndpointIPDst
            },
            {
                headerTitle: "目的端口",
                key: "TransportEndpointPortDst",
                width: 60,
                colRender: (item) => item.TransportEndpointPortDst
            },
        ]}
        rowClick={data => {
            setSelected(data)
        }}
        loadMore={(data: TrafficPacket | undefined) => {
            return new Promise((resolve, reject) => {
                if (!data) {
                    // info("加载初始化数据")
                    ipcRenderer.invoke("QueryTrafficPacket", {
                        TimestampNow: props.fromTimestamp,
                        Pagination: {Limit: 10, Page: 1, OrderBy: 'id', Order: "asc"}, // genDefaultPagination(),
                        FromId: 0,
                    }).then((rsp: {
                        Data: TrafficPacket[],
                    }) => {
                        resolve({
                            data: rsp.Data,
                        })
                        return
                    })
                    return
                } else {
                    ipcRenderer.invoke("QueryTrafficPacket", {
                        TimestampNow: props.fromTimestamp,
                        Pagination: {Limit: 10, Page: 1, OrderBy: 'id', Order: "asc"},
                        FromId: data.Id,
                    }).then((rsp: {
                        Data: TrafficPacket[],
                        Total: number,
                        Pagination: Paging,
                    }) => {
                        resolve({
                            data: rsp.Data,
                        })
                        return
                    })
                    return
                }
            })
        }}
        rowKey={"Id"}
    />
};