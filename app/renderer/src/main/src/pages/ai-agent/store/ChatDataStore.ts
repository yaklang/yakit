import {SetStateAction} from "react"
import type {AIChatData} from "../type/aiChat"
import {AIChatQSData, ReActChatBaseInfo} from "@/pages/ai-re-act/hooks/aiRender"

export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

interface GetContentMapParams {
    session: string
    chatType: ReActChatBaseInfo["chatType"]
    mapKey: string
}

/** 获取精确类型 */
const getExactType: (value: any) => string = (value: any) => {
    return Object.prototype.toString.call(value).slice(8, -1)
}

export class ChatDataStore {
    private map = new Map<string, AIChatData>()

    /** 生成初始化默认数据 */
    private initDefaultData(): AIChatData {
        return {
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
                contents: new Map()
            },
            taskChat: {
                plan: [],
                elements: [],
                contents: new Map()
            },
            grpcFolders: [],
            reActTimelines: []
        }
    }

    /** 创建新的聊天数据 */
    create(session: string): AIChatData {
        if (this.map.has(session)) {
            throw new Error(`Session: ${session} already exists`)
        }

        const newData = this.initDefaultData()
        this.map.set(session, newData)
        return newData
    }

    /** 判断指定聊天数据是否存在 */
    has(session: string): boolean {
        return this.map.has(session)
    }

    /** 获取指定聊天数据 */
    get(session: string): AIChatData | undefined {
        return this.map.get(session)
    }

    /** 获取会话聊天列表的数据 */
    getContentMap({session, chatType, mapKey}: GetContentMapParams): AIChatQSData | undefined {
        const chatData = this.get(session)
        if (!chatData) return undefined
        try {
            if (chatType === "reAct") {
                return chatData.casualChat.contents.get(mapKey)
            } else if (chatType === "task") {
                return chatData.taskChat.contents.get(mapKey)
            }
        } catch (error) {
            return undefined
        }
    }

    /** 设置指定聊天数据 */
    set(session: string, value: SetStateAction<AIChatData>): void {
        const prev = this.map.get(session)
        if (!prev) {
            throw new Error(`Session: ${session} does not exist`)
        }

        console.log('prev:', prev, value);
        const next = typeof value === "function" ? value(prev) : value
        this.map.set(session, next)
    }

    /**
     * 增量更新指定聊天数据
     * @attention 增量更新逻辑只支持第一层和第二层的属性更新，超出需要重新开发逻辑
     */
    updater(session: string, updateData: DeepPartial<AIChatData>): void {
        const prev = this.map.get(session)
        if (!prev) {
            throw new Error(`Session: ${session} does not exist`)
        }

        const result = {...prev}

        for (const key in updateData) {
            if (updateData.hasOwnProperty(key)) {
                const updateValue = updateData[key]

                if (getExactType(updateValue) === "Object" && !!updateValue) {
                    // 如果是对象且原对象有对应属性，进行深层更新
                    if (key in result && getExactType(result[key]) === "Object") {
                        result[key] = {...result[key], ...updateValue}
                    } else {
                        // 直接赋值
                        result[key] = {...updateValue}
                    }
                } else {
                    // 直接更新一层属性
                    result[key] = updateValue
                }
            }
        }

        this.map.set(session, result)
    }

    /** 删除指定聊天数据 */
    remove(session: string): void {
        this.map.delete(session)
    }

    /** 清空所有聊天数据 */
    clear(): void {
        this.map.clear()
    }
}

export const aiChatDataStore = new ChatDataStore()
export const knowledgeBaseDataStore = new ChatDataStore()
