import React, {useState, useEffect, useRef} from "react"
import {Form, Button, Input, Switch, InputNumber, Divider, Spin} from "antd"
import {CopyableField} from "../../utils/inputUtil"
import {useGetState, useMemoizedFn} from "ahooks"
import {randomString} from "../../utils/randomUtil"
import {failed, warn, info} from "../../utils/notification"
import {ExecResultLog} from "../invoker/batch/ExecMessageViewer"
import {ExtractExecResultMessage} from "../../components/yakitLogSchema"
import {PoweroffOutlined} from "@ant-design/icons"
import {ReverseNotification, ReverseTable} from "./ReverseTable"
import {
    convertRequest,
    FormBindInfo,
    FormList,
    ParamsRefProps,
    PayloadForm,
    YsoGeneraterRequest
} from "../payloadGenerater/NewJavaPayloadPage"
import {getRemoteValue} from "@/utils/kv"

import "./reverseServerPage.scss"

const {ipcRenderer} = window.require("electron")

export interface FacadeOptionsProp {
    facadeServerParams?: SettingReverseParamsInfo
    classGeneraterParams?: {[key: string]: any}
    classType?: string
}

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
    const [loading, setLoading] = useState<boolean>(false)
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

    return (
        <div className='reverse-server-page-wrapper'>
            {status === "setting" && (
                <SettingReverseServer
                    defaultSetting={{...addrParams}}
                    setServer={(setting) => {
                        setAddrParams(setting.setting)
                        setRemoteIp(setting.remoteIp)
                        startFacadeServer(setting.setting, setting.remoteIp)
                    }}
                />
            )}
            {status === "start" && addrParams && (
                <StartReverseServer
                    loading={loading}
                    setLoading={setLoading}
                    token={getToken()}
                    addr={addrParams}
                    remoteIp={remoteIp}
                    stop={(isCancel) => {
                        if (!isCancel) ipcRenderer.invoke("cancel-StartFacadesWithYsoObject", token)
                        setStatus("setting")
                        setToken(randomString(40))
                    }}
                    apply={(params) => {
                        ipcRenderer
                            .invoke("ApplyClassToFacades", {...params})
                            .then((res) => info("应用到FacadeServer成功"))
                            .catch((err) => failed(`应用到FacadeServer失败${err}`))
                            .finally(() => setTimeout(() => setLoading(false), 300))
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
interface NetInterface {
    Name: string
    Addr: string
    IP: string
}

export const BRIDGE_ADDR = "yak-bridge-addr"
export const BRIDGE_SECRET = "yak-bridge-secret"
export const SettingReverseServer: React.FC<SettingReverseServerProp> = (props) => {
    const [formInstance] = Form.useForm()
    const [loading, setLoading] = useState<boolean>(false)
    const [params, setParams, getParams] = useGetState<SettingReverseParamsInfo>({...props.defaultSetting})
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
                    labelCol={{span: 8}}
                    wrapperCol={{span: 16}}
                    onFinish={submit}
                >
                    <Form.Item label='启用公网穿透' name='IsRemote'>
                        <Switch checked={params.IsRemote} onChange={(IsRemote) => setValue({...params, IsRemote})} />
                    </Form.Item>

                    {params.IsRemote && (
                        <>
                            <Form.Item
                                label='Bridge地址'
                                name={["BridgeParam", "Addr"]}
                                rules={[{required: true, message: "请输入Bridge地址"}]}
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
                        <Form.Item
                            label='反连地址'
                            name='ReverseHost'
                            rules={[{required: true, message: "请输入反连地址"}]}
                        >
                            <Input
                                allowClear={true}
                                value={params.ReverseHost}
                                onChange={(e) => setValue({...params, ReverseHost: e.target.value})}
                            />
                        </Form.Item>
                    )}
                    <Form.Item
                        label='反连端口'
                        name='ReversePort'
                        rules={[{required: true, message: "请输入反连端口"}]}
                    >
                        <InputNumber
                            width='100%'
                            min={0}
                            max={65535}
                            precision={0}
                            value={params.ReversePort}
                            onChange={(ReversePort) => setValue({...params, ReversePort})}
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
    loading: boolean
    setLoading: (value: boolean) => any
    token: string
    addr: SettingReverseParamsInfo
    remoteIp: string
    stop: (isCancel?: boolean) => any
    apply: (params: ApplyFacadesRequest) => any

    // java-payload页面传递数据
    paramsData?: ParamsRefProps
    formLists?: FormList[]
    formBind?: FormBindInfo
}
export const StartReverseServer: React.FC<StartReverseServerProp> = (props) => {
    const {
        token,
        addr,
        remoteIp,
        stop,
        apply,
        paramsData = {useGadget: false, Gadget: "", Class: ""},
        formLists = [],
        formBind = {},
        ...rest
    } = props
    const reverseAddr = addr.IsRemote ? `${remoteIp}:${addr.ReversePort}` : `${addr.ReverseHost}:${addr.ReversePort}`

    const dataRef = useRef<ReverseNotification[]>([])
    const [data, setData, getData] = useGetState<ReverseNotification[]>([])

    const [classRequest, setClassRequest] = useState<ParamsRefProps>({...paramsData})

    const [isExtra, setIsExtra] = useState<boolean>(false)

    useEffect(() => {
        if (!token) return

        dataRef.current = []
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
                if (!isUpdata) datas.unshift(obj)

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

    const btnSubmit = useMemoizedFn((type: "server" | "copy" | "yakRun" | "apply", value: ParamsRefProps) => {
        const data = convertRequest(value)
        setClassRequest({...value})
        if (type === "apply") apply({Token: token, GenerateClassParams: {...data}})
    })

    const clearData = () => {
        dataRef.current = []
        setData([])
    }

    return (
        <div className='start-reverse-server-wrapper'>
            <div className={isExtra ? "setting-hidden-wrapper" : "setting-wrapper"}>
                <div className='setting-header'>
                    <div className='header-title'>反连资源</div>
                    <PoweroffOutlined className='icon-style' onClick={() => stop()} />
                </div>
                <PayloadForm
                    isShowGadget={false}
                    {...rest}
                    paramsData={{...paramsData}}
                    formLists={[...formLists]}
                    formBind={{...formBind}}
                    btnSubmit={btnSubmit}
                />
                <Divider />
                <div className='setting-display'>
                    <div className='setting-display-opt'>
                        <div>HTTP反连地址</div>
                        <CopyableField
                            text={`http://${reverseAddr}/${classRequest?.ClassName || ""}`}
                            style={{color: "blue"}}
                        />
                    </div>
                    <div className='setting-display-opt'>
                        <div>RMI反连地址</div>
                        <CopyableField
                            text={`rmi://${reverseAddr}/${classRequest?.ClassName || ""}`}
                            style={{color: "blue"}}
                        />
                    </div>
                    <div className='setting-display-opt'>
                        <div>LDAP反连地址</div>
                        <CopyableField
                            text={`ldap://${reverseAddr}/${classRequest?.ClassName || ""}`}
                            style={{color: "blue"}}
                        />
                    </div>
                </div>
            </div>
            <Divider type='vertical' className={isExtra ? "ver-hidden-divider" : "ver-divider"} />
            <div className='table-wrapper'>
                <ReverseTable data={data} isExtra={isExtra} setIsExtra={setIsExtra} clearData={clearData} />
            </div>
        </div>
    )
}
