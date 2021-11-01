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
import {CopyableField, InputItem, SelectOne, SwitchItem} from "../utils/inputUtil";
import {failed, info, success} from "../utils/notification";
import {QuestionCircleOutlined} from "@ant-design/icons";
import {YakEditor} from "../utils/editors";
import {ExternalUrl, openABSFile} from "../utils/openWebsite";
import {YakLogoData} from "../utils/logo";
import {YakLocalProcess} from "./YakLocalProcess";
import {saveAuthInfo, YakRemoteAuth} from "./YakRemoteAuth";
import {showModal} from "../utils/showModal";
import {divider} from "@uiw/react-md-editor";
import {YakUpgrade} from "../components/YakUpgrade";
import {UserProtocol} from "../App";

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

/**
 *     const [localYakStarted, setLocalYakStarted] = useState(false);
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
 */


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
    const [historySelected, setHistorySelected] = useState(false);
    const [name, setName] = useState("");
    const [allowSave, setAllowSave] = useState(false);
    const [version, setVersion] = useState("-");

    useEffect(() => {
        ipcRenderer.invoke("yakit-version").then(setVersion)
    }, [])

    useEffect(() => {
        // setLocalError("");
        if (mode) {
            props.setMode(mode);
        }
        // setLocalYakStarted(false);

        if (mode !== "local") {
            return
        }

        setHost("127.0.0.1")
    }, [mode])

    const login = (newHost?: string, newPort?: number) => {
        setLoading(true)
        info("正在连接 ... Yak 核心引擎")
        let params = {
            host: newHost || host,
            port: newPort || port,
            password, caPem,
        };
        render.invoke("connect-yak", {...params}).then(() => {
            props.onConnected()
            if (mode === "remote" && allowSave) {
                saveAuthInfo({
                    ...params, tls, name,
                })
            }
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
            <div style={{textAlign: "center", marginTop: 50, marginLeft: 150, marginRight: 150, marginBottom: 100}}>
                <Image src={YakLogoData} preview={false} width={200}/>
                <br/>
                <Text style={{color: "#999"}}>社区专业版：{version}</Text>
                <SelectOne label={" "} colon={false} data={[
                    {value: "local", text: "本地模式（本地启动 Yak gRPC）"},
                    {value: "remote", text: "远程模式（TeamServer 模式）"}
                ]} value={mode} setValue={setMode}/>

                {mode === "local" && <>
                    <YakLocalProcess onConnected={((newPort: any, newHost: any) => {
                        login(newHost, newPort)
                    })}/>
                </>}

                <Form
                    style={{textAlign: "left"}}
                    onSubmitCapture={e => {
                        e.preventDefault()

                        // setLocalYakStarted(false)
                        setLocalLoading(false)

                        login()
                    }} labelCol={{span: 7}} wrapperCol={{span: 12}}>
                    {mode === "remote" && <>
                        <YakRemoteAuth onSelected={(info) => {
                            setHistorySelected(true);
                            setHost(info.host);
                            setPort(info.port);
                            setTls(info.tls);
                            setCaPem(info.caPem);
                            setPassword(info.password);
                        }}/>
                        <SwitchItem value={allowSave} setValue={setAllowSave} label={"保存历史连接"}/>
                        {allowSave && <InputItem
                            label={"连接名"}
                            value={name} setValue={setName}
                            help={"可选，如果填写了，将会保存历史记录，之后可以选择该记录"}
                        />}
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
                        {tls ? <>
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
                        </> : ""}
                    </>}
                    {mode !== "local" && <div style={{textAlign: "center"}}>
                        <Button
                            style={{
                                width: 480, height: 50,
                            }}
                            htmlType={"submit"}
                            type={"primary"}
                        >
                            <p style={{fontSize: 18, marginBottom: 0}}>Yakit 连接 Yak 核心引擎[{host}:{port}]</p>
                        </Button>
                    </div>}
                    <div style={{textAlign: "center"}}>
                        <Space style={{
                            color: '#888',
                            marginBottom: 200,
                        }}>
                            <Button
                                type={"link"}
                                onClick={() => {
                                    let m = showModal({
                                        keyboard: false,
                                        title: "引擎升级管理页面",
                                        width: "60%",
                                        content: <>
                                            <YakUpgrade onFinished={() => {
                                                m.destroy()
                                            }}/>
                                        </>
                                    })
                                }}
                            >
                                <p
                                    style={{marginBottom: 0}}
                                >安装/升级 Yak 引擎</p>
                            </Button>
                            <Button type={"link"} onClick={() => {
                                showModal({
                                    title: "用户协议",
                                    content: <>
                                        {UserProtocol()}
                                    </>
                                })
                            }}>用户协议</Button>
                        </Space>
                    </div>
                </Form>
            </div>
        </Spin>
    }

    return <div>

    </div>
};