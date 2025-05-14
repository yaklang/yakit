import {useNodeViewContext} from "@prosemirror-adapter/react"
import React from "react"
import styles from "./CustomMention.module.scss"
import classNames from "classnames"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"

interface CustomMentionProps {
    notepadHash: string
}
export const CustomMention: React.FC<CustomMentionProps> = (props) => {
    const {notepadHash} = props
    const {node, selected, contentRef} = useNodeViewContext()
    return (
        <YakitPopover
            content={
                <div className={styles["mention-custom-popover-title"]}>
                    发送提及通知？
                    <YakitButton type='primary'>通知</YakitButton>
                </div>
            }
            trigger='click'
            overlayClassName={styles["mention-custom-popover"]}
        >
            <div
                className={classNames(styles["mention-custom"], {
                    [styles["mention-custom-selected"]]: selected
                })}
                ref={contentRef}
                id={node.attrs?.mentionId}
                contentEditable={false}
            ></div>
        </YakitPopover>
    )
}
