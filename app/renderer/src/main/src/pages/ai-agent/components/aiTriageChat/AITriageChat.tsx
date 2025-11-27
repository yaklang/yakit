import React, {memo} from "react"
import {AITriageChatContentProps} from "./type"

import classNames from "classnames"
import styles from "./AITriageChat.module.scss"
import {PreWrapper} from "../ToolInvokerCard"
import {useMemoizedFn} from "ahooks"

export const AITriageChatContent: React.FC<AITriageChatContentProps> = memo((props) => {
    const {isAnswer, content, contentClassName, chatClassName, extraValue} = props

    const renderContent = useMemoizedFn(() => {
        if (!!extraValue?.isForge) {
            return (
                <>
                    {extraValue?.showForgeQuestion}
                    <PreWrapper code={`${extraValue?.forgeParams}`} />
                </>
            )
        }
        return <>{content}</>
    })
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
            <div className={classNames(styles["content-wrapper"], contentClassName || "")}>{renderContent()}</div>
        </div>
    )
})
