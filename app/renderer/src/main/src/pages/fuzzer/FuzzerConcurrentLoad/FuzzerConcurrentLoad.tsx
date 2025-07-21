import React, {useEffect, useRef} from "react"
import * as echarts from "echarts"
import ReactECharts from "echarts-for-react"
import {merge} from "lodash"
import emiter from "@/utils/eventBus/eventBus"
import {useMemoizedFn, useThrottleFn} from "ahooks"
import {ConcurrentLoad, concurrentLoad} from "@/utils/duplex/duplex"
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
    const chartRef = useRef<any>(null)
    const optionRef = useRef<echarts.EChartsOption>(merge({}, lineDefaultOption, lineChartOption))
    const lastIndexRef = useRef(0)
    const xAxisDataRef = useRef<string[]>([])

    const {run: throttledAppendData, cancel: cancelAppendData} = useThrottleFn(
        () => {
            const echartsInstance = chartRef.current?.getEchartsInstance()
            if (!echartsInstance) return
            const dataArr = concurrentLoad[type] || []

            // const newData = dataArr.slice(lastIndexRef.current)
            // if (newData.length === 0) return

            // // 追加 x 轴
            // xAxisDataRef.current = [...xAxisDataRef.current, ...newData.map((point) => formatTime(point.time))]
            // echartsInstance.setOption({
            //     xAxis: [{data: xAxisDataRef.current}],
            //     title: {
            //         subtext:
            //             (type === "rps" ? "当前发包数：" : "当前连接数：") + (dataArr[dataArr.length - 1]?.number || 0)
            //     }
            // })

            // // 追加 series
            // echartsInstance.appendData({
            //     seriesIndex: 0,
            //     data: newData.map((point) => point.number)
            // })

            // echartsInstance.resize()

            // lastIndexRef.current += newData.length

            echartsInstance.setOption(
                {
                    ...optionRef.current,
                    xAxis: {data: dataArr.map((point) => formatTime(point.time))},
                    series: [
                        {
                            data: dataArr.map((point) => point.number)
                        }
                    ],
                    title: {
                        subtext:
                            (type === "rps" ? "当前发包数：" : "当前连接数：") +
                            (dataArr[dataArr.length - 1]?.number || 0)
                    }
                },
                false,
                true
            )
        },
        {wait: 1000, leading: false, trailing: true}
    )

    const cancelWatch = useMemoizedFn(() => {
        if (type === "rps") {
            emiter.off("onRefreshRps", throttledAppendData)
        } else if (type === "cps") {
            emiter.off("onRefreshCps", throttledAppendData)
        }
        cancelAppendData()
    })

    useEffect(() => {
        if (inViewportCurrent) {
            throttledAppendData()
            if (type === "rps") {
                emiter.on("onRefreshRps", throttledAppendData)
            } else if (type === "cps") {
                emiter.on("onRefreshCps", throttledAppendData)
            }
        }

        return () => {
            cancelWatch()
        }
    }, [type, inViewportCurrent])

    useEffect(() => {
        lastIndexRef.current = 0
        xAxisDataRef.current = []
        return () => {
            cancelWatch()
        }
    }, [])

    return <ReactECharts ref={chartRef} option={optionRef.current} style={{height: 400, width: "100%"}} />
})

const requestDelayStackedAreaChartOptions = {
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
}
interface RequestDelayStackedAreaChartProps {
    inViewportCurrent: boolean
    fuzzerResChartData: FuzzerResChartData[]
}
const RequestDelayStackedAreaChart: React.FC<RequestDelayStackedAreaChartProps> = ({
    inViewportCurrent,
    fuzzerResChartData
}) => {
    const chartRef = useRef<any>(null)
    const lastIndexRef = useRef(0)
    const xAxisDataRef = useRef<number[]>([])

    useEffect(() => {
        lastIndexRef.current = 0
        xAxisDataRef.current = []
        return () => {
            cancelAppendData()
        }
    }, [])

    const {run: throttledAppendData, cancel: cancelAppendData} = useThrottleFn(
        () => {
            const echartsInstance = chartRef.current?.getEchartsInstance()
            if (!echartsInstance) return

            echartsInstance.setOption(
                {
                    ...requestDelayStackedAreaChartOptions,
                    xAxis: [{data: fuzzerResChartData.map((point) => point.Count)}],
                    series: [
                        {
                            data: fuzzerResChartData.map((point: FuzzerResChartData) => point.TLSHandshakeDurationMs)
                        },
                        {
                            data: fuzzerResChartData.map((point: FuzzerResChartData) => point.TCPDurationMs)
                        },
                        {
                            data: fuzzerResChartData.map((point: FuzzerResChartData) => point.ConnectDurationMs)
                        }
                    ]
                },
                false,
                true
            )

            // const newData = fuzzerResChartData.slice(lastIndexRef.current)
            // if (newData.length === 0) return

            // // 追加 x 轴
            // xAxisDataRef.current = [...xAxisDataRef.current, ...newData.map((point) => point.Count)]
            // echartsInstance.setOption({
            //     xAxis: [{data: xAxisDataRef.current}]
            // })

            // // 追加 series
            // echartsInstance.appendData({
            //     seriesIndex: 0,
            //     data: newData.map((point) => point.TLSHandshakeDurationMs)
            // })
            // echartsInstance.appendData({
            //     seriesIndex: 1,
            //     data: newData.map((point) => point.TCPDurationMs)
            // })
            // echartsInstance.appendData({
            //     seriesIndex: 2,
            //     data: newData.map((point) => point.ConnectDurationMs)
            // })

            // echartsInstance.resize()

            // lastIndexRef.current += newData.length
        },
        {wait: 1000, leading: false, trailing: true}
    )

    useEffect(() => {
        if (!inViewportCurrent || !fuzzerResChartData?.length) return
        throttledAppendData()
    }, [inViewportCurrent, fuzzerResChartData])

    return (
        <ReactECharts
            ref={chartRef}
            option={requestDelayStackedAreaChartOptions}
            style={{height: 400, width: "100%"}}
        />
    )
}
const durationMsLineChartOptions = merge({}, lineDefaultOption, {
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
interface DurationMsLineChartProps {
    inViewportCurrent: boolean
    fuzzerResChartData: FuzzerResChartData[]
}
const DurationMsLineChart: React.FC<DurationMsLineChartProps> = React.memo((props) => {
    const {inViewportCurrent, fuzzerResChartData} = props
    const chartRef = useRef<any>(null)
    const lastIndexRef = useRef(0)
    const xAxisDataRef = useRef<number[]>([])

    useEffect(() => {
        if (chartRef.current) {
            lastIndexRef.current = 0
            xAxisDataRef.current = []
        }
        return () => {
            cancelAppendData()
        }
    }, [])

    const {run: throttledAppendData, cancel: cancelAppendData} = useThrottleFn(
        () => {
            const echartsInstance = chartRef.current?.getEchartsInstance()
            if (!echartsInstance) return

            echartsInstance.setOption(
                {
                    ...durationMsLineChartOptions,
                    xAxis: {data: fuzzerResChartData.map((point) => point.Count)},
                    series: [{data: fuzzerResChartData.map((point) => point.DurationMs)}]
                },
                false,
                true
            )

            // const newData = fuzzerResChartData.slice(lastIndexRef.current)
            // if (newData.length === 0) return

            // // 追加 x 轴
            // xAxisDataRef.current = [...xAxisDataRef.current, ...newData.map((point) => point.Count)]
            // echartsInstance.setOption({
            //     xAxis: {data: xAxisDataRef.current}
            // })

            // // 追加 series
            // echartsInstance.appendData({
            //     seriesIndex: 0,
            //     data: newData.map((point) => point.DurationMs)
            // })

            // echartsInstance.resize()

            // lastIndexRef.current += newData.length
        },
        {wait: 1000, leading: false, trailing: true}
    )

    useEffect(() => {
        if (!inViewportCurrent || !fuzzerResChartData?.length) return
        throttledAppendData()
    }, [fuzzerResChartData, inViewportCurrent])

    return <ReactECharts ref={chartRef} option={durationMsLineChartOptions} style={{height: 400, width: "100%"}} />
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
    fuzzerResChartData: FuzzerResChartData[]
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
            <RequestDelayStackedAreaChart
                fuzzerResChartData={fuzzerResChartData}
                inViewportCurrent={inViewportCurrent}
            />
            <DurationMsLineChart fuzzerResChartData={fuzzerResChartData} inViewportCurrent={inViewportCurrent} />
        </>
    )
})
