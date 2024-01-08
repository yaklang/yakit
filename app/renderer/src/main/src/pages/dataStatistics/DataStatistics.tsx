import React, {useEffect, useRef, useState} from "react"
import {DatePicker} from "antd"
import {} from "@ant-design/icons"
import {useGetState, useInViewport, useMemoizedFn, useSize} from "ahooks"
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
import moment from "moment"
import {OutlineClockIcon} from "@/assets/icon/outline"
import "moment/locale/zh-cn"
import locale from "antd/es/date-picker/locale/zh_CN"
const {RangePicker} = DatePicker
const {ipcRenderer} = window.require("electron")
const dateFormat = "YYYY/MM/DD"

interface RiseLineEchartsProps {
    inViewport?: boolean
}

const RiseLineEcharts: React.FC<RiseLineEchartsProps> = (props) => {
    const {inViewport} = props
    const {width} = useSize(document.querySelector("body")) || {width: 0, height: 0}
    const [_, setChartList, getChartList] = useGetState<echartListProps[]>([])
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
            data: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]
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
                data: [820, 932, 901, 934, 529, 633, 732, 820, 932, 901, 934, 1290],
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
                data: [820, 932, 901, 934, 529, 633, 732, 820, 932, 901, 934, 1290],
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
        if (width >= 1380) {
            // optionRef.current.series[0].center = ["24%", "50%"]
            // optionRef.current.title.left = "23%"
            // setEcharts(optionRef.current)
        } else {
            // optionRef.current.legend.show = false
            // optionRef.current.series[0].center = ["50%", "50%"]
            // optionRef.current.title.left = "48%"
            // setEcharts(optionRef.current)
        }
        echartsRef.current && echartsRef.current.resize()
    }, [width])

    useEffect(() => {
        if (inViewport) {
            echartsRef.current && echartsRef.current.resize()
            getActiveLine()
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
    const getActiveLine = useMemoizedFn(() => {
        setEcharts(optionRef.current)
        NetWorkApi<null, API.TouristCityResponse>({
            method: "get",
            url: ""
        })
            .then((res: API.TouristCityResponse) => {
                console.log("", res)
                // if (res.data) {
                //     const chartListCache = res.data.map((item) => ({
                //         name: item.city,
                //         value: item.count
                //     }))
                //     optionRef.current.series[0].data = chartListCache
                //     optionRef.current.title.text = chartListCache.map((item) => item.value).reduce((a, b) => a + b, 0)
                //     optionRef.current.title.show = true
                //     setChartList(chartListCache)
                //     setEcharts(optionRef.current)
                // }
            })
            .catch((err) => {
                // failed("线上统计数据获取失败:" + err)
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
    inViewport?: boolean
}

const ActiveLineEcharts: React.FC<ActiveLineEchartsProps> = (props) => {
    const {inViewport} = props
    const {width} = useSize(document.querySelector("body")) || {width: 0, height: 0}
    const [_, setChartList, getChartList] = useGetState<echartListProps[]>([])
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
            data: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]
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
                data: [820, 932, 901, 934, 1290, 1330, 1320, 820, 932, 901, 934, 1290],
                type: "line",
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
        if (width >= 1380) {
            // optionRef.current.series[0].center = ["24%", "50%"]
            // optionRef.current.title.left = "23%"
            // setEcharts(optionRef.current)
        } else {
            // optionRef.current.legend.show = false
            // optionRef.current.series[0].center = ["50%", "50%"]
            // optionRef.current.title.left = "48%"
            // setEcharts(optionRef.current)
        }
        echartsRef.current && echartsRef.current.resize()
    }, [width])

    useEffect(() => {
        if (inViewport) {
            echartsRef.current && echartsRef.current.resize()
            getActiveLine()
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
    const getActiveLine = useMemoizedFn(() => {
        console.log("909090")
        setIsShowEcharts(true)
        setEcharts(optionRef.current)
        NetWorkApi<null, API.TouristCityResponse>({
            method: "get",
            url: ""
        })
            .then((res: API.TouristCityResponse) => {
                console.log("", res)
                // if (res.data) {
                //     const chartListCache = res.data.map((item) => ({
                //         name: item.city,
                //         value: item.count
                //     }))
                //     optionRef.current.series[0].data = chartListCache
                //     optionRef.current.title.text = chartListCache.map((item) => item.value).reduce((a, b) => a + b, 0)
                //     optionRef.current.title.show = true
                //     setChartList(chartListCache)
                //     setEcharts(optionRef.current)
                // }
            })
            .catch((err) => {
                // failed("线上统计数据获取失败:" + err)
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
}
interface echartListProps {
    name: string
    value: number
}
const PieEcharts: React.FC<PieChartProps> = (props) => {
    const {inViewport} = props
    const {width} = useSize(document.querySelector("body")) || {width: 0, height: 0}
    const [_, setChartList, getChartList] = useGetState<echartListProps[]>([])
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
        "#B4BBCA"
    ]
    const optionRef = useRef<any>({
        color: colorList,
        title: {
            show: false,
            text: 0,
            subtext: "Total",
            top: "32%",
            left: "48%",
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
                lineHeight: 32,
                fontWeight: 400
            }
        },
        tooltip: {
            trigger: "item",
            formatter: "{b} : {c} ({d}%)"
        },
        legend: {
            show: false,
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
                    const itemValue = getChartList().filter((item) => item.name === name)[0].value
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
                radius: ["47%", "77%"],
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
        if (width >= 1380) {
            optionRef.current.legend.show = true
            // optionRef.current.series[0].center = ["24%", "50%"]
            // optionRef.current.title.left = "23%"
            // setEcharts(optionRef.current)
        } else {
            // optionRef.current.legend.show = false
            // optionRef.current.series[0].center = ["50%", "50%"]
            // optionRef.current.title.left = "48%"
            // setEcharts(optionRef.current)
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
                console.log("tourist/city", res)

                if (res.data) {
                    const chartListCache = res.data.map((item) => ({
                        name: item.city,
                        value: item.count
                    }))
                    optionRef.current.series[0].data = chartListCache
                    optionRef.current.title.text = chartListCache.map((item) => item.value).reduce((a, b) => a + b, 0)
                    optionRef.current.title.show = true
                    setChartList(chartListCache)
                    setEcharts(optionRef.current)
                }
            })
            .catch((err) => {
                // failed("线上统计数据获取失败:" + err)
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
    type: "up" | "down"
    value: string
}
export const UpsOrDowns: React.FC<UpsOrDownsProps> = (props) => {
    const {type, value} = props
    return (
        <div
            className={classNames(styles["ups-or-downs"], {
                [styles["type-up"]]: type === "up",
                [styles["type-down"]]: type === "down"
            })}
        >
            <div className={classNames(styles["content"])}>
                {type === "up" ? "+" : "-"}
                {value}%
            </div>
            <div className={styles["icon"]}>{type === "up" ? <SolidTrendingupIcon /> : <SolidTrendingdownIcon />}</div>
        </div>
    )
}

export interface DataStatisticsProps {}
export const DataStatistics: React.FC<DataStatisticsProps> = (props) => {
    const ref = useRef(null)
    const [inViewport] = useInViewport(ref)
    const [userData, setUserData] = useState<API.TouristAndUserResponse>()
    const [loading, setLoading] = useState<boolean>(false)
    useEffect(() => {
        getUserData()
    }, [])

    const getUserData = useMemoizedFn(() => {
        setLoading(true)
        NetWorkApi<null, API.TouristAndUserResponse>({
            url: "tourist",
            method: "get"
        })
            .then((data) => {
                console.log("opop", data)
                setUserData(data)
            })
            .catch((err) => {})
            .finally(() => {
                setLoading(false)
            })
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
                            <div className={styles["login-user"]}>
                                <div className={styles["count"]}>
                                    {userData ? numeral(userData.loginTotal).format("0,0") : ""}
                                </div>
                                <div className={styles["sub-title"]}>登录用户总数</div>
                            </div>
                        </div>
                        <div className={styles["card-box"]}>
                            <div className={classNames(styles["day-card"], styles["user-card"])}>
                                <div className={styles["line"]} />
                                <div className={styles["header"]}>
                                    <div className={styles["count"]}>{userData?.dayNew ?? ""}</div>
                                    <UpsOrDowns type='up' value='0.36' />
                                </div>

                                <div className={styles["title"]}>今日新增用户</div>
                            </div>
                            <div className={classNames(styles["week-card"], styles["user-card"])}>
                                <div className={styles["line"]} />
                                <div className={styles["header"]}>
                                    <div className={styles["count"]}>{userData?.weekNew ?? ""}</div>
                                    <UpsOrDowns type='down' value='2' />
                                </div>
                                <div className={styles["title"]}>本周新增用户</div>
                            </div>
                            <div className={classNames(styles["month-card"], styles["user-card"])}>
                                <div className={styles["line"]} />
                                <div className={styles["header"]}>
                                    <div className={styles["count"]}>{userData?.monthNew ?? ""}</div>
                                    <UpsOrDowns type='up' value='6.8' />
                                </div>
                                <div className={styles["title"]}>本月新增用户</div>
                            </div>
                        </div>
                    </YakitSpin>
                </div>

                <div className={styles["v-line"]} />
                <div className={styles["pie-charts-box"]}>
                    <div className={styles["header"]}>
                        <div className={styles["title"]}>用户地理位置分布 Top10</div>
                        <div className={styles["extra"]}>
                            <div className={styles["icon"]}>
                                <SolidCalendarIcon />
                            </div>
                            <div className={styles["date"]}>2023-07-28 15:46:21</div>
                        </div>
                    </div>
                    <div className={styles["pie-charts"]}>
                        {/* 放大窗口图表宽度确实会自适应，但是缩小就挂掉了（并不自适应），原因：如果Chart组件的父组件Father采用flex布局 就会出现上述的问题 建议采用百分比*/}
                        <PieEcharts inViewport={inViewport} />
                    </div>
                </div>
            </div>
            <div className={styles["right-box"]}>
                <div className={styles["user-active"]}>
                    <div className={styles["header"]}>
                        <div className={styles["title"]}>用户活跃度统计</div>
                        <div className={styles["extra"]}>
                            <div className={styles["range-picker"]}>
                                <RangePicker
                                    locale={locale}
                                    defaultValue={[moment("2015/01/01", dateFormat), moment("2015/01/01", dateFormat)]}
                                    format={dateFormat}
                                    suffixIcon={
                                        <div className={styles["picker-icon"]}>
                                            <OutlineClockIcon />
                                        </div>
                                    }
                                    allowClear={false}
                                    dropdownClassName={styles["range-picker-dropdaown"]}
                                />
                            </div>

                            <YakitSegmented
                                // value={userPluginType}

                                onChange={(v) => {}}
                                options={[
                                    {
                                        label: "日",
                                        value: "myOnlinePlugin"
                                    },
                                    {
                                        label: "周",
                                        value: "recycle"
                                    },
                                    {
                                        label: "月",
                                        value: "recycle1"
                                    },
                                    {
                                        label: "年",
                                        value: "recycle2"
                                    }
                                ]}
                            />
                        </div>
                    </div>
                    <div className={styles["card-box"]}>
                        <div className={styles["card-item"]}>
                            <div className={styles["show"]}>
                                <div className={styles["count"]}>327</div>
                                <UpsOrDowns type='up' value='6.8' />
                            </div>
                            <div className={styles["title"]}>日活</div>
                        </div>
                        <div className={styles["card-item"]}>
                            <div className={styles["show"]}>
                                <div className={styles["count"]}>2632</div>
                                <UpsOrDowns type='down' value='2' />
                            </div>
                            <div className={styles["title"]}>周活</div>
                        </div>
                        <div className={styles["card-item"]}>
                            <div className={styles["show"]}>
                                <div className={styles["count"]}>
                                    {userData ? numeral(userData.touristTotal).format("0,0") : ""}
                                </div>
                                <UpsOrDowns type='up' value='6.8' />
                            </div>
                            <div className={styles["title"]}>月活</div>
                        </div>
                    </div>
                    <div className={styles["active-line-charts"]}>
                        <ActiveLineEcharts inViewport={inViewport} />
                    </div>
                </div>
                <div className={styles["user-rise"]}>
                    <div className={styles["header"]}>
                        <div className={styles["title"]}>
                            <div className={styles["text"]}>用户数量变化趋势</div>
                            <div className={styles["radio-btn"]}>
                                <YakitRadioButtons
                                    // size='large'
                                    value={"all"}
                                    onChange={(e) => {
                                        // setFormat(e.target.value)
                                    }}
                                    buttonStyle='solid'
                                    options={[
                                        {
                                            value: "all",
                                            label: "总数"
                                        },
                                        {
                                            value: "add",
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
                                    defaultValue={[moment("2015/01/01", dateFormat), moment("2015/01/01", dateFormat)]}
                                    format={dateFormat}
                                    suffixIcon={
                                        <div className={styles["picker-icon"]}>
                                            <OutlineClockIcon />
                                        </div>
                                    }
                                    allowClear={false}
                                    dropdownClassName={styles["range-picker-dropdaown"]}
                                />
                            </div>

                            <YakitSegmented
                                // value={userPluginType}

                                onChange={(v) => {}}
                                options={[
                                    {
                                        label: "日",
                                        value: "myOnlinePlugin"
                                    },
                                    {
                                        label: "周",
                                        value: "recycle"
                                    },
                                    {
                                        label: "月",
                                        value: "recycle1"
                                    },
                                    {
                                        label: "年",
                                        value: "recycle2"
                                    }
                                ]}
                            />
                        </div>
                    </div>
                    <div className={styles["user-rise-charts"]}>
                        <RiseLineEcharts inViewport={inViewport} />
                    </div>
                </div>
            </div>
        </div>
    )
}
