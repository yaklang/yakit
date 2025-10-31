import React, {useContext, useEffect, useRef, useState} from "react"
import {Form, Space, Modal} from "antd"
import {ExclamationCircleOutlined} from "@ant-design/icons"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {CONST_DEFAULT_ENABLE_INITIAL_PLUGIN, ExtraMITMServerProps, MitmStatus} from "@/pages/mitm/MITMPage"
import {MITMConsts} from "@/pages/mitm/MITMConsts"
import {YakitAutoComplete, defYakitAutoCompleteRef} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {MITMContentReplacerRule} from "../MITMRule/MITMRuleType"
import styles from "./MITMServerStartForm.module.scss"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {yakitFailed} from "@/utils/notification"
import {CogIcon, RefreshIcon} from "@/assets/newIcon"
import {RuleExportAndImportButton} from "../MITMRule/MITMRule"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useCreation, useDebounceEffect, useMemoizedFn, useUpdateEffect} from "ahooks"
import {AdvancedConfigurationFromValue} from "./MITMFormAdvancedConfiguration"
import ReactResizeDetector from "react-resize-detector"
import {useWatch} from "antd/es/form/Form"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {RemoveIcon} from "@/assets/newIcon"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitAutoCompleteRefProps} from "@/components/yakitUI/YakitAutoComplete/YakitAutoCompleteType"
import {CacheDropDownGV} from "@/yakitGV"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitRoute} from "@/enums/yakitRoute"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import MITMContext, {MITMVersion} from "../Context/MITMContext"
import {toMITMHacker} from "@/pages/hacker/httpHacker"
import {OutlineXIcon} from "@/assets/icon/outline"
import {YakitBaseSelectRef} from "@/components/yakitUI/YakitSelect/YakitSelectType"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
const MITMFormAdvancedConfiguration = React.lazy(() => import("./MITMFormAdvancedConfiguration"))
const ChromeLauncherButton = React.lazy(() => import("../MITMChromeLauncher"))

const {ipcRenderer} = window.require("electron")

export interface MITMServerStartFormProp {
    onStartMITMServer: (
        host: string,
        port: number,
        downstreamProxy: string,
        enableInitialPlugin: boolean,
        enableHttp2: boolean,
        ForceDisableKeepAlive: boolean,
        clientCertificates: ClientCertificate[],
        extra?: ExtraMITMServerProps
    ) => any
    visible: boolean
    setVisible: (b: boolean) => void
    enableInitialPlugin: boolean
    setEnableInitialPlugin: (b: boolean) => void
    status: MitmStatus
}

const {Item} = Form

export interface ClientCertificate {
    CerName: string
    CrtPem: Uint8Array
    KeyPem: Uint8Array
    CaCertificates: Uint8Array[]
}

const defHost = "127.0.0.1"
const defPort = "8083"
// 隐藏代理URL中的密码部分
export const maskProxyPassword = (proxyUrl: string) => {
    // console.log("maskProxyPassword input:", proxyUrl, "type:", typeof proxyUrl)

    if (typeof proxyUrl !== "string" || !proxyUrl) {
        return proxyUrl
    }

    try {
        const url = new URL(proxyUrl)
        if (url.password) {
            // 保留用户名，将密码替换为星号
            const maskedUrl = proxyUrl.replace(`${url.username}:${url.password}@`, `${url.username}:${"*".repeat(5)}@`)
            // console.log("masked URL:", maskedUrl)
            return maskedUrl
        }
        return proxyUrl
    } catch {
        // 如果不是标准URL格式，尝试使用正则匹配
        const maskedUrl = proxyUrl.replace(/(\/\/[^:]+:)[^@]+([@])/g, "$1*****$2")
        // console.log("regex masked URL:", maskedUrl)
        return maskedUrl
    }
}

export const MITMServerStartForm: React.FC<MITMServerStartFormProp> = React.memo((props) => {
    const {t, i18n} = useI18nNamespaces(["mitm", "yakitUi"])
    const {queryPagesDataById, removePagesDataCacheById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById,
            removePagesDataCacheById: s.removePagesDataCacheById
        }),
        shallow
    )
    const initPageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(
            YakitRoute.HTTPHacker,
            YakitRoute.HTTPHacker
        )
        if (currentItem && currentItem.pageParamsInfo.hTTPHackerPageInfo) {
            return currentItem.pageParamsInfo.hTTPHackerPageInfo
        }
    })
    const initV2PageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(
            YakitRoute.MITMHacker,
            YakitRoute.MITMHacker
        )
        if (currentItem && currentItem.pageParamsInfo.mitmHackerPageInfo) {
            return currentItem.pageParamsInfo.mitmHackerPageInfo
        }
    })
    const [rules, setRules] = useState<MITMContentReplacerRule[]>([])
    const [openRepRuleFlag, setOpenRepRuleFlag] = useState<boolean>(false)
    const [isUseDefRules, setIsUseDefRules] = useState<boolean>(false)
    const [advancedFormVisible, setAdvancedFormVisible] = useState<boolean>(false)

    // 高级配置 关闭后存的最新的form值
    const [advancedValue, setAdvancedValue] = useState<AdvancedConfigurationFromValue>()

    const ruleButtonRef = useRef<any>()
    const advancedFormRef = useRef<any>()
    const downstreamProxyRef: React.MutableRefObject<YakitBaseSelectRef> = useRef<YakitBaseSelectRef>({
        onGetRemoteValues: () => {},
        onSetRemoteValues: (s: string[]) => {}
    })

    const hostRef: React.MutableRefObject<YakitAutoCompleteRefProps> = useRef<YakitAutoCompleteRefProps>({
        ...defYakitAutoCompleteRef
    })

    const [form] = Form.useForm()
    const stateSecretHijacking = useWatch<string>("stateSecretHijacking", form)

    const mitmContent = useContext(MITMContext)

    const mitmVersion = useCreation(() => {
        return mitmContent.mitmStore.version
    }, [mitmContent.mitmStore.version])

    useEffect(() => {
        if (props.status !== "idle") return
        // 设置 MITM 初始启动插件选项
        getRemoteValue(CONST_DEFAULT_ENABLE_INITIAL_PLUGIN).then((a) => {
            form.setFieldsValue({enableInitialPlugin: !!a})
        })
        getRemoteValue(MITMConsts.MITMDefaultPort).then((e) => {
            if (!!e) {
                form.setFieldsValue({port: e})
            } else {
                form.setFieldsValue({port: defPort})
            }
        })
        getRemoteValue(MITMConsts.MITMDefaultEnableHTTP2).then((e) => {
            form.setFieldsValue({enableHttp2: !!e})
        })
        getRemoteValue(MITMConsts.MITMDefaultEnableGMTLS).then((e) => {
            if (e === "1") {
                form.setFieldsValue({stateSecretHijacking: "enableGMTLS"})
            } else {
                form.setFieldsValue({stateSecretHijacking: e || "stateSecretHijacking"})
            }
        })
        getRemoteValue(MITMConsts.MITMDefaultForceDisableKeepAlive).then((e) => {
            form.setFieldsValue({ForceDisableKeepAlive: !!e})
        })
    }, [props.status])
    useUpdateEffect(() => {
        form.setFieldsValue({enableInitialPlugin: props.enableInitialPlugin})
    }, [props.enableInitialPlugin])
    useEffect(() => {
        getRules()
    }, [props.visible])
    const getRules = useMemoizedFn(() => {
        ipcRenderer
            .invoke("GetCurrentRules", {})
            .then((rsp: {Rules: MITMContentReplacerRule[]}) => {
                const newRules = rsp.Rules.map((ele) => ({...ele, Id: ele.Index}))
                const findOpenRepRule = newRules.find(
                    (item) => !item.Disabled && (!item.NoReplace || item.Drop || item.ExtraRepeat)
                )
                setOpenRepRuleFlag(findOpenRepRule !== undefined)
                setRules(newRules)
            })
            .catch((e) => yakitFailed(t("MITMServerStartForm.getRuleListFailed") + e))
    })
    const onSwitchPlugin = useMemoizedFn((checked) => {
        props.setEnableInitialPlugin(checked)
    })
    const onStartMITM = useMemoizedFn((values) => {
        // 开启替换规则
        if (openRepRuleFlag) {
            Modal.confirm({
                title: t("YakitModal.friendlyReminder"),
                icon: <ExclamationCircleOutlined />,
                content: t("MITMServerStartForm.confirmEnableWithReplacementRules"),
                okText: t("YakitButton.confirm"),
                cancelText: t("MITMServerStartForm.goToSettings"),
                closable: true,
                centered: true,
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
                    execStartMITM(values)
                },
                onCancel: () => {
                    props.setVisible(true)
                    Modal.destroyAll()
                },
                cancelButtonProps: {size: "small", className: "modal-cancel-button"},
                okButtonProps: {size: "small", className: "modal-ok-button"}
            })
            return
        }
        execStartMITM(values)
    })
    const execStartMITM = useMemoizedFn((values) => {
        // 获取高级配置的默认值
        const advancedFormValue = advancedFormRef.current?.getValue()
        let params = {
            ...values,
            ...advancedFormValue,
            ...advancedValue
        }
        const extra: ExtraMITMServerProps = {
            onlyEnableGMTLS: params.onlyEnableGMTLS,
            preferGMTLS: params.preferGMTLS,
            enableProxyAuth: params.enableProxyAuth,
            proxyUsername: params.proxyUsername,
            proxyPassword: params.proxyPassword,
            dnsServers: params.dnsServers,
            hosts: params.etcHosts,
            filterWebsocket: params.filterWebsocket,
            disableCACertPage: params.disableCACertPage,
            DisableWebsocketCompression: params.DisableWebsocketCompression,
            PluginConcurrency: params.PluginConcurrency
        }
        if (params.stateSecretHijacking === "enableGMTLS") {
            extra.enableGMTLS = true
        } else if (params.stateSecretHijacking === "randomJA3") {
            extra.RandomJA3 = true
        }
        props.onStartMITMServer(
            params.host,
            params.port,
            Array.isArray(params.downstreamProxy) ? params.downstreamProxy.join(",") : "",
            params.enableInitialPlugin,
            params.enableHttp2,
            params.ForceDisableKeepAlive,
            params.certs,
            extra
        )
        hostRef.current.onSetRemoteValues(params.host)
        if (downstreamProxyRef.current) {
            downstreamProxyRef.current.onSetRemoteValues(params.downstreamProxy || [])
        }
        setRemoteValue(MITMConsts.MITMDefaultPort, `${params.port}`)
        setRemoteValue(MITMConsts.MITMDefaultEnableHTTP2, `${params.enableHttp2 ? "1" : ""}`)
        setRemoteValue(MITMConsts.MITMDefaultEnableGMTLS, `${params.stateSecretHijacking}`)
        setRemoteValue(MITMConsts.MITMDefaultForceDisableKeepAlive, `${params.ForceDisableKeepAlive ? "1" : ""}`)
        setRemoteValue(CONST_DEFAULT_ENABLE_INITIAL_PLUGIN, params.enableInitialPlugin ? "true" : "")
        // 记录时间戳
        const nowTime: string = Math.floor(new Date().getTime() / 1000).toString()
        setRemoteValue(MITMConsts.MITMStartTimeStamp, nowTime)
    })

    useDebounceEffect(
        () => {
            const info =
                mitmVersion === MITMVersion.V2
                    ? initV2PageInfo()?.immediatelyLaunchedInfo
                    : initPageInfo()?.immediatelyLaunchedInfo
            if (info && props.status === "idle") {
                if (mitmVersion === MITMVersion.V2) {
                    removePagesDataCacheById(YakitRoute.MITMHacker, YakitRoute.MITMHacker)
                } else {
                    removePagesDataCacheById(YakitRoute.HTTPHacker, YakitRoute.HTTPHacker)
                }
                form.setFieldsValue({host: info.host, port: info.port, enableInitialPlugin: info.enableInitialPlugin})
                execStartMITM(form.getFieldsValue())
            }
        },
        [initPageInfo()?.immediatelyLaunchedInfo, initV2PageInfo()?.immediatelyLaunchedInfo, props.status, mitmVersion],
        {wait: 100}
    )

    const [width, setWidth] = useState<number>(0)

    const [agentConfigModalVisible, setAgentConfigModalVisible] = useState<boolean>(false)
    const [alertVisible, setAlertVisible] = useState<boolean>(true)
    return (
        <>
            {mitmVersion === MITMVersion.V1 && (
                <div className={styles["mitm-alert-msg"]} style={{display: alertVisible ? "block" : "none"}}>
                    {t("MITMServerStartForm.currentMitmVersion")}
                    <YakitButton
                        style={{float: "right"}}
                        type='text2'
                        size={"middle"}
                        icon={<OutlineXIcon />}
                        onClick={() => setAlertVisible(false)}
                    />
                </div>
            )}
            <div className={styles["mitm-server-start-form"]}>
                <ReactResizeDetector
                    onResize={(w) => {
                        if (!w) {
                            return
                        }
                        setWidth(w)
                    }}
                    handleWidth={true}
                    handleHeight={true}
                    refreshMode={"debounce"}
                    refreshRate={50}
                />
                <Form
                    form={form}
                    onFinish={onStartMITM}
                    labelCol={{span: width > 610 ? 5 : 9}}
                    wrapperCol={{span: width > 610 ? 13 : 11}}
                >
                    <Item
                        label={t("MITMServerStartForm.hijackProxyListenHost")}
                        help={t("MITMServerStartForm.remoteModeTip")}
                        rules={[{required: true, message: t("YakitForm.requiredField")}]}
                        name='host'
                    >
                        <YakitAutoComplete
                            ref={hostRef}
                            cacheHistoryDataKey={CacheDropDownGV.MITMDefaultHostHistoryList}
                            placeholder={t("YakitInput.please_enter")}
                            initValue={defHost}
                        />
                    </Item>
                    <Item
                        label={t("MITMServerStartForm.hijackProxyListenPort")}
                        name='port'
                        rules={[{required: true, message: t("YakitForm.requiredField")}]}
                    >
                        <YakitInputNumber
                            wrapperClassName={styles["form-input-number"]}
                            style={{width: "100%", maxWidth: "none"}}
                        />
                    </Item>
                    <Item
                        label={t("MITMServerStartForm.downstreamProxy")}
                        name='downstreamProxy'
                        help={
                            <span className={styles["form-rule-help"]}>
                                {t("MITMServerStartForm.upstreamProxyTip")}
                                <span
                                    className={styles["form-rule-help-setting"]}
                                    onClick={() => setAgentConfigModalVisible(true)}
                                >
                                    {t("MITMServerStartForm.configureProxyAuth")}&nbsp;
                                </span>
                            </span>
                        }
                    >
                        <YakitSelect
                            ref={downstreamProxyRef}
                            cacheHistoryDataKey={MITMConsts.MITMDefaultDownstreamProxyHistory}
                            isCacheDefaultValue={true}
                            allowClear
                            mode='tags'
                            maxTagCount={4}
                            tagRender={(props) => {
                                return (
                                    <YakitTag size={"middle"} {...props}>
                                        <span className='content-ellipsis' style={{width: "100%"}}>
                                            {maskProxyPassword(props.value)}
                                        </span>
                                    </YakitTag>
                                )
                            }}
                            placeholder={t("MITMServerStartForm.proxyAddressExample")}
                        />
                    </Item>
                    <Item
                        label={t("MITMServerStartForm.http2Support")}
                        name='enableHttp2'
                        help={t("MITMServerStartForm.http2SupportTip")}
                        valuePropName='checked'
                    >
                        <YakitSwitch size='large' />
                    </Item>
                    <Item
                        label={t("MITMServerStartForm.httpsConfig")}
                        name='stateSecretHijacking'
                        initialValue={"enableGMTLS"}
                        help={
                            stateSecretHijacking === "enableGMTLS"
                                ? t("MITMServerStartForm.gmTlsHijackTip")
                                : stateSecretHijacking === "randomJA3"
                                ? t("MITMServerStartForm.randomizeClientHelloTip")
                                : t("MITMServerStartForm.noGmAndRandomTlsFingerprint")
                        }
                    >
                        <YakitRadioButtons
                            wrapClassName={styles["stateSecretHijacking-btns"]}
                            buttonStyle='solid'
                            options={[
                                {
                                    value: "enableGMTLS",
                                    label: t("MITMServerStartForm.guomi")
                                },
                                {
                                    value: "randomJA3",
                                    label: t("MITMServerStartForm.randomTLSFingerprint")
                                },
                                {
                                    value: "stateSecretHijacking",
                                    label: t("MITMServerStartForm.default")
                                }
                            ]}
                            style={{width: 300}}
                        />
                    </Item>
                    <Item
                        label={t("MITMServerStartForm.disableHijackKeepAlive")}
                        name='ForceDisableKeepAlive'
                        initialValue={true}
                        help={t("MITMServerStartForm.mitmDisableKeepAlive")}
                        valuePropName='checked'
                    >
                        <YakitSwitch size='large' />
                    </Item>
                    <Item
                        label={t("MITMServerStartForm.contentRules")}
                        help={
                            <span className={styles["form-rule-help"]}>
                                {t("MITMServerStartForm.applyRules")}
                                <span
                                    className={styles["form-rule-help-setting"]}
                                    onClick={() => {
                                        setIsUseDefRules(true)
                                        ruleButtonRef.current.onSetImportVisible(true)
                                    }}
                                >
                                    {t("MITMServerStartForm.defaultConfig")}&nbsp;
                                    <RefreshIcon />
                                </span>
                            </span>
                        }
                    >
                        <div className={styles["form-rule-body"]}>
                            <div className={styles["form-rule"]} onClick={() => props.setVisible(true)}>
                                <div className={styles["form-rule-text"]}>
                                    {t("MITMServerStartForm.existingRulesCount", {count: rules.length})}
                                </div>
                                <div className={styles["form-rule-icon"]}>
                                    <CogIcon />
                                </div>
                            </div>
                        </div>
                        <div
                            className={styles["form-rule-button"]}
                            style={{right: -185}}
                        >
                            <RuleExportAndImportButton
                                ref={ruleButtonRef}
                                isUseDefRules={isUseDefRules}
                                setIsUseDefRules={setIsUseDefRules}
                                onOkImport={() => getRules()}
                            />
                        </div>
                    </Item>
                    <Item
                        label={t("MITMServerStartForm.enablePlugin")}
                        name='enableInitialPlugin'
                        valuePropName='checked'
                    >
                        <YakitSwitch size='large' onChange={(checked) => onSwitchPlugin(checked)} />
                    </Item>
                    <Item label={" "} colon={false}>
                        <Space>
                            <YakitButton type='primary' size='large' htmlType='submit'>
                                {t("MITMServerStartForm.hijackStart")}
                            </YakitButton>
                            {mitmVersion === MITMVersion.V1 && (
                                <YakitButton size='large' onClick={() => toMITMHacker()}>
                                    {t("MITMServerStartForm.mitmHijackV2")}
                                </YakitButton>
                            )}
                            <ChromeLauncherButton
                                host={useWatch("host", form)}
                                port={useWatch("port", form)}
                                disableCACertPage={advancedFormRef.current?.getValue().disableCACertPage}
                                onFished={(host, port) => {
                                    const values = {
                                        ...form.getFieldsValue(),
                                        host,
                                        port
                                    }
                                    execStartMITM(values)
                                }}
                                repRuleFlag={openRepRuleFlag}
                                onSetVisible={props.setVisible}
                            />
                            <YakitButton type='text' size='large' onClick={() => setAdvancedFormVisible(true)}>
                                {t("MITMServerStartForm.advancedConfig")}
                            </YakitButton>
                        </Space>
                    </Item>
                </Form>
                {/* 代理劫持弹窗 */}
                <AgentConfigModal
                    agentConfigModalVisible={agentConfigModalVisible}
                    onCloseModal={() => setAgentConfigModalVisible(false)}
                    generateURL={(url) => {
                        const v = form.getFieldsValue()
                        const arr = Array.isArray(v.downstreamProxy) ? v.downstreamProxy.slice() : []
                        arr.push(url)
                        form.setFieldsValue({downstreamProxy: [...new Set(arr)]})
                    }}
                ></AgentConfigModal>
                <React.Suspense fallback={<div>loading...</div>}>
                    <MITMFormAdvancedConfiguration
                        visible={advancedFormVisible}
                        setVisible={setAdvancedFormVisible}
                        onSave={(val) => {
                            setAdvancedValue(val)
                            setAdvancedFormVisible(false)
                        }}
                        enableGMTLS={stateSecretHijacking === "enableGMTLS"}
                        ref={advancedFormRef}
                    />
                </React.Suspense>
            </div>
        </>
    )
})

interface GenerateURLRequest {
    Scheme: string
    Host: string
    Port: string
    Username: string
    Password: string
}

interface GenerateURLResponse {
    URL: string
}
interface AgentConfigModalParams extends Omit<GenerateURLRequest, "Host" | "Port"> {
    Address?: string
}

const initAgentConfigModalParams = {
    Scheme: "http",
    Address: "",
    Username: "",
    Password: ""
}

interface AgentConfigModalProp {
    agentConfigModalVisible: boolean
    onCloseModal: () => void
    generateURL: (url: string) => void
}

// 代理劫持弹窗
export const AgentConfigModal: React.FC<AgentConfigModalProp> = React.memo((props) => {
    const {agentConfigModalVisible, onCloseModal, generateURL} = props
    const {t, i18n} = useI18nNamespaces(["yakitUi", "mitm"])

    const [form] = Form.useForm()
    const [params, setParams] = useState<AgentConfigModalParams>(initAgentConfigModalParams)

    const onValuesChange = useMemoizedFn((changedValues, allValues) => {
        const key = Object.keys(changedValues)[0]
        const value = allValues[key]
        setParams({...params, [key]: value.trim()})
    })

    const handleReqParams = () => {
        const copyParams = structuredClone(params)
        const address = copyParams.Address?.split(":") || []
        delete copyParams.Address
        return {
            ...copyParams,
            Host: address[0] || "",
            Port: address[1] || ""
        }
    }

    const onOKFun = useMemoizedFn(async () => {
        await form.validateFields()
        try {
            let params = handleReqParams()
            if (params.Port === "0") {
                if (params.Scheme === "http") {
                    params.Port = "80"
                } else if (params.Scheme === "https") {
                    params.Port = "443"
                } else {
                    params.Port = "1080"
                }
            }

            const res: GenerateURLResponse = await ipcRenderer.invoke("mitm-agent-hijacking-config", params)
            generateURL(res.URL)
            onClose()
        } catch (error) {
            yakitFailed(error + "")
        }
    })

    const onClose = useMemoizedFn(() => {
        setParams(initAgentConfigModalParams)
        form.setFieldsValue(initAgentConfigModalParams)
        onCloseModal()
    })

    return (
        <YakitModal
            visible={agentConfigModalVisible}
            title={t("AgentConfigModal.proxy_auth_config")}
            width={506}
            maskClosable={false}
            destroyOnClose={true}
            closable
            centered
            okText={t("YakitButton.confirm")}
            onCancel={onClose}
            onOk={onOKFun}
            bodyStyle={{padding: 0}}
        >
            <div style={{padding: 15}}>
                <Form
                    form={form}
                    colon={false}
                    onSubmitCapture={(e) => e.preventDefault()}
                    labelCol={{span: 6}}
                    wrapperCol={{span: 18}}
                    initialValues={{...params}}
                    style={{height: "100%"}}
                    onValuesChange={onValuesChange}
                >
                    <Form.Item label={t("AgentConfigModal.protocol")} name='Scheme' style={{marginBottom: 4}}>
                        <YakitSelect
                            options={["http", "https", "socks4", "socks4a", "socks5"].map((item) => ({
                                value: item,
                                label: item
                            }))}
                            size='small'
                        />
                    </Form.Item>
                    <Form.Item
                        label={t("AgentConfigModal.address")}
                        name='Address'
                        style={{marginBottom: 4}}
                        rules={[
                            {required: true, message: t("AgentConfigModal.please_enter_address")},
                            {
                                pattern:
                                    /^((([a-z\d]([a-z\d-]*[a-z\d])*)\.)*[a-z]([a-z\d-]*[a-z\d])?|(?:\d{1,3}\.){3}\d{1,3})(:\d+)?$/,
                                message: t("AgentConfigModal.invalid_address_format")
                            }
                        ]}
                    >
                        <YakitInput placeholder={t("AgentConfigModal.example_address")} />
                    </Form.Item>
                    <Form.Item
                        label={t("AgentConfigModal.username")}
                        name='Username'
                        style={{marginBottom: 4}}
                        rules={[{required: false, message: t("AgentConfigModal.please_enter_username")}]}
                    >
                        <YakitInput placeholder={t("AgentConfigModal.please_enter_username")} />
                    </Form.Item>
                    <Form.Item
                        label={t("AgentConfigModal.password")}
                        name='Password'
                        style={{marginBottom: 4}}
                        rules={[{required: false, message: t("AgentConfigModal.please_enter_password")}]}
                    >
                        <YakitInput placeholder={t("AgentConfigModal.please_enter_password")} />
                    </Form.Item>
                </Form>
            </div>
        </YakitModal>
    )
})
