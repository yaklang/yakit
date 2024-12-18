import {useNodeViewContext} from "@prosemirror-adapter/react"
import styles from "./MilkdownHr.module.scss"
import React from "react"

export const MilkdownHr: React.FC = () => {
    const {contentRef} = useNodeViewContext()
    return (
        <div className={styles["hr-body"]} ref={contentRef}>
            <div className={styles["hr"]}></div>
        </div>
    )
}
