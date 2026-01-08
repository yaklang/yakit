import {bindExternalStoreHook, createExternalStore} from "@/utils/createExternalStore"
import {HistoryItem} from "../type"
import {historyStore} from "./useHistoryFolder"
import {mergeOnePath} from "../utils"
import {opfileNotify} from "../FileTreeSystemListWapper/FileTreeSystemListWapper"

const SESSION_KEY = "current-session-files"

const {ipcRenderer} = window.require("electron")

let addQueue: Promise<void> = Promise.resolve()

/**
 * 获取初始session数据
 */
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

/**
 * 获取默认文件夹
 */
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

    async addCustomFolderItem(item: HistoryItem) {
        addQueue = addQueue.then(async () => {
            try {
                const prev = store.getSnapshot()
                const finalResult = await mergeOnePath(prev, item)
                opfileNotify({
                    uniquePaths: prev,
                    incoming: item,
                    label: item.isFolder ? "文件夹" : "文件",
                    path: item.path
                })
                store.setSnapshot(() => {
                    const next = finalResult
                    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next))
                    return next
                })
            } catch {}
        })
    },

    updateCustomFolderItem(newItem: HistoryItem[]) {
        store.setSnapshot(() => {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(newItem))
            return newItem
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
