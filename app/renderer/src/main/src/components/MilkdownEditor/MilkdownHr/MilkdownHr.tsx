import {useNodeViewContext} from "@prosemirror-adapter/react"
import styles from "./MilkdownHr.module.scss"
import React, {useEffect} from "react"
import {YChangeProps} from "../YChange/YChangeType"
import {useCreation} from "ahooks"
import classNames from "classnames"
import {YChange} from "../YChange/YChange"
export const MilkdownHr: React.FC = () => {
    const {node, contentRef} = useNodeViewContext()
    const {attrs} = node
    const ychange: YChangeProps = useCreation(() => attrs?.ychange || {}, [attrs])
    return (
        <div
            className={classNames(styles["hr-custom-block"], {
                [styles["hr-custom-diff-history-block"]]: ychange
            })}
            style={{color: ychange ? ychange.color?.dark : ""}}
            contentEditable={false}
        >
            <div className={styles["hr-body"]} ref={contentRef}>
                <div className={styles["hr"]}></div>
            </div>
            <YChange {...ychange} />
        </div>
    )
}
