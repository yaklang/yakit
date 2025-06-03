import {Dispatch, SetStateAction, createContext} from "react"

export interface ShortcutKeyFocusContextStore {
    shortcutId: string | undefined
}

export interface ShortcutKeyFocusContextDispatcher {
    setShortcutId?: Dispatch<SetStateAction<string | undefined>>
}

export interface ShortcutKeyFocusContextValue {
    store: ShortcutKeyFocusContextStore
    dispatcher: ShortcutKeyFocusContextDispatcher
}

export default createContext<ShortcutKeyFocusContextValue>({
    store: {
        shortcutId: undefined
    },
    dispatcher: {
        setShortcutId: undefined,
    }
})
