import React, {useEffect, useRef, useState} from "react"
import {
    AIConfigAPIKeyFormItemProps,
    AIModelFormAddOptions,
    AIModelFormProps,
    AIModelFormSetAIGlobalConfigOptions,
    AIModelFormUpdateOptions
} from "./AIModelFormType"
import {useCreation, useDebounceFn, useInViewport, useMemoizedFn} from "ahooks"
import {Form, FormInstance} from "antd"
import {NewThirdPartyApplicationConfigBase} from "@/components/configNetwork/NewThirdPartyApplicationConfig"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import styles from "./AIModelForm.module.scss"
import {
    AIGlobalConfig,
    AIModelConfig,
    AIModelTypeFileName,
    AIProvider,
    grpcGetAIGlobalConfig,
    grpcQueryAIProviderAll,
    grpcSetAIGlobalConfig,
    grpcTestAIModel,
    TestAIModelResponse
} from "../utils"
import {YakitAutoComplete} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {YakitAutoCompleteProps} from "@/components/yakitUI/YakitAutoComplete/YakitAutoCompleteType"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {AIModelTypeEnum, AIModelTypeInterFileNameEnum} from "../../defaultConstant"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {yakitNotify} from "@/utils/notification"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import emiter from "@/utils/eventBus/eventBus"
import {cloneDeep} from "lodash"
import {ThirdPartyApplicationConfig} from "@/components/configNetwork/ConfigNetworkPage"

const defaultFormValues = {
    Type: "",
    model_type: AIModelTypeEnum.TierIntelligent
}

interface TestAIModelFormValues {
    Type?: string
    api_key?: string
    user_identifier?: string
    user_secret?: string
    namespace?: string
    domain?: string
    proxy?: string
    no_https?: boolean
    api_type?: string
    webhook_url?: string
    model?: string
    api_key_id?: string
    model_type?: AIModelTypeEnum
    [key: string]: any
}

const buildTestAIModelConfig = (values: TestAIModelFormValues): ThirdPartyApplicationConfig => {
    const config: ThirdPartyApplicationConfig = {
        Type: values.Type || "",
        APIKey: values.api_key || "",
        UserIdentifier: values.user_identifier || "",
        UserSecret: values.user_secret || "",
        Namespace: values.namespace || "",
        Domain: values.domain || "",
        WebhookURL: values.webhook_url || "",
        Proxy: values.proxy || "",
        NoHttps: !!values.no_https,
        APIType: values.api_type || "",
        ExtraParams: []
    }

    const builtInFieldSet = new Set([
        "Type",
        "api_key",
        "user_identifier",
        "user_secret",
        "namespace",
        "domain",
        "proxy",
        "no_https",
        "api_type",
        "webhook_url",
        "api_key_id"
    ])

    Object.entries(values).forEach(([key, value]) => {
        if (builtInFieldSet.has(key)) return
        if (value === undefined || value === null || value === "") return
        config.ExtraParams?.push({
            Key: key,
            Value: typeof value === "boolean" ? `${value}` : `${value}`
        })
    })

    if (!config.ExtraParams?.length) {
        delete config.ExtraParams
    }

    return config
}

/**是否认为是同一个ai model */
export const isEqualAIModel = (item: AIModelConfig, newItem: AIModelConfig) => {
    return (
        item.ModelName === newItem.ModelName &&
        item.Provider.Type === newItem.Provider.Type &&
        item.Provider.APIKey === newItem.Provider.APIKey
        // &&item.ProviderId === newItem.ProviderId  用户可自己输入,输入的内容和数据库已有的一样
    )
}

/**获取ai模型对应的键名,通过模型类型 */
const getFileNameByModelType = (type: AIModelTypeEnum) => {
    let fileName: AIModelTypeFileName | null = null
    switch (type) {
        case AIModelTypeEnum.TierIntelligent:
            fileName = AIModelTypeInterFileNameEnum.IntelligentModels
            break
        case AIModelTypeEnum.TierLightweight:
            fileName = AIModelTypeInterFileNameEnum.LightweightModels
            break
        case AIModelTypeEnum.TierVision:
            fileName = AIModelTypeInterFileNameEnum.VisionModels
            break
        default:
            break
    }
    return fileName
}
/**通过键名获取对应的模型类型 */
export const getModelTypeByFileName = (fileName: string) => {
    let modelType: AIModelTypeEnum | null = null
    switch (fileName) {
        case AIModelTypeInterFileNameEnum.IntelligentModels:
            modelType = AIModelTypeEnum.TierIntelligent
            break
        case AIModelTypeInterFileNameEnum.LightweightModels:
            modelType = AIModelTypeEnum.TierLightweight
            break
        case AIModelTypeInterFileNameEnum.VisionModels:
            modelType = AIModelTypeEnum.TierVision
            break
        default:
            break
    }
    return modelType
}
export const AIModelForm: React.FC<AIModelFormProps> = React.memo((props) => {
    const {item, aiModelType, onSuccess, onClose} = props

    const [loading, setLoading] = useState<boolean>(false)
    const [testLoading, setTestLoading] = useState<boolean>(false)
    const [testPrompt, setTestPrompt] = useState<string>("你好，请简单回复“测试成功”。")
    const [testResult, setTestResult] = useState<TestAIModelResponse | null>(null)

    const formRef = useRef<{form: FormInstance}>(null)
    const footerRef = useRef<HTMLDivElement>(null)
    let aiGlobalConfigRef = useRef<AIGlobalConfig>()
    let currentIndexInConfigRef = useRef<number>(-1) //更新时，该值为当前模型在全局配置列表中的下标
    const [inViewport = true] = useInViewport(footerRef)

    const isAdd = useCreation(() => {
        return !item
    }, [item])

    useEffect(() => {
        if (inViewport) getAIGlobalConfig()
    }, [inViewport])

    const formValues = useCreation(() => {
        let value
        if (!!item) {
            value = {
                Type: item.Provider.Type,
                model_type: aiModelType,

                api_key: item.Provider.APIKey,
                api_key_id: item.ProviderId,

                model: item.ModelName,

                no_https: item.Provider.NoHttps,
                domain: item.Provider.Domain,
                proxy: item.Provider.Proxy
            }
        } else {
            value = {...defaultFormValues}
        }
        return value
    }, [item, aiModelType])

    const getAIGlobalConfig = useMemoizedFn(() => {
        grpcGetAIGlobalConfig().then((res) => {
            aiGlobalConfigRef.current = res
            if (!!item) {
                // 编辑时，需要先保存该模型的配置在列表的下标，后续更新时需要用到
                const fileName = !!aiModelType ? getFileNameByModelType(aiModelType) : ""
                if (!fileName) return
                const index = (aiGlobalConfigRef.current[fileName] || []).findIndex((i) => isEqualAIModel(i, item))
                currentIndexInConfigRef.current = index
            }
        })
    })

    const onOk = useMemoizedFn(() => {
        formRef.current?.form?.validateFields().then((res) => {
            if (!aiGlobalConfigRef.current) {
                yakitNotify("error", "AI全局配置获取失败，请稍后再试")
                return
            }

            const newItem: AIModelConfig = {
                ProviderId: res.api_key_id,
                Provider: {
                    Type: res.Type,
                    APIKey: res.api_key,
                    Domain: res.domain,
                    Proxy: res.proxy,
                    NoHttps: res.no_https,
                    ExtraParams: []
                    /** 下面这些字段ai中没有 */
                    // UserIdentifier: "",
                    // UserSecret: "",
                    // Namespace: "",
                    // WebhookURL: "",
                    // Disabled: false
                },
                ModelName: res.model,
                ExtraParams: []
            }
            const setConfigOptions = {
                modelType: res.model_type,
                aiModelName: newItem.ModelName
            }
            if (isAdd) {
                onAdd(newItem, setConfigOptions)
            } else {
                onUpdate(newItem, setConfigOptions)
            }
        })
    })
    const onAdd = useMemoizedFn((newItem: AIModelConfig, options: AIModelFormAddOptions) => {
        if (!aiGlobalConfigRef.current) return
        const {modelType, aiModelName} = options
        const newConfig: AIGlobalConfig = cloneDeep(aiGlobalConfigRef.current)

        const fileName = getFileNameByModelType(modelType)
        if (!fileName) return
        const index = newConfig[fileName].findIndex((i) => isEqualAIModel(i, newItem))
        if (index !== -1) {
            yakitNotify("error", "已存在相同配置的AI模型，请勿重复添加")
            return
        }
        newConfig[fileName].push(newItem)
        onSetAIGlobalConfig(newConfig, {
            aiService: newItem.Provider.Type,
            aiModelName
        })
    })

    const onUpdate = useMemoizedFn((newItem: AIModelConfig, options: AIModelFormUpdateOptions) => {
        try {
            if (!aiGlobalConfigRef.current || currentIndexInConfigRef.current === -1) return

            const {modelType, aiModelName} = options
            const newConfig: AIGlobalConfig = cloneDeep(aiGlobalConfigRef.current)

            const fileName = getFileNameByModelType(modelType)
            if (!fileName) return
            const item = {
                aiService: newItem.Provider.Type,
                aiModelName,
                fileName
            }

            if (!fileName) return
            const oldUpdateItem = aiGlobalConfigRef.current?.[fileName][currentIndexInConfigRef.current]
            const newUpdateItem: AIModelConfig = {
                ...newItem,
                ExtraParams: oldUpdateItem.ExtraParams,
                Provider: {
                    ExtraParams: oldUpdateItem.Provider.ExtraParams,
                    ...newItem.Provider
                }
            }
            debugger
            if (aiModelType !== modelType) {
                const isHave = newConfig[fileName].find((i) => isEqualAIModel(i, newUpdateItem))
                if (isHave) {
                    yakitNotify("error", "已存在相同配置的AI模型，请勿重复添加")
                    return
                }
                // 修改了模型类型,需要先把原来模型从列表中删除,然后再新的列表末尾添加
                const oldFileName = getFileNameByModelType(aiModelType!)
                if (!oldFileName) return
                newConfig[oldFileName].splice(currentIndexInConfigRef.current, 1)

                newConfig[fileName].push(newUpdateItem)
            } else {
                newConfig[fileName][currentIndexInConfigRef.current] = newUpdateItem
            }

            onSetAIGlobalConfig(newConfig, item)
        } catch (error) {
            yakitNotify("error", `更新AI模型配置失败:${error}`)
        }
    })
    const onSetAIGlobalConfig = useMemoizedFn((config: AIGlobalConfig, option: AIModelFormSetAIGlobalConfigOptions) => {
        setLoading(true)
        grpcSetAIGlobalConfig(config)
            .then(() => {
                const {aiService, aiModelName, fileName} = option

                onSuccess?.()
                emiter.emit("onRefreshAvailableAIModelList", `${isAdd}`)
                fileName &&
                    emiter.emit(
                        "aiModelSelectChange",
                        JSON.stringify({
                            type: "online",
                            params: {
                                fileName,
                                AIService: aiService,
                                AIModelName: aiModelName
                            }
                        })
                    )
                onClose?.()
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })

    const handleTestAIConfig = useMemoizedFn(() => {
        if (!formRef.current?.form) return
        if (!testPrompt.trim()) {
            yakitNotify("error", "请输入测试内容")
            return
        }

        formRef.current.form.validateFields().then((res: TestAIModelFormValues) => {
            setTestLoading(true)
            grpcTestAIModel(
                {
                    Config: buildTestAIModelConfig(res),
                    Content: testPrompt
                },
                true
            )
                .then((response) => {
                    setTestResult(response)
                })
                .catch((error) => {
                    setTestResult({
                        FirstByteCostMs: 0,
                        TotalCostMs: 0,
                        RawRequest: "",
                        ResponseStatusCode: 0,
                        ResponseContent: "",
                        ErrorMessage: `${error || ""}`
                    })
                })
                .finally(() => {
                    setTimeout(() => {
                        setTestLoading(false)
                    }, 200)
                })
        })
    })

    const testStatus = useCreation(() => {
        if (!testResult) return null
        const isSuccess =
            !testResult.ErrorMessage &&
            testResult.ResponseStatusCode >= 200 &&
            testResult.ResponseStatusCode < 300 &&
            !!testResult.ResponseContent
        return {
            color: isSuccess ? "success" : "danger",
            text: isSuccess ? "测试成功" : "测试失败"
        } as const
    }, [testResult])

    return (
        <NewThirdPartyApplicationConfigBase
            ref={formRef}
            isOnlyShowAiType={true}
            {...props.thirdPartyApplicationConfig}
            formValues={formValues}
            footer={
                <>
                    <div ref={footerRef} />
                    <div className={styles["ai-model-test-panel"]}>
                        <div className={styles["ai-model-test-header"]}>
                            <div className={styles["ai-model-test-title"]}>测试配置</div>
                            {!!testStatus && (
                                <YakitTag size='small' color={testStatus.color}>
                                    {testStatus.text}
                                </YakitTag>
                            )}
                        </div>
                        <div className={styles["ai-model-test-desc"]}>
                            在保存前先发一条测试消息，确认当前第三方 AI 配置是否可用。
                        </div>
                        <YakitInput.TextArea
                            className={styles["ai-model-test-input"]}
                            rows={4}
                            value={testPrompt}
                            onChange={(e) => setTestPrompt(e.target.value)}
                            placeholder='请输入一段测试内容'
                        />
                        <div className={styles["ai-model-test-action"]}>
                            <YakitButton
                                size='large'
                                type='outline2'
                                loading={testLoading}
                                onClick={handleTestAIConfig}
                            >
                                测试
                            </YakitButton>
                        </div>
                        {!!testResult && (
                            <div className={styles["ai-model-test-result"]}>
                                <div className={styles["ai-model-test-metrics"]}>
                                    <div className={styles["ai-model-test-metric"]}>
                                        <div className={styles["ai-model-test-metric-label"]}>首字节延时</div>
                                        <div className={styles["ai-model-test-metric-value"]}>
                                            {testResult.FirstByteCostMs || 0} ms
                                        </div>
                                    </div>
                                    <div className={styles["ai-model-test-metric"]}>
                                        <div className={styles["ai-model-test-metric-label"]}>总耗时</div>
                                        <div className={styles["ai-model-test-metric-value"]}>
                                            {testResult.TotalCostMs || 0} ms
                                        </div>
                                    </div>
                                    <div className={styles["ai-model-test-metric"]}>
                                        <div className={styles["ai-model-test-metric-label"]}>响应状态码</div>
                                        <div className={styles["ai-model-test-metric-value"]}>
                                            {testResult.ResponseStatusCode || 0}
                                        </div>
                                    </div>
                                </div>
                                {!!testResult.ErrorMessage && (
                                    <div className={styles["ai-model-test-error"]}>{testResult.ErrorMessage}</div>
                                )}
                                <div className={styles["ai-model-test-section"]}>
                                    <div className={styles["ai-model-test-section-label"]}>AI响应内容</div>
                                    <YakitInput.TextArea
                                        readOnly
                                        rows={6}
                                        value={testResult.ResponseContent || ""}
                                        className={styles["ai-model-test-output"]}
                                    />
                                </div>
                                <YakitCollapse bordered={false} className={styles["ai-model-test-collapse"]}>
                                    <YakitCollapse.YakitPanel header='原始请求' key='raw-request'>
                                        <YakitInput.TextArea
                                            readOnly
                                            rows={8}
                                            value={testResult.RawRequest || ""}
                                            className={styles["ai-model-test-output"]}
                                        />
                                    </YakitCollapse.YakitPanel>
                                </YakitCollapse>
                            </div>
                        )}
                    </div>
                    <div className={styles["ai-model-form-footer"]}>
                        <YakitButton size='large' type={"primary"} onClick={onOk} loading={loading}>
                            确定添加
                        </YakitButton>
                    </div>
                </>
            }
        />
    )
})

export const AIConfigAPIKeyFormItem: React.FC<AIConfigAPIKeyFormItemProps> = React.memo((props) => {
    const {formProps, aiType} = props
    const [options, setOptions] = useState<YakitAutoCompleteProps["options"]>()
    const [loading, setLoading] = useState<boolean>(false)

    const aiProviderRef = useRef<AIProvider[]>()
    const form = Form.useFormInstance()

    useEffect(() => {
        getOptions(aiType)
    }, [aiType])

    const getOptions = useDebounceFn(
        useMemoizedFn((aiType) => {
            if (!!aiType) {
                setLoading(true)
                grpcQueryAIProviderAll(aiType)
                    .then((res) => {
                        aiProviderRef.current = res.Providers
                        const options: YakitAutoCompleteProps["options"] = res.Providers.map((item) => {
                            return {
                                label: item.Config.APIKey,
                                value: item.Id
                            }
                        }).filter((item) => !!item.value)
                        setOptions(options)
                    })
                    .finally(() => {
                        setTimeout(() => {
                            setLoading(false)
                        }, 200)
                    })
            } else {
                setOptions([])
            }
        }),
        {wait: 200, leading: true}
    ).run
    const onSelect = useMemoizedFn((value: string, option) => {
        const item = aiProviderRef.current?.find((i) => i.Id === value)
        form.setFieldsValue({
            api_key: option.label,
            api_key_id: value,
            domain: item?.Config?.Domain,
            proxy: item?.Config?.Proxy,
            no_https: item?.Config?.NoHttps
        })
    })
    const onClear = useMemoizedFn(() => {
        form.setFieldsValue({
            api_key_id: undefined
        })
    })
    return (
        <>
            <Form.Item
                {...formProps}
                name='api_key'
                help={
                    !!aiType ? (
                        <div style={{height: 30}}>
                            如无法自动获取，请
                            <YakitButton
                                type='text'
                                onClick={() => getOptions(aiType)}
                                style={{padding: 0, fontSize: 14}}
                            >
                                点击刷新
                            </YakitButton>
                            重新获取
                        </div>
                    ) : undefined
                }
            >
                <YakitAutoComplete
                    options={options}
                    dropdownRender={(menu) => {
                        return (
                            <>
                                <YakitSpin spinning={loading}>{menu}</YakitSpin>
                            </>
                        )
                    }}
                    filterOption={(inputValue, option) => {
                        if (option?.label && typeof option?.label === "string") {
                            return option?.label?.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                        }
                        return false
                    }}
                    onSelect={onSelect}
                    onClear={onClear}
                ></YakitAutoComplete>
            </Form.Item>
            <Form.Item name='api_key_id' noStyle style={{display: "none"}}>
                <YakitInput wrapperStyle={{display: "none"}} />
            </Form.Item>
        </>
    )
})
