import React, {useEffect, useRef, useState} from "react"
import {AIModelItemProps, AIModelSelectListProps, AIModelSelectProps, AISelectType} from "./AIModelSelectType"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {useCreation, useDebounceFn, useInViewport, useMemoizedFn} from "ahooks"
import {AIGlobalConfig, AIModelConfig, AIModelTypeFileName, grpcSetAIGlobalConfig, isForcedSetAIModal} from "../utils"
import styles from "./AIModelSelect.module.scss"
import classNames from "classnames"
import {GetAIModelAvailableTotalResponse} from "../../type/aiModel"
import {
    AIAgentTabListEnum,
    AIModelPolicyEnum,
    AIModelPolicyOptions,
    AIModelTypeInterFileNameEnum,
    AIOnlineModelIconMap,
    defaultAIGlobalConfig,
    SwitchAIAgentTabEventEnum
} from "../../defaultConstant"
import {getTipByType, OutlineAtomIconByStatus, setAIModal} from "../AIModelList"
import {AIChatSelect} from "@/pages/ai-re-act/aiReviewRuleSelect/AIReviewRuleSelect"
import useChatIPCDispatcher from "../../useContext/ChatIPCContent/useDispatcher"
import useChatIPCStore from "../../useContext/ChatIPCContent/useStore"
import {OutlineCheckIcon, OutlineCogIcon, OutlineInformationcircleIcon, OutlineRefreshIcon} from "@/assets/icon/outline"
import {cloneDeep, isEqual} from "lodash"
import {AIInputEventHotPatchTypeEnum} from "@/pages/ai-re-act/hooks/grpcApi"
import emiter from "@/utils/eventBus/eventBus"
import {YakitModalConfirm} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {Avatar, Tooltip} from "antd"
import {AIAgentTriggerEventInfo} from "../../aiAgentType"
import {yakitNotify} from "@/utils/notification"
import {YakitRoute} from "@/enums/yakitRoute"
import {usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

export const onOpenConfigModal = (mountContainer, t: any) => {
    const m = YakitModalConfirm({
        title: t("AIAgent.AIModelSelect.configTitle", { ns: "aiAgent" }),
        width: 420,
        onOkText: t("AIAgent.AIModelSelect.toConfigure", { ns: "aiAgent" }),
        content: <div>{t("AIAgent.AIModelSelect.configDesc", { ns: "aiAgent" })}</div>,
        closable: false,
        maskClosable: false,
        keyboard: false,
        cancelButtonProps: {style: {display: "none"}},
        getContainer: mountContainer,
        onOk: () => {
            setAIModal({
                mountContainer,
                t,
                onSuccess: () => {
                    setTimeout(() => {
                        emiter.emit("onRefreshAIModelList")
                    }, 200)
                }
            })
            m.destroy()
        }
    })
}

const modelType = (t: any) => [
    t("AIAgent.AIModelList.intelligentModels", { ns: "aiAgent" }),
    t("AIAgent.AIModelList.lightweightModels", { ns: "aiAgent" }),
    t("AIAgent.AIModelList.visionModels", { ns: "aiAgent" })
]
export const AIModelSelect: React.FC<AIModelSelectProps> = React.memo((props) => {
    const { t } = useI18nNamespaces(["aiAgent"])
    const {isOpen = true, mountContainer} = props

    const currentRouteKey = usePageInfo((state) => state.getCurrentPageTabRouteKey(), shallow)
    //#region AI model
    const {chatIPCData} = useChatIPCStore()
    const {handleSendConfigHotpatch} = useChatIPCDispatcher()

    const [aiType, setAIType] = useState<AISelectType>("online") //暂时只有online，后续会加"local"

    const [aiModelOptions, setAIModelOptions] = useState<GetAIModelAvailableTotalResponse>({
        onlineModelsTotal: 0,
        localModelsTotal: 0,
        onlineModels: cloneDeep(defaultAIGlobalConfig),
        localModels: []
    })
    const [onlineLoading, setOnlineLoading] = useState<boolean>(false)
    const [open, setOpen] = useState<boolean>(false)

    const refRef = useRef<HTMLDivElement>(null)
    const aiGlobalConfigRef = useRef<AIGlobalConfig>()
    const [inViewport = true] = useInViewport(refRef)

    useEffect(() => {
        if (!inViewport) return
        getAIModelListOption()
        emiter.on("onRefreshAvailableAIModelList", onRefreshAvailableAIModelList)
        emiter.on("aiModelSelectChange", onAIModelSelectChange)
        return () => {
            emiter.off("onRefreshAvailableAIModelList", onRefreshAvailableAIModelList)
            emiter.off("aiModelSelectChange", onAIModelSelectChange)
        }
    }, [inViewport])

    const onRefreshAvailableAIModelList = useMemoizedFn(() => {
        setOnlineLoading(true)
        getAIModelListOption()
    })

    /**外界ai模型的执行变化,触发里面的热更新 */
    const onAIModelSelectChange = useMemoizedFn((res: string) => {
        try {
            const data: AIAgentTriggerEventInfo = JSON.parse(res)
            const {type, params} = data
            setAIType(type as AISelectType)
            const fileName = params?.fileName as AIModelTypeFileName
            if (execute) {
                if (fileName === AIModelTypeInterFileNameEnum.IntelligentModels) {
                    handleSendConfigHotpatch({
                        hotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_AIService,
                        params: {
                            AIService: params?.AIService || "",
                            AIModelName: params?.AIModelName || ""
                        }
                    })
                }
            } else {
                onRefreshAvailableAIModelList()
            }
        } catch (error) {}
    })

    const getAIModelListOption = useDebounceFn(
        () => {
            isForcedSetAIModal({
                t,
                haveDataCall: (res) => {
                    setAIModelOptions(res)
                    aiGlobalConfigRef.current = cloneDeep(res.onlineModels)
                },
                pageKey: "ai-agent",
                isOpen: isOpen,
                mountContainer: document.getElementById("main-operator-page-body-ai-agent")
            }).finally(() => {
                setTimeout(() => {
                    setOnlineLoading(false)
                }, 200)
            })
        },
        {wait: 200, leading: true}
    ).run

    const onSetGlobalConfig = useMemoizedFn(() => {
        grpcSetAIGlobalConfig(aiModelOptions.onlineModels).then(() => {
            setAIModelOptions((v) => ({...v, onlineModels: cloneDeep(aiModelOptions.onlineModels)}))
            aiGlobalConfigRef.current = cloneDeep(aiModelOptions.onlineModels)
            emiter.emit("onRefreshAIModelList")
        })
    })
    const onSetOpen = useMemoizedFn((v: boolean) => {
        setOpen(v)

        switch (aiType) {
            case "online":
                if (!v) {
                    if (isEqual(aiGlobalConfigRef.current, aiModelOptions.onlineModels)) break
                    if (execute) {
                        onHotpatchAI()
                    } else {
                        onSetGlobalConfig()
                    }
                }
                break

            default:
                break
        }
    })
    /**热更新ai配置,热更新只支持 intelligentModels */
    const onHotpatchAI = useMemoizedFn(() => {
        if (intelligentModels.length === 0) return
        if (execute) {
            handleSendConfigHotpatch({
                hotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_AIService,
                params: {
                    AIService: intelligentModels[0]?.Provider.Type || "",
                    AIModelName: intelligentModels[0]?.ModelName || ""
                }
            })
            setTimeout(() => {
                getAIModelListOption()
                emiter.emit("onRefreshAIModelList")
            }, 500)
        }
    })

    const isHaveData = useCreation(() => {
        return aiModelOptions.onlineModelsTotal > 0 || aiModelOptions.localModels.length > 0
    }, [aiModelOptions.onlineModelsTotal, aiModelOptions.localModels.length])

    //#endregion

    const renderContent = useMemoizedFn(() => {
        switch (aiType) {
            case "online":
                return (
                    <>
                        <YakitSelect.Option
                            value='select'
                            label={
                                <div className={styles["select-option"]}>
                                    {selectList.length > 1 ? (
                                        <Avatar.Group>
                                            {selectList.map((item, index) => (
                                                <Tooltip key={index} title={`${modelType(t)[index]}:${item.ModelName}`}>
                                                    <Avatar
                                                        className={styles["model-item"]}
                                                        icon={getIconByAI(item.Provider.Type)}
                                                        size='small'
                                                    />
                                                </Tooltip>
                                            ))}
                                        </Avatar.Group>
                                    ) : (
                                        <>
                                            {getIconByAI(selectList[0]?.Provider.Type)}
                                            <span
                                                className={styles["select-option-text"]}
                                                title={`${selectList[0]?.ModelName}`}
                                            >
                                                {selectList[0]?.ModelName}
                                            </span>
                                        </>
                                    )}
                                </div>
                            }
                        >
                            {selectList.length}
                        </YakitSelect.Option>
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
    const intelligentModels = useCreation(() => {
        return aiModelOptions?.onlineModels?.IntelligentModels || []
    }, [aiModelOptions?.onlineModels?.IntelligentModels])
    const lightweightModels = useCreation(() => {
        return aiModelOptions?.onlineModels?.LightweightModels || []
    }, [aiModelOptions?.onlineModels?.LightweightModels])
    const visionModels = useCreation(() => {
        return aiModelOptions?.onlineModels?.VisionModels || []
    }, [aiModelOptions?.onlineModels?.VisionModels])
    const policy: AIModelPolicyEnum = useCreation(() => {
        return aiModelOptions?.onlineModels?.RoutingPolicy as AIModelPolicyEnum
    }, [aiModelOptions?.onlineModels?.RoutingPolicy])

    const selectList = useCreation(() => {
        const intelligentItem = intelligentModels[0]
        const lightweightItem = lightweightModels[0]
        const visionItem = visionModels[0]
        const list: AIModelConfig[] = []
        // 顺序按照高质、轻量、视觉的优先级展示
        intelligentItem && list.push(intelligentItem)
        lightweightItem && list.push(lightweightItem)
        visionItem && list.push(visionItem)
        return list
    }, [intelligentModels, lightweightModels, visionModels])
    const execute = useCreation(() => {
        return chatIPCData.execute
    }, [chatIPCData.execute])
    const onSelectPolicy = useMemoizedFn((value) => {
        setAIModelOptions((old) => {
            return {
                ...old,
                onlineModels: {
                    ...old.onlineModels,
                    RoutingPolicy: value
                }
            }
        })
    })
    const onAddModel = useMemoizedFn(() => {
        setAIModal({
            mountContainer,
            t,
            onSuccess: () => {
                emiter.emit("onRefreshAIModelList")
            }
        })
    })
    const onSelect = useMemoizedFn(
        (
            item: AIModelConfig,
            options: {
                fileName: AIModelTypeFileName
                index: number
            }
        ) => {
            const {fileName, index} = options
            setAIModelOptions((old) => {
                const newList = [...old.onlineModels[fileName]]
                newList.splice(index, 1)
                newList.unshift(item)
                return {
                    ...old,
                    onlineModels: {
                        ...old.onlineModels,
                        [fileName]: newList
                    }
                }
            })
        }
    )
    const openModelTab = useMemoizedFn(() => {
        if (currentRouteKey !== YakitRoute.AI_Agent) {
            emiter.emit(
                "openPage",
                JSON.stringify({
                    route: YakitRoute.AI_Agent
                })
            )
            setTimeout(() => {
                onSwitchAIAgentTab()
            }, 100)
        } else {
            onSwitchAIAgentTab()
        }

        yakitNotify("success", t("AIAgent.AIModelSelect.openModelTabSuccess", { ns: "aiAgent" }))
    })
    const onSwitchAIAgentTab = useMemoizedFn(() => {
        emiter.emit(
            "switchAIAgentTab",
            JSON.stringify({
                type: SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE,
                params: {
                    active: AIAgentTabListEnum.AI_Model,
                    show: true
                }
            })
        )
    })
    return (
        <div ref={refRef}>
            {isHaveData ? (
                <AIChatSelect
                    dropdownRender={(menu) => {
                        return (
                            <div className={styles["drop-select-wrapper"]}>
                                <div className={styles["select-title"]}>
                                    <div className={styles["select-title-left"]}>
                                        <span>{t("AIAgent.AIModelSelect.selectModel", { ns: "aiAgent" })}</span>
                                        {!execute && (
                                            <YakitSelect
                                                size='small'
                                                disabled={execute}
                                                options={AIModelPolicyOptions(t)}
                                                value={policy}
                                                onSelect={onSelectPolicy}
                                                wrapperClassName={styles["select-policy-wrapper"]}
                                                dropdownClassName={styles["select-policy-dropdown"]}
                                                wrapperStyle={{width: 80, marginRight: 4}}
                                                dropdownMatchSelectWidth={false}
                                            />
                                        )}
                                        <Tooltip title={getTipByType(policy, t)}>
                                            <OutlineInformationcircleIcon className={styles["icon-info"]} />
                                        </Tooltip>
                                    </div>
                                    <div className={styles["select-title-right"]}>
                                        <Tooltip title={t("AIAgent.AIModelSelect.openConfigTooltip", { ns: "aiAgent" })}>
                                            <YakitButton
                                                size='small'
                                                type='text2'
                                                icon={<OutlineCogIcon />}
                                                onClick={openModelTab}
                                            />
                                        </Tooltip>
                                        {aiType === "online" && (
                                            <Tooltip title={t("AIAgent.AIModelSelect.refresh", { ns: "aiAgent" })}>
                                                <YakitButton
                                                    size='small'
                                                    type='text2'
                                                    icon={<OutlineRefreshIcon />}
                                                    loading={onlineLoading}
                                                    onClick={() => onRefreshAvailableAIModelList()}
                                                />
                                            </Tooltip>
                                        )}
                                    </div>
                                </div>
                                <div className={styles["select-content"]}>
                                    {!!intelligentModels.length && (
                                        <AIModelSelectList
                                            title={t("AIAgent.AIModelList.intelligentModels", { ns: "aiAgent" })}
                                            subTitle={t("AIAgent.AIModelList.intelligentModelsDesc", { ns: "aiAgent" })}
                                            list={intelligentModels}
                                            onSelect={(item, index) =>
                                                onSelect(item, {
                                                    fileName: AIModelTypeInterFileNameEnum.IntelligentModels,
                                                    index
                                                })
                                            }
                                        />
                                    )}
                                    {!execute && !!lightweightModels.length && (
                                        <AIModelSelectList
                                            title={t("AIAgent.AIModelList.lightweightModels", { ns: "aiAgent" })}
                                            subTitle={t("AIAgent.AIModelList.lightweightModelsDesc", { ns: "aiAgent" })}
                                            list={lightweightModels}
                                            onSelect={(item, index) =>
                                                onSelect(item, {
                                                    fileName: AIModelTypeInterFileNameEnum.LightweightModels,
                                                    index
                                                })
                                            }
                                        />
                                    )}
                                    {!execute && !!visionModels.length && (
                                        <AIModelSelectList
                                            title={t("AIAgent.AIModelList.visionModels", { ns: "aiAgent" })}
                                            subTitle={t("AIAgent.AIModelList.visionModelsDesc", { ns: "aiAgent" })}
                                            list={visionModels}
                                            onSelect={(item, index) =>
                                                onSelect(item, {
                                                    fileName: AIModelTypeInterFileNameEnum.VisionModels,
                                                    index
                                                })
                                            }
                                        />
                                    )}
                                </div>
                                <YakitButton type='secondary2' onClick={onAddModel} className={styles["add-model-btn"]}>
                                    {t("AIAgent.AIModelList.addModel", { ns: "aiAgent" })}
                                </YakitButton>
                            </div>
                        )
                    }}
                    // getList={() => getAIModelListOption()}
                    open={open}
                    setOpen={onSetOpen}
                    optionLabelProp='label'
                    value='select'
                >
                    {renderContent()}
                </AIChatSelect>
            ) : (
                <></>
            )}
        </div>
    )
})

const AIModelSelectList: React.FC<AIModelSelectListProps> = React.memo((props) => {
    const {title, subTitle, list, onSelect} = props
    return (
        <div className={styles["ai-model-select-list-wrapper"]}>
            <div className={styles["ai-model-select-list-wrapper-header"]}>
                <div className={styles["ai-model-select-list-wrapper-header-title"]}>
                    {title}
                    <Tooltip title={subTitle}>
                        <OutlineInformationcircleIcon className={styles["icon-info"]} />
                    </Tooltip>
                </div>
            </div>
            <div className={styles["ai-online-model-list"]}>
                {list.map((item, index) => (
                    <div
                        key={index}
                        className={classNames(styles["ai-online-model-list-row"])}
                        onClick={() => onSelect(item, index)}
                    >
                        <AIModelItem value={item.ModelName} aiService={item.Provider.Type} checked={index === 0} />
                    </div>
                ))}
            </div>
        </div>
    )
})

export const getIconByAI = (value) => {
    return AIOnlineModelIconMap[value] || <OutlineAtomIconByStatus isRunning={true} size='small' />
}
const AIModelItem: React.FC<AIModelItemProps> = React.memo((props) => {
    const {value, aiService, checked} = props
    const icon = useCreation(() => {
        if (!aiService) return <></>
        return getIconByAI(aiService)
    }, [aiService])

    return (
        <div className={classNames(styles["select-option-wrapper"])}>
            <div className={styles["select-option-left"]}>
                {icon}
                <div className={styles["option-text"]} title={value}>
                    {value}
                </div>
            </div>
            {checked && <OutlineCheckIcon className={styles["check-icon"]} />}
        </div>
    )
})
