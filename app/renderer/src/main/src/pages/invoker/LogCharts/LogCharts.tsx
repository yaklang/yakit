import {GraphData} from "@/pages/graph/base"
import classNames from "classnames"
import * as echarts from "echarts"
import React, {useRef, useEffect, useState} from "react"
import styles from "./LogCharts.module.scss"
import {logChartsColorList} from "./constant"
import {EChartsOption} from "@/pages/risks/VulnerabilityLevelPie/VulnerabilityLevelPieType"
import {getBarOption, getLineOption} from "./chartsOption"

const logChartsColorListLength = logChartsColorList.length

interface LogChartsProps {
    type: "bar" | "line" | "pie"
    graphData: GraphData
}
const LogCharts: React.FC<LogChartsProps> = React.memo((props) => {
    const {type, graphData} = props
    const [legendList, setLegendList] = useState<string[]>([])
    const chartRef = useRef<HTMLDivElement>(null)
    const graphRef = useRef<echarts.ECharts>()
    const optionRef = useRef<EChartsOption>({})
    useEffect(() => {
        if (!graphRef.current) {
            graphRef.current = echarts.init(chartRef.current)
        }
        let newLegendList: string[] = []
        let option: EChartsOption = {}
        switch (type) {
            case "bar":
                option = getBarOption(graphData)
                break
            case "line":
                option = getLineOption(graphData)
                break
            default:
                break
        }
        if (Array.isArray(option.series)) {
            newLegendList = (option.series || []).map((ele) => ele.name as string)
        }
        optionRef.current = option
        graphRef.current.setOption(optionRef.current)
        setLegendList(newLegendList)
        return () => {
            if (graphRef.current) {
                graphRef.current.dispose()
                graphRef.current = undefined
            }
        }
    }, [graphData, type])
    return (
        <>
            {legendList.length > 1 && (
                <div className={styles["graph-xAxis-list"]}>
                    {legendList.map((item, index) => (
                        <div key={item} className={styles["graph-xAxis-list-item"]}>
                            <div
                                className={classNames(
                                    styles["circle"],
                                    `color-bg-${logChartsColorList[index % logChartsColorListLength]?.name || "purple"}`
                                )}
                            />
                            {item}
                        </div>
                    ))}
                </div>
            )}
            <div
                className={classNames({
                    [styles["bar-graph-charts"]]: type === "bar",
                    [styles["pie-graph-charts"]]: type === "pie",
                    [styles["line-graph-charts"]]: type === "line"
                })}
                ref={chartRef}
            ></div>
        </>
    )
})

export default LogCharts
