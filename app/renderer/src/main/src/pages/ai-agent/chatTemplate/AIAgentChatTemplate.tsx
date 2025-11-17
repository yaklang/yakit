import React, {memo, MutableRefObject, useEffect, useMemo, useState} from "react"
import {useControllableValue, useMemoizedFn, useUpdateEffect} from "ahooks"
import {
    AIAgentChatStreamProps,
    AIChatLeftSideProps,
    AIChatToolDrawerContentProps,
    ChatStreamCollapseItemProps,
    ChatStreamCollapseProps,
    ChatStreamContentProps
} from "../aiAgentType"
import {OutlineChevrondownIcon, OutlineChevronrightIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"

import {YakitRoundCornerTag} from "@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag"
import {AITree} from "../aiTree/AITree"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {formatTimestamp} from "@/utils/timeUtil"
import {grpcQueryAIEvent} from "../grpc"
import {Uint8ArrayToString} from "@/utils/str"
import {convertNodeIdToVerbose} from "@/pages/ai-re-act/hooks/defaultConstant"
import {AIChatQSData, AIChatQSDataTypeEnum} from "@/pages/ai-re-act/hooks/aiRender"
import {AIEventQueryRequest, AIEventQueryResponse} from "@/pages/ai-re-act/hooks/grpcApi"
import {taskAnswerToIconMap} from "../defaultConstant"
import {SolidLightningboltIcon} from "@/assets/icon/solid"
import useAINodeLabel from "@/pages/ai-re-act/hooks/useAINodeLabel"
import {AIChatListItem} from "../components/aiChatListItem/AIChatListItem"
import StreamCard from "../components/StreamCard"
import useAIChatUIData from "@/pages/ai-re-act/hooks/useAIChatUIData"
import i18n from "@/i18n/i18n"
import {Virtuoso} from "react-virtuoso"
import useVirtuosoAutoScroll from "@/pages/ai-re-act/hooks/useVirtuosoAutoScroll"
import {genBaseAIChatData} from "@/pages/ai-re-act/hooks/utils"

import classNames from "classnames"
import styles from "./AIAgentChatTemplate.module.scss"

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
    const {streams, scrollToBottom} = props
    const {scrollerRef, virtuosoRef, scrollToIndex} = useVirtuosoAutoScroll(streams)
    useUpdateEffect(() => {
        scrollToIndex("LAST")
    }, [scrollToBottom])
    const renderItem = (stream: AIChatQSData) => {
        return <AIChatListItem item={stream} type='task-agent' />
    }

    const components = useMemo(
        () => ({
            Item: ({children, style, "data-index": dataIndex}) => (
                <div key={dataIndex} style={style} data-index={dataIndex} className={styles["item-wrapper"]}>
                    <div className={styles["item-inner"]}>{children}</div>
                </div>
            )
        }),
        []
    )

    return (
        <div className={styles["ai-agent-chat-stream"]}>
            <Virtuoso
                scrollerRef={(ref) =>
                    ((scrollerRef as MutableRefObject<HTMLDivElement>).current = ref as HTMLDivElement)
                }
                ref={virtuosoRef}
                style={{height: "100%", width: "100%"}}
                data={streams}
                totalCount={streams.length}
                itemContent={(_, item) => renderItem(item)}
                overscan={300}
                components={components}
            />
            {/* {streams.map(renderItem)} */}
        </div>
    )
})
const ChatStreamCollapseItem: React.FC<ChatStreamCollapseItemProps> = React.memo((props) => {
    const {expandKey, info, className, defaultExpand, timestamp} = props
    const {NodeId, NodeIdVerbose, content} = info
    const {nodeLabel} = useAINodeLabel(NodeIdVerbose)
    return (
        <ChatStreamCollapse
            key={expandKey}
            style={{marginBottom: 0}}
            defaultExpand={defaultExpand ?? true}
            title={
                <div className={styles["task-type-header"]}>
                    {taskAnswerToIconMap[NodeId] || <SolidLightningboltIcon />}
                    <div className={styles["task-type-header-title"]}>{nodeLabel}</div>
                    <div className={styles["task-type-header-time"]}>{formatTimestamp(timestamp)}</div>
                </div>
            }
            className={classNames(styles["chat-stream-collapse-expand"], className || "")}
        >
            <ChatStreamContent stream={content} />
        </ChatStreamCollapse>
    )
})

export const ChatStreamContent: React.FC<ChatStreamContentProps> = (props) => {
    const {stream} = props
    return <div className={styles["think-wrapper"]}>{stream || ""}</div>
}

/** @name 回答信息折叠组件 */
export const ChatStreamCollapse: React.FC<ChatStreamCollapseProps> = memo((props) => {
    const {id, className, style, title, headerExtra, children} = props

    const [expand, setExpand] = useControllableValue<boolean>(props, {
        defaultValuePropName: "defaultExpand",
        valuePropName: "expand"
    })

    return (
        <div id={id} className={classNames(className, styles["chat-stream-collapse"])} style={style}>
            <div className={styles["collapse-header"]}>
                <div className={styles["header-body"]} onClick={() => setExpand(!expand)}>
                    <div className={classNames(styles["expand-icon"], {[styles["no-expand-icon"]]: !expand})}>
                        <OutlineChevrondownIcon />
                    </div>
                    <div className={styles["header-title"]}>{title}</div>
                </div>

                {<div className={styles["header-extra"]}>{headerExtra || null}</div>}
            </div>

            <div className={classNames(styles["collapse-body"], {[styles["collapse-body-hidden"]]: !expand})}>
                <div className={styles["collapse-panel"]}>{children}</div>
            </div>
        </div>
    )
})

export const AIChatToolDrawerContent: React.FC<AIChatToolDrawerContentProps> = memo((props) => {
    const {callToolId} = props
    // const [secondExpand, setSecondExpand] = useState<string[]>([])
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
                // setSecondExpand(
                //     list.map((ele) => {
                //         if (ele.type === "stream" && ele.data) return ele.data.EventUUID
                //         return ""
                //     })
                // )
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })

    // const handleChangeSecondPanel = useMemoizedFn((expand: boolean, expandKey: string) => {
    //     setSecondExpand((preV) => {
    //         if (expand) {
    //             return [...preV, expandKey]
    //         } else {
    //             return preV.filter((item) => item !== expandKey)
    //         }
    //     })
    // })
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
                                // const expand = secondExpand.includes(EventUUID)
                                const {execFileRecord} = yakExecResult
                                const fileList = execFileRecord.get(CallToolID)
                                const language = i18n.language.charAt(0).toUpperCase() + i18n.language.slice(1)
                                const nodeLabel = NodeIdVerbose[language]
                                return (
                                    // <ChatStreamCollapseItem
                                    //     key={id}
                                    //     expandKey={EventUUID}
                                    //     info={data}
                                    //     secondExpand={expand}
                                    //     handleChangeSecondPanel={handleChangeSecondPanel}
                                    //     className={classNames({
                                    //         [styles["ai-tool-collapse-expand"]]: expand
                                    //     })}
                                    //     timestamp={Timestamp}
                                    // />
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
                                break
                        }
                    })}
                </>
            )}
        </div>
    )
})
