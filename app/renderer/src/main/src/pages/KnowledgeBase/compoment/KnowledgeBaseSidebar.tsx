import React, {Dispatch, ReactNode, SetStateAction, useEffect, useRef, useState, type FC} from "react"
import {useAsyncEffect, useMemoizedFn, useRequest, useSafeState} from "ahooks"

import {
    OutlineFolderopenIcon,
    OutlineLoadingIcon,
    OutlinePaintbrushIcon,
    OutlineQuestionmarkcircleIcon,
    OutlineRefreshIcon,
    OutlineStethoscopeIcon
} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"

import styles from "../knowledgeBase.module.scss"
import classNames from "classnames"
import {
    apiFetchQueryOnlieRageLatest,
    ClearAllKnowledgeBase,
    downloadWithEvents,
    insertModaOptions,
    KnowledgeTabList,
    KnowledgeTabListEnum,
    OnlieRageLatestResponse,
    prioritizeProcessingItems,
    targetIcon,
    exclude
} from "../utils"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {type KnowledgeBaseItem} from "../hooks/useKnowledgeBase"
import {SolidLightningBoltIcon, SolidOutlineSearchIcon} from "@/assets/icon/solid"
import {AddKnowledgenBaseDropdownMenu} from "./AddKnowledgenBaseDropdownMenu"
import {OperateKnowledgenBaseItem} from "./OperateKnowledgenBaseItem"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import useMultipleHoldGRPCStream from "../hooks/useMultipleHoldGRPCStream"

import {YakitRoute} from "@/enums/yakitRoute"
import emiter from "@/utils/eventBus/eventBus"
import {Divider, Tooltip} from "antd"
import {BinaryInfo} from "./AllInstallPluginsProps"
import {YakitLogoSvgIcon, YakitSpinLogoSvgIcon} from "../icon/sidebarIcon"
import {onOpenLocalFileByPath} from "@/pages/notepadManage/notepadManage/utils"
import {CreateKnowledgeBaseData, TClearKnowledgeResponse} from "../TKnowledgeBase"

import {YakitSideTab} from "@/components/yakitSideTab/YakitSideTab"
import {CloudDownloadIcon} from "@/assets/newIcon"
import {installWithEvents} from "./AllInstallPlugins"
import {failed, success} from "@/utils/notification"
import AIModelList from "@/pages/ai-agent/aiModelList/AIModelList"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {grpcFetchLocalPluginDetail} from "@/pages/pluginHub/utils/grpc"
import {randomString} from "@/utils/randomUtil"
import {YakitCheckableTag} from "@/components/yakitUI/YakitTag/YakitCheckableTag"
import {apiCancelDebugPlugin} from "@/pages/plugins/utils"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {OutlineBotIcon} from "@/assets/icon/colors"
import {convertBodyLength} from "@/pages/fuzzer/components/HTTPFuzzerPageTable/HTTPFuzzerPageTable"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {useCheckKnowledgePlugin} from "../hooks/useCheckKnowledgePlugin"
import {setLocalValue} from "@/utils/kv"
import {KnowledgeBaseGV} from "@/yakitGV"

const {YakitPanel} = YakitCollapse

const {ipcRenderer} = window.require("electron")

export const installOnlineRagWithEvents = (
    url: string,
    binary: {RagName?: string; Force: boolean; All?: boolean},
    token: string
) => {
    const invokeArgs = binary.All ? {Force: binary.Force, All: binary.All} : binary
    return downloadWithEvents(url, invokeArgs, token)
}

export interface TKnowledgeBaseSidebarProps {
    knowledgeBases: Array<KnowledgeBaseItem & {CreatedFromUI?: boolean}>
    knowledgeBaseID: string
    setKnowledgeBaseID: (id: string) => void
    api?: ReturnType<typeof useMultipleHoldGRPCStream>[1]
    streams?: ReturnType<typeof useMultipleHoldGRPCStream>[0]
    setOpenQA: Dispatch<SetStateAction<boolean>>
    refreshAsync?: () => Promise<CreateKnowledgeBaseData[] | undefined>
    addMode: string[]
    setAddMode: Dispatch<SetStateAction<string[]>>
    handleValidateAIModelUsable: () => Promise<void>
    isAIModelAvailable: boolean
    setIsAIModelAvailable: Dispatch<SetStateAction<boolean>>
    aIModelAvailableTokens: string
    progress: number
    loading?: boolean
    refreshOlineRag?: boolean
    setRefreshOlineRag?: Dispatch<SetStateAction<boolean>>
    setJoyrideRun?: React.Dispatch<
        React.SetStateAction<{
            step: number
            visible: boolean
        }>
    >
}

const KnowledgeBaseSidebar: FC<TKnowledgeBaseSidebarProps> = ({
    knowledgeBases,
    knowledgeBaseID,
    setKnowledgeBaseID,
    api,
    setOpenQA,
    refreshAsync,
    addMode,
    setAddMode,
    handleValidateAIModelUsable,
    setIsAIModelAvailable,
    progress,
    loading,
    refreshOlineRag,
    setRefreshOlineRag,
    setJoyrideRun
}) => {
    const [active, setActive] = useSafeState<KnowledgeTabListEnum>(KnowledgeTabListEnum.Knowledge)
    const [expand, setExpand] = useSafeState<boolean>(true)
    const [knowledgeBase, setKnowledgeBase] = useSafeState<Array<KnowledgeBaseItem & {CreatedFromUI?: boolean}>>([])
    const [menuSelectedId, setMenuSelectedId] = useSafeState<string>()
    const [sidebarSearchValue, setSidebarSearchValue] = useSafeState("")
    const [eachProgress, setEachProgress] = useSafeState<Record<string, number>>({})
    const [installTokens, setInstallTokens] = useSafeState<string[]>([])

    const {ThirdPartyBinaryRunAsync: binariesToInstallRefreshAsync, binariesToInstall} = useCheckKnowledgePlugin()

    const [clearAllVisible, setClearAllVisible] = useSafeState(false)
    const [clearAllContent, setClearAllContent] = useSafeState({
        loading: false,
        help: "",
        scriptName: "",
        clearAllStreamToken: ""
    })

    const downloadSingle = async (binary: {Name: string; installToken: string}) => {
        try {
            setInstallTokens((prev) => {
                if (!prev.includes(binary.installToken)) {
                    return [...prev, binary.installToken]
                }
                return prev
            })

            await installWithEvents("InstallThirdPartyBinary", {Name: binary.Name, Force: true}, binary.installToken)

            success(`${binary.Name} 下载完成`)
            await binariesToInstallRefreshAsync?.()
            setInstallTokens([])
        } catch (err) {
            failed(`${binary.Name} 下载失败: ${err}`)
        }
    }

    // 监听插件下载进度（单独下载）
    useEffect(() => {
        if (!installTokens || installTokens.length === 0) return

        installTokens.forEach((token) => {
            const onData = (_, data) => {
                if (data?.Progress > 0) {
                    const progressValue = Math.ceil(data.Progress)
                    setEachProgress((prev) => ({
                        ...prev,
                        [token]: progressValue
                    }))
                }
            }

            const onError = () => {}

            const onEnd = () => {}

            ipcRenderer.on(`${token}-data`, onData)
            ipcRenderer.on(`${token}-error`, onError)
            ipcRenderer.on(`${token}-end`, onEnd)
        })

        return () => {
            installTokens.forEach((token) => {
                ipcRenderer.invoke("cancel-InstallThirdPartyBinary", token)
                ipcRenderer.removeAllListeners(`${token}-data`)
                ipcRenderer.removeAllListeners(`${token}-error`)
                ipcRenderer.removeAllListeners(`${token}-end`)
            })
        }
    }, [installTokens])

    const handleSetActive = useMemoizedFn((value: KnowledgeTabListEnum) => {
        setActive(value)
    })

    useEffect(() => {
        const isExternal = (it) => it.IsImported === true && (it.CreatedFromUI ?? false) === false
        const isManual = (it) => it.IsImported === false && it.CreatedFromUI === true
        const isOther = (it) => it.IsImported === false && (it.CreatedFromUI ?? false) === false

        const result =
            addMode.length === 0
                ? knowledgeBases
                : knowledgeBases.filter((it) => {
                      if (addMode.includes("external") && isExternal(it)) return true
                      if (addMode.includes("manual") && isManual(it)) return true
                      if (addMode.includes("other") && isOther(it)) return true
                      return false
                  })

        const processed = prioritizeProcessingItems(result)
        setKnowledgeBase(processed)
        // setKnowledgeBaseID(processed?.[0]?.ID ?? "")
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [knowledgeBases, addMode])

    const clearAllExecutorRef = useRef<((token: string) => Promise<void>) | null>(null)
    const handleCancelAll = useMemoizedFn(async () => {
        setClearAllContent((pre) => ({
            ...pre,
            loading: true
        }))

        try {
            const plugin: TClearKnowledgeResponse = await grpcFetchLocalPluginDetail({Name: "重置知识库"}, true)

            clearAllExecutorRef.current = ClearAllKnowledgeBase(plugin)

            setClearAllContent({
                loading: false,
                help: plugin.Help,
                scriptName: plugin.ScriptName,
                clearAllStreamToken: randomString(50)
            })

            setClearAllVisible(true)
        } catch (error) {
            failed(error + "")
        } finally {
            setClearAllContent((pre) => ({
                ...pre,
                loading: false
            }))
        }
    })

    const handleCancelAllClose = useMemoizedFn(() => {
        clearAllExecutorRef.current = null
        setClearAllVisible(false)
    })

    const handleCancelAllOk = useMemoizedFn(async () => {
        try {
            if (!clearAllExecutorRef.current) {
                return
            }
            await clearAllExecutorRef.current(clearAllContent.clearAllStreamToken)
            api?.createStream(clearAllContent.clearAllStreamToken, {
                taskName: "debug-plugin",
                apiKey: "DebugPlugin",
                token: clearAllContent.clearAllStreamToken,
                onEnd: async () => {
                    await Promise.all(api.tokens.map((token) => apiCancelDebugPlugin(token)))
                    api.clearAllStreams()
                    await refreshAsync?.()
                    setClearAllVisible(false)
                },
                onError: (e) => {
                    api.removeStream && api.removeStream(clearAllContent.clearAllStreamToken)
                }
            })
            try {
                setRefreshOlineRag?.((preValue) => !preValue)
            } catch (e) {}
        } catch (error) {
            failed(error + "")
        }
    })

    const [installOnlineRagsTokens, setInstallOnlineRagsTokens] = useSafeState<string[]>([])

    const [onlineRagProgress, setOnlineRagProgress] = useSafeState<Record<string, number>>({})

    // 一键下载所有状态
    const [allDownloadToken, setAllDownloadToken] = useSafeState<string>("")
    const [allDownloadProgress, setAllDownloadProgress] = useSafeState<number>(0)

    // 线上知识库列表 State
    const [onlineRagList, setOnlineRagList] = useSafeState<OnlieRageLatestResponse[]>([])

    // 获取线上知识库并存入onlineRagList
    const fetchAndSetOnlineRagList = useMemoizedFn(async () => {
        try {
            const res = await apiFetchQueryOnlieRageLatest()
            setOnlineRagList(Array.isArray(res) ? res.map((it) => ({...it, installToken: randomString(50)})) : [])
        } catch (err) {
            failed("获取线上知识库失败: " + err)
            setOnlineRagList([])
        }
    })

    // 下载线上知识库
    const onDownloadOnlineRag = async (ragItem?: OnlieRageLatestResponse, all?: boolean) => {
        try {
            if (all) {
                setInstallOnlineRagsTokens((prev) => {
                    const newTokens = onlineRagList
                        .map((item) => item.installToken)
                        .filter((token) => !prev.includes(token))
                    return [...prev, ...newTokens]
                })
            } else if (ragItem) {
                setInstallOnlineRagsTokens((prev) =>
                    prev.includes(ragItem.installToken) ? prev : [...prev, ragItem.installToken]
                )
            }

            const token = all ? randomString(50) : ragItem?.installToken || ""

            await installOnlineRagWithEvents(
                "DownloadRAGs",
                all ? {Force: true, All: true} : {RagName: ragItem?.name, Force: true, All: false},
                token
            )
            await binariesToInstallRefreshAsync?.()

            setAddMode((pre) => (pre.includes("external") ? pre : pre.concat("external")))
            setKnowledgeBaseID(knowledgeBase?.[0]?.ID ?? "")

            if (all) {
                success("所有线上知识库下载完成")
            } else if (ragItem) {
                success(`${ragItem.name_zh || ragItem.name} 下载完成`)
            }
        } catch (err) {
            if (all) {
                failed("下载所有线上知识库失败: " + err)
            } else if (ragItem) {
                failed(`${ragItem.name_zh || ragItem.name} 下载失败: ${err}`)
            }
        } finally {
            if (all) {
                setInstallOnlineRagsTokens((prev) =>
                    prev.filter((t) => !onlineRagList.some((item) => item.installToken === t))
                )
            } else if (ragItem) {
                setInstallOnlineRagsTokens((prev) => prev.filter((t) => t !== ragItem.installToken))
            }
        }
    }

    // 一键下载所有线上知识库
    const onDownloadAllOnlineRag = useMemoizedFn(async () => {
        try {
            const token = randomString(50)
            setAllDownloadToken(token)
            setAllDownloadProgress(0)

            setInstallOnlineRagsTokens((prev) => {
                const newTokens = onlineRagList
                    .map((item) => item.installToken)
                    .filter((token) => !prev.includes(token))
                return [...prev, ...newTokens]
            })

            await installOnlineRagWithEvents("DownloadRAGs", {Force: true, All: true}, token)

            await binariesToInstallRefreshAsync?.()
            setAddMode((pre) => (pre.includes("external") ? pre : pre.concat("external")))
            setKnowledgeBaseID(knowledgeBase?.[0]?.ID ?? "")

            success("所有线上知识库下载完成")
        } catch (err) {
            failed("一键下载所有线上知识库失败: " + err)
        } finally {
            setAllDownloadToken("")
            setAllDownloadProgress(0)
            setInstallOnlineRagsTokens((prev) =>
                prev.filter((t) => !onlineRagList.some((item) => item.installToken === t))
            )
        }
    })
    useEffect(() => {
        if (!installOnlineRagsTokens || installOnlineRagsTokens.length === 0) return

        installOnlineRagsTokens.forEach((token) => {
            const onData = (_, data) => {
                if (data?.Progress > 0) {
                    const progressValue = Math.ceil(data.Progress)
                    setOnlineRagProgress((prev) => ({
                        ...prev,
                        [token]: progressValue
                    }))
                }
            }

            const onError = () => {}

            const onEnd = async () => {}

            ipcRenderer.on(`${token}-data`, onData)
            ipcRenderer.on(`${token}-error`, onError)
            ipcRenderer.on(`${token}-end`, onEnd)
        })

        return () => {
            installOnlineRagsTokens.forEach((token) => {
                ipcRenderer.removeAllListeners(`${token}-data`)
                ipcRenderer.removeAllListeners(`${token}-error`)
                ipcRenderer.removeAllListeners(`${token}-end`)
            })
        }
    }, [installOnlineRagsTokens])

    // 监听一键下载进度
    useEffect(() => {
        if (!allDownloadToken) return

        const onData = (_, data) => {
            if (data?.Progress > 0) {
                const progressValue = Math.ceil(data.Progress)
                setAllDownloadProgress(progressValue)
            }
        }

        const onError = () => {}

        const onEnd = () => {}

        ipcRenderer.on(`${allDownloadToken}-data`, onData)
        ipcRenderer.on(`${allDownloadToken}-error`, onError)
        ipcRenderer.on(`${allDownloadToken}-end`, onEnd)

        return () => {
            ipcRenderer.removeAllListeners(`${allDownloadToken}-data`)
            ipcRenderer.removeAllListeners(`${allDownloadToken}-error`)
            ipcRenderer.removeAllListeners(`${allDownloadToken}-end`)
        }
    }, [allDownloadToken])

    const [onlineRagRefreshing, setOnlineRagRefreshing] = useSafeState<boolean>(false)
    // 刷新线上知识库列表和本地已下载列表
    const onRefreshOnlineRag = useMemoizedFn(async () => {
        try {
            setOnlineRagRefreshing(true)
            await fetchAndSetOnlineRagList()
        } catch (err) {
            failed("刷新失败: " + err)
        } finally {
            setOnlineRagRefreshing(false)
        }
    })

    // 首次加载时拉取线上知识库和本地快照
    useEffect(() => {
        fetchAndSetOnlineRagList()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useAsyncEffect(async () => {
        await onRefreshOnlineRag()
    }, [refreshOlineRag])

    const [overallProgress, setOverallProgress] = useState(0)
    const progressMap = useRef<Record<string, number>>({})
    // 并发安装所有
    const {run: runInstallAll, loading: InstallAllLoading} = useRequest(
        async () => {
            const exclude = ["llama-server", "model-Qwen3-Embedding-0.6B-Q4"]
            const filteredInstall = binariesToInstall?.filter((item) => !exclude.includes(item.Name)) ?? []
            const emptyInstallPathItem = filteredInstall?.filter((item) => item.InstallPath === "") ?? []
            if (!emptyInstallPathItem || emptyInstallPathItem.length === 0) {
                return
            } else {
                setOverallProgress(0)
                progressMap.current = {}
                const tokens = emptyInstallPathItem.map((it) => it.installToken)
                setInstallTokens(tokens)

                // 并发执行安装
                const promises = emptyInstallPathItem.map((b) =>
                    installWithEvents("InstallThirdPartyBinary", {Name: b.Name, Force: true}, b.installToken)
                )
                await Promise.all(promises)
            }

            return "ok"
        },
        {
            manual: true,
            onSuccess: async () => {
                try {
                    success("知识库所需插件安装完成")
                    setOverallProgress(100)
                    // onInstallPlug(false)
                    setInstallTokens([])
                    await binariesToInstallRefreshAsync?.()
                } catch (error) {
                    failed(error + "")
                }
            },
            onError: (err) => {
                failed(`插件安装失败: ${err}`)
                setInstallTokens([])
                setOverallProgress(0)
            }
        }
    )

    const renderTabContent = useMemoizedFn((key: KnowledgeTabListEnum) => {
        let content: ReactNode = <></>

        const generateInsertModaOptions = () => {
            const countMap = knowledgeBases.reduce(
                (acc, it) => {
                    if (it.CreatedFromUI) {
                        acc.manual++
                    } else if (it.IsImported) {
                        acc.external++
                    } else {
                        acc.other++
                    }
                    return acc
                },
                {
                    manual: 0,
                    external: 0,
                    other: 0
                }
            )

            return insertModaOptions.map((it) => {
                const count = countMap[it.value as keyof typeof countMap]
                return count !== undefined ? {...it, label: `${it.label}(${count})`} : it
            })
        }

        switch (key) {
            case KnowledgeTabListEnum.Knowledge:
                content = (
                    <div className={classNames(styles["knowledge-base-info"])}>
                        <div className={styles["knowledge-base-info-context"]}>
                            <div className={styles["knowledge-base-info-header"]}>
                                <div className={styles["knowledge-base-info-header-button"]}>
                                    <div className={styles["header-title"]}>知识库管理</div>
                                    <div className={styles["knowledge-size"]}>{knowledgeBases.length ?? 0}</div>
                                    <Tooltip title='查看知识库功能引导'>
                                        <OutlineQuestionmarkcircleIcon
                                            className={styles["knowledge-icon"]}
                                            onClick={() => {
                                                setJoyrideRun?.({
                                                    step: 1,
                                                    visible: true
                                                })
                                                setLocalValue(KnowledgeBaseGV.KnowledgeBaseJoyrideStep, false)
                                                setLocalValue(KnowledgeBaseGV.KnowledgeBaseJoyrideVisible, false)
                                            }}
                                        />
                                    </Tooltip>
                                </div>
                                <div className={styles["header-operate"]}>
                                    <AddKnowledgenBaseDropdownMenu
                                        setKnowledgeBaseID={setKnowledgeBaseID}
                                        setAddMode={setAddMode}
                                    />
                                    <Tooltip title={progress < 100 ? "知识库可用诊断进行中" : "知识库可用诊断"}>
                                        <YakitButton
                                            loading={progress < 100}
                                            type='text2'
                                            icon={<OutlineStethoscopeIcon />}
                                            className='second-step'
                                            onClick={() => {
                                                setIsAIModelAvailable(true)
                                                handleValidateAIModelUsable()
                                            }}
                                        />
                                    </Tooltip>
                                    <Tooltip title='刷新知识库列表'>
                                        <YakitButton
                                            type='text2'
                                            icon={<OutlineRefreshIcon />}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                refreshAsync?.()
                                            }}
                                        />
                                    </Tooltip>
                                    <Divider style={{margin: 0}} type='vertical'></Divider>
                                    <Tooltip title='重置知识库列表'>
                                        <YakitButton
                                            icon={<OutlinePaintbrushIcon />}
                                            type='text2'
                                            onClick={handleCancelAll}
                                        />
                                    </Tooltip>
                                </div>
                            </div>
                            <div className={styles["repository-manage-search"]}>
                                <YakitInput
                                    placeholder={"请输入关键字搜索"}
                                    allowClear
                                    size='middle'
                                    prefix={<SolidOutlineSearchIcon />}
                                    value={sidebarSearchValue}
                                    onChange={(e) => setSidebarSearchValue(e.target.value)}
                                    onPressEnter={() =>
                                        setKnowledgeBase(() =>
                                            knowledgeBases.filter(
                                                (it) =>
                                                    it?.KnowledgeBaseName?.toLowerCase().startsWith(
                                                        sidebarSearchValue.toLowerCase()
                                                    )
                                            )
                                        )
                                    }
                                />
                            </div>

                            <div className={styles["repository-manage-options"]}>
                                <div>
                                    {generateInsertModaOptions()?.map((tag) => (
                                        <YakitCheckableTag
                                            key={tag.value}
                                            checked={addMode.includes(tag.value)}
                                            onChange={(checked) => {
                                                checked
                                                    ? setAddMode((it) => it.concat(tag.value))
                                                    : setAddMode((it) => it.filter((tar) => tar !== tag.value))
                                            }}
                                        >
                                            {tag.label}
                                        </YakitCheckableTag>
                                    ))}
                                </div>
                            </div>
                            <YakitSpin spinning={loading} wrapperClassName={styles["knowledge-base-info-spin"]}>
                                <div className={styles["knowledge-base-info-body"]}>
                                    {knowledgeBase.length > 0 ? (
                                        knowledgeBase.map((items, index) => {
                                            const Icon = targetIcon(index)
                                            return (
                                                <div
                                                    className={classNames(styles["knowledge-base-info-card"], {
                                                        [styles["base-info-card-selected"]]:
                                                            knowledgeBaseID === items.ID
                                                    })}
                                                    key={items.ID}
                                                    onClick={() => {
                                                        setOpenQA(false)
                                                        setKnowledgeBaseID(items.ID)
                                                    }}
                                                >
                                                    <div
                                                        className={classNames({
                                                            [styles["initial"]]: items.streamstep === 1,
                                                            [styles["content"]]: items.streamstep !== 1
                                                        })}
                                                    >
                                                        <div
                                                            className={classNames([styles["header"]], {
                                                                [styles["operate-dropdown-menu-open"]]:
                                                                    menuSelectedId === items.ID
                                                            })}
                                                        >
                                                            <Icon className={styles["icon"]} />
                                                            <div className={styles["title"]}>
                                                                {items.KnowledgeBaseName}
                                                            </div>
                                                            {api?.tokens?.includes(items.streamToken) &&
                                                            items.streamstep === 1 ? (
                                                                <div className={styles["tag"]}>
                                                                    <OutlineLoadingIcon
                                                                        className={styles["loading-icon"]}
                                                                    />
                                                                    生成中
                                                                </div>
                                                            ) : items.IsDefault ? (
                                                                <div className={styles["default-tag"]}>默认知识库</div>
                                                            ) : (
                                                                <div className={styles["type-tag"]}>
                                                                    {items.CreatedFromUI
                                                                        ? "手动创建"
                                                                        : items.IsImported
                                                                        ? "外部导入"
                                                                        : "其他"}
                                                                </div>
                                                            )}

                                                            <div
                                                                className={classNames([styles["operate"]])}
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                }}
                                                            >
                                                                <Tooltip title='AI 召回'>
                                                                    <SolidLightningBoltIcon
                                                                        className={styles["lightning-bolt-icon"]}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            setKnowledgeBaseID(items.ID)
                                                                            setOpenQA(true)
                                                                        }}
                                                                    />
                                                                </Tooltip>
                                                                <OperateKnowledgenBaseItem
                                                                    items={items}
                                                                    setMenuSelectedId={setMenuSelectedId}
                                                                    setKnowledgeBaseID={setKnowledgeBaseID}
                                                                    knowledgeBase={knowledgeBase}
                                                                    api={api}
                                                                    addMode={addMode}
                                                                    setRefreshOlineRag={setRefreshOlineRag}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className={styles["description"]}>
                                                            {api?.tokens?.includes(items.streamToken) &&
                                                            items.streamstep === 1
                                                                ? "知识库生成中，可以随时回来点击查看进度"
                                                                : items.KnowledgeBaseDescription?.trim() || "-"}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    ) : (
                                        <YakitEmpty style={{width: "100%"}} />
                                    )}
                                </div>
                            </YakitSpin>
                        </div>
                        <div className={styles["knowledge-base-collapse"]}>
                            <YakitCollapse defaultActiveKey={["online-knowledge"]}>
                                <YakitPanel
                                    header='线上知识库'
                                    key='online-knowledge'
                                    extra={(() => {
                                        const localMap = new Map(knowledgeBases.map((it) => [it.KnowledgeBaseName, it]))
                                        const allLatest = onlineRagList.every((item) => {
                                            const local = localMap.get(item.name)
                                            const isDownloaded = !!local
                                            const isLatest = isDownloaded && local.SerialVersionID === item.hash
                                            return isLatest
                                        })

                                        return (
                                            <div>
                                                <Tooltip title='刷新线上知识库'>
                                                    <YakitButton
                                                        type='text'
                                                        icon={<OutlineRefreshIcon />}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            onRefreshOnlineRag()
                                                        }}
                                                    />
                                                </Tooltip>
                                                {!allLatest && (
                                                    <YakitButton
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            onDownloadAllOnlineRag()
                                                        }}
                                                        style={{marginLeft: 4}}
                                                        disabled={!!allDownloadToken}
                                                    >
                                                        {allDownloadToken
                                                            ? `下载中... (${allDownloadProgress}%)`
                                                            : "一键下载"}
                                                    </YakitButton>
                                                )}
                                            </div>
                                        )
                                    })()}
                                >
                                    <YakitSpin spinning={onlineRagRefreshing}>
                                        <div className={styles["knowledge-base-collapse-panel"]}>
                                            {onlineRagList?.length > 0 ? (
                                                (() => {
                                                    // 本地已安装知识库：用 KnowledgeBaseName 做 key
                                                    const localMap = new Map(
                                                        knowledgeBases.map((it) => [it.KnowledgeBaseName, it])
                                                    )

                                                    return onlineRagList?.map((items) => {
                                                        const local = localMap.get(items.name)

                                                        // 是否已下载（同名即认为已下载）
                                                        const isDownloaded = !!local

                                                        // 是否已是最新（版本 hash 对齐）
                                                        const isLatest =
                                                            isDownloaded && local.SerialVersionID === items.hash

                                                        // 是否正在下载
                                                        const downloadingProgress =
                                                            onlineRagProgress?.[items.installToken]
                                                        const isDownloading =
                                                            downloadingProgress !== undefined &&
                                                            downloadingProgress < 100

                                                        return (
                                                            <div
                                                                className={classNames(
                                                                    styles["knowledge-base-info-card"]
                                                                )}
                                                                key={items.hash + items.version}
                                                            >
                                                                <div className={styles["content"]}>
                                                                    <div className={classNames([styles["header"]])}>
                                                                        <div className={styles["title-left"]}>
                                                                            <div className={styles["title"]}>
                                                                                {items.name_zh?.trim() || "-"}
                                                                            </div>
                                                                            <div className={styles["size"]}>
                                                                                {items.file_size && items.file_size > 0
                                                                                    ? convertBodyLength(items.file_size)
                                                                                    : "未知"}
                                                                            </div>
                                                                        </div>

                                                                        {/* 右侧状态区 */}
                                                                        {isDownloading ? (
                                                                            <div className={styles["downloading"]}>
                                                                                正在下载..（{downloadingProgress}%）
                                                                            </div>
                                                                        ) : !isDownloaded ? (
                                                                            (() => {
                                                                                const isLoading =
                                                                                    installOnlineRagsTokens.includes(
                                                                                        items.installToken
                                                                                    )
                                                                                return (
                                                                                    <YakitButton
                                                                                        type='outline1'
                                                                                        loading={isLoading}
                                                                                        disabled={isLoading}
                                                                                        onClick={() =>
                                                                                            onDownloadOnlineRag(items)
                                                                                        }
                                                                                    >
                                                                                        下载
                                                                                    </YakitButton>
                                                                                )
                                                                            })()
                                                                        ) : !isLatest ? (
                                                                            (() => {
                                                                                const isLoading =
                                                                                    installOnlineRagsTokens.includes(
                                                                                        items.installToken
                                                                                    )
                                                                                return (
                                                                                    <YakitButton
                                                                                        type='outline1'
                                                                                        loading={isLoading}
                                                                                        disabled={isLoading}
                                                                                        onClick={() =>
                                                                                            onDownloadOnlineRag(items)
                                                                                        }
                                                                                    >
                                                                                        更新
                                                                                    </YakitButton>
                                                                                )
                                                                            })()
                                                                        ) : (
                                                                            <div
                                                                                style={{
                                                                                    color: "var(--Colors-Use-Neutral-Disable)",
                                                                                    fontSize: "12px"
                                                                                }}
                                                                            >
                                                                                已是最新
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <div className={styles["description"]}>
                                                                        {items.version || "-"}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    })
                                                })()
                                            ) : (
                                                <YakitEmpty>
                                                    <YakitButton
                                                        icon={<OutlineRefreshIcon />}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            onRefreshOnlineRag()
                                                        }}
                                                    >
                                                        刷新
                                                    </YakitButton>
                                                </YakitEmpty>
                                            )}
                                        </div>
                                    </YakitSpin>
                                </YakitPanel>
                            </YakitCollapse>
                        </div>
                    </div>
                )
                break
            case KnowledgeTabListEnum.Plugin:
                content = (
                    <React.Suspense>
                        <div className={classNames(styles["knowledge-base-info"])}>
                            <div className={styles["knowledge-base-info-context"]}>
                                <div className={styles["knowledge-base-info-header"]}>
                                    <div className={styles["knowledge-base-info-header-button"]}>
                                        <div className={styles["header-title"]}>插件</div>
                                        <Tooltip title='刷新插件'>
                                            <YakitButton
                                                type='text'
                                                icon={<OutlineRefreshIcon />}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    binariesToInstallRefreshAsync?.()
                                                }}
                                            />
                                        </Tooltip>
                                    </div>
                                    <YakitButton
                                        className={styles["knowledge-base-info-header-all-install"]}
                                        type='outline1'
                                        icon={<CloudDownloadIcon />}
                                        onClick={() => {
                                            try {
                                                runInstallAll()
                                            } catch (error) {
                                                failed(error + "")
                                            }
                                        }}
                                        loading={InstallAllLoading}
                                    >
                                        一键下载插件
                                    </YakitButton>
                                </div>
                                <div className={styles["install-box"]}>
                                    {binariesToInstall?.map((it, key) => (
                                        <div className={styles["install-content-box"]} key={it.InstallPath + key}>
                                            <div className={styles["first-box"]}>
                                                <YakitLogoSvgIcon />
                                                <YakitSpinLogoSvgIcon className={styles["yakit-svg"]} />
                                            </div>
                                            <div
                                                className={classNames(styles["middle-box"], {
                                                    [styles["middle-width"]]: eachProgress?.[it.installToken] < 100
                                                })}
                                            >
                                                <div
                                                    className={classNames(styles["title-left"], {
                                                        [styles["title-left-exclude"]]: exclude.includes(it.Name)
                                                    })}
                                                >
                                                    <span className={styles["title"]}>{it.Name}</span>
                                                    {exclude.includes(it.Name) && <YakitTag>可不下载</YakitTag>}
                                                </div>
                                                <Tooltip title={it.Description}>
                                                    <div className={styles["describe"]}>{it.Description}</div>
                                                </Tooltip>
                                            </div>
                                            <div className={styles["last-box"]}>
                                                {!it.InstallPath && !eachProgress?.[it.installToken] ? (
                                                    <YakitButton
                                                        icon={<CloudDownloadIcon />}
                                                        onClick={() => downloadSingle(it)}
                                                    >
                                                        下载
                                                    </YakitButton>
                                                ) : eachProgress?.[it.installToken] < 100 ? (
                                                    <div className={styles["downloading"]}>
                                                        正在下载.. （{eachProgress?.[it.installToken]}.0%）
                                                    </div>
                                                ) : (
                                                    <YakitButton
                                                        type='text'
                                                        icon={<OutlineFolderopenIcon />}
                                                        onClick={() => onOpenLocalFileByPath(it.InstallPath)}
                                                    >
                                                        打开
                                                    </YakitButton>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </React.Suspense>
                )
                break
            case KnowledgeTabListEnum.AI_Model:
                content = (
                    <React.Suspense>
                        <AIModelList />
                    </React.Suspense>
                )
                break
            default:
                break
        }
        return content
    })

    return (
        <div className={styles["knowledge-base-sidebar-container"]}>
            <div
                className={styles["knowledge-base-sidebar-ai-button"]}
                onClick={() => {
                    emiter.emit(
                        "openPage",
                        JSON.stringify({
                            route: YakitRoute.AI_Agent,
                            params: {
                                defualtAIMentionCommandParams: [
                                    {
                                        mentionId: "@所有知识库",
                                        mentionType: "knowledgeBase",
                                        mentionName: "@所有知识库"
                                    }
                                ]
                            }
                        })
                    )
                }}
            >
                <OutlineBotIcon />
                <span>AI Agent</span>
            </div>

            <YakitSideTab
                type='vertical'
                yakitTabs={KnowledgeTabList}
                activeKey={active}
                onActiveKey={(v) => handleSetActive(v as KnowledgeTabListEnum)}
                show={expand}
                setShow={setExpand}
            >
                <div
                    className={classNames(styles["tab-content"], {
                        [styles["tab-content-hidden"]]: !expand
                    })}
                >
                    {renderTabContent(active)}
                </div>
                <YakitHint
                    visible={clearAllVisible}
                    title={clearAllContent.scriptName}
                    content={clearAllContent.help}
                    onOk={handleCancelAllOk}
                    onCancel={handleCancelAllClose}
                />
            </YakitSideTab>
        </div>
    )
}

export {KnowledgeBaseSidebar}
