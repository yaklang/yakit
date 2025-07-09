import React, {ForwardedRef, useEffect, useMemo, useRef, useState} from "react"
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
    focusId?: string[]
    className?: string
    ref?: ForwardedRef<any>
    // 是否更新Focus
    isUpdateFocus?: boolean
}

const ShortcutKeyFocusHook: React.FC<ShortcutKeyFocusHookProps> = (props) => {
    const {style, focusId, className, ref, isUpdateFocus = true} = props
    const [shortcutIds, setShortcutIds] = useState<string[]>()
    const [isHint, setHint] = useState<boolean>(false)

    useEffect(() => {
        let newShortcutIds: string[] = [uuidv4()]
        setShortcutIds(focusId ? focusId : newShortcutIds)
    }, [focusId])

    const store: ShortcutKeyFocusContextStore = useMemo(() => {
        return {
            shortcutIds
        }
    }, [shortcutIds])

    const dispatcher: ShortcutKeyFocusContextDispatcher = useMemo(() => {
        return {
            setShortcutIds: setShortcutIds
        }
    }, [])

    return (
        <ShortcutKeyFocusContext.Provider value={{store, dispatcher}}>
            <div
                tabIndex={0}
                className={classNames(
                    styles["shortcut-key-focus-hook"],
                    {
                        // [styles["shortcut-key-focus-hook-hint"]]: isHint
                    },
                    className
                )}
                ref={ref}
                style={style}
                onFocus={(e) => {
                    e.stopPropagation()
                    if (isUpdateFocus) {
                        shortcutIds && registerShortcutFocusHandle(shortcutIds)
                    }
                    setHint(true)
                }}
                onBlur={(e) => {
                    e.stopPropagation()
                    if (Array.isArray(shortcutIds) && shortcutIds.length > 0 && isUpdateFocus) {
                        shortcutIds && unregisterShortcutFocusHandle(shortcutIds[0])
                    }
                    setHint(false)
                }}
            >
                {props.children}
            </div>
        </ShortcutKeyFocusContext.Provider>
    )
}

export default ShortcutKeyFocusHook
