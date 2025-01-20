import React, {useEffect, useState} from "react"
import * as echarts from "echarts"
import ReactECharts from "echarts-for-react"
import {merge} from "lodash"
import emiter from "@/utils/eventBus/eventBus"
import {useMemoizedFn} from "ahooks"
import {ConcurrentLoad, concurrentLoad, updateConcurrentLoad} from "@/utils/duplex/duplex"
import {formatTime} from "@/utils/timeUtil"

const lineDefaultOption: echarts.EChartsOption = {
    title: {
        right: "10%"
    },
    xAxis: {
        type: "category",
        data: []
    },
    yAxis: {
        type: "value",
        nameLocation: "end",
        nameGap: 30, // 设置名称与轴线之间的间距
        nameTextStyle: {
            fontSize: 16,
            fontWeight: "bold",
            padding: [0, 0, 0, 100]
        }
    },
    series: [
        {
            data: [],
            type: "line",
            lineStyle: {
                width: 1
            },
            symbolSize: 2
        }
    ],
    tooltip: {
        trigger: "axis", // 在 x 轴触发
        axisPointer: {
            type: "line" // 显示水平指针线
        }
    }
}

interface DynamicLineChartProps {
    type: keyof ConcurrentLoad
    inViewportCurrent: boolean
    lineChartOption: echarts.EChartsOption
}

const DynamicLineChart: React.FC<DynamicLineChartProps> = (props) => {
    const {type, inViewportCurrent, lineChartOption} = props

    const [option, setOption] = useState<echarts.EChartsOption>(merge({}, lineDefaultOption, lineChartOption))

    const updateData = useMemoizedFn(() => {
        setOption((prevOption) => {
            const series = prevOption.series || [
                {
                    data: [],
                    type: "line",
                    smooth: true,
                    lineStyle: {
                        width: 1
                    },
                    symbolSize: 2
                }
            ]

            const subtextPrefix = type === "rps" ? "当前发包数：" : "当前连接数："
            const subtextSuffix = concurrentLoad[type][concurrentLoad[type].length - 1].number || 0

            return {
                ...prevOption,
                title: {
                    subtext: subtextPrefix + subtextSuffix
                },
                xAxis: {
                    ...prevOption.xAxis,
                    data: concurrentLoad[type].map((point) => formatTime(point.time))
                },
                series: [
                    {
                        ...series[0],
                        data: concurrentLoad[type].map((point) => point.number)
                    }
                ]
            }
        })
    })

    useEffect(() => {
        if (inViewportCurrent) {
            if (type === "rps") {
                emiter.on("onRefreshRps", updateData)
                return () => {
                    emiter.off("onRefreshRps", updateData)
                    updateConcurrentLoad(type, [])
                }
            } else if (type === "cps") {
                emiter.on("onRefreshCps", updateData)
                return () => {
                    emiter.off("onRefreshCps", updateData)
                    updateConcurrentLoad(type, [])
                }
            }
        }
    }, [type, inViewportCurrent])

    return <ReactECharts option={option} />
}

interface FuzzerConcurrentLoadProps {
    inViewportCurrent: boolean
}
export const FuzzerConcurrentLoad: React.FC<FuzzerConcurrentLoadProps> = (props) => {
    const {inViewportCurrent} = props

    return (
        <>
            <DynamicLineChart
                type='rps'
                inViewportCurrent={inViewportCurrent}
                lineChartOption={{
                    yAxis: {
                        name: "每秒发包数（5min）"
                    }
                }}
            />
            <DynamicLineChart
                type='cps'
                inViewportCurrent={inViewportCurrent}
                lineChartOption={{
                    yAxis: {
                        name: "每秒连接数（5min）"
                    },
                    series: [
                        {
                            itemStyle: {
                                color: "#F6544A"
                            },
                            lineStyle: {
                                color: "#F6544A"
                            }
                        }
                    ]
                }}
            />
        </>
    )
}
