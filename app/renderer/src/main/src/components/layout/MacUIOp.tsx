import React, {useState} from "react"
import {MacUIOpCloseSvgIcon, MacUIOpMaxSvgIcon, MacUIOpMinSvgIcon, MacUIOpRestoreSvgIcon} from "./icons"
import {useMemoizedFn} from "ahooks"
import classnames from "classnames"
import styles from "./uiOperate.module.scss"

const {ipcRenderer} = window.require("electron")

export interface MacUIOpProp {}

export const MacUIOp: React.FC<MacUIOpProp> = React.memo((props) => {
    const [show, setShow] = useState<boolean>(false)
    const [isMax, setIsMax] = useState<boolean>(false)

    const operate = useMemoizedFn(async (type: "close" | "min" | "full") => {
        let flag: boolean = await ipcRenderer.invoke("UIOperate", type)
        if (type === "full") setIsMax(flag)
    })

    return (
        <div
            className={styles["mac-ui-op-wrapper"]}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
        >
            <div
                className={styles["mac-ui-op-body"]}
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
            >
                <div className={styles["op-btn"]} onClick={(e) => operate("close")}>
                    {show ? (
                        <MacUIOpCloseSvgIcon />
                    ) : (
                        <div className={styles["op-hidn-btn"]}>
                            <div className={classnames(styles["btn-icon"], styles["close-bg-color"])}></div>
                        </div>
                    )}
                </div>
                <div className={styles["op-btn"]} onClick={(e) => operate("min")}>
                    {show ? (
                        <MacUIOpMinSvgIcon />
                    ) : (
                        <div className={styles["op-hidn-btn"]}>
                            <div className={classnames(styles["btn-icon"], styles["min-bg-color"])}></div>
                        </div>
                    )}
                </div>
                <div className={styles["op-btn"]} onClick={(e) => operate("full")}>
                    {show ? (
                        isMax ? (
                            <MacUIOpRestoreSvgIcon />
                        ) : (
                            <MacUIOpMaxSvgIcon />
                        )
                    ) : (
                        <div className={styles["op-hidn-btn"]}>
                            <div className={classnames(styles["btn-icon"], styles["max-bg-color"])}></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
})
