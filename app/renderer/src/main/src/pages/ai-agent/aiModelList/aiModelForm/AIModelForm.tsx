import React, {useEffect, useRef, useState} from "react"
import {
    AIConfigAPIKeyFormItemProps,
    AIModelCheckResultProps,
    AIModelFormAddOptions,
    AIModelFormProps,
    AIModelFormSetAIGlobalConfigOptions,
    AIModelFormUpdateOptions
} from "./AIModelFormType"
import {useCreation, useDebounceFn, useInViewport, useMemoizedFn} from "ahooks"
import {Form, FormInstance} from "antd"
import {NewAIThirdPartyApplicationConfigBase} from "@/components/configNetwork/NewThirdPartyApplicationConfig"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    AIGlobalConfig,
    AIModelConfig,
    AIModelTypeFileName,
    AIProvider,
    DEFAULT_AI_API_TYPE,
    grpcGetAIGlobalConfig,
    grpcQueryAIProviderAll,
    grpcSetAIGlobalConfig,
    grpcAIConfigHealthCheck,
    normalizeAIAPIType,
    AIConfigHealthCheckResponse
} from "../utils"
import {YakitAutoComplete} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {YakitAutoCompleteProps} from "@/components/yakitUI/YakitAutoComplete/YakitAutoCompleteType"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {AIModelTypeEnum, AIModelTypeInterFileNameEnum} from "../../defaultConstant"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {yakitNotify} from "@/utils/notification"
import emiter from "@/utils/eventBus/eventBus"
import {cloneDeep} from "lodash"
import {ThirdPartyApplicationConfig} from "@/components/configNetwork/ConfigNetworkPage"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import styles from "./AIModelForm.module.scss"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitTagColor} from "@/components/yakitUI/YakitTag/YakitTagType"
import {OutlineXIcon} from "@/assets/icon/outline"
import {HorizontalScrollCard} from "@/pages/plugins/operator/horizontalScrollCard/HorizontalScrollCard"
import {HoldGRPCStreamProps} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {NewHTTPPacketEditor, RenderTypeOptionVal} from "@/utils/editors"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {setRemoteValue} from "@/utils/kv"
import {RemoteAIAgentGV} from "@/enums/aiAgent"

const defaultFormValues = {
    Type: "",
    api_type: DEFAULT_AI_API_TYPE,
    model_type: AIModelTypeEnum.TierIntelligent
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
export const buildAIConfigHealthCheckConfig = (values): ThirdPartyApplicationConfig => {
    const config: ThirdPartyApplicationConfig = {
        Type: values.Type || "",
        APIKey: values.api_key || "",
        Domain: values.domain || "",
        Proxy: values.proxy || "",
        NoHttps: !!values.no_https,
        APIType: values.api_type || "",
        ExtraParams: [],
        BaseURL: values.base_url || "",
        Endpoint: values.endpoint || "",
        EnableEndpoint: !!values.enable_endpoint,
        Headers: values.headers || [],
        /** 下面这些字段ai中没有 */
        // UserIdentifier: values.user_identifier || "",
        // UserSecret: values.user_secret || "",
        // Namespace: values.namespace || "",
        // WebhookURL: values.webhook_url || "",
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
        "api_key_id" //测试不需要传这个给后端
    ])

    Object.entries(values).forEach(([key, value]) => {
        if (builtInFieldSet.has(key)) return
        if (value === undefined || value === null || value === "") return
        config.ExtraParams?.push({
            Key: key,
            Value: `${value}`
        })
    })

    if (!config.ExtraParams?.length) {
        delete config.ExtraParams
    }

    return config
}
export const AIModelForm: React.FC<AIModelFormProps> = React.memo((props) => {
    const {item, aiModelType, onSuccess, onClose} = props

    const [loading, setLoading] = useState<boolean>(false)

    const [testLoading, setTestLoading] = useState<boolean>(false)

    const isShowSaveLoadingRef = useRef<boolean>(true)
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
                api_type: normalizeAIAPIType(item.Provider.APIType),
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
                    APIType: normalizeAIAPIType(res.api_type),
                    Domain: res.domain,
                    Proxy: res.proxy,
                    NoHttps: res.no_https,
                    ExtraParams: [],
                    BaseURL: res.base_url,
                    Endpoint: res.endpoint,
                    EnableEndpoint: res.enable_endpoint,
                    Headers: res.headers,
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
            isShowSaveLoadingRef.current = true
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

            if (aiModelType !== modelType) {
                const isHave = newConfig[fileName].find((i) => isEqualAIModel(i, newUpdateItem))
                if (isHave) {
                    isShowSaveLoadingRef.current = true
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
            isShowSaveLoadingRef.current = true
            yakitNotify("error", `更新AI模型配置失败:${error}`)
        }
    })
    const onSetAIGlobalConfig = useMemoizedFn((config: AIGlobalConfig, option: AIModelFormSetAIGlobalConfigOptions) => {
        isShowSaveLoadingRef.current && setLoading(true)
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
                isShowSaveLoadingRef.current = true
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })
    const onCheckAndSave = useMemoizedFn(() => {
        if (!formRef.current?.form) return

        formRef.current.form.validateFields().then((res) => {
            setTestLoading(true)
            const config = buildAIConfigHealthCheckConfig(res)
            grpcAIConfigHealthCheck({
                Config: config,
                Content: "你好,请简单回复'测试成功'"
            })
                .then((response) => {
                    const isSuccess = response.ResponseStatusCode === 200
                    if (isSuccess) {
                        yakitNotify("success", "测试成功")
                        isShowSaveLoadingRef.current = false
                        onOk()
                    } else {
                        onOpenCheckResult(response)
                    }
                })
                .finally(() => {
                    setTimeout(() => {
                        setTestLoading(false)
                    }, 200)
                })
        })
    })
    const onOpenCheckResult = useMemoizedFn((testResult: AIConfigHealthCheckResponse) => {
        const m = showYakitModal({
            hiddenHeader: true,
            type: "white",
            content: <AIModelCheckResult testResult={testResult} onClose={() => m.destroy()} />,
            onOk: () => m.destroy()
        })
    })
    return (
        <NewAIThirdPartyApplicationConfigBase
            ref={formRef}
            {...props.thirdPartyApplicationConfig}
            formValues={formValues}
            footer={
                <>
                    <div ref={footerRef} />
                    <YakitButton size='large' type='outline2' onClick={onCheckAndSave} loading={testLoading}>
                        测试并添加
                    </YakitButton>
                    <YakitButton
                        size='large'
                        type={"primary"}
                        onClick={onOk}
                        loading={loading}
                        disabled={testLoading || !isShowSaveLoadingRef.current}
                    >
                        确定添加
                    </YakitButton>
                </>
            }
        />
    )
})

export const AIModelCheckResult: React.FC<AIModelCheckResultProps> = (props) => {
    const {testResult, onClose} = props

    const {t, i18n} = useI18nNamespaces(["aiAgent"])
    const [currentSelectShowType, setCurrentSelectShowType] = useState<"request" | "response" | "responseContent">("response") //选中的表格项
    const [typeOptionVal, setTypeOptionVal] = useState<RenderTypeOptionVal>()

    const testStatus = useCreation(() => {
        if (!testResult) return null
        const isSuccess = testResult.ResponseStatusCode === 200
        return {
            color: (isSuccess ? "success" : "danger") as YakitTagColor,
            text: isSuccess ? t("AIModelTestResult.testSuccess") : t("AIModelTestResult.testFailed")
        }
    }, [testResult, i18n.language])
    const data: HoldGRPCStreamProps.InfoCards[] = useCreation(() => {
        if (!testResult) return []
        const baseInfo: HoldGRPCStreamProps.InfoCards[] = [
            {
                tag: t("AIModelTestResult.firstByteDelay"),
                info: [
                    {
                        Id: "首字节延时",
                        Data: testResult.FirstByteCostMs ? `${testResult.FirstByteCostMs} ms` : "-",
                        Timestamp: Date.now()
                    }
                ]
            },
            {
                tag: t("AIModelTestResult.totalTime"),
                info: [
                    {
                        Id: "总耗时",
                        Data: testResult.TotalCostMs ? `${testResult.TotalCostMs} ms` : "-",
                        Timestamp: Date.now()
                    }
                ]
            },
            {
                tag: t("AIModelTestResult.responseStatusCode"),
                info: [
                    {
                        Id: "响应状态码",
                        Data: testResult.ResponseStatusCode ? `${testResult.ResponseStatusCode}` : "0",
                        Timestamp: Date.now()
                    }
                ]
            }
        ]
        return baseInfo
    }, [testResult, i18n.language])
    const onTypeOptionValChange = useMemoizedFn((typeOptionVal) => {
        if (typeOptionVal !== undefined) {
            setTypeOptionVal(typeOptionVal)
            setRemoteValue(RemoteAIAgentGV.AIModelCheckResultEditorBeautify, typeOptionVal)
        } else {
            setTypeOptionVal(undefined)
            setRemoteValue(RemoteAIAgentGV.AIModelCheckResultEditorBeautify, "")
        }
    })

    const renderContent = useCreation(() => {
        if (currentSelectShowType === "request") {
            return testResult?.RawRequest || ""
        } else if (currentSelectShowType === "response") {
            return testResult?.RawResponse || ""
        } else if (currentSelectShowType === "responseContent") {
            return testResult?.ResponseContent || ""
        }
        return ""
    }, [currentSelectShowType, testResult])
    return (
        <div className={styles["test-result-wrapper"]}>
            <div className={styles["test-result-heard"]}>
                <div className={styles["test-result-title"]}>
                    <span className={styles["title"]}> {t("AIModelTestResult.modelTesting")}</span>
                    <YakitTag className={styles["tag"]} color={testStatus?.color}>
                        {testStatus?.text}
                    </YakitTag>
                    {testResult?.ErrorMessage && (
                        <span className={styles["tip"]} title={testResult?.ErrorMessage}>
                            {testResult?.ErrorMessage}
                        </span>
                    )}
                </div>
                <YakitButton type='text2' size={"middle"} icon={<OutlineXIcon />} onClick={onClose} />
            </div>
            <div className={styles["test-result-content"]}>
                <HorizontalScrollCard hiddenHeard={true} data={data} />
                <div className={styles["test-result-packet"]}>
                    <NewHTTPPacketEditor
                        originValue={renderContent}
                        title={
                            <div className={styles["packet-title-wrapper"]}>
                                <span className={styles["packet-title-text"]}>
                                    {t("AIModelTestResult.quickPreview")}
                                </span>
                                <div className={styles["packet-title-btns"]}>
                                    <YakitRadioButtons
                                        size='small'
                                        value={currentSelectShowType}
                                        onChange={(e) => {
                                            setCurrentSelectShowType(e.target.value)
                                        }}
                                        buttonStyle='solid'
                                        options={[
                                            {
                                                value: "request",
                                                label: t("AIModelTestResult.request")
                                            },
                                            {
                                                value: "response",
                                                label: t("AIModelTestResult.response")
                                            },
                                            {
                                                value: "responseContent",
                                                label: t("AIModelTestResult.responseContent")
                                            }
                                        ]}
                                    />
                                </div>
                            </div>
                        }
                        readOnly={true}
                        noMinimap={true}
                        isResponse={true}
                        typeOptionVal={typeOptionVal}
                        onTypeOptionVal={onTypeOptionValChange}
                    />
                </div>
            </div>
        </div>
    )
}

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
            api_type: normalizeAIAPIType(item?.Config?.APIType),
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
                />
            </Form.Item>
            <Form.Item name='api_key_id' noStyle style={{display: "none"}}>
                <YakitInput wrapperStyle={{display: "none"}} />
            </Form.Item>
        </>
    )
})
