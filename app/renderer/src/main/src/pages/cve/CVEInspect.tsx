import React, {useEffect, useState} from "react";
import {AutoCard} from "@/components/AutoCard";
import {Descriptions, Empty, List} from "antd";
import {CVEDetail, CVEDetailEx, CWEDetail} from "@/pages/cve/models";
import {ResizeBox} from "@/components/ResizeBox";
import {CVEDescription} from "@/pages/cve/CVEDescription";

export interface CVEInspectProp {
    CVE?: string
}

function emptyCVE() {
    return {} as CVEDetail;
}

const {ipcRenderer} = window.require("electron");

export const CVEInspect: React.FC<CVEInspectProp> = (props) => {
    const selected = props.CVE;

    const [cve, setCVE] = useState<CVEDetail>(emptyCVE);
    const [cwes, setCWE] = useState<CWEDetail[]>([]);

    useEffect(() => {
        if (!selected) {
            return
        }
        ipcRenderer.invoke("GetCVE", {CVE: selected}).then((i: CVEDetailEx) => {
            console.info(i)
            const {CVE, CWE} = i;
            setCVE(CVE);
            setCWE(CWE);
        })
    }, [props.CVE])

    return !!selected ? <AutoCard
        size={"small"} bordered={false}
        title={selected} style={{backgroundColor: "#fafafa", paddingRight: 8, overflowY: "auto"}}
    >
        <ResizeBox
            firstMinSize={"700px"}
            firstRatio={"700px"}
            firstNode={<div>
                <CVEDescription {...cve}/>
            </div>}
            secondNode={<div>
                <List<CWEDetail>
                    dataSource={cwes}
                    renderItem={(item: CWEDetail) => {
                        return <List.Item>
                            <Descriptions column={2}>
                                <Descriptions.Item label={"编号"}>
                                    {item.CWE}
                                </Descriptions.Item>
                                <Descriptions.Item label={"CWE 状态"}>
                                    {item.Status}
                                </Descriptions.Item>
                                <Descriptions.Item label={"类型"} span={2}>
                                    {item.NameZh || item.Name}
                                </Descriptions.Item>
                                <Descriptions.Item label={"描述信息"} span={2}>
                                    {item.DescriptionZh || item.Description}
                                </Descriptions.Item>
                                <Descriptions.Item label={"修复方案"} span={2}>
                                    {item.Solution}
                                </Descriptions.Item>
                                <Descriptions.Item label={"其他案例"} span={2}>
                                    {item.RelativeCVE.join(", ")}
                                </Descriptions.Item>
                            </Descriptions>
                        </List.Item>
                    }}
                />
            </div>}
        />
    </AutoCard> : <Empty description={"未选中 CVE 数据"}/>

};