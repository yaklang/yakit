import React, {useEffect, useState,useRef} from "react"
import {Report} from "./models"
import {failed} from "../../utils/notification"
import {AutoCard} from "../../components/AutoCard"
import {Button, Empty, Space, Tag} from "antd"
import {showModal} from "../../utils/showModal"
import {YakEditor} from "../../utils/editors"
import {ReportItem} from "./reportRenders/schema"
import {ReportItemRender} from "./reportRenders/render"
import html2pdf from "html2pdf.js"

export interface ReportViewerProp {
    id?: number
}

const {ipcRenderer} = window.require("electron")

export const ReportViewer: React.FC<ReportViewerProp> = (props) => {
    const [loading, setLoading] = useState(false)
    const [report, setReport] = useState<Report>({
        From: "",
        Hash: "",
        Id: 0,
        JsonRaw: "-",
        Owner: "-",
        PublishedAt: 0,
        Title: "-"
    })
    const [reportItems, setReportItems] = useState<ReportItem[]>([])
    const divRef=useRef<HTMLDivElement>(null)
    useEffect(() => {
        if ((props?.id || 0) <= 0) {
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
            }
        } catch (e) {
            failed(`Parse Report[${props.id}]'s items failed`)
        }
    }, [report])

    if (report.Id <= 0) {
        return (
            <AutoCard loading={loading}>
                <Empty>{"选择报告以在此查看内容"}</Empty>
            </AutoCard>
        )
    }
    const opt={
        margin: [10, 5, 10, 5],
        filename:`${report.Title}.pdf`,
        image:{ type:"jpeg",quality: 0.95 },
        jsPDF: {  
            format: 'a4' 
        },
        html2canvas: {
            scale: 2,
        },
        pagebreak: { 
            // 自动分页控制属性
            // mode: 'avoid-all',
            after: "#cover"
        }
    }
    const downloadPdf = () => {
        if(!divRef||!divRef.current)return
        const div=divRef.current
        html2pdf()
        .from(div)
        .set(opt)
        .save(); // 导出
    }

    return (
        <AutoCard
            size={"small"}
            bordered={false}
            loading={loading}
            title={
                <Space>
                    {report.Title} <Tag>{props.id}</Tag>
                </Space>
            }
            bodyStyle={{overflow: "auto"}}
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
                            downloadPdf()
                        }}
                    >
                        下载
                    </a>
                </Space>
            }
        >
            <div ref={divRef}>
            <Space direction={"vertical"} style={{width: "100%"}}>
                {reportItems.map((i, index) => {
                    return <ReportItemRender item={i} key={index} />
                })}
            </Space></div>
        </AutoCard>
    )
}
