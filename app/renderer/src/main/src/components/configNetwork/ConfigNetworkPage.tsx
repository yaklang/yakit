import React, {useEffect, useMemo, useRef, useState} from "react"
import {AutoCard} from "@/components/AutoCard"
import {ManyMultiSelectForString, SwitchItem} from "@/utils/inputUtil"
import {Divider, Form, Modal, Slider, Space, Upload} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {yakitInfo, warn, failed, success} from "@/utils/notification"
import {AutoSpin} from "@/components/AutoSpin"
import update from "immutability-helper"
import {useDebounceFn, useInViewport, useMemoizedFn} from "ahooks"
import styles from "./ConfigNetworkPage.module.scss"
import {YakitInput} from "../yakitUI/YakitInput/YakitInput"
import {YakitRadioButtons} from "../yakitUI/YakitRadioButtons/YakitRadioButtons"
import {InputCertificateForm} from "@/pages/mitm/MITMServerStartForm/MITMAddTLS"
import {StringToUint8Array} from "@/utils/str"
import cloneDeep from "lodash/cloneDeep"
import {CloseIcon, RectangleFailIcon, RectangleSucceeIcon, UnionIcon} from "./icon"
import {SolidCheckCircleIcon, SolidLockClosedIcon} from "@/assets/icon/colors"
import {showYakitModal} from "../yakitUI/YakitModal/YakitModalConfirm"
import classNames from "classnames"
import {YakitSwitch} from "../yakitUI/YakitSwitch/YakitSwitch"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {BanIcon, CogIcon, DragSortIcon, PencilAltIcon, RemoveIcon, TrashIcon} from "@/assets/newIcon"
import {YakitDrawer} from "../yakitUI/YakitDrawer/YakitDrawer"
import {TableVirtualResize} from "../TableVirtualResize/TableVirtualResize"
import {ColumnsTypeProps} from "../TableVirtualResize/TableVirtualResizeType"
import {YakitModal} from "../yakitUI/YakitModal/YakitModal"
import {YakitSelect} from "../yakitUI/YakitSelect/YakitSelect"
import {v4 as uuidv4} from "uuid"
import {ExclamationCircleOutlined} from "@ant-design/icons"
import {PcapMetadata} from "@/models/Traffic"
import {SelectOptionProps} from "@/pages/fuzzer/HTTPFuzzerPage"
import {KVPair} from "@/models/kv"
import {getLocalValue, getRemoteValue, setLocalValue, setRemoteValue} from "@/utils/kv"
import {LocalGVS} from "@/enums/localGlobal"
import {RemoteGV} from "@/yakitGV"
import {DragDropContext, Draggable, DropResult, Droppable} from "@hello-pangea/dnd"
import NewThirdPartyApplicationConfig, {GetThirdPartyAppConfigTemplateResponse} from "./NewThirdPartyApplicationConfig"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {GlobalConfigRemoteGV} from "@/enums/globalConfig"

export interface ConfigNetworkPageProp {}

export interface AuthInfo {
    AuthUsername: string
    AuthPassword: string
    AuthType: string
    Host: string
    Forbidden: boolean
}

export interface GlobalNetworkConfig {
    DisableSystemDNS: boolean
    CustomDNSServers: string[]
    DNSFallbackTCP: boolean
    DNSFallbackDoH: boolean
    CustomDoHServers: string[]

    ClientCertificates?: ClientCertificates[]

    DisallowIPAddress: string[]
    DisallowDomain: string[]
    GlobalProxy: string[]
    EnableSystemProxyFromEnv: boolean
    SkipSaveHTTPFlow: boolean

    //
    AppConfigs: ThirdPartyApplicationConfig[]

    AiApiPriority: string[]

    AuthInfos: AuthInfo[]

    SynScanNetInterface: string

    ExcludePluginScanURIs: string[]
    IncludePluginScanURIs: string[]

    DbSaveSync: boolean

    CallPluginTimeout: number

    MinTlsVersion: number
    MaxTlsVersion: number
    MaxContentLength: number | string
}

export interface ThirdPartyApplicationConfig {
    Type:
        | "zoomeye"
        | "hunter"
        | "shodan"
        | "fofa"
        | "github"
        | "openai"
        | "skylark"
        | "aliyun"
        | "tencent"
        | "quake"
        | string
    ExtraParams?: KVPair[]
}

export interface IsSetGlobalNetworkConfig {
    Pkcs12Bytes: Uint8Array
    Pkcs12Password?: Uint8Array
}

interface ClientCertificatePem {
    CrtPem: Uint8Array
    KeyPem: Uint8Array
    CaCertificates: Uint8Array[]
}

interface ClientCertificatePfx {
    name: string
    Pkcs12Bytes: Uint8Array
    Pkcs12Password: Uint8Array
    password?: boolean
}

interface ClientCertificates {
    CrtPem: Uint8Array
    KeyPem: Uint8Array
    CaCertificates: Uint8Array[]
    Pkcs12Bytes: Uint8Array
    Pkcs12Password: Uint8Array
}

const {ipcRenderer} = window.require("electron")

export const defaultParams: GlobalNetworkConfig = {
    DisableSystemDNS: false,
    CustomDNSServers: [],
    DNSFallbackTCP: false,
    DNSFallbackDoH: false,
    CustomDoHServers: [],
    DisallowIPAddress: [],
    DisallowDomain: [],
    GlobalProxy: [],
    EnableSystemProxyFromEnv: false,
    SkipSaveHTTPFlow: false,
    AppConfigs: [],
    AiApiPriority: [],
    AuthInfos: [],
    SynScanNetInterface: "",
    ExcludePluginScanURIs: [],
    IncludePluginScanURIs: [],
    DbSaveSync: false,
    CallPluginTimeout: 60,
    MinTlsVersion: 0x300,
    MaxTlsVersion: 0x304,
    MaxContentLength: 10
}

export const ConfigNetworkPage: React.FC<ConfigNetworkPageProp> = (props) => {
    const [params, setParams] = useState<GlobalNetworkConfig>(defaultParams)
    const [certificateParams, setCertificateParams] = useState<ClientCertificatePfx[]>()
    const currentIndex = useRef<number>(0)
    const [format, setFormat] = useState<1 | 2>(1)
    const cerFormRef = useRef<any>()
    const [loading, setLoading] = useState(false)
    const isShowLoading = useRef<boolean>(true)
    const [visible, setVisible] = useState<boolean>(false)
    const configRef = useRef<any>()
    const [inViewport] = useInViewport(configRef)
    const [netInterfaceList, setNetInterfaceList] = useState<SelectOptionProps[]>([]) // 代理代表

    /** ---------- 是否删除私密插件逻辑 Start ---------- */
    const [isDelPrivatePlugin, setIsDelPrivatePlugin] = useState<boolean>(false)
    useEffect(() => {
        getLocalValue(LocalGVS.IsDeletePrivatePluginsOnLogout).then((v: boolean) => {
            setIsDelPrivatePlugin(!!v)
        })
    }, [])
    const onSetDelPrivatePlugin = useMemoizedFn(() => {
        setLocalValue(LocalGVS.IsDeletePrivatePluginsOnLogout, isDelPrivatePlugin)
    })
    const onResetDelPrivatePlugin = useMemoizedFn(() => {
        setLocalValue(LocalGVS.IsDeletePrivatePluginsOnLogout, false)
    })
    /** ---------- 私密插件逻辑 End ---------- */

    const update = useMemoizedFn(() => {
        isShowLoading.current && setLoading(true)
        isShowLoading.current = false
        // setParams(defaultParams)
        ipcRenderer.invoke("GetGlobalNetworkConfig", {}).then((rsp: GlobalNetworkConfig) => {
            const {ClientCertificates, SynScanNetInterface} = rsp
            ipcRenderer.invoke("GetPcapMetadata", {}).then((data: PcapMetadata) => {
                if (!data || !data.AvailablePcapDevices?.length) {
                    return
                }
                const interfaceList = data.AvailablePcapDevices.filter((el) => el).map((item) => ({
                    label: `${item.NetInterfaceName}-(${item.IP})`,
                    value: item.Name
                }))
                if (SynScanNetInterface.length === 0 && data?.DefaultPublicNetInterface) {
                    setParams((v) => ({
                        ...v,
                        SynScanNetInterface: data.DefaultPublicNetInterface?.NetInterfaceName || ""
                    }))
                }
                setNetInterfaceList(interfaceList)
            })
            if (Array.isArray(ClientCertificates) && ClientCertificates.length > 0 && format === 1) {
                let newArr = ClientCertificates.map((item, index) => {
                    const {Pkcs12Bytes, Pkcs12Password} = item
                    return {Pkcs12Bytes, Pkcs12Password, name: `证书${index + 1}`}
                })
                setCertificateParams(newArr)
                currentIndex.current = ClientCertificates.length
            }
            setParams((v) => ({
                ...v,
                ...rsp,
                DisallowDomain: rsp.DisallowDomain.filter((item) => item),
                MaxContentLength: +rsp.MaxContentLength / (1024 * 1024) || 10
            }))
            setLoading(false)
        })
    })
    useEffect(() => {
        update()
    }, [format])

    const onCertificate = useMemoizedFn((file: any) => {
        if (!["application/x-pkcs12"].includes(file.type)) {
            warn("仅支持格式为：application/x-pkcs12")
            return false
        }
        ipcRenderer
            .invoke("fetch-certificate-content", file.path)
            .then((res) => {
                currentIndex.current += 1

                // 验证证书是否需要密码
                ipcRenderer
                    .invoke("ValidP12PassWord", {
                        Pkcs12Bytes: res
                    } as IsSetGlobalNetworkConfig)
                    .then((result: {IsSetPassWord: boolean}) => {
                        if (result.IsSetPassWord) {
                            setCertificateParams([
                                ...(certificateParams || []),
                                {
                                    name: `证书${currentIndex.current}`,
                                    Pkcs12Bytes: res,
                                    Pkcs12Password: new Uint8Array()
                                }
                            ])
                        } else {
                            // 需要密码
                            setCertificateParams([
                                ...(certificateParams || []),
                                {
                                    name: `证书${currentIndex.current}`,
                                    Pkcs12Bytes: res,
                                    Pkcs12Password: new Uint8Array(),
                                    password: true
                                }
                            ])
                        }
                    })
            })
            .catch((e) => {
                failed(`无法获取该文件内容，请检查后后重试！${e}`)
            })
        return false
    })

    const ipcSubmit = useMemoizedFn((params: GlobalNetworkConfig, isNtml?: boolean) => {
        const realParams: GlobalNetworkConfig = {
            ...params,
            MaxContentLength: +params.MaxContentLength * 1024 * 1024
        }
        ipcRenderer.invoke("SetGlobalNetworkConfig", realParams).then(() => {
            yakitInfo("更新配置成功")
            update()
            if (isNtml) setVisible(false)
        })
    })

    const onNtmlSave = useMemoizedFn(() => {
        submit(true)
    })

    const submit = useMemoizedFn((isNtml?: boolean) => {
        // 更新 隐私配置 数据
        onSetDelPrivatePlugin()

        // 更新 免配置启动路径
        onSetChromePath()

        // 更新 自动性能采样
        onSetPprofFileAutoAnalyze()

        if (format === 1) {
            // if (!(Array.isArray(certificateParams)&&certificateParams.length>0)) {
            //     warn("请添加证书")
            //     return
            // }

            if (
                Array.isArray(certificateParams) &&
                certificateParams.length > 0 &&
                certificateParams.filter((item) => item.password === true).length === certificateParams.length
            ) {
                warn("无效证书")
                return
            }
            const obj: ClientCertificatePem = {
                CaCertificates: [],
                CrtPem: new Uint8Array(),
                KeyPem: new Uint8Array()
            }
            const certificate = (certificateParams || []).filter((item) => item.password !== true)
            const ClientCertificates = certificate.map((item) => {
                const {Pkcs12Bytes, Pkcs12Password} = item
                return {Pkcs12Bytes, Pkcs12Password, ...obj}
            })
            const newParams: GlobalNetworkConfig = {
                ...params,
                ClientCertificates: ClientCertificates.length > 0 ? ClientCertificates : undefined
            }
            ipcSubmit(newParams, isNtml)
        }
        if (format === 2) {
            cerFormRef.current.validateFields().then((values) => {
                const obj: ClientCertificatePem = {
                    CaCertificates:
                        values.CaCertificates && values.CaCertificates.length > 0
                            ? [StringToUint8Array(values.CaCertificates)]
                            : [],
                    CrtPem: StringToUint8Array(values.CrtPem),
                    KeyPem: StringToUint8Array(values.CrtPem)
                }
                const newParams: GlobalNetworkConfig = {
                    ...params,
                    ClientCertificates: [{...obj, Pkcs12Bytes: new Uint8Array(), Pkcs12Password: new Uint8Array()}]
                }
                ipcSubmit(newParams, isNtml)
            })
        }
    })

    const closeCard = useMemoizedFn((item: ClientCertificatePfx) => {
        if (Array.isArray(certificateParams)) {
            let cache: ClientCertificatePfx[] = certificateParams.filter((itemIn) => item.name !== itemIn.name)
            setCertificateParams(cache)
        }
    })

    const failCard = useMemoizedFn((item: ClientCertificatePfx, key: number) => {
        return (
            <div key={key} className={classNames(styles["certificate-card"], styles["certificate-fail"])}>
                <div className={styles["decorate"]}>
                    <RectangleFailIcon />
                </div>
                <div className={styles["card-hide"]}></div>
                <div className={styles["fail-main"]}>
                    <div
                        className={styles["close"]}
                        onClick={() => {
                            closeCard(item)
                        }}
                    >
                        <CloseIcon />
                    </div>
                    <div className={styles["title"]}>{item.name}</div>
                    <SolidLockClosedIcon />
                    <div className={styles["content"]}>未解密</div>
                    <YakitButton
                        type='outline2'
                        onClick={() => {
                            const m = showYakitModal({
                                title: "密码解锁",
                                content: (
                                    <div style={{padding: 20}}>
                                        <YakitInput.Password
                                            placeholder='请输入证书密码'
                                            allowClear
                                            onChange={(e) => {
                                                const {value} = e.target
                                                if (Array.isArray(certificateParams)) {
                                                    certificateParams[key].Pkcs12Password =
                                                        value.length > 0 ? StringToUint8Array(value) : new Uint8Array()
                                                    let cache: ClientCertificatePfx[] = cloneDeep(certificateParams)
                                                    setCertificateParams(cache)
                                                }
                                            }}
                                        />
                                    </div>
                                ),
                                onCancel: () => {
                                    m.destroy()
                                },
                                onOk: () => {
                                    ipcRenderer
                                        .invoke("ValidP12PassWord", {
                                            Pkcs12Bytes: item.Pkcs12Bytes,
                                            Pkcs12Password: item.Pkcs12Password
                                        } as IsSetGlobalNetworkConfig)
                                        .then((result: {IsSetPassWord: boolean}) => {
                                            if (result.IsSetPassWord) {
                                                if (Array.isArray(certificateParams)) {
                                                    certificateParams[key].password = false
                                                    let cache: ClientCertificatePfx[] = cloneDeep(certificateParams)
                                                    setCertificateParams(cache)
                                                    m.destroy()
                                                }
                                            } else {
                                                failed(`密码错误`)
                                            }
                                        })
                                },
                                width: 400
                            })
                        }}
                    >
                        密码解锁
                    </YakitButton>
                </div>
            </div>
        )
    })

    const succeeCard = useMemoizedFn((item: ClientCertificatePfx, key: number) => {
        return (
            <div key={key} className={classNames(styles["certificate-card"], styles["certificate-succee"])}>
                <div className={styles["decorate"]}>
                    <RectangleSucceeIcon />
                </div>
                <div className={styles["union"]}>
                    <UnionIcon />
                </div>
                <div className={styles["card-hide"]}></div>

                <div className={styles["success-main"]}>
                    <div
                        className={styles["close"]}
                        onClick={() => {
                            closeCard(item)
                        }}
                    >
                        <CloseIcon />
                    </div>
                    <div className={styles["title"]}>{item.name}</div>
                    <SolidCheckCircleIcon />
                    <div className={styles["content"]}>可用</div>
                    <div className={styles["password"]}>******</div>
                </div>
            </div>
        )
    })

    const certificateList = useMemo(() => {
        return (
            <div className={styles["certificate-box"]}>
                {Array.isArray(certificateParams) &&
                    certificateParams.map((item, index) => {
                        if (item.password) return failCard(item, index)
                        return succeeCard(item, index)
                    })}
            </div>
        )
    }, [certificateParams])

    const [chromePath, setChromePath] = useState<string>("")
    useEffect(() => {
        getRemoteValue(RemoteGV.GlobalChromePath).then((setting) => {
            if (!setting) {
                ipcRenderer.invoke("GetChromePath").then((chromePath: string) => {
                    setChromePath(chromePath)
                    onSetChromePath(chromePath)
                })
            } else {
                const values: string = JSON.parse(setting)
                setChromePath(values)
            }
        })
    }, [])
    const onSetChromePath = useMemoizedFn((value?: string) => {
        setRemoteValue(RemoteGV.GlobalChromePath, JSON.stringify(value || chromePath))
    })
    const onResetChromePath = useMemoizedFn(() => {
        let path = ""
        ipcRenderer
            .invoke("GetChromePath")
            .then((chromePath: string) => {
                path = chromePath
            })
            .finally(() => {
                setChromePath(path)
                setRemoteValue(RemoteGV.GlobalChromePath, JSON.stringify(path))
            })
    })

    const [pprofFileAutoAnalyze, setPprofFileAutoAnalyze] = useState<boolean>(false)
    useEffect(() => {
        getRemoteValue(GlobalConfigRemoteGV.PProfFileAutoAnalyze).then((setting) => {
            setPprofFileAutoAnalyze(setting === "true")
        })
    }, [])
    const onSetPprofFileAutoAnalyze = () => {
        setRemoteValue(GlobalConfigRemoteGV.PProfFileAutoAnalyze, pprofFileAutoAnalyze + "")
    }
    const onResetPprofFileAutoAnalyze = () => {
        setPprofFileAutoAnalyze(false)
        setRemoteValue(GlobalConfigRemoteGV.PProfFileAutoAnalyze, false + "")
    }

    return (
        <>
            <div ref={configRef}>
                <AutoCard style={{height: "auto"}}>
                    <AutoSpin spinning={loading} tip='网络配置加载中...'>
                        {params && (
                            <Form
                                size={"small"}
                                labelCol={{span: 5}}
                                wrapperCol={{span: 14}}
                                onSubmitCapture={() => submit()}
                            >
                                <Divider orientation={"left"} style={{marginTop: "0px"}}>
                                    DNS 配置
                                </Divider>
                                <SwitchItem
                                    label={"禁用系统 DNS"}
                                    setValue={(DisableSystemDNS) => setParams({...params, DisableSystemDNS})}
                                    value={params.DisableSystemDNS}
                                    oldTheme={false}
                                />
                                <ManyMultiSelectForString
                                    label={"备用 DNS"}
                                    setValue={(CustomDNSServers) =>
                                        setParams({...params, CustomDNSServers: CustomDNSServers.split(",")})
                                    }
                                    value={params.CustomDNSServers.join(",")}
                                    data={[]}
                                    mode={"tags"}
                                />
                                <SwitchItem
                                    label={"启用 TCP DNS"}
                                    setValue={(DNSFallbackTCP) => setParams({...params, DNSFallbackTCP})}
                                    value={params.DNSFallbackTCP}
                                    oldTheme={false}
                                />
                                <SwitchItem
                                    label={"启用 DoH 抗污染"}
                                    setValue={(DNSFallbackDoH) => setParams({...params, DNSFallbackDoH})}
                                    value={params.DNSFallbackDoH}
                                    oldTheme={false}
                                />
                                {params.DNSFallbackDoH && (
                                    <ManyMultiSelectForString
                                        label={"备用 DoH"}
                                        setValue={(data) => setParams({...params, CustomDoHServers: data.split(",")})}
                                        value={params.CustomDoHServers.join(",")}
                                        data={[]}
                                        mode={"tags"}
                                    />
                                )}
                                <Divider orientation={"left"} style={{marginTop: "0px"}}>
                                    TLS 客户端配置
                                </Divider>
                                <Form.Item label={"选择格式"}>
                                    <YakitRadioButtons
                                        size='small'
                                        value={format}
                                        onChange={(e) => {
                                            setFormat(e.target.value)
                                        }}
                                        buttonStyle='solid'
                                        options={[
                                            {
                                                value: 1,
                                                label: "p12/pfx 格式"
                                            },
                                            {
                                                value: 2,
                                                label: "pem 格式"
                                            }
                                        ]}
                                    />
                                </Form.Item>
                                {format === 1 && (
                                    <>
                                        <Form.Item label={"添加证书"}>
                                            {/*
                                    PEM: 3 - CERT / KEY / CA-CERT
                                    PKCS12(P12/PFX)(.p12 .pfx): File + Password
                                */}
                                            <Upload
                                                accept={".p12,.pfx"}
                                                multiple={false}
                                                maxCount={1}
                                                showUploadList={false}
                                                beforeUpload={(file) => onCertificate(file)}
                                            >
                                                <YakitButton type={"outline2"}>
                                                    添加 TLS 客户端证书（双向认证）
                                                </YakitButton>
                                            </Upload>
                                            {certificateList}
                                        </Form.Item>
                                    </>
                                )}
                                {format === 2 && (
                                    <InputCertificateForm
                                        ref={cerFormRef}
                                        isShowCerName={false}
                                        formProps={{
                                            labelCol: {span: 5},
                                            wrapperCol: {span: 14}
                                        }}
                                    />
                                )}
                                <Form.Item label={"客户端tls版本支持"}>
                                    <Slider
                                        style={{width: "33%"}}
                                        range
                                        dots
                                        value={[params.MinTlsVersion, params.MaxTlsVersion]}
                                        onChange={(value) => {
                                            if (value.length == 2) {
                                                setParams({...params, MinTlsVersion: value[0], MaxTlsVersion: value[1]})
                                            }
                                        }}
                                        min={0x300}
                                        max={0x304}
                                        tipFormatter={(value) => {
                                            switch (value) {
                                                case 0x300:
                                                    return "SSLv3"
                                                case 0x301:
                                                    return "TLS 1.0"
                                                case 0x302:
                                                    return "TLS 1.1"
                                                case 0x303:
                                                    return "TLS 1.2"
                                                case 0x304:
                                                    return "TLS 1.3"
                                                default:
                                                    return value
                                            }
                                        }}
                                    />
                                </Form.Item>

                                <Divider orientation={"left"} style={{marginTop: "0px"}}>
                                    第三方应用配置
                                </Divider>
                                <Form.Item label={"第三方应用"}>
                                    {(params.AppConfigs || []).map((i, index) => {
                                        const extraParamsArr = i.ExtraParams || []
                                        const extraParams = {}
                                        extraParamsArr.forEach((item) => {
                                            extraParams[item.Key] = item.Value
                                        })
                                        return (
                                            <YakitTag
                                                key={index}
                                                onClick={() => {
                                                    let m = showYakitModal({
                                                        title: "修改第三方应用",
                                                        width: 600,
                                                        closable: true,
                                                        maskClosable: false,
                                                        footer: null,
                                                        content: (
                                                            <div style={{margin: 24}}>
                                                                <NewThirdPartyApplicationConfig
                                                                    formValues={{
                                                                        Type: i.Type,
                                                                        ...extraParams
                                                                    }}
                                                                    disabledType={true}
                                                                    onAdd={(data) => {
                                                                        setParams({
                                                                            ...params,
                                                                            AppConfigs: (params.AppConfigs || []).map(
                                                                                (i) => {
                                                                                    if (i.Type === data.Type) {
                                                                                        i = data
                                                                                    }
                                                                                    return {...i}
                                                                                }
                                                                            )
                                                                        })
                                                                        setTimeout(() => submit(), 100)
                                                                        m.destroy()
                                                                    }}
                                                                    onCancel={() => m.destroy()}
                                                                />
                                                            </div>
                                                        )
                                                    })
                                                }}
                                                closable
                                                onClose={() => {
                                                    setParams({
                                                        ...params,
                                                        AppConfigs: (params.AppConfigs || []).filter(
                                                            (e) => i.Type !== e.Type
                                                        )
                                                    })
                                                    setTimeout(() => submit(), 100)
                                                }}
                                            >
                                                {i.Type}
                                            </YakitTag>
                                        )
                                    })}
                                    <YakitButton
                                        type={"outline1"}
                                        onClick={() => {
                                            let m = showYakitModal({
                                                title: "添加第三方应用",
                                                width: 600,
                                                footer: null,
                                                closable: true,
                                                maskClosable: false,
                                                content: (
                                                    <div style={{margin: 24}}>
                                                        <NewThirdPartyApplicationConfig
                                                            onAdd={(data) => {
                                                                let existed = false
                                                                const existedResult = (params.AppConfigs || []).map(
                                                                    (i) => {
                                                                        if (i.Type === data.Type) {
                                                                            existed = true
                                                                            return {...i, ...data}
                                                                        }
                                                                        return {...i}
                                                                    }
                                                                )
                                                                if (!existed) {
                                                                    existedResult.push(data)
                                                                }
                                                                setParams({...params, AppConfigs: existedResult})
                                                                setTimeout(() => submit(), 100)
                                                                m.destroy()
                                                            }}
                                                            onCancel={() => m.destroy()}
                                                        />
                                                    </div>
                                                )
                                            })
                                        }}
                                    >
                                        添加第三方应用
                                    </YakitButton>
                                </Form.Item>
                                <Form.Item label={"AI使用优先级"}>
                                    <div className={styles["ai-sort-box"]}>
                                        <AISortContent
                                            AiApiPriority={params.AiApiPriority}
                                            onUpdate={(AiApiPriority) => {
                                                setParams({...params, AiApiPriority})
                                            }}
                                        />
                                    </div>
                                </Form.Item>
                                <Divider orientation={"left"} style={{marginTop: "0px"}}>
                                    其他配置
                                </Divider>
                                <Form.Item label={"HTTP认证全局配置"}>
                                    <div className={styles["form-rule-body"]}>
                                        <div className={styles["form-rule"]} onClick={() => setVisible(true)}>
                                            <div className={styles["form-rule-text"]}>
                                                现有配置 {params.AuthInfos.filter((item) => !item.Forbidden).length} 条
                                            </div>
                                            <div className={styles["form-rule-icon"]}>
                                                <CogIcon />
                                            </div>
                                        </div>
                                    </div>
                                </Form.Item>

                                <Form.Item label={"禁用IP"} tooltip='配置禁用IP后，yakit将会过滤不会访问'>
                                    <YakitSelect
                                        mode='tags'
                                        value={params.DisallowIPAddress}
                                        onChange={(value) => {
                                            setParams({...params, DisallowIPAddress: value})
                                        }}
                                    ></YakitSelect>
                                </Form.Item>
                                <Form.Item label={"禁用域名"} tooltip='配置禁用域名后，yakit将会过滤不会访问'>
                                    <YakitSelect
                                        mode='tags'
                                        value={params.DisallowDomain}
                                        onChange={(value) => {
                                            setParams({...params, DisallowDomain: value})
                                        }}
                                    ></YakitSelect>
                                </Form.Item>
                                <Form.Item
                                    label={"插件扫描白名单"}
                                    tooltip='配置插件扫描白名单后，插件仅会对匹配的URL进行扫描。支持以兼容模式进行匹配，即先尝试以正则模式匹配 → glob 模式匹配 → 关键字匹配。'
                                >
                                    <YakitSelect
                                        mode='tags'
                                        value={params.IncludePluginScanURIs}
                                        onChange={(value) => {
                                            setParams({...params, IncludePluginScanURIs: value})
                                        }}
                                    ></YakitSelect>
                                </Form.Item>
                                <Form.Item
                                    label={"插件扫描黑名单"}
                                    tooltip='配置插件扫描黑名单后，插件不会对匹配的URL进行扫描。支持以兼容模式进行匹配，即先尝试以正则模式匹配 → glob 模式匹配 → 关键字匹配。'
                                >
                                    <YakitSelect
                                        mode='tags'
                                        value={params.ExcludePluginScanURIs}
                                        onChange={(value) => {
                                            setParams({...params, ExcludePluginScanURIs: value})
                                        }}
                                    ></YakitSelect>
                                </Form.Item>
                                <Form.Item label={"全局代理"}>
                                    <YakitInput
                                        allowClear
                                        size='small'
                                        value={params.GlobalProxy.join(",")}
                                        onChange={(e) => {
                                            const {value} = e.target
                                            setParams({...params, GlobalProxy: value.split(",")})
                                        }}
                                    />
                                </Form.Item>
                                <Form.Item label={"插件执行超时限制"}>
                                    <YakitInputNumber
                                        size='small'
                                        value={params.CallPluginTimeout}
                                        onChange={(e) => {
                                            setParams({...params, CallPluginTimeout: e as number})
                                        }}
                                    />
                                </Form.Item>
                                <Form.Item label={"免配置启动路径"}>
                                    <YakitInput
                                        value={chromePath}
                                        placeholder={"请选择启动路径"}
                                        size='small'
                                        onChange={(e) => setChromePath(e.target.value)}
                                    />
                                    <Upload
                                        multiple={false}
                                        maxCount={1}
                                        showUploadList={false}
                                        beforeUpload={(f) => {
                                            const file_name = f.name
                                            // @ts-ignore
                                            const path: string = f?.path || ""
                                            if (path.length > 0) {
                                                setChromePath(path)
                                            }
                                            return false
                                        }}
                                    >
                                        <div className={styles["config-select-path"]}>选择路径</div>
                                    </Upload>
                                </Form.Item>
                                <Form.Item
                                    label={"系统代理"}
                                    tooltip='开启以后如未配置代理，会默认走系统代理；如配置其他代理，其优先级高于系统代理'
                                >
                                    <YakitSwitch
                                        checked={params.EnableSystemProxyFromEnv}
                                        onChange={(EnableSystemProxyFromEnv) =>
                                            setParams({...params, EnableSystemProxyFromEnv})
                                        }
                                    />
                                </Form.Item>
                                <Form.Item label={"保存HTTP流量"} tooltip='打开则会保存MITM以外的流量数据到History表中'>
                                    <YakitSwitch
                                        checked={!params.SkipSaveHTTPFlow}
                                        onChange={(val) => setParams({...params, SkipSaveHTTPFlow: !val})}
                                    />
                                </Form.Item>
                                <Form.Item label={"数据库同步存储"} tooltip='开启数据库同步存存储'>
                                    <YakitSwitch
                                        checked={params.DbSaveSync}
                                        onChange={(val) => setParams({...params, DbSaveSync: val})}
                                    />
                                </Form.Item>
                                <Form.Item
                                    label={"转储数据包大小"}
                                    tooltip='超过设置大小的数据包会转储为文件，不会直接入库'
                                    labelCol={{span: 5}}
                                    wrapperCol={{span: 2}}
                                >
                                    <YakitInput
                                        suffix='M'
                                        size='small'
                                        value={params.MaxContentLength}
                                        onChange={(e) => {
                                            let value = e.target.value.replace(/\D/g, "")
                                            if (value.length > 1 && value.startsWith("0")) {
                                                value = value.replace(/^0+/, "")
                                            }
                                            setParams({...params, MaxContentLength: value})
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                let value = parseInt(params.MaxContentLength + "" || "0", 10)
                                                if (!value || value === 0) {
                                                    value = 10
                                                } else if (value > 50) {
                                                    value = 50
                                                }
                                                setParams({...params, MaxContentLength: value})
                                            }
                                        }}
                                        onBlur={() => {
                                            let value = parseInt(params.MaxContentLength + "" || "0", 10)
                                            if (!value || value === 0) {
                                                value = 10
                                            } else if (value > 50) {
                                                value = 50
                                            }
                                            setParams({...params, MaxContentLength: value})
                                        }}
                                    />
                                </Form.Item>
                                <Form.Item
                                    label={"自动性能采样"}
                                    tooltip={
                                        <>
                                            开启后cpu、内存过高则会自动触发性能采样，采集到的文件会存在
                                            "~yakit-projects/pprof-log"文件夹里
                                        </>
                                    }
                                >
                                    <YakitSwitch
                                        checked={pprofFileAutoAnalyze}
                                        onChange={(pprofFileAutoAnalyze) =>
                                            setPprofFileAutoAnalyze(pprofFileAutoAnalyze)
                                        }
                                    />
                                </Form.Item>
                                <Divider orientation={"left"} style={{marginTop: "0px"}}>
                                    SYN 扫描网卡配置
                                </Divider>
                                <Form.Item label={"网卡"} tooltip='为SYN扫描选择网卡'>
                                    <YakitSelect
                                        // showSearch
                                        options={netInterfaceList}
                                        placeholder='请选择...'
                                        size='small'
                                        value={params.SynScanNetInterface}
                                        onChange={(netInterface) => {
                                            setParams({...params, SynScanNetInterface: netInterface})
                                        }}
                                        maxTagCount={100}
                                    />
                                </Form.Item>
                                <Divider orientation={"left"} style={{marginTop: "0px"}}>
                                    隐私配置
                                </Divider>
                                <Form.Item
                                    label={"退出登陆删除本地私密插件"}
                                    tooltip='账号退出登录后,会删除该账号的本地私密插件,便于保护用户隐私数据'
                                >
                                    <YakitSwitch checked={isDelPrivatePlugin} onChange={setIsDelPrivatePlugin} />
                                </Form.Item>
                                <Form.Item colon={false} label={" "}>
                                    <Space>
                                        <YakitButton type='primary' htmlType='submit'>
                                            更新全局配置
                                        </YakitButton>
                                        <YakitPopconfirm
                                            title={"确定需要重置配置吗？"}
                                            onConfirm={() => {
                                                onResetDelPrivatePlugin()
                                                onResetChromePath()
                                                onResetPprofFileAutoAnalyze()
                                                ipcRenderer.invoke("ResetGlobalNetworkConfig", {}).then(() => {
                                                    update()
                                                    yakitInfo("重置配置成功")
                                                })
                                            }}
                                            placement='top'
                                        >
                                            <YakitButton type='outline1'> 重置配置 </YakitButton>
                                        </YakitPopconfirm>
                                    </Space>
                                </Form.Item>
                            </Form>
                        )}
                    </AutoSpin>
                </AutoCard>
            </div>
            {visible && (
                <NTMLConfig
                    visible={visible && !!inViewport}
                    setVisible={setVisible}
                    params={params}
                    setParams={setParams}
                    onNtmlSave={onNtmlSave}
                />
            )}
        </>
    )
}

interface NTMLConfigProps {
    visible: boolean
    setVisible: (v: boolean) => void
    getContainer?: HTMLElement | (() => HTMLElement) | false
    params: GlobalNetworkConfig
    setParams: (v: GlobalNetworkConfig) => void
    onNtmlSave: () => void
}

interface DataProps extends AuthInfo {
    id: string
    Disabled: boolean
}

export const NTMLConfig: React.FC<NTMLConfigProps> = (props) => {
    const {visible, setVisible, getContainer, params, setParams, onNtmlSave} = props
    const [data, setData] = useState<DataProps[]>([])
    const [isRefresh, setIsRefresh] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const [currentItem, setCurrentItem] = useState<DataProps>()
    const [modalStatus, setModalStatus] = useState<boolean>(false)
    const [isEdit, setIsEdit] = useState<boolean>(false)
    // initData 初始数据 用于校验数据是否改变
    const initData = useRef<DataProps[]>([])

    useEffect(() => {
        const newData = params.AuthInfos.map((item) => ({id: uuidv4(), Disabled: item.Forbidden, ...item}))
        initData.current = newData
        setData(newData)
    }, [params.AuthInfos])

    const onOk = useMemoizedFn(() => {
        const AuthInfos = data.map((item) => ({
            AuthUsername: item.AuthPassword,
            AuthPassword: item.AuthPassword,
            AuthType: item.AuthType,
            Host: item.Host,
            Forbidden: item.Forbidden
        }))

        setParams({...params, AuthInfos})
        setTimeout(() => {
            onNtmlSave()
        }, 200)
    })

    const onClose = useMemoizedFn(() => {
        if (JSON.stringify(initData.current) !== JSON.stringify(data)) {
            Modal.confirm({
                title: "温馨提示",
                icon: <ExclamationCircleOutlined />,
                content: "请问是否要保存HTTP认证全局配置并关闭弹框？",
                okText: "保存",
                cancelText: "不保存",
                closable: true,
                closeIcon: (
                    <div
                        onClick={(e) => {
                            e.stopPropagation()
                            Modal.destroyAll()
                        }}
                        className='modal-remove-icon'
                    >
                        <RemoveIcon />
                    </div>
                ),
                onOk: () => {
                    onOk()
                },
                onCancel: () => {
                    setVisible(false)
                },
                cancelButtonProps: {size: "small", className: "modal-cancel-button"},
                okButtonProps: {size: "small", className: "modal-ok-button"}
            })
        } else {
            setVisible(false)
        }
    })

    const onCreateAuthInfo = useMemoizedFn(() => {
        setModalStatus(true)
    })

    const onRowClick = useDebounceFn(
        (rowDate) => {
            setCurrentItem(rowDate)
        },
        {wait: 200}
    ).run

    const onRemove = useMemoizedFn((rowDate: DataProps) => {
        const newData = data.filter((item) => item.id !== rowDate.id)
        setData(newData)
    })

    const onBan = useMemoizedFn((rowDate: DataProps) => {
        const newData: DataProps[] = data.map((item: DataProps) => {
            if (item.id === rowDate.id) {
                if (!rowDate.Disabled && rowDate.id === currentItem?.id) {
                    setCurrentItem(undefined)
                }
                item = {
                    ...rowDate,
                    Disabled: !rowDate.Disabled,
                    Forbidden: !rowDate.Disabled
                }
            }
            return item
        })
        setData(newData)
    })

    const onOpenAddOrEdit = useMemoizedFn((rowDate?: DataProps) => {
        setModalStatus(true)
        setIsEdit(true)
        setCurrentItem(rowDate)
    })

    const columns: ColumnsTypeProps[] = useMemo<ColumnsTypeProps[]>(() => {
        return [
            {
                title: "执行顺序",
                dataKey: "Index",
                fixed: "left",
                width: 130,
                render: (text: any, record: any, index: any) => <>{index + 1}</>
            },
            {
                title: "Host",
                dataKey: "Host",
                width: 150
            },
            {
                title: "用户名",
                dataKey: "AuthUsername",
                width: 150
            },
            {
                title: "密码",
                dataKey: "AuthPassword",
                width: 150,
                render: () => <>***</>
            },
            {
                title: "认证类型",
                dataKey: "AuthType"
                // minWidth: 120
            },
            {
                title: "操作",
                dataKey: "action",
                fixed: "right",
                width: 128,
                render: (_, record) => {
                    return (
                        <div className={styles["table-action-icon"]}>
                            <TrashIcon
                                className={styles["icon-trash"]}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onRemove(record)
                                }}
                            />
                            <PencilAltIcon
                                className={classNames(styles["action-icon"], {
                                    [styles["action-icon-edit-disabled"]]: record.Disabled
                                })}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onOpenAddOrEdit(record)
                                }}
                            />
                            <BanIcon
                                className={classNames(styles["action-icon"], {
                                    [styles["action-icon-ban-disabled"]]: record.Disabled
                                })}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onBan(record)
                                }}
                            />
                        </div>
                    )
                }
            }
        ]
    }, [])

    const onMoveRow = useMemoizedFn((dragIndex: number, hoverIndex: number) => {
        setData((prevRules) =>
            update(prevRules, {
                $splice: [
                    [dragIndex, 1],
                    [hoverIndex, 0, prevRules[dragIndex]]
                ]
            })
        )
    })

    const onMoveRowEnd = useMemoizedFn(() => {
        // setData((prevRules) => {
        //     const newRules = prevRules.map((item, index) => ({...item, Index: index + 1}))
        //     return [...newRules]
        // })
    })

    const onSubmit = useMemoizedFn((v: DataProps) => {
        if (isEdit) {
            const newData = data.map((item) => {
                if (item.id === v.id) {
                    return v
                }
                return item
            })
            setData(newData)
            success("编辑成功")
        } else {
            success("新增成功")
            setData([v, ...data])
        }
        setModalStatus(false)
        setIsEdit(false)
    })
    return (
        <>
            <YakitDrawer
                // placement='right'
                width='50%'
                closable={false}
                onClose={() => onClose()}
                visible={visible}
                getContainer={getContainer}
                // mask={false}
                maskClosable={false}
                // style={{height: visible ? heightDrawer : 0}}
                className={classNames(styles["ntlm-config-drawer"])}
                contentWrapperStyle={{boxShadow: "0px -2px 4px rgba(133, 137, 158, 0.2)"}}
                title={
                    <div className={styles["heard-title"]}>
                        <div className={styles["title"]}>HTTP认证全局配置</div>
                        <div className={styles["table-total"]}>
                            共 <span>{params.AuthInfos.length}</span> 条认证配置
                        </div>
                    </div>
                }
                extra={
                    <div className={styles["heard-right-operation"]}>
                        <YakitButton
                            type='primary'
                            className={styles["button-create"]}
                            onClick={() => onCreateAuthInfo()}
                        >
                            新增
                        </YakitButton>
                        <YakitButton type='primary' className={styles["button-save"]} onClick={() => onOk()}>
                            保存
                        </YakitButton>
                        <div onClick={() => onClose()} className={styles["icon-remove"]}>
                            <RemoveIcon />
                        </div>
                    </div>
                }
            >
                <div className={styles["ntlm-config-table"]}>
                    <TableVirtualResize
                        isRefresh={isRefresh}
                        titleHeight={42}
                        isShowTitle={false}
                        renderKey='id'
                        data={data}
                        // rowSelection={{
                        //     isAll: isAllSelect,
                        //     type: "checkbox",
                        //     selectedRowKeys,
                        //     onSelectAll: onSelectAll,
                        //     onChangeCheckboxSingle: onSelectChange
                        // }}
                        pagination={{
                            total: data.length,
                            limit: 20,
                            page: 1,
                            onChange: () => {}
                        }}
                        loading={loading}
                        columns={columns}
                        currentSelectItem={currentItem}
                        onRowClick={onRowClick}
                        onMoveRow={onMoveRow}
                        enableDragSort={true}
                        enableDrag={true}
                        onMoveRowEnd={onMoveRowEnd}
                    />
                </div>
            </YakitDrawer>
            {modalStatus && (
                <NTMLConfigModal
                    modalStatus={modalStatus}
                    onSubmit={onSubmit}
                    onClose={() => {
                        setModalStatus(false)
                        setIsEdit(false)
                    }}
                    isEdit={isEdit}
                    currentItem={currentItem}
                />
            )}
        </>
    )
}

interface NTMLConfigModalProps {
    onClose: () => void
    modalStatus: boolean
    onSubmit: (v: DataProps) => void
    isEdit: boolean
    currentItem?: DataProps
}

export const NTMLConfigModal: React.FC<NTMLConfigModalProps> = (props) => {
    const {onClose, modalStatus, onSubmit, isEdit, currentItem} = props
    const [form] = Form.useForm()

    useEffect(() => {
        if (isEdit && currentItem) {
            const {Host, AuthUsername, AuthPassword, AuthType} = currentItem
            form.setFieldsValue({
                Host,
                AuthUsername,
                AuthPassword,
                AuthType
            })
        }
    }, [])

    const onOk = useMemoizedFn(() => {
        form.validateFields().then((value: AuthInfo) => {
            if (isEdit && currentItem) {
                onSubmit({
                    ...currentItem,
                    ...value
                })
            } else {
                onSubmit({
                    id: uuidv4(),
                    Disabled: false,
                    ...value
                })
            }
        })
    })
    // 判断是否为IP地址 或 域名
    const judgeUrl = () => [
        {
            validator: (_, value: string) => {
                // 正则表达式匹配IPv4地址
                const ipv4RegexWithPort =
                    /^(25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})(\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})){3}(:\d+)?$/
                // 正则表达式匹配域名（支持通配符域名）
                const domainRegex = /^(\*\.|\*\*\.)?([a-zA-Z0-9-]+\.){1,}[a-zA-Z]{2,}$/
                // 匹配 CIDR 表示的 IPv4 地址范围（包含端口号）
                const cidrRegexWithPort =
                    /^(25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})(\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})){3}\/([0-2]?[0-9]|3[0-2])(:\d+)?$/
                if (ipv4RegexWithPort.test(value) || domainRegex.test(value) || cidrRegexWithPort.test(value)) {
                    return Promise.resolve()
                } else {
                    return Promise.reject("请输入符合要求的Host")
                }
            }
        }
    ]
    return (
        <YakitModal
            maskClosable={false}
            title={isEdit ? "编辑" : "新增"}
            visible={modalStatus}
            onCancel={() => onClose()}
            closable
            okType='primary'
            width={480}
            onOk={() => onOk()}
            bodyStyle={{padding: "24px 16px"}}
        >
            <Form form={form} labelCol={{span: 5}} wrapperCol={{span: 16}} className={styles["modal-from"]}>
                <Form.Item label='Host' name='Host' rules={[{required: true, message: "该项为必填"}, ...judgeUrl()]}>
                    <YakitInput placeholder='请输入...' />
                </Form.Item>
                <Form.Item label='用户名' name='AuthUsername' rules={[{required: true, message: "该项为必填"}]}>
                    <YakitInput placeholder='请输入...' />
                </Form.Item>
                <Form.Item label='密码' name='AuthPassword' rules={[{required: true, message: "该项为必填"}]}>
                    <YakitInput placeholder='请输入...' />
                </Form.Item>
                <Form.Item label='认证类型' name='AuthType' rules={[{required: true, message: "该项为必填"}]}>
                    <YakitSelect placeholder='请选择...'>
                        <YakitSelect value='ntlm'>ntlm</YakitSelect>
                        <YakitSelect value='any'>any</YakitSelect>
                        <YakitSelect value='basic'>basic</YakitSelect>
                        <YakitSelect value='digest'>digest</YakitSelect>
                    </YakitSelect>
                </Form.Item>
            </Form>
        </YakitModal>
    )
}

interface SortDataProps {
    label: string
    value: string
}
interface AISortContentProps {
    onUpdate: (v: string[]) => void
    AiApiPriority: string[]
}

const getItemStyle = (isDragging, draggableStyle) => {
    let transform: string = draggableStyle["transform"] || ""
    // console.log("transform---",transform,isDragging);
    if (isDragging) {
        // 使用正则表达式匹配 translate 函数中的两个参数
        const match = transform.match(/translate\((-?\d+)px, (-?\d+)px\)/)
        if (match) {
            // 提取匹配到的两个值，并将它们转换为数字
            const [value1, value2] = match.slice(1).map(Number)
            const modifiedString = transform.replace(/translate\((-?\d+)px, (-?\d+)px\)/, `translate(0px, ${value2}px)`)
            transform = modifiedString
        }
    }

    return {
        ...draggableStyle,
        transform
    }
}

export const AISortContent: React.FC<AISortContentProps> = (props) => {
    const {onUpdate, AiApiPriority} = props
    const [sortData, setSortData] = useState<SortDataProps[]>([])

    useEffect(() => {
        ipcRenderer.invoke("GetThirdPartyAppConfigTemplate").then((res: GetThirdPartyAppConfigTemplateResponse) => {
            const templates = res.Templates || []
            let aiOptions = templates
                .filter((item) => item.Type === "ai")
                .map((item) => ({label: item.Verbose, value: item.Name}))
            if (AiApiPriority.length > 0) {
                const sortedData = aiOptions.sort((a, b) => {
                    return AiApiPriority.indexOf(a.value) - AiApiPriority.indexOf(b.value)
                })
                setSortData(sortedData)
            } else {
                setSortData(aiOptions)
            }
        })
    }, [AiApiPriority])

    const onDragEnd = useMemoizedFn((result: DropResult) => {
        const {source, destination, draggableId} = result
        if (destination) {
            const newItems: SortDataProps[] = JSON.parse(JSON.stringify(sortData))
            const [removed] = newItems.splice(source.index, 1)
            newItems.splice(destination.index, 0, removed)
            setSortData([...newItems])
            onUpdate(newItems.map((item) => item.value))
        }
    })

    return (
        <div className={styles["ai-sort-content"]}>
            <div>优先级为从上到下</div>
            <div className={styles["menu-list"]}>
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId='droppable-payload' direction='vertical'>
                        {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps}>
                                {sortData.map((item, index) => {
                                    return (
                                        <Draggable key={item.value} draggableId={item.value} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    style={{
                                                        ...getItemStyle(
                                                            snapshot.isDragging,
                                                            provided.draggableProps.style
                                                        )
                                                    }}
                                                >
                                                    <div
                                                        className={classNames(styles["menu-list-item"], {
                                                            [styles["menu-list-item-drag"]]: snapshot.isDragging
                                                        })}
                                                    >
                                                        <div className={styles["menu-list-item-info"]}>
                                                            <DragSortIcon className={styles["drag-sort-icon"]} />
                                                            <div className={styles["title"]}>{item.label}</div>
                                                        </div>
                                                    </div>

                                                    {/* <div className={styles['sort-item-box']}>
                                <div className={classNames(styles["sort-item"]) } key={item.value}>{item.label}</div>
                                </div> */}
                                                </div>
                                            )}
                                        </Draggable>
                                    )
                                })}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </div>
        </div>
    )
}
