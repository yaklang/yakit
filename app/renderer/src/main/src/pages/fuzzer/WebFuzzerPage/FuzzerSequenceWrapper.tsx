import React, {} from "react"
import {FuzzerSequenceWrapperProps, WebFuzzerType} from "./WebFuzzerPageType"
import styles from "./WebFuzzerPage.module.scss"
import classNames from "classnames"
import {useMemoizedFn} from "ahooks"
import emiter from "@/utils/eventBus/eventBus"
import {webFuzzerTabs} from "./WebFuzzerPage"

/**只包裹序列 */
const FuzzerSequenceWrapper: React.FC<FuzzerSequenceWrapperProps> = React.memo((props) => {
    /**点击切换tab，带其他操作 */
    const onSetType = useMemoizedFn((key: WebFuzzerType) => {
        switch (key) {
            case "sequence":
                break
            default:
                emiter.emit("sendSwitchSequenceToMainOperatorContent", JSON.stringify({type: key}))
                // 先切换展示的tab再发送事件,切换【配置】/【规则】tab 得选中type
                emiter.emit("sequenceSendSwitchTypeToFuzzer", JSON.stringify({type: key}))
                break
        }
    })
    return (
        <div className={styles["web-fuzzer"]}>
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
            <div className={classNames(styles["web-fuzzer-tab-content"])}>{props.children}</div>
        </div>
    )
})

export default FuzzerSequenceWrapper
