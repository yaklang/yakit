import {GraphData} from "@/pages/graph/base"
import {EChartsOption} from "@/pages/risks/VulnerabilityLevelPie/VulnerabilityLevelPieType"
import React, {useEffect, useRef} from "react"
import * as echarts from "echarts"
import "echarts-wordcloud"
import styles from "./LogCharts.module.scss"
import {getWordCloudOption} from "./chartsOption"
import ReactResizeDetector from "react-resize-detector"
interface WordCloudChartsProps {
    graphData: GraphData
}
const WordCloudCharts: React.FC<WordCloudChartsProps> = React.memo((props) => {
    const {graphData} = props
    const chartRef = useRef<HTMLDivElement>(null)
    const graphRef = useRef<echarts.ECharts>()
    const optionRef = useRef<EChartsOption>()
    useEffect(() => {
        if (!graphRef.current) {
            graphRef.current = echarts.init(chartRef.current)
        }
        optionRef.current = getWordCloudOption(graphData)
        graphRef.current.setOption(optionRef.current)
        return () => {
            if (graphRef.current) {
                graphRef.current.dispose()
                graphRef.current = undefined
            }
        }
    }, [])
    return (
        <div className={styles["graph-charts-body"]}>
            <ReactResizeDetector
                onResize={(width, height) => {
                    if (!width || !height) return
                    graphRef.current?.resize()
                }}
                handleWidth={true}
                handleHeight={true}
                refreshMode={"debounce"}
                refreshRate={50}
            />
            <div className={styles["wordcloud-graph-charts"]} ref={chartRef}></div>
        </div>
    )
})

export default WordCloudCharts