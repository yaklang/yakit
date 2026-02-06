import {FC, useMemo, forwardRef, memo, useRef, useState, useEffect} from "react"
import styles from "./TimelineCard.module.scss"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import classNames from "classnames"
import {formatTime} from "@/utils/timeUtil"
import {Virtuoso, Components, ItemProps, ListProps} from "react-virtuoso"
import {AIAgentGrpcApi} from "@/pages/ai-re-act/hooks/grpcApi"
import useVirtuosoAutoScroll from "@/pages/ai-re-act/hooks/useVirtuosoAutoScroll"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {OutlineInformationcircleIcon} from "@/assets/icon/outline"
import {useSize} from "ahooks"
import {grpcQueryAIEvent} from "../../grpc"
import {Uint8ArrayToString} from "@/utils/str"
import useAIAgentStore from "../../useContext/useStore"
import {aiChatDataStore} from "../../store/ChatDataStore"
import useChatIPCStore from "../../useContext/ChatIPCContent/useStore"

const MAX_TIMELINE_COUNT = 50

const TYPE_COLOR_MAP: Record<string, "info" | "white" | "danger"> = {
    user_input: "info",
    user_interaction: "info",
    tool_result: "white",
    text: "white",
    raw: "danger"
}

const TimelineRow = memo(({item, containerHeight}: {item: AIAgentGrpcApi.TimelineItem; containerHeight?: number}) => {
    const status = TYPE_COLOR_MAP[item.type] || "white"
    const maxHeight = containerHeight ? containerHeight * 0.7 : 300

    return (
        <div className={classNames(styles["timeline-card"], styles[`timeline-card-${status}`])}>
            <div className={styles["timeline-card-header"]}>
                <div className={styles["timeline-card-header-left"]}>
                    <div className={styles["timeline-card-header-hot"]} />
                    <span>{formatTime(item.timestamp)}</span>

                    <YakitTag size='small' fullRadius color={status} className={styles["timeline-card-header-tag"]}>
                        <p className={styles["timeline-card-header-tag-text"]}>{item.entry_type ?? item.type}</p>
                    </YakitTag>
                </div>

                <YakitPopover
                    overlayClassName={styles["timeline-popover"]}
                    overlayStyle={{paddingLeft: 4}}
                    placement='right'
                    content={<div style={{maxHeight, overflowY: "auto"}}>{item.content}</div>}
                >
                    <div className={styles["icon-wrapper"]}>
                        <OutlineInformationcircleIcon />
                    </div>
                </YakitPopover>
            </div>

            <div className={styles["timeline-card-body"]}>{item.content || ""}</div>
        </div>
    )
})

TimelineRow.displayName = "TimelineRow"

const VirtuosoItemContainer = forwardRef<HTMLDivElement, ItemProps<AIAgentGrpcApi.TimelineItem>>(
    ({children, style, ...props}, ref) => {
        return (
            <div {...props} ref={ref} style={style} className={styles["item-wrapper"]}>
                <div className={styles["item-inner"]}>{children}</div>
            </div>
        )
    }
)

VirtuosoItemContainer.displayName = "VirtuosoItemContainer"

const VirtuosoListContainer = forwardRef<HTMLDivElement, ListProps>(({children, style, ...props}, ref) => {
    return (
        <div {...props} ref={ref} style={style} className={styles["virtuoso-item-list"]}>
            {children}
        </div>
    )
})

VirtuosoListContainer.displayName = "VirtuosoListContainer"


const TimelineCard: FC = () => {
    const {reActTimelines} = useChatIPCStore().chatIPCData
    const {virtuosoRef, setScrollerRef, handleTotalListHeightChanged} = useVirtuosoAutoScroll({ total: reActTimelines.length || 0, atBottomThreshold: 100 })
    const containerRef = useRef<HTMLDivElement>(null)
    const size = useSize(containerRef)
    // const [timelines, setTimelines] = useState<AIAgentGrpcApi.TimelineItem[]>([])
    // useEffect(() => {
    //     if (!activeChat?.session) return
    //     if (reActTimelines && reActTimelines.length > 0) {
    //         setTimelines(reActTimelines)
    //         return
    //     }
    //     const storeReActTimelines = aiChatDataStore.get(activeChat.id)?.reActTimelines
    //     if (Array.isArray(storeReActTimelines) && storeReActTimelines.length > 0) {
    //         setTimelines(storeReActTimelines)
    //         return
    //     }
    //     if (activeChat?.session) {
    //         getTimeline(activeChat.session).then((res) => {
    //             if (res) {
    //                 aiChatDataStore.set(activeChat.id, (prev) => {
    //                     return {...prev, reActTimelines: res}
    //                 })
    //                 setTimelines(res)
    //             }
    //         })
    //     }
    // }, [reActTimelines, activeChat])

    const displayTimelines = useMemo<AIAgentGrpcApi.TimelineItem[]>(() => {
        if (!Array.isArray(reActTimelines)) return []
        if (reActTimelines.length <= MAX_TIMELINE_COUNT) return reActTimelines
        return reActTimelines.slice(-MAX_TIMELINE_COUNT)
    }, [reActTimelines])

    const components = useMemo<Components<AIAgentGrpcApi.TimelineItem>>(
        () => ({
            Item: VirtuosoItemContainer,
            List: VirtuosoListContainer,
            Footer: () => (displayTimelines.length > 0 ? <div className={styles["arrow"]} /> : null)
        }),
        [displayTimelines.length]
    )
    return (
        <div className={styles["timeline-card-wrapper"]} ref={containerRef}>
            <Virtuoso
                ref={virtuosoRef}
                data={displayTimelines}
                components={components}
                scrollerRef={setScrollerRef}
                totalListHeightChanged={handleTotalListHeightChanged}
                // atBottomStateChange={setIsAtBottomRef}
                style={{height: "100%", width: "100%"}}
                increaseViewportBy={{top: 300, bottom: 300}}
                overscan={200}
                atBottomThreshold={100}
                skipAnimationFrameInResizeObserver
                itemContent={(_, item) => <TimelineRow item={item} containerHeight={size?.height} />}
            />
        </div>
    )
}
export default TimelineCard
