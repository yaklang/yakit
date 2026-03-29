import React, {useEffect, useState} from "react"
import {TrafficSession, TrafficTCPReassembled} from "@/models/Traffic"
import {DemoVirtualTable} from "@/demoComponents/virtualTable/VirtualTable"
import {info} from "@/utils/notification"
import {Paging} from "@/utils/yakQueryHTTPFlow"
import {TrafficViewerControlIf} from "@/components/playground/traffic/base"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

export interface DemoTCPReassembledProp extends TrafficViewerControlIf {}

const {ipcRenderer} = window.require("electron")

export const DemoTCPReassembled: React.FC<DemoTCPReassembledProp> = (props) => {
    const {t} = useI18nNamespaces(["playground"])
    const [selected, setSelected] = useState<TrafficTCPReassembled>()

    useEffect(() => {
        if (!selected) {
            return
        }

        if (props.onClick !== undefined) {
            props.onClick(selected)
        }
    }, [selected])

    return (
        <DemoVirtualTable<TrafficTCPReassembled>
            isStop={!props.realtime}
            isScrollUpdate={!props.realtime}
            columns={[
                // {headerTitle: "ID", key: "Id", width: 80, colRender: i => i.Id},
                // {headerTitle: "SeqId", key: "Id", width: 80, colRender: i => i.Seq},
                {headerTitle: t("DemoTCPReassembled.id"), key: "id", width: 80, colRender: (i) => i.Id},
                {headerTitle: t("DemoTCPReassembled.source"), key: "source", width: 160, colRender: (i) => i.Source},
                {headerTitle: t("DemoTCPReassembled.destination"), key: "destination", width: 160, colRender: (i) => i.Destination},
                {headerTitle: t("DemoTCPReassembled.protocol"), key: "protocol", width: 160, colRender: (i) => i.Protocol},
                {headerTitle: t("DemoTCPReassembled.length"), key: "length", width: 80, colRender: (i) => (i.Raw || []).length}
            ]}
            rowClick={(data) => {
                setSelected(data)
            }}
            loadMore={(data: TrafficTCPReassembled | undefined) => {
                return new Promise((resolve, reject) => {
                    if (!data) {
                        // info("加载初始化数据")
                        ipcRenderer
                            .invoke("QueryTrafficTCPReassembled", {
                                TimestampNow: props.fromTimestamp,
                                Pagination: {Limit: 10, Page: 1, OrderBy: "id", Order: "asc"}, // genDefaultPagination(),
                                FromId: 0
                            })
                            .then((rsp: {Data: TrafficTCPReassembled[]}) => {
                                resolve({
                                    data: rsp.Data
                                })
                                return
                            })
                        return
                    } else {
                        ipcRenderer
                            .invoke("QueryTrafficTCPReassembled", {
                                TimestampNow: props.fromTimestamp,
                                Pagination: {Limit: 10, Page: 1, OrderBy: "id", Order: "asc"},
                                FromId: data.Id
                            })
                            .then((rsp: {Data: TrafficTCPReassembled[]; Total: number; Pagination: Paging}) => {
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
