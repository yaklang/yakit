import React, {useEffect, useRef, useState} from "react"
import {Button, Card, Col, Divider, Row, Space, Tag, Timeline} from "antd"
import {formatTime, formatTimestamp} from "../../utils/timeUtil"
import {showModal} from "../../utils/showModal"
import {GraphData} from "../graph/base"
import {BarGraph} from "../graph/BarGraph"
import {PieGraph} from "../graph/PieGraph"
import {ExecResultLog} from "./batch/ExecMessageViewer"
import {LogLevelToCode} from "../../components/HTTPFlowTable/HTTPFlowTable"
import {HTTPFlowRiskViewer, YakitHTTPFlowRisk} from "../../components/HTTPFlowRiskViewer"
import {AutoCard} from "../../components/AutoCard"
import MDEditor from "@uiw/react-md-editor"
import {openABSFileLocated} from "../../utils/openWebsite"
import {callCopyToClipboard} from "../../utils/basic"
import {RiskDetails} from "../risks/RiskTable"
import {Risk} from "../risks/schema"
import styles from "./YakitLogFormatter.module.scss"
import classNames from "classnames"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useCreation, useMemoizedFn} from "ahooks"
import {YakitCard} from "@/components/yakitUI/YakitCard/YakitCard"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {
    OutlineArrowsexpandIcon,
    OutlineChevrondownIcon,
    OutlineChevronupIcon,
    OutlineDocumentduplicateIcon,
    OutlineFolderopenIcon
} from "@/assets/icon/outline"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {YakEditor} from "@/utils/editors"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {EChartsOption} from "../risks/VulnerabilityLevelPie/VulnerabilityLevelPieType"
import * as echarts from "echarts"
import {SolidCalendarIcon} from "@/assets/icon/solid"
import {isNumberNaN} from "@/utils/tool"
export interface YakitLogViewersProp {
    data: ExecResultLog[]
    finished?: boolean
    onlyTime?: boolean
}

export const YakitLogViewers = React.memo((props: YakitLogViewersProp) => {
    return (
        <Timeline pending={!props.finished} reverse={true}>
            {(props.data || []).map((e) => {
                return (
                    <Timeline.Item color={LogLevelToCode(e.level)}>
                        <YakitLogFormatter
                            data={e.data}
                            level={e.level}
                            timestamp={e.timestamp}
                            onlyTime={props.onlyTime}
                        />
                    </Timeline.Item>
                )
            })}
        </Timeline>
    )
})

export interface YakitLogFormatterProp {
    level: string
    data: string | any
    timestamp: number
    onlyTime?: boolean
    isCollapsed?: boolean
}

export const YakitLogFormatter: React.FC<YakitLogFormatterProp> = (props) => {
    switch (props.level) {
        case "file":
            try {
                const obj = JSON.parse(props.data) as {
                    title: string
                    description: string
                    path: string
                    is_dir: boolean
                    is_existed: boolean
                    file_size: string
                    dir: string
                }
                return <FileLogShow {...obj} timestamp={props.timestamp} />
            } catch (e) {
                return (
                    <div style={{height: 150}}>
                        <AutoCard style={{padding: 0}} bodyStyle={{padding: 0}}>
                            <YakEditor readOnly={true} type={"http"} value={props.data} />
                        </AutoCard>
                    </div>
                )
            }

        // case "json-risk":
        //     try {
        //         return <RiskDetails info={JSON.parse(props.data) as Risk} shrink={true}/>
        //     } catch (e) {
        //         return <div>Risk</div>
        //     }
        case "json":
            return <JsonLogShow {...props} />
        case "markdown":
            return <MarkdownLogShow {...props} />
        case "text":
        case "code":
            return <EditorLogShow {...props} />
        // case "success":
        //     return (
        //         <Space direction={"vertical"} style={{width: "100%"}}>
        //             {props.timestamp > 0 && (
        //                 <Tag color={"geekblue"}>{formatTimestamp(props.timestamp, props.onlyTime)}</Tag>
        //             )}
        //             <Card size={"small"} title={<Tag color={"green"}>模块执行结果</Tag>}>
        //                 {props.data}
        //             </Card>
        //         </Space>
        //     )
        case "json-table":
            try {
                let obj: {head: string[]; data: string[][]} = JSON.parse(props.data)
                return (
                    <Space direction={"vertical"} style={{width: "100%"}}>
                        {/* {props.timestamp > 0 && (
                            <Tag color={"geekblue"}>{formatTimestamp(props.timestamp, props.onlyTime)}</Tag>
                        )} */}
                        <div className={styles["log-time"]}>{formatTime(props.timestamp)}</div>
                        <Card
                            size={"small"}
                            title={<YakitTag color='success'>直接结果(表格)</YakitTag>}
                            extra={
                                <YakitButton
                                    type='outline2'
                                    onClick={(e) =>
                                        showModal({
                                            title: "JSON 数据",
                                            content: <>{JSON.stringify(obj)}</>
                                        })
                                    }
                                >
                                    JSON
                                </YakitButton>
                            }
                            style={{borderRadius: 4}}
                        >
                            {(obj.head || []).length > 0 && (
                                <Row gutter={4}>
                                    {(obj.head || []).map((i) => (
                                        <Col span={24.0 / obj.head.length}>
                                            <div style={{border: "2px"}}>{i}</div>
                                        </Col>
                                    ))}
                                    <Divider style={{marginTop: 4, marginBottom: 4}} />
                                </Row>
                            )}
                            {(obj.data || []).length > 0 && (
                                <>
                                    {obj.data.map((i) => (
                                        <Row>
                                            {(i || []).map((element) => {
                                                return <Col span={24.0 / i.length}>{element}</Col>
                                            })}
                                        </Row>
                                    ))}
                                </>
                            )}
                        </Card>
                    </Space>
                )
            } catch (error) {
                return <span className={styles["log-time"]}>{formatTime(props.timestamp)}</span>
            }
        case "json-httpflow-risk":
            try {
                return <HTTPFlowRiskViewer risk={JSON.parse(props.data) as YakitHTTPFlowRisk} />
            } catch (e) {
                console.info(e)
                return <div />
            }
        case "json-feature":
            return <div />
        case "json-graph":
            return (
                <GraphLogShow {...props} />
                // <Space direction={"vertical"}>
                //     {props.timestamp > 0 && (
                //         <YakitTag color='bluePurple'>{formatTimestamp(props.timestamp, props.onlyTime)}</YakitTag>
                //     )}
                //     <Card
                //         size={"small"}
                //         title={<Tag color={"green"}>{graphData?.name || "直接结果(图)"}</Tag>}
                //         extra={[
                //             <Button
                //                 onClick={(e) =>
                //                     showModal({
                //                         title: "JSON 数据",
                //                         content: <>{JSON.stringify(graphData)}</>
                //                     })
                //                 }
                //             >
                //                 JSON
                //             </Button>
                //         ]}
                //     >
                //         {(() => {
                //             switch (graphData.type) {
                //                 case "bar":
                //                     return (
                //                         <div>
                //                             <BarGraph {...graphData} />
                //                         </div>
                //                     )
                //                 case "pie":
                //                     return (
                //                         <div>
                //                             <PieGraph {...graphData} />
                //                         </div>
                //                     )
                //             }
                //             return <div>{props.data}</div>
                //         })()}
                //     </Card>
                // </Space>
            )
    }
    return (
        <div className={styles["log-info"]}>
            <span className={styles["log-time"]}>{formatTime(props.timestamp)}</span>
            <span style={{margin: "0 4px"}}>·</span>
            <span>{props.data}</span>
        </div>
    )
}

interface MarkdownLogShowProps extends YakitLogFormatterProp {}
const MarkdownLogShow: React.FC<MarkdownLogShowProps> = React.memo((props) => {
    const [expand, setExpand] = useState<boolean>(false)
    const [isShowExpand, setIsShowExpand] = useState<boolean>(true)
    const markdownLogBodyRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (markdownLogBodyRef.current) {
            const {scrollHeight, clientHeight} = markdownLogBodyRef.current
            const isScroll = scrollHeight > clientHeight
            setIsShowExpand(isScroll)
        }
    }, [])
    const onExpand = useMemoizedFn(() => {
        setExpand(!expand)
    })
    return (
        <div className={styles["md-body"]}>
            <div className={styles["md-heard"]}>{formatTime(props.timestamp)}</div>
            <div
                className={classNames(styles["md-content"], {
                    [styles["md-content-expand"]]: expand
                })}
                ref={markdownLogBodyRef}
            >
                <MDEditor.Markdown source={props.data} />
            </div>
            {isShowExpand && (
                <div className={styles["md-expand-text"]} onClick={onExpand}>
                    {expand ? "收起详情" : "展开详情"}
                </div>
            )}
        </div>
    )
})

interface FileLogShowProps {
    title: string
    description: string
    path: string
    is_dir: boolean
    is_existed: boolean
    file_size: string
    dir: string
    timestamp: number
}
const FileLogShow: React.FC<FileLogShowProps> = React.memo((props) => {
    const {title, is_dir, is_existed, file_size, description, path, timestamp} = props
    const [expand, setExpand] = useState<boolean>(true)
    const onCopy = useMemoizedFn(() => {
        callCopyToClipboard(path)
    })
    const onOpen = useMemoizedFn(() => {
        openABSFileLocated(path)
    })
    const onExpand = useMemoizedFn(() => {
        setExpand(!expand)
    })
    return (
        <div className={styles["file-body"]}>
            <div className={styles["file-heard"]}>{formatTime(timestamp)}</div>
            <YakitCard
                title={
                    <div className={styles["file-card-title"]}>
                        <span className={styles["name"]}>{title}</span>
                        {!is_existed && <span className={styles["file-status"]}>未创建成功</span>}
                    </div>
                }
                extra={
                    <div className={styles["file-card-extra"]}>
                        <YakitButton type='outline2' icon={<OutlineDocumentduplicateIcon />} onClick={onCopy}>
                            复制文件名
                        </YakitButton>
                        <YakitButton
                            type='primary'
                            icon={<OutlineFolderopenIcon />}
                            disabled={!is_existed}
                            onClick={onOpen}
                        >
                            打开文件位置
                        </YakitButton>
                        <YakitButton
                            type='text2'
                            icon={expand ? <OutlineChevrondownIcon /> : <OutlineChevronupIcon />}
                            onClick={onExpand}
                        />
                    </div>
                }
                headClassName={classNames(styles["file-card-heard"], {
                    [styles["file-card-heard-error"]]: !is_existed
                })}
                className={styles["file-card"]}
                bodyClassName={classNames(styles["file-card-body"], {
                    [styles["file-card-body-hidden"]]: !expand
                })}
            >
                <div className={styles["file-body"]}>
                    <div>
                        <YakitTag>{is_dir ? "文件夹" : "非文件夹"}</YakitTag>
                        {file_size && <YakitTag color='blue'>{file_size}K</YakitTag>}
                    </div>
                    {description && <div className={styles["file-description"]}>{description}</div>}
                    {path && <div className={styles["file-path"]}>{path}</div>}
                </div>
            </YakitCard>
        </div>
    )
})
interface JsonLogShowProps extends YakitLogFormatterProp {}
const JsonLogShow: React.FC<JsonLogShowProps> = React.memo((props) => {
    const {timestamp, data} = props
    return (
        <div className={styles["json-body"]}>
            <div className={styles["json-heard"]}>{formatTime(timestamp)}</div>
            <pre className={styles["json-content"]}>{data}</pre>
        </div>
    )
})
interface EditorLogShowProps extends YakitLogFormatterProp {}
const EditorLogShow: React.FC<EditorLogShowProps> = React.memo((props) => {
    const {timestamp, data} = props

    const onExpand = useMemoizedFn(() => {
        const m = showYakitModal({
            title: formatTime(timestamp),
            width: "80vw",
            content: (
                <div style={{height: "80vh"}}>
                    <YakitEditor type={"plaintext"} value={data} />
                </div>
            ),
            onCancel: () => m.destroy(),
            footer: null
        })
    })
    return (
        <div className={styles["editor-body"]}>
            <div className={styles["editor-heard"]}>{formatTime(timestamp)}</div>
            <div className={classNames(styles["editor-content"])}>
                <YakitEditor type={"plaintext"} value={data} />
            </div>
            <div className={styles["editor-expand-text"]} onClick={onExpand}>
                <OutlineArrowsexpandIcon className={styles["expand-icon"]} />
                查看
            </div>
        </div>
    )
})

interface GraphLogShowProps extends YakitLogFormatterProp {}
const colorList = [
    {
        name: "purple",
        color: "#8863f7"
    },
    {
        name: "bluePurple",
        color: "#da5fdd"
    },
    {
        name: "blue",
        color: "#4a94f8"
    },
    {
        name: "lakeBlue",
        color: "#29BCD0"
    },
    {
        name: "cyan",
        color: "#35d8ee"
    },
    {
        name: "green",
        color: "#56c991"
    },
    {
        name: "red",
        color: "#f4736b"
    },
    {
        name: "orange",
        color: "#ffb660"
    },
    {
        name: "yellow",
        color: "#ffd583"
    },
    {
        name: "grey",
        color: "#b4bbca"
    }
]
const colorLength = colorList.length
const GraphLogShow: React.FC<GraphLogShowProps> = React.memo((props) => {
    const {data, timestamp} = props

    const graphData: GraphData = useCreation(() => {
        try {
            return JSON.parse(data)
        } catch (error) {
            return {
                type: "",
                data: [],
                name: "直接结果(图)"
            }
        }
    }, [data])

    const renderCharts = useMemoizedFn(() => {
        switch (graphData.type) {
            case "bar":
                return <BarCharts graphData={graphData} />

            default:
                return <div>{props.data}</div>
        }
    })

    return (
        <div className={styles["graph-body"]}>
            <div className={styles["graph-heard"]}>{formatTime(timestamp)}</div>
            <div className={styles["graph-content"]}>
                <div className={styles["graph-content-title"]}>
                    <div>{graphData.name}</div>
                    <div className={styles["time"]}>
                        <SolidCalendarIcon />
                        <span>{formatTimestamp(timestamp)}</span>
                    </div>
                </div>

                {renderCharts()}
            </div>
        </div>
    )
})

interface BarChartsProps {
    graphData: GraphData
}
const BarCharts: React.FC<BarChartsProps> = React.memo((props) => {
    const {graphData} = props
    const chartRef = useRef<HTMLDivElement>(null)
    const graphRef = useRef<echarts.ECharts>()
    const xAxis = useCreation(() => {
        return graphData.data.map((ele) => ele.key)
    }, [graphData])
    const series = useCreation(() => {
        const seriesList = graphData.data.filter((ele) => Array.isArray(ele.value)).map((ele) => ele.value.length)
        const seriesLength = Math.max(...seriesList, 0)
        const series: any[] = []

        if (seriesLength === 0) {
            series.push({
                name: 1,
                data: graphData.data.map((ele) => (isNumberNaN(ele.value) ? 0 : ele.value)),
                type: "bar",
                showBackground: true,
                backgroundStyle: {
                    color: "#f8f8f8",
                    borderRadius: 3
                },
                itemStyle: {
                    borderRadius: 3
                }
            })
        } else {
            for (let index = 0; index < seriesLength; index++) {
                const data: number[] = []
                graphData.data.forEach((element) => {
                    if (Array.isArray(element.value)) {
                        const value = element.value[index]
                        data.push(isNumberNaN(value) ? 0 : value)
                    } else {
                        if (index === 0) {
                            data.push(isNumberNaN(element.value) ? 0 : element.value)
                        } else {
                            data.push(0)
                        }
                    }
                })
                series.push({
                    name: `系列${index}`,
                    data,
                    type: "bar",
                    showBackground: true,
                    backgroundStyle: {
                        color: "#f8f8f8",
                        borderRadius: 3
                    },
                    itemStyle: {
                        borderRadius: 3
                    }
                })
            }
        }
        console.log("series", series)
        return series
    }, [graphData])
    const legendList = useCreation(() => {
        return series.map((ele) => ele.name)
    }, [series])
    const optionRef = useRef<EChartsOption>({
        color: colorList.map((ele) => ele.color),
        tooltip: {
            trigger: "axis",
            axisPointer: {
                type: "shadow",
                shadowStyle: {
                    color: "rgba(234, 236, 243, 0.3)"
                }
            }
        },
        xAxis: {
            type: "category",
            data: xAxis,
            axisTick: {
                show: false
            },
            axisLabel: {
                show: true,
                color: "#85899E",
                fontWeight: 400,
                fontFamily: "PingFang HK",
                fontSize: 14,
                align: "center",
                lineHeight: 20
            },
            axisLine: {
                show: true,
                lineStyle: {
                    color: "#EAECF3"
                }
            }
        },
        yAxis: {
            type: "value",
            splitLine: {
                lineStyle: {
                    color: "#EAECF3",
                    width: 1,
                    type: [10, 15],
                    cap: "round"
                }
            },
            axisLabel: {
                show: true,
                color: "#85899E",
                fontWeight: 400,
                fontFamily: "Inter",
                fontSize: 16,
                align: "right",
                lineHeight: 18
            }
        },
        series: []
    })
    useEffect(() => {
        graphRef.current = echarts.init(chartRef.current)
        optionRef.current.series = series || []
        graphRef.current.setOption(optionRef.current)
        return () => {
            if (graphRef.current) {
                graphRef.current.dispose()
                graphRef.current = undefined
            }
        }
    }, [])
    return (
        <>
            {legendList.length > 1 && (
                <div className={styles["graph-xAxis-list"]}>
                    {legendList.map((item, index) => (
                        <div key={item} className={styles["graph-xAxis-list-item"]}>
                            <div
                                className={classNames(
                                    styles["circle"],
                                    `color-bg-${colorList[index % colorLength]?.name || "purple"}`
                                )}
                            />
                            {item}
                        </div>
                    ))}
                </div>
            )}
            <div className={styles["bar-graph-charts"]} ref={chartRef}></div>
        </>
    )
})
