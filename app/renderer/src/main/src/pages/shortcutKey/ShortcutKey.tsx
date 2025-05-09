import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {useInViewport, useMemoizedFn} from "ahooks"
import {YakitRoute} from "@/enums/yakitRoute"

import classNames from "classnames"
import styles from "./ShortcutKey.module.scss"
import {YakitRouteToPageInfo} from "@/routes/newRoute"
import {pageEventMaps} from "@/utils/globalShortcutKey/events/pageMaps"
import {convertKeyboardToUIKey, setIsActiveShortcutKeyPage} from "@/utils/globalShortcutKey/utils"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import emiter from "@/utils/eventBus/eventBus"

// const {ipcRenderer} = window.require("electron")

interface ShortcutKeyProps {
    page: YakitRoute | "global"
}

export const ShortcutKey: React.FC<ShortcutKeyProps> = memo((props) => {
    const {page} = props

    const pageName = useMemo(() => {
        if (page === "global") {
            return "全局快捷键"
        } else {
            return `${YakitRouteToPageInfo[page].label}快捷键`
        }
    }, [page])

    const keyToEvents = useMemo(() => {
        return pageEventMaps[page]
    }, [page])
    const eventKeys = useMemo(() => {
        return Object.keys(keyToEvents)
    }, [keyToEvents])

    const [inputKeys, setInputKeys] = useState<string[]>([])
    const [keyShow, setKeyShow] = useState(false)
    const handleCallbackKeyShow = useMemoizedFn((flag: boolean, hand?: boolean) => {
        console.log("show", flag, hand)
        if (flag && !hand) return
        if (flag && hand) {
            setIsActiveShortcutKeyPage(true)
            setKeyShow(true)
        }

        if (!flag) {
            setIsActiveShortcutKeyPage(false)
            setKeyShow(false)
            setInputKeys([])
        }
    })

    const handleShortcutKey = useMemoizedFn((name: string) => {
        if (name.indexOf("setShortcutKey") > -1) {
            console.log("name", name)

            const regex = /\(([^)]+)\)/
            const result = name.match(regex)
            if (result && result[1]) {
                console.log("result[1]", result[1])
                setInputKeys(result[1].split("|"))
            }
        }
    })
    useEffect(() => {
        emiter.on("onGlobalShortcutKey", handleShortcutKey)
        return () => {
            emiter.off("onGlobalShortcutKey", handleShortcutKey)
        }
    }, [])

    return (
        <div className={styles["shortcut-key"]}>
            <div className={styles["header"]}>{pageName}</div>

            <div className={styles["shortcut-key-content"]}>
                {eventKeys.map((key) => {
                    const {name, keys} = keyToEvents[key]
                    return (
                        <div key={name} className={styles["key-opt"]}>
                            <div className={styles["opt-name"]}>{name}</div>
                            <YakitPopover
                                trigger='click'
                                // overlayClassName={styles["codec-menu-popover"]}
                                // overlayStyle={{paddingTop: 2}}
                                placement='top'
                                content={
                                    <div>
                                        <div>{inputKeys.join(" ")}</div>
                                        <div>{convertKeyboardToUIKey(inputKeys)}</div>
                                    </div>
                                }
                                visible={keyShow}
                                onVisibleChange={handleCallbackKeyShow}
                            >
                                <div
                                    className={styles["opt-key"]}
                                    onDoubleClick={() => {
                                        handleCallbackKeyShow(true, true)
                                    }}
                                >
                                    {convertKeyboardToUIKey(keys)}
                                </div>
                            </YakitPopover>
                        </div>
                    )
                })}
            </div>
        </div>
    )
})
