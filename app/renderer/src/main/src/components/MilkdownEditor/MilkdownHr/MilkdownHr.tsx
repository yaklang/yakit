import {useNodeViewContext} from "@prosemirror-adapter/react"
import styles from "./MilkdownHr.module.scss"
import React, {useEffect} from "react"
import {useCreation} from "ahooks"
import {YChangeProps} from "../YChange/YChangeType"

export const MilkdownHr: React.FC = () => {
    const {node, contentRef} = useNodeViewContext()
    const {attrs} = node

    useEffect(() => {
        console.log("MilkdownHr-node.attrs", node.attrs)
    }, [node.attrs])

    const ychange: YChangeProps = useCreation(() => attrs.ychange, [attrs])

    return (
        <div className={styles["hr-body"]} ref={contentRef}>
            <div className={styles["hr"]}></div>
        </div>
    )
}
