import type {AIChatData} from "../type/aiChat"

/** 历史会话对应的数据集合 */
class ChatDataStore {
    private map = new Map<string, AIChatData>()

    set = (key: string, value: AIChatData): void => {
        this.map.set(key, value)
    }

    get = (key: string): AIChatData | undefined => {
        return this.map.get(key)
    }

    remove = (key: string): void => {
        this.map.delete(key)
    }

    clear = (): void => {
        this.map.clear()
    }
}

export const aiChatDataStore = new ChatDataStore()
export const knowledgeBaseDataStore = new ChatDataStore()
