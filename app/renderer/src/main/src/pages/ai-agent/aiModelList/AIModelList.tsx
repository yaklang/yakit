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
    AIOnlineModelListRefProps
} from "./AIModelListType"
import styles from "./AIModelList.module.scss"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {useCreation, useDebounceFn, useInViewport, useMemoizedFn} from "ahooks"
import {YakitRadioButtonsProps} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtonsType"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {
    grpcCancelStartLocalModel,
    grpcClearAllModels,
    grpcDeleteLocalModel,
    grpcGetSupportedLocalModels,
    grpcIsLlamaServerReady,
    grpcIsLocalModelReady,
    reorderApplicationConfig
} from "./utils"
import {LocalModelConfig} from "../type/aiChat"
import {Divider, Tooltip} from "antd"
import {yakitNotify} from "@/utils/notification"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineAtomIcon,
    OutlineChatIcon,
    OutlineClouddownloadIcon,
    OutlineDotsverticalIcon,
    OutlineExclamationIcon,
    OutlineExitIcon,
    OutlinePencilaltIcon,
    OutlinePlayIcon,
    OutlinePlusIcon,
    OutlineRefreshIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {
    DownloadLlamaServerModelPrompt,
    InstallLlamaServer,
    InstallLlamaServerModelPrompt
} from "./installLlamaServerModelPrompt/InstallLlamaServerModelPrompt"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {AIOnlineModelIconMap} from "../defaultConstant"
import {randomString} from "@/utils/randomUtil"
import {AIStartModelForm} from "./aiStartModelForm/AIStartModelForm"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {AddAIModel} from "./addAIModel/AddAIModel"
import NewThirdPartyApplicationConfig from "@/components/configNetwork/NewThirdPartyApplicationConfig"
import {apiGetGlobalNetworkConfig, apiSetGlobalNetworkConfig} from "@/pages/spaceEngine/utils"
import {GlobalNetworkConfig, ThirdPartyApplicationConfig} from "@/components/configNetwork/ConfigNetworkPage"
import {DragDropContext, Droppable, Draggable} from "@hello-pangea/dnd"
import {SolidDragsortIcon} from "@/assets/icon/solid"
import classNames from "classnames"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"

const {ipcRenderer} = window.require("electron")

const setAIOnlineModal = (params: {
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
    let m = showYakitModal({
        title: "添加第三方应用",
        width: 600,
        footer: null,
        closable: true,
        maskClosable: false,
        content: (
            <>
                <NewThirdPartyApplicationConfig
                    isOnlyShowAiType={true}
                    formValues={formValues}
                    onAdd={(data) => {
                        if (!config) return
                        const existedResult: ThirdPartyApplicationConfig[] = config?.AppConfigs || []
                        const index = (config?.AppConfigs || []).findIndex((i) => i.Type === data.Type)
                        if (index === -1) {
                            existedResult.push(data)
                        } else {
                            existedResult[index] = {
                                ...existedResult[index],
                                ...data
                            }
                        }
                        const params: GlobalNetworkConfig = {...config, AppConfigs: existedResult}
                        apiSetGlobalNetworkConfig(params).then(() => {
                            onSuccess()
                            m.destroy()
                        })
                    }}
                    onCancel={() => m.destroy()}
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

    const onlineConfigRef = useRef<GlobalNetworkConfig>()

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
            setAIOnlineModal({
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
        if (!onlineConfigRef.current) return
        apiSetGlobalNetworkConfig({...onlineConfigRef.current, AppConfigs: []}).then(() => {
            onlineRef.current?.onRefresh()
        })
    })
    const onClearLocal = useMemoizedFn(() => {
        return grpcClearAllModels({DeleteSourceFile: false}).then(() => {
            localRef.current?.onRefresh()
        })
    })
    const onCancelRemove = useMemoizedFn(() => {
        setRemoveVisible(false)
        localRef.current?.onRefresh()
    })
    return (
        <div className={styles["ai-model-list-wrapper"]}>
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
                    <YakitButton type='text' danger onClick={onClear}>
                        清空
                    </YakitButton>
                </div>
            </div>
            {modelType === "online" ? (
                <AIOnlineModelList ref={onlineRef} setOnlineTotal={setOnlineTotal} />
            ) : (
                <AILocalModelList ref={localRef} setLocalTotal={setLocalTotal} />
            )}
            {removeVisible && (
                <AILocalModelListItemPromptHint
                    title='清空模型'
                    content={`确认清空模型?`}
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
        const {setOnlineTotal} = props
        const [spinning, setSpinning] = useState<boolean>(false)
        const [list, setList] = useState<ThirdPartyApplicationConfig[]>([])
        const configRef = useRef<GlobalNetworkConfig>()
        const onlineListRef = useRef<HTMLDivElement>(null)
        const [inViewport = true] = useInViewport(onlineListRef)
        useImperativeHandle(
            ref,
            () => ({
                onRefresh: () => {
                    getList()
                }
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
                    console.log("apiGetGlobalNetworkConfig", res)
                    configRef.current = res
                    setList(res.AppConfigs || [])
                    setOnlineTotal(res.AppConfigs?.length || 0)
                })
                .finally(() => {
                    setTimeout(() => {
                        setSpinning(false)
                    }, 200)
                })
        })
        const onEdit = useMemoizedFn((item: ThirdPartyApplicationConfig) => {
            if (!configRef.current) return
            setAIOnlineModal({
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
            apiSetGlobalNetworkConfig({...configRef.current, AppConfigs: newList}).then(() => {
                getList()
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
            (newList) => {
                if (!configRef.current) return
                apiSetGlobalNetworkConfig({...configRef.current, AppConfigs: newList})
            },
            {wait: 500}
        ).run
        return (
            <YakitSpin spinning={spinning}>
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
            </YakitSpin>
        )
    })
)
const AIOnlineModelListItem: React.FC<AIOnlineModelListItemProps> = React.memo((props) => {
    const {item, onEdit, onRemove} = props
    const model = useCreation(() => {
        return item.ExtraParams?.find((ele) => ele.Key === "model")?.Value
    }, [item.ExtraParams])
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
            <div className={styles["ai-online-model-list-item-edit"]}>
                <YakitButton type='text2' icon={<OutlinePencilaltIcon />} onClick={() => onEdit(item)} />
                <YakitPopconfirm title={`确定要删除模型 ${item.Type} 吗？`} onConfirm={() => onRemove(item)}>
                    <YakitButton type='text2' icon={<OutlineTrashIcon />} className={styles["trash-icon"]} />
                </YakitPopconfirm>
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
                    setLocalTotal(response?.Models?.length || 0)
                    response?.Models?.forEach((model) => {
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
                    <AILocalModelListWrapper title='我添加的' list={supportedModelsUser} onRefresh={getList} />
                )}
                <AILocalModelListWrapper title='推荐模型' list={supportedModels} onRefresh={getList} />
            </YakitSpin>
        ) : (
            <YakitSpin spinning={llamaServerChecking}>
                <div className={styles["ai-local-model-notice"]}>
                    <p>
                        本地AI模型管理器用于管理本地AI模型,支持一键下载和安装模型,支持模型状态监控和管理。通过本地模型服务,可以实现本地化AI服务,无需依赖云端服务
                    </p>
                    <p>
                        MAC 系统在下载后，需要执行
                        <span>{code}</span>
                        <CopyComponents copyText={code} className={styles["ai-local-model-copy"]} />
                        命令,允许llama-server可执行。
                    </p>
                    <p>首次使用需要先安装模型运行环境，部分模型文件较大，请确保有足够的磁盘空间和网络带宽。</p>
                </div>
                <div className={styles["ai-list-empty-wrapper"]}>
                    <YakitEmpty
                        title='暂无数据'
                        description='点击下方按钮进行服务器初始化,（如已经下载服务器，建议点击刷新或关掉当前页面后重新打开）'
                    />
                    <div className={styles["ai-list-btns-wrapper"]}>
                        <YakitButton type='outline1' icon={<OutlineRefreshIcon />} onClick={init}>
                            刷新
                        </YakitButton>
                        <YakitButton type='primary' icon={<OutlineClouddownloadIcon />} onClick={installLlamaServer}>
                            安装Llama服务器
                        </YakitButton>
                    </div>
                </div>
                {visible && (
                    <InstallLlamaServer
                        grpcInterface='InstallLlamaServer'
                        title='LIama 服务器安装中...'
                        token={tokenRef.current}
                        onFinished={installFinished}
                        onCancel={installCancel}
                    />
                )}
            </YakitSpin>
        )
    })
)
const AILocalModelListWrapper: React.FC<AILocalModelListWrapperProps> = React.memo((props) => {
    const {title, list, onRefresh} = props
    return (
        <div className={styles["ai-local-model-list-wrapper"]}>
            <div className={styles["ai-local-model-list-title"]}>
                <span>{title}</span>
                <div className={styles["ai-model-list-total"]}>{list.length}</div>
            </div>
            <div className={styles["ai-local-model-list"]}>
                {list.map((rowData) => (
                    <div className={styles["ai-local-model-list-row"]} key={rowData.Name}>
                        <AILocalModelListItem item={rowData} onRefresh={onRefresh} />
                    </div>
                ))}
            </div>
        </div>
    )
})
const localModelMenu: YakitMenuItemType[] = [
    {
        key: "edit",
        label: "编辑"
    },
    {
        key: "delete",
        label: "删除"
    }
]
const AILocalModelListItem: React.FC<AILocalModelListItemProps> = React.memo((props) => {
    const {item, onRefresh} = props
    const [isReady, setIsReady] = useState<boolean>(item.IsReady || false)
    const [isRunning, setIsRunning] = useState<boolean>(false)

    const [visible, setVisible] = useState<boolean>(false)
    const [downVisible, setDownVisible] = useState<boolean>(false)
    const [removeVisible, setRemoveVisible] = useState<boolean>(false)

    const tokenRef = useRef<string>(randomString(60))
    const downTokenRef = useRef<string>(randomString(60))

    useEffect(() => {
        const token = tokenRef.current
        ipcRenderer.on(`${token}-error`, (e, error) => {
            yakitNotify("error", `[StartLocalModel] error: ${error}`)
        })
        // getModelReady()
        return () => {
            grpcCancelStartLocalModel(token)
            ipcRenderer.removeAllListeners(`${token}-error`)
        }
    }, [])
    const getModelReady = useMemoizedFn(() => {
        grpcIsLocalModelReady({
            ModelName: item.Name
        }).then((response) => {
            setIsReady(response?.Ok || false)
        })
    })
    const onStart = useMemoizedFn(() => {
        const m = showYakitModal({
            title: `启动模型 - ${item.Name}`,
            width: "50%",
            content: (
                <AIStartModelForm
                    item={item}
                    token={tokenRef.current}
                    onSuccess={() => {
                        setIsRunning(true)
                        m.destroy()
                    }}
                />
            ),
            footer: null
        })
    })
    const onStop = useMemoizedFn(() => {
        grpcCancelStartLocalModel(tokenRef.current)
        setIsRunning(false)
    })
    const onDown = useMemoizedFn(() => {
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
        grpcDeleteLocalModel({Name: item.Name, DeleteSourceFile: deleteSourceFile}).then(() => {
            onRefresh()
            setRemoveVisible(false)
        })
    })
    const onCancelRemove = useMemoizedFn(() => {
        setRemoveVisible(false)
    })
    const typeNode = useCreation(() => {
        switch (item.Type) {
            case "chat":
                return (
                    <YakitTag size='small' color='blue' className={styles["ai-local-model-type-tag"]}>
                        <OutlineChatIcon className={styles["type-icon"]} />
                        Chat
                    </YakitTag>
                )
            case "embedding":
                return (
                    <YakitTag size='small' color='purple' className={styles["ai-local-model-type-tag"]}>
                        <OutlineExclamationIcon className={styles["type-icon"]} />
                        embedding
                    </YakitTag>
                )
            case "speech-to-text":
                return (
                    <YakitTag size='small' color='purple' className={styles["ai-local-model-type-tag"]}>
                        <OutlineExclamationIcon className={styles["type-icon"]} />
                        speech-to-text
                    </YakitTag>
                )
            default:
                return <></>
        }
    }, [item.Type])
    return (
        <div className={styles["ai-local-model-list-item"]}>
            <div className={styles["ai-local-model-heard"]}>
                <div className={styles["ai-local-model-heard-left"]}>
                    <div
                        className={classNames(styles["ai-local-model-icon"], {
                            [styles["ai-local-model-icon-ready"]]: isReady,
                            [styles["ai-local-model-icon-running"]]: isRunning
                        })}
                    >
                        <OutlineAtomIcon />
                    </div>
                    <div className={styles["ai-local-model-heard-left-name"]}>{item.Name}</div>
                    {typeNode}
                </div>

                <div className={styles["ai-local-model-heard-extra"]}>
                    {!isReady ? (
                        <YakitButton type='text' onClick={onDown} icon={<OutlineClouddownloadIcon />}>
                            下载
                        </YakitButton>
                    ) : (
                        <div
                            className={classNames(styles["ai-local-model-heard-extra-btns"], {
                                [styles["ai-local-model-heard-extra-btns-hover"]]: visible
                            })}
                        >
                            {isRunning ? (
                                <YakitPopconfirm title={`确定要停止模型 ${item.Name} 吗？`} onConfirm={onStop}>
                                    <YakitButton type='text' size='small' colors='danger' icon={<OutlineExitIcon />}>
                                        停止
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
                                    onClick: ({key}) => menuSelect(key)
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
                    <div>IP/端口: 127.0.0.1:{item.DefaultPort}</div>
                </div>
            )}
            {downVisible && (
                <InstallLlamaServer
                    grpcInterface='DownloadLocalModel'
                    title={`模型 ${item.Name} 下载中...`}
                    token={downTokenRef.current}
                    onFinished={installFinished}
                    onCancel={installCancel}
                />
            )}
            {removeVisible && (
                <AILocalModelListItemPromptHint
                    title='删除模型'
                    content={`确认删除模型${item.Name}?`}
                    onOk={onDelete}
                    onCancel={onCancelRemove}
                />
            )}
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
