import {useEffect} from "react"
import {useMemoizedFn} from "ahooks"
import emiter from "@/utils/eventBus/eventBus"
import { JSONParseLog } from "@/utils/tool"

function useShortcutKeyTrigger(keyName: string, cb: (focus: string[] | null) => void): void {
    const handleShortcutKey = useMemoizedFn((obj: string) => {
        try {
            const {eventName, currentFocus} = JSONParseLog(obj,{page:"useShortcutKeyTrigger",fun:"handleShortcutKey"})
            if (eventName === keyName) {
                cb(currentFocus)
            }
        } catch (error) {}
    })
    useEffect(() => {
        emiter.on("onGlobalShortcutKey", handleShortcutKey)
        return () => {
            emiter.off("onGlobalShortcutKey", handleShortcutKey)
        }
    }, [])
}

export default useShortcutKeyTrigger
