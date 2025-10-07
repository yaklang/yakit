import {Dispatch, SetStateAction, type FC} from "react"

import {KnowledgeBaseSidebar} from "./KnowledgeBaseSidebar"

import styles from "../knowledgeBase.module.scss"
import KnowledgeBaseContainer from "./KnowledgeBaseContainer"
import {KnowledgeBaseItem} from "../hooks/useKnowledgeBase"
import {TExistsKnowledgeBaseAsync} from "../TKnowledgeBase"
import {useAsyncEffect, useDeepCompareEffect, useMemoizedFn} from "ahooks"
import {BuildingKnowledgeBase, BuildingKnowledgeBaseEntry, compareKnowledgeBaseChange} from "../utils"
import useMultipleHoldGRPCStream from "../hooks/useMultipleHoldGRPCStream"
import {failed} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {forEach} from "lodash"

interface KnowledgeBaseContentProps extends TExistsKnowledgeBaseAsync {
    knowledgeBaseID: string
    setKnowledgeBaseID: Dispatch<SetStateAction<string>>
    knowledgeBases: KnowledgeBaseItem[]
    previousKnowledgeBases: KnowledgeBaseItem[] | null
    editKnowledgeBase: (id: string, data: Partial<KnowledgeBaseItem>) => void
}

const KnowledgeBaseContent: FC<KnowledgeBaseContentProps> = ({
    existsKnowledgeBaseAsync,
    knowledgeBaseID,
    setKnowledgeBaseID,
    knowledgeBases,
    previousKnowledgeBases,
    editKnowledgeBase
}) => {
    const [streams, api] = useMultipleHoldGRPCStream()

    useAsyncEffect(async () => {
        // 对比知识库变化，有新增则启动构建
        const diff = compareKnowledgeBaseChange(previousKnowledgeBases, knowledgeBases)
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
                            if (targetItems && targetItems.streamstep === 1) {
                                const newStreams = randomString(50)
                                const updateItems: KnowledgeBaseItem = {
                                    ...targetItems,
                                    streamstep: 2,
                                    streamToken: newStreams
                                }
                                editKnowledgeBase(targetItems.ID, updateItems)
                                await starKnowledgeeBaseEntry(updateItems)
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
                        console.log("知识条目构建完成")
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
            failed(`Error: ${e}`)
        }
    })

    return (
        <div className={styles["knowledge-base-body"]}>
            <KnowledgeBaseSidebar
                knowledgeBases={knowledgeBases}
                knowledgeBaseID={knowledgeBaseID}
                setKnowledgeBaseID={setKnowledgeBaseID}
                existsKnowledgeBaseAsync={existsKnowledgeBaseAsync}
                tokens={api.tokens}
            />
            <KnowledgeBaseContainer
                knowledgeBases={knowledgeBases}
                knowledgeBaseID={knowledgeBaseID}
                setKnowledgeBaseID={setKnowledgeBaseID}
                existsKnowledgeBaseAsync={existsKnowledgeBaseAsync}
                streams={streams}
                api={api}
            />
        </div>
    )
}

export default KnowledgeBaseContent
