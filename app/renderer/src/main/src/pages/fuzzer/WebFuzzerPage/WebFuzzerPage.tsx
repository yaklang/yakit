import React, {Suspense, useRef, useState} from "react"
import {WebFuzzerPageProps, WebFuzzerType} from "./WebFuzzerPageType"
import styles from "./WebFuzzerPage.module.scss"
import {OutlineAdjustmentsIcon, OutlineCollectionIcon} from "@/assets/icon/outline"
import classNames from "classnames"
import {useCreation} from "ahooks"

const FuzzerSequence = React.lazy(() => import("../FuzzerSequence/FuzzerSequence"))
const HTTPFuzzerPage = React.lazy(() => import("../HTTPFuzzerPage"))

const webFuzzerTabs = [
    {
        key: "config",
        label: "Fuzzer 配置",
        icon: <OutlineAdjustmentsIcon />
    },
    {
        key: "sequence",
        label: "Fuzzer 序列",
        icon: <OutlineCollectionIcon />
    }
]
export const WebFuzzerPage: React.FC<WebFuzzerPageProps> = React.memo((props) => {
    const [type, setType] = useState<WebFuzzerType>("sequence")
    const renderMap = useRef<Map<string, boolean>>(new Map().set(type, true))
    const tabContent = useCreation(() => {
        return [
            {
                key: "config",
                node: <HTTPFuzzerPage {...props} />
            },
            {
                key: "sequence",
                node: <FuzzerSequence />
            }
        ]
    }, [props])
    return (
        <div className={styles["web-fuzzer"]}>
            <div className={styles["web-fuzzer-tab"]}>
                {webFuzzerTabs.map((item) => (
                    <div
                        key={item.key}
                        className={classNames(styles["web-fuzzer-tab-item"], {
                            [styles["web-fuzzer-tab-item-active"]]: type === item.key
                        })}
                        onClick={() => {
                            renderMap.current?.set(item.key, true)
                            setType(item.key as WebFuzzerType)
                        }}
                    >
                        <span className={styles["web-fuzzer-tab-label"]}>{item.label}</span>
                        {item.icon}
                    </div>
                ))}
            </div>
            {tabContent.map(
                (tabItem) =>
                    renderMap.current?.get(tabItem.key) && (
                        <div
                            className={classNames(styles["web-fuzzer-tab-content"], {
                                [styles["display-none"]]: type !== tabItem.key
                            })}
                            key={tabItem.key}
                        >
                            <Suspense fallback={<div>Loading Main</div>}>{tabItem.node}</Suspense>
                        </div>
                    )
            )}
        </div>
    )
})
