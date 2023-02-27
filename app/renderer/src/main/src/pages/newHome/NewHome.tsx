import React, {ReactNode, useEffect, useRef, useState} from "react"
import {Row, Col} from "antd"
import {ArrowRightOutlined} from "@ant-design/icons"
import styles from "./newHome.module.scss"
import classNames from "classnames"
import {MenuDataProps, Route, ContentByRoute} from "@/routes/routeSpec"
import {genDefaultPagination, QueryYakScriptRequest, QueryYakScriptsResponse} from "@/pages/invoker/schema"
import {NetWorkApi} from "@/services/fetch"
import {Interaction, Annotation, Chart, Coordinate, Tooltip, Axis, Interval, Legend, getTheme} from "bizcharts"
import {useStore, YakitStoreParams} from "@/store"
import {API} from "@/services/swagger/resposeType"
import {useGetState, useMemoizedFn, useSize, useInViewport} from "ahooks"
import cloneDeep from "lodash/cloneDeep"
import {failed, info, success} from "@/utils/notification"
import {MenuItemGroup} from "@/pages//MainOperator"
import {PluginSearchStatisticsRequest, PluginType} from "@/pages/yakitStore/YakitStorePage"
import {DownloadOnlinePluginByScriptNamesResponse} from "@/pages/layout/HeardMenu/HeardMenuType"
import {
    MenuComprehensiveCatalogScanningAndBlastingDeepIcon,
    MenuPluginBatchExecutionDeepIcon,
    MenuPortScanningDeepIcon,
    MenuSpecialVulnerabilityDetectionDeepIcon,
    MenuPluginWarehouseDeepIcon,
    MenuYakRunnerDeepIcon,
    MenuMITMInteractiveHijackingDeepIcon,
    MenuWebFuzzerDeepIcon,
    MenuBlastingAndUnauthorizedTestingDeepIcon,
    MenuCodecDeepIcon,
    MenuDataComparisonDeepIcon,
    AuditOutlinedDeepIcon,
    MenuPortListenerDeepIcon,
    MenuReverseConnectionServerDeepIcon,
    MenuDNSLogDeepIcon,
    MenuICMPSizeLogDeepIcon,
    MenuTCPPortLogDeepIcon,
    MenuYsoJavaHackDeepIcon,
    MenuBaseReptileDeepIcon,
    ReduceCountIcon,
    AddCountIcon,
    KeepCountIcon
} from "@/pages/customizeMenu/icon/homeIcon"
import CountUp from "react-countup"
import {ENTERPRISE_STATUS, getJuageEnvFile} from "@/utils/envfile"
// echarts
// import * as echarts from "echarts/core"
// import {TooltipComponent, TooltipComponentOption, LegendComponent, LegendComponentOption} from "echarts/components"
// import {PieChart, PieSeriesOption} from "echarts/charts"
// import {LabelLayout} from "echarts/features"
// import {CanvasRenderer} from "echarts/renderers"
// echarts.use([TooltipComponent, LegendComponent, PieChart, CanvasRenderer, LabelLayout])
// type EChartsOption = echarts.ComposeOption<TooltipComponentOption | LegendComponentOption | PieSeriesOption>

import * as echarts from "echarts"
const IsEnterprise: boolean = ENTERPRISE_STATUS.IS_ENTERPRISE_STATUS === getJuageEnvFile()
const {ipcRenderer} = window.require("electron")

interface RouteTitleProps {
    title: string
}

const RouteTitle: React.FC<RouteTitleProps> = (props) => {
    const {title} = props
    return <div className={styles["home-page-title"]}>{title}</div>
}

interface RouteItemProps {
    dataSource: DataItem
    setOpenPage: (v: any) => void
    load: boolean
    getCustomizeMenus?: () => void
}

const RouteItem: React.FC<RouteItemProps> = (props) => {
    const {dataSource, setOpenPage, load, getCustomizeMenus} = props
    // 全局登录状态
    const {userInfo} = useStore()
    const goRoute = () => {
        dataSource.key &&
            setOpenPage({
                verbose: dataSource.label,
                route: dataSource.key,
                singleNode: ContentByRoute(Route.HTTPHacker),
                multipleNode: []
            })
    }

    const addMenuLab = (name: string) => {
        ipcRenderer.invoke("send-down-by-scriptNames", {names: [name]})
    }
    const addMenu = (name: string) => {
        if (name === "基础爬虫" || name === "综合目录扫描与爆破") {
            addMenuLab(name)
        }
    }
    return (
        <>
            {load && (
                <div
                    className={classNames(styles["route-item"], dataSource.isShow && styles["route-item-active"])}
                    onClick={goRoute}
                >
                    <div className={styles["icon-box"]}>
                        <div
                            className={classNames(styles["menu-icon"], !dataSource.isShow && styles["control-opacity"])}
                        >
                            {dataSource.icon}
                        </div>
                        {dataSource.isShow ? (
                            <ArrowRightOutlined className={styles["right-arrow"]} />
                        ) : (
                            <div className={styles["right-arrow-text"]} onClick={() => addMenu(dataSource.label)}>
                                获取菜单
                            </div>
                        )}
                    </div>
                    <div className={classNames(styles["item-label"], !dataSource.isShow && styles["control-opacity"])}>
                        {dataSource.label}
                    </div>
                    <div
                        className={classNames(styles["item-describe"], !dataSource.isShow && styles["control-opacity"])}
                    >
                        {dataSource.describe}
                    </div>
                </div>
            )}
        </>
    )
}
interface DataItem {
    id: string
    key?: Route
    icon: JSX.Element
    describe: string
    label: string
    isShow: boolean
}

interface newHomeListData {
    id: string
    label: string
    subMenuData: DataItem[]
}

interface RouteListProps {
    load?: boolean
    colLimit?: 1 | 2 | 3
    data: newHomeListData
    setOpenPage: (v: any) => void
    getCustomizeMenus?: () => void
}

const RouteList: React.FC<RouteListProps> = (props) => {
    const {colLimit = 1, data, setOpenPage, load = true, getCustomizeMenus} = props
    const [span, setSpan] = useState(24 / colLimit)
    const rowCount = Math.ceil(data.subMenuData.length / colLimit)
    return (
        <div style={{height: "100%"}} className={styles["list-box"]}>
            <RouteTitle title={data.label} />
            <Row
                className={classNames(styles["list-content"], {
                    [styles["set-ant-row"]]: colLimit === 1
                })}
            >
                {data.subMenuData.map((item) => (
                    <Col
                        span={span}
                        key={item.id}
                        flex={1}
                        className={classNames(styles[`list-content-col${rowCount}`])}
                    >
                        <RouteItem
                            load={load}
                            dataSource={item}
                            setOpenPage={setOpenPage}
                            getCustomizeMenus={getCustomizeMenus}
                        />
                    </Col>
                ))}
            </Row>
        </div>
    )
}
interface PieChartProps {
    goStoreRoute: (v: any) => void
    inViewport?: boolean
}
interface echartListProps {
    name: string
    value: number
}
const PieEcharts: React.FC<PieChartProps> = (props) => {
    const {goStoreRoute, inViewport} = props
    const {width} = useSize(document.querySelector("body")) || {width: 0, height: 0}
    // 全局登录状态
    const {userInfo} = useStore()
    const [_, setChartList, getChartList] = useGetState<echartListProps[]>([])
    const [isShowEcharts, setIsShowEcharts] = useState<boolean>(false)
    const colorList = ["#FFB660", "#4A94F8", "#5F69DD", "#56C991", "#8863F7", "#35D8EE"]
    const optionRef = useRef<any>({
        color: colorList,
        title: {
            show: false,
            text: 0,
            subtext: "插件总数",
            top: "38%",
            left: "23%",
            textAlign: "center",
            itemGap: 0,
            triggerEvent: true,
            textStyle: {
                fontSize: 20,
                color: "#31343F",
                lineHeight: 32,
                fontWeight: 600,
                fontFamily: "PingFang HK"
            },
            subtextStyle: {
                color: "#85899E",
                fontSize: 12,
                lineHeight: 16
            }
        },
        tooltip: {
            trigger: "item"
        },
        legend: {
            show: false,
            top: "middle",
            right: "2%",
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
                        width: 100
                    },
                    value: {
                        color: "#31343F",
                        fontSize: 14,
                        fontWeight: 500,
                        width: 40,
                        align: "right"
                    }
                }
            }
        },

        series: [
            {
                // 空心饼图内外径
                radius: ["60%", "77%"],
                // 饼图上下左右位置
                center: ["24%", "50%"],
                itemStyle: {
                    borderColor: "#F0F1F3",
                    borderWidth: 4
                },
                avoidLabelOverlap: false,
                type: "pie",
                label: {
                    show: false,
                    color: "#eeeeee",
                    fontSize: 14
                },
                labelLine: {
                    show: false
                },
                data: []
            }
        ]
    })
    const echartsRef = useRef<any>()
    useEffect(() => {
        if (width >= 1380) {
            optionRef.current.legend.show = true
            optionRef.current.series[0].center = ["24%", "50%"]
            optionRef.current.title.left = "23%"
            setEcharts(optionRef.current)
        } else {
            optionRef.current.legend.show = false
            optionRef.current.series[0].center = ["50%", "50%"]
            optionRef.current.title.left = "48%"
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
        getPluginSearch()
        //先解绑事件，防止事件重复触发
        echartsRef.current.off("click")
        echartsRef.current.off("legendselectchanged")
        echartsRef.current.on("click", function (params) {
            // console.log("点击", params)
            onSendToTab(params.name ?? "")
        })
        echartsRef.current.on("legendselectchanged", (e) => {
            // console.log("点击了", e) // 如果不加off事件，就会叠加触发
            onSendToTab(e.name ?? "")
            echartsRef.current.setOption({
                legend: {selected: {[e.name]: true}}
            })
        })
    }, [])

    const getPluginSearch = useMemoizedFn(() => {
        let url = "plugin/search/unlogged"
        if (IsEnterprise || userInfo.isLogin) {
            url = "plugin/search"
        }
        NetWorkApi<PluginSearchStatisticsRequest, API.YakitSearch>({
            method: "get",
            url,
            params: {
                bind_me: false
            }
        })
            .then((res: API.YakitSearch) => {
                if (res.plugin_type) {
                    const chartListCache = res.plugin_type.map((item) => ({
                        name: PluginType[item.value] ?? "未识别",
                        value: item.count
                    }))
                    // console.log("chartListCache",chartListCache,res.plugin_type)
                    // @ts-ignore
                    optionRef.current.series[0].data = chartListCache
                    optionRef.current.title.text = chartListCache.map((item) => item.value).reduce((a, b) => a + b, 0)
                    optionRef.current.title.show = true
                    setChartList(chartListCache)
                    setEcharts(optionRef.current)
                }
            })
            .catch((err) => {
                failed("线上统计数据获取失败:" + err)
            })
            .finally(() => {
                setIsShowEcharts(true)
            })
    })

    const onSendToTab = useMemoizedFn((pluginType: string) => {
        let plugin_type: string = ""
        for (let key in PluginType) {
            if (PluginType[key] === pluginType) {
                plugin_type = key
            }
        }
        goStoreRoute({plugin_type})
    })

    const setEcharts = (options) => {
        const chartDom = document.getElementById("main-home-pie")!
        if (chartDom) {
            echartsRef.current = echarts.init(chartDom)
            options && echartsRef.current.setOption(options)
        }
    }
    return (
        <div
            id='main-home-pie'
            className={classNames(styles["echarts-box"], isShowEcharts && styles["echarts-box-show"])}
        ></div>
    )
}

// const PieEcharts: React.FC<PieChartProps> = (props) => {
//     const {goStoreRoute} = props
//     const [chartList, setChartList] = useState<chartListProps[]>([])
//     const [chartCount, setChartCount] = useState<any>({})
//     // 全局登录状态
//     const {userInfo} = useStore()

//     const {width} = useSize(document.querySelector("body")) || {width: 0, height: 0}

//     useEffect(() => {
//         getPluginSearch()
//     }, [])
//     const getPluginSearch = useMemoizedFn(() => {
//         let url = "plugin/search/unlogged"
//         if (userInfo.isLogin) {
//             url = "plugin/search"
//         }
//         NetWorkApi<PluginSearchStatisticsRequest, API.YakitSearch>({
//             method: "get",
//             url,
//             params: {
//                 bind_me: false
//             }
//         })
//             .then((res: API.YakitSearch) => {
//                 if (res.plugin_type) {
//                     const chartList = res.plugin_type.map((item) => ({
//                         type: PluginType[item.value] ?? "未识别",
//                         value: item.count,
//                         id: item.value
//                     }))
//                     setChartList(chartList)
//                     const colorArr = ["#FFB660", "#4A94F8", "#5F69DD", "#56C991", "#8863F7", "#35D8EE"]
//                     let obj = {}
//                     // 背景颜色赋值
//                     chartList
//                         .sort((a, b) => b.value - a.value)
//                         .forEach((item, index) => {
//                             obj[item.type] = colorArr[index]
//                         })
//                     setChartCount(obj)
//                 }
//             })
//             .catch((err) => {
//                 failed("线上统计数据获取失败:" + err)
//             })
//             .finally(() => {
//                 setTimeout(() => {}, 200)
//             })
//     })
//     const g2Ref = useRef<any>()
//     // 发送插件仓库
//     const onSendToTab = useMemoizedFn((pluginType: string) => {
//         let plugin_type: string = ""
//         for (let key in PluginType) {
//             if (PluginType[key] === pluginType) {
//                 plugin_type = key
//             }
//         }
//         goStoreRoute({plugin_type})
//     })
//     console.log("width",width)
//     return (
//         <>
//             {chartList.length > 0 && (
//                 <Chart
//                     padding={[0, width>1200?160:0, 0, 0]}
//                     data={chartList || []}
//                     autoFit
//                     radius={1.0}
//                     angleField='value'
//                     colorField='type'
//                     label={{visible: false}}
//                     onClick={(ev) => {
//                         // console.log("g2", g2Ref.current)
//                         const data = ev.data
//                         // console.log("data", data)
//                         if (data) {
//                             onSendToTab(data.data.type ?? "")
//                         }
//                     }}
//                     onGetG2Instance={(g2chart) => {
//                         g2Ref.current = g2chart
//                         // Legend不允许点击
//                         g2chart.removeInteraction("legend-filter")
//                     }}
//                 >
//                     <Coordinate type='theta' radius={0.65} innerRadius={0.77} />
//                     <Tooltip showTitle={false} />
//                     <Axis visible={false} />
//                     <Legend
//                         position='right'
//                         visible={width>1200?true:false}
//                         offsetX={width>1200?-70:0}
//                         itemHeight={width>1200?18:0}
//                         itemWidth={width>1200?130:0}
//                         onChange={(e, chart) => {
//                             // console.log("e", e)
//                             if (e) {
//                                 onSendToTab(e.item.value ?? "")
//                             }
//                         }}
//                         itemName={{
//                             formatter: (text: string) => `${text}`,
//                             style: {
//                                 fill: "#85899E",
//                                 cursor: "pointer"
//                             }
//                         }}
//                         itemValue={{
//                             formatter: (_text: string, _item: any, index: number) => {
//                                 return `${chartList[index].value}`
//                             },
//                             // alignRight 需搭配 itemWidth 使用
//                             alignRight: true,
//                             style: {
//                                 fill: "#31343F",
//                                 fontWeight: 500,
//                                 cursor: "pointer"
//                             }
//                         }}
//                     />
//                     <Annotation.Text
//                         position={["50%", "46%"]}
//                         content={chartList.map((item) => item.value).reduce((a, b) => a + b, 0)}
//                         style={{
//                             lineHeight: 40,
//                             fontSize: 20,
//                             fontWeight: 600,
//                             fill: "#31343F",
//                             textAlign: "center"
//                         }}
//                     />
//                     <Annotation.Text
//                         position={["50%", "57%"]}
//                         content='插件总数'
//                         style={{
//                             lineHeight: 20,
//                             fontSize: 12,
//                             fill: "#85899E",
//                             textAlign: "center"
//                         }}
//                     />
//                     <Interaction type='element-active' />
//                     <Interval
//                         position='value'
//                         adjust='stack'
//                         color={[
//                             "type",
//                             (xType) => {
//                                 return chartCount[xType] ?? "#FFB660"
//                                 // if (xType === 'YAK 插件') {
//                                 //   return '#FFB660';
//                                 // }else if(xType === 'MITM 插件'){
//                                 //   return '#4A94F8';
//                                 // }else if(xType === '数据包扫描'){
//                                 //   return '#5F69DD';
//                                 // }else if(xType === '端口扫描插件'){
//                                 //   return '#56C991';
//                                 // }else if(xType === 'CODEC插件'){
//                                 //   return '#8863F7';
//                                 // }else if(xType === 'YAML POC'){
//                                 //   return '#35D8EE';
//                                 // }else{
//                                 //     return "#FFB660"
//                                 // }
//                             }
//                         ]}
//                         style={{
//                             lineWidth: 1,
//                             // stroke: "#F0F1F3",
//                             stroke: "#fff",
//                             cursor: "pointer"
//                         }}
//                         state={{
//                             // active: {
//                             //     style: (t) => {
//                             //         const res = getTheme().geometries.interval.rect.selected.style(t)
//                             //         return {...res}
//                             //     }
//                             // }
//                         }}
//                     />
//                 </Chart>
//             )}
//         </>
//     )
// }

interface PlugInShopProps {
    setOpenPage: (v: any) => void
    inViewport?: boolean
}

export interface DataParams {
    min?: string
    max?: string
    offset?: number
    count?: number
}
export interface PlugInShopHotProps {
    Data: DataParams
}
interface countAddObjProps {
    day_incre: string
    week_incre: string
    day_incre_num: number
    week_incre_num: number
}
interface PlugInShopNewIncreProps {}
const PlugInShop: React.FC<PlugInShopProps> = (props) => {
    const {setOpenPage, inViewport} = props
    const {storeParams, setYakitStoreParams} = YakitStoreParams()
    const [countAddObj, setCountAddObj] = useState<countAddObjProps>()
    const [hotArr, setHotArr] = useState<string[]>([])
    const [hotLoading, setHotLoading] = useState<boolean>(true)
    const listHeightRef = useRef<any>()

    useEffect(() => {
        if (inViewport) {
            getPlugInShopHot()
            !IsEnterprise && getPlugInShopNewIncre()
        }
    }, [inViewport])

    useEffect(() => {
        ipcRenderer.on("refresh-new-home", (e, res: any) => {
            getPlugInShopHot()
            !IsEnterprise && getPlugInShopNewIncre()
        })
        return () => {
            ipcRenderer.removeAllListeners("refresh-new-home")
        }
    }, [])
    const getPlugInShopHot = () => {
        NetWorkApi<PlugInShopHotProps, API.PluginTopSearchResponse>({
            method: "get",
            url: "plugin/topSearch"
        })
            .then((res: API.PluginTopSearchResponse) => {
                if (res) {
                    if (Array.isArray(res.data)) {
                        const newArr = res.data.map((item) => item.member).filter((item) => !!item)
                        setHotArr(newArr || [])
                    }
                }
            })
            .catch((err) => {
                failed("失败：" + err)
            })
            .finally(() => {
                setHotLoading(false)
            })
    }

    const judgeStatus = (v: number, v1: number) => {
        if (v > v1) return ">"
        else if (v < v1) return "<"
        else return "="
    }

    const getPlugInShopNewIncre = () => {
        NetWorkApi<PlugInShopNewIncreProps, API.PluginIncreResponse>({
            method: "get",
            url: "plugin/newIncre"
        })
            .then((res: API.PluginIncreResponse) => {
                if (res) {
                    const {day_incre_num, yesterday_incre_num, week_incre_num, lastWeek_incre_num} = res
                    const day_incre = judgeStatus(day_incre_num, yesterday_incre_num)
                    const week_incre = judgeStatus(week_incre_num, lastWeek_incre_num)
                    setCountAddObj({
                        day_incre,
                        week_incre,
                        day_incre_num,
                        week_incre_num
                    })
                }
            })
            .catch((err) => {
                failed("失败：" + err)
            })
            .finally(() => {})
    }

    const goStoreRoute = (params) => {
        // 插件商店页面是否渲染
        if (storeParams.isShowYakitStorePage) {
            // 动态更新插件仓库搜索条件
            ipcRenderer.send("yakit-store-params", params)
        } else {
            // 插件仓库初始进入参数
            setYakitStoreParams({...storeParams, ...params})
        }
        setOpenPage({
            verbose: "插件仓库",
            route: Route.ModManager,
            singleNode: ContentByRoute(Route.ModManager),
            multipleNode: []
        })
    }

    const selectIconShow = (v: string) => {
        if (v === ">") return <AddCountIcon style={{paddingLeft: 4}} />
        // else if (v === "=") return <KeepCountIcon style={{paddingLeft: 4}} />
        else if (v === "<") return <ReduceCountIcon style={{paddingLeft: 4}} />
        else return <></>
    }

    return (
        <div className={styles["plug-in-shop"]}>
            <div className={styles["show-top-box"]}>
                <div
                    className={classNames({
                        [styles["add-box-show"]]: !IsEnterprise,
                        [styles["add-box-hidden"]]: IsEnterprise
                    })}
                >
                    <div className={styles["add-count-box"]}>
                        {countAddObj && (
                            <>
                                <div
                                    className={classNames(styles["common-count"], {
                                        [styles["keep-border-left"]]: countAddObj?.day_incre === "=",
                                        [styles["add-border-left"]]: countAddObj?.day_incre === ">",
                                        [styles["reduce-border-left"]]: countAddObj?.day_incre === "<"
                                    })}
                                    style={{cursor: "pointer"}}
                                    onClick={() => goStoreRoute({time_search: "day"})}
                                >
                                    <div className={styles["add-title"]}>今日新增数</div>
                                    <div className={styles["add-content"]}>
                                        <span>
                                            <CountUp
                                                start={0}
                                                end={countAddObj.day_incre_num}
                                                duration={1}
                                                style={{padding: "0px"}}
                                            />
                                        </span>
                                        {selectIconShow(countAddObj.day_incre)}
                                    </div>
                                </div>
                                <div
                                    className={classNames(styles["common-count"], {
                                        [styles["keep-border-left"]]: countAddObj?.week_incre === "=",
                                        [styles["add-border-left"]]: countAddObj?.week_incre === ">",
                                        [styles["reduce-border-left"]]: countAddObj?.week_incre === "<"
                                    })}
                                    style={{cursor: "pointer"}}
                                    onClick={() => goStoreRoute({time_search: "week"})}
                                >
                                    <div className={styles["add-title"]}>本周新增数</div>
                                    <div className={styles["add-content"]}>
                                        <span>
                                            <CountUp
                                                start={0}
                                                end={countAddObj.week_incre_num}
                                                duration={1}
                                                style={{padding: "0px"}}
                                            />
                                        </span>
                                        {selectIconShow(countAddObj.week_incre)}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <div
                    className={classNames({
                        [styles["chart-box-show"]]: !IsEnterprise,
                        [styles["chart-box-hidden"]]: IsEnterprise
                    })}
                    ref={listHeightRef}
                >
                    {/* 放大窗口图表宽度确实会自适应，但是缩小就挂掉了（并不自适应），原因：如果Chart组件的父组件Father采用flex布局 就会出现上述的问题 建议采用百分比*/}
                    <PieEcharts goStoreRoute={goStoreRoute} inViewport={inViewport} />
                </div>
            </div>
            <div className={styles["show-bottom-box"]}>
                <div className={styles["bottom-box-title"]}>热搜词</div>
                {!hotLoading && (
                    <div className={styles["label-box"]}>
                        {hotArr.length > 0 ? (
                            hotArr.slice(0, 10).map((item) => {
                                return (
                                    <div
                                        key={item}
                                        className={styles["label-item"]}
                                        onClick={() => goStoreRoute({keywords: item})}
                                    >
                                        {item}
                                    </div>
                                )
                            })
                        ) : (
                            <div className={styles["hot-no-data"]}>暂无数据</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export const newHomeList: newHomeListData[] = [
    {
        id: "1",
        label: "资产搜集",
        subMenuData: [
            {
                id: "1-1",
                key: Route.Mod_ScanPort,
                label: "端口/指纹扫描",
                icon: <MenuPortScanningDeepIcon />,
                describe: "对 IP、IP段、域名等端口进行 SYN、指纹检测、可编写插件进行检测、满足更个性化等需求",
                isShow: true
            },
            {
                id: "1-2",
                label: "基础爬虫",
                icon: <MenuBaseReptileDeepIcon />,
                describe: "通过爬虫可快速了解网站的整体架构",
                isShow: false
            },
            {
                id: "1-3",
                label: "综合目录扫描与爆破",
                icon: <MenuComprehensiveCatalogScanningAndBlastingDeepIcon />,
                describe: "带有内置字典的综合目录扫描与爆破",
                isShow: false
            }
        ]
    },
    {
        id: "2",
        label: "漏洞检测",
        subMenuData: [
            {
                id: "2-1",
                key: Route.PoC,
                label: "专项漏洞检测",
                icon: <MenuSpecialVulnerabilityDetectionDeepIcon />,
                describe: "通过预制漏洞源码，对特定目标进行专项漏洞检测，可以自定义新增 POC 种类",
                isShow: true
            },
            {
                id: "2-2",
                key: Route.BatchExecutorPage,
                label: "插件批量执行",
                icon: <MenuPluginBatchExecutionDeepIcon />,
                describe: "自由选择需要的 POC 进行批量漏洞检测",
                isShow: true
            }
        ]
    },
    {
        id: "3",
        label: "进阶功能",
        subMenuData: [
            {
                id: "3-1",
                key: Route.ModManager,
                label: "插件仓库",
                icon: <MenuPluginWarehouseDeepIcon />,
                describe: "目前插件为 6 大类型，可根据需要灵活编写插件，支持从 GitHub 加载插件 POC 种类",
                isShow: true
            },
            {
                id: "3-2",
                key: Route.YakScript,
                label: "Yak Runner",
                icon: <MenuYakRunnerDeepIcon />,
                describe: "使用特有的 Yaklang 进行编程，直接调用引擎最底层能力 POC 种类",
                isShow: true
            }
        ]
    },
    {
        id: "4",
        label: "渗透测试工具",
        subMenuData: [
            {
                id: "4-1",
                key: Route.HTTPHacker,
                label: "MITM 交互式劫持",
                icon: <MenuMITMInteractiveHijackingDeepIcon />,
                describe: "安装 SSL/TLS 证书，劫持浏览器所有流量请求、响应数据包，提供手动劫持与被动扫描两种模式",
                isShow: true
            },
            {
                id: "4-2",
                key: Route.HTTPFuzzer,
                label: "Web Fuzzer",
                icon: <MenuWebFuzzerDeepIcon />,
                describe: "通过核心模糊测试标签语法，实现了对 Burpsuite 的 Repeater 和 Intruder 的完美整合",
                isShow: true
            },
            {
                id: "4-3",
                key: Route.Mod_Brute,
                label: "爆破与未授权检测",
                icon: <MenuBlastingAndUnauthorizedTestingDeepIcon />,
                describe: "对目标的登录账号、密码等进行爆破，在爆破前会进行未授权检测",
                isShow: true
            }
        ]
    },
    {
        id: "5",
        label: "小工具",
        subMenuData: [
            {
                id: "5-1",
                key: Route.Codec,
                label: "Codec",
                icon: <MenuCodecDeepIcon />,
                describe:
                    "可对数据进行各种处理（包括加密、解密、反序列化、Json 处理等等），还可通过插件自定义数据处理方法",
                isShow: true
            },
            {
                id: "5-2",
                key: Route.DataCompare,
                label: "数据对比",
                icon: <MenuDataComparisonDeepIcon />,
                describe: "将数据进行对比，快速识别不同处",
                isShow: true
            },
            {
                id: "5-3",
                key: Route.PayloadManager,
                label: "Payload 管理",
                icon: <AuditOutlinedDeepIcon />,
                describe: "通过上传文件、手动删改等，自定义 Payload，可在爆破和 Web Fuzzer 中进行使用",
                isShow: true
            }
        ]
    },
    {
        id: "6",
        label: "反连管理",
        subMenuData: [
            {
                id: "6-1",
                key: Route.ShellReceiver,
                label: "端口监听器",
                icon: <MenuPortListenerDeepIcon />,
                describe: "反弹 Shell 接收工具，可以在服务器上开启一个端口，进行监听，并进行交互",
                isShow: true
            },
            {
                id: "6-2",
                key: Route.ReverseServer_New,
                label: "反连服务器",
                icon: <MenuReverseConnectionServerDeepIcon />,
                describe: "使用协议端口复用技术，同时在一个端口同时实现 HTTP / RMI / HTTPS 等协议的反连",
                isShow: true
            },
            {
                id: "6-3",
                key: Route.DNSLog,
                label: "DNSLog",
                icon: <MenuDNSLogDeepIcon />,
                describe: "自动生成一个子域名，任何查询到这个子域名的 IP 被集合展示在列表中",
                isShow: true
            },
            {
                id: "6-4",
                key: Route.ICMPSizeLog,
                label: "ICMP-SizeLog",
                icon: <MenuICMPSizeLogDeepIcon />,
                describe: "使用 ping 携带特定长度数据包判定 ICMP 反连",
                isShow: true
            },
            {
                id: "6-5",
                key: Route.TCPPortLog,
                label: "TCP-PortLog",
                icon: <MenuTCPPortLogDeepIcon />,
                describe: "使用未开放的随机端口来判定 TCP 反连",
                isShow: true
            },
            {
                id: "6-6",
                key: Route.PayloadGenerater_New,
                label: "Yso-Java Hack",
                icon: <MenuYsoJavaHackDeepIcon />,
                describe: "配置序列化 Payload 或恶意类",
                isShow: true
            }
        ]
    }
]
export const getScriptIcon = (name: string) => {
    switch (name) {
        case "基础爬虫":
            return <MenuBaseReptileDeepIcon />
        case "综合目录扫描与爆破":
            return <MenuComprehensiveCatalogScanningAndBlastingDeepIcon />
        default:
            return <MenuBaseReptileDeepIcon />
    }
}

export const getDescribe = (name: string) => {
    if (name === "综合目录扫描与爆破") {
        return "带有内置字典的综合目录扫描与爆破"
    } else {
        return "通过爬虫可快速了解网站的整体架构"
    }
}

export interface NewHomeProps {}
const NewHome: React.FC<NewHomeProps> = (props) => {
    const ref = useRef(null)
    const [inViewport] = useInViewport(ref)
    const [newHomeData, setNewHomeData, getNewHomeData] = useGetState(newHomeList)
    // 加载是否完成
    const [load, setLoad] = useState<boolean>(false)
    useEffect(() => {
        getCustomizeMenus()
    }, [inViewport])

    const setOpenPage = (v) => {
        ipcRenderer.invoke("open-user-manage", v.route)
    }
    useEffect(() => {
        ipcRenderer.on("fetch-new-home-refsh", (e, params) => {
            getCustomizeMenus()
        })
        return () => {
            ipcRenderer.removeAllListeners("fetch-new-home-refsh")
        }
    }, [])
    // 获取自定义菜单
    const getCustomizeMenus = () => {
        ipcRenderer
            .invoke("QueryYakScript", {
                IncludedScriptNames: ["基础爬虫", "综合目录扫描与爆破"],
                IsGeneralModule: true,
                Type: "yak"
            } as QueryYakScriptRequest)
            .then((data: QueryYakScriptsResponse) => {
                const deepList: newHomeListData[] = cloneDeep(newHomeList)
                data.Data.map((i) => {
                    if (i.ScriptName === "基础爬虫") {
                        deepList[0].subMenuData[1].isShow = true
                        deepList[0].subMenuData[1].key = `plugin:${i.Id}` as Route
                    }
                    if (i.ScriptName === "综合目录扫描与爆破") {
                        deepList[0].subMenuData[2].isShow = true
                        deepList[0].subMenuData[2].key = `plugin:${i.Id}` as Route
                    }
                })
                setNewHomeData(deepList)
            })
            .finally(() => {
                setLoad(true)
            })
    }

    return (
        <div className={classNames(styles["new-home-page"])} ref={ref}>
            <div className={classNames(styles["home-top-block"], styles["border-bottom-box"])}>
                <div className={classNames(styles["top-small-block"], styles["border-right-box"])}>
                    <RouteList data={newHomeData[3]} setOpenPage={setOpenPage} />
                </div>
                <div className={classNames(styles["top-big-block"], styles["border-right-box"])}>
                    <div className={classNames(styles["top-in"], styles["border-bottom-box"])}>
                        <RouteList data={newHomeData[1]} colLimit={2} setOpenPage={setOpenPage} />
                    </div>
                    <div className={styles["bottom-in"]}>
                        <RouteList data={newHomeData[2]} colLimit={2} setOpenPage={setOpenPage} />
                    </div>
                </div>
                <div className={classNames(styles["top-small-block"], styles["border-right-box"])}>
                    <RouteList
                        data={newHomeData[0]}
                        setOpenPage={setOpenPage}
                        load={load}
                        getCustomizeMenus={getCustomizeMenus}
                    />
                </div>
                <div className={styles["top-small-block"]}>
                    <RouteList data={newHomeData[4]} setOpenPage={setOpenPage} />
                </div>
            </div>
            <div className={styles["home-bottom-block"]}>
                <div className={classNames(styles["bottom-big-block"], styles["border-right-box"])}>
                    <RouteList data={newHomeData[5]} colLimit={3} setOpenPage={setOpenPage} />
                </div>
                <div className={classNames(styles["bottom-small-block"], styles["plug-in-main"])}>
                    <RouteTitle title='插件商店' />
                    <PlugInShop setOpenPage={setOpenPage} inViewport={inViewport} />
                </div>
            </div>
        </div>
    )
}

export default NewHome
