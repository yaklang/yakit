import React, {useEffect, useRef} from "react"
import * as echarts from "echarts"
import ReactECharts from "echarts-for-react"
import {merge} from "lodash"
import emiter from "@/utils/eventBus/eventBus"
import {useMemoizedFn, useThrottleFn} from "ahooks"
import {ConcurrentLoad, concurrentLoad} from "@/utils/duplex/duplex"
import {formatTime} from "@/utils/timeUtil"
import { getCssVar } from "@/utils/tool"
import { useI18nNamespaces } from "@/i18n/useI18nNamespaces"

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
    lineChartOption: echarts.EChartsOption
}

const RpsAndCpsLineChart: React.FC<RpsAndCpsLineChartProps> = React.memo((props) => {
    const {type, inViewportCurrent, lineChartOption} = props
    const {t, i18n} = useI18nNamespaces(["webFuzzer"])
    const chartRef = useRef<any>(null)
    const optionRef = useRef<echarts.EChartsOption>(merge({}, lineDefaultOption, lineChartOption))
    // const lastIndexRef = useRef(0)
    // const xAxisDataRef = useRef<string[]>([])

    const {run: throttledRenderData, cancel: cancelRenderData} = useThrottleFn(
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
                            (type === "rps" ? t("RpsAndCpsLineChart.currentPacketCount") : t("RpsAndCpsLineChart.currentConnectionCount")) +
                            (dataArr[dataArr.length - 1]?.number || 0)
                    }
                },
                false,
                true
            )
        },
        {wait: 1000, leading: true, trailing: true}
    )

    const cancelWatch = useMemoizedFn(() => {
        if (type === "rps") {
            emiter.off("onRefreshRps", throttledRenderData)
        } else if (type === "cps") {
            emiter.off("onRefreshCps", throttledRenderData)
        }
        cancelRenderData()
    })

    useEffect(() => {
        if (inViewportCurrent) {
            throttledRenderData()
            if (type === "rps") {
                emiter.on("onRefreshRps", throttledRenderData)
            } else if (type === "cps") {
                emiter.on("onRefreshCps", throttledRenderData)
            }
        }

        return () => {
            cancelWatch()
        }
    }, [type, inViewportCurrent])

    useEffect(() => {
        // lastIndexRef.current = 0
        // xAxisDataRef.current = []
        return () => {
            cancelWatch()
        }
    }, [])

    return <ReactECharts ref={chartRef} option={optionRef.current} style={{height: 400, width: "100%"}} />
})

interface RequestDelayStackedAreaChartProps {
    inViewportCurrent: boolean
    fuzzerResChartData: FuzzerResChartData[]
}
const RequestDelayStackedAreaChart: React.FC<RequestDelayStackedAreaChartProps> = ({
    inViewportCurrent,
    fuzzerResChartData
}) => {
    const {t, i18n} = useI18nNamespaces(["webFuzzer"])
    const chartRef = useRef<any>(null)
    const optionRef = useRef<echarts.EChartsOption>({
        tooltip: {
            trigger: "axis",
            axisPointer: {
                type: "cross",
                label: {
                    backgroundColor: getCssVar("--Colors-Use-Neutral-Text-1-Title")
                }
            }
        },
        legend: {
            top: "3%",
            left: "45%",
            data: [t("RequestDelayStackedAreaChart.tlsHandshake"), t("RequestDelayStackedAreaChart.tcpConnection"), t("RequestDelayStackedAreaChart.totalDuration")],
            textStyle: {
                color: getCssVar("--Colors-Use-Neutral-Text-1-Title")
            }
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
                name: t("RequestDelayStackedAreaChart.requestLatency"),
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
                name: t("RequestDelayStackedAreaChart.tlsHandshake"),
                type: "line",
                stack: "Total",
                areaStyle: {},
                emphasis: {
                    focus: "series"
                },
                data: []
            },
            {
                name: t("RequestDelayStackedAreaChart.tcpConnection"),
                type: "line",
                stack: "Total",
                areaStyle: {},
                emphasis: {
                    focus: "series"
                },
                data: []
            },
            {
                name: t("RequestDelayStackedAreaChart.totalDuration"),
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
    // const lastIndexRef = useRef(0)
    // const xAxisDataRef = useRef<number[]>([])

    useEffect(() => {
        // lastIndexRef.current = 0
        // xAxisDataRef.current = []
        return () => {
            cancelRenderData()
        }
    }, [])

    const {run: throttledRenderData, cancel: cancelRenderData} = useThrottleFn(
        () => {
            const echartsInstance = chartRef.current?.getEchartsInstance()
            if (!echartsInstance) return

            echartsInstance.setOption(
                {
                    ...optionRef.current,
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
        {wait: 1000, leading: true, trailing: true}
    )

    useEffect(() => {
        if (!inViewportCurrent || !fuzzerResChartData?.length) return
        throttledRenderData()
    }, [inViewportCurrent, fuzzerResChartData])

    return <ReactECharts ref={chartRef} option={optionRef.current} style={{height: 400, width: "100%"}} />
}
interface DurationMsLineChartProps {
    inViewportCurrent: boolean
    fuzzerResChartData: FuzzerResChartData[]
    lineChartOption: echarts.EChartsOption
}
const DurationMsLineChart: React.FC<DurationMsLineChartProps> = React.memo((props) => {
    const {inViewportCurrent, fuzzerResChartData, lineChartOption} = props
    const chartRef = useRef<any>(null)
    const optionRef = useRef<echarts.EChartsOption>(merge({}, lineDefaultOption, lineChartOption))
    // const lastIndexRef = useRef(0)
    // const xAxisDataRef = useRef<number[]>([])

    useEffect(() => {
        // if (chartRef.current) {
        //     lastIndexRef.current = 0
        //     xAxisDataRef.current = []
        // }
        return () => {
            cancelRenderData()
        }
    }, [])

    const {run: throttledRenderData, cancel: cancelRenderData} = useThrottleFn(
        () => {
            const echartsInstance = chartRef.current?.getEchartsInstance()
            if (!echartsInstance) return

            echartsInstance.setOption(
                {
                    ...optionRef.current,
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
        {wait: 1000, leading: true, trailing: true}
    )

    useEffect(() => {
        if (!inViewportCurrent || !fuzzerResChartData?.length) return
        throttledRenderData()
    }, [fuzzerResChartData, inViewportCurrent])

    return <ReactECharts ref={chartRef} option={optionRef.current} style={{height: 400, width: "100%"}} />
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
    fuzzerResChartData: FuzzerResChartData[]
}
export const FuzzerConcurrentLoad: React.FC<FuzzerConcurrentLoadProps> = React.memo((props) => {
    const {inViewportCurrent, fuzzerResChartData} = props
    const {t, i18n} = useI18nNamespaces(["webFuzzer"])
    return (
        <>
            <RpsAndCpsLineChart
                type='rps'
                inViewportCurrent={inViewportCurrent}
                lineChartOption={{
                    yAxis: {
                        name: t("FuzzerConcurrentLoad.packetsPerSecond5min")
                    },
                    series: [
                        {
                            itemStyle: {
                                color: getCssVar("--Colors-Use-Blue-Primary")
                            },
                            lineStyle: {
                                color: getCssVar("--Colors-Use-Blue-Primary")
                            }
                        }
                    ]
                }}
            />
            <RpsAndCpsLineChart
                type='cps'
                inViewportCurrent={inViewportCurrent}
                lineChartOption={{
                    yAxis: {
                        name: t("FuzzerConcurrentLoad.connectionsPerSecond5min")
                    },
                    series: [
                        {
                            itemStyle: {
                                color: getCssVar("--Colors-Use-Red-Primary")
                            },
                            lineStyle: {
                                color: getCssVar("--Colors-Use-Red-Primary")
                            }
                        }
                    ]
                }}
            />
            <RequestDelayStackedAreaChart
                fuzzerResChartData={fuzzerResChartData}
                inViewportCurrent={inViewportCurrent}
            />
            <DurationMsLineChart
                fuzzerResChartData={fuzzerResChartData}
                inViewportCurrent={inViewportCurrent}
                lineChartOption={{
                    yAxis: {
                        name: t("FuzzerConcurrentLoad.responseLatency")
                    },
                    series: [
                        {
                            itemStyle: {
                                color: getCssVar("--Colors-Use-Yellow-Primary")
                            },
                            lineStyle: {
                                color: getCssVar("--Colors-Use-Yellow-Primary")
                            }
                        }
                    ]
                }}
            />
        </>
    )
})
