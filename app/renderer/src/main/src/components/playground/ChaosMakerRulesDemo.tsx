import React, {useEffect, useState} from "react";
import HexEditor from "react-hex-editor";
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox";
import {DemoVirtualTable} from "@/demoComponents/virtualTable/VirtualTable";
import {info} from "@/utils/notification";
import {Paging} from "@/utils/yakQueryHTTPFlow";
import {YakEditor} from "@/utils/editors";
import {ChaosMakerRule} from "@/models/ChaosMaker";
import {StringToUint8Array} from "@/utils/str";

export interface ChaosMakerRulesDemoProp {

}

const {ipcRenderer} = window.require("electron");

export const ChaosMakerRulesDemo: React.FC<ChaosMakerRulesDemoProp> = (props) => {
    const [selected, setSelected] = useState<ChaosMakerRule>();

    const ref = React.useRef<any>(null);
    const data = React.useMemo(() => StringToUint8Array(JSON.stringify(selected || "").repeat(10)), [selected]);
    // If `data` is large, you probably want it to be mutable rather than cloning it over and over.
    // `nonce` can be used to update the editor when `data` is reference that does not change.
    const [nonce, setNonce] = useState(0);
    // The callback facilitates updates to the source data.
    const handleSetValue = React.useCallback((offset, value) => {
        data[offset] = value;
        setNonce(v => (v + 1));
    }, [data]);

    useEffect(()=>{
        if (!ref) {
            return
        }
        if (!ref.current) {
            return
        }
        ref.current.setSelectionRange(0, 99)
        console.info(ref)
    }, [ref])

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
            <HexEditor
                ref={ref}
                columns={16} data={data}
                nonce={nonce} setValue={handleSetValue}
                overscanCount={0x03}
                showAscii={true}
                showColumnLabels={true}
                showRowLabels={true}
                highlightColumn={true}
            />
        </div>}
    />
};