import React, {useEffect, useState} from "react";
import {Alert, Button, Card, Divider, Form, PageHeader, Row, Space, Tag, Typography} from "antd";
import {CopyableField, InputItem, SwitchItem} from "../../utils/inputUtil";
import {StartFacadeServerForm, StartFacadeServerParams} from "./StartFacadeServerForm";
import {randomString} from "../../utils/randomUtil";
import {failed, info} from "../../utils/notification";
import {ExecResultLog} from "../invoker/batch/ExecMessageViewer";
import {ExecResult} from "../invoker/schema";
import {ExtractExecResultMessage} from "../../components/yakitLogSchema";
import {useGetState, useMemoizedFn} from "ahooks";
import {ReverseNotificationTable} from "./ReverseNotificationTable";
import {AutoSpin} from "../../components/AutoSpin";
import {getRemoteValue, setRemoteValue} from "../../utils/kv";

export interface ReverseServerPageProp {

}

export interface ReverseNotification {
    uuid: string
    type: string,
    remote_addr: string
    raw?: Uint8Array
    token?: string
    timestamp?: number
}

const {ipcRenderer} = window.require("electron");

const {Text} = Typography;

export const BRIDGE_ADDR = "yak-bridge-addr";
export const BRIDGE_SECRET = "yak-bridge-secret";
export const DNSLOG_INHERIT_BRIDGE = "yakit-DNSLOG_INHERIT_BRIDGE";
export const DNSLOG_ADDR = "yak-dnslog-addr";
export const DNSLOG_SECRET = "yak-dnslog-secret";

export const ReverseServerPage: React.FC<ReverseServerPageProp> = (props) => {
    const [bridge, setBridge] = useState(false);
    const [bridgeLoading, setBridgeLoading] = useState(false);
    const [bridgeIP, setBridgeIP] = useState<string>("");
    const [bridgeAddr, setBridgeAddr] = useState("");
    const [bridgeSecret, setBridgeSecret] = useState("");


    const [params, setParams] = useState<StartFacadeServerParams>({
        ConnectParam: {
            Addr: "", Secret: "",
        },
        DNSLogLocalPort: 53,
        DNSLogRemotePort: 0,
        EnableDNSLogServer: false,
        ExternalDomain: "",
        FacadeRemotePort: 0,
        LocalFacadeHost: "0.0.0.0",
        LocalFacadePort: 4434,
        Verify: false
    });
    const [token, _] = useState(randomString(40));
    const [loading, setLoading] = useState(false);
    const [logs, setLogs, getLogs] = useGetState<ReverseNotification[]>([]);
    const [reverseToken, setReverseToken] = useState(randomString(20));


    useEffect(() => {
        const messages: ReverseNotification[] = [];
        ipcRenderer.on(`${token}-data`, (_, data: ExecResult) => {
            if (!data.IsMessage) {
                return
            }
            try {
                const message = ExtractExecResultMessage(data) as ExecResultLog;
                if (message.level !== "facades-msg") {
                    info(JSON.stringify(message))
                    return
                }
                const obj = JSON.parse(message.data) as ReverseNotification;
                obj.timestamp = message.timestamp;
                messages.unshift(obj)
                if (messages.length > 100) {
                    messages.pop()
                }
            } catch (e) {

            }

        })
        ipcRenderer.on(`${token}-error`, (e: any, data: any) => {
            if (data) {
                failed(`error: ${JSON.stringify(data)}`)
            }
        })
        ipcRenderer.on(`${token}-end`, () => {
            setLoading(false)
        })

        const id = setInterval(() => {
            if (getLogs().length !== messages.length || getLogs().length === 0) {
                setLogs([...messages])
                return
            }

            if (messages.length <= 0) {
                return
            }

            if (messages.length > 0) {
                if (messages[0].uuid !== getLogs()[0].uuid) {
                    setLogs([...messages])
                }
            }
        }, 500)
        return () => {
            clearInterval(id)
            ipcRenderer.invoke("cancel-StartFacades", token)
            ipcRenderer.removeAllListeners(`${token}-end`);
            ipcRenderer.removeAllListeners(`${token}-error`);
            ipcRenderer.removeAllListeners(`${token}-data`);
        }
    }, [token])

    const connectBridge = useMemoizedFn(() => {
        setBridgeLoading(true)
        ipcRenderer.invoke("GetTunnelServerExternalIP", {
            Addr: bridgeAddr, Secret: bridgeSecret,
        }).then((data: { IP: string }) => {
            setRemoteValue(BRIDGE_ADDR, bridgeAddr)
            setRemoteValue(BRIDGE_SECRET, bridgeSecret)
            setBridgeIP(data.IP)
        }).finally(() => {
            setBridgeLoading(false)
        })
    });

    // 设置 Bridge
    useEffect(() => {
        if (!bridgeAddr) {
            getRemoteValue(BRIDGE_ADDR).then((data: string) => {
                if (!!data) {
                    setBridgeAddr(`${data}`)
                }
            })
        }

        if (!bridgeSecret) {
            getRemoteValue(BRIDGE_SECRET).then((data: string) => {
                if (!!data) {
                    setBridgeSecret(`${data}`)
                }
            })
        }
    }, [])


    useEffect(() => {
        setBridgeLoading(true)
        setTimeout(() => {
            connectBridge()
        }, 500)
    }, [])

    useEffect(() => {
        if (!!bridgeIP) {
            setBridge(false)
            setParams({...params, ConnectParam: {Addr: bridgeAddr, Secret: bridgeSecret}})
        }
    }, [bridgeIP])

    return <div>
        <PageHeader
            title={"反连服务器"}
            subTitle={<Space>
                {bridgeIP ? <Tag
                    onClose={() => {
                        setBridge(true)
                        setBridgeIP("")
                    }}
                    closable={true}
                    color={"green"}>公网 <Text strong={true} style={{color: "#229900"}} copyable={true}
                >{bridgeIP}</Text></Tag> : <Form onSubmitCapture={e => e.preventDefault()}>
                    <SwitchItem size={"small"} label={"公网穿透服务"} value={bridge} setValue={setBridge}
                                formItemStyle={{marginBottom: 0}}/>
                </Form>}
                使用协议端口复用技术，同时在一个端口同时实现 HTTP / RMI / HTTPS 等协议的反连
            </Space>}
            extra={<>
                <Space>
                    {loading && <Button
                        danger={true} type={"primary"}
                        onClick={() => {
                            ipcRenderer.invoke("cancel-StartFacades", token)
                        }}
                    >关闭反连</Button>}
                </Space>
            </>}
        >
            {bridge && <Card title={"公网配置"} size={"small"}>
                <AutoSpin spinning={bridgeLoading}>
                    <Space direction={"vertical"}>
                        <Alert type={"success"} message={<Space>
                            <div>
                                在自己的服务器安装 yak 核心引擎，执行 <Text code={true} copyable={true}>yak bridge --secret
                                [your-pass]</Text> 启动
                                Yak Bridge 公网服务 <Divider type={"vertical"}/> <Text style={{color: "#999"}}>yak
                                version {`>=`} v1.0.11-sp9</Text>
                            </div>
                        </Space>}/>
                        <Form onSubmitCapture={e => {
                            e.preventDefault()

                            connectBridge()
                        }} layout={"inline"}>
                            <InputItem label={"公网 Bridge 地址"} value={bridgeAddr} setValue={setBridgeAddr}/>
                            <InputItem label={"密码"} type={"password"} value={bridgeSecret} setValue={setBridgeSecret}/>
                            <Form.Item colon={false} label={" "}>
                                <Button type="primary" htmlType="submit"> 连接公网服务器 </Button>
                            </Form.Item>
                        </Form>
                    </Space>
                </AutoSpin>
            </Card>}
            {loading && <Alert
                type={"info"}
                message={<Space direction={"vertical"}>
                    <Space>
                        本地 RMI 反连 <CopyableField
                        text={`rmi://${bridgeIP && params.ConnectParam?.Addr ? bridgeIP : "127.0.0.1"}:${params.LocalFacadePort}/${reverseToken}`}/>
                    </Space>
                    <Space>
                        本地 HTTP 反连 <CopyableField
                        text={`http://${bridgeIP && params.ConnectParam?.Addr ? bridgeIP : "127.0.0.1"}:${params.LocalFacadePort}/${reverseToken}`}/>
                    </Space>
                    <Space>
                        本地 HTTPS 反连 <CopyableField
                        text={`https://${bridgeIP && params.ConnectParam?.Addr ? bridgeIP : "127.0.0.1"}:${params.LocalFacadePort}/${reverseToken}`}/>
                    </Space>
                </Space>}/>}
        </PageHeader>
        <Row>
            <div style={{width: "100%"}}>
                {loading ? <>
                    <ReverseNotificationTable loading={loading} logs={logs}/>
                </> : <StartFacadeServerForm
                    params={params} setParams={setParams}
                    remoteMode={!!bridgeIP}
                    onSubmit={() => {
                        ipcRenderer.invoke("StartFacades", {
                            ...params,
                            ConnectParam: (!!bridgeIP) ? params.ConnectParam : undefined
                        } as StartFacadeServerParams, token).then(() => {
                            info("开始启动反连服务器")
                            setLoading(true)
                        })
                    }}/>}
            </div>
        </Row>
    </div>
};