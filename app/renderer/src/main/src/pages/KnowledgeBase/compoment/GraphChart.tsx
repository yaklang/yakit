import React, {FC, useRef, useState, useMemo, memo} from "react"
import ReactECharts from "echarts-for-react"
import type {EChartsOption, ECElementEvent, ECharts} from "echarts"
import {GraphData} from "../utils"
import {getCssVar} from "@/utils/tool"
import {useTheme} from "@/hook/useTheme"

interface GraphChartProps {
    graphData: GraphData
    onNodeClick?: (id: GraphNode | null) => void
}

/** 节点类型（根据你的 graphData.nodes 结构推断） */
interface GraphNode {
    id: string
    name: string
    value?: number
    x?: number
    y?: number
    itemStyle?: {
        borderColor?: string
        color?: string
    }
}

/** 链接类型（graphData.links） */
interface GraphLink {
    source: string
    target: string
}

const GraphChart: FC<GraphChartProps> = ({graphData, onNodeClick}) => {
    const {theme} = useTheme()
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

    /** ref 类型补齐 */
    const chartRef = useRef<ReactECharts | null>(null)

    const backgroundColor = getCssVar("--Colors-Use-Basic-Background")
    const textColor = getCssVar("--Colors-Use-Neutral-Text-3-Secondary")
    const lineTextColor = getCssVar("--Colors-Use-Neutral-Disable")
    const borderColor = getCssVar("--Colors-Use-Neutral-Text-4-Help-text")
    const selectedBg = getCssVar("--Colors-Use-Main-Primary")
    const tooltipBg = getCssVar("--Colors-Use-Neutral-Bg-Hover")
    const tooltipText = getCssVar("--Colors-Use-Neutral-Text-1-Title")

    /** ==============================
     *     onEvents — 类型完全补齐
     * ============================== */
    const onEvents = useMemo(() => {
        if (!onNodeClick) {
            return {} as Record<string, never>
        }

        return {
            click: (params: ECElementEvent) => {
                const chart = chartRef.current?.getEchartsInstance()
                if (!chart) return

                const data = params.data as GraphNode | undefined

                if (data && data.id) {
                    const clickedId = data.id
                    const newSelectedItem = selectedNodeId === clickedId ? null : data

                    setSelectedNodeId(newSelectedItem?.id ?? null)
                    onNodeClick(newSelectedItem)

                    const updatedData: GraphNode[] = graphData.nodes.map((node) => ({
                        ...node,
                        itemStyle: {
                            borderColor,
                            color: node.id === clickedId ? selectedBg : backgroundColor
                        }
                    }))

                    chart.setOption({series: [{data: updatedData}]})
                } else {
                    setSelectedNodeId(null)
                    onNodeClick(null)

                    const resetData: GraphNode[] = graphData.nodes.map((node) => ({
                        ...node,
                        itemStyle: {
                            borderColor,
                            color: backgroundColor
                        }
                    }))

                    chart.setOption({series: [{data: resetData}]})
                }
            }
        }
    }, [onNodeClick, selectedNodeId, graphData])

    /** ==============================
     *     Option — 类型完全补齐
     * ============================== */
    const option = useMemo<EChartsOption>(() => {
        const nodeData: GraphNode[] = graphData.nodes.map((node) => ({
            ...node,
            itemStyle: {
                borderColor,
                color: node.id === selectedNodeId ? selectedBg : backgroundColor
            }
        }))

        const linkData: GraphLink[] = graphData.links

        return {
            tooltip: {},
            animation: true,
            series: [
                {
                    name: "Knowledge Graph",
                    type: "graph",
                    layout: "none",
                    data: nodeData,
                    links: linkData,
                    roam: true,
                    tooltip: {
                        backgroundColor: tooltipBg,
                        borderColor: tooltipBg,
                        textStyle: {
                            color: tooltipText,
                            fontWeight: 400
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
        }
    }, [graphData, selectedNodeId, theme])

    return (
        <ReactECharts
            ref={chartRef}
            option={option}
            notMerge={true}
            lazyUpdate={true}
            style={{height: "100%", width: "100%", overflow: "hidden"}}
            onEvents={onEvents}
        />
    )
}

export default memo(GraphChart)
