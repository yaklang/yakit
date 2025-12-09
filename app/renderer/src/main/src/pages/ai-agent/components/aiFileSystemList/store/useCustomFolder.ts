import { bindExternalStoreHook, createExternalStore } from "@/utils/createExternalStore"
import { HistoryItem } from "../type"

const SESSION_KEY = "current-session-files"

const getInitSession = (): HistoryItem[] => {
    try {
        const saved = sessionStorage.getItem(SESSION_KEY)
        return saved ? JSON.parse(saved) : []
    } catch {
        return []
    }
}

const store = createExternalStore<HistoryItem[]>(getInitSession())

export const customFolderStore = {
    subscribe: store.subscribe,
    getSnapshot: store.getSnapshot,

    addCustomFolderItem(item: HistoryItem) {
        store.setSnapshot((prev) => {
            if (prev.some((i) => i.path === item.path)) return prev

            const next = [...prev, item]
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(next))
            return next
        })

    },

    removeCustomFolderItem(path: string) {
        store.setSnapshot((prev) => {
            const next = prev.filter((item) => item.path !== path)
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(next))
            return next
        })
    },

    clearCustomFolder() {
        store.setSnapshot(() => [])
        sessionStorage.removeItem(SESSION_KEY)
    }
}

export const useCustomFolder = bindExternalStoreHook(store)