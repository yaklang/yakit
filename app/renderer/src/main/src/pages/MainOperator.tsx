import React, {useEffect, useState} from "react";
import {Layout, Menu, Space, Tabs, Image, Button, Tag, Modal, Row, Col, Popconfirm} from "antd";
import {ContentByRoute, Route, RouteMenuData} from "../routes/routeSpec";
import {MenuFoldOutlined, MenuUnfoldOutlined} from "@ant-design/icons"
import {info, success} from "../utils/notification";
import {showDrawer} from "../utils/showModal";
import {CodecPage} from "./codec/CodecPage";
import {YakLogoData} from "../utils/logo";
import {AutoUpdateYakModuleButton, YakVersion} from "../utils/basic";
import {CompletionTotal, setCompletions} from "../utils/monacoSpec/yakCompletionSchema";

export interface MainProp {
    tlsGRPC?: boolean
    addr?: string
    onErrorConfirmed?: () => any
}

const {TabPane} = Tabs;
const {ipcRenderer} = window.require("electron");
const MenuItem = Menu.Item;

const {Header, Footer, Content, Sider} = Layout;

export const Main: React.FC<MainProp> = (props) => {
    const [route, setRoute] = useState(Route.HTTPHacker);
    const [collapsed, setCollapsed] = useState(false);
    const [engineStatus, setEngineStatus] = useState<"ok" | "error">("ok");
    const [status, setStatus] = useState<{ addr: string, isTLS: boolean }>();
    const [hideMenu, setHideMenu] = useState(false);

    useEffect(() => {
        if (engineStatus === "error") {
            props.onErrorConfirmed && props.onErrorConfirmed()
        }
    }, [engineStatus])

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
                            <Space direction={"vertical"} style={{
                                width: "100%",
                            }}>
                                <Menu
                                    theme={"light"} style={{}}
                                    onSelect={(e) => {
                                        if (e.key === "ignore") {
                                            return
                                        }
                                        setRoute(e.key as Route)
                                    }}
                                    mode={"inline"}
                                    // inlineCollapsed={false}
                                >
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
                        </Sider>}
                        <Content style={{
                            overflow: "auto",
                            backgroundColor: "#fff",
                            marginLeft: 12, height: "100%",
                        }}>
                            <div style={{padding: 12, height: "100%"}}>
                                {ContentByRoute(route)}
                            </div>
                        </Content>
                    </Layout>

                </Content>
            </Layout>
        </Layout>
    );
};