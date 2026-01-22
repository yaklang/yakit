import {ChatReferenceMaterialPayload, ReActChatElement} from "@/pages/ai-re-act/hooks/aiRender"
import {type CSSProperties, useMemo, useState, type FC} from "react"
import {useStreamingChatContent} from "../aiChatListItem/StreamingChatContent/hooks/useStreamingChatContent"
import styles from "./AIGroupStreamCard.module.scss"
import useAINodeLabel from "@/pages/ai-re-act/hooks/useAINodeLabel"
import {OutlineSparklesColorsIcon} from "@/assets/icon/colors"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineArrowsexpandIcon, OutlineChevrondownIcon, OutlineChevronupIcon} from "@/assets/icon/outline"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"

const Code: FC<{code: ChatReferenceMaterialPayload; style: CSSProperties}> = ({code, style}) => {
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
    nodeLabel?: string
}> = ({chatType, token, index, nodeLabel}) => {
    const renderData = useStreamingChatContent({chatType, token})
    const [open, setOpen] = useState(false)
    const [openPopover, setOpenPopover] = useState(false)

    const onClose = () => {
        setOpen(false)
    }

    if (!renderData) return null
    return (
        <div className={styles["single-stream-text"]}>
            <div className={styles["single-stream-text-title"]}>
                <span>
                    {index}. {nodeLabel}
                </span>
                <YakitPopover
                    trigger={"click"}
                    visible={openPopover}
                    onVisibleChange={setOpenPopover}
                    content={
                        <div className={styles["popover-reference-wrapper"]}>
                            <div className={styles["popover-reference-title"]}>
                                {index}. {nodeLabel}
                                <YakitButton
                                    onClick={() =>{
                                        setOpenPopover(false)
                                        setOpen(true)
                                    }}
                                    type='text2'
                                    icon={<OutlineArrowsexpandIcon />}
                                />
                            </div>
                            {!!renderData.reference && <Code code={renderData.reference} style={{maxHeight: "200px"}} />}
                        </div>
                    }
                >
                    <YakitButton
                        hidden={!renderData.reference || renderData.reference.length === 0}
                        className={styles.button}
                        type='text'
                        colors='primary'
                    >
                        查看文献
                    </YakitButton>
                </YakitPopover>
            </div>
            <YakitModal
                visible={open}
                title={`${index}. ${nodeLabel}`}
                cancelButtonProps={{style: {display: "none"}}}
                onOk={onClose}
                onCloseX={onClose}
            >
                <Code code={renderData.reference || []} style={{maxHeight: "500px"}} />
            </YakitModal>
            {renderData.data.content}
            <br />
        </div>
    )
}

const AIGroupStreamCard: FC<{
    elements: ReActChatElement[]
}> = ({elements}) => {
    const orderedElements = useMemo(() => [...elements].reverse(), [elements])
    const lastElement = orderedElements[0]
    const renderData = useStreamingChatContent({chatType: lastElement.chatType, token: lastElement.token})
    const {nodeLabel} = useAINodeLabel(renderData?.data.NodeIdVerbose)
    const [expand, setExpand] = useState(true)
    if (!renderData) return null
    return (
        <div className={styles.container}>
            <div className={styles.title}>
                <div>
                    <OutlineSparklesColorsIcon />
                    <span> {nodeLabel}</span>
                </div>
                <div className={styles["stream-text"]}>
                    <p>{!expand && <span>{renderData.data.content}</span>}</p>
                </div>
                <YakitButton
                    onClick={() => setExpand(!expand)}
                    type='text'
                    icon={expand ? <OutlineChevronupIcon /> : <OutlineChevrondownIcon />}
                />
            </div>
            <div className={`${styles.content} ${expand ? styles.expand : ""}`}>
                <div className={styles["content-inner"]}>
                    {orderedElements.map((el, index) => (
                        <AIStreamNode
                            nodeLabel={nodeLabel}
                            key={el.token}
                            chatType={el.chatType}
                            token={el.token}
                            index={orderedElements.length - index}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
export default AIGroupStreamCard
