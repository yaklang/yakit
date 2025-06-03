import {useContext} from "react"
import ShortcutKeyFocusContext, {ShortcutKeyFocusContextStore} from "./ShortcutKeyFocusContext"

export default function useStore(): ShortcutKeyFocusContextStore {
    const {store} = useContext(ShortcutKeyFocusContext)
    return store
}
