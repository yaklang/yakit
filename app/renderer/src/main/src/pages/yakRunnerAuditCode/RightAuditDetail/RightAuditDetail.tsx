import React, {useEffect, useMemo, useRef, useState, WheelEvent} from "react"
import classNames from "classnames"
import styles from "./RightAuditDetail.module.scss"
import {useMemoizedFn, useThrottleFn, useUpdate, useUpdateEffect} from "ahooks"
import {StringToUint8Array} from "@/utils/str"
import {getNameByPath, loadAuditFromYakURLRaw} from "../utils"
import {
    OutlineCollectionIcon,
    OutlineHandIcon,
    OutlineXIcon,
    OutlineZoominIcon,
    OutlineZoomoutIcon
} from "@/assets/icon/outline"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {Tooltip} from "antd"
import {instance} from "@viz-js/viz"
import {failed} from "@/utils/notification"
import emiter from "@/utils/eventBus/eventBus"
import {QuestionMarkCircleIcon} from "@/assets/newIcon"
import {clearMapGraphInfoDetail, getMapGraphInfoDetail, setMapGraphInfoDetail} from "./GraphInfoMap"
import {CollapseList} from "@/pages/yakRunner/CollapseList/CollapseList"
import {AuditEmiterYakUrlProps, OpenFileByPathProps} from "../YakRunnerAuditCodeType"
import {v4 as uuidv4} from "uuid"
import {JumpToAuditEditorProps} from "../BottomEditorDetails/BottomEditorDetailsType"
import {YakCodemirror} from "@/components/yakCodemirror/YakCodemirror"
import {clearMapResultDetail, getMapResultDetail, setMapResultDetail} from "./ResultMap"
import {Selection} from "../RunnerTabs/RunnerTabsType"

export interface JumpSourceDataProps {
    title: string
    node_id: string
    auditRightParams: AuditEmiterYakUrlProps
}

// 跳转详情
export const onJumpRunnerFile = async (
    data: GraphInfoProps,
    jumpData?: {
        title: string
        auditRightParams: AuditEmiterYakUrlProps
    }
) => {
    const {code_range, node_id} = data
    const {url, start_line, start_column, end_line, end_column} = code_range
    const name = await getNameByPath(url)
    const highLightRange: Selection = {
        startLineNumber: start_line,
        startColumn: start_column,
        endLineNumber: end_line,
        endColumn: end_column
    }

    // 携带跳转项信息
    if (jumpData) {
        highLightRange.source = {
            ...jumpData,
            node_id
        }
    }
    const OpenFileByPathParams: OpenFileByPathProps = {
        params: {
            path: url,
            name,
            highLightRange
        }
    }
    // 定位文件树
    emiter.emit("onCodeAuditScrollToFileTree", url)
    // 打开文件
    emiter.emit("onCodeAuditOpenFileByPath", JSON.stringify(OpenFileByPathParams))
    // 纯跳转行号
    setTimeout(() => {
        const obj: JumpToAuditEditorProps = {
            selections: highLightRange,
            path: url,
            isSelect: false
        }
        emiter.emit("onCodeAuditJumpEditorDetail", JSON.stringify(obj))
    }, 100)
}

interface AuditResultItemProps {
    onDetail: (data: GraphInfoProps) => void
    nodeId?: string
    data: GraphInfoProps[]
    title: string
    resultKey?: string | string[]
    setResultKey: (v: string | string[]) => void
}

export const AuditResultItem: React.FC<AuditResultItemProps> = (props) => {
    const {onDetail, nodeId, data, title, resultKey, setResultKey} = props

    const titleRender = (info: GraphInfoProps) => {
        const {ir_code, code_range, node_id} = info
        const lastSlashIndex = code_range.url.lastIndexOf("/")
        const fileName = code_range.url.substring(lastSlashIndex + 1)
        return (
            <div className={styles["result-render"]}>
                <div className={classNames(styles["title"], "yakit-single-line-ellipsis")}>{ir_code}</div>
                <Tooltip placement='topLeft' title={`${code_range.url}:${code_range.start_line}`}>
                    <div
                        className={classNames(styles["url-box"], "yakit-single-line-ellipsis", {
                            [styles["active-url-box"]]: node_id === nodeId
                        })}
                        onClick={(e) => {
                            e.stopPropagation()
                            emiter.emit("onCodeAuditScrollToFileTree", code_range.url)
                            onDetail(info)
                        }}
                    >
                        {fileName}:{code_range.start_line}
                    </div>
                </Tooltip>
            </div>
        )
    }

    const renderItem = (info: GraphInfoProps) => {
        const filename = info.code_range.url.split("/").pop()
        const {start_line, end_line, source_code_line, start_column, end_column} = info.code_range
        return (
            <YakCodemirror
                readOnly={true}
                fileName={filename}
                value={info.source_code}
                firstLineNumber={source_code_line}
                highLight={{
                    from: {line: start_line - source_code_line, ch: start_column}, // 开始位置
                    to: {line: end_line - source_code_line, ch: end_column} // 结束位置
                }}
            />
        )
        // return <div className={styles["ir-code-box"]}>{info.source_code}</div>
    }

    return (
        <div className={styles["audit-result-item"]}>
            <CollapseList
                type='sideBar'
                panelKey={title}
                list={data}
                titleRender={titleRender}
                renderItem={renderItem}
                collapseProps={{
                    activeKey: resultKey,
                    onChange: (v) => {
                        setResultKey(v)
                    }
                }}
            />
        </div>
    )
}

interface AuditResultBoxProps {
    nodeId?: string
    graphLine?: string[][]
    message: string
    activeKey?: string | string[]
    setActiveKey: (v: string | string[]) => void
    auditRightParams: AuditEmiterYakUrlProps
}

interface InitDataProps {
    title: string
    children: GraphInfoProps[]
    nodeId?: string
}

export const AuditResultBox: React.FC<AuditResultBoxProps> = (props) => {
    const {nodeId, graphLine, message, activeKey, setActiveKey, auditRightParams} = props
    const [resultKey, setResultKey] = useState<string | string[]>()

    const onExpendRightPathFun = useMemoizedFn((value:string)=>{
        try {
            const data: JumpSourceDataProps = JSON.parse(value)
            const index = getMapResultDetail(data.title).findIndex((item)=>item.node_id === data.node_id)
            setActiveKey([data.title])
            setResultKey([`${data.title}-${index}`])
        } catch (error) {
            
        }
    })

    useEffect(()=>{
        // 打开编译右侧详情
        emiter.on("onExpendRightPath", onExpendRightPathFun)
        return () => {
            emiter.off("onExpendRightPath", onExpendRightPathFun)
        }
    },[])

    useUpdateEffect(() => {
        if (activeKey === undefined) {
            setResultKey(undefined)
        }
    }, [activeKey])

    const getChildren = useMemoizedFn((data: string[]) => {
        const children = data
            .map((itemIn) => {
                const detail = getMapGraphInfoDetail(itemIn)
                if (detail) {
                    return {
                        ...detail
                    }
                }
                return
            })
            .filter((item) => item !== undefined) as GraphInfoProps[]
        return children
    })

    const firstSource = useRef<JumpSourceDataProps>()
    const initData: InitDataProps[] = useMemo(() => {
        setResultKey(undefined)
        let newData: InitDataProps[] = []
        if (graphLine) {
            clearMapResultDetail()
            newData = graphLine.map((item, index) => {
                let title = `路径${index + 1}`
                let children = getChildren(item)
                // 将第一项默认值给入
                if (index === 0 && children.length > 0) {
                    firstSource.current = {
                        title,
                        node_id: children[0].node_id,
                        auditRightParams
                    }
                }
                setMapResultDetail(title, children)
                return {
                    title,
                    children
                }
            })
        }

        return newData
    }, [graphLine])

    useUpdateEffect(() => {
        if (!firstSource.current) return
        // 此处需通知runnerTab页更新Widget
        setTimeout(() => {
            emiter.emit("onInitWidget", JSON.stringify(firstSource.current))
        }, 200)
    }, [initData])

    const titleRender = (info: InitDataProps) => {
        return <div className={styles["title-render"]}>{info.title}</div>
    }

    const renderItem = (info: InitDataProps) => {
        return (
            <AuditResultItem
                data={info.children}
                onDetail={(data) => onJumpRunnerFile(data, {title: info.title, auditRightParams})}
                title={info.title}
                nodeId={nodeId}
                resultKey={resultKey}
                setResultKey={setResultKey}
            />
        )
    }

    return (
        <div className={styles["audit-result-box"]}>
            {message && <div className={classNames(styles["message-box"])}>{message}</div>}
            {/* 以下为折叠面板 */}
            <CollapseList
                type='output'
                onlyKey='title'
                list={initData}
                titleRender={titleRender}
                renderItem={renderItem}
                collapseProps={{
                    activeKey,
                    onChange: (v) => {
                        setActiveKey(v)
                    }
                }}
            />
        </div>
    )
}

interface FlowChartBoxProps {
    graph?: string
    refresh: boolean
    node_id?: string
}

export const FlowChartBox: React.FC<FlowChartBoxProps> = (props) => {
    const {graph, refresh, node_id} = props
    const svgBoxRef = useRef<HTMLDivElement>(null)
    const svgRef = useRef<any>(null)
    const [nodeId, setNodeId] = useState<string>()
    const styleNodeRef = useRef<string>()
    const idBoxRef = useRef<string>(`auditCodeFlowChart-${uuidv4()}`)

    const onElementStyle = useMemoizedFn((id, stroke, fill) => {
        // 获取 id 为 node 的元素
        const nodeElement = document.getElementById(id)

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
            const element = document.getElementById(idBoxRef.current)
            if (element) {
                const titles = element.getElementsByTagName("title")
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

    const onRefreshAuditDetailFun = useMemoizedFn((newNodeId?:string) => {
        if(newNodeId && svgBoxRef.current){
            // 此处根据node_id染色
            // 查找 title 为 n6 的元素
            const targetElement = Array.from(svgBoxRef.current.getElementsByTagName('title')).find(el => el.innerHTML === newNodeId);
            if (targetElement) {
                // 获取父元素的 id
                const parentId = targetElement?.parentElement?.id;
                onChangeSvgStyle(parentId)
            }
        }
        setNodeId(newNodeId)
    })

    useEffect(() => {
        // 打开编译右侧详情
        emiter.on("onCodeAuditRefreshAuditDetail", onRefreshAuditDetailFun)
        return () => {
            emiter.off("onCodeAuditRefreshAuditDetail", onRefreshAuditDetailFun)
        }
    }, [])

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
        if (nodeId) {
            const result = getMapGraphInfoDetail(nodeId)
            return result
        }
    }, [refresh, nodeId])

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

    const handleWheel = useMemoizedFn((event: WheelEvent<HTMLDivElement>) => {
        if (event.deltaY > 0) {
            // 最小缩放比例为0.2
            setScale((prevScale) => Math.max(0.2, prevScale - 0.2))
        } else if (event.deltaY < 0) {
            setScale((prevScale) => prevScale + 0.2)
        }
    })

    return (
        <div className={styles["flow-chart-box"]} id={idBoxRef.current}>
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
                style={{cursor: "grab"}}
                className={styles["svg-box"]}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
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
                                    onClick={() => onJumpRunnerFile(contentInfo)}
                                >
                                    {contentInfo.code_range.url}
                                </div>
                            </Tooltip>
                        )}
                        {contentInfo && (
                            <YakCodemirror
                                readOnly={true}
                                fileName={contentInfo?.code_range.url.split("/").pop()}
                                value={contentInfo?.ir_code || ""}
                                firstLineNumber={contentInfo.code_range.source_code_line}
                                highLight={{
                                    from: {
                                        line:
                                            contentInfo.code_range.start_line - contentInfo.code_range.source_code_line,
                                        ch: contentInfo.code_range.start_column
                                    }, // 开始位置
                                    to: {
                                        line: contentInfo.code_range.end_line - contentInfo.code_range.source_code_line,
                                        ch: contentInfo.code_range.end_column
                                    } // 结束位置
                                }}
                            />
                        )}
                        {/* {contentInfo && <div className={styles["ir-code-box"]}>{contentInfo?.ir_code}</div>} */}
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
    // 代码段启示行数
    source_code_line: number
}

export interface GraphInfoProps {
    code_range: CodeRangeProps
    source_code: string
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
    const [graphLine, setGraphLine] = useState<string[][]>()
    const [message, setMessage] = useState<string>("")
    const [nodeId, setNodeId] = useState<string>()
    const [refresh, setRefresh] = useState<boolean>(false)
    const [activeKey, setActiveKey] = useState<string | string[]>()

    useEffect(() => {
        if (isShowAuditDetail && auditRightParams) {
            initData(auditRightParams)
        }
    }, [isShowAuditDetail, auditRightParams])

    const initData = useMemoizedFn(async (params: AuditEmiterYakUrlProps) => {
        try {
            clearMapGraphInfoDetail()
            const {Body, ...auditYakUrl} = params
            const body = Body ? StringToUint8Array(Body) : undefined
            const result = await loadAuditFromYakURLRaw(auditYakUrl, body)
            if (result && result.Resources.length > 0) {
                result.Resources[0].Extra.forEach((item) => {
                    if (item.Key === "graph") {
                        setGraph(item.Value)
                    }
                    if (item.Key === "graph_info") {
                        try {
                            let graph_info: GraphInfoProps[] = JSON.parse(item.Value)
                            graph_info.forEach((item) => {
                                setMapGraphInfoDetail(item.node_id, item)
                            })
                        } catch (error) {}
                    }
                    if (item.Key === "message") {
                        setMessage(item.Value)
                    }
                    if (item.Key === "node_id") {
                        setNodeId(item.Value)
                    }
                    if (item.Key === "graph_line") {
                        try {
                            let graph_info: string[][] = JSON.parse(item.Value)
                            // 当数量小于等于10条时默认第一级展开
                            if (graph_info.length > 0 && graph_info.length <= 10) {
                                const expendKey: string[] = graph_info.map((item, index) => `路径${index + 1}`)
                                setActiveKey(expendKey)
                            } else {
                                setActiveKey(undefined)
                            }
                            setGraphLine(graph_info)
                        } catch (error) {
                            setGraphLine(undefined)
                            setActiveKey(undefined)
                        }
                    }
                })
                setRefresh(!refresh)
            }
        } catch (error) {}
    })

    return (
        <div className={classNames(styles["right-audit-detail"])}>
            <div className={styles["header"]}>
                <div className={styles["relative-box"]}>
                    <div className={styles["absolute-box"]}>
                        <div className={styles["title"]}>审计结果</div>
                        <div className={styles["extra"]}>
                            <Tooltip title='一键收起'>
                                <YakitButton
                                    type='text2'
                                    icon={<OutlineCollectionIcon />}
                                    disabled={(graphLine || []).length === 0}
                                    onClick={() => {
                                        setActiveKey(undefined)
                                    }}
                                />
                            </Tooltip>
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
                        <>
                            {auditRightParams && (
                                <AuditResultBox
                                    activeKey={activeKey}
                                    setActiveKey={setActiveKey}
                                    graphLine={graphLine}
                                    message={message}
                                    nodeId={nodeId}
                                    auditRightParams={auditRightParams}
                                />
                            )}
                        </>
                    }
                    secondNode={<FlowChartBox graph={graph} refresh={refresh} node_id={nodeId} />}
                />
            </div>
        </div>
    )
}
