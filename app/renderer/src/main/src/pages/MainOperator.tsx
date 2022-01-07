import React, {useEffect, useState} from "react"
import {
    Button,
    Col,
    Image,
    Layout,
    Menu,
    Modal,
    Popconfirm,
    Popover,
    Row,
    Space,
    Tabs,
    Input,
    Divider,
    Tag,
    Spin,
    Dropdown
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
    DownOutlined,
    SettingOutlined,
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

export interface MainProp {
    tlsGRPC?: boolean
    addr?: string
    onErrorConfirmed?: () => any
}

const {ipcRenderer} = window.require("electron")
const MenuItem = Menu.Item

const {Header, Footer, Content, Sider} = Layout

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

    const closeCacheByRoute = (r: Route) => {
        setPageCache(pageCache.filter((i) => `${i.route}` !== `${r}`))
    }

    const closeAllCache = () => {
        Modal.confirm({
            title: "确定要关闭所有 Tabs？",
            content: "这样将会关闭所有进行中的进程",
            onOk: () => {
                setPageCache([])
            }
        })
    }

    const closeOtherCache = (id: string) => {
        Modal.confirm({
            title: "确定要除此之外所有 Tabs？",
            content: "这样将会关闭所有进行中的进程",
            onOk: () => {
                setPageCache(pageCache.filter((i) => i.id === id))
            }
        })
    }

    const removeCache = (id: string) => {
        setPageCache(pageCache.filter((i) => i.id !== id))
    }
    const appendCache = (id: string, verbose: string, node: any, route: Route) => {
        setPageCache([...pageCache, {id, verbose, node, route}])
    }

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

        let id = setInterval(() => {
            ipcRenderer
                .invoke("engine-status")
                .catch((e: any) => {
                    setEngineStatus("error")
                })
                .finally(() => {
                })
        }, 1000)
        return () => {
            ipcRenderer.removeAllListeners("client-engine-status-error")
            ipcRenderer.removeAllListeners("client-engine-status-ok")
            clearInterval(id)
        }
    }, [])

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
                ContentByRoute(Route.DataCompare),
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
                                    全局配置
                                </Button>
                            </Dropdown>
                            <Button type={"primary"} danger={true} icon={<PoweroffOutlined/>} onClick={() => {
                                success("退出当前 Yak 服务器成功")
                                setEngineStatus("error")
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
                                                const newTabId = `${e.key}-[${randomString(49)}]`
                                                const verboseNameRaw = routeKeyToLabel.get(e.key) || `${e.key}`
                                                appendCache(newTabId, `${verboseNameRaw}[${pageCache.length + 1}]`, ContentByRoute(e.key), e.key as Route)
                                                setCurrentTabKey(newTabId)
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
                                                                {item.Verbose}
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
                                                                    {subMenu.label}
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
                        display: "flex"
                    }}>
                        <div style={{padding: 12, paddingTop: 8, overflow: "hidden", display: "flex", flex: "1"}}>
                            {pageCache.length > 0 ? (
                                <Tabs
                                    style={{display: "flex", flex: "1"}}
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
                                                // hooked by tabs closeIcon
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
        </Layout>
    )
};

export default Main;
