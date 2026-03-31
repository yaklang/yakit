import React, {useEffect, useMemo, useRef, useState} from "react"
import {AutoCard} from "@/components/AutoCard"
import {ManyMultiSelectForString, SwitchItem} from "@/utils/inputUtil"
import {Divider, Form, Modal, Slider, Space, Upload} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {yakitInfo, warn, failed, success, yakitNotify} from "@/utils/notification"
import {AutoSpin} from "@/components/AutoSpin"
import update from "immutability-helper"
import {useDebounceFn, useInViewport, useMemoizedFn} from "ahooks"
import styles from "./ConfigNetworkPage.module.scss"
import {YakitInput} from "../yakitUI/YakitInput/YakitInput"
import {YakitRadioButtons} from "../yakitUI/YakitRadioButtons/YakitRadioButtons"
import {InputCertificateForm} from "@/pages/mitm/MITMServerStartForm/MITMAddTLS"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import cloneDeep from "lodash/cloneDeep"
import {RectangleFailIcon, RectangleSucceeIcon, UnionIcon} from "./icon"
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
import ProxyRulesConfig from "./ProxyRulesConfig"
import {v4 as uuidv4} from "uuid"
import {ExclamationCircleOutlined} from "@ant-design/icons"
import {PcapMetadata} from "@/models/Traffic"
import {SelectOptionProps} from "@/pages/fuzzer/HTTPFuzzerPage"
import {KVPair} from "@/models/kv"
import {getLocalValue, getRemoteValue, setLocalValue, setRemoteValue} from "@/utils/kv"
import {LocalGVS} from "@/enums/localGlobal"
import {RemoteGV} from "@/yakitGV"
import {DragDropContext, Draggable, DropResult, Droppable} from "@hello-pangea/dnd"
import NewThirdPartyApplicationConfig from "./NewThirdPartyApplicationConfig"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {GlobalConfigRemoteGV} from "@/enums/globalConfig"
import emiter from "@/utils/eventBus/eventBus"
import {CodeCustomize} from "./CustomizeCode"
import {OutlineCogIcon, OutlineTrashIcon} from "@/assets/icon/outline"
import {LIMIT_LOG_NUM_NAME, DEFAULT_LOG_LIMIT} from "@/defaultConstants/HoldGRPCStream"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import {checkProxyVersion} from "@/utils/proxyConfigUtil"
import {useProxy} from "@/hook/useProxy"
import {handleAIConfig} from "@/pages/spaceEngine/utils"
import {isIRify} from "@/utils/envfile"
import {JSONParseLog} from "@/utils/tool"
import {
    AIOnlineModel,
    getTipByType,
    onEditAIModel,
    onRemoveAIModel,
    onSelectAIModel,
    setAIModal
} from "@/pages/ai-agent/aiModelList/AIModelList"
import {
    AIModelPolicyOptions,
    AIModelTypeEnum,
    AIModelTypeInterFileNameEnum,
    defaultAIGlobalConfig
} from "@/pages/ai-agent/defaultConstant"
import {
    AIGlobalConfig,
    AIModelConfig,
    grpcGetAIGlobalConfig,
    grpcSetAIGlobalConfig
} from "@/pages/ai-agent/aiModelList/utils"
import YakitCollapse from "../yakitUI/YakitCollapse/YakitCollapse"
import {AIModelActionProps, AIOnlineModelListProps} from "@/pages/ai-agent/aiModelList/AIModelListType"

export interface ConfigNetworkPageProp {}

export interface AuthInfo {
    AuthUsername: string
    AuthPassword: string
    AuthType: string
    Host: string
    Forbidden: boolean
}
export interface HandleAIConfigProps {
    AppConfigs: GlobalNetworkConfig["AppConfigs"]
    AiApiPriority: GlobalNetworkConfig["AiApiPriority"]
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
    //zoomeye / hunter / shodan / fofa / github / openai / token
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
    APIKey?: string
    UserIdentifier?: string
    UserSecret?: string
    Namespace?: string
    Domain?: string
    WebhookURL?: string
    ExtraParams?: KVPair[]
    Disabled?: boolean
    Proxy?: string
    NoHttps?: boolean
    APIType?: string
}
type TenumBuffer = Buffer | Uint8Array

export interface IsSetGlobalNetworkConfig {
    Pkcs12Bytes: Buffer
    Pkcs12Password?: Buffer
}

interface ClientCertificatePem {
    CrtPem: TenumBuffer
    KeyPem: TenumBuffer
    CaCertificates: TenumBuffer[]
    Host: string
}

interface ClientCertificatePfx {
    name: string
    Pkcs12Bytes: TenumBuffer
    Pkcs12Password: TenumBuffer
    password?: boolean
    Host?: string
    CrtPem?: TenumBuffer
    KeyPem?: TenumBuffer
    CaCertificates?: TenumBuffer[]
}

interface ClientCertificates {
    CrtPem: TenumBuffer
    KeyPem: TenumBuffer
    CaCertificates: TenumBuffer[]
    Pkcs12Bytes: TenumBuffer
    Pkcs12Password: TenumBuffer
    Host?: string
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
    const [proxyDrawerVisible, setProxyDrawerVisible] = useState(false)
    const {t} = useI18nNamespaces(["configNetwork", "mitm"])
    const {
        proxyConfig: {Routes = [], Endpoints = []}
    } = useProxy()
    const originGlobalConfigRef = useRef<GlobalNetworkConfig>(cloneDeep(defaultParams))
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
            if (Array.isArray(ClientCertificates) && ClientCertificates.length > 0) {
                let newArr = ClientCertificates.map((item, index) => {
                    return {...item, name: t("ConfigNetworkPage.certificateName", {index: index + 1})}
                })
                setCertificateParams(newArr)
                currentIndex.current = ClientCertificates.length
            } else {
                setCertificateParams([])
                currentIndex.current = 0
            }
            const value: GlobalNetworkConfig = {
                ...params,
                ...rsp,
                DisallowDomain: rsp.DisallowDomain.filter((item) => item),
                MaxContentLength: +rsp.MaxContentLength / (1024 * 1024) || 10
            }
            originGlobalConfigRef.current = {...value}
            setParams({...value})
            setLoading(false)
        })
    })
    useEffect(() => {
        update()
    }, [])

    const onCertificate = useMemoizedFn((file: any) => {
        if (!["application/x-pkcs12"].includes(file.type)) {
            warn(t("ConfigNetworkPage.onlySupportPkcs12"))
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
                                    name: t("ConfigNetworkPage.certificateName", {index: currentIndex.current}),
                                    Pkcs12Bytes: res,
                                    Pkcs12Password: new Uint8Array()
                                }
                            ])
                        } else {
                            // 需要密码
                            setCertificateParams([
                                ...(certificateParams || []),
                                {
                                    name: t("ConfigNetworkPage.certificateName", {index: currentIndex.current}),
                                    Pkcs12Bytes: res,
                                    Pkcs12Password: new Uint8Array(),
                                    password: true
                                }
                            ])
                        }
                    })
            })
            .catch((e) => {
                failed(t("ConfigNetworkPage.fetchCertificateContentFailed", {error: String(e)}))
            })
        return false
    })

    const ipcSubmit = useMemoizedFn((params: GlobalNetworkConfig, isNtml?: boolean) => {
        const realParams: GlobalNetworkConfig = {
            ...params,
            MaxContentLength: +params.MaxContentLength * 1024 * 1024
        }
        ipcRenderer
            .invoke("SetGlobalNetworkConfig", realParams)
            .then(() => {
                cerFormRef.current?.resetFields()
                yakitInfo(t("ConfigNetworkPage.updateConfigSuccess"))
                update()
                if (isNtml) setVisible(false)
            })
            .catch((err) => {
                yakitNotify("error", err + "")
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

        // 更新 二级页签数量
        onSetSecondaryTabsNum()

        // 更新插件日志条数
        onSetLimitLogNum()

        const newParams: GlobalNetworkConfig = {
            ...params,
            ClientCertificates: []
        }
        if (
            Array.isArray(certificateParams) &&
            certificateParams.length > 0 &&
            certificateParams.filter((item) => item.password === true).length === certificateParams.length
        ) {
            warn(t("ConfigNetworkPage.invalidCertificate"))
            return
        } else {
            const certificate = (certificateParams || []).filter((item) => item.password !== true)
            const ClientCertificates = certificate.map((item) => {
                const {
                    Pkcs12Bytes,
                    Pkcs12Password,
                    Host,
                    CrtPem = new Uint8Array(),
                    KeyPem = new Uint8Array(),
                    CaCertificates = []
                } = item
                if (Uint8ArrayToString(CrtPem) && Uint8ArrayToString(KeyPem)) {
                    // pem 格式
                    return {
                        CrtPem,
                        KeyPem,
                        CaCertificates,
                        Host,
                        Pkcs12Bytes: new Uint8Array(),
                        Pkcs12Password: new Uint8Array()
                    }
                } else {
                    // p12/pfx 格式
                    return {
                        Pkcs12Bytes,
                        Pkcs12Password,
                        Host,
                        CrtPem: new Uint8Array(),
                        KeyPem: new Uint8Array(),
                        CaCertificates: []
                    }
                }
            })
            newParams.ClientCertificates = ClientCertificates.length > 0 ? ClientCertificates : []
        }

        if (format === 1) {
            ipcSubmit(newParams, isNtml)
        } else {
            // 校验 pem 格式
            cerFormRef.current
                .validateFields()
                .then((values) => {
                    if (values.CrtPem && values.KeyPem) {
                        const obj: ClientCertificatePem = {
                            CrtPem: StringToUint8Array(values.CrtPem),
                            KeyPem: StringToUint8Array(values.KeyPem),
                            CaCertificates:
                                values.CaCertificates && values.CaCertificates.length > 0
                                    ? [StringToUint8Array(values.CaCertificates)]
                                    : [],
                            Host: values.Host || ""
                        }
                        newParams.ClientCertificates = newParams.ClientCertificates?.concat({
                            ...obj,
                            Pkcs12Bytes: new Uint8Array(),
                            Pkcs12Password: new Uint8Array()
                        })
                    }
                    ipcSubmit(newParams, isNtml)
                })
                .catch(() => {})
        }
    })

    const hostRef = useRef<string>("")
    const handleConfigureHost = (key: number, Host?: string) => {
            hostRef.current = Host || ""
            const m = showYakitModal({
            title: t("ConfigNetworkPage.inputHostTitle"),
            content: (
                <div style={{paddingTop: 20}}>
                    <Form labelCol={{span: 5}} wrapperCol={{span: 18}} size={"small"}>
                        <Form.Item label={t("ConfigNetworkPage.domain")} help={t("ConfigNetworkPage.domainHelp")}>
                            <YakitInput
                                defaultValue={hostRef.current}
                                placeholder={t("ConfigNetworkPage.domainPlaceholder")}
                                allowClear
                                onChange={(e) => {
                                    const {value} = e.target
                                    hostRef.current = value
                                }}
                            />
                        </Form.Item>
                    </Form>
                </div>
            ),
            onCancel: () => {
                m.destroy()
            },
            onOkText: t("ConfigNetworkPage.add"),
            onOk: () => {
                setCertificateParams((prev) => {
                    if (Array.isArray(prev)) {
                        prev[key].Host = hostRef.current
                    }
                    return prev?.slice()
                })
                m.destroy()
            },
            width: 400
        })
    }

    const closeCard = useMemoizedFn((item: ClientCertificatePfx) => {
        if (Array.isArray(certificateParams)) {
            let cache: ClientCertificatePfx[] = certificateParams.filter((itemIn) => item.name !== itemIn.name)
            setCertificateParams(cache)
        }
    })

    const failCard = useMemoizedFn((item: ClientCertificatePfx, key: number) => {
        return (
            <div className={styles["certificate-card-item"]} key={key}>
                <div className={classNames(styles["certificate-card"], styles["certificate-fail"])}>
                    <div className={styles["decorate"]}>
                        <RectangleFailIcon />
                    </div>
                    <div className={styles["card-hide"]}></div>
                    <div className={styles["fail-main"]}>
                        <div className={styles["title"]}>{item.name}</div>
                        <SolidLockClosedIcon />
                        <div className={styles["content"]}>{t("ConfigNetworkPage.undecrypted")}</div>
                        <YakitButton
                            type='outline2'
                            onClick={() => {
                                const m = showYakitModal({
                                    title: t("ConfigNetworkPage.passwordUnlock"),
                                    content: (
                                        <div style={{padding: 20}}>
                                            <YakitInput.Password
                                                placeholder={t("ConfigNetworkPage.enterCertificatePassword")}
                                                allowClear
                                                onChange={(e) => {
                                                    const {value} = e.target
                                                    setCertificateParams((prev) => {
                                                        if (Array.isArray(prev)) {
                                                            prev[key].Pkcs12Password =
                                                                value.length > 0
                                                                    ? StringToUint8Array(value)
                                                                    : new Uint8Array()
                                                        }
                                                        return prev?.slice()
                                                    })
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
                                                    setCertificateParams((prev) => {
                                                        if (Array.isArray(prev)) {
                                                            prev[key].password = false
                                                        }
                                                        return prev?.slice()
                                                    })
                                                    m.destroy()
                                                } else {
                                                    failed(t("ConfigNetworkPage.passwordError"))
                                                }
                                            })
                                    },
                                    width: 400
                                })
                            }}
                        >
                            {t("ConfigNetworkPage.passwordUnlock")}
                        </YakitButton>
                    </div>
                </div>
                <div className={styles["certificate-card-item-footer"]}>
                    <OutlineCogIcon
                        className={styles["icon-cog"]}
                        onClick={() => {
                            handleConfigureHost(key, item.Host)
                        }}
                    />
                    <OutlineTrashIcon
                        className={styles["icon-trash"]}
                        onClick={() => {
                            closeCard(item)
                        }}
                    />
                </div>
            </div>
        )
    })

    const succeeCard = useMemoizedFn((item: ClientCertificatePfx, key: number) => {
        return (
            <div className={styles["certificate-card-item"]} key={key}>
                <div className={classNames(styles["certificate-card"], styles["certificate-succee"])}>
                    <div className={styles["decorate"]}>
                        <RectangleSucceeIcon />
                    </div>
                    <div className={styles["union"]}>
                        <UnionIcon />
                    </div>
                    <div className={styles["card-hide"]}></div>

                    <div className={styles["success-main"]}>
                        <div className={styles["title"]}>{item.name}</div>
                        <SolidCheckCircleIcon />
                        <div className={styles["content"]}>{t("ConfigNetworkPage.available")}</div>
                        <div className={styles["password"]}>******</div>
                    </div>
                </div>
                <div className={styles["certificate-card-item-footer"]}>
                    <OutlineCogIcon
                        className={styles["icon-cog"]}
                        onClick={() => {
                            handleConfigureHost(key, item.Host)
                        }}
                    />
                    <OutlineTrashIcon
                        className={styles["icon-trash"]}
                        onClick={() => {
                            closeCard(item)
                        }}
                    />
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
                const values: string = JSONParseLog(setting, {page: "ConfigNetworkPage", fun: "GlobalChromePath"})
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

    const [secondaryTabsNum, setSecondaryTabsNum] = useState<number | string>(100)
    useEffect(() => {
        getRemoteValue(GlobalConfigRemoteGV.SecondaryTabsNum).then((set) => {
            if (set) {
                setSecondaryTabsNum(set)
            }
        })
    }, [])
    const onSetSecondaryTabsNum = () => {
        setRemoteValue(GlobalConfigRemoteGV.SecondaryTabsNum, secondaryTabsNum + "")
        emiter.emit("onUpdateSecondaryTabsNum", Number(secondaryTabsNum))
    }
    const onResetSecondaryTabsNum = () => {
        setSecondaryTabsNum(100)
        setRemoteValue(GlobalConfigRemoteGV.SecondaryTabsNum, 100 + "")
    }

    const [limitLogNum, setLimitLogNum] = useState<number | string>(DEFAULT_LOG_LIMIT)

    useEffect(() => {
        getRemoteValue(LIMIT_LOG_NUM_NAME).then((num) => {
            if (num) setLimitLogNum(Number(num))
        })
    }, [])

    const onSetLimitLogNum = useMemoizedFn(() => {
        const value = Number(limitLogNum)
        setRemoteValue(LIMIT_LOG_NUM_NAME, value + "")
        emiter.emit("onUpdateLimitLogNum", value)
    })

    const onResetLimitLogNum = useMemoizedFn(() => {
        setLimitLogNum(DEFAULT_LOG_LIMIT)
        setTimeout(() => {
            onSetLimitLogNum()
        }, 100)
    })

    const onLimitLogNumEnter = useMemoizedFn(() => {
        let value = parseInt(limitLogNum + "" || "0", 10)
        if (!value || value === 0) {
            value = 100
        }
        setLimitLogNum(value)
    })

    const onClickDownstreamProxy = useMemoizedFn(async () => {
        try {
            const versionValid = await checkProxyVersion()
            if (!versionValid) {
                return
            }
            setProxyDrawerVisible(true)
        } catch (error) {
            console.error("error:", error)
        }
    })
    const hideRules = useMemo(() => isIRify(), [])

    return (
        <>
            <div ref={configRef}>
                <AutoCard style={{height: "auto"}}>
                        <AutoSpin spinning={loading} tip={t("ConfigNetworkPage.loading")}> 
                        {params && (
                            <Form
                                size={"small"}
                                labelCol={{span: 5}}
                                wrapperCol={{span: 14}}
                                onSubmitCapture={() => submit()}
                            >
                                <Divider orientation={"left"} style={{marginTop: "0px"}}>
                                    {t("ConfigNetworkPage.dnsConfig")}
                                </Divider>
                                <SwitchItem
                                    label={t("ConfigNetworkPage.disableSystemDNS")}
                                    setValue={(DisableSystemDNS) => setParams({...params, DisableSystemDNS})}
                                    value={params.DisableSystemDNS}
                                    oldTheme={false}
                                />
                                <ManyMultiSelectForString
                                    label={t("ConfigNetworkPage.backupDNS")}
                                    setValue={(CustomDNSServers) =>
                                        setParams({...params, CustomDNSServers: CustomDNSServers.split(",")})
                                    }
                                    value={params.CustomDNSServers.join(",")}
                                    data={[]}
                                    mode={"tags"}
                                />
                                <SwitchItem
                                    label={t("ConfigNetworkPage.enableTCPDNS")}
                                    setValue={(DNSFallbackTCP) => setParams({...params, DNSFallbackTCP})}
                                    value={params.DNSFallbackTCP}
                                    oldTheme={false}
                                />
                                <SwitchItem
                                    label={t("ConfigNetworkPage.enableDoHAntiPollution")}
                                    setValue={(DNSFallbackDoH) => setParams({...params, DNSFallbackDoH})}
                                    value={params.DNSFallbackDoH}
                                    oldTheme={false}
                                />
                                {params.DNSFallbackDoH && (
                                    <ManyMultiSelectForString
                                        label={t("ConfigNetworkPage.backupDoH")}
                                        setValue={(data) => setParams({...params, CustomDoHServers: data.split(",")})}
                                        value={params.CustomDoHServers.join(",")}
                                        data={[]}
                                        mode={"tags"}
                                    />
                                )}
                                <Divider orientation={"left"} style={{marginTop: "0px"}}>
                                    {t("ConfigNetworkPage.tlsClientConfig")}
                                </Divider>
                                    <Form.Item label={t("ConfigNetworkPage.selectFormat")}>
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
                                                label: t("ConfigNetworkPage.p12Format")
                                            },
                                            {
                                                value: 2,
                                                label: t("ConfigNetworkPage.pemFormat")
                                            }
                                        ]}
                                    />
                                </Form.Item>
                                {format === 1 && (
                                    <>
                                        <Form.Item label={t("ConfigNetworkPage.addCertificate")}>
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
                                                    {t("ConfigNetworkPage.addTlsClientCertificate")}
                                                </YakitButton>
                                            </Upload>
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
                                <Form.Item colon={false} label={<> </>}>
                                    {certificateList}
                                </Form.Item>
                                    <Form.Item label={t("ConfigNetworkPage.clientTlsVersionSupport")}>
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
                                    {t("ConfigNetworkPage.thirdPartyAppConfig")}
                                </Divider>
                                    <Form.Item label={t("ConfigNetworkPage.thirdPartyApp")}>
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
                                                        title: t("ConfigNetworkPage.editThirdPartyApp"),
                                                        width: 600,
                                                        closable: true,
                                                        maskClosable: false,
                                                        footer: null,
                                                        content: (
                                                            <NewThirdPartyApplicationConfig
                                                                formValues={{
                                                                    Type: i.Type,
                                                                    ...extraParams
                                                                }}
                                                                disabledType={true}
                                                                onAdd={(data) => {
                                                                    // 不影响ai优先级排序
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
                                                        )
                                                    })
                                                }}
                                                closable
                                                onClose={async () => {
                                                    const newAppConfigs = (params.AppConfigs || []).filter(
                                                        (e) => i.Type !== e.Type
                                                    )
                                                    const newAiApiPriority = params.AiApiPriority.filter(
                                                        (ele) => ele !== i.Type
                                                    )
                                                    setParams({
                                                        ...params,
                                                        AppConfigs: newAppConfigs,
                                                        AiApiPriority: newAiApiPriority
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
                                                        title: t("ConfigNetworkPage.addThirdPartyApp"),
                                                width: 600,
                                                footer: null,
                                                closable: true,
                                                maskClosable: false,
                                                content: (
                                                    <NewThirdPartyApplicationConfig
                                                        onAdd={(data) => {
                                                            // 新增，有影响ai优化级
                                                            const newValue = handleAIConfig(
                                                                {
                                                                    AppConfigs: params.AppConfigs,
                                                                    AiApiPriority: params.AiApiPriority
                                                                },
                                                                data
                                                            )
                                                            if (!newValue) {
                                                                yakitNotify("error", t("ConfigNetworkPage.paramError"))
                                                                return
                                                            }
                                                            setParams((perv) => ({...perv, ...newValue})) // submit后会拿最新得全局配置
                                                            setTimeout(() => submit(), 100)
                                                            m.destroy()
                                                        }}
                                                        onCancel={() => m.destroy()}
                                                    />
                                                )
                                            })
                                        }}
                                    >
                                                {t("ConfigNetworkPage.addThirdPartyApp")}
                                    </YakitButton>
                                </Form.Item>
                                {/* <Form.Item label={"AI使用优先级"}>
                                    <div className={styles["ai-sort-box"]}>
                                        {!!params.AppConfigs.length ? (
                                            <AISortContent
                                                appConfigs={params.AppConfigs}
                                                AiApiPriority={params.AiApiPriority}
                                                onUpdate={(aiTypes) => {
                                                    setParams((perv) => {
                                                        const noAiConfig: ThirdPartyApplicationConfig[] =
                                                            perv.AppConfigs.filter(
                                                                (ele) => !aiTypes.some((i) => i.Type === ele.Type)
                                                            )

                                                        const newConfig = [...aiTypes, ...noAiConfig]
                                                        return {
                                                            ...perv,
                                                            AiApiPriority: aiTypes.map((ele) => ele.Type),
                                                            AppConfigs: newConfig
                                                        }
                                                    })
                                                    setTimeout(() => submit(), 100)
                                                }}
                                            />
                                        ) : (
                                            <>{t("ConfigNetworkPage.pleaseConfigureAI")}</>
                                        )}
                                    </div>
                                </Form.Item> */}
                                <AIModelGlobalConfig />
                                <Divider orientation={"left"} style={{marginTop: "0px"}}>
                                    {t("ConfigNetworkPage.customCodeSnippet")}
                                    <div className={styles["form-rule-code-customize-describe"]}>
                                        {t("ConfigNetworkPage.customCodeSnippetDesc")}
                                    </div>
                                </Divider>

                                <Form.Item
                                    label={t("ConfigNetworkPage.codeSnippet")}
                                    name='code-customize'
                                    className={styles["form-rule-code-customize-item"]}
                                >
                                    <CodeCustomize />
                                </Form.Item>

                                <Divider orientation={"left"} style={{marginTop: "0px"}}>
                                    {t("ConfigNetworkPage.otherConfig")}
                                </Divider>
                                <Form.Item label={t("ConfigNetworkPage.httpAuthGlobalConfig")}>
                                    <div className={styles["form-rule-body"]}>
                                        <div className={styles["form-rule"]} onClick={() => setVisible(true)}>
                                            <div className={styles["form-rule-text"]}>
                                                {t("ConfigNetworkPage.existingAuthConfig", {count: params.AuthInfos.filter((item) => !item.Forbidden).length})}
                                            </div>
                                            <div className={styles["form-rule-icon"]}>
                                                <CogIcon />
                                            </div>
                                        </div>
                                    </div>
                                </Form.Item>

                                <Form.Item label={t("ConfigNetworkPage.disableIP")} tooltip={t("ConfigNetworkPage.disableIPTip")}> 
                                    <YakitSelect
                                        mode='tags'
                                        value={params.DisallowIPAddress}
                                        onChange={(value) => {
                                            setParams({...params, DisallowIPAddress: value})
                                        }}
                                    ></YakitSelect>
                                </Form.Item>
                                <Form.Item label={t("ConfigNetworkPage.disableDomain")} tooltip={t("ConfigNetworkPage.disableDomainTip")}>
                                    <YakitSelect
                                        mode='tags'
                                        value={params.DisallowDomain}
                                        onChange={(value) => {
                                            setParams({...params, DisallowDomain: value})
                                        }}
                                    ></YakitSelect>
                                </Form.Item>
                                <Form.Item
                                    label={t("ConfigNetworkPage.pluginScanWhitelist")}
                                    tooltip={t("ConfigNetworkPage.pluginScanWhitelistTip")}
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
                                    label={t("ConfigNetworkPage.pluginScanBlacklist")}
                                    tooltip={t("ConfigNetworkPage.pluginScanBlacklistTip")}
                                >
                                    <YakitSelect
                                        mode='tags'
                                        value={params.ExcludePluginScanURIs}
                                        onChange={(value) => {
                                            setParams({...params, ExcludePluginScanURIs: value})
                                        }}
                                    ></YakitSelect>
                                </Form.Item>
                                    <Form.Item label={t("ConfigNetworkPage.globalProxy")}>
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
                                    <Form.Item label={t("ConfigNetworkPage.pluginExecTimeout")}>
                                    <YakitInputNumber
                                        size='small'
                                        value={params.CallPluginTimeout}
                                        onChange={(e) => {
                                            setParams({...params, CallPluginTimeout: e as number})
                                        }}
                                        min={1}
                                    />
                                </Form.Item>
                                    <Form.Item label={t("ConfigNetworkPage.noConfigLaunchPath")}>
                                    <YakitInput
                                        value={chromePath}
                                        placeholder={t("ConfigNetworkPage.selectLaunchPath")}
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
                                        <div className={styles["config-select-path"]}>{t("ConfigNetworkPage.selectPath")}</div>
                                    </Upload>
                                </Form.Item>
                                <Form.Item
                                    label={t("ConfigNetworkPage.systemProxy")}
                                    tooltip={t("ConfigNetworkPage.systemProxyTip")}
                                >
                                    <YakitSwitch
                                        checked={params.EnableSystemProxyFromEnv}
                                        onChange={(EnableSystemProxyFromEnv) =>
                                            setParams({...params, EnableSystemProxyFromEnv})
                                        }
                                    />
                                </Form.Item>
                                <Form.Item
                                    label={t(hideRules ? "AgentConfigModal.proxy_configuration" : "ProxyConfig.title")}
                                >
                                    <div className={styles["form-rule-body"]}>
                                        <div className={styles["form-rule"]} onClick={onClickDownstreamProxy}>
                                            <div className={styles["form-rule-text"]}>
                                                {t("ProxyConfig.recordPointsCount", {i: Endpoints.length})}
                                                {!hideRules
                                                    ? `,${t("ProxyConfig.recordRoutesCount", {i: Routes.length})}`
                                                    : null}
                                            </div>
                                            <div className={styles["form-rule-icon"]}>
                                                <OutlineCogIcon />
                                            </div>
                                        </div>
                                    </div>
                                </Form.Item>
                                <ProxyRulesConfig
                                    hideRules={hideRules}
                                    visible={proxyDrawerVisible}
                                    onClose={() => setProxyDrawerVisible(false)}
                                />
                                <Form.Item label={t("ConfigNetworkPage.saveHTTPFlow")} tooltip={t("ConfigNetworkPage.saveHTTPFlowTip")}>
                                    <YakitSwitch
                                        checked={!params.SkipSaveHTTPFlow}
                                        onChange={(val) => setParams({...params, SkipSaveHTTPFlow: !val})}
                                    />
                                </Form.Item>
                                <Form.Item label={t("ConfigNetworkPage.dbSyncStorage")} tooltip={t("ConfigNetworkPage.dbSyncStorageTip")}>
                                    <YakitSwitch
                                        checked={params.DbSaveSync}
                                        onChange={(val) => setParams({...params, DbSaveSync: val})}
                                    />
                                </Form.Item>
                                <Form.Item
                                    label={t("ConfigNetworkPage.dumpPacketSize")}
                                    tooltip={t("ConfigNetworkPage.dumpPacketSizeTip")}
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
                                        onPressEnter={() => {
                                            let value = parseInt(params.MaxContentLength + "" || "0", 10)
                                            if (!value || value === 0) {
                                                value = 10
                                            } else if (value > 50) {
                                                value = 50
                                            }
                                            setParams({...params, MaxContentLength: value})
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
                                    label={t("ConfigNetworkPage.autoPerformanceSampling")}
                                    tooltip={
                                        <>
                                            {t("ConfigNetworkPage.autoPerformanceSamplingTip")}
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
                                <Form.Item label={t("ConfigNetworkPage.secondaryTabsNum")} labelCol={{span: 5}} wrapperCol={{span: 2}}>
                                    <YakitInput
                                        size='small'
                                        value={secondaryTabsNum}
                                        onChange={(e) => {
                                            let value = e.target.value.replace(/\D/g, "")
                                            if (value.length > 1 && value.startsWith("0")) {
                                                value = value.replace(/^0+/, "")
                                            }
                                            setSecondaryTabsNum(value)
                                        }}
                                        onPressEnter={() => {
                                            let value = parseInt(secondaryTabsNum + "" || "0", 10)
                                            if (!value || value === 0) {
                                                value = 100
                                            }
                                            setSecondaryTabsNum(value)
                                        }}
                                        onBlur={() => {
                                            let value = parseInt(secondaryTabsNum + "" || "0", 10)
                                            if (!value || value === 0) {
                                                value = 100
                                            }
                                            setSecondaryTabsNum(value)
                                        }}
                                    />
                                </Form.Item>
                                <Form.Item label={t("ConfigNetworkPage.pluginLogCount")} labelCol={{span: 5}} wrapperCol={{span: 2}}>
                                    <YakitInput
                                        size='small'
                                        value={limitLogNum}
                                        onChange={(e) => {
                                            let value = e.target.value.replace(/\D/g, "")
                                            if (value.length > 1 && value.startsWith("0")) {
                                                value = value.replace(/^0+/, "")
                                            }
                                            setLimitLogNum(value)
                                        }}
                                        onPressEnter={onLimitLogNumEnter}
                                        onBlur={onLimitLogNumEnter}
                                    />
                                </Form.Item>
                                <Divider orientation={"left"} style={{marginTop: "0px"}}>
                                    {t("ConfigNetworkPage.synScanNicConfig")}
                                </Divider>
                                <Form.Item label={t("ConfigNetworkPage.nic")} tooltip={t("ConfigNetworkPage.nicTip")}>
                                    <YakitSelect
                                        // showSearch
                                        options={netInterfaceList}
                                        placeholder={t("ConfigNetworkPage.selectPlaceholder")}
                                        size='small'
                                        value={params.SynScanNetInterface}
                                        onChange={(netInterface) => {
                                            setParams({...params, SynScanNetInterface: netInterface})
                                        }}
                                        maxTagCount={100}
                                    />
                                </Form.Item>
                                <Divider orientation={"left"} style={{marginTop: "0px"}}>
                                    {t("ConfigNetworkPage.privacyConfig")}
                                </Divider>
                                <Form.Item
                                    label={t("ConfigNetworkPage.deletePrivatePluginsOnLogout")}
                                    tooltip={t("ConfigNetworkPage.deletePrivatePluginsOnLogoutTip")}
                                >
                                    <YakitSwitch checked={isDelPrivatePlugin} onChange={setIsDelPrivatePlugin} />
                                </Form.Item>
                                <Form.Item colon={false} label={" "}>
                                    <Space>
                                        <YakitButton type='primary' htmlType='submit'>
                                            {t("ConfigNetworkPage.updateGlobalConfig")}
                                        </YakitButton>
                                        <YakitPopconfirm
                                            title={t("ConfigNetworkPage.confirmResetConfig")}
                                            onConfirm={() => {
                                                onResetDelPrivatePlugin()
                                                onResetChromePath()
                                                onResetPprofFileAutoAnalyze()
                                                onResetSecondaryTabsNum()
                                                onResetLimitLogNum()
                                                ipcRenderer.invoke("ResetGlobalNetworkConfig", {}).then(() => {
                                                    cerFormRef.current?.resetFields()
                                                    update()
                                                    yakitInfo(t("ConfigNetworkPage.resetConfigSuccess"))
                                                })
                                            }}
                                            placement='top'
                                        >
                                            <YakitButton type='outline1'> {t("ConfigNetworkPage.resetConfig")} </YakitButton>
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

interface AIModelGlobalConfigProps {
    mountContainer?: AIOnlineModelListProps["mountContainer"]
}
/**
 * 在全局配置得页面使用这个组件,组件得父元素得Form表单中没有使用自带得设置值,而是采用得state来控制
 */
const AIModelGlobalConfig: React.FC<AIModelGlobalConfigProps> = React.memo((props) => {
    const {mountContainer} = props
    const {t} = useI18nNamespaces(["aiAgent"])
    const [aiGlobalConfig, setAIGlobalConfig] = useState<AIGlobalConfig>(cloneDeep(defaultAIGlobalConfig))
    const refRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(refRef)
    useEffect(() => {
        inViewport && getAIConfig()
    }, [inViewport])
    const getAIConfig = useMemoizedFn(() => {
        grpcGetAIGlobalConfig().then((res) => {
            setAIGlobalConfig(res)
        })
    })
    useEffect(() => {
        setAIConfig()
    }, [aiGlobalConfig.DisableFallback, aiGlobalConfig.RoutingPolicy])
    const setAIConfig = useDebounceFn(
        useMemoizedFn(() => {
            grpcSetAIGlobalConfig(aiGlobalConfig)
        }),
        {wait: 500}
    ).run

    const onEdit = useMemoizedFn((options: AIModelActionProps) => {
        if (!aiGlobalConfig) return
        const {fileName, index} = options
        onEditAIModel({
            aiGlobalConfig,
            index,
            fileName,
            mountContainer: undefined,
            t,
            onSuccess: () => {
                getAIConfig()
            }
        })
    })

    const onRemove = useMemoizedFn((options: AIModelActionProps) => {
        if (!aiGlobalConfig) return
        const {fileName, index} = options
        onRemoveAIModel({
            aiGlobalConfig,
            index,
            fileName,
            onSuccess: () => {
                getAIConfig()
            }
        })
    })

    const onSelect = useMemoizedFn((item: AIModelConfig, options: AIModelActionProps) => {
        if (!aiGlobalConfig) return
        const {index, fileName} = options
        onSelectAIModel({
            aiGlobalConfig,
            item,
            index,
            fileName,
            onSuccess: () => {
                getAIConfig()
            }
        })
    })

    /**增加ai配置模型 */
    const onAdd = useMemoizedFn(() => {
        setAIModal({
            mountContainer,
            t,
            onSuccess: () => {
                getAIConfig()
            }
        })
    })

    return (
        <div ref={refRef} className={styles["ai-model-global-config-wrapper"]}>
            <Divider orientation={"left"} style={{marginTop: "0px"}}>
                {t("ConfigNetworkPage.aiModelConfig")}
            </Divider>
            <Form.Item label={t("ConfigNetworkPage.aiModel")}>
                <div className={styles["ai-model-list-wrapper"]}>
                    <div className={styles["ai-model-list-header"]}>
                        <YakitButton type='primary' onClick={onAdd}>
                            {t("ConfigNetworkPage.add")}
                        </YakitButton>
                    </div>
                    <YakitCollapse defaultActiveKey={[t("ConfigNetworkPage.highQualityModel"), t("ConfigNetworkPage.lightweightModel"), t("ConfigNetworkPage.visionModel")] }>
                        <YakitCollapse.YakitPanel key={t("ConfigNetworkPage.highQualityModel")} header={t("ConfigNetworkPage.highQualityModel")}>
                            {!!aiGlobalConfig?.IntelligentModels.length && (
                                <AIOnlineModel
                                    list={aiGlobalConfig?.IntelligentModels || []}
                                    onEdit={(index) =>
                                        onEdit({
                                            fileName: AIModelTypeInterFileNameEnum.IntelligentModels,
                                            index
                                        })
                                    }
                                    onRemove={(index) =>
                                        onRemove({
                                            fileName: AIModelTypeInterFileNameEnum.IntelligentModels,
                                            index
                                        })
                                    }
                                    onSelect={(item, index) =>
                                        onSelect(item, {
                                            fileName: AIModelTypeInterFileNameEnum.IntelligentModels,
                                            index
                                        })
                                    }
                                    modelType={AIModelTypeEnum.TierIntelligent}
                                />
                            )}
                        </YakitCollapse.YakitPanel>
                        {!!aiGlobalConfig?.LightweightModels.length && (
                            <YakitCollapse.YakitPanel key={t("ConfigNetworkPage.lightweightModel")} header={t("ConfigNetworkPage.lightweightModel")}>
                                <AIOnlineModel
                                    list={aiGlobalConfig?.LightweightModels || []}
                                    onEdit={(index) =>
                                        onEdit({
                                            fileName: AIModelTypeInterFileNameEnum.LightweightModels,
                                            index
                                        })
                                    }
                                    onRemove={(index) =>
                                        onRemove({
                                            fileName: AIModelTypeInterFileNameEnum.LightweightModels,
                                            index
                                        })
                                    }
                                    onSelect={(item, index) =>
                                        onSelect(item, {
                                            fileName: AIModelTypeInterFileNameEnum.LightweightModels,
                                            index
                                        })
                                    }
                                     modelType={AIModelTypeEnum.TierLightweight}
                                />
                            </YakitCollapse.YakitPanel>
                        )}
                        {!!aiGlobalConfig?.VisionModels?.length && (
                            <YakitCollapse.YakitPanel key={t("ConfigNetworkPage.visionModel")} header={t("ConfigNetworkPage.visionModel")}>
                                <AIOnlineModel
                                    list={aiGlobalConfig?.VisionModels || []}
                                    onEdit={(index) =>
                                        onEdit({
                                            fileName: AIModelTypeInterFileNameEnum.VisionModels,
                                            index
                                        })
                                    }
                                    onRemove={(index) =>
                                        onRemove({
                                            fileName: AIModelTypeInterFileNameEnum.VisionModels,
                                            index
                                        })
                                    }
                                    onSelect={(item, index) =>
                                        onSelect(item, {
                                            fileName: AIModelTypeInterFileNameEnum.VisionModels,
                                            index
                                        })
                                    }
                                    modelType={AIModelTypeEnum.TierVision}
                                />
                            </YakitCollapse.YakitPanel>
                        )}
                    </YakitCollapse>
                </div>
            </Form.Item>
            <Form.Item label={t("ConfigNetworkPage.routingMode")} extra={<>{getTipByType(aiGlobalConfig.RoutingPolicy, t)}</>}>
                <YakitRadioButtons
                    buttonStyle='solid'
                    options={AIModelPolicyOptions}
                    value={aiGlobalConfig.RoutingPolicy}
                    onChange={(v) => setAIGlobalConfig((old) => ({...old, RoutingPolicy: v.target.value}))}
                />
            </Form.Item>
            <Form.Item valuePropName='checked' label={t("ConfigNetworkPage.disableFallback")}> 
                <YakitSwitch
                    size='middle'
                    checked={aiGlobalConfig.DisableFallback}
                    onChange={(c) => setAIGlobalConfig((old) => ({...old, DisableFallback: c}))}
                />
            </Form.Item>
        </div>
    )
})

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
    const {t} = useI18nNamespaces(["configNetwork", "mitm"])
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
            AuthUsername: item.AuthUsername,
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
                title: t("ConfigNetworkPage.friendlyReminder"),
                icon: <ExclamationCircleOutlined />,
                content: t("ConfigNetworkPage.saveHttpAuthAndClose"),
                okText: t("ConfigNetworkPage.save"),
                cancelText: t("ConfigNetworkPage.notSave"),
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
                title: t("ConfigNetworkPage.executionOrder"),
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
                title: t("ConfigNetworkPage.username"),
                dataKey: "AuthUsername",
                width: 150
            },
            {
                title: t("ConfigNetworkPage.password"),
                dataKey: "AuthPassword",
                width: 150,
                render: () => <>***</>
            },
            {
                title: t("ConfigNetworkPage.authType"),
                dataKey: "AuthType"
                // minWidth: 120
            },
            {
                title: t("ConfigNetworkPage.operation"),
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
            success(t("ConfigNetworkPage.editSuccess"))
        } else {
            success(t("ConfigNetworkPage.addSuccess"))
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
                        <div className={styles["title"]}>{t("ConfigNetworkPage.httpAuthGlobalConfig")}</div>
                        <div className={styles["table-total"]}>
                            {t("ConfigNetworkPage.authConfigTotal", {count: params.AuthInfos.length})}
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
                            {t("ConfigNetworkPage.add")}
                        </YakitButton>
                        <YakitButton type='primary' className={styles["button-save"]} onClick={() => onOk()}>
                            {t("ConfigNetworkPage.save")}
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
    const {t} = useI18nNamespaces(["configNetwork"])
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
                    return Promise.reject(t("ConfigNetworkPage.invalidHost"))
                }
            }
        }
    ]
    return (
        <YakitModal
            maskClosable={false}
            title={isEdit ? t("ConfigNetworkPage.edit") : t("ConfigNetworkPage.add")}
            visible={modalStatus}
            onCancel={() => onClose()}
            closable
            okType='primary'
            width={480}
            onOk={() => onOk()}
            bodyStyle={{padding: "24px 16px"}}
        >
            <Form form={form} labelCol={{span: 5}} wrapperCol={{span: 16}} className={styles["modal-from"]}>
                <Form.Item label='Host' name='Host' rules={[{required: true, message: t("ConfigNetworkPage.required")}, ...judgeUrl()]}> 
                    <YakitInput placeholder={t("ConfigNetworkPage.enterPlaceholder")} />
                </Form.Item>
                <Form.Item label={t("ConfigNetworkPage.username")} name='AuthUsername' rules={[{required: true, message: t("ConfigNetworkPage.required")}]}> 
                    <YakitInput placeholder={t("ConfigNetworkPage.enterPlaceholder")} />
                </Form.Item>
                <Form.Item label={t("ConfigNetworkPage.password")} name='AuthPassword' rules={[{required: true, message: t("ConfigNetworkPage.required")}]}> 
                    <YakitInput placeholder={t("ConfigNetworkPage.enterPlaceholder")} />
                </Form.Item>
                <Form.Item label={t("ConfigNetworkPage.authType")} name='AuthType' rules={[{required: true, message: t("ConfigNetworkPage.required")}]}> 
                    <YakitSelect placeholder={t("ConfigNetworkPage.selectPlaceholder")}>
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
    onUpdate: (v: GlobalNetworkConfig["AppConfigs"]) => void
    AiApiPriority: string[]
    appConfigs: GlobalNetworkConfig["AppConfigs"]
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
    const {onUpdate, AiApiPriority, appConfigs} = props
    const {t} = useI18nNamespaces(["configNetwork"])
    const [sortData, setSortData] = useState<GlobalNetworkConfig["AppConfigs"]>([])

    useEffect(() => {
        const aiPriority = appConfigs.filter((item) => AiApiPriority.includes(item.Type))
        setSortData(aiPriority)
    }, [appConfigs, AiApiPriority])

    const onDragEnd = useMemoizedFn((result: DropResult) => {
        const {source, destination, draggableId} = result
        if (destination) {
            const newItems: GlobalNetworkConfig["AppConfigs"] = cloneDeep(sortData)
            const [removed] = newItems.splice(source.index, 1)
            newItems.splice(destination.index, 0, removed)
            setSortData([...newItems])
            onUpdate(newItems)
        }
    })

    return (
        <div className={styles["ai-sort-content"]}>
            <div className={styles["ai-sort-describe"]}>{t("ConfigNetworkPage.priorityTopDown")}</div>
            <div className={styles["menu-list"]}>
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId='droppable-payload' direction='vertical'>
                        {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps}>
                                {sortData.map((item, index) => {
                                    return (
                                        <Draggable key={item.Type} draggableId={item.Type} index={index}>
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
                                                            <div className={styles["title"]}>{item.Type}</div>
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
