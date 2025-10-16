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

    // 自动更新容器尺寸
    useEffect(() => {
        if (!containerRef.current) return

        const updateSize = () => {
            const {offsetWidth, offsetHeight} = containerRef.current!
            setDimensions({width: offsetWidth, height: offsetHeight})
        }

        updateSize()
        const resizeObserver = new ResizeObserver(updateSize)
        resizeObserver.observe(containerRef.current)

        return () => resizeObserver.disconnect()
    }, [])

    // 每次容器变化重新 resize 图表
    useEffect(() => {
        if (chartRef.current) {
            const chart = chartRef.current.getEchartsInstance?.()
            chart && chart.resize()
        }
    }, [dimensions])

    // 计算力导向参数
    const repulsion = Math.max(800, data?.nodes?.length * 10)
    const edgeLength = 180 // ✅ 固定边长

    // 计算初始居中随机坐标
    const centerX = dimensions.width / 2
    const centerY = dimensions.height / 2
    const radius = Math.min(centerX, centerY) * 0.8

    const positionedNodes = data?.nodes?.map((node, index) => {
        const angle = (index / data.nodes.length) * 2 * Math.PI
        return {
            ...node,
            // ✅ 均匀分布在圆周上
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
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
                    name: {fontSize: 12, color: textColor, align: "center"}
                }
            }
        }
    })

    const option = {
        animation: false, // ✅ 关闭所有动画
        tooltip: {
            show: true,
            formatter: (params) => (params.data?.name ? params.data.name : "")
        },
        series: [
            {
                type: "graph",
                layout: "force",
                roam: true,
                focusNodeAdjacency: true,
                hoverAnimation: true,
                animation: false,
                data: positionedNodes,
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
                    edgeLength, // ✅ 固定 180px
                    gravity: 0.05,
                    layoutAnimation: false,
                    initLayout: "none" // ✅ 使用我们自定义的初始坐标
                },
                lineStyle: {
                    color: lineTextColor,
                    width: 1,
                    opacity: 0.8
                }
            }
        ]
    }

    return (
        <div ref={containerRef} style={{width: "100%", height: "100%"}}>
            <ReactECharts ref={chartRef} option={option} style={{width: "100%", height: "100%"}} />
        </div>
    )
}

export default memo(GraphDemo)
