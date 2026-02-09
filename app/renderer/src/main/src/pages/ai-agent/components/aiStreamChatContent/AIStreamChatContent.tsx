import React from "react"
import {AIStreamChatContentProps} from "./type"
import {Tooltip} from "antd"
import {useCreation} from "ahooks"
import {CopyComponents} from "@/components/yakitUI/YakitTag/YakitTag"
import styles from "./AIStreamChatContent.module.scss"
import useAINodeLabel from "@/pages/ai-re-act/hooks/useAINodeLabel"
import classNames from "classnames"

export const AIStreamChatContent: React.FC<AIStreamChatContentProps> = React.memo((props) => {
    const {content, nodeIdVerbose, referenceNode} = props
    const {nodeLabel} = useAINodeLabel(nodeIdVerbose)
    const showContent = useCreation(() => {
        return content.slice(-150)
    }, [content])
    return (
        <div className={classNames(styles["ai-stream-chat-content-wrapper"], "ai-stream-chat-content-wrapper")}>
            <Tooltip
                title={
                    <div className={styles["tooltip-stream-content"]}>
                        {content}
                        <CopyComponents copyText={content} />
                    </div>
                }
                trigger={"click"}
            >
                <div className={styles["ai-stream-chat-content"]}>
                    <div className={styles["title"]}>
                        {/* <OutlineSparklesColorsIcon /> */}
                        {nodeLabel}
                    </div>
                    <div className={styles["ai-stream-content"]}>
                        {content.length > 100 && <div className={styles["ai-mask"]} />}
                        {showContent}
                        {referenceNode}
                    </div>
                </div>
            </Tooltip>
        </div>
    )
})
