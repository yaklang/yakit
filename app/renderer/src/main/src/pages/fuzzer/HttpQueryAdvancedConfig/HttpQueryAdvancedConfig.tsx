import {
    InformationCircleIcon,
    SolidChevronDownIcon,
    SolidChevronRightIcon,
    PlusSmIcon,
    PlusIcon,
    TrashIcon,
    ResizerIcon,
    HollowLightningBoltIcon,
    EyeIcon
} from "@/assets/newIcon"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {yakitFailed, yakitNotify} from "@/utils/notification"
import {useInViewport, useMemoizedFn} from "ahooks"
import {Form, Tooltip, Collapse, Space, Divider, Descriptions} from "antd"
import {useWatch} from "antd/lib/form/Form"
import React, {useState, useRef, useEffect, useMemo, ReactNode, useContext} from "react"
import {inputHTTPFuzzerHostConfigItem} from "../HTTPFuzzerHosts"
import {HttpQueryAdvancedConfigProps, AdvancedConfigValueProps} from "./HttpQueryAdvancedConfigType"
import {SelectOptionProps} from "../HTTPFuzzerPage"
import styles from "./HttpQueryAdvancedConfig.module.scss"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {StringToUint8Array} from "@/utils/str"
import {
    ColorSelect,
    ExtractorItem,
    MatcherAndExtractionCard,
    MatcherItem,
    defMatcherAndExtractionCode,
    extractorTypeList,
    filterModeOptions,
    matcherTypeList,
    matchersConditionOptions
} from "../MatcherAndExtractionCard/MatcherAndExtractionCard"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import classNames from "classnames"
import {
    ExtractorValueProps,
    MatcherValueProps,
    MatchingAndExtraction
} from "../MatcherAndExtractionCard/MatcherAndExtractionCardType"
import {YakitPopover, YakitPopoverProp} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {AutoTextarea} from "../components/AutoTextarea/AutoTextarea"
import "hint.css"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {CopyableField} from "@/utils/inputUtil"
import {usePageNode} from "@/store/pageNodeInfo"

const {ipcRenderer} = window.require("electron")
const {YakitPanel} = YakitCollapse

export const WEB_FUZZ_PROXY_LIST = "WEB_FUZZ_PROXY_LIST"
export const WEB_FUZZ_Advanced_Config_ActiveKey = "WEB_FUZZ_Advanced_Config_ActiveKey"

export const HttpQueryAdvancedConfig: React.FC<HttpQueryAdvancedConfigProps> = React.memo((props) => {

    const {firstTabMenuBodyHeight} = usePageNode()
    const {
        advancedConfigValue,
        visible,
        setVisible,
        onInsertYakFuzzer,
        onValuesChange,
        refreshProxy,
        defaultHttpResponse,
        outsideShowResponseMatcherAndExtraction,
        onShowResponseMatcherAndExtraction,
        inViewportCurrent
    } = props

    const [retryActive, setRetryActive] = useState<string[]>(["重试条件"])

    const [proxyList, setProxyList] = useState<SelectOptionProps[]>([]) // 代理代表
    const [activeKey, setActiveKey] = useState<string[]>() // Collapse打开的key

    const [variableActiveKey, setVariableActiveKey] = useState<string[]>(["0"])

    const [visibleDrawer, setVisibleDrawer] = useState<boolean>(false)
    const [defActiveKey, setDefActiveKey] = useState<string>("")
    const [type, setType] = useState<MatchingAndExtraction>("matchers")

    const [httpResponse, setHttpResponse] = useState<string>(defaultHttpResponse)

    const [form] = Form.useForm()
    const queryRef = useRef(null)
    const [inViewport] = useInViewport(queryRef)

    const retry = useWatch("retry", form)
    const noRetry = useWatch("noRetry", form)
    const etcHosts = useWatch("etcHosts", form) || []
    const gmTLS = useWatch("isGmTLS", form)
    const matchersList = useWatch("matchers", form) || []
    const extractorList = useWatch("extractors", form) || []
    const matchersCondition = useWatch("matchersCondition", form)
    const filterMode = useWatch("filterMode", form)
    const hitColor = useWatch("hitColor", form) || "red"

    const heightDrawer = useMemo(() => {
        return firstTabMenuBodyHeight - 40
    }, [firstTabMenuBodyHeight])

    useEffect(() => {
        setHttpResponse(defaultHttpResponse)
    }, [defaultHttpResponse])

    useEffect(() => {
        if (!inViewport) setVisibleDrawer(false)
    }, [inViewport])

    useEffect(() => {
        ipcRenderer.on("fetch-open-matcher-and-extraction", openDrawer)
        return () => {
            ipcRenderer.removeListener("fetch-open-matcher-and-extraction", openDrawer)
        }
    }, [])

    const openDrawer = useMemoizedFn((e, res: {httpResponseCode: string}) => {
        if (inViewportCurrent && !visibleDrawer) {
            setVisibleDrawer(true)
        }
        setHttpResponse(res.httpResponseCode)
    })

    useEffect(() => {
        if (gmTLS) {
            onSetValue({
                ...form.getFieldsValue(),
                isHttps: true,
                isGmTLS: true
            })
        }
    }, [gmTLS])
    useEffect(() => {
        form.setFieldsValue({
            ...advancedConfigValue
        })
    }, [advancedConfigValue])
    useEffect(() => {
        let newRetryActive = retryActive
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
        setRetryActive(newRetryActive)
    }, [retry, noRetry])

    useEffect(() => {
        getRemoteValue(WEB_FUZZ_Advanced_Config_ActiveKey).then((data) => {
            try {
                setTimeout(() => {
                    setActiveKey(data ? JSON.parse(data) : "请求包配置")
                }, 100)
            } catch (error) {
                yakitFailed("获取折叠面板的激活key失败:" + error)
            }
        })
    }, [])

    useEffect(() => {
        // 代理数据 最近10条
        getRemoteValue(WEB_FUZZ_PROXY_LIST).then((remoteData) => {
            try {
                setProxyList(
                    remoteData
                        ? JSON.parse(remoteData)
                        : [
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
                          ]
                )
            } catch (error) {
                yakitFailed("代理列表获取失败:" + error)
            }
        })
    }, [inViewport, refreshProxy])

    const onSetValue = useMemoizedFn((allFields: AdvancedConfigValueProps) => {
        let newValue: AdvancedConfigValueProps = {...allFields}
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
    /**
     * @description 变量预览
     */
    const onRenderVariables = useMemoizedFn(() => {
        ipcRenderer
            .invoke("RenderVariables", {
                Params: form.getFieldValue("params") || [],
                HTTPResponse: StringToUint8Array(defaultHttpResponse || defMatcherAndExtractionCode)
            })
            .then((rsp: {Results: {Key: string; Value: string}[]}) => {
                showYakitModal({
                    title: "渲染后变量内容",
                    footer: <></>,
                    content: (
                        <div className={styles["render-variables-modal-content"]}>
                            <Descriptions size={"small"} column={1} bordered={true}>
                                {rsp.Results.filter((i) => {
                                    return !(i.Key === "" && i.Value === "")
                                }).map((data, index) => {
                                    return (
                                        <Descriptions.Item
                                            label={<CopyableField text={data.Key} maxWidth={100} />}
                                            key={`${data.Key}-${data.Value}`}
                                        >
                                            <CopyableField text={data.Value} maxWidth={300} />
                                        </Descriptions.Item>
                                    )
                                })}
                            </Descriptions>
                        </div>
                    )
                })
            })
            .catch((err) => {
                yakitNotify("error", "预览失败:" + err)
            })
    })
    const onReset = useMemoizedFn((restValue) => {
        const v = form.getFieldsValue()
        onSetValue({
            ...v,
            ...restValue
        })
    })

    const onAddMatchingAndExtractionCard = useMemoizedFn((type: MatchingAndExtraction) => {
        if (outsideShowResponseMatcherAndExtraction) {
            if (onShowResponseMatcherAndExtraction) onShowResponseMatcherAndExtraction(type, "ID:0")
        } else {
            setType(type)
            setVisibleDrawer(true)
        }
    })
    const onRemoveMatcher = useMemoizedFn((i) => {
        const v = form.getFieldsValue()
        onSetValue({
            ...v,
            matchers: matchersList.filter((m, n) => n !== i)
        })
    })
    const onEditMatcher = useMemoizedFn((index) => {
        if (outsideShowResponseMatcherAndExtraction) {
            if (onShowResponseMatcherAndExtraction) onShowResponseMatcherAndExtraction("matchers", `ID:${index}`)
        } else {
            setVisibleDrawer(true)
            setDefActiveKey(`ID:${index}`)
            setType("matchers")
        }
    })
    const onRemoveExtractors = useMemoizedFn((i) => {
        const v = form.getFieldsValue()
        onSetValue({
            ...v,
            extractors: extractorList.filter((m, n) => n !== i)
        })
    })
    const onEditExtractors = useMemoizedFn((index) => {
        if (outsideShowResponseMatcherAndExtraction) {
            if (onShowResponseMatcherAndExtraction) onShowResponseMatcherAndExtraction("extractors", `ID:${index}`)
        } else {
            setVisibleDrawer(true)
            setDefActiveKey(`ID:${index}`)
            setType("extractors")
        }
    })
    return (
        <div className={styles["http-query-advanced-config"]} style={{ display: visible ? "" : "none" }} ref={queryRef}>
            {/* <div className={styles["advanced-config-heard"]}>
                <span>高级配置</span>
                <YakitSwitch wrapperClassName={styles["btn-padding-right-0"]} checked={visible} onChange={setVisible} />
            </div> */}
            <Form
                form={form}
                colon={false}
                onValuesChange={(changedFields, allFields) => onSetValue(allFields)}
                size='small'
                labelCol={{span: 10}}
                wrapperCol={{span: 14}}
                style={{overflowY: "auto"}}
                initialValues={{
                    ...advancedConfigValue
                }}
            >
                <div className={styles["advanced-config-extra-formItem"]}>
                    <Form.Item label='强制 HTTPS' name='isHttps' valuePropName='checked'>
                        <YakitSwitch />
                    </Form.Item>
                    <Form.Item label='国密TLS' name='isGmTLS' valuePropName='checked'>
                        <YakitSwitch />
                    </Form.Item>
                    <Form.Item label='真实Host' name='actualHost'>
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
                    >
                        <YakitSelect
                            allowClear
                            options={proxyList}
                            placeholder='请输入...'
                            mode='tags'
                            size='small'
                            maxTagCount={1}
                        />
                    </Form.Item>
                    <Form.Item label={"禁用系统代理"} name={"noSystemProxy"} valuePropName='checked'>
                        <YakitSwitch />
                    </Form.Item>
                </div>
                <YakitCollapse
                    activeKey={activeKey}
                    onChange={(key) => onSwitchCollapse(key)}
                    destroyInactivePanel={true}
                    type='grey'
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
                                        forceFuzz: true,
                                        isHttps: false,
                                        noFixContentLength: false,
                                        actualHost: "",
                                        timeout: 30
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
                                    <Tooltip title='关闭之后，所有的 Fuzz 标签将会失效' overlayStyle={{width: 150}}>
                                        <InformationCircleIcon className={styles["info-icon"]} />
                                    </Tooltip>
                                </span>
                            }
                            name='forceFuzz'
                            valuePropName='checked'
                        >
                            <YakitSwitch />
                        </Form.Item>

                        <Form.Item label='不修复长度' name='noFixContentLength' valuePropName='checked'>
                            <YakitSwitch />
                        </Form.Item>

                        <Form.Item label='超时时长' name='timeout'>
                            <YakitInputNumber type='horizontal' size='small' />
                        </Form.Item>
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
                                        concurrent: 20,
                                        proxy: [],
                                        noSystemProxy: false,
                                        minDelaySeconds: undefined,
                                        maxDelaySeconds: undefined,
                                        repeatTimes: 0
                                    }
                                    onReset(restValue)
                                }}
                                size='small'
                            >
                                重置
                            </YakitButton>
                        }
                    >
                        <Form.Item label='重复发包' name='repeatTimes' help={`一般用来测试条件竞争或者大并发的情况`}>
                            <YakitInputNumber type='horizontal' size='small' />
                        </Form.Item>
                        <Form.Item label='并发线程' name='concurrent'>
                            <YakitInputNumber type='horizontal' size='small' />
                        </Form.Item>

                        <Form.Item label='随机延迟'>
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
                                        className={styles["delay-input-left"]}
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
                                        className={styles["delay-input-right"]}
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
                        <Collapse
                            ghost
                            activeKey={retryActive}
                            onChange={(e) => setRetryActive(e as string[])}
                            expandIcon={(e) => (e.isActive ? <SolidChevronDownIcon /> : <SolidChevronRightIcon />)}
                            destroyInactivePanel={true}
                        >
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
                                <Form.Item label='状态码' name={["noRetryConfiguration", "statusCode"]}>
                                    <YakitInput placeholder='200,300-399' size='small' disabled={!noRetry} />
                                </Form.Item>
                            </YakitPanel>
                        </Collapse>
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
                                        redirectConfiguration: {
                                            statusCode: undefined,
                                            keyWord: undefined
                                        },
                                        noRedirectConfiguration: {
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
                        <Form.Item label='禁用重定向' name='noFollowRedirect' valuePropName={"checked"}>
                            <YakitSwitch />
                        </Form.Item>
                        <Form.Item label='重定向次数' name='redirectCount'>
                            <YakitInputNumber type='horizontal' size='small' />
                        </Form.Item>
                        <Form.Item label='JS 重定向' name='followJSRedirect' valuePropName={"checked"}>
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
                        <Form.Item label={"Hosts配置"} name='etcHosts' initialValue={[]}>
                            <Space direction={"vertical"}>
                                {(etcHosts || []).map((i, n) => (
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
                                        {`${i.Key} => ${i.Value}`}
                                    </YakitTag>
                                ))}
                                <YakitButton
                                    onClick={() => {
                                        inputHTTPFuzzerHostConfigItem((obj) => {
                                            const newEtcHosts = [...etcHosts.filter((i) => i.Key !== obj.Key), obj]
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
                    <YakitPanel
                        header={
                            <div className={styles["matchers-panel"]}>
                                匹配器
                                <div className={styles["matchers-number"]}>{matchersList?.length}</div>
                            </div>
                        }
                        key='匹配器'
                        extra={
                            <>
                                <YakitButton
                                    type='text'
                                    colors='danger'
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        const restValue = {
                                            matchers: [],
                                            filterMode: "drop",
                                            hitColor: "red",
                                            matchersCondition: "and"
                                        }
                                        onReset(restValue)
                                    }}
                                    size='small'
                                >
                                    重置
                                </YakitButton>
                                <Divider type='vertical' style={{margin: 0}} />
                                <YakitButton
                                    type='text'
                                    size='small'
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        if (activeKey?.findIndex((ele) => ele === "匹配器") === -1) {
                                            onSwitchCollapse([...activeKey, "匹配器"])
                                        }
                                        onAddMatchingAndExtractionCard("matchers")
                                    }}
                                    className={styles["btn-padding-right-0"]}
                                >
                                    添加/调试
                                    <HollowLightningBoltIcon />
                                </YakitButton>
                            </>
                        }
                    >
                        <div className={styles["matchers-heard"]}>
                            <div className={styles["matchers-heard-left"]}>
                                <Form.Item name='filterMode' noStyle>
                                    <YakitRadioButtons buttonStyle='solid' options={filterModeOptions} size='small' />
                                </Form.Item>
                                {filterMode === "onlyMatch" && (
                                    <Form.Item name='hitColor' noStyle>
                                        <ColorSelect size='small' />
                                    </Form.Item>
                                )}
                            </div>
                            <Form.Item name='matchersCondition' noStyle>
                                <YakitRadioButtons
                                    buttonStyle='solid'
                                    options={matchersConditionOptions}
                                    size='small'
                                />
                            </Form.Item>
                        </div>
                        <MatchersList
                            matcherValue={{filterMode, matchersList, matchersCondition, hitColor}}
                            onAdd={() => onAddMatchingAndExtractionCard("matchers")}
                            onRemove={onRemoveMatcher}
                            onEdit={onEditMatcher}
                        />
                    </YakitPanel>
                    <YakitPanel
                        header={
                            <div className={styles["matchers-panel"]}>
                                数据提取器
                                <div className={styles["matchers-number"]}>{extractorList?.length}</div>
                            </div>
                        }
                        key='数据提取器'
                        extra={
                            <>
                                <YakitButton
                                    type='text'
                                    colors='danger'
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        const restValue = {
                                            extractors: []
                                        }
                                        onReset(restValue)
                                    }}
                                    size='small'
                                >
                                    重置
                                </YakitButton>
                                <Divider type='vertical' style={{margin: 0}} />
                                <YakitButton
                                    type='text'
                                    size='small'
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        if (activeKey?.findIndex((ele) => ele === "数据提取器") === -1) {
                                            onSwitchCollapse([...activeKey, "数据提取器"])
                                        }
                                        onAddMatchingAndExtractionCard("extractors")
                                    }}
                                    className={styles["btn-padding-right-0"]}
                                >
                                    添加/调试
                                    <HollowLightningBoltIcon />
                                </YakitButton>
                            </>
                        }
                    >
                        <ExtractorsList
                            extractorValue={{extractorList}}
                            onAdd={() => onAddMatchingAndExtractionCard("extractors")}
                            onRemove={onRemoveExtractors}
                            onEdit={onEditExtractors}
                        />
                    </YakitPanel>
                    <YakitPanel
                        header='设置变量'
                        key='设置变量'
                        extra={
                            <>
                                <YakitButton
                                    type='text'
                                    colors='danger'
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        const restValue = {
                                            params: [{Key: "", Value: ""}]
                                        }
                                        onReset(restValue)
                                        setVariableActiveKey(["0"])
                                    }}
                                    size='small'
                                >
                                    重置
                                </YakitButton>
                                <Divider type='vertical' style={{margin: 0}} />
                                <YakitButton
                                    type='text'
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onRenderVariables()
                                    }}
                                    size='small'
                                >
                                    预览
                                </YakitButton>
                                <Divider type='vertical' style={{margin: 0}} />
                                <YakitButton
                                    type='text'
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        const v = form.getFieldsValue()
                                        const variables = v.params || []
                                        const index = variables.findIndex((ele) => !ele || (!ele.Key && !ele.Value))
                                        if (index === -1) {
                                            form.setFieldsValue({
                                                params: [...variables, {Key: "", Value: ""}]
                                            })
                                            onSetValue({
                                                ...v,
                                                params: [...variables, {Key: "", Value: ""}]
                                            })
                                            setVariableActiveKey([
                                                ...(variableActiveKey || []),
                                                `${variables?.length || 0}`
                                            ])
                                        } else {
                                            yakitNotify("error", `请将已添加【变量${index}】设置完成后再进行添加`)
                                        }
                                        if (activeKey?.findIndex((ele) => ele === "设置变量") === -1) {
                                            onSwitchCollapse([...activeKey, "设置变量"])
                                        }
                                    }}
                                    className={styles["btn-padding-right-0"]}
                                    size='small'
                                >
                                    添加
                                    <PlusIcon />
                                </YakitButton>
                            </>
                        }
                    >
                        <Form.List name='params'>
                            {(fields, {add}) => {
                                return (
                                    <Collapse
                                        ghost
                                        activeKey={variableActiveKey}
                                        onChange={(key) => {
                                            setVariableActiveKey(key as string[])
                                        }}
                                        expandIcon={(e) =>
                                            e.isActive ? (
                                                <SolidChevronDownIcon className={styles["chevron-down-icon"]} />
                                            ) : (
                                                <SolidChevronRightIcon className={styles["chevron-right-icon"]} />
                                            )
                                        }
                                        className={styles["variable-list"]}
                                        destroyInactivePanel={true}
                                    >
                                        {fields.map(({key, name}, i) => (
                                            <YakitPanel
                                                key={`${key}`}
                                                header={`变量${name}`}
                                                className={styles["variable-list-panel"]}
                                                extra={
                                                    <div
                                                        className={styles["variable-list-panel-extra"]}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                        }}
                                                    >
                                                        <TrashIcon
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                const v = form.getFieldsValue()
                                                                const variables = v.params || []
                                                                variables.splice(i, 1)
                                                                form.setFieldsValue({
                                                                    params: [...variables]
                                                                })
                                                                onSetValue({
                                                                    ...v,
                                                                    params: [...variables]
                                                                })
                                                            }}
                                                            className={styles["variable-list-remove"]}
                                                        />

                                                        <span className={styles["variable-fuzzer-tag"]}>
                                                            识别 Fuzztag
                                                        </span>
                                                        <Form.Item
                                                            name={[name, "typeChecked"]}
                                                            noStyle
                                                            wrapperCol={{span: 24}}
                                                        >
                                                            <YakitSwitch />
                                                        </Form.Item>
                                                    </div>
                                                }
                                            >
                                                <SetVariableItem name={name} />
                                            </YakitPanel>
                                        ))}
                                        {fields?.length === 0 && (
                                            <Form.Item wrapperCol={{span: 24}}>
                                                <YakitButton
                                                    type='outline2'
                                                    onClick={() => {
                                                        add({Key: "", Value: ""})
                                                        setVariableActiveKey([
                                                            ...(variableActiveKey || []),
                                                            `${variableActiveKey?.length}`
                                                        ])
                                                    }}
                                                    icon={<PlusIcon />}
                                                    className={styles["plus-button-bolck"]}
                                                    block
                                                >
                                                    添加
                                                </YakitButton>
                                            </Form.Item>
                                        )}
                                    </Collapse>
                                )
                            }}
                        </Form.List>
                    </YakitPanel>
                </YakitCollapse>
                <div className={styles["to-end"]}>已经到底啦～</div>
            </Form>
            <YakitDrawer
                mask={false}
                visible={visibleDrawer}
                width='100vh'
                headerStyle={{display: "none"}}
                style={{height: visibleDrawer ? heightDrawer : 0}}
                contentWrapperStyle={{height: heightDrawer, boxShadow: "0px -2px 4px rgba(133, 137, 158, 0.2)"}}
                bodyStyle={{padding: 0}}
                placement='bottom'
            >
                <MatcherAndExtractionCard
                    defActiveType={type}
                    httpResponse={httpResponse}
                    defActiveKey={defActiveKey}
                    matcherValue={{filterMode, matchersList: matchersList || [], matchersCondition, hitColor}}
                    extractorValue={{extractorList: extractorList || []}}
                    onClose={() => setVisibleDrawer(false)}
                    onSave={(matcher, extractor) => {
                        const v = form.getFieldsValue()
                        onSetValue({
                            ...v,
                            filterMode: matcher.filterMode,
                            hitColor: matcher.hitColor || "red",
                            matchersCondition: matcher.matchersCondition,
                            matchers: matcher.matchersList || [],
                            extractors: extractor.extractorList || []
                        })
                    }}
                />
            </YakitDrawer>
        </div>
    )
})

interface SetVariableItemProps {
    name: number
}

const SetVariableItem: React.FC<SetVariableItemProps> = React.memo((props) => {
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
    onRemove: (index: number) => void
    onEdit: (index: number) => void
}

const MatchersList: React.FC<MatchersListProps> = React.memo((props) => {
    const {matcherValue, onAdd, onRemove, onEdit} = props
    const {matchersList} = matcherValue
    return (
        <>
            <Form.Item name='matchers' noStyle>
                {matchersList.map((matcherItem, index) => (
                    <div className={styles["matchersList-item"]} key={`ID:${index}`}>
                        <div className={styles["matchersList-item-heard"]}>
                            <span className={styles["item-id"]}>ID&nbsp;{index}</span>
                            <span>[{matcherTypeList.find((e) => e.value === matcherItem.MatcherType)?.label}]</span>
                            <span className={styles["item-number"]}>{matcherItem.Group?.length}</span>
                        </div>
                        <MatchersAndExtractorsListItemOperate
                            onRemove={() => onRemove(index)}
                            onEdit={() => onEdit(index)}
                            popoverContent={
                                <MatcherItem
                                    matcherItem={matcherItem}
                                    onEdit={() => {}}
                                    notEditable={true}
                                    httpResponse=''
                                />
                            }
                        />
                    </div>
                ))}
            </Form.Item>
            {matchersList?.length === 0 && (
                <Form.Item wrapperCol={{span: 24}}>
                    <YakitButton
                        type='outline2'
                        onClick={() => onAdd()}
                        icon={<PlusIcon />}
                        className={styles["plus-button-bolck"]}
                        block
                    >
                        添加
                    </YakitButton>
                </Form.Item>
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

const ExtractorsList: React.FC<ExtractorsListProps> = React.memo((props) => {
    const {extractorValue, onAdd, onRemove, onEdit} = props
    const {extractorList} = extractorValue
    return (
        <>
            <Form.Item name='extractors' noStyle>
                {extractorList.map((extractorItem, index) => (
                    <div className={styles["matchersList-item"]} key={`${extractorItem.Name}-${index}`}>
                        <div className={styles["matchersList-item-heard"]}>
                            <span className={styles["item-id"]}>{extractorItem.Name || `data_${index}`}</span>
                            <span>[{extractorTypeList.find((e) => e.value === extractorItem.Type)?.label}]</span>
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
                ))}
            </Form.Item>
            {extractorList?.length === 0 && (
                <Form.Item wrapperCol={{span: 24}}>
                    <YakitButton
                        type='outline2'
                        onClick={() => onAdd()}
                        icon={<PlusIcon />}
                        className={styles["plus-button-bolck"]}
                        block
                    >
                        添加
                    </YakitButton>
                </Form.Item>
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
const TerminalPopover: React.FC<TerminalPopoverProps> = React.memo((props) => {
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
