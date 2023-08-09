import React, {Suspense, useEffect, useMemo, useRef, useState} from "react"
import {WebFuzzerPageProps, WebFuzzerType} from "./WebFuzzerPageType"
import styles from "./WebFuzzerPage.module.scss"
import {OutlineAdjustmentsIcon, OutlineCollectionIcon, OutlineXIcon} from "@/assets/icon/outline"
import classNames from "classnames"
import {useCreation, useInViewport, useMemoizedFn} from "ahooks"
import {NodeInfoProps, usePageNode} from "@/store/pageNodeInfo"
import {YakitRoute} from "@/routes/newRoute"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {Player} from "video-react"
import "video-react/dist/video-react.css" // import css

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
    const [type, setType] = useState<WebFuzzerType>("config")
    const renderMap = useRef<Map<string, boolean>>(new Map().set("config", true))

    const {getPageNodeInfoByPageId} = usePageNode()

    const onSwitchType = useMemoizedFn((key) => {
        const nodeInfo: NodeInfoProps | undefined = getPageNodeInfoByPageId(YakitRoute.HTTPFuzzer, props.id)
        if (!nodeInfo) {
            return
        }
        const {currentItem} = nodeInfo
        if (!currentItem.pageGroupId || currentItem.pageGroupId === "0") {
            let m = showYakitModal({
                width: "40%",
                centered: true,
                style: {minWidth: 520},
                content: (
                    <div className={styles["yakit-modal-content"]}>
                        <div className={styles["yakit-modal-content-heard"]}>
                            <div className={styles["yakit-modal-content-heard-body"]}>
                                <div className={styles["yakit-modal-content-heard-body-title"]}>温馨提示</div>
                                <div className={styles["yakit-modal-content-heard-body-subTitle"]}>
                                    <span>请先将 Fuzzer 标签页打组，再配置序列</span>
                                    <span className={styles["yakit-modal-content-heard-body-subTitle-tip"]}>
                                        （下图为打组操作示例）
                                    </span>
                                </div>
                            </div>
                            <OutlineXIcon
                                onClick={() => {
                                    m.destroy()
                                }}
                                className={styles["remove-icon"]}
                            />
                        </div>
                        <div className={styles["yakit-modal-content-body"]}>
                            <video
                                className={styles["yakit-modal-content-body-video"]}
                                src={require("@/assets/group_presentation.mp4").default}
                                autoPlay
                                loop
                                // controls
                            />
                        </div>
                    </div>
                ),
                closable: false,
                footer: null
            })
        } else {
            renderMap.current?.set(key, true)
            setType(key)
        }
    })
    const tabContent = useMemo(() => {
        return [
            {
                key: "config",
                node: <HTTPFuzzerPage {...props} />
            },
            {
                key: "sequence",
                node: <FuzzerSequence setType={setType} pageId={props.id} />
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
                            if (item.key === "sequence") {
                                onSwitchType(item.key)
                            } else {
                                renderMap.current?.set(item.key, true)
                                setType(item.key as WebFuzzerType)
                            }
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
