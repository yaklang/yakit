import type {AIChatData} from "../type/aiChat"

/** 历史会话对应的数据集合 */
const initChatData: AIChatData = {
    coordinatorIDs: [],
    runTimeIDs: [],
    yakExecResult: {card: [], execFileRecord: new Map(), yakExecResultLogs: []},
    aiPerfData: {
        consumption: {},
        pressure: [],
        firstCost: [],
        totalCost: []
    },
    casualChat: {
        elements: [],
        contents: {
            current: new Map()
        }
    },
    taskChat: {
        plan: [],
        elements: [],
        contents: {
            current: new Map()
        }
    },
    grpcFolders: [],
    reActTimelines: []
}
type Updater<T> = (prev: T) => T

class ChatDataStore {
    private map = new Map<string, AIChatData>()

    init = (key: string): AIChatData => {
        const existing = this.map.get(key)
        if (existing) return existing

        const cloned: AIChatData = {
            ...initChatData,
            casualChat: {
                ...initChatData.casualChat,
                contents: { current: new Map() }
            },
            taskChat: {
                ...initChatData.taskChat,
                contents: { current: new Map() }
            },
            yakExecResult: {
                ...initChatData.yakExecResult,
                execFileRecord: new Map()
            }
        }

        this.map.set(key, cloned)
        return cloned
    }

    get = (key: string): AIChatData | undefined => {
        return this.map.get(key)
    }

    set = (key: string, value: AIChatData | Updater<AIChatData>): void => {
        const prev = this.map.get(key) ?? this.init(key)
        const next = typeof value === "function" ? value(prev) : value
        this.map.set(key, next)
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
