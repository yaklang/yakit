import React from "react"
import styles from "./AIBottomSideBar.module.scss"
import classNames from "classnames"
import {OutlineCodeIcon} from "@/assets/icon/outline"
export interface AIBottomSideBarProps {
    setShowAIBottomDetails: React.Dispatch<React.SetStateAction<boolean>>
}
export const AIBottomSideBar: React.FC<AIBottomSideBarProps> = (props) => {
    const {setShowAIBottomDetails} = props
    return (
        <div className={styles["ai-bottom-side-bar"]}>
            <div className={styles["ai-bottom-side-bar-left"]}>
                <div className={classNames(styles["left-item"], styles["left-check"])}>
                    <div
                        className={classNames(
                            styles["left-check-info"],
                            styles["left-check-start"],
                            styles["left-check-end"]
                        )}
                        onClick={() => {
                            setShowAIBottomDetails(true)
                        }}
                    >
                        <OutlineCodeIcon />
                        终端
                    </div>
                </div>
            </div>

            {/* 预留项 */}
            <div className={styles["ai-bottom-side-bar-right"]}></div>
        </div>
    )
}
