import React, {useState, useEffect, useRef} from "react"
import {Form, Button, Input, Switch, InputNumber, Divider, Spin, PageHeader, Alert, Typography, Space} from "antd"
import {CopyableField} from "../../utils/inputUtil"
import {useGetState, useMemoizedFn} from "ahooks"
import {randomString} from "../../utils/randomUtil"
import {failed, warn, info} from "../../utils/notification"
import {ExecResultLog} from "../invoker/batch/ExecMessageViewer"
import {ExtractExecResultMessage} from "../../components/yakitLogSchema"
import {ReverseNotification, ReverseTable} from "./ReverseTable"
import {
    convertRequest,
    ParamsRefProps,
    PayloadCode,
    PayloadForm,
    YsoGeneraterRequest
} from "../payloadGenerater/NewJavaPayloadPage"
import {getRemoteValue} from "@/utils/kv"

import "./reverseServerPage.scss"
import {NetInterface} from "@/models/Traffic";

const {ipcRenderer} = window.require("electron")
const {Text} = Typography

export interface FacadeOptionsProp {}

export interface SettingReverseParamsInfo {
    IsRemote: boolean
    BridgeParam: {Addr: string; Secret: string}
    ReversePort: number
    ReverseHost: string
}
interface ApplyFacadesRequest {
    Token: string
    GenerateClassParams: YsoGeneraterRequest
}
export type FacadesRequest = SettingReverseParamsInfo & ApplyFacadesRequest

export const NewReverseServerPage: React.FC<FacadeOptionsProp> = (props) => {
    const [status, setStatus] = useState<"setting" | "start">("setting")
    const [token, setToken, getToken] = useGetState(randomString(40))
    const [addrParams, setAddrParams] = useState<SettingReverseParamsInfo>({
        BridgeParam: {Addr: "", Secret: ""},
        IsRemote: false,
        ReversePort: 8085,
        ReverseHost: "127.0.0.1"
    })
    const [remoteIp, setRemoteIp] = useState<string>("")

    const startFacadeServer = useMemoizedFn((params: SettingReverseParamsInfo, remoteIp: string) => {
        let startFacadeParams: FacadesRequest = {
            ...params,
            GenerateClassParams: {Gadget: "", Class: "", Options: []},
            Token: token
        }
        if (startFacadeParams.IsRemote) startFacadeParams.ReverseHost = remoteIp

        ipcRenderer
            .invoke("StartFacadesWithYsoObject", startFacadeParams, token)
            .then(() => {
                info("启动FacadeServer")
                setStatus("start")
            })
            .catch((e: any) => {
                failed("启动FacadeServer失败: " + `${e}`)
            })
    })

    useEffect(() => {
        return () => {
            ipcRenderer.invoke("cancel-StartFacadesWithYsoObject", getToken())
        }
    }, [])

    return (
        <div className='reverse-server-page-wrapper'>
            {status === "setting" && (
                <PageHeader
                    className='reverse-server-page-head'
                    backIcon={false}
                    title='反连服务器'
                    subTitle='使用协议端口复用技术，同时在一个端口同时实现 HTTP / RMI / HTTPS 等协议的反连'
                >
                    <SettingReverseServer
                        defaultSetting={{...addrParams}}
                        setServer={(setting) => {
                            setAddrParams(setting.setting)
                            setRemoteIp(setting.remoteIp)
                            startFacadeServer(setting.setting, setting.remoteIp)
                        }}
                    />
                </PageHeader>
            )}
            {status === "start" && addrParams && (
                <StartReverseServer
                    token={getToken()}
                    addr={addrParams}
                    remoteIp={remoteIp}
                    stop={(isCancel) => {
                        if (!isCancel) ipcRenderer.invoke("cancel-StartFacadesWithYsoObject", token)
                        setStatus("setting")
                        setToken(randomString(40))
                    }}
                />
            )}
        </div>
    )
}

export interface SettingReverseServerProp {
    defaultSetting: SettingReverseParamsInfo
    setServer: (params: {setting: SettingReverseParamsInfo; remoteIp: string}) => any
}

export const BRIDGE_ADDR = "yak-bridge-addr"
export const BRIDGE_SECRET = "yak-bridge-secret"
export const SettingReverseServer: React.FC<SettingReverseServerProp> = (props) => {
    const [formInstance] = Form.useForm()
    const [loading, setLoading] = useState<boolean>(false)
    const [params, setParams] = useState<SettingReverseParamsInfo>({...props.defaultSetting})
    const remoteIp = useRef<string>("")

    useEffect(() => {
        const initParams = {...params}
        if (initParams.ReverseHost !== "127.0.0.1") return

        setLoading(true)
        getRemoteValue(BRIDGE_ADDR).then((addr: string) => {
            if (!!addr) {
                initParams.BridgeParam.Addr = addr
                getRemoteValue(BRIDGE_SECRET)
                    .then((secret: string) => {
                        initParams.BridgeParam.Secret = secret
                        initParams.IsRemote = true
                    })
                    .finally(() => {
                        ipcRenderer
                            .invoke("AvailableLocalAddr", {})
                            .then((data: {Interfaces: NetInterface[]}) => {
                                const arr = (data.Interfaces || []).filter((i) => i.IP !== "127.0.0.1")
                                if (arr.length > 0) initParams.ReverseHost = arr[0].IP
                            })
                            .finally(() => {
                                setValue({...initParams})
                                setTimeout(() => setLoading(false), 300)
                            })
                    })
            } else {
                ipcRenderer
                    .invoke("AvailableLocalAddr", {})
                    .then((data: {Interfaces: NetInterface[]}) => {
                        const arr = (data.Interfaces || []).filter((i) => i.IP !== "127.0.0.1")
                        if (arr.length > 0) initParams.ReverseHost = arr[0].IP
                    })
                    .finally(() => {
                        setValue({...initParams})
                        setTimeout(() => setLoading(false), 300)
                    })
            }
        })
    }, [])

    const setValue = useMemoizedFn((data: SettingReverseParamsInfo) => {
        formInstance.setFieldsValue({...data})
        setParams({...data})
    })

    const submit = useMemoizedFn(() => {
        if (params.IsRemote) remoteAddrConvert()
        else {
            props.setServer({setting: {...params}, remoteIp: ""})
            remoteIp.current = ""
        }
    })

    const remoteAddrConvert = useMemoizedFn(() => {
        setLoading(true)
        ipcRenderer
            .invoke("GetTunnelServerExternalIP", {
                Addr: params.BridgeParam.Addr,
                Secret: params.BridgeParam.Secret
            })
            .then((data: {IP: string}) => (remoteIp.current = data.IP))
            .catch((e: any) => {
                failed("获取远程地址失败: " + `${e}`)
                remoteIp.current = ""
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })

    useEffect(() => {
        if (!loading && params.IsRemote && !!remoteIp.current) {
            props.setServer({setting: {...params}, remoteIp: remoteIp.current})
            remoteIp.current = ""
        }
    }, [loading])

    return (
        <div className='setting-reverse-server-wrapper'>
            <Spin spinning={loading}>
                <Form
                    form={formInstance}
                    initialValues={{...props.defaultSetting}}
                    labelCol={{span: 5}}
                    wrapperCol={{span: 19}}
                    onFinish={submit}
                >
                    <Form.Item
                        label='启用公网穿透'
                        name='IsRemote'
                        help={
                            params.IsRemote && (
                                <Alert
                                    className='setting-isremote-hint'
                                    type={"success"}
                                    message={
                                        <div>
                                            在自己的服务器安装 yak 核心引擎，执行{" "}
                                            <Text code={true} copyable={true}>
                                                yak bridge --secret [your-pass]
                                            </Text>{" "}
                                            启动 Yak Bridge 公网服务 <Divider type={"vertical"} />
                                            <Text style={{color: "#999"}}>yak version {`>=`} v1.0.11-sp9</Text>
                                        </div>
                                    }
                                />
                            )
                        }
                    >
                        <Switch checked={params.IsRemote} onChange={(IsRemote) => setValue({...params, IsRemote})} />
                    </Form.Item>

                    {params.IsRemote && (
                        <>
                            <Form.Item
                                label='公网Bridge地址'
                                name={["BridgeParam", "Addr"]}
                                rules={[{required: true, message: ""}]}
                            >
                                <Input
                                    allowClear={true}
                                    value={params.BridgeParam.Addr}
                                    onChange={(e) => {
                                        params.BridgeParam.Addr = e.target.value
                                        setValue({...params})
                                    }}
                                />
                            </Form.Item>
                            <Form.Item label='密码' name={["BridgeParam", "Secret"]}>
                                <Input
                                    allowClear={true}
                                    value={params.BridgeParam.Secret}
                                    onChange={(e) => {
                                        params.BridgeParam.Secret = e.target.value
                                        setValue({...params})
                                    }}
                                />
                            </Form.Item>
                        </>
                    )}
                    {!params.IsRemote && (
                        <Form.Item label='反连地址' name='ReverseHost' rules={[{required: true, message: ""}]}>
                            <Input
                                allowClear={true}
                                value={params.ReverseHost}
                                onChange={(e) => setValue({...params, ReverseHost: e.target.value})}
                            />
                        </Form.Item>
                    )}
                    <Form.Item label='反连端口' name='ReversePort' rules={[{required: true, message: ""}]}>
                        <InputNumber
                            width='100%'
                            min={0}
                            max={65535}
                            precision={0}
                            value={params.ReversePort}
                            onChange={(ReversePort) => setValue({...params, ReversePort: ReversePort as number})}
                        />
                    </Form.Item>

                    <Form.Item wrapperCol={{offset: 8}}>
                        <Button type='primary' htmlType='submit'>
                            启动FacadeServer
                        </Button>
                    </Form.Item>
                </Form>
            </Spin>
        </div>
    )
}

export interface StartReverseServerProp {
    token: string
    addr: SettingReverseParamsInfo
    remoteIp: string
    stop: (isCancel?: boolean) => any
}
export const StartReverseServer: React.FC<StartReverseServerProp> = (props) => {
    const {token, addr, remoteIp, stop} = props
    const reverseAddr = addr.IsRemote ? `${remoteIp}:${addr.ReversePort}` : `${addr.ReverseHost}:${addr.ReversePort}`

    const [loading, setLoading] = useState<boolean>(false)
    const dataRef = useRef<ReverseNotification[]>([])
    const [data, setData, getData] = useGetState<ReverseNotification[]>([])
    const totalRef = useRef<number>(0)

    const [classRequest, setClassRequest] = useState<ParamsRefProps>({useGadget: false, Gadget: "", Class: ""})
    const [codeRefresh, setCodeRefresh] = useState<boolean>(false)

    const [isExtra, setIsExtra] = useState<boolean>(false)
    const [isShowCode, setIsShowCode] = useState<boolean>(false)
    const [codeExtra, setCodeExtra] = useState<boolean>(false)

    useEffect(() => {
        if (!token) return

        dataRef.current = []
        totalRef.current = 0
        setData([])
        ipcRenderer.on(`${token}-data`, (_, data) => {
            if (!data.IsMessage) {
                return
            }
            const datas = dataRef.current
            try {
                const message = ExtractExecResultMessage(data) as ExecResultLog
                if (message.level !== "facades-msg") {
                    switch (message.level) {
                        case "error":
                        case "mirror_error":
                            failed(`${message.level}: ${message.data}`)
                            stop()
                            break
                        case "warning":
                            warn(message.data)
                            break
                        default:
                            info(JSON.stringify(message))
                    }
                    return
                }
                const obj = JSON.parse(message.data) as ReverseNotification
                obj.timestamp = message.timestamp
                let isUpdata = false
                for (let i = 0; i < datas.length; i++) {
                    if (datas[i].connect_hash === obj.connect_hash) {
                        datas[i] = obj
                        isUpdata = true
                        break
                    }
                }
                if (!isUpdata) {
                    datas.unshift(obj)
                    totalRef.current = totalRef.current + 1
                }

                if (datas.length > 100) datas.pop()
            } catch (e) {}
        })
        ipcRenderer.on(`${token}-error`, (_, data) => {
            if (data) {
                failed(`${JSON.stringify(data)}`)
                stop(true)
            }
        })
        ipcRenderer.on(`${token}-end`, () => stop(true))
        const id = setInterval(() => {
            const datas = dataRef.current

            if (getData().length === 0) setData([...datas])
            if (getData().length > 0 && datas[0].uuid !== getData()[0].uuid) setData([...datas])
        }, 1000)
        return () => {
            clearInterval(id)
            ipcRenderer.removeAllListeners(`${token}-end`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-data`)
        }
    }, [token])

    const clearData = () => {
        dataRef.current = []
        totalRef.current = 0
        setData([])
    }

    const onApply = useMemoizedFn((value: ParamsRefProps) => {
        const data = convertRequest(value)
        setClassRequest({...value})
        ipcRenderer
            .invoke("ApplyClassToFacades", {Token: token, GenerateClassParams: {...data}})
            .then((res) => info("应用到FacadeServer成功"))
            .catch((err) => failed(`应用到FacadeServer失败${err}`))
            .finally(() => setTimeout(() => setLoading(false), 300))
        setCodeRefresh(!codeRefresh)
    })

    return (
        <div className='start-reverse-server-wrapper'>
            <div className={`payload-${isExtra ? (codeExtra ? "extra-" : "") : "hidden-"}wrapper payload-container`}>
                <div className={`payload-${isShowCode ? (codeExtra ? "hidden-" : "code-") : ""}setting`}>
                    <PayloadForm
                        isReverse={true}
                        isShowCode={isShowCode}
                        showCode={() => setIsShowCode(!isShowCode)}
                        paramsData={{useGadget: false, Gadget: "", Class: ""}}
                        setParamsData={() => {}}
                        loading={loading}
                        setLoading={setLoading}
                        onApply={onApply}
                    />
                </div>
                <div className={`payload-${isShowCode ? "" : "hidden-"}code`}>
                    <PayloadCode
                        isMin={true}
                        codeExtra={codeExtra}
                        data={{...classRequest}}
                        RefreshTrigger={codeRefresh}
                        onExtra={() => setCodeExtra(!codeExtra)}
                    />
                </div>
            </div>

            <div className={`reverse-${codeExtra ? "hidden-" : ""}wrapper`}>
                <div className='reverse-body'>
                    <PageHeader
                        className='reverse-server-pagehead'
                        backIcon={false}
                        title='反连服务器'
                        subTitle='使用协议端口复用技术，同时在一个端口同时实现 HTTP / RMI / HTTPS 等协议的反连'
                        extra={
                            <div className='pagehead-extra-body'>
                                <div>
                                    Payload 配置:{" "}
                                    <Switch
                                        size='small'
                                        checked={isExtra}
                                        onChange={(checked) => setIsExtra(checked)}
                                    />
                                </div>
                                <Button
                                    className='body-btn'
                                    type='primary'
                                    danger={true}
                                    size='small'
                                    onClick={() => stop()}
                                >
                                    关闭反连
                                </Button>
                            </div>
                        }
                    >
                        <Alert
                            type={"info"}
                            message={
                                <Space direction={"vertical"}>
                                    <div className='addr-body'>
                                        HTTP反连地址&nbsp;&nbsp;
                                        <CopyableField
                                            width={"80%"}
                                            text={`http://${reverseAddr}/${classRequest?.ClassName || ""}`}
                                            style={{color: "blue"}}
                                        />
                                    </div>
                                    <div className='addr-body'>
                                        RMI反连地址&nbsp;&nbsp;
                                        <CopyableField
                                            width={"80%"}
                                            text={`rmi://${reverseAddr}/${classRequest?.ClassName || ""}`}
                                            style={{color: "blue"}}
                                        />
                                    </div>
                                    <div className='addr-body'>
                                        LDAP反连地址&nbsp;&nbsp;
                                        <CopyableField
                                            width={"80%"}
                                            text={`ldap://${reverseAddr}/${classRequest?.ClassName || ""}`}
                                            style={{color: "blue"}}
                                        />
                                    </div>
                                </Space>
                            }
                        ></Alert>
                    </PageHeader>
                    <div className='reverse-server-data'>
                        <ReverseTable total={totalRef.current} data={data} clearData={clearData} />
                    </div>
                </div>
            </div>
        </div>
    )
}
