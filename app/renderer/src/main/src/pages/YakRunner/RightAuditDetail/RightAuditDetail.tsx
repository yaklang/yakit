import React, {useEffect, useMemo, useRef, useState} from "react"
import classNames from "classnames"
import styles from "./RightAuditDetail.module.scss"
import {useMemoizedFn, useThrottleFn, useUpdate, useUpdateEffect} from "ahooks"
import {AuditEmiterYakUrlProps, OpenFileByPathProps} from "../YakRunnerType"
import {StringToUint8Array} from "@/utils/str"
import {getNameByPath, loadAuditFromYakURLRaw} from "../utils"
import {OutlineHandIcon, OutlineXIcon, OutlineZoominIcon, OutlineZoomoutIcon} from "@/assets/icon/outline"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {Tooltip} from "antd"
import {instance} from "@viz-js/viz"
import {failed} from "@/utils/notification"
import emiter from "@/utils/eventBus/eventBus"
import {JumpToEditorProps} from "../BottomEditorDetails/BottomEditorDetailsType"
import {QuestionMarkCircleIcon} from "@/assets/newIcon"
interface FlowChartBoxProps {
    onDetail: (data: CodeRangeProps) => void
    graph?: string
    graphInfo?: GraphInfoProps[]
    node_id?: string
}

export const FlowChartBox: React.FC<FlowChartBoxProps> = (props) => {
    const {onDetail, graph, graphInfo, node_id} = props
    const svgBoxRef = useRef<HTMLDivElement>(null)
    const svgRef = useRef<any>(null)
    const [nodeId, setNodeId] = useState<string>()
    const styleNodeRef = useRef<string>()

    const onElementStyle = useMemoizedFn((id, stroke, fill) => {
        // 获取 id 为 node 的元素
        const nodeElement = document.getElementById(id)
        console.log("ooo", nodeElement)

        if (nodeElement) {
            // 查找该元素下的所有 ellipse 标签
            const ellipses = nodeElement.getElementsByTagName("ellipse")

            // 遍历所有找到的 ellipse 标签，并添加样式
            for (let i = 0; i < ellipses.length; i++) {
                ellipses[i].style.stroke = stroke
                ellipses[i].style.fill = fill
            }
        }
    })

    // 初始默认样式
    const onInitSvgStyle = useMemoizedFn((id?: string) => {
        if (id) {
            const titles = document.getElementsByTagName("title")
            // 遍历所有 <title> 元素
            for (let i = 0; i < titles.length; i++) {
                if (titles[i].textContent === "n1") {
                    // 获取匹配的 <title> 元素的父元素
                    const parentElement = titles[i].parentElement
                    if (parentElement) {
                        // 新增class用于屏蔽通用hover样式
                        parentElement.classList.add("node-main")
                        // 查找该元素下的所有 ellipse 标签
                        const ellipses = parentElement.getElementsByTagName("ellipse")
                        // 遍历所有找到的 ellipse 标签，并添加样式
                        for (let i = 0; i < ellipses.length; i++) {
                            ellipses[i].style.stroke = "#8863F7"
                            ellipses[i].style.fill = "rgba(136, 99, 247, 0.10)"
                        }
                    }
                    break // 找到匹配的元素后停止遍历
                }
            }
        }
    })

    // 更改SVG样式
    const onChangeSvgStyle = useMemoizedFn((id?: string) => {
        if (styleNodeRef.current) {
            onElementStyle(styleNodeRef.current, "black", "#ffffff")
        }
        if (id) {
            styleNodeRef.current = id
            onElementStyle(styleNodeRef.current, "#f28b44", "#fbe7d9")
        }
    })

    const onEventListener = useMemoizedFn((event: any) => {
        const target = event.target
        if (target && target?.tagName === "text" && (target.parentNode?.id || "").startsWith("node")) {
            // target.parentNode.id
            const titleElement = target.parentNode.querySelector("title")
            if (titleElement) {
                const titleText = titleElement.textContent
                console.log("click---", titleText, node_id)
                // 本身节点不用点击展开详情
                if (titleText === node_id) return
                if (titleText === nodeId) {
                    setNodeId(undefined)
                    onChangeSvgStyle()
                } else {
                    setNodeId(titleText)
                    onChangeSvgStyle(target.parentNode.id)
                }
            } else {
                failed("获取节点信息失败")
            }
        }
    })

    useEffect(() => {
        if (!graph) return
        instance().then((viz) => {
            const svg = viz.renderSVGElement(graph, {})
            svgRef.current = svg

            svg.addEventListener("click", onEventListener)

            if (svgBoxRef.current) {
                // 清空所有子元素
                while (svgBoxRef.current.firstChild) {
                    svgBoxRef.current.removeChild(svgBoxRef.current.firstChild)
                }
                // 新增svg子元素
                svgBoxRef.current.appendChild(svg)
                onInitSvgStyle(node_id)
            }
        })
    }, [graph])

    const contentInfo = useMemo(() => {
        if (graphInfo && nodeId) {
            const arr = graphInfo.filter((item) => item.node_id === nodeId)
            if (arr.length > 0) {
                return arr[0]
            }
        }
    }, [graphInfo, nodeId])

    const firstOffsetRef = useRef<{x: number; y: number}>()
    const [scale, setScale] = useState(1) // 初始缩放比例为1
    const [dragging, setDragging] = useState(false) // 是否正在拖动
    const [offset, setOffset] = useState({x: 0, y: 0}) // 鼠标拖动的偏移量

    // 放大
    const handleZoomIn = useMemoizedFn(() => {
        setScale((prevScale) => prevScale + 0.2) // 增加0.2的缩放比例
    })

    // 缩小
    const handleZoomOut = useMemoizedFn(() => {
        setScale((prevScale) => Math.max(0.2, prevScale - 0.2)) // 最小缩放比例为0.2
    })

    useUpdateEffect(() => {
        if (svgRef.current && svgBoxRef.current) {
            const svg = svgRef.current as SVGSVGElement
            svg.style.transform = `scale(${scale})`
            svgBoxRef.current.style.cursor = dragging ? "grabbing" : "grab"
            // console.log("uuu", offset)
            svg.style.position = "relative"
            svg.style.left = `${offset.x}px`
            svg.style.top = `${offset.y}px`
        }
    }, [scale, dragging, offset])

    // 处理鼠标按下事件
    const handleMouseDown = (e) => {
        setDragging(true)
        firstOffsetRef.current = {
            x: e.nativeEvent.offsetX,
            y: e.nativeEvent.offsetY
        }
    }

    // 处理鼠标抬起事件
    const handleMouseUp = () => {
        setDragging(false)
        firstOffsetRef.current = undefined
    }

    // 处理鼠标移动事件
    const handleMouseMove = useThrottleFn(
        (e) => {
            if (dragging && firstOffsetRef.current) {
                const newOffsetX = e.nativeEvent.offsetX
                const newOffsetY = e.nativeEvent.offsetY
                const firstX = firstOffsetRef.current.x
                const firstY = firstOffsetRef.current.y
                setOffset((prevOffset) => ({
                    x: prevOffset.x + (newOffsetX - firstX),
                    y: prevOffset.y + (newOffsetY - firstY)
                }))
            }
        },
        {wait: 200}
    ).run

    return (
        <div className={styles["flow-chart-box"]}>
            <div className={styles["header"]}>
                <div className={styles["relative-box"]}>
                    <div className={styles["absolute-box"]}>
                        <div className={styles["title"]}>
                            Syntax Flow 审计过程
                            <Tooltip
                                title={
                                    <div>
                                        <div>黑色箭头代表数据流分析路径</div>
                                        <div>红色箭头代表跨数据流分析路径</div>
                                        <div>紫色节点代表审计结果</div>
                                    </div>
                                }
                            >
                                <QuestionMarkCircleIcon />
                            </Tooltip>
                        </div>
                        <div className={styles["extra"]}>
                            <YakitButton type='text2' icon={<OutlineZoominIcon />} onClick={handleZoomIn} />
                            <YakitButton type='text2' icon={<OutlineZoomoutIcon />} onClick={handleZoomOut} />
                        </div>
                    </div>
                </div>
            </div>
            <div
                style={{cursor: "grab"} }
                className={styles["svg-box"]}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                ref={svgBoxRef}
            />
            {nodeId && (
                <div className={styles["root-detail"]}>
                    <div className={styles["header"]}>
                        <div className={styles["title"]}>节点信息</div>
                        <div className={styles["extra"]}>
                            <YakitButton
                                type='text2'
                                icon={<OutlineXIcon />}
                                onClick={() => {
                                    setNodeId(undefined)
                                    onChangeSvgStyle()
                                }}
                            />
                        </div>
                    </div>
                    <div className={styles["content"]}>
                        {contentInfo && (
                            <Tooltip placement='topLeft' title={contentInfo.code_range.url}>
                                <div
                                    className={classNames(styles["url-box"], "yakit-single-line-ellipsis")}
                                    onClick={() => onDetail(contentInfo.code_range)}
                                >
                                    {contentInfo.code_range.url}
                                </div>
                            </Tooltip>
                        )}
                        {contentInfo && <div className={styles["ir-code-box"]}>{contentInfo?.ir_code}</div>}
                    </div>
                </div>
            )}
        </div>
    )
}

export interface CodeRangeProps {
    url: string
    start_column: number
    start_line: number
    end_column: number
    end_line: number
}

interface GraphInfoProps {
    code_range: CodeRangeProps
    node_id: string
    ir_code: string
}

interface RightSideBarProps {
    auditRightParams: AuditEmiterYakUrlProps | undefined
    isShowAuditDetail: boolean
    setShowAuditDetail: (v: boolean) => void
}

export const RightAuditDetail: React.FC<RightSideBarProps> = (props) => {
    const {auditRightParams, isShowAuditDetail, setShowAuditDetail} = props
    const [graph, setGraph] = useState<string>()
    const [graphInfo, setGraphInfo] = useState<GraphInfoProps[]>()
    const [message, setMessage] = useState<string>("")
    const [nodeId, setNodeId] = useState<string>()

    useEffect(() => {
        if (isShowAuditDetail && auditRightParams) {
            initData(auditRightParams)
        }
    }, [isShowAuditDetail, auditRightParams])

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
                if (item.Key === "message") {
                    setMessage(item.Value)
                }
                if (item.Key === "node_id") {
                    setNodeId(item.Value)
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

    // 跳转详情
    const onDetail = useMemoizedFn(async (data: CodeRangeProps) => {
        const {url, start_line, start_column, end_line, end_column} = data
        const name = await getNameByPath(url)
        const OpenFileByPathParams: OpenFileByPathProps = {
            params: {
                path: url,
                name
            }
        }
        emiter.emit("onOpenFileByPath", JSON.stringify(OpenFileByPathParams))
        setTimeout(() => {
            const obj: JumpToEditorProps = {
                selections: {
                    startLineNumber: start_line,
                    startColumn: start_column,
                    endLineNumber: end_line,
                    endColumn: end_column
                },
                id: url
            }
            emiter.emit("onJumpEditorDetail", JSON.stringify(obj))
        }, 100)
    })

    return (
        <div className={classNames(styles["right-audit-detail"])}>
            <div className={styles["header"]}>
                <div className={styles["relative-box"]}>
                    <div className={styles["absolute-box"]}>
                        <div className={styles["title"]}>审计结果</div>
                        <div className={styles["extra"]}>
                            <YakitButton
                                type='text2'
                                icon={<OutlineXIcon />}
                                onClick={() => {
                                    setShowAuditDetail(false)
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
            <div className={styles["main"]}>
                <YakitResizeBox
                    isVer={true}
                    secondRatio={!isShowAuditDetail ? "0px" : undefined}
                    lineDirection='bottom'
                    firstRatio={"200px"}
                    firstMinSize={140}
                    firstNodeStyle={{padding: 0}}
                    secondNodeStyle={{padding: 0}}
                    secondMinSize={350}
                    firstNode={
                        <div className={styles["content"]}>
                            {contentInfo && (
                                <Tooltip placement='topLeft' title={contentInfo.code_range.url}>
                                    <div
                                        className={classNames(styles["url-box"], "yakit-single-line-ellipsis")}
                                        onClick={() => onDetail(contentInfo.code_range)}
                                    >
                                        {contentInfo.code_range.url}
                                    </div>
                                </Tooltip>
                            )}
                            {message && <div className={styles["message-box"]}>{message}</div>}
                            {contentInfo && <div className={styles["ir-code-box"]}>{contentInfo?.ir_code}</div>}
                        </div>
                    }
                    secondNode={
                        <FlowChartBox onDetail={onDetail} graph={graph} graphInfo={graphInfo} node_id={nodeId} />
                    }
                />
            </div>
        </div>
    )
}
