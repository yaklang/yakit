import React, {memo} from "react"
import {AITriageChatContentProps} from "./type"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"

import classNames from "classnames"
import styles from "./AITriageChat.module.scss"

export const AITriageChatContent: React.FC<AITriageChatContentProps> = memo((props) => {
    const {isAnswer, loading, content, contentClassName, chatClassName} = props

    return (
        <div
            className={classNames(
                styles["triage-chat-content"],
                {
                    [styles["triage-chat-question"]]: !isAnswer,
                    [styles["triage-chat-answer"]]: !!isAnswer
                },
                chatClassName || ""
            )}
        >
            <div className={classNames(styles["content-wrapper"], contentClassName || "")}>
                {content}
                {loading && <YakitSpin wrapperClassName={styles["loading-wrapper"]} spinning={true} />}
            </div>
        </div>
    )
})
