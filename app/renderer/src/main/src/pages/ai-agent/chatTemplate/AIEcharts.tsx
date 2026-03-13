import React, {useEffect, useRef} from "react"
import ReactECharts, {EChartsOption} from "echarts-for-react"
import {useDebounceFn} from "ahooks"
import {AIModelTypeEnum} from "../defaultConstant"
import {formatTimestamp} from "@/utils/timeUtil"
import moment from "moment"
import {formatNumberUnits} from "../utils"
import EChartsReact from "echarts-for-react"
import useGetColorsByTheme from "@/hook/useGetColorsByTheme"

export interface AIEchartsDataKey {
    modelName: string
    value: number
}
//#region 上下文压力 echarts图表
export interface ContextPressureEchartsProps {
    dataEcharts: {
        data: Record<AIModelTypeEnum, AIEchartsDataKey[]>
        xData: Record<AIModelTypeEnum, number[]>
    }
    threshold: number
}
export const ContextPressureEcharts: React.FC<ContextPressureEchartsProps> = React.memo((props) => {
    const {dataEcharts, threshold} = props
    const chartRef = useRef<EChartsReact>(null)
    const colorRef = useGetColorsByTheme()
    const optionRef = useRef<echarts.EChartsOption>(
        getContextPressureOption({dataEcharts, threshold, colors: colorRef})
    )

    useEffect(() => {
        onSetOption()
    }, [dataEcharts, threshold])
    const onSetOption = useDebounceFn(
        () => {
            const echartsInstance = chartRef.current?.getEchartsInstance()
            if (!echartsInstance) return
            const newOption = getContextPressureOption({dataEcharts, threshold, colors: colorRef})
            optionRef.current = newOption
            echartsInstance.setOption(newOption, false, true)
        },
        {wait: 500, leading: true}
    ).run
    return <ReactECharts ref={chartRef} option={optionRef.current} style={{width: 72, height: 24}} />
})

const AIModelTypeMap: Record<
    AIModelTypeEnum,
    {
        backgroundColor?: string
    }
> = {
    [AIModelTypeEnum.TierIntelligent]: {
        backgroundColor: "--Colors-Use-Purple-Primary"
    },
    [AIModelTypeEnum.TierLightweight]: {
        backgroundColor: "--Colors-Use-Warning-Primary"
    },
    [AIModelTypeEnum.TierVision]: {}
}
const getDetailsXAxis = (data: {
    xData: number[]
    colors: Record<string, string>
    type: AIModelTypeEnum
    valueFormatter: (v: number) => string | number
}) => {
    const {xData, colors, type, valueFormatter} = data

    const axisPointerLabel = AIModelTypeMap[type]
    const xAxis = {
        type: "category",
        data: xData,
        axisLabel: {
            rotate: 0,
            fontSize: 11,
            color: colors["--Colors-Use-Neutral-Text-3-Secondary"],
            formatter: (v) => moment.unix(v).format("HH:mm")
        },
        axisLine: {
            lineStyle: {
                color: colors["--Colors-Use-Neutral-Border"]
            }
        },
        splitLine: {
            show: true,
            lineStyle: {
                type: "dashed",
                color: colors["--Colors-Use-Neutral-Border"]
            }
        },
        // 隐藏刻度线
        axisTick: {
            show: false // 不显示刻度线
        },
        axisPointer: {
            label: {
                fontSize: 10,
                backgroundColor: colors[axisPointerLabel?.backgroundColor || ""],
                formatter: (params) => {
                    return `${formatTimestamp(+params.value)}\r\n${
                        params?.seriesData?.length ? params.seriesData[0].data?.modelName : ""
                    }:${params?.seriesData?.length ? valueFormatter?.(params.seriesData[0].data?.value) : ""}`
                }
            }
        },
        boundaryGap: false
    }
    return xAxis
}

const getXAxis = (data: {xData: number[]}) => {
    const {xData} = data
    const xAxis = {
        show: false,
        type: "category",
        data: xData,
        axisLine: {
            show: false
        },

        boundaryGap: false
    }
    return xAxis
}
interface AIEchartsHelperProps {
    data: AIEchartsDataKey[]
    threshold?: ContextPressureEchartsProps["threshold"]
    colors: Record<string, string>
}
const getIntelligent = (options: AIEchartsHelperProps) => {
    const {data, threshold = 0, colors} = options
    //#region 计算高质模型的最大值、最小值和最大值索引
    const intelligentData: number[] = []
    let maxValueIntelligent = 0
    let minValueIntelligent = 0
    let lastIntelligentIndex = 0

    data?.forEach((item, index) => {
        intelligentData.push(item.value)
        if (item.value >= maxValueIntelligent) {
            maxValueIntelligent = item.value
            lastIntelligentIndex = index
        }
        if (item.value <= minValueIntelligent) {
            minValueIntelligent = item.value
        }
    })

    const value = {
        data: intelligentData || [],
        color: colors["--Colors-Use-Purple-Primary"],
        heightColor: colors["--Colors-Use-Error-Primary"],
        yMax: threshold > maxValueIntelligent ? threshold * 2 : minValueIntelligent + maxValueIntelligent,
        maxValueIntelligent,
        minValueIntelligent,
        lastIntelligentIndex
    }
    //#endregion
    return value
}
const getLightweight = (options: AIEchartsHelperProps) => {
    const {data, threshold = 0, colors} = options
    //#region 计算轻量模型的最大值、最小值和最大值索引
    const lightweightData: number[] = []
    let maxValueLightweight = 0
    let minValueLightweight = 0
    let lightweightIndex = 0

    data?.forEach((item, index) => {
        lightweightData.push(item.value)
        if (item.value >= maxValueLightweight) {
            maxValueLightweight = item.value
            lightweightIndex = index
        }
        if (item.value <= minValueLightweight) {
            minValueLightweight = item.value
        }
    })

    const value = {
        data: lightweightData,
        color: colors["--Colors-Use-Warning-Primary"],
        heightColor: colors["--Colors-Use-Error-Primary"],
        yMax: threshold > maxValueLightweight ? threshold * 2 : minValueLightweight + maxValueLightweight,
        maxValueLightweight,
        minValueLightweight,
        lightweightIndex
    }

    //#endregion
    return value
}
const symbolSize = 2
interface ContextPressureOptionProps extends ContextPressureEchartsProps {
    colors: Record<string, string>
}
/**获取 上下文压力echarts得option*/
const getContextPressureOption = (value: ContextPressureOptionProps): EChartsOption => {
    const {dataEcharts, threshold, colors} = value
    const {data, xData} = dataEcharts
    const intelligent = getIntelligent({data: data.intelligent, threshold, colors})
    const intelligentLength = data.intelligent.length

    const lightweight = getLightweight({data: data.lightweight, threshold, colors})
    const lightweightLength = data.lightweight?.length
    const seriesBase = {
        animation: false,
        type: "line",
        smooth: true,
        lineStyle: {
            width: 1
        },
        emphasis: {
            focus: "series"
        }
    }
    const option: EChartsOption = {
        grid: {
            top: 4, // 上边距
            right: 0, // 右边距
            bottom: 4, // 下边距
            left: 0 // 左边距
        },
        xAxis: [
            getXAxis({
                xData: xData.intelligent
            }),
            getXAxis({
                xData: xData.lightweight
            })
        ],
        yAxis: {
            show: false
        },
        visualMap: [
            {
                type: "piecewise",
                show: false,
                dimension: 1,
                seriesIndex: 0,
                max: intelligent.maxValueIntelligent,
                min: intelligent.minValueIntelligent,
                pieces: [
                    {gt: threshold, lte: intelligent.yMax, color: intelligent.heightColor}, // 大于部分
                    {lte: threshold, color: intelligent.color} // 小于等于部分
                ]
            },
            {
                type: "piecewise",
                show: false,
                dimension: 1,
                seriesIndex: 1,
                max: lightweight.maxValueLightweight,
                min: lightweight.minValueLightweight,
                pieces: [
                    {gt: threshold, lte: lightweight.yMax, color: lightweight.heightColor}, // 大于部分
                    {lte: threshold, color: lightweight.color} // 小于等于部分
                ]
            }
        ],
        series: [
            {
                ...seriesBase,
                name: "高质模型",
                xAxisIndex: 0,
                data: intelligent.data.map((val, index) => {
                    if (intelligent.lastIntelligentIndex === index && val >= intelligent.maxValueIntelligent) {
                        return {
                            value: val,
                            symbolSize
                        }
                    } else {
                        return {
                            value: val,
                            symbolSize: intelligentLength === 1 ? symbolSize : 0
                        }
                    }
                })
            },
            {
                ...seriesBase,
                name: "轻量模型",
                xAxisIndex: 1,
                data: lightweight.data.map((val, index) => {
                    if (lightweight.lightweightIndex - 1 === index && val >= lightweight.maxValueLightweight) {
                        return {
                            value: val,
                            symbolSize
                        }
                    } else {
                        return {
                            value: val,
                            symbolSize: lightweightLength === 1 ? symbolSize : 0
                        }
                    }
                }), // 轻量
                animation: false,
                type: "line",
                smooth: true,
                lineStyle: {
                    width: 1
                }
            }
        ]
    }
    return option
}

export interface AIPressureDetailsEchartsProps {
    dataEcharts: {
        data: Record<AIModelTypeEnum, AIEchartsDataKey[]>
        xData: Record<AIModelTypeEnum, number[]>
    }
    threshold: number
}
export const AIPressureDetailsEcharts: React.FC<AIPressureDetailsEchartsProps> = React.memo((props) => {
    const {dataEcharts, threshold} = props
    const chartRef = useRef<EChartsReact>(null)
    const colorRef = useGetColorsByTheme()
    const optionRef = useRef<echarts.EChartsOption>(
        getPressureDetailsOption({dataEcharts, threshold, colors: colorRef})
    )
    useEffect(() => {
        onSetOption()
    }, [dataEcharts, threshold])
    const onSetOption = useDebounceFn(
        () => {
            const echartsInstance = chartRef.current?.getEchartsInstance()
            if (!echartsInstance) return
            const newOption = getPressureDetailsOption({dataEcharts, threshold, colors: colorRef})
            optionRef.current = newOption
            echartsInstance.setOption(newOption, false, true)
        },
        {wait: 500, leading: true}
    ).run
    return <ReactECharts ref={chartRef} option={optionRef.current} style={{width: 432, height: 160}} />
})

const symbolSizeByDetails = 6
interface PressureDetailsOptionProps extends AIPressureDetailsEchartsProps {
    colors: Record<string, string>
}
/**获取详情版本 */
const getPressureDetailsOption = (value: PressureDetailsOptionProps): EChartsOption => {
    const {dataEcharts, threshold, colors} = value
    const {data, xData} = dataEcharts
    const intelligent = getIntelligent({data: data.intelligent, threshold, colors})
    const intelligentLength = data.intelligent?.length

    const lightweight = getLightweight({data: data.lightweight, threshold, colors})

    const lightweightLength = data.lightweight.length

    const seriesBase = {
        animation: false,
        type: "line",
        smooth: true,
        lineStyle: {
            width: 1
        },
        emphasis: {
            focus: "series"
        }
    }
    const option: EChartsOption = {
        grid: {
            left: 24, // 留足空间给 y 轴文字
            right: 14,
            bottom: 12, // 留足空间给 x 轴文字
            top: 12, // 留足空间给标题
            containLabel: true // 确保轴标签在 grid 内
        },
        tooltip: {
            trigger: "none",
            axisPointer: {
                type: "cross"
            }
        },
        xAxis: [
            getDetailsXAxis({
                xData: xData.intelligent,
                colors,
                type: AIModelTypeEnum.TierIntelligent,
                valueFormatter: (v: number) => `${formatNumberUnits(v)}`
            }),
            getDetailsXAxis({
                xData: xData.lightweight,
                colors,
                type: AIModelTypeEnum.TierLightweight,
                valueFormatter: (v: number) => `${formatNumberUnits(v)}`
            })
        ],
        yAxis: {
            type: "value",
            // name: "压力值 (k)",
            // nameLocation: "end", // 'start' | 'middle' | 'end'
            // nameTextStyle: {
            //     fontSize: 11
            // },
            // nameGap: 20, // 与轴的距离
            axisLabel: {
                fontSize: 11,
                color: colors["--Colors-Use-Neutral-Text-3-Secondary"]
            },
            splitLine: {
                lineStyle: {
                    type: "dashed",
                    color: colors["--Colors-Use-Neutral-Border"]
                }
            }
        },
        visualMap: [
            {
                type: "piecewise",
                show: false,
                dimension: 1,
                seriesIndex: 0,
                max: intelligent.maxValueIntelligent,
                min: intelligent.minValueIntelligent,
                pieces: [
                    {gt: threshold, lte: intelligent.yMax, color: intelligent.heightColor}, // 大于部分
                    {lte: threshold, color: intelligent.color} // 小于等于部分
                ]
            },
            {
                type: "piecewise",
                show: false,
                dimension: 1,
                seriesIndex: 1,
                max: lightweight.maxValueLightweight,
                min: lightweight.minValueLightweight,
                pieces: [
                    {gt: threshold, lte: lightweight.yMax, color: lightweight.heightColor}, // 大于部分
                    {lte: threshold, color: lightweight.color} // 小于等于部分
                ]
            }
        ],
        series: [
            {
                ...seriesBase,
                name: "高质模型",
                xAxisIndex: 0,
                data: intelligent.data.map((val, index) => {
                    if (intelligent.lastIntelligentIndex === index && val >= intelligent.maxValueIntelligent) {
                        return {
                            value: val,
                            modelName: data.intelligent[index].modelName,
                            symbolSize: symbolSizeByDetails
                        }
                    } else {
                        return {
                            value: val,
                            modelName: data.intelligent[index].modelName,
                            symbolSize: intelligentLength === 1 ? symbolSizeByDetails : 0
                        }
                    }
                }) // 高质
            },
            {
                ...seriesBase,
                name: "轻量模型",
                xAxisIndex: 1,
                data: lightweight.data.map((val, index) => {
                    if (lightweight.lightweightIndex === index && val >= lightweight.maxValueLightweight) {
                        return {
                            value: val,
                            modelName: data.lightweight[index].modelName,
                            symbolSize: symbolSizeByDetails
                        }
                    } else {
                        return {
                            value: val,
                            modelName: data.lightweight[index].modelName,
                            symbolSize: lightweightLength === 1 ? symbolSizeByDetails : 0
                        }
                    }
                }) // 轻量
            }
        ]
    }
    console.log("getPressureDetailsOption-option", option)
    return option
}
//#endregion

//#region 响应速度 echarts图表
export interface ResponseSpeedEchartsProps {
    dataEcharts: {
        data: Record<AIModelTypeEnum, AIEchartsDataKey[]>
        xData: Record<AIModelTypeEnum, number[]>
    }
}
export const ResponseSpeedEcharts: React.FC<ResponseSpeedEchartsProps> = React.memo((props) => {
    const {dataEcharts} = props

    const chartRef = useRef<EChartsReact>(null)
    const colorRef = useGetColorsByTheme()
    const optionRef = useRef<echarts.EChartsOption>(getResponseSpeedOption(dataEcharts, colorRef))
    useEffect(() => {
        onSetOption()
    }, [dataEcharts])
    const onSetOption = useDebounceFn(
        () => {
            const echartsInstance = chartRef.current?.getEchartsInstance()
            if (!echartsInstance) return
            const newOption = getResponseSpeedOption(dataEcharts, colorRef)
            optionRef.current = newOption
            echartsInstance.setOption(newOption, false, true)
        },
        {wait: 500, leading: true}
    ).run
    return <ReactECharts ref={chartRef} option={optionRef.current} style={{width: 72, height: 24}} />
})

const getResponseSpeedOption = (
    dataEcharts: ResponseSpeedEchartsProps["dataEcharts"],
    colors: Record<string, string>
): EChartsOption => {
    const {data, xData} = dataEcharts
    const intelligent = getIntelligent({data: data.intelligent, colors})
    const intelligentLength = data.intelligent?.length

    const lightweight = getLightweight({data: data.lightweight, colors})

    const lightweightLength = data.lightweight.length

    const seriesBase = {
        symbolSize: 0,
        animation: false,
        type: "line",
        smooth: true,
        emphasis: {
            focus: "series"
        }
    }
    const option: EChartsOption = {
        grid: {
            top: 4, // 上边距
            right: 0, // 右边距
            bottom: 4, // 下边距
            left: 0 // 左边距
        },
        xAxis: [
            getXAxis({
                xData: xData.intelligent
            }),
            getXAxis({
                xData: xData.lightweight
            })
        ],
        yAxis: {
            show: false
        },
        series: [
            {
                ...seriesBase,
                name: "高质模型",
                xAxisIndex: 0,
                data: intelligent.data.map((val, index) => {
                    if (intelligent.lastIntelligentIndex === index && val >= intelligent.maxValueIntelligent) {
                        return {
                            value: val,
                            symbolSize
                        }
                    } else {
                        return {
                            value: val,
                            symbolSize: intelligentLength === 1 ? symbolSize : 0
                        }
                    }
                }), // 高质
                symbol: "circle",
                animation: false,
                type: "line",
                smooth: true,
                lineStyle: {
                    width: 1,
                    color: intelligent.color
                },
                itemStyle: {
                    color: intelligent.color
                }
            },
            {
                ...seriesBase,
                name: "轻量模型",
                xAxisIndex: 1,
                data: lightweight.data.map((val, index) => {
                    if (lightweight.lightweightIndex === index && val >= lightweight.maxValueLightweight) {
                        return {
                            value: val,
                            symbolSize
                        }
                    } else {
                        return {
                            value: val,
                            symbolSize: lightweightLength === 1 ? symbolSize : 0
                        }
                    }
                }), // 轻量
                lineStyle: {
                    width: 1,
                    color: lightweight.color
                },
                itemStyle: {
                    color: lightweight.color
                }
            }
        ]
    }
    return option
}

export interface AICostDetailsEchartsProps {
    dataEcharts: {
        data: Record<AIModelTypeEnum, AIEchartsDataKey[]>
        xData: Record<AIModelTypeEnum, number[]>
    }
}
export const AICostDetailsEcharts: React.FC<AICostDetailsEchartsProps> = React.memo((props) => {
    const {dataEcharts} = props
    const colorRef = useGetColorsByTheme()
    const chartRef = useRef<EChartsReact>(null)
    const optionRef = useRef<echarts.EChartsOption>(getResponseSpeedDetailsOption(dataEcharts, colorRef))
    useEffect(() => {
        onSetOption()
    }, [dataEcharts])
    const onSetOption = useDebounceFn(
        () => {
            const echartsInstance = chartRef.current?.getEchartsInstance()
            if (!echartsInstance) return
            const newOption = getResponseSpeedDetailsOption(dataEcharts, colorRef)
            optionRef.current = newOption
            echartsInstance.setOption(newOption, false, true)
        },
        {wait: 500, leading: true}
    ).run
    return <ReactECharts ref={chartRef} option={optionRef.current} style={{width: 432, height: 160}} />
})

const getResponseSpeedDetailsOption = (
    dataEcharts: AICostDetailsEchartsProps["dataEcharts"],
    colors: Record<string, string>
): EChartsOption => {
    const {data, xData} = dataEcharts
    const intelligent = getIntelligent({data: data.intelligent, colors})
    const intelligentLength = data.intelligent?.length

    const lightweight = getLightweight({data: data.lightweight, colors})

    const lightweightLength = data.lightweight.length

    const seriesBase = {
        symbolSize: 0,
        animation: false,
        type: "line",
        smooth: true,
        emphasis: {
            focus: "series"
        }
    }
    const option: EChartsOption = {
        grid: {
            left: 24, // 留足空间给 y 轴文字
            right: 14,
            bottom: 12, // 留足空间给 x 轴文字
            top: 12, // 留足空间给标题
            containLabel: true // 确保轴标签在 grid 内
        },
        tooltip: {
            trigger: "none",
            axisPointer: {
                type: "cross"
            }
        },
        xAxis: [
            getDetailsXAxis({
                xData: xData.intelligent,
                colors,
                type: AIModelTypeEnum.TierIntelligent,
                valueFormatter: (v: number) => `${v}ms`
            }),
            getDetailsXAxis({
                xData: xData.lightweight,
                colors,
                type: AIModelTypeEnum.TierLightweight,
                valueFormatter: (v: number) => `${v}ms`
            })
        ],
        yAxis: {
            type: "value",
            // name: "延迟(ms)",
            // nameLocation: "end", // 'start' | 'middle' | 'end'
            // nameTextStyle: {
            //     fontSize: 11
            // },
            // nameGap: 20, // 与轴的距离
            axisLabel: {
                fontSize: 11,
                color: colors["--Colors-Use-Neutral-Text-3-Secondary"]
            },
            splitLine: {
                lineStyle: {
                    type: "dashed",
                    color: colors["--Colors-Use-Neutral-Border"]
                }
            }
        },
        series: [
            {
                ...seriesBase,
                name: "高质模型",
                xAxisIndex: 0,
                data: intelligent.data.map((val, index) => {
                    if (intelligent.lastIntelligentIndex === index && val >= intelligent.maxValueIntelligent) {
                        return {
                            value: val,
                            modelName: data.intelligent[index].modelName,
                            symbolSize: symbolSizeByDetails
                        }
                    } else {
                        return {
                            value: val,
                            modelName: data.intelligent[index].modelName,
                            symbolSize: intelligentLength === 1 ? symbolSizeByDetails : 0
                        }
                    }
                }), // 高质
                lineStyle: {
                    width: 1,
                    color: intelligent.color
                },
                itemStyle: {
                    color: intelligent.color
                }
            },
            {
                ...seriesBase,
                name: "轻量模型",
                xAxisIndex: 1,
                data: lightweight.data.map((val, index) => {
                    if (lightweight.lightweightIndex === index && val >= lightweight.maxValueLightweight) {
                        return {
                            value: val,
                            modelName: data.lightweight[index].modelName,
                            symbolSize: symbolSizeByDetails
                        }
                    } else {
                        return {
                            value: val,
                            modelName: data.lightweight[index].modelName,
                            symbolSize: lightweightLength === 1 ? symbolSizeByDetails : 0
                        }
                    }
                }), // 轻量
                lineStyle: {
                    width: 1,
                    color: lightweight.color
                },
                itemStyle: {
                    color: lightweight.color
                }
            }
        ]
    }
    return option
}
//#endregion
