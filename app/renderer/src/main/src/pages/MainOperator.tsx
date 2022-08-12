import React, {ReactNode, useEffect, useRef, useState} from "react"
import {
    Button,
    Checkbox,
    Col,
    Divider,
    Dropdown,
    Image,
    Input,
    Layout,
    Menu,
    Modal,
    Popover,
    Row,
    Space,
    Spin,
    Tabs,
    Tag,
    Typography
} from "antd"
import {ContentByRoute, MenuDataProps, NoScrollRoutes, Route, RouteMenuData} from "../routes/routeSpec"
import {
    CloseOutlined,
    EditOutlined,
    EllipsisOutlined,
    ExclamationCircleOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    PoweroffOutlined,
    ReloadOutlined,
    SettingOutlined
} from "@ant-design/icons"
import {failed, info, success} from "../utils/notification"
import {showModal} from "../utils/showModal"
import {YakLogoBanner} from "../utils/logo"
import {ConfigGlobalReverse, ReversePlatformStatus, YakitVersion, YakVersion} from "../utils/basic"
import {CompletionTotal, getGlobalCompletions, setCompletions} from "../utils/monacoSpec/yakCompletionSchema"
import {randomString} from "../utils/randomUtil"
import MDEditor from "@uiw/react-md-editor"
import {genDefaultPagination, QueryYakScriptRequest, QueryYakScriptsResponse} from "./invoker/schema"
import {PerformanceDisplay} from "../components/PerformanceDisplay"
import {useHotkeys} from "react-hotkeys-hook"
import {useGetState, useMemoizedFn} from "ahooks"
import ReactDOM from "react-dom"
import debounce from "lodash/debounce"
import {AutoSpin} from "../components/AutoSpin"
import cloneDeep from "lodash/cloneDeep"
import {RiskStatsTag} from "../utils/RiskStatsTag"
import {ItemSelects} from "../components/baseTemplate/FormItemUtil"
import {BugInfoProps, BugList, CustomBugList} from "./invoker/batch/YakBatchExecutors"
import {coordinate, UserPlatformType} from "./globalVariable"
import {DropdownMenu} from "@/components/baseTemplate/DropdownMenu"
import {MainTabs} from "./MainTabs"
import Login from "./Login"
import {TrustList} from "./TrustList"
import yakitImg from "../assets/yakit.jpg"
import {UserInfoProps, useStore} from "@/store"
import {SimpleQueryYakScriptSchema} from "./invoker/batch/QueryYakScriptParam"
import "./main.css"
import {UnfinishedBatchTask} from "./invoker/batch/UnfinishedBatchTaskList"
import {LoadYakitPluginForm} from "./yakitStore/YakitStorePage"
import {showConfigMenuItems} from "../utils/ConfigMenuItems"
import {ConfigPrivateDomain} from "@/components/ConfigPrivateDomain"
import "./main.css"
import "./GlobalClass.scss"
import "./GlobalClass.scss"
import {loginOut, refreshToken} from "@/utils/login"
import {setRemoteValue} from "@/utils/kv"
import {showConfigSystemProxyForm} from "@/utils/ConfigSystemProxy"

const {ipcRenderer} = window.require("electron")
const MenuItem = Menu.Item
const {Header, Content, Sider} = Layout
const {Text} = Typography

const FuzzerCache = "fuzzer-list-cache"
const WindowsCloseFlag = "windows-close-flag"

const singletonRoute: Route[] = [
    Route.HTTPHacker,
    Route.ShellReceiver,
    Route.ReverseServer,
    Route.PayloadManager,
    Route.ModManager,
    Route.ModManagerLegacy,
    Route.YakScript,

    // database
    Route.DB_Ports,
    Route.DB_HTTPHistory,
    Route.DB_ExecResults,
    Route.DB_Domain,
    Route.DB_Risk,
    Route.DB_Report,

    Route.PoC,
    Route.DNSLog,
    Route.BatchExecutorPage,
    Route.ICMPSizeLog,
    Route.TCPPortLog
]
const defaultUserInfo: UserInfoProps = {
    isLogin: false,
    platform: null,
    githubName: null,
    githubHeadImg: null,
    wechatName: null,
    wechatHeadImg: null,
    qqName: null,
    qqHeadImg: null,
    role: null,
    user_id: null,
    token: ""
}

export interface MainProp {
    tlsGRPC?: boolean
    addr?: string
    onErrorConfirmed?: () => any
}

export interface MenuItem {
    Group: string
    YakScriptId: number
    Verbose: string
    Query?: SimpleQueryYakScriptSchema
    MenuItemId: number
}

interface MenuItemGroup {
    Group: string
    Items: MenuItem[]
}

interface PluginMenuItem {
    Group: string
    YakScriptId: number
    Verbose: string
}

export interface multipleNodeInfo {
    id: string
    verbose: string
    node: ReactNode
    time?: string
}

interface PageCache {
    verbose: string
    route: Route
    singleNode: ReactNode | any
    multipleNode: multipleNodeInfo[] | any[]
    multipleCurrentKey?: string
    hideAdd?: boolean
}

export interface fuzzerInfoProp {
    time: string

    isHttps?: boolean
    forceFuzz?: boolean
    concurrent?: number
    proxy?: string
    actualHost?: string
    timeout?: number
    request?: string
}

export interface MenuItemType {
    key: string
    label?: ReactNode
    title: string
    icon?: ReactNode
    danger?: boolean
    disabled?: boolean
}

const Main: React.FC<MainProp> = (props) => {
    const [engineStatus, setEngineStatus] = useState<"ok" | "error">("ok")
    const [status, setStatus] = useState<{addr: string; isTLS: boolean}>()
    const [collapsed, setCollapsed] = useState(false)
    const [hideMenu, setHideMenu] = useState(false)

    const [loading, setLoading] = useState(false)
    const [menuItems, setMenuItems] = useState<MenuItemGroup[]>([])
    const [routeMenuData, setRouteMenuData] = useState<MenuDataProps[]>(RouteMenuData)

    const [notification, setNotification] = useState("")

    const [pageCache, setPageCache] = useState<PageCache[]>([
        {
            verbose: "MITM",
            route: Route.HTTPHacker,
            singleNode: ContentByRoute(Route.HTTPHacker),
            multipleNode: []
        }
    ])
    const [currentTabKey, setCurrentTabKey] = useState<Route | string>(Route.HTTPHacker)

    // 信任用户弹框
    const [trustShow, setTrustShow] = useState<boolean>(false)

    // 登录框状态
    const [loginshow, setLoginShow, getLoginShow] = useGetState<boolean>(false)

    // 系统类型
    const [system, setSystem] = useState<string>("")
    useEffect(() => {
        ipcRenderer.invoke("fetch-system-name").then((res) => setSystem(res))
    }, [])
    useEffect(() => {
        ipcRenderer.on("refresh-token", (e, res: any) => {
            refreshToken(userInfo)
        })
        return () => {
            ipcRenderer.removeAllListeners("refresh-token")
        }
    }, [])
    // yakit页面关闭是否二次确认提示
    const [winCloseFlag, setWinCloseFlag] = useState<boolean>(true)
    const [winCloseShow, setWinCloseShow] = useState<boolean>(false)
    useEffect(() => {
        ipcRenderer
            .invoke("get-value", WindowsCloseFlag)
            .then((flag: any) => setWinCloseFlag(flag === undefined ? true : flag))
    }, [])

    // 获取自定义菜单
    const updateMenuItems = () => {
        setLoading(true)
        // Fetch User Defined Plugins
        ipcRenderer
            .invoke("GetAllMenuItem", {})
            .then((data: {Groups: MenuItemGroup[]}) => {
                setMenuItems(data.Groups)
            })
            .catch((e: any) => failed("Update Menu Item Failed"))
            .finally(() => setTimeout(() => setLoading(false), 300))
        // Fetch Official General Plugins
        ipcRenderer
            .invoke("QueryYakScript", {
                Pagination: genDefaultPagination(1000),
                IsGeneralModule: true,
                Type: "yak"
            } as QueryYakScriptRequest)
            .then((data: QueryYakScriptsResponse) => {
                const tabList: MenuDataProps[] = cloneDeep(RouteMenuData)
                for (let item of tabList) {
                    if (item.subMenuData) {
                        if (item.key === Route.GeneralModule) {
                            const extraMenus: MenuDataProps[] = data.Data.map((i) => {
                                return {
                                    icon: <EllipsisOutlined />,
                                    key: `plugin:${i.Id}`,
                                    label: i.ScriptName
                                } as unknown as MenuDataProps
                            })
                            item.subMenuData.push(...extraMenus)
                        }
                        item.subMenuData.sort((a, b) => a.label.localeCompare(b.label))
                    }
                }
                setRouteMenuData(tabList)
            })
    }
    useEffect(() => {
        updateMenuItems()
        ipcRenderer.on("fetch-new-main-menu", (e) => {
            updateMenuItems()
        })

        return () => {
            ipcRenderer.removeAllListeners("fetch-new-main-menu")
        }
    }, [])

    useEffect(() => {
        if (engineStatus === "error") props.onErrorConfirmed && props.onErrorConfirmed()
    }, [engineStatus])

    // 整合路由对应名称
    const pluginKey = (item: PluginMenuItem) => `plugin:${item.Group}:${item.YakScriptId}`
    const routeKeyToLabel = new Map<string, string>()
    routeMenuData.forEach((k) => {
        ;(k.subMenuData || []).forEach((subKey) => {
            routeKeyToLabel.set(`${subKey.key}`, subKey.label)
        })

        routeKeyToLabel.set(`${k.key}`, k.label)
    })
    menuItems.forEach((k) => {
        k.Items.forEach((value) => {
            routeKeyToLabel.set(pluginKey(value), value.Verbose)
        })
    })

    // Tabs Bar Operation Function
    const getCacheIndex = (route: string) => {
        const targets = pageCache.filter((i) => i.route === route)
        return targets.length > 0 ? pageCache.indexOf(targets[0]) : -1
    }
    const addTabPage = useMemoizedFn(
        (
            route: Route,
            nodeParams?: {
                time?: string
                node: ReactNode
                isRecord?: boolean
                hideAdd?: boolean
            }
        ) => {
            const filterPage = pageCache.filter((i) => i.route === route)
            const filterPageLength = filterPage.length

            if (singletonRoute.includes(route)) {
                if (filterPageLength > 0) {
                    setCurrentTabKey(route)
                } else {
                    const tabName = routeKeyToLabel.get(`${route}`) || `${route}`
                    setPageCache([
                        ...pageCache,
                        {
                            verbose: tabName,
                            route: route,
                            singleNode: ContentByRoute(route),
                            multipleNode: []
                        }
                    ])
                    setCurrentTabKey(route)
                }
            } else {
                if (filterPageLength > 0) {
                    const tabName = routeKeyToLabel.get(`${route}`) || `${route}`
                    const tabId = `${route}-[${randomString(49)}]`
                    const time = new Date().getTime().toString()
                    const node: multipleNodeInfo = {
                        id: tabId,
                        verbose: `${tabName}-[${filterPage[0].multipleNode.length + 1}]`,
                        node: nodeParams && nodeParams.node ? nodeParams?.node || <></> : ContentByRoute(route),
                        time: nodeParams && nodeParams.node ? nodeParams?.time || time : time
                    }
                    const pages = pageCache.map((item) => {
                        if (item.route === route) {
                            item.multipleNode.push(node)
                            item.multipleCurrentKey = tabId
                            return item
                        }
                        return item
                    })
                    setPageCache([...pages])
                    setCurrentTabKey(route)
                    if (nodeParams && !!nodeParams.isRecord) addFuzzerList(nodeParams?.time || time)
                } else {
                    const tabName = routeKeyToLabel.get(`${route}`) || `${route}`
                    const tabId = `${route}-[${randomString(49)}]`
                    const time = new Date().getTime().toString()
                    const node: multipleNodeInfo = {
                        id: tabId,
                        verbose: `${tabName}-[1]`,
                        node: nodeParams && nodeParams.node ? nodeParams?.node || <></> : ContentByRoute(route),
                        time: nodeParams && nodeParams.node ? nodeParams?.time || time : time
                    }
                    setPageCache([
                        ...pageCache,
                        {
                            verbose: tabName,
                            route: route,
                            singleNode: undefined,
                            multipleNode: [node],
                            multipleCurrentKey: tabId,
                            hideAdd: nodeParams?.hideAdd
                        }
                    ])
                    setCurrentTabKey(route)
                    if (nodeParams && !!nodeParams.isRecord) addFuzzerList(nodeParams?.time || time)
                }
            }
        }
    )
    const menuAddPage = useMemoizedFn((route: Route) => {
        if (route === "ignore") return

        if (route === Route.HTTPFuzzer) {
            const time = new Date().getTime().toString()
            addTabPage(Route.HTTPFuzzer, {
                time: time,
                node: ContentByRoute(Route.HTTPFuzzer, undefined, {
                    system: system,
                    order: time
                }),
                isRecord: true
            })
        } else addTabPage(route as Route)
    })
    const removePage = (route: string) => {
        const targetIndex = getCacheIndex(route)

        if (targetIndex > 0 && pageCache[targetIndex - 1]) {
            const targetCache = pageCache[targetIndex - 1]
            setCurrentTabKey(targetCache.route)
        }
        if (targetIndex === 0 && pageCache[targetIndex + 1]) {
            const targetCache = pageCache[targetIndex + 1]
            setCurrentTabKey(targetCache.route)
        }
        if (targetIndex === 0 && pageCache.length === 1) setCurrentTabKey("" as any)

        setPageCache(pageCache.filter((i) => i.route !== route))

        if (route === Route.HTTPFuzzer) delFuzzerList(1)
    }
    const updateCacheVerbose = (id: string, verbose: string) => {
        const index = getCacheIndex(id)
        if (index < 0) return
        pageCache[index].verbose = verbose
        setPageCache([...pageCache])
    }
    const setMultipleCurrentKey = useMemoizedFn((key: string, type: Route) => {
        const arr = pageCache.map((item) => {
            if (item.route === type) {
                item.multipleCurrentKey = key
                return item
            }
            return item
        })
        setPageCache([...arr])
    })
    const removeMultipleNodePage = useMemoizedFn((key: string, type: Route) => {
        const removeArr: multipleNodeInfo[] = pageCache.filter((item) => item.route === type)[0]?.multipleNode || []
        if (removeArr.length === 0) return
        const nodes = removeArr.filter((item) => item.id === key)
        const time = nodes[0].time

        let index = 0
        for (let i in removeArr) {
            if (removeArr[i].id === key) {
                index = +i
                break
            }
        }

        if (index === 0 && removeArr.length === 1) {
            removePage(`${type}`)
            return
        }

        let current = ""
        let filterArr: multipleNodeInfo[] = []
        if (index > 0 && removeArr[index - 1]) {
            current = removeArr[index - 1].id
            filterArr = removeArr.filter((item) => item.id !== key)
        }
        if (index === 0 && removeArr[index + 1]) {
            current = removeArr[index + 1].id
            filterArr = removeArr.filter((item) => item.id !== key)
        }

        if (current) {
            const arr = pageCache.map((item) => {
                if (item.route === type) {
                    item.multipleNode = [...filterArr]
                    item.multipleCurrentKey = current
                    return item
                }
                return item
            })
            setPageCache([...arr])
            if (type === Route.HTTPFuzzer) delFuzzerList(2, time)
        }
    })
    const removeOtherMultipleNodePage = useMemoizedFn((key: string, type: Route) => {
        const removeArr: multipleNodeInfo[] = pageCache.filter((item) => item.route === type)[0]?.multipleNode || []
        if (removeArr.length === 0) return
        const nodes = removeArr.filter((item) => item.id === key)
        const time = nodes[0].time

        const arr = pageCache.map((item) => {
            if (item.route === type) {
                item.multipleNode = [...nodes]
                item.multipleCurrentKey = key
                return item
            }
            return item
        })
        setPageCache([...arr])
        if (type === Route.HTTPFuzzer) delFuzzerList(3, time)
    })
    const updateCacheVerboseMultipleNodePage = useMemoizedFn((key: string, tabType: string, verbose: string) => {
        const index = getCacheIndex(tabType)
        if (index < 0) return
        const indexNode = pageCache[index].multipleNode.findIndex((ele) => ele.id === key)
        if (indexNode < 0) return
        pageCache[index].multipleNode[indexNode].verbose = verbose
        setPageCache([...pageCache])
    })
    // 全局记录鼠标坐标位置(为右键菜单提供定位)
    const coordinateTimer = useRef<any>(null)
    useEffect(() => {
        document.onmousemove = (e) => {
            const {screenX, screenY, clientX, clientY, pageX, pageY} = e
            if (coordinateTimer.current) {
                clearTimeout(coordinateTimer.current)
                coordinateTimer.current = null
            }
            coordinateTimer.current = setTimeout(() => {
                coordinate.screenX = screenX
                coordinate.screenY = screenY
                coordinate.clientX = clientX
                coordinate.clientY = clientY
                coordinate.pageX = pageX
                coordinate.pageY = pageY
            }, 50)
        }
    }, [])
    // 全局监听登录状态
    const {userInfo, setStoreUserInfo} = useStore()
    useEffect(() => {
        ipcRenderer.on("fetch-signin-token", (e, res: UserInfoProps) => {
            // 刷新用户信息
            setStoreUserInfo(res)
            // 刷新引擎
            setRemoteValue("token-online", res.token)
        })
        return () => ipcRenderer.removeAllListeners("fetch-signin-token")
    }, [])

    useEffect(() => {
        ipcRenderer.on("login-out", (e) => {
            setStoreUserInfo(defaultUserInfo)
            setRemoteValue("token-online", "")
        })
        return () => ipcRenderer.removeAllListeners("login-out")
    }, [])

    const [userMenu, setUserMenu] = useState<MenuItemType[]>([
        {key: "sign-out", title: "退出登录"},
        {key: "account-bind", title: "帐号绑定(监修)", disabled: true}
    ])

    useEffect(() => {
        if (userInfo.role === "admin") {
            setUserMenu([
                {key: "sign-out", title: "退出登录"},
                {key: "account-bind", title: "帐号绑定(监修)", disabled: true},
                {key: "trust-list", title: "用户管理"}
            ])
        } else {
            setUserMenu([
                {key: "sign-out", title: "退出登录"},
                {key: "account-bind", title: "帐号绑定(监修)", disabled: true}
            ])
        }
    }, [userInfo.role])

    // 全局注册快捷键功能
    const documentKeyDown = useMemoizedFn((e: any) => {
        // ctrl + w 关闭tab页面
        if (e.code === "KeyW" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            if (pageCache.length === 0) return

            setLoading(true)
            removePage(`${currentTabKey}`)
            setTimeout(() => setLoading(false), 300)
            return
        }
    })
    useEffect(() => {
        document.onkeydown = documentKeyDown
    }, [])

    // fuzzer本地缓存
    const fuzzerList = useRef<Map<string, fuzzerInfoProp>>(new Map<string, fuzzerInfoProp>())
    const saveFuzzerList = debounce(() => {
        const historys: fuzzerInfoProp[] = []
        fuzzerList.current.forEach((value) => historys.push(value))
        historys.sort((a, b) => +a.time - +b.time)
        const filters = historys.filter(
            (item) => (item.request || "").length < 1000000 && (item.request || "").length > 0
        )
        ipcRenderer.invoke("set-value", FuzzerCache, JSON.stringify(filters.slice(-5)))
    }, 500)
    const fetchFuzzerList = useMemoizedFn(() => {
        setLoading(true)
        fuzzerList.current.clear()
        ipcRenderer
            .invoke("get-value", FuzzerCache)
            .then((res: any) => {
                const cache = JSON.parse(res || "[]")

                for (let item of cache) {
                    const time = new Date().getTime().toString()
                    fuzzerList.current.set(time, {...item, time: time})
                    addTabPage(Route.HTTPFuzzer, {
                        time: time,
                        node: ContentByRoute(Route.HTTPFuzzer, undefined, {
                            isHttps: item.isHttps || false,
                            request: item.request || "",
                            fuzzerParams: item,
                            system: system,
                            order: time
                        })
                    })
                }
            })
            .catch((e) => console.info(e))
            .finally(() => setTimeout(() => setLoading(false), 300))
    })
    const addFuzzerList = (key: string, request?: string, isHttps?: boolean) => {
        fuzzerList.current.set(key, {request, isHttps, time: key})
    }
    const delFuzzerList = (type: number, key?: string) => {
        if (type === 1) fuzzerList.current.clear()
        if (type === 2 && key) if (fuzzerList.current.has(key)) fuzzerList.current.delete(key)
        if (type === 3 && key) {
            const info = fuzzerList.current.get(key)
            if (info) {
                fuzzerList.current.clear()
                fuzzerList.current.set(key, info)
            }
        }
        saveFuzzerList()
    }
    const updateFuzzerList = (key: string, param: fuzzerInfoProp) => {
        fuzzerList.current.set(key, param)
        saveFuzzerList()
    }
    useEffect(() => {
        ipcRenderer.on("fetch-fuzzer-setting-data", (e, res: any) => updateFuzzerList(res.key, JSON.parse(res.param)))
        // 开发环境不展示fuzzer缓存
        ipcRenderer.invoke("is-dev").then((flag) => {
            if (!flag) fetchFuzzerList()
            // fetchFuzzerList()
        })
        return () => {
            ipcRenderer.removeAllListeners("fetch-fuzzer-setting-data")
        }
    }, [])

    // 加载补全
    useEffect(() => {
        ipcRenderer.invoke("GetYakitCompletionRaw").then((data: {RawJson: Uint8Array}) => {
            const completionJson = Buffer.from(data.RawJson).toString("utf8")
            setCompletions(JSON.parse(completionJson) as CompletionTotal)
            // success("加载 Yak 语言自动补全成功 / Load Yak IDE Auto Completion Finished")
        })
    }, [])

    useEffect(() => {
        ipcRenderer.invoke("yakit-connect-status").then((data) => {
            setStatus(data)
        })

        ipcRenderer.on("client-engine-status-ok", (e, reason) => {
            if (engineStatus !== "ok") setEngineStatus("ok")
        })
        ipcRenderer.on("client-engine-status-error", (e, reason) => {
            if (engineStatus === "ok") setEngineStatus("error")
        })

        const updateEngineStatus = () => {
            ipcRenderer
                .invoke("engine-status")
                .catch((e: any) => {
                    setEngineStatus("error")
                })
                .finally(() => {})
        }
        let id = setInterval(updateEngineStatus, 3000)
        return () => {
            ipcRenderer.removeAllListeners("client-engine-status-error")
            ipcRenderer.removeAllListeners("client-engine-status-ok")
            clearInterval(id)
        }
    }, [])

    useHotkeys("Ctrl+Alt+T", () => {})

    useEffect(() => {
        ipcRenderer.invoke("query-latest-notification").then((e: string) => {
            setNotification(e)

            if (e) {
                success(
                    <>
                        <Space direction={"vertical"}>
                            <span>来自于 yaklang.io 的通知</span>
                            <Button
                                type={"link"}
                                onClick={() => {
                                    showModal({
                                        title: "Notification",
                                        content: (
                                            <>
                                                <MDEditor.Markdown source={e} />
                                            </>
                                        )
                                    })
                                }}
                            >
                                点击查看
                            </Button>
                        </Space>
                    </>
                )
            }
        })
    }, [])

    // 新增数据对比页面
    useEffect(() => {
        ipcRenderer.on("main-container-add-compare", (e, params) => {
            const newTabId = `${Route.DataCompare}-[${randomString(49)}]`
            const verboseNameRaw = routeKeyToLabel.get(Route.DataCompare) || `${Route.DataCompare}`
            addTabPage(Route.DataCompare, {node: ContentByRoute(Route.DataCompare, undefined, {system: system})})

            // 区分新建对比页面还是别的页面请求对比的情况
            ipcRenderer.invoke("created-data-compare")
        })

        return () => {
            ipcRenderer.removeAllListeners("main-container-add-compare")
        }
    }, [pageCache])

    // Global Sending Function(全局发送功能|通过发送新增功能页面)
    const addFuzzer = useMemoizedFn((res: any) => {
        const {isHttps, request} = res || {}
        if (request) {
            const time = new Date().getTime().toString()
            addTabPage(Route.HTTPFuzzer, {
                time: time,
                node: ContentByRoute(Route.HTTPFuzzer, undefined, {
                    isHttps: isHttps || false,
                    request: request || "",
                    system: system,
                    order: time
                })
            })
            addFuzzerList(time, request || "", isHttps || false)
        }
    })
    const addScanPort = useMemoizedFn((res: any) => {
        const {URL = ""} = res || {}
        if (URL) {
            addTabPage(Route.Mod_ScanPort, {
                node: ContentByRoute(Route.Mod_ScanPort, undefined, {scanportParams: URL})
            })
        }
    })
    const addBrute = useMemoizedFn((res: any) => {
        const {URL = ""} = res || {}
        if (URL) {
            addTabPage(Route.Mod_Brute, {
                node: ContentByRoute(Route.Mod_Brute, undefined, {bruteParams: URL})
            })
        }
    })
    // 发送到专项漏洞检测modal-show变量
    const [bugTestShow, setBugTestShow] = useState<boolean>(false)
    const [bugList, setBugList] = useState<BugInfoProps[]>([])
    const [bugTestValue, setBugTestValue] = useState<BugInfoProps[]>([])
    const [bugUrl, setBugUrl] = useState<string>("")
    const addBugTest = useMemoizedFn((type: number, res?: any) => {
        const {URL = ""} = res || {}

        if (type === 1 && URL) {
            setBugUrl(URL)
            ipcRenderer
                .invoke("get-value", CustomBugList)
                .then((res: any) => {
                    setBugList(res ? JSON.parse(res) : [])
                    setBugTestShow(true)
                })
                .catch(() => {})
        }
        if (type === 2) {
            const filter = pageCache.filter((item) => item.route === Route.PoC)
            if (filter.length === 0) {
                addTabPage(Route.PoC)
                setTimeout(() => {
                    ipcRenderer.invoke("send-to-bug-test", {type: bugTestValue, data: bugUrl})
                    setBugTestValue([])
                    setBugUrl("")
                }, 300)
            } else {
                ipcRenderer.invoke("send-to-bug-test", {type: bugTestValue, data: bugUrl})
                setCurrentTabKey(Route.PoC)
                setBugTestValue([])
                setBugUrl("")
            }
        }
    })
    const addYakRunning = useMemoizedFn((res: any) => {
        const {name = "", code = ""} = res || {}
        const filter = pageCache.filter((item) => item.route === Route.YakScript)

        if (!name || !code) return false

        if ((filter || []).length === 0) {
            addTabPage(Route.YakScript)
            setTimeout(() => {
                ipcRenderer.invoke("send-to-yak-running", {name, code})
            }, 300)
        } else {
            ipcRenderer.invoke("send-to-yak-running", {name, code})
            setCurrentTabKey(Route.YakScript)
        }
    })

    const addBatchExecRecover = useMemoizedFn((task: UnfinishedBatchTask) => {
        addTabPage(Route.BatchExecutorRecover, {
            hideAdd: true,
            node: ContentByRoute(Route.BatchExecutorRecover, undefined, {
                recoverUid: task.Uid,
                recoverBaseProgress: task.Percent
            })
        })
    })

    useEffect(() => {
        ipcRenderer.on("fetch-send-to-tab", (e, res: any) => {
            const {type, data = {}} = res
            if (type === "fuzzer") addFuzzer(data)
            if (type === "scan-port") addScanPort(data)
            if (type === "brute") addBrute(data)
            if (type === "bug-test") addBugTest(1, data)
            if (type === "plugin-store") addYakRunning(data)
            if (type === "batch-exec-recover") addBatchExecRecover(data as UnfinishedBatchTask)
            console.info("send to tab: ", type)
        })

        return () => {
            ipcRenderer.removeAllListeners("fetch-send-to-tab")
        }
    }, [])

    // Tabs Bar 组件
    const closeAllCache = useMemoizedFn(() => {
        Modal.confirm({
            title: "确定要关闭所有 Tabs？",
            content: "这样将会关闭所有进行中的进程",
            onOk: () => {
                delFuzzerList(1)
                setPageCache([])
            }
        })
    })
    const closeOtherCache = useMemoizedFn((route: string) => {
        Modal.confirm({
            title: "确定要关闭除此之外所有 Tabs？",
            content: "这样将会关闭所有进行中的进程",
            onOk: () => {
                const arr = pageCache.filter((i) => i.route === route)
                setPageCache(arr)
                if (route === Route.HTTPFuzzer) delFuzzerList(1)
            }
        })
    })
    const bars = (props: any, TabBarDefault: any) => {
        return (
            <TabBarDefault
                {...props}
                children={(barNode: React.ReactElement) => {
                    return (
                        <DropdownMenu
                            menu={{
                                data: [
                                    {key: "all", title: "关闭所有Tabs"},
                                    {key: "other", title: "关闭其他Tabs"}
                                ]
                            }}
                            dropdown={{trigger: ["contextMenu"]}}
                            onClick={(key) => {
                                switch (key) {
                                    case "all":
                                        closeAllCache()
                                        break
                                    case "other":
                                        closeOtherCache(`${barNode.key}`)
                                        break
                                    default:
                                        break
                                }
                            }}
                        >
                            {barNode}
                        </DropdownMenu>
                    )
                }}
            />
        )
    }

    return (
        <Layout className='yakit-main-layout'>
            <AutoSpin spinning={loading}>
                <Header className='main-laytou-header'>
                    <Row>
                        <Col span={8}>
                            <Space>
                                <div style={{marginLeft: 18, textAlign: "center", height: 60}}>
                                    <Image src={YakLogoBanner} preview={false} width={130} style={{marginTop: 6}} />
                                </div>
                                <Divider type={"vertical"} />
                                <YakVersion />
                                <YakitVersion />
                                {!hideMenu && (
                                    <Button
                                        style={{marginLeft: 4, color: "#207ee8"}}
                                        type={"ghost"}
                                        ghost={true}
                                        onClick={(e) => {
                                            setCollapsed(!collapsed)
                                        }}
                                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                                    />
                                )}
                                <Button
                                    style={{marginLeft: 4, color: "#207ee8"}}
                                    type={"ghost"}
                                    ghost={true}
                                    onClick={(e) => {
                                        updateMenuItems()
                                    }}
                                    icon={<ReloadOutlined />}
                                />
                            </Space>
                        </Col>
                        <Col span={16} style={{textAlign: "right", paddingRight: 28}}>
                            <PerformanceDisplay />
                            <RiskStatsTag professionalMode={true} />
                            <Space>
                                {/* {status?.isTLS ? <Tag color={"green"}>TLS:通信已加密</Tag> : <Tag color={"red"}>通信未加密</Tag>} */}
                                {status?.addr && <Tag color={"geekblue"}>{status?.addr}</Tag>}
                                {/* <Tag color={engineStatus === "ok" ? "green" : "red"}>Yak 引擎状态：{engineStatus}</Tag> */}
                                <ReversePlatformStatus />
                                <Dropdown
                                    forceRender={true}
                                    overlay={
                                        <Menu>
                                            <Menu.Item
                                                key={"update"}
                                                onClick={() => {
                                                    showModal({
                                                        title: "更新插件源",
                                                        width: 800,
                                                        content: (
                                                            <div style={{width: 800}}>
                                                                <LoadYakitPluginForm
                                                                    onFinished={() => {
                                                                        info("更新进程执行完毕")
                                                                    }}
                                                                />
                                                            </div>
                                                        )
                                                    })
                                                }}
                                            >
                                                <Button type={"link"}>更新 Yakit 插件源</Button>
                                            </Menu.Item>
                                            <Menu.Item
                                                key={"reverse-global"}
                                                onClick={() => {
                                                    showModal({
                                                        title: "配置全局反连",
                                                        width: 800,
                                                        content: (
                                                            <div style={{width: 800}}>
                                                                <ConfigGlobalReverse />
                                                            </div>
                                                        )
                                                    })
                                                }}
                                            >
                                                <Button type={"link"}>配置全局反连</Button>
                                                {/*<ConfigGlobalReverseButton/>*/}
                                            </Menu.Item>
                                            <Menu.Item
                                                key={"config-system-proxy"}
                                                onClick={() => {
                                                    showConfigSystemProxyForm()
                                                }}
                                            >
                                                <Button type={"link"}>配置系统代理</Button>
                                            </Menu.Item>
                                            <Menu.Item key={"config-menu"} onClick={() => showConfigMenuItems()}>
                                                <Button type={"link"}>配置菜单栏</Button>
                                            </Menu.Item>
                                            <Menu.Item
                                                key={"config-private-domain"}
                                                onClick={() => {
                                                    const m = showModal({
                                                        title: "配置私有域",
                                                        content: <ConfigPrivateDomain onClose={() => m.destroy()} />
                                                    })
                                                    return m
                                                }}
                                            >
                                                <Button type={"link"}>配置私有域</Button>
                                            </Menu.Item>
                                        </Menu>
                                    }
                                    trigger={["click"]}
                                >
                                    <Button icon={<SettingOutlined />}>配置</Button>
                                </Dropdown>
                                {userInfo.isLogin ? (
                                    <div>
                                        <DropdownMenu
                                            menu={{
                                                data: userMenu
                                            }}
                                            dropdown={{
                                                placement: "bottomCenter",
                                                trigger: ["click"]
                                            }}
                                            onClick={(key) => {
                                                if (key === "sign-out") {
                                                    setStoreUserInfo(defaultUserInfo)
                                                    loginOut(userInfo)
                                                    setTimeout(() => success("已成功退出账号"), 500)
                                                }
                                                if (key === "trust-list") setTrustShow(true)
                                            }}
                                        >
                                            <img
                                                src={
                                                    userInfo[UserPlatformType[userInfo.platform || ""].img] || yakitImg
                                                }
                                                style={{width: 32, height: 32, borderRadius: "50%", cursor: "pointer"}}
                                            />
                                        </DropdownMenu>
                                    </div>
                                ) : (
                                    <Button type='link' onClick={() => setLoginShow(true)}>
                                        登录
                                    </Button>
                                )}
                                <Button
                                    type={"link"}
                                    danger={true}
                                    icon={<PoweroffOutlined />}
                                    onClick={() => {
                                        if (winCloseFlag) {
                                            setWinCloseShow(true)
                                        } else {
                                            refreshToken(userInfo)
                                            success("退出当前 Yak 服务器成功")
                                            setEngineStatus("error")
                                        }
                                    }}
                                />
                            </Space>
                        </Col>
                    </Row>
                </Header>
                <Content
                    style={{
                        margin: 12,
                        backgroundColor: "#fff",
                        overflow: "auto"
                    }}
                >
                    <Layout style={{height: "100%", overflow: "hidden"}}>
                        {!hideMenu && (
                            <Sider style={{backgroundColor: "#fff", overflow: "auto"}} collapsed={collapsed}>
                                <Spin spinning={loading}>
                                    <Space
                                        direction={"vertical"}
                                        style={{
                                            width: "100%"
                                        }}
                                    >
                                        <Menu
                                            theme={"light"}
                                            style={{}}
                                            selectedKeys={[]}
                                            mode={"inline"}
                                            onSelect={(e) => {
                                                if (e.key === "ignore") return

                                                const flag =
                                                    pageCache.filter((item) => item.route === (e.key as Route))
                                                        .length === 0
                                                if (flag) menuAddPage(e.key as Route)
                                                else setCurrentTabKey(e.key)
                                            }}
                                        >
                                            {menuItems.map((i) => {
                                                if (i.Group === "UserDefined") {
                                                    i.Group = "社区插件"
                                                }
                                                return (
                                                    <Menu.SubMenu
                                                        icon={<EllipsisOutlined />}
                                                        key={i.Group}
                                                        title={i.Group}
                                                    >
                                                        {i.Items.map((item) => {
                                                            if (item.YakScriptId > 0) {
                                                                return (
                                                                    <MenuItem
                                                                        icon={<EllipsisOutlined />}
                                                                        key={`plugin:${item.Group}:${item.YakScriptId}`}
                                                                    >
                                                                        <Text ellipsis={{tooltip: true}}>
                                                                            {item.Verbose}
                                                                        </Text>
                                                                    </MenuItem>
                                                                )
                                                            }
                                                            return (
                                                                <MenuItem
                                                                    icon={<EllipsisOutlined />}
                                                                    key={`batch:${item.Group}:${item.Verbose}:${item.MenuItemId}`}
                                                                >
                                                                    <Text ellipsis={{tooltip: true}}>
                                                                        {item.Verbose}
                                                                    </Text>
                                                                </MenuItem>
                                                            )
                                                        })}
                                                    </Menu.SubMenu>
                                                )
                                            })}
                                            {(routeMenuData || [])
                                                .filter((e) => !e.hidden)
                                                .map((i) => {
                                                    if (i.subMenuData) {
                                                        return (
                                                            <Menu.SubMenu icon={i.icon} key={i.key} title={i.label}>
                                                                {(i.subMenuData || [])
                                                                    .filter((e) => !e.hidden)
                                                                    .map((subMenu) => {
                                                                        return (
                                                                            <MenuItem
                                                                                icon={subMenu.icon}
                                                                                key={subMenu.key}
                                                                                disabled={subMenu.disabled}
                                                                            >
                                                                                <Text ellipsis={{tooltip: true}}>
                                                                                    {subMenu.label}
                                                                                </Text>
                                                                            </MenuItem>
                                                                        )
                                                                    })}
                                                            </Menu.SubMenu>
                                                        )
                                                    }
                                                    return (
                                                        <MenuItem icon={i.icon} key={i.key} disabled={i.disabled}>
                                                            {i.label}
                                                        </MenuItem>
                                                    )
                                                })}
                                        </Menu>
                                    </Space>
                                </Spin>
                            </Sider>
                        )}
                        <Content
                            style={{
                                overflow: "hidden",
                                backgroundColor: "#fff",
                                marginLeft: 12,
                                height: "100%",
                                display: "flex",
                                flexFlow: "column"
                            }}
                        >
                            <div
                                style={{
                                    padding: 12,
                                    paddingTop: 8,
                                    overflow: "hidden",
                                    flex: "1",
                                    display: "flex",
                                    flexFlow: "column"
                                }}
                            >
                                {pageCache.length > 0 ? (
                                    <Tabs
                                        style={{display: "flex", flex: "1"}}
                                        tabBarStyle={{marginBottom: 8}}
                                        className='main-content-tabs yakit-layout-tabs'
                                        activeKey={currentTabKey}
                                        onChange={setCurrentTabKey}
                                        size={"small"}
                                        type={"editable-card"}
                                        renderTabBar={(props, TabBarDefault) => {
                                            return bars(props, TabBarDefault)
                                        }}
                                        hideAdd={true}
                                        onTabClick={(key, e) => {
                                            const divExisted = document.getElementById("yakit-cursor-menu")
                                            if (divExisted) {
                                                const div: HTMLDivElement = divExisted as HTMLDivElement
                                                const unmountResult = ReactDOM.unmountComponentAtNode(div)
                                                if (unmountResult && div.parentNode) {
                                                    div.parentNode.removeChild(div)
                                                }
                                            }
                                        }}
                                    >
                                        {pageCache.map((i) => {
                                            return (
                                                <Tabs.TabPane
                                                    forceRender={true}
                                                    key={i.route}
                                                    tab={i.verbose}
                                                    closeIcon={
                                                        <Space>
                                                            <Popover
                                                                trigger={"click"}
                                                                title={"修改名称"}
                                                                content={
                                                                    <>
                                                                        <Input
                                                                            size={"small"}
                                                                            defaultValue={i.verbose}
                                                                            onBlur={(e) =>
                                                                                updateCacheVerbose(
                                                                                    `${i.route}`,
                                                                                    e.target.value
                                                                                )
                                                                            }
                                                                        />
                                                                    </>
                                                                }
                                                            >
                                                                <EditOutlined className='main-container-cion' />
                                                            </Popover>
                                                            <CloseOutlined
                                                                className='main-container-cion'
                                                                onClick={() => removePage(`${i.route}`)}
                                                            />
                                                        </Space>
                                                    }
                                                >
                                                    <div
                                                        style={{
                                                            overflowY: NoScrollRoutes.includes(i.route)
                                                                ? "hidden"
                                                                : "auto",
                                                            overflowX: "hidden",
                                                            height: "100%",
                                                            maxHeight: "100%"
                                                        }}
                                                    >
                                                        {i.singleNode ? (
                                                            i.singleNode
                                                        ) : (
                                                            <MainTabs
                                                                currentTabKey={currentTabKey}
                                                                tabType={i.route}
                                                                pages={i.multipleNode}
                                                                currentKey={i.multipleCurrentKey || ""}
                                                                isShowAdd={!i.hideAdd}
                                                                setCurrentKey={(key, type) => {
                                                                    setMultipleCurrentKey(key, type as Route)
                                                                }}
                                                                removePage={(key, type) => {
                                                                    removeMultipleNodePage(key, type as Route)
                                                                }}
                                                                removeOtherPage={(key, type) => {
                                                                    removeOtherMultipleNodePage(key, type as Route)
                                                                }}
                                                                onAddTab={() => menuAddPage(i.route)}
                                                                updateCacheVerbose={updateCacheVerboseMultipleNodePage}
                                                            />
                                                        )}
                                                    </div>
                                                </Tabs.TabPane>
                                            )
                                        })}
                                    </Tabs>
                                ) : (
                                    <></>
                                )}
                            </div>
                        </Content>
                    </Layout>
                </Content>
            </AutoSpin>

            <Modal
                visible={winCloseShow}
                onCancel={() => setWinCloseShow(false)}
                footer={[
                    <Button key='link' onClick={() => setWinCloseShow(false)}>
                        取消
                    </Button>,
                    <Button
                        key='back'
                        type='primary'
                        onClick={() => {
                            success("退出当前 Yak 服务器成功")
                            setEngineStatus("error")
                        }}
                    >
                        退出
                    </Button>
                ]}
            >
                <div style={{height: 40}}>
                    <ExclamationCircleOutlined style={{fontSize: 22, color: "#faad14"}} />
                    <span style={{fontSize: 18, marginLeft: 15}}>提示</span>
                </div>
                <p style={{fontSize: 15, marginLeft: 37}}>
                    是否要退出yakit操作界面，一旦退出，界面内打开内容除fuzzer页外都会销毁
                </p>
                <div style={{marginLeft: 37}}>
                    <Checkbox
                        defaultChecked={!winCloseFlag}
                        value={!winCloseFlag}
                        onChange={() => {
                            setWinCloseFlag(!winCloseFlag)
                            ipcRenderer.invoke("set-value", WindowsCloseFlag, false)
                        }}
                    ></Checkbox>
                    <span style={{marginLeft: 8}}>不再出现该提示信息</span>
                </div>
            </Modal>
            <Modal
                visible={bugTestShow}
                onCancel={() => setBugTestShow(false)}
                footer={[
                    <Button key='link' onClick={() => setBugTestShow(false)}>
                        取消
                    </Button>,
                    <Button
                        key='back'
                        type='primary'
                        onClick={() => {
                            if ((bugTestValue || []).length === 0) return failed("请选择类型后再次提交")
                            addBugTest(2)
                            setBugTestShow(false)
                        }}
                    >
                        确定
                    </Button>
                ]}
            >
                <ItemSelects
                    item={{
                        label: "专项漏洞类型",
                        style: {marginTop: 20}
                    }}
                    select={{
                        allowClear: true,
                        data: BugList.concat(bugList) || [],
                        optText: "title",
                        optValue: "key",
                        value: (bugTestValue || [])[0]?.key,
                        onChange: (value, option: any) =>
                            setBugTestValue(
                                value
                                    ? [
                                          {
                                              filter: option?.filter,
                                              key: option?.key,
                                              title: option?.title
                                          }
                                      ]
                                    : []
                            )
                    }}
                />
            </Modal>
            {loginshow && <Login visible={loginshow} onCancel={() => setLoginShow(false)}></Login>}
            <Modal
                visible={trustShow}
                title={"用户管理"}
                destroyOnClose={true}
                maskClosable={false}
                bodyStyle={{padding: "10px 24px 24px 24px"}}
                width={800}
                onCancel={() => setTrustShow(false)}
                footer={null}
            >
                <TrustList></TrustList>
            </Modal>
        </Layout>
    )
}

export default Main
