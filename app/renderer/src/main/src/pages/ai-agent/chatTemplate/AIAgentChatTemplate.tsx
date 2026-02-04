import React, {memo, useCallback, useEffect, useMemo, useState} from "react"
import {useControllableValue, useCreation, useMemoizedFn, useMount, useUpdateEffect} from "ahooks"
import {AIAgentChatStreamProps, AIChatLeftSideProps, AIChatToolDrawerContentProps} from "../aiAgentType"
import {OutlineChevronrightIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {AITree} from "../aiTree/AITree"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {grpcQueryAIToolDetails} from "../grpc"
import {
    AIChatQSData,
    AIChatQSDataTypeEnum,
    AITaskStartInfo,
    ReActChatRenderItem
} from "@/pages/ai-re-act/hooks/aiRender"
import {AIEventQueryRequest} from "@/pages/ai-re-act/hooks/grpcApi"
import {taskAnswerToIconMap} from "../defaultConstant"
import {AIChatListItem} from "../components/aiChatListItem/AIChatListItem"
import StreamCard from "../components/StreamCard"
import i18n from "@/i18n/i18n"
import {Virtuoso} from "react-virtuoso"
import useVirtuosoAutoScroll from "@/pages/ai-re-act/hooks/useVirtuosoAutoScroll"

import classNames from "classnames"
import styles from "./AIAgentChatTemplate.module.scss"
import emiter from "@/utils/eventBus/eventBus"
import {PreWrapper} from "../components/ToolInvokerCard"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import TimelineCard from "./TimelineCard/TimelineCard"
import AIMemoryList from "./aiMemoryList/AIMemoryList"
import useChatIPCStore from "../useContext/ChatIPCContent/useStore"
import TaskLoading from "./TaskLoading/TaskLoading"
import {YakitResizeBox, YakitResizeBoxProps} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {aiChatDataStore} from "../store/ChatDataStore"

export enum AIChatLeft {
    TaskTree = "task-tree",
    Timeline = "timeline"
}

/** @name chat-左侧侧边栏 */
export const AIChatLeftSide: React.FC<AIChatLeftSideProps> = memo((props) => {
    const {tasks} = props
    const {taskChat, memoryList} = useChatIPCStore().chatIPCData
    // const {taskChat} = useAIChatUIData()
    const [activeTab, setActiveTab] = useState<AIChatLeft>(AIChatLeft.Timeline)
    const [expand, setExpand] = useControllableValue<boolean>(props, {
        defaultValue: true,
        valuePropName: "expand",
        trigger: "setExpand"
    })
    const length = useCreation(() => {
        return memoryList?.memories?.length
    }, [memoryList?.memories?.length])
    const handleCancelExpand = useMemoizedFn(() => {
        setExpand(false)
    })

    const hasTaskTree = (taskChat?.elements?.length ?? 0) > 0

    const renderDom = useMemoizedFn(() => {
        switch (activeTab) {
            case AIChatLeft.TaskTree:
                return tasks.length > 0 ? (
                    <AITree tasks={tasks} />
                ) : (
                    <YakitEmpty style={{marginTop: "20%"}} title='思考中...' description='' />
                )
            case AIChatLeft.Timeline:
                return <TimelineCard />
            default:
                break
        }
    })

    const handleTabChange = useMemoizedFn((value: AIChatLeft) => {
        setActiveTab(value)
    })

    const button = useMemo(() => {
        if (!hasTaskTree) return <YakitButton size='middle'>时间线</YakitButton>
        return (
            <YakitRadioButtons
                buttonStyle='solid'
                size='middle'
                defaultValue={AIChatLeft.TaskTree}
                options={[
                    {label: "任务树", value: AIChatLeft.TaskTree},
                    {label: "时间线", value: AIChatLeft.Timeline}
                ]}
                value={activeTab}
                onChange={({target}) => handleTabChange(target.value)}
            />
        )
    }, [activeTab, handleTabChange, hasTaskTree])
    const extraProps = useCreation(() => {
        let p: Omit<YakitResizeBoxProps, "firstNode" | "secondNode"> = {}
        if (!length) {
            p.firstRatio = "100%"
            p.secondRatio = "0%"
            p.secondNodeStyle = {
                display: "none",
                padding: 0
            }
            p.lineStyle = {
                display: "none",
                padding: 0
            }
        }
        return p
    }, [length])
    return (
        <div className={classNames(styles["ai-chat-left-side"], {[styles["ai-chat-left-side-hidden"]]: !expand})}>
            <YakitResizeBox
                isVer
                firstNode={
                    <div className={styles["list-wrapper"]}>
                        <div className={styles["side-header"]}>
                            <YakitButton
                                type='outline2'
                                className={styles["side-header-btn"]}
                                icon={<OutlineChevronrightIcon />}
                                onClick={handleCancelExpand}
                                size='small'
                            />
                            <div className={styles["header-title"]}>{button}</div>
                        </div>

                        <div className={styles["task-list"]}>{renderDom()}</div>
                    </div>
                }
                secondNode={
                    !!length && (
                        <div className={styles["memory-wrapper"]}>
                            <AIMemoryList />
                        </div>
                    )
                }
                {...extraProps}
            />
        </div>
    )
})

/** @name chat-信息流展示 */
export const AIAgentChatStream: React.FC<AIAgentChatStreamProps> = memo((props) => {
    const {streams, scrollToBottom, taskStatus, session} = props
    const {virtuosoRef, setScrollerRef, scrollToIndex, handleTotalListHeightChanged} = useVirtuosoAutoScroll({
        total: streams.length,
        atBottomThreshold: 100
    })
    useUpdateEffect(() => {
        scrollToIndex("LAST")
    }, [scrollToBottom])

    const {
        chatIPCData: {systemStream}
    } = useChatIPCStore()

    const renderItem = (index: number, stream: ReActChatRenderItem) => {
        if (!stream.token) return null
        const hasNext = streams.length - index > 1
        return <AIChatListItem key={stream.token} hasNext={hasNext} item={stream} type='task-agent' />
    }

    const Item = useCallback(
        ({children, style, "data-index": dataIndex}) => (
            <div key={dataIndex} style={style} data-index={dataIndex} className={styles["item-wrapper"]}>
                <div className={styles["item-inner"]}>{children}</div>
            </div>
        ),
        []
    )

    const Footer = useCallback(
        () => <TaskLoading taskStatus={taskStatus} systemStream={systemStream} />,
        [taskStatus, systemStream]
    )

    const components = useMemo(
        () => ({
            Item,
            Footer
        }),
        [Footer, Item]
    )

    const onScrollToIndex = useMemoizedFn((id) => {
        const index = streams.findIndex((item) => {
            if (item.type === AIChatQSDataTypeEnum.TASK_INDEX_NODE) {
                const chatItem = aiChatDataStore.getContentMap({session, chatType: item.chatType, mapKey: item.token})
                if (!chatItem) return false
                const taskIndex = (chatItem.data as AITaskStartInfo).taskIndex
                return taskIndex === id
            }
            return false
        })
        if (index !== -1) {
            scrollToIndex(index, "auto")
        }
    })
    useMount(() => {
        emiter.on("onAITreeLocatePlanningList", onScrollToIndex)
        return () => {
            emiter.off("onAITreeLocatePlanningList", onScrollToIndex)
        }
    })

    return (
        <div className={styles["ai-agent-chat-stream"]}>
            <Virtuoso<ReActChatRenderItem>
                ref={virtuosoRef}
                scrollerRef={setScrollerRef}
                // atBottomStateChange={setIsAtBottomRef}
                style={{height: "100%", width: "100%"}}
                data={streams}
                totalListHeightChanged={handleTotalListHeightChanged}
                totalCount={streams.length}
                itemContent={(index, item) => renderItem(index, item)}
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
    const {callToolId, aiFilePath} = props
    const [toolList, setToolList] = useState<AIChatQSData[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    useEffect(() => {
        getList()
    }, [])

    const {yakExecResult} = useChatIPCStore().chatIPCData

    const getList = useMemoizedFn(() => {
        if (!callToolId) return
        const params: AIEventQueryRequest = {
            ProcessID: callToolId
        }
        setLoading(true)
        grpcQueryAIToolDetails(params)
            .then(setToolList)
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
                            case AIChatQSDataTypeEnum.STREAM:
                            case AIChatQSDataTypeEnum.TOOL_CALL_RESULT:
                                const {NodeIdVerbose, CallToolID, content, NodeId} = data
                                const {execFileRecord} = yakExecResult
                                const fileList = execFileRecord.get(CallToolID)
                                const language = i18n.language.charAt(0).toUpperCase() + i18n.language.slice(1)
                                const nodeLabel = NodeIdVerbose[language]
                                return (
                                    <StreamCard
                                        titleText={nodeLabel}
                                        titleIcon={taskAnswerToIconMap[NodeId]}
                                        content={<PreWrapper code={content} />}
                                        modalInfo={{
                                            time: Timestamp,
                                            title: info.AIModelName,
                                            icon: info.AIService,
                                            aiFilePath
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
