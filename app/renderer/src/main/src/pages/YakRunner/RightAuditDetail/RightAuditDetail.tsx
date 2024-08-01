import React, {useEffect, useMemo, useRef, useState} from "react"
import classNames from "classnames"
import styles from "./RightAuditDetail.module.scss"
import {useMemoizedFn, useThrottleFn, useUpdate, useUpdateEffect} from "ahooks"
import {AuditEmiterYakUrlProps} from "../YakRunnerType"
import {StringToUint8Array} from "@/utils/str"
import {loadAuditFromYakURLRaw} from "../utils"
import {OutlineHandIcon, OutlineXIcon, OutlineZoominIcon, OutlineZoomoutIcon} from "@/assets/icon/outline"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {Tooltip} from "antd"
import {instance} from "@viz-js/viz"
interface FlowChartBoxProps {}

export const FlowChartBox: React.FC<FlowChartBoxProps> = (props) => {
    const svgBoxRef = useRef<HTMLDivElement>(null)
    const svgRef = useRef<any>(null)
    useEffect(() => {
        // 定义 DOT 描述的图形内容
        const dotContent = `
strict digraph {
    rankdir = "BT";
    n24 [label="DocumentBuilderFactory"];
    n29 [label="t183666: dbf=#183663.newInstance()"];
    n1 [label="ByteArrayInputStream"];
    n14 [label="#183633.parse"];
    n16 [label="t183633: doDocumentBuilder()"];
    n6 [label="#183620.getBytes"];
    n8 [label="xmlStr"];
    n18 [label="#183630.newDocumentBuilder"];
    n20 [label="t183630: #183627.newInstance()"];
    n22 [label="#183627.newInstance"];
    n26 [label="#183663.newInstance"];
    n2 [label="t183640: stream=ByteArrayInputStream(ByteArrayInputStream,t183639)"];
    n4 [label="t183639: #183620.getBytes(t183638)"];
    n7 [label="t183638: \\"UTF-8\\""];
    n20 -> n18 [label="step[10]: search: *Builder", color="red", fontcolor="red", penwidth="3.0"];
    n24 -> n26 [label="step[2]: search newInstance", color="red", fontcolor="red", penwidth="3.0", label="step[2]: search newInstance"];
    n22 -> n29 [label="step[3]: call", color="red", fontcolor="red", penwidth="3.0"];
    n2 -> n1 [label=""];
    n2 -> n1 [label=""];
    n18 -> n16 [label="step[11]: call", color="red", fontcolor="red", penwidth="3.0"];
    n24 -> n22 [label="step[2]: search newInstance", color="red", fontcolor="red", penwidth="3.0", label="step[2]: search newInstance"];
    n26 -> n20 [label="step[3]: call", color="red", fontcolor="red", penwidth="3.0"];
    n26 -> n29 [label="step[3]: call", color="red", fontcolor="red", penwidth="3.0"];
    n2 -> n4 [label=""];
    n4 -> n6 [label=""];
    n4 -> n7 [label=""];
    n16 -> n14 [label="step[12]: search parse", color="red", fontcolor="red", penwidth="3.0"];
    n22 -> n20 [label="step[3]: call", color="red", fontcolor="red", penwidth="3.0"];
    n6 -> n8 [label=""];
    n4 -> n8 [label=""];
    n14 -> n2 [label="step[13]: all-actual-args", color="red", fontcolor="red", penwidth="3.0"];
}
`
        instance().then((viz) => {
            const svg = viz.renderSVGElement(dotContent, {})
            svgRef.current = svg

            svg.addEventListener("click",(event:any)=>{
                const target = event.target;
                if(target && target?.tagName === "text" && (target.parentNode?.id||"").startsWith("node")){
                    const id = target.parentNode.id
                    console.log("click---",id);
                }
            })

            if (svgBoxRef.current) {
                // 清空所有子元素
                while (svgBoxRef.current.firstChild) {
                    svgBoxRef.current.removeChild(svgBoxRef.current.firstChild)
                }
                // 新增svg子元素
                svgBoxRef.current.appendChild(svg)
                console.log("ppp", svg)
            }
        })
    }, [])

    const firstOffsetRef = useRef<{x: number; y: number}>()
    const [scale, setScale] = useState(1) // 初始缩放比例为1
    const [dragging, setDragging] = useState(false) // 是否正在拖动
    const [offset, setOffset] = useState({x: 0, y: 0}) // 鼠标拖动的偏移量
    const [isAllowHand, setAllowHand] = useState<boolean>(false) //是否允许拖动

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
            if(isAllowHand){
                svgBoxRef.current.style.cursor = dragging ? "grabbing" : "grab"
            }
            // console.log("uuu", offset)
            svg.style.position = "relative"
            svg.style.left = `${offset.x}px`
            svg.style.top = `${offset.y}px`
        }
    }, [scale, dragging, offset])

    // 处理鼠标按下事件
    const handleMouseDown = (e) => {
        if (!isAllowHand) return
        setDragging(true)
        firstOffsetRef.current = {
            x: e.nativeEvent.offsetX,
            y: e.nativeEvent.offsetY
        }
    }

    // 处理鼠标抬起事件
    const handleMouseUp = () => {
        if (!isAllowHand) return
        setDragging(false)
        firstOffsetRef.current = undefined
    }

    // 处理鼠标移动事件
    const handleMouseMove = useThrottleFn(
        (e) => {
            if (!isAllowHand) return
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

    const handleHand = useMemoizedFn(() => {
        setAllowHand(!isAllowHand)
    })

    return (
        <div className={styles["flow-chart-box"]}>
            <div className={styles["header"]}>
                <div className={styles["relative-box"]}>
                    <div className={styles["absolute-box"]}>
                        <div className={styles["title"]}>Syntax Flow 审计过程</div>
                        <div className={styles["extra"]}>
                            <YakitButton
                                type={isAllowHand?"text":'text2'}
                                icon={<OutlineHandIcon />}
                                onClick={handleHand}
                            />
                            <YakitButton type='text2' icon={<OutlineZoominIcon />} onClick={handleZoomIn} />
                            <YakitButton type='text2' icon={<OutlineZoomoutIcon />} onClick={handleZoomOut} />
                        </div>
                    </div>
                </div>
            </div>
            <div
                style={isAllowHand?{cursor:"grab"}:{cursor:"unset"}}
                className={styles["svg-box"]}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                ref={svgBoxRef}
            />
        </div>
    )
}

interface CodeRangeProps {
    url: string
    start_column: number
    start_line: number
    end_column: number
    end_line: number
}

interface GraphInfoProps {
    code_range: CodeRangeProps
    node_id: number
    ir_code: string
}

interface RightSideBarProps {
    auditRightParams: AuditEmiterYakUrlProps | undefined
    isUnShowAuditDetail: boolean
}

export const RightAuditDetail: React.FC<RightSideBarProps> = (props) => {
    const {auditRightParams, isUnShowAuditDetail} = props
    const [graph, setGraph] = useState<string>()
    const [graphInfo, setGraphInfo] = useState<GraphInfoProps[]>()
    const [nodeId, setNodeId] = useState<number>()

    useEffect(() => {
        if (!isUnShowAuditDetail && auditRightParams) {
            initData(auditRightParams)
        }
    }, [isUnShowAuditDetail, auditRightParams])

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
                if (item.Key === "node_id") {
                    setNodeId(parseInt(item.Value + ""))
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
    return (
        <div className={classNames(styles["right-audit-detail"])}>
            <div className={styles["header"]}>
                <div className={styles["relative-box"]}>
                    <div className={styles["absolute-box"]}>
                        <div className={styles["title"]}>审计详情</div>
                        <div className={styles["extra"]}>
                            <YakitButton type='text2' icon={<OutlineXIcon />} onClick={() => {}} />
                        </div>
                    </div>
                </div>
            </div>
            <div className={styles["main"]}>
                <YakitResizeBox
                    isVer={true}
                    secondRatio={isUnShowAuditDetail ? "0px" : undefined}
                    lineDirection='bottom'
                    firstRatio={"200px"}
                    firstMinSize={140}
                    firstNodeStyle={{padding: 0}}
                    secondNodeStyle={{padding: 0}}
                    secondMinSize={300}
                    firstNode={
                        <div className={styles["content"]}>
                            {contentInfo && (
                                <Tooltip placement='topLeft' title={contentInfo.code_range.url}>
                                    <div className={classNames(styles["url-box"], "yakit-single-line-ellipsis")}>
                                        {contentInfo.code_range.url}
                                    </div>
                                </Tooltip>
                            )}
                            <div className={styles["message-box"]}>
                                bufio.NewReadWriter(i any, i2 any) (*bufio.ReadWriter, error)
                            </div>
                            {contentInfo && <div className={styles["ir-code-box"]}>{contentInfo?.ir_code}</div>}
                        </div>
                    }
                    secondNode={<FlowChartBox />}
                />
            </div>
        </div>
    )
}
