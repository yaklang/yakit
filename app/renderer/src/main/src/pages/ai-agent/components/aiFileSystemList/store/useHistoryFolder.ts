import {bindExternalStoreHook, createExternalStore} from "@/utils/createExternalStore"
import {HistoryItem} from "../type"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {customFolderStore} from "./useCustomFolder"

const REMOTE_KEY = "recent-history"
const RECENT_COUNT = 5

const store = createExternalStore<HistoryItem[]>([])

export const loadRemoteHistory = async () => {
    try {
        const saved = await getRemoteValue(REMOTE_KEY)
        if (saved) {
            const parsed = JSON.parse(saved)
            if (Array.isArray(parsed)) {
                store.setSnapshot(() => parsed.filter((item) => item.path).slice(-RECENT_COUNT))
            }
        }
    } catch (e) {
        console.error("Load history failed", e)
    }
}

export const historyStore = {
    subscribe: store.subscribe,
    getSnapshot: store.getSnapshot,

    async addHistoryItem({path, isFolder}: HistoryItem) {
        store.setSnapshot((prevList) => {
            const trimmedPath = path.trim()
            const filtered = prevList.filter((item) => item.path.trim() !== "" && item.path !== trimmedPath)
            const newItem: HistoryItem = {path, isFolder}
            const existingIndex = prevList.findIndex((item) => item.path === trimmedPath)
            let nextList
            if (existingIndex !== -1) {
                nextList = [...filtered]
                nextList.splice(existingIndex, 0, newItem)
            } else {
                nextList = [...filtered, newItem]
            }
            const finalResult = nextList.length > RECENT_COUNT ? nextList.slice(-RECENT_COUNT) : nextList
            setRemoteValue(REMOTE_KEY, JSON.stringify(finalResult)).catch(console.error)
            customFolderStore.addCustomFolderItem(newItem)
            return finalResult
        })
    },

    removeHistoryItem(path: string) {
        store.setSnapshot((prevList) => {
            const nextList = prevList.filter((item) => item.path !== path)
            if (nextList.length !== prevList.length) {
                setRemoteValue(REMOTE_KEY, JSON.stringify(nextList)).catch(console.error)
            }
            customFolderStore.removeCustomFolderItem(path)
            return nextList
        })
    },

    clearHistory() {
        store.setSnapshot(() => [])
        setRemoteValue(REMOTE_KEY, JSON.stringify([])).catch(console.error)
    }
}

export const useHistoryItems = bindExternalStoreHook(store)
