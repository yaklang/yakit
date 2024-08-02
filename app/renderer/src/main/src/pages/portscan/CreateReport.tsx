import React, {useEffect, useRef, useState} from "react"
import {Progress} from "antd"
import {useMemoizedFn} from "ahooks"
import {failed} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {ExecResult} from "../invoker/schema"
import {YakitRoute} from "@/enums/yakitRoute"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {
    CreatReportRequest,
    apiCancelSimpleDetectCreatReport,
    apiSimpleDetectCreatReport
} from "../securityTool/newPortScan/utils"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import emiter from "@/utils/eventBus/eventBus"

const {ipcRenderer} = window.require("electron")

export const onCreateReportModal = (createReportContent: CreateReportContentProps) => {
    const m = showYakitModal({
        title: "下载报告",
        footer: null,
        content: <CreateReportContent onCancel={() => m.destroy()} {...createReportContent} />,
        onCancel: () => {
            m.destroy()
        },
        bodyStyle: {padding: 24}
    })
}
export interface CreateReportContentProps {
    reportName: string
    runtimeId: string
    onCancel?: () => void
}
const CreateReportContent: React.FC<CreateReportContentProps> = React.memo((props) => {
    const {onCancel, runtimeId} = props
    const [reportName, setReportName] = useState<string>(props.reportName || "默认报告名称")
    // 是否展示报告生成进度
    const [showReportPercent, setShowReportPercent] = useState<boolean>(false)
    // 报告生成进度
    const [reportPercent, setReportPercent] = useState<number>(0)
    const [reportLoading, setReportLoading] = useState<boolean>(false)

    const tokenRef = useRef<string>(randomString(40))
    const reportIdRef = useRef<number>()

    /** 下载报告 */
    const downloadReport = () => {
        const reqParams: CreatReportRequest = {
            ReportName: reportName,
            RuntimeId: runtimeId
        }
        apiSimpleDetectCreatReport(reqParams, tokenRef.current)
    }
    /** 获取生成报告返回结果 */
    useEffect(() => {
        ipcRenderer.on(`${tokenRef.current}-data`, (e, data: ExecResult) => {
            if (data.IsMessage) {
                const obj = JSON.parse(Buffer.from(data.Message).toString())
                if (obj?.type === "progress") {
                    const percent = obj.content.progress
                    setReportPercent(Math.trunc(percent * 100))
                }
                if (obj?.type === "log") {
                    if (obj.content?.level === "report") {
                        reportIdRef.current = parseInt(obj.content.data)
                    }
                }
            }
        })
        ipcRenderer.on(`${tokenRef.current}-error`, (e: any, error: any) => {
            setReportLoading(false)
            failed(`[Mod] SimpleDetectCreatReport error: ${error}`)
        })
        ipcRenderer.on(`${tokenRef.current}-end`, (e: any, error: any) => {
            onOpenReport()
        })

        return () => {
            ipcRenderer.removeAllListeners(`${tokenRef.current}-data`)
            ipcRenderer.removeAllListeners(`${tokenRef.current}-error`)
            ipcRenderer.removeAllListeners(`${tokenRef.current}-end`)
        }
    }, [])
    const onOpenReport = useMemoizedFn(() => {
        if (!reportIdRef.current) return
        setReportLoading(false)
        setShowReportPercent(false)
        setReportPercent(0)
        emiter.emit("menuOpenPage", JSON.stringify({route: YakitRoute.DB_Report}))
        setTimeout(() => {
            ipcRenderer.invoke("simple-open-report", reportIdRef.current)
        }, 300)
        if (onCancel) onCancel()
    })
    return (
        <div>
            <div style={{textAlign: "center"}}>
                <YakitInput
                    placeholder='请输入任务名称'
                    allowClear
                    value={reportName}
                    onChange={(e) => {
                        setReportName(e.target.value)
                    }}
                />
                {showReportPercent && (
                    <Progress
                        strokeColor='#F28B44'
                        trailColor='#F0F2F5'
                        percent={Math.trunc(reportPercent * 100)}
                        format={(percent) => `${percent}%`}
                        style={{marginTop: 12}}
                    />
                )}
            </div>
            <div style={{marginTop: 20, textAlign: "right"}}>
                <YakitButton
                    style={{marginRight: 8}}
                    onClick={() => {
                        apiCancelSimpleDetectCreatReport(tokenRef.current)
                        if (onCancel) onCancel()
                    }}
                    type='outline2'
                >
                    取消
                </YakitButton>
                <YakitButton
                    loading={reportLoading}
                    type={"primary"}
                    onClick={() => {
                        setReportLoading(true)
                        downloadReport()
                        setShowReportPercent(true)
                    }}
                >
                    确定
                </YakitButton>
            </div>
        </div>
    )
})
