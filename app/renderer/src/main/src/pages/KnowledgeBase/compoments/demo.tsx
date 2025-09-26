import ReactECharts from "echarts-for-react"
import {memo, useEffect, useRef, useState} from "react"
import {getCssVar} from "@/utils/tool"

const backgroundColor = getCssVar("--Colors-Use-Main-Primary")
const textColor = getCssVar("--Colors-Use-Neutral-Text-1-Title")
const lineTextColor = getCssVar("--Colors-Use-Neutral-Text-2-Primary")

const GraphDemo = ({data}) => {
    const chartRef = useRef<any>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [dimensions, setDimensions] = useState({width: 800, height: 600})

    // 更新容器尺寸
    useEffect(() => {
        if (!containerRef.current) return

        const updateSize = () => {
            if (!containerRef.current) return // 如果为空，直接返回
            const {offsetWidth, offsetHeight} = containerRef.current
            setDimensions({width: offsetWidth, height: offsetHeight})
        }

        updateSize()
        const resizeObserver = new ResizeObserver(updateSize)
        resizeObserver.observe(containerRef.current)

        return () => {
            resizeObserver.disconnect()
        }
    }, [])

    // 不再需要悬浮高亮逻辑

    // 力导向参数
    const repulsion = Math.min(dimensions.width, dimensions.height)
    const edgeLength = Math.min(dimensions.width, dimensions.height) / 8

    const option = {
        tooltip: {
            show: true,
            formatter: function (params) {
                // 只在节点上显示 name 字段
                if (params.data && params.data.name) {
                    return params.data.name
                }
                return ""
            }
        },
        series: [
            {
                type: "graph",
                layout: "force",
                roam: true,
                focusNodeAdjacency: true, // 关闭邻接高亮
                hoverAnimation: true, // 关闭节点缩放动画
                data: data?.nodes?.map((node) => ({
                    ...node,
                    itemStyle: {
                        color: backgroundColor,
                        borderWidth: 0
                    },
                    label: {
                        show: true,
                        formatter: `{name|${node.level}}`,
                        fontSize: 12,
                        fontWeight: "bold",
                        color: textColor,
                        rich: {
                            name: {
                                fontSize: 12,
                                color: textColor,
                                align: "center"
                            }
                        }
                    }
                })),
                links: data?.links?.map((link) => ({...link})),
                edgeSymbol: ["circle", "arrow"],
                edgeSymbolSize: [4, 10],
                edgeLabel: {
                    show: true,
                    formatter: (params) => params.data.type || "",
                    fontSize: 12,
                    color: lineTextColor,
                    borderRadius: 3,
                    padding: [2, 4]
                },
                force: {
                    repulsion,
                    edgeLength,
                    gravity: 0.05,
                    layoutAnimation: true
                }
            }
        ]
    }

    useEffect(() => {
        if (chartRef.current) {
            const chart = chartRef.current.getEchartsInstance?.()
            chart && chart.resize()
        }
    }, [dimensions])

    return (
        <div ref={containerRef} style={{width: "100%", height: "100%"}}>
            <ReactECharts ref={chartRef} option={option} style={{width: "100%", height: "100%"}} />
        </div>
    )
}

export default memo(GraphDemo)
