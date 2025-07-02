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
import {AgentConfigModal} from "@/pages/mitm/MITMServerStartForm/MITMServerStartForm"
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

const {ipcRenderer} = window.require("electron")
const {YakitPanel} = YakitCollapse

const WEB_FUZZ_Advanced_Config_ActiveKey = "WEB_FUZZ_Advanced_Config_ActiveKey"

const fuzzTagModeOptions = [
    {
        value: "close",
        label: "关闭"
    },
    {
        value: "standard",
        label: "标准"
    },
    {
        value: "legacy",
        label: "兼容"
    }
]

const fuzzTagSyncOptions = [
    {
        value: false,
        label: "交叉乘积"
    },
    {
        value: true,
        label: "草叉/同步"
    }
]

// 前端定义的字段值
const overwriteSNIOptions = [
    {
        value: "auto",
        label: "自动"
    },
    {
        value: "mandatory",
        label: "强制"
    },
    {
        value: "clear",
        label: "清空"
    }
]

type fields = keyof AdvancedConfigValueProps

export const HttpQueryAdvancedConfig: React.FC<HttpQueryAdvancedConfigProps> = React.memo((props) => {
    const {
        advancedConfigValue,
        visible,
        onInsertYakFuzzer,
        onValuesChange,
        defaultHttpResponse,
        outsideShowResponseMatcherAndExtraction,
        onShowResponseMatcherAndExtraction,
        inViewportCurrent,
        id,
        matchSubmitFun,
        showFormContentType,
        proxyListRef,
        isbuttonIsSendReqStatus
    } = props

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

    // 是否通过仅匹配打开的弹窗
    const [isOpenByMacth, setOpenByMacth] = useState<boolean>(false)

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
                yakitFailed("获取折叠面板的激活key失败:" + error)
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
            yakitNotify("error", "openMatcherAndExtraction 解析数据失败")
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
            setOpenByMacth(true)
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
        if (isOpenByMacth) {
            setOpenByMacth(false)
        }
        setVisibleDrawer(false)
    })
    const onSave = useMemoizedFn((matcher, extractor) => {
        const v = form.getFieldsValue()
        onSetValue({
            ...v,
            matchers: matcher.matchersList || [],
            extractors: extractor.extractorList || []
        })
        if (isOpenByMacth) {
            setTimeout(() => {
                matchSubmitFun()
            }, 500)
        }
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
            yakitFailed(`请将已添加【变量${index}】设置完成后再进行添加`)
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
                            <Form.Item label='强制 HTTPS' name='isHttps' valuePropName='checked'>
                                <YakitSwitch />
                            </Form.Item>
                            <Form.Item label='TLS配置'>
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
                                            国密TLS
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
                                            随机TLS
                                        </YakitCheckableTag>
                                    </Form.Item>
                                </div>
                            </Form.Item>
                            <Form.Item
                                label={
                                    <span className={styles["advanced-config-form-label"]}>
                                        真实Host
                                        <Tooltip title='如需Host碰撞，请配置真实Host' overlayStyle={{width: 150}}>
                                            <InformationCircleIcon className={styles["info-icon"]} />
                                        </Tooltip>
                                    </span>
                                }
                                name='actualHost'
                            >
                                <YakitInput placeholder='请输入...' size='small' />
                            </Form.Item>
                            <Form.Item
                                label={
                                    <span className={styles["advanced-config-form-label"]}>
                                        设置代理
                                        <Tooltip
                                            title='设置多个代理时，会智能选择能用的代理进行发包'
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
                                    placeholder='请输入...'
                                    mode='tags'
                                    size='small'
                                    maxTagCount={1}
                                    dropdownMatchSelectWidth={245}
                                />
                            </Form.Item>
                            <YakitButton
                                size='small'
                                type='text'
                                onClick={() => setAgentConfigModalVisible(true)}
                                icon={<PlusSmIcon />}
                                style={{marginLeft: 100, marginBottom: 12}}
                            >
                                配置代理认证
                            </YakitButton>
                            <Form.Item label={"禁用系统代理"} name={"noSystemProxy"} valuePropName='checked'>
                                <YakitSwitch />
                            </Form.Item>
                            <Form.Item
                                label={
                                    <span className={styles["advanced-config-form-label"]}>
                                        前端渲染数量
                                        <Tooltip
                                            title='不影响发包数量，只影响前端渲染展示数量，超出的数量可通过点击表格的查看全部进行查看'
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
                                label='响应体长度限制'
                                name='maxBodySize'
                                style={{marginBottom: 12}}
                                normalize={(value) => {
                                    return value.replace(/\D/g, "")
                                }}
                            >
                                <YakitInput suffix='M' size='small' className={styles["fuzzer-maxBodySize-input"]} />
                            </Form.Item>
                            <Form.Item
                                label={<span className={styles["advanced-config-form-label"]}>SNI 配置</span>}
                                name='overwriteSNI'
                            >
                                <YakitRadioButtons
                                    buttonStyle='solid'
                                    options={overwriteSNIOptions}
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
                                    label={<span className={styles["advanced-config-form-label"]}>强制SNI</span>}
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
                                header='请求包配置'
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
                                        重置
                                    </YakitButton>
                                }
                            >
                                <Form.Item label='Fuzztag 辅助'>
                                    <YakitButton
                                        size='small'
                                        type='outline1'
                                        onClick={() => onInsertYakFuzzer()}
                                        icon={<PlusSmIcon />}
                                    >
                                        插入 yak.fuzz 语法
                                    </YakitButton>
                                </Form.Item>
                                <Form.Item
                                    label={
                                        <span className={styles["advanced-config-form-label"]}>
                                            渲染 Fuzz
                                            <Tooltip
                                                title='兼容模式支持嵌套使用时内层大括号省略 {{base64(url(www.example.com))}}，但标准模式不可省略，关闭后Fuzztag将失效。'
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
                                        options={fuzzTagModeOptions}
                                        size={"small"}
                                    />
                                </Form.Item>

                                <Form.Item label='渲染模式' name='fuzzTagSyncIndex'>
                                    <YakitRadioButtons
                                        buttonStyle='solid'
                                        options={fuzzTagSyncOptions}
                                        size={"small"}
                                    />
                                </Form.Item>

                                <Form.Item label={"禁用热加载"} name={"disableHotPatch"} valuePropName='checked'>
                                    <YakitSwitch />
                                </Form.Item>

                                <Form.Item label='不修复长度' name='noFixContentLength' valuePropName='checked'>
                                    <YakitSwitch />
                                </Form.Item>

                                <Form.Item label='超时时长'>
                                    <div className={styles["advanced-config-timeout"]}>
                                        <Form.Item
                                            name='dialTimeoutSeconds'
                                            noStyle
                                            normalize={(value) => {
                                                return value.replace(/\D/g, "")
                                            }}
                                        >
                                            <YakitInput
                                                prefix='连接'
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
                                                prefix='响应'
                                                suffix='s'
                                                size='small'
                                                className={styles["input-right"]}
                                            />
                                        </Form.Item>
                                    </div>
                                </Form.Item>
                                <Form.Item label='批量目标' name='batchTarget'>
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
                                                <div style={{color: "#56C991"}}>已配置</div>
                                            ) : (
                                                "配置批量目标"
                                            )
                                        ) : (
                                            "配置批量目标"
                                        )}
                                    </YakitButton>
                                </Form.Item>
                                <Form.Item
                                    label='随机分块传输'
                                    name='enableRandomChunked'
                                    valuePropName='checked'
                                    style={{marginBottom: enableRandomChunked ? 12 : 0}}
                                >
                                    <YakitSwitch />
                                </Form.Item>
                                {enableRandomChunked && (
                                    <>
                                        <Form.Item label='分块长度'>
                                            <div className={styles["advanced-config-random-chunked-length"]}>
                                                <Form.Item
                                                    name='randomChunkedMinLength'
                                                    noStyle
                                                    normalize={(value) => {
                                                        return value.replace(/\D/g, "")
                                                    }}
                                                >
                                                    <YakitInput
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
                                                        prefix='Max'
                                                        suffix='B'
                                                        size='small'
                                                        className={styles["input-right"]}
                                                    />
                                                </Form.Item>
                                            </div>
                                        </Form.Item>
                                        <Form.Item label='随机延迟' style={{marginBottom: 0}}>
                                            <div className={styles["advanced-config-random-chunked-delay"]}>
                                                <Form.Item
                                                    name='randomChunkedMinDelay'
                                                    noStyle
                                                    normalize={(value) => {
                                                        return value.replace(/\D/g, "")
                                                    }}
                                                >
                                                    <YakitInput
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
                                header='并发配置'
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
                                        重置
                                    </YakitButton>
                                }
                            >
                                <Form.Item label={"禁用连接池"} name={"disableUseConnPool"} valuePropName='checked'>
                                    <YakitSwitch />
                                </Form.Item>
                                <Form.Item
                                    label='重复发包'
                                    name='repeatTimes'
                                    help={`一般用来测试条件竞争或者大并发的情况`}
                                >
                                    <YakitInputNumber type='horizontal' size='small' />
                                </Form.Item>
                                <Form.Item label='并发线程' name='concurrent'>
                                    <YakitInputNumber type='horizontal' size='small' />
                                </Form.Item>

                                <Form.Item label='随机延迟' style={{marginBottom: 0}}>
                                    <div className={styles["advanced-config-delay"]}>
                                        <Form.Item
                                            name='minDelaySeconds'
                                            noStyle
                                            normalize={(value) => {
                                                return value.replace(/\D/g, "")
                                            }}
                                        >
                                            <YakitInput
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
                                header='重试配置'
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
                                        重置
                                    </YakitButton>
                                }
                            >
                                <Form.Item label='重试次数' name='maxRetryTimes'>
                                    <YakitInputNumber type='horizontal' size='small' min={0} />
                                </Form.Item>
                                <YakitCollapse activeKey={retryActive} destroyInactivePanel={true} bordered={false}>
                                    <YakitPanel
                                        header={
                                            <Form.Item name='retry' noStyle valuePropName='checked'>
                                                <YakitCheckbox>
                                                    <span style={{marginLeft: 6, cursor: "pointer"}}>重试条件</span>
                                                </YakitCheckbox>
                                            </Form.Item>
                                        }
                                        key='重试条件'
                                        className={styles["advanced-config-collapse-secondary-item"]}
                                    >
                                        <Form.Item label='状态码' name={["retryConfiguration", "statusCode"]}>
                                            <YakitInput placeholder='200,300-399' size='small' disabled={!retry} />
                                        </Form.Item>
                                    </YakitPanel>
                                    <YakitPanel
                                        header={
                                            <Form.Item name='noRetry' noStyle valuePropName='checked'>
                                                <YakitCheckbox>
                                                    <span style={{marginLeft: 6, cursor: "pointer"}}>不重试条件</span>
                                                </YakitCheckbox>
                                            </Form.Item>
                                        }
                                        key='不重试条件'
                                        className={styles["advanced-config-collapse-secondary-item"]}
                                    >
                                        <Form.Item
                                            label='状态码'
                                            name={["noRetryConfiguration", "statusCode"]}
                                            style={{marginBottom: 0}}
                                        >
                                            <YakitInput placeholder='200,300-399' size='small' disabled={!noRetry} />
                                        </Form.Item>
                                    </YakitPanel>
                                </YakitCollapse>
                            </YakitPanel>
                            <YakitPanel
                                header='重定向配置'
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
                                        重置
                                    </YakitButton>
                                }
                            >
                                <Form.Item label='禁用重定向' name='noFollowRedirect' valuePropName={"checked"}>
                                    <YakitSwitch />
                                </Form.Item>
                                <Form.Item label='重定向次数' name='redirectCount'>
                                    <YakitInputNumber type='horizontal' size='small' />
                                </Form.Item>
                                <Form.Item
                                    label='JS 重定向'
                                    name='followJSRedirect'
                                    valuePropName={"checked"}
                                    style={{marginBottom: 0}}
                                >
                                    <YakitSwitch />
                                </Form.Item>
                            </YakitPanel>
                            <YakitPanel
                                header={"DNS配置"}
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
                                        重置
                                    </YakitButton>
                                }
                            >
                                <Form.Item label='DNS服务器' name='dnsServers'>
                                    <YakitSelect
                                        options={["8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1"].map((i) => {
                                            return {value: i, label: i}
                                        })}
                                        mode='tags'
                                        allowClear={true}
                                        size={"small"}
                                        placeholder={"指定DNS服务器"}
                                    />
                                </Form.Item>
                                <Form.Item label={"Hosts配置"} name='etcHosts' style={{marginBottom: 0}}>
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
                                            添加 Hosts 映射
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
                        >
                            <MatchersPanel
                                key='匹配器'
                                onAddMatchingAndExtractionCard={onAddMatchingAndExtractionCard}
                                onEdit={onEditMatchers}
                                onSetValue={onSetValue}
                            />
                            <ExtractorsPanel
                                key='数据提取器'
                                onAddMatchingAndExtractionCard={onAddMatchingAndExtractionCard}
                                onEdit={onEditExtractors}
                                onSetValue={onSetValue}
                            />
                            <VariablePanel
                                key='设置变量'
                                defaultHttpResponse={defaultHttpResponse}
                                onAdd={onAddExtra}
                                pageId={id}
                                onSetValue={onSetValue}
                            />
                            <YakitPanel
                                header='GET 参数'
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
                                            重置
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
                                            添加
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
                                header='POST 参数'
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
                                            重置
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
                                            添加
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
                                            重置
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
                                            添加
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
                                            重置
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
                                            添加
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
            style={{display: visible ? "" : "none"}}
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
                <div className={styles["to-end"]}>已经到底啦～</div>
            </Form>
            <MatcherAndExtractionDrawer
                visibleDrawer={visibleDrawer}
                defActiveType={type}
                httpResponse={httpResponse}
                defActiveKey={defActiveKey}
                defActiveKeyAndOrder={defActiveKeyAndOrder}
                matcherValue={{matchersList: matchersList || []}}
                extractorValue={{extractorList: extractorList || []}}
                onClose={onClose}
                onSave={onSave}
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
            title='配置批量目标'
            width={600}
            maskClosable={false}
            destroyOnClose={true}
            closable
            centered
            okText='确认'
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
                            label: "扫描目标",
                            rules: [{required: false}]
                        }}
                        accept='.txt,.xlsx,.xls,.csv'
                        textareaProps={{
                            placeholder: "请输入扫描目标，多个目标用“英文逗号”或换行分隔",
                            rows: 3
                        }}
                        help='可将TXT、Excel文件拖入框内或'
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

    return (
        <div className={styles["variable-item"]}>
            <Form.Item name={[name, "Key"]} noStyle wrapperCol={{span: 24}}>
                <input placeholder='变量名' className={styles["variable-item-input"]} />
            </Form.Item>

            <div className={styles["variable-item-textarea-body"]}>
                <Form.Item name={[name, "Value"]} noStyle wrapperCol={{span: 24}}>
                    <AutoTextarea className={styles["variable-item-textarea"]} placeholder='变量值' />
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
                                                options={filterModeOptions}
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
                                                    <span>
                                                        [
                                                        {
                                                            matcherTypeList.find((e) => e.value === subItem.MatcherType)
                                                                ?.label
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
                        添加
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
                                        <span>
                                            [{extractorTypeList.find((e) => e.value === extractorItem.Type)?.label}]
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
                        添加
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
        const [visiblePopover, setVisiblePopover] = useState<boolean>(false)
        return (
            <div
                className={classNames(styles["matchersList-item-operate"], {
                    [styles["matchersList-item-operate-hover"]]: visiblePopover
                })}
            >
                <TrashIcon className={styles["trash-icon"]} onClick={() => onRemove()} />

                <Tooltip title='调试'>
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
