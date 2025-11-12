import React, {useRef, useEffect, useState, useMemo} from "react"
import {useGetState, useMemoizedFn, useCreation, useRequest} from "ahooks"
import {Form, Tooltip, Space, Typography, Divider} from "antd"
import {
    QuestionOutlined,
    ExclamationCircleOutlined,
    ThunderboltOutlined,
    DownloadOutlined,
    CopyOutlined,
    FullscreenOutlined,
    FullscreenExitOutlined
} from "@ant-design/icons"
import {failed, info, success, warn, yakitNotify} from "../../utils/notification"
import {
    BRIDGE_ADDR,
    BRIDGE_SECRET,
    FacadesRequest,
    SettingReverseParamsInfo
} from "../reverseServer/NewReverseServerPage"
import {randomString} from "@/utils/randomUtil"
import {ReverseNotification, ReverseTable} from "../reverseServer/ReverseTable"
import {getRemoteValue} from "@/utils/kv"
import {ExtractExecResultMessage} from "@/components/yakitLogSchema"
import {ExecResultLog} from "../invoker/batch/ExecMessageViewer"
import {saveABSFileToOpen} from "@/utils/openWebsite"
import ReactResizeDetector from "react-resize-detector"

import "./javaPayloadPage.scss"
import {NetInterface} from "@/models/Traffic"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import YakitCascader from "@/components/yakitUI/YakitCascader/YakitCascader"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitCard} from "@/components/yakitUI/YakitCard/YakitCard"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {YakitCopyText} from "@/components/yakitUI/YakitCopyText/YakitCopyText"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {setClipboardText} from "@/utils/clipboard"
import {grpcFetchLocalPluginDetail} from "@/pages/pluginHub/utils/grpc"
import {apiDebugPlugin, apiCancelDebugPlugin} from "@/pages/plugins/utils"
import {defPluginExecuteFormValue} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/constants"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {ExpandAndRetractExcessiveState} from "@/pages/plugins/operator/expandAndRetract/ExpandAndRetract"
import {PluginExecuteResult} from "@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResult"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import {v4 as uuidv4} from "uuid"

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

    // AI助手相关状态
    const [aiAssistantVisible, setAiAssistantVisible] = useState<boolean>(false)
    const [hasAiPlugin, setHasAiPlugin] = useState<boolean>(false)

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

    // 检查 AI 助手插件是否存在
    useEffect(() => {
        grpcFetchLocalPluginDetail({Name: "Yso-Java Hack 智能助手"}, true)
            .then(() => {
                setHasAiPlugin(true)
            })
            .catch(() => {
                setHasAiPlugin(false)
            })
    }, [])

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
    // 关闭页面时关闭Facades反连服务
    useEffect(() => {
        return () => {
            ipcRenderer.invoke("cancel-StartFacadesWithYsoObject", getToken())
        }
    }, [])

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

        setLoading(true)
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
                    if (!reverseAddr.ReverseHost) hint += "请填写反连IP,"
                }
                if (!reverseAddr.ReversePort && reverseAddr.ReversePort !== 0) hint += "请填写端口号"
                if (hint !== "开启高级配置后,") {
                    failed(hint)
                    setTimeout(() => setLoading(false), 300)
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

    const openAiAssistant = useMemoizedFn(() => {
        setAiAssistantVisible(true)
    })

    // AI 助手填充表单数据的回调
    const handleAiDataFill = useMemoizedFn((data: {
        gadget: string
        class: string
        params: {[key: string]: string | number | boolean}
    }) => {
        const newParams: ParamsRefProps = {
            useGadget: true,
            Gadget: data.gadget,
            Class: data.class,
            ...data.params
        }
        
        setParams(newParams)
        success("AI 助手已自动填充配置")
    })

    return (
        <div className='java-payload-wrapper'>
            <AIAssistantModal
                visible={aiAssistantVisible}
                onClose={() => setAiAssistantVisible(false)}
                onDataFill={handleAiDataFill}
            />
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
                            onOpenAiAssistant={hasAiPlugin ? openAiAssistant : undefined}
                            extraNode={
                                isStart ? (
                                    <></>
                                ) : !params.useGadget ? (
                                    <Form
                                        size='small'
                                        labelCol={{span: 9}}
                                        wrapperCol={{span: 15}}
                                        colon={false}
                                        className='from-common-style'
                                    >
                                        <Form.Item
                                            label={
                                                <div className='form-item-label-title'>
                                                    高级设置
                                                    <Tooltip placement='bottom' title='配置反连服务器参数'>
                                                        <ExclamationCircleOutlined className='setting-payload-icon' />
                                                    </Tooltip>
                                                </div>
                                            }
                                        >
                                            <YakitSwitch checked={showAddr} onChange={(check) => setShowAddr(check)} />
                                        </Form.Item>
                                        {showAddr && (
                                            <>
                                                <Form.Item label='启用公网穿透'>
                                                    <YakitSwitch
                                                        checked={addrParams.IsRemote}
                                                        onChange={(IsRemote) =>
                                                            setAddrParams({...addrParams, IsRemote})
                                                        }
                                                    />
                                                </Form.Item>

                                                {addrParams.IsRemote && (
                                                    <>
                                                        <Form.Item
                                                            label={
                                                                <div className='form-item-label-title'>
                                                                    <div className='form-required'>*</div>
                                                                    公网Bridge地址
                                                                    <Tooltip
                                                                        placement='bottom'
                                                                        title={
                                                                            <div
                                                                                style={{
                                                                                    color: "var(--Colors-Use-Neutral-Text-1-Title)"
                                                                                }}
                                                                            >
                                                                                在自己的服务器安装 yak 核心引擎，执行{" "}
                                                                                <YakitCopyText
                                                                                    showText={
                                                                                        "yak bridge --secret [your-pass]"
                                                                                    }
                                                                                    wrapStyle={{
                                                                                        color: "var(--Colors-Use-Neutral-Text-1-Title)"
                                                                                    }}
                                                                                />{" "}
                                                                                启动 Yak Bridge 公网服务{" "}
                                                                                <Divider type={"vertical"} />
                                                                                <Typography.Text
                                                                                    style={{
                                                                                        color: "var(--Colors-Use-Neutral-Text-1-Title)"
                                                                                    }}
                                                                                >
                                                                                    yak version {`>=`} v1.0.11-sp9
                                                                                </Typography.Text>
                                                                            </div>
                                                                        }
                                                                    >
                                                                        <ExclamationCircleOutlined className='setting-payload-icon' />
                                                                    </Tooltip>
                                                                </div>
                                                            }
                                                        >
                                                            <YakitInput
                                                                allowClear
                                                                value={addrParams.BridgeParam.Addr}
                                                                onChange={(e) => {
                                                                    addrParams.BridgeParam.Addr = e.target.value
                                                                    setAddrParams({...addrParams})
                                                                }}
                                                            />
                                                        </Form.Item>
                                                        <Form.Item label='密码'>
                                                            <YakitInput
                                                                allowClear
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
                                                    <Form.Item
                                                        label={
                                                            <>
                                                                <div className='form-required'>*</div>
                                                                {"反连地址"}
                                                            </>
                                                        }
                                                    >
                                                        <YakitInput
                                                            allowClear
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
                                                <Form.Item
                                                    label={
                                                        <>
                                                            <div className='form-required'>*</div>
                                                            {"反连端口"}
                                                        </>
                                                    }
                                                >
                                                    <YakitInputNumber
                                                        width='100%'
                                                        min={0}
                                                        max={65535}
                                                        precision={0}
                                                        value={addrParams.ReversePort}
                                                        onChange={(ReversePort) =>
                                                            setAddrParams({
                                                                ...addrParams,
                                                                ReversePort: ReversePort as number
                                                            })
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
                        <YakitCard title='反连地址' className='info-addr-card' bodyStyle={{padding: "6px 12px"}}>
                            <Space direction={"vertical"}>
                                <div className='addr-body'>
                                    HTTP反连地址&nbsp;&nbsp;
                                    <YakitTag
                                        enableCopy={true}
                                        color='blue'
                                        copyText={`http://${reverseAddr}/${paramsRef.current?.className || ""}.class`}
                                    ></YakitTag>
                                </div>
                                <div className='addr-body'>
                                    RMI反连地址&nbsp;&nbsp;
                                    <YakitTag
                                        enableCopy={true}
                                        color='success'
                                        copyText={`rmi://${reverseAddr}/${paramsRef.current?.className || ""}`}
                                    ></YakitTag>
                                </div>
                                <div className='addr-body'>
                                    LDAP反连地址&nbsp;&nbsp;
                                    <YakitTag
                                        enableCopy={true}
                                        color='purple'
                                        copyText={`ldap://${reverseAddr}/${paramsRef.current?.className || ""}`}
                                    ></YakitTag>
                                </div>
                            </Space>
                        </YakitCard>
                    </div>

                    <div className='body-right'>
                        <ReverseTable
                            isPayload={true}
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
    onOpenAiAssistant?: () => any
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
        onOpenAiAssistant,
        extraNode
    } = props

    const isInit = useRef<boolean>(true)
    const aiIconId = useRef<string>(uuidv4())

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
    const [selectOptions, setSelectOptions] = useState<OptionInfo[]>([])
    const [formList, setFormList] = useState<FormList[]>([])
    const formBindRef = useRef<FormBindInfo>({})

    const formStart = useMemoizedFn(() => {
        if (btnLoading) return
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
        if (btnLoading) return
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

    // 监听 paramsData 的变化，用于 AI 助手填充数据
    useEffect(() => {
        // 如果是从外部（AI 助手）填充的数据
        if (paramsData.Gadget && paramsData.Class && !isInit.current) {
            // 更新内部状态 - 确保所有字段都被复制
            const newParams = {...paramsData}
            paramsRef.current = newParams
            setParams(newParams)
            
            // 如果使用利用链模式，需要加载对应的选项
            if (paramsData.useGadget && paramsData.Gadget && paramsData.Class) {
                
                // 步骤1: 加载 Gadget 选项列表
                ipcRenderer
                    .invoke("GetAllYsoGadgetOptions", undefined)
                    .then((d: {Options: YsoOptionInfo[]}) => {
                        const {Options} = d
                        
                        let optionArr: OptionInfo[] = Options.map((item) => {
                            const info: OptionInfo = {
                                ...item,
                                NameVerbose: (
                                    <div className='form-item-options-title'>
                                        {item.NameVerbose}
                                        {!!item.Help && (
                                            <Tooltip placement='bottom' title={item.Help}>
                                                <QuestionOutlined className='question-icon' />
                                            </Tooltip>
                                        )}
                                    </div>
                                ),
                                Label: item.NameVerbose,
                                isLeaf: false,
                                children: []
                            }
                            return info
                        })
                        
                        // 步骤2: 加载对应 Gadget 下的 Class 选项
                        return ipcRenderer
                            .invoke("GetAllYsoClassOptions", {Gadget: paramsData.Gadget})
                            .then((classData: {Options: YsoOptionInfo[]}) => {
                                
                                const classOptions = classData.Options.map((item) => ({
                                    ...item,
                                    NameVerbose: (
                                        <div className='form-item-options-title'>
                                            {item.NameVerbose}
                                            {!!item.Help && (
                                                <Tooltip placement='bottom' title={item.Help}>
                                                    <QuestionOutlined className='question-icon' />
                                                </Tooltip>
                                            )}
                                        </div>
                                    ),
                                    Label: item.NameVerbose,
                                    isLeaf: true
                                }))
                                
                                // 找到对应的 Gadget 并设置其 children
                                const targetGadget = optionArr.find(opt => opt.Name === paramsData.Gadget)
                                if (targetGadget) {
                                    targetGadget.children = classOptions
                                }
                                
                                setOptions([...optionArr])
                                
                                // 步骤3: 加载表单字段
                                return loadGeneraterFormList([paramsData.Gadget, paramsData.Class])
                            })
                    })
                    .then(() => {
                        // 步骤4: 再次确认 params 状态已更新（因为 setState 是异步的）
                        const finalParams = {...paramsData}
                        paramsRef.current = finalParams
                        setParams(finalParams)
                        
                        // 特别设置级联选择器的值
                        const formValues = {
                            ...finalParams,
                            '[Gadget,Class]': [finalParams.Gadget, finalParams.Class]
                        }
                        
                        formInstance.setFieldsValue(formValues)
                    })
                    .catch((e: any) => {
                        failed(`加载选项失败: ${e}`)
                    })
            } else {
                // 非利用链模式，直接更新表单值
                formInstance.setFieldsValue({...paramsData})
            }
        }
    }, [paramsData.Gadget, paramsData.Class])
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
                useGadget ? setOptions(optionArr) : setSelectOptions(optionArr)
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
                            paramsOptions[el.Key] = !el.Value ? 0 : +el.Value || 0
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
        <YakitCard
            className='setting-payload-wrapper'
            bodyStyle={{padding: "20px 15px", overflow: "auto"}}
            title={
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <span>JavaPayload 配置</span>
                    <Tooltip placement='bottom' title='配置序列化Payload或恶意类'>
                        <ExclamationCircleOutlined className='setting-payload-icon' />
                    </Tooltip>
                    {onOpenAiAssistant && hasAiPlugin && (
                        <Tooltip placement='bottom' title='AI智能助手'>
                            <svg 
                                xmlns='http://www.w3.org/2000/svg' 
                                width='17' 
                                height='16' 
                                viewBox='0 0 17 16' 
                                fill='none'
                                style={{cursor: 'pointer', marginLeft: '4px'}}
                                onClick={onOpenAiAssistant}
                            >
                                <path
                                    d='M3.83333 2V4.66667M2.5 3.33333H5.16667M4.5 11.3333V14M3.16667 12.6667H5.83333M9.16667 2L10.6905 6.57143L14.5 8L10.6905 9.42857L9.16667 14L7.64286 9.42857L3.83333 8L7.64286 6.57143L9.16667 2Z'
                                    stroke={`url(#${aiIconId.current})`}
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                />
                                <defs>
                                    <linearGradient
                                        id={aiIconId.current}
                                        x1='2.5'
                                        y1='2'
                                        x2='16.8935'
                                        y2='6.75561'
                                        gradientUnits='userSpaceOnUse'
                                    >
                                        <stop stopColor='#DC5CDF' />
                                        <stop offset='0.639423' stopColor='#8862F8' />
                                        <stop offset='1' stopColor='#4493FF' />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </Tooltip>
                    )}
                </div>
            }
            extra={
                <div>
                    {!isReverse && (
                        <YakitButton
                            loading={loading}
                            className='setting-payload-btn'
                            type='outline1'
                            danger={isStart}
                            size='small'
                            onClick={formStart}
                        >
                            {isStart ? "关闭反连" : "启动反连"}
                        </YakitButton>
                    )}
                    {isReverse && (
                        <YakitButton
                            className='setting-payload-btn'
                            type='primary'
                            danger={isShowCode}
                            size='small'
                            onClick={showCode}
                        >
                            {isShowCode ? "关闭代码" : "显示代码"}
                        </YakitButton>
                    )}
                    <YakitButton
                        loading={loading}
                        className='setting-payload-btn'
                        size='small'
                        type='primary'
                        onClick={formApply}
                    >
                        生成
                    </YakitButton>
                </div>
            }
        >
            <YakitSpin spinning={loading}>
                <Form
                    form={formInstance}
                    name='form'
                    size='small'
                    labelCol={{span: 9}}
                    wrapperCol={{span: 15}}
                    colon={false}
                    initialValues={{...paramsRef.current}}
                    autoComplete='off'
                    className='from-common-style'
                >
                    <Form.Item
                        label={
                            <div className='form-item-label-title'>
                                使用利用链
                                <Tooltip placement='bottom' title='关闭则不使用利用链,只生成恶意类'>
                                    <ExclamationCircleOutlined className='setting-payload-icon' />
                                </Tooltip>
                            </div>
                        }
                        name='useGadget'
                    >
                        <YakitSwitch
                            checked={useGadget}
                            onChange={(check) => {
                                setUseGadget(check)
                                setParamsData({...paramsRef.current, useGadget: check})
                                setTimeout(() => cleatParams(), 300)
                            }}
                        />
                    </Form.Item>

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
                            <YakitCascader
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
                                    if (
                                        (selectedOptions || []).filter((item: any) => !!item && item.Label).length !== 2
                                    )
                                        return ""
                                    const diplay = (selectedOptions || []).map((item: any) => item.Label).join(" / ")
                                    return <>{diplay}</>
                                }}
                            />
                        ) : (
                            <YakitSelect
                                allowClear
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
                                {selectOptions.map((item) => {
                                    return (
                                        <YakitSelect.Option key={item.Name} value={item.Name}>
                                            <div className='form-item-options-title'>
                                                {item.NameVerbose}
                                                {!!item.Help && (
                                                    <Tooltip placement='bottom' title={item.Help}>
                                                        <QuestionOutlined className='question-icon' />
                                                    </Tooltip>
                                                )}
                                            </div>
                                        </YakitSelect.Option>
                                    )
                                })}
                            </YakitSelect>
                        )}
                    </Form.Item>

                    {formList.map((item) => {
                        const flag = judgeBindValue(item.Key)
                        if (!flag) return <div key={item.Key}></div>

                        return (
                            <Form.Item
                                key={item.Key}
                                label={
                                    <div className='form-item-label-title'>
                                        {item.KeyVerbose}
                                        {!!item.Help && (
                                            <Tooltip placement='bottom' title={item.Help}>
                                                <ExclamationCircleOutlined className='setting-payload-icon' />
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
                                            return Promise.reject(new Error(""))
                                        }
                                    })
                                ]}
                            >
                                {(item.Type === FormParamsType.String || item.Type === FormParamsType.Base64Bytes) && (
                                    <YakitInput
                                        allowClear
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
                                    <YakitInputNumber
                                        precision={0}
                                        value={+params[item.Key]}
                                        onChange={(value) => setParamsValue([{key: item.Key, value: value as number}])}
                                    />
                                )}
                                {item.Type === FormParamsType.StringBool && (
                                    <YakitSwitch
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
            </YakitSpin>
        </YakitCard>
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
    {value: "yak", label: "YAK"},
    {value: "dump", label: "DUMP"}
]

export const PayloadCode: React.FC<PayloadCodeProp> = React.memo((props) => {
    const {isMin = false, codeExtra, data, RefreshTrigger, onExtra} = props

    const [loading, setLoading] = useState<boolean>(false)
    const [type, setType] = useState<string>("base64")
    const [code, setCode] = useState<string>("")
    const [hex, setHex] = useState<Uint8Array>(new Uint8Array())
    const [width, setWidth] = useState<number>(600)

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
            case "dump":
                convertDump()
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

        if (value === "copy") setClipboardText(code)
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
                setCode(Buffer.from(d.Bytes).toString("hex"))
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
    const convertDump = useMemoizedFn(() => {
        setLoading(true)
        const request = convertRequest(data)
        ipcRenderer
            .invoke("GenerateYsoBytes", request)
            .then((d: {Bytes: Uint8Array; FileName: string}) => {
                ipcRenderer
                    .invoke("YsoDump", {
                        Data: d.Bytes
                    })
                    .then((res: {Data: string}) => {
                        success("Dump成功")
                        setCode(res.Data)
                    })
                    .catch((err) => {
                        failed(`${err}`)
                    })
            })
            .catch((e: any) => {
                failed("Dump失败: " + `${e}`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })

    return (
        <YakitCard
            className='code-payload-wrapper'
            bodyStyle={{padding: 0, overflow: "hidden"}}
            title={
                <div>
                    代码
                    <YakitRadioButtons
                        className='code-type-radio'
                        size='small'
                        buttonStyle='solid'
                        value={type}
                        onChange={({target: {value}}) => typeChange(value)}
                        options={CodeType}
                    />
                </div>
            }
            extra={
                width < 510 || (isMin && !codeExtra) ? (
                    <div>
                        {type === "yak" ? (
                            <YakitButton
                                loading={loading}
                                type='text'
                                size='small'
                                icon={
                                    <Tooltip title='Yak Runner'>
                                        <ThunderboltOutlined />
                                    </Tooltip>
                                }
                                onClick={() => codeOperate("yakRunning")}
                            />
                        ) : (
                            <></>
                        )}
                        {type === "hex" ? (
                            <YakitButton
                                loading={loading}
                                type='text'
                                size='small'
                                icon={
                                    <Tooltip title='下载文件'>
                                        <DownloadOutlined />
                                    </Tooltip>
                                }
                                onClick={() => codeOperate("download")}
                            />
                        ) : (
                            <></>
                        )}

                        <YakitButton
                            loading={loading}
                            type='text'
                            size='small'
                            icon={
                                <Tooltip title='复制代码'>
                                    <CopyOutlined />
                                </Tooltip>
                            }
                            onClick={() => codeOperate("copy")}
                        />
                        <YakitButton
                            type='text'
                            size='small'
                            icon={codeExtra ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                            onClick={() => codeOperate("extra")}
                        />
                    </div>
                ) : (
                    <div className='extra-btns'>
                        {type === "yak" ? (
                            <YakitButton
                                loading={loading}
                                type='primary'
                                size='small'
                                icon={<ThunderboltOutlined />}
                                onClick={() => codeOperate("yakRunning")}
                            >
                                Yak Runner
                            </YakitButton>
                        ) : (
                            <></>
                        )}
                        {type === "hex" ? (
                            <YakitButton
                                loading={loading}
                                type='primary'
                                size='small'
                                onClick={() => codeOperate("download")}
                            >
                                下载文件
                            </YakitButton>
                        ) : (
                            <></>
                        )}

                        <YakitButton loading={loading} type='primary' size='small' onClick={() => codeOperate("copy")}>
                            复制代码
                        </YakitButton>
                        <YakitButton
                            type='text'
                            size='small'
                            icon={codeExtra ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                            onClick={() => codeOperate("extra")}
                        />
                    </div>
                )
            }
        >
            <ReactResizeDetector
                onResize={(width) => {
                    if (!width) return
                    setWidth(width)
                }}
                handleWidth={true}
                refreshMode={"debounce"}
                refreshRate={50}
            />
            <YakitSpin spinning={loading}>
                {type === "hex" ? (
                    <YakitEditor readOnly={true} value={code} type='http' />
                ) : (
                    <YakitEditor readOnly={true} value={code} type='http' />
                )}
            </YakitSpin>
        </YakitCard>
    )
})

interface AIAssistantModalProps {
    visible: boolean
    onClose: () => void
    onDataFill: (data: {
        gadget: string
        class: string
        params: {[key: string]: string | number | boolean}
    }) => void
}

interface AIResponseData {
    class: string
    gadget: string
    params: Array<{
        key: string
        value: string
    }>
}

const AIAssistantModal: React.FC<AIAssistantModalProps> = React.memo((props) => {
    const {visible, onClose, onDataFill} = props

    const [requirement, setRequirement] = useState<string>("")
    const [executeStatus, setExecuteStatus] = useState<ExpandAndRetractExcessiveState>("default")
    const [runtimeId, setRuntimeId] = useState<string>("")
    const [aiToken, setAiToken] = useState<string>(randomString(40))
    const [_, setSreamStatus, getSreamStatus] = useGetSetState({
        error: false,
        success: false
    })

    // 解析 AI 返回的数据并填充表单
    const parseAndFillData = useMemoizedFn((jsonStr: string) => {
        try {
            const data: AIResponseData = JSON.parse(jsonStr)
            
            // 转换参数格式
            const params: {[key: string]: string | number | boolean} = {}
            if (data.params && Array.isArray(data.params)) {
                for (const item of data.params) {
                    let value: string | number | boolean = item.value
                    
                    // 尝试解析字符串中的特殊值
                    if (typeof value === 'string') {
                        // 去除字符串两端的引号
                        if (value.startsWith('"') && value.endsWith('"')) {
                            value = value.slice(1, -1)
                        }
                        
                        // 尝试转换为数字
                        if (/^\d+$/.test(value)) {
                            value = parseInt(value, 10)
                        }
                        // 尝试转换为布尔值
                        else if (value === 'true' || value === 'false') {
                            value = value === 'true'
                        }
                    }
                    
                    params[item.key] = value
                }
            }
            
            const fillData = {
                gadget: data.gadget,
                class: data.class,
                params: params
            }
            
            // 调用填充回调
            onDataFill(fillData)
            
            // 关闭模态框
            handleClose()
        } catch (e) {
            yakitNotify("error", `解析数据失败: ${e}`)
        }
    })

    // 使用 useMemoizedFn 稳定回调函数
    const handleError = useMemoizedFn(() => {
        setSreamStatus({
            error: true,
            success: false
        })
    })

    const handleEnd = useMemoizedFn(async () => {
        const {error, success} = getSreamStatus()
        aiPluginStreamEvent.stop()
        setTimeout(() => {
            setExecuteStatus("finished")
        }, 300)
        apiCancelDebugPlugin(aiToken).then(() => {
            setRuntimeId("")
            aiPluginStreamEvent.reset()
            setSreamStatus({
                success: false,
                error: false
            })
        })
    })

    const handleSetRuntimeId = useMemoizedFn((rId: string) => {
        yakitNotify("info", `AI助手任务启动成功，运行时 ID: ${rId}`)
        setRuntimeId(rId)
    })

    // 数据过滤器，用于捕获和解析 AI 返回的配置数据
    const handleDataFilter = useMemoizedFn((obj: any, content: any) => {
        try {
            // 检查是否是 JSON 数据的日志
            if (content && content.data) {
                let dataStr = content.data
                
                // 如果 data 是对象，尝试转换为字符串
                if (typeof dataStr === 'object') {
                    try {
                        dataStr = JSON.stringify(dataStr)
                    } catch (e) {
                        // 忽略
                    }
                }
                
                if (typeof dataStr === 'string') {
                    dataStr = dataStr.trim()
                    
                    // 尝试解析为 JSON
                    if (dataStr.startsWith('{') && dataStr.endsWith('}')) {
                        try {
                            const jsonData = JSON.parse(dataStr)
                            
                            // 检查是否包含必要的字段
                            if (jsonData.class && jsonData.gadget && jsonData.params) {
                                info('检测到 AI 返回的配置数据，正在自动填充...')
                                parseAndFillData(dataStr)
                            }
                        } catch (e) {
                            // 忽略 JSON 解析失败
                        }
                    }
                }
            }
        } catch (e) {
            // 忽略错误
        }
        // 返回 true 以继续显示日志
        return true
    })

    const [streamInfo, aiPluginStreamEvent] = useHoldGRPCStream({
        taskName: "ai-java-hack-assistant",
        apiKey: "DebugPlugin",
        token: aiToken,
        onError: handleError,
        onEnd: handleEnd,
        dataFilter: handleDataFilter,
        setRuntimeId: handleSetRuntimeId
    })

    const {run: runPlugin} = useRequest(async (params) => await apiDebugPlugin(params), {
        manual: true,
        onSuccess: () => {
            setExecuteStatus("process")
            aiPluginStreamEvent.start()
        }
    })

    const isExecuting = useCreation(() => {
        if (executeStatus === "process") return true
        return false
    }, [executeStatus])

    const isShowResult = useCreation(() => {
        return isExecuting || runtimeId
    }, [isExecuting, runtimeId])

    const handleExecute = async () => {
        if (!requirement.trim()) {
            failed("请输入需求描述")
            return
        }

        try {
            // 生成新的 token
            const newToken = randomString(40)
            setAiToken(newToken)
            
            const plugin = await grpcFetchLocalPluginDetail({Name: "Yso-Java Hack 智能助手"}, true)

            const executeParams = {
                Code: "",
                PluginType: plugin.Type,
                Input: "",
                HTTPRequestTemplate: {
                    ...defPluginExecuteFormValue,
                    IsHttpFlowId: false,
                    HTTPFlowId: []
                },
                ExecParams: [
                    {
                        Key: "query",
                        Value: requirement
                    }
                ],
                PluginName: plugin.ScriptName
            }

            // 延迟执行，等待 token 更新生效
            setTimeout(() => {
                runPlugin({
                    params: executeParams,
                    token: newToken,
                    pluginCustomParams: plugin.Params
                })
            }, 100)
        } catch (e) {
            failed(`加载插件失败: ${e}`)
        }
    }

    const handleCancel = () => {
        if (isShowResult) {
            setSreamStatus({
                error: true,
                success: false
            })
            apiCancelDebugPlugin(aiToken).then(() => {
                aiPluginStreamEvent.stop()
                handleClose()
            })
        } else {
            handleClose()
        }
    }

    const handleClose = () => {
        setRequirement("")
        setExecuteStatus("default")
        setRuntimeId("")
        setAiToken(randomString(40)) // 重置 token
        onClose()
    }

    const handleStop = () => {
        setSreamStatus({
            error: true,
            success: false
        })
        apiCancelDebugPlugin(aiToken).then(() => {
            aiPluginStreamEvent.stop()
        })
    }

    return (
        <YakitModal
            title="Yso-Java Hack 智能助手"
            visible={visible}
            onCancel={handleCancel}
            maskClosable={false}
            width={isShowResult ? "70%" : 600}
            destroyOnClose
            footer={
                !isShowResult ? (
                    <div style={{display: 'flex', justifyContent: 'flex-end', gap: '8px'}}>
                        <YakitButton type='outline1' onClick={handleCancel}>
                            取消
                        </YakitButton>
                        <YakitButton type='primary' onClick={handleExecute}>
                            执行
                        </YakitButton>
                    </div>
                ) : (
                    <div style={{display: 'flex', justifyContent: 'flex-end', gap: '8px'}}>
                        <YakitButton danger type='primary' onClick={handleStop}>
                            停止
                        </YakitButton>
                    </div>
                )
            }
        >
            <div style={{minHeight: isShowResult ? '500px' : '200px'}}>
                {!isShowResult ? (
                    <div>
                        <YakitInput.TextArea
                            placeholder="例如: 生成一个CommonsCollections4的URLDNS链，执行命令whoami"
                            value={requirement}
                            onChange={(e) => setRequirement(e.target.value)}
                            rows={6}
                            style={{resize: 'none'}}
                        />
                    </div>
                ) : (
                    <PluginExecuteResult
                        streamInfo={streamInfo}
                        runtimeId={runtimeId}
                        loading={isExecuting}
                        defaultActiveKey='日志'
                    />
                )}
            </div>
        </YakitModal>
    )
})
