import React, { useEffect, useState } from "react";
import { AutoCard } from "@/components/AutoCard";
import { Descriptions, Empty, List } from "antd";
import { CVEDetail, CVEDetailEx, CWEDetail } from "@/pages/cve/models";
import { ResizeBox } from "@/components/ResizeBox";
import { CVEDescription } from "@/pages/cve/CVEDescription";
import { YakitEmpty } from "@/components/yakitUI/YakitEmpty/YakitEmpty";
import styles from "./CVETable.module.scss";
import { ArrowsExpandIcon, ArrowsRetractIcon } from "@/assets/newIcon";
import { useCreation } from "ahooks";
export interface CVEInspectProp {
    CVE?: string
}

function emptyCVE() {
    return {} as CVEDetail;
}

const { ipcRenderer } = window.require("electron");

export const CVEInspect: React.FC<CVEInspectProp> = (props) => {
    const selected = props.CVE;

    const [cve, setCVE] = useState<CVEDetail>(emptyCVE);
    const [cwes, setCWE] = useState<CWEDetail[]>([]);

    const [firstFull, setFirstFull] = useState<boolean>(false);
    const [secondFull, setSecondFull] = useState<boolean>(false);

    useEffect(() => {
        if (!selected) {
            return
        }
        ipcRenderer.invoke("GetCVE", { CVE: selected }).then((i: CVEDetailEx) => {
            console.log('GetCVE', i)
            const { CVE, CWE } = i;
            setCVE(CVE);
            setCWE(CWE);
        })
    }, [props.CVE])
    const ResizeBoxProps = useCreation(() => {
        let p = {
            firstRatio: "50%",
            secondRatio: "50%"
        }
        if (secondFull) {
            p.firstRatio = "0%"
        }
        if (firstFull) {
            p.secondRatio = "0%"
            p.firstRatio = "100%"
        }
        return p
    }, [firstFull, secondFull])
    return !!selected ? <div className={styles['cve-inspect']}>
        <ResizeBox
            firstMinSize={"400px"}
            firstNode={<div className={styles['cve-description']}>
                <div className={styles['cve-description-heard']}>
                    <div className={styles['cve-description-heard-title']}>CVE 详情</div>
                    <div className={styles['cve-description-icon']} onClick={() => setFirstFull(!firstFull)}>
                        {firstFull ? <ArrowsRetractIcon /> : <ArrowsExpandIcon />}
                    </div>
                </div>
                <CVEDescription {...cve} />
            </div>}
            lineStyle={{ display: firstFull ? 'none' : '' }}
            secondNodeStyle={{ padding: firstFull ? 0 : undefined }}
            firstNodeStyle={{ padding: secondFull ? 0 : undefined }}
            secondNode={<div style={{ display: firstFull ? 'none' : '' }}>
                <List<CWEDetail>
                    dataSource={cwes}
                    renderItem={(item: CWEDetail) => {
                        return <List.Item>
                            <Descriptions column={2}>
                                <Descriptions.Item label={"CWE编号"} span={1}>
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
            {...ResizeBoxProps}
        />
    </div> : <YakitEmpty style={{ paddingTop: 48 }} title="未选中 CVE 数据" />

};