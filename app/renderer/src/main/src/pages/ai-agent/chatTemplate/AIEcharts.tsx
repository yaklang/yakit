import React, {useState} from "react"
import ReactECharts, {EChartsOption} from "echarts-for-react"
import {useDebounceEffect, useDebounceFn, useUpdateEffect} from "ahooks"
import {formatNumberUnits} from "../utils"

//#region 上下文压力 echarts图表
interface ContextPressureEchartsProps {
    data: number[]
    threshold: number
}
export const ContextPressureEcharts: React.FC<ContextPressureEchartsProps> = React.memo((props) => {
    const {data, threshold} = props
    const [option, setOption] = useState<EChartsOption>(getContextPressureOption(data, threshold))
    useUpdateEffect(() => {
        onSetOption()
    }, [data, threshold])
    const onSetOption = useDebounceFn(
        () => {
            const newOption = getContextPressureOption(data, threshold)
            setOption(newOption)
        },
        {wait: 500, leading: true}
    ).run
    return <ReactECharts option={option} style={{width: 230, height: 200}} />
})
const color = {
    low: {
        visual: "#28c08e",
        symbolBorder: "#5ca580"
    },
    height: {
        visual: "#f15757",
        symbolBorder: "#dc625d"
    }
}
/**获取 上下文压力echarts得option*/
export const getContextPressureOption = (data: number[], threshold: number): EChartsOption => {
    const maxValue = Math.max(...data)
    const minValue = Math.min(...data)
    const yMax = threshold > maxValue ? threshold + minValue : minValue + maxValue
    const yMin = minValue > threshold ? threshold - minValue : minValue

    const option: EChartsOption = {
        grid: {
            top: 24, // 上边距
            right: 12, // 右边距
            bottom: 24, // 下边距
            left: 48, // 左边距
            containLabel: true
        },
        xAxis: {
            type: "category",
            axisLabel: {show: false},
            axisTick: {show: false},
            axisLine: {
                lineStyle: {
                    color: "#e6e8ed",
                    width: 2
                },
                symbol: ["none", "arrow"],
                symbolSize: [10, 15],
                symbolOffset: [50, 0]
            },
            splitLine: {
                show: true,
                lineStyle: {
                    color: "#e6e8ed",
                    width: 1
                }
            }
        },
        yAxis: {
            type: "value",
            min: yMin,
            max: yMax,
            axisTick: {
                show: false
            },
            axisLabel: {
                show: false
            },
            splitLine: {
                show: false,
                showMaxLabel: true,
                lineStyle: {
                    width: 1
                }
            },
            axisLine: {
                show: true,
                lineStyle: {
                    color: "#e6e8ed",
                    width: 2
                },
                symbol: ["none", "arrow"],
                symbolSize: [10, 15],
                symbolOffset: [0, 0]
            }
        },
        visualMap: {
            type: "piecewise",
            show: false,
            dimension: 1,
            seriesIndex: 0,
            pieces: [
                {gt: threshold, lte: yMax, color: color.height.visual}, // 大于部分
                {lte: threshold, color: color.low.visual} // 小于等于部分
            ]
        },
        series: [
            {
                data: data.map((item, index) => {
                    if (index === data.length - 1) {
                        return {
                            value: item,
                            symbol: "circle",
                            symbolSize: 12,
                            itemStyle: {
                                color: "#fff",
                                borderColor: item > threshold ? color.height.visual : color.low.visual,
                                borderWidth: 3
                            }
                        }
                    }
                    return {
                        value: item,
                        symbolSize: 0
                    }
                }),
                type: "line",
                smooth: true,
                lineStyle: {
                    width: 2
                },
                markLine: {
                    silent: true,
                    symbol: "none",
                    data: [
                        {
                            yAxis: threshold,
                            lineStyle: {
                                color: "#353639",
                                width: 1,
                                type: "dashed"
                            },
                            label: {
                                position: "start",
                                formatter: (params: any) => {
                                    return formatNumberUnits(params.value)
                                },
                                fontSize: 10,
                                fontWeight: 600
                            }
                        },
                        {
                            yAxis: yMax, // 定位到最大值位置
                            label: {
                                position: "start",
                                formatter: "压力值",
                                fontSize: 10,
                                color: "#9CA3B1",
                                distance: 5
                            },
                            lineStyle: {
                                color: "#e6e8ed",
                                width: 1,
                                type: "solid"
                            }
                        }
                    ]
                }
            }
        ]
    }
    return option
}
//#endregion
