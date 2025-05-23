import React, {memo} from "react"
import {} from "ahooks"
import {AITreeProps} from "./type"

import classNames from "classnames"
import styles from "./AITree.module.scss"
import {OutlineCheckcircleIcon} from "@/assets/icon/outline"

export const AITree: React.FC<AITreeProps> = memo((props) => {
    const {} = props

    return (
        <div className={styles["ai-tree"]}>
            <div className={styles["root-node"]}>
                <div className={styles["node-empty"]}>
                    <div className={styles["header"]}></div>
                    <div className={styles["line"]}></div>
                </div>
            </div>

            <div className={styles["node-wrapper"]}>
                <div className={styles["node-empty"]}>
                    <OutlineCheckcircleIcon />
                </div>
                1
            </div>

            <div className={styles["node-wrapper"]}>
                <div className={styles["root-node"]}>
                    <div className={styles["line"]}></div>
                </div>
                1.1
            </div>
            <div className={styles["node-wrapper"]}>
                <div className={styles["root-node"]}>
                    <div className={styles["line"]}></div>
                </div>
                1.2
            </div>
            <div className={styles["node-wrapper"]}>
                <div className={styles["root-node"]}>
                    <div className={styles["line"]}></div>
                </div>
                1.3
            </div>

            <div className={styles["node-wrapper"]}>2</div>

            <div className={styles["node-wrapper"]}>3</div>
            <div className={styles["node-wrapper"]}>3.1</div>
            <div className={styles["node-wrapper"]}>3.1.1</div>
            <div className={styles["node-wrapper"]}>3.1.2</div>
            <div className={styles["node-wrapper"]}>3.1.3</div>
            <div className={styles["node-wrapper"]}>3.2</div>

            <div className={styles["node-wrapper"]}>4</div>
        </div>
    )
})
