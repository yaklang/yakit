import {Dispatch, SetStateAction, createContext} from "react"

export interface ShortcutKeyFocusContextStore {
    shortcutIds: string[] | undefined
}

export interface ShortcutKeyFocusContextDispatcher {
    setShortcutIds?: Dispatch<SetStateAction<string[] | undefined>>
}

export interface ShortcutKeyFocusContextValue {
    store: ShortcutKeyFocusContextStore
    dispatcher: ShortcutKeyFocusContextDispatcher
}

export default createContext<ShortcutKeyFocusContextValue>({
    store: {
        shortcutIds: undefined
    },
    dispatcher: {
        setShortcutIds: undefined,
    }
})
