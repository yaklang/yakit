import React, {useRef, useEffect, useState, useMemo} from "react"
import {useGetState, useMemoizedFn} from "ahooks"
import {InputNumber, Button, Form, Cascader, Switch, Input, Select, Tooltip, Radio, Alert, Space} from "antd"
import {
    QuestionOutlined,
    ExclamationCircleOutlined,
    ThunderboltOutlined,
    DownloadOutlined,
    CopyOutlined,
    FullscreenOutlined,
    FullscreenExitOutlined
} from "@ant-design/icons"
import {failed, info, success, warn} from "../../utils/notification"
import {
    BRIDGE_ADDR,
    BRIDGE_SECRET,
    FacadesRequest,
    NetInterface,
    SettingReverseParamsInfo
} from "../reverseServer/NewReverseServerPage"
import {randomString} from "@/utils/randomUtil"
import {AutoCard} from "@/components/AutoCard"
import {AutoSpin} from "@/components/AutoSpin"
import {YakCodeEditor} from "@/utils/editors"
import {callCopyToClipboard} from "@/utils/basic"
import {CopyableField} from "@/utils/inputUtil"
import {ReverseNotification, ReverseTable} from "../reverseServer/ReverseTable"
import {getRemoteValue} from "@/utils/kv"
import {ExtractExecResultMessage} from "@/components/yakitLogSchema"
import {ExecResultLog} from "../invoker/batch/ExecMessageViewer"
import HexEditor from "react-hex-editor"
import {saveABSFileToOpen} from "@/utils/openWebsite"
import {saveAs} from "file-saver"

import "./javaPayloadPage.scss"

const {ipcRenderer} = window.require("electron")

export interface JavaPayloadPageProp {}

export interface YsoGeneraterRequest {
    Gadget: string
    Class: string
    Options: {Key: string; Value: string | number | boolean}[]
}

interface ParamsProps {
    Gadget: string
    Class: string
    [key: string]: string | number | boolean
}
export interface ParamsRefProps extends ParamsProps {
    useGadget: boolean
}

export interface FormList {
    Key: string
    KeyVerbose: string
    Help: string
    Value: string
    Type: string
}

export interface FormBindInfo {
    [key: string]: string[]
}

const DefaultParams: ParamsProps = {
    Gadget: "",
    Class: ""
}

export const convertRequest = (value: ParamsRefProps) => {
    const dataRef = value
    const excludeKey = ["useGadget", "Gadget", "Class"]
    const data: YsoGeneraterRequest = {
        Gadget: dataRef.Gadget,
        Class: dataRef.Class,
        Options: []
    }
    for (let name in dataRef) {
        if (!excludeKey.includes(name)) data.Options.push({Key: name, Value: dataRef[name]})
    }
    return data
}

export const JavaPayloadPage: React.FC<JavaPayloadPageProp> = React.memo((props) => {
    const [loading, setLoading] = useState<boolean>(false)
    const [token, setToken, getToken] = useGetState<string>(randomString(40))

    const paramsRef = useRef<ParamsRefProps>({useGadget: true, ...DefaultParams})
    const [params, setParams] = useState<ParamsRefProps>({useGadget: true, ...DefaultParams})
    const [codeRefresh, setCodeRefresh] = useState<boolean>(false)

    const [showAddr, setShowAddr] = useState<boolean>(false)
    /**
     * @name 反连服务器参数初始值
     */
    const addrParamsRef = useRef<SettingReverseParamsInfo>({
        BridgeParam: {Addr: "", Secret: ""},
        IsRemote: false,
        ReversePort: 8085,
        ReverseHost: "127.0.0.1"
    })
    /**
     * @name 用户自定义反连服务器参数
     */
    const [addrParams, setAddrParams] = useState<SettingReverseParamsInfo>({
        BridgeParam: {Addr: "", Secret: ""},
        IsRemote: false,
        ReversePort: 8085,
        ReverseHost: "127.0.0.1"
    })
    const [remoteIp, setRemoteIp] = useState<string>("")

    const [isStart, setIsStart] = useState<boolean>(false)
    const [codeExtra, setCodeExtra] = useState<boolean>(false)
    const [tableExtra, setTableExtra] = useState<boolean>(false)

    const dataRef = useRef<ReverseNotification[]>([])
    const [data, setData, getData] = useGetState<ReverseNotification[]>([])
    const totalRef = useRef<number>(0)

    const reverseAddr = useMemo(() => {
        const addrSetting = showAddr ? addrParams : addrParamsRef.current
        const host = addrSetting.IsRemote
            ? `${remoteIp}:${addrSetting.ReversePort}`
            : `${addrSetting.ReverseHost}:${addrSetting.ReversePort}`
        return host
    }, [showAddr, addrParams, remoteIp])

    // 获取系统全局配置的反连参数和本地反连IP
    useEffect(() => {
        const initParams = addrParamsRef.current

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
                                setAddrParams({...initParams})
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
                        setAddrParams({...initParams})
                        setTimeout(() => setLoading(false), 300)
                    })
            }
        })
    }, [])
    // 实时接收反连数据
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
                            stopReverse()
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
                stopReverse(true)
            }
        })
        ipcRenderer.on(`${token}-end`, () => stopReverse(true))
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

    // 关闭接收反连数据监听
    const stopReverse = (isCancel?: boolean) => {
        if (!isCancel) {
            ipcRenderer.invoke("cancel-StartFacadesWithYsoObject", token).then(() => {
                success("已关闭FacadeServer")
            })
        }
        setToken(randomString(40))
        setIsStart(false)
    }
    // 清空现存反连数据
    const clearReverseData = () => {
        dataRef.current = []
        totalRef.current = 0
        setData([])
    }

    /**
     * @name 启动反连服务器
     */
    const startUpFacadeServer = (value: ParamsRefProps, addr: SettingReverseParamsInfo, remote: string) => {
        const classData = {...convertRequest({...value})}
        let startFacadeParams: FacadesRequest = {
            ...addr,
            GenerateClassParams: {...classData},
            Token: getToken()
        }
        if (startFacadeParams.IsRemote) startFacadeParams.ReverseHost = remote

        setLoading(false)
        ipcRenderer
            .invoke("StartFacadesWithYsoObject", startFacadeParams, token)
            .then(() => {
                setTimeout(() => {
                    ipcRenderer
                        .invoke("ApplyClassToFacades", {
                            Token: getToken(),
                            GenerateClassParams: {...classData}
                        })
                        .then((res) => {
                            paramsRef.current = {...value}
                            info("启动FacadeServer")
                            setIsStart(true)
                            setCodeRefresh(!codeRefresh)
                        })
                        .catch((err) => {
                            failed(`应用到FacadeServer失败${err}`)
                            stopReverse()
                        })
                        .finally(() => setTimeout(() => setLoading(false), 300))
                }, 200)
            })
            .catch((e: any) => {
                failed("启动FacadeServer失败: " + `${e}`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    }
    /**
     * @name 启动带有payload配置的反连
     */
    const onStart = useMemoizedFn((value: ParamsRefProps) => {
        if (isStart) {
            stopReverse()
            setTimeout(() => setLoading(false), 200)
        } else {
            // 判断反连服务器参数是否有误
            let reverseAddr = addrParamsRef.current
            if (showAddr) {
                reverseAddr = {...addrParams}
                let hint = "开启高级配置后,"
                if (reverseAddr.IsRemote) {
                    if (!reverseAddr.BridgeParam.Addr) hint += "请填写公网IP,"
                } else {
                    if (!reverseAddr.BridgeParam.Addr) hint += "请填写反连IP,"
                }
                if (!reverseAddr.ReversePort && reverseAddr.ReversePort !== 0) hint += "请填写端口号"
                if (hint !== "开启高级配置后,") {
                    failed(hint)
                    return
                }
            }

            // 生成启动反连服务器的后端请求参数
            if (reverseAddr.IsRemote) {
                ipcRenderer
                    .invoke("GetTunnelServerExternalIP", {
                        Addr: reverseAddr.BridgeParam.Addr,
                        Secret: reverseAddr.BridgeParam.Secret
                    })
                    .then((data: {IP: string}) => {
                        setRemoteIp(data.IP)
                        startUpFacadeServer(value, reverseAddr, data.IP)
                    })
                    .catch((e: any) => failed("获取远程地址失败: " + `${e}`))
                    .finally(() => setTimeout(() => setLoading(false), 300))
            } else startUpFacadeServer(value, reverseAddr, "")
        }
    })
    /**
     * @name 给反连应用payload配置
     */
    const onApply = useMemoizedFn((value: ParamsRefProps) => {
        const data = convertRequest(value)
        paramsRef.current = {...value}
        if (isStart) {
            ipcRenderer
                .invoke("ApplyClassToFacades", {Token: token, GenerateClassParams: {...data}})
                .then((res) => info("应用到FacadeServer成功"))
                .catch((err) => failed(`应用到FacadeServer失败${err}`))
                .finally(() => setTimeout(() => setLoading(false), 300))
        } else {
            setTimeout(() => setLoading(false), 300)
        }
        setCodeRefresh(!codeRefresh)
    })

    const changeCodeExtra = useMemoizedFn(() => {
        setCodeExtra(!codeExtra)
    })

    return (
        <div className='java-payload-wrapper'>
            <div className={`payload-${tableExtra ? "hidden" : "info"}-wrapper`}>
                <div className='wrapper-body'>
                    <div className={`body-${codeExtra ? "hidden-" : ""}left`}>
                        <PayloadForm
                            isStart={isStart}
                            paramsData={{...params}}
                            setParamsData={(value) => setParams({...value})}
                            loading={loading}
                            setLoading={setLoading}
                            onStart={onStart}
                            onApply={onApply}
                            extraNode={
                                isStart ? (
                                    <></>
                                ) : !params.useGadget ? (
                                    <Form size='small' labelCol={{span: 8}} wrapperCol={{span: 16}}>
                                        <Form.Item
                                            label={
                                                <div className='form-item-label-title'>
                                                    高级设置
                                                    <Tooltip placement='bottom' title='配置反连服务器参数'>
                                                        <ExclamationCircleOutlined className='question-icon' />
                                                    </Tooltip>
                                                </div>
                                            }
                                        >
                                            <Switch checked={showAddr} onChange={(check) => setShowAddr(check)} />
                                        </Form.Item>
                                        {showAddr && (
                                            <>
                                                <Form.Item label='启用公网穿透'>
                                                    <Switch
                                                        checked={addrParams.IsRemote}
                                                        onChange={(IsRemote) =>
                                                            setAddrParams({...addrParams, IsRemote})
                                                        }
                                                    />
                                                </Form.Item>

                                                {addrParams.IsRemote && (
                                                    <>
                                                        <Form.Item label='公网Bridge地址'>
                                                            <Input
                                                                allowClear={true}
                                                                value={addrParams.BridgeParam.Addr}
                                                                onChange={(e) => {
                                                                    addrParams.BridgeParam.Addr = e.target.value
                                                                    setAddrParams({...addrParams})
                                                                }}
                                                            />
                                                        </Form.Item>
                                                        <Form.Item label='密码'>
                                                            <Input
                                                                allowClear={true}
                                                                value={addrParams.BridgeParam.Secret}
                                                                onChange={(e) => {
                                                                    addrParams.BridgeParam.Secret = e.target.value
                                                                    setAddrParams({...addrParams})
                                                                }}
                                                            />
                                                        </Form.Item>
                                                    </>
                                                )}
                                                {!addrParams.IsRemote && (
                                                    <Form.Item label='反连地址'>
                                                        <Input
                                                            allowClear={true}
                                                            value={addrParams.ReverseHost}
                                                            onChange={(e) =>
                                                                setAddrParams({
                                                                    ...addrParams,
                                                                    ReverseHost: e.target.value
                                                                })
                                                            }
                                                        />
                                                    </Form.Item>
                                                )}
                                                <Form.Item label='反连端口'>
                                                    <InputNumber
                                                        width='100%'
                                                        min={0}
                                                        max={65535}
                                                        precision={0}
                                                        value={addrParams.ReversePort}
                                                        onChange={(ReversePort) =>
                                                            setAddrParams({...addrParams, ReversePort})
                                                        }
                                                    />
                                                </Form.Item>
                                            </>
                                        )}
                                    </Form>
                                ) : (
                                    <></>
                                )
                            }
                        />
                    </div>

                    <div className='body-right'>
                        <PayloadCode
                            codeExtra={codeExtra}
                            data={paramsRef.current}
                            RefreshTrigger={codeRefresh}
                            onExtra={changeCodeExtra}
                        />
                    </div>
                </div>
            </div>

            <div className={`reverse-${isStart && !codeExtra ? "info" : "hidden"}-wrapper`}>
                <div className='wrapper-body'>
                    <div className='body-left'>
                        <AutoCard title='反连地址' className='info-addr-card' size='small' bodyStyle={{padding: 16}}>
                            <Alert
                                type={"info"}
                                className='addr-alert'
                                style={{alignItems: "baseline", height: "100%"}}
                                message={
                                    <Space direction={"vertical"}>
                                        <div className='addr-body'>
                                            HTTP反连地址&nbsp;&nbsp;
                                            <CopyableField
                                                width={340}
                                                text={`http://${reverseAddr}/${paramsRef.current?.ClassName || ""}`}
                                                style={{color: "blue"}}
                                            />
                                        </div>
                                        <div className='addr-body'>
                                            RMI反连地址&nbsp;&nbsp;
                                            <CopyableField
                                                width={340}
                                                text={`rmi://${reverseAddr}/${paramsRef.current?.ClassName || ""}`}
                                                style={{color: "blue"}}
                                            />
                                        </div>
                                        <div className='addr-body'>
                                            LDAP反连地址&nbsp;&nbsp;
                                            <CopyableField
                                                width={340}
                                                text={`ldap://${reverseAddr}/${paramsRef.current?.ClassName || ""}`}
                                                style={{color: "blue"}}
                                            />
                                        </div>
                                    </Space>
                                }
                            ></Alert>
                        </AutoCard>
                    </div>

                    <div className='body-right'>
                        <ReverseTable
                            isShowExtra={true}
                            isExtra={tableExtra}
                            onExtra={() => setTableExtra(!tableExtra)}
                            total={totalRef.current}
                            data={data}
                            clearData={clearReverseData}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
})

interface PayloadFormProp {
    isReverse?: boolean
    isShowCode?: boolean
    showCode?: () => any
    isStart?: boolean
    paramsData: ParamsRefProps
    setParamsData: (value: ParamsRefProps) => any

    loading: boolean
    setLoading: (value: boolean) => any
    onStart?: (value: ParamsRefProps) => any
    onApply: (value: ParamsRefProps) => any
    extraNode?: React.ReactNode
}

interface YsoClassGeneraterOptions extends FormList {
    BindOptions: {[key: string]: {Options: YsoClassGeneraterOptions[]}}
}

interface YsoOptionInfo {
    Name: string
    NameVerbose: string
    Help: string
}
interface OptionInfo {
    Name: string
    NameVerbose: string | React.ReactNode
    Label: string
    Help: string
    isLeaf?: boolean
    children?: OptionInfo[]
}

enum FormParamsType {
    String = "String",
    Base64Bytes = "Base64Bytes",
    StringBool = "StringBool",
    StringPort = "StringPort"
}

export const PayloadForm: React.FC<PayloadFormProp> = React.memo((props) => {
    const {
        isReverse = false,
        isShowCode = false,
        showCode,
        isStart,
        paramsData,
        setParamsData,
        loading,
        setLoading,
        onStart,
        onApply,
        extraNode
    } = props

    const isInit = useRef<boolean>(true)

    const [formInstance] = Form.useForm()
    const [useGadget, setUseGadget, getUseGadget] = useGetState<boolean>(!isReverse ? paramsData.useGadget : false)
    const paramsRef = useRef<ParamsRefProps>({...paramsData})
    const [params, setParams] = useState<ParamsProps>({...paramsData})

    const setParamsValue = useMemoizedFn((args: {key: string; value: string | number | boolean}[]) => {
        for (let item of args) paramsRef.current[item.key] = item.value
        setParams({...paramsRef.current})
        setParamsData({...paramsRef.current})
        formInstance.setFieldsValue({...paramsRef.current})
    })
    const cleatParams = useMemoizedFn(() => {
        paramsRef.current = {useGadget, ...DefaultParams}
        setParams({...DefaultParams})
        formInstance.setFieldsValue({useGadget, ...DefaultParams})
        setFormList([])
        formBindRef.current = {}
    })

    const [btnLoading, setBtnLoading] = useState<boolean>(false)
    const [options, setOptions] = useState<OptionInfo[]>([])
    const [formList, setFormList] = useState<FormList[]>([])
    const formBindRef = useRef<FormBindInfo>({})

    const formStart = useMemoizedFn(() => {
        if (!onStart) return
        if (isStart) {
            onStart({...paramsRef.current})
        } else {
            formInstance.validateFields().then(() => {
                setLoading(true)
                onStart({...paramsRef.current})
            })
        }
    })
    const formApply = useMemoizedFn(() => {
        formInstance.validateFields().then(() => {
            setLoading(true)
            onApply({...paramsRef.current})
        })
    })

    useEffect(() => {
        loadOptions(useGadget)
        if (isInit.current) {
            formInstance.setFieldsValue({...paramsData})
            formInstance.resetFields()
            isInit.current = false
        } else cleatParams()
    }, [useGadget])
    const loadOptions = (isGadget: boolean) => {
        ipcRenderer
            .invoke(
                isGadget ? "GetAllYsoGadgetOptions" : "GetAllYsoClassOptions",
                isGadget ? undefined : {Gadget: "None"}
            )
            .then((d: {Options: YsoOptionInfo[]}) => {
                const {Options} = d
                let optionArr: OptionInfo[] = Options.map((item) => {
                    const info: OptionInfo = {
                        ...item,
                        NameVerbose: isGadget ? (
                            <div className='form-item-options-title'>
                                {item.NameVerbose}
                                {!!item.Help && (
                                    <Tooltip placement='bottom' title={item.Help}>
                                        <QuestionOutlined className='question-icon' />
                                    </Tooltip>
                                )}
                            </div>
                        ) : (
                            item.NameVerbose
                        ),
                        Label: item.NameVerbose,
                        isLeaf: false,
                        children: []
                    }
                    return info
                })
                setOptions(optionArr)
            })
            .catch((e: any) => failed(`${isGadget ? "获取利用链失败: " : "获取恶意类失败: "} ${e}`))
    }
    const loadClassOptions = useMemoizedFn((selectedOptions: any[]) => {
        const targetOption = selectedOptions[selectedOptions.length - 1]

        if (selectedOptions.length === 1) {
            ipcRenderer
                .invoke("GetAllYsoClassOptions", {Gadget: targetOption.Name})
                .then((d: {Options: YsoOptionInfo[]}) => {
                    const {Options} = d
                    let optionArr: OptionInfo[] = Options.map((item) => {
                        const info: OptionInfo = {
                            ...item,
                            NameVerbose: useGadget ? (
                                <div className='form-item-options-title'>
                                    {item.NameVerbose}
                                    {!!item.Help && (
                                        <Tooltip placement='bottom' title={item.Help}>
                                            <QuestionOutlined className='question-icon' />
                                        </Tooltip>
                                    )}
                                </div>
                            ) : (
                                item.NameVerbose
                            ),
                            Label: item.NameVerbose,
                            isLeaf: true
                        }
                        return info
                    })
                    targetOption.children = optionArr
                    setOptions([...options])
                })
                .catch((e: any) => {
                    failed("Get class options failed: " + `${e}`)
                })
        }
    })

    const loadGeneraterFormList = useMemoizedFn((value: any[]) => {
        setBtnLoading(true)
        ipcRenderer
            .invoke("GetAllYsoClassGeneraterOptions", {Class: value[1], Gadget: value[0]})
            .then((d: {Options: YsoClassGeneraterOptions[]}) => {
                const {Options} = d

                const paramsOptions: {[key: string]: string | number | boolean} = {}
                const formLists: FormList[] = []
                for (let el of Options) {
                    if (Object.keys(el.BindOptions).length > 0) {
                        const relation: string[] = []
                        for (let bindValue in el.BindOptions) {
                            relation.push(
                                `${bindValue}||${el.BindOptions[bindValue].Options.map((item) => item.Key).join("||")}`
                            )
                        }
                        formBindRef.current[el.Key] = [...relation]
                    }
                    formLists.push(el)
                    switch (el.Type) {
                        case FormParamsType.String:
                        case FormParamsType.Base64Bytes:
                            paramsOptions[el.Key] = el.Value
                            break
                        case FormParamsType.StringPort:
                            paramsOptions[el.Key] = !el.Value ? 1 : +el.Value || 1
                            break
                        case FormParamsType.StringBool:
                            paramsOptions[el.Key] = !el.Value ? false : el.Value === "false" ? false : true
                            break
                    }
                }
                paramsRef.current = {
                    useGadget,
                    Gadget: paramsRef.current.Gadget,
                    Class: paramsRef.current.Class,
                    ...paramsOptions
                }
                setParams({...paramsRef.current})
                formInstance.setFieldsValue({...paramsRef.current})
                setTimeout(() => setFormList(formLists), 300)
            })
            .catch((e: any) => {
                failed("Get class generater options failed: " + `${e}`)
            })
            .finally(() => setTimeout(() => setBtnLoading(false), 300))
    })

    // 暂时只支持布尔类型与string类型的单向绑定
    const judgeBindValue = useMemoizedFn((key: string) => {
        const bindRef = formBindRef.current
        const paramsValue = paramsRef.current

        for (let keyName in bindRef) {
            const valueArr = bindRef[keyName] || []
            for (let bindKey of valueArr) {
                if (bindKey.indexOf(key) > -1) {
                    const value = bindKey.split("||").shift()
                    if ((!!paramsValue[keyName]).toString() !== value) {
                        return false
                    }
                }
            }
        }
        return true
    })

    return (
        <AutoCard
            className='setting-payload-wrapper'
            size='small'
            bodyStyle={{padding: "20px 16px", overflow: "auto"}}
            title={
                <div>
                    JavaPayload 配置
                    <Tooltip placement='bottom' title='配置序列化Payload或恶意类'>
                        <ExclamationCircleOutlined className='setting-payload-icon' />
                    </Tooltip>
                </div>
            }
            extra={
                <div>
                    {!isReverse && !useGadget && (
                        <Button
                            loading={btnLoading || loading}
                            className='setting-payload-btn'
                            type='primary'
                            ghost={true}
                            danger={isStart}
                            size='small'
                            onClick={formStart}
                        >
                            {isStart ? "关闭反连" : "启动反连"}
                        </Button>
                    )}
                    {isReverse && (
                        <Button
                            className='setting-payload-btn'
                            type='primary'
                            danger={isShowCode}
                            ghost={true}
                            size='small'
                            onClick={showCode}
                        >
                            {isShowCode ? "关闭代码" : "显示代码"}
                        </Button>
                    )}
                    <Button
                        loading={btnLoading || loading}
                        className='setting-payload-btn'
                        size='small'
                        type='primary'
                        onClick={formApply}
                    >
                        生成
                    </Button>
                </div>
            }
        >
            <AutoSpin wrapperClassName='form-common-style' spinning={loading}>
                <Form
                    form={formInstance}
                    name='form'
                    size='small'
                    labelCol={{span: 8}}
                    wrapperCol={{span: 16}}
                    colon={false}
                    initialValues={{...paramsRef.current}}
                    autoComplete='off'
                >
                    {!isReverse && (
                        <Form.Item
                            label={
                                <div className='form-item-label-title'>
                                    使用利用链
                                    <Tooltip placement='bottom' title='关闭则不使用利用链,只生成恶意类'>
                                        <ExclamationCircleOutlined className='question-icon' />
                                    </Tooltip>
                                </div>
                            }
                            name='useGadget'
                        >
                            <Switch
                                disabled={isStart}
                                checked={useGadget}
                                onChange={(check) => {
                                    setUseGadget(check)
                                    setParamsData({...paramsRef.current, useGadget: check})
                                    setTimeout(() => cleatParams(), 300)
                                }}
                            />
                        </Form.Item>
                    )}

                    <Form.Item
                        label={useGadget ? "利用链" : "恶意类"}
                        rules={[
                            {required: true, message: ""},
                            () => ({
                                validator(_, value) {
                                    if (getUseGadget()) {
                                        if (Array.isArray(value) && value.length > 0) return Promise.resolve()
                                        return Promise.reject(new Error(""))
                                    } else {
                                        if (!!value) return Promise.resolve()
                                        return Promise.reject(new Error(""))
                                    }
                                }
                            })
                        ]}
                        name={useGadget ? "[Gadget,Class]" : "Class"}
                    >
                        {useGadget ? (
                            <Cascader
                                fieldNames={{label: "NameVerbose", value: "Name", children: "children"}}
                                loadData={loadClassOptions}
                                options={options}
                                value={!params.Gadget ? [] : [params.Gadget, params.Class]}
                                placeholder='请选择利用链'
                                onChange={(value: any[]) => {
                                    if (!value || value.length === 0) cleatParams()
                                    else {
                                        setParamsValue([
                                            {key: "Gadget", value: value[0]},
                                            {key: "Class", value: value[1]}
                                        ])
                                        // 防止此操作干扰上面的赋值操作
                                        setTimeout(() => loadGeneraterFormList(value), 200)
                                    }
                                }}
                                displayRender={(label, selectedOptions) => {
                                    const diplay = (selectedOptions || []).map((item: any) => item.Label).join(" / ")
                                    return <>{diplay}</>
                                }}
                            />
                        ) : (
                            <Select
                                allowClear={true}
                                placeholder='请选择恶意类'
                                optionLabelProp='NameVerbose'
                                value={params.Class}
                                onChange={(value) => {
                                    if (!!value) {
                                        setParamsValue([
                                            {key: "Gadget", value: "None"},
                                            {key: "Class", value: value}
                                        ])
                                        // 防止此操作干扰上面的赋值操作
                                        setTimeout(() => loadGeneraterFormList(["None", value]), 200)
                                    } else cleatParams()
                                }}
                            >
                                {options.map((item) => {
                                    return (
                                        <Select.Option key={item.Name} value={item.Name}>
                                            <div className='form-item-options-title'>
                                                {item.NameVerbose}
                                                {!!item.Help && (
                                                    <Tooltip placement='bottom' title={item.Help}>
                                                        <QuestionOutlined className='question-icon' />
                                                    </Tooltip>
                                                )}
                                            </div>
                                        </Select.Option>
                                    )
                                })}
                            </Select>
                        )}
                    </Form.Item>

                    {formList.map((item) => {
                        const flag = judgeBindValue(item.Key)
                        if (!flag) return <div key={item.Key}></div>

                        let hint = ""
                        // if (item.Type === FormParamsType.String || item.Type === FormParamsType.Base64Bytes)
                        //     hint = `请填写${item.KeyVerbose}`
                        // if (item.Type === FormParamsType.StringPort) hint = `请输入${item.KeyVerbose}`
                        // if (item.Type === FormParamsType.StringBool) hint = `请开关${item.KeyVerbose}`

                        return (
                            <Form.Item
                                key={item.Key}
                                label={
                                    <div className='form-item-label-title'>
                                        {item.KeyVerbose}
                                        {!!item.Help && (
                                            <Tooltip placement='bottom' title={item.Help}>
                                                <ExclamationCircleOutlined className='question-icon' />
                                            </Tooltip>
                                        )}
                                    </div>
                                }
                                name={item.Key}
                                rules={[
                                    {required: true, message: ""},
                                    () => ({
                                        validator(_, value) {
                                            if (
                                                item.Type === FormParamsType.StringBool ||
                                                item.Type === FormParamsType.StringPort
                                            )
                                                return Promise.resolve()
                                            if (value) return Promise.resolve()
                                            return Promise.reject(new Error(hint))
                                        }
                                    })
                                ]}
                            >
                                {(item.Type === FormParamsType.String || item.Type === FormParamsType.Base64Bytes) && (
                                    <Input
                                        allowClear={true}
                                        placeholder={
                                            item.Type === FormParamsType.Base64Bytes
                                                ? "填写内容需Base64编码"
                                                : `请输入${item.KeyVerbose}`
                                        }
                                        value={params[item.Key] as string}
                                        onChange={(e) => setParamsValue([{key: item.Key, value: e.target.value}])}
                                    />
                                )}
                                {item.Type === FormParamsType.StringPort && (
                                    <InputNumber
                                        min={0}
                                        max={65535}
                                        precision={0}
                                        value={+params[item.Key]}
                                        onChange={(value) => setParamsValue([{key: item.Key, value: value}])}
                                    />
                                )}
                                {item.Type === FormParamsType.StringBool && (
                                    <Switch
                                        checked={!!params[item.Key]}
                                        onChange={(check) => {
                                            const info: {key: string; value: string | boolean}[] = [
                                                {key: item.Key, value: check}
                                            ]
                                            for (let name in formBindRef.current) {
                                                if (name === item.Key) {
                                                    const keyArr = formBindRef.current[name].filter(
                                                        (item) => item.indexOf(check.toString()) > -1
                                                    )
                                                    if (keyArr.length > 0) {
                                                        const keys = keyArr[keyArr.length - 1].split("||")
                                                        keys.shift()
                                                        for (let keyName of keys) info.push({key: keyName, value: ""})
                                                    }
                                                    break
                                                }
                                            }
                                            setParamsValue([...info])
                                        }}
                                    />
                                )}
                            </Form.Item>
                        )
                    })}
                </Form>
                {!!extraNode && extraNode}
            </AutoSpin>
        </AutoCard>
    )
})

interface PayloadCodeProp {
    isMin?: boolean
    codeExtra: boolean
    data: ParamsRefProps
    RefreshTrigger: boolean
    onExtra: () => any
}

const CodeType: {value: string; label: string}[] = [
    {value: "base64", label: "BASE64"},
    {value: "hex", label: "HEX"},
    // {value: "javadump", label: "JavaDump"},
    {value: "yak", label: "YAK"}
]

export const PayloadCode: React.FC<PayloadCodeProp> = React.memo((props) => {
    const {isMin = false, codeExtra, data, RefreshTrigger, onExtra} = props

    const [loading, setLoading] = useState<boolean>(false)
    const [type, setType] = useState<string>("base64")
    const [code, setCode] = useState<string>("")
    const [hex, setHex] = useState<Uint8Array>(new Uint8Array())

    useEffect(() => convertCode(type), [RefreshTrigger])

    const typeChange = useMemoizedFn((value: string) => {
        setType(value)
        convertCode(value)
    })

    /**
     * @name 生成各种类型代码
     */
    const convertCode = useMemoizedFn((type: string) => {
        if (!data.Class || !data.Gadget) return
        switch (type) {
            case "base64":
                convertBase64()
                return
            case "hex":
                convertHex()
                return
            case "yak":
                convertYak()
                return
        }
    })

    const codeOperate = useMemoizedFn((value: "yakRunning" | "download" | "copy" | "extra") => {
        if (value === "yakRunning") {
            ipcRenderer.invoke("send-to-tab", {
                type: "add-yak-running",
                data: {
                    name: `${data.Class}/${data.Gadget}-${new Date().getTime()}`,
                    code: code
                }
            })
        }
        if (value === "download") {
            saveABSFileToOpen(`${type}-${data.Class}-${data.Gadget}`, type === "hex" ? hex : code)
        }

        if (value === "copy") callCopyToClipboard(code)
        if (value === "extra") onExtra()
    })

    const convertBase64 = useMemoizedFn(() => {
        setLoading(true)
        const request = convertRequest(data)
        ipcRenderer
            .invoke("GenerateYsoBytes", request)
            .then((d: {Bytes: Uint8Array; FileName: string}) => {
                ipcRenderer
                    .invoke("BytesToBase64", {
                        Bytes: d.Bytes
                    })
                    .then((res: {Base64: string}) => {
                        success("生成Base64成功")
                        setCode(res.Base64)
                    })
                    .catch((err) => {
                        failed(`${err}`)
                    })
            })
            .catch((e: any) => {
                failed("生成Base64失败: " + `${e}`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })
    const convertHex = useMemoizedFn(() => {
        setLoading(true)
        const request = convertRequest(data)
        ipcRenderer
            .invoke("GenerateYsoBytes", request)
            .then((d: {Bytes: Uint8Array; FileName: string}) => {
                success("生成字节码成功")
                setHex(d.Bytes)
            })
            .catch((e: any) => {
                failed("生成字节码失败: " + `${e}`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })
    // const convertJava = useMemoizedFn(() => {
    //     const request = convertRequest(data)
    // })
    const convertYak = useMemoizedFn(() => {
        setLoading(true)
        const request = convertRequest(data)
        ipcRenderer
            .invoke("GenerateYsoCode", request)
            .then((d: {Code: string}) => {
                success("生成代码成功")
                setCode(d.Code)
            })
            .catch((e: any) => {
                failed("生成代码失败: " + `${e}`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })

    return (
        <AutoCard
            className='code-payload-wrapper'
            size='small'
            bodyStyle={{padding: 0, overflow: "hidden"}}
            title={
                <div>
                    代码
                    <Radio.Group
                        className='code-type-radio'
                        size='small'
                        buttonStyle='solid'
                        value={type}
                        onChange={({target: {value}}) => typeChange(value)}
                    >
                        {CodeType.map((item) => (
                            <Radio.Button key={item.value} value={item.value}>
                                {item.label}
                            </Radio.Button>
                        ))}
                    </Radio.Group>
                </div>
            }
            extra={
                isMin && !codeExtra ? (
                    <div>
                        <Button
                            loading={loading}
                            type='link'
                            size='small'
                            icon={<ThunderboltOutlined />}
                            disabled={type === "hex"}
                            onClick={() => codeOperate("yakRunning")}
                        />
                        <Button
                            loading={loading}
                            type='link'
                            size='small'
                            icon={<DownloadOutlined />}
                            onClick={() => codeOperate("download")}
                        />
                        <Button
                            loading={loading}
                            type='link'
                            size='small'
                            icon={<CopyOutlined />}
                            disabled={type === "hex"}
                            onClick={() => codeOperate("copy")}
                        />
                        <Button
                            type='link'
                            size='small'
                            icon={codeExtra ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                            onClick={() => codeOperate("extra")}
                        />
                    </div>
                ) : (
                    <div className='extra-btns'>
                        <Button
                            loading={loading}
                            type='primary'
                            ghost={true}
                            size='small'
                            icon={<ThunderboltOutlined />}
                            disabled={type === "hex"}
                            onClick={() => codeOperate("yakRunning")}
                        >
                            Yak Runner
                        </Button>
                        <Button
                            loading={loading}
                            type='primary'
                            size='small'
                            ghost={true}
                            onClick={() => codeOperate("download")}
                        >
                            下载文件
                        </Button>
                        <Button
                            loading={loading}
                            type='primary'
                            size='small'
                            disabled={type === "hex"}
                            onClick={() => codeOperate("copy")}
                        >
                            复制代码
                        </Button>
                        <Button
                            type='link'
                            size='small'
                            icon={codeExtra ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                            onClick={() => codeOperate("extra")}
                        />
                    </div>
                )
            }
        >
            <AutoSpin spinning={loading}>
                {type === "hex" ? (
                    <HexEditor showAscii={true} data={hex} showRowLabels={true} showColumnLabels={false} nonce={0} />
                ) : (
                    <YakCodeEditor readOnly={true} originValue={Buffer.from(code, "utf8")} />
                )}
            </AutoSpin>
        </AutoCard>
    )
})
