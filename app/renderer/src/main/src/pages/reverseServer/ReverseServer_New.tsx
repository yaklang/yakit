import React, {useState, useEffect} from "react"
import {Form, Row, Col, Button, Input, Switch, InputNumber, Select, Space, Divider} from "antd"
import {InputInteger, InputItem, SwitchItem, InputStringOrJsonItem, CopyableField} from "../../utils/inputUtil"
import {useGetState, useMemoizedFn} from "ahooks"
import {randomString} from "../../utils/randomUtil"
import {getRemoteValue, setRemoteValue} from "../../utils/kv"
import {failed, success, warn, info} from "../../utils/notification"
import {ExecResultLog} from "../invoker/batch/ExecMessageViewer"
import {ExtractExecResultMessage} from "../../components/yakitLogSchema"
import {ReverseNotification, ReverseNotificationTable} from "./ReverseNotificationTable"
import {ThunderboltOutlined, PoweroffOutlined} from "@ant-design/icons"
import {FacadeOptions} from "./FacadesOptions"
import {Color} from "bizcharts/lib/plots/core/dependents"

const {ipcRenderer} = window.require("electron")
export const BRIDGE_ADDR = "yak-bridge-addr"
export const BRIDGE_SECRET = "yak-bridge-secret"

interface GetTunnelServerExternalIPParams {
    Addr: string
    Secret: string
}

interface YsoClassGeneraterOptions {
    Key: string
    KeyVerbose: string
    Help: string
    Value: string
    Type: string
}

interface YsoGeneraterRequest {
    Gadget: string
    Class: string
    Options: YsoClassGeneraterOptions[]
}

export interface StartFacadeServerParams {
    IsRemote: boolean
    BridgeParam: GetTunnelServerExternalIPParams
    ReversePort: number
    ReverseHost: string
}

export interface FacadeOptionsProp {
    facadeServerParams?: StartFacadeServerParams
    classGeneraterParams?: { [key: string]: any }
    classType?: string
}

interface YsoOption {
    value: string
    label: string
    children?: YsoOption[]
    isLeaf?: boolean
    loading?: boolean
}

interface YsoRawOption {
    Name: string
    NameVerbose: string
    Help: string
}

enum ParamType {
    String = "String",
    Base64Bytes = "Base64Bytes",
    StringBool = "StringBool",
    StringPort = "StringPort"
}

export const ReverseServer_New: React.FC<FacadeOptionsProp> = (props) => {
    const [optionsIsLoading, setOptionsIsLoading] = useState(false)
    const [showClassParamOptions, setShowClassParamOptions] = useState(false)
    const [classParamOptions, setClassParamOptions] = useState<{ [key: string]: any }>([])
    const [generaterRequest, setGeneraterRequest] = useState<YsoGeneraterRequest>({Gadget: "", Class: "", Options: []})
    const [facadesLoading, setFacadesLoading] = useState(false)
    const [yakCode, SetYakCode] = useState<string>("")
    // facades参数
    const [token, _, getToken] = useGetState(randomString(40))
    const [logs, setLogs, getLogs] = useGetState<ReverseNotification[]>([])
    const [formInstance] = Form.useForm()
    const [facadesIsConnect, setFacadesIsConnect, getFacadesIsConnect] = useGetState(false)
    const [reverseAddr, setReverseAddr, getReverseAddr] = useGetState("")
    const [isClearLog, setIsClearLog, getIsClearLog] = useGetState(false)
    const [supportedFacades, setSupportedFacades] = useState(false)
    const [classParamOptionsForClass, setClassParamOptionsForClass] = useState<{ [key: string]: any }>([])
    const [options, setOptions] = useState<YsoOption[]>([])
    const [generaterOptions, setGeneraterOptions] = useState<YsoClassGeneraterOptions[]>([])
    const loadAllClassForSelect = useMemoizedFn(() => {
        ipcRenderer
            .invoke("GetAllYsoClassOptions", {Gadget: "None"})
            .then((d: { Options: YsoRawOption[] }) => {
                setOptionsIsLoading(true)
                let classOptions: YsoOption[] = []
                for (let option of d.Options) {
                    classOptions.push({
                        value: option.Name,
                        label: option.NameVerbose
                    })
                }
                setOptions(classOptions)
            })
            .catch((e: any) => {
                failed("Get class options failed: " + `${e}`)
            })
            .finally(() => setTimeout(() => setOptionsIsLoading(false), 300))
    })
    const loadClassGeneraterOptions = useMemoizedFn((v: any[]) => {
        let value: any[]
        if (typeof v == "string") {
            value = ["None", v]
        } else {
            value = v
        }

        setGeneraterRequest({
            Gadget: value[0],
            Class: value[1],
            Options: []
        })
        if (value.length === 0) {
            setShowClassParamOptions(false)
            return
        }
        ipcRenderer
            .invoke("GetAllYsoClassGeneraterOptions", {Class: value[1], Gadget: value[0]})
            .then((d: { Options: YsoClassGeneraterOptions[] }) => {
                let paramsObj = {}
                for (let o of d.Options) {
                    if (o.Value === undefined) {
                        o.Value = ""
                    }
                    switch (o.Type) {
                        case ParamType.StringBool:
                            paramsObj[o.Key] = o.Value === "true" ? true : false
                            break
                        case ParamType.StringPort:
                            paramsObj[o.Key] = Number(o.Value)
                            break
                        default:
                            paramsObj[o.Key] = o.Value
                    }
                }

                if (value[0] === "None") {
                    setSupportedFacades(true)
                } else {
                    setSupportedFacades(false)
                }
                setClassParamOptionsForClass(paramsObj)
                setGeneraterOptions(d.Options)
                setShowClassParamOptions(true)
            })
            .catch((e: any) => {
                failed("Get class generater options failed: " + `${e}`)
            })
            .finally(() => setTimeout(() => setOptionsIsLoading(false), 300))
    })
    useEffect(() => {
        const messages: ReverseNotification[] = []
        ipcRenderer.on(`${token}-data`, (_, data) => {
            if (!data.IsMessage) {
                return
            }
            try {
                const message = ExtractExecResultMessage(data) as ExecResultLog
                if (message.level !== "facades-msg") {
                    switch (message.level) {
                        case "error":
                            failed(`error: ${message.data}`)
                            ipcRenderer.invoke("cancel-StartFacadesWithYsoObject", token)
                            setFacadesIsConnect(false)
                            break
                        case "warning":
                            warn(message.data)
                            break
                        case "mirror_error":
                            failed(`mirror_error: ${message.data}`)
                            setFacadesIsConnect(false)
                            ipcRenderer.invoke("cancel-StartFacadesWithYsoObject", token)
                            break
                        default:
                            info(JSON.stringify(message))
                    }
                    return
                }
                const obj = JSON.parse(message.data) as ReverseNotification
                obj.timestamp = message.timestamp
                let isUpdata = false
                for (let i = 0; i < messages.length; i++) {
                    if (messages[i].connect_hash == obj.connect_hash) {
                        messages[i] = obj
                        isUpdata = true
                    }
                }
                if (!isUpdata) {
                    messages.unshift(obj)
                }

                if (messages.length > 100) {
                    messages.pop()
                }
            } catch (e) {
            }
        })
        ipcRenderer.on(`${token}-error`, (_, data) => {
            if (data) {
                failed(`${JSON.stringify(data)}`)
                setFacadesIsConnect(false)
            }
        })
        ipcRenderer.on(`${token}-end`, () => {
            setFacadesIsConnect(false)
        })
        const id = setInterval(() => {
            if (getIsClearLog()) {
                messages.length = 0
                setIsClearLog(false)
                return
            }
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
            if (getFacadesIsConnect()) {
                ipcRenderer.invoke("cancel-StartFacadesWithYsoObject", token)
                ipcRenderer.removeAllListeners(`${token}-end`)
                ipcRenderer.removeAllListeners(`${token}-error`)
                ipcRenderer.removeAllListeners(`${token}-data`)
                info("FacadeServer已关闭")
            }

            // }
        }
    }, [token])
    useEffect(() => {
        if (props.classType && props.facadeServerParams && props.classGeneraterParams) {
            setGeneraterRequest({...generaterRequest, Class: props.classType, Gadget: "None"})
            setClassParamOptionsForClass(props.classGeneraterParams)
            startFacadeServer(props.facadeServerParams).then(() => {
                if (props.classGeneraterParams) applyClassOptions(props.classGeneraterParams)
            })
        }
    }, [])
    const startFacadeServer = useMemoizedFn((params: StartFacadeServerParams) => {
        return new Promise<void>((resolve, reject) => {
            let startFacadeParams = {
                ...params,
                GenerateClassParams: generaterRequest,
                Token: token
            }
            if (startFacadeParams.IsRemote) {
                // 这里应该做个加载提示
                ipcRenderer
                    .invoke("GetTunnelServerExternalIP", {
                        Addr: params.BridgeParam.Addr,
                        Secret: params.BridgeParam.Secret
                    })
                    .then((data: { IP: string }) => {
                        setReverseAddr(`${data.IP}:${params.ReversePort}`)
                        startFacadeParams.ReverseHost = data.IP
                        ipcRenderer
                            .invoke("StartFacadesWithYsoObject", startFacadeParams, token)
                            .then(() => {
                                setFacadesLoading(true)
                                setFacadesIsConnect(true)
                                info("启动FacadeServer")
                                loadAllClassForSelect()
                                resolve()
                            })
                            .catch((e: any) => {
                                failed("启动FacadeServer失败: " + `${e}`)
                                setFacadesIsConnect(false)
                                reject(e)
                            })
                            .finally()
                    })
                    .catch((e: any) => {
                        failed("获取远程地址失败: " + `${e}`)
                        ipcRenderer.invoke("cancel-StartFacadesWithYsoObject", token)
                        setFacadesIsConnect(false)
                        reject(e)
                    })
                    .finally(() => {
                    })
            } else {
                setReverseAddr(`${params.ReverseHost}:${params.ReversePort}`)
                ipcRenderer
                    .invoke("StartFacadesWithYsoObject", startFacadeParams, token)
                    .then(() => {
                        setFacadesLoading(true)
                        setFacadesIsConnect(true)
                        info("启动FacadeServer")
                        setIsClearLog(true)
                        setLogs([])
                        loadAllClassForSelect()
                        resolve()
                    })
                    .catch((e: any) => {
                        failed("启动FacadeServer失败: " + `${e}`)
                        setFacadesIsConnect(false)
                        reject(e)
                    })
                    .finally()
            }
        })
    })
    const applyClassOptions = useMemoizedFn((vals: { [key: string]: any }) => {
        let genOptions: YsoClassGeneraterOptions[] = []
        for (let key in vals) {
            let value = vals[key]
            if (value === undefined) {
                continue
            }
            value = String(value)
            if (value === "") {
                continue
            }
            genOptions.push({
                Key: key,
                KeyVerbose: "",
                Help: "",
                Value: value,
                Type: ""
            })
        }
        generaterRequest.Options = genOptions
        ipcRenderer
            .invoke("ApplyClassToFacades", {
                GenerateClassParams: generaterRequest,
                Token: token
            })
            .then((res) => {
                info("应用到FacadeServer成功")
            })
            .catch((err) => {
                failed(`应用到FacadeServer失败${err}`)
            })
    })
    return (
        <>
            {!getFacadesIsConnect() && (
                <div style={{marginTop: "3rem"}}>
                    <FacadeOptions
                        onStartFacades={(params: StartFacadeServerParams) => {
                            startFacadeServer(params)
                        }}
                    ></FacadeOptions>
                </div>
            )}
            {getFacadesIsConnect() && (
                <Row style={{height: "100%", overflowY: "auto"}}>
                    <Col span={6} style={{overflowY: "auto"}}>
                        <Form labelCol={{span: 6}} wrapperCol={{span: 24}}>
                            <Form.Item style={{margin: "1rem"}}>
                                <Space style={{fontSize: "18px"}}>反连资源</Space>
                                <PoweroffOutlined
                                    style={{color: "red", fontSize: "18px", float: "right", marginTop: "6px"}}
                                    onClick={() => {
                                        ipcRenderer.invoke("cancel-StartFacadesWithYsoObject", token)
                                        setFacadesIsConnect(false)
                                        setIsClearLog(true)
                                        setLogs([])
                                    }}
                                />
                            </Form.Item>
                            <Form.Item label='恶意类' name='select'>
                                <Select options={options} onChange={loadClassGeneraterOptions}></Select>
                            </Form.Item>
                            <Form
                                labelCol={{span: 6}}
                                wrapperCol={{span: 24}}
                                layout='horizontal'
                                form={formInstance}
                                initialValues={classParamOptionsForClass}
                            >
                                {(() => {
                                    let paramElement: JSX.Element[] = []
                                    const pushElement = (
                                        key: string,
                                        name: string,
                                        element: JSX.Element,
                                        pushHead = true
                                    ) => {
                                        if (pushHead) {
                                            paramElement.unshift(
                                                <Form.Item label={key} name={name}>
                                                    {element}
                                                </Form.Item>
                                            )
                                        } else {
                                            paramElement.push(
                                                <Form.Item label={key} name={name}>
                                                    {element}
                                                </Form.Item>
                                            )
                                        }
                                    }
                                    generaterOptions.forEach((item) => {
                                        console.log(item)
                                        switch (item.Type) {
                                            case ParamType.String:
                                                pushElement(item.KeyVerbose, item.Key, <Input placeholder=''/>)
                                                break
                                            case ParamType.StringBool:
                                                pushElement(
                                                    item.KeyVerbose,
                                                    item.Key,
                                                    <Switch defaultChecked={item.Value === "true" ? true : false}/>,
                                                    false
                                                )
                                                break
                                            case ParamType.StringPort:
                                                pushElement(
                                                    item.KeyVerbose,
                                                    item.Key,
                                                    <InputNumber min={1} max={65535}/>
                                                )
                                                break
                                        }
                                    })
                                    paramElement.push(
                                        <Form.Item wrapperCol={{offset: 2}}>
                                            <Button
                                                type='primary'
                                                onClick={() => {
                                                    formInstance
                                                        .validateFields()
                                                        .then((vals: { [key: string]: any }) => {
                                                            applyClassOptions(vals)
                                                        })
                                                        .catch(() => {
                                                            failed("获取form参数错误")
                                                        })
                                                }}
                                            >
                                                应用
                                            </Button>
                                            <Button
                                                type='primary'
                                                ghost
                                                style={{margin: "1rem"}}
                                                icon={<ThunderboltOutlined/>}
                                            >
                                                Yak Runner
                                            </Button>
                                        </Form.Item>
                                    )

                                    return paramElement
                                })()}
                            </Form>
                            <Form.Item>
                                <Space direction={"vertical"}>
                                    <Space direction={"vertical"}>
                                        HTTP反连地址
                                        <CopyableField
                                            text={`http://${reverseAddr}/${generaterRequest.Class}`}
                                            style={{color: "blue", marginTop: "-12px"}}
                                        />
                                    </Space>
                                    <Space direction={"vertical"}>
                                        RMI反连地址
                                        <CopyableField
                                            text={`rmi://${reverseAddr}/${generaterRequest.Class}`}
                                            style={{color: "blue", marginTop: "-12px"}}
                                        />
                                    </Space>
                                    <Space direction={"vertical"}>
                                        LDAP反连地址
                                        <CopyableField
                                            text={`ldap://${reverseAddr}/${generaterRequest.Class}`}
                                            style={{color: "blue", marginTop: "-12px"}}
                                        />
                                    </Space>
                                </Space>
                            </Form.Item>
                        </Form>
                    </Col>
                    <Col span={1}>
                        <Divider type='vertical' style={{height: "100%"}}/>
                    </Col>
                    <Col span={17}>
                        <ReverseNotificationTable
                            getInfo={getReverseAddr}
                            loading={facadesLoading}
                            logs={logs}
                            clearHandle={() => {
                                setIsClearLog(true)
                                setLogs([])
                            }}
                        />
                    </Col>
                </Row>
            )}
        </>
    )
}
