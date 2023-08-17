import React, { Suspense, useContext, useEffect, useMemo, useRef, useState } from "react"
import { WebFuzzerPageProps, WebFuzzerType } from "./WebFuzzerPageType"
import styles from "./WebFuzzerPage.module.scss"
import { OutlineAdjustmentsIcon, OutlineCollectionIcon, OutlineXIcon } from "@/assets/icon/outline"
import classNames from "classnames"
import { useCreation, useInViewport, useMemoizedFn, useWhyDidYouUpdate } from "ahooks"
import { NodeInfoProps, PageNodeItemProps, usePageNode } from "@/store/pageNodeInfo"
import { YakitRoute } from "@/routes/newRoute"
import "video-react/dist/video-react.css" // import css
import { SubPageContext } from "@/pages/layout/MainContext"
import { yakitNotify } from "@/utils/notification"


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
    const { setType, onAddGroup } = useContext(SubPageContext)

    const { getPageNodeInfoByPageId } = usePageNode()

    const onSwitchType = useMemoizedFn((key) => {
        if (!props.id) return
        const nodeInfo: NodeInfoProps | undefined = getPageNodeInfoByPageId(YakitRoute.HTTPFuzzer, props.id)
        if (!nodeInfo) return
        const { currentItem, subIndex } = nodeInfo
        if (subIndex === -1) {
            // 新建组
            onAddGroup(currentItem.pageId)
            yakitNotify('info', '如需使用序列，请将其他标签页拖入该分组')
        } else {
            if (setType) setType(key)
        }
    })
    // useWhyDidYouUpdate('WebFuzzerPage', { ...props, });
    return (
        <div className={styles["web-fuzzer"]}>
            <div className={styles["web-fuzzer-tab"]}>
                {webFuzzerTabs.map((item) => (
                    <div
                        key={item.key}
                        className={classNames(styles["web-fuzzer-tab-item"], {
                            [styles["web-fuzzer-tab-item-active"]]: props.type === item.key
                        })}
                        onClick={() => {
                            if (item.key === "sequence") {
                                onSwitchType(item.key)
                            } else {
                                if (setType) setType(item.key as WebFuzzerType)
                            }
                        }}
                    >
                        <span className={styles["web-fuzzer-tab-label"]}>{item.label}</span>
                        {item.icon}
                    </div>
                ))}
            </div>
            <div
                className={classNames(styles["web-fuzzer-tab-content"],)}
            >
                {props.children}
            </div>
        </div>
    )
})
