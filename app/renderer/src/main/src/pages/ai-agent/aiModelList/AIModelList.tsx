import React, {forwardRef, useEffect, useImperativeHandle, useRef, useState} from "react"
import {
    AILocalModelListItemPromptHintProps,
    AILocalModelListItemProps,
    AILocalModelListProps,
    AILocalModelListRefProps,
    AILocalModelListWrapperProps,
    AIModelListProps,
    AIModelType,
    AIOnlineModelListItemProps,
    AIOnlineModelListProps,
    AIOnlineModelListRefProps,
    OutlineAtomIconByStatusProps
} from "./AIModelListType"
import styles from "./AIModelList.module.scss"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {useCreation, useDebounceFn, useInViewport, useMemoizedFn, useUpdateEffect} from "ahooks"
import {YakitRadioButtonsProps} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtonsType"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {
    grpcCancelStartLocalModel,
    grpcClearAllModels,
    grpcDeleteLocalModel,
    grpcGetSupportedLocalModels,
    grpcIsLlamaServerReady,
    grpcIsLocalModelReady,
    grpcStopLocalModel,
    reorderApplicationConfig
} from "./utils"
import {LocalModelConfig} from "../type/aiModel"
import {Divider, Tooltip} from "antd"
import {yakitNotify} from "@/utils/notification"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineAtomIcon,
    OutlineChatIcon,
    OutlineClipboardcopyIcon,
    OutlineClouddownloadIcon,
    OutlineDotsverticalIcon,
    OutlineExclamationIcon,
    OutlineExitIcon,
    OutlineLightbulbIcon,
    OutlinePencilaltIcon,
    OutlinePlayIcon,
    OutlinePlusIcon,
    OutlinePlussmIcon,
    OutlineRefreshIcon,
    OutlineTrashIcon,
    OutlineSpeechToTextIcon,
    OutlineCheckIcon
} from "@/assets/icon/outline"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {
    DownloadLlamaServerModelPrompt,
    InstallLlamaServer,
    InstallLlamaServerModelPrompt
} from "./installLlamaServerModelPrompt/InstallLlamaServerModelPrompt"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {AILocalModelTypeEnum, AIOnlineModelIconMap} from "../defaultConstant"
import {randomString} from "@/utils/randomUtil"
import {AIStartModelForm} from "./aiStartModelForm/AIStartModelForm"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {AddAIModel} from "./addAIModel/AddAIModel"
import NewThirdPartyApplicationConfig from "@/components/configNetwork/NewThirdPartyApplicationConfig"
import {handleAIConfig, apiGetGlobalNetworkConfig, apiSetGlobalNetworkConfig} from "@/pages/spaceEngine/utils"
import {GlobalNetworkConfig, ThirdPartyApplicationConfig} from "@/components/configNetwork/ConfigNetworkPage"
import {DragDropContext, Droppable, Draggable} from "@hello-pangea/dnd"
import {SolidDragsortIcon} from "@/assets/icon/solid"
import classNames from "classnames"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {onOpenLocalFileByPath} from "@/pages/notepadManage/notepadManage/utils"
import emiter from "@/utils/eventBus/eventBus"
import {usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import useAIAgentStore from "../useContext/useStore"
import useAIAgentDispatcher from "../useContext/useDispatcher"

export const setAIModal = (params: {
    config: GlobalNetworkConfig
    item?: ThirdPartyApplicationConfig
    onSuccess: () => void
}) => {
    const {config, item, onSuccess} = params
    let formValues
    if (!!item) {
        const extraParams: Record<string, any> = {}
        item.ExtraParams?.forEach((item) => {
            extraParams[item.Key] = item.Value
        })
        formValues = {
            Type: item.Type,
            ...extraParams
        }
    }
    const isAdd = `${!item}`
    let m = showYakitModal({
        title: "添加第三方应用",
        width: 600,
        footer: null,
        closable: true,
        maskClosable: false,
        onCancel: () => {
            // if (config?.AppConfigs?.length === 0) {
            //     emiter.emit("onRefreshAvailableAIModelList", "false")
            // }
            m.destroy()
        },
        content: (
            <>
                <NewThirdPartyApplicationConfig
                    isOnlyShowAiType={true}
                    formValues={formValues}
                    disabledType={!!formValues}
                    onAdd={(data) => {
                        // 新增，有影响ai优化级
                        const params = handleAIConfig(
                            {
                                AppConfigs: config.AppConfigs,
                                AiApiPriority: config.AiApiPriority
                            },
                            data
                        )
                        if (!params) {
                            yakitNotify("error", "setAIModal 参数错误")
                            return
                        }
                        apiSetGlobalNetworkConfig({...config, ...params}).then(() => {
                            onSuccess()
                            emiter.emit("onRefreshAvailableAIModelList", isAdd)
                            emiter.emit(
                                "aiModelSelectChange",
                                JSON.stringify({
                                    type: "online",
                                    params: {
                                        setting: true,
                                        AIService: data.Type,
                                        AIModelName: data?.ExtraParams?.find((e) => e.Key === "model")?.Value || ""
                                    }
                                })
                            )
                            m.destroy()
                        })
                    }}
                    onCancel={() => {
                        // if (config?.AppConfigs?.length === 0) {
                        //     emiter.emit("onRefreshAvailableAIModelList", "false")
                        // }
                        m.destroy()
                    }}
                />
            </>
        )
    })
}

const modelTypeOptions: YakitRadioButtonsProps["options"] = [
    {
        label: (
            <Tooltip placement='topLeft' title='通过api访问模型,接受AI信息或向AI发送消息,可配置多个'>
                线上
            </Tooltip>
        ),
        value: "online"
    },
    {
        label: (
            <Tooltip
                placement='top'
                title='本地AI模型管理器用于管理本地AI模型,支持一键下载和安装模型,支持模型状态监控和管理。通过本地模型服务,可以实现本地化AI服务,无需依赖云端服务'
            >
                本地
            </Tooltip>
        ),
        value: "local"
    }
]
const AIModelList: React.FC<AIModelListProps> = React.memo((props) => {
    const [modelType, setModelType] = useState<AIModelType>("online")

    const [onlineTotal, setOnlineTotal] = useState<number>(0)
    const [localTotal, setLocalTotal] = useState<number>(0)

    const [removeVisible, setRemoveVisible] = useState<boolean>(false)

    const onlineRef = useRef<AIOnlineModelListRefProps>(null)
    const localRef = useRef<AILocalModelListRefProps>(null)
    const onlineListRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(onlineListRef)

    useEffect(() => {
        if (!inViewport) return
        emiter.on("onRefreshAIModelList", onRefresh)
        return () => {
            emiter.off("onRefreshAIModelList", onRefresh)
        }
    }, [inViewport])

    useEffect(() => {
        if (inViewport) {
            onRefresh()
        }
    }, [inViewport])

    const onToolQueryTypeChange = useMemoizedFn((e) => {
        setModelType(e.target.value as AIModelType)
    })
    const total = useCreation(() => {
        if (modelType === "online") {
            return onlineTotal
        } else {
            return localTotal
        }
    }, [modelType, localTotal, onlineTotal])
    const onRefresh = useMemoizedFn(() => {
        switch (modelType) {
            case "online":
                onlineRef.current?.onRefresh()
                break
            case "local":
                localRef.current?.onRefresh()
                break
            default:
                break
        }
    })
    const onAdd = useMemoizedFn(() => {
        switch (modelType) {
            case "online":
                onAddOnline()
                break
            case "local":
                onAddLocal()
                break
            default:
                break
        }
    })
    const onAddLocal = useMemoizedFn(() => {
        const m = showYakitModal({
            title: "添加本地模型",
            width: "50%",
            content: (
                <AddAIModel
                    onCancel={() => {
                        m.destroy()
                        localRef.current?.onRefresh()
                    }}
                />
            ),
            footer: null
        })
    })
    const onAddOnline = useMemoizedFn(() => {
        apiGetGlobalNetworkConfig().then((obj) => {
            setAIModal({
                config: obj,
                onSuccess: () => {
                    onlineRef.current?.onRefresh()
                }
            })
        })
    })
    const onClear = useMemoizedFn(() => {
        switch (modelType) {
            case "online":
                onClearOnline()
                break
            case "local":
                setRemoveVisible(true)
                break
            default:
                break
        }
    })
    const onClearOnline = useMemoizedFn(() => {
        onlineRef.current?.onRemoveAll()
    })
    const onClearLocal = useMemoizedFn(() => {
        return grpcClearAllModels({DeleteSourceFile: false}).then(() => {
            localRef.current?.onRefresh()
            setRemoveVisible(false)
        })
    })
    const onCancelRemove = useMemoizedFn(() => {
        setRemoveVisible(false)
        localRef.current?.onRefresh()
    })
    return (
        <div className={styles["ai-model-list-wrapper"]} ref={onlineListRef}>
            <div className={styles["ai-model-list-header"]}>
                <div className={styles["ai-model-list-header-left"]}>
                    <YakitRadioButtons
                        size='small'
                        buttonStyle='solid'
                        value={modelType}
                        options={modelTypeOptions}
                        onChange={onToolQueryTypeChange}
                    />
                    <div className={styles["ai-model-list-total"]}>{total}</div>
                </div>
                <div className={styles["ai-model-list-header-right"]}>
                    <Tooltip title='添加'>
                        <YakitButton type='text2' icon={<OutlinePlusIcon />} onClick={onAdd} />
                    </Tooltip>
                    <Tooltip title='刷新'>
                        <YakitButton type='text2' icon={<OutlineRefreshIcon />} onClick={onRefresh} />
                    </Tooltip>
                    <Divider type='vertical' />
                    <YakitPopconfirm
                        placement='right'
                        title={`是否确认清空所有${modelType === "local" ? "本地" : "线上"}模型配置`}
                        onConfirm={onClear}
                    >
                        <YakitButton type='text' danger>
                            清空
                        </YakitButton>
                    </YakitPopconfirm>
                </div>
            </div>
            {modelType === "online" ? (
                <AIOnlineModelList ref={onlineRef} setOnlineTotal={setOnlineTotal} onAdd={onAdd} />
            ) : (
                <AILocalModelList ref={localRef} setLocalTotal={setLocalTotal} />
            )}
            {removeVisible && (
                <AILocalModelListItemPromptHint
                    title='清空模型'
                    content={`确认要删除所有下载和添加的模型吗？确认删除源文件则自定义添加的模型文件会被一起删除`}
                    onOk={onClearLocal}
                    onCancel={onCancelRemove}
                />
            )}
        </div>
    )
})

export default AIModelList

const AIOnlineModelList: React.FC<AIOnlineModelListProps> = React.memo(
    forwardRef((props, ref) => {
        const {setting} = useAIAgentStore()
        const {setSetting} = useAIAgentDispatcher()
        const {setOnlineTotal, onAdd} = props
        const [spinning, setSpinning] = useState<boolean>(false)
        const [list, setList] = useState<ThirdPartyApplicationConfig[]>([])
        const noAiAppConfigRef = useRef<ThirdPartyApplicationConfig[]>([])
        const configRef = useRef<GlobalNetworkConfig>()
        const onlineListRef = useRef<HTMLDivElement>(null)
        const [inViewport = true] = useInViewport(onlineListRef)
        useImperativeHandle(
            ref,
            () => ({
                onRefresh: () => {
                    getList()
                },
                onRemoveAll: () => onRemoveAll()
            }),
            []
        )
        useEffect(() => {
            if (inViewport) getList()
        }, [inViewport])
        const getList = useMemoizedFn(() => {
            setSpinning(true)
            apiGetGlobalNetworkConfig()
                .then((res) => {
                    configRef.current = res
                    const appConfigs: ThirdPartyApplicationConfig[] = []
                    const noAiAppConfigs: ThirdPartyApplicationConfig[] = []
                    res.AppConfigs.forEach((ele) => {
                        if (res.AiApiPriority.includes(ele.Type)) {
                            appConfigs.push(ele)
                        } else {
                            noAiAppConfigs.push(ele)
                        }
                    })
                    noAiAppConfigRef.current = noAiAppConfigs
                    setList(appConfigs || [])
                    setOnlineTotal(appConfigs?.length || 0)
                })
                .finally(() => {
                    setTimeout(() => {
                        setSpinning(false)
                    }, 200)
                })
        })
        const getNewAppConfig = useMemoizedFn((list: ThirdPartyApplicationConfig[]) => {
            return [...list, ...noAiAppConfigRef.current]
        })
        const onEdit = useMemoizedFn((item: ThirdPartyApplicationConfig) => {
            if (!configRef.current) return
            setAIModal({
                config: configRef.current,
                item,
                onSuccess: () => {
                    getList()
                }
            })
        })
        const onRemove = useMemoizedFn((item: ThirdPartyApplicationConfig) => {
            if (!configRef.current) return
            const newList = list.filter((i) => i.Type !== item.Type)
            setList(newList)
            const appConfigs = getNewAppConfig(newList)
            const isRefreshValue = setting.AIService === item.Type || appConfigs.length === 0
            apiSetGlobalNetworkConfig({...configRef.current, AppConfigs: appConfigs}).then(() => {
                getList()
                emiter.emit("onRefreshAvailableAIModelList", `${isRefreshValue}`)
            })
        })
        const onRemoveAll = useMemoizedFn(() => {
            if (!configRef.current) return
            apiSetGlobalNetworkConfig({...configRef.current, AppConfigs: getNewAppConfig([])}).then(() => {
                getList()
                emiter.emit("onRefreshAvailableAIModelList", "true")
            })
        })
        /**
         * @description: 拖拽结束后的计算
         */
        const onDragEnd = useMemoizedFn((result) => {
            if (!configRef.current) return
            if (!result.destination) {
                return
            }
            if (result.source.droppableId === "droppable1" && result.destination.droppableId === "droppable1") {
                const newList: ThirdPartyApplicationConfig[] = reorderApplicationConfig(
                    list,
                    result.source.index,
                    result.destination.index
                )
                setList(newList)
                updateOrder(newList)
            }
        })
        const updateOrder = useDebounceFn(
            (newList: ThirdPartyApplicationConfig[]) => {
                if (!configRef.current) return
                const aiApiPriority = newList.map((ele) => ele.Type)
                apiSetGlobalNetworkConfig({
                    ...configRef.current,
                    AppConfigs: getNewAppConfig(newList),
                    AiApiPriority: aiApiPriority
                })
            },
            {wait: 500}
        ).run
        const onSelectModel = useMemoizedFn((rowData: ThirdPartyApplicationConfig) => {
            const aiModelName = rowData.ExtraParams?.find((ele) => ele.Key === "model")?.Value || ""
            setSetting && setSetting((old) => ({...old, AIService: rowData.Type, AIModelName: aiModelName}))
            emiter.emit(
                "aiModelSelectChange",
                JSON.stringify({
                    type: "online",
                    params: {
                        AIService: rowData.Type,
                        AIModelName: aiModelName
                    }
                })
            )
        })
        return (
            <YakitSpin spinning={spinning}>
                {list.length > 0 ? (
                    <div ref={onlineListRef} className={styles["ai-online-model-list"]}>
                        <DragDropContext onDragEnd={onDragEnd}>
                            <Droppable droppableId='droppable1'>
                                {(provided, snapshot) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef}>
                                        {list.map((rowData, index) => (
                                            <Draggable key={rowData.Type} draggableId={rowData.Type} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        style={provided.draggableProps.style}
                                                        className={classNames(styles["ai-online-model-list-row"], {
                                                            [styles["ai-online-model-list-row-isDragging"]]:
                                                                snapshot.isDragging
                                                        })}
                                                        onClick={() => onSelectModel(rowData)}
                                                    >
                                                        <SolidDragsortIcon className={styles["drag-sort-icon"]} />
                                                        <AIOnlineModelListItem
                                                            item={rowData}
                                                            onEdit={onEdit}
                                                            onRemove={onRemove}
                                                        />
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    </div>
                ) : (
                    <div className={styles["ai-list-empty-wrapper"]}>
                        <YakitEmpty
                            title='暂无数据'
                            description='通过 api 访问模型，接受 AI 信息或向 Al 发送信息，可配置多个。'
                        />
                        <div className={styles["ai-list-btns-wrapper"]}>
                            <YakitButton type='outline1' icon={<OutlinePlussmIcon />} onClick={onAdd}>
                                添加模型
                            </YakitButton>
                        </div>
                    </div>
                )}
            </YakitSpin>
        )
    })
)
const AIOnlineModelListItem: React.FC<AIOnlineModelListItemProps> = React.memo((props) => {
    const {item, onEdit, onRemove} = props
    const {setting} = useAIAgentStore()
    const model = useCreation(() => {
        return item.ExtraParams?.find((ele) => ele.Key === "model")?.Value
    }, [item.ExtraParams])
    const onEditClick = useMemoizedFn((e) => {
        e.stopPropagation()
        onEdit(item)
    })
    const onRemoveClick = useMemoizedFn((e) => {
        e.stopPropagation()
        onRemove(item)
    })
    return (
        <div className={styles["ai-online-model-list-item"]}>
            <div className={styles["ai-online-model-list-item-header"]}>
                {AIOnlineModelIconMap[item.Type]}
                <div className={styles["ai-online-model-list-item-type"]}>{item.Type}</div>

                <div className={styles["ai-online-model-list-item-model"]}>
                    <OutlineAtomIcon className={styles["atom-icon"]} />
                    <span className={styles["ai-online-model-list-item-model-text"]}>{model}</span>
                </div>
            </div>
            <div className={styles["ai-online-model-list-item-extra"]}>
                <div className={styles["ai-online-model-list-item-extra-edit"]}>
                    <YakitButton type='text2' icon={<OutlinePencilaltIcon />} onClick={onEditClick} />
                    <YakitPopconfirm title={`确定要删除模型 ${item.Type} 吗？`} onConfirm={onRemoveClick}>
                        <YakitButton
                            type='text2'
                            icon={<OutlineTrashIcon />}
                            className={styles["trash-icon"]}
                            onClick={(e) => {
                                e.stopPropagation()
                            }}
                        />
                    </YakitPopconfirm>
                </div>
                {setting.AIService === item.Type && <OutlineCheckIcon className={styles["check-icon"]} />}
            </div>
        </div>
    )
})
const AILocalModelList: React.FC<AILocalModelListProps> = React.memo(
    forwardRef((props, ref) => {
        const {setLocalTotal} = props
        const [spinning, setSpinning] = useState<boolean>(false)
        const [isRef, setIsRef] = useState<boolean>(false)
        const [supportedModelsUser, setSupportedModelsUser] = useState<LocalModelConfig[]>([])
        const [supportedModels, setSupportedModels] = useState<LocalModelConfig[]>([])

        const [llamaServerReady, setLlamaServerReady] = useState<boolean>(false)
        const [llamaServerChecking, setLlamaServerChecking] = useState<boolean>(true)
        const [visible, setVisible] = useState<boolean>(false)

        const tokenRef = useRef(randomString(60))
        useImperativeHandle(
            ref,
            () => ({
                onRefresh: () => {
                    init()
                }
            }),
            []
        )

        const {currentPageTabRouteKey} = usePageInfo(
            (s) => ({
                currentPageTabRouteKey: s.currentPageTabRouteKey
            }),
            shallow
        )

        useEffect(() => {
            init()
        }, [])
        const init = useMemoizedFn(() => {
            setLlamaServerChecking(true)
            grpcIsLlamaServerReady()
                .then((res) => {
                    setLlamaServerReady(res.Ok)
                    if (res.Ok) {
                        getList()
                    } else {
                        yakitNotify("error", `Llama服务器未准备就绪: ${res.Reason}`)
                    }
                })
                .finally(() => {
                    setTimeout(() => {
                        setLlamaServerChecking(false)
                    }, 200)
                })
        })
        const getList = useMemoizedFn(() => {
            setSpinning(true)
            grpcGetSupportedLocalModels()
                .then((response) => {
                    const userModels: LocalModelConfig[] = []
                    const defaultModels: LocalModelConfig[] = []
                    setLocalTotal(response?.length || 0)
                    response?.forEach((model) => {
                        if (model.IsLocal) {
                            userModels.push(model)
                        } else {
                            defaultModels.push(model)
                        }
                    })
                    setSupportedModelsUser(userModels)
                    setSupportedModels(defaultModels)
                })
                .finally(() => {
                    setTimeout(() => {
                        setSpinning(false)
                        setIsRef(!isRef)
                    }, 200)
                })
        })

        const installLlamaServer = useMemoizedFn(() => {
            const m = showYakitModal({
                title: "安装Llama服务器",
                width: "50%",
                maskClosable: false,
                type: "white",
                content: (
                    <InstallLlamaServerModelPrompt
                        token={tokenRef.current}
                        onStart={() => {
                            m.destroy()
                            setVisible(true)
                        }}
                    />
                ),
                footer: null
            })
        })
        const installFinished = useMemoizedFn(() => {
            setVisible(false)
            init()
        })
        const installCancel = useMemoizedFn(() => {
            setVisible(false)
        })
        const code = useCreation(() => {
            return "sudo xattr -r -d com.apple.quarantine ~/yakit-projects/projects/libs/llama-server"
        }, [])
        return llamaServerReady ? (
            <YakitSpin spinning={spinning}>
                {supportedModelsUser.length > 0 && (
                    <AILocalModelListWrapper
                        title='我添加的'
                        list={supportedModelsUser}
                        onRefresh={getList}
                        currentPageTabRouteKey={currentPageTabRouteKey}
                    />
                )}
                <AILocalModelListWrapper
                    title='推荐模型'
                    list={supportedModels}
                    onRefresh={getList}
                    currentPageTabRouteKey={currentPageTabRouteKey}
                />
            </YakitSpin>
        ) : (
            <YakitSpin spinning={llamaServerChecking}>
                <div className={styles["ai-local-model-empty"]}>
                    <div className={styles["ai-local-model-notice"]}>
                        <div className={styles["notice-title"]}>
                            <OutlineLightbulbIcon />
                            注意
                        </div>
                        <div>
                            MAC系统在下载后，需要执行<YakitTag color='purple'>sudo xattr -r</YakitTag>
                            <YakitTag color='purple'>-d com.apple.quarantine ~/yakit-projects</YakitTag>
                            <YakitTag color='purple'>
                                /projects/libs/llama-server
                                <CopyComponents copyText={code} className={styles["copy"]} />
                            </YakitTag>
                            命令，允许llama-server可执行。
                        </div>
                        <div>首次使用需要先安装模型运行环境，部分模型文件较大，请确保有足够的磁盘空间和网络带宽。</div>
                    </div>
                    <div className={styles["ai-list-empty-wrapper"]}>
                        <YakitEmpty
                            title='暂无数据'
                            description='本地 AI 模型管理器用于管理本地 Al 模型，支持一键下载和安装模型，支持模型状态监控和管理。通过本地模型服务，可以实现本地化 AI 服务，无需依赖云端服务。'
                        />
                        <div className={styles["ai-list-btns-wrapper"]}>
                            <YakitButton type='outline1' icon={<OutlineRefreshIcon />} onClick={init}>
                                刷新
                            </YakitButton>
                            <YakitButton
                                type='primary'
                                icon={<OutlineClouddownloadIcon />}
                                onClick={installLlamaServer}
                            >
                                安装Llama服务器
                            </YakitButton>
                        </div>
                    </div>
                </div>
                {visible && (
                    <InstallLlamaServer
                        grpcInterface='InstallLlamaServer'
                        title='LIama 服务器安装中...'
                        token={tokenRef.current}
                        onFinished={installFinished}
                        onCancel={installCancel}
                        getContainer={
                            document.getElementById(`main-operator-page-body-${currentPageTabRouteKey}`) || undefined
                        }
                    />
                )}
            </YakitSpin>
        )
    })
)
const AILocalModelListWrapper: React.FC<AILocalModelListWrapperProps> = React.memo((props) => {
    const {title, list, onRefresh, currentPageTabRouteKey} = props
    return (
        <div className={styles["ai-local-model-list-wrapper"]}>
            <div className={styles["ai-local-model-list-title"]}>
                <span>{title}</span>
                <div className={styles["ai-model-list-total"]}>{list.length}</div>
            </div>
            <div className={styles["ai-local-model-list"]}>
                {list.map((rowData) => (
                    <div className={styles["ai-local-model-list-row"]} key={rowData.Name}>
                        <AILocalModelListItem
                            item={rowData}
                            onRefresh={onRefresh}
                            currentPageTabRouteKey={currentPageTabRouteKey}
                        />
                    </div>
                ))}
            </div>
        </div>
    )
})

const AILocalModelListItem: React.FC<AILocalModelListItemProps> = React.memo((props) => {
    const {item, onRefresh, currentPageTabRouteKey} = props
    const [isReady, setIsReady] = useState<boolean>(item.IsReady || false)

    const [visible, setVisible] = useState<boolean>(false)
    const [downVisible, setDownVisible] = useState<boolean>(false)
    const [removeVisible, setRemoveVisible] = useState<boolean>(false)
    const [stopVisible, setStopVisible] = useState<boolean>(false)

    const [stopLoading, setStopLoading] = useState<boolean>(false)

    const tokenRef = useRef<string>(randomString(60))
    const downTokenRef = useRef<string>(randomString(60))

    useEffect(() => {
        const token = tokenRef.current
        return () => {
            grpcCancelStartLocalModel(token)
        }
    }, [])
    useUpdateEffect(() => {
        setIsReady(item.IsReady || false)
    }, [item.IsReady])
    const getModelReady = useMemoizedFn(() => {
        grpcIsLocalModelReady({
            ModelName: item.Name
        }).then((response) => {
            setIsReady(response?.Ok || false)
        })
    })
    const onStart = useMemoizedFn((e) => {
        e.stopPropagation()
        const m = showYakitModal({
            title: `启动模型 - ${item.Name}`,
            width: "50%",
            content: (
                <AIStartModelForm
                    item={item}
                    token={tokenRef.current}
                    onSuccess={() => {
                        onRefresh()
                        m.destroy()
                    }}
                />
            ),
            footer: null,
            onCancel: () => {
                onRefresh()
                m.destroy()
            }
        })
    })
    const onStop = useMemoizedFn((e) => {
        e.stopPropagation()
        setStopLoading(true)
        grpcStopLocalModel({ModelName: item.Name})
            .then(() => {
                onRefresh()
                setStopVisible(false)
            })
            .finally(() =>
                setTimeout(() => {
                    setStopLoading(false)
                }, 200)
            )
    })
    const onDown = useMemoizedFn((e) => {
        e.stopPropagation()
        const m = showYakitModal({
            title: "下载模型",
            subTitle: item.Name,
            width: "50%",
            content: (
                <DownloadLlamaServerModelPrompt
                    modelName={item.Name}
                    onStart={() => {
                        m.destroy()
                        setDownVisible(true)
                    }}
                    token={downTokenRef.current}
                />
            ),
            footer: null
        })
    })
    const menuSelect = useMemoizedFn((key: string) => {
        switch (key) {
            case "edit":
                onEdit()
                break
            case "delete":
                setRemoveVisible(true)
                break
            case "path":
                if (item.Path) onOpenLocalFileByPath(item.Path)
                break
            default:
                break
        }
        setVisible(false)
    })
    const onEdit = useMemoizedFn(() => {
        const m = showYakitModal({
            title: "修改本地模型",
            width: "50%",
            content: (
                <AddAIModel
                    defaultValues={{
                        Name: item.Name,
                        ModelType: item.Type,
                        Path: item.Path || "",
                        Description: item.Description || ""
                    }}
                    onCancel={() => {
                        onRefresh()
                        m.destroy()
                    }}
                />
            ),
            footer: null
        })
    })
    const installFinished = useMemoizedFn(() => {
        setDownVisible(false)
        getModelReady()
    })
    const installCancel = useMemoizedFn(() => {
        setDownVisible(false)
    })
    const onDelete = useMemoizedFn((deleteSourceFile) => {
        return grpcDeleteLocalModel({Name: item.Name, DeleteSourceFile: deleteSourceFile}).then(() => {
            onRefresh()
            setRemoveVisible(false)
            emiter.emit("onRefreshAvailableAIModelList")
        })
    })
    const onCancelRemove = useMemoizedFn(() => {
        setRemoveVisible(false)
    })
    const typeNode = useCreation(() => {
        switch (item.Type) {
            case AILocalModelTypeEnum.AIChat:
                return (
                    <YakitTag size='small' color='blue' className={styles["ai-local-model-type-tag"]}>
                        <OutlineChatIcon className={styles["type-icon"]} />
                        AIChat
                    </YakitTag>
                )
            case AILocalModelTypeEnum.Embedding:
                return (
                    <YakitTag size='small' color='purple' className={styles["ai-local-model-type-tag"]}>
                        <OutlineExclamationIcon className={styles["type-icon"]} />
                        Embedding
                    </YakitTag>
                )
            case AILocalModelTypeEnum.SpeechToText:
                return (
                    <YakitTag size='small' color='bluePurple' className={styles["ai-local-model-type-tag"]}>
                        <OutlineSpeechToTextIcon className={styles["type-icon"]} />
                        Speech-to-text
                    </YakitTag>
                )
            default:
                return <></>
        }
    }, [item.Type])
    const isRunning = useCreation(() => {
        return item?.Status?.Status === "running"
    }, [item?.Status?.Status])
    const localModelMenu: YakitMenuItemType[] = useCreation(() => {
        let menu: YakitMenuItemType[] = [
            {
                key: "path",
                label: "打开文件位置",
                itemIcon: <OutlineClipboardcopyIcon />
            }
        ]
        const noEdit = ["starting", "running", "stopping"].includes(item.Status?.Status || "")
        if (item.IsLocal && !noEdit) {
            menu = menu.concat([
                {
                    key: "edit",
                    label: "编辑",
                    itemIcon: <OutlinePencilaltIcon />
                },
                {
                    key: "delete",
                    label: "删除",
                    type: "danger",
                    itemIcon: <OutlineTrashIcon />
                }
            ])
        }
        return menu
    }, [item.IsLocal, item?.Status?.Status])
    const isShowEnable = useCreation(() => {
        return !isReady && !item.IsLocal
    }, [isReady, item.IsLocal])

    return (
        <div className={styles["ai-local-model-list-item"]}>
            <div className={styles["ai-local-model-heard"]}>
                <div className={styles["ai-local-model-heard-left"]}>
                    <OutlineAtomIconByStatus isReady={isShowEnable} isRunning={isRunning} />
                    <div className={styles["ai-local-model-heard-left-name"]}>{item.Name}</div>
                    {typeNode}
                </div>

                <div className={styles["ai-local-model-heard-extra"]}>
                    {isShowEnable ? (
                        <YakitButton type='text' onClick={onDown} icon={<OutlineClouddownloadIcon />}>
                            下载
                        </YakitButton>
                    ) : (
                        <div
                            className={classNames(styles["ai-local-model-heard-extra-btns"], {
                                [styles["ai-local-model-heard-extra-btns-hover"]]: visible || stopVisible
                            })}
                        >
                            {isRunning ? (
                                <YakitPopconfirm
                                    title={`确定要停用模型 ${item.Name} 吗？`}
                                    onConfirm={onStop}
                                    onCancel={() => setStopVisible(false)}
                                    visible={stopVisible}
                                    onVisibleChange={setStopVisible}
                                    trigger={"click"}
                                    okButtonProps={{loading: stopLoading}}
                                >
                                    <YakitButton type='text' colors='danger' icon={<OutlineExitIcon />}>
                                        停用
                                    </YakitButton>
                                </YakitPopconfirm>
                            ) : (
                                <YakitButton type='text' onClick={onStart} icon={<OutlinePlayIcon />}>
                                    启用
                                </YakitButton>
                            )}
                            <YakitDropdownMenu
                                menu={{
                                    data: localModelMenu,
                                    onClick: (e) => {
                                        e.domEvent.stopPropagation()
                                        menuSelect(e.key)
                                    }
                                }}
                                dropdown={{
                                    trigger: ["click", "contextMenu"],
                                    placement: "bottomLeft",
                                    visible: visible,
                                    onVisibleChange: setVisible
                                }}
                            >
                                <YakitButton
                                    isActive={visible}
                                    type='text2'
                                    size='small'
                                    icon={<OutlineDotsverticalIcon />}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </YakitDropdownMenu>
                        </div>
                    )}
                </div>
            </div>
            <div className={styles["ai-local-model-description"]}>{item.Description}</div>
            {isRunning && (
                <div className={styles["ai-local-model-footer"]}>
                    <YakitTag size='small' className={styles["ai-local-model-type-tag"]} color='green'>
                        已启用
                    </YakitTag>
                    <div>
                        IP/端口: {item?.Status?.Host || ""}:{item?.Status?.Port || ""}
                    </div>
                </div>
            )}
            {downVisible && (
                <InstallLlamaServer
                    grpcInterface='DownloadLocalModel'
                    title={`模型 ${item.Name} 下载中...`}
                    token={downTokenRef.current}
                    onFinished={installFinished}
                    onCancel={installCancel}
                    getContainer={
                        document.getElementById(`main-operator-page-body-${currentPageTabRouteKey}`) || undefined
                    }
                />
            )}
            {removeVisible && (
                <AILocalModelListItemPromptHint
                    title='删除模型'
                    content={`确认删除模型${item.Name}吗？确认删除源文件则自定义添加的模型文件会被一起删除`}
                    onOk={onDelete}
                    onCancel={onCancelRemove}
                />
            )}
        </div>
    )
})
export const OutlineAtomIconByStatus: React.FC<OutlineAtomIconByStatusProps> = React.memo((props) => {
    const {isReady, isRunning, iconClassName, size} = props
    return (
        <div
            className={classNames(
                styles["ai-local-model-icon"],
                {
                    [styles["ai-local-model-icon-ready"]]: isReady,
                    [styles["ai-local-model-icon-running"]]: isRunning,
                    [styles["ai-local-model-icon-small"]]: size==='small',
                },
                iconClassName
            )}
        >
            <OutlineAtomIcon />
        </div>
    )
})
const AILocalModelListItemPromptHint: React.FC<AILocalModelListItemPromptHintProps> = React.memo((props) => {
    const {title, content, onOk, onCancel} = props
    const [checked, setChecked] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)

    const handleOK = useMemoizedFn(() => {
        setLoading(true)
        onOk(checked).finally(() => {
            setTimeout(() => {
                setLoading(false)
            }, 200)
        })
    })
    const handleCancel = useMemoizedFn(() => {
        onCancel()
    })

    return (
        <YakitHint
            visible={true}
            title={title}
            content={content}
            okButtonProps={{loading}}
            onOk={handleOK}
            onCancel={handleCancel}
            footerExtra={
                <YakitCheckbox checked={checked} onChange={(e) => setChecked(e.target.checked)}>
                    是否删除源文件
                </YakitCheckbox>
            }
        />
    )
})
