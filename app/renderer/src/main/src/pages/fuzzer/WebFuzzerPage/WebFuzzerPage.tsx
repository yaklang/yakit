import React, {Suspense, useContext, useEffect, useMemo, useRef, useState} from "react"
import {WebFuzzerPageProps, WebFuzzerType} from "./WebFuzzerPageType"
import styles from "./WebFuzzerPage.module.scss"
import {OutlineAdjustmentsIcon, OutlineCollectionIcon, OutlineXIcon} from "@/assets/icon/outline"
import classNames from "classnames"
import {useCreation, useInViewport, useMemoizedFn} from "ahooks"
import {NodeInfoProps, PageNodeItemProps, usePageNode} from "@/store/pageNodeInfo"
import {YakitRoute} from "@/routes/newRoute"
import "video-react/dist/video-react.css" // import css
import {yakitNotify} from "@/utils/notification"

const {ipcRenderer} = window.require("electron")

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
    const getCurrentSelectGroup = usePageNode((s) => s.getCurrentSelectGroup)

    const onSwitchType = useMemoizedFn((key) => {
        const nodeInfo: PageNodeItemProps | undefined = getCurrentSelectGroup(YakitRoute.HTTPFuzzer)
        if (props.id && !nodeInfo) {
            // 新建组
            onAddGroup(props.id)
        } else if (props.id && nodeInfo&&nodeInfo.pageChildrenList.length === 0) {
            // 新建组
            onAddGroup(props.id)
        } else {
            onSetType("sequence")
        }
    })
    const onAddGroup = useMemoizedFn((id: string) => {
        ipcRenderer.invoke("send-add-group", {pageId: id})
    })
    const onSetType = useMemoizedFn((key: WebFuzzerType) => {
        ipcRenderer.invoke("send-webFuzzer-setType", {type: key})
        if (key === "config") {
            ipcRenderer.invoke("send-ref-webFuzzer-request", {type: key})
        }
    }) 
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
                                onSetType(item.key as WebFuzzerType)
                            }
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
