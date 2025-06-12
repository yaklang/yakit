import React, {useEffect, useMemo, useRef, useState} from "react"
import styles from "./ShortcutKeyFocusHook.module.scss"
import ShortcutKeyFocusContext, {
    ShortcutKeyFocusContextStore,
    ShortcutKeyFocusContextDispatcher
} from "./hooks/ShortcutKeyFocusContext"
import {v4 as uuidv4} from "uuid"
import {registerShortcutFocusHandle, unregisterShortcutFocusHandle} from "../utils"
import classNames from "classnames"

interface ShortcutKeyFocusHookProps {
    children?: React.ReactNode
    style?: React.CSSProperties
    focusId?: string
}

const ShortcutKeyFocusHook: React.FC<ShortcutKeyFocusHookProps> = (props) => {
    const {style, focusId} = props
    const [shortcutId, setShortcutId] = useState<string>()
    const [isHint, setHint] = useState<boolean>(false)

    useEffect(() => {
        setShortcutId(focusId || uuidv4())
    }, [])

    const store: ShortcutKeyFocusContextStore = useMemo(() => {
        return {
            shortcutId: shortcutId
        }
    }, [shortcutId])

    const dispatcher: ShortcutKeyFocusContextDispatcher = useMemo(() => {
        return {
            setShortcutId: setShortcutId
        }
    }, [])

    return (
        <ShortcutKeyFocusContext.Provider value={{store, dispatcher}}>
            <div
                tabIndex={0}
                className={classNames(styles["shortcut-key-focus-hook"], {
                    // [styles["shortcut-key-focus-hook-hint"]]: isHint
                })}
                style={style}
                onFocus={(e) => {
                    e.stopPropagation()
                    shortcutId && registerShortcutFocusHandle(shortcutId)
                    setHint(true)
                }}
                onBlur={(e) => {
                    e.stopPropagation()
                    shortcutId && unregisterShortcutFocusHandle(shortcutId)
                    setHint(false)
                }}
            >
                {props.children}
            </div>
        </ShortcutKeyFocusContext.Provider>
    )
}

export default ShortcutKeyFocusHook
