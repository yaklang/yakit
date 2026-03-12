import React, {useState} from "react"
import ReactECharts, {EChartsOption} from "echarts-for-react"
import {useDebounceFn, useUpdateEffect} from "ahooks"
import {AIModelTypeEnum} from "../defaultConstant"
import {formatTime, formatTimestamp, formatTimeYMD} from "@/utils/timeUtil"
import moment from "moment"
import {formatNumberUnits} from "../utils"

const pressureColor: Record<AIModelTypeEnum, any> = {
    [AIModelTypeEnum.TierIntelligent]: {
        getColor: () => {
            return getComputedStyle(document.documentElement).getPropertyValue("--Colors-Use-Purple-Primary")
        },
        getHeightColor: () => {
            return getComputedStyle(document.documentElement).getPropertyValue("--Colors-Use-Error-Primary")
        }
    },
    [AIModelTypeEnum.TierLightweight]: {
        getColor: () => {
            return getComputedStyle(document.documentElement).getPropertyValue("--Colors-Use-Warning-Primary")
        },
        getHeightColor: () => {
            return getComputedStyle(document.documentElement).getPropertyValue("--Colors-Use-Error-Primary")
        }
    },
    [AIModelTypeEnum.TierVision]: {}
}

export interface AIEchartsDataKey {
    modelName: string
    value: number
}
//#region 上下文压力 echarts图表
export interface ContextPressureEchartsProps {
    dataEcharts: {
        data: Record<AIModelTypeEnum, AIEchartsDataKey[]>
    }
    threshold: Record<AIModelTypeEnum, number>
}
export const ContextPressureEcharts: React.FC<ContextPressureEchartsProps> = React.memo((props) => {
    const {dataEcharts, threshold} = props
    const [option, setOption] = useState<EChartsOption>(getContextPressureOption({dataEcharts, threshold}))
    useUpdateEffect(() => {
        onSetOption()
    }, [dataEcharts, threshold])
    const onSetOption = useDebounceFn(
        () => {
            const newOption = getContextPressureOption({dataEcharts, threshold})
            setOption(newOption)
        },
        {wait: 500, leading: true}
    ).run
    return <ReactECharts option={option} style={{width: 72, height: 24}} />
})

const getIntelligent = (data: AIEchartsDataKey[], threshold: ContextPressureEchartsProps["threshold"]) => {
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
        color: pressureColor.intelligent.getColor(),
        heightColor: pressureColor.intelligent.getHeightColor(),
        threshold: threshold.intelligent,
        yMax:
            threshold.intelligent > maxValueIntelligent
                ? threshold.intelligent * 2
                : minValueIntelligent + maxValueIntelligent,
        maxValueIntelligent,
        minValueIntelligent,
        lastIntelligentIndex
    }
    //#endregion
    return value
}
const getLightweight = (data: AIEchartsDataKey[], threshold: ContextPressureEchartsProps["threshold"]) => {
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
        color: pressureColor.lightweight.getColor(),
        heightColor: pressureColor.lightweight.getHeightColor(),
        threshold: threshold.lightweight,
        yMax:
            threshold.lightweight > maxValueLightweight
                ? threshold.lightweight * 2
                : minValueLightweight + maxValueLightweight,
        maxValueLightweight,
        minValueLightweight,
        lightweightIndex
    }

    //#endregion
    return value
}
const symbolSize = 2
/**获取 上下文压力echarts得option*/
const getContextPressureOption = (value: ContextPressureEchartsProps): EChartsOption => {
    const {dataEcharts, threshold} = value
    const {data} = dataEcharts
    const intelligent = getIntelligent(data.intelligent, threshold)
    const lightweightLength = data.intelligent?.length

    const lightweight = getLightweight(data.lightweight, threshold)

    const intelligentLength = data.lightweight.length
    const option: EChartsOption = {
        grid: {
            top: 4, // 上边距
            right: 0, // 右边距
            bottom: 4, // 下边距
            left: 0 // 左边距
        },
        xAxis: {
            show: false,
            type: "category"
        },
        yAxis: {
            show: false
        },
        visualMap: [
            {
                type: "piecewise",
                show: false,
                dimension: 0,
                seriesIndex: 0,
                max: intelligent.maxValueIntelligent,
                min: intelligent.minValueIntelligent,
                pieces: [
                    {gt: intelligent.threshold, lte: intelligent.yMax, color: intelligent.heightColor}, // 大于部分
                    {lte: intelligent.threshold, color: intelligent.color} // 小于等于部分
                ]
            },
            {
                type: "piecewise",
                show: false,
                dimension: 0,
                seriesIndex: 1,
                max: lightweight.maxValueLightweight,
                min: lightweight.minValueLightweight,
                pieces: [
                    {gt: lightweight.threshold, lte: lightweight.yMax, color: lightweight.heightColor}, // 大于部分
                    {lte: lightweight.threshold, color: lightweight.color} // 小于等于部分
                ]
            }
        ],
        series: [
            {
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
                animation: false,
                type: "line",
                smooth: true,
                lineStyle: {
                    width: 1
                }
            },
            {
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
        xData: number[]
    }
    threshold: Record<AIModelTypeEnum, number>
}
export const AIPressureDetailsEcharts: React.FC<AIPressureDetailsEchartsProps> = React.memo((props) => {
    const {dataEcharts, threshold} = props
    const [option, setOption] = useState<EChartsOption>(getPressureDetailsOption({dataEcharts: dataEcharts, threshold}))
    useUpdateEffect(() => {
        onSetOption()
    }, [dataEcharts])
    const onSetOption = useDebounceFn(
        () => {
            const newOption = getPressureDetailsOption({
                dataEcharts: dataEcharts,
                threshold
            })
            setOption(newOption)
        },
        {wait: 500, leading: true}
    ).run
    return <ReactECharts option={option} style={{width: 432, height: 160}} />
})

const symbolSizeByDetails = 6
/**获取详情版本 */
const getPressureDetailsOption = (value: AIPressureDetailsEchartsProps): EChartsOption => {
    const {dataEcharts, threshold} = value
    const {data, xData} = dataEcharts
    const intelligent = getIntelligent(data.intelligent, threshold)
    const lightweightLength = data.intelligent?.length

    const lightweight = getLightweight(data.lightweight, threshold)

    const intelligentLength = data.lightweight.length

    const xAxisLineColor = getComputedStyle(document.documentElement).getPropertyValue("--Colors-Use-Neutral-Border")
    const option: EChartsOption = {
        grid: {
            left: 24, // 留足空间给 y 轴文字
            right: 12,
            bottom: 12, // 留足空间给 x 轴文字
            top: 12, // 留足空间给标题
            containLabel: true // 确保轴标签在 grid 内
        },
        tooltip: {
            trigger: "axis",
            formatter: (params) => {
                let result = formatTimestamp(Number(params[0].name)) + "<br/>"
                params.forEach((param) => {
                    result += `${param.marker} ${param.seriesName}: ${formatNumberUnits(param.value)}<br/>`
                })
                return result
            }
        },
        xAxis: {
            type: "category",
            data: xData,
            axisLabel: {
                rotate: 0,
                fontSize: 11,
                color: "#868C97",
                formatter: (v) => moment.unix(v).format("HH:mm")
            },
            axisLine: {
                lineStyle: {
                    color: xAxisLineColor
                }
            },
            splitLine: {
                show: true,
                lineStyle: {
                    type: "dashed"
                }
            },
            // 隐藏刻度线
            axisTick: {
                show: false // 不显示刻度线
            },
            boundaryGap: false
        },
        yAxis: {
            type: "value",
            name: "压力值 (k)",
            nameLocation: "end", // 'start' | 'middle' | 'end'
            nameTextStyle: {
                fontSize: 11
            },
            nameGap: 20, // 与轴的距离
            axisLabel: {
                fontSize: 11,
                color: "#868C97"
            },
            splitLine: {
                lineStyle: {
                    type: "dashed"
                }
            }
        },
        visualMap: [
            {
                type: "piecewise",
                show: false,
                dimension: 0,
                seriesIndex: 0,
                max: intelligent.maxValueIntelligent,
                min: intelligent.minValueIntelligent,
                pieces: [
                    {gt: intelligent.threshold, lte: intelligent.yMax, color: intelligent.heightColor}, // 大于部分
                    {lte: intelligent.threshold, color: intelligent.color} // 小于等于部分
                ]
            },
            {
                type: "piecewise",
                show: false,
                dimension: 0,
                seriesIndex: 1,
                max: lightweight.maxValueLightweight,
                min: lightweight.minValueLightweight,
                pieces: [
                    {gt: lightweight.threshold, lte: lightweight.yMax, color: lightweight.heightColor}, // 大于部分
                    {lte: lightweight.threshold, color: lightweight.color} // 小于等于部分
                ]
            }
        ],
        series: [
            {
                name: "高质模型",
                data: intelligent.data.map((val, index) => {
                    if (intelligent.lastIntelligentIndex === index && val >= intelligent.maxValueIntelligent) {
                        return {
                            value: val,
                            symbolSize: symbolSizeByDetails
                        }
                    } else {
                        return {
                            value: val,
                            symbolSize: intelligentLength === 1 ? symbolSizeByDetails : 0
                        }
                    }
                }), // 高质
                animation: false,
                type: "line",
                smooth: true,
                lineStyle: {
                    width: 1
                }
            },
            {
                name: "轻量模型",
                data: lightweight.data.map((val, index) => {
                    if (lightweight.lightweightIndex === index && val >= lightweight.maxValueLightweight) {
                        return {
                            value: val,
                            symbolSize: symbolSizeByDetails
                        }
                    } else {
                        return {
                            value: val,
                            symbolSize: lightweightLength === 1 ? symbolSizeByDetails : 0
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
//#endregion

//#region 响应速度 echarts图表
export interface ResponseSpeedEchartsProps {
    dataEcharts: {
        data: Record<AIModelTypeEnum, AIEchartsDataKey[]>
    }
}
export const ResponseSpeedEcharts: React.FC<ResponseSpeedEchartsProps> = React.memo((props) => {
    const {dataEcharts} = props
    const [option, setOption] = useState<EChartsOption>(getResponseSpeedOption(dataEcharts))
    useUpdateEffect(() => {
        onSetOption()
    }, [dataEcharts])
    const onSetOption = useDebounceFn(
        () => {
            const newOption = getResponseSpeedOption(dataEcharts)
            setOption(newOption)
        },
        {wait: 500, leading: true}
    ).run
    return <ReactECharts option={option} style={{width: 72, height: 24}} />
})

const getResponseSpeedOption = (dataEcharts: ResponseSpeedEchartsProps["dataEcharts"]): EChartsOption => {
    const {data} = dataEcharts
    const intelligentData = data.intelligent?.map((item) => item.value) || []
    const lightweightData = data.lightweight?.map((item) => item.value) || []
    const intelligent = {
        data: intelligentData || [],
        color: pressureColor.intelligent.getColor()
    }
    const lightweight = {
        data: lightweightData || [],
        color: pressureColor.lightweight.getColor()
    }
    const option: EChartsOption = {
        grid: {
            top: 4, // 上边距
            right: 0, // 右边距
            bottom: 4, // 下边距
            left: 0 // 左边距
        },
        xAxis: {
            show: false,
            type: "category"
        },
        yAxis: {
            show: false
        },
        series: [
            {
                data: intelligent.data,
                symbolSize: 0,
                animation: false,
                type: "line",
                smooth: true,
                lineStyle: {
                    width: 1,
                    color: intelligent.color
                }
            },
            {
                data: lightweight.data,
                symbolSize: 0,
                animation: false,
                type: "line",
                smooth: true,
                lineStyle: {
                    width: 1,
                    color: lightweight.color
                }
            }
        ]
    }
    return option
}

interface AICostDetailsEchartsProps extends ResponseSpeedEchartsProps {}
export const AICostDetailsEcharts: React.FC<AICostDetailsEchartsProps> = React.memo((props) => {
    const {dataEcharts} = props
    const [option, setOption] = useState<EChartsOption>(getResponseSpeedDetailsOption(dataEcharts))
    useUpdateEffect(() => {
        onSetOption()
    }, [dataEcharts])
    const onSetOption = useDebounceFn(
        () => {
            const newOption = getResponseSpeedDetailsOption(dataEcharts)
            setOption(newOption)
        },
        {wait: 500, leading: true}
    ).run
    return <ReactECharts option={option} style={{width: 432, height: 160}} />
})

const getResponseSpeedDetailsOption = (dataEcharts: ResponseSpeedEchartsProps["dataEcharts"]): EChartsOption => {
    const {data} = dataEcharts
    const intelligentData = data.intelligent?.map((item) => item.value) || []
    const lightweightData = data.lightweight?.map((item) => item.value) || []
    const intelligent = {
        data: intelligentData || [],
        color: pressureColor.intelligent.getColor()
    }
    const lightweight = {
        data: lightweightData || [],
        color: pressureColor.lightweight.getColor()
    }
    const option: EChartsOption = {
        grid: {
            top: 4, // 上边距
            right: 0, // 右边距
            bottom: 4, // 下边距
            left: 0 // 左边距
        },
        xAxis: {
            show: false,
            type: "category"
        },
        yAxis: {
            show: false
        },
        series: [
            {
                data: intelligent.data,
                symbolSize: 0,
                animation: false,
                type: "line",
                smooth: true,
                lineStyle: {
                    width: 1,
                    color: intelligent.color
                }
            },
            {
                data: lightweight.data,
                symbolSize: 0,
                animation: false,
                type: "line",
                smooth: true,
                lineStyle: {
                    width: 1,
                    color: lightweight.color
                }
            }
        ]
    }
    return option
}
//#endregion
