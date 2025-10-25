/**
 * @description 知识库管理 Store（带变更前记录）
 */
import {create} from "zustand"
import {mergeKnowledgeBaseData} from "../utils"
import {CreateKnowledgeBaseData} from "../TKnowledgeBase"

export type KnowledgeBaseItem = CreateKnowledgeBaseData & {ID: string}

interface KnowledgeBaseStoreProps {
    /** 当前知识库列表 */
    knowledgeBases: KnowledgeBaseItem[]

    /** 上一次变更前的知识库列表 */
    previousKnowledgeBases: KnowledgeBaseItem[] | null

    /** 初始化知识库 */
    initialize: (items: KnowledgeBaseItem[]) => void

    /** 添加知识库 */
    addKnowledgeBase: (item: KnowledgeBaseItem) => void

    /** 删除知识库 */
    deleteKnowledgeBase: (id: string) => void

    /** 获取指定知识库 */
    getKnowledgeBase: (id: string) => KnowledgeBaseItem | undefined

    /** 清空所有知识库 */
    clearAll: () => void

    /** 编辑知识库 */
    editKnowledgeBase: (id: string, data: Partial<KnowledgeBaseItem>) => void
}

export const useKnowledgeBase = create<KnowledgeBaseStoreProps>((set, get) => ({
    knowledgeBases: [],
    previousKnowledgeBases: null,

    initialize: (items) =>
        set((state) => ({
            previousKnowledgeBases: state.knowledgeBases,
            knowledgeBases: mergeKnowledgeBaseData(state.knowledgeBases, items)
        })),

    addKnowledgeBase: (item) =>
        set((state) => {
            const prev = state.knowledgeBases
            const exists = prev.some((kb) => kb.KnowledgeBaseName === item.KnowledgeBaseName)
            const newList = exists
                ? prev.map((kb) => (kb.KnowledgeBaseName === item.KnowledgeBaseName ? item : kb))
                : [...prev, item]

            return {
                previousKnowledgeBases: prev,
                knowledgeBases: newList
            }
        }),

    deleteKnowledgeBase: (id) =>
        set((state) => ({
            previousKnowledgeBases: state.knowledgeBases,
            knowledgeBases: state.knowledgeBases.filter((kb) => kb.ID !== id)
        })),

    getKnowledgeBase: (id) => get().knowledgeBases.find((kb) => kb.ID === id),

    clearAll: () =>
        set(() => ({
            previousKnowledgeBases: [],
            knowledgeBases: []
        })),

    editKnowledgeBase: (id, data) =>
        set((state) => ({
            previousKnowledgeBases: state.knowledgeBases,
            knowledgeBases: state.knowledgeBases.map((kb) => (kb.ID === id ? {...kb, ...data} : kb))
        }))
}))
