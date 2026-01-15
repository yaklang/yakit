import React, {useEffect, useRef, useState} from "react"
import {AIModelItemProps, AIModelSelectProps, AISelectType} from "./AIModelSelectType"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {useCreation, useDebounceFn, useInViewport, useMemoizedFn} from "ahooks"
import useAIAgentDispatcher from "../../useContext/useDispatcher"
import {grpcListAiModel, isForcedSetAIModal} from "../utils"
import styles from "./AIModelSelect.module.scss"
import classNames from "classnames"
import {GetAIModelListResponse} from "../../type/aiModel"
import {AIOnlineModelIconMap} from "../../defaultConstant"
import {OutlineAtomIconByStatus, setAIModal} from "../AIModelList"
import useAIAgentStore from "../../useContext/useStore"
import {AIChatSelect} from "@/pages/ai-re-act/aiReviewRuleSelect/AIReviewRuleSelect"
import useChatIPCDispatcher from "../../useContext/ChatIPCContent/useDispatcher"
import useChatIPCStore from "../../useContext/ChatIPCContent/useStore"
import {OutlineInformationcircleIcon, OutlineRefreshIcon} from "@/assets/icon/outline"
import {
    apiGetGlobalNetworkConfig,
    apiGetThirdPartyAppConfigTemplate,
    apiSetGlobalNetworkConfig,
    handleAIConfig
} from "@/pages/spaceEngine/utils"
import {isEqual} from "lodash"
import {AIInputEventHotPatchTypeEnum, AIStartParams} from "@/pages/ai-re-act/hooks/grpcApi"
import emiter from "@/utils/eventBus/eventBus"
import {YakitModalConfirm} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {getRemoteValue} from "@/utils/kv"
import {RemoteAIAgentGV} from "@/enums/aiAgent"
import {AIAgentSetting, AIAgentTriggerEventInfo} from "../../aiAgentType"
import {GlobalNetworkConfig, ThirdPartyApplicationConfig} from "@/components/configNetwork/ConfigNetworkPage"
import {YakitSelectProps} from "@/components/yakitUI/YakitSelect/YakitSelectType"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {LoadingOutlined} from "@ant-design/icons"
import {Tooltip} from "antd"

export const onOpenConfigModal = () => {
    const m = YakitModalConfirm({
        title: "AI 模型未配置",
        width: 420,
        onOkText: "去配置",
        cancelButtonProps: {style: {display: "none"}},
        content: <div>无可使用AI模型，请配置后使用</div>,
        closable: false,
        maskClosable: false,
        onOk: () => {
            apiGetGlobalNetworkConfig().then((obj) => {
                setAIModal({
                    config: obj,
                    onSuccess: () => {
                        setTimeout(() => {
                            emiter.emit("onRefreshAIModelList")
                        }, 200)
                    }
                })
                m.destroy()
            })
        }
    })
}

export const AIModelSelect: React.FC<AIModelSelectProps> = React.memo((props) => {
    //#region AI model
    const {setting} = useAIAgentStore()
    const {setSetting} = useAIAgentDispatcher()
    const {chatIPCData} = useChatIPCStore()
    const {handleSendConfigHotpatch} = useChatIPCDispatcher()

    const [aiType, setAIType] = useState<AISelectType>("online") //暂时只有online，后续会加"local"

    const [aiModelOptions, setAIModelOptions] = useState<GetAIModelListResponse>({
        onlineModels: [],
        localModels: []
    })
    const [onlineLoading, setOnlineLoading] = useState<boolean>(false)
    const [modelNames, setModelNames] = useState<YakitSelectProps["options"]>([])
    const [open, setOpen] = useState<boolean>(false)

    const refRef = useRef<HTMLDivElement>(null)
    const globalNetworkConfigRef = useRef<GlobalNetworkConfig>()
    const modelDefaultValueRef = useRef<string>("") // ai类型对应的默认模型名称
    const [inViewport = true] = useInViewport(refRef)

    const modelValue = useCreation(() => {
        if (aiType === "online") return setting?.AIModelName
        return "" // 其他type暂未确定
    }, [aiType, setting?.AIModelName])
    const perSelect = useRef<AIStartParams["AIService"]>(modelValue)

    useEffect(() => {
        if (!inViewport) return
        getRemoteValue(RemoteAIAgentGV.AIAgentChatSetting)
            .then((res) => {
                if (!res) {
                    getAIModelListOption(true)
                    return
                }
                try {
                    const cache = JSON.parse(res) as AIAgentSetting
                    if (typeof cache !== "object") return
                    getAIModelListOption(!cache.AIModelName)
                } catch (error) {}
            })
            .catch(() => {})
        emiter.on("onRefreshAvailableAIModelList", onRefreshAvailableAIModelList)
        emiter.on("aiModelSelectChange", onAIModelSelectChange)
        return () => {
            emiter.off("onRefreshAvailableAIModelList", onRefreshAvailableAIModelList)
            emiter.off("aiModelSelectChange", onAIModelSelectChange)
        }
    }, [inViewport])

    useEffect(() => {
        if (open || (modelNames?.length === 0 && setting?.AIService)) getModelNameOption()
    }, [open, setting?.AIService])

    const getModelNameOption = useDebounceFn(
        useMemoizedFn(async () => {
            if (!setting?.AIService) return
            try {
                setOnlineLoading(true)
                await getGlobalConfig()
                const templatesRes = await apiGetThirdPartyAppConfigTemplate()
                const currentAI = globalNetworkConfigRef.current?.AppConfigs.find(
                    (item) => item.Type === setting.AIService
                )
                const currentTemplate = templatesRes.Templates.find((item) => item.Name === setting.AIService)
                if (!currentTemplate || !currentAI?.APIKey) return
                let params = {
                    Type: setting.AIService,
                    api_key: currentAI?.APIKey,
                    domain: "",
                    no_https: false,
                    proxy: ""
                }
                currentAI?.ExtraParams?.forEach((ele) => {
                    if (!!ele.Value) {
                        if (ele.Key === "api_key") {
                            params.api_key = ele.Value
                        }
                        if (ele.Key === "domain") {
                            params.domain = ele.Value
                        }
                        if (ele.Key === "no_https") {
                            params.no_https = ele.Value === "true"
                        }
                        if (ele.Key === "proxy") {
                            params.proxy = ele.Value
                        }
                    }
                })
                const models = await grpcListAiModel({Config: JSON.stringify(params)})
                let modalNameList: YakitSelectProps["options"] = models.ModelName.map((modelName: string) => ({
                    label: modelName,
                    value: modelName
                })).sort((a, b) => a.value.length - b.value.length)
                const modelDefaultValue = currentTemplate.Items.find(
                    (item) => currentTemplate.Type === "ai" && item.Type === "list" && item.Name === "model"
                )?.DefaultValue
                const newOptions = modalNameList.filter((item) => item.value !== modelDefaultValue)
                if (!!modelDefaultValue) {
                    modelDefaultValueRef.current = modelDefaultValue
                    newOptions.unshift({label: modelDefaultValue, value: modelDefaultValue})
                }
                setModelNames(newOptions)
            } catch (error) {
            } finally {
                setTimeout(() => {
                    setOnlineLoading(false)
                }, 50)
            }
        }),
        {wait: 200}
    ).run
    const getGlobalConfig = useMemoizedFn(async () => {
        try {
            const globalConfig = await apiGetGlobalNetworkConfig()
            globalNetworkConfigRef.current = globalConfig
        } catch (error) {}
    })
    const onRefreshAvailableAIModelList = useMemoizedFn((data?: string) => {
        getGlobalConfig()
        getAIModelListOption(data === "true")
    })
    const getAIModelListOption = useDebounceFn(
        (refreshValue?: boolean) => {
            isForcedSetAIModal({
                noDataCall: () => {
                    setSetting &&
                        setSetting((old) => ({
                            ...old,
                            AIService: "",
                            AIModelName: ""
                        }))
                },
                haveDataCall: (res) => {
                    setAIModelOptions(res)
                    refreshValue && onInitValue(res)
                }
            })
        },
        {wait: 200, leading: true}
    ).run

    const onInitValue = useMemoizedFn((res) => {
        if (res && res.onlineModels.length > 0) {
            const currentAI: ThirdPartyApplicationConfig = res.onlineModels[0]
            const modelName = currentAI.ExtraParams?.find((ele) => ele.Key === "model")?.Value || ""
            setSetting &&
                setSetting((old) => ({
                    ...old,
                    AIService: currentAI.Type as string,
                    AIModelName: modelName
                }))
        } else if (res && res.localModels.length > 0) {
            onSelectModel((res.localModels[0].Name as string) || "", "local")
        }
    })

    const onSelectModel = useMemoizedFn((value: string, type: AISelectType) => {
        switch (type) {
            case "online":
                setSetting &&
                    setSetting((old) => ({
                        ...old,
                        AIModelName: value
                    }))
                onSetGlobalConfig(value)
                break
            case "local":
                // TODO -
                // setSetting && setSetting((old) => ({...old, AIService: value}))
                break
            default:
                break
        }
    })

    const onSetGlobalConfig = useMemoizedFn((data: string) => {
        if (!globalNetworkConfigRef.current) return
        const currentAI = globalNetworkConfigRef.current.AppConfigs.find((item) => item.Type === setting.AIService)
        if (!currentAI) return

        const extraParams = currentAI.ExtraParams?.map((ele) => {
            return ele.Key === "model" ? {...ele, Value: data} : ele
        })
        const params = {
            Type: currentAI.Type,
            ExtraParams: extraParams
        }
        const config = handleAIConfig(
            {
                AppConfigs: globalNetworkConfigRef.current.AppConfigs,
                AiApiPriority: globalNetworkConfigRef.current.AiApiPriority
            },
            params
        )
        apiSetGlobalNetworkConfig({...globalNetworkConfigRef.current, ...config}).then(() => {
            emiter.emit("onRefreshAIModelList")
        })
    })
    const onSetOpen = useMemoizedFn((v: boolean) => {
        setOpen(v)
        if (!v && chatIPCData.execute && modelValue && !isEqual(perSelect.current, modelValue)) {
            switch (aiType) {
                case "online":
                    onHotpatchAIModelName(modelValue)
                    break
                // TODO -
                // case "local":
                //     onHotpatchAIService(modelValue)
                //     break

                default:
                    break
            }
        }
        if (v) perSelect.current = modelValue
    })
    const onAIModelSelectChange = useMemoizedFn((res: string) => {
        try {
            const data: AIAgentTriggerEventInfo = JSON.parse(res)
            const {type, params} = data
            setAIType(type as AISelectType)
            if (!!params?.AIService) {
                onHotpatchAIService(params.AIService)
                params?.setting && setSetting?.((old) => ({...old, AIService: params.AIService}))
            }
            if (!!params?.AIModelName) {
                onHotpatchAIModelName(params.AIModelName)
                params?.setting && setSetting?.((old) => ({...old, AIModelName: params.AIModelName}))
            }
        } catch (error) {}
    })
    const onHotpatchAIModelName = useMemoizedFn((modelNameValue: string) => {
        if (chatIPCData.execute) {
            handleSendConfigHotpatch({
                hotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_AIModelName,
                params: {
                    AIModelName: modelNameValue
                }
            })
        }
    })
    const onHotpatchAIService = useMemoizedFn((aiServiceValue: string) => {
        if (chatIPCData.execute) {
            handleSendConfigHotpatch({
                hotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_AIService,
                params: {
                    AIService: aiServiceValue
                }
            })
        }
    })

    const isHaveData = useCreation(() => {
        return !!modelValue || (modelNames?.length || 0) > 0 || aiModelOptions.localModels.length > 0
    }, [modelValue, modelNames?.length, aiModelOptions.localModels.length])

    //#endregion

    const renderContent = useMemoizedFn(() => {
        switch (aiType) {
            case "online":
                return (
                    <>
                        {modelNames?.map((nodeItem) => (
                            <YakitSelect.Option key={nodeItem.value} value={nodeItem.value}>
                                <AIModelItem value={`${nodeItem.value}`} aiService={setting?.AIService} />
                            </YakitSelect.Option>
                        ))}
                    </>
                )
            // TODO -
            // case "local":
            //     return (
            //         <>
            //             {aiModelOptions.localModels.map((nodeItem) => (
            //                 <YakitSelect.Option key={nodeItem.Name} value={nodeItem.Name}>
            //                     <AIModelItem value={nodeItem.Name} />
            //                 </YakitSelect.Option>
            //             ))}
            //         </>
            //     )
            default:
                return <></>
        }
    })
    return (
        <>
            <div ref={refRef} />
            {isHaveData ? (
                <AIChatSelect
                    value={modelValue}
                    onSelect={(v) => onSelectModel(v, aiType)}
                    dropdownRender={(menu) => {
                        return (
                            <div className={styles["drop-select-wrapper"]}>
                                <div className={styles["select-title"]}>
                                    <div className={styles["select-title-left"]}>
                                        AI 模型选择
                                        {onlineLoading && <LoadingOutlined spin />}
                                    </div>
                                    {aiType === "online" && (
                                        <YakitButton
                                            size='small'
                                            type='text2'
                                            icon={<OutlineRefreshIcon />}
                                            onClick={getModelNameOption}
                                        />
                                    )}
                                </div>
                                {menu}
                            </div>
                        )
                    }}
                    getList={() => getAIModelListOption()}
                    open={open}
                    setOpen={onSetOpen}
                >
                    {renderContent()}
                </AIChatSelect>
            ) : (
                <></>
            )}
        </>
    )
})

const AIModelItem: React.FC<AIModelItemProps> = React.memo((props) => {
    const {value, aiService} = props
    const icon = useCreation(() => {
        if (!aiService) return <></>
        return (
            AIOnlineModelIconMap[aiService] || (
                <OutlineAtomIconByStatus isRunning={true} iconClassName={styles["icon-small"]} />
            )
        )
    }, [aiService])

    return (
        <div className={classNames(styles["select-option-wrapper"])}>
            {icon}
            <div className={styles["option-text"]}>{value}</div>
            {aiService && (
                <Tooltip title={aiService}>
                    <OutlineInformationcircleIcon className={styles["icon-info"]} />
                </Tooltip>
            )}
        </div>
    )
})
