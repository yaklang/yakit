import {useNodeViewContext} from "@prosemirror-adapter/react"
import React from "react"
import styles from "./CustomMention.module.scss"
import classNames from "classnames"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useMemoizedFn} from "ahooks"
import {API} from "@/services/swagger/resposeType"
import {apiNotepadEit} from "./utils"
import {yakitNotify} from "@/utils/notification"

interface CustomMentionProps {
    notepadHash: string
}
export const CustomMention: React.FC<CustomMentionProps> = (props) => {
    const {notepadHash} = props
    const {node, selected, contentRef} = useNodeViewContext()
    const onSendMessage = useMemoizedFn(() => {
        if (!node.attrs?.userId) {
            yakitNotify("error", "用户id不存在")
            return
        }
        const params: API.NotepadEitRequest = {
            eitUser: node.attrs?.userId,
            notepadHash
        }
        apiNotepadEit(params)
    })
    return (
        <YakitPopover
            content={
                <div className={styles["mention-custom-popover-title"]}>
                    发送提及通知？
                    <YakitButton type='primary' onClick={onSendMessage}>
                        通知
                    </YakitButton>
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
