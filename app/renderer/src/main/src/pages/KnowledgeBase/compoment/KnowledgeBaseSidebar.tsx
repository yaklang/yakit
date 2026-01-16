import React, {Dispatch, ReactNode, SetStateAction, useEffect, useRef, type FC} from "react"
import {useAsyncEffect, useMemoizedFn, useRequest, useSafeState} from "ahooks"

import {OutlineAiChatIcon, OutlineFolderopenIcon, OutlineLoadingIcon, OutlineRefreshIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"

import styles from "../knowledgeBase.module.scss"
import classNames from "classnames"
import {
    apiFetchQueryOnlieRageLatest,
    BuildingOnlineKnowledgeBase,
    ClearAllKnowledgeBase,
    insertModaOptions,
    KnowledgeTabList,
    KnowledgeTabListEnum,
    prioritizeProcessingItems,
    targetIcon
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
import {Tooltip} from "antd"
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
import {API} from "@/services/swagger/resposeType"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"

const {YakitPanel} = YakitCollapse

const {ipcRenderer} = window.require("electron")

export interface TKnowledgeBaseSidebarProps {
    knowledgeBases: Array<KnowledgeBaseItem & {CreatedFromUI?: boolean}>
    knowledgeBaseID: string
    setKnowledgeBaseID: (id: string) => void
    api?: ReturnType<typeof useMultipleHoldGRPCStream>[1]
    streams?: ReturnType<typeof useMultipleHoldGRPCStream>[0]
    setOpenQA: Dispatch<SetStateAction<boolean>>
    binariesToInstall?: BinaryInfo[]
    refreshAsync?: () => Promise<CreateKnowledgeBaseData[] | undefined>
    binariesToInstallRefreshAsync?: () => Promise<any[]>
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
}

const KnowledgeBaseSidebar: FC<TKnowledgeBaseSidebarProps> = ({
    knowledgeBases,
    knowledgeBaseID,
    setKnowledgeBaseID,
    api,
    setOpenQA,
    binariesToInstall,
    refreshAsync,
    binariesToInstallRefreshAsync,
    addMode,
    setAddMode,
    handleValidateAIModelUsable,
    setIsAIModelAvailable,
    progress,
    loading,
    refreshOlineRag,
    setRefreshOlineRag
}) => {
    const [active, setActive] = useSafeState<KnowledgeTabListEnum>(KnowledgeTabListEnum.Knowledge)
    const [expand, setExpand] = useSafeState<boolean>(true)
    const [knowledgeBase, setKnowledgeBase] = useSafeState<Array<KnowledgeBaseItem & {CreatedFromUI?: boolean}>>([])
    const [menuSelectedId, setMenuSelectedId] = useSafeState<string>()
    const [sidebarSearchValue, setSidebarSearchValue] = useSafeState("")
    const [eachProgress, setEachProgress] = useSafeState<Record<string, number>>({})
    const [installTokens, setInstallTokens] = useSafeState<string[]>([])

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

            await installWithEvents({Name: binary.Name, Force: true}, binary.installToken)

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

            const onError = (_, error) => {
                failed(`下载失败: ${error}`)
            }

            const onEnd = () => {}

            ipcRenderer.on(`${token}-data`, onData)
            ipcRenderer.on(`${token}-error`, onError)
            ipcRenderer.on(`${token}-end`, onEnd)
        })

        return () => {
            installTokens.forEach((token) => {
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
        setKnowledgeBaseID(processed?.[0]?.ID ?? "")
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
                for (const kb of knowledgeBases) {
                    await ipcRenderer.invoke("remove-previous-online-rag-by-name", {
                        name: kb.KnowledgeBaseName
                    })
                }

                setRefreshOlineRag?.((preValue) => !preValue)
            } catch (e) {}
        } catch (error) {
            failed(error + "")
        }
    })

    // 本地已下载线上知识库
    const [downloadedOnlineRags, setDownloadedOnlineRags] = useSafeState<API.OnlieRageLatest[]>([])
    // 线上知识库下载中状态
    const [onlineRagDownloading, setOnlineRagDownloading] = useSafeState<Record<string, boolean>>({})

    // 拉取本地已下载线上知识库
    const refreshDownloadedOnlineRags = useMemoizedFn(() => {
        ipcRenderer
            .invoke("read-previous-online-rag")
            .then(setDownloadedOnlineRags)
            .catch(() => setDownloadedOnlineRags([]))
    })

    useEffect(() => {
        refreshDownloadedOnlineRags()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // 线上知识库列表 State
    const [onlineRagList, setOnlineRagList] = useSafeState<API.OnlieRageLatest[]>([])

    // 获取线上知识库并存入onlineRagList
    const fetchAndSetOnlineRagList = useMemoizedFn(async () => {
        try {
            const res = await apiFetchQueryOnlieRageLatest()
            setOnlineRagList(res)
        } catch (err) {
            failed("获取线上知识库失败: " + err)
            setOnlineRagList([])
        }
    })

    // 下载线上知识库
    const onDownloadOnlineRag = async (ragItem: API.OnlieRageLatest) => {
        setOnlineRagDownloading((prev) => ({...prev, [ragItem.hash]: true}))
        const newToken = randomString(40)
        let localFilePath: string | undefined
        try {
            localFilePath = await ipcRenderer.invoke("download-latest-online-rag", ragItem)

            await handleBuildingOnlineKnowledge(
                {
                    ...ragItem,
                    file_address: localFilePath
                },
                newToken
            )

            await refreshDownloadedOnlineRags()
        } catch (err) {
            // 1. 删除已下载的文件
            if (localFilePath) {
                try {
                    await ipcRenderer.invoke("delete-local-file", localFilePath)
                } catch (e) {}
            }
            try {
                await ipcRenderer.invoke("remove-previous-online-rag", {
                    hash: ragItem.hash,
                    file: localFilePath
                })
            } catch (e) {}
            await refreshDownloadedOnlineRags()
        } finally {
            setOnlineRagDownloading((prev) => ({...prev, [ragItem.hash]: false}))
        }
    }

    const handleBuildingOnlineKnowledge = useMemoizedFn(
        async (ragItem: API.OnlieRageLatest & {file_address?: string}, newToken: string) => {
            const rag_file_path = ragItem.file_address
            const rag_name = ragItem.name
            const rag_serial_version_uid = ragItem.hash
            try {
                const plugin: TClearKnowledgeResponse = await grpcFetchLocalPluginDetail({Name: "导入默认知识库"}, true)
                // 先构建知识库
                await BuildingOnlineKnowledgeBase(
                    {...plugin, rag_file_path, rag_name, rag_serial_version_uid},
                    newToken
                )
                // 返回一个 Promise，只有 onEnd 触发后 resolve，否则 onError reject
                return await new Promise<void>((resolve, reject) => {
                    api?.createStream(newToken, {
                        taskName: "debug-plugin",
                        apiKey: "DebugPlugin",
                        token: newToken,
                        onEnd: async () => {
                            try {
                                setAddMode((pre) => (pre.includes("external") ? pre : pre.concat("external")))
                                await refreshAsync?.()
                            } catch (e) {}
                            resolve()
                        },
                        onError: (e) => {
                            api.removeStream && api.removeStream(newToken)
                            reject(e)
                        }
                    })
                })
            } catch (error) {
                throw error
            }
        }
    )

    const [onlineRagRefreshing, setOnlineRagRefreshing] = useSafeState<boolean>(false)
    // 刷新线上知识库列表和本地已下载列表
    const onRefreshOnlineRag = useMemoizedFn(async () => {
        try {
            setOnlineRagRefreshing(true)
            await Promise.all([fetchAndSetOnlineRagList(), refreshDownloadedOnlineRags()])
        } catch (err) {
            failed("刷新失败: " + err)
        } finally {
            setOnlineRagRefreshing(false)
        }
    })

    // 首次加载时拉取线上知识库和本地快照
    useEffect(() => {
        fetchAndSetOnlineRagList()
        refreshDownloadedOnlineRags()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useAsyncEffect(async () => {
        await onRefreshOnlineRag()
    }, [refreshOlineRag])

    const renderTabContent = useMemoizedFn((key: KnowledgeTabListEnum) => {
        let content: ReactNode = <></>
        switch (key) {
            case KnowledgeTabListEnum.Knowledge:
                content = (
                    <div className={classNames(styles["knowledge-base-info"])}>
                        <div className={styles["knowledge-base-info-context"]}>
                            <div className={styles["knowledge-base-info-header"]}>
                                <div className={styles["knowledge-base-info-header-button"]}>
                                    <div className={styles["header-title"]}>知识库管理</div>
                                    <div className={styles["knowledge-size"]}>{knowledgeBases.length ?? 0}</div>
                                    <Tooltip title='刷新知识库列表'>
                                        <YakitButton
                                            type='text'
                                            icon={<OutlineRefreshIcon />}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                refreshAsync?.()
                                            }}
                                        />
                                    </Tooltip>
                                </div>
                                <div className={styles["header-operate"]}>
                                    <div
                                        className={styles["ai-button"]}
                                        onClick={() => {
                                            emiter.emit(
                                                "openPage",
                                                JSON.stringify({
                                                    route: YakitRoute.AI_Agent,
                                                    params: {
                                                        inputString: "使用知识库回答:"
                                                    }
                                                })
                                            )
                                        }}
                                    >
                                        <OutlineAiChatIcon />
                                        AI 问答
                                    </div>

                                    <AddKnowledgenBaseDropdownMenu
                                        setKnowledgeBaseID={setKnowledgeBaseID}
                                        setAddMode={setAddMode}
                                    />
                                    <YakitButton
                                        loading={clearAllContent.loading}
                                        type='text'
                                        colors='danger'
                                        style={{height: 27}}
                                        onClick={handleCancelAll}
                                    >
                                        清空
                                    </YakitButton>
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
                                    {insertModaOptions.map((tag) => (
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

                                {progress !== 100 ? (
                                    <div className={styles["tag"]} onClick={() => setIsAIModelAvailable(true)}>
                                        <OutlineLoadingIcon className={styles["loading-icon"]} />
                                        知识库可用诊断中
                                    </div>
                                ) : (
                                    <YakitButton
                                        type='outline2'
                                        onClick={() => {
                                            setIsAIModelAvailable(true)
                                            handleValidateAIModelUsable()
                                        }}
                                    >
                                        知识库可用诊断
                                    </YakitButton>
                                )}
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
                                    extra={
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
                                    }
                                >
                                    <YakitSpin spinning={onlineRagRefreshing}>
                                        <div className={styles["knowledge-base-collapse-panel"]}>
                                            {onlineRagList.length > 0 ? (
                                                (() => {
                                                    const localMap = new Map(
                                                        downloadedOnlineRags.map((it) => [it.file, it])
                                                    )

                                                    return onlineRagList?.map((items) => {
                                                        const local = localMap.get(items.file)
                                                        const isDownloadedLatest = !!local && local.hash === items.hash
                                                        const downloading = !!onlineRagDownloading[items.hash]
                                                        return (
                                                            <div
                                                                className={classNames(
                                                                    styles["knowledge-base-info-card"]
                                                                )}
                                                                key={items.hash}
                                                            >
                                                                <div className={styles["content"]}>
                                                                    <div className={classNames([styles["header"]])}>
                                                                        <div className={styles["title"]}>
                                                                            {items.name_zh?.trim() || "-"}
                                                                        </div>
                                                                        {!isDownloadedLatest ? (
                                                                            <YakitButton
                                                                                type='outline1'
                                                                                loading={downloading}
                                                                                disabled={downloading}
                                                                                onClick={() =>
                                                                                    onDownloadOnlineRag(items)
                                                                                }
                                                                            >
                                                                                {!local
                                                                                    ? "下载"
                                                                                    : local.hash !== items.hash
                                                                                    ? "更新"
                                                                                    : "已下载"}
                                                                            </YakitButton>
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
                                                <div className={styles["title"]}>{it.Name}</div>
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
    )
}

export {KnowledgeBaseSidebar}
