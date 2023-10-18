import React, {useEffect, useMemo, useRef, useState} from "react";
import {useGetState, useInfiniteScroll} from "ahooks";
import {TrafficPacket} from "@/models/Traffic";
import {Paging} from "@/utils/yakQueryHTTPFlow";
import {info} from "@/utils/notification";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {genDefaultPagination, QueryGeneralResponse} from "@/pages/invoker/schema";
import {DemoVirtualTable} from "@/demoComponents/virtualTable/VirtualTable";
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox";

export interface PacketListProp {

}

const {ipcRenderer} = window.require("electron");

interface PacketScrollData {
    list: TrafficPacket[],
    paging: Paging,
    isNoMore: boolean,
}

export const PacketListDemo: React.FC<PacketListProp> = (props) => {
    return <div style={{height: "100%", overflowY: "hidden"}}>
        <div style={{height: 200, overflowY: "auto"}}>
            <DemoVirtualTable<TrafficPacket>
                rowKey={"Id"}
                columns={[
                    {headerTitle: "Id", key: "Id", width: 100, colRender: (item) => item.Id},
                    {headerTitle: "链路层", key: "LinkLayerType", width: 100, colRender: (item) => item.LinkLayerType},
                    {headerTitle: "网络层", key: "NetworkLayerType", width: 100, colRender: (item) => item.NetworkLayerType},
                    {
                        headerTitle: "传输层",
                        key: "TransportLayerType",
                        width: 100,
                        colRender: (item) => item.TransportLayerType
                    },
                    {
                        headerTitle: "源IP",
                        key: "NetworkEndpointIPSrc",
                        width: 100,
                        colRender: (item) => item.NetworkEndpointIPSrc
                    },
                    {
                        headerTitle: "源端口",
                        key: "TransportEndpointPortSrc",
                        width: 100,
                        colRender: (item) => item.TransportEndpointPortSrc
                    },
                    {
                        headerTitle: "目的IP",
                        key: "NetworkEndpointIPDst",
                        width: 100,
                        colRender: (item) => item.NetworkEndpointIPDst
                    },
                    {
                        headerTitle: "目的端口",
                        key: "TransportEndpointPortDst",
                        width: 100,
                        colRender: (item) => item.TransportEndpointPortDst
                    },
                ]}
                isTopLoadMore={false}
                isStop={true}
                loadMore={data => {
                    return new Promise((resolve, reject) => {
                        if (!data) {
                            info("加载初始化数据")
                            ipcRenderer.invoke("QueryTrafficPacket", {
                                Pagination: genDefaultPagination(),
                                FromId: 0,
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
                            info(`加载更多页 From ${data.Id}`)
                            ipcRenderer.invoke("QueryTrafficPacket", {
                                Pagination: genDefaultPagination(),
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
            />
        </div>
    </div>
    // return <YakitResizeBox
    //     isVer={true}
    //     firstNode={<div style={{background: "#eeeeee", overflowY: "hidden"}}>
    //
    //     </div>}
    //     secondNode={<div>
    //         seconds
    //     </div>}
    // />
}

export const PacketListDemo1: React.FC<PacketListProp> = (props) => {
        const [isAsyncCheckingNoMore, setAsyncCheckNoMore, getAsyncCheckNoMore] = useGetState(false);
        const timestampNow = useMemo(() => {
            return Math.floor(Date.now() / 1000)
        }, []);
        const ref = useRef<HTMLDivElement>(null);
        const [autoScroll, setAutoScroll] = useState(true);
        const [fromId, setFromId, getFromId] = useGetState<number>(0);

        useEffect(() => {
            if (!ref) {
                return
            }
            const div = ref.current as HTMLDivElement;
            const handleScroll = () => {
                // 用户滚动到底部，开启自动滚动
                if (div.scrollTop + div.clientHeight >= div.scrollHeight) {
                    setAutoScroll(true);
                } else {
                    // 用户手动调整高度，取消自动滚动
                    setAutoScroll(false);
                }
            }
            div.addEventListener("scroll", handleScroll);
            return () => {
                div.removeEventListener("scroll", handleScroll)
            }
        }, [])

        useEffect(() => {
            if (autoScroll) {
                const div = ref.current as HTMLDivElement;
                div.scrollTop = div.scrollHeight;
            }
        });

        const {
            data,
            loading,
            loadMore,
            loadingMore,
            noMore,
        } = useInfiniteScroll<PacketScrollData>(
            (d) => {
                return new Promise((resolve, reject) => {
                    ipcRenderer.invoke("QueryTrafficPacket", {
                        TimestampNow: timestampNow - 1,
                        FromId: getFromId(),
                        Pagination: {Limit: 50, Page: 1},
                    }).then((rsp: { Pagination: Paging, Data: TrafficPacket[], Total: number }) => {
                        if (rsp.Data.length <= 0) {
                            resolve({
                                list: [],
                                paging: rsp.Pagination,
                                isNoMore: true,
                            })
                            return
                        }
                        const isNoMore = rsp.Data.length === rsp.Total;
                        setFromId(rsp.Data[rsp.Data.length - 1].Id)
                        resolve({list: rsp.Data, paging: rsp.Pagination, isNoMore})
                        return
                    }).catch(e => {
                        reject(e)
                    })
                })
            },
            {
                target: ref,
                isNoMore: d => {
                    if (d === undefined) {
                        return false
                    }
                    return d.isNoMore && getAsyncCheckNoMore()
                }
            }
        )

        useEffect(() => {
            if (!autoScroll) {
                return
            }

            info("开始执行新数据监控")
            // 无法自动更新新数据了，那么就检查一下更新(1s)
            const timer = setInterval(() => {
                ipcRenderer.invoke("QueryTrafficPacket", {
                    Pagination: {Limit: 50, Page: 1},
                    TimestampNow: timestampNow,
                    FromId: getFromId,
                }).then((rsp: { Data: TrafficPacket[], Total: number }) => {
                    if (rsp.Data.length > 0) {
                        info(`有新数据包到达，需要更新[${rsp.Total}]`)
                        loadMore()
                    }
                }).catch(e => {
                    console.error(e)
                })
            }, 1000)
            return () => {
                clearInterval(timer)
            }
        }, [autoScroll])


        return <div ref={ref} style={{
            height: "300px",
            overflow: "auto",
            border: "1px solid #eee",
            padding: 8,
        }}>
            数据包表
            {(data?.list || []).map(item => {
                return <div key={item.Id} style={{padding: 12, border: '1px solid #f5f5f5'}}>
                    {item.Id}-{item.LinkLayerType}-{item.NetworkLayerType}-{item.TransportLayerType}-{item.ApplicationLayerType}-{item.SessionId}
                </div>
            })}
            <div style={{marginTop: 8}}>
                {!noMore && (
                    <div style={{color: "#eeeeee"}}>loading...</div>
                )}
            </div>
        </div>
    }
;