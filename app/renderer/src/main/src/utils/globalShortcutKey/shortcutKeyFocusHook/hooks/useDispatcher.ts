import {useContext} from "react"
import ShortcutKeyFocusContext, {ShortcutKeyFocusContextDispatcher} from "./ShortcutKeyFocusContext"

export default function useDispatcher(): ShortcutKeyFocusContextDispatcher {
    const {dispatcher} = useContext(ShortcutKeyFocusContext)
    return dispatcher
}
