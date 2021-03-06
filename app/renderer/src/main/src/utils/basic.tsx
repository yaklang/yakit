import React, {useEffect, useState} from "react";
import {Alert, Badge, Button, Card, Divider, Form, Popover, Space, Spin, Tag, Timeline, Typography} from "antd";
import {ExecResult} from "../pages/invoker/schema";
import {showDrawer, showModal} from "./showModal";
import {ExecResultLog, ExecResultMessage} from "../pages/invoker/batch/ExecMessageViewer";
import {LogLevelToCode} from "../components/HTTPFlowTable";
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

export interface YakVersionProp {

}

const {ipcRenderer} = window.require("electron");

interface ReverseDetail {
    PublicReverseIP: string
    PublicReversePort: number
    LocalReverseAddr: string
    LocalReversePort: number
}

export const ReversePlatformStatus = React.memo(() => {
    const [ok, setOk] = useState(false)
    const [details, setDetails] = useState<ReverseDetail>({
        LocalReverseAddr: "",
        LocalReversePort: 0,
        PublicReverseIP: "",
        PublicReversePort: 0
    });

    useEffect(() => {
        const update = () => {
            ipcRenderer.invoke("get-global-reverse-server-status").then((a: boolean) => {
                setOk(a)
            }).catch(e => {
                console.info(e)
            })
        }

        let id = setInterval(() => {
            update()
        }, 1000)
        return () => {
            clearInterval(id)
        }
    }, [])

    useEffect(() => {
        if (!ok) {
            setDetails({LocalReverseAddr: "", LocalReversePort: 0, PublicReverseIP: "", PublicReversePort: 0})
            return
        }
    }, [ok])

    useEffect(() => {
        if (details.PublicReverseIP === "") {
            let id = setInterval(() => {
                ipcRenderer.invoke("GetGlobalReverseServer", {}).then((data: ReverseDetail) => {
                    setDetails(data)
                })
            }, 1000)
            return () => {
                clearInterval(id)
            }
        }
    }, [details])

    useEffect(() => {
        getRemoteValue(BRIDGE_ADDR).then(addr => {
            getRemoteValue(BRIDGE_SECRET).then(secret => {
                ipcRenderer.invoke("ConfigGlobalReverse", {
                    ConnectParams: {Addr: addr, Secret: secret},
                    LocalAddr: "",
                }).then((a: any) => {
                    console.info("????????????", a)
                }).catch(e => {
                    console.info(e)
                })

                getRemoteValue(DNSLOG_INHERIT_BRIDGE).then(data => {
                    switch (`${data}`) {
                        case "true":
                            ipcRenderer.invoke("SetYakBridgeLogServer", {
                                DNSLogAddr: addr, DNSLogSecret: `${secret}`,
                            }).then(() => {
                                info("???????????? DNSLog ??????")
                            }).catch(e => {
                                failed(`???????????? DNSLog ?????????${e}`)
                            })
                            break
                        case "false":
                            getRemoteValue(DNSLOG_ADDR).then((dnslogAddr: string) => {
                                if (!!dnslogAddr) {
                                    getRemoteValue(DNSLOG_SECRET).then((secret: string) => {
                                        ipcRenderer.invoke("SetYakBridgeLogServer", {
                                            DNSLogAddr: addr, DNSLogSecret: `${secret}`,
                                        }).then(() => {
                                            info("???????????? DNSLog ??????")
                                        }).catch(e => {
                                            failed(`???????????? DNSLog ?????????${e}`)
                                        })
                                    })
                                }
                            })
                            break
                    }
                })
            })
        })

    }, [])

    const flag = (ok && !!details.PublicReverseIP && !!details.PublicReversePort);
    return <Popover visible={ok ? undefined : false} content={<div>
        <Space direction={"vertical"}>
            <Text copyable={true}>{`rmi://${details.PublicReverseIP}:${details.PublicReversePort}`}</Text>
            <Text copyable={true}>{`http://${details.PublicReverseIP}:${details.PublicReversePort}`}</Text>
            <Text copyable={true}>{`https://${details.PublicReverseIP}:${details.PublicReversePort}`}</Text>
        </Space>
    </div>} title={"??????????????????"}>
        <Tag
            onClick={() => {
                showDrawer({
                    title: "Vulnerabilities && Risks",
                    width: "70%",
                    content: <>
                        <RiskTable/>
                    </>
                })
            }}
            color={flag ? "green" : "red"}
        >{flag
            ? `????????????:${details.PublicReverseIP}:${details.PublicReversePort}`
            :
            "?????????????????????"
        }</Tag>
    </Popover>
})

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

        ipcRenderer.on("client-yak-version", async (e: any, data) => {
            setVersion(data)
        })

        ipcRenderer.invoke("yak-version")
        return () => {
            ipcRenderer.removeAllListeners("client-yak-version")
        }
    }, [])

    if (!version) {
        return <Spin tip={"???????????? yak ??????"}/>
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
                            title: "????????? Yak ????????????????????????",
                            content: <>
                                ???????????????????????????
                                <br/>
                                ?????????????????????????????????????????????????????????
                                <br/>
                                "??????/?????? Yak ??????" ???????????????
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
        return <Spin tip={"???????????? yakit ??????"}/>
    }
    const isDev = version.toLowerCase().includes("dev");
    const newVersion = latestVersion !== "" && latestVersion !== version

    if (!newVersion) {
        return <Tag color={isDev ? "red" : "geekblue"}>
            Yakit-{version}
        </Tag>
    }

    return <div>
        <Badge dot={newVersion}>
            <Button size={"small"} type={"primary"} onClick={() => {
                if (!newVersion) {
                    return
                }

                showModal({
                    title: "????????? Yakit ??????????????????",
                    content: <>
                        ???????????????????????????
                        <br/>
                        {/* ????????????????????? <Button
                        type={"primary"}
                        onClick={() => {
                            openExternalWebsite("https://github.com/yaklang/yakit/releases")
                        }}
                    >Yakit Github ????????????</Button> ??????????????????????????? */}
                        ???????????????????????????????????????????????????????????????
                    </>
                })
            }}>
                Yakit-{version}
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

    return <Card title={"??????????????????"}>
        <Space direction={"vertical"} style={{width: "100%"}} size={12}>
            {error && <Alert type={"error"} message={error}/>}
            {end && <Alert type={"info"} message={"?????????????????????"}/>}
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

interface NetInterface {
    Name: string
    Addr: string
    IP: string
}

export const ConfigGlobalReverse = React.memo(() => {
    const [addr, setAddr, getAddr] = useGetState("");
    const [password, setPassword, getPassword] = useGetState("");
    const [localIP, setLocalIP, getLocalIP] = useGetState("");
    const [ifaces, setIfaces] = useState<NetInterface[]>([]);
    const [ok, setOk] = useState(false)

    // dnslog ??????
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
                    info("???????????? DNSLog ??????")
                }).catch(e => {
                    failed(`???????????? DNSLog ?????????${e}`)
                })
            } else {
                setRemoteValue(DNSLOG_ADDR, dnslogAddr)
                setRemoteValue(DNSLOG_SECRET, dnslogPassword)
                ipcRenderer.invoke("SetYakBridgeLogServer", {
                    DNSLogAddr: dnslogAddr, DNSLogSecret: dnslogPassword,
                }).then(() => {
                    info("???????????? DNSLog ??????")
                }).catch(e => {
                    failed(`???????????? DNSLog ?????????${e}`)
                })
            }
        }).catch(e => {
            failed(`Config Global Reverse Server failed: ${e}`)
        })
    })

    // ?????? Bridge
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

    // // ?????? addr ??? password ???????????????????????????????????????????????????
    // useEffect(() => {
    //     // ???????????????????????????
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
            failed(`???????????????????????????${data}`)
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
                label={"???????????? IP"}
                value={localIP} disable={ok}
                setValue={setLocalIP}
                help={<div>
                    <Button type={"link"} size={"small"} onClick={() => {
                        updateIface()
                    }} icon={<ReloadOutlined/>}>
                        ?????? yak ???????????? IP
                    </Button>
                </div>}
            />
            <Divider orientation={"left"}>??????????????????</Divider>
            <Form.Item label={" "} colon={false}>
                <Alert message={<Space direction={"vertical"}>
                    <div>???????????????????????????</div>
                    <Text code={true} copyable={true}>yak bridge --secret [your-password]</Text>
                    <div>???</div>
                    <Text code={true} copyable={true}>
                        docker run -it --rm --net=host v1ll4n/yak-bridge yak bridge --secret
                        [your-password]
                    </Text>
                    <div>?????????</div>
                </Space>}/>
            </Form.Item>
            <InputItem
                label={"Yak Bridge ??????"} value={addr}
                setValue={setAddr} disable={ok}
                help={"?????? host:port, ?????? cybertunnel.run:64333"}
            />
            <InputItem
                label={"Yak Bridge ??????"}
                setValue={setPassword} value={password}
                type={"password"} disable={ok}
                help={`yak bridge ????????? --secret ?????????`}
            />
            <Divider orientation={"left"}>Yakit ?????? DNSLog ??????</Divider>
            <SwitchItem
                label={"?????? Yak Bridge ??????"} disabled={ok}
                value={inheritBridge} setValue={setInheritBridge}/>
            {!inheritBridge && <InputItem
                label={"DNSLog ??????"} disable={ok}
                value={dnslogAddr}
                help={"????????? Yak Bridge ??? DNSLog ??????????????????[ip]:[port]"}
                setValue={setDNSLogAddr}
            />}
            {!inheritBridge && <InputItem
                label={"DNSLog ??????"} disable={ok}
                value={dnslogPassword}
                setValue={setDNSLogPassword}
            />}
            <Form.Item colon={false} label={" "}>
                <Button type="primary" htmlType="submit" disabled={ok}> ???????????? </Button>
                {ok && <Button type="primary" danger={true} onClick={() => {
                    cancel()
                }}> ?????? </Button>}
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
        title: `???????????????${verbose}`,
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
                info(`?????? ${verbose} ??????`)
            }).catch(e => {
                failed(`?????? ${verbose} ???????????????${e}`)
            })
        }
    )

    return (
        <PluginResultUI
            loading={loading} defaultConsole={false}
            statusCards={infoState.statusState}
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