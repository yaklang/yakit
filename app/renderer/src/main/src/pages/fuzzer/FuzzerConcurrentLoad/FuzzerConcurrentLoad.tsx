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

interface DynamicStackedAreaChartProps {
    inViewportCurrent: boolean
    stackedAreaChartOption: echarts.EChartsOption
}
const DynamicStackedAreaChart: React.FC<DynamicStackedAreaChartProps> = (props) => {
    const {inViewportCurrent, stackedAreaChartOption} = props
    const [option, setOption] = useState<echarts.EChartsOption>(stackedAreaChartOption)

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
            <DynamicStackedAreaChart
                inViewportCurrent={inViewportCurrent}
                stackedAreaChartOption={{
                    tooltip: {
                        trigger: "axis",
                        axisPointer: {
                            type: "cross",
                            label: {
                                backgroundColor: "#6a7985"
                            }
                        }
                    },
                    legend: {
                        data: ["TLS连接", "请求时间", "TCP时间"]
                    },
                    grid: {
                        left: "6%",
                        right: "10%",
                        bottom: "3%",
                        containLabel: true
                    },
                    xAxis: [
                        {
                            type: "category",
                            boundaryGap: false,
                            data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
                        }
                    ],
                    yAxis: [
                        {
                            type: "value",
                            name: "请求延时",
                            nameLocation: "end",
                            nameGap: 30,
                            nameTextStyle: {
                                fontSize: 16,
                                fontWeight: "bold",
                                padding: [0, 0, 0, 0]
                            }
                        }
                    ],
                    series: [
                        {
                            name: "TLS连接",
                            type: "line",
                            stack: "Total",
                            areaStyle: {},
                            emphasis: {
                                focus: "series"
                            },
                            data: [120, 132, 101, 134, 90, 230, 210]
                        },
                        {
                            name: "请求时间",
                            type: "line",
                            stack: "Total",
                            areaStyle: {},
                            emphasis: {
                                focus: "series"
                            },
                            data: [220, 182, 191, 234, 290, 330, 310]
                        },
                        {
                            name: "TCP时间",
                            type: "line",
                            stack: "Total",
                            areaStyle: {},
                            emphasis: {
                                focus: "series"
                            },
                            data: [150, 232, 201, 154, 190, 330, 410]
                        }
                    ]
                }}
            />
        </>
    )
}
