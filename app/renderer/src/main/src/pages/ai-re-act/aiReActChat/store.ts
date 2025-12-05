import { bindExternalStoreHook, createExternalStore } from "@/utils/createExternalStore"

const store = createExternalStore<string[]>([])

export const fileToChatQuestionStore = {
    subscribe: store.subscribe,
    getSnapshot: store.getSnapshot,

    addFileToChatQuestion(filePath: string) {
        store.setSnapshot((prev) => [...prev, filePath])
    },
    claearFileToChatQuestion() {
        store.setSnapshot(() => [])
    },
}

export const useFileToQuestion = bindExternalStoreHook(store)