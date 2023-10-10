import React, {useEffect, useState} from "react";
import {Alert, Badge, Button, Card, Divider, Form, Popover, Space, Spin, Tag, Timeline, Typography} from "antd";
import {ExecResult} from "../pages/invoker/schema";
import {showDrawer, showModal} from "./showModal";
import {ExecResultLog, ExecResultMessage} from "../pages/invoker/batch/ExecMessageViewer";
import {LogLevelToCode} from "../components/HTTPFlowTable/HTTPFlowTable";
import {YakitLogFormatter} from "../pages/invoker/YakitLogFormatter";
import {InputItem, SwitchItem} from "./inputUtil";
import {useGetState, useMemoizedFn} from "ahooks";
import {ReloadOutlined} from "@ant-design/icons";
import {getRemoteValue, setRemoteValue} from "./kv";
import {
    BRIDGE_ADDR,
    BRIDGE_SECRET,
    DNSLOG_ADDR,
    DNSLOG_INHERIT_BRIDGE,
    DNSLOG_SECRET
} from "../pages/reverse/ReverseServerPage";
import {failed, info} from "./notification";
import {RiskTable} from "../pages/risks/RiskTable";
import {YakExecutorParam} from "../pages/invoker/YakExecutorParams";
import useHoldingIPCRStream from "../hook/useHoldingIPCRStream";
import {randomString} from "./randomUtil";
import {PluginResultUI} from "../pages/yakitStore/viewers/base";
import {AutoCard} from "../components/AutoCard";
import { getReleaseEditionName, isCommunityEdition } from "./envfile";
import {NetInterface} from "@/models/Traffic";

export interface YakVersionProp {

}

const {ipcRenderer} = window.require("electron");

export const callCopyToClipboard = (str: string) => {
    ipcRenderer.invoke("copy-clipboard", str).then(() => {
        info("Copy Finished")
    })
}

export const YakVersion: React.FC<YakVersionProp> = (props) => {
    const [version, setVersion] = useState<string>("dev")
    const [latestVersion, setLatestVersion] = useState("");


    useEffect(() => {
        ipcRenderer.invoke("query-latest-yak-version").then((data: string) => {
            setLatestVersion(data)
        }).catch(() => {
        }).finally(
        )

        ipcRenderer.on("fetch-yak-version-callback", async (e: any, data) => {
            setVersion(data)
        })

        ipcRenderer.invoke("fetch-yak-version")
        return () => {
            ipcRenderer.removeAllListeners("fetch-yak-version-callback")
        }
    }, [])

    if (!version) {
        return <Spin tip={"正在加载 yak 版本"}/>
    }
    const isDev = version.toLowerCase().includes("dev");

    const newVersion = latestVersion !== "" && latestVersion !== version

    if (!newVersion) {
        return <Tag color={isDev ? "red" : "geekblue"}>
            Yak-{version}
        </Tag>
    }

    return <div>
        <Badge dot={newVersion}>
            <Button size={"small"} type={"primary"}
                    onClick={() => {
                        if (!newVersion) {
                            return
                        }

                        showModal({
                            title: "有新的 Yak 核心引擎可升级！",
                            content: <>
                                如果你现在不是很忙
                                <br/>
                                我们推荐您退出当前引擎，点击欢迎界面的
                                <br/>
                                "安装/升级 Yak 引擎" 来免费升级
                            </>
                        })
                    }}>
                Yak-{version}
            </Button>
        </Badge>
    </div>
};

export const YakitVersion: React.FC<YakVersionProp> = (props) => {
    const [version, setVersion] = useState<string>("dev")
    const [latestVersion, setLatestVersion] = useState("");

    useEffect(() => {
        ipcRenderer.invoke("query-latest-yakit-version").then(nv => {
            setLatestVersion(nv)
        })
        ipcRenderer.invoke("yakit-version").then(v => setVersion(`v${v}`))
    }, [])

    if (!version) {
        return <Spin tip={"正在加载 yakit 版本"}/>
    }
    const isDev = version.toLowerCase().includes("dev");
    const newVersion = latestVersion !== "" && latestVersion !== version

    if (!newVersion) {
        return <Tag color={isDev ? "red" : "geekblue"}>
            {getReleaseEditionName()}-{version}
        </Tag>
    }

    return <div>
        <Badge dot={newVersion}>
            <Button size={"small"} type={"primary"} onClick={() => {
                if (!newVersion) {
                    return
                }

                showModal({
                    title: `有新的 ${getReleaseEditionName()} 版本可升级！`,
                    content: <>
                        如果你现在不是很忙
                        <br/>
                        {/* 我们推荐您进入 <Button
                        type={"primary"}
                        onClick={() => {
                            openExternalWebsite("https://github.com/yaklang/yakit/releases")
                        }}
                    >Yakit Github 发布界面</Button> 下载最新版并升级！ */}
                        我们推荐您点击右上角退出到启用页升级最新版
                    </>
                })
            }}>
                {getReleaseEditionName()}-{version}
            </Button>
        </Badge>
    </div>
};

export interface AutoUpdateYakModuleViewerProp {

}

export const AutoUpdateYakModuleViewer: React.FC<AutoUpdateYakModuleViewerProp> = (props) => {
    const [end, setEnd] = useState(false);
    const [error, setError] = useState("");
    const [msg, setMsgs] = useState<ExecResultMessage[]>([]);

    useEffect(() => {
        const messages: ExecResultMessage[] = []
        ipcRenderer.on("client-auto-update-yak-module-data", (e, data: ExecResult) => {
            if (data.IsMessage) {
                try {
                    let obj: ExecResultMessage = JSON.parse(Buffer.from(data.Message).toString("utf8"));
                    messages.unshift(obj)
                } catch (e) {

                }
            }
        });
        ipcRenderer.on("client-auto-update-yak-module-end", (e) => {
            setEnd(true)

        });
        ipcRenderer.on("client-auto-update-yak-module-error", (e, msg: any) => {
            setError(`${msg}`)
        });
        ipcRenderer.invoke("auto-update-yak-module")
        let id = setInterval(() => setMsgs([...messages]), 1000)
        return () => {
            clearInterval(id);
            ipcRenderer.removeAllListeners("client-auto-update-yak-module-data")
            ipcRenderer.removeAllListeners("client-auto-update-yak-module-error")
            ipcRenderer.removeAllListeners("client-auto-update-yak-module-end")
        }
    }, [])

    return <Card title={"自动更新进度"}>
        <Space direction={"vertical"} style={{width: "100%"}} size={12}>
            {error && <Alert type={"error"} message={error}/>}
            {end && <Alert type={"info"} message={"更新进程已结束"}/>}
            <Timeline pending={!end} style={{marginTop: 20}}>
                {(msg || []).filter(i => i.type === "log").map(i => i.content as ExecResultLog).map(e => {
                    return <Timeline.Item color={LogLevelToCode(e.level)}>
                        <YakitLogFormatter data={e.data} level={e.level} timestamp={e.timestamp}/>
                    </Timeline.Item>
                })}
            </Timeline>
        </Space>
    </Card>;
};

const {Text} = Typography;

export const ConfigGlobalReverse = React.memo(() => {
    const [addr, setAddr, getAddr] = useGetState("");
    const [password, setPassword, getPassword] = useGetState("");
    const [localIP, setLocalIP, getLocalIP] = useGetState("");
    const [ifaces, setIfaces] = useState<NetInterface[]>([]);
    const [ok, setOk] = useState(false)

    // dnslog 配置
    const [inheritBridge, setInheritBridge] = useState(false);
    const [dnslogAddr, setDNSLogAddr] = useState("ns1.cybertunnel.run:64333");
    const [dnslogPassword, setDNSLogPassword] = useState("");

    const getStatus = useMemoizedFn(() => {
        ipcRenderer.invoke("get-global-reverse-server-status").then((r) => {
            setOk(r)
            setRemoteValue(BRIDGE_ADDR, addr)
            setRemoteValue(BRIDGE_SECRET, password)
        })
    })

    useEffect(() => {
        getStatus()
        let id = setInterval(() => {
            getStatus()
        }, 1000)
        return () => {
            clearInterval(id)
        }
    }, [])

    useEffect(() => {
        if (!inheritBridge) {
            setDNSLogPassword("")
            setDNSLogAddr("ns1.cybertunnel.run:64333")
        }
    }, [inheritBridge])

    const cancel = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-global-reverse-server-status").finally(() => {
            getStatus()
        })
    });
    const login = useMemoizedFn(() => {
        ipcRenderer.invoke("ConfigGlobalReverse", {
            ConnectParams: {Addr: addr, Secret: password},
            LocalAddr: localIP,
        }).then(() => {
            getStatus()
            if (inheritBridge) {
                ipcRenderer.invoke("SetYakBridgeLogServer", {
                    DNSLogAddr: addr, DNSLogSecret: password,
                }).then(() => {
                    info("配置全局 DNSLog 生效")
                }).catch(e => {
                    failed(`配置全局 DNSLog 失败：${e}`)
                })
            } else {
                setRemoteValue(DNSLOG_ADDR, dnslogAddr)
                setRemoteValue(DNSLOG_SECRET, dnslogPassword)
                ipcRenderer.invoke("SetYakBridgeLogServer", {
                    DNSLogAddr: dnslogAddr, DNSLogSecret: dnslogPassword,
                }).then(() => {
                    info("配置全局 DNSLog 生效")
                }).catch(e => {
                    failed(`配置全局 DNSLog 失败：${e}`)
                })
            }
        }).catch(e => {
            failed(`Config Global Reverse Server failed: ${e}`)
        })
    })

    // 设置 Bridge
    useEffect(() => {
        getRemoteValue(BRIDGE_ADDR).then((data: string) => {
            if (!!data) {
                setAddr(`${data}`)
            }
        })

        getRemoteValue(BRIDGE_SECRET).then((data: string) => {
            if (!!data) {
                setPassword(`${data}`)
            }
        })

        getRemoteValue(DNSLOG_INHERIT_BRIDGE).then(data => {
            switch (`${data}`) {
                case "true":
                    setInheritBridge(true)
                    return
                case "false":
                    setInheritBridge(false)
                    getRemoteValue(DNSLOG_ADDR).then((data: string) => {
                        if (!!data) {
                            setDNSLogAddr(`${data}`)
                        }
                    })
                    getRemoteValue(DNSLOG_SECRET).then((data: string) => {
                        if (!!data) {
                            setDNSLogPassword(`${data}`)
                        }
                    })
                    return
            }
        })

        return () => {
            // cancel()
        }
    }, [])

    // // 如果 addr 和 password 都存在，且没有连接，则马上连接一次
    // useEffect(() => {
    //     // 如果已经连上就退出
    //     if (ok) {
    //         return
    //     }
    //
    //     if (!!addr && !!password) {
    //         login()
    //         let id = setInterval(() => {
    //             login()
    //         }, 1000)
    //         return () => {
    //             clearInterval(id)
    //         }
    //     }
    // }, [addr, password, ok])

    const updateIface = useMemoizedFn(() => {
        ipcRenderer.invoke("AvailableLocalAddr", {}).then((data: { Interfaces: NetInterface[] }) => {
            const arr = (data.Interfaces || []).filter(i => i.IP !== "127.0.0.1");
            setIfaces(arr)
        })
    })

    useEffect(() => {
        if (ifaces.length === 1) {
            setLocalIP(ifaces[0].IP)
        }
    }, [ifaces])

    useEffect(() => {
        ipcRenderer.on("global-reverse-error", (e, data) => {
            failed(`全局反连配置失败：${data}`)
        })
        return () => {
            ipcRenderer.removeAllListeners("global-reverse-error")
        }
    }, [])

    return <div>
        <Form
            style={{marginTop: 20}}
            onSubmitCapture={e => {
                e.preventDefault()

                login()
                setRemoteValue(DNSLOG_INHERIT_BRIDGE, `${inheritBridge}`)
            }} labelCol={{span: 5}} wrapperCol={{span: 14}}>
            <InputItem
                label={"本地反连 IP"}
                value={localIP} disable={ok}
                setValue={setLocalIP}
                autoComplete={ifaces.filter((item) => !!item.IP).map((item) => item.IP)}
                help={<div>
                    <Button type={"link"} size={"small"} onClick={() => {
                        updateIface()
                    }} icon={<ReloadOutlined/>}>
                        更新 yak 引擎本地 IP
                    </Button>
                </div>}
            />
            <Divider orientation={"left"}>公网反连配置</Divider>
            <Form.Item label={" "} colon={false}>
                <Alert message={<Space direction={"vertical"}>
                    <div>在公网服务器上运行</div>
                    <Text code={true} copyable={true}>yak bridge --secret [your-password]</Text>
                    <div>或</div>
                    <Text code={true} copyable={true}>
                        docker run -it --rm --net=host v1ll4n/yak-bridge yak bridge --secret
                        [your-password]
                    </Text>
                    <div>已配置</div>
                </Space>}/>
            </Form.Item>
            <InputItem
                label={"Yak Bridge 地址"} value={addr}
                setValue={setAddr} disable={ok}
                help={"格式 host:port, 例如 cybertunnel.run:64333"}
            />
            <InputItem
                label={"Yak Bridge 密码"}
                setValue={setPassword} value={password}
                type={"password"} disable={ok}
                help={`yak bridge 命令的 --secret 参数值`}
            />
            <Divider orientation={"left"}>{isCommunityEdition()&&'Yakit'} 全局 DNSLog 配置</Divider>
            <SwitchItem
                label={"复用 Yak Bridge 配置"} disabled={ok}
                value={inheritBridge} setValue={setInheritBridge}/>
            {!inheritBridge && <InputItem
                label={"DNSLog 配置"} disable={ok}
                value={dnslogAddr}
                help={"配置好 Yak Bridge 的 DNSLog 系统的地址：[ip]:[port]"}
                setValue={setDNSLogAddr}
            />}
            {!inheritBridge && <InputItem
                label={"DNSLog 密码"} disable={ok}
                value={dnslogPassword}
                setValue={setDNSLogPassword}
            />}
            <Form.Item colon={false} label={" "}>
                <Button type="primary" htmlType="submit" disabled={ok}> 配置反连 </Button>
                {ok && <Button type="primary" danger={true} onClick={() => {
                    cancel()
                }}> 停止 </Button>}
            </Form.Item>
        </Form>
    </div>
});

interface YakScriptParam {
    Script: string
    Params: YakExecutorParam[]
}

export const startExecYakCode = (
    verbose: string,
    params: YakScriptParam) => {
    let m = showModal({
        width: "60%", maskClosable: false,
        title: `正在执行：${verbose}`,
        content: <div style={{height: 400, overflowY: "auto"}}>
            <AutoCard bodyStyle={{overflowY: "auto"}}>
                <StartToExecYakScriptViewer script={params} verbose={verbose}/>
            </AutoCard>
        </div>
    })
}

const StartToExecYakScriptViewer = React.memo((props: {
    verbose: string,
    script: YakScriptParam,
}) => {
    const {script, verbose} = props;
    const [token, setToken] = useState(randomString(40));
    const [loading, setLoading] = useState(true);
    const [infoState, {reset, setXtermRef}] = useHoldingIPCRStream(
        verbose, "ExecYakCode",
        token, () => setTimeout(() => setLoading(false), 300),
        () => {
            ipcRenderer.invoke("ExecYakCode", script, token).then(() => {
                info(`执行 ${verbose} 成功`)
            }).catch(e => {
                failed(`执行 ${verbose} 遇到问题：${e}`)
            })
        }
    )

    return (
        <PluginResultUI
            loading={loading} defaultConsole={false}
            statusCards={infoState.statusState}
            risks={infoState.riskState}
            featureType={infoState.featureTypeState}
            feature={infoState.featureMessageState}
            progress={infoState.processState}
            results={infoState.messageState}
            onXtermRef={setXtermRef}
        />
    )
})

export const IsWindows = () => {
    return ipcRenderer.invoke("is-windows")
}