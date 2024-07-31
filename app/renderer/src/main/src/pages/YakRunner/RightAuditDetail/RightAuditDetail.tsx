import React, {useEffect, useMemo, useState} from "react"
import classNames from "classnames"
import styles from "./RightAuditDetail.module.scss"
import {useMemoizedFn} from "ahooks"
import {AuditEmiterYakUrlProps} from "../YakRunnerType"
import {StringToUint8Array} from "@/utils/str"
import {loadAuditFromYakURLRaw} from "../utils"
import {OutlineXIcon} from "@/assets/icon/outline"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {Tooltip} from "antd"

interface FlowChartBoxProps {}

export const FlowChartBox: React.FC<FlowChartBoxProps> = (props) => {
    return (
        <div className={styles["flow-chart-box"]}>
            <div className={styles["header"]}>
                <div className={styles["relative-box"]}>
                    <div className={styles["absolute-box"]}>
                        <div className={styles["title"]}>Syntax Flow 审计过程</div>
                        <div className={styles["extra"]}>
                            <YakitButton type='text2' icon={<OutlineXIcon />} onClick={() => {}} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

interface CodeRangeProps {
    url: string
    start_column: number
    start_line: number
    end_column: number
    end_line: number
}

interface GraphInfoProps {
    code_range: CodeRangeProps
    node_id: number
    ir_code: string
}

interface RightSideBarProps {
    auditRightParams: AuditEmiterYakUrlProps | undefined
    isUnShowAuditDetail: boolean
}

export const RightAuditDetail: React.FC<RightSideBarProps> = (props) => {
    const {auditRightParams, isUnShowAuditDetail} = props
    const [graph, setGraph] = useState<string>()
    const [graphInfo, setGraphInfo] = useState<GraphInfoProps[]>()
    const [nodeId, setNodeId] = useState<number>()

    useEffect(() => {
        if (!isUnShowAuditDetail && auditRightParams) {
            initData(auditRightParams)
        }
    }, [isUnShowAuditDetail, auditRightParams])

    const initData = useMemoizedFn(async (params: AuditEmiterYakUrlProps) => {
        const {Schema, Location, Path, Body} = params
        const body = StringToUint8Array(Body)
        const result = await loadAuditFromYakURLRaw({Schema, Location, Path}, body)
        console.log("iniaaa", params, result)
        if (result && result.Resources.length > 0) {
            result.Resources[0].Extra.forEach((item) => {
                if (item.Key === "graph") {
                    setGraph(item.Value)
                }
                if (item.Key === "graph_info") {
                    try {
                        let graph_info = JSON.parse(item.Value)
                        setGraphInfo(graph_info)
                    } catch (error) {}
                }
                if (item.Key === "node_id") {
                    setNodeId(parseInt(item.Value + ""))
                }
            })
        }
    })

    const contentInfo = useMemo(() => {
        if (graphInfo && nodeId) {
            const arr = graphInfo.filter((item) => item.node_id === nodeId)
            if (arr.length > 0) {
                return arr[0]
            }
        }
    }, [graphInfo, nodeId])
    return (
        <div className={classNames(styles["right-audit-detail"])}>
            <div className={styles["header"]}>
                <div className={styles["relative-box"]}>
                    <div className={styles["absolute-box"]}>
                        <div className={styles["title"]}>审计详情</div>
                        <div className={styles["extra"]}>
                            <YakitButton type='text2' icon={<OutlineXIcon />} onClick={() => {}} />
                        </div>
                    </div>
                </div>
            </div>
            <div className={styles["main"]}>
                <YakitResizeBox
                    isVer={true}
                    secondRatio={isUnShowAuditDetail ? "0px" : undefined}
                    lineDirection='bottom'
                    firstRatio={"200px"}
                    firstMinSize={140}
                    firstNodeStyle={{padding: 0}}
                    secondNodeStyle={{padding: 0}}
                    secondMinSize={300}
                    firstNode={
                        <div className={styles["content"]}>
                            {contentInfo && (
                                <Tooltip placement="topLeft" title={contentInfo.code_range.url}>
                                    <div className={classNames(styles["url-box"], "yakit-single-line-ellipsis")}>
                                        {contentInfo.code_range.url}
                                    </div>
                                </Tooltip>
                            )}
                            <div className={styles["message-box"]}>
                                bufio.NewReadWriter(i any, i2 any) (*bufio.ReadWriter, error)
                            </div>
                            {contentInfo && <div className={styles["ir-code-box"]}>{contentInfo?.ir_code}</div>}
                        </div>
                    }
                    secondNode={<FlowChartBox />}
                />
            </div>
        </div>
    )
}
