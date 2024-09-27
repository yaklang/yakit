import React, {useEffect, useRef, useState} from "react"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {YakitCard} from "@/components/yakitUI/YakitCard/YakitCard"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {QuestionMarkCircleIcon, RefreshIcon} from "@/assets/newIcon"
import {Space, Tooltip} from "antd"
import {OutlineTrashIcon} from "@/assets/icon/outline"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {genDefaultPagination, QueryGeneralRequest, QueryGeneralResponse} from "../invoker/schema"
import {yakitNotify} from "@/utils/notification"
import {Report} from "./models"
import {formatTimestamp} from "@/utils/timeUtil"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {SelectIcon} from "@/assets/icons"
import classNames from "classnames"
import {useCampare} from "@/hook/useCompare/useCompare"
import {useCreation, useMemoizedFn} from "ahooks"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {onRemoveToolFC} from "@/utils/deleteTool"
import {isEnterpriseEdition} from "@/utils/envfile"
import {openABSFileLocated} from "@/utils/openWebsite"
import html2pdf from "html2pdf.js"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {ReportItem} from "./reportRenders/schema"
import html2canvas from "html2canvas"
import {saveAs} from "file-saver"
import htmlDocx from "html-docx-js/dist/html-docx"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {ReportMarkdownBlock} from "./reportRenders/markdownRender"
import {FoldTable, JSONTableRender, ReportMergeTable, RiskTable} from "./reportRenders/jsonTableRender"
import {PieGraph} from "../graph/PieGraph"
import {BarGraph} from "../graph/BarGraph"
import {
    EchartsCard,
    HollowPie,
    MultiPie,
    NightingleRose,
    StackedVerticalBar,
    VerticalOptionBar
} from "./reportRenders/EchartsInit"
import {FoldHoleCard, FoldRuleCard} from "./reportRenders/ReportExtendCard"
import {AutoCard} from "@/components/AutoCard"
import styles from "./ReportViewerPage.module.scss"
const {ipcRenderer} = window.require("electron")

interface ReportViewerPageProp {}
export const ReportViewerPage: React.FC<ReportViewerPageProp> = (props) => {
    const [selectReportId, setSelectReportId] = useState<number>()

    return (
        <div className={styles["reportViewerPage"]}>
            <YakitResizeBox
                isVer={false}
                lineDirection='left'
                firstNode={<ReportList selectReportId={selectReportId} onSetSelectReportId={setSelectReportId} />}
                firstRatio='30%'
                firstMinSize='400px'
                firstNodeStyle={{padding: 0}}
                secondNode={<ReportViewer reportId={selectReportId} />}
                secondRatio='70%'
                secondMinSize='500px'
            ></YakitResizeBox>
        </div>
    )
}

interface QueryReportsRequest extends QueryGeneralRequest {
    Title: string
    Owner: string
    From: string
    Keyword: string
}
interface ReportListProp {
    selectReportId?: number
    onSetSelectReportId: (selectReportId?: number) => void
}
const ReportList: React.FC<ReportListProp> = (props) => {
    const {selectReportId, onSetSelectReportId} = props
    const [query, setQuery] = useState<QueryReportsRequest>({
        From: "",
        Keyword: "",
        Owner: "",
        Title: "",
        Pagination: genDefaultPagination(20)
    })
    const [loading, setLoading] = useState<boolean>(false)
    const [hasMore, setHasMore] = useState<boolean>(false)
    const [isRefresh, setIsRefresh] = useState<boolean>(false)
    const [response, setResponse] = useState<QueryGeneralResponse<Report>>({
        Data: [],
        Pagination: genDefaultPagination(20),
        Total: 0
    })
    const [selectList, setSelectList] = useState<Report[]>([])
    const compareSelectList = useCampare(selectList)
    const selectedRowKeys = useCreation(() => {
        return selectList.map((item) => item.Id)
    }, [compareSelectList])

    const onCheckboxSingle = (selectedRows: Report) => {
        if (!selectedRowKeys.includes(selectedRows.Id)) {
            setSelectList((s) => [...s, selectedRows])
        } else {
            setSelectList((s) => s.filter((ele) => ele.Id !== selectedRows.Id))
        }
    }

    useEffect(() => {
        update(1)
    }, [])

    useEffect(() => {
        ipcRenderer.on("fetch-simple-open-report", (e, reportId: number) => {
            update(1)
            reportId && onSetSelectReportId(reportId)
        })
        return () => {
            ipcRenderer.removeAllListeners("fetch-simple-open-report")
        }
    }, [])

    const update = (page: number) => {
        setLoading(true)
        const paginationProps = {
            ...query.Pagination,
            Page: page,
            Limit: 20
        }
        const finalParams: QueryReportsRequest = {
            ...query,
            Pagination: paginationProps
        }
        const isInit = page === 1
        ipcRenderer
            .invoke("QueryReports", finalParams)
            .then((res: QueryGeneralResponse<Report>) => {
                if (res.Data.length) {
                    setQuery((prevQuery) => ({
                        ...prevQuery,
                        Pagination: {
                            ...prevQuery.Pagination,
                            Page: +res.Pagination.Page
                        }
                    }))
                }
                const d = isInit ? res.Data : (response?.Data || []).concat(res.Data)
                const isMore = res.Data.length < res.Pagination.Limit || d.length == response.Total
                setHasMore(!isMore)
                setResponse({
                    ...res,
                    Data: d
                })
                if (isInit) {
                    setIsRefresh((prevIsRefresh) => !prevIsRefresh)
                    setSelectList([])
                }
            })
            .catch((e) => {
                yakitNotify("error", "Query Reports Failed：" + e)
            })
            .finally(() => setLoading(false))
    }

    const onRemove = useMemoizedFn(() => {
        const transferParams = {
            selectedRowKeys,
            params: query,
            interfaceName: "DeleteReport",
            selectedRowKeysNmae: "IDs"
        }
        setLoading(true)
        onRemoveToolFC(transferParams)
            .then(() => {
                selectedRowKeys.length === 0 && onSetSelectReportId(undefined)
                if (selectReportId && selectedRowKeys.includes(selectReportId)) {
                    onSetSelectReportId(undefined)
                }
                update(1)
            })
            .finally(() => setLoading(false))
    })

    return (
        <YakitCard
            className={styles["card"]}
            headStyle={{
                background: "#fff",
                height: 32,
                minHeight: 32,
                boxSizing: "content-box",
                borderBottom: "1px solid var(--yakit-border-color)",
                paddingLeft: 0
            }}
            bodyStyle={{padding: 12, paddingLeft: 0, width: "100%", height: "calc(100% - 32px)"}}
            title={
                <div className={styles["card-title"]}>
                    <span className={styles["card-title-text"]}>报告列表</span>
                </div>
            }
            extra={
                <div className={styles["card-extra"]}>
                    <Tooltip title='点击列表中的报告检查内容' placement='bottom'>
                        <YakitButton type='text' icon={<QuestionMarkCircleIcon />} size='small'></YakitButton>
                    </Tooltip>
                    <YakitButton
                        type='text'
                        icon={<RefreshIcon />}
                        size='small'
                        onClick={() => {
                            update(1)
                        }}
                    ></YakitButton>
                    <YakitPopconfirm
                        title={
                            selectedRowKeys.length > 0
                                ? "确定删除选择的报告吗？不可恢复"
                                : "确定删除所有报告吗? 不可恢复"
                        }
                        onConfirm={onRemove}
                        disabled={!response.Data.length}
                    >
                        <YakitButton
                            type='text'
                            icon={<OutlineTrashIcon />}
                            danger
                            size='small'
                            disabled={!response.Data.length}
                        ></YakitButton>
                    </YakitPopconfirm>
                </div>
            }
        >
            <div className={styles["card-body"]}>
                <RollingLoadList<Report>
                    loading={loading}
                    isRef={isRefresh}
                    hasMore={hasMore}
                    data={response.Data}
                    page={response.Pagination.Page}
                    loadMoreData={() => {
                        // 请求下一页数据
                        update(+response.Pagination.Page + 1)
                    }}
                    rowKey='Id'
                    defItemHeight={99}
                    classNameRow={classNames(styles["list-item"], styles["list-item-hoverable"])}
                    renderRow={(item: Report, index) => {
                        return (
                            <div onClick={() => onSetSelectReportId(item.Id)} key={item.Id}>
                                <YakitCard
                                    className={styles["card"]}
                                    headClassName={styles["list-item-header"]}
                                    headStyle={{
                                        height: 32,
                                        minHeight: 32,
                                        boxSizing: "content-box",
                                        borderBottom: selectReportId == item.Id ? "1px solid #fff" : undefined
                                    }}
                                    bodyClassName={styles["list-item-body"]}
                                    bodyStyle={{
                                        width: "100%",
                                        height: "calc(100% - 32px)"
                                    }}
                                    title={
                                        <div className={classNames(styles["card-title"])}>
                                            <span className={classNames(styles["card-title-text"], "content-ellipsis")}>
                                                {item.Title}
                                            </span>
                                        </div>
                                    }
                                    extra={<YakitTag>{formatTimestamp(item.PublishedAt)}</YakitTag>}
                                    style={{
                                        backgroundColor:
                                            selectReportId == item.Id ? "var(--yakit-primary-2)" : undefined
                                    }}
                                >
                                    <Tooltip title='点击选中后，可删除'>
                                        <SelectIcon
                                            // @ts-ignore
                                            className={classNames(styles["icon-select"], {
                                                [styles["icon-select-active"]]: selectedRowKeys.includes(item.Id)
                                            })}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onCheckboxSingle(item)
                                            }}
                                        />
                                    </Tooltip>
                                    <Space wrap={false}>
                                        {item.Id && <YakitTag color='red'>ID:{item.Id}</YakitTag>}
                                        {item.Owner && <YakitTag color='green'>发起人:{item.Owner}</YakitTag>}
                                        {item.From && <YakitTag color='warning'>来源:{item.From}</YakitTag>}
                                    </Space>
                                </YakitCard>
                            </div>
                        )
                    }}
                ></RollingLoadList>
            </div>
        </YakitCard>
    )
}

interface ReportViewerProp {
    reportId?: number
}
const ReportViewer: React.FC<ReportViewerProp> = (props) => {
    const {reportId} = props
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
    const isEchartsToImg = useRef<boolean>(true)
    const [reportItems, setReportItems] = useState<ReportItem[]>([])
    const divRef = useRef<HTMLDivElement>(null)
    const [downloadLoading, setDownloadLoading] = useState<boolean>(false)
    const [wordDownloadLoading, setWordDownloadLoading] = useState<boolean>(false)

    useEffect(() => {
        if ((reportId || 0) <= 0) {
            setReport({
                ...report,
                Id: 0
            })
            return
        }

        isEchartsToImg.current = true
        setLoading(true)
        ipcRenderer
            .invoke("QueryReport", {Id: reportId})
            .then((r: Report) => {
                if (r) setReport(r)
            })
            .catch((e) => {
                yakitNotify("error", `Query Report[${props.reportId}] failed`)
            })
            .finally(() => setTimeout(() => setLoading(false), 100))
    }, [reportId])

    useEffect(() => {
        try {
            const items = report.JsonRaw && report.JsonRaw !== "-" && (JSON.parse(report.JsonRaw) as ReportItem[])
            if (!!items && items.length > 0) {
                setReportItems(items)
            }
        } catch (e) {
            yakitNotify("error", `Parse Report[${props.reportId}]'s items failed`)
        }
    }, [report])

    // 下载PDF
    const downloadPdf = () => {
        setDownloadLoading(true)
        setTimeout(() => {
            if (!divRef || !divRef.current) return
            const contentHTML = divRef.current
            html2pdf()
                .from(contentHTML)
                .set({
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
                })
                .save()
                .then(() => {
                    setDownloadLoading(false)
                })
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
                    setDownloadLoading(true)
                    let absolutePath = data.filePaths[0].replace(/\\/g, "\\")
                    ipcRenderer
                        .invoke("DownloadHtmlReport", {
                            JsonRaw: report.JsonRaw,
                            outputDir: absolutePath,
                            reportName: report.Title
                        })
                        .then((r) => {
                            if (r?.ok) {
                                yakitNotify("success", "报告导出成功")
                                r?.outputDir && openABSFileLocated(r.outputDir)
                            }
                        })
                        .catch((e) => {
                            yakitNotify("error", `Download Html Report failed ${e}`)
                        })
                        .finally(() => setDownloadLoading(false))
                }
            })
    }

    // 下载Word
    const downloadWord = () => {
        if (!divRef || !divRef.current) return
        setWordDownloadLoading(true)
        // 此处定时器为了确保已处理其余任务
        setTimeout(() => {
            exportToWord()
        }, 300)
    }
    // 下载报告
    const exportToWord = async () => {
        if (!divRef || !divRef.current) return
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
                    options = {scale: 1, windowWidth: 1000, x: 150, y: 0}
                } else if (echartType === "hollow-pie") {
                    options = {scale: 1, windowWidth: 1000}
                } else if (echartType === "stacked-vertical-bar") {
                    options = {scale: 1, windowWidth: 1000, x: 150, y: 0}
                } else if (echartType === "multi-pie") {
                    options = {scale: 0.8, windowWidth: 1200}
                } else if (echartType === "nightingle-rose") {
                    options = {scale: 1, windowWidth: 1000, x: 150, y: 0, height: 400}
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
        // word报告不要附录 table添加边框 移除南丁格尔玫瑰图点击详情(图像中已含)
        const wordStr: string = contentHTML.outerHTML
            .substring(0, contentHTML.outerHTML.indexOf("附录："))
            .replace(/<table(.*?)>/g, '<table$1 border="1">')
            .replace(/<th(.*?)>/g, '<th$1 style="width: 10%">')
            .replace(/<div[^>]*id=("nightingle-rose-title"|"nightingle-rose-content")[^>]*>[\s\S]*?<\/div>/g, "")

        saveAs(
            //保存文件到本地
            htmlDocx.asBlob(wordStr), //将html转为docx
            `${report.Title}.doc`
        )
        setWordDownloadLoading(false)
    }

    return (
        <div className={styles["report-viewer"]}>
            {report.Id <= 0 ? (
                <YakitEmpty title='选择报告以在此查看内容' className={styles["report-empty"]}></YakitEmpty>
            ) : loading ? (
                <YakitSpin spinning={loading} wrapperClassName={styles["loading-wrapper"]}></YakitSpin>
            ) : (
                <YakitSpin spinning={downloadLoading || wordDownloadLoading}>
                    <YakitCard
                        className={styles["card"]}
                        headStyle={{
                            background: "#fff",
                            height: 32,
                            minHeight: 32,
                            boxSizing: "content-box",
                            borderBottom: "1px solid var(--yakit-border-color)",
                            paddingLeft: 0,
                            paddingRight: 0
                        }}
                        bodyStyle={{
                            padding: 0,
                            paddingBottom: 12,
                            paddingTop: 12,
                            width: "100%",
                            height: "calc(100% - 32px)"
                        }}
                        title={
                            <div className={styles["card-title"]}>
                                <span className={styles["card-title-text"]}>{report.Title}</span>
                                <YakitTag>{reportId}</YakitTag>
                            </div>
                        }
                        extra={
                            <div className={styles["card-extra"]}>
                                <YakitButton
                                    size='small'
                                    onClick={() => {
                                        showYakitModal({
                                            title: "RAW DATA",
                                            content: (
                                                <div style={{height: 300}}>
                                                    <YakitEditor value={report.JsonRaw} />
                                                </div>
                                            ),
                                            width: "50%"
                                        })
                                    }}
                                >
                                    RAW
                                </YakitButton>
                                <YakitDropdownMenu
                                    menu={{
                                        data: isEnterpriseEdition()
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
                                              ],
                                        onClick: ({key}) => {
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
                                        }
                                    }}
                                    dropdown={{
                                        trigger: ["click"],
                                        placement: "bottom"
                                    }}
                                >
                                    <YakitButton size='small'>下载</YakitButton>
                                </YakitDropdownMenu>
                            </div>
                        }
                    >
                        <div ref={divRef} className={styles["card-body"]} style={{overflow: "auto"}}>
                            <Space direction={"vertical"} style={{width: "100%"}}>
                                {reportItems.map((i, index) => (
                                    <ReportItemRender item={i} key={index} />
                                ))}
                            </Space>
                        </div>
                    </YakitCard>
                </YakitSpin>
            )}
        </div>
    )
}

interface ReportItemRenderProp {
    item: ReportItem
}
const ReportItemRender: React.FC<ReportItemRenderProp> = (props) => {
    const {type, content} = props.item
    switch (type) {
        case "markdown":
            return <ReportMarkdownBlock item={props.item} />
        case "json-table":
            return <JSONTableRender item={props.item} />
        case "pie-graph":
            try {
                return (
                    <PieGraph
                        type={"pie"}
                        height={300}
                        data={JSON.parse(props.item.content) as {key: string; value: number}[]}
                    />
                )
            } catch (e) {
                return (
                    <div style={{height: 300}}>
                        <YakitEditor value={props.item.content} />
                    </div>
                )
            }
        case "bar-graph":
            try {
                return (
                    <BarGraph
                        type={"bar"}
                        width={450}
                        direction={props.item?.direction}
                        data={JSON.parse(props.item.content) as {key: string; value: number}[]}
                    />
                )
            } catch (e) {
                return (
                    <div style={{height: 300}}>
                        <YakitEditor value={props.item.content} />
                    </div>
                )
            }
        case "raw":
            try {
                const newData = JSON.parse(content)
                if (newData.type === "report-cover") {
                    return <div style={{height: 0}}></div>
                } else if (newData.type === "bar-graph") {
                    let color = newData?.color
                    let name = (newData?.data || []).map((item) => item.name)
                    let value = (newData?.data || []).map((item) => item.value)
                    let title = newData?.title
                    let obj = {name, value, color, title}
                    return <VerticalOptionBar content={obj} />
                } else if (newData.type === "pie-graph") {
                    return <HollowPie data={newData.data} title={newData.title} />
                } else if (newData.type === "fix-list") {
                    return <FoldHoleCard data={newData.data} />
                } else if (newData.type === "info-risk-list") {
                    return <FoldTable data={newData} />
                } else {
                    // kv图 南丁格尔玫瑰图 多层饼环
                    const content = typeof newData === "string" ? JSON.parse(newData) : newData
                    const {type, data} = content
                    if (type) {
                        switch (type) {
                            case "multi-pie":
                                return <MultiPie content={content} />
                            case "nightingle-rose":
                                return <NightingleRose content={content} />
                            // 通用kv
                            case "general":
                                // kv图展示柱状图
                                return <VerticalOptionBar content={content} />
                            case "year-cve":
                                return <StackedVerticalBar content={content} />
                            case "card":
                                const dataTitle = content?.name_verbose || content?.name || ""
                                return <EchartsCard dataTitle={dataTitle} dataSource={data} />
                            case "fix-array-list":
                                return <FoldRuleCard content={content} />
                            case "risk-list":
                                return <RiskTable data={content} />
                            case "potential-risks-list":
                                return <RiskTable data={content} />
                            case "search-json-table":
                                return <ReportMergeTable data={content} />
                            default:
                                return (
                                    <AutoCard
                                        style={{width: "100%"}}
                                        size={"small"}
                                        extra={<YakitTag color='danger'>{props.item.type}</YakitTag>}
                                    >
                                        <div style={{height: 300}}>
                                            <YakitEditor value={props.item.content} />
                                        </div>
                                    </AutoCard>
                                )
                        }
                    }
                }
            } catch (error) {
                return (
                    <AutoCard
                        style={{width: "100%"}}
                        size={"small"}
                        extra={<YakitTag color='danger'>{props.item.type}</YakitTag>}
                    >
                        <div style={{height: 300}}>
                            <YakitEditor value={props.item.content} />
                        </div>
                    </AutoCard>
                )
            }
            return null
        default:
            return (
                <AutoCard
                    style={{width: "100%"}}
                    size={"small"}
                    extra={<YakitTag color='danger'>{props.item.type}</YakitTag>}
                >
                    <div style={{height: 300}}>
                        <YakitEditor value={props.item.content} />
                    </div>
                </AutoCard>
            )
    }
}
