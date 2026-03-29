import React, {useEffect} from "react";
import Table from "rc-table";
import {TrafficSession} from "@/models/Traffic";
import {useMemoizedFn} from "ahooks";
import {QueryGeneralResponse} from "@/pages/invoker/schema";
import styles from "./TrafficSessionTable.module.css"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

export interface TrafficDemoProp {

}

const {ipcRenderer} = window.require("electron");

export const TrafficDemo: React.FC<TrafficDemoProp> = React.memo((props) => {
    const {t} = useI18nNamespaces(["playground"])
    const [data, setData] = React.useState<TrafficSession[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [pagination, setPagination] = React.useState({Page: 1, Limit: 50});
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
            {title: t("TrafficDemo.id"), dataIndex: "Id"},
            {title: t("TrafficDemo.sessionType"), dataIndex: "SessionType"},
            {title: t("TrafficDemo.uuid"), dataIndex: "Uuid"},
            {title: t("TrafficDemo.deviceName"), dataIndex: "DeviceName"},
            {title: t("TrafficDemo.linkLayerSrc"), dataIndex: "LinkLayerSrc"},
            {title: t("TrafficDemo.linkLayerDst"), dataIndex: "LinkLayerDst"},
            {title: t("TrafficDemo.networkSrcIP"), dataIndex: "NetworkSrcIP"},
            {title: t("TrafficDemo.networkDstIP"), dataIndex: "NetworkDstIP"},
            {title: t("TrafficDemo.transportLayerSrcPort"), dataIndex: "TransportLayerSrcPort"},
            {title: t("TrafficDemo.transportLayerDstPort"), dataIndex: "TransportLayerDstPort"},
            {title: t("TrafficDemo.isTCPReassembled"), dataIndex: "IsTCPReassembled"},
            {title: t("TrafficDemo.isHalfOpen"), dataIndex: "IsHalfOpen"},
            {title: t("TrafficDemo.isClosed"), dataIndex: "IsClosed"},
            {title: t("TrafficDemo.isForceClosed"), dataIndex: "IsForceClosed"},
            {title: t("TrafficDemo.haveClientHello"), dataIndex: "HaveClientHello"},
            {title: t("TrafficDemo.sni"), dataIndex: "SNI"},
        ]}
        data={data}
    />;
});
