// 流式响应类型
export type StreamMessageType = "message" | "mid_result" | "result" | "ai_summary" | "error"

// 后端的流响应
export interface QueryKnowledgeBaseByAIResponse {
    Message: string
    MessageType: StreamMessageType
    Data?: string
}

// normalize 后的知识库 entry
export interface KnowledgeBaseEntry {
    ID: number
    KnowledgeBaseId: number
    KnowledgeTitle: string
    KnowledgeType: string
    ImportanceScore: number
    Keywords: string[]
    KnowledgeDetails: string
    Summary: string
    SourcePage: number
    PotentialQuestions: string[]
    PotentialQuestionsVector: number[]
    CreatedAt?: string
    UpdatedAt?: string
}

// 前端的消息结构
export interface QAMessage {
    id: string
    type: "user" | "assistant" | "system"
    content: string // 当前可见内容（过程或最终回答）
    timestamp: number
    entries?: KnowledgeBaseEntry[]
    isStreaming?: boolean
    // 新增：过程内容与最终答案
    processLog?: string
    finalAnswer?: string
    showDetails?: boolean
    showRelated?: boolean
}

// 问答相关类型定义
export interface QueryKnowledgeBaseByAIRequest {
    Query: string
    EnhancePlan: string
    KnowledgeBaseID: number
    QueryAllCollections: boolean
}

export const normalizeEntry = (e: any): KnowledgeBaseEntry => ({
    ID: e?.ID ?? e?.id ?? 0,
    KnowledgeBaseId: e?.KnowledgeBaseID ?? e?.KnowledgeBaseId ?? e?.knowledge_base_id ?? 0,
    KnowledgeTitle: e?.KnowledgeTitle ?? e?.knowledge_title ?? "",
    KnowledgeType: e?.KnowledgeType ?? e?.knowledge_type ?? "",
    ImportanceScore: e?.ImportanceScore ?? e?.importance_score ?? 0,
    Keywords: e?.Keywords ?? e?.keywords ?? [],
    KnowledgeDetails: e?.KnowledgeDetails ?? e?.knowledge_details ?? "",
    Summary: e?.Summary ?? e?.summary ?? "",
    SourcePage: e?.SourcePage ?? e?.source_page ?? 0,
    PotentialQuestions: e?.PotentialQuestions ?? e?.potential_questions ?? [],
    PotentialQuestionsVector: e?.PotentialQuestionsVector ?? e?.potential_questions_vector ?? [],
    CreatedAt: e?.CreatedAt ?? e?.created_at,
    UpdatedAt: e?.UpdatedAt ?? e?.updated_at
})

export const createStreamResponseHandler = (setMessages: React.Dispatch<React.SetStateAction<QAMessage[]>>) => {
    return (_: any, response: QueryKnowledgeBaseByAIResponse) => {
        const {Message, MessageType, Data} = response

        setMessages((prev) => {
            const list = [...prev]
            const last = list[list.length - 1]

            if (!last || last.type !== "assistant" || !last.isStreaming) {
                return list
            }

            const appendProcess = (text: string) => {
                last.processLog = (last.processLog ?? "") + text + "\n"
                last.content = last.processLog
            }

            switch (MessageType) {
                case "message": {
                    appendProcess(Message)
                    break
                }

                case "mid_result":
                case "result": {
                    try {
                        if (!Data || Data === "null" || Data === "undefined") break

                        const parsed = typeof Data === "string" ? JSON.parse(Data) : Data
                        const items: any[] = Array.isArray(parsed) ? parsed : [parsed]

                        last.entries ??= []
                        last.entries.push(...items.filter(Boolean).map(normalizeEntry))
                    } catch {
                        appendProcess(`结果数据解析失败: ${String(Data)}`)
                    }
                    break
                }

                case "ai_summary": {
                    last.finalAnswer = Message
                    last.content = Message
                    last.isStreaming = false
                    break
                }

                case "error": {
                    appendProcess(`**错误:** ${Message}`)
                    last.isStreaming = false
                    break
                }
            }

            return list
        })
    }
}
