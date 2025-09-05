import React, {useEffect, useMemo, useLayoutEffect, useRef, useState} from "react"
import * as echarts from "echarts"
import {EChartsOption} from "echarts"
import styles from "./EchartsInit.module.scss"
import classNames from "classnames"
import {useSize} from "ahooks"
import {useTheme} from "@/hook/useTheme"
import cloneDeep from "lodash/cloneDeep"

interface VerticalOptionBarProps {
    content: any
}

interface ContentProp {
    data: any[]
    name: string
    name_verbose: string
    reason: string
    type: string
    type_verbose: string
}
interface MultiPieProps {
    content: ContentProp
}

interface HollowPieProps {
    data: {name: any; value: any; color: string; direction?: string}[]
    title?: string
}
interface NightingleRoseProps {
    content: ContentProp
}
interface DetailsProps {
    name: string
    content: string
}
interface EchartsCardProps {
    dataTitle: string
    dataSource: any[]
}

export const VerticalOptionBar: React.FC<VerticalOptionBarProps> = (props) => {
    const getCssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    const {theme} = useTheme()
    const {content} = props
    const ref = useRef<HTMLDivElement>(null)
    const size = useSize(ref)
    const chartRef = useRef<HTMLDivElement>(null)

    // 构建完整 option 的函数
    const buildOptions = (content: any) => {
        const titleColor = getCssVar("--Colors-Use-Neutral-Text-1-Title")
        const axisColor = getCssVar("--Colors-Use-Neutral-Text-4-Help-text")
        const tooltipBg = getCssVar("--Colors-Use-Basic-Background")
        const tooltipText = getCssVar("--Colors-Use-Neutral-Text-1-Title")
        const barColor = getCssVar("--Colors-Use-Primary-Default")

        const option: any = {
            title: {
                text: "",
                left: "center",
                textStyle: {
                    color: titleColor,
                    fontWeight: "bold"
                }
            },
            tooltip: {
                trigger: "axis",
                axisPointer: {type: "shadow"},
                backgroundColor: tooltipBg,
                borderColor: getCssVar("--Colors-Use-Neutral-Border"),
                textStyle: {color: tooltipText}
            },
            xAxis: {
                type: "category",
                data: [],
                axisLabel: {color: axisColor},
                axisLine: {lineStyle: {color: axisColor}}
            },
            yAxis: {
                type: "value",
                axisLabel: {color: axisColor},
                axisLine: {lineStyle: {color: axisColor}},
                splitLine: {lineStyle: {color: getCssVar("--Colors-Use-Neutral-Border")}}
            },
            series: [
                {
                    data: [],
                    type: "bar",
                    itemStyle: {color: barColor},
                    label: {show: true, position: "top", formatter: "{c}", color: titleColor}
                }
            ]
        }

        if (content?.type_verbose === "通用KV") {
            const {name_verbose, name, data, complexity_group} = content
            let title: string[] = []
            let value: {value: number}[] = []

            Array.isArray(data) &&
                data.forEach((item) => {
                    title.push(item.key_verbose || item.key)
                    value.push({value: item.value})
                })

            if (complexity_group && complexity_group.length > 0) {
                option.xAxis.axisLabel.interval = 0
                const allTitle = complexity_group.split(",")
                let cacheTitle: string[] = []
                let cacheValue: {value: number}[] = []

                allTitle.forEach((item) => {
                    if (title.includes(item)) {
                        const idx = title.indexOf(item)
                        cacheTitle.push(title[idx])
                        cacheValue.push(value[idx])
                    }
                })

                allTitle.forEach((item, index) => {
                    if (!cacheTitle.includes(item)) {
                        cacheTitle.splice(index, 0, item)
                        cacheValue.splice(index, 0, {value: 0})
                    }
                })

                title = cacheTitle
                value = cacheValue
            }

            option.title.text = name_verbose || name
            option.xAxis.data = title || []
            option.series[0].data = value || []
        } else {
            const {title, value, name} = content
            option.xAxis.data = name || []
            option.series[0].data = value || []
            option.title.text = title
        }

        return option
    }

    useLayoutEffect(() => {
        if (!chartRef.current) return

        const myChart = echarts.init(chartRef.current)
        const option = buildOptions(content) // 每次重新生成完整 option
        myChart.setOption(option)

        return () => {
            myChart.dispose()
        }
    }, [size?.width, theme, content]) // theme 变化时会重新渲染

    return (
        <div className={styles["echarts-box"]} ref={ref} data-type='echarts-box' echart-type='vertical-bar'>
            <div className={classNames(styles["echart-item"], styles["echart-item-vertical-bar"])} ref={chartRef}></div>
        </div>
    )
}

// 堆叠柱状图
export const StackedVerticalBar: React.FC<VerticalOptionBarProps> = (props) => {
    const getCssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

    const {theme} = useTheme()
    const {content} = props
    const ref = useRef(null)
    const size = useSize(ref)
    const chartRef = useRef(null)

    const buildOptions = () => {
        const titleColor = getCssVar("--Colors-Use-Neutral-Text-1-Title")
        const axisColor = getCssVar("--Colors-Use-Neutral-Text-2-Primary")
        const tooltipBg = getCssVar("--Colors-Use-Basic-Background")
        const tooltipText = titleColor
        const tooltipBorder = getCssVar("--Colors-Use-Neutral-Border")
        const legendTextColor = axisColor

        return {
            title: {
                left: "center",
                text: content?.name_verbose || content?.name || "柱状图标题",
                textStyle: {
                    color: titleColor,
                    fontWeight: "bold"
                }
            },
            tooltip: {
                trigger: "axis",
                axisPointer: {type: "shadow"},
                backgroundColor: tooltipBg,
                textStyle: {color: tooltipText},
                borderColor: tooltipBorder,
                borderWidth: 1
            },
            legend: {
                orient: "vertical",
                y: "center",
                right: 0,
                textStyle: {
                    color: legendTextColor
                },
                data: ["严重", "高危", "中危", "低危"]
            },
            grid: {
                left: "6%",
                right: "14%",
                bottom: "3%",
                containLabel: true
            },
            xAxis: {
                type: "category",
                data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                axisLabel: {color: axisColor},
                axisLine: {lineStyle: {color: axisColor}}
            },
            yAxis: {
                name: "风险数(个)",
                type: "value",
                axisLabel: {color: axisColor},
                axisLine: {lineStyle: {color: axisColor}},
                splitLine: {lineStyle: {color: getCssVar("--Colors-Use-Neutral-Border")}}
            },
            series: [
                {
                    name: "低危",
                    type: "bar",
                    stack: "total",
                    label: {show: true, color: titleColor},
                    emphasis: {focus: "series"},
                    data: [320, 302, 301, 334, 390, 330, 320] as any,
                    itemStyle: {color: getCssVar("--Colors-Use-Status-Safe")},
                    barMaxWidth: 120
                },
                {
                    name: "中危",
                    type: "bar",
                    stack: "total",
                    label: {show: true, color: titleColor},
                    emphasis: {focus: "series"},
                    data: [120, 132, 101, 134, 90, 230, 210] as any,
                    itemStyle: {color: getCssVar("--Colors-Use-Status-Medium")},
                    barMaxWidth: 120
                },
                {
                    name: "高危",
                    type: "bar",
                    stack: "total",
                    label: {show: true, color: titleColor},
                    emphasis: {focus: "series"},
                    data: [220, 182, 191, 234, 290, 330, 310] as any,
                    itemStyle: {color: getCssVar("--Colors-Use-Status-High")},
                    barMaxWidth: 120
                },
                {
                    name: "严重",
                    type: "bar",
                    stack: "total",
                    label: {show: true, color: titleColor},
                    emphasis: {focus: "series"},
                    data: [220, 182, 191, 234, 290, 330, 310] as any,
                    itemStyle: {color: getCssVar("--Colors-Use-Status-Serious")},
                    barMaxWidth: 120
                }
            ]
        }
    }

    useEffect(() => {
        if (!chartRef.current) return

        // 处理数据
        const {data} = content
        let CRITICAL: (number | null)[] = []
        let MEDIUM: (number | null)[] = []
        let HIGH: (number | null)[] = []
        let LOW: (number | null)[] = []
        let xAxisData = data.map((item) => {
            const list = item.data || []
            let critical = null
            let medium = null
            let high = null
            let low = null
            list.forEach((itemIn) => {
                switch (itemIn.key) {
                    case "CRITICAL":
                        critical = itemIn.value
                        break
                    case "MEDIUM":
                        medium = itemIn.value
                        break
                    case "HIGH":
                        high = itemIn.value
                        break
                    case "LOW":
                        low = itemIn.value
                        break
                }
            })
            CRITICAL.push(critical)
            MEDIUM.push(medium)
            HIGH.push(high)
            LOW.push(low)
            return item.key_verbose || item.key
        })

        const option = buildOptions()
        option.xAxis.data = xAxisData
        option.series[0].data = LOW
        option.series[1].data = MEDIUM
        option.series[2].data = HIGH
        option.series[3].data = CRITICAL

        const myChart = echarts.init(chartRef.current)
        myChart.setOption(option)

        return () => {
            myChart.dispose()
        }
    }, [size?.width, theme, content])

    return (
        <div className={styles["echarts-box"]} ref={ref} data-type='echarts-box' echart-type='stacked-vertical-bar'>
            <div
                className={classNames(styles["echart-item"], styles["echart-item-stacked-vertical-bar"])}
                ref={chartRef}
            ></div>
        </div>
    )
}

// 空心圆环
export const HollowPie: React.FC<HollowPieProps> = (props) => {
    const {data, title} = props
    const {theme} = useTheme()
    const ref = useRef(null)
    const size = useSize(ref)
    const newData = data.filter((item) => item.direction != "center" && item.value !== 0)
    const centerData = data.filter((item) => item.direction === "center") || [{name: "资产", value: 0}]
    const chartRef = useRef(null)

    const getCssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

    const buildOptions = () => {
        const titleColor = getCssVar("--Colors-Use-Neutral-Text-1-Title")
        const subTitleColor = getCssVar("--Colors-Use-Neutral-Text-2-Primary")
        const tooltipBg = getCssVar("--Colors-Use-Basic-Background")
        const tooltipText = titleColor
        const tooltipBorder = getCssVar("--Colors-Use-Neutral-Border")
        const legendNameColor = getCssVar("--Colors-Use-Neutral-Text-2-Primary")
        const legendValueColor = titleColor
        const pieBorderColor = getCssVar("--Colors-Use-Basic-Background")

        return {
            title: {
                show: true,
                text: centerData[0].name,
                subtext: [`{text|${centerData[0].value}}{small|台}`],
                top: "44%",
                left: "37%",
                textAlign: "center",
                itemGap: 0,
                textStyle: {
                    color: titleColor,
                    fontSize: 12,
                    lineHeight: 16,
                    fontWeight: 600,
                    fontFamily: "PingFang HK"
                },
                subtextStyle: {
                    rich: {
                        text: {
                            fontSize: 20,
                            lineHeight: 32,
                            color: titleColor
                        },
                        small: {
                            fontSize: 10,
                            color: subTitleColor
                        }
                    }
                }
            },
            graphic: [
                {
                    type: "text",
                    left: "center",
                    top: "8%",
                    style: {
                        text: title || "",
                        fontSize: 18,
                        fontWeight: "bold",
                        fill: titleColor
                    }
                }
            ],
            tooltip: {
                trigger: "item",
                backgroundColor: tooltipBg,
                textStyle: {color: tooltipText},
                borderColor: tooltipBorder,
                borderWidth: 1
            },
            legend: {
                show: true,
                top: "middle",
                right: "8%",
                type: "scroll",
                orient: "vertical",
                icon: "circle",
                padding: [0, 0, 0, 0],
                itemWidth: 13,
                itemHeight: 7,
                itemStyle: {borderWidth: 0},
                textStyle: {
                    rich: {
                        name: {color: legendNameColor, fontSize: 12},
                        value: {color: legendValueColor, fontSize: 14, fontWeight: 500, align: "right"}
                    }
                },
                formatter: (name: any) => {
                    try {
                        const itemValue = newData.filter((item) => item.name === name)[0].value
                        return `{name|${name}:} {value|${itemValue}}`
                    } catch (error) {
                        return ""
                    }
                }
            },
            series: [
                {
                    radius: ["35%", "62%"],
                    center: ["38%", "50%"],
                    itemStyle: {
                        borderColor: pieBorderColor,
                        borderWidth: 1
                    },
                    avoidLabelOverlap: false,
                    type: "pie",
                    label: {
                        show: true,
                        formatter: function (obj: any) {
                            const {value, name} = obj
                            return `${name}：${((value * 100) / centerData[0].value).toFixed(0)}%`
                        },
                        fontSize: 12,
                        color: titleColor
                    },
                    labelLine: {show: true},
                    data: newData || [],
                    color: (newData || []).map((item) => item.color)
                }
            ]
        }
    }

    useLayoutEffect(() => {
        if (!chartRef.current) return
        const myChart = echarts.init(chartRef.current)
        myChart.setOption(buildOptions())
        return () => {
            myChart.dispose()
        }
    }, [size?.width, theme, data, title])

    return (
        <div
            className={classNames(styles["echarts-box"], styles["echarts-box-hollow-pie"])}
            ref={ref}
            data-type='echarts-box'
            echart-type='hollow-pie'
        >
            <div className={classNames(styles["echart-item"], styles["echart-item-hollow-pie"])} ref={chartRef}></div>
        </div>
    )
}
// 多层饼环
export const MultiPie: React.FC<MultiPieProps> = (props) => {
    const {name_verbose, name, data} = props.content
    const ref = useRef(null)
    const size = useSize(ref)
    const chartRef = useRef(null)
    const optionRef = useRef<any>({
        title: {
            text: "",
            left: "center"
        },
        tooltip: {},
        grid: {
            show: false
        },
        yAxis: {
            min: 0,
            max: 3,
            minInterval: 1,
            splitLine: {
                show: true,
                lineStyle: {
                    color: "rgba(163, 163, 163, 0.5)",
                    type: "dashed"
                }
            },
            axisLabel: {
                show: false,
                color: "#A0A4AA"
            },
            axisLine: {
                show: true,
                lineStyle: {
                    color: "rgba(65, 97, 128, 0.5)"
                }
            }
        },
        xAxis: {
            data: ["数据"],
            axisLabel: {
                color: "#A0A4AA"
            },
            axisLine: {
                show: true,
                lineStyle: {
                    color: "rgba(65, 97, 128, 0.5)"
                }
            },
            axisTick: {
                alignWithLabel: true
            }
        },
        series: []
    })
    useEffect(() => {
        let series: any[] = []
        if (Array.isArray(data)) {
            data.map((item, index) => {
                let symbolSize = 0
                let height = 0
                let numOrder = 7.3
                let numOrder1 = 6.6
                let color = ""
                let x = 0
                let y = 0
                switch (index) {
                    case 0:
                        symbolSize = (((270 / 10) * numOrder1) / 10) * numOrder1
                        height = (((1.5 / 10) * numOrder1) / 10) * numOrder1
                        color = "rgba(30, 136, 207, 0.7)"
                        x = 500
                        y = 200
                        break
                    case 1:
                        symbolSize = (270 / 10) * numOrder
                        height = (1.5 / 10) * numOrder
                        color = "rgba(30, 136, 207, 0.5)"
                        x = 480
                        y = 118
                        break
                    case 2:
                        symbolSize = 270
                        height = 1.5
                        color = "rgba(30, 136, 207, 0.3)"
                        x = 460
                        y = 40
                        break
                }
                series.push({
                    name: item?.key_verbose || item?.key,
                    z: 3 - index,
                    labelLine: {
                        show: true,
                        length2: 60,
                        lineStyle: {
                            color: "rgba(30, 136, 207)"
                        }
                    },
                    labelLayout: {
                        x,
                        y,
                        align: "center",
                        hideOverlap: true,
                        moveOverlap: "shiftY"
                    },
                    label: {
                        show: true,
                        formatter: function (param: any) {
                            return `${param.name}  ${param.data.value[2]}`
                        },
                        position: "right"
                        // minMargin: 2
                    },
                    type: "scatter",
                    symbol: "circle",
                    emphasis: {
                        disable: false,
                        scale: false, //不缩放
                        scaleSize: 0 //为了防止失效直接设置未0
                    },
                    itemStyle: {
                        normal: {
                            color: new echarts.graphic.RadialGradient(0.5, 0, 1, [
                                {
                                    offset: 0.0,
                                    color
                                },
                                {
                                    offset: 1,
                                    color
                                }
                            ])
                        }
                    },
                    data: [
                        {
                            symbolSize,
                            name: item?.key_verbose || item?.key,
                            value: [1, height, item.value]
                        }
                    ]
                })
            })
        }
        optionRef.current.tooltip.formatter = function (arg: any) {
            return arg.name + "   " + arg.data.value[2]
        }
        optionRef.current.series = series
        optionRef.current.title.text = name_verbose || name
        // @ts-ignore
        const myChart = echarts.init(chartRef.current)
        myChart.setOption(optionRef.current)
        return () => {
            myChart.dispose()
        }
    }, [size?.width])
    return (
        <div className={styles["echarts-box"]} ref={ref} data-type='echarts-box' echart-type='multi-pie'>
            <div className={classNames(styles["echart-item"], styles["echart-item-multi-pie"])} ref={chartRef}></div>
        </div>
    )
}

// 南丁格尔玫瑰图
export const NightingleRose: React.FC<NightingleRoseProps> = (props) => {
    const {name_verbose, name, data} = props.content
    const {theme} = useTheme()
    const ref = useRef(null)
    const size = useSize(ref)
    const [details, setDetails] = useState<DetailsProps>()
    const chartRef = useRef(null)

    const getCssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

    const buildBaseOption = () => {
        const titleColor = getCssVar("--Colors-Use-Neutral-Text-1-Title")
        const tooltipBg = getCssVar("--Colors-Use-Basic-Background")
        const tooltipText = titleColor
        const tooltipBorder = getCssVar("--Colors-Use-Neutral-Border")
        const legendTextColor = getCssVar("--Colors-Use-Neutral-Text-2-Primary")
        const pieBorderColor = getCssVar("--Colors-Use-Basic-Background")

        return {
            title: {
                text: name_verbose || name || "Nightingale Chart",
                left: "center",
                textStyle: {color: titleColor, fontWeight: "bold"}
            },
            tooltip: {
                trigger: "item",
                backgroundColor: tooltipBg,
                textStyle: {color: tooltipText},
                borderColor: tooltipBorder,
                borderWidth: 1,
                formatter: "{a} <br/>{b} : {c} ({d}%)"
            },
            legend: {
                top: "bottom",
                textStyle: {color: legendTextColor}
            },
            toolbox: {
                show: true,
                feature: {
                    mark: {show: true}
                }
            },
            series: [
                {
                    name: name_verbose || name || "Nightingale Chart",
                    type: "pie",
                    radius: [50, 150],
                    center: ["50%", "50%"],
                    roseType: "area",
                    itemStyle: {
                        borderRadius: 8,
                        borderColor: pieBorderColor
                    },
                    label: {color: titleColor},
                    data: []
                }
            ]
        }
    }

    useLayoutEffect(() => {
        if (!Array.isArray(data)) return

        // 先创建基础配置
        const baseOption = buildBaseOption() as any
        let cacheSource = JSON.parse(JSON.stringify(data))

        // 当值为1大于总数三分之一时 一半隐藏一半显示
        if (data.length >= 6) {
            const index = data.filter((item) => item.value === 1).length
            const limit = data.length / 3
            let isShow = true
            if (index > limit) {
                const newData = data.filter((item) => {
                    if (item.value > 1) return true
                    else {
                        isShow = !isShow
                        return isShow
                    }
                })
                cacheSource = JSON.parse(JSON.stringify(newData))
            }
        }

        // 3-6 为四分之一扇
        if (cacheSource.length < 6) {
            baseOption.series[0].center = ["30%", "66%"]
            const limitCount = cacheSource.length * 3
            for (let i = 0; i < limitCount; i++) {
                cacheSource.push({isHide: true})
            }
        }
        // 6-12 为半扇
        else if (cacheSource.length >= 6 && cacheSource.length <= 12) {
            baseOption.series[0].startAngle = 180
            baseOption.series[0].center = ["50%", "70%"]
            baseOption.legend = {show: false}
            const limitCount = cacheSource.length
            for (let i = 0; i < limitCount; i++) {
                cacheSource.push({isHide: true})
            }
        }
        // 超过 12 为全扇
        else if (cacheSource.length > 12) {
            baseOption.series[0].radius = [40, 120]
            baseOption.legend = {show: false}
            cacheSource = cacheSource.slice(0, 20)
        }

        const value = cacheSource
            .map((item: any) => {
                if (item?.isHide) {
                    return {
                        value: 0,
                        name: "",
                        label: {show: false},
                        labelLine: {show: false}
                    }
                } else {
                    const description_zh = item.detail || ""
                    const str = description_zh.replace(/\n+/g, "\n").replaceAll("\n", "<br/>")
                    return {
                        value: item.value,
                        name: item.key_verbose || item.key,
                        content: str
                    }
                }
            })
            .sort((a: any, b: any) => b.value - a.value)

        if (Array.isArray(value) && value.length > 0) {
            setDetails({
                name: value[0]?.name || "",
                content: (value[0]?.content || "").replaceAll("<br/>", "\n")
            })
        }

        baseOption.tooltip.formatter = (params: any) =>
            `${params.data.name} : ${params.data.value} (${params.percent}%)`
        baseOption.series[0].data = value

        const myChart = echarts.init(chartRef.current)
        myChart.off("click")
        myChart.off("legendselectchanged")
        myChart.on("click", function (params: any) {
            setDetails({
                name: params?.data?.name || "",
                content: (params?.data?.content || "").replaceAll("<br/>", "\n")
            })
        })
        myChart.setOption(baseOption)

        return () => {
            myChart.dispose()
        }
    }, [size?.width, theme, data, name, name_verbose])

    return (
        <>
            {Array.isArray(data) && (
                <div className={styles["echarts-box"]} ref={ref} data-type='echarts-box' echart-type='nightingle-rose'>
                    <div
                        className={classNames(styles["echart-item"], styles["echart-item-nightingle-rose"])}
                        ref={chartRef}
                    ></div>
                    {details && (
                        <div className={styles["echart-detail"]}>
                            <div className={styles["echart-detail-item"]}>
                                <div className={styles["echart-detail-item-title"]} id='nightingle-rose-title'>
                                    {details.name}
                                </div>
                                <div className={styles["echart-detail-item-content"]} id='nightingle-rose-content'>
                                    {details.content}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    )
}

interface EchartsOptionProps {
    content: {
        type: "e-chart"
        name: "nightingale-rose" | "bar-graph"
        option: EChartsOption
    }
}

// echarts任意图表(后端传入option控制)
export const EchartsOption: React.FC<EchartsOptionProps> = (props) => {
    const {option, name} = props.content
    const ref = useRef(null)
    const size = useSize(ref)
    const chartRef = useRef(null)
    const optionRef = useRef<EChartsOption>(option)
    useEffect(() => {
        // @ts-ignore
        const myChart = echarts.init(chartRef.current)
        try {
            let setOption = cloneDeep(optionRef.current) as any
            if (name === "nightingale-rose") {
                setOption.series[0].label.formatter = (params) => {
                    return params.name + "\n" + (params.data.realPercent || 0.0).toFixed(2) + "%"
                }
                setOption.tooltip.formatter = (params) => {
                    return `${params.name} : ${params.data.realValue}`
                }
            }
            if (name === "bar-graph") {
                setOption.tooltip.formatter = (params) => {
                    let result = params[0].axisValue + "<br/>"
                    let total = 0
                    params.forEach(function (item) {
                        if (item.value > 0) {
                            let count = Math.round(item.value * item.data.realTotal)
                            total += count
                            result +=
                                item.marker +
                                " " +
                                item.seriesName +
                                ": " +
                                count +
                                " (" +
                                (item.value * 100).toFixed(1) +
                                "%)<br/>"
                        }
                    })
                    if (total > 0) result += "总计: " + total + "<br/>"
                    return result
                }
            }
            optionRef.current = setOption
            myChart.setOption(optionRef.current)
        } catch (error) {}

        return () => {
            myChart.dispose()
        }
    }, [size?.width])

    // 下载word报告时用于适配
    const echartType = useMemo(() => {
        switch (name) {
            case "bar-graph":
                return "vertical-bar"
            default:
                return name
        }
    }, [name])

    // 样式适配
    const chartStyle = useMemo(() => {
        switch (name) {
            case "bar-graph":
                return styles["echart-item-vertical-bar"]
            case "nightingale-rose":
                return styles["echart-item-nightingle-rose"]
        }
    }, [name])

    return (
        <div className={styles["echarts-box"]} ref={ref} data-type='echarts-box' echart-type={echartType}>
            <div className={classNames(styles["echart-item"], styles[chartStyle])} ref={chartRef}></div>
        </div>
    )
}
interface EchartsCardProps {
    dataTitle: string
    dataSource: any[]
}

// 卡片 (为了生成word样式-改成标签内样式)
export const EchartsCard: React.FC<EchartsCardProps> = (props) => {
    const {dataTitle, dataSource} = props
    return (
        <>
            <div
                style={{
                    fontSize: 18,
                    padding: "10px 0",
                    fontWeight: "bold",
                    color: "var(--Colors-Use-Neutral-Text-1-Title)"
                }}
            >
                {dataTitle}
            </div>
            <div style={{display: "flex", justifyContent: "space-between", marginBottom: 12}}>
                {dataSource.map((item: any) => {
                    return (
                        <div
                            style={{
                                height: 66,
                                width: "46%",
                                padding: 10,
                                border: "1px solid var(--Colors-Use-Neutral-Border)",
                                boxSizing: "content-box"
                            }}
                        >
                            <div style={{color: "var(--Colors-Use-Neutral-Text-1-Title)"}}>
                                {item.key_verbose || item.key}
                            </div>
                            <div style={{marginTop: 10, fontSize: 24}}>{item.value}</div>
                        </div>
                    )
                })}
            </div>
        </>
    )
}
