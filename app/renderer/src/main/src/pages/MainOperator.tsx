import React, {useEffect, useState} from "react";
import {Layout, Menu, Space, Tabs, Image, Button, Tag, Modal, Row, Col, Popconfirm, Spin} from "antd";
import {ContentByRoute, Route, RouteMenuData} from "../routes/routeSpec";
import {EllipsisOutlined, MenuFoldOutlined, MenuUnfoldOutlined, ReloadOutlined} from "@ant-design/icons"
import {failed, info, success} from "../utils/notification";
import {showDrawer} from "../utils/showModal";
import {CodecPage} from "./codec/CodecPage";
import {YakLogoData} from "../utils/logo";
import {AutoUpdateYakModuleButton, YakVersion} from "../utils/basic";
import {CompletionTotal, setCompletions} from "../utils/monacoSpec/yakCompletionSchema";
import ReactJson from "react-json-view";
import {randomString} from "../utils/randomUtil";

export interface MainProp {
    tlsGRPC?: boolean
    addr?: string
    onErrorConfirmed?: () => any
}

const {TabPane} = Tabs;
const {ipcRenderer} = window.require("electron");
const MenuItem = Menu.Item;

const {Header, Footer, Content, Sider} = Layout;


interface MenuItemGroup {
    Group: string
    Items: { Group: string, YakScriptId: number, Verbose: string }[]
}

interface PluginMenuItem {
    Group: string,
    YakScriptId: number,
    Verbose: string
};

interface PageCache {
    id: string
    verbose: string
    node: React.ReactNode | any
}

export const Main: React.FC<MainProp> = (props) => {
    const [route, setRoute] = useState<any>(Route.HTTPHacker);
    const [collapsed, setCollapsed] = useState(false);
    const [engineStatus, setEngineStatus] = useState<"ok" | "error">("ok");
    const [status, setStatus] = useState<{ addr: string, isTLS: boolean }>();
    const [hideMenu, setHideMenu] = useState(false);
    const [menuItems, setMenuItems] = useState<MenuItemGroup[]>([]);
    const [loading, setLoading] = useState(false);
    const [pageCache, setPageCache] = useState<PageCache[]>([]);

    const removeCache = (id: string) => {
        setPageCache(pageCache.filter(i => i.id !== id))
    };
    const appendCache = (id: string, verbose: string, node: any) => {
        setPageCache([...pageCache, {id, verbose, node}])
    }


    const updateMenuItems = () => {
        setLoading(true)
        ipcRenderer.invoke("GetAllMenuItem", {}).then((data: { Groups: MenuItemGroup[] }) => {
            setMenuItems(data.Groups)
        }).catch(e => {
            failed("Update Menu Item Failed")
        }).finally(() => {
            setTimeout(() => {
                setLoading(false)
            }, 300)
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
            success("加载 Yak 语言自动补全成功 / Load Yak IDE Auto Completion Finished")
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
            ipcRenderer.invoke("engine-status").catch(e => {
                setEngineStatus("error")
            }).finally(() => {
            })
        }, 1000)
        return () => {
            ipcRenderer.removeAllListeners("client-engine-status-error")
            ipcRenderer.removeAllListeners("client-engine-status-ok")
            clearInterval(id)
        }
    }, [])

    const pluginKey = (item: PluginMenuItem) => `plugin:${item.Group}:${item.YakScriptId}`;
    const routeKeyToLabel = new Map<string, string>();
    RouteMenuData.forEach(k => {
        routeKeyToLabel.set(`${k.key}`, k.label)
    })
    menuItems.forEach(k => {
        k.Items.forEach(value => {
            routeKeyToLabel.set(pluginKey(value), value.Verbose)
        })
    })

    return (
        <Layout style={{width: "100%", height: "100vh"}}>
            <Layout>
                <Header
                    style={{
                        paddingLeft: 0, paddingRight: 0,
                        backgroundColor: "#fff", height: 60
                    }}

                >
                    <Row>
                        <Col span={8}>
                            <Space>
                                <div style={{marginLeft: 8, textAlign: "center", height: 60}}>
                                    <Image
                                        src={YakLogoData} preview={false}
                                        width={64}
                                    />
                                </div>
                                <YakVersion/>
                                {!hideMenu && <Button
                                    style={{marginLeft: 4, color: "#207ee8"}}
                                    type={"ghost"} ghost={true}
                                    onClick={e => {
                                        setCollapsed(!collapsed)
                                    }}
                                    icon={
                                        collapsed ? <MenuUnfoldOutlined/> : <MenuFoldOutlined/>
                                    }
                                />}
                                <Button
                                    style={{marginLeft: 4, color: "#207ee8"}}
                                    type={"ghost"} ghost={true}
                                    onClick={e => {
                                        updateMenuItems()
                                    }}
                                    icon={
                                        <ReloadOutlined/>
                                    }
                                >

                                </Button>
                            </Space>
                        </Col>
                        <Col span={16} style={{textAlign: "right", paddingRight: 28}}>
                            <Space>
                                {status?.isTLS ? <Tag color={"green"}>TLS:通信已加密</Tag> : <Tag color={"red"}>
                                    通信未加密
                                </Tag>}
                                {status?.addr && <Tag color={"geekblue"}>{status?.addr}</Tag>}
                                <Tag color={engineStatus === "ok" ? "green" : "red"}>Yak 引擎状态：{engineStatus}</Tag>
                                <AutoUpdateYakModuleButton/>
                                <Popconfirm
                                    title={"确认需要退出当前会话吗？"}
                                    onConfirm={() => {
                                        success("退出当前 Yak 服务器成功")
                                        setEngineStatus("error")
                                    }}
                                >
                                    <Button danger={true}>退出 / 切换 Yak 服务器</Button>
                                </Popconfirm>
                            </Space>
                        </Col>
                    </Row>
                </Header>
                <Content style={{
                    margin: 12, backgroundColor: "#fff",
                    overflow: "auto"
                }}>
                    <Layout style={{height: "100%"}}>
                        {!hideMenu && <Sider
                            style={{backgroundColor: "#fff"}}
                            collapsed={collapsed}
                            // onCollapse={r => {
                            //     setCollapsed(r)
                            // }}
                        >
                            <Spin spinning={loading}>

                                <Space direction={"vertical"} style={{
                                    width: "100%",
                                }}>
                                    <Menu
                                        theme={"light"} style={{}}
                                        onSelect={(e) => {
                                            if (e.key === "ignore") {
                                                return
                                            }
                                            appendCache(
                                                `${e.key}-[${randomString(49)}]`,
                                                `${routeKeyToLabel.get(e.key)}[${pageCache.length + 1}]` ||
                                                `${e.key}[${pageCache.length + 1}]`,
                                                <div style={{overflow: "auto"}}>
                                                    {ContentByRoute(e.key)}
                                                </div>
                                            )
                                            setRoute(e.key)
                                        }}
                                        mode={"inline"}
                                        // inlineCollapsed={false}
                                    >
                                        {menuItems.map(i => {
                                            if (i.Group === "UserDefined") {
                                                i.Group = "社区插件"
                                            }
                                            return <Menu.SubMenu
                                                icon={<EllipsisOutlined/>}
                                                key={i.Group} title={i.Group}
                                            >
                                                {i.Items.map(item => {
                                                    return <MenuItem
                                                        icon={<EllipsisOutlined/>}
                                                        key={`plugin:${item.Group}:${item.YakScriptId}`}
                                                    >
                                                        {item.Verbose}
                                                    </MenuItem>
                                                })}
                                            </Menu.SubMenu>
                                        })}
                                        {(RouteMenuData || []).map(i => {
                                            if (i.subMenuData) {
                                                return <Menu.SubMenu
                                                    icon={i.icon} key={i.key} title={i.label}
                                                >
                                                    {(i.subMenuData || []).map(subMenu => {
                                                        return <MenuItem icon={subMenu.icon} key={subMenu.key}
                                                                         disabled={subMenu.disabled}>
                                                            {subMenu.label}
                                                        </MenuItem>
                                                    })}
                                                </Menu.SubMenu>
                                            }
                                            return <MenuItem icon={i.icon} key={i.key} disabled={i.disabled}>
                                                {i.label}
                                            </MenuItem>
                                        })}
                                    </Menu>
                                </Space>
                            </Spin>
                        </Sider>}
                        <Content style={{
                            overflow: "auto",
                            backgroundColor: "#fff",
                            marginLeft: 12, height: "100%",
                        }}>
                            <div style={{padding: 12, paddingTop: 8, height: "100%"}}>
                                <Space style={{width: "100%", height: "100%"}} direction={"vertical"}>
                                    {pageCache.length > 0 && <Tabs
                                        size={"small"} type={"editable-card"}
                                        onEdit={(key: any, event: string) => {
                                            switch (event) {
                                                case "remove":
                                                    removeCache(key)
                                                    return
                                            }

                                        }}
                                    >
                                        {pageCache.map(i => {
                                            return <Tabs.TabPane key={i.id} tab={i.verbose}>
                                                {i.node}
                                            </Tabs.TabPane>
                                        })}
                                    </Tabs>}
                                    {/*<div style={{overflow: "auto"}}>*/}
                                    {/*    {ContentByRoute(route)}*/}
                                    {/*</div>*/}
                                </Space>
                            </div>
                        </Content>
                    </Layout>

                </Content>
            </Layout>
        </Layout>
    );
};