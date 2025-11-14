import { bindExternalStoreHook, createExternalStore } from "@/utils/createExternalStore"

const STORAGE_KEY = "custom-folder"
const RECENT_COUNT = 3

// 初始化最近打开数组和 store
const initialRecent: string[] = (() => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY)
        return saved ? JSON.parse(saved) : []
    } catch {
        return []
    }
})()

// store 保存所有打开的文件
const store = createExternalStore<Set<string>>(new Set(initialRecent))
const recentStore: string[] = [...initialRecent]

export const customFolderStore = {
    subscribe: store.subscribe,
    getCustomFolderSet: store.getSnapshot,

    addCustomFolder(path: string) {
        store.setSnapshot(prev => {
            const next = new Set(prev)
            next.add(path)
            return next
        })
        // 更新最近三条
        const index = recentStore.indexOf(path)
        if (index !== -1) recentStore.splice(index, 1) // 去重
        recentStore.push(path)
        if (recentStore.length > RECENT_COUNT) recentStore.shift() // 保留最后三条
        localStorage.setItem(STORAGE_KEY, JSON.stringify(recentStore))
    },

    removeCustomFolder(path: string) {
        store.setSnapshot(prev => {
            const next = new Set(prev)
            next.delete(path)
            return next
        })

        const index = recentStore.indexOf(path)
        if (index !== -1) recentStore.splice(index, 1)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(recentStore))
    },

    clearCustomFolder() {
        store.setSnapshot(() => new Set<string>())
    },
}

export const useCustomFolder = bindExternalStoreHook(store)
