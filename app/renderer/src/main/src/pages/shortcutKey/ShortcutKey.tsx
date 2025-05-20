import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {useMemoizedFn, useUpdateEffect} from "ahooks"
import {YakitRouteToPageInfo} from "@/routes/newRoute"
import {pageEventMaps, ShortcutKeyEventInfo} from "@/utils/globalShortcutKey/events/pageMaps"
import {convertKeyboardToUIKey, setIsActiveShortcutKeyPage} from "@/utils/globalShortcutKey/utils"
import emiter from "@/utils/eventBus/eventBus"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitKeyBoard} from "@/utils/globalShortcutKey/keyboard"
import cloneDeep from "lodash/cloneDeep"
import {ShortcutKeyProps} from "./type"

import classNames from "classnames"
import styles from "./ShortcutKey.module.scss"
import { isConflictToYakEditor } from "@/utils/globalShortcutKey/events/page/yakEditor"

export const ShortcutKey: React.FC<ShortcutKeyProps> = memo((props) => {
    const {page} = props

    const wrapper = useRef<HTMLDivElement>(null)

    const [data, setData] = useState<Record<string, ShortcutKeyEventInfo>>(pageEventMaps[page].getEvents())
    const eventKeys = useMemo(() => {
        return Object.keys(data)
    }, [data])

    const pageName = useMemo(() => {
        if (page === "global") {
            return "全局快捷键"
        } else {
            return `${YakitRouteToPageInfo[page].label}快捷键`
        }
    }, [page])

    useUpdateEffect(() => {
        pageEventMaps[page].setStorage(data)
    }, [data])

    const editInfo = useRef<string>("")
    const [keyShow, setKeyShow] = useState(false)
    const handleOpenKeyShow = useMemoizedFn((key: string) => {
        if (keyShow) return
        setIsActiveShortcutKeyPage(true)
        editInfo.current = key
        setKeyShow(true)
    })
    const handleCallbackKeyShow = useMemoizedFn((show: boolean) => {
        if (show && inputKeys.length > 0 && editInfo.current) {
            setData((old) => {
                const infos = cloneDeep(old)
                if (!infos[editInfo.current]) return infos
                else {
                    infos[editInfo.current].keys = inputKeys as YakitKeyBoard[]
                    return infos
                }
            })
        }
        setIsActiveShortcutKeyPage(false)
        setKeyShow(false)
        editInfo.current = ""
        setInputKeys([])
        setWarnInfo(undefined)
    })

    const [inputKeys, setInputKeys] = useState<YakitKeyBoard[]>([])
    const [warnInfo,setWarnInfo] = useState<string>()
    const handleShortcutKey = useMemoizedFn((name: string) => {
        if (name.indexOf("setShortcutKey") > -1) {
            const regex = /\(([^)]+)\)/
            const result = name.match(regex)
            if (result && result[1]) {
                if (result[1] === YakitKeyBoard.Escape) {
                    handleCallbackKeyShow(false)
                } else if (result[1] === YakitKeyBoard.Enter) {
                    handleCallbackKeyShow(true)
                } else {
                    let info = isConflictToYakEditor(result[1].split("|") as YakitKeyBoard[])
                    setWarnInfo(info)
                    setInputKeys(result[1].split("|") as YakitKeyBoard[])
                }
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
        <div ref={wrapper} className={styles["shortcut-key"]}>
            <div className={styles["header"]}>{pageName}</div>

            <div className={styles["shortcut-key-content"]}>
                {eventKeys.map((key) => {
                    const {name, keys} = data[key]
                    return (
                        <div key={name} className={styles["key-opt"]}>
                            <div className={styles["opt-name"]}>{name}</div>

                            <div className={styles["opt-key"]} onDoubleClick={() => handleOpenKeyShow(key)}>
                                {convertKeyboardToUIKey(keys)}
                            </div>
                        </div>
                    )
                })}
            </div>

            <YakitModal
                getContainer={wrapper.current || undefined}
                type='white'
                title='编辑快捷键'
                centered={true}
                keyboard={false}
                closable={false}
                footer={null}
                maskClosable={false}
                maskStyle={{backgroundColor: "transparent"}}
                visible={keyShow}
                onCancel={() => {
                    handleCallbackKeyShow(false)
                }}
            >
                <div className={styles["set-shortcut-key-wrapper"]}>
                    <div className={styles["title"]}>先按所需的组合键, 再按 Enter 键, 按 Esc 键取消</div>
                    <div className={styles["title"]}>注：编辑器快捷键需以"Alt", "Shift", "Control", "Meta"进行组合使用</div>
                    <div className={classNames(styles["input"], {[styles["empty"]]: inputKeys.length === 0})}>
                        {inputKeys.join(" ")}
                    </div>

                    <div className={styles["keys-ui"]}>{convertKeyboardToUIKey(inputKeys)}
                        {warnInfo&&<span className={styles['warn']}>（{warnInfo}）</span>}
                    </div>
                </div>
            </YakitModal>
        </div>
    )
})
