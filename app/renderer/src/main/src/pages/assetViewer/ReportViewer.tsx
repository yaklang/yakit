import React, {useEffect, useState, useRef} from "react"
import {Report} from "./models"
import {failed, success} from "../../utils/notification"
import {AutoCard} from "../../components/AutoCard"
import {Button, Empty, Space, Tag, Spin} from "antd"
import {showModal} from "../../utils/showModal"
import {YakEditor} from "../../utils/editors"
import {ReportItem} from "./reportRenders/schema"
import {ReportItemRender} from "./reportRenders/render"
import html2pdf from "html2pdf.js"
import styles from "./ReportViewer.module.scss"
import {isEnterpriseEdition} from "@/utils/envfile"
import {openABSFileLocated} from "../../utils/openWebsite"
import {useThrottleFn, useGetState} from "ahooks"
export interface ReportViewerProp {
    id?: number
}

const {ipcRenderer} = window.require("electron")

export const ReportViewer: React.FC<ReportViewerProp> = (props) => {
    const [loading, setLoading] = useState(false)
    const [SpinLoading, setSpinLoading] = useState(false)
    const [report, setReport] = useState<Report>({
        From: "",
        Hash: "",
        Id: 0,
        JsonRaw: "-",
        Owner: "-",
        PublishedAt: 0,
        Title: "-"
    })
    const [reportItems, setReportItems, getReportItems] = useGetState<ReportItem[]>([])
    const [renderReportItems, setRenderReportItems, getRenderReportItems] = useGetState<ReportItem[]>([])
    const divRef = useRef<any>(null)

    useEffect(() => {
        if ((props?.id || 0) <= 0) {
            setReport({
                ...report,
                Id: 0
            })
            return
        }

        setLoading(true)
        ipcRenderer
            .invoke("QueryReport", {Id: props.id})
            .then((r: Report) => {
                if (r) setReport(r)
            })
            .catch((e) => {
                failed(`Query Report[${props.id}] failed`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    }, [props.id])

    useEffect(() => {
        try {
            const items = report.JsonRaw && report.JsonRaw !== "-" && (JSON.parse(report.JsonRaw) as ReportItem[])
            if (!!items && items.length > 0) {
                setReportItems(items)
                setRenderReportItems(items.slice(0, 15))
            }
        } catch (e) {
            failed(`Parse Report[${props.id}]'s items failed`)
        }
    }, [report])

    const loadReport = useThrottleFn(
        () => {
            let listLength = getReportItems().length
            let renderLength = getRenderReportItems().length
            if (listLength > renderLength) {
                setRenderReportItems(getReportItems().slice(0, renderLength + 15))
            }
        },
        {wait: 500}
    )

    if (report.Id <= 0) {
        return (
            <AutoCard loading={loading}>
                <Empty>{"选择报告以在此查看内容"}</Empty>
            </AutoCard>
        )
    }
    const opt = {
        margin: [10, 5, 10, 5],
        filename: `${report.Title}.pdf`,
        image: {type: "jpeg", quality: 0.95},
        jsPDF: {
            format: "a4"
        },
        html2canvas: {
            scale: 2
        },
        pagebreak: {
            // 自动分页控制属性
            // mode: 'avoid-all',
            after: "#cover"
        }
    }

    // 下载PDF
    const downloadPdf = () => {
        setSpinLoading(true)
        setTimeout(() => {
            if (!divRef || !divRef.current) return
            setRenderReportItems(reportItems)
            const div = divRef.current
            html2pdf()
                .from(div)
                .set(opt)
                .save()
                .then(() => {
                    setSpinLoading(false)
                }) // 导出
        }, 50)
    }

    // 下载HTML
    const downloadHtml = () => {
        ipcRenderer
            .invoke("openDialog", {
                title: "请选择文件夹",
                properties: ["openDirectory"]
            })
            .then((data: any) => {
                if (data.filePaths.length) {
                    setSpinLoading(true)
                    let absolutePath = data.filePaths[0].replace(/\\/g, "\\")
                    ipcRenderer
                        .invoke("DownloadHtmlReport", {
                            JsonRaw: report.JsonRaw,
                            outputDir: absolutePath,
                            reportName: report.Title
                        })
                        .then((r) => {
                            console.log(r)
                            if (r?.ok) {
                                success("报告导出成功")
                                r?.outputDir && openABSFileLocated(r.outputDir)
                            }
                        })
                        .catch((e) => {
                            failed(`Download Html Report failed ${e}`)
                        })
                        .finally(() => setTimeout(() => setSpinLoading(false), 300))
                }
            })
    }

    return (
        <div className={styles["report-viewer"]}>
            <Spin spinning={SpinLoading}>
                <AutoCard
                    size={"small"}
                    bordered={false}
                    loading={loading}
                    title={
                        <Space>
                            {report.Title} <Tag>{props.id}</Tag>
                        </Space>
                    }
                    bodyStyle={{paddingLeft: 20, overflow: "hidden"}}
                    extra={
                        <Space>
                            <a
                                href={"#"}
                                onClick={() => {
                                    showModal({
                                        title: "RAW DATA",
                                        content: (
                                            <div style={{height: 300}}>
                                                <YakEditor value={report.JsonRaw} />
                                            </div>
                                        ),
                                        width: "50%"
                                    })
                                }}
                            >
                                RAW
                            </a>
                            <a
                                href={"#"}
                                onClick={() => {
                                    isEnterpriseEdition() ? downloadHtml() : downloadPdf()
                                }}
                            >
                                下载
                            </a>
                        </Space>
                    }
                >
                    <div
                        ref={divRef}
                        style={{overflow: "auto", height: "100%"}}
                        onScroll={() => {
                            const {scrollTop, clientHeight, scrollHeight} = divRef.current
                            const isAtBottom = scrollTop + clientHeight > scrollHeight - 20
                            // 监听是否滚动到接近底部
                            if (isAtBottom) {
                                loadReport.run()
                            }
                        }}
                    >
                        <Space direction={"vertical"} style={{width: "100%"}}>
                            {renderReportItems.map((i, index) => {
                                return <ReportItemRender item={i} key={index} />
                            })}
                        </Space>
                    </div>
                </AutoCard>
            </Spin>
        </div>
    )
}
