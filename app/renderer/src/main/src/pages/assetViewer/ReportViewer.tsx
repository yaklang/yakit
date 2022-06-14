import React, {useEffect, useState} from "react"
import {Report} from "./models"
import {failed} from "../../utils/notification"
import {AutoCard} from "../../components/AutoCard"
import {Button, Empty, Space, Tag} from "antd"
import {showModal} from "../../utils/showModal"
import {YakEditor} from "../../utils/editors"
import {ReportItem} from "./reportRenders/schema"
import {ReportItemRender} from "./reportRenders/render"

import htmlDocx from "html-docx-js/dist/html-docx"
import saveAs from "file-saver"

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
            const items = JSON.parse(report.JsonRaw) as ReportItem[]
            if (!!items && items.length > 0) {
                setReportItems(items)
            }
        } catch (e) {
            failed(`Parse Report[${props.id}]'s items failed`)
            console.info(e)
        }
    }, [report])

    if (report.Id <= 0) {
        return (
            <AutoCard loading={loading}>
                <Empty>{"选择报告以在此查看内容"}</Empty>
            </AutoCard>
        )
    }
    const toPdf = () => {
        const targetDom = document.getElementById("toPdf")
        // console.log("targetDom", targetDom?.innerHTML)
        // debugger
        //     var content = ` <h1>This is an about page</h1>
        //   <h2>This is an about page</h2>`
        const content = targetDom?.innerHTML
        var page =
            '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
            '<link href="./antd.css" rel="stylesheet" type="text/css" />' +
            '<link href="./index.less" rel="stylesheet/less" type="text/less" />' +
            "<style> code{ background-color: aliceblue;}</style></head>" +
            "<body>" +
            content +
            "</body></html>"
        console.log("page", page)

        var converted = htmlDocx.asBlob(page)
        // 用 FielSaver.js里的保存方法 进行输出
        saveAs(converted, "test.docx")
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
                    <Button onClick={toPdf}>md-pdf</Button>
                </Space>
            }
        >
            <Space direction={"vertical"} style={{width: "100%"}} id='toPdf'>
                {reportItems.map((i, index) => {
                    return <ReportItemRender item={i} key={index} />
                })}
            </Space>
        </AutoCard>
    )
}
