import React, {useContext, useEffect, useRef, useState} from "react"
import {Form, Space, Modal, Divider} from "antd"
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
import {AdvancedConfigurationFromValue, buildMitmExtra} from "../MITMAdvancedConfig"
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
import ProxyRulesConfig, {ProxyTest} from "@/components/configNetwork/ProxyRulesConfig"
import {checkProxyVersion, isValidUrlWithProtocol} from "@/utils/proxyConfigUtil"
import {useProxy} from "@/hook/useProxy"
import {debugToPrintLogs} from "@/utils/logCollection"
import emiter from "@/utils/eventBus/eventBus"
const MITMFormAdvancedConfiguration = React.lazy(() => import("./MITMFormAdvancedConfiguration"))
const ChromeLauncherButton = React.lazy(() => import("../MITMChromeLauncher"))

const {ipcRenderer} = window.require("electron")

export interface MITMServerStartFormProp {
    onStartMITMServer: (
        host: string,
        port: number,
        downstreamProxy: string,
        downstreamProxyRuleId: string,
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
    const {
        getProxyValue,
        proxyRouteOptions,
        checkProxyEndpoints,
        comparePointUrl,
        proxyConfig: {Endpoints = []}
    } = useProxy()
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

    const setDownstreamProxyValue = useMemoizedFn((e = "") => {
        // 新增的代理值是Url 需要转成对应的Id
        const downstreamProxy = e
            .split(",")
            .filter((i) => !!i)
            .map((item) => {
                if (item.startsWith("ep") || item.startsWith("route")) {
                    return item
                } else {
                    return Endpoints.find(({Id}) => comparePointUrl(Id) === item)?.Id || item
                }
            })
        //筛除选项没有的
        const filterDownstreamProxy = downstreamProxy.filter((item) =>
            proxyRouteOptions.some(({value}) => item === value)
        )
        form.setFieldsValue({downstreamProxy: filterDownstreamProxy})
    })

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

        getRemoteValue(MITMConsts.MITMDownStreamProxy).then(setDownstreamProxyValue)

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
            .catch((e) => yakitFailed("获取规则列表失败:" + e))
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
                content: t("MITMServerForm.replaceRuleWarning"),
                okText: t("YakitButton.confirm"),
                cancelText: t("MITMServerForm.goConfigure"),
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
        const extra: ExtraMITMServerProps = buildMitmExtra(params as AdvancedConfigurationFromValue)
        const {downstreamProxy = []} = params
        const {proxyEndpoints: downstreamProxyValue, ProxyRuleIds: downstreamProxyRuleId} =
            getProxyValue(downstreamProxy)
        debugToPrintLogs({
            page: "MITMServerStartForm",
            fun: "execStartMITM",
            content:
                JSON.stringify(params) +
                JSON.stringify(extra) +
                "; downstreamProxyValue:" +
                downstreamProxyValue +
                "; downstreamProxyRuleId:" +
                downstreamProxyRuleId
        })
        props.onStartMITMServer(
            params.host,
            params.port,
            downstreamProxyValue,
            downstreamProxyRuleId,
            params.enableInitialPlugin,
            params.enableHttp2,
            params.ForceDisableKeepAlive,
            params.certs,
            extra
        )
        hostRef.current.onSetRemoteValues(params.host)
        //如果有新增的代理配置 则存配置项
        checkProxyEndpoints(downstreamProxy)
        setRemoteValue(MITMConsts.MITMDownStreamProxy, downstreamProxy.join(","))
        setRemoteValue(MITMConsts.MITMDefaultPort, `${params.port}`)
        setRemoteValue(MITMConsts.MITMDefaultEnableHTTP2, `${params.enableHttp2 ? "1" : ""}`)
        setRemoteValue(MITMConsts.MITMDefaultEnableGMTLS, `${params.stateSecretHijacking}`)
        setRemoteValue(MITMConsts.MITMDefaultForceDisableKeepAlive, `${params.ForceDisableKeepAlive ? "1" : ""}`)
        setRemoteValue(CONST_DEFAULT_ENABLE_INITIAL_PLUGIN, params.enableInitialPlugin ? "true" : "")
        // 记录时间戳
        const nowTime: string = Math.floor(new Date().getTime() / 1000).toString()
        setRemoteValue(MITMConsts.MITMStartTimeStamp, nowTime)
    })

    const onStartMitm = useMemoizedFn((infoStr = "") => {
        try {
            const info =
                mitmVersion === MITMVersion.V2
                    ? infoStr
                        ? JSON.parse(infoStr)
                        : initV2PageInfo()?.immediatelyLaunchedInfo
                    : initPageInfo()?.immediatelyLaunchedInfo
            if (info && props.status === "idle") {
                if (mitmVersion === MITMVersion.V2) {
                    removePagesDataCacheById(YakitRoute.MITMHacker, YakitRoute.MITMHacker)
                } else {
                    removePagesDataCacheById(YakitRoute.HTTPHacker, YakitRoute.HTTPHacker)
                }
                if (info.host && info.port) {
                    form.setFieldsValue({
                        host: info?.host,
                        port: info?.port,
                        enableInitialPlugin: info.enableInitialPlugin
                    })
                }
                execStartMITM(form.getFieldsValue())
            }
        } catch (error) {}
    })
    useEffect(() => {
        setTimeout(() => {
            onStartMitm()
        }, 200)
    }, [props.status, mitmVersion])
    useEffect(() => {
        emiter.on("onStartMitm", onStartMitm)
        return () => {
            emiter.off("onStartMitm", onStartMitm)
        }
    }, [])

    const [width, setWidth] = useState<number>(0)

    const [agentConfigModalVisible, setAgentConfigModalVisible] = useState<boolean>(false)
    const [alertVisible, setAlertVisible] = useState<boolean>(true)

    const onClickDownstreamProxy = useMemoizedFn(async () => {
        try {
            const versionValid = await checkProxyVersion()
            if (!versionValid) {
                return
            }
            setAgentConfigModalVisible(true)
        } catch (error) {
            console.error("error:", error)
        }
    })

    return (
        <>
            {mitmVersion === MITMVersion.V1 && (
                <div className={styles["mitm-alert-msg"]} style={{display: alertVisible ? "block" : "none"}}>
                    {t("MITMServerForm.usingV1")}
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
                        label={t("MITMServerForm.hijackHost")}
                        help={t("MITMServerForm.hijackHostHelp")}
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
                        label={t("MITMServerForm.hijackPort")}
                        name='port'
                        rules={[{required: true, message: t("YakitForm.requiredField")}]}
                    >
                        <YakitInputNumber
                            wrapperClassName={styles["form-input-number"]}
                            style={{width: "100%", maxWidth: "none"}}
                            min={1}
                            max={65535}
                        />
                    </Item>
                    <Item
                        label={t("MITMServerForm.downstreamProxyLabel")}
                        name='downstreamProxy'
                        extra={
                            <span className={styles["form-rule-help"]}>
                                {t("MITMServerForm.downstreamProxyHelp")}
                                <span className={styles["form-rule-help-setting"]} onClick={onClickDownstreamProxy}>
                                    {t("AgentConfigModal.proxy_configuration")}
                                </span>
                                <Divider type='vertical' />
                                <ProxyTest onEchoNode={(downstreamProxy) => form.setFieldsValue({downstreamProxy})} />
                            </span>
                        }
                        getValueFromEvent={(value) => {
                            // 只保留最后一个选中的值
                            if (Array.isArray(value) && value.length > 1) {
                                return [value[value.length - 1]]
                            }
                            return value
                        }}
                        validateTrigger={["onChange", "onBlur"]}
                        rules={[
                            {
                                validator: (_, value) => {
                                    if (!value || !Array.isArray(value) || value.length === 0) {
                                        return Promise.resolve()
                                    }
                                    // 获取当前options中的所有值
                                    const existingOptions = proxyRouteOptions.map(({value}) => value)
                                    // 只校验新输入的值(不在options中的值)
                                    const newValues = value.filter((v) => !existingOptions.includes(v))
                                    // 校验代理地址格式: 协议://地址:端口
                                    for (const v of newValues) {
                                        if (!isValidUrlWithProtocol(v)) {
                                            return Promise.reject(t("ProxyConfig.valid_proxy_address_tip"))
                                        }
                                    }
                                    return Promise.resolve()
                                }
                            }
                        ]}
                    >
                        <YakitSelect
                            ref={downstreamProxyRef}
                            allowClear
                            options={proxyRouteOptions}
                            mode='tags'
                            maxTagCount={4}
                            placeholder={t("MITMServerForm.proxyPlaceholder")}
                        />
                    </Item>
                    <Item
                        label={t("MITMServerForm.http2Support")}
                        name='enableHttp2'
                        help={t("MITMServerForm.http2SupportHelp")}
                        valuePropName='checked'
                    >
                        <YakitSwitch size='large' />
                    </Item>
                    <Item
                        label={t("MITMServerForm.httpsConfig")}
                        name='stateSecretHijacking'
                        initialValue={"stateSecretHijacking"}
                        help={
                            stateSecretHijacking === "enableGMTLS"
                                ? t("MITMServerForm.httpsConfigHelp.gmTLS")
                                : stateSecretHijacking === "randomJA3"
                                ? t("MITMServerForm.httpsConfigHelp.randomJA3")
                                : t("MITMServerForm.httpsConfigHelp.default")
                        }
                    >
                        <YakitRadioButtons
                            wrapClassName={styles["stateSecretHijacking-btns"]}
                            buttonStyle='solid'
                            options={[
                                {
                                    value: "enableGMTLS",
                                    label: t("MITMServerForm.gmSecret")
                                },
                                {
                                    value: "randomJA3",
                                    label: t("MITMServerForm.randomTLS")
                                },
                                {
                                    value: "stateSecretHijacking",
                                    label: t("MITMServerForm.default")
                                }
                            ]}
                        />
                    </Item>
                    <Item
                        label={t("MITMServerForm.disableKeepAlive")}
                        name='ForceDisableKeepAlive'
                        initialValue={true}
                        help={t("MITMServerForm.disableKeepAliveHelp")}
                        valuePropName='checked'
                    >
                        <YakitSwitch size='large' />
                    </Item>
                    <Item
                        label={t("MITMServerForm.contentRule")}
                        help={
                            <span className={styles["form-rule-help"]}>
                                {t("MITMServerForm.contentRuleHelp")}
                                <span
                                    className={styles["form-rule-help-setting"]}
                                    onClick={() => {
                                        setIsUseDefRules(true)
                                        ruleButtonRef.current.onSetImportVisible(true)
                                    }}
                                >
                                    {t("MITMServerForm.defaultConfig")}&nbsp;
                                    <RefreshIcon />
                                </span>
                            </span>
                        }
                    >
                        <div className={styles["form-rule-body"]}>
                            <div className={styles["form-rule"]} onClick={() => props.setVisible(true)}>
                                <div className={styles["form-rule-text"]}>
                                    {t("MITMServerForm.existingRules", {count: rules.length})}
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
                    <Item label={t("MITMServerForm.enablePlugin")} name='enableInitialPlugin' valuePropName='checked'>
                        <YakitSwitch size='large' onChange={(checked) => onSwitchPlugin(checked)} />
                    </Item>
                    <Item label={" "} colon={false}>
                        <Space>
                            <YakitButton type='primary' size='large' htmlType='submit'>
                                {t("MITMServerForm.startHijack")}
                            </YakitButton>
                            {mitmVersion === MITMVersion.V1 && (
                                <YakitButton size='large' onClick={() => toMITMHacker()}>
                                    {t("MITMServerForm.startHijackV2")}
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
                                {t("MITMServerForm.advancedConfig")}
                            </YakitButton>
                        </Space>
                    </Item>
                </Form>
                {/* 代理劫持弹窗 */}
                <ProxyRulesConfig visible={agentConfigModalVisible} onClose={() => setAgentConfigModalVisible(false)} />
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
