import React, {useEffect, useRef, useState} from "react"
import * as echarts from "echarts"
import styles from "./EchartsInit.module.scss"
import classNames from "classnames"
import { useSize } from "ahooks"

interface VerticalOptionBarProps {
    content: any
}

export const VerticalOptionBar: React.FC<VerticalOptionBarProps> = (props) => {
    const {content} = props
    const ref = useRef(null);
    const size = useSize(ref);
    const chartRef = useRef(null)
    const optionRef = useRef<any>({
        title: {
            text: "",
            left: "center"
        },
        tooltip: {
            trigger: "axis",
            axisPointer: {
                type: "shadow"
            }
        },
        xAxis: {
            type: "category",
            data: [],
            // axisLabel: {
            //   rotate: -45, // 负值为逆时针旋转
            // }
            axisLabel: {
                // interval: 0, // 显示所有标签
            }
        },
        yAxis: {
            type: "value"
        },
        series: [
            {
                data: [],
                type: "bar",
                label: {
                    show: true, // 设置label可显示
                    position: "top", // 设置label位置
                    formatter: "{c}" // 设置label内容
                    // emphasis: {
                    //     // 设置label的鼠标悬停样式
                    //     textStyle: {
                    //         color: '#000',
                    //         fontWeight: 'bold'
                    //     }
                    // },
                }
            }
        ]
    })
    useEffect(() => {
        if (content?.type_verbose === "通用KV") {
            const {name_verbose, name, data, complexity_group, access_vector} = content

            let title: string[] = []
            let value: {value: number}[] = []
            Array.isArray(data) &&
                data.map((item) => {
                    title.push(item.key_verbose || item.key)
                    value.push({
                        value: item.value
                    })
                })
            if (complexity_group && complexity_group.length > 0) {
                // 不隐藏x轴
                optionRef.current.xAxis.axisLabel.interval = 0
                // 排序
                const allTitle = complexity_group.split(",")
                let cacheTitle: string[] = []
                let cacheValue: {value: number}[] = []
                allTitle.map((item) => {
                    if (title.includes(item)) {
                        let itemIndex = title.indexOf(item)
                        cacheTitle.push(title[itemIndex])
                        cacheValue.push(value[itemIndex])
                    }
                })

                // 补充
                allTitle.map((item, index) => {
                    // 如若不存在 则插入
                    if (!cacheTitle.includes(item)) {
                        cacheTitle.splice(index, 0, item)
                        cacheValue.splice(index, 0, {
                            value: 0
                        })
                    }
                })

                title = cacheTitle
                value = cacheValue
            }

            optionRef.current.title.text = name_verbose || name
            optionRef.current.xAxis.data = title || []
            optionRef.current.series[0].data = value || []
        } else {
            const {title, value, name, color} = content
            optionRef.current.xAxis.data = name || []
            optionRef.current.series[0].data = value || []
            optionRef.current.title.text = title
        }
        // @ts-ignore
        const myChart = echarts.init(chartRef.current)
        myChart.setOption(optionRef.current)
        return () => {
            myChart.dispose()
        }
    }, [size?.width])
    return (
        <div className={styles["echarts-box"]} ref={ref}>
            <div className={classNames(styles["echart-item"], styles["echart-item-vertical-bar"])} ref={chartRef}></div>
        </div>
    )
}

// 堆叠柱状图
export const StackedVerticalBar: React.FC<VerticalOptionBarProps> = (props) => {
    const {content} = props
    const ref = useRef(null);
    const size = useSize(ref);
    const chartRef = useRef(null)
    const optionRef = useRef<any>({
        title: {
            left: "center",
            text: "柱状图标题"
        },
        tooltip: {
            trigger: "axis",
            axisPointer: {
                type: "shadow"
            }
        },
        legend: {
            orient: "vertical", // 垂直方向
            y: "center",
            right: 0,
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
            data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        },
        yAxis: {
            name: "风险数(个)",
            type: "value"
        },
        series: [
            {
                name: "低危",
                type: "bar",
                stack: "total",
                label: {
                    show: true
                },
                emphasis: {
                    focus: "series"
                },
                data: [320, 302, 301, 334, 390, 330, 320],
                color: ["rgb(165,215,112)"],
                barMaxWidth: 120 // 设置柱状图的最大宽度
            },
            {
                name: "中危",
                type: "bar",
                stack: "total",
                label: {
                    show: true
                },
                emphasis: {
                    focus: "series"
                },
                data: [120, 132, 101, 134, 90, 230, 210],
                color: ["rgb(252,203,44)"],
                barMaxWidth: 120
            },
            {
                name: "高危",
                type: "bar",
                stack: "total",
                label: {
                    show: true
                },
                emphasis: {
                    focus: "series"
                },
                data: [220, 182, 191, 234, 290, 330, 310],
                color: ["rgb(255,120,82)"],
                barMaxWidth: 120
            },
            {
                name: "严重",
                type: "bar",
                stack: "total",
                label: {
                    show: true
                },
                emphasis: {
                    focus: "series"
                },
                data: [220, 182, 191, 234, 290, 330, 310],
                color: ["red"],
                barMaxWidth: 120
            }
        ]
    })
    useEffect(() => {
        const {name_verbose, name, data} = content
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
            list.map((itemIn) => {
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
        optionRef.current.title.text = name_verbose || name
        optionRef.current.xAxis.data = xAxisData
        optionRef.current.series[0].data = LOW
        optionRef.current.series[1].data = MEDIUM
        optionRef.current.series[2].data = HIGH
        optionRef.current.series[3].data = CRITICAL

        // @ts-ignore
        const myChart = echarts.init(chartRef.current)
        myChart.setOption(optionRef.current)
        return () => {
            myChart.dispose()
        }
    }, [size?.width])
    return (
        <div className={styles["echarts-box"]} ref={ref}>
            <div
                className={classNames(styles["echart-item"], styles["echart-item-stacked-vertical-bar"])}
                ref={chartRef}
            ></div>
        </div>
    )
}

interface HollowPieProps {
    data: {name: any; value: any; color: string; direction?: string}[]
    title?: string
}
// 空心圆环
export const HollowPie: React.FC<HollowPieProps> = (props) => {
    const {data, title} = props
    const ref = useRef(null);
    const size = useSize(ref);
    const newData = data.filter((item) => item.direction != "center" && item.value !== 0)
    const centerData = data.filter((item) => item.direction === "center") || [{name: "资产", value: 0}]
    const chartRef = useRef(null)
    const optionRef = useRef<any>({
        title: {
            show: true,
            text: "资产",
            subtext: ["{text|200}{small|台}"],
            top: "44%",
            left: "37%",
            textAlign: "center",
            itemGap: 0,
            // triggerEvent: true,
            textStyle: {
                color: "#31343F",
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
                        color: "#31343F"
                    },
                    small: {
                        fontSize: 10,
                        color: "#999"
                    }
                }
            }
        },
        // 多标题
        graphic: [
            // 第一个标题
            {
                type: "text", // 文本标签类型
                left: "center", // 相对于画布的位置
                top: "8%", // 相对于画布的位置
                style: {
                    text: "", // 文本内容
                    // textColor: '#eee', // 文本颜色
                    fontSize: 18, // 文本字体大小
                    fontWeight: "bold" // 文本字体粗细
                }
            }
        ],
        tooltip: {
            trigger: "item"
        },
        legend: {
            show: true,
            top: "middle",
            right: "8%",
            type: "scroll",
            orient: "vertical",
            icon: "circle",
            padding: [0, 0, 0, 0],
            // 点的大小位置
            itemWidth: 13,
            itemHeight: 7,
            itemStyle: {
                borderWidth: 0
                // borderColor:"#0ba5ff"
            },
            // selectedMode:false,
            textStyle: {
                rich: {
                    name: {
                        color: "#85899E",
                        fontSize: 12
                    },
                    value: {
                        color: "#31343F",
                        fontSize: 14,
                        fontWeight: 500,
                        align: "right"
                    }
                }
            }
        },

        series: [
            {
                // 空心饼图内外径
                radius: ["35%", "62%"],
                // 饼图上下左右位置
                center: ["38%", "50%"],
                itemStyle: {
                    borderColor: "#F0F1F3",
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
                    // "{b}: {d}%",
                    fontSize: 12
                },
                labelLine: {
                    show: true
                },
                data: [],
                color: []
            }
        ]
    })
    useEffect(() => {
        optionRef.current.legend.formatter = (name: any) => {
            try {
                const itemValue = newData.filter((item) => item.name === name)[0].value
                return "{name|" + name + ":} " + "{value|" + itemValue + "}"
            } catch (error) {
                return ""
            }
        }
        optionRef.current.series[0].data = newData || []
        optionRef.current.series[0].color = (newData || []).map((item)=>item.color);
        optionRef.current.title.text = centerData[0].name
        optionRef.current.graphic[0].style.text = title || ""
        optionRef.current.title.subtext = [`{text|${centerData[0].value}}{small|台}`]
        // @ts-ignore
        const myChart = echarts.init(chartRef.current)
        myChart.setOption(optionRef.current)
        return () => {
            myChart.dispose()
        }
    }, [size?.width])
    return (
        <div className={classNames(styles["echarts-box"],styles["echarts-box-hollow-pie"])} ref={ref}>
            <div className={classNames(styles["echart-item"], styles["echart-item-hollow-pie"])} ref={chartRef}></div>
        </div>
    )
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

// 多层饼环
export const MultiPie: React.FC<MultiPieProps> = (props) => {
    const {name_verbose, name, data} = props.content
    const ref = useRef(null);
    const size = useSize(ref);
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
        <div className={styles["echarts-box"]} ref={ref}>
            <div className={classNames(styles["echart-item"], styles["echart-item-multi-pie"])} ref={chartRef}></div>
        </div>
    )
}

interface NightingleRoseProps {
    content: ContentProp
}
interface DetailsProps {
    name: string
    content: string
}
// 南丁格尔玫瑰图
export const NightingleRose: React.FC<NightingleRoseProps> = (props) => {
    const {name_verbose, name, data} = props.content
    const ref = useRef(null);
    const size = useSize(ref);
    const [details, setDetails] = useState<DetailsProps>()
    const chartRef = useRef(null)
    const optionRef = useRef<any>({
        title: {
            text: "Nightingale Chart",
            left: "center"
        },
        tooltip: {
            trigger: "item",
            formatter: "{a} <br/>{b} : {c} ({d}%)"
        },
        legend: {
            top: "bottom"
        },
        toolbox: {
            show: true,
            feature: {
                mark: {show: true}
            }
        },
        series: [
            {
                name: "Nightingale Chart",
                type: "pie",
                radius: [50, 150],
                center: ["50%", "50%"],
                roseType: "area",
                itemStyle: {
                    borderRadius: 8
                },
                data: []
            }
        ]
    })
    useEffect(() => {
        if (Array.isArray(data)) {
            // 构造"南丁格尔玫瑰图"伪数据
            let cacheSource = JSON.parse(JSON.stringify(data))
            // 当值为1大于总数三分之一时 一半隐藏一半显示
            if (data.length >= 6) {
                let index = data.filter((item) => item.value === 1).length
                let limit = data.length / 3
                let isShow = true
                if (index > limit) {
                    let newData = data.filter((item) => {
                        if (item.value > 1) return true
                        else {
                            isShow = !isShow
                            return isShow
                        }
                    })
                    cacheSource = JSON.parse(JSON.stringify(newData))
                }
            }
            // 3-6为四分之一扇
            if (cacheSource.length < 6) {
                optionRef.current.series[0].center = ["30%", "66%"]
                let limitCount = cacheSource.length * 3
                for (let index = 0; index < limitCount; index++) {
                    cacheSource.push({
                        isHide: true
                    })
                }
            }
            // 6-12为二分之一扇
            else if (cacheSource.length >= 6 && cacheSource.length <= 12) {
                optionRef.current.series[0].startAngle = 180
                optionRef.current.series[0].center = ["50%", "70%"]
                optionRef.current.legend = {
                    show: false
                }
                let limitCount = cacheSource.length
                for (let index = 0; index < limitCount; index++) {
                    cacheSource.push({
                        isHide: true
                    })
                }
            }
            // 12-20为全扇 超出数据不显示
            else if (cacheSource.length > 12) {
                optionRef.current.series[0].radius = [40, 120]
                optionRef.current.legend = {
                    show: false
                }
                cacheSource = cacheSource.slice(0, 20)
            }

            const value = cacheSource
                .map((item: any) => {
                    if (item?.isHide) {
                        return {
                            value: 0,
                            name: "",
                            label: {
                                show: false
                            },
                            labelLine: {
                                show: false
                            }
                        }
                    } else {
                        const description_zh = item.detail || ""
                        let str = ""
                        str = description_zh.replace(/\n+/g, "\n").replaceAll("\n", "<br/>")
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
            optionRef.current.tooltip.formatter = (params: any) => {
                return `${params.data.name} : ${params.data.value} (${params.percent}%)`
            }

            optionRef.current.title.text = name_verbose || name
            optionRef.current.series[0].name = name_verbose || name
            optionRef.current.series[0].data = value || []
            // @ts-ignore
            const myChart = echarts.init(chartRef.current)
            //先解绑事件，防止事件重复触发
            myChart.off("click")
            myChart.off("legendselectchanged")
            myChart.on("click", function (params) {
                // console.log("点击", params);
                setDetails({
                    // @ts-ignore
                    name: params?.data?.name || "",
                    // @ts-ignore
                    content: (params?.data?.content || "").replaceAll("<br/>", "\n")
                })
            })
            myChart.setOption(optionRef.current)
            return () => {
                myChart.dispose()
            }
        }
    }, [size?.width])
    return (
        <>
            {Array.isArray(data) && (
                <div className={styles["echarts-box"]} ref={ref}>
                    <div
                        className={classNames(styles["echart-item"], styles["echart-item-nightingle-rose"])}
                        ref={chartRef}
                    ></div>
                    {details && (
                        <div className={styles["echart-detail"]}>
                            <div className={styles["echart-detail-item"]}>
                                <div className={styles["echart-detail-item-title"]}>{details.name}</div>
                                <div className={styles["echart-detail-item-content"]}>{details.content}</div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    )
}

interface EchartsCardProps {
    dataTitle: string
    dataSource: any[]
}

// 卡片
export const EchartsCard: React.FC<EchartsCardProps> = (props) => {
    const {dataTitle, dataSource} = props
    return (
        <>
            <div className={styles["echarts-card-head"]}>{dataTitle}</div>
            <div className={styles["echarts-card"]}>
                {dataSource.map((item: any) => {
                    return (
                        <div className={styles["echarts-card-item"]}>
                            <div className={styles["echarts-card-title"]}>{item.key_verbose || item.key}</div>
                            <div className={styles["echarts-card-content"]}>{item.value}</div>
                        </div>
                    )
                })}
            </div>
        </>
    )
}
