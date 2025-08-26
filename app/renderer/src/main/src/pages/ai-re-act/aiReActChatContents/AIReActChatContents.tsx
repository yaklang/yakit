import React from "react"
import {AIReActChatContentsPProps} from "./AIReActChatContentsType"
import styles from "./AIReActChatContents.module.scss"

export const AIReActChatContents: React.FC<AIReActChatContentsPProps> = React.memo((props) => {
    return (
        <div className={styles["ai-re-act-chat-contents"]}>
            <div className={styles["triage-contents-list"]}>gg</div>
        </div>
    )
})
