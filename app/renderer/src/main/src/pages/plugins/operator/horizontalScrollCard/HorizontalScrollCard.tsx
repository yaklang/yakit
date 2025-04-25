import React, {useEffect, useMemo, useRef, useState} from "react"
import {
    HorizontalScrollCardItemInfoSingleProps,
    HorizontalScrollCardProps,
    HorizontalScrollCardScrollProps,
    StatusCardListProps,
    StatusCardProps
} from "./HorizontalScrollCardType"
import styles from "./HorizontalScrollCard.module.scss"
import classNames from "classnames"
import {OutlineChevrondoubleleftIcon, OutlineChevrondoublerightIcon, OutlineHashtagIcon} from "@/assets/icon/outline"
import {useLongPress, useThrottleFn} from "ahooks"
import ReactResizeDetector from "react-resize-detector"

const getTextColor = (id: string) => {
    switch (true) {
        case id.includes("success"):
        case id.includes("成功"):
        case id.includes("succeeded"):
        case id.includes("finished"):
            return "success"
        case id.includes("error"):
        case id.includes("失败"):
        case id.includes("错误"):
        case id.includes("fatal"):
        case id.includes("missed"):
        case id.includes("miss"):
        case id.includes("failed"):
        case id.includes("panic"):
            return "error"
        default:
            return ""
    }
}

const bgColorList = ["purple", "bluePurple", "blue", "lakeBlue", "cyan", "orange", "yellow"]
const getBgColor = (id: string) => {
    if (getTextColor(id) === "success") {
        return "green"
    }
    if (getTextColor(id) === "error") {
        return "red"
    }
    const random = Math.floor(Math.random() * 7)
    return bgColorList[random]
}

export const HorizontalScrollCard: React.FC<HorizontalScrollCardProps> = React.memo((props) => {
    const {title, data = [], compact = false} = props
    const [scroll, setScroll] = useState<HorizontalScrollCardScrollProps>({
        scrollLeft: 0,
        scrollRight: 0
    })
    const [cardWidth, setCardWidth] = useState<number>(0)
    const [cardWidthWrapper, setCardWidthWrapper] = useState<number>(0)

    const horizontalScrollCardWrapperRef = useRef<HTMLDivElement>(null)
    const horizontalScrollCardRef = useRef<HTMLDivElement>(null)
    const scrollLeftIconRef = useRef<HTMLDivElement>(null)
    const scrollRightIconRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!cardWidth) return
        if (!cardWidthWrapper) return
        if (cardWidth >= cardWidthWrapper && scroll.scrollRight === 0) {
            setScroll({
                ...scroll,
                scrollRight: 1
            })
        }
        if (cardWidthWrapper > cardWidth && scroll.scrollRight > 0) {
            setScroll({
                ...scroll,
                scrollRight: 0
            })
        }
    }, [cardWidth, cardWidthWrapper])

    useLongPress(
        () => {
            if (!scrollLeftIconRef.current) return
            if (!horizontalScrollCardRef.current) return
            horizontalScrollCardRef.current.scrollLeft = 0
        },
        scrollLeftIconRef,
        {
            delay: 300,
            onClick: () => {
                if (!horizontalScrollCardRef.current) return
                horizontalScrollCardRef.current.scrollLeft -= 100
            },
            onLongPressEnd: () => {
                if (!horizontalScrollCardRef.current) return
                horizontalScrollCardRef.current.scrollLeft = horizontalScrollCardRef.current.scrollLeft + 0
            }
        }
    )
    useLongPress(
        () => {
            if (!horizontalScrollCardRef.current) return
            if (!scrollRightIconRef.current) return
            horizontalScrollCardRef.current.scrollLeft = horizontalScrollCardRef.current.scrollWidth
        },
        scrollRightIconRef,
        {
            delay: 300,
            onClick: () => {
                if (!horizontalScrollCardRef.current) return
                horizontalScrollCardRef.current.scrollLeft += 100
            },
            onLongPressEnd: () => {
                if (!horizontalScrollCardRef.current) return
                horizontalScrollCardRef.current.scrollLeft = horizontalScrollCardRef.current.scrollLeft - 0
            }
        }
    )
    const onScrollCardList = useThrottleFn(
        (e) => {
            if (horizontalScrollCardRef.current) {
                const {scrollWidth, scrollLeft, clientWidth} = horizontalScrollCardRef.current
                const scrollRight = scrollWidth - scrollLeft - clientWidth
                setScroll({
                    scrollLeft: scrollLeft,
                    scrollRight: scrollRight
                })
            }
        },
        {wait: 200}
    ).run
    return (
        <div className={styles["horizontal-scroll-card"]}>
            <div className={styles["horizontal-scroll-card-heard"]}>
                <span className={styles["horizontal-scroll-card-heard-title"]}>{title}</span>
                <div className={styles["horizontal-scroll-card-heard-total"]}>{data.length}</div>
            </div>
            <div className={styles["horizontal-scroll-card-list-wrapper"]} ref={horizontalScrollCardWrapperRef}>
                <ReactResizeDetector
                    onResize={(w, h) => {
                        if (!w || !h) {
                            return
                        }
                        setCardWidthWrapper(w)
                    }}
                    handleWidth={true}
                    handleHeight={true}
                    refreshMode={"debounce"}
                    refreshRate={50}
                />
                {scroll.scrollLeft > 0 && (
                    <div
                        className={classNames(styles["horizontal-scroll-card-list-direction-left"])}
                        ref={scrollLeftIconRef}
                    >
                        <OutlineChevrondoubleleftIcon />
                    </div>
                )}
                <div
                    className={styles["horizontal-scroll-card-list"]}
                    ref={horizontalScrollCardRef}
                    onScroll={onScrollCardList}
                >
                    {data.map((cardItem) => (
                        <React.Fragment key={cardItem.tag}>
                            {cardItem.info.length > 1 ? (
                                <HorizontalScrollCardItemInfoMultiple {...cardItem} />
                            ) : (
                                <HorizontalScrollCardItemInfoSingle
                                    tag={cardItem.tag}
                                    item={(cardItem.info || [])[0]}
                                    compact={compact}
                                />
                            )}
                        </React.Fragment>
                    ))}
                    <ReactResizeDetector
                        onResize={(w, h) => {
                            if (!w || !h) {
                                return
                            }
                            setCardWidth(w)
                        }}
                        handleWidth={true}
                        handleHeight={true}
                        refreshMode={"debounce"}
                        refreshRate={50}
                    />
                </div>
                {scroll.scrollRight > 0 && (
                    <div
                        className={classNames(styles["horizontal-scroll-card-list-direction-right"])}
                        ref={scrollRightIconRef}
                    >
                        <OutlineChevrondoublerightIcon />
                    </div>
                )}
            </div>
        </div>
    )
})

const HorizontalScrollCardItemInfoMultiple: React.FC<StatusCardListProps> = React.memo((props) => {
    const {tag, info = []} = props
    const bgColor = useMemo(() => {
        return getBgColor("11")
    }, [tag])
    return (
        <div
            className={classNames(
                styles["horizontal-scroll-card-list-item-info-multiple"],
                styles[`card-item-bg-${bgColor}`],
                styles[`card-item-border-left-${bgColor}`]
            )}
        >
            <div className={styles["horizontal-scroll-card-list-item-info-multiple-tag"]}>
                <OutlineHashtagIcon />
                {tag}
            </div>
            <div className={styles["horizontal-scroll-card-list-item-info-multiple-infos"]}>
                {info.map((ele) => (
                    <div
                        key={ele.Timestamp + ele.Id}
                        className={styles["horizontal-scroll-card-list-item-info-multiple-infos-item"]}
                    >
                        <div
                            className={classNames(
                                styles["horizontal-scroll-card-list-item-info-multiple-infos-item-data"],
                                {
                                    [styles["text-success"]]: getTextColor(ele.Id) === "success",
                                    [styles["text-error"]]: getTextColor(ele.Id) === "error"
                                }
                            )}
                        >
                            {ele.Data}
                        </div>
                        <div className={styles["horizontal-scroll-card-list-item-info-multiple-infos-item-id"]}>
                            {ele.Id}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
})

const HorizontalScrollCardItemInfoSingle: React.FC<HorizontalScrollCardItemInfoSingleProps> = React.memo((props) => {
    const {tag, item, compact} = props
    const isSuccess = useMemo(() => {
        return getTextColor(tag || item.Id) === "success"
    }, [tag, item.Id])
    const isError = useMemo(() => {
        return getTextColor(tag || item.Id) === "error"
    }, [tag, item.Id])
    const bgColor = useMemo(() => {
        return getBgColor(tag || item.Id)
    }, [tag, item.Id])
    return (
        <div
            className={classNames(
                styles["horizontal-scroll-card-list-item-info-single"],
                styles[`card-item-bg-${bgColor}`],
                styles[`card-item-border-left-${bgColor}`],
                {
                    [styles["text-success"]]: isSuccess,
                    [styles["text-error"]]: isError
                }
            )}
            style={{
                flexDirection: compact ? "row" : "column",
                alignItems: compact ? "center" : undefined,
                gap: compact ? "8px" : undefined,
                minHeight: compact ? undefined : 68,
                padding: compact ? "5px 16px" : "12px 16px"
            }}
        >
            {compact ? (
                <>
                    <div className={styles["horizontal-scroll-card-list-item-info-single-id"]}>{tag || item.Id}</div>
                    <div
                        className={classNames(styles["horizontal-scroll-card-list-item-info-single-data"], {
                            [styles["text-success"]]: isSuccess,
                            [styles["text-error"]]: isError
                        })}
                    >
                        {item.Data}
                    </div>
                </>
            ) : (
                <>
                    <div
                        className={classNames(styles["horizontal-scroll-card-list-item-info-single-data"], {
                            [styles["text-success"]]: isSuccess,
                            [styles["text-error"]]: isError
                        })}
                    >
                        {item.Data}
                    </div>
                    <div className={styles["horizontal-scroll-card-list-item-info-single-id"]}>{tag || item.Id}</div>
                </>
            )}
        </div>
    )
})
