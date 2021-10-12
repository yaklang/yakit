import React, {useEffect, useState} from "react";
import {IpcRenderer} from "electron";
import {
    Alert,
    Button,
    Card,
    Form, Image,
    Typography,
    Input,
    InputNumber,
    notification,
    Popconfirm,
    Popover,
    Space, Spin,
    Tabs,
    Tag,
    Tooltip, Modal
} from "antd";
import {InputItem, SelectOne, SwitchItem} from "../utils/inputUtil";
import {failed, info, success} from "../utils/notification";
import {QuestionCircleOutlined} from "@ant-design/icons";
import {YakEditor} from "../utils/editors";
import {ExternalUrl} from "../utils/openWebsite";
import {YakLogoData} from "../utils/logo";

const {Text, Title, Paragraph} = Typography;

export interface YakEnvironmentProp {
    onConnected: () => any
    onAddrChanged: (addr: string) => any
    onTlsGRPC: (tlsGRPC: boolean) => any
    setMode: (mode: "remote" | "local") => any
}

const FormItem = Form.Item;
const {ipcRenderer} = window.require("electron");
const render: IpcRenderer = ipcRenderer;

const pemPlaceHolder = `-----BEGIN CERTIFICATE-----
MIIDDjCCAfagAwIBAgIQdtJUoUlZeG+SAmgFo8TjpzANBgkqhkiG9w0BAQsFADAg
MR4wHAYDVQQDExVZYWtpdCBUZWFtU2VydmVyIFJvb3QwIBcNOTkxMjMxMTYwMDAw
WhgPMjEyMDA3MjkxMzIxMjJaMCAxHjAcBgNVBAMTFVlha2l0IFRlYW1TZXJ2ZXIg
Um9vdDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAMBs74NyAc38Srpy
j/rxFP4IICXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXZweuZ/nfV2
yj/9ECvP495b863Dxj/Lc+OfUO7sUILi7fRH3h201JFAqdQ0vtDsHwJI6HrLExst
hyKdO7gFPvht5orIXE5a4GLotoV1m1zh+T19NwZPGR7dkHN9U9WPlrPosl4lFNUI
EiGjjTexoYYfEpp8ROSLLTBRIio8zTzOW1TgNUeGDhjpD4Guys1YMaLX3nzbX6az
YkImVaZYkXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXZlocoTjglw2
P4XpcL0CAwEAAaXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXEB/wQFMAMBAf8w
HQYDVR0OBBYEFFdzdAPrxAja7GXXXXXXXXXXXXXXXXXXXXqGSIb3DQEBCwUAA4IB
AQCdc9dS0E0m4HLwUCCKAXXXXXXXXXXXXXXXXXXXXXXX1222222222oJ2iU3dzd6
PAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXae5a11129ateQEHPJ0JhdlsbqQ
FyTuYOijovSFVNuLuFj3WHrFOp5gY7Pl0V7lPHSiOAjVG4mg8PGGKivwyyv23nw+
Mx5C8WSoRFWx5H0afXDHptF4rq5bI/djg04VM5ibI5GJ3i1EybBpbGj3rRBY+sF9
FRmP2Nx+zifhMNe300xfHzqNeN3D+Uix6+GOkBoYI65KNPGqwi8uy9HlJVx3Jkht
WOG+9PGLcr4IRJx5LUEZ5FB1
-----END CERTIFICATE-----`

export const YakEnvironment: React.FC<YakEnvironmentProp> = (props) => {
    const [connected, setConnected] = useState(false);
    const [host, setHost] = useState("127.0.0.1");
    const [port, setPort] = useState(8087);
    const [tls, setTls] = useState(false);
    const [password, setPassword] = useState("");
    const [caPem, setCaPem] = useState("");
    const [mode, setMode] = useState<"local" | "remote">("local");
    const [loading, setLoading] = useState(false);
    const [localLoading, setLocalLoading] = useState(false);
    const [localYakStarted, setLocalYakStarted] = useState(false);
    const [localError, setLocalError] = useState<React.ReactNode>();

    const startError = () => {
        setLocalError(<>
            <Card title={"启动 Yak 异常"}
                  style={{backgroundColor: "rgba(255,244,223,0)"}}
                  bordered={false} hoverable={true}
            >
                <p style={{fontSize: 12, color: "red"}}>yakit 需要 yak gRPC 服务器才可以启动</p>
                <br/>
                请检查：<br/>
                1. Yak 是否正常安装？yak 是否在环境变量中？ <br/>
                2. 可以尝试执行一下：<Text mark={true} copyable={true}>yak grpc --port {port || "[可用端口]"}</Text> 看是否可以正常启动
                <br/>
                <br/>
                如果需要安装 yak 核心请参考 <ExternalUrl url={"http://www.yaklang.io/docs/startup"} title={"Yaklang.io 安装引导"}/>
                <br/>
                <Tabs>
                    <Tabs.TabPane key={"macos-linux"} tab={"MacOS / Linux 一键安装"}>
                        <Text mark={true} copyable={true}>
                            {"bash <(curl -s http://oss.yaklang.io/install-latest-yak.sh)"}
                        </Text>
                    </Tabs.TabPane>
                    <Tabs.TabPane key={"windows"} tab={"Windows 一键安装"}>
                        <Text mark={true} copyable={true}>
                            {"powershell (new-object System.Net.WebClient).DownloadFile('https://yaklang.oss-cn-beijing.aliyuncs.com/yak/latest/yak_windows_amd64.exe','yak_windows_amd64.exe') && yak_windows_amd64.exe install && del /f yak_windows_amd64.exe"}
                        </Text>
                    </Tabs.TabPane>
                </Tabs>
                <br/>
                <p style={{fontSize: 12, color: "red"}}>
                    如果安装遇到问题，请务必参考官网安装流程 <ExternalUrl url={"http://www.yaklang.io/docs/startup"}
                                                      title={"Yaklang.io 安装引导"}/>
                </p>
            </Card>
        </>)
        setLocalYakStarted(false)
    }

    useEffect(() => {
        setLocalError("");
        if (mode) {
            props.setMode(mode);
        }
        setLocalYakStarted(false);

        if (mode !== "local") {
            return
        }
        setHost("127.0.0.1")

        // 直接直接启动本地服务器
        setLocalLoading(true)
        ipcRenderer.invoke("start-local-yak-grpc-server").then(port => {
            if (!port) {
                startError()
                return
            }
            success("获取本地 yak gRPC 端口为: " + `${port}`)
            setPort(port)
            setLocalYakStarted(true)
        }).catch(r => {
            failed(`启动本地 yak gRPC 服务器失败: ` + `${r}`)
            setLocalYakStarted(false)
        }).finally(() => setTimeout(() => setLocalLoading(false), 300))

        ipcRenderer.on("client-start-local-grpc-failed", async (e) => {
            startError()
        })
        return () => {
            ipcRenderer.removeAllListeners("client-start-local-grpc-failed")
        }

    }, [mode])

    const login = () => {
        setLoading(true)
        info("正在连接 ... Yak 核心引擎")
        render.invoke("connect-yak", {
            host, port, password, caPem,
        }).then(() => {
            props.onConnected()
        }).catch(e => {
            notification["error"]({message: "设置 Yak gRPC 引擎地址失败"})
        }).finally(() => {
            (() => setTimeout(() => setLoading(false), 300))()
        })
    }

    if (!connected) {
        return <Spin
            spinning={localLoading}
        >
            <div style={{textAlign: "center", marginTop: 50, marginLeft: 150, marginRight: 150}}>
                <Image src={YakLogoData} preview={false} width={200}/>
                <br/>
                <Text style={{color: "#999"}}>技术预览版 - 技术预览并不代表最终版本</Text>
                <SelectOne label={" "} colon={false} data={[
                    {value: "local", text: "本地模式（本地启动 Yak gRPC）"},
                    {value: "remote", text: "远程模式（TeamServer 模式）"}
                ]} value={mode} setValue={setMode}/>
                <Form
                    style={{textAlign: "left"}}
                    onSubmitCapture={e => {
                        e.preventDefault()
                        setLocalYakStarted(false)
                        setLocalLoading(false)

                        login()
                    }} labelCol={{span: 7}} wrapperCol={{span: 14}}>

                    {mode === "local" && <>
                        <div style={{textAlign: "left"}}>
                            <FormItem label={"服务器启动"}>
                                {!localYakStarted ? <>
                                    {localError === "" ? <Spin tip={"正在启动..."}/> :
                                        <Alert type={"error"} message={localError}/>}
                                </> : <Card bordered={true}>
                                    <h3>
                                        本地 yak gRPC 已启动: {`${host}:${port}`}
                                    </h3>
                                </Card>}

                            </FormItem>
                        </div>
                    </>}
                    {mode === "remote" && <>
                        <FormItem label={"Yak gRPC 主机地址"}>
                            <Input value={host} onChange={e => {
                                setHost(e.target.value)
                                props.onAddrChanged(`${e.target.value}:${port}`)
                            }} style={{width: "100%"}}/>
                        </FormItem>
                        <FormItem label={"Yak gRPC 端口"}>
                            <InputNumber
                                min={1} max={65535}
                                value={port}
                                style={{width: "100%"}}
                                onChange={e => {
                                    setPort(e)
                                    props.onAddrChanged(`${host}:${e}`)
                                }}
                            />
                        </FormItem>
                        <SwitchItem label={"启用通信加密认证TLS"} value={tls} setValue={e => {
                            setTls(e)
                            props.onTlsGRPC(e)
                        }}/>
                        {tls && <>
                            <Form.Item
                                required={true} label={<div>
                                gRPC Root-CA 证书(PEM)
                                <Popover content={<div style={{width: 500}}>
                                    <Space direction={"vertical"} style={{width: "100%"}}>
                                        <div>需要 PEM 格式的证书</div>
                                        <div>在通过 <Tag>yak grpc --tls</Tag> 启动核心服务器的时候，会把 RootCA 打印到屏幕上，复制到该输入框即可：</div>
                                        <br/>
                                        <div>例如如下内容：</div>
                                        <div style={{width: 500, height: 400}}>
                                            <YakEditor readOnly={true} value={pemPlaceHolder}/>
                                        </div>
                                    </Space>
                                </div>}>
                                    <Button
                                        style={{color: "#2f74d0"}}
                                        icon={<QuestionCircleOutlined/>}
                                        type={"link"} ghost={true}
                                    />
                                </Popover>
                            </div>}
                            >
                                <div style={{height: 420}}>
                                    <YakEditor
                                        value={caPem} setValue={setCaPem} type={"pem"}
                                    />
                                </div>
                            </Form.Item>
                            <InputItem
                                label={"密码"}
                                setValue={setPassword}
                                value={password}
                                type={"password"}
                            />
                        </>}
                    </>}
                    <div style={{textAlign: "center"}}>
                        <Button
                            style={{
                                width: 480, height: 50
                            }}
                            htmlType={"submit"}
                            type={"primary"}
                        >
                            <p style={{fontSize: 18, marginBottom: 0}}>Yakit 连接 Yak 核心引擎[{host}:{port}]</p>
                        </Button>
                    </div>
                </Form>
            </div>
        </Spin>
    }

    return <div>

    </div>
};