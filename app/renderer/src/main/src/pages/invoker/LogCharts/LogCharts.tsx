import {GraphData} from "@/pages/graph/base"
import classNames from "classnames"
import * as echarts from "echarts"
import React, {useRef, useEffect, useState} from "react"
import styles from "./LogCharts.module.scss"
import {EChartsOption} from "@/pages/risks/VulnerabilityLevelPie/VulnerabilityLevelPieType"
import {getBarOption, getLineOption, getPieOption} from "./chartsOption"
import {useMemoizedFn} from "ahooks"
import ReactResizeDetector from "react-resize-detector"
import cloneDeep from "lodash/cloneDeep"
import {chartsColorList} from "@/pages/globalVariable"

const chartsColorListLength = chartsColorList.length

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
    const [legendSelectList, setLegendSelectList] = useState<string[]>([])
    const chartRef = useRef<HTMLDivElement>(null)
    const graphRef = useRef<echarts.ECharts>()
    const optionRef = useRef<EChartsOption>({})

    const pieOriginOptionRef = useRef<EChartsOption>()
    const lineOriginOptionRef = useRef<EChartsOption>()
    const barOriginOptionRef = useRef<EChartsOption>()
    useEffect(() => {
        if (!graphRef.current) {
            graphRef.current = echarts.init(chartRef.current)
        }
        let newLegendList: LegendListProps[] = []
        let option: EChartsOption = {}
        switch (type) {
            case "bar":
                option = getBarOption(graphData)
                barOriginOptionRef.current = cloneDeep(option)
                break
            case "line":
                option = getLineOption(graphData)
                lineOriginOptionRef.current = cloneDeep(option)
                break
            case "pie":
                option = getPieOption(graphData)
                pieOriginOptionRef.current = cloneDeep(option)
                break
            default:
                break
        }
        switch (type) {
            case "bar":
            case "line":
                if (Array.isArray(option.series)) {
                    //@ts-ignore
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
        setLegendSelectList(newLegendList.map((ele) => ele.key))
        return () => {
            if (graphRef.current) {
                graphRef.current.dispose()
                graphRef.current = undefined
            }
        }
    }, [])
    const onListSelect = useMemoizedFn((item: LegendListProps, checked: boolean, index: number) => {
        if (checked) {
            setLegendSelectList((v) => v.filter((ele) => ele !== item.key))
        } else {
            setLegendSelectList((v) => [...v, item.key])
        }
        const value = {
            item,
            isSelect: checked,
            index
        }
        let originOptionRef: EChartsOption | undefined = undefined
        switch (type) {
            case "bar":
                originOptionRef = barOriginOptionRef.current || {}
                onListSelectCharts({...value, originOptionRef})
                break
            case "line":
                originOptionRef = lineOriginOptionRef.current || {}
                onListSelectCharts({...value, originOptionRef})
                break
            case "pie":
                onListSelectPie(value)
                break
            default:
                break
        }
    })
    /**
     * 柱状图和折线图的选中
     */
    const onListSelectCharts = useMemoizedFn(
        (params: {item: LegendListProps; isSelect: boolean; index: number; originOptionRef: EChartsOption}) => {
            const {isSelect, index, originOptionRef} = params
            if (!(optionRef.current && optionRef.current.series)) return
            if (originOptionRef && originOptionRef.series) {
                if (isSelect) {
                    optionRef.current.series[index].data = []
                } else {
                    const newData = originOptionRef.series[index].data || []
                    optionRef.current.series[index].data = [...newData]
                }
                graphRef.current?.setOption(optionRef.current, true)
            }
        }
    )
    const onListSelectPie = useMemoizedFn((params: {item: LegendListProps; isSelect: boolean; index: number}) => {
        const {item, isSelect, index} = params
        if (!(optionRef.current && optionRef.current.series)) return
        if (pieOriginOptionRef.current && pieOriginOptionRef.current.series) {
            const data =
                (pieOriginOptionRef.current &&
                    pieOriginOptionRef.current.series &&
                    pieOriginOptionRef.current.series[1] &&
                    pieOriginOptionRef.current.series[1].data) ||
                []

            if (isSelect) {
                optionRef.current.series[1].data[index].value = 0
            } else {
                const number = data.findIndex((ele) => ele.name === item.key)
                optionRef.current.series[1].data[index].value = data[number].value
            }
            graphRef.current?.setOption(optionRef.current, true)
        }
    })
    return (
        <>
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
            {legendList.length > 1 && (
                <div className={styles["graph-xAxis-list"]}>
                    {legendList.map((item, index) => {
                        const checked = legendSelectList.includes(item.key)
                        const name = chartsColorList[index % chartsColorListLength]?.name
                        return (
                            <div
                                key={item.key}
                                className={classNames(styles["graph-xAxis-list-item"], {
                                    [styles["graph-xAxis-list-item-active"]]: checked
                                })}
                                onClick={() => onListSelect(item, checked, index)}
                            >
                                <div
                                    className={classNames(styles["circle"], `color-bg-${name || "purple"}`, {
                                        [styles["circle-text-bg"]]: name === "text"
                                    })}
                                />
                                <div>{item.key}</div>
                            </div>
                        )
                    })}
                </div>
            )}
            <div className={styles["graph-charts-body"]}>
                <div
                    className={classNames({
                        [styles["bar-graph-charts"]]: type === "bar",
                        [styles["line-graph-charts"]]: type === "line",
                        [styles["pie-graph-charts"]]: type === "pie"
                    })}
                    ref={chartRef}
                ></div>
            </div>
        </>
    )
})

export default LogCharts
