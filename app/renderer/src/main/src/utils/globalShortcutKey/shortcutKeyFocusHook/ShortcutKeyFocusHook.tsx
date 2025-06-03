import React, {useEffect, useMemo, useRef, useState} from "react"
import styles from "./ShortcutKeyFocusHook.module.scss"
import ShortcutKeyFocusContext, {
    ShortcutKeyFocusContextStore,
    ShortcutKeyFocusContextDispatcher
} from "./hooks/ShortcutKeyFocusContext"
import {v4 as uuidv4} from "uuid"
import { registerShortcutFocusHandle, unregisterShortcutFocusHandle } from "../utils"

interface ShortcutKeyFocusHookProps {
    children?: React.ReactNode
    style?: React.CSSProperties
}

const ShortcutKeyFocusHook: React.FC<ShortcutKeyFocusHookProps> = (props) => {
    const {style} = props
    const [shortcutId, setShortcutId] = useState<string>()

    useEffect(()=>{
        setShortcutId(uuidv4())
    },[])

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
            <div tabIndex={0} className={styles["shortcut-key-focus-hook"]} style={style} onFocus={(e)=>{
                e.stopPropagation()
                shortcutId && registerShortcutFocusHandle(shortcutId)
                console.log("onFocus----",shortcutId);
            }} onBlur={(e)=>{
                e.stopPropagation()
                unregisterShortcutFocusHandle()
                console.log("onBlur----");
            }}>{props.children}</div>
        </ShortcutKeyFocusContext.Provider>
    )
}

export default ShortcutKeyFocusHook
