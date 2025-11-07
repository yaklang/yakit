import React, {FC, useRef, useState, useMemo, memo} from "react"
import ReactECharts from "echarts-for-react"
import * as echarts from "echarts"
import {GraphData} from "../utils"
import {getCssVar} from "@/utils/tool"
import {useTheme} from "@/hook/useTheme"

interface GraphChartProps {
    graphData: GraphData
    onNodeClick?: (id: string | null) => void
}

const GraphChart: FC<GraphChartProps> = ({graphData, onNodeClick}) => {
    const {theme} = useTheme()
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
    const chartRef = useRef<any>(null)

    const backgroundColor = getCssVar("--Colors-Use-Basic-Background")
    const textColor = getCssVar("--Colors-Use-Neutral-Text-3-Secondary")
    const lineTextColor = getCssVar("--Colors-Use-Neutral-Disable")
    const borderColor = getCssVar("--Colors-Use-Neutral-Text-4-Help-text")
    const selectedBg = getCssVar("--Colors-Use-Main-Primary")
    const tooltipBg = getCssVar("--Colors-Use-Neutral-Bg-Hover")
    const tooltipText = getCssVar("--Colors-Use-Neutral-Text-1-Title")

    const onEvents = {
        click: (params: any) => {
            const chart = chartRef.current?.getEchartsInstance()
            if (!chart) return

            if (params.data) {
                const clickedId = params.data.id
                const newSelectedId = selectedNodeId === clickedId ? null : clickedId

                setSelectedNodeId(newSelectedId)
                onNodeClick?.(newSelectedId)

                const updatedData = graphData.nodes.map((node: any) => ({
                    ...node,
                    itemStyle: {
                        borderColor: borderColor,
                        color: node.id === clickedId ? selectedBg : backgroundColor
                    }
                }))

                chart.setOption({series: [{data: updatedData}]})
            } else {
                setSelectedNodeId(null)
                onNodeClick?.(null)

                const resetData = graphData.nodes.map((node: any) => ({
                    ...node,
                    itemStyle: {
                        borderColor: borderColor,
                        color: backgroundColor
                    }
                }))

                chart.setOption({series: [{data: resetData}]})
            }
        }
    }

    const option = useMemo<echarts.EChartsOption>(
        () => ({
            tooltip: {},
            animation: true,
            series: [
                {
                    name: "Knowledge Graph",
                    type: "graph",
                    layout: "none",
                    data: graphData.nodes.map((node: any) => ({
                        ...node,
                        itemStyle: {
                            borderColor: borderColor,
                            color: node.id === selectedNodeId ? selectedBg : backgroundColor
                        }
                    })),
                    links: graphData.links,
                    roam: true,
                    tooltip: {
                        backgroundColor: tooltipBg,
                        borderColor: tooltipBg,
                        textStyle: {
                            color: tooltipText,
                            fontWeight: 400
                        },
                        formatter: (params: any) => {
                            const data = params.data || {}
                            const name = data.name ?? ""
                            const value = data.value ?? ""

                            return `
                                <div style="display:flex; flex-direction:column; gap:6px;">

                                    <!-- 行内容 -->
                                    <div style="display:flex; align-items:center; gap:6px;">

                                        <!-- 小圆点 -->
                                        <span style="
                                            width:8px;
                                            height:8px;
                                            display:inline-block;
                                            border-radius:50%;
                                            background:${getCssVar("--Colors-Use-Main-Primary")};
                                        "></span>

                                        <!-- 名称 -->
                                        <span style="color:${getCssVar(
                                            "--Colors-Use-Neutral-Text-1-Title"
                                        )}; font-size:13px;">
                                            ${name}
                                        </span>

                                        <!-- 数字 -->
                                        <span style="
                                            margin-left:auto;
                                            font-weight:600;
                                            font-size:13px;
                                            color:${getCssVar("--Colors-Use-Neutral-Text-1-Title")};
                                        ">
                                            ${value}
                                        </span>

                                    </div>

                                </div>
                            `
                        }
                    },
                    label: {
                        show: true,
                        position: "right",
                        fontSize: 12,
                        color: lineTextColor
                    },
                    force: {
                        repulsion: 200,
                        edgeLength: 100
                    },
                    edgeLabel: {show: false},
                    labelLayout: {hideOverlap: true},
                    scaleLimit: {min: 0.4, max: 2},
                    edgeSymbol: ["none", "arrow"],
                    edgeSymbolSize: [0, 10],
                    lineStyle: {
                        color: textColor,
                        curveness: 0.2,
                        width: 1
                    },
                    focusNodeAdjacency: true
                }
            ]
        }),
        [graphData, selectedNodeId, theme]
    )

    return (
        <ReactECharts
            ref={chartRef}
            option={option}
            notMerge={true}
            lazyUpdate={true}
            style={{height: "100%", width: "100%"}}
            onEvents={onEvents}
        />
    )
}

export default memo(GraphChart)
