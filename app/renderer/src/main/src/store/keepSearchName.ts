import {YakitRoute} from "@/enums/yakitRoute"
import { bindExternalStoreHook, createExternalStore } from "@/utils/createExternalStore"

// 目前就这两个界面需要这个功能、history 关不了
const routeToKey = {
    [YakitRoute.MITMHacker]: "MITM",
    [YakitRoute.HTTPFuzzer]: "fuzzer"
}

/**
 * editor 需要保存查找的名字
 */
const store = createExternalStore<Map<string, string>>(new Map<string, string>())

export const keepSearchNameMapStore = {
    subscribe: store.subscribe,
    getKeepSearchNameMap: store.getSnapshot,

    setKeepSearchNameMap(name: string, value: string) {
        store.setSnapshot(prev => {
            const next = new Map(prev)
            next.set(name, value)
            return next
        })
    },
    removeKeepSearchRouteNameMap(route: YakitRoute) {
        const key = routeToKey[route]
        if (!key) return

        store.setSnapshot(prev => {
            const next = new Map(prev)
            next.delete(`${key}-request`)
            next.delete(`${key}-response`)
            return next
        })
    },
    removeKeepSearchNameMap(name: string) {
        store.setSnapshot(prev => {
            const next = new Map(prev)
            next.delete(name)
            return next
        })
    }
}

export const useKeepSearchNameMap = bindExternalStoreHook(store)