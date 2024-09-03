import {isNumberNaN} from "@/utils/tool"
import {logChartsColorList} from "./constant"
import {EChartsOption} from "@/pages/risks/VulnerabilityLevelPie/VulnerabilityLevelPieType"
import {GraphData} from "@/pages/graph/base"
import groupBy from "lodash/groupBy"
import numeral from "numeral"
import ReactDOM from "react-dom"
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
                lineHeight: 18,
                formatter: (value) => numeral(value).format("0 a")
            }
        },
        series
    }
    return option
}

const getLineSeriesAndAxis = (graphData) => {
    const group = groupBy(graphData.data || [], "id") || {}
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

export const getPieOption = (graphData: GraphData) => {
    console.log("getPieOption", graphData.data)
    const option: EChartsOption = {
        color: logChartsColorList.map((ele) => ele.color),
        // legend: {
        //     // type: 'scroll',
        //     // orient: 'vertical',
        //     // right:'20%',
        //     // top:24,
        //     data: graphData.data.map((ele) => ({
        //         name: ele.key,
        //         value: ele.value,
        //         icon: "circle",
        //         // itemStyle: {
        //         //     borderWidth: 12,
        //         //     borderColor: "red"
        //         // },
        //         textStyle: {
        //             color: "#85899E",
        //             overflow:'truncate'
        //         }
        //     }))
        // },
        tooltip: {
            trigger: "item",

            // alwaysShowContent: true,
            // triggerOn: "click",
            borderWidth: 0,
            backgroundColor: "#1E1B39",
            confine: true,
            appendToBody: true,
            borderRadius: 8,
            formatter: (params) => {
                return `<div
                        style='
                                display: flex;
                                flex-direction: column;
                                gap: 8px;
                                align-items: center;
                                max-width: 200px;
                            '
                    >
                        <span
                            style='
                                color: #ccd2de; 
                                font-size: 16px; 
                                font-weight: 400; 
                                line-height: 18px; 
                                max-width: 200px;
                                white-space: nowrap;
                                text-overflow: ellipsis;
                                overflow: hidden;
                                word-break: break-all;
                            '
                        >
                            ${params?.name}
                        </span>
                        <span style='color: #fff; font-size: 18px; fontWeight: 700; lineHeight: 24px'>
                            ${params?.value}(${params?.percent}%)
                        </span>
                    </div>`
            }
            // extraCssText: 'width: 180px'
            // position:  (pos, params, el, elRect, size)=> {
            //     console.log('pos, params, el, elRect, size',pos, params, el, elRect, size)
            //     var obj = { top: 10 };
            //     obj[['left', 'right'][+(pos[0] < size.viewSize[0] / 2)]] = 30;
            //     return obj;
            //   },
        },
        series: [
            {
                name: "total",
                type: "pie",
                radius: [0, "20%"],
                label: {
                    position: "center",
                    formatter: ["{a|{c}}", "{b|total}"].join("\n"),
                    rich: {
                        a: {
                            color: "#31343F",
                            fontWeight: 700,
                            fontSize: 44,
                            fontFamily: "Inter",
                            lineHeight: 52,
                            align: "center"
                        },
                        b: {
                            color: "#B4BBCA",
                            fontWeight: 400,
                            fontSize: 18,
                            fontFamily: "Inter",
                            lineHeight: 32,
                            align: "center"
                        }
                    }
                },
                labelLine: {
                    show: false
                },
                showEmptyCircle: false,
                emphasis: {},
                itemStyle: {
                    color: "#fff"
                },
                data: [{value: 1481, name: "total"}]
            },
            {
                name: "data",
                type: "pie",
                radius: ["40%", "80%"],
                minAngle: 5,
                selectedMode: "single",
                selectedOffset: 20,
                itemStyle: {
                    borderRadius: 4
                },
                label: {
                    show: true,
                    position: "inside",
                    formatter: "{d} %",
                    color: "#fff",
                    fontSize: 16,
                    fontWeight: 700
                },
                tooltip: {
                    trigger: "item",
                    textStyle: {
                        width: 20,
                        // @ts-ignore
                        overflow: "truncate"
                    }
                },
                // emphasis: {
                //     label: {
                //         show: true,
                //         formatter: ["{a|{b}}", "{b|{c}}"].join("\n"),
                //         backgroundColor: "#1E1B39",
                //         borderRadius: 8,
                //         padding: [12, 16],
                //         rich: {
                //             a: {
                //                 color: "#CCD2DE",
                //                 fontWeight: 400,
                //                 fontSize: 16,
                //                 lineHeight: 18,
                //                 align: "center"
                //             },
                //             b: {
                //                 color: "#FFFFFF",
                //                 fontWeight: 700,
                //                 fontSize: 18,
                //                 lineHeight: 24,
                //                 align: "center",
                //                 padding: [4, 0, 0, 0]
                //             }
                //         }
                //     }
                // },
                data: graphData.data.map((ele) => ({value: ele.value, name: ele.key, select: true}))
            }
        ]
    }
    return option
}
