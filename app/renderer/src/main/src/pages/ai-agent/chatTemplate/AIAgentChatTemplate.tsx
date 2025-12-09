import React, {memo, useCallback, useEffect, useMemo, useState} from "react"
import {useControllableValue, useMemoizedFn, useMount, useUpdateEffect} from "ahooks"
import {AIAgentChatStreamProps, AIChatLeftSideProps, AIChatToolDrawerContentProps} from "../aiAgentType"
import {OutlineChevronrightIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"

import {YakitRoundCornerTag} from "@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag"
import {AITree} from "../aiTree/AITree"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {grpcQueryAIEvent} from "../grpc"
import {Uint8ArrayToString} from "@/utils/str"
import {convertNodeIdToVerbose} from "@/pages/ai-re-act/hooks/defaultConstant"
import {AIChatQSData, AIChatQSDataTypeEnum} from "@/pages/ai-re-act/hooks/aiRender"
import {AIEventQueryRequest, AIEventQueryResponse} from "@/pages/ai-re-act/hooks/grpcApi"
import {taskAnswerToIconMap} from "../defaultConstant"
import {AIChatListItem} from "../components/aiChatListItem/AIChatListItem"
import StreamCard from "../components/StreamCard"
import useAIChatUIData from "@/pages/ai-re-act/hooks/useAIChatUIData"
import i18n from "@/i18n/i18n"
import {Virtuoso} from "react-virtuoso"
import useVirtuosoAutoScroll from "@/pages/ai-re-act/hooks/useVirtuosoAutoScroll"
import {genBaseAIChatData} from "@/pages/ai-re-act/hooks/utils"

import classNames from "classnames"
import styles from "./AIAgentChatTemplate.module.scss"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import emiter from "@/utils/eventBus/eventBus"

/** @name chat-左侧侧边栏 */
export const AIChatLeftSide: React.FC<AIChatLeftSideProps> = memo((props) => {
    const {tasks} = props

    const [expand, setExpand] = useControllableValue<boolean>(props, {
        defaultValue: true,
        valuePropName: "expand",
        trigger: "setExpand"
    })
    const handleCancelExpand = useMemoizedFn(() => {
        setExpand(false)
    })

    return (
        <div className={classNames(styles["ai-chat-left-side"], {[styles["ai-chat-left-side-hidden"]]: !expand})}>
            <div className={styles["side-header"]}>
                <YakitButton
                    type='outline2'
                    className={styles["side-header-btn"]}
                    icon={<OutlineChevronrightIcon />}
                    onClick={handleCancelExpand}
                    size='small'
                />
                <div className={styles["header-title"]}>
                    任务列表
                    <YakitRoundCornerTag>{tasks.length}</YakitRoundCornerTag>
                </div>
            </div>

            <div className={styles["task-list"]}>
                {tasks.length > 0 ? (
                    <AITree tasks={tasks} />
                ) : (
                    <YakitEmpty style={{marginTop: "20%"}} title='思考中...' description='' />
                )}
            </div>
        </div>
    )
})

/** @name chat-信息流展示 */
export const AIAgentChatStream: React.FC<AIAgentChatStreamProps> = memo((props) => {
    const {streams, scrollToBottom, execute} = props
    const {virtuosoRef, setIsAtBottomRef, scrollToIndex, followOutput} = useVirtuosoAutoScroll()
    const {t} = useI18nNamespaces(["yakitUi"])
    useUpdateEffect(() => {
        scrollToIndex("LAST")
    }, [scrollToBottom])
    const renderItem = (stream: AIChatQSData) => {
        return <AIChatListItem item={stream} type='task-agent' />
    }
    const loading = useMemo(() => {
        if (!execute || !streams.length) return false
        return streams[streams.length - 1].type !== AIChatQSDataTypeEnum.END_PLAN_AND_EXECUTION
    }, [streams.length, execute])

    const Item = useCallback(
        ({children, style, "data-index": dataIndex}) => (
            <div key={dataIndex} style={style} data-index={dataIndex} className={styles["item-wrapper"]}>
                <div className={styles["item-inner"]}>{children}</div>
            </div>
        ),
        []
    )

    const Footer = useCallback(
        () => (
            <div style={{height: "80px"}}>
                {loading && (
                    <YakitSpin wrapperClassName={styles["spin"]} tip={`${t("YakitSpin.loading")}...`}></YakitSpin>
                )}
            </div>
        ),
        [loading, t]
    )

    const components = useMemo(
        () => ({
            Item,
            Footer
        }),
        [Footer, Item]
    )

    const onScrollToIndex = (id) => {
        const index = streams.findIndex((item) => {
            if (item.type === AIChatQSDataTypeEnum.TASK_REVIEW_REQUIRE) {
                const i = item.data.task
                return i.index === id
            }
            return false
        })
        if (index !== -1) {
            scrollToIndex(index,'auto')
        }
    }

    useMount(() => {
        emiter.on("onAITreeLocatePlanningList", onScrollToIndex)
        return () => {
            emiter.off("onAITreeLocatePlanningList", onScrollToIndex)
        }
    })

    return (
        <div className={styles["ai-agent-chat-stream"]}>
            <Virtuoso
                ref={virtuosoRef}
                atBottomStateChange={setIsAtBottomRef}
                style={{height: "100%", width: "100%"}}
                data={streams}
                followOutput={followOutput}
                totalCount={streams.length}
                itemContent={(_, item) => renderItem(item)}
                atBottomThreshold={100}
                initialTopMostItemIndex={{index: "LAST"}}
                skipAnimationFrameInResizeObserver
                increaseViewportBy={{top: 300, bottom: 300}}
                components={components}
            />
        </div>
    )
})

export const AIChatToolDrawerContent: React.FC<AIChatToolDrawerContentProps> = memo((props) => {
    const {callToolId} = props
    const [toolList, setToolList] = useState<AIChatQSData[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    useEffect(() => {
        getList()
    }, [])

    const {yakExecResult} = useAIChatUIData()

    const getList = useMemoizedFn(() => {
        if (!callToolId) return
        const params: AIEventQueryRequest = {
            ProcessID: callToolId
        }
        setLoading(true)
        grpcQueryAIEvent(params)
            .then((res: AIEventQueryResponse) => {
                const {Events} = res
                const list: AIChatQSData[] = []
                Events.filter((ele) => ele.Type === "stream").forEach((item) => {
                    let ipcContent = ""
                    let ipcStreamDelta = ""
                    try {
                        ipcContent = Uint8ArrayToString(item.Content) || ""
                        ipcStreamDelta = Uint8ArrayToString(item.StreamDelta) || ""
                    } catch (error) {}
                    const current: AIChatQSData = {
                        ...genBaseAIChatData(item),
                        type: AIChatQSDataTypeEnum.STREAM,
                        data: {
                            CallToolID: item.CallToolID,
                            NodeId: item.NodeId,
                            NodeIdVerbose: item.NodeIdVerbose || convertNodeIdToVerbose(item.NodeId),
                            content: ipcContent + ipcStreamDelta,
                            ContentType: item.ContentType,
                            EventUUID: item.EventUUID,
                            status: "end"
                        }
                    }
                    list.push(current)
                })
                setToolList(list)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })

    return (
        <div className={styles["ai-chat-tool-drawer-content"]}>
            {loading ? (
                <YakitSpin />
            ) : (
                <>
                    {toolList.map((info) => {
                        const {id, Timestamp, type, data} = info
                        switch (type) {
                            case "stream":
                                const {NodeIdVerbose, CallToolID, content, NodeId} = data
                                const {execFileRecord} = yakExecResult
                                const fileList = execFileRecord.get(CallToolID)
                                const language = i18n.language.charAt(0).toUpperCase() + i18n.language.slice(1)
                                const nodeLabel = NodeIdVerbose[language]
                                return (
                                    <StreamCard
                                        titleText={nodeLabel}
                                        titleIcon={taskAnswerToIconMap[NodeId]}
                                        content={content}
                                        modalInfo={{
                                            time: Timestamp,
                                            title: info.AIService
                                        }}
                                        fileList={fileList}
                                    />
                                )
                            default:
                                return <React.Fragment key={id}></React.Fragment>
                        }
                    })}
                </>
            )}
        </div>
    )
})
