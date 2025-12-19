import { bindExternalStoreHook, createExternalStore } from "@/utils/createExternalStore"
import { HistoryItem } from "../type"
import { historyStore } from "./useHistoryFolder"

const SESSION_KEY = "current-session-files"

const {ipcRenderer} = window.require("electron")


// const getInitSession = (): HistoryItem[] => {
//     try {
//         const saved = sessionStorage.getItem(SESSION_KEY)
//         return saved ? JSON.parse(saved) : []
//     } catch {
//         return []
//     }
// }

const store = createExternalStore<HistoryItem[]>([])

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


export const initSessionFromHistoryOrIPC = async () => {
    const history = historyStore.getSnapshot()

    if (history.length > 0) {
        customFolderStore.addCustomFolderItem(history[history.length - 1])
        return 
    }
    try {
        const result = await ipcRenderer.invoke("fetch-code-path")
        if (!result) return null
        const item: HistoryItem = {
            path: result.path ?? result,
            isFolder: result.isFolder ?? true
        }
        historyStore.addHistoryItem(item)
        return item
    } catch (e) {
        console.error("fetch-code-path failed", e)
        return null
    }
}