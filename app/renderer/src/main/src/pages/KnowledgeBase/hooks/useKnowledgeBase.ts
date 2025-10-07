import {createStore} from "zustand/vanilla"
import {useStore} from "zustand"

interface KnowledgeBaseFile {
    path: string
    fileType: string
}

interface CreateKnowledgeBaseData {
    KnowledgeBaseFile: KnowledgeBaseFile[]
    KnowledgeBaseName: string
    KnowledgeBaseType: string
    KnowledgeBaseDescription: string
    KnowledgeBaseLength: number
    streamToken: string
}

export type KnowledgeBaseItem = CreateKnowledgeBaseData & {ID: string}

interface KnowledgeBaseState {
    knowledgeBases: KnowledgeBaseItem[]
    addKnowledgeBase: (item: KnowledgeBaseItem) => void
    deleteKnowledgeBase: (id: string) => void
    getKnowledgeBase: (id: string) => KnowledgeBaseItem | undefined
    clearAll: () => void
    initialize: (items: KnowledgeBaseItem[]) => void
    editKnowledgeBase: (id: string, data: Partial<KnowledgeBaseItem>) => void
}

export const KnowledgeBaseStore = createStore<KnowledgeBaseState>((set, get) => {
    return {
        knowledgeBases: [],

        initialize: (items) =>
            set((state) => {
                const newItems = items.filter((item) => !state.knowledgeBases.some((kb) => kb.ID === item.ID))
                return {knowledgeBases: [...state.knowledgeBases, ...newItems]}
            }),

        addKnowledgeBase: (item) =>
            set((state) => {
                if (state.knowledgeBases.some((kb) => kb.ID === item.ID)) return state
                return {knowledgeBases: [...state.knowledgeBases, item]}
            }),

        deleteKnowledgeBase: (id) =>
            set((state) => ({
                knowledgeBases: state.knowledgeBases.filter((kb) => kb.ID !== id)
            })),

        getKnowledgeBase: (id) => get().knowledgeBases.find((kb) => kb.ID === id),

        clearAll: () => set({knowledgeBases: []}),
        editKnowledgeBase: (id, data) =>
            set((state) => ({
                knowledgeBases: state.knowledgeBases.map((kb) => (kb.ID === id ? {...kb, ...data} : kb))
            }))
    }
})

export const useKnowledgeBase = <T>(selector: (state: KnowledgeBaseState) => T) =>
    useStore(KnowledgeBaseStore, selector)
