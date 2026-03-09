import {useEffect, useMemo, useRef, type FC} from "react"

import {useAsyncEffect, useDebounceFn, useInViewport, useRequest, useSafeState, useUpdateEffect} from "ahooks"

import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import AllInstallPlugins from "./compoment/AllInstallPlugins"
import {failed} from "@/utils/notification"

import KnowledgeBaseContent from "./compoment/KnowledgeBaseContent"

import {compareKnowledgeBaseChangeList} from "./utils"

import {useKnowledgeBase} from "./hooks/useKnowledgeBase"

import styles from "./knowledgeBase.module.scss"

import type {CreateKnowledgeBaseData, KnowledgeBaseContentProps} from "./TKnowledgeBase"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/enums/yakitRoute"
import {KnowledgeBaseTableHeaderProps} from "./compoment/KnowledgeBaseTableHeader"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {isForcedSetAIModal} from "../ai-agent/aiModelList/utils"
import {useCheckKnowledgePlugin} from "./hooks/useCheckKnowledgePlugin"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

const {ipcRenderer} = window.require("electron")

const KnowledgeBase: FC = () => {
    const { t } = useI18nNamespaces(["aiAgent"])
    const apiRef = useRef<KnowledgeBaseTableHeaderProps["api"]>()
    const streamsRef = useRef<KnowledgeBaseTableHeaderProps["streams"]>()
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

    const [knowledgeBaseID, setKnowledgeBaseID] = useSafeState("")
    const {
        installPlug,
        loading: binariesToInstallLoading,
        ThirdPartyBinaryRunAsync,
        setInstallPlug,
        binariesToInstall
    } = useCheckKnowledgePlugin()

    const createKnwledgeDataRef = useRef<CreateKnowledgeBaseData>()

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
                // OnlyCreatedFromUI: true,
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
                const selectedKnowledgeBaseId = FirstknowledgeBaseID ? FirstknowledgeBaseID : value?.[0]?.ID ?? ""
                if (value?.length && value.length > 0) {
                    !knowledgeBaseID && setKnowledgeBaseID(selectedKnowledgeBaseId ?? "")
                } else {
                    setKnowledgeBaseID("")
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
        if (!installPlug && !binariesToInstallLoading) {
            try {
                const res = await existsKnowledgeBaseAsync()
                const initKnowledgeBase =
                    res?.map((it) => ({
                        ...it,
                        streamstep: "success" as 1 | 2 | "success",
                        addManuallyItem: false,
                        historyGenerateKnowledgeList: []
                    })) ?? []
                res && initialize(initKnowledgeBase)
            } catch (error) {
                failed(error + "")
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [installPlug, binariesToInstallLoading])

    useEffect(() => {
        const FirstknowledgeBaseID = knowledgeBases?.find((item) => item.IsImported === false)?.ID
        setKnowledgeBaseID(FirstknowledgeBaseID || "")
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const onCloseKnowledgeRepository = () => {
        if (apiRef?.current && apiRef.current.tokens?.length > 0) {
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

    const refRef = useRef<HTMLDivElement>(null)
    const [_, setAIModelOptions] = useSafeState<string>("")
    const [inViewport = true] = useInViewport(refRef)

    // getAIModelListOption mirror AIModelSelect trigger
    const getAIModelListOption = useDebounceFn(
        () => {
            isForcedSetAIModal({
                t,
                pageKey: "ai-repository",
                noDataCall: () => {
                    setAIModelOptions("")
                },
                mountContainer: document.getElementById("main-operator-page-body-ai-repository")
            })
        },
        {leading: true}
    ).run

    useAsyncEffect(async () => {
        if (inViewport) {
            try {
                await ThirdPartyBinaryRunAsync()
            } catch (error) {
                failed(error + "")
            }
        } else {
            getAIModelListOption()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inViewport])

    const knowledgeBaseEntrance = useMemo(() => {
        switch (true) {
            // 缺失插件时展示需下载插件页面
            case installPlug && !knowledgeBases?.length:
                return (
                    <YakitSpin spinning={binariesToInstallLoading || existsKnowledgeLoading}>
                        <AllInstallPlugins
                            onInstallPlug={setInstallPlug}
                            binariesToInstall={binariesToInstall}
                            binariesToInstallRefreshAsync={ThirdPartyBinaryRunAsync}
                        />
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
                        apiRef={apiRef}
                        refreshAsync={refreshAsync}
                        loading={existsKnowledgeLoading}
                        inViewport={inViewport}
                        streamsRef={streamsRef}
                    />
                )
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        installPlug,
        binariesToInstallLoading,
        existsKnowledgeLoading,
        binariesToInstall,
        existsKnowledgeBase?.length,
        knowledgeBaseID,
        knowledgeBases,
        inViewport,
        previousKnowledgeBases
    ])

    return (
        <div className={styles["repository-manage"]} id='repository-manage' ref={refRef}>
            <div className={styles["repository-container"]}>{knowledgeBaseEntrance}</div>
            <YakitHint
                visible={visible}
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
