import React, {useEffect, useMemo, useRef, useState} from "react"
import {Card, Col, Divider, Row, Space, Timeline} from "antd"
import {formatTime, formatTimestamp} from "../../utils/timeUtil"
import {showModal} from "../../utils/showModal"
import {GraphData} from "../graph/base"
import {ExecResultLog} from "./batch/ExecMessageViewer"
import {LogLevelToCode} from "../../components/HTTPFlowTable/HTTPFlowTable"
import {HTTPFlowRiskViewer, YakitHTTPFlowRisk} from "../../components/HTTPFlowRiskViewer"
import {AutoCard} from "../../components/AutoCard"
import MDEditor from "@uiw/react-md-editor"
import {openABSFileLocated} from "../../utils/openWebsite"
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
import {SolidCalendarIcon} from "@/assets/icon/solid"
import {setClipboardText} from "@/utils/clipboard"

const LogCharts = React.lazy(() => import("./LogCharts/LogCharts"))
const WordCloudCharts = React.lazy(() => import("./LogCharts/WordCloudCharts"))
export interface YakitLogViewersProp {
    data: ExecResultLog[]
    finished?: boolean
    onlyTime?: boolean
}

export const YakitLogViewers = React.memo((props: YakitLogViewersProp) => {
    return (
        <Timeline pending={!props.finished} reverse={true}>
            {(props.data || []).map((item, index) => (
                <Timeline.Item key={`${item.timestamp}-${item.level}-${item.data}-${index}`} color={LogLevelToCode(item.level)}>
                    <YakitLogFormatter data={item.data} level={item.level} timestamp={item.timestamp} />
                </Timeline.Item>
            ))}
        </Timeline>
    )
})

export interface YakitLogFormatterProp {
    level: string
    data: string | any
    timestamp: number
    isCollapsed?: boolean
    showTime?: boolean
}

export const YakitLogFormatter: React.FC<YakitLogFormatterProp> = React.memo((props) => {
    const {level, timestamp, data, showTime = true} = props
    const renderContent = useMemoizedFn(() => {
        switch (level) {
            case "file":
                try {
                    const obj = JSON.parse(data) as {
                        title: string
                        description: string
                        path: string
                        is_dir: boolean
                        is_existed: boolean
                        file_size: string
                        dir: string
                    }
                    return <FileLogShow {...obj} timestamp={timestamp} showTime={showTime} />
                } catch (e) {
                    return (
                        <div style={{height: 150}}>
                            <AutoCard style={{padding: 0}} bodyStyle={{padding: 0}}>
                                <YakEditor readOnly={true} type={"http"} value={data} />
                            </AutoCard>
                        </div>
                    )
                }
            case "json":
                return <JsonLogShow {...props} />
            case "markdown":
                return <MarkdownLogShow {...props} />
            case "text":
            case "code":
                return <EditorLogShow {...props} />
            case "json-table":
                try {
                    let obj: {head: string[]; data: string[][]} = JSON.parse(data)
                    return (
                        <Space direction={"vertical"} style={{width: "100%"}}>
                            {showTime && <div className={styles["log-time"]}>{formatTime(timestamp)}</div>}
                            <Card
                                size={"small"}
                                title={<YakitTag color='success'>直接结果(表格)</YakitTag>}
                                extra={
                                    <YakitButton
                                        type='outline2'
                                        onClick={(e) =>
                                            showYakitModal({
                                                title: "JSON 数据",
                                                content: <>{JSON.stringify(obj)}</>,
                                                bodyStyle: {padding: 24},
                                                footer: null
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
                                            <Col key={i} span={24.0 / obj.head.length}>
                                                <div style={{border: "2px"}}>{i}</div>
                                            </Col>
                                        ))}
                                        <Divider style={{marginTop: 4, marginBottom: 4}} />
                                    </Row>
                                )}
                                {(obj.data || []).length > 0 && (
                                    <>
                                        {obj.data.map((i, index) => (
                                            <Row key={index}>
                                                {(i || []).map((element) => {
                                                    return (
                                                        <Col key={element} span={24.0 / i.length}>
                                                            {element}
                                                        </Col>
                                                    )
                                                })}
                                            </Row>
                                        ))}
                                    </>
                                )}
                            </Card>
                        </Space>
                    )
                } catch (error) {
                    return <span className={styles["log-time"]}>{formatTime(timestamp)}</span>
                }
            case "json-httpflow-risk":
                try {
                    return <HTTPFlowRiskViewer risk={JSON.parse(data) as YakitHTTPFlowRisk} />
                } catch (e) {
                    return <span className={styles["log-time"]}>{formatTime(timestamp)}</span>
                }
            case "json-graph":
                return <GraphLogShow {...props} />
            default:
                return (
                    <div className={styles["log-info"]}>
                        {showTime && <span className={styles["log-time"]}>{formatTime(timestamp)}</span>}
                        <span style={{margin: "0 4px"}}>·</span>
                        <span style={{whiteSpace: "pre-wrap"}}>{data}</span>
                    </div>
                )
        }
    })
    return renderContent()
})

interface MarkdownLogShowProps extends YakitLogFormatterProp {}
const MarkdownLogShow: React.FC<MarkdownLogShowProps> = React.memo((props) => {
    const {timestamp, data, showTime = true} = props
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
            {showTime && <div className={styles["md-heard"]}>{formatTime(timestamp)}</div>}
            <div
                className={classNames(styles["md-content"], {
                    [styles["md-content-expand"]]: expand
                })}
                ref={markdownLogBodyRef}
            >
                <MDEditor.Markdown source={data} />
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
    showTime: boolean
}
const FileLogShow: React.FC<FileLogShowProps> = React.memo((props) => {
    const {title, is_dir, is_existed, file_size, description, path, timestamp, showTime = true} = props
    const [expand, setExpand] = useState<boolean>(true)
    const onCopy = useMemoizedFn(() => {
        setClipboardText(path)
    })
    const onOpen = useMemoizedFn(() => {
        openABSFileLocated(path)
    })
    const onExpand = useMemoizedFn(() => {
        setExpand(!expand)
    })
    return (
        <div className={styles["file-body"]}>
            {showTime && <div className={styles["file-heard"]}>{formatTime(timestamp)}</div>}
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
    const {timestamp, data, showTime = true} = props
    return (
        <div className={styles["json-body"]}>
            {showTime && <div className={styles["json-heard"]}>{formatTime(timestamp)}</div>}
            <pre className={styles["json-content"]}>{data}</pre>
        </div>
    )
})
interface EditorLogShowProps extends YakitLogFormatterProp {}
export const EditorLogShow: React.FC<EditorLogShowProps> = React.memo((props) => {
    const {level, timestamp, data, showTime = true} = props

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
            {showTime && <div className={styles["editor-heard"]}>{formatTime(timestamp)}</div>}

            <div className={classNames(styles["editor-content"])}>
                <div className={styles["editor-content-title"]}>
                    <div>{level}</div>
                    <div className={styles["editor-content-extra"]}>
                        <div className={styles["time"]}>
                            <SolidCalendarIcon />
                            <span>{formatTimestamp(timestamp)}</span>
                        </div>
                        <Divider type='vertical' style={{margin: "0 8px"}} />
                        <YakitButton type='text2' icon={<OutlineArrowsexpandIcon />} onClick={onExpand} />
                    </div>
                </div>
                <div className={styles["editor"]}>
                    <YakitEditor type={"plaintext"} value={data} />
                </div>
            </div>
        </div>
    )
})

interface GraphLogShowProps extends YakitLogFormatterProp {}

const GraphLogShow: React.FC<GraphLogShowProps> = React.memo((props) => {
    const {data, timestamp, showTime = true} = props

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
            case "line":
            case "pie":
                return <LogCharts type={graphData.type} graphData={graphData} />
            case "wordcloud":
                return <WordCloudCharts graphData={graphData} />
            default:
                return <div>{props.data}</div>
        }
    })

    return (
        <div className={styles["graph-body"]}>
            {showTime && <div className={styles["graph-heard"]}>{formatTime(timestamp)}</div>}
            <div className={styles["graph-content"]}>
                <div className={styles["graph-content-title"]}>
                    <div>{graphData.name}</div>
                    <div className={styles["time"]}>
                        <SolidCalendarIcon />
                        <span>{formatTimestamp(timestamp)}</span>
                    </div>
                </div>

                <React.Suspense>{renderCharts()}</React.Suspense>
            </div>
        </div>
    )
})
