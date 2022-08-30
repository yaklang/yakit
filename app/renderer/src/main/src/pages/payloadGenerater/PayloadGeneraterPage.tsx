import {values} from "@antv/util"
import {useMemoizedFn, useSafeState, useGetState} from "ahooks"
import {
    Alert,
    InputNumber,
    Button,
    Col,
    Card,
    Divider,
    Form,
    PageHeader,
    Row,
    Space,
    Tag,
    Typography,
    Cascader,
    Switch,
    Input,
    Select,
    Layout,
    List
} from "antd"
import {type} from "os"
import {failed, success, warn, info} from "../../utils/notification"
import {InputInteger, InputItem, SwitchItem, CopyableField} from "../../utils/inputUtil"
import {callCopyToClipboard} from "../../utils/basic"
import {saveABSFileToOpen} from "../../utils/openWebsite"
import {YakEditor} from "../../utils/editors"
import {showModal} from "../../utils/showModal"
import {randomString} from "../../utils/randomUtil"
import {ExecResultLog} from "../invoker/batch/ExecMessageViewer"
import {ExtractExecResultMessage} from "../../components/yakitLogSchema"
import {ReverseNotificationTable} from "./ReverseNotificationTable"
import React, {useRef, useEffect, useState} from "react"
import {StartFacadeServerParams} from "./FacadesOptions"
import {FacadeOptions} from "./FacadesOptions"

const {ipcRenderer} = window.require("electron")
export interface PayloadGeneraterPageProp {}

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
interface YsoClassGeneraterOptions {
    Key: string
    Value: string
    Type: string
}
interface YsoGeneraterRequest {
    Gadget: string
    Class: string
    Options: YsoClassGeneraterOptions[]
}

export interface ReverseNotification {
    uuid: string
    type: string
    remote_addr: string
    raw?: Uint8Array
    token?: string
    response_info?: string
    connect_hash: string
    timestamp?: number
}

enum ParamType {
    String = "String",
    Base64Bytes = "Base64Bytes",
    StringBool = "StringBool",
    StringPort = "StringPort"
}

export const PayloadGeneraterPage: React.FC<PayloadGeneraterPageProp> = React.memo((props) => {
    const [options, setOptions] = useState<YsoOption[]>([])
    const [optionsIsLoading, setOptionsIsLoading] = useState(false)
    const [showClassParamOptions, setShowClassParamOptions] = useState(false)
    const [classParamOptions, setClassParamOptions] = useState<{[key: string]: any}>([])
    const [generaterRequest, setGeneraterRequest] = useState<YsoGeneraterRequest>({Gadget: "", Class: "", Options: []})
    const [facadesLoading, setFacadesLoading] = useState(false)
    const [showBlockType, setShowBlockType] = useState("")
    const [yakCode, SetYakCode] = useState<string>("")
    // facades参数
    const [token, _, getToken] = useGetState(randomString(40))
    const [logs, setLogs, getLogs] = useGetState<ReverseNotification[]>([])
    const [formInstance] = Form.useForm()
    const [facadesIsConnect, setFacadesIsConnect, getFacadesIsConnect] = useGetState(false)
    const [reverseAddr, setReverseAddr, getReverseAddr] = useGetState("")
    const [isClearLog, setIsClearLog, getIsClearLog] = useGetState(false)
    const [className, setClassName] = useState("")
    const [supportedFacades, setSupportedFacades] = useState(false)
    // setShowClassParamOptions(false)
    // const [classOptions, setClassOptions] = useState<YsoClassOption[]>([])
    const submit = (op) => {
        formInstance.validateFields().then((vals: {[key: string]: any}) => {
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
                    Value: value,
                    Type: ""
                })
            }
            generaterRequest.Options = genOptions
            if (op === "code") {
                ipcRenderer
                    .invoke("GenerateYsoCode", generaterRequest)
                    .then((d: {Code: string}) => {
                        success("生成代码成功")
                        SetYakCode(d.Code)
                        setShowBlockType("code")
                    })
                    .catch((e: any) => {
                        failed("生成代码失败: " + `${e}`)
                    })
                    .finally(() => setTimeout(() => setOptionsIsLoading(false), 300))
            } else if (op === "bytes") {
                // failed("not implemented")
                ipcRenderer
                    .invoke("GenerateYsoBytes", generaterRequest)
                    .then((d: {Bytes: Uint8Array; FileName: string}) => {
                        success("生成字节码成功")
                        ipcRenderer
                            .invoke("BytesToBase64", {
                                Bytes: d.Bytes
                            })
                            .then((res: {Base64: string}) => {
                                ipcRenderer
                                    .invoke("copy-clipboard", res.Base64)
                                    .then(() => {
                                        success("复制Base64成功")
                                    })
                                    .catch((err) => {
                                        failed(`${err}`)
                                    })
                            })
                            .catch((err) => {
                                failed(`${err}`)
                            })
                        // saveABSFileToOpen(d.FileName, d.Bytes)
                    })
                    .catch((e: any) => {
                        failed("生成字节码失败: " + `${e}`)
                    })
                    .finally(() => setTimeout(() => setOptionsIsLoading(false), 300))
            } else if (op == "apply-class") {
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
            } else if (op == "facadeOptions") {
                const m = showModal({
                    width: "30%",
                    content: (
                        <FacadeOptions
                            onStartFacades={(params: StartFacadeServerParams) => {
                                let startFacadeParams = {
                                    ...params,
                                    GenerateClassParams: generaterRequest,
                                    Token: token
                                }
                                for (let i = 0; i < generaterRequest.Options.length; i++) {
                                    if (generaterRequest.Options[i].Key == "ClassName") {
                                        setClassName(generaterRequest.Options[i].Value)
                                    }
                                }
                                if (startFacadeParams.IsRemote) {
                                    // 这里应该做个加载提示
                                    ipcRenderer
                                        .invoke("GetTunnelServerExternalIP", {
                                            Addr: params.BridgeParam.Addr,
                                            Secret: params.BridgeParam.Secret
                                        })
                                        .then((data: {IP: string}) => {
                                            setReverseAddr(`${data.IP}:${params.ReversePort}`)
                                            startFacadeParams.ReverseHost = data.IP
                                            ipcRenderer
                                                .invoke("StartFacadesWithYsoObject", startFacadeParams, token)
                                                .then(() => {
                                                    setFacadesLoading(true)
                                                    setFacadesIsConnect(true)
                                                    info("启动FacadeServer")
                                                    setIsClearLog(true)
                                                    setLogs([])
                                                    setShowBlockType("facade")
                                                })
                                                .catch((e: any) => {
                                                    failed("启动FacadeServer失败: " + `${e}`)
                                                })
                                                .finally()
                                        })
                                        .catch((e: any) => {
                                            failed("获取远程地址失败: " + `${e}`)
                                            ipcRenderer.invoke("cancel-StartFacadesWithYsoObject", token)
                                            setFacadesIsConnect(false)
                                            setShowBlockType("")
                                        })
                                        .finally(() => {})
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
                                            setShowBlockType("facade")
                                        })
                                        .catch((e: any) => {
                                            failed("启动FacadeServer失败: " + `${e}`)
                                        })
                                        .finally()
                                }

                                m.destroy()
                            }}
                        ></FacadeOptions>
                    )
                })
            }
        })
    }
    // 加载ClassGeneraterOptions
    const loadClassGeneraterOptions = (value: any[]) => {
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
            .then((d: {Options: YsoClassGeneraterOptions[]}) => {
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
                console.log(value)
                if (value[0] === "None") {
                    setSupportedFacades(true)
                } else {
                    setSupportedFacades(false)
                }
                setClassParamOptions(paramsObj)
                setShowClassParamOptions(true)
            })
            .catch((e: any) => {
                failed("Get class generater options failed: " + `${e}`)
            })
            .finally(() => setTimeout(() => setOptionsIsLoading(false), 300))
    }
    // 加载ClassOptions
    const loadClassOptions = (selectedOptions) => {
        let optionsLength = selectedOptions.length
        const targetOption = selectedOptions[optionsLength - 1]
        targetOption.loading = true
        if (optionsLength === 1) {
            ipcRenderer
                .invoke("GetAllYsoClassOptions", {Gadget: targetOption.value})
                .then((d: {Options: YsoRawOption[]}) => {
                    setOptionsIsLoading(true)
                    let classOptions: YsoOption[] = []
                    for (let option of d.Options) {
                        classOptions.push({
                            value: option.Name,
                            label: option.NameVerbose,
                            isLeaf: true
                        })
                    }
                    targetOption.children = classOptions
                    targetOption.loading = false
                    setOptions([...options])
                })
                .catch((e: any) => {
                    failed("Get class options failed: " + `${e}`)
                })
                .finally(() => setTimeout(() => setOptionsIsLoading(false), 300))
        }
    }

    // 初始化Options
    useEffect(() => {
        ipcRenderer
            .invoke("GetAllYsoGadgetOptions")
            .then((d: {Options: YsoRawOption[]}) => {
                setOptionsIsLoading(true)
                let options: YsoOption[] = []
                for (let option of d.Options) {
                    options.push({
                        value: option.Name,
                        label: option.NameVerbose,
                        isLeaf: false
                    })
                }
                setOptions(options)
            })
            .catch((e: any) => {
                failed("Get gadget options failed: " + `${e}`)
            })
            .finally(() => setTimeout(() => setOptionsIsLoading(false), 300))
    }, [])
    // 监听Channel
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
                            failed(message.data)
                            break
                        case "warning":
                            warn(message.data)
                            break
                        case "mirror_error":
                            failed(message.data)
                            ipcRenderer.invoke("cancel-StartFacadesWithYsoObject", token)
                            setFacadesIsConnect(false)
                            setShowBlockType("")
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
            } catch (e) {}
        })
        ipcRenderer.on(`${token}-error`, (_, data) => {
            if (data) {
                failed(`error: ${JSON.stringify(data)}`)
            }
        })
        ipcRenderer.on(`${token}-end`, () => {
            setFacadesIsConnect(false)
            setShowBlockType("")
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
    return (
        <>
            <Layout style={{width: "100%", height: "100%"}}>
                <Row style={{height: "50%"}}>
                    <Col span={12}>
                        <Cascader
                            loading={optionsIsLoading}
                            loadData={loadClassOptions}
                            placement='bottomLeft'
                            options={options}
                            onChange={loadClassGeneraterOptions}
                            size='large'
                        />
                    </Col>
                    <Col span={12}>
                        {showClassParamOptions && (
                            <>
                                <Form
                                    labelCol={{span: 6}}
                                    wrapperCol={{span: 14}}
                                    layout='horizontal'
                                    form={formInstance}
                                    initialValues={classParamOptions}
                                >
                                    {() => {
                                        let paramElement: JSX.Element[] = []
                                        const pushElement = (name: string, element: JSX.Element) => {
                                            paramElement.push(
                                                <Form.Item label={name} name={name}>
                                                    {element}
                                                </Form.Item>
                                            )
                                        }
                                        let classParamOptionsMap = new Map(Object.entries(classParamOptions))
                                        classParamOptionsMap.forEach((item, key) => {
                                            switch (typeof item) {
                                                case "string":
                                                    pushElement(key, <Input placeholder='' />)
                                                    break
                                                case "boolean":
                                                    pushElement(key, <Switch defaultChecked={item} />)
                                                    break
                                                case "number":
                                                    pushElement(key, <InputNumber min={1} max={65535} />)
                                                    break
                                            }
                                        })
                                        return paramElement
                                    }}
                                </Form>
                                {supportedFacades && (
                                    <Button
                                        onClick={() => {
                                            if (!facadesIsConnect) {
                                                submit("facadeOptions")
                                            } else {
                                                setShowBlockType("facade")
                                            }
                                        }}
                                    >
                                        反连服务
                                    </Button>
                                )}
                                <Button
                                    onClick={() => {
                                        submit("apply-class")
                                    }}
                                >
                                    应用到Facade Server
                                </Button>
                                <Button
                                    onClick={() => {
                                        submit("bytes")
                                    }}
                                >
                                    复制Base64 Payload
                                </Button>
                                <Button
                                    onClick={() => {
                                        submit("code")
                                    }}
                                >
                                    查看Yak代码
                                </Button>
                            </>
                        )}
                    </Col>
                </Row>

                <Row style={{height: "100%"}}>
                    {showBlockType === "code" ? (
                        <YakEditor
                            readOnly={true}
                            type={"yak"} //theme={"fuzz-http-theme"}
                            value={yakCode}

                            // actions={[...actionFuzzer]}
                        />
                    ) : null}
                    {showBlockType === "facade" ? (
                        <>
                            <div style={{width: "100%", height: "100%"}}>
                                <Alert
                                    type={"info"}
                                    message={
                                        <Space direction={"vertical"}>
                                            <Space>
                                                HTTP反连地址:
                                                <CopyableField text={`http://${reverseAddr}/${className}`} />
                                            </Space>
                                            <Space>
                                                RMI反连地址:
                                                <CopyableField text={`rmi://${reverseAddr}/${className}`} />
                                            </Space>
                                            <Space>
                                                LDAP反连地址:
                                                <CopyableField text={`ldap://${reverseAddr}/${className}`} />
                                            </Space>
                                        </Space>
                                    }
                                ></Alert>
                                <ReverseNotificationTable
                                    getInfo={getReverseAddr}
                                    loading={facadesLoading}
                                    logs={logs}
                                    clearHandle={() => {
                                        setIsClearLog(true)
                                        setLogs([])
                                    }}
                                    closeHandle={() => {
                                        ipcRenderer.invoke("cancel-StartFacadesWithYsoObject", token)
                                        setFacadesIsConnect(false)
                                        setShowBlockType("")
                                    }}
                                />
                            </div>
                        </>
                    ) : null}
                </Row>
            </Layout>
        </>
    )
})
