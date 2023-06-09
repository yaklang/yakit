import {
    InformationCircleIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    PlusSmIcon,
    PlusIcon,
    TrashIcon,
    ResizerIcon
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
import {Form, Tooltip, Collapse, Space, Tag, Divider} from "antd"
import {useWatch} from "antd/lib/form/Form"
import React, {useState, useRef, useEffect} from "react"
import {inputHTTPFuzzerHostConfigItem} from "../HTTPFuzzerHosts"
import {HttpQueryAdvancedConfigProps, AdvancedConfigValueProps} from "./HttpQueryAdvancedConfigType"
import {SelectOptionProps} from "../HTTPFuzzerPage"
import styles from "./HttpQueryAdvancedConfig.module.scss"

const {Panel} = Collapse

export const WEB_FUZZ_PROXY_LIST = "WEB_FUZZ_PROXY_LIST"
export const WEB_FUZZ_Advanced_Config_ActiveKey = "WEB_FUZZ_Advanced_Config_ActiveKey"

export const HttpQueryAdvancedConfig: React.FC<HttpQueryAdvancedConfigProps> = React.memo((props) => {
    const {
        defAdvancedConfigValue,
        isHttps,
        isGmTLS,
        setIsHttps,
        setIsGM,
        visible,
        setVisible,
        onInsertYakFuzzer,
        onValuesChange,
        refreshProxy,
        onRenderVariables
    } = props

    const [retryActive, setRetryActive] = useState<string[]>(["重试条件"])

    const [proxyList, setProxyList] = useState<SelectOptionProps[]>([]) // 代理代表
    const [activeKey, setActiveKey] = useState<string[]>() // Collapse打开的key

    const [variableActiveKey, setVariableActiveKey] = useState<string[]>(["0"])

    const ruleContentRef = useRef<any>()
    const [form] = Form.useForm()
    const queryRef = useRef(null)
    const [inViewport] = useInViewport(queryRef)

    const retrying = useWatch("retrying", form)
    const noRetrying = useWatch("noRetrying", form)
    const etcHosts = useWatch("etcHosts", form) || []
    const gmTLS = useWatch("isGmTLS", form)
    useEffect(() => {
        if (gmTLS) {
            form.setFieldsValue({isHttps: true})
            setIsHttps(true)
            setIsGM(true)
            form.setFieldsValue({isGmTLS: true})
        }
    }, [gmTLS])
    useEffect(() => {
        let newRetryActive = retryActive
        if (retrying) {
            newRetryActive = [...newRetryActive, "重试条件"]
        } else {
            newRetryActive = newRetryActive.filter((ele) => ele !== "重试条件")
        }
        if (noRetrying) {
            newRetryActive = [...newRetryActive, "不重试条件"]
        } else {
            newRetryActive = newRetryActive.filter((ele) => ele !== "不重试条件")
        }
        setRetryActive(newRetryActive)
    }, [retrying, noRetrying])

    useEffect(() => {
        getRemoteValue(WEB_FUZZ_Advanced_Config_ActiveKey).then((data) => {
            try {
                setActiveKey(data ? JSON.parse(data) : "请求包配置")
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
    useEffect(() => {
        form.setFieldsValue({isHttps: isHttps})
    }, [isHttps])
    useEffect(() => {
        form.setFieldsValue({isGmTLS: isGmTLS})
    }, [isGmTLS])
    useEffect(() => {
        form.setFieldsValue({
            ...defAdvancedConfigValue
        })
        ruleContentRef?.current?.onSetValue(defAdvancedConfigValue.regexps)
    }, [defAdvancedConfigValue])
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

    return (
        <div className={styles["http-query-advanced-config"]} style={{display: visible ? "" : "none"}} ref={queryRef}>
            <div className={styles["advanced-config-heard"]}>
                <span>高级配置</span>
                <YakitSwitch checked={visible} onChange={setVisible} />
            </div>
            <Form
                form={form}
                colon={false}
                onValuesChange={(changedFields, allFields) => onSetValue(allFields)}
                size='small'
                labelCol={{span: 10}}
                wrapperCol={{span: 14}}
                style={{overflowY: "auto"}}
                initialValues={{
                    ...defAdvancedConfigValue
                }}
            >
                <div className={styles["advanced-config-extra-formItem"]}>
                    <Form.Item label='强制 HTTPS' name='isHttps' valuePropName='checked'>
                        <YakitSwitch onChange={setIsHttps} />
                    </Form.Item>
                    <Form.Item label='国密TLS' name='isGmTLS' valuePropName='checked'>
                        <YakitSwitch />
                    </Form.Item>
                    <Form.Item label='请求 Host' name='actualHost'>
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
                <Collapse
                    activeKey={activeKey}
                    onChange={(key) => onSwitchCollapse(key)}
                    ghost
                    expandIcon={(e) => (e.isActive ? <ChevronDownIcon /> : <ChevronRightIcon />)}
                >
                    <Panel
                        header='请求包配置'
                        key='请求包配置'
                        extra={
                            <YakitButton
                                type='text'
                                className='button-text-danger'
                                onClick={(e) => {
                                    e.stopPropagation()
                                    const restValue = {
                                        forceFuzz: true,
                                        isHttps: false,
                                        noFixContentLength: false,
                                        actualHost: "",
                                        timeout: 30
                                    }
                                    form.setFieldsValue({
                                        ...restValue
                                    })
                                    const v = form.getFieldsValue()
                                    onSetValue({
                                        ...v,
                                        ...restValue
                                    })
                                }}
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
                                icon={<PlusSmIcon className={styles["plus-sm-icon"]} />}
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
                    </Panel>
                    <Panel
                        header='并发配置'
                        key='发包配置'
                        extra={
                            <YakitButton
                                type='text'
                                className='button-text-danger'
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
                                    form.setFieldsValue({
                                        ...restValue
                                    })
                                    const v = form.getFieldsValue()
                                    onSetValue({
                                        ...v,
                                        ...restValue
                                    })
                                }}
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
                    </Panel>
                    <Panel
                        header='重试配置'
                        key='重试配置'
                        extra={
                            <YakitButton
                                type='text'
                                className='button-text-danger'
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
                                    form.setFieldsValue({
                                        ...restValue
                                    })
                                    const v = form.getFieldsValue()
                                    onSetValue({
                                        ...v,
                                        ...restValue
                                    })
                                }}
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
                            expandIcon={(e) => (e.isActive ? <ChevronDownIcon /> : <ChevronRightIcon />)}
                        >
                            <Panel
                                header={
                                    <Form.Item name='retrying' noStyle valuePropName='checked'>
                                        <YakitCheckbox>
                                            <span style={{marginLeft: 6, cursor: "pointer"}}>重试条件</span>
                                        </YakitCheckbox>
                                    </Form.Item>
                                }
                                key='重试条件'
                                className={styles["advanced-config-collapse-secondary-item"]}
                            >
                                <Form.Item label='状态码' name={["retryConfiguration", "statusCode"]}>
                                    <YakitInput placeholder='200,300-399' size='small' disabled={!retrying} />
                                </Form.Item>
                            </Panel>
                            <Panel
                                header={
                                    <Form.Item name='noRetrying' noStyle valuePropName='checked'>
                                        <YakitCheckbox>
                                            <span style={{marginLeft: 6, cursor: "pointer"}}>不重试条件</span>
                                        </YakitCheckbox>
                                    </Form.Item>
                                }
                                key='不重试条件'
                                className={styles["advanced-config-collapse-secondary-item"]}
                            >
                                <Form.Item label='状态码' name={["noRetryConfiguration", "statusCode"]}>
                                    <YakitInput placeholder='200,300-399' size='small' disabled={!noRetrying} />
                                </Form.Item>
                            </Panel>
                        </Collapse>
                    </Panel>
                    <Panel
                        header='重定向配置'
                        key='重定向配置'
                        extra={
                            <YakitButton
                                type='text'
                                className='button-text-danger'
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
                                    form.setFieldsValue({
                                        ...restValue
                                    })
                                    const v = form.getFieldsValue()
                                    onSetValue({
                                        ...v,
                                        ...restValue
                                    })
                                }}
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
                    </Panel>
                    <Panel
                        header={"DNS配置"}
                        key={"DNS配置"}
                        extra={
                            <YakitButton
                                type='text'
                                className='button-text-danger'
                                onClick={(e) => {
                                    e.stopPropagation()
                                    const restValue = {
                                        dnsServers: [],
                                        etcHosts: []
                                    }
                                    form.setFieldsValue({
                                        ...restValue
                                    })
                                    ruleContentRef?.current?.onSetValue("")
                                    const v = form.getFieldsValue()
                                    onSetValue({
                                        ...v,
                                        ...restValue
                                    })
                                }}
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
                                {(etcHosts || []).map((i) => (
                                    <Tag
                                        closable={true}
                                        onClose={() => {
                                            const newEtcHosts = etcHosts.filter((j) => j.Key !== i.Key)
                                            const v = form.getFieldsValue()
                                            onSetValue({
                                                ...v,
                                                etcHosts: newEtcHosts
                                            })
                                        }}
                                    >
                                        {`${i.Key} => ${i.Value}`}
                                    </Tag>
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
                    </Panel>
                    <Panel
                        header='设置变量'
                        key='设置变量'
                        extra={
                            <>
                                <YakitButton
                                    type='text'
                                    className='button-text-danger'
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        const restValue = {
                                            params: [{Key: "", Value: ""}]
                                        }
                                        const v = form.getFieldsValue()
                                        onSetValue({
                                            ...v,
                                            ...restValue
                                        })
                                    }}
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
                                                `${variableActiveKey.length}`
                                            ])
                                        } else {
                                            yakitNotify("error", `请将已添加【变量${index}】设置完成后再进行添加`)
                                        }
                                    }}
                                    style={{paddingRight: 6}}
                                >
                                    添加
                                    <PlusIcon className={styles["variable-plus-icon"]} />
                                </YakitButton>
                            </>
                        }
                    >
                        <Form.List name='params'>
                            {(fields, {add, remove}) => {
                                return (
                                    <Collapse
                                        ghost
                                        activeKey={variableActiveKey}
                                        onChange={(key) => {
                                            setVariableActiveKey(key as string[])
                                        }}
                                        expandIcon={(e) =>
                                            e.isActive ? (
                                                <ChevronDownIcon className={styles["chevron-down-icon"]} />
                                            ) : (
                                                <ChevronRightIcon className={styles["chevron-right-icon"]} />
                                            )
                                        }
                                        className={styles["variable-list"]}
                                    >
                                        {fields.map(({key, name}, i) => (
                                            <Panel
                                                key={`${key}`}
                                                header={`变量${name}`}
                                                className={styles["variable-list-panel"]}
                                                extra={
                                                    <>
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
                                                    </>
                                                }
                                            >
                                                <SetVariableItem name={name} />
                                            </Panel>
                                        ))}
                                        {fields.length === 0 && (
                                            <Form.Item wrapperCol={{span: 24}}>
                                                <YakitButton
                                                    type='outline2'
                                                    onClick={() => {
                                                        add({Key: "", Value: ""})
                                                        setVariableActiveKey([
                                                            ...(variableActiveKey || []),
                                                            `${variableActiveKey.length}`
                                                        ])
                                                    }}
                                                    icon={<PlusIcon className={styles["variable-plus-icon"]} />}
                                                    themeClass={styles["variable-plus-button"]}
                                                    block
                                                    style={{justifyContent: "center"}}
                                                >
                                                    添加
                                                </YakitButton>
                                            </Form.Item>
                                        )}
                                    </Collapse>
                                )
                            }}
                        </Form.List>
                    </Panel>
                    <Panel
                        header={<div>匹配器</div>}
                        key='匹配器'
                        extra={
                            <YakitButton
                                type='text'
                                className='button-text-danger'
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
                                    form.setFieldsValue({
                                        ...restValue
                                    })
                                    const v = form.getFieldsValue()
                                    onSetValue({
                                        ...v,
                                        ...restValue
                                    })
                                }}
                            >
                                重置
                            </YakitButton>
                        }
                    >
                        <MatchersList matchersList={form.getFieldValue("Matchers") || []} />
                    </Panel>
                </Collapse>
            </Form>
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
                    <textarea rows={3} placeholder='变量值' className={styles["variable-item-textarea"]} />
                </Form.Item>
                <ResizerIcon className={styles["resizer-icon"]} />
            </div>
        </div>
    )
})

interface MatchersListProps {
    matchersList: any[]
}
const MatchersList: React.FC<MatchersListProps> = React.memo((props) => {
    const {matchersList} = props
    return (
        <>
            <Form.Item name='Matchers' noStyle>
                {matchersList.map((item) => (
                    <div>44</div>
                ))}
            </Form.Item>
            {matchersList.length === 0 && (
                <Form.Item wrapperCol={{span: 24}}>
                    <YakitButton
                        type='outline2'
                        onClick={() => {}}
                        icon={<PlusIcon className={styles["variable-plus-icon"]} />}
                        themeClass={styles["variable-plus-button"]}
                        block
                        style={{justifyContent: "center"}}
                    >
                        添加
                    </YakitButton>
                </Form.Item>
            )}
        </>
    )
})
