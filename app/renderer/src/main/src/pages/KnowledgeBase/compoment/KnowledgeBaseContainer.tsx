import {type FC, memo, useMemo} from "react"
import {useAsyncEffect, useUpdateEffect} from "ahooks"

import KnowledgeBaseTable from "./KnowledgeBaseTable"
import {useKnowledgeBase} from "../hooks/useKnowledgeBase"
import {LightningBoltIcon} from "../icon/sidebarIcon"
import useMultipleHoldGRPCStream from "../hooks/useMultipleHoldGRPCStream"

import {BuildingKnowledgeBase, compareKnowledgeBaseChange, targetIcon} from "../utils"
import {renderFileTypeIcon} from "@/components/MilkdownEditor/CustomFile/CustomFile"
import {RoundedStopButton} from "@/pages/ai-re-act/aiReActChat/AIReActComponent"
import {OutlineLoadingIcon} from "@/assets/icon/outline"
import {PluginExecuteResult} from "@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResult"
import {failed} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"

import type {TKnowledgeBaseSidebarProps} from "./KnowledgeBaseSidebar"

import styles from "../knowledgeBase.module.scss"

type TKnowledgeBaseContainerProps = Omit<TKnowledgeBaseSidebarProps, "setKnowledgeBaseID">

const KnowledgeBaseContainer: FC<TKnowledgeBaseContainerProps> = ({knowledgeBaseID}) => {
    const [streams, api] = useMultipleHoldGRPCStream()
    const {editKnowledgeBase, knowledgeBases, previousKnowledgeBases} = useKnowledgeBase()

    // 当前知识库信息
    const knowledgeBaseItems = useMemo(() => {
        const result = knowledgeBases.find((it) => it.ID === knowledgeBaseID)
        const targetIndex = knowledgeBases.findIndex((it) => it.ID === result?.ID)
        const Icon = targetIcon(targetIndex)
        return {...result, icon: Icon}
    }, [knowledgeBaseID, knowledgeBases])

    const onStop = () => {
        editKnowledgeBase(knowledgeBaseID, {
            ...knowledgeBaseItems,
            streamstep: 2
        })
        api.removeStream(knowledgeBaseItems.streamToken!)
    }

    useAsyncEffect(async () => {
        if (previousKnowledgeBases && previousKnowledgeBases?.length > 0) {
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
                            onEnd: () => {
                                api.removeStream && api.removeStream(kb.streamToken)
                            },
                            onError: (e) => {
                                try {
                                    api.removeStream && api.removeStream(kb.streamToken)
                                } catch (err) {
                                    failed(`知识库构建流错误处理失败: ${err}`)
                                }
                            }
                        })
                    }
                } catch (e) {
                    failed(`启动知识库构建失败: ${e}`)
                }
            }
        }
    }, [knowledgeBases])

    useUpdateEffect(() => {
        const removedList = knowledgeBases.filter((item) => item.streamToken && !api.tokens.includes(item.streamToken))
        removedList.map((item) => {
            editKnowledgeBase(item.ID, {
                ...item,
                streamstep: 2,
                streamToken: randomString(50)
            })
            return "sucess"
        })
    }, [api.tokens])

    const resultContainer = useMemo(() => {
        if (
            knowledgeBaseItems.streamstep === 1 &&
            knowledgeBaseItems.streamToken &&
            streams[knowledgeBaseItems.streamToken]
        ) {
            return (
                <div className={styles["building-knowledge-base"]}>
                    {/* header */}
                    <div className={styles["header"]}>
                        <div className={styles["header-left"]}>
                            <knowledgeBaseItems.icon className={styles["icon"]} />
                            <div>{knowledgeBaseItems.KnowledgeBaseName}</div>
                            <div className={styles["tag"]}>
                                <OutlineLoadingIcon className={styles["loading-icon"]} />
                                知识库生成中，大概需要3～5秒，请耐心等待...
                            </div>
                        </div>
                        <div className={styles["header-right"]}>
                            <div className={styles["ai-button"]}>
                                <LightningBoltIcon />
                                AI 召回
                            </div>
                            <RoundedStopButton onClick={onStop} />
                        </div>
                    </div>

                    {/* 文件列表 */}
                    <div className={styles["knowledge-files"]}>
                        知识源：
                        {knowledgeBaseItems.KnowledgeBaseFile?.map((it) => (
                            <div className={styles["files-items"]} key={it.path}>
                                {renderFileTypeIcon({
                                    type: it.fileType,
                                    iconClassName: styles["info-icon"]
                                })}
                                {it.path}
                            </div>
                        ))}
                    </div>
                    <PluginExecuteResult
                        streamInfo={streams[knowledgeBaseItems.streamToken]}
                        runtimeId={streams[knowledgeBaseItems.streamToken]?.runtimeId ?? ""}
                        loading={streams[knowledgeBaseItems.streamToken]?.loading ?? false}
                        defaultActiveKey='日志'
                    />
                </div>
            )
        } else {
            return <KnowledgeBaseTable streams={streams} knowledgeBaseItems={knowledgeBaseItems} />
        }
    }, [knowledgeBaseItems.streamstep, streams, knowledgeBaseItems.ID])

    return resultContainer
}

export default memo(KnowledgeBaseContainer)
