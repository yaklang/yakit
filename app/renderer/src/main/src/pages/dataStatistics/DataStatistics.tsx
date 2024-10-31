import React, {useEffect, useMemo, useRef, useState} from "react"
import {} from "@ant-design/icons"
import {useCreation, useGetState, useInViewport, useMemoizedFn, useSize, useUpdateEffect} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./DataStatistics.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {UserIcon} from "./icon"
import {SolidCalendarIcon, SolidTrendingdownIcon, SolidTrendingupIcon} from "@/assets/icon/solid"
import * as echarts from "echarts"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitSegmented} from "@/components/yakitUI/YakitSegmented/YakitSegmented"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import numeral from "numeral"
import moment, {Moment} from "moment"
import "moment/locale/zh-cn"
import locale from "antd/es/date-picker/locale/zh_CN"
import {RangePickerProps} from "antd/lib/date-picker"
import {YakitDatePicker} from "@/components/yakitUI/YakitDatePicker/YakitDatePicker"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineRefreshIcon} from "@/assets/icon/outline"
const {RangePicker} = YakitDatePicker
const {ipcRenderer} = window.require("electron")

// 将分钟转换为小时，并保留两位小数
const minutesToHours = (minutes: number) => {
    return (minutes / 60).toFixed(2)
}

interface RiseLineEchartsProps {
    riseLineParams: RiseLineProps
    inViewport?: boolean
}

interface RiseLineProps {
    // 天月年展示
    showType: showTypeValue
    // 总数/增长数 total 总数 incr增长数
    changeType: "total" | "incr"
    // 自选起始时间
    startTime: number
    // 自选结束时间
    endTime: number
}

const RiseLineEcharts: React.FC<RiseLineEchartsProps> = (props) => {
    const {inViewport, riseLineParams} = props
    const {width} = useSize(document.querySelector("body")) || {width: 0, height: 0}
    const [isShowEcharts, setIsShowEcharts] = useState<boolean>(false)
    const optionRef = useRef<any>({
        color: "#4A3AFF", // 设置折线的颜色
        tooltip: {
            trigger: "axis",
            axisPointer: {
                type: "line"
            },
            formatter: "{b} : {c}"
        },
        xAxis: {
            type: "category",
            boundaryGap: false,
            data: []
        },
        yAxis: {
            type: "value",
            splitLine: {
                lineStyle: {
                    type: "dashed" // 设置横向线条类型为虚线
                }
            },
            axisLabel: {
                formatter: (value) => {
                    // 将纵坐标数值除以 1000 并添加 'k' 后缀
                    if (value < 1000) {
                        return value
                    } else {
                        return `${value / 1000}k`
                    }
                }
            }
        },
        series: [
            {
                data: [],
                type: "line",
                symbol: "circle", // 设置连接点的形状为圆形
                symbolSize: 14, // 设置连接点的大小为 14
                itemStyle: {
                    color: "#4A3AFF", // 设置连接点的颜色为黑色
                    borderColor: "#FFFFFF", // 设置连接点的边框颜色
                    borderWidth: 2 // 设置连接点的边框宽度
                },
                lineStyle: {
                    color: "#C893FD" // 设置折线的颜色
                }
            },
            {
                type: "bar",
                stack: "1",
                barWidth: 8,
                data: [],
                itemStyle: {
                    color: "#EAECF3" // 设置柱状图的背景颜色，这里使用灰色的背景
                }
            }
        ],
        grid: {
            top: "5%", // 上留白距离
            bottom: "10%", // 下留白距离
            left: "5%", // 左留白距离
            right: "5%" // 右留白距离
        }
    })
    const echartsRef = useRef<any>()
    useEffect(() => {
        if (width >= 1920) {
            optionRef.current.grid.left = "3%"
            setEcharts(optionRef.current)
        } else if (width > 1050) {
            optionRef.current.grid.left = "5%"
            setEcharts(optionRef.current)
        } else {
            optionRef.current.grid.left = "8%"
            setEcharts(optionRef.current)
        }
        echartsRef.current && echartsRef.current.resize()
    }, [width])

    useEffect(() => {
        if (inViewport) {
            echartsRef.current && echartsRef.current.resize()
            getRiseLine()
        }
    }, [inViewport])

    useUpdateEffect(() => {
        getRiseLine()
    }, [riseLineParams])

    useEffect(() => {
        if (!echartsRef.current) return
        //先解绑事件，防止事件重复触发
        // echartsRef.current.off("click")
        // echartsRef.current.off("legendselectchanged")
        // echartsRef.current.on("click", function (params) {
        //     // console.log("点击", params)
        // })
        // echartsRef.current.on("legendselectchanged", (e) => {
        //     // console.log("点击了", e) // 如果不加off事件，就会叠加触发
        // })
    }, [])
    const getRiseLine = useMemoizedFn(() => {
        setEcharts(optionRef.current)
        NetWorkApi<RiseLineProps, API.TouristActiveResponse>({
            method: "get",
            url: "tourist/change",
            params: {...riseLineParams}
        })
            .then((res: API.TouristActiveResponse) => {
                if (res.data) {
                    let XData: string[] = []
                    let YData: number[] = []
                    res.data.forEach((item) => {
                        XData.push(item.searchTime)
                        YData.push(item.count)
                    })
                    optionRef.current.xAxis.data = XData
                    optionRef.current.series[0].data = YData
                    optionRef.current.series[1].data = YData
                    setEcharts(optionRef.current)
                }
            })
            .catch((err) => {
                failed("用户数量变化获取失败:" + err)
            })
            .finally(() => {
                setIsShowEcharts(true)
            })
    })
    const setEcharts = (options) => {
        const chartDom = document.getElementById("data-statistics-risk-line")!
        if (chartDom) {
            echartsRef.current = echarts.init(chartDom)
            options && echartsRef.current.setOption(options)
        }
    }
    return (
        <div
            id='data-statistics-risk-line'
            className={classNames(styles["echarts-box"], isShowEcharts && styles["echarts-box-show"])}
        />
    )
}

interface ActiveLineEchartsProps {
    activeLineParams: ActiveLineProp
    inViewport?: boolean
    activeOrTime: "active" | "times"
}
interface ActiveLineProp {
    // 天月年展示
    showType: showTypeValue
    // 自选起始时间
    startTime: number
    // 自选结束时间
    endTime: number
}

const ActiveLineEcharts: React.FC<ActiveLineEchartsProps> = (props) => {
    const {inViewport, activeLineParams, activeOrTime} = props
    const {width} = useSize(document.querySelector("body")) || {width: 0, height: 0}
    const [isShowEcharts, setIsShowEcharts] = useState<boolean>(false)
    const optionRef = useRef<any>({
        color: "#4A3AFF", // 设置折线的颜色
        tooltip: {
            trigger: "axis",
            axisPointer: {
                type: "line"
            },
            formatter: "{b} : {c}"
        },
        xAxis: {
            type: "category",
            boundaryGap: false,
            data: []
        },
        yAxis: {
            type: "value",
            splitLine: {
                lineStyle: {
                    type: "dashed" // 设置横向线条类型为虚线
                }
            },
            axisLabel: {
                formatter: (value) => {
                    // 将纵坐标数值除以 1000 并添加 'k' 后缀
                    if (value < 1000) {
                        return value
                    } else {
                        return `${value / 1000}k`
                    }
                }
            }
        },
        series: [
            {
                data: [],
                type: "line",
                // symbol: "none", // 设置折点不显示
                areaStyle: {
                    color: {
                        type: "linear",
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            {
                                offset: 0,
                                color: "rgba(74, 58, 255, 0.5)" // 起始颜色
                            },
                            {
                                offset: 1,
                                color: "rgba(255, 255, 255, 0.5)" // 结束颜色
                            }
                        ]
                    }
                }
            }
        ],
        grid: {
            top: "5%", // 上留白距离
            bottom: "10%", // 下留白距离
            left: "5%", // 左留白距离
            right: "5%" // 右留白距离
        }
    })
    const echartsRef = useRef<any>()
    useEffect(() => {
        if (width >= 1920) {
            optionRef.current.grid.left = "3%"
            setEcharts(optionRef.current)
        } else if (width > 1050) {
            optionRef.current.grid.left = "5%"
            setEcharts(optionRef.current)
        } else {
            optionRef.current.grid.left = "8%"
            setEcharts(optionRef.current)
        }
        echartsRef.current && echartsRef.current.resize()
    }, [width])

    useEffect(() => {
        if (inViewport) {
            echartsRef.current && echartsRef.current.resize()
            activeOrTime === "active" ? getActiveLine() : getUsedTimeLine()
        }
    }, [inViewport])

    useUpdateEffect(() => {
        activeOrTime === "active" ? getActiveLine() : getUsedTimeLine()
    }, [activeLineParams, activeOrTime])

    useEffect(() => {
        if (!echartsRef.current) return
        //先解绑事件，防止事件重复触发
        // echartsRef.current.off("click")
        // echartsRef.current.off("legendselectchanged")
        // echartsRef.current.on("click", function (params) {
        //     // console.log("点击", params)
        // })
        // echartsRef.current.on("legendselectchanged", (e) => {
        //     // console.log("点击了", e) // 如果不加off事件，就会叠加触发
        // })
    }, [])

    // 活跃度统计
    const getActiveLine = useMemoizedFn(() => {
        setEcharts(optionRef.current)
        NetWorkApi<ActiveLineProp, API.TouristIncrResponse>({
            method: "get",
            url: "tourist/active",
            params: {...activeLineParams}
        })
            .then((res: API.TouristIncrResponse) => {
                if (res.data) {
                    let XData: string[] = []
                    let YData: number[] = []
                    res.data.forEach((item) => {
                        XData.push(item.searchTime)
                        YData.push(item.count)
                    })
                    optionRef.current.xAxis.data = XData
                    optionRef.current.series[0].data = YData
                    setEcharts(optionRef.current)
                }
            })
            .catch((err) => {
                failed("用户活跃度获取失败:" + err)
            })
            .finally(() => {
                setIsShowEcharts(true)
            })
    })

    // 使用时长统计
    const getUsedTimeLine = useMemoizedFn(() => {
        setEcharts(optionRef.current)
        NetWorkApi<ActiveLineProp, API.TouristIncrResponse>({
            method: "get",
            url: "tourist/used/time",
            params: {...activeLineParams}
        })
            .then((res: API.TouristIncrResponse) => {
                if (res.data) {
                    let XData: string[] = []
                    let YData: string[] = []
                    res.data.forEach((item) => {
                        XData.push(item.searchTime)
                        YData.push(minutesToHours(item.count))
                    })
                    optionRef.current.xAxis.data = XData
                    optionRef.current.series[0].data = YData
                    setEcharts(optionRef.current)
                }
            })
            .catch((err) => {
                failed("用户活跃度获取失败:" + err)
            })
            .finally(() => {
                setIsShowEcharts(true)
            })
    })

    const setEcharts = (options) => {
        const chartDom = document.getElementById("data-statistics-active-line")!
        if (chartDom) {
            echartsRef.current = echarts.init(chartDom)
            options && echartsRef.current.setOption(options)
        }
    }
    return (
        <div
            id='data-statistics-active-line'
            className={classNames(styles["echarts-box"], isShowEcharts && styles["echarts-box-show"])}
        />
    )
}
interface PieChartProps {
    inViewport?: boolean
    setCityDate: (v: number) => void
}
interface echartListProps {
    name: string
    value: number
}
const PieEcharts: React.FC<PieChartProps> = (props) => {
    const {inViewport, setCityDate} = props
    const {width} = useSize(document.querySelector("body")) || {width: 0, height: 0}
    const chartListRef = useRef<echartListProps[]>([])
    const [isShowEcharts, setIsShowEcharts] = useState<boolean>(false)
    const colorList = [
        "#8863F7",
        "#DA5FDD",
        "#4A94F8",
        "#29BCD0",
        "#35D8EE",
        "#56C991",
        "#F4736B",
        "#FFB660",
        "#FFD583",
        "#B4BBCA",
        "#F28B44"
    ]
    const optionRef = useRef<any>({
        color: colorList,
        title: {
            show: false,
            text: 0,
            subtext: "总IP数",
            top: "32%",
            left: "49%",
            // right: "50%",
            textAlign: "center",
            itemGap: 0,
            triggerEvent: true,
            textStyle: {
                fontSize: 40,
                color: "#31343F",
                lineHeight: 52,
                fontWeight: 700
            },
            subtextStyle: {
                color: "#B4BBCA",
                fontSize: 18,
                lineHeight: 30,
                fontWeight: 400
            }
        },
        tooltip: {
            trigger: "item",
            formatter: "{b} : {c} ({d}%)"
        },
        legend: {
            show: true,
            bottom: 0, // 设置图例距离底部的距离
            left: "center",
            orient: "horizontal",
            icon: "circle",
            // width: 300, // 设置图例的宽度
            padding: [0, 0, 0, 0],
            // 点的大小位置
            itemWidth: 13,
            itemHeight: 7,
            itemStyle: {
                borderWidth: 0
                // borderColor:"#0ba5ff"
            },
            itemGap: 18, // 设置图例每项的间隔
            formatter: (name) => {
                try {
                    const itemValue = chartListRef.current.filter((item) => item.name === name)[0].value
                    return "{name|" + name + "} " + "{value|" + itemValue + "}"
                } catch (error) {
                    return ""
                }
            },
            textStyle: {
                rich: {
                    name: {
                        color: "#85899E",
                        fontSize: 12,
                        marginRight: 12
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
                radius: ["48%", "78%"],
                // 饼图上下左右位置
                center: ["50%", "40%"],
                itemStyle: {
                    borderColor: "#FFFFFF",
                    borderWidth: 2,
                    borderRadius: [5, 5, 5, 5]
                },
                avoidLabelOverlap: false,
                type: "pie",
                label: {
                    show: false
                },
                labelLine: {
                    show: false
                },

                data: []
                // hoverAnimation: false, // 禁用 hover 效果
            }
        ]
    })
    const echartsRef = useRef<any>()
    useEffect(() => {
        if (width >= 1100) {
            optionRef.current.legend.show = true
            setEcharts(optionRef.current)
        } else {
            optionRef.current.legend.show = false
            setEcharts(optionRef.current)
        }
        echartsRef.current && echartsRef.current.resize()
    }, [width])

    useEffect(() => {
        if (inViewport) {
            echartsRef.current && echartsRef.current.resize()
            getPluginSearch()
        }
    }, [inViewport])

    useEffect(() => {
        if (!echartsRef.current) return
        //先解绑事件，防止事件重复触发
        // echartsRef.current.off("click")
        // echartsRef.current.off("legendselectchanged")
        // echartsRef.current.on("click", function (params) {
        //     // console.log("点击", params)
        // })
        // echartsRef.current.on("legendselectchanged", (e) => {
        //     // console.log("点击了", e) // 如果不加off事件，就会叠加触发
        // })
    }, [])

    const getPluginSearch = useMemoizedFn(() => {
        NetWorkApi<null, API.TouristCityResponse>({
            method: "get",
            url: "tourist/city"
        })
            .then((res: API.TouristCityResponse) => {
                if (res.data) {
                    const chartListCache = res.data.map((item) => ({
                        name: item.city,
                        value: item.count
                    }))
                    optionRef.current.series[0].data = chartListCache
                    optionRef.current.title.text = res.total
                    optionRef.current.title.show = true
                    chartListRef.current = chartListCache
                    setCityDate(res.date)
                    setEcharts(optionRef.current)
                }
            })
            .catch((err) => {
                failed("用户地理位置获取失败:" + err)
            })
            .finally(() => {
                setIsShowEcharts(true)
            })
    })

    const setEcharts = (options) => {
        const chartDom = document.getElementById("data-statistics-pie")!
        if (chartDom) {
            echartsRef.current = echarts.init(chartDom)
            options && echartsRef.current.setOption(options)
        }
    }
    return (
        <div
            id='data-statistics-pie'
            className={classNames(styles["echarts-box"], isShowEcharts && styles["echarts-box-show"])}
        />
    )
}

interface UpsOrDownsProps {
    type?: string //"up" | "down"
    value?: string
}
export const UpsOrDowns: React.FC<UpsOrDownsProps> = (props) => {
    const {type = "", value = ""} = props
    return (
        <div
            className={classNames(styles["ups-or-downs"], {
                [styles["type-up"]]: type === "up",
                [styles["type-down"]]: type === "down",
                [styles["type-keep"]]: type !== "down" && type !== "up"
            })}
        >
            <div className={classNames(styles["content"])}>
                {type === "up" && "+"}
                {type === "down" && "-"}
                {value ? `${value}%` : ""}
            </div>
            {["up", "down"].includes(type) && (
                <div className={styles["icon"]}>
                    {type === "up" ? <SolidTrendingupIcon /> : <SolidTrendingdownIcon />}
                </div>
            )}
        </div>
    )
}
type RangeValue = [Moment | null, Moment | null] | null
type showTypeValue = "day" | "week" | "month" | "year"
export interface DataStatisticsProps {}
export const DataStatistics: React.FC<DataStatisticsProps> = (props) => {
    const ref = useRef(null)
    const [inViewport] = useInViewport(ref)
    // 获取当前日期
    const today = moment()
    // 最早的启示时间
    const beginDate = moment("2023-12-01")
    // 计算 30 天前的日期
    const thirtyDaysAgo = today.clone().subtract(30, "days")
    // 计算 上个月第一天0时0分0秒的日期
    // const previousMonthFirstDay = today.clone().subtract(1, "months").startOf("month")
    // // 计算 上一年第一天0时0分0秒的日期
    // const previousYearFirstDay = today.clone().subtract(1, "years").startOf("year")
    const [userData, setUserData] = useState<API.TouristAndUserResponse>()
    const [loading, setLoading] = useState<boolean>(false)
    const [activeLineParams, setActiveLineParams] = useState<ActiveLineProp>({
        showType: "day",
        startTime: moment(thirtyDaysAgo).unix(),
        endTime: moment(today).unix()
    })
    const [riseLineParams, setRiseLineParams] = useState<RiseLineProps>({
        changeType: "total",
        showType: "day",
        startTime: moment(thirtyDaysAgo).unix(),
        endTime: moment(today).unix()
    })
    const [cityDate, setCityDate] = useState<number>()

    const [activeOrTime, setActiveOrTime] = useState<"active" | "times">("active")

    const getActiveShowType = useMemo(() => {
        return [
            {
                label: "天",
                value: "day"
            },
            {
                label: "周",
                value: "week"
            },
            {
                label: "月",
                value: "month"
            },
            {
                label: "年",
                value: "year"
            }
        ]
    }, [])

    const getRiseShowType = useMemo(() => {
        return [
            {
                label: "天",
                value: "day"
            },
            {
                label: "周",
                value: "week"
            },
            {
                label: "月",
                value: "month"
            },
            {
                label: "年",
                value: "year"
            }
        ]
    }, [])

    useEffect(() => {
        getUserData()
    }, [activeLineParams, activeOrTime])

    const getUserData = useMemoizedFn(() => {
        setLoading(true)
        NetWorkApi<null, API.TouristAndUserResponse>({
            url: "tourist",
            method: "get"
        })
            .then((data) => {
                setUserData(data)
            })
            .catch((err) => {})
            .finally(() => {
                setLoading(false)
            })
    })

    const [riseDates, setRiseDates] = useState<RangeValue>(null)
    const [riseHackValue, setRiseHackValue] = useState<RangeValue>(null)
    const [activeDates, setActiveDates] = useState<RangeValue>(null)
    const [activeHackValue, setActiveHackValue] = useState<RangeValue>(null)

    const disabledRiseLineDate: RangePickerProps["disabledDate"] = (current) => {
        if (riseLineParams.showType === "day") {
            if (riseDates) {
                const tooLate = (riseDates[0] && current.diff(riseDates[0], "days") > 60) || false
                const tooEarly = (riseDates[1] && riseDates[1].diff(current, "days") > 60) || false
                return current && (current < beginDate || current >= moment().endOf("day") || tooLate || tooEarly)
            }
            return current && (current < beginDate || current >= moment().endOf("day"))
        } else if (activeLineParams.showType === "week") {
            if (activeDates) {
                const tooLate = (activeDates[0] && current.diff(activeDates[0], "weeks") > 60) || false
                const tooEarly = (activeDates[1] && activeDates[1].diff(current, "weeks") > 60) || false
                return current && (current < beginDate || current >= moment().endOf("week") || tooLate || tooEarly)
            }
            return current && (current < beginDate || current >= moment().endOf("week"))
        } else if (riseLineParams.showType === "month") {
            if (riseDates) {
                const tooLate = (riseDates[0] && current.diff(riseDates[0], "months") > 60) || false
                const tooEarly = (riseDates[1] && riseDates[1].diff(current, "months") > 60) || false
                return (
                    current &&
                    (current < moment("2023-12") || current >= moment().endOf("month") || tooLate || tooEarly)
                )
            }
            return current && (current < moment("2023-12") || current >= moment().endOf("month"))
        } else {
            if (riseDates) {
                const tooLate = (riseDates[0] && current.diff(riseDates[0], "years") > 60) || false
                const tooEarly = (riseDates[1] && riseDates[1].diff(current, "years") > 60) || false
                return current && (current < moment("2023") || current >= moment().endOf("year") || tooLate || tooEarly)
            }
            return current && (current < moment("2023") || current >= moment().endOf("year"))
        }
    }

    const disabledActiveLineDate: RangePickerProps["disabledDate"] = (current) => {
        if (activeLineParams.showType === "day") {
            if (activeDates) {
                const tooLate = (activeDates[0] && current.diff(activeDates[0], "days") > 60) || false
                const tooEarly = (activeDates[1] && activeDates[1].diff(current, "days") > 60) || false
                return current && (current < beginDate || current >= moment().endOf("day") || tooLate || tooEarly)
            }
            return current && (current < beginDate || current >= moment().endOf("day"))
        } else if (activeLineParams.showType === "week") {
            if (activeDates) {
                const tooLate = (activeDates[0] && current.diff(activeDates[0], "weeks") > 60) || false
                const tooEarly = (activeDates[1] && activeDates[1].diff(current, "weeks") > 60) || false
                return current && (current < beginDate || current >= moment().endOf("week") || tooLate || tooEarly)
            }
            return current && (current < beginDate || current >= moment().endOf("week"))
        } else if (activeLineParams.showType === "month") {
            if (activeDates) {
                const tooLate = (activeDates[0] && current.diff(activeDates[0], "months") > 60) || false
                const tooEarly = (activeDates[1] && activeDates[1].diff(current, "months") > 60) || false
                return (
                    current &&
                    (current < moment("2023-12") || current >= moment().endOf("month") || tooLate || tooEarly)
                )
            }
            return current && (current < moment("2023-12") || current >= moment().endOf("month"))
        } else {
            if (activeDates) {
                const tooLate = (activeDates[0] && current.diff(activeDates[0], "years") > 60) || false
                const tooEarly = (activeDates[1] && activeDates[1].diff(current, "years") > 60) || false
                return current && (current < moment("2023") || current >= moment().endOf("year") || tooLate || tooEarly)
            }
            return current && (current < moment("2023") || current >= moment().endOf("year"))
        }
    }

    const getDateFormat = (v: showTypeValue) => {
        if (v === "day") {
            return "YYYY/MM/DD"
        } else if (v === "week") {
            return "YYYY-wo"
        } else if (v === "month") {
            return "YYYY/MM"
        } else {
            return "YYYY"
        }
    }

    const getPicker = useMemoizedFn((showType) => {
        switch (showType) {
            case "day":
            case "week":
                return "date"
            default:
                return showType
        }
    })

    return (
        <div className={styles["data-statistics"]} ref={ref}>
            <div className={styles["left-box"]}>
                <div className={styles["user-box"]}>
                    <YakitSpin spinning={loading}>
                        <div className={styles["user-sum"]}>
                            <div className={styles["all-user"]}>
                                <div className={styles["user-icon"]}>
                                    <UserIcon />
                                </div>
                                <div className={styles["count-box"]}>
                                    <div className={styles["count"]}>
                                        {userData ? numeral(userData.touristTotal).format("0,0") : ""}
                                    </div>
                                    <div className={styles["sub-title"]}>总用户数</div>
                                </div>
                            </div>
                            <div className={styles["institution-total"]}>
                                <div className={styles["count"]}>
                                    {userData ? numeral(userData.institutionTotal).format("0,0") : ""}
                                </div>
                                <div className={styles["sub-title"]}>机构用户数</div>
                            </div>
                            <div className={styles["login-user"]}>
                                <div className={styles["count"]}>
                                    {userData ? numeral(userData.loginTotal).format("0,0") : ""}
                                </div>
                                <div className={styles["sub-title"]}>登录用户总数</div>
                            </div>
                            <div className={styles["refresh"]}>
                                <YakitButton type='text2' icon={<OutlineRefreshIcon />} onClick={() => getUserData()} />
                            </div>
                        </div>
                        <div className={styles["card-box"]}>
                            <div className={classNames(styles["day-card"], styles["user-card"])}>
                                <div className={styles["line"]} />
                                <div className={styles["header"]}>
                                    <div className={styles["count"]}>{userData?.dayNew ?? ""}</div>
                                    <UpsOrDowns type={userData?.dayGainUpOrDown} value={userData?.dayGain} />
                                </div>

                                <div className={styles["title"]}>今日新增用户</div>
                            </div>
                            <div className={classNames(styles["week-card"], styles["user-card"])}>
                                <div className={styles["line"]} />
                                <div className={styles["header"]}>
                                    <div className={styles["count"]}>{userData?.weekNew ?? ""}</div>
                                    <UpsOrDowns type={userData?.weekGainUpOrDown} value={userData?.weekGain} />
                                </div>
                                <div className={styles["title"]}>本周新增用户</div>
                            </div>
                            <div className={classNames(styles["month-card"], styles["user-card"])}>
                                <div className={styles["line"]} />
                                <div className={styles["header"]}>
                                    <div className={styles["count"]}>{userData?.monthNew ?? ""}</div>
                                    <UpsOrDowns type={userData?.monthGainUpOrDown} value={userData?.monthGain} />
                                </div>
                                <div className={styles["title"]}>本月新增用户</div>
                            </div>
                        </div>
                    </YakitSpin>
                </div>

                <div className={styles["v-line"]} />
                <div className={styles["pie-charts-box"]}>
                    <div className={styles["header"]}>
                        <div className={styles["title"]}>IP地理位置分布 Top10</div>
                        <div className={styles["extra"]}>
                            {cityDate && (
                                <>
                                    <div className={styles["icon"]}>
                                        <SolidCalendarIcon />
                                    </div>
                                    <div className={styles["date"]}>
                                        {moment.unix(cityDate).format("YYYY-MM-DD HH:mm:ss")}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    <div className={styles["pie-charts"]}>
                        {/* 放大窗口图表宽度确实会自适应，但是缩小就挂掉了（并不自适应），原因：如果Chart组件的父组件Father采用flex布局 就会出现上述的问题 建议采用百分比*/}
                        <PieEcharts inViewport={inViewport} setCityDate={setCityDate} />
                    </div>
                </div>
            </div>
            <div className={styles["right-box"]}>
                <div className={styles["user-rise"]}>
                    <div className={styles["header"]}>
                        <div className={styles["title"]}>
                            <div className={styles["text"]}>用户数量变化趋势</div>
                            <div className={styles["radio-btn"]}>
                                <YakitRadioButtons
                                    value={riseLineParams.changeType}
                                    onChange={(e) => {
                                        setRiseLineParams({...riseLineParams, changeType: e.target.value})
                                    }}
                                    buttonStyle='solid'
                                    options={[
                                        {
                                            value: "total",
                                            label: "总数"
                                        },
                                        {
                                            value: "incr",
                                            label: "增长数"
                                        }
                                    ]}
                                />
                            </div>
                        </div>
                        <div className={styles["extra"]}>
                            <div className={styles["range-picker"]}>
                                <RangePicker
                                    locale={locale}
                                    value={
                                        riseHackValue || [
                                            moment.unix(riseLineParams.startTime),
                                            moment.unix(riseLineParams.endTime)
                                        ]
                                    }
                                    format={getDateFormat(riseLineParams.showType)}
                                    allowClear={false}
                                    disabledDate={disabledRiseLineDate}
                                    onOpenChange={(open: boolean) => {
                                        if (open) {
                                            setRiseHackValue([null, null])
                                            setRiseDates([null, null])
                                        } else {
                                            setRiseHackValue(null)
                                        }
                                    }}
                                    picker={getPicker(riseLineParams.showType)}
                                    onCalendarChange={(val) => setRiseDates(val)}
                                    onChange={(time) => {
                                        const riseDates = time as [Moment, Moment] | null
                                        if (riseDates) {
                                            let firstDate = riseDates[0]
                                            let secondDate = riseDates[1]
                                            const type = getPicker(riseLineParams.showType)

                                            if (firstDate.isBefore(beginDate)) {
                                                firstDate = beginDate
                                            } else {
                                                firstDate = moment(firstDate).startOf(type)
                                            }
                                            if (secondDate.isSame(today, type)) {
                                                secondDate = today
                                            } else {
                                                secondDate = moment(secondDate).endOf(type)
                                            }
                                            setRiseLineParams({
                                                ...riseLineParams,
                                                startTime: moment(firstDate).unix(),
                                                endTime: moment(secondDate).unix()
                                            })
                                        }
                                    }}
                                />
                            </div>

                            <YakitSegmented
                                value={riseLineParams?.showType}
                                onChange={(v) => {
                                    const showType: showTypeValue = v as showTypeValue
                                    setRiseLineParams({
                                        ...riseLineParams,
                                        showType
                                    })
                                }}
                                options={getRiseShowType}
                            />
                        </div>
                    </div>
                    <div className={styles["user-rise-charts"]}>
                        <RiseLineEcharts inViewport={inViewport} riseLineParams={riseLineParams} />
                    </div>
                </div>
                <div className={styles["user-active-time"]}>
                    <div className={styles["header"]}>
                        <div className={styles["title"]}>
                            <YakitRadioButtons
                                value={activeOrTime}
                                onChange={(e) => {
                                    setActiveOrTime(e.target.value)
                                }}
                                buttonStyle='solid'
                                options={[
                                    {
                                        value: "active",
                                        label: "活跃度统计"
                                    },
                                    {
                                        value: "times",
                                        label: "使用时长统计"
                                    }
                                ]}
                            />
                        </div>
                        <div className={styles["extra"]}>
                            <RangePicker
                                locale={locale}
                                value={
                                    activeHackValue || [
                                        moment.unix(activeLineParams.startTime),
                                        moment.unix(activeLineParams.endTime)
                                    ]
                                }
                                format={getDateFormat(activeLineParams.showType)}
                                allowClear={false}
                                disabledDate={disabledActiveLineDate}
                                onOpenChange={(open: boolean) => {
                                    if (open) {
                                        setActiveHackValue([null, null])
                                        setActiveDates([null, null])
                                    } else {
                                        setActiveHackValue(null)
                                    }
                                }}
                                picker={getPicker(activeLineParams.showType)}
                                onCalendarChange={(val) => setActiveDates(val)}
                                onChange={(time) => {
                                    const riseDates = time as [Moment, Moment] | null

                                    if (riseDates) {
                                        let firstDate = riseDates[0]
                                        let secondDate = riseDates[1]
                                        const type = getPicker(activeLineParams.showType)

                                        if (firstDate.isBefore(beginDate)) {
                                            firstDate = beginDate
                                        } else {
                                            firstDate = moment(firstDate).startOf(type)
                                        }
                                        if (secondDate.isSame(today, type)) {
                                            secondDate = today
                                        } else {
                                            secondDate = moment(secondDate).endOf(type)
                                        }
                                        setActiveLineParams({
                                            ...activeLineParams,
                                            startTime: moment(firstDate).unix(),
                                            endTime: moment(secondDate).unix()
                                        })
                                    }
                                }}
                            />
                            <YakitSegmented
                                value={activeLineParams?.showType}
                                onChange={(v) => {
                                    const showType: showTypeValue = v as showTypeValue
                                    setActiveLineParams({
                                        ...activeLineParams,
                                        showType
                                    })
                                }}
                                options={getActiveShowType}
                            />
                        </div>
                    </div>
                    <div>
                        <YakitSpin spinning={loading}>
                            <div className={styles["card-box"]}>
                                {activeOrTime === "active" ? (
                                    <>
                                        <div className={styles["card-item"]}>
                                            <div className={styles["show"]}>
                                                <div className={styles["count"]}>
                                                    {userData ? numeral(userData.dayActive).format("0,0") : ""}
                                                </div>
                                                <UpsOrDowns
                                                    type={userData?.dayActiveGainUpOrDown}
                                                    value={userData?.dayActiveGain}
                                                />
                                            </div>
                                            <div className={styles["title"]}>日活</div>
                                        </div>
                                        <div className={styles["card-item"]}>
                                            <div className={styles["show"]}>
                                                <div className={styles["count"]}>
                                                    {userData ? numeral(userData.weekActive).format("0,0") : ""}
                                                </div>
                                                <UpsOrDowns
                                                    type={userData?.weekActiveGainUpOrDown}
                                                    value={userData?.weekActiveGain}
                                                />
                                            </div>
                                            <div className={styles["title"]}>周活</div>
                                        </div>
                                        <div className={styles["card-item"]}>
                                            <div className={styles["show"]}>
                                                <div className={styles["count"]}>
                                                    {userData ? numeral(userData.monthActive).format("0,0") : ""}
                                                </div>
                                                <UpsOrDowns
                                                    type={userData?.monthActiveGainUpOrDown}
                                                    value={userData?.monthActiveGain}
                                                />
                                            </div>
                                            <div className={styles["title"]}>月活</div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className={styles["card-item"]}>
                                            <div className={styles["show"]}>
                                                <div className={styles["count"]}>
                                                    {userData ? minutesToHours(userData.dayTimes) : ""}
                                                </div>
                                                <UpsOrDowns
                                                    type={userData?.dayTimesGainUpOrDown}
                                                    value={userData?.dayTimesGain}
                                                />
                                            </div>
                                            <div className={styles["title"]}>今日总时长/h</div>
                                        </div>
                                        <div className={styles["card-item"]}>
                                            <div className={styles["show"]}>
                                                <div className={styles["count"]}>
                                                    {userData ? minutesToHours(userData.weekTimes) : ""}
                                                </div>
                                                <UpsOrDowns
                                                    type={userData?.weekTimesGainUpOrDown}
                                                    value={userData?.weekTimesGain}
                                                />
                                            </div>
                                            <div className={styles["title"]}>本周总时长/h</div>
                                        </div>
                                        <div className={styles["card-item"]}>
                                            <div className={styles["show"]}>
                                                <div className={styles["count"]}>
                                                    {userData ? minutesToHours(userData.monthTimes) : ""}
                                                </div>
                                                <UpsOrDowns
                                                    type={userData?.monthTimesGainUpOrDown}
                                                    value={userData?.monthTimesGain}
                                                />
                                            </div>
                                            <div className={styles["title"]}>本月总时长/h</div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </YakitSpin>
                    </div>
                    <div className={styles["active-line-charts"]}>
                        <ActiveLineEcharts
                            inViewport={inViewport}
                            activeLineParams={activeLineParams}
                            activeOrTime={activeOrTime}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
