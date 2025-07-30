import React, {forwardRef, useEffect, useImperativeHandle, useRef, useState} from "react"
import {
    AILocalModelListItemProps,
    AILocalModelListProps,
    AILocalModelListRefProps,
    AIModelListProps,
    AIModelType,
    AIOnlineModelListItemProps,
    AIOnlineModelListProps,
    AIOnlineModelListRefProps
} from "./AIModelListType"
import styles from "./AIModelList.module.scss"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {useCreation, useMemoizedFn} from "ahooks"
import {YakitRadioButtonsProps} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtonsType"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {SelectOptionsProps} from "@/demoComponents/itemSelect/ItemSelectType"
import {
    grpcCancelStartLocalModel,
    grpcGetSupportedLocalModels,
    grpcIsLlamaServerReady,
    grpcIsLocalModelReady
} from "./utils"
import {LocalModelConfig} from "../type/aiChat"
import {Tooltip} from "antd"
import {yakitNotify} from "@/utils/notification"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineClouddownloadIcon,
    OutlineDotsverticalIcon,
    OutlinePlusIcon,
    OutlineRefreshIcon
} from "@/assets/icon/outline"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {
    DownloadLlamaServerModelPrompt,
    InstallLlamaServerModelPrompt
} from "./installLlamaServerModelPrompt/InstallLlamaServerModelPrompt"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {tagColors} from "../defaultConstant"
import {randomString} from "@/utils/randomUtil"
import {AIStartModelForm} from "./aiStartModelForm/AIStartModelForm"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {AddAIModel} from "./addAIModel/AddAIModel"

const {ipcRenderer} = window.require("electron")

const modelTypeOptions: YakitRadioButtonsProps["options"] = [
    {
        label: (
            <Tooltip placement='right' title='通过api访问模型,接受AI信息或向AI发送消息,可配置多个'>
                线上
            </Tooltip>
        ),
        value: "online"
    },
    {
        label: (
            <Tooltip
                placement='right'
                title='本地AI模型管理器用于管理本地AI模型,支持一键下载和安装模型,支持模型状态监控和管理。通过本地模型服务,可以实现本地化AI服务,无需依赖云端服务'
            >
                本地
            </Tooltip>
        ),
        value: "local"
    }
]
const AIModelList: React.FC<AIModelListProps> = React.memo((props) => {
    const [modelType, setModelType] = useState<AIModelType>("local")

    const [onlineTotal, setOnlineTotal] = useState<number>(0)
    const [localTotal, setLocalTotal] = useState<number>(0)

    const onlineRef = useRef<AIOnlineModelListRefProps>(null)
    const localRef = useRef<AILocalModelListRefProps>(null)

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
        if (modelType === "online") {
            onlineRef.current?.onRefresh()
        } else {
            localRef.current?.onRefresh()
        }
    })
    const onAdd = useMemoizedFn(() => {
        const m = showYakitModal({
            title: "添加本地模型",
            width: "50%",
            content: <AddAIModel onCancel={() => m.destroy()} />,
            footer: null
        })
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
                    <YakitButton type='text' icon={<OutlineRefreshIcon />} onClick={onRefresh} />
                    {modelType === "local" && (
                        <YakitButton type='text' icon={<OutlinePlusIcon />} onClick={onAdd}>
                            添加模型
                        </YakitButton>
                    )}
                </div>
            </div>
            {modelType === "online" ? (
                <AIOnlineModelList ref={onlineRef} setOnlineTotal={setOnlineTotal} />
            ) : (
                <AILocalModelList ref={localRef} setLocalTotal={setLocalTotal} />
            )}
        </div>
    )
})

export default AIModelList

const AIOnlineModelList: React.FC<AIOnlineModelListProps> = React.memo(
    forwardRef((props, ref) => {
        const {setOnlineTotal} = props
        const [spinning, setSpinning] = useState<boolean>(false)
        const [isRef, setIsRef] = useState<boolean>(false)

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
            getList()
        }, [])
        const getList = useMemoizedFn(() => {
            setTimeout(() => {
                setSpinning(false)
                setOnlineTotal(100) // 模拟获取数据
                setIsRef((v) => !v)
            }, 200)
        })
        return (
            <YakitSpin spinning={spinning}>
                <RollingLoadList<SelectOptionsProps>
                    data={[]}
                    loadMoreData={() => {}}
                    renderRow={(rowData: SelectOptionsProps, index: number) => {
                        return (
                            <React.Fragment key={rowData.value}>
                                <AIOnlineModelListItem item={rowData} />
                            </React.Fragment>
                        )
                    }}
                    classNameRow={styles["ai-online-model-list-row"]}
                    classNameList={styles["ai-online-model-list"]}
                    page={1}
                    hasMore={false}
                    loading={spinning}
                    defItemHeight={120}
                    rowKey='Name'
                    isRef={isRef}
                />
            </YakitSpin>
        )
    })
)
const AIOnlineModelListItem: React.FC<AIOnlineModelListItemProps> = React.memo((props) => {
    const {item} = props
    return <div></div>
})
const AILocalModelList: React.FC<AILocalModelListProps> = React.memo(
    forwardRef((props, ref) => {
        const {setLocalTotal} = props
        const [spinning, setSpinning] = useState<boolean>(false)
        const [isRef, setIsRef] = useState<boolean>(false)
        const [supportedModels, setSupportedModels] = useState<LocalModelConfig[]>([])

        const [llamaServerReady, setLlamaServerReady] = useState<boolean>(false)
        const [llamaServerChecking, setLlamaServerChecking] = useState<boolean>(true)

        useImperativeHandle(
            ref,
            () => ({
                onRefresh: () => {
                    console.log("Refreshing local model list...")
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
                    console.log("response", response)
                    setLocalTotal(response?.Models?.length || 0)
                    setSupportedModels(response?.Models || [])
                })
                .finally(() => {
                    setTimeout(() => {
                        setSpinning(false)
                        setIsRef((v) => !v)
                    }, 200)
                })
        })
        const installLlamaServer = useMemoizedFn(() => {
            const m = showYakitModal({
                title: "安装模型环境",
                width: "50%",
                maskClosable: false,
                content: (
                    <InstallLlamaServerModelPrompt
                        onFinished={() => {
                            m.destroy()
                            init()
                        }}
                        onClose={() => {
                            m.destroy()
                        }}
                    />
                ),
                footer: null
            })
        })
        const code = useCreation(() => {
            return "sudo xattr -r -d com.apple.quarantine ~/yakit-projects/projects/libs/llama-server"
        }, [])
        return llamaServerReady ? (
            <YakitSpin spinning={spinning}>
                <RollingLoadList<LocalModelConfig>
                    data={supportedModels}
                    loadMoreData={() => {}}
                    renderRow={(rowData: LocalModelConfig, index: number) => {
                        return (
                            <React.Fragment key={rowData.Name}>
                                <AILocalModelListItem item={rowData} />
                            </React.Fragment>
                        )
                    }}
                    classNameRow={styles["ai-local-model-list-row"]}
                    classNameList={styles["ai-local-model-list"]}
                    page={1}
                    hasMore={false}
                    loading={spinning}
                    defItemHeight={109}
                    rowKey='Name'
                    isRef={isRef}
                />
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
            </YakitSpin>
        )
    })
)

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
    const {item} = props
    const [isReady, setIsReady] = useState<boolean>(false)
    const [isRunning, setIsRunning] = useState<boolean>(false)
    const [visible, setVisible] = useState<boolean>(false)
    const tokenRef = useRef(randomString(60))
    useEffect(() => {
        const token = tokenRef.current
        ipcRenderer.on(`${token}-error`, (e, error) => {
            yakitNotify("error", `[StartLocalModel] error: ${error}`)
        })
        getModelReady()
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
            width: "50%",
            content: (
                <DownloadLlamaServerModelPrompt
                    modelName={item.Name}
                    onFinished={() => {
                        m.destroy()
                        getModelReady()
                    }}
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
                onDelete()
                break
            default:
                break
        }
        setVisible(false)
    })
    const onEdit = useMemoizedFn(() => {
        const m = showYakitModal({
            title: "添加本地模型",
            width: "50%",
            content: <AddAIModel onCancel={() => m.destroy()} />,
            footer: null
        })
    })
    const onDelete = useMemoizedFn(() => {
        yakitNotify("info", "删除功能暂未实现")
    })
    const number = useCreation(() => {
        const length = tagColors.length
        return Math.floor(Math.random() * length)
    }, [])
    return (
        <div className={styles["ai-local-model-list-item"]}>
            <div className={styles["ai-local-model-heard"]}>
                <div className={styles["ai-local-model-heard-name"]}>{item.Name}</div>
                <div className={styles["ai-local-model-heard-extra"]}>
                    {!isReady ? (
                        <YakitButton type='text' onClick={onDown}>
                            下载
                        </YakitButton>
                    ) : (
                        <>
                            {isRunning ? (
                                <YakitPopconfirm title={`确定要停止模型 ${item.Name} 吗？`} onConfirm={onStop}>
                                    <YakitButton type='text' size='small' colors='danger'>
                                        停止
                                    </YakitButton>
                                </YakitPopconfirm>
                            ) : (
                                <YakitButton type='text' onClick={onStart}>
                                    启动
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
                                <YakitButton size='small' icon={<OutlineDotsverticalIcon />} />
                            </YakitDropdownMenu>
                        </>
                    )}
                </div>
            </div>
            <div className={styles["ai-local-model-description"]}>{item.Description}</div>
            <div>
                <YakitTag size='small' className={styles["ai-local-model-type-tag"]} color={tagColors[number]}>
                    {item.Type}
                </YakitTag>
            </div>
        </div>
    )
})
