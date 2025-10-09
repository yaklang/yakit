import {YakitRoute} from "@/enums/yakitRoute"
import {useSyncExternalStore} from "react"

const editorSearchMap = new Map<string, string>()

const listeners = new Set<() => void>()

// 目前就这两个界面需要这个功能、history 关不了
const routeToKey = {
    [YakitRoute.MITMHacker]: "MITM",
    [YakitRoute.HTTPFuzzer]: "fuzzer"
}

/**
 * editor 需要保存查找的名字
 */
export const keepSearchNameMapStore = {
    subscribe(listener: () => void) {
        listeners.add(listener)
        return () => {
            listeners.delete(listener)
        }
    },
    getKeepSearchNameMap: () => {
        return editorSearchMap
    },
    setKeepSearchNameMap: (name: string, value: string) => {
        editorSearchMap.set(name, value)
        emitChange()
    },

    removeKeepSearchRouteNameMap: (name: string) => {
        const key = routeToKey[name]
        editorSearchMap.delete(`${key}-request`)
        editorSearchMap.delete(`${key}-response`)
        emitChange()
    },
    removeKeepSearchNameMap: (name: string) => {
        editorSearchMap.delete(name)
        emitChange()
    }
}

function emitChange() {
    listeners.forEach((listener) => listener())
}

export function useKeepSearchNameMap() {
    return useSyncExternalStore(keepSearchNameMapStore.subscribe, keepSearchNameMapStore.getKeepSearchNameMap)
}
