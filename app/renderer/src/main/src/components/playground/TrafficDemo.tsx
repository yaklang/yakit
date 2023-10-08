import React, {useEffect} from "react";
import Table from "rc-table";
import {TrafficSession} from "@/models/Traffic";
import {useMemoizedFn} from "ahooks";
import {QueryGeneralResponse} from "@/pages/invoker/schema";
import styles from "./TrafficSessionTable.module.css"

export interface TrafficDemoProp {

}

const {ipcRenderer} = window.require("electron");

export const TrafficDemo: React.FC<TrafficDemoProp> = React.memo((props) => {
    const [data, setData] = React.useState<TrafficSession[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [pagination, setPagination] = React.useState({Page: 1, Limit: 1000});
    const [total, setTotal] = React.useState(0);
    const [params, setParams] = React.useState({});

    const update = useMemoizedFn((page?: number, limit?: number, order?: string, orderBy?: string, extraParam?: any) => {
        const paginationProps = {
            Page: page || 1,
            Limit: limit || pagination.Limit,
        };
        setLoading(true)
        ipcRenderer.invoke("QueryTrafficSession", {
            ...params, ...extraParam ? extraParam : {}, Pagination: paginationProps,
        }).then((r: QueryGeneralResponse<any>) => {
            setData(r.Data);
            setPagination(r.Pagination)
            setTotal(r.Total)
        }).finally(() => setTimeout(() => setLoading(false), 300))
    })

    useEffect(() => {
        update(1)
    }, [])

    return <Table
        className={styles.styledTrafficSessionTable}
        columns={[
            {title: "Id", dataIndex: "Id"},
            {title: "SessionType", dataIndex: "SessionType"},
            {title: "Uuid", dataIndex: "Uuid"},
            {title: "DeviceName", dataIndex: "DeviceName"},
            {title: "LinkLayerSrc", dataIndex: "LinkLayerSrc"},
            {title: "LinkLayerDst", dataIndex: "LinkLayerDst"},
            {title: "NetworkSrcIP", dataIndex: "NetworkSrcIP"},
            {title: "NetworkDstIP", dataIndex: "NetworkDstIP"},
            {title: "TransportLayerSrcPort", dataIndex: "TransportLayerSrcPort"},
            {title: "TransportLayerDstPort", dataIndex: "TransportLayerDstPort"},
            {title: "IsTCPReassembled", dataIndex: "IsTCPReassembled"},
            {title: "IsHalfOpen", dataIndex: "IsHalfOpen"},
            {title: "IsClosed", dataIndex: "IsClosed"},
            {title: "IsForceClosed", dataIndex: "IsForceClosed"},
            {title: "HaveClientHello", dataIndex: "HaveClientHello"},
            {title: "SNI", dataIndex: "SNI"},
        ]}
        data={data}
    />;
});