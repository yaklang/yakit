import {GraphData} from "@/pages/graph/base"
import classNames from "classnames"
import * as echarts from "echarts"
import React, {useRef, useEffect, useState} from "react"
import styles from "./LogCharts.module.scss"
import {logChartsColorList} from "./constant"
import {EChartsOption} from "@/pages/risks/VulnerabilityLevelPie/VulnerabilityLevelPieType"
import {getBarOption, getLineOption, getPieOption} from "./chartsOption"

const logChartsColorListLength = logChartsColorList.length

interface LogChartsProps {
    type: "bar" | "line" | "pie"
    graphData: GraphData
}
interface LegendListProps {
    value?: number
    key: string
}
const LogCharts: React.FC<LogChartsProps> = React.memo((props) => {
    const {type, graphData} = props
    const [legendList, setLegendList] = useState<LegendListProps[]>([])
    const chartRef = useRef<HTMLDivElement>(null)
    const graphRef = useRef<echarts.ECharts>()
    const optionRef = useRef<EChartsOption>({})
    useEffect(() => {
        if (!graphRef.current) {
            graphRef.current = echarts.init(chartRef.current)
        }
        let newLegendList: LegendListProps[] = []
        let option: EChartsOption = {}
        switch (type) {
            case "bar":
                option = getBarOption(graphData)
                break
            case "line":
                option = getLineOption(graphData)
                break
            case "pie":
                option = getPieOption(graphData)
                break
            default:
                break
        }
        switch (type) {
            case "bar":
            case "line":
                if (Array.isArray(option.series)) {
                    newLegendList = (option.series || []).map((ele) => ({key: ele.name as string}))
                }
                break
            case "pie":
                newLegendList = graphData.data
                break
            default:
                break
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
                        <div key={item.key} className={styles["graph-xAxis-list-item"]}>
                            <div
                                className={classNames(
                                    styles["circle"],
                                    `color-bg-${logChartsColorList[index % logChartsColorListLength]?.name || "purple"}`
                                )}
                            />
                            <div>{item.key}</div>
                        </div>
                    ))}
                </div>
            )}
            <div
                className={classNames({
                    [styles["bar-graph-charts"]]: type === "bar",
                    [styles["line-graph-charts"]]: type === "line",
                    [styles["pie-graph-charts"]]: type === "pie"
                })}
                ref={chartRef}
            ></div>
        </>
    )
})

export default LogCharts
