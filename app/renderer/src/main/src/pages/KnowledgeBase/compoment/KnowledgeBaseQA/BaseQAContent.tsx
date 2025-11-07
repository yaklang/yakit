import React, {FC, useEffect, useRef, useState} from "react"
import {QAMessage} from "./uitls"
import styles from "../../knowledgeBase.module.scss"
import {v4 as uuidv4} from "uuid"
import Typewriter from "./Typewriter"
import {SolidBookopenTextIcon, SolidChevronDoubleRightIcon} from "@/assets/icon/outline"
import {OutlineLogsIcon} from "@/assets/icon/outline"
import {useSafeState} from "ahooks"
import {AnswerDescriptionDrawer, QADetailsDrawer} from "./AnswerDescriptionDrawer"
import {CopyComponents} from "@/components/yakitUI/YakitTag/YakitTag"
import throttle from "lodash.throttle"

interface BaseQAContentProps {
    content: QAMessage[]
}

const BaseQAContent: FC<BaseQAContentProps> = ({content}) => {
    // icon的唯一id生成
    const iconId = useRef(uuidv4())
    const containerRef = useRef<HTMLDivElement>(null)
    const [answerDescriptionItem, setAnswerDescriptionItem] = useSafeState<{open: boolean; processLog?: string}>()
    const [detailsItem, setDetailsItem] = useSafeState<{open: boolean; details: QAMessage["entries"]}>()

    const [isNearBottom, setIsNearBottom] = useState(true)

    // 监听滚动，判断是否靠近底部
    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        const onScroll = throttle(() => {
            const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight

            setIsNearBottom(distanceFromBottom <= 10)
        }, 200)

        el.addEventListener("scroll", onScroll)

        return () => {
            el.removeEventListener("scroll", onScroll)
            onScroll.cancel()
        }
    }, [])

    // 监听内容变化
    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        const observer = new MutationObserver(() => {
            // 只有靠近底部时才滚动到底
            if (isNearBottom) {
                el.scrollTop = el.scrollHeight
            }
        })

        observer.observe(el, {childList: true, subtree: true, characterData: true})
        return () => observer.disconnect()
    }, [isNearBottom])

    const resultRender = (item: QAMessage) => {
        switch (item.type) {
            case "user":
                return (
                    <div className={styles["qa-question"]}>
                        <div className={styles["qa-question-content"]}>{item.content}</div>
                    </div>
                )
            case "assistant":
                return (
                    <div className={styles["qa-answer"]}>
                        {item.isStreaming ? (
                            <div className={styles["qa-answer-streaming"]}>
                                <div className={styles["qa-answer-content"]}>
                                    <svg
                                        xmlns='http://www.w3.org/2000/svg'
                                        width='17'
                                        height='16'
                                        viewBox='0 0 17 16'
                                        fill='none'
                                    >
                                        <path
                                            d='M3.83333 2V4.66667M2.5 3.33333H5.16667M4.5 11.3333V14M3.16667 12.6667H5.83333M9.16667 2L10.6905 6.57143L14.5 8L10.6905 9.42857L9.16667 14L7.64286 9.42857L3.83333 8L7.64286 6.57143L9.16667 2Z'
                                            stroke={`url(#${iconId.current})`}
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                        />
                                        <defs>
                                            <linearGradient
                                                id={iconId.current}
                                                x1='2.5'
                                                y1='2'
                                                x2='16.8935'
                                                y2='6.75561'
                                                gradientUnits='userSpaceOnUse'
                                            >
                                                <stop stopColor='var(--Colors-Use-Magenta-Primary)' />
                                                <stop offset='0.639423' stopColor='var(--Colors-Use-Purple-Primary)' />
                                                <stop offset='1' stopColor='var((--Colors-Use-Blue-Primary)' />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <div>正在搜索相关知识...</div>
                                </div>
                            </div>
                        ) : (
                            <div className={styles["qa-answer-content"]}>
                                {item.entries?.length && item.entries.length > 0 ? (
                                    <div className={styles["qa-answer-content-related"]}>
                                        <div className={styles["content-related-box"]}>
                                            <div className={styles["first"]}>
                                                <SolidBookopenTextIcon />
                                                <div>共查询 {item.entries?.length ?? 0} 条相关知识</div>
                                            </div>
                                            <div
                                                className={styles["last"]}
                                                onClick={() =>
                                                    setDetailsItem({
                                                        open: true,
                                                        details: item.entries
                                                    })
                                                }
                                            >
                                                查看详情
                                                <SolidChevronDoubleRightIcon />
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                <Typewriter text={item.content} speed={18} />
                                <div className={styles["qa-answer-content-related-footer"]}>
                                    <div className={styles["box"]}>
                                        <CopyComponents
                                            copyText={item.content}
                                            iconColor={"color: var(--Colors-Use-Neutral-Text-4-Help-text)"}
                                        />
                                        <div
                                            onClick={() =>
                                                setAnswerDescriptionItem({
                                                    open: true,
                                                    processLog: item.processLog
                                                })
                                            }
                                        >
                                            <OutlineLogsIcon />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )
            case "system":
                return (
                    <div className={styles["answer-description-item"]}>
                        <div className={styles["box"]}>
                            <pre style={{padding: 12}}>{item.content}</pre>
                        </div>
                    </div>
                )

            default:
                return null
        }
    }

    return (
        <div className={styles["base-QA-container"]} ref={containerRef}>
            {content.map((it) => (
                <React.Fragment key={it.id + it.type}>{resultRender(it)}</React.Fragment>
            ))}
            <AnswerDescriptionDrawer
                answerDescriptionItem={answerDescriptionItem}
                setAnswerDescriptionItem={setAnswerDescriptionItem}
            />
            <QADetailsDrawer detailsItem={detailsItem} setDetailsItem={setDetailsItem} />
        </div>
    )
}

export {BaseQAContent}
