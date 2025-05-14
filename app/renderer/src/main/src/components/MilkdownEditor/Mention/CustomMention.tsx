import {useNodeViewContext} from "@prosemirror-adapter/react"
import React from "react"
import styles from "./CustomMention.module.scss"
import classNames from "classnames"

export const CustomMention: React.FC = () => {
    const {selected, contentRef} = useNodeViewContext()

    return (
        <div
            className={classNames(styles["mention-custom"], {
                [styles["mention-custom-selected"]]: selected
            })}
            ref={contentRef}
            contentEditable={false}
        ></div>
    )
}
