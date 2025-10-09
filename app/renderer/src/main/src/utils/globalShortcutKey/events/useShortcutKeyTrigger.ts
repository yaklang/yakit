import {useEffect} from "react"
import {useMemoizedFn} from "ahooks"
import emiter from "@/utils/eventBus/eventBus"

function useShortcutKeyTrigger(keyName: string, cb: (focus: string[] | null) => void): void {
    const handleShortcutKey = useMemoizedFn((obj: string) => {
        try {
            const {eventName, currentFocus} = JSON.parse(obj)
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
