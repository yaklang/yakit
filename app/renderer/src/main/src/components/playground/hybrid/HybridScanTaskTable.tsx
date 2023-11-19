import React from "react";
import {Risk} from "@/pages/risks/schema";
import {Paging} from "@/utils/yakQueryHTTPFlow";
import {DemoVirtualTable} from "@/demoComponents/virtualTable/VirtualTable";
import {HybridScanActiveTask, HybridScanTask} from "@/models/HybridScan";

export interface HybridScanTaskTableProp {

}

const {ipcRenderer} = window.require("electron");

export const HybridScanTaskTable: React.FC<HybridScanTaskTableProp> = (props) => {
    return <DemoVirtualTable<HybridScanTask>
        columns={[
            {headerTitle: "ID", key: "Id", width: 80, colRender: i => i.Id},
            {headerTitle: "任务ID", key: "Title", width: 300, colRender: i => i.TaskId},
            {headerTitle: "当前状态", key: "Status", width: 300, colRender: i => i.Status},
        ]}
        loadMore={(data: HybridScanTask | undefined) => {
            return new Promise((resolve, reject) => {
                if (!data) {
                    // info("加载初始化数据")
                    ipcRenderer.invoke("QueryHybridScanTask", {
                        Pagination: {Limit: 10, Page: 1, OrderBy: 'id', Order: "asc"}, // genDefaultPagination(),
                        FromId: 0,
                    }).then((rsp: {
                        Data: HybridScanTask[],
                    }) => {
                        resolve({
                            data: rsp.Data,
                        })
                        return
                    })
                    return
                } else {
                    ipcRenderer.invoke("QueryHybridScanTask", {
                        Pagination: {Limit: 10, Page: 1, OrderBy: 'id', Order: "asc"},
                        FromId: data.Id,
                    }).then((rsp: {
                        Data: HybridScanTask[],
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
        rowKey={"TaskId"}
        isScrollUpdate={true}
    />
};