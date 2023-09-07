import React, {Suspense, useContext, useEffect, useMemo, useRef, useState} from "react"
import {WebFuzzerPageProps, WebFuzzerType} from "./WebFuzzerPageType"
import styles from "./WebFuzzerPage.module.scss"
import {OutlineAdjustmentsIcon, OutlineCollectionIcon, OutlineXIcon} from "@/assets/icon/outline"
import classNames from "classnames"
import {useCreation, useInViewport, useMemoizedFn} from "ahooks"
import {YakitRoute} from "@/routes/newRoute"
import "video-react/dist/video-react.css" // import css
import {yakitNotify} from "@/utils/notification"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import shallow from "zustand/shallow"

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
const WebFuzzerPage: React.FC<WebFuzzerPageProps> = React.memo((props) => {
    const {selectGroupId, getPagesDataByGroupId} = usePageInfo(
        (s) => ({
            selectGroupId: s.selectGroupId.get(YakitRoute.HTTPFuzzer)||'',
            getPagesDataByGroupId: s.getPagesDataByGroupId
        }),
        shallow
    )

    const onSwitchType = useMemoizedFn((key) => {
        const pageChildrenList: PageNodeItemProps[] = getPagesDataByGroupId(YakitRoute.HTTPFuzzer, selectGroupId)
        if (props.id && !pageChildrenList) {
            // 新建组
            onAddGroup(props.id)
        } else if (props.id && pageChildrenList.length === 0) {
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

export default WebFuzzerPage
