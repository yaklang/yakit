import {
    InformationCircleIcon,
    PlusSmIcon,
    PlusIcon,
    TrashIcon,
    ResizerIcon,
    HollowLightningBoltIcon,
    EyeIcon
} from "@/assets/newIcon"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {yakitFailed, yakitNotify} from "@/utils/notification"
import {useInViewport, useMemoizedFn} from "ahooks"
import {Form, Tooltip, Space, Divider} from "antd"
import React, {useState, useRef, useEffect, useMemo, ReactNode} from "react"
import {inputHTTPFuzzerHostConfigItem} from "../HTTPFuzzerHosts"
import {HttpQueryAdvancedConfigProps, AdvancedConfigValueProps} from "./HttpQueryAdvancedConfigType"
import styles from "./HttpQueryAdvancedConfig.module.scss"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {
    ColorSelect,
    ExtractorItem,
    MatcherAndExtractionDrawer,
    MatcherItem
} from "../MatcherAndExtractionCard/MatcherAndExtractionCard"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import classNames from "classnames"
import {
    ExtractorValueProps,
    MatcherActiveKey,
    MatcherValueProps,
    MatchingAndExtraction
} from "../MatcherAndExtractionCard/MatcherAndExtractionCardType"
import {YakitPopover, YakitPopoverProp} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {AutoTextarea} from "../components/AutoTextarea/AutoTextarea"
import "hint.css"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import emiter from "@/utils/eventBus/eventBus"
import {AgentConfigModal, maskProxyPassword} from "@/pages/mitm/MITMServerStartForm/MITMServerStartForm"
import {VariableList} from "@/pages/httpRequestBuilder/HTTPRequestBuilder"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitFormDraggerContent} from "@/components/yakitUI/YakitForm/YakitForm"
import {OutlineBadgecheckIcon} from "@/assets/icon/outline"
import {CacheDropDownGV} from "@/yakitGV"
import {ExtractorsPanel, MatchersPanel, MatchersPanelEditProps, VariablePanel} from "./FuzzerConfigPanels"
import {
    matcherTypeList,
    extractorTypeList,
    filterModeOptions,
    matchersConditionOptions
} from "../MatcherAndExtractionCard/constants"
import {defaultAdvancedConfigValue, DefFuzzerConcurrent} from "@/defaultConstants/HTTPFuzzerPage"
import {YakitCheckableTag} from "@/components/yakitUI/YakitTag/YakitCheckableTag"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

const {ipcRenderer} = window.require("electron")
const {YakitPanel} = YakitCollapse

const WEB_FUZZ_Advanced_Config_ActiveKey = "WEB_FUZZ_Advanced_Config_ActiveKey"

const fuzzTagModeOptions = (t: (text: string) => string) => {
    return [
        {
            value: "close",
            label: t("HttpQueryAdvancedConfig.close")
        },
        {
            value: "standard",
            label: t("HttpQueryAdvancedConfig.standard")
        },
        {
            value: "legacy",
            label: t("HttpQueryAdvancedConfig.compatibility")
        }
    ]
}

const fuzzTagSyncOptions = (t: (text: string) => string) => {
    return [
        {
            value: false,
            label: t("HttpQueryAdvancedConfig.cross_product")
        },
        {
            value: true,
            label: t("HttpQueryAdvancedConfig.fork_sync")
        }
    ]
}

// 前端定义的字段值
const overwriteSNIOptions = (t: (text: string) => string) => {
    return [
        {
            value: "auto",
            label: t("HttpQueryAdvancedConfig.auto")
        },
        {
            value: "mandatory",
            label: t("HttpQueryAdvancedConfig.force")
        },
        {
            value: "clear",
            label: t("HttpQueryAdvancedConfig.clear")
        }
    ]
}

type fields = keyof AdvancedConfigValueProps

export const HttpQueryAdvancedConfig: React.FC<HttpQueryAdvancedConfigProps> = React.memo((props) => {
    const {
        advancedConfigValue,
        visible,
        onInsertYakFuzzer,
        onValuesChange,
        defaultHttpResponse,
        webFuzzerValue,
        outsideShowResponseMatcherAndExtraction,
        onShowResponseMatcherAndExtraction,
        inViewportCurrent,
        id,
        matchSubmitFun,
        showFormContentType,
        proxyListRef,
        isbuttonIsSendReqStatus,
        cachedTotal
    } = props
    const {t, i18n} = useI18nNamespaces(["yakitUi", "webFuzzer"])

    const [activeKey, setActiveKey] = useState<string[]>() // Collapse打开的key

    const [visibleDrawer, setVisibleDrawer] = useState<boolean>(false)
    const [defActiveKey, setDefActiveKey] = useState<string>("") // 提取器
    const [defActiveKeyAndOrder, setDefActiveKeyAndOrder] = useState<MatcherActiveKey>({
        order: 0,
        defActiveKey: ""
    }) // 匹配器
    const [type, setType] = useState<MatchingAndExtraction>("matchers")

    const [httpResponse, setHttpResponse] = useState<string>(defaultHttpResponse)

    const [form] = Form.useForm()
    const isGmTLS = Form.useWatch("isGmTLS", form)
    const randomJA3 = Form.useWatch("randomJA3", form)
    const overwriteSNI = Form.useWatch("overwriteSNI", form)
    const enableRandomChunked = Form.useWatch("enableRandomChunked", form)
    const queryRef = useRef(null)
    const [inViewport = true] = useInViewport(queryRef)

    const [batchTargetModalVisible, setBatchTargetModalVisible] = useState<boolean>(false)

    const retry = useMemo(() => advancedConfigValue.retry, [advancedConfigValue.retry])
    const noRetry = useMemo(() => advancedConfigValue.noRetry, [advancedConfigValue.noRetry])
    const etcHosts = useMemo(() => advancedConfigValue.etcHosts || [], [advancedConfigValue.etcHosts])
    const matchersList = useMemo(() => advancedConfigValue.matchers || [], [advancedConfigValue.matchers])
    const extractorList = useMemo(() => advancedConfigValue.extractors || [], [advancedConfigValue.extractors])
    const batchTarget = useMemo(
        () => advancedConfigValue.batchTarget || new Uint8Array(),
        [advancedConfigValue.batchTarget]
    )

    useEffect(() => {
        setHttpResponse(defaultHttpResponse)
    }, [defaultHttpResponse])

    useEffect(() => {
        if (!inViewport) setVisibleDrawer(false)
    }, [inViewport])

    useEffect(() => {
        emiter.on("openMatcherAndExtraction", openDrawer)
        getRemoteValue(WEB_FUZZ_Advanced_Config_ActiveKey).then((data) => {
            try {
                setActiveKey(data ? JSON.parse(data) : "请求包配置")
            } catch (error) {
                yakitFailed(t("HttpQueryAdvancedConfig.collapse_active_key_error") + error)
            }
        })
        return () => {
            emiter.off("openMatcherAndExtraction", openDrawer)
        }
    }, [])

    const openDrawer = useMemoizedFn((val) => {
        try {
            const res = JSON.parse(val)
            if (inViewportCurrent && !visibleDrawer) {
                setVisibleDrawer(true)
            }
            setHttpResponse(res.httpResponseCode)
        } catch (error) {
            yakitNotify("error", t("HttpQueryAdvancedConfig.open_matcher_extraction_error"))
        }
    })

    useEffect(() => {
        form.setFieldsValue(advancedConfigValue)
    }, [advancedConfigValue])

    const onSetValue = useMemoizedFn((allFields: AdvancedConfigValueProps) => {
        let newValue: AdvancedConfigValueProps = {...advancedConfigValue, ...allFields}
        if (newValue.isGmTLS) {
            newValue.isHttps = true
        }
        if (newValue.randomJA3) {
            newValue.isHttps = true
        }
        onValuesChange({
            ...newValue
        })
    })
    /**
     * @description 切换折叠面板，缓存activeKey
     */
    const onSwitchCollapse = useMemoizedFn((key) => {
        setActiveKey(key)
        setRemoteValue(WEB_FUZZ_Advanced_Config_ActiveKey, JSON.stringify(key))
    })
    const onReset = useMemoizedFn((restValue) => {
        const v = form.getFieldsValue()
        onSetValue({
            ...v,
            ...restValue
        })
    })
    /**添加的额外操作，例如没有展开的时候点击添加需要展开该项 */
    const onAddExtra = useMemoizedFn((type: string) => {
        if (activeKey?.findIndex((ele) => ele === type) === -1) {
            onSwitchCollapse([...activeKey, type])
        }
    })

    const onAddMatchingAndExtractionCard = useMemoizedFn((type: MatchingAndExtraction) => {
        const keyMap = {
            matchers: "匹配器",
            extractors: "数据提取器"
        }
        if (activeKey?.findIndex((ele) => ele === keyMap[type]) === -1) {
            onSwitchCollapse([...activeKey, keyMap[type]])
        }
        if (outsideShowResponseMatcherAndExtraction) {
            if (onShowResponseMatcherAndExtraction)
                onShowResponseMatcherAndExtraction({
                    activeType: type,
                    activeKey: "ID:0",
                    order: 0
                })
        } else {
            setType(type)
            setVisibleDrawer(true)
        }
    })

    const onOpenMatchingAndExtractionCardEvent = useMemoizedFn((pageId: string) => {
        if (pageId === id) {
            onAddMatchingAndExtractionCard("matchers")
        }
    })

    useEffect(() => {
        emiter.on("onOpenMatchingAndExtractionCard", onOpenMatchingAndExtractionCardEvent)
        return () => {
            emiter.off("onOpenMatchingAndExtractionCard", onOpenMatchingAndExtractionCardEvent)
        }
    }, [])

    /**修改提取器 */
    const onEditExtractors = useMemoizedFn((index, type: MatchingAndExtraction) => {
        onEditMatchersAndExtractors({
            order: 0,
            subIndex: index,
            type
        })
    })
    /**修改匹配器 */
    const onEditMatchers = useMemoizedFn((params: MatchersPanelEditProps) => {
        const {order, subIndex, type} = params
        onEditMatchersAndExtractors({
            order,
            subIndex,
            type
        })
    })
    const onEditMatchersAndExtractors = useMemoizedFn((params: MatchersPanelEditProps) => {
        const {order, subIndex, type} = params
        if (outsideShowResponseMatcherAndExtraction) {
            if (onShowResponseMatcherAndExtraction)
                onShowResponseMatcherAndExtraction({
                    activeType: "matchers",
                    activeKey: `ID:${subIndex}`,
                    order
                })
        } else {
            setVisibleDrawer(true)
            setType(type)
            switch (type) {
                case "extractors":
                    setDefActiveKey(`ID:${subIndex}`)
                    break
                case "matchers":
                    setDefActiveKeyAndOrder({
                        order,
                        defActiveKey: `ID:${subIndex}`
                    })
                    break
                default:
                    break
            }
        }
    })
    const retryActive: string[] = useMemo(() => {
        let newRetryActive = ["重试条件"]
        if (retry) {
            newRetryActive = [...newRetryActive, "重试条件"]
        } else {
            newRetryActive = newRetryActive.filter((ele) => ele !== "重试条件")
        }
        if (noRetry) {
            newRetryActive = [...newRetryActive, "不重试条件"]
        } else {
            newRetryActive = newRetryActive.filter((ele) => ele !== "不重试条件")
        }
        return newRetryActive
    }, [retry, noRetry])

    const getTextWidth = (text: string) => {
        const tempElement = document.createElement("span")
        tempElement.style.cssText = `
            display: inline-block;
            font-size: 11px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
        `
        tempElement.textContent = text
        document.body.appendChild(tempElement)
        const width = tempElement.clientWidth
        document.body.removeChild(tempElement)
        return width
    }
    const onClose = useMemoizedFn(() => {
        setVisibleDrawer(false)
    })
    const onSave = useMemoizedFn((matcher, extractor, isApply = false) => {
        const v = form.getFieldsValue()
        onSetValue({
            ...v,
            matchers: matcher.matchersList || [],
            extractors: extractor.extractorList || []
        })
        if (isApply) {
            setTimeout(() => {
                matchSubmitFun()
            }, 500)
        }
    })

    const onApply = useMemoizedFn(()=>{
        if(!cachedTotal){
            yakitNotify("warning", `请发送多个请求包后再应用`)
            return;
        }
        matchSubmitFun()
    })

    const [agentConfigModalVisible, setAgentConfigModalVisible] = useState<boolean>(false)

    const methodGetRef = useRef<any>()
    const methodPostRef = useRef<any>()
    const headersRef = useRef<any>()
    const cookieRef = useRef<any>()
    // 添加
    const handleVariableAdd = (
        e: React.MouseEvent<HTMLElement, MouseEvent>,
        field: fields,
        actKey: string,
        val: object,
        ref: React.MutableRefObject<any>
    ) => {
        e.stopPropagation()
        const v = form.getFieldsValue()
        const variables = v[field] || []
        const index = variables.findIndex((ele: {Key: string; Value: string}) => !ele || (!ele.Key && !ele.Value))
        if (index === -1) {
            form.setFieldsValue({
                [field]: [...variables, {...val}]
            })
            onSetValue({
                ...v,
                [field]: [...variables, {...val}]
            })
            if (ref.current) {
                ref.current.setVariableActiveKey([
                    ...(ref.current.variableActiveKey || []),
                    `${variables?.length || 0}`
                ])
            }
        } else {
            yakitFailed(t("HttpQueryAdvancedConfig.open_matcher_extraction_error", {index: index}))
        }
        if (activeKey?.findIndex((ele) => ele === actKey) === -1) {
            setActiveKey([...activeKey, actKey])
        }
    }
    // 删除
    const handleVariableDel = (i: number, field: fields) => {
        const v = form.getFieldsValue()
        const variables = v[field] || []
        variables.splice(i, 1)
        form.setFieldsValue({
            [field]: [...variables]
        })
        onSetValue({
            ...v,
            [field]: [...variables]
        })
    }
    // 重置
    const handleVariableReset = useMemoizedFn(
        (
            e: React.MouseEvent<HTMLElement, MouseEvent>,
            field: fields,
            val: object,
            ref: React.MutableRefObject<any>
        ) => {
            e.stopPropagation()
            onReset({
                [field]: [{...val}]
            })
            if (ref.current) {
                ref.current.setVariableActiveKey(["0"])
            }
        }
    )

    const renderContent = useMemoizedFn(() => {
        switch (showFormContentType) {
            case "config":
                return (
                    <>
                        <div className={styles["advanced-config-extra-formItem"]}>
                            <Form.Item
                                label={t("HttpQueryAdvancedConfig.force_https")}
                                name='isHttps'
                                valuePropName='checked'
                            >
                                <YakitSwitch />
                            </Form.Item>
                            <Form.Item label={t("HttpQueryAdvancedConfig.tls_config")}>
                                <div style={{display: "flex"}}>
                                    <Form.Item name='isGmTLS' style={{marginBottom: 0}}>
                                        <YakitCheckableTag
                                            checked={isGmTLS}
                                            onChange={(checked) => {
                                                const v = form.getFieldsValue()
                                                onSetValue({
                                                    ...v,
                                                    isGmTLS: checked
                                                })
                                            }}
                                        >
                                            {t("HttpQueryAdvancedConfig.guomi_tls")}
                                        </YakitCheckableTag>
                                    </Form.Item>
                                    <Form.Item name='randomJA3' style={{marginBottom: 0}}>
                                        <YakitCheckableTag
                                            checked={randomJA3}
                                            onChange={(checked) => {
                                                const v = form.getFieldsValue()
                                                onSetValue({
                                                    ...v,
                                                    randomJA3: checked
                                                })
                                            }}
                                        >
                                            {t("HttpQueryAdvancedConfig.random_tls")}
                                        </YakitCheckableTag>
                                    </Form.Item>
                                </div>
                            </Form.Item>
                            <Form.Item
                                label={
                                    <span className={styles["advanced-config-form-label"]}>
                                        {t("HttpQueryAdvancedConfig.real_host")}
                                        <Tooltip
                                            title={t("HttpQueryAdvancedConfig.host_collision_tip")}
                                            overlayStyle={{width: 150}}
                                        >
                                            <InformationCircleIcon className={styles["info-icon"]} />
                                        </Tooltip>
                                    </span>
                                }
                                name='actualHost'
                            >
                                <YakitInput placeholder={t("YakitInput.please_enter")} size='small' allowClear />
                            </Form.Item>
                            <Form.Item
                                label={
                                    <span className={styles["advanced-config-form-label"]}>
                                        {t("HttpQueryAdvancedConfig.set_proxy")}
                                        <Tooltip
                                            title={t("HttpQueryAdvancedConfig.multi_proxy_tip")}
                                            overlayStyle={{width: 150}}
                                        >
                                            <InformationCircleIcon className={styles["info-icon"]} />
                                        </Tooltip>
                                    </span>
                                }
                                name='proxy'
                                style={{marginBottom: 5}}
                            >
                                <YakitSelect
                                    ref={proxyListRef}
                                    cacheHistoryDataKey={CacheDropDownGV.WebFuzzerProxyList}
                                    isCacheDefaultValue={false}
                                    defaultOptions={[
                                        {
                                            label: "http://127.0.0.1:7890",
                                            value: "http://127.0.0.1:7890"
                                        },
                                        {
                                            label: "http://127.0.0.1:8080",
                                            value: "http://127.0.0.1:8080"
                                        },
                                        {
                                            label: "http://127.0.0.1:8082",
                                            value: "http://127.0.0.1:8082"
                                        }
                                    ]}
                                    allowClear
                                    placeholder={t("YakitInput.please_enter")}
                                    mode='tags'
                                    size='small'
                                    maxTagCount={1}
                                    dropdownMatchSelectWidth={245}
                                    tagRender={(props) => {
                                        return (
                                            <YakitTag size={"middle"} {...props}>
                                                <span className='content-ellipsis' style={{width: "100%"}}>
                                                    {maskProxyPassword(props.value)}
                                                </span>
                                            </YakitTag>
                                        )
                                    }}
                                />
                            </Form.Item>
                            <Form.Item label={<> </>}>
                                <YakitButton
                                    size='small'
                                    type='text'
                                    onClick={() => setAgentConfigModalVisible(true)}
                                    icon={<PlusSmIcon />}
                                >
                                    {t("HttpQueryAdvancedConfig.proxy_auth_config")}
                                </YakitButton>
                            </Form.Item>
                            <Form.Item
                                label={t("HttpQueryAdvancedConfig.disable_system_proxy")}
                                name={"noSystemProxy"}
                                valuePropName='checked'
                            >
                                <YakitSwitch />
                            </Form.Item>
                            <Form.Item
                                label={
                                    <span className={styles["advanced-config-form-label"]}>
                                        {t("HttpQueryAdvancedConfig.frontend_render_count")}
                                        <Tooltip
                                            title={t("HttpQueryAdvancedConfig.frontend_render_tip")}
                                            overlayStyle={{width: 150}}
                                        >
                                            <InformationCircleIcon className={styles["info-icon"]} />
                                        </Tooltip>
                                    </span>
                                }
                                name='resNumlimit'
                                style={{marginBottom: 12}}
                            >
                                <YakitInputNumber
                                    type='horizontal'
                                    size='small'
                                    min={1}
                                    max={50000}
                                    disabled={!isbuttonIsSendReqStatus}
                                />
                            </Form.Item>
                            <Form.Item
                                label={t("HttpQueryAdvancedConfig.response_body_limit")}
                                name='maxBodySize'
                                style={{marginBottom: 12}}
                                normalize={(value) => {
                                    return value.replace(/\D/g, "")
                                }}
                            >
                                <YakitInput suffix='M' size='small' className={styles["fuzzer-maxBodySize-input"]} />
                            </Form.Item>
                            <Form.Item
                                label={
                                    <span className={styles["advanced-config-form-label"]}>
                                        {t("HttpQueryAdvancedConfig.sni_config")}
                                    </span>
                                }
                                name='overwriteSNI'
                            >
                                <YakitRadioButtons
                                    buttonStyle='solid'
                                    options={overwriteSNIOptions(t)}
                                    size={"small"}
                                    onChange={(e) => {
                                        if (e.target.value !== "mandatory") {
                                            onReset({
                                                sNI: ""
                                            })
                                        }
                                    }}
                                />
                            </Form.Item>
                            {overwriteSNI === "mandatory" && (
                                <Form.Item
                                    label={
                                        <span className={styles["advanced-config-form-label"]}>
                                            {t("HttpQueryAdvancedConfig.force_sni")}
                                        </span>
                                    }
                                    name='sNI'
                                >
                                    <YakitInput size='small' />
                                </Form.Item>
                            )}
                        </div>
                        <YakitCollapse
                            activeKey={activeKey}
                            onChange={(key) => onSwitchCollapse(key)}
                            destroyInactivePanel={true}
                        >
                            <YakitPanel
                                header={t("HttpQueryAdvancedConfig.request_config")}
                                key='请求包配置'
                                extra={
                                    <YakitButton
                                        type='text'
                                        colors='danger'
                                        className={styles["btn-padding-right-0"]}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            const restValue = {
                                                fuzzTagMode: "standard",
                                                fuzzTagSyncIndex: false,
                                                isHttps: false,
                                                noFixContentLength: false,
                                                actualHost: "",
                                                dialTimeoutSeconds: 10,
                                                timeout: 30,
                                                batchTarget: new Uint8Array(),
                                                disableHotPatch: false,
                                                enableRandomChunked: false,
                                                randomChunkedMinLength:
                                                    defaultAdvancedConfigValue.randomChunkedMinLength,
                                                randomChunkedMaxLength:
                                                    defaultAdvancedConfigValue.randomChunkedMaxLength,
                                                randomChunkedMinDelay: defaultAdvancedConfigValue.randomChunkedMinDelay,
                                                randomChunkedMaxDelay: defaultAdvancedConfigValue.randomChunkedMaxDelay
                                            }
                                            onReset(restValue)
                                        }}
                                        size='small'
                                    >
                                        {t("YakitButton.reset")}
                                    </YakitButton>
                                }
                            >
                                <Form.Item label={t("HttpQueryAdvancedConfig.fuzztag_helper")}>
                                    <YakitButton
                                        size='small'
                                        type='outline1'
                                        onClick={() => onInsertYakFuzzer()}
                                        icon={<PlusSmIcon />}
                                    >
                                        {t("HttpQueryAdvancedConfig.insert_yak_fuzz")}
                                    </YakitButton>
                                </Form.Item>
                                <Form.Item
                                    label={
                                        <span className={styles["advanced-config-form-label"]}>
                                            {t("HttpQueryAdvancedConfig.render_fuzz")}
                                            <Tooltip
                                                title={t("HttpQueryAdvancedConfig.compat_mode_tip")}
                                                overlayStyle={{width: 150}}
                                            >
                                                <InformationCircleIcon className={styles["info-icon"]} />
                                            </Tooltip>
                                        </span>
                                    }
                                    name='fuzzTagMode'
                                >
                                    <YakitRadioButtons
                                        buttonStyle='solid'
                                        options={fuzzTagModeOptions(t)}
                                        size={"small"}
                                    />
                                </Form.Item>

                                <Form.Item label={t("HttpQueryAdvancedConfig.render_mode")} name='fuzzTagSyncIndex'>
                                    <YakitRadioButtons
                                        buttonStyle='solid'
                                        options={fuzzTagSyncOptions(t)}
                                        size={"small"}
                                    />
                                </Form.Item>

                                <Form.Item
                                    label={t("HttpQueryAdvancedConfig.disable_hot_reload")}
                                    name={"disableHotPatch"}
                                    valuePropName='checked'
                                >
                                    <YakitSwitch />
                                </Form.Item>

                                <Form.Item
                                    label={t("HttpQueryAdvancedConfig.no_fix_length")}
                                    name='noFixContentLength'
                                    valuePropName='checked'
                                >
                                    <YakitSwitch />
                                </Form.Item>

                                <Form.Item label={t("HttpQueryAdvancedConfig.timeout_duration")}>
                                    <div className={styles["advanced-config-timeout"]}>
                                        <Form.Item
                                            name='dialTimeoutSeconds'
                                            noStyle
                                            normalize={(value) => {
                                                return value.replace(/\D/g, "")
                                            }}
                                        >
                                            <YakitInput
                                                allowClear={false}
                                                prefix={t("HttpQueryAdvancedConfig.connection")}
                                                suffix='s'
                                                size='small'
                                                className={styles["input-left"]}
                                            />
                                        </Form.Item>
                                        <Form.Item
                                            name='timeout'
                                            noStyle
                                            normalize={(value) => {
                                                return value.replace(/\D/g, "")
                                            }}
                                        >
                                            <YakitInput
                                                allowClear={false}
                                                prefix={t("HttpQueryAdvancedConfig.response")}
                                                suffix='s'
                                                size='small'
                                                className={styles["input-right"]}
                                            />
                                        </Form.Item>
                                    </div>
                                </Form.Item>
                                <Form.Item label={t("HttpQueryAdvancedConfig.batch_target")} name='batchTarget'>
                                    <YakitButton
                                        style={{marginTop: 3}}
                                        size='small'
                                        type='text'
                                        onClick={() => setBatchTargetModalVisible(true)}
                                        icon={
                                            JSON.stringify(advancedConfigValue.batchTarget) !== "{}" ? (
                                                Uint8ArrayToString(
                                                    advancedConfigValue.batchTarget || new Uint8Array()
                                                ) ? (
                                                    <OutlineBadgecheckIcon style={{color: "#56C991"}} />
                                                ) : (
                                                    <PlusSmIcon />
                                                )
                                            ) : (
                                                <PlusSmIcon />
                                            )
                                        }
                                    >
                                        {JSON.stringify(advancedConfigValue.batchTarget) !== "{}" ? (
                                            Uint8ArrayToString(advancedConfigValue.batchTarget || new Uint8Array()) ? (
                                                <div style={{color: "#56C991"}}>
                                                    {t("HttpQueryAdvancedConfig.configured")}
                                                </div>
                                            ) : (
                                                t("HttpQueryAdvancedConfig.configure_batch_target")
                                            )
                                        ) : (
                                            t("HttpQueryAdvancedConfig.configure_batch_target")
                                        )}
                                    </YakitButton>
                                </Form.Item>
                                <Form.Item
                                    label={t("HttpQueryAdvancedConfig.random_chunk_transfer")}
                                    name='enableRandomChunked'
                                    valuePropName='checked'
                                    style={{marginBottom: enableRandomChunked ? 12 : 0}}
                                >
                                    <YakitSwitch />
                                </Form.Item>
                                {enableRandomChunked && (
                                    <>
                                        <Form.Item label={t("HttpQueryAdvancedConfig.chunk_length")}>
                                            <div className={styles["advanced-config-random-chunked-length"]}>
                                                <Form.Item
                                                    name='randomChunkedMinLength'
                                                    noStyle
                                                    normalize={(value) => {
                                                        return value.replace(/\D/g, "")
                                                    }}
                                                >
                                                    <YakitInput
                                                        allowClear={false}
                                                        prefix='Min'
                                                        suffix='B'
                                                        size='small'
                                                        className={styles["input-left"]}
                                                    />
                                                </Form.Item>
                                                <Form.Item
                                                    name='randomChunkedMaxLength'
                                                    noStyle
                                                    normalize={(value) => {
                                                        return value.replace(/\D/g, "")
                                                    }}
                                                >
                                                    <YakitInput
                                                        allowClear={false}
                                                        prefix='Max'
                                                        suffix='B'
                                                        size='small'
                                                        className={styles["input-right"]}
                                                    />
                                                </Form.Item>
                                            </div>
                                        </Form.Item>
                                        <Form.Item
                                            label={t("HttpQueryAdvancedConfig.random_delay")}
                                            style={{marginBottom: 0}}
                                        >
                                            <div className={styles["advanced-config-random-chunked-delay"]}>
                                                <Form.Item
                                                    name='randomChunkedMinDelay'
                                                    noStyle
                                                    normalize={(value) => {
                                                        return value.replace(/\D/g, "")
                                                    }}
                                                >
                                                    <YakitInput
                                                        allowClear={false}
                                                        prefix='Min'
                                                        suffix='ms'
                                                        size='small'
                                                        className={styles["input-left"]}
                                                    />
                                                </Form.Item>
                                                <Form.Item
                                                    name='randomChunkedMaxDelay'
                                                    noStyle
                                                    normalize={(value) => {
                                                        return value.replace(/\D/g, "")
                                                    }}
                                                >
                                                    <YakitInput
                                                        allowClear={false}
                                                        prefix='Max'
                                                        suffix='ms'
                                                        size='small'
                                                        className={styles["input-right"]}
                                                    />
                                                </Form.Item>
                                            </div>
                                        </Form.Item>
                                    </>
                                )}
                            </YakitPanel>
                            <YakitPanel
                                header={t("HttpQueryAdvancedConfig.concurrency_config")}
                                key='发包配置'
                                extra={
                                    <YakitButton
                                        type='text'
                                        colors='danger'
                                        className={styles["btn-padding-right-0"]}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            const restValue = {
                                                concurrent: DefFuzzerConcurrent,
                                                minDelaySeconds: undefined,
                                                maxDelaySeconds: undefined,
                                                repeatTimes: 0,
                                                disableUseConnPool: false
                                            }
                                            onReset(restValue)
                                        }}
                                        size='small'
                                    >
                                        {t("YakitButton.reset")}
                                    </YakitButton>
                                }
                            >
                                <Form.Item
                                    label={t("HttpQueryAdvancedConfig.disable_connection_pool")}
                                    name={"disableUseConnPool"}
                                    valuePropName='checked'
                                >
                                    <YakitSwitch />
                                </Form.Item>
                                <Form.Item
                                    label={t("HttpQueryAdvancedConfig.repeat_send")}
                                    name='repeatTimes'
                                    help={t("HttpQueryAdvancedConfig.concurrency_test_tip")}
                                >
                                    <YakitInputNumber type='horizontal' size='small' />
                                </Form.Item>
                                <Form.Item label={t("HttpQueryAdvancedConfig.concurrent_threads")} name='concurrent'>
                                    <YakitInputNumber type='horizontal' size='small' />
                                </Form.Item>

                                <Form.Item label={t("HttpQueryAdvancedConfig.random_delay2")} style={{marginBottom: 0}}>
                                    <div className={styles["advanced-config-delay"]}>
                                        <Form.Item
                                            name='minDelaySeconds'
                                            noStyle
                                            normalize={(value) => {
                                                return value.replace(/\D/g, "")
                                            }}
                                        >
                                            <YakitInput
                                                allowClear={false}
                                                prefix='Min'
                                                suffix='s'
                                                size='small'
                                                className={styles["input-left"]}
                                            />
                                        </Form.Item>
                                        <Form.Item
                                            name='maxDelaySeconds'
                                            noStyle
                                            normalize={(value) => {
                                                return value.replace(/\D/g, "")
                                            }}
                                        >
                                            <YakitInput
                                                allowClear={false}
                                                prefix='Max'
                                                suffix='s'
                                                size='small'
                                                className={styles["input-right"]}
                                            />
                                        </Form.Item>
                                    </div>
                                </Form.Item>
                            </YakitPanel>
                            <YakitPanel
                                header={t("HttpQueryAdvancedConfig.retry_config")}
                                key='重试配置'
                                extra={
                                    <YakitButton
                                        type='text'
                                        colors='danger'
                                        className={styles["btn-padding-right-0"]}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            const restValue = {
                                                maxRetryTimes: 3,
                                                retrying: true,
                                                noRetrying: false,
                                                retryConfiguration: {
                                                    statusCode: undefined,
                                                    keyWord: undefined
                                                },
                                                noRetryConfiguration: {
                                                    statusCode: undefined,
                                                    keyWord: undefined
                                                }
                                            }
                                            onReset(restValue)
                                        }}
                                        size='small'
                                    >
                                        {t("YakitButton.reset")}
                                    </YakitButton>
                                }
                            >
                                <Form.Item label={t("HttpQueryAdvancedConfig.retry_count")} name='maxRetryTimes'>
                                    <YakitInputNumber type='horizontal' size='small' min={0} />
                                </Form.Item>
                                <YakitCollapse activeKey={retryActive} destroyInactivePanel={true}>
                                    <YakitPanel
                                        header={
                                            <Form.Item name='retry' noStyle valuePropName='checked'>
                                                <YakitCheckbox>
                                                    <span style={{marginLeft: 6, cursor: "pointer"}}>
                                                        {t("HttpQueryAdvancedConfig.retry_conditions")}
                                                    </span>
                                                </YakitCheckbox>
                                            </Form.Item>
                                        }
                                        key='重试条件'
                                        className={styles["advanced-config-collapse-secondary-item"]}
                                    >
                                        <Form.Item
                                            label={t("HttpQueryAdvancedConfig.status_code")}
                                            name={["retryConfiguration", "statusCode"]}
                                        >
                                            <YakitInput placeholder='200,300-399' size='small' disabled={!retry} />
                                        </Form.Item>
                                    </YakitPanel>
                                    <YakitPanel
                                        header={
                                            <Form.Item name='noRetry' noStyle valuePropName='checked'>
                                                <YakitCheckbox>
                                                    <span style={{marginLeft: 6, cursor: "pointer"}}>
                                                        {t("HttpQueryAdvancedConfig.no_retry_conditions")}
                                                    </span>
                                                </YakitCheckbox>
                                            </Form.Item>
                                        }
                                        key='不重试条件'
                                        className={styles["advanced-config-collapse-secondary-item"]}
                                    >
                                        <Form.Item
                                            label={t("HttpQueryAdvancedConfig.status_code")}
                                            name={["noRetryConfiguration", "statusCode"]}
                                            style={{marginBottom: 0}}
                                        >
                                            <YakitInput placeholder='200,300-399' size='small' disabled={!noRetry} />
                                        </Form.Item>
                                    </YakitPanel>
                                </YakitCollapse>
                            </YakitPanel>
                            <YakitPanel
                                header={t("HttpQueryAdvancedConfig.redirect_config")}
                                key='重定向配置'
                                extra={
                                    <YakitButton
                                        type='text'
                                        colors='danger'
                                        className={styles["btn-padding-right-0"]}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            const restValue = {
                                                redirectCount: 3,
                                                noFollowRedirect: true,
                                                followJSRedirect: false
                                            }
                                            onReset(restValue)
                                        }}
                                        size='small'
                                    >
                                        {t("YakitButton.reset")}
                                    </YakitButton>
                                }
                            >
                                <Form.Item
                                    label={t("HttpQueryAdvancedConfig.disable_redirect")}
                                    name='noFollowRedirect'
                                    valuePropName={"checked"}
                                >
                                    <YakitSwitch />
                                </Form.Item>
                                <Form.Item label={t("HttpQueryAdvancedConfig.redirect_count")} name='redirectCount'>
                                    <YakitInputNumber type='horizontal' size='small' />
                                </Form.Item>
                                <Form.Item
                                    label={t("HttpQueryAdvancedConfig.js_redirect")}
                                    name='followJSRedirect'
                                    valuePropName={"checked"}
                                    style={{marginBottom: 0}}
                                >
                                    <YakitSwitch />
                                </Form.Item>
                            </YakitPanel>
                            <YakitPanel
                                header={t("HttpQueryAdvancedConfig.dns_config")}
                                key={"DNS配置"}
                                extra={
                                    <YakitButton
                                        type='text'
                                        colors='danger'
                                        className={styles["btn-padding-right-0"]}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            const restValue = {
                                                dnsServers: [],
                                                etcHosts: []
                                            }
                                            onReset(restValue)
                                        }}
                                        size='small'
                                    >
                                        {t("YakitButton.reset")}
                                    </YakitButton>
                                }
                            >
                                <Form.Item label={t("HttpQueryAdvancedConfig.dns_server")} name='dnsServers'>
                                    <YakitSelect
                                        allowClear
                                        options={["8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1"].map((i) => {
                                            return {value: i, label: i}
                                        })}
                                        mode='tags'
                                        size={"small"}
                                        placeholder={t("HttpQueryAdvancedConfig.specify_dns_server")}
                                    />
                                </Form.Item>
                                <Form.Item
                                    label={t("HttpQueryAdvancedConfig.hosts_config")}
                                    name='etcHosts'
                                    style={{marginBottom: 0}}
                                >
                                    <Space direction={"vertical"}>
                                        {(etcHosts || []).map((i, n) => (
                                            <Tooltip
                                                title={
                                                    getTextWidth(`${i.Key} => ${i.Value}`) >= 123
                                                        ? `${i.Key} => ${i.Value}`
                                                        : ""
                                                }
                                                key={`${i.Key} => ${i.Value}`}
                                            >
                                                <YakitTag
                                                    closable={true}
                                                    onClose={() => {
                                                        const newEtcHosts = etcHosts.filter((j) => j.Key !== i.Key)
                                                        const v = form.getFieldsValue()
                                                        onSetValue({
                                                            ...v,
                                                            etcHosts: newEtcHosts
                                                        })
                                                    }}
                                                    key={`${i.Key}-${n}`}
                                                >
                                                    <div
                                                        className={styles.etcHostsText}
                                                    >{`${i.Key} => ${i.Value}`}</div>
                                                </YakitTag>
                                            </Tooltip>
                                        ))}
                                        <YakitButton
                                            onClick={() => {
                                                inputHTTPFuzzerHostConfigItem((obj) => {
                                                    const newEtcHosts = [
                                                        ...etcHosts.filter((i) => i.Key !== obj.Key),
                                                        obj
                                                    ]
                                                    const v = form.getFieldsValue()
                                                    onSetValue({
                                                        ...v,
                                                        etcHosts: newEtcHosts
                                                    })
                                                })
                                            }}
                                        >
                                            {t("HttpQueryAdvancedConfig.add_hosts_mapping")}
                                        </YakitButton>
                                    </Space>
                                </Form.Item>
                            </YakitPanel>
                        </YakitCollapse>
                    </>
                )
            case "rule":
                return (
                    <>
                        <YakitCollapse
                            activeKey={activeKey}
                            onChange={(key) => onSwitchCollapse(key)}
                            destroyInactivePanel={true}
                            className={styles["rule-collapse"]}
                        >
                            <MatchersPanel
                                key='匹配器'
                                onAddMatchingAndExtractionCard={onAddMatchingAndExtractionCard}
                                onEdit={onEditMatchers}
                                onSetValue={onSetValue}
                                onApply={onApply}
                            />
                            <ExtractorsPanel
                                key='数据提取器'
                                onAddMatchingAndExtractionCard={onAddMatchingAndExtractionCard}
                                onEdit={onEditExtractors}
                                onSetValue={onSetValue}
                                onApply={onApply}
                            />
                            <VariablePanel
                                key='设置变量'
                                defaultHttpResponse={defaultHttpResponse}
                                onAdd={onAddExtra}
                                pageId={id}
                                onSetValue={onSetValue}
                            />
                            <YakitPanel
                                header={t("HttpQueryAdvancedConfig.get_params")}
                                key='GET 参数'
                                extra={
                                    <>
                                        <YakitButton
                                            type='text'
                                            colors='danger'
                                            onClick={(e) =>
                                                handleVariableReset(e, "methodGet", {Key: "", Value: ""}, methodGetRef)
                                            }
                                            size='small'
                                        >
                                            {t("YakitButton.reset")}
                                        </YakitButton>
                                        <Divider type='vertical' style={{margin: 0}} />
                                        <Divider type='vertical' style={{margin: 0}} />
                                        <YakitButton
                                            type='text'
                                            onClick={(e) =>
                                                handleVariableAdd(
                                                    e,
                                                    "methodGet",
                                                    "GET 参数",
                                                    {Key: "", Value: ""},
                                                    methodGetRef
                                                )
                                            }
                                            className={styles["btn-padding-right-0"]}
                                            size='small'
                                        >
                                            {t("YakitButton.add")}
                                            <PlusIcon />
                                        </YakitButton>
                                    </>
                                }
                            >
                                <VariableList
                                    ref={methodGetRef}
                                    field='methodGet'
                                    onDel={(i) => handleVariableDel(i, "methodGet")}
                                ></VariableList>
                            </YakitPanel>
                            <YakitPanel
                                header={t("HttpQueryAdvancedConfig.post_params")}
                                key='POST 参数'
                                extra={
                                    <>
                                        <YakitButton
                                            type='text'
                                            colors='danger'
                                            onClick={(e) =>
                                                handleVariableReset(
                                                    e,
                                                    "methodPost",
                                                    {Key: "", Value: ""},
                                                    methodPostRef
                                                )
                                            }
                                            size='small'
                                        >
                                            {t("YakitButton.reset")}
                                        </YakitButton>
                                        <Divider type='vertical' style={{margin: 0}} />
                                        <Divider type='vertical' style={{margin: 0}} />
                                        <YakitButton
                                            type='text'
                                            onClick={(e) =>
                                                handleVariableAdd(
                                                    e,
                                                    "methodPost",
                                                    "POST 参数",
                                                    {Key: "", Value: ""},
                                                    methodPostRef
                                                )
                                            }
                                            className={styles["btn-padding-right-0"]}
                                            size='small'
                                        >
                                            {t("YakitButton.add")}
                                            <PlusIcon />
                                        </YakitButton>
                                    </>
                                }
                            >
                                <VariableList
                                    ref={methodPostRef}
                                    field='methodPost'
                                    onDel={(i) => handleVariableDel(i, "methodPost")}
                                ></VariableList>
                            </YakitPanel>
                            <YakitPanel
                                header='Cookie'
                                key='Cookie'
                                extra={
                                    <>
                                        <YakitButton
                                            type='text'
                                            colors='danger'
                                            onClick={(e) =>
                                                handleVariableReset(e, "cookie", {Key: "", Value: ""}, cookieRef)
                                            }
                                            size='small'
                                        >
                                            {t("YakitButton.reset")}
                                        </YakitButton>
                                        <Divider type='vertical' style={{margin: 0}} />
                                        <Divider type='vertical' style={{margin: 0}} />
                                        <YakitButton
                                            type='text'
                                            onClick={(e) =>
                                                handleVariableAdd(
                                                    e,
                                                    "cookie",
                                                    "Cookie",
                                                    {Key: "", Value: ""},
                                                    cookieRef
                                                )
                                            }
                                            className={styles["btn-padding-right-0"]}
                                            size='small'
                                        >
                                            {t("YakitButton.add")}
                                            <PlusIcon />
                                        </YakitButton>
                                    </>
                                }
                            >
                                <VariableList
                                    ref={cookieRef}
                                    field='cookie'
                                    onDel={(i) => handleVariableDel(i, "cookie")}
                                ></VariableList>
                            </YakitPanel>
                            <YakitPanel
                                header='Header'
                                key='Header'
                                extra={
                                    <>
                                        <YakitButton
                                            type='text'
                                            colors='danger'
                                            onClick={(e) =>
                                                handleVariableReset(e, "headers", {Key: "", Value: ""}, headersRef)
                                            }
                                            size='small'
                                        >
                                            {t("YakitButton.reset")}
                                        </YakitButton>
                                        <Divider type='vertical' style={{margin: 0}} />
                                        <Divider type='vertical' style={{margin: 0}} />
                                        <YakitButton
                                            type='text'
                                            onClick={(e) =>
                                                handleVariableAdd(
                                                    e,
                                                    "headers",
                                                    "Header",
                                                    {Key: "", Value: ""},
                                                    headersRef
                                                )
                                            }
                                            className={styles["btn-padding-right-0"]}
                                            size='small'
                                        >
                                            {t("YakitButton.add")}
                                            <PlusIcon />
                                        </YakitButton>
                                    </>
                                }
                            >
                                <VariableList
                                    ref={headersRef}
                                    field='headers'
                                    onDel={(i) => handleVariableDel(i, "headers")}
                                ></VariableList>
                            </YakitPanel>
                        </YakitCollapse>
                    </>
                )
            default:
                return <></>
        }
    })
    return (
        <div
            className={classNames(styles["http-query-advanced-config"])}
            style={{
                display: visible ? "" : "none",
                width: i18n.language === "zh" ? 300 : 460,
                minWidth: i18n.language === "zh" ? 300 : 460,
                maxWidth: i18n.language === "zh" ? 300 : 460
            }}
            ref={queryRef}
        >
            <Form
                form={form}
                colon={false}
                onValuesChange={(changedFields, allFields) => {
                    onSetValue(allFields)
                }}
                size='small'
                labelCol={{span: 10}}
                wrapperCol={{span: 14}}
                style={{overflowY: "auto"}}
                initialValues={{
                    ...advancedConfigValue
                }}
            >
                {renderContent()}
                <div className={styles["to-end"]}>{t("YakitEmpty.end_of_list")}</div>
            </Form>
            <MatcherAndExtractionDrawer
                visibleDrawer={visibleDrawer}
                defActiveType={type}
                httpResponse={httpResponse}
                httpRequest={webFuzzerValue}
                isHttps={advancedConfigValue.isHttps}
                defActiveKey={defActiveKey}
                defActiveKeyAndOrder={defActiveKeyAndOrder}
                matcherValue={{matchersList: matchersList || []}}
                extractorValue={{extractorList: extractorList || []}}
                onClose={onClose}
                onSave={onSave}
                hasApplyBtn={!!cachedTotal}
            />
            <AgentConfigModal
                agentConfigModalVisible={agentConfigModalVisible}
                onCloseModal={() => setAgentConfigModalVisible(false)}
                generateURL={(url) => {
                    const v = form.getFieldsValue()
                    const copyProxyArr = structuredClone(v.proxy)
                    copyProxyArr.push(url)
                    proxyListRef.current.onSetRemoteValues([...new Set(copyProxyArr)])
                    onSetValue({
                        ...v,
                        proxy: [...new Set(copyProxyArr)]
                    })
                }}
            ></AgentConfigModal>
            <BatchTargetModal
                batchTargetModalVisible={batchTargetModalVisible}
                onCloseModal={() => setBatchTargetModalVisible(false)}
                batchTarget={batchTarget}
                getBatchTarget={(batchTarget) => {
                    const v = form.getFieldsValue()
                    onSetValue({
                        ...v,
                        batchTarget
                    })
                }}
            ></BatchTargetModal>
        </div>
    )
})

interface BatchTargetModalProp {
    batchTargetModalVisible: boolean
    onCloseModal: () => void
    batchTarget: Uint8Array
    getBatchTarget: (batchTarget: Uint8Array) => void
}

// 批量目标
const BatchTargetModal: React.FC<BatchTargetModalProp> = React.memo((props) => {
    const {batchTargetModalVisible, onCloseModal, batchTarget, getBatchTarget} = props
    const {t, i18n} = useI18nNamespaces(["yakitUi", "webFuzzer"])
    const [form] = Form.useForm()

    const onOKFun = useMemoizedFn(async () => {
        form.validateFields().then((values) => {
            getBatchTarget(StringToUint8Array(values.BatchTarget) || new Uint8Array())
            onCloseModal()
        })
    })

    const onClose = useMemoizedFn(() => {
        form.resetFields()
        onCloseModal()
    })

    return (
        <YakitModal
            visible={batchTargetModalVisible}
            title={t("BatchTargetModal.configure_batch_target")}
            width={600}
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
                    style={{height: "100%"}}
                    initialValues={{
                        BatchTarget: JSON.stringify(batchTarget) === "{}" ? "" : Uint8ArrayToString(batchTarget)
                    }}
                >
                    <YakitFormDraggerContent
                        style={{width: "100%"}}
                        formItemProps={{
                            name: "BatchTarget",
                            label: t("BatchTargetModal.scan_target"),
                            rules: [{required: false}]
                        }}
                        accept='.txt,.xlsx,.xls,.csv'
                        textareaProps={{
                            placeholder: t("BatchTargetModal.please_enter_scan_target"),
                            rows: 3
                        }}
                        help={t("YakitDraggerContent.drag_files_tip")}
                        valueSeparator={"\r\n"}
                    />
                </Form>
            </div>
        </YakitModal>
    )
})

interface SetVariableItemProps {
    name: number
}

export const SetVariableItem: React.FC<SetVariableItemProps> = React.memo((props) => {
    const {name} = props
    const {t, i18n} = useI18nNamespaces(["webFuzzer"])

    return (
        <div className={styles["variable-item"]}>
            <Form.Item name={[name, "Key"]} noStyle wrapperCol={{span: 24}}>
                <input placeholder={t("SetVariableItem.variableName")} className={styles["variable-item-input"]} />
            </Form.Item>

            <div className={styles["variable-item-textarea-body"]}>
                <Form.Item name={[name, "Value"]} noStyle wrapperCol={{span: 24}}>
                    <AutoTextarea
                        className={styles["variable-item-textarea"]}
                        placeholder={t("SetVariableItem.variableValue")}
                    />
                </Form.Item>
                <ResizerIcon className={styles["resizer-icon"]} />
            </div>
        </div>
    )
})

interface MatchersListProps {
    matcherValue: MatcherValueProps
    onAdd: () => void
    onRemove: (index: number, subIndex: number) => void
    onEdit: (index: number, subIndex: number) => void
    onChangeMatcher: (params: {index: number; value: string; fileId: string}) => void
}
/**匹配器 */
export const MatchersList: React.FC<MatchersListProps> = React.memo((props) => {
    const {matcherValue, onAdd, onRemove, onEdit, onChangeMatcher} = props
    const {t, i18n} = useI18nNamespaces(["yakitUi", "webFuzzer"])
    const {matchersList} = matcherValue
    return (
        <>
            <Form.List name='matchers'>
                {() => (
                    <>
                        {matchersList.map((matcherItem, index) => (
                            <Form.Item noStyle key={`ID:${index}`}>
                                <div className={styles["matchers-item"]}>
                                    <div className={styles["matchers-heard"]}>
                                        <div className={styles["matchers-heard-left"]}>
                                            <YakitRadioButtons
                                                buttonStyle='solid'
                                                options={filterModeOptions(t)}
                                                size='small'
                                                value={matcherItem.filterMode}
                                                onChange={(e) => {
                                                    onChangeMatcher({
                                                        index,
                                                        value: e.target.value,
                                                        fileId: "filterMode"
                                                    })
                                                }}
                                            />
                                            {matcherItem.filterMode === "onlyMatch" && (
                                                <ColorSelect
                                                    size='small'
                                                    value={matcherItem.HitColor}
                                                    onChange={(value) => {
                                                        onChangeMatcher({
                                                            index,
                                                            value,
                                                            fileId: "HitColor"
                                                        })
                                                    }}
                                                />
                                            )}
                                        </div>
                                        <YakitRadioButtons
                                            buttonStyle='solid'
                                            options={matchersConditionOptions}
                                            size='small'
                                            value={matcherItem.SubMatcherCondition}
                                            onChange={(e) => {
                                                onChangeMatcher({
                                                    index,
                                                    value: e.target.value,
                                                    fileId: "SubMatcherCondition"
                                                })
                                            }}
                                        />
                                    </div>
                                    {matcherItem.SubMatchers.map((subItem, subIndex) => (
                                        <React.Fragment key={`ID:${subIndex}`}>
                                            <div className={styles["matchersList-item"]} key={`ID:${subIndex}`}>
                                                <div className={styles["matchersList-item-heard"]}>
                                                    <span className={styles["item-id"]}>ID&nbsp;{subIndex}</span>
                                                    <span className={styles["item-label"]}>
                                                        [
                                                        {
                                                            matcherTypeList(t).find(
                                                                (e) => e.value === subItem.MatcherType
                                                            )?.label
                                                        }
                                                        ]
                                                    </span>
                                                    <span className={styles["item-number"]}>
                                                        {subItem.Group?.length}
                                                    </span>
                                                </div>
                                                <MatchersAndExtractorsListItemOperate
                                                    onRemove={() => onRemove(index, subIndex)}
                                                    onEdit={() => onEdit(index, subIndex)}
                                                    popoverContent={
                                                        <MatcherItem
                                                            matcherItem={subItem}
                                                            onEdit={() => {}}
                                                            notEditable={true}
                                                            httpResponse=''
                                                        />
                                                    }
                                                />
                                            </div>
                                        </React.Fragment>
                                    ))}
                                </div>
                            </Form.Item>
                        ))}
                    </>
                )}
            </Form.List>
            {matchersList?.length === 0 && (
                <>
                    <YakitButton
                        type='outline2'
                        onClick={() => onAdd()}
                        icon={<PlusIcon />}
                        className={styles["plus-button-bolck"]}
                        block
                    >
                        {t("YakitButton.add")}
                    </YakitButton>
                </>
            )}
        </>
    )
})

interface ExtractorsListProps {
    extractorValue: ExtractorValueProps
    onAdd: () => void
    onRemove: (index: number) => void
    onEdit: (index: number) => void
}
/**数据提取器 */
export const ExtractorsList: React.FC<ExtractorsListProps> = React.memo((props) => {
    const {extractorValue, onAdd, onRemove, onEdit} = props
    const {t, i18n} = useI18nNamespaces(["yakitUi", "webFuzzer"])
    const {extractorList} = extractorValue
    return (
        <>
            <Form.List name='extractors'>
                {() => (
                    <>
                        {extractorList.map((extractorItem, index) => (
                            <Form.Item noStyle key={`${extractorItem.Name}-${index}`}>
                                <div className={styles["matchersList-item"]}>
                                    <div className={styles["matchersList-item-heard"]}>
                                        <span className={styles["item-id"]}>
                                            {extractorItem.Name || `data_${index}`}
                                        </span>
                                        <span className={styles["item-label"]}>
                                            [{extractorTypeList(t).find((e) => e.value === extractorItem.Type)?.label}]
                                        </span>
                                        <span className={styles["item-number"]}>{extractorItem.Groups?.length}</span>
                                    </div>
                                    <MatchersAndExtractorsListItemOperate
                                        onRemove={() => onRemove(index)}
                                        onEdit={() => onEdit(index)}
                                        popoverContent={
                                            <ExtractorItem
                                                extractorItem={extractorItem}
                                                onEdit={() => {}}
                                                notEditable={true}
                                                httpResponse=''
                                            />
                                        }
                                    />
                                </div>
                            </Form.Item>
                        ))}
                    </>
                )}
            </Form.List>
            {extractorList?.length === 0 && (
                <>
                    <YakitButton
                        type='outline2'
                        onClick={() => onAdd()}
                        icon={<PlusIcon />}
                        className={styles["plus-button-bolck"]}
                        block
                    >
                        {t("YakitButton.add")}
                    </YakitButton>
                </>
            )}
        </>
    )
})

interface MatchersAndExtractorsListItemOperateProps {
    onRemove: () => void
    onEdit: () => void
    popoverContent: ReactNode
}

const MatchersAndExtractorsListItemOperate: React.FC<MatchersAndExtractorsListItemOperateProps> = React.memo(
    (props) => {
        const {onRemove, onEdit, popoverContent} = props
        const {t, i18n} = useI18nNamespaces(["webFuzzer"])
        const [visiblePopover, setVisiblePopover] = useState<boolean>(false)
        return (
            <div
                className={classNames(styles["matchersList-item-operate"], {
                    [styles["matchersList-item-operate-hover"]]: visiblePopover
                })}
            >
                <TrashIcon className={styles["trash-icon"]} onClick={() => onRemove()} />

                <Tooltip title={t("MatchersAndExtractorsListItemOperate.debug")}>
                    <HollowLightningBoltIcon
                        className={styles["hollow-lightningBolt-icon"]}
                        onClick={() => {
                            onEdit()
                        }}
                    />
                </Tooltip>
                <TerminalPopover
                    popoverContent={popoverContent}
                    visiblePopover={visiblePopover}
                    setVisiblePopover={setVisiblePopover}
                />
            </div>
        )
    }
)

interface TerminalPopoverProps extends YakitPopoverProp {
    popoverContent: ReactNode
    visiblePopover: boolean
    setVisiblePopover: (b: boolean) => void
}

/**
 * @description 属于一个测试性组件，暂时不建议全局使用。为解决antd Popover箭头无法正确指向目标元素问题
 */
export const TerminalPopover: React.FC<TerminalPopoverProps> = React.memo((props) => {
    const {popoverContent, visiblePopover, setVisiblePopover} = props
    const popoverContentRef = useRef<any>()
    const terminalIconRef = useRef<any>()
    const onSetArrowTop = useMemoizedFn(() => {
        if (terminalIconRef.current && popoverContentRef.current) {
            try {
                const {top: iconOffsetTop, height: iconHeight} = terminalIconRef.current.getBoundingClientRect()
                const {top: popoverContentOffsetTop} = popoverContentRef.current.getBoundingClientRect()
                const arrowTop = iconOffsetTop - popoverContentOffsetTop + iconHeight / 2
                popoverContentRef.current.style.setProperty("--arrow-top", `${arrowTop}px`)
            } catch (error) {}
        }
    })
    return (
        <YakitPopover
            placement='right'
            overlayClassName={classNames(styles["matching-extraction-content"], styles["terminal-popover"])}
            content={
                <div className={styles["terminal-popover-content"]} ref={popoverContentRef}>
                    {popoverContent}
                </div>
            }
            visible={visiblePopover}
            onVisibleChange={(v) => {
                if (v) {
                    setTimeout(() => {
                        onSetArrowTop()
                    }, 200)
                }
                setVisiblePopover(v)
            }}
        >
            <span ref={terminalIconRef} style={{height: 24, lineHeight: "16px"}}>
                <EyeIcon className={styles["terminal-icon"]} />
            </span>
        </YakitPopover>
    )
})
