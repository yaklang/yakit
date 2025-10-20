import React from "react"
import {AIStreamChatContentProps} from "./type"
import {Tooltip} from "antd"
import {useCreation} from "ahooks"
import {CopyComponents} from "@/components/yakitUI/YakitTag/YakitTag"
import styles from "./AIStreamChatContent.module.scss"
import {OutlineSparklesColorsIcon} from "@/assets/icon/colors"

export const AIStreamChatContent: React.FC<AIStreamChatContentProps> = React.memo((props) => {
    const {stream, nodeLabel} = props
    const content = useCreation(() => {
        return stream.slice(-150)
    }, [stream])
    return (
        <Tooltip
            title={
                <div className={styles["tooltip-stream-content"]}>
                    {stream}
                    <CopyComponents copyText={stream} />
                </div>
            }
        >
            <div className={styles["ai-stream-chat-content-wrapper"]}>
                <div className={styles["title"]}>
                    <OutlineSparklesColorsIcon />
                    {nodeLabel}
                </div>
                <div className={styles["ai-stream-content"]}>
                    {stream.length > 100 && <div className={styles["ai-mask"]} />}
                    {content}
                </div>
            </div>
        </Tooltip>
    )
})
