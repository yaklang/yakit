import {Dispatch, SetStateAction, useEffect, useMemo, useRef, type FC} from "react"

import {KnowledgeBaseSidebar} from "./KnowledgeBaseSidebar"

import styles from "../knowledgeBase.module.scss"
import KnowledgeBaseContainer from "./KnowledgeBaseContainer"
import {KnowledgeBaseItem} from "../hooks/useKnowledgeBase"
import {useAsyncEffect, useDeepCompareEffect, useMemoizedFn, useSafeState} from "ahooks"
import {
    BuildingKnowledgeBase,
    BuildingKnowledgeBaseEntry,
    compareKnowledgeBaseChange,
    extractAddedHistory,
    findChangedObjects
} from "../utils"
import useMultipleHoldGRPCStream from "../hooks/useMultipleHoldGRPCStream"
import {failed, success} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/enums/yakitRoute"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {apiCancelDebugPlugin} from "@/pages/plugins/utils"
import {KnowledgeBaseQA} from "./KnowledgeBaseQA/KnowledgeBaseQA"
import {BinaryInfo} from "./AllInstallPluginsProps"

interface KnowledgeBaseContentProps {
    knowledgeBaseID: string
    setKnowledgeBaseID: Dispatch<SetStateAction<string>>
    knowledgeBases: KnowledgeBaseItem[]
    previousKnowledgeBases: KnowledgeBaseItem[] | null
    editKnowledgeBase: (id: string, data: Partial<KnowledgeBaseItem>) => void
    clearAll: () => void
    binariesToInstall: BinaryInfo[] | undefined
}

const KnowledgeBaseContent: FC<KnowledgeBaseContentProps> = ({
    knowledgeBaseID,
    setKnowledgeBaseID,
    knowledgeBases,
    previousKnowledgeBases,
    editKnowledgeBase,
    clearAll,
    binariesToInstall
}) => {
    const [visible, setVisible] = useSafeState(false)
    const [openQA, setOpenQA] = useSafeState({
        status: false,
        all: false
    })
    const [streams, api] = useMultipleHoldGRPCStream()
    const onOK = async () => {
        try {
            await Promise.all(api.tokens.map((token) => apiCancelDebugPlugin(token)))
            api.clearAllStreams()
            clearAll()
            emiter.emit("closePage", JSON.stringify({route: YakitRoute.AI_REPOSITORY}))
        } catch (e) {
            console.error("取消流时出错：", e)
        }
    }
    const apiRef = useRef(api)

    // 每次变化时更新 ref
    useDeepCompareEffect(() => {
        apiRef.current = api
    }, [api])

    const onCloseKnowledgeRepository = () => {
        if (apiRef.current.tokens.length > 0) {
            setVisible(true)
            return
        } else {
            emiter.emit("closePage", JSON.stringify({route: YakitRoute.AI_REPOSITORY}))
        }
    }

    useEffect(() => {
        emiter.on("onCloseKnowledgeRepository", onCloseKnowledgeRepository)
        return () => {
            emiter.off("onCloseKnowledgeRepository", onCloseKnowledgeRepository)
        }
    }, [])

    useAsyncEffect(async () => {
        const addManuallyItem = findChangedObjects(previousKnowledgeBases, knowledgeBases)
        // 对比知识库变化，有新增则启动构建
        const diff = compareKnowledgeBaseChange(previousKnowledgeBases, knowledgeBases)

        const targetKnowledgeBases = knowledgeBases.find((it) => it.ID === knowledgeBaseID) ?? {
            historyGenerateKnowledgeList: []
        }

        const targetPreviousKnowledgeBases = previousKnowledgeBases?.find((it) => it.ID === knowledgeBaseID) ?? {
            historyGenerateKnowledgeList: []
        }
        const addedHistory = targetPreviousKnowledgeBases
            ? extractAddedHistory(targetKnowledgeBases, targetPreviousKnowledgeBases)
            : null
        // 新增 知识库
        if (typeof diff === "object" && diff.increase) {
            const kb = diff.increase
            try {
                await BuildingKnowledgeBase(kb)
                if (api && typeof api.createStream === "function") {
                    api.createStream(kb.streamToken, {
                        taskName: "debug-plugin",
                        apiKey: "DebugPlugin",
                        token: kb.streamToken,
                        onEnd: async (info) => {
                            api.removeStream && api.removeStream(kb.streamToken)
                            const targetItems = knowledgeBases.find(
                                (item) => item.streamToken && item.streamToken === info?.requestToken
                            )
                            if (targetItems) {
                                const newStreams = randomString(50)
                                const updateItems: KnowledgeBaseItem = {
                                    ...targetItems,
                                    streamstep: 2,
                                    streamToken: newStreams
                                }
                                editKnowledgeBase(targetItems.ID, updateItems)
                            }
                        },
                        onError: (err) => {
                            try {
                                api.removeStream && api.removeStream(kb.streamToken)
                            } catch {
                                failed(`知识库构建流失败: ${err}`)
                            }
                        }
                    })
                }
            } catch (e) {
                failed(`启动知识库构建失败: ${e}`)
            }
            return
        } else if (addManuallyItem) {
            const kb = addManuallyItem
            try {
                await BuildingKnowledgeBase(kb)
                if (api && typeof api.createStream === "function") {
                    api.createStream(kb.streamToken, {
                        taskName: "debug-plugin",
                        apiKey: "DebugPlugin",
                        token: kb.streamToken,
                        onEnd: async (info) => {
                            api.removeStream && api.removeStream(kb.streamToken)
                            const targetItems = knowledgeBases.find(
                                (item) => item.streamToken && item.streamToken === info?.requestToken
                            )
                            if (targetItems) {
                                const newStreams = randomString(50)
                                const updateItems: KnowledgeBaseItem = {
                                    ...targetItems,
                                    streamstep: 2,
                                    streamToken: newStreams
                                }
                                editKnowledgeBase(targetItems.ID, updateItems)
                            }
                        },
                        onError: (err) => {
                            try {
                                api.removeStream && api.removeStream(kb.streamToken)
                            } catch {
                                failed(`知识库构建流失败: ${err}`)
                            }
                        }
                    })
                }
            } catch (e) {
                failed(`启动知识库构建失败: ${e}`)
            }
            return
        } else if (addedHistory) {
            const generateKnowledge = {...targetKnowledgeBases, ...addedHistory}
            await BuildingKnowledgeBaseEntry({...generateKnowledge, streamToken: addedHistory.token})
            try {
                if (api && typeof api.createStream === "function") {
                    api.createStream(generateKnowledge.token, {
                        taskName: "debug-plugin",
                        apiKey: "DebugPlugin",
                        token: generateKnowledge.token,
                        onEnd: () => {
                            api.removeStream && api.removeStream(generateKnowledge.token)
                            success(generateKnowledge.name + "构建完成")
                            editKnowledgeBase(generateKnowledge.ID, {
                                ...targetKnowledgeBases,
                                historyGenerateKnowledgeList: targetKnowledgeBases.historyGenerateKnowledgeList.filter(
                                    (it) => it.token !== generateKnowledge.token
                                )
                            })
                        },
                        onError: (e) => {
                            try {
                                api.removeStream && api.removeStream(generateKnowledge.token)
                            } catch {
                                failed(`知识库条目构建流失败: ${e}`)
                            }
                        }
                    })
                }
            } catch (e) {
                failed(`知识库条目构建流失败: ${e}`)
            }
            return
        } else {
            knowledgeBases.forEach(async (updateItems) => {
                updateItems.streamstep === 2 && updateItems.streamToken && (await starKnowledgeeBaseEntry(updateItems))
            })
        }
    }, [knowledgeBases, previousKnowledgeBases])

    const starKnowledgeeBaseEntry = useMemoizedFn(async (updateItems: KnowledgeBaseItem) => {
        try {
            await BuildingKnowledgeBaseEntry(updateItems)
            if (api && typeof api.createStream === "function") {
                api.createStream(updateItems.streamToken, {
                    taskName: "debug-plugin",
                    apiKey: "DebugPlugin",
                    token: updateItems.streamToken,
                    onEnd: () => {
                        api.removeStream && api.removeStream(updateItems.streamToken)
                        editKnowledgeBase(updateItems.ID, {
                            ...updateItems,
                            streamstep: "success"
                        })
                    },
                    onError: (e) => {
                        try {
                            api.removeStream && api.removeStream(updateItems.streamToken)
                        } catch {
                            failed(`知识库条目构建流失败: ${e}`)
                        }
                    }
                })
            }
        } catch (e) {
            failed(`知识库条目构建流失败: ${e}`)
        }
    })

    const onCancel = () => {
        setVisible(false)
    }

    const targetSelectedKnowledgeBaseItem = useMemo(() => {
        const result = knowledgeBases.find((it) => it.ID === knowledgeBaseID)
        return result
    }, [openQA, knowledgeBaseID])
    return (
        <div className={styles["knowledge-base-body"]}>
            <KnowledgeBaseSidebar
                knowledgeBases={knowledgeBases}
                knowledgeBaseID={knowledgeBaseID}
                setKnowledgeBaseID={setKnowledgeBaseID}
                api={api}
                setOpenQA={setOpenQA}
                binariesToInstall={binariesToInstall}
            />
            <KnowledgeBaseContainer
                knowledgeBases={knowledgeBases}
                knowledgeBaseID={knowledgeBaseID}
                setKnowledgeBaseID={setKnowledgeBaseID}
                streams={streams}
                api={api}
                setOpenQA={setOpenQA}
            />
            <KnowledgeBaseQA
                openQA={openQA}
                setOpenQA={setOpenQA}
                knowledgeBase={targetSelectedKnowledgeBaseItem}
                knowledgeBaseID={knowledgeBaseID}
            />
            <YakitHint
                visible={visible}
                // heardIcon={<OutlineLoadingIcon className={styles["icon-rotate-animation"]} />}
                title={"知识库未构建完成"}
                content={"知识未构建完成，是否确定关闭"}
                okButtonText='立即关闭'
                onOk={onOK}
                cancelButtonText='稍后再说'
                onCancel={onCancel}
            />
        </div>
    )
}

export default KnowledgeBaseContent
