import React, {useEffect, useRef} from "react"
import {AIChatRightSideProps} from "./AIChatRightSideType"
import classNames from "classnames"
import styles from "./AIChatRightSide.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineChevronleftIcon} from "@/assets/icon/outline"
import {useMemoizedFn} from "ahooks"
import {AITriageChatContent} from "../../aiTriageChat/AITriageChat"

const AIChatRightSide: React.FC<AIChatRightSideProps> = React.memo((props) => {
    const {expand, setExpand, systemOutputs} = props
    const outInputListRef = useRef<HTMLDivElement>(null)
    const handleCancelExpand = useMemoizedFn(() => {
        setExpand(false)
    })

    useEffect(() => {
        scrollToBottom()
    }, [systemOutputs])

    const scrollToBottom = useMemoizedFn(() => {
        const messagesWrapper = outInputListRef.current
        if (!messagesWrapper) return
        requestAnimationFrame(() => {
            const {clientHeight, scrollHeight, scrollTop} = messagesWrapper
            const scrollBottom = scrollHeight - scrollTop - clientHeight
            if (scrollBottom > 80) return
            if (scrollHeight > clientHeight) {
                messagesWrapper.scrollTop = messagesWrapper.scrollHeight
            }
        })
    })

    return (
        <div className={classNames(styles["ai-chat-right-side"], {[styles["ai-chat-right-side-hidden"]]: !expand})}>
            <div className={styles["side-header"]}>
                <div className={styles["header-title"]}>系统输出</div>
                <YakitButton
                    type='outline2'
                    className={styles["side-header-btn"]}
                    icon={<OutlineChevronleftIcon />}
                    onClick={handleCancelExpand}
                    size='small'
                />
            </div>

            <div className={styles["system-outInput-list"]} ref={outInputListRef}>
                {systemOutputs.map((item) => (
                    <AITriageChatContent
                        key={item.nodeId + item.timestamp}
                        isAnswer={item.type === "ai"}
                        loading={false}
                        content={item.data}
                        contentClassName={styles["content-wrapper"]}
                    />
                ))}
            </div>
        </div>
    )
})
export default AIChatRightSide
