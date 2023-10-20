import React, {useEffect, useMemo, useRef, useState} from "react";
import {useGetState, useInfiniteScroll, useMemoizedFn} from "ahooks";
import {TrafficPacket} from "@/models/Traffic";
import {Paging} from "@/utils/yakQueryHTTPFlow";
import {info} from "@/utils/notification";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {genDefaultPagination, QueryGeneralResponse} from "@/pages/invoker/schema";
import {DemoVirtualTable} from "@/demoComponents/virtualTable/VirtualTable";
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox";
import {Form} from "antd";
import {DemoItemSelectOne} from "@/demoComponents/itemSelect/ItemSelect";

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
    const timestampNow = useMemo(() => {
        // return 0
        return Math.floor(Date.now() / 1000)
    }, []);
    const [isStop, setIsStop] = useState(false);

    const clear = useMemoizedFn(() => {
        setClearTrigger(!clearTrigger)
    })

    useEffect(() => {
        setIsStop(false)
        return () => {
            setIsStop(true)
        }
    }, [])

    return <YakitResizeBox
        isVer={true}
        firstNode={<div style={{height: "100%", overflowY: "hidden"}}>
            <DemoVirtualTable<TrafficPacket>
                rowKey={"Id"}
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
                isTopLoadMore={false}
                isStop={isStop}
                wait={200}
                loadMore={data => {
                    return new Promise((resolve, reject) => {
                        if (!data) {
                            // info("加载初始化数据")
                            ipcRenderer.invoke("QueryTrafficPacket", {
                                Pagination: genDefaultPagination(),
                                FromId: 0,
                                TimestampNow: timestampNow,
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
                        } else {
                            // info(`加载更多页 From ${data.Id}`)
                            ipcRenderer.invoke("QueryTrafficPacket", {
                                Pagination: {...genDefaultPagination(), Limit: 50},
                                FromId: data.Id,
                                TimestampNow: timestampNow,
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
            />
        </div>}
        secondNode={<div>
            seconds
        </div>}
    />
}