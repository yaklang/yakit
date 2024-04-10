import React, {useEffect, useRef, useState} from "react"
import {FuzzerSequenceWrapperProps, WebFuzzerType} from "./WebFuzzerPageType"
import styles from "./WebFuzzerPage.module.scss"
import classNames from "classnames"
import {useInViewport, useMemoizedFn} from "ahooks"
import emiter from "@/utils/eventBus/eventBus"
import {webFuzzerTabs} from "./WebFuzzerPage"

const {ipcRenderer} = window.require("electron")

/**只包裹序列 */
const FuzzerSequenceWrapper: React.FC<FuzzerSequenceWrapperProps> = React.memo((props) => {
    const webFuzzerRef = useRef<any>(null)
    const [inViewport] = useInViewport(webFuzzerRef)

    /**点击切换tab，带其他操作 */
    const onSetType = useMemoizedFn((key: WebFuzzerType) => {
        switch (key) {
            case "sequence":
                break
            default:
                ipcRenderer.invoke("send-webFuzzer-setType", {type: key})
                emiter.emit("onSwitchTypeWebFuzzerPage", JSON.stringify({type: key}))
                break
        }
    })
    return (
        <div className={styles["web-fuzzer"]} ref={webFuzzerRef}>
            <div className={styles["web-fuzzer-tab"]}>
                {webFuzzerTabs.map((item) => (
                    <div
                        key={item.key}
                        className={classNames(styles["web-fuzzer-tab-item"], {
                            [styles["web-fuzzer-tab-item-active"]]: item.key === "sequence"
                        })}
                        onClick={() => {
                            const keyType = item.key as WebFuzzerType
                            onSetType(keyType)
                        }}
                    >
                        <span className={styles["web-fuzzer-tab-label"]}>{item.label}</span>
                        {item.icon}
                    </div>
                ))}
            </div>
            <div className={classNames(styles["web-fuzzer-tab-content"])}>我是序列{props.children}</div>
        </div>
    )
})

export default FuzzerSequenceWrapper
