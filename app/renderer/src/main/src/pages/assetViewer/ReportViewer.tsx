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
import classNames from "classnames"
import htmlDocx from "html-docx-js/dist/html-docx"
import {saveAs} from "file-saver"
import html2canvas from "html2canvas"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitMenu} from "@/components/yakitUI/YakitMenu/YakitMenu"
export interface ReportViewerProp {
    id?: number
}

const {ipcRenderer} = window.require("electron")

export const ReportViewer: React.FC<ReportViewerProp> = (props) => {
    const [loading, setLoading] = useState(false)
    const [SpinLoading, setSpinLoading] = useState<boolean>(false)
    const [wordSpinLoading, setWordSpinLoading] = useState<boolean>(false)
    const [report, setReport] = useState<Report>({
        From: "",
        Hash: "",
        Id: 0,
        JsonRaw: "-",
        Owner: "-",
        PublishedAt: 0,
        Title: "-"
    })
    const [show, setShow] = useState<boolean>(false)
    const [reportItems, setReportItems] = useState<ReportItem[]>([])
    const divRef = useRef<any>(null)
    const isEchartsToImg = useRef<boolean>(true)

    useEffect(() => {
        if ((props?.id || 0) <= 0) {
            setReport({
                ...report,
                Id: 0
            })
            return
        }
        isEchartsToImg.current = true
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

    // 下载报告
    const exportToWord = async () => {
        const contentHTML = divRef.current

        if (isEchartsToImg.current) {
            isEchartsToImg.current = false
            // 使用html2canvas将ECharts图表转换为图像
            const echartsElements = contentHTML.querySelectorAll('[data-type="echarts-box"]')
            const promises = Array.from(echartsElements).map(async (element) => {
                // @ts-ignore
                const echartType: string = element.getAttribute("echart-type")
                let options = {}
                // 适配各种图表
                if (echartType === "vertical-bar") {
                    options = {scale: 0.8, windowWidth: 1200}
                } else if (echartType === "hollow-pie") {
                    options = {scale: 1, windowWidth: 1000}
                } else if (echartType === "stacked-vertical-bar") {
                    options = {scale: 0.8, windowWidth: 1200}
                } else if (echartType === "multi-pie") {
                    options = {scale: 0.8, windowWidth: 1200}
                } else if (echartType === "nightingle-rose") {
                    options = {scale: 0.8, windowWidth: 1200}
                }

                const canvas = await html2canvas(element as HTMLElement, options)
                return canvas.toDataURL("image/jpeg")
            })

            const echartsImages = await Promise.all(promises)

            // 将图像插入到contentHTML中
            echartsImages.forEach((imageDataUrl, index) => {
                const img = document.createElement("img")
                img.src = imageDataUrl
                img.style.display = "none"
                echartsElements[index].appendChild(img)
            })
        }
        // word报告不要附录 table添加边框
        const wordStr:string = contentHTML.outerHTML.substring(0, contentHTML.outerHTML.indexOf("附录：")).replace(/<table(.*?)>/g, '<table$1 border="1">')
        
        saveAs(
            //保存文件到本地
            htmlDocx.asBlob(wordStr), //将html转为docx
            `${report.Title}.doc`
        )
        setWordSpinLoading(false)
    }

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

    // 下载Word
    const downloadWord = () => {
        if (!divRef || !divRef.current) return

        setWordSpinLoading(true)

        // 此处定时器为了确保已处理其余任务
        setTimeout(() => {
            exportToWord()
        }, 200)
    }

    const dowloadMenu = (
        <YakitMenu
            selectedKeys={[]}
            data={
                isEnterpriseEdition()
                    ? [
                          {
                              key: "html",
                              label: "HTML"
                          },
                          {
                              key: "word",
                              label: "Word"
                          }
                      ]
                    : [
                          {
                              key: "pdf",
                              label: "Pdf"
                          }
                      ]
            }
            onClick={({key}) => {
                setShow(false)
                switch (key) {
                    case "html":
                        downloadHtml()
                        return
                    case "word":
                        downloadWord()
                        return
                    case "pdf":
                        downloadPdf()
                        return
                    default:
                        return
                }
            }}
        ></YakitMenu>
    )

    return (
        <div className={styles["report-viewer"]}>
            <Spin spinning={SpinLoading || wordSpinLoading}>
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
                            <YakitButton
                                size="small"
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
                            </YakitButton>
                            <YakitPopover
                                overlayClassName={classNames(styles["ui-op-setting-dropdown"])}
                                placement={"bottom"}
                                content={dowloadMenu}
                                visible={show}
                                onVisibleChange={(visible) => setShow(visible)}
                            >
                                <YakitButton size="small">下载</YakitButton>
                            </YakitPopover>
                        </Space>
                    }
                >
                    <div ref={divRef} style={{overflow: "auto", height: "100%"}}>
                        <Space direction={"vertical"} style={{width: "100%"}}>
                            {reportItems.map((i, index) => {
                                return <ReportItemRender item={i} key={index} />
                            })}
                        </Space>
                    </div>
                </AutoCard>
            </Spin>
        </div>
    )
}
