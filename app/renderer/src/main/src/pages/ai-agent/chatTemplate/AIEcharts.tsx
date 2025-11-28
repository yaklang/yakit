import React, {useState} from "react"
import ReactECharts, {EChartsOption} from "echarts-for-react"
import {useDebounceFn, useUpdateEffect} from "ahooks"

//#region 上下文压力 echarts图表
export interface ContextPressureEchartsProps {
    dataEcharts: {
        data: number[]
        xAxis: string[]
    }
    threshold: number
}
export const ContextPressureEcharts: React.FC<ContextPressureEchartsProps> = React.memo((props) => {
    const {dataEcharts, threshold} = props
    const [option, setOption] = useState<EChartsOption>(getContextPressureOption(dataEcharts, threshold))
    useUpdateEffect(() => {
        onSetOption()
    }, [dataEcharts, threshold])
    const onSetOption = useDebounceFn(
        () => {
            const newOption = getContextPressureOption(dataEcharts, threshold)
            setOption(newOption)
        },
        {wait: 500, leading: true}
    ).run
    return <ReactECharts option={option} style={{width: 72, height: 24}} />
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
const getContextPressureOption = (
    dataEcharts: ContextPressureEchartsProps["dataEcharts"],
    threshold: number
): EChartsOption => {
    const {data} = dataEcharts
    const maxValue = Math.max(...data)
    const minValue = Math.min(...data)
    const yMax = threshold > maxValue ? threshold * 2 : minValue + maxValue
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
        visualMap: {
            type: "piecewise",
            show: false,
            dimension: 1,
            seriesIndex: 0,
            max: maxValue,
            min: minValue,
            pieces: [
                {gt: threshold, lte: yMax, color: color.height.visual}, // 大于部分
                {lte: threshold, color: color.low.visual} // 小于等于部分
            ]
        },
        series: [
            {
                data,
                symbolSize: 0,
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
interface ResponseSpeedEchartsProps {
    dataEcharts: {
        data: number[]
        xAxis: string[]
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
                data,
                symbolSize: 0,
                animation: false,
                type: "line",
                smooth: true,
                lineStyle: {
                    width: 1,
                    color: "#868c97"
                }
            }
        ]
    }
    return option
}
//#endregion
