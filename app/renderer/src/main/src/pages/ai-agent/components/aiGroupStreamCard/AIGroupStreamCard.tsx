import {ChatReferenceMaterialPayload, ReActChatElement} from "@/pages/ai-re-act/hooks/aiRender"
import {type CSSProperties, useState, type FC, useRef, useEffect, useMemo} from "react"
import styles from "./AIGroupStreamCard.module.scss"
import useAINodeLabel from "@/pages/ai-re-act/hooks/useAINodeLabel"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineArrowsexpandIcon, OutlineChevrondownIcon, OutlineChevronupIcon} from "@/assets/icon/outline"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {useTypedStream} from "../aiChatListItem/StreamingChatContent/hooks/useTypedStream"
import classNames from "classnames"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

export const Code: FC<{code: ChatReferenceMaterialPayload; style: CSSProperties}> = ({code, style}) => {
    return (
        <pre className={styles["code-wrapper"]} style={style}>
            {code.map((item) => (
                <code key={item.event_uuid}>{item.payload}</code>
            ))}
        </pre>
    )
}

const AIStreamNode: FC<{
    chatType: ReActChatElement["chatType"]
    token: string
    index: number
    session: string
    nodeLabel?: string
}> = ({chatType, token, index, session, nodeLabel}) => {
    const {t} = useI18nNamespaces(["aiAgent"])
    const {stream} = useTypedStream({chatType, token, session})
    const [open, setOpen] = useState(false)
    const [openPopover, setOpenPopover] = useState(false)

    const onClose = () => {
        setOpen(false)
    }

    if (!stream) return null
    return (
        <div className={styles["single-stream-text"]}>
            <YakitModal
                visible={open}
                title={`${index}. ${nodeLabel}`}
                cancelButtonProps={{style: {display: "none"}}}
                onOk={onClose}
                onCloseX={onClose}
            >
                <Code code={stream.reference || []} style={{maxHeight: "500px"}} />
            </YakitModal>
            {index}. {stream.data.content}
            <YakitPopover
                trigger={"click"}
                visible={openPopover}
                onVisibleChange={setOpenPopover}
                content={
                    <div className={styles["popover-reference-wrapper"]}>
                        <div className={styles["popover-reference-title"]}>
                            {index}. {nodeLabel}
                            <YakitButton
                                onClick={() => {
                                    setOpenPopover(false)
                                    setOpen(true)
                                }}
                                type='text2'
                                icon={<OutlineArrowsexpandIcon />}
                            />
                        </div>
                        {!!stream.reference && <Code code={stream.reference} style={{maxHeight: "200px"}} />}
                    </div>
                }
            >
                <YakitButton
                    hidden={!stream.reference || stream.reference.length === 0}
                    className={styles.button}
                    type='text'
                    colors='primary'
                >
                    {t("FilePreview.viewReference")}
                </YakitButton>
            </YakitPopover>
        </div>
    )
}

const BOTTOM_THRESHOLD = 10
const STREAM_MASK_THRESHOLD = 170

const AIGroupStreamCard: FC<{
    elements: ReActChatElement[]
    hasNext?: boolean
    session: string
}> = ({elements, hasNext, session}) => {
    const lastElement = elements[elements.length - 1]
    const {stream} = useTypedStream({chatType: lastElement.chatType, token: lastElement.token, session})
    const {nodeLabel} = useAINodeLabel(stream?.data.NodeIdVerbose)
    const [expand, setExpand] = useState(true)
    const content = stream?.data.content || ""
    const shouldShowMask = useMemo(() => content.length > STREAM_MASK_THRESHOLD, [content])
    const contentRef = useRef<HTMLDivElement>(null)
    const [isScroll, setIsScroll] = useState(false)
    const allowAutoScrollRef = useRef<boolean>(true)

    // 点击其他地方取消滚动
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent): void => {
            const target = event.target as Node | null
            if (!contentRef.current) return
            if (!target) return

            if (!contentRef.current.contains(target)) {
                setIsScroll(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])

    // 有滚动条的时候自动滚动到底部
    useEffect(() => {
        const el = contentRef.current
        if (!el || !expand) return

        const onScroll = (): void => {
            const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight
            allowAutoScrollRef.current = distanceToBottom <= BOTTOM_THRESHOLD
        }

        el.addEventListener("scroll", onScroll, {passive: true})
        return () => el.removeEventListener("scroll", onScroll)
    }, [expand])

    useEffect(() => {
        if (!expand) return
        allowAutoScrollRef.current = true
    }, [expand])

    // 无滚动条的时候自动滚动到底部
    useEffect(() => {
        const el = contentRef.current
        if (!el || !expand) return
        if (!allowAutoScrollRef.current) return
        if (hasNext) return
        requestAnimationFrame(() => {
            el.scrollTo({top: el.scrollHeight, behavior: "smooth"})
        })
        let rafId = 0
        const observer = new ResizeObserver(() => {
            if (!allowAutoScrollRef.current) return
            cancelAnimationFrame(rafId)
            rafId = requestAnimationFrame(() => {
                el.scrollTo({top: el.scrollHeight, behavior: "smooth"})
            })
        })
        observer.observe(el)

        return () => {
            cancelAnimationFrame(rafId)
            observer.disconnect()
        }
    }, [elements.length, expand, hasNext])

    useEffect(() => {
        if (hasNext) {
            setExpand(false)
        }
    }, [hasNext])

    if (!stream) return null
    return (
        <div className={styles.container}>
            <div className={styles.title} onClick={() => setExpand(!expand)}>
                <div>
                    {/* <OutlineSparklesColorsIcon /> */}
                    <span> {nodeLabel}</span>
                </div>
                <div className={styles["stream-text"]}>
                    {shouldShowMask && <div className={styles["ai-mask"]} />}
                    <p>{!expand && <span>{content}</span>}</p>
                </div>
                <YakitButton type='text' icon={expand ? <OutlineChevronupIcon /> : <OutlineChevrondownIcon />} />
            </div>
            <div
                className={classNames(styles.content, {
                    [styles.expand]: expand,
                    [styles.noMask]: isScroll
                })}
            >
                <div
                    ref={contentRef}
                    onClick={() => setIsScroll(true)}
                    className={styles["content-inner"]}
                    style={{
                        overflow: isScroll ? "overlay" : "hidden"
                    }}
                >
                    {elements.map((el, index) => (
                        <AIStreamNode
                            session={session}
                            nodeLabel={nodeLabel}
                            key={el.token}
                            chatType={el.chatType}
                            token={el.token}
                            index={index + 1}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
export default AIGroupStreamCard
