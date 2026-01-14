import {useCreation} from "ahooks"
import useAIAgentStore from "@/pages/ai-agent/useContext/useStore"
import {defaultChatIPCData} from "@/pages/ai-agent/defaultConstant"
import useChatIPCStore from "@/pages/ai-agent/useContext/ChatIPCContent/useStore"
import {AIFileSystemPin, UseAIPerfDataState, UseCasualChatState, UseTaskChatState, UseYakExecResultState} from "./type"
import {AIChatData} from "@/pages/ai-agent/type/aiChat"
import useAIAgentDispatcher from "@/pages/ai-agent/useContext/useDispatcher"

function useAIChatUIData(): AIChatData

function useAIChatUIData() {
    const {activeChat} = useAIAgentStore()
    const {chatIPCData} = useChatIPCStore()
    const {getChatData} = useAIAgentDispatcher()

    const runTimeIDs: string[] = useCreation(() => {
        if (activeChat && activeChat.session && getChatData) {
            return getChatData(activeChat.session)?.runTimeIDs || chatIPCData.runTimeIDs
        }
        return chatIPCData.runTimeIDs || defaultChatIPCData.runTimeIDs
    }, [activeChat, chatIPCData.runTimeIDs])

    const grpcFolders: AIFileSystemPin[] = useCreation(() => {
        if (activeChat && activeChat.session && getChatData) {
            return getChatData(activeChat.session)?.grpcFolders || chatIPCData.grpcFolders
        }
        return chatIPCData.grpcFolders || defaultChatIPCData.grpcFolders
    }, [activeChat, chatIPCData.grpcFolders])

    const taskChat: UseTaskChatState = useCreation(() => {
        if (activeChat && activeChat.session && getChatData) {
            return getChatData(activeChat.session)?.taskChat || chatIPCData.taskChat
        }
        return chatIPCData.taskChat || defaultChatIPCData.taskChat
    }, [activeChat, chatIPCData.taskChat])

    const yakExecResult: UseYakExecResultState = useCreation(() => {
        if (activeChat && activeChat.session && getChatData) {
            return getChatData(activeChat.session)?.yakExecResult || chatIPCData.yakExecResult
        }
        return chatIPCData.yakExecResult || defaultChatIPCData.yakExecResult
    }, [activeChat, chatIPCData.yakExecResult])

    const aiPerfData: UseAIPerfDataState = useCreation(() => {
        if (activeChat && activeChat.session && getChatData) {
            return getChatData(activeChat.session)?.aiPerfData || chatIPCData.aiPerfData
        }
        return chatIPCData.aiPerfData || defaultChatIPCData.aiPerfData
    }, [chatIPCData.aiPerfData])
    const casualChat: UseCasualChatState = useCreation(() => {
        if (activeChat && activeChat.session && getChatData) {
            return getChatData(activeChat.session)?.casualChat || chatIPCData.casualChat
        }
        return chatIPCData.casualChat || defaultChatIPCData.casualChat
    }, [activeChat, chatIPCData.casualChat])

    const reActTimelines = useCreation(() => {
        if (activeChat && activeChat.session && getChatData) {
            return getChatData(activeChat.session)?.reActTimelines || chatIPCData.reActTimelines
        }
        return chatIPCData.reActTimelines || defaultChatIPCData.reActTimelines
    }, [activeChat, chatIPCData.reActTimelines])

    const coordinatorIDs: string[] = useCreation(() => {
        if (activeChat && activeChat.session && getChatData) {
            return getChatData(activeChat.session)?.coordinatorIDs || chatIPCData.coordinatorIDs
        }
        return chatIPCData.coordinatorIDs || []
    }, [activeChat, chatIPCData.coordinatorIDs])

    return {
        runTimeIDs,
        grpcFolders,
        taskChat,
        yakExecResult,
        aiPerfData,
        casualChat,
        reActTimelines,
        coordinatorIDs
    }
}

export default useAIChatUIData
