import {useEffect} from "react"
import {useMemoizedFn} from "ahooks"
import emiter from "@/utils/eventBus/eventBus"

function useShortcutKeyTrigger(keyName: string, cb: () => void): void {
    const handleShortcutKey = useMemoizedFn((name: string) => {
        if (name === keyName) {
            cb()
        }
    })
    useEffect(() => {
        emiter.on("onGlobalShortcutKey", handleShortcutKey)
        return () => {
            emiter.off("onGlobalShortcutKey", handleShortcutKey)
        }
    }, [])
}

export default useShortcutKeyTrigger
