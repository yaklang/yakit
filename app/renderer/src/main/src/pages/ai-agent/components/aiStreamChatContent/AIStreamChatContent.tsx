import React from "react"
import {AIStreamChatContentProps} from "./type"
import {Tooltip} from "antd"
import {useCreation} from "ahooks"
import {CopyComponents} from "@/components/yakitUI/YakitTag/YakitTag"
import styles from "./AIStreamChatContent.module.scss"
import {OutlineSparklesColorsIcon} from "@/assets/icon/colors"
import useAINodeLabel from "@/pages/ai-re-act/hooks/useAINodeLabel"

export const AIStreamChatContent: React.FC<AIStreamChatContentProps> = React.memo((props) => {
    const {data} = props
    const {nodeLabel} = useAINodeLabel({nodeIdVerbose: data.NodeIdVerbose})
    const content = useCreation(() => {
        return data.content.slice(-150)
    }, [data.content])
    return (
        <Tooltip
            title={
                <div className={styles["tooltip-stream-content"]}>
                    {data.content}
                    <CopyComponents copyText={data.content} />
                </div>
            }
        >
            <div className={styles["ai-stream-chat-content-wrapper"]}>
                <div className={styles["title"]}>
                    <OutlineSparklesColorsIcon />
                    {nodeLabel}
                </div>
                <div className={styles["ai-stream-content"]}>
                    {data.content.length > 100 && <div className={styles["ai-mask"]} />}
                    {content}
                </div>
            </div>
        </Tooltip>
    )
})
