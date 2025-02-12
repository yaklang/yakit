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
    grid: {
        left: "15%",
        right: "2%"
    },
    yAxis: {
        type: "value",
        nameLocation: "end",
        nameGap: 30,
        nameTextStyle: {
            fontSize: 16,
            fontWeight: "bold",
            padding: [0, 0, 0, 0],
            align: "left"
        },
        axisLabel: {
            formatter: function (value) {
                // 如果值大于等于 1,000,000,000 使用科学计数法
                if (value >= 1e9) {
                    return value.toExponential(2) // 使用科学计数法，保留两位有效数字
                }
                // 否则返回原值
                return value.toString()
            }
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

interface RpsAndCpsLineChartProps {
    type: keyof ConcurrentLoad
    inViewportCurrent: boolean
    loading: boolean
    lineChartOption: echarts.EChartsOption
}

const RpsAndCpsLineChart: React.FC<RpsAndCpsLineChartProps> = React.memo((props) => {
    const {type, inViewportCurrent, loading, lineChartOption} = props

    const [option, setOption] = useState<echarts.EChartsOption>(merge({}, lineDefaultOption, lineChartOption))

    const updateData = useMemoizedFn(() => {
        setOption((prevOption) => {
            const series = prevOption.series || []

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
        if (type === "rps") {
            updateConcurrentLoad(type, [])
        } else if (type === "cps") {
            updateConcurrentLoad(type, [])
        }
        return () => {
            resetData()
        }
    }, [])

    return <ReactECharts option={option} />
})

interface RequestDelayStackedAreaChartProps {
    fuzzerResChartData: string
}
const RequestDelayStackedAreaChart: React.FC<RequestDelayStackedAreaChartProps> = React.memo((props) => {
    const {fuzzerResChartData} = props
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
            top: "3%",
            left: "45%",
            data: ["TLS握手", "TCP连接", "总时长"]
        },
        xAxis: [
            {
                type: "category",
                boundaryGap: false,
                data: []
            }
        ],
        grid: {
            left: "15%", // 增加左侧的空白区域
            right: "2%"
        },
        yAxis: [
            {
                type: "value",
                name: "请求时延",
                nameLocation: "end",
                nameGap: 30,
                nameTextStyle: {
                    fontSize: 16,
                    fontWeight: "bold",
                    padding: [0, 0, 0, 0],
                    align: "left"
                },
                axisLabel: {
                    formatter: function (value) {
                        // 如果值大于等于 1,000,000,000 使用科学计数法
                        if (value >= 1e9) {
                            return value.toExponential(2) // 使用科学计数法，保留两位有效数字
                        }
                        // 否则返回原值
                        return value.toString()
                    }
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
            const d = JSON.parse(fuzzerResChartData) || []
            setOption((prevOption) => {
                const series = prevOption.series || []
                const xAxis = prevOption.xAxis || []

                return {
                    ...prevOption,
                    xAxis: [
                        {
                            ...xAxis[0],
                            data: d.map((point: FuzzerResChartData) => point.Count)
                        }
                    ],
                    series: [
                        {
                            ...series[0],
                            data: d.map((point: FuzzerResChartData) => point.TLSHandshakeDurationMs)
                        },
                        {
                            ...series[1],
                            data: d.map((point: FuzzerResChartData) => point.TCPDurationMs)
                        },
                        {
                            ...series[2],
                            data: d.map((point: FuzzerResChartData) => point.ConnectDurationMs)
                        }
                    ]
                }
            })
        } catch (error) {}
    })

    useEffect(() => {
        updateData()
    }, [fuzzerResChartData])

    return <ReactECharts option={option} />
})
interface DurationMsLineChartProps {
    fuzzerResChartData: string
}
const DurationMsLineChart: React.FC<DurationMsLineChartProps> = React.memo((props) => {
    const {fuzzerResChartData} = props
    const [option, setOption] = useState<echarts.EChartsOption>(
        merge({}, lineDefaultOption, {
            yAxis: {
                name: "响应时延"
            },
            series: [
                {
                    itemStyle: {
                        color: "#D6D394"
                    },
                    lineStyle: {
                        color: "#D6D394"
                    }
                }
            ]
        })
    )

    const updateData = useMemoizedFn(() => {
        try {
            const d = JSON.parse(fuzzerResChartData) || []
            setOption((prevOption) => {
                const series = prevOption.series || []

                return {
                    ...prevOption,
                    xAxis: {
                        ...prevOption.xAxis,
                        data: d.map((point: FuzzerResChartData) => point.Count)
                    },
                    series: [
                        {
                            ...series[0],
                            data: d.map((point: FuzzerResChartData) => point.DurationMs)
                        }
                    ]
                }
            })
        } catch (error) {}
    })

    useEffect(() => {
        updateData()
    }, [fuzzerResChartData])

    return <ReactECharts option={option} />
})

export interface FuzzerResChartData {
    Count: number
    TLSHandshakeDurationMs: number
    TCPDurationMs: number
    ConnectDurationMs: number
    DurationMs: number
}
interface FuzzerConcurrentLoadProps {
    inViewportCurrent: boolean
    loading: boolean
    fuzzerResChartData: string
}
export const FuzzerConcurrentLoad: React.FC<FuzzerConcurrentLoadProps> = React.memo((props) => {
    const {inViewportCurrent, loading, fuzzerResChartData} = props

    return (
        <>
            <RpsAndCpsLineChart
                type='rps'
                inViewportCurrent={inViewportCurrent}
                loading={loading}
                lineChartOption={{
                    yAxis: {
                        name: "每秒发包数（5min）"
                    }
                }}
            />
            <RpsAndCpsLineChart
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
            <RequestDelayStackedAreaChart fuzzerResChartData={fuzzerResChartData} />
            <DurationMsLineChart fuzzerResChartData={fuzzerResChartData} />
        </>
    )
})
