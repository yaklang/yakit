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
    loading: boolean
    lineChartOption: echarts.EChartsOption
}

const DynamicLineChart: React.FC<DynamicLineChartProps> = React.memo((props) => {
    const {type, inViewportCurrent, loading, lineChartOption} = props

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
            const subtextSuffix = concurrentLoad[type][concurrentLoad[type].length - 1]?.number || 0

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

    const resetData = useMemoizedFn(() => {
        if (type === "rps") {
            emiter.off("onRefreshRps", updateData)
            updateConcurrentLoad(type, [])
        } else if (type === "cps") {
            emiter.off("onRefreshCps", updateData)
            updateConcurrentLoad(type, [])
        }
    })

    useEffect(() => {
        if (inViewportCurrent) {
            if (type === "rps") {
                emiter.on("onRefreshRps", updateData)
            } else if (type === "cps") {
                emiter.on("onRefreshCps", updateData)
            }
        } else {
            if (loading) {
                resetData()
            }
        }
    }, [type, inViewportCurrent, loading])

    useEffect(() => {
        return () => {
            resetData()
        }
    }, [])

    return <ReactECharts option={option} />
})

interface DynamicStackedAreaChartProps {
    stackedAreaData: string
}
const DynamicStackedAreaChart: React.FC<DynamicStackedAreaChartProps> = React.memo((props) => {
    const {stackedAreaData} = props
    const [option, setOption] = useState<echarts.EChartsOption>({
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
            top: "0%",
            data: ["TLS握手", "TCP连接", "总时长"]
        },
        xAxis: [
            {
                type: "category",
                boundaryGap: false,
                data: []
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
                name: "TLS握手",
                type: "line",
                stack: "Total",
                areaStyle: {},
                emphasis: {
                    focus: "series"
                },
                data: []
            },
            {
                name: "TCP连接",
                type: "line",
                stack: "Total",
                areaStyle: {},
                emphasis: {
                    focus: "series"
                },
                data: []
            },
            {
                name: "总时长",
                type: "line",
                stack: "Total",
                areaStyle: {},
                emphasis: {
                    focus: "series"
                },
                data: []
            }
        ]
    })

    const updateData = useMemoizedFn(() => {
        try {
            const d = JSON.parse(stackedAreaData) || []
            setOption((prevOption) => {
                const series = prevOption.series || []
                const xAxis = prevOption.xAxis || []

                return {
                    ...prevOption,
                    xAxis: [
                        {
                            ...xAxis[0],
                            data: d.map((point) => point.count)
                        }
                    ],
                    series: [
                        {
                            ...series[0],
                            data: d.map((point) => point.TLSHandshakeDurationMs)
                        },
                        {
                            ...series[1],
                            data: d.map((point) => point.TCPDurationMs)
                        },
                        {
                            ...series[2],
                            data: d.map((point) => point.ConnectDurationMs)
                        }
                    ]
                }
            })
        } catch (error) {}
    })

    useEffect(() => {
        updateData()
    }, [stackedAreaData])

    return <ReactECharts option={option} />
})

export interface FuzzerStackedAreaData {
    count: number
    TLSHandshakeDurationMs: number
    TCPDurationMs: number
    ConnectDurationMs: number
}
interface FuzzerConcurrentLoadProps {
    inViewportCurrent: boolean
    loading: boolean
    stackedAreaData: string
}
export const FuzzerConcurrentLoad: React.FC<FuzzerConcurrentLoadProps> = React.memo((props) => {
    const {inViewportCurrent, loading, stackedAreaData} = props

    return (
        <>
            <DynamicLineChart
                type='rps'
                inViewportCurrent={inViewportCurrent}
                loading={loading}
                lineChartOption={{
                    yAxis: {
                        name: "每秒发包数（5min）"
                    }
                }}
            />
            <DynamicLineChart
                type='cps'
                inViewportCurrent={inViewportCurrent}
                loading={loading}
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
            <DynamicStackedAreaChart stackedAreaData={stackedAreaData} />
        </>
    )
})
