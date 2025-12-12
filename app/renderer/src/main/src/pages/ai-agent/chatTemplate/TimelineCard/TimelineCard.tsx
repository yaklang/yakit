import {FC, useMemo, forwardRef, ReactNode, CSSProperties, memo, useRef} from "react"
import styles from "./TimelineCard.module.scss"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import classNames from "classnames"
import useAIChatUIData from "@/pages/ai-re-act/hooks/useAIChatUIData"
import {formatTime} from "@/utils/timeUtil"
import {Virtuoso, Components, ItemProps} from "react-virtuoso"
import {AIAgentGrpcApi} from "@/pages/ai-re-act/hooks/grpcApi"
import useVirtuosoAutoScroll from "@/pages/ai-re-act/hooks/useVirtuosoAutoScroll"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {OutlineInformationcircleIcon} from "@/assets/icon/outline"
import {useSize} from "ahooks" 

const TYPE_COLOR_MAP: Record<string, "info" | "white" | "danger"> = {
    user_input: "info",
    user_interaction: "info",
    tool_result: "white",
    text: "white",
    raw: "danger"
}

const TimelineRow = memo(({item, containerHeight}: {item: AIAgentGrpcApi.TimelineItem; containerHeight?: number}) => {
    const status = TYPE_COLOR_MAP[item.type] || "white"

    // 需要设置当前dom的百分之70
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

const VirtuosoItemContainer = forwardRef<HTMLDivElement, ItemProps<AIAgentGrpcApi.TimelineItem>>(({children, style, ...props}, ref) => (
    <div
        {...props} 
        ref={ref} 
        style={style}
        className={styles["item-wrapper"]}
    >
        <div className={styles["item-inner"]}>{children}</div>
    </div>
))

const TimelineCard: FC = () => {
    const {reActTimelines} = useAIChatUIData()
    const {virtuosoRef, setIsAtBottomRef, followOutput} = useVirtuosoAutoScroll()

    const containerRef = useRef<HTMLDivElement>(null)
    const size = useSize(containerRef)

    const components = useMemo<Components<AIAgentGrpcApi.TimelineItem>>(
        () => ({
            Item: VirtuosoItemContainer,
            Footer: () => (reActTimelines.length > 0 ? <div className={styles["arrow"]} /> : null)
        }),
        [reActTimelines.length]
    )

    return (
        <div className={styles["timeline-card-wrapper"]} ref={containerRef}>
            <Virtuoso
                ref={virtuosoRef}
                atBottomStateChange={setIsAtBottomRef}
                style={{height: "100%", width: "100%"}}
                data={reActTimelines}
                followOutput={followOutput}
                increaseViewportBy={{top: 300, bottom: 300}}
                overscan={200}
                components={components}
                skipAnimationFrameInResizeObserver
                atBottomThreshold={100}
                itemContent={(_, item) => <TimelineRow item={item} containerHeight={size?.height} />}
            />
        </div>
    )
}

export default TimelineCard
