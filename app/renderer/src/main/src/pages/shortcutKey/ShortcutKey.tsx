import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {useMemoizedFn, useUpdateEffect} from "ahooks"
import {YakitRouteToPageInfo} from "@/routes/newRoute"
import {pageEventMaps, ShortcutKeyEventInfo, ShortcutKeyPageName} from "@/utils/globalShortcutKey/events/pageMaps"
import {convertKeyboardToUIKey, setIsActiveShortcutKeyPage} from "@/utils/globalShortcutKey/utils"
import emiter from "@/utils/eventBus/eventBus"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitKeyBoard} from "@/utils/globalShortcutKey/keyboard"
import cloneDeep from "lodash/cloneDeep"
import {ShortcutKeyListProps, ShortcutKeyProps} from "./type"

import classNames from "classnames"
import styles from "./ShortcutKey.module.scss"
import {isConflictToYakEditor} from "@/utils/globalShortcutKey/events/page/yakEditor"
import {Spin} from "antd"
import {GetReleaseEdition} from "@/utils/envfile"
import {GlobalShortcutKey} from "@/utils/globalShortcutKey/events/global"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"

const getShortcutPageName = (page) => {
    if (page === "global") {
        return "全局"
    } else if (page === "yakit-multiple") {
        return "多页面"
    } else if (page === "chat-cs") {
        return "ChatCS"
    } else {
        return `${YakitRouteToPageInfo[page].label}`
    }
}

export const ShortcutKey: React.FC<ShortcutKeyProps> = memo((props) => {
    const {page} = props

    const wrapper = useRef<HTMLDivElement>(null)

    const [loading, setLoading] = useState<boolean>(false)
    const [data, setData] = useState<Record<string, ShortcutKeyEventInfo>>(pageEventMaps["global"].getEvents())

    const getData = useMemoizedFn((key) => {
        setLoading(true)
        pageEventMaps[key].getStorage()
        setTimeout(() => {
            setData(pageEventMaps[key].getEvents())
            setLoading(false)
        }, 200)
    })

    useEffect(() => {
        getData(page)
    }, [page])

    const eventKeys = useMemo(() => {
        const newEventKeys = Object.keys(data).filter((item) => {
            const key = item as GlobalShortcutKey
            return !data[key].scopeShow || (data[key].scopeShow || []).includes(GetReleaseEdition())
        })
        return newEventKeys
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
                    pageEventMaps[page].setStorage(infos)
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
    const [warnInfo, setWarnInfo] = useState<string>()
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
            <Spin spinning={loading}>
                <div className={styles["header"]}>{getShortcutPageName(page)}</div>

                <div className={styles["shortcut-key-content"]}>
                    {eventKeys.map((key) => {
                        const {name, keys} = data[key]
                        return (
                            <div key={key} className={styles["key-opt"]}>
                                <div className={styles["opt-name"]}>{name}</div>

                                <div className={styles["opt-key"]} onClick={() => handleOpenKeyShow(key)}>
                                    {convertKeyboardToUIKey(keys)}
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className={styles["option"]}>
                    <YakitButton
                        size='large'
                        onClick={() => {
                            pageEventMaps[page].resetEvents()
                            getData(page)
                        }}
                    >
                        恢复默认设置
                    </YakitButton>
                </div>

                <YakitModal
                    getContainer={wrapper.current || undefined}
                    type='white'
                    title='编辑快捷键'
                    centered={true}
                    keyboard={false}
                    // closable={false}
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
                        {/* <div className={styles["title"]}>
                            注：编辑器快捷键需以"Alt", "Shift", "Control", "Meta"进行组合使用
                        </div> */}
                        <div className={classNames(styles["input"], {[styles["empty"]]: inputKeys.length === 0})}>
                            {inputKeys.join(" ")}
                        </div>

                        <div className={styles["keys-ui"]}>
                            {convertKeyboardToUIKey(inputKeys)}
                            {warnInfo && <span className={styles["warn"]}>（{warnInfo}）</span>}
                        </div>
                    </div>
                </YakitModal>
            </Spin>
        </div>
    )
})

// 快捷键列表
export const ShortcutKeyList: React.FC<ShortcutKeyListProps> = memo(() => {
    const [activePage, setActivePage] = useState<ShortcutKeyPageName>("global")

    const newPageEventMaps = useMemo(() => {
        return Object.keys(pageEventMaps).filter((item) => {
            const page = item as ShortcutKeyPageName
            return !pageEventMaps[page].scopeShow || (pageEventMaps[page].scopeShow || []).includes(GetReleaseEdition())
        })
    }, [])

    return (
        <div className={styles["shortcut-key-list"]}>
            <div className={styles["list"]}>
                {newPageEventMaps.map((item) => {
                    const page = item as ShortcutKeyPageName
                    return (
                        <div
                            key={page}
                            className={classNames(styles["list-item"], {
                                [styles["list-item-active"]]: page === activePage
                            })}
                            onClick={() => {
                                setActivePage(page)
                            }}
                        >
                            {getShortcutPageName(page)}
                        </div>
                    )
                })}
            </div>
            <div className={styles["content"]}>
                <ShortcutKey page={activePage} />
            </div>
        </div>
    )
})
