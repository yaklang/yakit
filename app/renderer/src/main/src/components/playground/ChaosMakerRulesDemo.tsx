import React, {useState} from "react";
import {Risk} from "@/pages/risks/schema";
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox";
import {DemoVirtualTable} from "@/demoComponents/virtualTable/VirtualTable";
import {info} from "@/utils/notification";
import {Paging} from "@/utils/yakQueryHTTPFlow";
import {YakEditor} from "@/utils/editors";
import {ChaosMakerRule} from "@/models/ChaosMaker";

export interface ChaosMakerRulesDemoProp {

}

const {ipcRenderer} = window.require("electron");

export const ChaosMakerRulesDemo: React.FC<ChaosMakerRulesDemoProp> = (props) => {
    const [selected, setSelected] = useState<ChaosMakerRule>();

    return <YakitResizeBox
        isVer={true}
        firstNode={<div style={{height: "100%", overflowY: "hidden"}}>
            <DemoVirtualTable<ChaosMakerRule>
                columns={[
                    {headerTitle: "ID", key: "Id", width: 80, colRender: i => i.Id},
                    {headerTitle: "规则", key: "Name", width: 300, colRender: i => i.NameZh || i.Name},
                    {headerTitle: "类型", key: "RuleType", width: 100, colRender: i => i.RuleType},
                    {headerTitle: "CVE", key: "CVE", width: 110, colRender: i => i.CVE},
                    {headerTitle: "协议", key: "Protocol", width: 50, colRender: i => i.Protocol},
                ]}
                rowClick={data => {
                    setSelected(data)
                }}
                loadMore={(data: ChaosMakerRule | undefined) => {
                    return new Promise((resolve, reject) => {
                        if (!data) {
                            // info("加载初始化数据")
                            ipcRenderer.invoke("QueryChaosMakerRules", {
                                Pagination: {Limit: 10, Page: 1, OrderBy: 'id', Order: "asc"}, // genDefaultPagination(),
                                FromId: 0,
                            }).then((rsp: {
                                Data: ChaosMakerRule[],
                            }) => {
                                resolve({
                                    data: rsp.Data,
                                })
                                return
                            })
                            return
                        } else {
                            ipcRenderer.invoke("QueryChaosMakerRules", {
                                Pagination: {Limit: 10, Page: 1, OrderBy: 'id', Order: "asc"},
                                FromId: data.Id,
                            }).then((rsp: {
                                Data: ChaosMakerRule[],
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