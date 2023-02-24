import React, {useEffect, useState} from "react";
import {Space, Table, Tag} from "antd";
import {useMemoizedFn} from "ahooks";
import {genDefaultPagination, QueryGeneralResponse} from "@/pages/invoker/schema";
import {AutoCard} from "@/components/AutoCard";

import styles from "./WebsocketFrameHistory.module.scss"

export interface WebsocketFrameHistoryProp {
    websocketHash: string
}

export interface WebsocketFlow {
    FrameIndex: number
    MessageType: string
    Data: Uint8Array
    DataSizeVerbose: string
    DataLength: number
    DataVerbose: string
    FromServer: boolean
    IsJson: boolean
    IsProtobuf: boolean
}

export interface WebsocketFlowParams {
    WebsocketRequestHash: string
}

const {ipcRenderer} = window.require("electron");
export const WebsocketFrameHistory: React.FC<WebsocketFrameHistoryProp> = (props) => {
    const [loading, setLoading] = useState(false)
    const [params, setParams] = useState<WebsocketFlowParams>({WebsocketRequestHash: props.websocketHash});
    const [response, setResponse] = useState<QueryGeneralResponse<WebsocketFlow>>({
        Pagination: genDefaultPagination(30, 1), Data: [], Total: 0
    })
    const {Data, Total, Pagination} = response;
    const data = Data;
    const total = Total;
    const pagination = Pagination;

    useEffect(() => {
        if (params.WebsocketRequestHash === props.websocketHash) {
            return
        }
        setParams({WebsocketRequestHash: props.websocketHash})
    }, [props.websocketHash])

    const update = useMemoizedFn((page?: number, limit?: number, order?: string, orderBy?: string, extraParam?: any) => {
        if (params.WebsocketRequestHash === "") {
            return
        }
        const paginationProps = {
            Page: page || 1,
            Limit: limit || pagination.Limit,
        };
        setLoading(true)
        ipcRenderer.invoke("QueryWebsocketFlowByHTTPFlowWebsocketHash", {
            ...params, ...extraParam ? extraParam : {}, Pagination: paginationProps,
        }).then((r: QueryGeneralResponse<WebsocketFlow>) => {
            setResponse(r)
        }).finally(() => setTimeout(() => setLoading(false), 300))
    })

    useEffect(() => {
        update()
    }, [])

    return <AutoCard
        title={"Websocket 数据帧"} size={"small"} bodyStyle={{overflowY: "auto", padding: 0}}
    >
        <Table
            className={styles['websocket-table-wrapper']}
            loading={loading}
            size={"small"}
            bordered={false}
            dataSource={data}
            rowKey={i => i.FrameIndex}
            scroll={{x: "auto"}}
            pagination={{
                pageSize: 30,
                showSizeChanger: true,
                total,
                pageSizeOptions: ["20", "30", "50"],
                onChange: (page: number, limit?: number) => {
                    // dispatch({type: "updateParams", payload: {page, limit}})
                    update(page, limit)
                },
                onShowSizeChange: (old, limit) => {
                    // dispatch({type: "updateParams", payload: {page: 1, limit}})
                    update(1, limit)
                }
            }}
            columns={[
                {title: "顺序", width: 50, render: (i: WebsocketFlow) => i.FrameIndex},
                {
                    title: "数据方向", width: 100, render: (i: WebsocketFlow) => {
                        return i.FromServer ? <Tag color={"green"}>服务端响应</Tag> : <Tag color={"orange"}>客户端请求</Tag>
                    }
                },
                {
                    title: "Type", width: 80, render: (i: WebsocketFlow) => {
                        return <>
                            {i.IsJson && <Tag>Json</Tag>}
                            {i.IsProtobuf && <Tag>Protobuf</Tag>}
                        </>
                    }
                },
                {
                    title: "预览", render: (i: WebsocketFlow) => {
                        return <>
                            {i.DataVerbose}
                        </>
                    }
                },
            ]}
        >

        </Table>
    </AutoCard>
};