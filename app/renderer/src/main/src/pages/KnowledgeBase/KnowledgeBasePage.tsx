import {useEffect, useMemo, useRef, type FC} from "react"

import {Form} from "antd"
import {
    useAsyncEffect,
    useCreation,
    useDebounceFn,
    useMemoizedFn,
    useRequest,
    useSafeState,
    useUpdateEffect
} from "ahooks"

import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import AllInstallPlugins from "./compoment/AllInstallPlugins"
import {success, failed, info} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"

import KnowledgeBaseContent from "./compoment/KnowledgeBaseContent"
import {SolidPlayIcon} from "@/assets/icon/solid"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {CreateKnowledgeBase} from "./compoment/CreateKnowledgeBase"

import {compareKnowledgeBaseChangeList, getFileInfoList, targetInstallList} from "./utils"

import {useKnowledgeBase} from "./hooks/useKnowledgeBase"

import styles from "./knowledgeBase.module.scss"

import type {CreateKnowledgeBaseData, KnowledgeBaseContentProps} from "./TKnowledgeBase"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/enums/yakitRoute"
import {KnowledgeBaseTableHeaderProps} from "./compoment/KnowledgeBaseTableHeader"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {getAIModelList, isForcedSetAIModal} from "../ai-agent/aiModelList/utils"

const {ipcRenderer} = window.require("electron")

const KnowledgeBase: FC = () => {
    const [form] = Form.useForm()
    const apiRef = useRef<KnowledgeBaseTableHeaderProps["api"]>()
    const contentRef = useRef<any>(null)
    const [visible, setVisible] = useSafeState(false)

    const {
        initialize,
        editKnowledgeBase,
        knowledgeBases,
        addKnowledgeBase,
        deleteKnowledgeBase,
        clearAll,
        previousKnowledgeBases
    } = useKnowledgeBase()

    const [installPlug, setInstallPlug] = useSafeState(false)
    const [knowledgeBaseID, setKnowledgeBaseID] = useSafeState("")

    const createKnwledgeDataRef = useRef<CreateKnowledgeBaseData>()

    // 拉取还没安装的 binaries
    const {
        data: binariesToInstall,
        loading,
        refreshAsync: binariesToInstallRefreshAsync
    } = useRequest(
        async () => {
            const result = await ipcRenderer.invoke("ListThirdPartyBinary", {
                Pagination: {
                    Limit: 999
                }
            })
            const binariesList =
                result?.Binaries?.map((it) => ({
                    Name: it?.Name,
                    InstallPath: it?.InstallPath,
                    installToken: randomString(50),
                    Description: it.Description
                })) ?? []
            const resultList = targetInstallList
                .map((name) => binariesList.find((it) => it.Name === name))
                .filter((v) => v !== undefined)
            return resultList
        },
        {
            onSuccess: (result) => {
                const resultList = targetInstallList
                    .map((name) => result.find((it) => it.Name === name && !it.InstallPath))
                    .filter((v) => v !== undefined)
                const exclude = ["llama-server", "model-Qwen3-Embedding-0.6B-Q4"]

                const filteredInstall = resultList.filter((item) => !exclude.includes(item.Name))
                if (filteredInstall.length !== 0) {
                    info(`使用知识库缺少第三方依赖，需安装${filteredInstall.length}个`)
                    setInstallPlug(true)
                } else {
                    setInstallPlug(false)
                }
            },
            onError: (err) => {
                failed(`获取插件失败: ${err}`)
            }
        }
    )

    // 创建知识库
    const {runAsync: createKnowledgRunAsync, loading: createKnowledgLoading} = useRequest(
        async (params) => {
            const result = await ipcRenderer.invoke("CreateKnowledgeBaseV2", {
                Name: params.KnowledgeBaseName,
                Description: params.KnowledgeBaseDescription,
                Type: params.KnowledgeBaseType
            })
            return result
        },
        {
            manual: true,
            onSuccess: async (value) => {
                try {
                    await refreshAsync()
                    const KnowledgeBaseID = value?.KnowledgeBase?.ID
                    setKnowledgeBaseID(KnowledgeBaseID)
                    const addKnowledgeData = {
                        ...createKnwledgeDataRef.current,
                        ID: KnowledgeBaseID,
                        addManuallyItem: false
                    }
                    addKnowledgeBase(addKnowledgeData as CreateKnowledgeBaseData & {ID: string})
                    form.resetFields()
                    createKnwledgeDataRef.current = undefined
                    success("创建知识库成功")
                } catch (error) {
                    failed(`刷新知识库列表失败: ${error}`)
                }
            },
            onError: (error) => {
                failed(`创建知识库失败: ${error}`)
            }
        }
    )

    // 获取数据库侧边栏是否存在数据
    const {
        data: existsKnowledgeBase,
        runAsync: existsKnowledgeBaseAsync,
        refreshAsync,
        loading: existsKnowledgeLoading
    } = useRequest(
        async (Keyword?: string) => {
            const result: KnowledgeBaseContentProps = await ipcRenderer.invoke("GetKnowledgeBase", {
                Keyword,
                Pagination: {Limit: 9999, Page: 1, OrderBy: "updated_at", Sort: "desc"}
            })
            const {KnowledgeBases} = result

            const resultData = KnowledgeBases?.map((it) => ({
                ...createKnwledgeDataRef.current,
                ...it
            }))
            return resultData
        },
        {
            manual: true,
            onSuccess: (value) => {
                const FirstknowledgeBaseID = value?.findLast((item) => item.IsImported === false)?.ID
                if (FirstknowledgeBaseID) {
                    !knowledgeBaseID && setKnowledgeBaseID(FirstknowledgeBaseID)
                }
            }
        }
    )

    useUpdateEffect(() => {
        if (!existsKnowledgeBase) return

        const diff = compareKnowledgeBaseChangeList(knowledgeBases, existsKnowledgeBase)

        // 如果没有变化，直接退出，不要再 add/delete
        if (!diff || (!diff.increased?.length && !diff.deleted?.length)) {
            return
        }

        // 有新增
        if (diff.increased?.length) {
            addKnowledgeBase(diff.increased)
        }

        // 有删除
        if (diff.deleted?.length) {
            deleteKnowledgeBase(diff.deleted.map((it) => it.ID))
        }
    }, [existsKnowledgeBase])

    useAsyncEffect(async () => {
        if (!installPlug) {
            existsKnowledgeBaseAsync().then((res) => {
                const initKnowledgeBase =
                    res?.map((it) => ({
                        ...it,
                        streamstep: "success" as 1 | 2 | "success",
                        addManuallyItem: false,
                        historyGenerateKnowledgeList: []
                    })) ?? []
                res && initialize(initKnowledgeBase)
            })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [installPlug])

    useEffect(() => {
        const FirstknowledgeBaseID = knowledgeBases?.find((item) => item.IsImported === false)?.ID
        setKnowledgeBaseID(FirstknowledgeBaseID || "")
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useUpdateEffect(() => {
        refreshAsync()
    }, [knowledgeBases])

    // 创建知识库回调事件
    const handCreateKnowledgBase = async () => {
        try {
            const resultFormData = await form.validateFields()
            const file = getFileInfoList(resultFormData.KnowledgeBaseFile)
            const transformFormData = {
                ...resultFormData,
                KnowledgeBaseFile: file,
                streamToken: randomString(50),
                streamstep: 1,
                addManuallyItem: false,
                historyGenerateKnowledgeList: []
            }
            createKnwledgeDataRef.current = transformFormData
            await createKnowledgRunAsync(transformFormData)
        } catch (error) {
            // failed(error + "")
        }
    }

    const onCloseKnowledgeRepository = () => {
        if (apiRef?.current && apiRef.current.tokens.length > 0) {
            setVisible(true)
            return
        } else {
            clearAll()
            emiter.emit("closePage", JSON.stringify({route: YakitRoute.AI_REPOSITORY}))
        }
    }

    const onCancel = () => {
        setVisible(false)
    }

    useEffect(() => {
        emiter.on("onCloseKnowledgeRepository", onCloseKnowledgeRepository)
        return () => {
            emiter.off("onCloseKnowledgeRepository", onCloseKnowledgeRepository)
        }
    }, [])

    const [aiModelOptions, setAIModelOptions] = useSafeState<string>("")

    const getAIModelListOption = useDebounceFn(
        (refreshValue?: boolean) => {
            isForcedSetAIModal({
                noDataCall: () => {
                    setAIModelOptions("")
                },
                haveDataCall: (res) => {
                    refreshValue && onInitValue(res)
                }
            })
        },
        {wait: 200, leading: true}
    ).run

    const onInitValue = useMemoizedFn((res) => {
        if (res && res.onlineModels.length > 0) {
            setAIModelOptions((res.onlineModels[0].Type as string) || "")
        } else if (res && res.localModels.length > 0) {
            setAIModelOptions((res.localModels[0].Name as string) || "")
        }
    })

    useAsyncEffect(async () => {
        const result = await getAIModelList()
        onInitValue(result)
    }, [])

    useEffect(() => {
        getAIModelListOption(!aiModelOptions)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [aiModelOptions])

    const knowledgeBaseEntrance = useMemo(() => {
        switch (true) {
            // 缺失插件时展示需下载插件页面
            case installPlug:
                return (
                    <YakitSpin spinning={loading || existsKnowledgeLoading}>
                        <AllInstallPlugins
                            onInstallPlug={setInstallPlug}
                            binariesToInstall={binariesToInstall}
                            binariesToInstallRefreshAsync={binariesToInstallRefreshAsync}
                        />
                    </YakitSpin>
                )
            // 无知识库时展示添加知识库页面
            case !existsKnowledgeBase?.length:
                return (
                    <YakitSpin spinning={loading || existsKnowledgeLoading}>
                        <div className={styles["create-knowledgBase"]}>
                            <div className={styles["create-content"]}>
                                <div className={styles["create-title"]}>创建知识库</div>
                                <CreateKnowledgeBase form={form} type={"new"} />
                                <div className={styles["create-button"]} onClick={handCreateKnowledgBase}>
                                    <YakitButton icon={<SolidPlayIcon />} loading={createKnowledgLoading}>
                                        开始创建
                                    </YakitButton>
                                </div>
                            </div>
                        </div>
                    </YakitSpin>
                )

            // 正常进入知识库页面
            default:
                return (
                    <KnowledgeBaseContent
                        ref={contentRef}
                        knowledgeBaseID={knowledgeBaseID}
                        setKnowledgeBaseID={setKnowledgeBaseID}
                        knowledgeBases={knowledgeBases}
                        previousKnowledgeBases={previousKnowledgeBases}
                        editKnowledgeBase={editKnowledgeBase}
                        clearAll={clearAll}
                        binariesToInstall={binariesToInstall}
                        apiRef={apiRef}
                        refreshAsync={refreshAsync}
                        binariesToInstallRefreshAsync={binariesToInstallRefreshAsync}
                    />
                )
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [existsKnowledgeBase, installPlug, loading, knowledgeBaseID])

    return (
        <div className={styles["repository-manage"]} id='repository-manage'>
            <div className={styles["repository-container"]}>{knowledgeBaseEntrance}</div>
            <YakitHint
                visible={visible}
                // heardIcon={<OutlineLoadingIcon className={styles["icon-rotate-animation"]} />}
                title={"知识库未构建完成"}
                content={"知识未构建完成，是否确定关闭"}
                okButtonText='立即关闭'
                onOk={() => contentRef.current?.onOK?.()}
                cancelButtonText='稍后再说'
                onCancel={onCancel}
            />
        </div>
    )
}

export default KnowledgeBase
