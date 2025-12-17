import {createExternalStore, ExternalStore} from "@/utils/createExternalStore"
import {useSyncExternalStore} from "react"

type FileListStore = ExternalStore<string[]>

const storeMap = new Map<Key, FileListStore>()

export type Key = FileListStoreKey | string

export enum FileListStoreKey {
    FileList = "fileList",
    Konwledge = "konwledge",
}

function getStore(key: Key): FileListStore {
    let store = storeMap.get(key)
    if (!store) {
        store = createExternalStore<string[]>([])
        storeMap.set(key, store)
    }
    return store
}
export const fileToChatQuestionStore = {
    add(key: Key, filePath: string): void {
        const store = getStore(key)
        store.setSnapshot((prev) => {
            if (prev.includes(filePath)) return prev
            return [...prev, filePath]
        })
    },

    remove(key: Key, filePath: string): void {
        const store = getStore(key)
        store.setSnapshot((prev) => prev.filter((item) => item !== filePath))
    },

    clear(key: Key): void {
        const store = getStore(key)
        store.setSnapshot(() => [])
    }
}

export function useFileToQuestion(key: Key): string[] {
    const store = getStore(key)
    return useSyncExternalStore(store.subscribe, store.getSnapshot)
}
