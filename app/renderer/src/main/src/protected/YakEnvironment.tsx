import React, {useEffect, useState} from "react";
import {Button, Form, Image, Input, InputNumber, notification, Popover, Space, Spin, Tag, Typography} from "antd";
import {InputItem, SelectOne, SwitchItem} from "../utils/inputUtil";
import {QuestionCircleOutlined} from "@ant-design/icons";
import {YakEditor} from "../utils/editors";
import {YakLogoBanner} from "../utils/logo";
import {YakLocalProcess, yakProcess} from "./YakLocalProcess";
import {saveAuthInfo, YakRemoteAuth} from "./YakRemoteAuth";
import {showModal} from "../utils/showModal";
import {YakUpgrade} from "../components/YakUpgrade";
import {UserProtocol} from "../App";
import {YakitUpgrade} from "../components/YakitUpgrade";

const {Text, Title, Paragraph} = Typography;

export interface YakEnvironmentProp {
    onConnected: () => any
    onAddrChanged: (addr: string) => any
    onTlsGRPC: (tlsGRPC: boolean) => any
    setMode: (mode: "remote" | "local") => any
}

const FormItem = Form.Item;
const {ipcRenderer} = window.require("electron");
const render = ipcRenderer;

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


const YakEnvironment: React.FC<YakEnvironmentProp> = (props) => {
    const [connected, setConnected] = useState(false);
    const [host, setHost] = useState("127.0.0.1");
    const [port, setPort] = useState(8087);
    const [tls, setTls] = useState(false);
    const [password, setPassword] = useState("");
    const [caPem, setCaPem] = useState("");
    const [mode, setMode] = useState<"local" | "remote">("local");
    const [localLoading, setLocalLoading] = useState(false);
    const [historySelected, setHistorySelected] = useState(false);
    const [name, setName] = useState("");
    const [allowSave, setAllowSave] = useState(false);
    const [version, setVersion] = useState("-");
    const [existedProcess, setExistedProcesses] = useState<yakProcess[]>([]);

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
        setLocalLoading(true)
        // info("正在连接 ... Yak 核心引擎")
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
            }
        ).catch(() => {
            notification["error"]({message: "设置 Yak gRPC 引擎地址失败"})
        }).finally(() => {
            setTimeout(() => {
                setLocalLoading(false)
            }, 200);
        })
    }

    if (!connected) {
        return <Spin
            spinning={localLoading}
        >
            <div style={{
                textAlign: "center",
                marginLeft: 150, marginRight: 150
            }}>
                <Image src={YakLogoBanner}
                       style={{marginTop: 120, marginBottom: 40}}
                       preview={false} width={400}
                />
                <br/>
                <Text style={{color: "#999"}}>社区专业版：{version}</Text>
                <SelectOne label={" "} colon={false} data={[
                    {value: "local", text: "本地模式（本地启动 Yak gRPC）"},
                    {value: "remote", text: "远程模式（TeamServer 模式）"}
                ]} value={mode} setValue={setMode}/>

                {mode === "local" && <>
                    <YakLocalProcess onConnected={((newPort: any, newHost: any) => {
                        login(newHost, newPort)
                    })} onProcess={setExistedProcesses}/>
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
                            marginBottom: tls ? 200 : 0,
                        }}>
                            <Button type={"link"} onClick={() => {
                                showModal({
                                    title: "用户协议",
                                    content: <>
                                        {UserProtocol()}
                                    </>
                                })
                            }}>用户协议</Button>
                            <Button.Group>
                                <Button
                                    onClick={() => {
                                        let m = showModal({
                                            keyboard: false,
                                            title: "引擎升级管理页面",
                                            width: "50%",
                                            content: <>
                                                <YakUpgrade onFinished={() => {
                                                    m.destroy()
                                                }} existed={existedProcess}/>
                                            </>
                                        })
                                    }}
                                >
                                    <p
                                        style={{marginBottom: 0}}
                                    >核心引擎安装与升级</p>
                                </Button>
                                <Button
                                    onClick={() => {
                                        let m = showModal({
                                            keyboard: false,
                                            title: "Yakit 升级",
                                            width: "50%",
                                            content: <>
                                                <YakitUpgrade onFinished={() => {
                                                    m.destroy()
                                                }}/>
                                            </>
                                        })
                                    }}
                                >
                                    <p
                                        style={{marginBottom: 0}}
                                    >Yakit 升级</p>
                                </Button>
                            </Button.Group>

                        </Space>
                    </div>
                </Form>
            </div>
        </Spin>
    }

    return <div>

    </div>
};

export default YakEnvironment;