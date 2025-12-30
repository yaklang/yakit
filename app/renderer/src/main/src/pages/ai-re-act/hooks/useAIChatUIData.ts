import {useCreation} from "ahooks"
import useAIAgentStore from "@/pages/ai-agent/useContext/useStore"
import {defaultChatIPCData} from "@/pages/ai-agent/defaultConstant"
import useChatIPCStore from "@/pages/ai-agent/useContext/ChatIPCContent/useStore"
import {isEmpty} from "lodash"
import {AIYakExecFileRecord} from "./aiRender"
import {AIFileSystemPin, UseAIPerfDataState, UseCasualChatState, UseTaskChatState, UseYakExecResultState} from "./type"

function useAIChatUIData() {
    const {activeChat} = useAIAgentStore()
    const {chatIPCData} = useChatIPCStore()

    const runTimeIDs: string[] = useCreation(() => {
        if (activeChat && activeChat.answer && activeChat.answer.runTimeIDs) {
            return activeChat.answer.runTimeIDs
        }
        return chatIPCData.runTimeIDs || defaultChatIPCData.runTimeIDs
    }, [activeChat, chatIPCData.runTimeIDs])

    const grpcFolders: AIFileSystemPin[] = useCreation(() => {
        if (activeChat && activeChat.answer && activeChat.answer.grpcFolders) {
            // 临时将缓存的路径字符串数组处理成新的定义结构
            try {
                return activeChat.answer.grpcFolders.filter(Boolean).map((item) => {
                    if (typeof item === "string") {
                        return {path: item, isFolder: true} as AIFileSystemPin
                    } else {
                        return item
                    }
                })
            } catch (error) {
                return []
            }
        }
        return chatIPCData.grpcFolders || defaultChatIPCData.grpcFolders
    }, [activeChat, chatIPCData.grpcFolders])

    const taskChat: UseTaskChatState = useCreation(() => {
        if (activeChat && activeChat.answer && activeChat.answer.taskChat) {
            return activeChat.answer.taskChat
        }
        return chatIPCData.taskChat || defaultChatIPCData.taskChat
    }, [activeChat, chatIPCData.taskChat])

    const yakExecResult: UseYakExecResultState = useCreation(() => {
        if (activeChat && activeChat.answer && activeChat.answer.yakExecResult) {
            let result: Map<string, AIYakExecFileRecord[]> = new Map()
            if (!isEmpty(activeChat.answer.yakExecResult.execFileRecord)) {
                result = new Map(activeChat.answer.yakExecResult.execFileRecord)
            }
            return {
                ...activeChat.answer.yakExecResult,
                execFileRecord: result
            }
        }
        return chatIPCData.yakExecResult || defaultChatIPCData.yakExecResult
    }, [activeChat, chatIPCData.yakExecResult])

    const aiPerfData: UseAIPerfDataState = useCreation(() => {
        if (activeChat && activeChat.answer && activeChat.answer.aiPerfData) {
            return activeChat.answer.aiPerfData
        }
        return chatIPCData.aiPerfData || defaultChatIPCData.aiPerfData
    }, [chatIPCData.aiPerfData])
    const casualChat: UseCasualChatState = useCreation(() => {
        if (!!activeChat?.answer?.casualChat) {
            return activeChat.answer.casualChat
        }
        return chatIPCData.casualChat
    }, [activeChat, chatIPCData.casualChat])

    const reActTimelines = useCreation(() => {
        if (!!activeChat?.answer?.reActTimelines) {
            return activeChat.answer.reActTimelines
        }
        return chatIPCData.reActTimelines
    }, [activeChat, chatIPCData.reActTimelines])

    const coordinatorIDs: string[] = useCreation(() => {
        if (activeChat && activeChat.answer && activeChat.answer.coordinatorIDs) {
            return activeChat.answer.coordinatorIDs
        }
        return chatIPCData.coordinatorIDs || []
    }, [activeChat, chatIPCData.coordinatorIDs])

    return {runTimeIDs, grpcFolders, taskChat, yakExecResult, aiPerfData, casualChat, reActTimelines, coordinatorIDs}
}

export default useAIChatUIData
