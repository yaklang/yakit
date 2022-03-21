import React, {useEffect, useRef, useState} from "react"
import {
    Button,
    Col,
    Image,
    Layout,
    Menu,
    Modal,
    Popover,
    Row,
    Space,
    Tabs,
    Input,
    Divider,
    Tag,
    Spin,
    Dropdown,
    Typography,
    Checkbox
} from "antd"
import {ContentByRoute, MenuDataProps, NoScrollRoutes, Route, RouteMenuData} from "../routes/routeSpec"
import {
    CloseOutlined,
    EditOutlined,
    EllipsisOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    ReloadOutlined,
    PoweroffOutlined,
    SettingOutlined,
    ExclamationCircleOutlined,
} from "@ant-design/icons"
import {failed, info, success} from "../utils/notification"
import {showModal} from "../utils/showModal"
import {YakLogoBanner} from "../utils/logo"
import {
    AutoUpdateYakModuleButton,
    ConfigGlobalReverseButton,
    ReversePlatformStatus,
    YakitVersion,
    YakVersion
} from "../utils/basic"
import {CompletionTotal, setCompletions} from "../utils/monacoSpec/yakCompletionSchema"
import {randomString} from "../utils/randomUtil"
import MDEditor from "@uiw/react-md-editor"
import {genDefaultPagination, QueryYakScriptRequest, QueryYakScriptsResponse, YakScript} from "./invoker/schema"
import {PerformanceDisplay} from "../components/PerformanceDisplay"


import "./main.css"
import {useHotkeys} from "react-hotkeys-hook";
import {execTest} from "./invoker/ExecutePacketYakScript";
import { useMemoizedFn } from "ahooks"
import ReactDOM from "react-dom"
import debounce from "lodash/debounce"
import { AutoSpin } from "../components/AutoSpin"
import cloneDeep from "lodash/cloneDeep"

export interface MainProp {
    tlsGRPC?: boolean
    addr?: string
    onErrorConfirmed?: () => any
}

const {ipcRenderer} = window.require("electron")
const MenuItem = Menu.Item

const {Header, Footer, Content, Sider} = Layout
const {Text} = Typography

const FuzzerCache = "fuzzer-list-cache"
const WindowsCloseFlag = "windows-close-flag" 

interface MenuItemGroup {
    Group: string
    Items: { Group: string; YakScriptId: number; Verbose: string }[]
}

interface PluginMenuItem {
    Group: string
    YakScriptId: number
    Verbose: string
}

interface PageCache {
    id: string
    verbose: string
    node: React.ReactNode | any
    route: Route
    time?: string
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

const singletonRoute = [
    Route.HTTPHacker,
    Route.ShellReceiver,
    Route.ReverseServer,
    Route.PayloadManager,
    Route.ModManager, Route.ModManagerLegacy, Route.YakScript,

    // database
    Route.DB_Ports, Route.DB_HTTPHistory, Route.DB_ExecResults, Route.DB_Domain,
    Route.DB_Risk,

    Route.PoC, Route.DNSLog, Route.BatchExecutorPage,
]

const Main: React.FC<MainProp> = (props) => {
    const [route, setRoute] = useState<any>(Route.HTTPHacker)
    const [collapsed, setCollapsed] = useState(false)
    const [engineStatus, setEngineStatus] = useState<"ok" | "error">("ok")
    const [status, setStatus] = useState<{ addr: string; isTLS: boolean }>()
    const [hideMenu, setHideMenu] = useState(false)
    const [menuItems, setMenuItems] = useState<MenuItemGroup[]>([])
    const [loading, setLoading] = useState(false)
    const [pageCache, setPageCache] = useState<PageCache[]>([
        {
            node: ContentByRoute(Route.HTTPHacker),
            id: "",
            route: Route.HTTPHacker,
            verbose: "MITM"
        }
    ])
    const [extraGeneralModule, setExtraGeneralModule] = useState<YakScript[]>([])
    const [notification, setNotification] = useState("")

    // 多开 tab 页面
    const [currentTabKey, setCurrentTabKey] = useState("")
    const [tabLoading, setTabLoading] = useState(false)

    // yakit页面关闭是否二次确认提示
    const [winCloseFlag, setWinCloseFlag] = useState<boolean>(true)
    const [winCloseShow, setWinCloseShow] = useState<boolean>(false)
    useEffect(() => {
        ipcRenderer
            .invoke("get-value", WindowsCloseFlag)
            .then((flag: any) => {
                setWinCloseFlag(flag === undefined ? true : flag)
            })
    }, [])

    // 打开的fuzzer页数据列表
    const fuzzerList = useRef<Map<string, fuzzerInfoProp>>(new Map<string, fuzzerInfoProp>())
    // fuzzer页数据列表相关操作
    const saveFuzzerList = debounce(() => {
        const historys: fuzzerInfoProp[] = []
        fuzzerList.current.forEach((value) => {
            historys.push(value)
        })
        historys.sort((a, b) => +a.time - +b.time)
        const filters = historys.filter(item => (item.request || "").length < 1000000 && (item.request || "").length > 0)
        ipcRenderer.invoke("set-value", FuzzerCache, JSON.stringify(filters.slice(-5)))
    }, 500)
    const fetchFuzzerList = useMemoizedFn(() => {
        setLoading(true)
        fuzzerList.current.clear()
        ipcRenderer
            .invoke("get-value", FuzzerCache)
            .then((res: any) => {
                const cache = JSON.parse(res)
                let index = 0 
                for(let item of cache){
                    const time = new Date().getTime().toString()
                    fuzzerList.current.set(time,{...item, time: time})
                    const newTabId = `${Route.HTTPFuzzer}-[${randomString(49)}]`
                    const verboseNameRaw = routeKeyToLabel.get(Route.HTTPFuzzer) || `${Route.HTTPFuzzer}`
                    appendCache(
                        newTabId,
                        `${verboseNameRaw}[${pageCache.length + 1 + index}]`,
                        ContentByRoute(Route.HTTPFuzzer, undefined, {
                            isHttps: item.isHttps || false,
                            request: item.request || "",
                            fuzzerParams: item,
                            system: system,
                            order: time
                        }),
                        Route.HTTPFuzzer as Route,
                        time
                    )
                    setCurrentTabKey(newTabId)
                    index += 1
                }
            })
            .catch(() => failed("fetch fuzzer cache failed"))
            .finally(() => setTimeout(() => setLoading(false), 300))
    })
    const addFuzzerList = (key: string, request?: string, isHttps?: boolean) => {
        fuzzerList.current.set(key, {request, isHttps, time: key})
    }
    const delFuzzerList = (type: number, key?: string) => {
        if(type === 1) fuzzerList.current.clear()
        if(type === 2 && key) if(fuzzerList.current.has(key)) fuzzerList.current.delete(key)
        if(type === 3 && key){
            const info = fuzzerList.current.get(key)
            if(info){
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
            if(!flag)fetchFuzzerList()
        })
        return () => ipcRenderer.removeAllListeners("fetch-fuzzer-setting-data")
    }, [])

    // 系统类型
    const [system,setSystem]=useState<string>("")
    //获取系统类型
    useEffect(()=>{
        ipcRenderer.invoke('fetch-system-name').then((res)=>{setSystem(res)})
    },[])

    const closeCacheByRoute = (r: Route) => {
        if(r === Route.HTTPFuzzer) delFuzzerList(1)
        setPageCache(pageCache.filter((i) => `${i.route}` !== `${r}`))
    }
    const closeAllCache = () => {
        Modal.confirm({
            title: "确定要关闭所有 Tabs？",
            content: "这样将会关闭所有进行中的进程",
            onOk: () => {
                delFuzzerList(1)
                setPageCache([])
            }
        })
    }
    const closeOtherCache = (id: string) => {
        Modal.confirm({
            title: "确定要除此之外所有 Tabs？",
            content: "这样将会关闭所有进行中的进程",
            onOk: () => {
                const arr = pageCache.filter((i) => i.id === id)
                delFuzzerList(3, arr[0].time)
                setPageCache(arr)
            }
        })
    }

    const removeCache = (id: string) => {
        setPageCache(pageCache.filter((i) => i.id !== id))
    }
    const appendCache = useMemoizedFn((id: string, verbose: string, node: any, route: Route, time?: string) => {
        setPageCache([...pageCache, {id, verbose, node, route, time}])
    })

    const getCacheIndex = (id: string) => {
        const targets = pageCache.filter((i) => i.id === id)
        return targets.length > 0 ? pageCache.indexOf(targets[0]) : -1
    }
    const updateCacheVerbose = (id: string, verbose: string) => {
        const index = getCacheIndex(id)
        if (index < 0) {
            return
        }
        pageCache[index].verbose = verbose
        setPageCache([...pageCache])
    }

    const setCurrentTabByRoute = (r: Route) => {
        const targets = pageCache.filter((i) => i.route === r)
        if (targets.length > 0) {
            setCurrentTabKey(targets[0].id)
        }
    }

    const routeExistedCount = (r: Route) => {
        const targets = pageCache.filter((i) => {
            return i.route === r
        })
        return targets.length
    }

    const updateMenuItems = () => {
        setLoading(true)
        ipcRenderer
            .invoke("GetAllMenuItem", {})
            .then((data: { Groups: MenuItemGroup[] }) => {
                setMenuItems(data.Groups)
            })
            .catch((e: any) => {
                failed("Update Menu Item Failed")
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 300)
            })

        ipcRenderer
            .invoke("QueryYakScript", {
                Pagination: genDefaultPagination(1000),
                IsGeneralModule: true,
                Type: "yak"
            } as QueryYakScriptRequest)
            .then((data: QueryYakScriptsResponse) => {
                setExtraGeneralModule(data.Data)
            })
    }

    useEffect(() => {
        const key = currentTabKey.split("-")[0]
        const hasBug = pageCache.filter((item) => item.id.split("-")[0] === "poc").length === 1
        if (key !== "poc" && hasBug) {
            ipcRenderer.invoke("main-bug-test", false)
        }
    }, [currentTabKey])

    useEffect(() => {
        if (engineStatus === "error") {
            props.onErrorConfirmed && props.onErrorConfirmed()
        }
    }, [engineStatus])

    useEffect(() => {
        updateMenuItems()
    }, [])

    // 加载补全
    useEffect(() => {
        ipcRenderer.invoke("GetYakitCompletionRaw").then((data: { RawJson: Uint8Array }) => {
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
                .finally(() => {
                })
        }
        let id = setInterval(updateEngineStatus, 3000)
        return () => {
            ipcRenderer.removeAllListeners("client-engine-status-error")
            ipcRenderer.removeAllListeners("client-engine-status-ok")
            clearInterval(id)
        }
    }, [])

    useHotkeys("Ctrl+Alt+T", () => {
        // alert(1)
        // execTest()
    })

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
                                                <MDEditor.Markdown source={e}/>
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
            const newTabId = `${Route.DataCompare}-[${randomString(49)}]`;
            const verboseNameRaw = routeKeyToLabel.get(Route.DataCompare) || `${Route.DataCompare}`;
            appendCache(
                newTabId,
                `${verboseNameRaw}[${pageCache.length + 1}]`,
                ContentByRoute(Route.DataCompare, undefined, {system: system}),
                Route.DataCompare as Route,
            );

            // 增加加载状态
            setTabLoading(true)
            setTimeout(() => {
                setTabLoading(false)
            }, 300)

            // 区分新建对比页面还是别的页面请求对比的情况
            ipcRenderer.invoke("created-data-compare")
        })

        return () => {
            ipcRenderer.removeAllListeners("main-container-add-compare")
        }
    }, [pageCache])

    const addFuzzer = useMemoizedFn((res: any) => {
        const {isHttps, request} = res || {}

        if(request){
            const time = new Date().getTime().toString()
            const newTabId = `${Route.HTTPFuzzer}-[${randomString(49)}]`
            const verboseNameRaw = routeKeyToLabel.get(Route.HTTPFuzzer) || `${Route.HTTPFuzzer}`
            appendCache(
                newTabId,
                `${verboseNameRaw}[${pageCache.length + 1}]`,
                ContentByRoute(Route.HTTPFuzzer, undefined, {
                    isHttps: isHttps || false,
                    request: request || "",
                    system: system,
                    order: time
                }),
                Route.HTTPFuzzer as Route,
                time
            )
            addFuzzerList(time, request|| "", isHttps || false)
            setCurrentTabKey(newTabId)
        }
    })

    useEffect(() => {
        ipcRenderer.on("fetch-new-main-menu", (e) => {
            updateMenuItems()
        })
        ipcRenderer.on("fetch-send-to-fuzzer", (e, res: any) => addFuzzer(res))

        return () => {
            ipcRenderer.removeAllListeners("fetch-new-main-menu")
            ipcRenderer.removeAllListeners("fetch-send-to-fuzzer")
        }
    }, [])

    const pluginKey = (item: PluginMenuItem) => `plugin:${item.Group}:${item.YakScriptId}`;
    const routeKeyToLabel = new Map<string, string>();
    RouteMenuData.forEach(k => {
        (k.subMenuData || []).forEach(subKey => {
            routeKeyToLabel.set(`${subKey.key}`, subKey.label)
        })

        routeKeyToLabel.set(`${k.key}`, k.label)
    })
    menuItems.forEach((k) => {
        k.Items.forEach((value) => {
            routeKeyToLabel.set(pluginKey(value), value.Verbose)
        })
    })

    const documentKeyDown = useMemoizedFn((e: any) => {
        // ctrl + w 关闭tab页面
        if (e.code === "KeyW" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            if(pageCache.length === 0) return

            setLoading(true)
            const tabInfo = pageCache.filter((i) => i.id === currentTabKey)[0]
            if (pageCache.length === 1) {
                setPageCache([])
                setCurrentTabKey("")
            } else {
                const tabs = cloneDeep(pageCache)
                for (let index in pageCache) {
                    if (pageCache[index].id === tabInfo.id) {
                        tabs.splice(index, 1)
                        setCurrentTabKey(
                            pageCache[+index === pageCache.length - 1 ? +index - 1 : +index + 1].id
                        )
                        setPageCache(tabs)
                        break
                    }
                }
            }

            delFuzzerList(2, tabInfo.time)
            setTimeout(() => setLoading(false), 300);
            return
        }
    })
    useEffect(() => {
        document.onkeydown = documentKeyDown
    }, [])

    const tabBarMenu = (id: any, route: string) => {
        return (
            <Menu
                onClick={({key}) => {
                    switch (key) {
                        case "all":
                            closeAllCache()
                            break
                        case "route":
                            closeCacheByRoute(route as Route)
                            break
                        case "other":
                            closeOtherCache(id)
                            break

                        default:
                            break
                    }
                }}
            >
                <Menu.Item key='all'>
                    <div>关闭所有Tabs</div>
                </Menu.Item>
                <Menu.Item key='route'>
                    <div>关闭同类Tabs</div>
                </Menu.Item>
                <Menu.Item key='other'>
                    <div>关闭其他Tabs</div>
                </Menu.Item>
            </Menu>
        )
    }

    // Tabs Bar 组件
    const bars = (props: any, TabBarDefault: any) => {
        return (
            <TabBarDefault
                {...props}
                children={(barNode: React.ReactElement) => {
                    const route = ((barNode.key as string) || "httpHacker").split("-[").shift()
                    return (
                        <Dropdown overlay={tabBarMenu(barNode.key, route || "")} trigger={["contextMenu"]}>
                            {barNode}
                        </Dropdown>
                    )
                }}
            />
        )
    }

    return (
        <Layout style={{width: "100%", height: "100vh"}}>
            <AutoSpin spinning={loading}>
            <Header
                style={{
                    paddingLeft: 0,
                    paddingRight: 0,
                    backgroundColor: "#fff",
                    height: 60,
                    minHeight: 60
                }}
            >
                <Row>
                    <Col span={8}>
                        <Space>
                            <div style={{marginLeft: 18, textAlign: "center", height: 60}}>
                                <Image src={YakLogoBanner} preview={false} width={130} style={{marginTop: 6}}/>
                            </div>
                            <Divider type={"vertical"}/>
                            <YakVersion/>
                            <YakitVersion/>
                            {!hideMenu && (
                                <Button
                                    style={{marginLeft: 4, color: "#207ee8"}}
                                    type={"ghost"}
                                    ghost={true}
                                    onClick={(e) => {
                                        setCollapsed(!collapsed)
                                    }}
                                    icon={collapsed ? <MenuUnfoldOutlined/> : <MenuFoldOutlined/>}
                                />
                            )}
                            <Button
                                style={{marginLeft: 4, color: "#207ee8"}}
                                type={"ghost"}
                                ghost={true}
                                onClick={(e) => {
                                    updateMenuItems()
                                }}
                                icon={<ReloadOutlined/>}
                            />
                        </Space>
                    </Col>
                    <Col span={16} style={{textAlign: "right", paddingRight: 28}}>
                        <PerformanceDisplay/>
                        <Space>
                            {/* {status?.isTLS ? <Tag color={"green"}>TLS:通信已加密</Tag> : <Tag color={"red"}>通信未加密</Tag>} */}
                            {status?.addr && <Tag color={"geekblue"}>{status?.addr}</Tag>}
                            {/* <Tag color={engineStatus === "ok" ? "green" : "red"}>Yak 引擎状态：{engineStatus}</Tag> */}
                            <ReversePlatformStatus/>
                            <Dropdown forceRender={true} overlay={<Menu>
                                <Menu.Item key={"update"}>
                                    <AutoUpdateYakModuleButton/>
                                </Menu.Item>
                                <Menu.Item key={"reverse-global"}>
                                    <ConfigGlobalReverseButton/>
                                </Menu.Item>
                            </Menu>} trigger={["click"]}>
                                <Button icon={<SettingOutlined/>}>
                                    配置
                                </Button>
                            </Dropdown>
                            <Button type={"link"} danger={true} icon={<PoweroffOutlined/>} onClick={() => {
                                if(winCloseFlag) setWinCloseShow(true)
                                else{
                                    success("退出当前 Yak 服务器成功")
                                    setEngineStatus("error")
                                }
                            }}/>
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
                        <Sider
                            style={{backgroundColor: "#fff", overflow: "auto"}}
                            collapsed={collapsed}
                            // onCollapse={r => {
                            //     setCollapsed(r)
                            // }}
                        >
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
                                        onSelect={(e) => {
                                            if (e.key === "ignore") return


                                            if (singletonRoute.includes(e.key as Route) && routeExistedCount(e.key as Route) > 0) {
                                                setCurrentTabByRoute(e.key as Route)
                                            } else {
                                                if(e.key === Route.HTTPFuzzer){
                                                    const time = new Date().getTime().toString()
                                                    const newTabId = `${e.key}-[${randomString(49)}]`
                                                    const verboseNameRaw = routeKeyToLabel.get(e.key) || `${e.key}`
                                                    appendCache(newTabId, `${verboseNameRaw}[${pageCache.length + 1}]`, ContentByRoute(e.key, undefined, {system: system, order: time}), e.key as Route, time)
                                                    addFuzzerList(time)
                                                    setCurrentTabKey(newTabId)
                                                }else{
                                                    const newTabId = `${e.key}-[${randomString(49)}]`
                                                    const verboseNameRaw = routeKeyToLabel.get(e.key) || `${e.key}`
                                                    appendCache(newTabId, `${verboseNameRaw}[${pageCache.length + 1}]`, ContentByRoute(e.key), e.key as Route)
                                                    setCurrentTabKey(newTabId)
                                                }
                                            }

                                            // 增加加载状态
                                            setTabLoading(true)
                                            setTimeout(() => {
                                                setTabLoading(false)
                                            }, 300)

                                            setRoute(e.key)
                                        }}
                                        mode={"inline"}
                                    >
                                        {menuItems.map((i) => {
                                            if (i.Group === "UserDefined") {
                                                i.Group = "社区插件"
                                            }
                                            return (
                                                <Menu.SubMenu icon={<EllipsisOutlined/>} key={i.Group} title={i.Group}>
                                                    {i.Items.map((item) => {
                                                        return (
                                                            <MenuItem icon={<EllipsisOutlined/>}
                                                                      key={`plugin:${item.Group}:${item.YakScriptId}`}>
                                                                <Text ellipsis={{tooltip: true}}>{item.Verbose}</Text>
                                                            </MenuItem>
                                                        )
                                                    })}
                                                </Menu.SubMenu>
                                            )
                                        })}
                                        {(RouteMenuData || []).map((i) => {
                                            if (i.subMenuData) {
                                                if (i.key === `${Route.GeneralModule}`) {
                                                    const extraMenus = extraGeneralModule.map((i) => {
                                                        return {
                                                            icon: <EllipsisOutlined/>,
                                                            key: `plugin:${i.Id}`,
                                                            label: i.GeneralModuleVerbose
                                                        } as unknown as MenuDataProps
                                                    })
                                                    i.subMenuData.push(...extraMenus)
                                                    let subMenuMap = new Map<string, MenuDataProps>()
                                                    i.subMenuData.forEach((e) => {
                                                        subMenuMap.set(e.key as string, e)
                                                    })
                                                    i.subMenuData = []
                                                    subMenuMap.forEach((v) => i.subMenuData?.push(v))
                                                    i.subMenuData.sort((a, b) => a.label.localeCompare(b.label))
                                                }
                                                i.subMenuData.sort((a, b) => (a.disabled ? 1 : 0) - (b.disabled ? 1 : 0))
                                                return (
                                                    <Menu.SubMenu icon={i.icon} key={i.key} title={i.label}>
                                                        {(i.subMenuData || []).map((subMenu) => {
                                                            return (
                                                                <MenuItem icon={subMenu.icon} key={subMenu.key}
                                                                          disabled={subMenu.disabled}>
                                                                    <Text ellipsis={{tooltip: true}}>{subMenu.label}</Text>
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
                    <Content style={{
                        overflow: "hidden",
                        backgroundColor: "#fff",
                        marginLeft: 12,
                        height: "100%",
                        display: "flex",
                        flexFlow: "column"
                    }}>
                        <div style={{
                            padding: 12,
                            paddingTop: 8,
                            overflow: "hidden",
                            flex: "1",
                            display: "flex",
                            flexFlow: "column"
                        }}>
                            {pageCache.length > 0 ? (
                                <Tabs
                                    style={{display: "flex", flex: "1"}}
                                    tabBarStyle={{marginBottom: 8}}
                                    className='main-content-tabs'
                                    activeKey={currentTabKey}
                                    onChange={setCurrentTabKey}
                                    size={"small"}
                                    type={"editable-card"}
                                    renderTabBar={(props, TabBarDefault) => {
                                        return bars(props, TabBarDefault)
                                    }}
                                    hideAdd={true}
                                    onEdit={(key: any, event: string) => {
                                        switch (event) {
                                            case "remove":
                                                const arr = pageCache.filter((i) => i.id === key)
                                                delFuzzerList(2, arr[0].time)
                                                return
                                            case "add":
                                                if (collapsed) {
                                                    setCollapsed(false)
                                                } else {
                                                    info("请从左边菜单连选择需要新建的 Tab 窗口")
                                                }
                                                return
                                        }
                                    }}
                                    onTabClick={(key, e) => {
                                        const divExisted = document.getElementById("yakit-cursor-menu")
                                        if(divExisted){
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
                                                key={i.id}
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
                                                                        onBlur={(e) => {
                                                                            updateCacheVerbose(i.id, e.target.value)
                                                                        }}
                                                                    />
                                                                </>
                                                            }
                                                        >
                                                            <EditOutlined className='main-container-cion'/>
                                                        </Popover>
                                                        <CloseOutlined
                                                            className='main-container-cion'
                                                            onClick={() => {
                                                                setTabLoading(true)
                                                                const key = i.id
                                                                const targetIndex = getCacheIndex(key)
                                                                if (targetIndex > 0 && pageCache[targetIndex - 1]) {
                                                                    const targetCache = pageCache[targetIndex - 1]
                                                                    setCurrentTabKey(targetCache.id)
                                                                }
                                                                removeCache(key)
                                                                setTimeout(() => setTabLoading(false), 300)
                                                            }}
                                                        />
                                                    </Space>
                                                }
                                            >
                                                {/*<Spin spinning={tabLoading} wrapperClassName={'main-panel-spin'} >*/}
                                                <div
                                                    style={{
                                                        overflowY: NoScrollRoutes.includes(i.route) ? "hidden" : "auto",
                                                        overflowX: "hidden",
                                                        height: "100%",
                                                        maxHeight: "100%"
                                                    }}
                                                >
                                                    {i.node}
                                                </div>
                                                {/*</Spin>*/}
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
                    <Button key='back' type='primary' onClick={() => {
                        success("退出当前 Yak 服务器成功")
                        setEngineStatus("error")
                    }}>
                        退出
                    </Button>
                ]}
            >
                <div style={{height: 40}}>
                    <ExclamationCircleOutlined style={{fontSize: 22, color: "#faad14"}} />
                    <span style={{fontSize: 18, marginLeft: 15}}>提示</span>
                </div>
                <p style={{fontSize: 15, marginLeft: 37}}>是否要退出yakit操作界面，一旦退出，界面内打开内容除fuzzer页外都会销毁</p>
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
        </Layout>
    )
};

export default Main;
