import {isNumberNaN} from "@/utils/tool"
import {logChartsColorList} from "./constant"
import {EChartsOption} from "@/pages/risks/VulnerabilityLevelPie/VulnerabilityLevelPieType"
import {GraphData} from "@/pages/graph/base"
import groupBy from "lodash/groupBy"
import numeral from "numeral"

const getBarSeries = (graphData) => {
    const seriesList = graphData.data.filter((ele) => Array.isArray(ele.value)).map((ele) => ele.value.length)
    const seriesLength = Math.max(...seriesList, 0)
    const series: EChartsOption["series"] = []

    if (seriesLength === 0) {
        series.push({
            name: 1,
            data: graphData.data.map((ele) => (isNumberNaN(ele.value) ? 0 : ele.value)),
            type: "bar",
            showBackground: true,
            backgroundStyle: {
                color: "#f8f8f8",
                borderRadius: 3
            },
            itemStyle: {
                borderRadius: 3
            }
        })
    } else {
        for (let index = 0; index < seriesLength; index++) {
            const data: number[] = []
            graphData.data.forEach((element) => {
                if (Array.isArray(element.value)) {
                    const value = element.value[index]
                    data.push(isNumberNaN(value) ? 0 : value)
                } else {
                    if (index === 0) {
                        data.push(isNumberNaN(element.value) ? 0 : element.value)
                    } else {
                        data.push(0)
                    }
                }
            })
            series.push({
                name: `系列${index}`,
                data,
                type: "bar",
                showBackground: true,
                backgroundStyle: {
                    color: "#f8f8f8",
                    borderRadius: 3
                },
                itemStyle: {
                    borderRadius: 3
                }
            })
        }
    }
    return series
}
/**
 * @description 柱状图
 * @param graphData :GraphData
 * @returns {EChartsOption}
 */
export const getBarOption = (graphData: GraphData) => {
    const xAxis = graphData.data.map((ele) => ele.key)
    const series: EChartsOption["series"] = getBarSeries(graphData)
    const option: EChartsOption = {
        color: logChartsColorList.map((ele) => ele.color),
        tooltip: {
            trigger: "axis",
            axisPointer: {
                type: "shadow",
                shadowStyle: {
                    color: "rgba(234, 236, 243, 0.3)"
                }
            }
        },
        xAxis: {
            type: "category",
            data: xAxis,
            axisTick: {
                show: false
            },
            axisLabel: {
                show: true,
                color: "#85899E",
                fontWeight: 400,
                fontFamily: "PingFang HK",
                fontSize: 14,
                align: "center",
                lineHeight: 20
            },
            axisLine: {
                show: true,
                lineStyle: {
                    color: "#EAECF3"
                }
            }
        },
        yAxis: {
            type: "value",
            splitLine: {
                lineStyle: {
                    color: "#EAECF3",
                    width: 1,
                    type: [10, 15],
                    cap: "round"
                }
            },
            axisLabel: {
                show: true,
                color: "#85899E",
                fontWeight: 400,
                fontFamily: "Inter",
                fontSize: 16,
                align: "right",
                lineHeight: 18
            }
        },
        series
    }
    return option
}

const getLineSeriesAndAxis = (graphData) => {
    console.log("getLineSeries---data", graphData.data)
    const group = groupBy(graphData.data || [], "id") || {}
    console.log("getLineSeries---group", group)
    const series: EChartsOption["series"] = []
    let xAxis: string[] = []
    Object.keys(group).forEach((key, index) => {
        if (index === 0) {
            xAxis = group[key].map((ele) => ele.key)
        }
        if (group.hasOwnProperty(key)) {
            const item = group[key]
            const data = item.map((ele) => ele.value)
            series.push({
                name: key || `系列${index}`,
                data,
                type: "line",
                symbol: "none",
                itemStyle: {}
            })
        }
    })
    return {
        series,
        xAxis
    }
}
/**
 * @description 折线图
 * @param graphData :GraphData
 * @returns {EChartsOption}
 */
export const getLineOption = (graphData: GraphData) => {
    const xAxis = getLineSeriesAndAxis(graphData).xAxis
    const series: EChartsOption["series"] = getLineSeriesAndAxis(graphData).series
    const option: EChartsOption = {
        color: logChartsColorList.map((ele) => ele.color),
        tooltip: {
            trigger: "axis"
        },
        xAxis: {
            type: "category",
            data: xAxis,
            axisTick: {
                show: false
            },
            axisLabel: {
                show: true,
                color: "#85899E",
                fontWeight: 400,
                fontFamily: "PingFang HK",
                fontSize: 14,
                align: "center",
                lineHeight: 20
            },
            axisLine: {
                show: true,
                lineStyle: {
                    color: "#EAECF3"
                }
            }
        },
        yAxis: {
            type: "value",
            splitLine: {
                lineStyle: {
                    color: "#EAECF3",
                    width: 1,
                    type: [10, 15],
                    cap: "round"
                }
            },
            axisLabel: {
                show: true,
                color: "#85899E",
                fontWeight: 400,
                fontFamily: "Inter",
                fontSize: 16,
                align: "right",
                lineHeight: 18,
                formatter: (value) => numeral(value).format("0 a")
            }
        },
        series
    }
    return option
}
