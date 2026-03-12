import React, {useState} from "react"
import ReactECharts, {EChartsOption} from "echarts-for-react"
import {useDebounceFn, useUpdateEffect} from "ahooks"
import {AIModelTypeEnum} from "../defaultConstant"

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

const symbolSize = 2
/**获取 上下文压力echarts得option*/
const getContextPressureOption = (value: ContextPressureEchartsProps): EChartsOption => {
    const {dataEcharts, threshold} = value
    const {data} = dataEcharts

    //#region 计算高质模型的最大值、最小值和最大值索引
    const intelligentData: number[] = []
    let maxValueIntelligent = 0
    let minValueIntelligent = 0
    let lastIntelligentIndex = 0

    data.intelligent?.forEach((item, index) => {
        intelligentData.push(item.value)
        if (item.value >= maxValueIntelligent) {
            maxValueIntelligent = item.value
            lastIntelligentIndex = index
        }
        if (item.value <= minValueIntelligent) {
            minValueIntelligent = item.value
        }
    })
    const lightweightLength = intelligentData.length
    const intelligent = {
        data: intelligentData || [],
        color: pressureColor.intelligent.getColor(),
        heightColor: pressureColor.intelligent.getHeightColor(),
        threshold: threshold.intelligent,
        yMax:
            threshold.intelligent > maxValueIntelligent
                ? threshold.intelligent * 2
                : minValueIntelligent + maxValueIntelligent
    }
    //#endregion

    //#region 计算轻量模型的最大值、最小值和最大值索引
    const lightweightData: number[] = []
    let maxValueLightweight = 0
    let minValueLightweight = 0
    let lightweightIndex = 0

    data.intelligent?.forEach((item, index) => {
        lightweightData.push(item.value)
        if (item.value >= maxValueLightweight) {
            maxValueLightweight = item.value
            lightweightIndex = index
        }
        if (item.value <= minValueLightweight) {
            minValueLightweight = item.value
        }
    })
    const intelligentLength = lightweightData.length
    const lightweight = {
        data: lightweightData,
        color: pressureColor.lightweight.getColor(),
        heightColor: pressureColor.lightweight.getHeightColor(),
        threshold: threshold.lightweight,
        yMax:
            threshold.lightweight > maxValueLightweight
                ? threshold.lightweight * 2
                : minValueLightweight + maxValueLightweight
    }

    //#endregion

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
                max: maxValueIntelligent,
                min: minValueIntelligent,
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
                max: maxValueLightweight,
                min: minValueLightweight,
                pieces: [
                    {gt: lightweight.threshold, lte: lightweight.yMax, color: lightweight.heightColor}, // 大于部分
                    {lte: lightweight.threshold, color: lightweight.color} // 小于等于部分
                ]
            }
        ],
        series: [
            {
                data: intelligent.data.map((val, index) => {
                    if (lastIntelligentIndex === index && val >= maxValueIntelligent) {
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
                    if (lightweightIndex === index && val >= maxValueLightweight) {
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
//#endregion
