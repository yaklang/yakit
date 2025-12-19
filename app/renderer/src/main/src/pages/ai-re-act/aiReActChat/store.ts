import { createExternalStore, ExternalStore } from "@/utils/createExternalStore"
import { useSyncExternalStore } from "react"

export interface FileToChatQuestionList {
    path: string
    isFolder: boolean
}

type FileListStore = ExternalStore<FileToChatQuestionList[]>

export type Key = FileListStoreKey | string

export enum FileListStoreKey {
    FileList = "fileList",
    Konwledge = "konwledge",
}

const storeMap = new Map<Key, FileListStore>()

function getStore(key: Key): FileListStore {
    let store = storeMap.get(key)
    if (!store) {
        store = createExternalStore<FileToChatQuestionList[]>([])
        storeMap.set(key, store)
    }
    return store
}

export const fileToChatQuestionStore = {
    add(key: Key, file: FileToChatQuestionList): void {
        const store = getStore(key)
        store.setSnapshot((prev) => {
            const exists = prev.some(
                (item) => item.path === file.path
            )
            if (exists) return prev
            return [...prev, file]
        })
    },

    remove(key: Key, filePath: string): void {
        const store = getStore(key)
        store.setSnapshot((prev) =>
            prev.filter((item) => item.path !== filePath)
        )
    },

    clear(key: Key): void {
        const store = getStore(key)
        store.setSnapshot(() => [])
    }
}

export function useFileToQuestion(key: Key): FileToChatQuestionList[] {
    const store = getStore(key)
    return useSyncExternalStore(store.subscribe, store.getSnapshot)
}
