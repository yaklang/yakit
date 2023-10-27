import React, {useState} from "react";
import {DemoVirtualTable} from "@/demoComponents/virtualTable/VirtualTable";
import {genDefaultPagination} from "@/pages/invoker/schema";
import {TrafficPacket} from "@/models/Traffic";
import {Paging} from "@/utils/yakQueryHTTPFlow";
import {Risk} from "@/pages/risks/schema";
import {info} from "@/utils/notification";
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox";
import {YakEditor} from "@/utils/editors";

export interface RiskTableDemoProp {

}

const {ipcRenderer} = window.require("electron");

export const RiskTableDemo: React.FC<RiskTableDemoProp> = (props) => {
    const [selected, setSelected] = useState<Risk>();

    return <YakitResizeBox
        isVer={true}
        firstNode={<div style={{height: "100%", overflowY: "hidden"}}>
            <DemoVirtualTable<Risk>
                columns={[
                    {headerTitle: "ID", key: "Id", width: 80, colRender: i => i.Id},
                    {headerTitle: "漏洞名称", key: "Title", width: 300, colRender: i => i.TitleVerbose || i.Title},
                ]}
                rowClick={data => {
                    setSelected(data)
                }}
                loadMore={(data: Risk | undefined) => {
                    return new Promise((resolve, reject) => {
                        if (!data) {
                            // info("加载初始化数据")
                            ipcRenderer.invoke("QueryRisks", {
                                Pagination: {Limit: 10, Page: 1, OrderBy: 'id', Order: "asc"}, // genDefaultPagination(),
                                FromId: 0,
                            }).then((rsp: {
                                Data: Risk[],
                            }) => {
                                resolve({
                                    data: rsp.Data,
                                })
                                return
                            })
                            return
                        } else {
                            ipcRenderer.invoke("QueryRisks", {
                                Pagination: {Limit: 10, Page: 1, OrderBy: 'id', Order: "asc"},
                                FromId: data.Id,
                            }).then((rsp: {
                                Data: Risk[],
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
                isScrollUpdate={true}
            />
        </div>}
        secondNode={<div style={{height: "100%", overflowY: "hidden"}}>
            <YakEditor type={"html"}
                       value={JSON.stringify(selected, null, 4)}
                       readOnly={true}
            />
        </div>}
    />
};