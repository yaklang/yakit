import { bindExternalStoreHook, createExternalStore } from "@/utils/createExternalStore"

const store = createExternalStore<Set<string>>(new Set<string>())

// 存 用户打开的文件
export const customFolderStore = {
    subscribe: store.subscribe,
    getCustomFolderSet: store.getSnapshot,

    addCustomFolder(path: string) {
        store.setSnapshot(prev => {
            const next = new Set(prev)
            next.add(path)
            return next
        })
    },

    clearCustomFolder() {
        store.setSnapshot(() => new Set<string>())
    }
}

export const useCustomFolder = bindExternalStoreHook(store)
