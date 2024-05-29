import React, {ForwardedRef, useEffect, useRef, useState} from "react"
import {Row, Col} from "antd"
import {ArrowRightOutlined} from "@ant-design/icons"
import {genDefaultPagination, QueryYakScriptRequest, QueryYakScriptsResponse} from "@/pages/invoker/schema"
import {NetWorkApi} from "@/services/fetch"
import {useStore} from "@/store"
import {API} from "@/services/swagger/resposeType"
import {useGetState, useMemoizedFn, useSize, useInViewport} from "ahooks"
import cloneDeep from "lodash/cloneDeep"
import {failed, success} from "@/utils/notification"
import {PluginType} from "@/pages/yakitStore/YakitStorePage"
import {ReduceCountIcon, AddCountIcon} from "@/pages/customizeMenu/icon/homeIcon"
import CountUp from "react-countup"
import {isCommunityEdition, isEnterpriseEdition} from "@/utils/envfile"
import * as echarts from "echarts"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {ResidentPluginName, YakitRouteToPageInfo} from "@/routes/newRoute"
import {
    PrivateSolidBasicCrawlerIcon,
    PrivateSolidBatchPluginIcon,
    PrivateSolidBruteIcon,
    PrivateSolidCodecIcon,
    PrivateSolidDNSLogIcon,
    PrivateSolidDataCompareIcon,
    PrivateSolidDirectoryScanningIcon,
    PrivateSolidICMPSizeLogIcon,
    PrivateSolidMitmIcon,
    PrivateSolidPayloadGeneraterIcon,
    PrivateSolidPayloadManagerIcon,
    PrivateSolidPluginStoreIcon,
    PrivateSolidPocIcon,
    PrivateSolidReverseServerIcon,
    PrivateSolidScanPortIcon,
    PrivateSolidShellReceiverIcon,
    PrivateSolidTCPPortLogIcon,
    PrivateSolidWebFuzzerIcon,
    PrivateSolidYakRunnerIcon
} from "@/routes/privateIcon"
import {RouteToPageProps} from "../layout/publicMenu/PublicMenu"
import {DownloadOnlinePluginByScriptNamesResponse} from "../layout/publicMenu/utils"
import emiter from "@/utils/eventBus/eventBus"
import styles from "./newHome.module.scss"
import classNames from "classnames"
import {apiFetchGroupStatistics} from "../plugins/utils"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineRefreshIcon} from "@/assets/icon/outline"
import {YakitRoute} from "@/enums/yakitRoute"

const {ipcRenderer} = window.require("electron")

interface RouteTitleProps {
    title: string
    echartsError?: boolean
    increLoading?: boolean
    echartsLoading?: boolean
    onRefresh?: () => void
}

const RouteTitle: React.FC<RouteTitleProps> = (props) => {
    const {title, echartsError, increLoading, echartsLoading, onRefresh} = props
    return (
        <div className={styles["home-page-title"]}>
            {title}
            {(echartsLoading || increLoading) && (
                <div className={styles["spin-wrapper"]}>
                    加载中...
                    <div className={styles["spin-style"]}>
                        <YakitSpin size='small' spinning={true} />
                    </div>
                </div>
            )}
            {echartsError && (
                <div className={styles["spin-wrapper"]}>
                    加载失败
                    <div className={styles["spin-style"]}>
                        <YakitButton
                            type='text2'
                            icon={<OutlineRefreshIcon />}
                            onClick={() => {
                                onRefresh && onRefresh()
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

interface RouteItemProps {
    dataSource: DataItem
    setOpenPage: (param: RouteToPageProps) => void
    load: boolean
    getCustomizeMenus?: () => void
}

const RouteItem: React.FC<RouteItemProps> = (props) => {
    const {dataSource, setOpenPage, load, getCustomizeMenus} = props

    // 全局登录状态
    const {userInfo} = useStore()
    const goRoute = () => {
        const info: RouteToPageProps = {route: dataSource.key}
        if (dataSource.key === YakitRoute.Plugin_OP && dataSource.pluginId && dataSource.pluginName) {
            info.pluginId = +dataSource.pluginId || 0
            info.pluginName = dataSource.pluginName
        }

        setOpenPage(info)
    }

    const addMenuLab = (name: string) => {
        ipcRenderer
            .invoke("DownloadOnlinePluginByPluginName", {
                ScriptNames: [name],
                Token: userInfo.token
            })
            .then((rsp: DownloadOnlinePluginByScriptNamesResponse) => {
                if (rsp.Data.length > 0) {
                    success("添加菜单成功")
                    if (isCommunityEdition()) ipcRenderer.invoke("refresh-public-menu")
                    else ipcRenderer.invoke("change-main-menu")
                }
            })
            .catch((e) => {
                failed(`添加菜单失败:${e}`)
            })
            .finally(() => {
                getCustomizeMenus && getCustomizeMenus()
            })
    }
    const addMenu = (name: string) => {
        if (
            [ResidentPluginName.BasicCrawler, ResidentPluginName.DirectoryScanning].includes(name as ResidentPluginName)
        ) {
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
                            <div className={styles["menu-icon-filter"]} />
                        </div>
                        {dataSource.isShow ? (
                            <ArrowRightOutlined className={styles["right-arrow"]} />
                        ) : (
                            <div
                                className={styles["right-arrow-text"]}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    addMenu(dataSource.pluginName || dataSource.label)
                                }}
                            >
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
                        {dataSource?.describe || ""}
                    </div>
                </div>
            )}
        </>
    )
}
interface DataItem {
    id: string
    key: YakitRoute
    icon: JSX.Element
    describe?: string
    label: string
    pluginName?: string
    pluginId?: string
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
    setOpenPage: (param: RouteToPageProps) => void
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
    echartsError: boolean
    setEchartsError: (flag: boolean) => void
    echartsLoading: boolean
    setEchartsLoading: (v: boolean) => void
    ref: ForwardedRef<any>
}
interface echartListProps {
    name: string
    value: number
}

const PieEcharts: React.FC<PieChartProps> = React.forwardRef((props, ref) => {
    const {goStoreRoute, inViewport, echartsError, setEchartsError, echartsLoading, setEchartsLoading} = props
    const {width} = useSize(document.querySelector("body")) || {width: 0, height: 0}
    // 全局登录状态
    const {userInfo} = useStore()
    const [_, setChartList, getChartList] = useGetState<echartListProps[]>([])
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
            setEchartsError(false)
            getPluginSearch()
        }
    }, [inViewport])

    useEffect(() => {
        setEchartsError(false)
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
        setEchartsError(false)
        setEchartsLoading(true)
        const newQuery: API.PluginsSearchRequest = {}
        if (userInfo.token && userInfo.token.length > 0) {
            newQuery.token = userInfo.token
        }
        apiFetchGroupStatistics(newQuery)
            .then((res: API.PluginsSearchResponse) => {
                const list = (res?.data || []).filter((item) => ["plugin_type"].includes(item.groupKey))
                if (list.length > 0) {
                    const data = list[0].data
                    const chartListCache = data.map((item) => ({
                        name: PluginType[item.value] ?? "未识别",
                        value: item.count
                    }))
                    // @ts-ignore
                    optionRef.current.series[0].data = chartListCache
                    optionRef.current.title.text = chartListCache.map((item) => item.value).reduce((a, b) => a + b, 0)
                    optionRef.current.title.show = true
                    setChartList(chartListCache)
                    setEcharts(optionRef.current)
                }
            })
            .catch((err) => {
                // failed("失败getPluginSearch：" + err)
                setEchartsError(true)
            })
            .finally(() => {
                setEchartsLoading(false)
            })
    })

    React.useImperativeHandle(ref, () => ({
        getPluginSearch: () => getPluginSearch()
    }))

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
            className={classNames(
                styles["echarts-box"],
                !echartsLoading && !echartsError && styles["echarts-box-show"]
            )}
        />
    )
})

interface PlugInShopProps {
    setOpenPage: (param: RouteToPageProps) => void
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
    const [countAddObj, setCountAddObj] = useState<countAddObjProps>()
    const [hotArr, setHotArr] = useState<string[]>([])
    const [hotError, setHotError] = useState<boolean>(false)
    const [hotLoading, setHotLoading] = useState<boolean>(false)
    const [increLoading, setIncreLoading] = useState<boolean>(false)
    /** 判断插件图标接口是否请求成功 */
    const [echartsLoading, setEchartsLoading] = useState<boolean>(false)
    const [echartsError, setEchartsError] = useState<boolean>(false)
    const childRef = useRef<any>(null)
    const listHeightRef = useRef<any>()

    useEffect(() => {
        if (inViewport) {
            setHotError(false)
            getPlugInShopHot()
            onRefresh()
        }
    }, [inViewport])

    useEffect(() => {
        ipcRenderer.on("refresh-new-home", (e, res: any) => {
            setHotError(false)
            getPlugInShopHot()
            onRefresh()
        })
        return () => {
            ipcRenderer.removeAllListeners("refresh-new-home")
        }
    }, [])
    const getPlugInShopHot = () => {
        setHotLoading(true)
        setHotError(false)
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
                setHotError(true)
                setHotArr([])
                // failed("失败getPlugInShopHot：" + err)
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
        setIncreLoading(true)
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
                setCountAddObj(undefined)
                // failed("失败plugin/newIncre：" + err)
            })
            .finally(() => {
                setIncreLoading(false)
            })
    }
    /**
     * 首页点击今日新增、本周新增不做筛选，只是跳转,点击类型需要筛选
     * @description 带参数的页面跳转
     */
    const goStoreRoute = (params) => {
        emiter.emit("openPage", JSON.stringify({route: YakitRoute.Plugin_Store, params: {...params}}))
    }

    const selectIconShow = (v: string) => {
        if (v === ">") return <AddCountIcon style={{paddingLeft: 4}} />
        // else if (v === "=") return <KeepCountIcon style={{paddingLeft: 4}} />
        else if (v === "<") return <ReduceCountIcon style={{paddingLeft: 4}} />
        else return <></>
    }
    /**切换至插件商店页面，不带参数 */
    const openStoreRoute = useMemoizedFn(() => {
        setOpenPage({route: YakitRoute.Plugin_Store})
    })

    const onRefresh = useMemoizedFn(() => {
        isCommunityEdition() && getPlugInShopNewIncre()
        if (childRef && childRef.current) {
            childRef.current.getPluginSearch()
        }
    })
    return (
        <>
            <RouteTitle
                title='插件商店'
                echartsError={echartsError}
                increLoading={increLoading}
                echartsLoading={echartsLoading}
                onRefresh={onRefresh}
            />
            <div className={styles["plug-in-shop"]}>
                <div className={styles["show-top-box"]}>
                    <div
                        className={classNames({
                            [styles["add-box-show"]]: isCommunityEdition(),
                            [styles["add-box-hidden"]]: isEnterpriseEdition()
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
                                        onClick={() => openStoreRoute()}
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
                                        onClick={() => openStoreRoute()}
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
                            [styles["chart-box-show"]]: isCommunityEdition(),
                            [styles["chart-box-hidden"]]: isEnterpriseEdition()
                        })}
                        ref={listHeightRef}
                    >
                        {/* 放大窗口图表宽度确实会自适应，但是缩小就挂掉了（并不自适应），原因：如果Chart组件的父组件Father采用flex布局 就会出现上述的问题 建议采用百分比*/}
                        <PieEcharts
                            ref={childRef}
                            goStoreRoute={goStoreRoute}
                            inViewport={inViewport}
                            echartsError={echartsError}
                            setEchartsError={setEchartsError}
                            echartsLoading={echartsLoading}
                            setEchartsLoading={setEchartsLoading}
                        />
                    </div>
                </div>
                <div className={styles["show-bottom-box"]}>
                    <div className={styles["bottom-box-title"]}>
                        热搜词
                        {hotLoading && (
                            <div className={styles["spin-wrapper"]}>
                                加载中...
                                <div className={styles["spin-style"]}>
                                    <YakitSpin size='small' spinning={true} />
                                </div>
                            </div>
                        )}
                        {hotError && (
                            <div className={styles["spin-wrapper"]}>
                                加载失败
                                <div className={styles["spin-style"]}>
                                    <YakitButton
                                        type='text2'
                                        icon={<OutlineRefreshIcon />}
                                        onClick={() => {
                                            getPlugInShopHot()
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    {!hotLoading && (
                        <div className={styles["label-box"]}>
                            {hotArr.length > 0 ? (
                                hotArr.slice(0, 10).map((item) => {
                                    return (
                                        <div
                                            key={item}
                                            className={styles["label-item"]}
                                            onClick={() => goStoreRoute({keyword: item})}
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
        </>
    )
}

export const newHomeList: newHomeListData[] = [
    {
        id: "1",
        label: "资产搜集",
        subMenuData: [
            {
                id: "1-1",
                key: YakitRoute.Mod_ScanPort,
                ...YakitRouteToPageInfo[YakitRoute.Mod_ScanPort],
                icon: <PrivateSolidScanPortIcon />,
                isShow: true
            },
            {
                id: "1-2",
                key: YakitRoute.Plugin_OP,
                label: "基础爬虫",
                icon: <PrivateSolidBasicCrawlerIcon />,
                describe: "通过爬虫可快速了解网站的整体架构",
                pluginName: ResidentPluginName.BasicCrawler,
                isShow: false
            },
            {
                id: "1-3",
                key: YakitRoute.Plugin_OP,
                label: "目录扫描",
                icon: <PrivateSolidDirectoryScanningIcon />,
                describe: "带有内置字典的综合目录扫描与爆破",
                pluginName: ResidentPluginName.DirectoryScanning,
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
                key: YakitRoute.PoC,
                ...YakitRouteToPageInfo[YakitRoute.PoC],
                icon: <PrivateSolidPocIcon />,
                isShow: true
            },
            {
                id: "2-2",
                key: YakitRoute.BatchExecutorPage,
                ...YakitRouteToPageInfo[YakitRoute.BatchExecutorPage],
                icon: <PrivateSolidBatchPluginIcon />,
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
                key: YakitRoute.Plugin_Store,
                ...YakitRouteToPageInfo[YakitRoute.Plugin_Store],
                icon: <PrivateSolidPluginStoreIcon />,
                isShow: true
            },
            {
                id: "3-2",
                key: YakitRoute.YakScript,
                ...YakitRouteToPageInfo[YakitRoute.YakScript],
                icon: <PrivateSolidYakRunnerIcon />,
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
                key: YakitRoute.HTTPHacker,
                ...YakitRouteToPageInfo[YakitRoute.HTTPHacker],
                icon: <PrivateSolidMitmIcon />,
                isShow: true
            },
            {
                id: "4-2",
                key: YakitRoute.HTTPFuzzer,
                ...YakitRouteToPageInfo[YakitRoute.HTTPFuzzer],
                icon: <PrivateSolidWebFuzzerIcon />,
                isShow: true
            },
            {
                id: "4-3",
                key: YakitRoute.Mod_Brute,
                ...YakitRouteToPageInfo[YakitRoute.Mod_Brute],
                icon: <PrivateSolidBruteIcon />,
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
                key: YakitRoute.Codec,
                ...YakitRouteToPageInfo[YakitRoute.Codec],
                icon: <PrivateSolidCodecIcon />,
                isShow: true
            },
            {
                id: "5-2",
                key: YakitRoute.DataCompare,
                ...YakitRouteToPageInfo[YakitRoute.DataCompare],
                icon: <PrivateSolidDataCompareIcon />,
                isShow: true
            },
            {
                id: "5-3",
                key: YakitRoute.PayloadManager,
                ...YakitRouteToPageInfo[YakitRoute.PayloadManager],
                icon: <PrivateSolidPayloadManagerIcon />,
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
                key: YakitRoute.ShellReceiver,
                ...YakitRouteToPageInfo[YakitRoute.ShellReceiver],
                icon: <PrivateSolidShellReceiverIcon />,
                isShow: true
            },
            {
                id: "6-2",
                key: YakitRoute.ReverseServer_New,
                ...YakitRouteToPageInfo[YakitRoute.ReverseServer_New],
                icon: <PrivateSolidReverseServerIcon />,
                isShow: true
            },
            {
                id: "6-3",
                key: YakitRoute.DNSLog,
                ...YakitRouteToPageInfo[YakitRoute.DNSLog],
                icon: <PrivateSolidDNSLogIcon />,
                isShow: true
            },
            {
                id: "6-4",
                key: YakitRoute.ICMPSizeLog,
                ...YakitRouteToPageInfo[YakitRoute.ICMPSizeLog],
                icon: <PrivateSolidICMPSizeLogIcon />,
                isShow: true
            },
            {
                id: "6-5",
                key: YakitRoute.TCPPortLog,
                ...YakitRouteToPageInfo[YakitRoute.TCPPortLog],
                icon: <PrivateSolidTCPPortLogIcon />,
                isShow: true
            },
            {
                id: "6-6",
                key: YakitRoute.PayloadGenerater_New,
                ...YakitRouteToPageInfo[YakitRoute.PayloadGenerater_New],
                icon: <PrivateSolidPayloadGeneraterIcon />,
                isShow: true
            }
        ]
    }
]

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

    const setOpenPage = (param: RouteToPageProps) => {
        ipcRenderer.invoke("open-route-page", param)
    }

    // 获取自定义菜单
    const getCustomizeMenus = () => {
        ipcRenderer
            .invoke("QueryYakScript", {
                Pagination: genDefaultPagination(1000),
                IsGeneralModule: true,
                Type: "yak"
            } as QueryYakScriptRequest)
            .then((data: QueryYakScriptsResponse) => {
                const deepList: newHomeListData[] = cloneDeep(newHomeList)
                data.Data.map((i) => {
                    if (i.ScriptName === ResidentPluginName.BasicCrawler) {
                        deepList[0].subMenuData[1].pluginId = `${i.Id}`
                        deepList[0].subMenuData[1].isShow = true
                        deepList[0].subMenuData[1].key = YakitRoute.Plugin_OP
                    }
                    if (i.ScriptName === ResidentPluginName.DirectoryScanning) {
                        deepList[0].subMenuData[2].pluginId = `${i.Id}`
                        deepList[0].subMenuData[2].isShow = true
                        deepList[0].subMenuData[2].key = YakitRoute.Plugin_OP
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
                    <PlugInShop setOpenPage={setOpenPage} inViewport={inViewport} />
                </div>
            </div>
        </div>
    )
}

export default NewHome
