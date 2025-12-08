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
    addKnowledgeBase: (item: KnowledgeBaseItem | KnowledgeBaseItem[] | string | string[]) => void

    /** 删除知识库 */
    deleteKnowledgeBase: (id: string | string[] | KnowledgeBaseItem | KnowledgeBaseItem[]) => void

    /** 获取指定知识库 */
    getKnowledgeBase: (id: string) => KnowledgeBaseItem | undefined

    /** 清空所有知识库 */
    clearAll: () => void

    /** 编辑知识库 */
    editKnowledgeBase: (id: string, data: Partial<KnowledgeBaseItem>) => void
}

const normalizeToArray = <T>(value: T | T[]): T[] => {
    return Array.isArray(value) ? value : [value]
}

const getId = (value: string | KnowledgeBaseItem): string => {
    return typeof value === "string" ? value : value.ID
}

export const useKnowledgeBase = create<KnowledgeBaseStoreProps>((set, get) => ({
    knowledgeBases: [],
    previousKnowledgeBases: [],

    initialize: (items) =>
        set((state) => {
            return {
                previousKnowledgeBases: state.knowledgeBases,
                knowledgeBases: mergeKnowledgeBaseData(state.knowledgeBases, items)
            }
        }),

    /** 新增：支持 item/string 的数组 或 单个 */
    addKnowledgeBase: (input) =>
        set((state) => {
            const list = normalizeToArray(input).map((i) => {
                if (typeof i === "string") {
                    throw new Error("addKnowledgeBase 不支持 string 作为知识库内容，必须为 KnowledgeBaseItem")
                }
                return i
            })

            const prev = state.knowledgeBases
            let newList = [...prev]

            list.forEach((item) => {
                const exists = newList.some((kb) => kb.KnowledgeBaseName === item.KnowledgeBaseName)

                newList = exists
                    ? newList.map((kb) => (kb.KnowledgeBaseName === item.KnowledgeBaseName ? item : kb))
                    : [item, ...newList]
            })

            return {
                previousKnowledgeBases: prev,
                knowledgeBases: newList
            }
        }),

    /** 新增：支持 string | item | string[] | item[] */
    deleteKnowledgeBase: (input) =>
        set((state) => {
            const ids = normalizeToArray(input).map((x) => getId(x))

            return {
                previousKnowledgeBases: state.knowledgeBases,
                knowledgeBases: state.knowledgeBases.filter((kb) => !ids.includes(kb.ID))
            }
        }),

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
