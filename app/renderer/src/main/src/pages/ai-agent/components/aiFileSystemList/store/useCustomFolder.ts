import {bindExternalStoreHook, createExternalStore} from "@/utils/createExternalStore"
import {HistoryItem} from "../type"
import {historyStore} from "./useHistoryFolder"

const SESSION_KEY = "current-session-files"

const {ipcRenderer} = window.require("electron")

const getInitSession = async (): Promise<HistoryItem[]> => {
    try {
        // 获取session
        const raw = sessionStorage.getItem(SESSION_KEY)
        if (raw) {
            const saved = JSON.parse(raw) as HistoryItem[]
            if (saved.length > 0) return saved
        }
        // 获取历史
        const history = historyStore.getSnapshot()
        if (history.length > 0) return [history[history.length - 1]]
        // 获取默认文件夹
        const defaultItem = await defaultFolder()
        if (defaultItem) return [defaultItem]
        return []
    } catch {
        return []
    }
}

export const defaultFolder = async (): Promise<HistoryItem | null> => {
    try {
        const result = await ipcRenderer.invoke("fetch-code-path")
        if (!result) return null
        const item: HistoryItem = {
            path: result.path ?? result,
            isFolder: result.isFolder ?? true
        }

        return item
    } catch (e) {
        return null
    }
}

export const initCustomFolderStore = async (): Promise<void> => {
    const initData = await getInitSession()
    store.setSnapshot(() => initData)
}

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

// export const initSessionFromHistoryOrIPC = async () => {
//     const history = historyStore.getSnapshot()
//     if (history.length > 0) {
//         customFolderStore.addCustomFolderItem(history[history.length - 1])
//         return
//     }
//     try {
//         const item = await defaultFolder()
//         if (!item) return
//         historyStore.addHistoryItem(item)
//         return item
//     } catch (e) {
//         console.error("fetch-code-path failed", e)
//         return null
//     }
// }
