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
import {FacadeOptions} from "../reverseServer/FacadesOptions"
import {ThunderboltOutlined} from "@ant-design/icons"

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

export const PayloadGenerater_New: React.FC<PayloadGeneraterPageProp> = React.memo((props) => {
    const [formInstance] = Form.useForm()
    const [useGadget, setUseGadget] = useState(true)
    const [evilClass, setEvilClass] = useState("")
    const [evilGadget, setEvilGadget] = useState("")
    const [optionsIsLoading, setOptionsIsLoading] = useState(false)
    const [options, setOptions] = useState<YsoOption[]>([])
    const [generaterRequest, setGeneraterRequest] = useState<YsoGeneraterRequest>({Gadget: "", Class: "", Options: []})
    const [showClassParamOptions, setShowClassParamOptions] = useState(false)
    const [supportedFacades, setSupportedFacades] = useState(false)
    const [generaterOptionsForClass, setGeneraterOptionsForClass] = useState<YsoClassGeneraterOptions[]>([])
    const [generaterOptionsForGadget, setGeneraterOptionsForGadget] = useState<YsoClassGeneraterOptions[]>([])
    // 加载Options
    useEffect(() => {
        if (useGadget) {
            loadGadgetOptions()
        } else {
            loadAllClassForSelect()
        }
    }, [useGadget])
    // 初始化Gadget Options
    const loadGadgetOptions = useMemoizedFn(() => {
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
    })
    const loadAllClassForSelect = useMemoizedFn(() => {
        ipcRenderer
            .invoke("GetAllYsoClassOptions", {Gadget: "None"})
            .then((d: {Options: YsoRawOption[]}) => {
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
    // 加载所有类options
    const loadClassOptions = useMemoizedFn((selectedOptions) => {
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
    })
    // 加载生成类的Options
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

                if (value[0] === "None") {
                    setSupportedFacades(true)
                } else {
                    setSupportedFacades(false)
                }
                if (useGadget) {
                    setGeneraterOptionsForGadget(d.Options)
                } else {
                    setGeneraterOptionsForClass(d.Options)
                }
                setShowClassParamOptions(true)
            })
            .catch((e: any) => {
                failed("Get class generater options failed: " + `${e}`)
            })
            .finally(() => setTimeout(() => setOptionsIsLoading(false), 300))
    })
    const copyPayload = useMemoizedFn(() => {
        formInstance
            .validateFields()
            .then((vals: {[key: string]: any}) => {
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
            })
            .catch((e: any) => {
                failed("获取Form参数失败: " + `${e}`)
            })
    })
    const defaultParamOptions = {}
    return (
        <>
            <Col span={12} offset={5} style={{marginTop: "3rem"}}>
                <Form
                    labelCol={{span: 6}}
                    wrapperCol={{span: 14}}
                    layout='horizontal'
                    initialValues={defaultParamOptions}
                >
                    <SwitchItem
                        value={useGadget}
                        setValue={(v) => {
                            setUseGadget(v)
                        }}
                        label='使用利用链'
                        help='关闭则不使用利用链,只生成Class'
                    ></SwitchItem>
                    {useGadget && (
                        <Form.Item label='利用链' name='Gadget'>
                            <Cascader
                                loading={optionsIsLoading}
                                loadData={loadClassOptions}
                                // style={{marginTop: "-200px"}}
                                // defaultValue={["Zhejiang"]}
                                // open
                                placement='bottomLeft'
                                options={options}
                                onChange={loadClassGeneraterOptions}
                                size='large'
                                // placeholder='Please select'
                            />
                        </Form.Item>
                    )}
                    {!useGadget && (
                        <Form.Item label='恶意类' name='Class'>
                            <Select options={options} onChange={loadClassGeneraterOptions}></Select>
                        </Form.Item>
                    )}
                    {showClassParamOptions && (
                        <Form
                            labelCol={{span: 6}}
                            wrapperCol={{span: 14}}
                            layout='horizontal'
                            form={formInstance}
                            initialValues={useGadget ? generaterOptionsForGadget : generaterOptionsForClass}
                        >
                            {() => {
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
                                let generaterOptions = useGadget ? generaterOptionsForGadget : generaterOptionsForClass
                                generaterOptions.forEach((item) => {
                                    switch (item.Type) {
                                        case ParamType.String:
                                            pushElement(item.KeyVerbose, item.Key, <Input placeholder='' />)
                                            break
                                        case ParamType.StringBool:
                                            pushElement(
                                                item.KeyVerbose,
                                                item.Key,
                                                <Switch defaultChecked={item.Value === "true" ? true : false} />,
                                                false
                                            )
                                            break
                                        case ParamType.StringPort:
                                            pushElement(item.KeyVerbose, item.Key, <InputNumber min={1} max={65535} />)
                                            break
                                    }
                                })
                                if (useGadget) {
                                    paramElement.push(
                                        <Form.Item wrapperCol={{offset: 6}}>
                                            <Button
                                                type='primary'
                                                onClick={() => {
                                                    copyPayload()
                                                }}
                                            >
                                                复制 Payload
                                            </Button>
                                            <Button
                                                type='primary'
                                                ghost
                                                style={{margin: "1rem"}}
                                                icon={<ThunderboltOutlined />}
                                            >
                                                Yak Runner
                                            </Button>
                                        </Form.Item>
                                    )
                                } else {
                                    paramElement.push(
                                        <Form.Item wrapperCol={{offset: 6}}>
                                            <Button
                                                type='primary'
                                                onClick={() => {
                                                    const m = showModal({
                                                        width: "40%",
                                                        content: (
                                                            <FacadeOptions
                                                                onStartFacades={(params: StartFacadeServerParams) => {
                                                                    formInstance
                                                                        .validateFields()
                                                                        .then((vals: {[key: string]: any}) => {
                                                                            ipcRenderer.invoke("send-to-tab", {
                                                                                type: "facade-server",
                                                                                // 这儿的编码为了保证不要乱动
                                                                                data: {
                                                                                    facadeParams: params,
                                                                                    classParam: vals,
                                                                                    classType: generaterRequest.Class
                                                                                }
                                                                            })
                                                                        })
                                                                        .catch(() => {
                                                                            failed("获取form参数错误")
                                                                        })

                                                                    m.destroy()
                                                                }}
                                                            ></FacadeOptions>
                                                        )
                                                    })
                                                }}
                                            >
                                                启动反连服务
                                            </Button>
                                            <Button
                                                type='primary'
                                                ghost
                                                style={{marginLeft: "1rem"}}
                                                onClick={() => {
                                                    copyPayload()
                                                }}
                                            >
                                                复制 Payload
                                            </Button>
                                            <Button
                                                type='primary'
                                                ghost
                                                style={{marginLeft: "1rem"}}
                                                icon={<ThunderboltOutlined />}
                                            >
                                                Yak Runner
                                            </Button>
                                        </Form.Item>
                                    )
                                }

                                return paramElement
                            }}
                        </Form>
                    )}
                </Form>
            </Col>
        </>
    )
})
