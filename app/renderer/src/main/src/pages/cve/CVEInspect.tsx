import React, {useEffect, useMemo, useState} from "react"
import {AutoCard} from "@/components/AutoCard"
import {Descriptions, Empty, List, Tabs} from "antd"
import {CVEDetail, CVEDetailEx, CWEDetail} from "@/pages/cve/models"
import {ResizeBox} from "@/components/ResizeBox"
import {CVEDescription, CWEDescription, CWEDescriptionItem} from "@/pages/cve/CVEDescription"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import styles from "./CVETable.module.scss"
import {ArrowsExpandIcon, ArrowsRetractIcon} from "@/assets/newIcon"
import {useCreation, useMemoizedFn} from "ahooks"

export interface CVEInspectProp {
    CVE?: string
    onSelectCve: (s: string) => void
}

function emptyCVE() {
    return {} as CVEDetail
}

const {ipcRenderer} = window.require("electron")

export const CVEInspect: React.FC<CVEInspectProp> = (props) => {
    const {onSelectCve} = props
    const selected = props.CVE

    const [cve, setCVE] = useState<CVEDetail>(emptyCVE)
    const [cwes, setCWE] = useState<CWEDetail[]>([])

    const [firstFull, setFirstFull] = useState<boolean>(false)
    const [secondFull, setSecondFull] = useState<boolean>(false)

    useEffect(() => {
        if (!selected) {
            return
        }
        onGetCve(selected)
    }, [props.CVE])
    useEffect(() => {
        setFirstFull(cwes.length === 0)
    }, [cwes])
    const onGetCve = useMemoizedFn((c: string) => {
        ipcRenderer.invoke("GetCVE", {CVE: c}).then((i: CVEDetailEx) => {
            console.log("GetCVE", i)
            const {CVE, CWE} = i
            setCVE(CVE)
            setCWE(CWE)
        })
    })
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
    }, [firstFull, secondFull, cwes])
    return !!selected ? (
        <div className={styles["cve-inspect"]}>
            <ResizeBox
                firstMinSize={400}
                secondMinSize={300}
                firstNode={
                    <div className={styles["cve-description"]} style={{display: secondFull ? "none" : ""}}>
                        <div className={styles["cve-description-heard"]}>
                            <div className={styles["cve-description-heard-title"]}>CVE 详情</div>
                            <div className={styles["cve-description-icon"]} onClick={() => setFirstFull(!firstFull)}>
                                {firstFull ? <ArrowsRetractIcon /> : <ArrowsExpandIcon />}
                            </div>
                        </div>
                        <CVEDescription {...cve} />
                    </div>
                }
                lineStyle={{display: firstFull ? "none" : ""}}
                secondNodeStyle={{padding: firstFull ? 0 : undefined}}
                firstNodeStyle={{padding: secondFull ? 0 : undefined}}
                secondNode={
                    <div
                        className={styles["cve-description"]}
                        style={{display: firstFull ? "none" : "", overflow: "initial"}}
                    >
                        {cwes.length === 1 ? (
                            <>
                                <div className={styles["cve-description-heard"]}>
                                    <div className={styles["cve-description-heard-title"]}>
                                        {cwes.length > 0 ? cwes[0].CWE : "CWE 编号"}
                                    </div>
                                    <div
                                        className={styles["cve-description-icon"]}
                                        onClick={() => setSecondFull(!secondFull)}
                                    >
                                        {secondFull ? <ArrowsRetractIcon /> : <ArrowsExpandIcon />}
                                    </div>
                                </div>
                                <CWEDescriptionItem
                                    item={cwes[0]}
                                    onSelectCve={(s) => {
                                        onGetCve(s)
                                        onSelectCve(s)
                                    }}
                                />
                                <div className={styles["no-more"]}>暂无更多</div>
                            </>
                        ) : cwes.length === 0 ? (
                            <YakitEmpty style={{paddingTop: 48}} title='暂无CWE数据' />
                        ) : (
                            <CWEDescription
                                data={cwes}
                                onSelectCve={(s) => {
                                    onGetCve(s)
                                    onSelectCve(s)
                                }}
                                tabBarExtraContent={
                                    <div
                                        className={styles["cve-description-icon"]}
                                        onClick={() => setSecondFull(!secondFull)}
                                        style={{paddingRight: 12}}
                                    >
                                        {secondFull ? <ArrowsRetractIcon /> : <ArrowsExpandIcon />}
                                    </div>
                                }
                            />
                        )}
                    </div>
                }
                {...ResizeBoxProps}
            />
        </div>
    ) : (
        <YakitEmpty style={{paddingTop: 48}} title='未选中 CVE 数据' />
    )
}
