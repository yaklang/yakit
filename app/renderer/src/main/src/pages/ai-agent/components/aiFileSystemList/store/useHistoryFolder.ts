import {bindExternalStoreHook, createExternalStore} from "@/utils/createExternalStore"
import {HistoryItem} from "../type"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {customFolderStore, defaultFolder} from "./useCustomFolder"

const REMOTE_KEY = "recent-history"
const RECENT_COUNT = 5

const store = createExternalStore<HistoryItem[]>([])

export const loadRemoteHistory = async () => {
    try {
        const saved = await getRemoteValue(REMOTE_KEY)
        if (saved) {
            const parsed = JSON.parse(saved)
            if (Array.isArray(parsed)) {
                store.setSnapshot(() => parsed.slice(-RECENT_COUNT))
            }
        }
    } catch (e) {
        console.error("Load history failed", e)
    }
}

export const historyStore = {
    subscribe: store.subscribe,
    getSnapshot: store.getSnapshot,

    addHistoryItem({path, isFolder}: HistoryItem) {
        store.setSnapshot((prevList) => {
            const filtered = prevList.filter((item) => item.path !== path.trim())
            const newItem: HistoryItem = {path, isFolder}
            const nextList = [...filtered, newItem]

            const finalResult = nextList.length > RECENT_COUNT ? nextList.slice(-RECENT_COUNT) : nextList

            setRemoteValue(REMOTE_KEY, JSON.stringify(finalResult)).catch(console.error)
            customFolderStore.addCustomFolderItem(newItem)
            return finalResult
        })
    },

    async removeHistoryItem(path: string) {
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
